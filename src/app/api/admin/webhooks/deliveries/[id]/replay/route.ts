import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auditLog, webhookDeliveries, webhooks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { getRequestId } from "@/lib/request-id";
import { logger, serializeError } from "@/lib/logger";

/**
 * POST /api/admin/webhooks/deliveries/[id]/replay
 *
 * ADR-026: admin-gated replay. Resets a delivery back to `status='pending'`,
 * `attempts=0`, `next_attempt_at=now()` so the next minute's retry cron picks
 * it up with a fresh retry budget. The original payload and delivery ID are
 * preserved — subscribers that deduplicate on `X-Intellios-Delivery` will see
 * the same ID as the original attempt.
 *
 * Accepted from any terminal state: `success`, `failed`, `dlq`. Also accepted
 * from `pending` (treated as "jump the queue" — the cron would have picked
 * it up at next_attempt_at anyway, but admins sometimes want immediate).
 *
 * Enterprise-scoped: the caller's enterprise must own the parent webhook.
 * Platform admins (enterpriseId=null) can replay any delivery.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session: authSession, error } = await requireAuth(["admin"]);
  if (error) return error;
  const requestId = getRequestId(request);
  const { id } = await params;

  try {
    const enterpriseId = authSession.user.enterpriseId ?? null;

    // ── Load delivery + parent webhook for enterprise guard ────────────────
    const [row] = await db
      .select({
        delivery: webhookDeliveries,
        webhookEnterpriseId: webhooks.enterpriseId,
        webhookActive: webhooks.active,
      })
      .from(webhookDeliveries)
      .innerJoin(webhooks, eq(webhooks.id, webhookDeliveries.webhookId))
      .where(eq(webhookDeliveries.id, id))
      .limit(1);

    if (!row) {
      return apiError(ErrorCode.NOT_FOUND, "Delivery not found", undefined, requestId);
    }

    // Enterprise scoping: only platform admins (null enterpriseId) can replay
    // across enterprises. Everyone else must match the webhook's enterprise.
    if (enterpriseId !== null && row.webhookEnterpriseId !== enterpriseId) {
      return apiError(ErrorCode.NOT_FOUND, "Delivery not found", undefined, requestId);
    }

    // Don't allow replay of a delivery whose webhook has been deactivated —
    // the retry cron would bounce it straight to DLQ as `webhook_inactive`,
    // which is just noise. Tell the admin to reactivate the webhook first.
    if (!row.webhookActive) {
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        "Parent webhook is inactive. Reactivate it before replaying deliveries.",
        undefined,
        requestId
      );
    }

    const priorStatus = row.delivery.status;
    const now = new Date();

    // ── Reset delivery to retry-eligible state ─────────────────────────────
    const [updated] = await db
      .update(webhookDeliveries)
      .set({
        status: "pending",
        attempts: 0,
        nextAttemptAt: now,
        errorClass: null,
        // Intentionally keep responseStatus/responseBody so the admin can
        // still see the last failure that triggered the replay; they'll be
        // overwritten on the next attempt.
      })
      .where(eq(webhookDeliveries.id, id))
      .returning();

    // ── Audit event ────────────────────────────────────────────────────────
    // Best-effort — if the audit insert fails, the replay itself is still
    // recorded via the eventual webhook_deliveries row mutation.
    try {
      await db.insert(auditLog).values({
        actorEmail: authSession.user.email!,
        actorRole: authSession.user.role!,
        action: "webhook.delivery.replayed",
        entityType: "webhook",
        entityId: row.delivery.webhookId,
        enterpriseId,
        metadata: {
          deliveryId: id,
          priorStatus,
          priorAttempts: row.delivery.attempts,
          priorErrorClass: row.delivery.errorClass,
        },
      });
    } catch (err) {
      logger.error("webhook.delivery.replay.audit_failed", {
        deliveryId: id,
        err: serializeError(err),
      });
    }

    return NextResponse.json({ delivery: updated });
  } catch (err) {
    logger.error("webhook.delivery.replay.failed", { deliveryId: id, err: serializeError(err) });
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to replay delivery", undefined, requestId);
  }
}
