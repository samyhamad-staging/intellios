import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, userInvitations } from "@/lib/db/schema";
import { and, eq, gt, isNull } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { parseBody } from "@/lib/parse-body";
import { getRequestId } from "@/lib/request-id";
import { z } from "zod";

const AcceptInviteBody = z.object({
  token: z.string().min(1),
  name: z.string().min(1).max(200),
  password: z.string().min(8).max(128),
});

/**
 * POST /api/auth/invite/accept
 *
 * Accepts a user invitation: creates the user account with the provided
 * name and password, then marks the invitation as accepted.
 *
 * Public — no requireAuth. Token validation is the security mechanism.
 */
export async function POST(request: NextRequest) {
  const { data: body, error: bodyError } = await parseBody(request, AcceptInviteBody);
  if (bodyError) return bodyError;

  const requestId = getRequestId(request);

  const tokenHash = crypto.createHash("sha256").update(body.token).digest("hex");

  try {
    // Validate invitation
    const invitation = await db.query.userInvitations.findFirst({
      where: and(
        eq(userInvitations.tokenHash, tokenHash),
        isNull(userInvitations.acceptedAt),
        gt(userInvitations.expiresAt, new Date())
      ),
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "This invitation has expired or has already been used." },
        { status: 400 }
      );
    }

    // Guard: ensure email not already registered (race condition safety)
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, invitation.email),
    });
    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please sign in." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(body.password, 12);

    // Create user
    await db.insert(users).values({
      name: body.name,
      email: invitation.email,
      passwordHash,
      role: invitation.role,
      enterpriseId: invitation.enterpriseId ?? null,
    });

    // Mark invitation accepted
    await db
      .update(userInvitations)
      .set({ acceptedAt: new Date() })
      .where(eq(userInvitations.id, invitation.id));

    return NextResponse.json({ message: "Account created successfully." });
  } catch (err) {
    console.error(`[${requestId}] Failed to accept invitation:`, err);
    return NextResponse.json({ error: "Failed to create account." }, { status: 500 });
  }
}
