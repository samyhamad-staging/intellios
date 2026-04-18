import { createHmac, randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { webhookDeliveries } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { WebhookPayload } from "./types";
import { logger, serializeError } from "@/lib/logger";
import { classifyError, isRetryable, nextBackoffMs, type ErrorClass } from "./backoff";

const MAX_RESPONSE_BODY_CHARS = 500;
const ATTEMPT_TIMEOUT_MS = 10_000;

/**
 * Default retry budget for a new delivery row. ADR-026: 1 inline + 6 scheduled.
 * The value is persisted per-row so ops can raise it for a known-flaky subscriber
 * without a schema change.
 */
export const DEFAULT_MAX_ATTEMPTS = 7;

interface AttemptOutcome {
  succeeded: boolean;
  responseStatus: number | null;
  responseBody: string | null;
  errorClass: ErrorClass | null;
}

/**
 * Compute the HMAC-SHA256 signature for a webhook payload.
 * Format matches GitHub webhooks: "sha256=<hex_digest>"
 */
function computeSignature(secret: string, body: string): string {
  const hmac = createHmac("sha256", secret);
  hmac.update(body);
  return `sha256=${hmac.digest("hex")}`;
}

/**
 * Execute a single HTTP POST attempt against a subscriber. Does not touch the
 * database — the caller is responsible for persisting the outcome.
 *
 * Returns a normalized outcome even for network/timeout failures; throws only
 * for programming errors (e.g., invalid URL that fetch rejects synchronously
 * before building a request — which shouldn't happen for stored webhook URLs).
 */
export async function performAttempt(
  url: string,
  secret: string,
  payload: WebhookPayload
): Promise<AttemptOutcome> {
  const body = JSON.stringify(payload);
  const signature = computeSignature(secret, body);
  const eventType = payload.event;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Intellios-Signature": signature,
        "X-Intellios-Event": eventType,
        "X-Intellios-Delivery": payload.id,
      },
      body,
      signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
    });

    const rawBody = await response.text().catch(() => "");
    const responseBody = rawBody.slice(0, MAX_RESPONSE_BODY_CHARS) || null;

    if (response.ok) {
      return { succeeded: true, responseStatus: response.status, responseBody, errorClass: null };
    }
    return {
      succeeded: false,
      responseStatus: response.status,
      responseBody,
      errorClass: classifyError({ response }),
    };
  } catch (err) {
    return {
      succeeded: false,
      responseStatus: null,
      responseBody: null,
      errorClass: classifyError({ error: err }),
    };
  }
}

/**
 * Persist the outcome of an attempt and compute the next state transition.
 *
 * Transitions:
 *   - success                           → status='success'
 *   - retryable + more attempts left    → status='pending', next_attempt_at set
 *   - retryable + out of attempts       → status='dlq'
 *   - non-retryable (4xx except 408/429)→ status='dlq' immediately
 *
 * Returns the resulting terminal/pending state for caller logging.
 */
export async function recordAttempt(
  deliveryId: string,
  outcome: AttemptOutcome,
  priorAttempts: number,
  maxAttempts: number
): Promise<"success" | "pending" | "dlq"> {
  const newAttempts = priorAttempts + 1;
  const now = new Date();

  if (outcome.succeeded) {
    await db
      .update(webhookDeliveries)
      .set({
        status: "success",
        responseStatus: outcome.responseStatus,
        responseBody: outcome.responseBody,
        attempts: newAttempts,
        errorClass: null,
        nextAttemptAt: null,
        lastAttemptedAt: now,
      })
      .where(eq(webhookDeliveries.id, deliveryId));
    return "success";
  }

  const errorClass = outcome.errorClass ?? "network";
  const retryable = isRetryable(errorClass, outcome.responseStatus);
  const nextDelay = retryable ? nextBackoffMs(newAttempts, maxAttempts) : null;

  if (retryable && nextDelay !== null) {
    await db
      .update(webhookDeliveries)
      .set({
        status: "pending",
        responseStatus: outcome.responseStatus,
        responseBody: outcome.responseBody,
        attempts: newAttempts,
        errorClass,
        nextAttemptAt: new Date(now.getTime() + nextDelay),
        lastAttemptedAt: now,
      })
      .where(eq(webhookDeliveries.id, deliveryId));
    return "pending";
  }

  // Terminal: either non-retryable class (4xx) or retries exhausted.
  await db
    .update(webhookDeliveries)
    .set({
      status: "dlq",
      responseStatus: outcome.responseStatus,
      responseBody: outcome.responseBody,
      attempts: newAttempts,
      errorClass,
      nextAttemptAt: null,
      lastAttemptedAt: now,
    })
    .where(eq(webhookDeliveries.id, deliveryId));
  return "dlq";
}

/**
 * Mark a delivery as DLQ because its parent webhook has been deleted or
 * deactivated. Called by the retry cron before attempting a scheduled retry.
 * No HTTP request is made.
 */
