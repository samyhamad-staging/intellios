import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require";
import { getRequestId } from "@/lib/request-id";
import { apiError, ErrorCode } from "@/lib/errors";
import { getRecentSnapshots } from "@/lib/awareness/metrics-worker";
import { getRecentBriefings } from "@/lib/awareness/briefing-generator";
import { db } from "@/lib/db";
import { blueprintQualityScores, intakeQualityScores } from "@/lib/db/schema";
import { desc, eq, isNull } from "drizzle-orm";
import type { IntelligencePayload, QualityScoreResult, IntakeScoreResult } from "@/lib/awareness/types";

/**
 * GET /api/monitor/intelligence
 *
 * Combined data endpoint for the /monitor/intelligence page.
 * Returns: latest briefing, last 14 snapshots, last 10 quality scores, KPIs.
 *
 * Roles: compliance_officer | admin | viewer
 */
export async function GET(request: NextRequest) {
  const { session: authSession, error } = await requireAuth(["compliance_officer", "admin", "viewer"]);
  if (error) return error;
  void getRequestId(request);

  try {
    const enterpriseId = authSession.user.enterpriseId ?? null;

    const [briefings, snapshots, scoreRows, intakeScoreRows] = await Promise.all([
      getRecentBriefings(enterpriseId, 7),
      getRecentSnapshots(enterpriseId, 30),
      db
        .select()
        .from(blueprintQualityScores)
        .where(
          enterpriseId
            ? eq(blueprintQualityScores.enterpriseId, enterpriseId)
            : isNull(blueprintQualityScores.enterpriseId)
        )
        .orderBy(desc(blueprintQualityScores.evaluatedAt))
        .limit(10),
      db
        .select()
        .from(intakeQualityScores)
        .where(
          enterpriseId
            ? eq(intakeQualityScores.enterpriseId, enterpriseId)
            : isNull(intakeQualityScores.enterpriseId)
        )
        .orderBy(desc(intakeQualityScores.evaluatedAt))
        .limit(10),
    ]);

    const recentScores: QualityScoreResult[] = scoreRows.map((row) => ({
      id: row.id,
      blueprintId: row.blueprintId,
      enterpriseId: row.enterpriseId,
      overallScore: row.overallScore != null ? parseFloat(row.overallScore) : null,
      intentAlignment: row.intentAlignment != null ? parseFloat(row.intentAlignment) : null,
      toolAppropriateness: row.toolAppropriateness != null ? parseFloat(row.toolAppropriateness) : null,
      instructionSpecificity: row.instructionSpecificity != null ? parseFloat(row.instructionSpecificity) : null,
      governanceAdequacy: row.governanceAdequacy != null ? parseFloat(row.governanceAdequacy) : null,
      ownershipCompleteness: row.ownershipCompleteness != null ? parseFloat(row.ownershipCompleteness) : null,
      flags: (row.flags as string[]) ?? [],
      evaluatorModel: row.evaluatorModel,
      evaluatedAt: row.evaluatedAt.toISOString(),
    }));

    const recentIntakeScores: IntakeScoreResult[] = intakeScoreRows.map((row) => ({
      id: row.id,
      sessionId: row.sessionId,
      enterpriseId: row.enterpriseId,
      overallScore: row.overallScore != null ? parseFloat(row.overallScore) : null,
      breadthScore: row.breadthScore != null ? parseFloat(row.breadthScore) : null,
      ambiguityScore: row.ambiguityScore != null ? parseFloat(row.ambiguityScore) : null,
      riskIdScore: row.riskIdScore != null ? parseFloat(row.riskIdScore) : null,
      stakeholderScore: row.stakeholderScore != null ? parseFloat(row.stakeholderScore) : null,
      evaluatorModel: row.evaluatorModel,
      evaluatedAt: row.evaluatedAt.toISOString(),
    }));

    const latest = snapshots[0] ?? null;
    const previous = snapshots[1] ?? null;

    const payload: IntelligencePayload = {
      latestBriefing: briefings[0] ?? null,
      briefingHistory: briefings,
      snapshots,
      recentScores,
      recentIntakeScores,
      kpis: {
        qualityIndex: latest?.qualityIndex ?? null,
        qualityIndexDelta:
          latest?.qualityIndex != null && previous?.qualityIndex != null
            ? parseFloat((latest.qualityIndex - previous.qualityIndex).toFixed(1))
            : null,
        blueprintValidityRate: latest?.blueprintValidityRate ?? null,
        reviewQueueDepth: latest?.reviewQueueDepth ?? null,
        webhookSuccessRate: latest?.webhookSuccessRate ?? null,
      },
    };

    return NextResponse.json(payload);
  } catch (err) {
    console.error("[GET /api/monitor/intelligence]", err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to fetch intelligence data");
  }
}
