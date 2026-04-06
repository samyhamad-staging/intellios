import { createHmac, randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { webhookDeliveries } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { WebhookPayload } from "./types";

const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [0, 1000, 2000];
const MAX_RESPONSE_BODY_CHARS = 500;

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
 * Deliver a single webhook event to a registered endpoint.
 *
 * Creates an initial 'pending' delivery record, attempts up to MAX_ATTEMPTS
 * sequential HTTP POSTs with exponential delays, and updates the record to
 * 'success' or 'failed' based on the outcome.
 *
 * This function never throws — all errors are caught and logged to the delivery
 * record. It is designed to be called fire-and-forget from the event handler.
 */
export async function deliverWebhook(
  webhookId: string,
  url: string,
  secret: string,
  payload: WebhookPayload,
  enterpriseId: string | null
): Promise<void> {
  const body = JSON.stringify(payload);
  const signature = computeSignature(secret, body);
  const eventType = payload.event;

  // ── 1. Insert initial delivery record ──────────────────────────────────────
  let deliveryId: string;
  try {
    const [row] = await db
      .insert(webhookDeliveries)
      .values({
        webhookId,
        enterpriseId,
        eventType,
        payload: payload as unknown as Record<string, unknown>,
        status: "pending",
        attempts: 0,
      })
      .returning({ id: webhookDeliveries.id });
    deliveryId = row.id;
  } catch (err) {
    console.error(`[webhooks] Failed to insert delivery record for webhook ${webhookId}:`, err);
    return;
  }

  // ── 2. Attempt delivery (up to MAX_ATTEMPTS) ───────────────────────────────
  let lastResponseStatus: number | null = null;
  let lastResponseBody: string | null = null;
  let succeeded = false;

  let actualAttempts = 0;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    // Wait before retry (first attempt: 0ms)
    if (RETRY_DELAYS_MS[attempt] > 0) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
    }

    actualAttempts++;

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
        signal: AbortSignal.timeout(10_000), // 10s per attempt
      });

      lastResponseStatus = response.status;
      const rawBody = await response.text().catch(() => "");
      lastResponseBody = rawBody.slice(0, MAX_RESPONSE_BODY_CHARS) || null;

      if (response.ok) {
        succeeded = true;
        break;
      }
    } catch {
      // Network error or timeout — lastResponseStatus stays null for this attempt
    }
  }

  // ── 3. Update delivery record with final outcome ───────────────────────────
  try {
    await db
      .update(webhookDeliveries)
      .set({
        status: succeeded ? "success" : "failed",
        responseStatus: lastResponseStatus,
        responseBody: lastResponseBody,
        attempts: actualAttempts,
        lastAttemptedAt: new Date(),
      })
      .where(eq(webhookDeliveries.id, deliveryId));
  } catch (err) {
    console.error(`[webhooks] Failed to update delivery record ${deliveryId}:`, err);
  }
}

/**
 * Deliver a synchronous test payload to a webhook endpoint.
 * Unlike deliverWebhook, this returns the delivery result rather than logging it,
 * so the test route can return the result to the UI.
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

  const body = JSON.stringify(payload);
  const signature = computeSignature(secret, body);

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
    }).returning({ id: webhookDeliveries.id });
    dbDeliveryId = row.id;
  } catch (err) {
    console.error("[webhooks/test] Failed to insert delivery log:", err);
  }

  let responseStatus: number | null = null;
  let responseBody: string | null = null;
  let succeeded = false;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Intellios-Signature": signature,
        "X-Intellios-Event": "webhook.test",
        "X-Intellios-Delivery": deliveryId,
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });

    responseStatus = response.status;
    const rawBody = await response.text().catch(() => "");
    responseBody = rawBody.slice(0, MAX_RESPONSE_BODY_CHARS) || null;
    succeeded = response.ok;
  } catch {
    // Network error — leave responseStatus null
  }

  // Update delivery record
  try {
    await db
      .update(webhookDeliveries)
      .set({
        status: succeeded ? "success" : "failed",
        responseStatus,
        responseBody,
        attempts: 1,
        lastAttemptedAt: new Date(),
      })
      .where(dbDeliveryId ? eq(webhookDeliveries.id, dbDeliveryId) : eq(webhookDeliveries.webhookId, webhookId));
  } catch (err) {
    console.error("[webhooks/test] Failed to update delivery record:", err);
  }

  return { status: succeeded ? "success" : "failed", responseStatus, responseBody };
}
