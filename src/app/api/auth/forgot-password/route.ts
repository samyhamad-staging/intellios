import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, passwordResetTokens } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { parseBody } from "@/lib/parse-body";
import { sendEmail, buildNotificationEmail } from "@/lib/notifications/email";
import { rateLimit } from "@/lib/rate-limit";
import crypto from "node:crypto";
import { z } from "zod";

const ForgotPasswordBody = z.object({
  email: z.string().email(),
});

/**
 * POST /api/auth/forgot-password
 *
 * Initiates the password reset flow. Always returns HTTP 200 regardless of
 * whether the email exists — this prevents user enumeration.
 *
 * If the email is registered, generates a time-limited reset token,
 * stores its SHA-256 hash, and sends the raw token via email.
 *
 * Public endpoint — no authentication required.
 */
export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const rateLimitResponse = rateLimit(ip, {
    endpoint: "forgot-password",
    max: 5,
    windowMs: 60 * 60 * 1000, // 5 per hour per IP
  });
  if (rateLimitResponse) return rateLimitResponse;

  const { data: body, error: bodyError } = await parseBody(request, ForgotPasswordBody);
  if (bodyError) return bodyError;

  const email = body.email.toLowerCase();

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (user) {
      // Generate a 32-byte cryptographically random token
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await db.insert(passwordResetTokens).values({
        userId: user.id,
        tokenHash,
        expiresAt,
      });

      const resetPath = `/auth/reset-password?token=${rawToken}`;
      const title = "Reset your Intellios password";
      const message =
        "Click the link below to reset your password. This link expires in 1 hour. If you did not request a password reset, you can safely ignore this email.";

      void sendEmail({
        to: email,
        subject: "[Intellios] Reset your password",
        html: buildNotificationEmail(title, message, resetPath),
      });
    }
  } catch (err) {
    // Log but never expose — always return 200
    console.error("[forgot-password] Error processing reset request:", err);
  }

  // Always return 200 — never reveal whether the email exists
  return NextResponse.json({
    message: "If an account with that email exists, a reset link has been sent.",
  });
}
