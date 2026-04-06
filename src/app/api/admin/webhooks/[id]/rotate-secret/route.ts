import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { webhooks, auditLog } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { getRequestId } from "@/lib/request-id";
import { encryptSecret } from "@/lib/crypto/encrypt";

/**
 * POST /api/admin/webhooks/[id]/rotate-secret
 *
 * Generates a new HMAC signing secret for the webhook.
 * Returns the new secret — this is the only time it is returned after rotation.
 * After this call, any recipient verifying the old secret will fail until they
 * update to the new secret.
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

    // Load + enterprise-guard
    const rows = await db
      .select({ id: webhooks.id, enterpriseId: webhooks.enterpriseId })
      .from(webhooks)
      .where(eq(webhooks.id, id))
      .limit(1);

    if (rows.length === 0) {
      return apiError(ErrorCode.NOT_FOUND, "Webhook not found", undefined, requestId);
    }
    const wh = rows[0];
    if (enterpriseId !== null && wh.enterpriseId !== enterpriseId) {
      return apiError(ErrorCode.NOT_FOUND, "Webhook not found", undefined, requestId);
    }

    const newSecret = randomBytes(32).toString("hex");
    const encryptedSecret = encryptSecret(newSecret);

    await db
      .update(webhooks)
      .set({ secret: encryptedSecret, updatedAt: new Date() })
      .where(eq(webhooks.id, id));

    // Audit log: webhook secret rotation
    try {
      await db.insert(auditLog).values({
        actorEmail: authSession.user.email!,
        actorRole: authSession.user.role!,
        action: "webhook.secret_rotated",
        entityType: "webhook",
        entityId: id,
        enterpriseId,
        metadata: {
          reason: "manual rotation",
        },
      });
    } catch (auditErr) {
      console.error(`[${requestId}] Failed to write audit log:`, auditErr);
    }

    // Return new secret — only time it's visible after rotation
    return NextResponse.json({ secret: newSecret });
  } catch (err) {
    console.error(`[${requestId}] Failed to rotate secret for webhook ${id}:`, err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to rotate webhook secret", undefined, requestId);
  }
}
