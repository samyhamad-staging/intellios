/**
 * Row-Level Security (RLS) Session Variable Management
 *
 * PostgreSQL RLS policies on all tenant tables use `current_setting('app.current_enterprise_id')`
 * to filter rows. This module provides helpers to set that variable at the start of each request.
 *
 * ## Two modes of operation:
 *
 * 1. `setRLSContext(ctx)` — Session-level (`is_local = false`). Sets the variable for the
 *    entire connection lifetime. Used for non-transactional queries in route handlers.
 *    IMPORTANT: Always call `clearRLSContext()` at the end of the request to prevent
 *    tenant context from leaking to subsequent requests on pooled connections.
 *
 * 2. `setRLSContextInTx(tx, ctx)` — Transaction-local (`is_local = true`). Sets the variable
 *    only for the current transaction. PostgreSQL automatically resets it when the transaction
 *    ends. This is the PREFERRED mode for any code running inside `db.transaction()`.
 *
 * Usage in API routes:
 *   const ctx = getEnterpriseId(request);
 *   await setRLSContext(ctx);
 *   try {
 *     // queries here are RLS-scoped
 *   } finally {
 *     await clearRLSContext();
 *   }
 *
 * Usage inside transactions:
 *   await db.transaction(async (tx) => {
 *     await setRLSContextInTx(tx, ctx);
 *     // queries on `tx` are RLS-scoped; auto-reset on commit/rollback
 *   });
 */

import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import type { EnterpriseContext } from "@/lib/auth/enterprise-scope";

// Helper: resolve the enterprise value for set_config
function resolveEnterpriseValue(ctx: EnterpriseContext): string {
  if (ctx.isAdmin) return "__admin__";
  if (ctx.enterpriseId) return ctx.enterpriseId;
  return ""; // fail-closed
}

/**
 * Set the RLS session variable for the current database connection (session-level).
 * Must be called before any tenant-scoped queries.
 *
 * WARNING: With connection pooling, always pair with `clearRLSContext()` in a finally
 * block to prevent tenant context from leaking to subsequent requests on the same
 * pooled connection.
 *
 * - For tenant users: sets enterprise_id to their tenant
 * - For admin users: sets '__admin__' which bypasses RLS policies
 * - For unauthenticated/unknown: sets empty string (fail-closed — no rows visible)
 */
export async function setRLSContext(ctx: EnterpriseContext): Promise<void> {
  const value = resolveEnterpriseValue(ctx);
  await db.execute(sql`SELECT set_config('app.current_enterprise_id', ${value}, false)`);
}

/**
 * Set the RLS variable scoped to a specific transaction (transaction-local).
 * PostgreSQL automatically resets the variable when the transaction commits or rolls back,
 * eliminating the risk of tenant context leaking to other requests on pooled connections.
 *
 * This is the PREFERRED mode for code running inside `db.transaction()`.
 *
 * @param tx - The Drizzle transaction handle from `db.transaction(async (tx) => { ... })`
 * @param ctx - The enterprise context from `getEnterpriseId(request)`
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function setRLSContextInTx(tx: any, ctx: EnterpriseContext): Promise<void> {
  const value = resolveEnterpriseValue(ctx);
  // `true` = is_local: variable is automatically reset when the transaction ends
  await tx.execute(sql`SELECT set_config('app.current_enterprise_id', ${value}, true)`);
}

/**
 * Clear the RLS context. MUST be called in finally blocks when using session-level
 * `setRLSContext()` to prevent tenant context from leaking to subsequent requests
 * on pooled connections.
 *
 * Not needed when using `setRLSContextInTx()` — PostgreSQL handles cleanup automatically.
 */
export async function clearRLSContext(): Promise<void> {
  await db.execute(sql`SELECT set_config('app.current_enterprise_id', '', false)`);
}
