import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auditLog } from "@/lib/db/schema";
import { and, gte, lte, eq, desc, isNull, count } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { getRequestId } from "@/lib/request-id";

/**
 * GET /api/audit
 * Returns audit log entries. Restricted to compliance_officer, admin, and viewer.
 *
 * Query params:
 *   entityType  — filter by entity type (blueprint | intake_session | policy)
 *   entityId    — filter by entity UUID
 *   actorEmail  — filter by actor
 *   from        — ISO 8601 start date (inclusive)
 *   to          — ISO 8601 end date (inclusive)
 *   limit       — max rows per page (default 50, max 100)
 *   offset      — pagination offset (default 0)
 */
export async function GET(request: NextRequest) {
  const { session: authSession, error } = await requireAuth(["compliance_officer", "admin", "viewer"]);
  if (error) return error;
  const requestId = getRequestId(request);

  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");
    const actorEmail = searchParams.get("actorEmail");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
    const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10));

    const conditions = [];
    // Non-admins are automatically scoped to their enterprise
    if (authSession.user.role !== "admin") {
      if (authSession.user.enterpriseId) {
        conditions.push(eq(auditLog.enterpriseId, authSession.user.enterpriseId));
      } else {
        conditions.push(isNull(auditLog.enterpriseId));
      }
    }
    if (entityType) conditions.push(eq(auditLog.entityType, entityType));
    if (entityId) conditions.push(eq(auditLog.entityId, entityId));
    if (actorEmail) conditions.push(eq(auditLog.actorEmail, actorEmail));
    if (from) conditions.push(gte(auditLog.createdAt, new Date(from)));
    if (to) conditions.push(lte(auditLog.createdAt, new Date(to)));

    const condition = conditions.length > 0 ? and(...conditions) : undefined;

    const [entries, countResult] = await Promise.all([
      db
        .select()
        .from(auditLog)
        .where(condition)
        .orderBy(desc(auditLog.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ total: count() })
        .from(auditLog)
        .where(condition),
    ]);

    return NextResponse.json({ entries, total: countResult[0].total, limit, offset });
  } catch (error) {
    console.error(`[${requestId}] Failed to fetch audit log:`, error);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to fetch audit log", undefined, requestId);
  }
}
