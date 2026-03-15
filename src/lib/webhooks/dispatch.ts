/**
 * Webhook dispatch handler — forwards lifecycle events to registered HTTPS endpoints.
 *
 * Registered with the event bus via a side-effect import in src/lib/audit/log.ts,
 * following the same pattern as the notifications handler and policy-impact handler.
 *
 * Security model:
 * - Webhooks are enterprise-scoped: only webhooks whose enterpriseId matches the
 *   event's enterpriseId will receive the event. A null enterpriseId on a webhook
 *   means "all enterprises" (platform-level monitoring only).
 * - Delivery is fire-and-forget: errors never surface to the caller.
 * - HMAC-SHA256 signed payloads — recipients should verify X-Intellios-Signature.
 */

import { db } from "@/lib/db";
import { webhooks } from "@/lib/db/schema";
import { and, eq, isNull, or } from "drizzle-orm";
import { registerHandler } from "@/lib/events/bus";
import type { LifecycleEvent } from "@/lib/events/types";
import { deliverWebhook } from "./deliver";
import type { WebhookPayload } from "./types";

async function webhookDispatchHandler(event: LifecycleEvent): Promise<void> {
  try {
    // ── Load active webhooks for this enterprise ──────────────────────────────
    // Match webhooks scoped to the same enterprise as the event, OR platform-level
    // webhooks (null enterpriseId). Only active webhooks are eligible.
    const enterpriseCondition =
      event.enterpriseId
        ? or(
            eq(webhooks.enterpriseId, event.enterpriseId),
            isNull(webhooks.enterpriseId)
          )
        : isNull(webhooks.enterpriseId);

    const candidates = await db
      .select({
        id: webhooks.id,
        url: webhooks.url,
        secret: webhooks.secret,
        events: webhooks.events,
        enterpriseId: webhooks.enterpriseId,
      })
      .from(webhooks)
      .where(and(enterpriseCondition, eq(webhooks.active, true)));

    if (candidates.length === 0) return;

    // ── Filter by event subscription ─────────────────────────────────────────
    // An empty events array = subscribe to all events.
    // A non-empty array = only fire for listed event types.
    const matched = candidates.filter(
      (wh) => wh.events.length === 0 || wh.events.includes(event.type)
    );

    if (matched.length === 0) return;

    // ── Build webhook payload from LifecycleEvent ─────────────────────────────
    const payload: WebhookPayload = {
      id: crypto.randomUUID(),
      event: event.type,
      timestamp: event.timestamp,
      enterpriseId: event.enterpriseId,
      actor: {
        email: event.actorEmail,
        role: event.actorRole,
      },
      entity: {
        type: event.entityType,
        id: event.entityId,
      },
      fromState: event.fromState,
      toState: event.toState,
      metadata: event.metadata,
    };

    // ── Dispatch to all matched webhooks (fire-and-forget) ─────────────────────
    void Promise.allSettled(
      matched.map((wh) =>
        deliverWebhook(wh.id, wh.url, wh.secret, payload, wh.enterpriseId)
      )
    );
  } catch (err) {
    // Never throw — webhook dispatch must not interrupt the primary operation
    console.error("[webhooks] Dispatch handler error:", err, { eventType: event.type });
  }
}

// Self-register on module initialization (side-effect import pattern)
registerHandler(webhookDispatchHandler);
