/**
 * Enterprise Scope — middleware-injected tenant isolation.
 *
 * The Next.js middleware stamps `x-enterprise-id` and `x-user-role` on every
 * authenticated request. Route handlers call the utilities below to read the
 * caller's enterprise context and generate Drizzle WHERE filters — without
 * trusting user-supplied parameters or making a second auth call.
 *
 * This creates a **single enforcement point** for tenant isolation:
 *
 *   Middleware (extract from JWT) → Header → Route → enterpriseScope() → DB
 *
 * Cross-tenant data access is structurally impossible because the enterprise_id
 * originates from the signed JWT — not from the request body or query string.
 *
 * ## Usage
 *
 * ```ts
 * import { getEnterpriseId, enterpriseScope } from "@/lib/auth/enterprise-scope";
 * import { agentBlueprints } from "@/lib/db/schema";
 *
 * export async function GET(request: NextRequest) {
 *   const eid = getEnterpriseId(request);
 *   // eid.enterpriseId   → string | null
 *   // eid.isAdmin        → boolean
 *   // eid.actorEmail     → string
 *
 *   const filter = enterpriseScope(agentBlueprints.enterpriseId, eid);
 *   // filter → eq(col, 'ent_123') | isNull(col) | undefined (admin)
 *
 *   const rows = await db.select().from(agentBlueprints).where(filter);
 * }
 * ```
 */

import type { NextRequest } from "next/server";
import type { Column } from "drizzle-orm";
import { eq, isNull } from "drizzle-orm";

// ── Types ────────────────────────────────────────────────────────────────────

export interface EnterpriseContext {
  /** The authenticated user's enterprise ID. Null for platform admins / unscoped. */
  enterpriseId: string | null;
  /** True when the user has the 'admin' role (can access cross-tenant data). */
  isAdmin: boolean;
  /** The authenticated user's email (for audit logging). */
  actorEmail: string;
  /** The authenticated user's role string. */
  role: string;
}

// ── Extractors ───────────────────────────────────────────────────────────────

/**
 * Read the middleware-injected enterprise context from request headers.
 *
 * @throws Never — returns sensible defaults if headers are missing (e.g., for
 *         unauthenticated routes that don't go through auth middleware).
 */
export function getEnterpriseId(request: NextRequest): EnterpriseContext {
  const raw = request.headers.get("x-enterprise-id");
  const role = request.headers.get("x-user-role") ?? "viewer";
  const actorEmail = request.headers.get("x-actor-email") ?? "";

  const enterpriseId = raw === "__null__" || !raw ? null : raw;
  const isAdmin = role === "admin";

  return { enterpriseId, isAdmin, role, actorEmail };
}

// ── Scope Filter ─────────────────────────────────────────────────────────────

/**
 * Generate a Drizzle WHERE condition that scopes a query to the caller's
 * enterprise. This is the canonical way to enforce tenant isolation in any
 * list/query endpoint.
 *
 * Behavior:
 *   - Admin users → returns `undefined` (no filter — platform-wide access)
 *   - Users with enterpriseId → returns `eq(column, enterpriseId)`
 *   - Users without enterpriseId (null) → returns `isNull(column)`
 *
 * Combine with other WHERE conditions using `and()`:
 *
 * ```ts
 * const rows = await db.select().from(table)
 *   .where(and(enterpriseScope(table.enterpriseId, ctx), eq(table.status, "active")));
 * ```
 */
export function enterpriseScope(
  column: Column,
  ctx: EnterpriseContext
) {
  if (ctx.isAdmin) return undefined;
  if (ctx.enterpriseId) return eq(column, ctx.enterpriseId);
  return isNull(column);
}

// ── Resource Access ──────────────────────────────────────────────────────────

/**
 * Check whether the authenticated user can access a specific resource.
 * This is the middleware-aware equivalent of `assertEnterpriseAccess()`.
 *
 * Returns true if access is granted, false if denied.
 */
export function canAccessResource(
  resourceEnterpriseId: string | null,
  ctx: EnterpriseContext
): boolean {
  if (ctx.isAdmin) return true;
  if (!resourceEnterpriseId) return true; // unscoped / legacy resource
  return ctx.enterpriseId === resourceEnterpriseId;
}

/**
 * Returns a 403 NextResponse if the user cannot access the resource,
 * or null if access is granted. Drop-in replacement for the legacy
 * `assertEnterpriseAccess()` that reads from middleware headers.
 */
export { assertEnterpriseAccess } from "./enterprise";
