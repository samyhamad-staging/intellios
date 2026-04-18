import { NextRequest, NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/auth/cron-auth";
import { db } from "@/lib/db";
import { webhookDeliveries, webhooks } from "@/lib/db/schema";
import { and, asc, eq, isNotNull, lte, sql } from "drizzle-orm";
import { runCronBatch, recentFailedItemIds, prioritizeFailed } from "@/lib/cron/batch-runner";
import { performAttempt, recordAttempt, markWebhookInactive } from "@/lib/webhooks/deliver";
import { decryptSecret } from "@/lib/crypto/encrypt";
import type { WebhookPayload } from "@/lib/webhooks/types";
import { logger, serializeError } from "@/lib/logger";

const JOB_NAME = "webhook-retries";

/**
 * Per-run cap on deliveries picked up. Keeps scan time + wall-clock bounded
 * regardless of how big the pending backlog is after a subscriber outage.
 * Leftover rows will be picked up on the next minute's tick.
 *
 * Sized with the batch-runner's default 50s budget in mind: at a worst-case
 * 10s per delivery (one timeout), 200 rows is well past what a single
 * invocation can burn through — budget exhaustion is the natural backstop.
 */
const BATCH_LIMIT = 200;

/**
 * GET /api/cron/webhook-retries
 *
 * ADR-026: every-minute cron that retries outbound webhook deliveries whose
 * inline attempt (or prior scheduled retry) failed with a retryable class.
 *
 * Scan contract: only rows where status='pending' AND next_attempt_at <= now()
 * AND attempts < max_attempts are eligible. Terminal rows (success/failed/dlq)
 * are filtered out by the partial index and never scanned.
 *
 * Per-row work:
 *   1. Load the parent webhook. If deleted or inactive → mark DLQ with
 *      error_class='webhook_inactive' and move on (no HTTP request).
 *   2. Run one delivery attempt via performAttempt.
 *   3. Persist the outcome via recordAttempt — which computes the next
 *      backoff or transitions to success/dlq as appropriate.
 *
 * Security: mandatory Bearer token via CRON_SECRET env var.
 */
export async function GET(request: NextRequest) {
  const cronError = requireCronAuth(request);
  if (cronError) return cronError;

  const now = new Date();

  // ── Pick up the overdue-pending slice ──────────────────────────────────────
  let rows;
  try {
    rows = await db
      .select({
        id: webhookDeliveries.id,
        webhookId: webhookDeliveries.webhookId,
        payload: webhookDeliveries.payload,
        attempts: webhookDeliveries.attempts,
        maxAttempts: webhookDeliveries.maxAttempts,
        eventType: webhookDeliveries.eventType,
      })
      .from(webhookDeliveries)
      .where(
        and(
          eq(webhookDeliveries.status, "pending"),
          isNotNull(webhookDeliveries.nextAttemptAt),
          lte(webhookDeliveries.nextAttemptAt, now),
          // attempts < max_attempts — gate against pathological rows that
          // somehow accumulated attempts past their budget without going DLQ.
          sql`${webhookDeliveries.attempts} < ${webhookDeliveries.maxAttempts}`
        )
      )
      .orderBy(asc(webhookDeliveries.nextAttemptAt))
      .limit(BATCH_LIMIT);
  } catch (err) {
    logger.error("cron.webhook-retries.query_failed", { err: serializeError(err) });
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  if (rows.length === 0) {
    return NextResponse.json({
      processed: 0,
      succeeded: 0,
      pending: 0,
      dlq: 0,
      failed: 0,
      skipped: 0,
      budgetExhausted: false,
      durationMs: 0,
    });
  }

  // ADR-024 — give chronically-failing deliveries first crack at the budget.
  const failedIds = await recentFailedItemIds(JOB_NAME);
  const ordered = prioritizeFailed(rows, (r) => r.id, failedIds);

  // Outcome counters — the batch-runner tracks success/failure/skipped at the
  // handler level; these track the delivery-level state transitions.
  let deliveredSuccess = 0;
  let stillPending = 0;
  let movedToDlq = 0;

  const processDelivery = async (row: typeof rows[number]) => {
    // ── Load parent webhook ──────────────────────────────────────────────────
    const [wh] = await db
      .select({
        id: webhooks.id,
        url: webhooks.url,
        secret: webhooks.secret,
        active: webhooks.active,
      })
      .from(webhooks)
      .where(eq(webhooks.id, row.webhookId))
      .limit(1);

    if (!wh || !wh.active) {
      await markWebhookInactive(row.id, row.attempts);
      movedToDlq++;
      return;
    }

    // ── Attempt + persist ────────────────────────────────────────────────────
    const payload = row.payload as unknown as WebhookPayload;
    const secret = decryptSecret(wh.secret);
    const outcome = await performAttempt(wh.url, secret, payload);
    const result = await recordAttempt(row.id, outcome, row.attempts, row.maxAttempts);

    if (result === "success") deliveredSuccess++;
    else if (result === "pending") stillPending++;
    else movedToDlq++;
  };

  const result = await runCronBatch({
    jobName: JOB_NAME,
    items: ordered,
    itemId: (r) => r.id,
    handler: processDelivery,
  });

  return NextResponse.json({
    processed: result.succeeded,
    succeeded: deliveredSuccess,
    pending: stillPending,
    dlq: movedToDlq,
    failed: result.failed,
    skipped: result.skipped,
    budgetExhausted: result.budgetExhausted,
    durationMs: result.durationMs,
  });
}
