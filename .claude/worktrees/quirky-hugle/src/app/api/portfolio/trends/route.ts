/**
 * GET /api/portfolio/trends?weeks=12
 *
 * Returns time-series of weekly portfolio snapshots for the authenticated
 * enterprise. Results are ordered ascending by weekStart for charting.
 *
 * Access: compliance_officer | admin | viewer
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { portfolioSnapshots } from "@/lib/db/schema";
import { and, asc, eq, isNull, gte, sql } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { getRequestId } from "@/lib/request-id";

export async function GET(request: NextRequest) {
  const { session: authSession, error } = await requireAuth([
    "compliance_officer",
    "admin",
    "viewer",
    "architect",
    "reviewer",
  ]);
  if (error) return error;
  const requestId = getRequestId(request);

  const { searchParams } = new URL(request.url);
  const weeks = Math.min(52, Math.max(1, parseInt(searchParams.get("weeks") ?? "12", 10) || 12));

  try {
    const enterpriseId = authSession.user.enterpriseId ?? null;
    const enterpriseFilter = enterpriseId
      ? eq(portfolioSnapshots.enterpriseId, enterpriseId)
      : isNull(portfolioSnapshots.enterpriseId);

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - weeks * 7);
    const cutoffDate = cutoff.toISOString().slice(0, 10);

    const rows = await db
      .select({
        weekStart:        portfolioSnapshots.weekStart,
        totalAgents:      portfolioSnapshots.totalAgents,
        deployedAgents:   portfolioSnapshots.deployedAgents,
        complianceRate:   portfolioSnapshots.complianceRate,
        avgQualityScore:  portfolioSnapshots.avgQualityScore,
        totalViolations:  portfolioSnapshots.totalViolations,
        violationsByType: portfolioSnapshots.violationsByType,
        agentsByRiskTier: portfolioSnapshots.agentsByRiskTier,
      })
      .from(portfolioSnapshots)
      .where(
        and(
          enterpriseFilter,
          gte(portfolioSnapshots.weekStart, cutoffDate)
        )
      )
      .orderBy(asc(portfolioSnapshots.weekStart));

    return NextResponse.json({ weeks, snapshots: rows });
  } catch (err) {
    console.error(`[${requestId}] Failed to fetch portfolio trends:`, err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to fetch trends", undefined, requestId);
  }
}
