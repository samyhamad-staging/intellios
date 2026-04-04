import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { userInvitations, users } from "@/lib/db/schema";
import { and, eq, gt, isNull } from "drizzle-orm";
import crypto from "node:crypto";

/**
 * GET /api/auth/invite/validate?token=...
 *
 * Validates an invitation token and returns the associated email, role,
 * inviter name, and enterprise name.
 * Used by the accept-invitation page to pre-fill the form and display
 * a trust banner before the user types their credentials.
 *
 * Public — no requireAuth.
 * Returns 200 { email, role, inviterName, enterpriseName } if valid;
 * 404 if expired, used, or not found.
 */

/** Converts a slug like "acme-bank" or "jp_morgan" → "Acme Bank" / "Jp Morgan" */
function formatEnterpriseName(slug: string | null | undefined): string {
  if (!slug) return "";
  return slug
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

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

  // Resolve inviter name and enterprise name for the trust banner
  let inviterName = "";
  let enterpriseName = formatEnterpriseName(invitation.enterpriseId);

  const inviter = await db.query.users.findFirst({
    where: eq(users.id, invitation.invitedBy),
    columns: { name: true, enterpriseId: true },
  });

  if (inviter) {
    inviterName = inviter.name;
    // Use inviter's enterpriseId as fallback if invitation row doesn't have one
    if (!enterpriseName && inviter.enterpriseId) {
      enterpriseName = formatEnterpriseName(inviter.enterpriseId);
    }
  }

  return NextResponse.json({
    email: invitation.email,
    role: invitation.role,
    inviterName,
    enterpriseName,
  });
}
