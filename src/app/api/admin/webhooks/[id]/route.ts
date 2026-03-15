import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { webhooks, webhookDeliveries } from "@/lib/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { parseBody } from "@/lib/parse-body";
import { getRequestId } from "@/lib/request-id";

// ─── Zod schema ───────────────────────────────────────────────────────────────

const PatchWebhookSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  url: z
    .string()
    .url()
    .refine((u) => u.startsWith("https://"), { message: "Webhook URL must use HTTPS" })
    .optional(),
  events: z.array(z.string()).optional(),
  active: z.boolean().optional(),
});

// ─── Helper: load + enterprise-guard a webhook ────────────────────────────────

async function loadWebhook(id: string, enterpriseId: string | null) {
  const row = await db
    .select()
    .from(webhooks)
    .where(eq(webhooks.id, id))
    .limit(1);

  if (row.length === 0) return null;
  const wh = row[0];

  // Enterprise scoping: admin can only manage their own enterprise's webhooks
  if (enterpriseId !== null && wh.enterpriseId !== enterpriseId) return null;

  return wh;
}

// ─── GET /api/admin/webhooks/[id] ─────────────────────────────────────────────

/**
 * Fetch a single webhook (no secret) + last 20 deliveries.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session: authSession, error } = await requireAuth(["admin"]);
  if (error) return error;
  const requestId = getRequestId(request);
  const { id } = await params;

  try {
    const enterpriseId = authSession.user.enterpriseId ?? null;
    const wh = await loadWebhook(id, enterpriseId);
    if (!wh) {
      return apiError(ErrorCode.NOT_FOUND, "Webhook not found", undefined, requestId);
    }

    // Fetch last 20 deliveries
    const deliveries = await db
      .select({
        id: webhookDeliveries.id,
        eventType: webhookDeliveries.eventType,
        status: webhookDeliveries.status,
        responseStatus: webhookDeliveries.responseStatus,
        attempts: webhookDeliveries.attempts,
        lastAttemptedAt: webhookDeliveries.lastAttemptedAt,
        createdAt: webhookDeliveries.createdAt,
      })
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.webhookId, id))
      .orderBy(desc(webhookDeliveries.createdAt))
      .limit(20);

    // Return webhook without secret
    const { secret: _omit, ...webhookWithoutSecret } = wh;
    void _omit; // explicitly unused
    return NextResponse.json({ webhook: webhookWithoutSecret, deliveries });
  } catch (err) {
    console.error(`[${requestId}] Failed to fetch webhook ${id}:`, err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to fetch webhook", undefined, requestId);
  }
}

// ─── PATCH /api/admin/webhooks/[id] ──────────────────────────────────────────

/**
 * Update name, url, events subscription, or active status.
 * Does not rotate the secret (use /rotate-secret for that).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session: authSession, error } = await requireAuth(["admin"]);
  if (error) return error;
  const requestId = getRequestId(request);
  const { id } = await params;

  const { data: body, error: bodyError } = await parseBody(request, PatchWebhookSchema);
  if (bodyError) return bodyError;

  try {
    const enterpriseId = authSession.user.enterpriseId ?? null;
    const wh = await loadWebhook(id, enterpriseId);
    if (!wh) {
      return apiError(ErrorCode.NOT_FOUND, "Webhook not found", undefined, requestId);
    }

    const updates: Partial<typeof wh> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.url !== undefined) updates.url = body.url;
    if (body.events !== undefined) updates.events = body.events;
    if (body.active !== undefined) updates.active = body.active;
    updates.updatedAt = new Date();

    const [updated] = await db
      .update(webhooks)
      .set(updates)
      .where(eq(webhooks.id, id))
      .returning();

    const { secret: _omit, ...webhookWithoutSecret } = updated;
    void _omit;
    return NextResponse.json({ webhook: webhookWithoutSecret });
  } catch (err) {
    console.error(`[${requestId}] Failed to update webhook ${id}:`, err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to update webhook", undefined, requestId);
  }
}

// ─── DELETE /api/admin/webhooks/[id] ─────────────────────────────────────────

/**
 * Delete a webhook and all its delivery records (cascades via FK).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session: authSession, error } = await requireAuth(["admin"]);
  if (error) return error;
  const requestId = getRequestId(request);
  const { id } = await params;

  try {
    const enterpriseId = authSession.user.enterpriseId ?? null;
    const wh = await loadWebhook(id, enterpriseId);
    if (!wh) {
      return apiError(ErrorCode.NOT_FOUND, "Webhook not found", undefined, requestId);
    }

    await db.delete(webhooks).where(eq(webhooks.id, id));

    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error(`[${requestId}] Failed to delete webhook ${id}:`, err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to delete webhook", undefined, requestId);
  }
}
