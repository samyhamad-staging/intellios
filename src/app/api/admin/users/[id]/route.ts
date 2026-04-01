import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { getRequestId } from "@/lib/request-id";
import { parseBody } from "@/lib/parse-body";
import { z } from "zod";

const ROLES = ["architect", "reviewer", "compliance_officer", "admin", "viewer"] as const;

const UpdateUserBody = z.object({
  name: z.string().min(1).max(200).optional(),
  role: z.enum(ROLES).optional(),
});

/**
 * PATCH /api/admin/users/[id]
 * Updates a user's name and/or role.
 * Admins may only update users within their own enterprise.
 * An admin cannot downgrade their own account.
 * Admin-only.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session: authSession, error: authError } = await requireAuth(["admin"]);
  if (authError) return authError;

  const { data: body, error: bodyError } = await parseBody(request, UpdateUserBody);
  if (bodyError) return bodyError;

  const requestId = getRequestId(request);
  const { id } = await params;

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
    });

    if (!user) {
      return apiError(ErrorCode.NOT_FOUND, "User not found", undefined, requestId);
    }

    // Enterprise-scoped access: admin can only manage their own enterprise's users
    if (
      authSession.user.enterpriseId !== null &&
      user.enterpriseId !== authSession.user.enterpriseId
    ) {
      return apiError(ErrorCode.FORBIDDEN, "Access denied", undefined, requestId);
    }

    // Admin cannot downgrade their own role
    if (id === authSession.user.id && body.role && body.role !== "admin") {
      return apiError(
        ErrorCode.FORBIDDEN,
        "You cannot change your own role",
        undefined,
        requestId
      );
    }

    const updates: Partial<{ name: string; role: string }> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.role !== undefined) updates.role = body.role;

    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        enterpriseId: users.enterpriseId,
        createdAt: users.createdAt,
      });

    return NextResponse.json({ user: updated });
  } catch (error) {
    console.error(`[${requestId}] Failed to update user:`, error);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to update user", undefined, requestId);
  }
}