export async function markWebhookInactive(deliveryId: string, priorAttempts: number): Promise<void> {
  await db
    .update(webhookDeliveries)
    .set({
      status: "dlq",
      attempts: priorAttempts,
      errorClass: "webhook_inactive",
      nextAttemptAt: null,
      lastAttemptedAt: new Date(),
    })
    .where(eq(webhookDeliveries.id, deliveryId));
}

/**
 * Deliver a single webhook event to a registered endpoint.
 *
 * ADR-026: runs exactly ONE inline attempt. If the attempt fails retryably,
 * the delivery row is left in `status='pending'` with `next_attempt_at` set;
 * the /api/cron/webhook-retries cron takes it from there. If the attempt
 * fails terminally (4xx except 408/429), the row goes straight to DLQ.
 *
 * This function never throws — errors are caught and logged. It is designed
 * to be called fire-and-forget from the event handler.
 */
export async function deliverWebhook(
  webhookId: string,
  url: string,
  secret: string,
  payload: WebhookPayload,
  enterpriseId: string | null
): Promise<void> {
  // ── 1. Insert initial delivery record ──────────────────────────────────────
  let deliveryId: string;
  try {
    const [row] = await db
      .insert(webhookDeliveries)
      .values({
        webhookId,
        enterpriseId,
        eventType: payload.event,
        payload: payload as unknown as Record<string, unknown>,
        status: "pending",
        attempts: 0,
        maxAttempts: DEFAULT_MAX_ATTEMPTS,
      })
      .returning({ id: webhookDeliveries.id });
    deliveryId = row.id;
  } catch (err) {
    logger.error("webhooks.delivery.insert.failed", { webhookId, err: serializeError(err) });
    return;
  }

  // ── 2. Inline attempt ──────────────────────────────────────────────────────
  const outcome = await performAttempt(url, secret, payload);

  // ── 3. Persist outcome + compute retry schedule ────────────────────────────
  try {
    await recordAttempt(deliveryId, outcome, 0, DEFAULT_MAX_ATTEMPTS);
  } catch (err) {
    logger.error("webhooks.delivery.update.failed", { deliveryId, err: serializeError(err) });
  }
}

/**
 * Deliver a synchronous test payload to a webhook endpoint.
 * Unlike deliverWebhook, this returns the delivery result rather than logging it,
 * so the test route can return the result to the UI.
 *
 * Test deliveries are single-attempt and never scheduled for retry — they exist
 * to validate the wiring, not to survive outages.
 *
 * The delivery IS logged to webhook_deliveries with event_type 'webhook.test'.
 */
export async function deliverWebhookTest(
  webhookId: string,
  url: string,
  secret: string,
  enterpriseId: string | null
): Promise<{ status: "success" | "failed"; responseStatus: number | null; responseBody: string | null }> {
  const deliveryId = randomUUID();
  const payload: WebhookPayload = {
    id: deliveryId,
    event: "webhook.test",
    timestamp: new Date().toISOString(),
    enterpriseId,
    actor: { email: "system@intellios", role: "admin" },
    entity: { type: "blueprint", id: "00000000-0000-0000-0000-000000000000" },
    fromState: null,
    toState: { status: "approved" },
    metadata: { test: true, message: "This is a test delivery from Intellios." },
  };

  // P1-BUG-001 FIX: Capture the delivery record ID so we can update the
  // correct record later (not all records for this webhook).
  let dbDeliveryId: string | null = null;
  try {
    const [row] = await db.insert(webhookDeliveries).values({
      webhookId,
      enterpriseId,
      eventType: "webhook.test",
      payload: payload as unknown as Record<string, unknown>,
      status: "pending",
      attempts: 0,
      maxAttempts: 1, // tests don't schedule retries
    }).returning({ id: webhookDeliveries.id });
    dbDeliveryId = row.id;
  } catch (err) {
    logger.error("webhooks.test.delivery.insert.failed", { webhookId, err: serializeError(err) });
  }

  const outcome = await performAttempt(url, secret, payload);

  // Update delivery record — test deliveries never go to DLQ; they settle as
  // success or failed so the admin UI's historical filter keeps working.
  try {
    await db
      .update(webhookDeliveries)
      .set({
        status: outcome.succeeded ? "success" : "failed",
        responseStatus: outcome.responseStatus,
        responseBody: outcome.responseBody,
        attempts: 1,
        errorClass: outcome.errorClass,
        nextAttemptAt: null,
        lastAttemptedAt: new Date(),
      })
      .where(dbDeliveryId ? eq(webhookDeliveries.id, dbDeliveryId) : eq(webhookDeliveries.webhookId, webhookId));
  } catch (err) {
    logger.error("webhooks.test.delivery.update.failed", { webhookId, err: serializeError(err) });
  }

  return {
    status: outcome.succeeded ? "success" : "failed",
    responseStatus: outcome.responseStatus,
    responseBody: outcome.responseBody,
  };
}
