import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { webhooks, auditLog } from "@/lib/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { parseBody } from "@/lib/parse-body";
import { getRequestId } from "@/lib/request-id";
import { encryptSecret } from "@/lib/crypto/encrypt";

// ─── Zod schema ───────────────────────────────────────────────────────────────

const PRIVATE_HOST_RE =
  /^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|\[?::1\]?|0\.0\.0\.0)/;

const CreateWebhookSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url()
    .refine((u) => u.startsWith("https://"), {
      message: "Webhook URL must use HTTPS",
    })
    .refine((u) => {
      try {
        const host = new URL(u).hostname;
        return !PRIVATE_HOST_RE.test(host);
      } catch {
        return false;
      }
    }, { message: "Webhook URL must point to a public host" }),
  events: z.array(z.string()).default([]),
});

// ─── GET /api/admin/webhooks ──────────────────────────────────────────────────

/**
 * List all registered webhooks for the admin's enterprise.
 * Secret field is never included in list responses.
 */
export async function GET(request: NextRequest) {
  const { session: authSession, error } = await requireAuth(["admin"]);
  if (error) return error;
  const requestId = getRequestId(request);

  try {
    const enterpriseId = authSession.user.enterpriseId ?? null;

    const enterpriseCondition = enterpriseId
      ? eq(webhooks.enterpriseId, enterpriseId)
      : isNull(webhooks.enterpriseId);

    const rows = await db
      .select({
        id: webhooks.id,
        enterpriseId: webhooks.enterpriseId,
        name: webhooks.name,
        url: webhooks.url,
        events: webhooks.events,
        active: webhooks.active,
        createdBy: webhooks.createdBy,
        createdAt: webhooks.createdAt,
        updatedAt: webhooks.updatedAt,
      })
      .from(webhooks)
      .where(enterpriseCondition)
      .orderBy(desc(webhooks.createdAt));

    return NextResponse.json({ webhooks: rows });
  } catch (err) {
    console.error(`[${requestId}] Failed to list webhooks:`, err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to list webhooks", undefined, requestId);
  }
}

// ─── POST /api/admin/webhooks ─────────────────────────────────────────────────

/**
 * Register a new webhook endpoint.
 * Auto-generates a 32-byte hex HMAC signing secret.
 * Returns the full record including secret (shown once — never returned by GET).
 */
export async function POST(request: NextRequest) {
  const { session: authSession, error } = await requireAuth(["admin"]);
  if (error) return error;
  const requestId = getRequestId(request);

  const { data: body, error: bodyError } = await parseBody(request, CreateWebhookSchema);
  if (bodyError) return bodyError;

  try {
    const enterpriseId = authSession.user.enterpriseId ?? null;
    const secret = randomBytes(32).toString("hex");
    const encryptedSecret = encryptSecret(secret);

    const [row] = await db
      .insert(webhooks)
      .values({
        enterpriseId,
        name: body.name,
        url: body.url,
        secret: encryptedSecret,
        events: body.events,
        active: true,
        createdBy: authSession.user.email!,
      })
      .returning();

    // Audit log: webhook creation
    try {
      await db.insert(auditLog).values({
        actorEmail: authSession.user.email!,
        actorRole: authSession.user.role!,
        action: "webhook.created",
        entityType: "webhook",
        entityId: row.id,
        enterpriseId,
        metadata: {
          webhookName: body.name,
          webhookUrl: body.url,
          events: body.events,
        },
      });
    } catch (auditErr) {
      console.error(`[${requestId}] Failed to write audit log:`, auditErr);
    }

    // Return full record including plaintext secret (this is the only time it is returned)
    // The DB stores the encrypted version; override with plaintext for the response
    return NextResponse.json({ webhook: { ...row, secret } }, { status: 201 });
  } catch (err) {
    console.error(`[${requestId}] Failed to create webhook:`, err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to create webhook", undefined, requestId);
  }
}
