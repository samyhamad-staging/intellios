import { NextRequest, NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/auth/cron-auth";
import { db } from "@/lib/db";
import { agentBlueprints } from "@/lib/db/schema";
import { and, eq, isNotNull, lte } from "drizzle-orm";
import { getComplianceOfficerEmails } from "@/lib/notifications/recipients";
import { sendEmail, buildNotificationEmail } from "@/lib/notifications/email";
import { publishEvent } from "@/lib/events/publish";

/**
 * GET /api/cron/review-reminders
 *
 * Daily cron job that sends periodic review reminder emails to compliance
 * officers when a deployed agent's next review is approaching.
 *
 * H3-3.3: Multi-window reminder logic at 30, 14, and 7 days before due date.
 *   - For each threshold, send a reminder if `now` is within the 1-day window
 *     starting at `nextReviewDue - threshold days`.
 *   - Deduplication: skip if `lastReminderSentAt` was within the last 6 days
 *     (prevents re-sending within the same threshold window).
 *   - Only one reminder fires per cron run (break after first match).
 *
 * Security: mandatory Bearer token via CRON_SECRET env var.
 */
export async function GET(request: NextRequest) {
  const cronError = requireCronAuth(request);
  if (cronError) return cronError;

  const now = new Date();

  // H3-3.3: Fixed reminder thresholds (days before due date)
  const thresholds = [30, 14, 7];

  // Pre-filter: deployed blueprints with a scheduled review due within 35 days
  const thirtyFiveDaysFromNow = new Date(now.getTime() + 35 * 24 * 60 * 60 * 1000);

  let candidates;
  try {
    candidates = await db.query.agentBlueprints.findMany({
      where: and(
        eq(agentBlueprints.status, "deployed"),
        isNotNull(agentBlueprints.nextReviewDue),
        lte(agentBlueprints.nextReviewDue, thirtyFiveDaysFromNow)
      ),
    });
  } catch (err) {
    console.error("[cron/review-reminders] DB query failed:", err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  let processed = 0;
  let sent = 0;

  for (const blueprint of candidates) {
    processed++;

    const nextReviewDue = blueprint.nextReviewDue!;
    const lastReminderSentAt = blueprint.lastReminderSentAt ?? null;

    // Check each threshold window
    for (const days of thresholds) {
      const windowStart = new Date(nextReviewDue.getTime() - days * 24 * 60 * 60 * 1000);
      const windowEnd = new Date(windowStart.getTime() + 24 * 60 * 60 * 1000); // 1-day window

      if (now >= windowStart && now <= windowEnd) {
        // Check not already sent recently (within 6 days)
        if (lastReminderSentAt && (now.getTime() - lastReminderSentAt.getTime()) < 6 * 24 * 60 * 60 * 1000) {
          break; // already sent for this threshold
        }

        // Fetch compliance officers for this enterprise
        const recipients = await getComplianceOfficerEmails(blueprint.enterpriseId);
        if (recipients.length === 0) break;

        const agentName = blueprint.name ?? "Agent";
        const daysUntil = Math.ceil(
          (nextReviewDue.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
        );
        const reviewDueStr = nextReviewDue.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        });

        const title = `Periodic review due in ${daysUntil} day${daysUntil === 1 ? "" : "s"}`;
        const message = `${agentName} has a scheduled periodic review due on ${reviewDueStr}. Please complete the review in Intellios to keep this agent's compliance record current.`;
        const link = `/registry/${blueprint.agentId}`;

        for (const recipientEmail of recipients) {
          void sendEmail({
            to: recipientEmail,
            subject: `[Intellios] Periodic review reminder: ${agentName}`,
            html: buildNotificationEmail(title, message, link),
          });
        }

        // Update lastReminderSentAt to prevent duplicates this cycle
        await db
          .update(agentBlueprints)
          .set({ lastReminderSentAt: now })
          .where(eq(agentBlueprints.id, blueprint.id));

        // Audit trail
        void publishEvent({
          event: {
            type: "blueprint.periodic_review_reminder",
            payload: {
              blueprintId: blueprint.id,
              agentId: blueprint.agentId,
              agentName: agentName,
            },
          },
          actor: { email: "system@intellios", role: "system" },
          entity: { type: "blueprint", id: blueprint.id },
          enterpriseId: blueprint.enterpriseId ?? null,
        });

        sent++;
        break; // only send one reminder per run per blueprint
      }
    }
  }

  return NextResponse.json({ processed, sent });
}
