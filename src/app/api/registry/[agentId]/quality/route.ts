import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentBlueprints, blueprintQualityScores } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { assertEnterpriseAccess } from "@/lib/auth/enterprise";
import { getRequestId } from "@/lib/request-id";

/**
 * GET /api/registry/[agentId]/quality
 * Returns the latest blueprint quality score for an agent.
 * Scores are populated by the quality-evaluator when a blueprint enters in_review.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { session: authSession, error } = await requireAuth();
  if (error) return error;
  const requestId = getRequestId(request);
  try {
    const { agentId } = await params;

    // Get the latest blueprint for this agent
    const latest = await db
      .select({ id: agentBlueprints.id, enterpriseId: agentBlueprints.enterpriseId })
      .from(agentBlueprints)
      .where(eq(agentBlueprints.agentId, agentId))
      .orderBy(desc(agentBlueprints.createdAt))
      .limit(1);

    if (latest.length === 0) {
      return apiError(ErrorCode.NOT_FOUND, "Agent not found");
    }

    const enterpriseError = assertEnterpriseAccess(latest[0].enterpriseId, authSession.user);
    if (enterpriseError) return enterpriseError;

    // Get the latest quality score for this blueprint
    const scores = await db
      .select()
      .from(blueprintQualityScores)
      .where(eq(blueprintQualityScores.blueprintId, latest[0].id))
      .orderBy(desc(blueprintQualityScores.evaluatedAt))
      .limit(1);

    return NextResponse.json({ score: scores[0] ?? null });
  } catch (err) {
    console.error(`[${requestId}] Failed to fetch quality score:`, err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to fetch quality score", undefined, requestId);
  }
}
