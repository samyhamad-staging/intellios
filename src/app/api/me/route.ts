import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require";

/**
 * GET /api/me
 * Returns the current authenticated user's public info.
 * Used by client components that need the current user's email/role
 * (e.g. ReviewPanel SOD check) without a server component prop chain.
 */
export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  return NextResponse.json({
    user: {
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
      enterpriseId: session.user.enterpriseId ?? null,
    },
  });
}
