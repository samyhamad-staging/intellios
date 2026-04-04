import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { userInvitations, users } from "@/lib/db/schema";
import { and, eq, gt, isNull } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { getRequestId } from "@/lib/request-id";

/**
 * GET /api/admin/users/invitations
 *
 * Returns pending (unexpired + unaccepted) invitations scoped to the admin's
 * enterprise. Includes the name of the user who sent each invitation.
 *
 * Admin-only.
 */
export async function GET(request: NextRequest) {
  const { session: authSession, error: authError } = await requireAuth(["admin"]);
  if (authError) return authError;

  const requestId = getRequestId(request);
  const enterpriseId = authSession.user.enterpriseId ?? null;

  try {
    const now = new Date();

    const rows = await db
      .select({
        id: userInvitations.id,
        email: userInvitations.email,
        role: userInvitations.role,
        enterpriseId: userInvitations.enterpriseId,
        expiresAt: userInvitations.expiresAt,
        createdAt: userInvitations.createdAt,
        invitedByEmail: users.email,
        invitedByName: users.name,
      })
      .from(userInvitations)
      .leftJoin(users, eq(userInvitations.invitedBy, users.id))
      .where(
        and(
          enterpriseId
            ? eq(userInvitations.enterpriseId, enterpriseId)
            : isNull(userInvitations.enterpriseId),
          isNull(userInvitations.acceptedAt),
          gt(userInvitations.expiresAt, now)
        )
      )
      .orderBy(userInvitations.createdAt);

    return NextResponse.json({
      invitations: rows.map((r) => ({
        id: r.id,
        email: r.email,
        role: r.role,
        enterpriseId: r.enterpriseId,
        expiresAt: r.expiresAt.toISOString(),
        createdAt: r.createdAt.toISOString(),
        invitedBy: {
          email: r.invitedByEmail ?? "",
          name: r.invitedByName ?? "",
        },
      })),
    });
  } catch (err) {
    console.error(`[${requestId}] Failed to list invitations:`, err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to list invitations", undefined, requestId);
  }
}
