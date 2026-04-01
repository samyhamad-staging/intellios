import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentTelemetry, agentBlueprints } from "@/lib/db/schema";
import { and, eq, gte, lte, desc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require";
import { apiError, ErrorCode } from "@/lib/errors";

/**
 * GET /api/telemetry/[agentId]?since=<ISO>&until=<ISO>&granularity=<hour|day|week>
 *
 * Returns time-series telemetry data for a deployed agent.
 * Auth: any authenticated user (data filtered to their enterprise).
 *
 * Query params:
 *   since       — ISO 8601 datetime (default: 7 days ago)
 *   until       — ISO 8601 datetime (default: now)
 *   granularity — "hour" | "day" | "week" (default: "day") — reserved for future aggregation
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { agentId } = await params;

  const url = new URL(request.url);
  const sinceParam = url.searchParams.get("since");
  const untilParam = url.searchParams.get("until");

  const now = new Date();
  const since = sinceParam ? new Date(sinceParam) : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const until = untilParam ? new Date(untilParam) : now;

  if (isNaN(since.getTime()) || isNaN(until.getTime())) {
    return apiError(ErrorCode.BAD_REQUEST, "Invalid since or until date");
  }

  // Verify the agent exists and belongs to the user's enterprise
  const blueprint = await db.query.agentBlueprints.findFirst({
    where: and(
      eq(agentBlueprints.agentId, agentId),
      session.user.enterpriseId
        ? eq(agentBlueprints.enterpriseId, session.user.enterpriseId)
        : undefined
    ),
    columns: { agentId: true, enterpriseId: true, status: true },
  });

  if (!blueprint) {
    return apiError(ErrorCode.NOT_FOUND, "Agent not found");
  }

  const rows = await db
    .select()
    .from(agentTelemetry)
    .where(
      and(
        eq(agentTelemetry.agentId, agentId),
        gte(agentTelemetry.timestamp, since),
        lte(agentTelemetry.timestamp, until)
      )
    )
    .orderBy(desc(agentTelemetry.timestamp))
    .limit(10000);

  return NextResponse.json({ agentId, since: since.toISOString(), until: until.toISOString(), data: rows });
}
