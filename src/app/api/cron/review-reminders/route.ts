import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentBlueprints } from "@/lib/db/schema";
import { and, eq, gt, isNotNull, lte } from "drizzle-orm";
import { getEnterpriseSettings } from "@/lib/settings/get-settings";
import { getComplianceOfficerEmails } from "@/lib/notifications/recipients";
import { sendEmail, buildNotificationEmail } from "@/lib/notifications/email";
import { writeAuditLog } from "@/lib/audit/log";

/**
 * GET /api/cron/review-reminders
 *
 * Daily cron job that sends periodic review reminder emails to compliance
 * officers when a deployed agent's next review is approaching.
 *
 * Reminder logic:
 *   - Look up each enterprise's `reminderDaysBefore` setting.
 *   - If `nextReviewDue - reminderDaysBefore days <= now()` AND
 *     (`lastReminderSentAt IS NULL` OR `lastReminderSentAt < lastPeriodicReviewAt`)
 *     → send reminder emails and set `lastReminderSentAt = now()`.
 *
 * This ensures exactly one reminder per review cycle — regardless of how many
 * times the cron fires, the `lastReminderSentAt >= lastPeriodicReviewAt` guard
 * prevents duplicate reminders within the same cycle.
 *
 * Security: Bearer token via CRON_SECRET env var (optional; skip if unset).
 */
export async function GET(request: NextRequest) {
  // Optional bearer auth for Vercel cron
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();

  // Pre-filter: deployed blueprints with a scheduled review due within 60 days
  const sixtDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

  let candidates;
  try {
    candidates = await db.query.agentBlueprints.findMany({
      where: and(
        eq(agentBlueprints.status, "deployed"),
        isNotNull(agentBlueprints.nextReviewDue),
        gt(agentBlueprints.nextReviewDue, now),
        lte(agentBlueprints.nextReviewDue, sixtDaysFromNow)
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

    const settings = await getEnterpriseSettings(blueprint.enterpriseId);
    const { reminderDaysBefore } = settings.periodicReview;

    // Reminder window: nextReviewDue - reminderDaysBefore days
    const reminderWindowStart = new Date(
      blueprint.nextReviewDue!.getTime() - reminderDaysBefore * 24 * 60 * 60 * 1000
    );

    // Check: is it time to send a reminder?
    if (now < reminderWindowStart) continue;

    // Check: has a reminder already been sent for this review cycle?
    // A cycle starts after each completed review (lastPeriodicReviewAt).
    // If lastReminderSentAt is null, no reminder has ever been sent.
    // If lastReminderSentAt < lastPeriodicReviewAt, the last reminder was for
    // a previous cycle — safe to send again.
    if (blueprint.lastReminderSentAt !== null && blueprint.lastReminderSentAt !== undefined) {
      const lastReviewAt = blueprint.lastPeriodicReviewAt;
      if (!lastReviewAt || blueprint.lastReminderSentAt >= lastReviewAt) {
        // Already sent for this cycle — skip
        continue;
      }
    }

    // Fetch compliance officers for this enterprise
    const recipients = await getComplianceOfficerEmails(blueprint.enterpriseId);
    if (recipients.length === 0) continue;

    const agentName = blueprint.name ?? "Agent";
    const daysUntil = Math.ceil(
      (blueprint.nextReviewDue!.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
    );
    const reviewDueStr = blueprint.nextReviewDue!.toLocaleDateString("en-US", {
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
    void writeAuditLog({
      entityType: "blueprint",
      entityId: blueprint.id,
      action: "blueprint.periodic_review_reminder",
      actorEmail: "system@intellios",
      actorRole: "system",
      enterpriseId: blueprint.enterpriseId ?? null,
      metadata: {
        recipientCount: recipients.length,
        nextReviewDue: blueprint.nextReviewDue!.toISOString(),
        daysUntilDue: daysUntil,
        reminderDaysBefore,
      },
    });

    sent++;
  }

  return NextResponse.json({ processed, sent });
}
