import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auditLog } from "@/lib/db/schema";
import { and, gte, lte, eq, desc } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";

/**
 * GET /api/audit
 * Returns audit log entries. Restricted to compliance_officer and admin.
 *
 * Query params:
 *   entityType  — filter by entity type (blueprint | intake_session | policy)
 *   entityId    — filter by entity UUID
 *   actorEmail  — filter by actor
 *   from        — ISO 8601 start date (inclusive)
 *   to          — ISO 8601 end date (inclusive)
 *   limit       — max rows (default 200, max 1000)
 */
export async function GET(request: NextRequest) {
  const { error } = await requireAuth(["compliance_officer", "admin"]);
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");
    const actorEmail = searchParams.get("actorEmail");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "200", 10), 1000);

    const conditions = [];
    if (entityType) conditions.push(eq(auditLog.entityType, entityType));
    if (entityId) conditions.push(eq(auditLog.entityId, entityId));
    if (actorEmail) conditions.push(eq(auditLog.actorEmail, actorEmail));
    if (from) conditions.push(gte(auditLog.createdAt, new Date(from)));
    if (to) conditions.push(lte(auditLog.createdAt, new Date(to)));

    const entries = await db
      .select()
      .from(auditLog)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(auditLog.createdAt))
      .limit(limit);

    return NextResponse.json({ entries, count: entries.length });
  } catch (error) {
    console.error("Failed to fetch audit log:", error);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to fetch audit log");
  }
}
