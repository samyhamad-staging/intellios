import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { webhooks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { getRequestId } from "@/lib/request-id";
import { deliverWebhookTest } from "@/lib/webhooks/deliver";

/**
 * POST /api/admin/webhooks/[id]/test
 *
 * Sends a synthetic test payload to the webhook URL.
 * Awaits the delivery result synchronously and returns it to the UI.
 * Delivery is logged to webhook_deliveries with event_type 'webhook.test'.
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

    // Load webhook (enterprise-scoped)
    const rows = await db
      .select({ url: webhooks.url, secret: webhooks.secret, enterpriseId: webhooks.enterpriseId })
      .from(webhooks)
      .where(eq(webhooks.id, id))
      .limit(1);

    if (rows.length === 0) {
      return apiError(ErrorCode.NOT_FOUND, "Webhook not found", undefined, requestId);
    }
    const wh = rows[0];

    // Enterprise guard
    if (enterpriseId !== null && wh.enterpriseId !== enterpriseId) {
      return apiError(ErrorCode.NOT_FOUND, "Webhook not found", undefined, requestId);
    }

    const result = await deliverWebhookTest(id, wh.url, wh.secret, wh.enterpriseId);

    return NextResponse.json(result);
  } catch (err) {
    console.error(`[${requestId}] Failed to test webhook ${id}:`, err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to test webhook", undefined, requestId);
  }
}
