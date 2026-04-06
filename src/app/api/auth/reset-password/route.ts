import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, passwordResetTokens, auditLog } from "@/lib/db/schema";
import { eq, and, isNull, gt } from "drizzle-orm";
import { parseBody } from "@/lib/parse-body";
import { rateLimit } from "@/lib/rate-limit";
import { getRequestId } from "@/lib/request-id";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { z } from "zod";

const ResetPasswordBody = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128),
});

/**
 * POST /api/auth/reset-password
 *
 * Validates a password reset token and updates the user's password.
 * Returns 400 on invalid, expired, or already-used tokens.
 *
 * Public endpoint — no authentication required.
 */
export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const rateLimitResponse = await rateLimit(ip, {
    endpoint: "reset-password",
    max: 10,
    windowMs: 60 * 60 * 1000, // 10 per hour per IP
  });
  if (rateLimitResponse) return rateLimitResponse;

  const { data: body, error: bodyError } = await parseBody(request, ResetPasswordBody);
  if (bodyError) return bodyError;

  const requestId = getRequestId(request);

  try {
    const tokenHash = crypto.createHash("sha256").update(body.token).digest("hex");

    // P1-SEC-001 FIX: Wrap in transaction to prevent race condition.
    // Without a transaction, concurrent requests with the same token can both
    // pass the isNull(usedAt) check before either marks the token as used.
    const result = await db.transaction(async (tx) => {
      const resetRecord = await tx.query.passwordResetTokens.findFirst({
        where: and(
          eq(passwordResetTokens.tokenHash, tokenHash),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, new Date())
        ),
      });

      if (!resetRecord) return { ok: false as const };

      // Mark token as used FIRST (within transaction) to prevent concurrent reuse
      await tx
        .update(passwordResetTokens)
        .set({ usedAt: new Date() })
        .where(eq(passwordResetTokens.id, resetRecord.id));

      const passwordHash = await bcrypt.hash(body.password, 12);

      const [updatedUser] = await tx
        .update(users)
        .set({ passwordHash })
        .where(eq(users.id, resetRecord.userId))
        .returning({
          id: users.id,
          email: users.email,
          role: users.role,
          enterpriseId: users.enterpriseId,
        });

      return { ok: true as const, user: updatedUser, resetTokenId: resetRecord.id };
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: "Invalid or expired reset link." },
        { status: 400 }
      );
    }

    // Audit log: password reset (actor is the user whose password was reset)
    try {
      await db.insert(auditLog).values({
        actorEmail: result.user.email,
        actorRole: result.user.role,
        action: "user.password_reset",
        entityType: "user",
        entityId: result.user.id,
        enterpriseId: result.user.enterpriseId,
        metadata: {
          resetTokenId: result.resetTokenId,
        },
      });
    } catch (auditErr) {
      console.error(`[${requestId}] Failed to write audit log:`, auditErr);
    }

    return NextResponse.json({ message: "Password updated successfully." });
  } catch (err) {
    console.error(`[${requestId}] Failed to reset password:`, err);
    return NextResponse.json(
      { error: "An error occurred. Please try again." },
      { status: 500 }
    );
  }
}
