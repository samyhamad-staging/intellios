import { NextResponse } from "next/server";
import { apiError, ErrorCode } from "@/lib/errors";

/**
 * Options for {@link assertEnterpriseAccess}.
 */
export interface AssertEnterpriseAccessOptions {
  /**
   * When true, a resource with `enterpriseId === null` is treated as
   * legitimately unscoped (platform-wide / system-owned) and is readable by
   * any authenticated user. Callers MUST opt into this explicitly.
   *
   * Legitimate use cases include:
   *   - Audit log entries that record platform-level actions
   *   - Built-in / system default governance policies
   *   - Template or example resources shipped with the platform
   *
   * For tenant-owned resources (intake sessions, blueprints, agent runs,
   * notifications, webhooks, deployment health) a null enterpriseId is a
   * data integrity defect, NOT an affordance — leave this false (the
   * default) so such rows fail closed.
   *
   * Default: false.
   */
  allowUnscoped?: boolean;
}

/**
 * Checks that the authenticated user has access to a resource belonging to
 * the given enterpriseId.
 *
 * Rules (evaluated in order):
 *   1. admin role                          → always allowed (platform-wide access)
 *   2. null resourceEnterpriseId
 *        + options.allowUnscoped === true  → allowed (legitimately unscoped)
 *        + otherwise                       → denied (fail-closed default)
 *   3. user.enterpriseId matches resource  → allowed
 *   4. otherwise                           → denied
 *
 * ## Security note
 *
 * Prior to 2026-04-16, a null resourceEnterpriseId was silently treated as
 * "unscoped / legacy" and allowed for all users. This created a cross-tenant
 * read path on any tenant table that does not enforce NOT NULL on
 * enterprise_id at the schema level. The default is now fail-closed; callers
 * that legitimately serve unscoped resources must opt in via
 * `{ allowUnscoped: true }`.
 *
 * See `docs/decisions/` for the corresponding ADR.
 *
 * @returns null when access is granted, or a 403 NextResponse when denied.
 */
export function assertEnterpriseAccess(
  resourceEnterpriseId: string | null,
  user: { role: string; enterpriseId: string | null },
  options: AssertEnterpriseAccessOptions = {}
): NextResponse | null {
  // 1. Platform admins bypass tenant scoping.
  if (user.role === "admin") return null;

  // 2. Null resource enterprise id — only allowed when the caller has
  //    explicitly declared that unscoped access is legitimate for this
  //    resource type. Default is fail-closed.
  if (resourceEnterpriseId === null) {
    if (options.allowUnscoped === true) return null;
    return apiError(
      ErrorCode.FORBIDDEN,
      "Access denied: resource has no enterprise scope"
    );
  }

  // 3. Tenant user whose enterprise matches the resource.
  if (user.enterpriseId === resourceEnterpriseId) return null;

  // 4. Everything else is denied.
  return apiError(
    ErrorCode.FORBIDDEN,
    "Access denied: resource belongs to a different enterprise"
  );
}
