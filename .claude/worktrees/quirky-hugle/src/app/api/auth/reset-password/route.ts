import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, passwordResetTokens } from "@/lib/db/schema";
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

    const resetRecord = await db.query.passwordResetTokens.findFirst({
      where: and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, new Date())
      ),
    });

    if (!resetRecord) {
      return NextResponse.json(
        { error: "Invalid or expired reset link." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(body.password, 12);

    await db
      .update(users)
      .set({ passwordHash })
      .where(eq(users.id, resetRecord.userId));

    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, resetRecord.id));

    return NextResponse.json({ message: "Password updated successfully." });
  } catch (err) {
    console.error(`[${requestId}] Failed to reset password:`, err);
    return NextResponse.json(
      { error: "An error occurred. Please try again." },
      { status: 500 }
    );
  }
}
