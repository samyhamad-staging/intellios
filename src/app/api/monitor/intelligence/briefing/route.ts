import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require";
import { getRequestId } from "@/lib/request-id";
import { apiError, ErrorCode } from "@/lib/errors";
import { runMetricsSnapshot } from "@/lib/awareness/metrics-worker";
import { detectAnomalies, getPreviousSnapshot } from "@/lib/awareness/anomaly-detector";
import { generateDailyBriefing, getRecentBriefings } from "@/lib/awareness/briefing-generator";

/**
 * POST /api/monitor/intelligence/briefing
 *
 * Runs a fresh metrics snapshot, then generates (or regenerates) today's
 * daily intelligence briefing via Claude Sonnet. Returns the briefing.
 *
 * Roles: admin
 */
export async function POST(request: NextRequest) {
  const { session: authSession, error } = await requireAuth(["admin"]);
  if (error) return error;
  void getRequestId(request);

  try {
    const enterpriseId = authSession.user.enterpriseId ?? null;

    // Always capture a fresh snapshot before generating the briefing
    const snapshot = await runMetricsSnapshot(enterpriseId);
    const previous = await getPreviousSnapshot(snapshot);
    await detectAnomalies(snapshot, previous);

    const briefing = await generateDailyBriefing(enterpriseId, new Date());

    return NextResponse.json({ briefing });
  } catch (err) {
    console.error("[POST /api/monitor/intelligence/briefing]", err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to generate intelligence briefing");
  }
}

/**
 * GET /api/monitor/intelligence/briefing
 *
 * Returns the last 7 intelligence briefings for the enterprise.
 *
 * Roles: compliance_officer | admin
 */
export async function GET(request: NextRequest) {
  const { session: authSession, error } = await requireAuth(["compliance_officer", "admin"]);
  if (error) return error;
  void getRequestId(request);

  try {
    const enterpriseId = authSession.user.enterpriseId ?? null;
    const briefings = await getRecentBriefings(enterpriseId, 7);
    return NextResponse.json({ briefings });
  } catch (err) {
    console.error("[GET /api/monitor/intelligence/briefing]", err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to fetch briefings");
  }
}
