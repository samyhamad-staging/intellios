import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { userInvitations } from "@/lib/db/schema";
import { and, eq, gt, isNull } from "drizzle-orm";
import crypto from "node:crypto";

/**
 * GET /api/auth/invite/validate?token=...
 *
 * Validates an invitation token and returns the associated email and role.
 * Used by the accept-invitation page to pre-fill the form and confirm the
 * token is still valid before the user types their credentials.
 *
 * Public — no requireAuth.
 * Returns 200 { email, role } if valid; 404 if expired, used, or not found.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawToken = searchParams.get("token");

  if (!rawToken) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  const invitation = await db.query.userInvitations.findFirst({
    where: and(
      eq(userInvitations.tokenHash, tokenHash),
      isNull(userInvitations.acceptedAt),
      gt(userInvitations.expiresAt, new Date())
    ),
  });

  if (!invitation) {
    return NextResponse.json(
      { error: "This invitation has expired or is invalid." },
      { status: 404 }
    );
  }

  return NextResponse.json({ email: invitation.email, role: invitation.role });
}
