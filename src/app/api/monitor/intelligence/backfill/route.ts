import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require";
import { getRequestId } from "@/lib/request-id";
import { apiError, ErrorCode } from "@/lib/errors";
import { db } from "@/lib/db";
import { agentBlueprints, blueprintQualityScores } from "@/lib/db/schema";
import { and, eq, inArray, isNull, notInArray } from "drizzle-orm";
import { runBlueprintQualityScoreForId } from "@/lib/awareness/quality-evaluator";

/**
 * POST /api/monitor/intelligence/backfill
 *
 * Scores all blueprints in submitted/approved/deployed states that have no
 * existing quality score row. Fire-and-forget per blueprint — partial runs
 * are safe to re-run (scored blueprints are excluded on subsequent calls).
 *
 * Returns { scored, skipped } counts.
 *
 * Roles: admin
 */
export async function POST(request: NextRequest) {
  const { session: authSession, error } = await requireAuth(["admin"]);
  if (error) return error;
  void getRequestId(request);

  try {
    const enterpriseId = authSession.user.enterpriseId ?? null;

    const enterpriseFilter = enterpriseId
      ? eq(agentBlueprints.enterpriseId, enterpriseId)
      : isNull(agentBlueprints.enterpriseId);

    // Find all review-eligible blueprints for this enterprise
    const candidates = await db
      .select({ id: agentBlueprints.id, enterpriseId: agentBlueprints.enterpriseId })
      .from(agentBlueprints)
      .where(
        and(
          enterpriseFilter,
          inArray(agentBlueprints.status, ["in_review", "approved", "deployed"])
        )
      );

    if (candidates.length === 0) {
      return NextResponse.json({ scored: 0, skipped: 0 });
    }

    // Find which ones already have a score
    const scored = await db
      .select({ blueprintId: blueprintQualityScores.blueprintId })
      .from(blueprintQualityScores)
      .where(
        and(
          enterpriseId
            ? eq(blueprintQualityScores.enterpriseId, enterpriseId)
            : isNull(blueprintQualityScores.enterpriseId),
          inArray(
            blueprintQualityScores.blueprintId,
            candidates.map((c) => c.id)
          )
        )
      );

    const alreadyScoredIds = new Set(scored.map((s) => s.blueprintId));
    const toScore = candidates.filter((c) => !alreadyScoredIds.has(c.id));

    // Score each unscored blueprint — sequentially to avoid thundering herd
    for (const bp of toScore) {
      await runBlueprintQualityScoreForId(bp.id, bp.enterpriseId ?? null);
    }

    return NextResponse.json({
      scored: toScore.length,
      skipped: alreadyScoredIds.size,
    });
  } catch (err) {
    console.error("[POST /api/monitor/intelligence/backfill]", err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to run quality score backfill");
  }
}
