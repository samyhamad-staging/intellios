import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auditLog } from "@/lib/db/schema";
import { and, desc, eq, gte, isNull, lte, or } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { getRequestId } from "@/lib/request-id";

/**
 * GET /api/events
 *
 * Returns a paginated, filtered list of lifecycle events from the audit log.
 * Events are shaped as EventEnvelope-compatible objects for consumption by
 * external systems and the Governor audit view.
 *
 * Query params:
 *   type        — filter by event type (e.g. "blueprint.status_changed")
 *   entityType  — filter by entity type ("blueprint" | "intake_session" | "policy")
 *   since       — ISO 8601 lower bound (inclusive)
 *   until       — ISO 8601 upper bound (inclusive)
 *   limit       — max rows (default 100, max 500)
 *   offset      — pagination offset (default 0)
 *
 * H1-4.3
 */
export async function GET(request: NextRequest) {
  const { session: authSession, error } = await requireAuth([
    "architect", "reviewer", "compliance_officer", "admin", "viewer",
  ]);
  if (error) return error;
  const requestId = getRequestId(request);

  const { searchParams } = new URL(request.url);
  const type       = searchParams.get("type") ?? undefined;
  const entityType = searchParams.get("entityType") ?? undefined;
  const since      = searchParams.get("since") ?? undefined;
  const until      = searchParams.get("until") ?? undefined;
  const limit      = Math.min(parseInt(searchParams.get("limit") ?? "100", 10), 500);
  const offset     = parseInt(searchParams.get("offset") ?? "0", 10);

  try {
    // Enterprise scoping — admins see all, others see their enterprise only
    const enterpriseFilter =
      authSession.user.role === "admin"
        ? undefined
        : authSession.user.enterpriseId
        ? eq(auditLog.enterpriseId, authSession.user.enterpriseId)
        : isNull(auditLog.enterpriseId);

    const filters = [
      enterpriseFilter,
      type       ? eq(auditLog.action, type)           : undefined,
      entityType ? eq(auditLog.entityType, entityType) : undefined,
      since      ? gte(auditLog.createdAt, new Date(since)) : undefined,
      until      ? lte(auditLog.createdAt, new Date(until)) : undefined,
    ].filter(Boolean) as ReturnType<typeof eq>[];

    const rows = await db
      .select({
        id:          auditLog.id,
        action:      auditLog.action,
        entityType:  auditLog.entityType,
        entityId:    auditLog.entityId,
        actorEmail:  auditLog.actorEmail,
        actorRole:   auditLog.actorRole,
        enterpriseId: auditLog.enterpriseId,
        metadata:    auditLog.metadata,
        createdAt:   auditLog.createdAt,
      })
      .from(auditLog)
      .where(filters.length > 0 ? and(...filters) : undefined)
      .orderBy(desc(auditLog.createdAt))
      .limit(limit)
      .offset(offset);

    // Shape each row as an EventEnvelope-compatible object
    const events = rows.map((row) => ({
      id:          row.id,
      timestamp:   row.createdAt.toISOString(),
      enterpriseId: row.enterpriseId ?? null,
      event: {
        type:    row.action,
        payload: row.metadata ?? {},
      },
      actor: {
        email: row.actorEmail,
        role:  row.actorRole,
      },
      entity: {
        type: row.entityType,
        id:   row.entityId,
      },
    }));

    return NextResponse.json({ events, limit, offset, count: events.length });
  } catch (err) {
    console.error(`[${requestId}] Failed to list events:`, err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to list events", undefined, requestId);
  }
}
