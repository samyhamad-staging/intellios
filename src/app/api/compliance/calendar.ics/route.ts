import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentBlueprints, governancePolicies } from "@/lib/db/schema";
import { ALL_BLUEPRINT_COLUMNS, ALL_POLICY_COLUMNS } from "@/lib/db/safe-columns";
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require";

/**
 * GET /api/compliance/calendar.ics
 *
 * Returns an iCal (.ics) file with all compliance-related deadlines:
 * - Agent periodic review due dates (SR 11-7)
 * - Policy review schedules (annual by default)
 *
 * Access: compliance_officer | admin
 */
export async function GET(request: NextRequest) {
  const { session, error } = await requireAuth(["compliance_officer", "admin"]);
  if (error) return error;

  const enterpriseId = session.user.role === "admin" && !session.user.enterpriseId
    ? null // super admin — include all
    : (session.user.enterpriseId ?? null);

  // Load deployed blueprints with review dates
  const blueprintsWithDates = await db
    .select(ALL_BLUEPRINT_COLUMNS)
    .from(agentBlueprints)
    .where(
      and(
        eq(agentBlueprints.status, "deployed"),
        isNotNull(agentBlueprints.nextReviewDue),
        ...(enterpriseId ? [eq(agentBlueprints.enterpriseId, enterpriseId)] : []),
      )
    );

  // Load active policies
  const policies = await db
    .select(ALL_POLICY_COLUMNS)
    .from(governancePolicies)
    .where(
      and(
        isNull(governancePolicies.supersededAt),
        ...(enterpriseId ? [eq(governancePolicies.enterpriseId, enterpriseId)] : []),
      )
    );

  const now = new Date();
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Intellios//Compliance Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Intellios Compliance Calendar",
    "X-WR-TIMEZONE:UTC",
  ];

  // Add agent review events
  for (const bp of blueprintsWithDates) {
    if (!bp.nextReviewDue) continue;
    const uid = `review-${bp.id}@intellios`;
    const dtstart = formatICalDate(bp.nextReviewDue);
    const dtend = formatICalDate(new Date(bp.nextReviewDue.getTime() + 60 * 60 * 1000)); // 1 hour
    const summary = `SR 11-7 Review: ${bp.name ?? "Agent"}`;
    const description = `Periodic governance review due for agent "${bp.name ?? bp.agentId}". Review in Intellios to maintain compliance record.`;
    const dtstamp = formatICalDate(now);

    lines.push(
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTART:${dtstart}`,
      `DTEND:${dtend}`,
      `DTSTAMP:${dtstamp}`,
      `SUMMARY:${escapeICalText(summary)}`,
      `DESCRIPTION:${escapeICalText(description)}`,
      "CATEGORIES:COMPLIANCE",
      "STATUS:CONFIRMED",
      "END:VEVENT"
    );
  }

  // Add policy review events (annual — 1 year from policy creation)
  for (const policy of policies) {
    const reviewDate = new Date(policy.createdAt);
    reviewDate.setFullYear(reviewDate.getFullYear() + 1);

    // Only include if in the future
    if (reviewDate <= now) continue;

    const uid = `policy-review-${policy.id}@intellios`;
    const dtstart = formatICalDate(reviewDate);
    const dtend = formatICalDate(new Date(reviewDate.getTime() + 60 * 60 * 1000));
    const summary = `Annual Policy Review: ${policy.name}`;
    const description = `Annual review due for governance policy "${policy.name}" (${policy.type}).`;
    const dtstamp = formatICalDate(now);

    lines.push(
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTART:${dtstart}`,
      `DTEND:${dtend}`,
      `DTSTAMP:${dtstamp}`,
      `SUMMARY:${escapeICalText(summary)}`,
      `DESCRIPTION:${escapeICalText(description)}`,
      "CATEGORIES:POLICY",
      "STATUS:CONFIRMED",
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");

  const icalContent = lines.join("\r\n");

  return new NextResponse(icalContent, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="intellios-compliance.ics"',
      "Cache-Control": "no-cache",
    },
  });
}

function formatICalDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function escapeICalText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}
