/**
 * Quality Trends API — H2-2.2.
 *
 * GET /api/registry/[agentId]/quality/trends?weeks=12
 *
 * Returns the last N weekly quality snapshots for an agent, ordered by
 * weekStart ascending (oldest first, for charting).
 *
 * Auth: all authenticated roles; enterprise-scoped.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentBlueprints, qualityTrends } from "@/lib/db/schema";
import { asc, desc, eq } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { assertEnterpriseAccess } from "@/lib/auth/enterprise";
import { getRequestId } from "@/lib/request-id";
import { SAFE_BLUEPRINT_COLUMNS } from "@/lib/db/safe-columns";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { session: authSession, error } = await requireAuth();
  if (error) return error;
  const requestId = getRequestId(request);

  try {
    const { agentId } = await params;
    const { searchParams } = new URL(request.url);
    const weeks = Math.min(52, Math.max(1, parseInt(searchParams.get("weeks") ?? "12", 10) || 12));

    // Verify agent exists + enterprise access
    const [latest] = await db
      .select({ id: agentBlueprints.id, enterpriseId: agentBlueprints.enterpriseId })
      .from(agentBlueprints)
      .where(eq(agentBlueprints.agentId, agentId))
      .orderBy(desc(agentBlueprints.createdAt))
      .limit(1);

    if (!latest) {
      return apiError(ErrorCode.NOT_FOUND, "Agent not found", undefined, requestId);
    }

    const enterpriseError = assertEnterpriseAccess(latest.enterpriseId, authSession.user);
    if (enterpriseError) return enterpriseError;

    const trends = await db
      .select()
      .from(qualityTrends)
      .where(eq(qualityTrends.agentId, agentId))
      .orderBy(asc(qualityTrends.weekStart))
      .limit(weeks);

    return NextResponse.json({ trends });
  } catch (err) {
    console.error(`[${requestId}] Failed to fetch quality trends:`, err);
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      "Failed to fetch quality trends",
      undefined,
      requestId
    );
  }
}
