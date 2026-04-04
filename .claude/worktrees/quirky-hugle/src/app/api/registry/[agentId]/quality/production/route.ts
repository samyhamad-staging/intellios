/**
 * Production Quality API — H2-2.1.
 *
 * GET /api/registry/[agentId]/quality/production
 *
 * Returns production quality metrics for the last 30 days:
 *   - policyAdherenceRate : fraction of days with zero runtime violations (0-1)
 *   - uptime              : fraction of days with non-zero invocations (0-1)
 *   - errorRate           : total errors / total invocations over 30d (0-1)
 *   - totalInvocations    : sum of invocations over 30d
 *   - totalViolations     : count of runtime violations over 30d
 *   - productionScore     : 0-100 composite score
 *                           (50% adherence + 30% uptime + 20% reliability)
 *   - windowDays          : number of days in the window (30 unless agent is newer)
 *
 * Auth: all authenticated roles; enterprise-scoped.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentBlueprints, agentTelemetry, runtimeViolations } from "@/lib/db/schema";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { assertEnterpriseAccess } from "@/lib/auth/enterprise";
import { getRequestId } from "@/lib/request-id";

const WINDOW_DAYS = 30;

export interface ProductionQuality {
  policyAdherenceRate: number;  // 0-1
  uptime: number;               // 0-1
  errorRate: number;            // 0-1
  totalInvocations: number;
  totalViolations: number;
  productionScore: number;      // 0-100
  windowDays: number;
  computedAt: string;           // ISO
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { session: authSession, error } = await requireAuth();
  if (error) return error;
  const requestId = getRequestId(request);

  try {
    const { agentId } = await params;

    // Verify agent exists + enterprise access
    const latest = await db.query.agentBlueprints.findFirst({
      where: eq(agentBlueprints.agentId, agentId),
      orderBy: [desc(agentBlueprints.createdAt)],
      columns: { id: true, enterpriseId: true },
    });

    if (!latest) {
      return apiError(ErrorCode.NOT_FOUND, "Agent not found", undefined, requestId);
    }

    const enterpriseError = assertEnterpriseAccess(latest.enterpriseId, authSession.user);
    if (enterpriseError) return enterpriseError;

    const windowStart = new Date(Date.now() - WINDOW_DAYS * 86_400_000);

    // ── Telemetry aggregates ───────────────────────────────────────────────
    const [telemetryAgg] = await db
      .select({
        totalInvocations: sql<number>`COALESCE(SUM(${agentTelemetry.invocations}), 0)`,
        totalErrors:       sql<number>`COALESCE(SUM(${agentTelemetry.errors}), 0)`,
        activeDays:        sql<number>`COUNT(DISTINCT DATE(${agentTelemetry.timestamp} AT TIME ZONE 'UTC'))`,
      })
      .from(agentTelemetry)
      .where(
        and(
          eq(agentTelemetry.agentId, agentId),
          gte(agentTelemetry.timestamp, windowStart)
        )
      );

    const totalInvocations = Number(telemetryAgg?.totalInvocations ?? 0);
    const totalErrors       = Number(telemetryAgg?.totalErrors ?? 0);
    const activeDays        = Number(telemetryAgg?.activeDays ?? 0);

    // ── Runtime violation aggregates ───────────────────────────────────────
    const [violationAgg] = await db
      .select({
        totalViolations: sql<number>`COUNT(*)`,
        violationDays:   sql<number>`COUNT(DISTINCT DATE(${runtimeViolations.detectedAt} AT TIME ZONE 'UTC'))`,
      })
      .from(runtimeViolations)
      .where(
        and(
          eq(runtimeViolations.agentId, agentId),
          gte(runtimeViolations.detectedAt, windowStart)
        )
      );

    const totalViolations = Number(violationAgg?.totalViolations ?? 0);
    const violationDays   = Number(violationAgg?.violationDays ?? 0);

    // ── Metric calculations ────────────────────────────────────────────────
    const uptime              = activeDays / WINDOW_DAYS;
    const policyAdherenceRate = Math.max(0, (WINDOW_DAYS - violationDays) / WINDOW_DAYS);
    const errorRate           = totalInvocations > 0 ? Math.min(1, totalErrors / totalInvocations) : 0;
    const reliability         = 1 - errorRate;

    // Composite production score:
    //   50 pts  — policy adherence (governance)
    //   30 pts  — uptime (availability)
    //   20 pts  — reliability (low error rate)
    const productionScore = Math.round(
      policyAdherenceRate * 50 +
      uptime              * 30 +
      reliability         * 20
    );

    const result: ProductionQuality = {
      policyAdherenceRate: Number(policyAdherenceRate.toFixed(4)),
      uptime:              Number(uptime.toFixed(4)),
      errorRate:           Number(errorRate.toFixed(4)),
      totalInvocations,
      totalViolations,
      productionScore,
      windowDays:  WINDOW_DAYS,
      computedAt:  new Date().toISOString(),
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error(`[${requestId}] Failed to compute production quality:`, err);
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      "Failed to compute production quality",
      undefined,
      requestId
    );
  }
}
