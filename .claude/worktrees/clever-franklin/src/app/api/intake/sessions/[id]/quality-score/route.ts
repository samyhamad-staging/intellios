import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { intakeSessions, intakeQualityScores } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { assertEnterpriseAccess } from "@/lib/auth/enterprise";
import { getRequestId } from "@/lib/request-id";

/**
 * GET /api/intake/sessions/[id]/quality-score
 *
 * Returns the most recent AI quality evaluation for a finalized intake session.
 * Returns null if no score exists yet (evaluator runs asynchronously).
 *
 * Access: any authenticated role (matches the session access pattern).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session: authSession, error } = await requireAuth();
  if (error) return error;
  const requestId = getRequestId(request);

  try {
    const { id } = await params;

    const intakeSession = await db.query.intakeSessions.findFirst({
      where: eq(intakeSessions.id, id),
    });
    if (!intakeSession) {
      return apiError(ErrorCode.NOT_FOUND, "Session not found");
    }

    const enterpriseError = assertEnterpriseAccess(intakeSession.enterpriseId, authSession.user);
    if (enterpriseError) return enterpriseError;

    const rows = await db
      .select()
      .from(intakeQualityScores)
      .where(eq(intakeQualityScores.sessionId, id))
      .orderBy(desc(intakeQualityScores.evaluatedAt))
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json({ score: null });
    }

    const row = rows[0];
    return NextResponse.json({
      score: {
        id: row.id,
        overallScore: row.overallScore != null ? parseFloat(row.overallScore) : null,
        dimensions: {
          breadthScore: row.breadthScore != null ? parseFloat(row.breadthScore) : null,
          ambiguityScore: row.ambiguityScore != null ? parseFloat(row.ambiguityScore) : null,
          riskIdScore: row.riskIdScore != null ? parseFloat(row.riskIdScore) : null,
          stakeholderScore: row.stakeholderScore != null ? parseFloat(row.stakeholderScore) : null,
        },
        evaluatorModel: row.evaluatorModel,
        evaluatedAt: row.evaluatedAt.toISOString(),
      },
    });
  } catch (err) {
    console.error(`[${requestId}] Failed to fetch intake quality score:`, err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to fetch quality score", undefined, requestId);
  }
}
