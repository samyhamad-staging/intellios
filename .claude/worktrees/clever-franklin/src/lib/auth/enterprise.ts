import { NextResponse } from "next/server";
import { apiError, ErrorCode } from "@/lib/errors";

/**
 * Checks that the authenticated user has access to a resource belonging to
 * the given enterpriseId.
 *
 * Rules:
 * - admin role → always allowed (cross-enterprise platform access)
 * - null resourceEnterpriseId → resource is unscoped / legacy; allowed for all
 * - otherwise → user's enterpriseId must match the resource's enterpriseId
 *
 * Returns null if access is granted, or a 403 NextResponse if denied.
 */
export function assertEnterpriseAccess(
  resourceEnterpriseId: string | null,
  user: { role: string; enterpriseId: string | null }
): NextResponse | null {
  if (user.role === "admin") return null;
  if (!resourceEnterpriseId) return null;
  if (user.enterpriseId === resourceEnterpriseId) return null;
  return apiError(ErrorCode.FORBIDDEN, "Access denied: resource belongs to a different enterprise");
}
