import { auth } from "@/auth";
import { apiError, ErrorCode } from "@/lib/errors";
import type { Session } from "next-auth";

export type Role = "architect" | "reviewer" | "compliance_officer" | "admin" | "viewer";

type AuthSuccess = { session: Session; error: null };
type AuthFailure = { session: null; error: ReturnType<typeof apiError> };

/**
 * Call at the top of any API route handler to verify authentication and
 * optionally enforce role-based access control.
 *
 * Usage:
 *   const { session, error } = await requireAuth(["architect", "admin"]);
 *   if (error) return error;
 *   // session.user.role, session.user.email are now available
 */
export async function requireAuth(
  allowedRoles?: Role[]
): Promise<AuthSuccess | AuthFailure> {
  const session = await auth();

  if (!session?.user) {
    return {
      session: null,
      error: apiError(ErrorCode.UNAUTHORIZED, "Authentication required"),
    };
  }

  if (allowedRoles && !allowedRoles.includes(session.user.role as Role)) {
    return {
      session: null,
      error: apiError(ErrorCode.FORBIDDEN, "Access denied"),
    };
  }

  return { session, error: null };
}
