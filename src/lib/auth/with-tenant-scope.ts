/**
 * Combined Tenant Isolation — Application-Level + Database-Level (RLS)
 *
 * This utility provides defense-in-depth tenant isolation by combining:
 * 1. Application-level: `getEnterpriseId()` extracts context from JWT-injected headers
 * 2. Database-level: `setRLSContext()` sets PostgreSQL session variables for RLS policies
 *
 * ## Two usage patterns:
 *
 * ### Pattern 1: `withTenantScopeGuarded(request, handler)` (PREFERRED)
 * Wraps the handler in a try/finally that automatically clears the RLS context
 * when the handler completes, preventing tenant context from leaking on pooled
 * connections.
 *
 * ```ts
 * export async function GET(request: NextRequest) {
 *   return withTenantScopeGuarded(request, async (ctx) => {
 *     const rows = await db.select().from(table).where(enterpriseScope(table.enterpriseId, ctx));
 *     return NextResponse.json({ rows });
 *   });
 * }
 * ```
 *
 * ### Pattern 2: `withTenantScope(request)` (legacy — requires manual cleanup)
 * Sets the RLS context and returns the enterprise context. Caller MUST call
 * `clearRLSContext()` in a finally block.
 *
 * ```ts
 * export async function GET(request: NextRequest) {
 *   const ctx = await withTenantScope(request);
 *   try {
 *     const rows = await db.select().from(table).where(enterpriseScope(table.enterpriseId, ctx));
 *     return NextResponse.json({ rows });
 *   } finally {
 *     await clearRLSContext();
 *   }
 * }
 * ```
 */

import type { NextRequest } from "next/server";
import { getEnterpriseId, type EnterpriseContext } from "./enterprise-scope";
import { setRLSContext, clearRLSContext } from "@/lib/db/rls";

/**
 * Extract the enterprise context from the request AND activate PostgreSQL RLS
 * for the current database connection.
 *
 * WARNING: This sets a session-level variable on a potentially pooled connection.
 * You MUST call `clearRLSContext()` in a finally block when using this function,
 * or use `withTenantScopeGuarded()` instead which handles cleanup automatically.
 */
export async function withTenantScope(request: NextRequest): Promise<EnterpriseContext> {
  const ctx = getEnterpriseId(request);
  await setRLSContext(ctx);
  return ctx;
}

/**
 * PREFERRED: Sets the RLS context, runs the handler, then automatically clears
 * the RLS context in a finally block — preventing tenant context from leaking
 * to subsequent requests on pooled connections.
 *
 * @param request - The incoming Next.js request (used to extract enterprise context)
 * @param handler - Async function that receives the EnterpriseContext and returns a Response
 * @returns The Response from the handler
 */
export async function withTenantScopeGuarded<T>(
  request: NextRequest,
  handler: (ctx: EnterpriseContext) => Promise<T>
): Promise<T> {
  const ctx = getEnterpriseId(request);
  await setRLSContext(ctx);
  try {
    return await handler(ctx);
  } finally {
    await clearRLSContext();
  }
}

// Re-export for convenience — callers using the legacy pattern need this
export { clearRLSContext } from "@/lib/db/rls";
