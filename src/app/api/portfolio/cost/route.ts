/**
 * GET /api/portfolio/cost?period=YYYY-MM
 *
 * Fleet-level cost rollup for the given calendar month, grouped by
 * business unit (from ABP ownership.businessUnit).
 *
 * Cost formula: (tokensIn * inputCostPer1kTokens + tokensOut * outputCostPer1kTokens) / 1000
 * Rates come from enterprise settings (costRates section).
 *
 * Returns:
 *   {
 *     period: "YYYY-MM",
 *     totalCostUsd: number,
 *     byBusinessUnit: [{ businessUnit: string, agentCount: number, totalCostUsd: number }],
 *     costRates: { inputCostPer1kTokens: number, outputCostPer1kTokens: number }
 *   }
 *
 * Access: compliance_officer | admin
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentBlueprints, agentTelemetry } from "@/lib/db/schema";
import { and, desc, eq, gte, isNull, lt, sql } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { getRequestId } from "@/lib/request-id";
import { getEnterpriseSettings } from "@/lib/settings/get-settings";
import type { ABP } from "@/lib/types/abp";

export async function GET(request: NextRequest) {
  const { session: authSession, error } = await requireAuth(["compliance_officer", "admin"]);
  if (error) return error;
  const requestId = getRequestId(request);

  const { searchParams } = new URL(request.url);
  const periodParam = searchParams.get("period"); // "YYYY-MM"

  // Default to current month
  const now = new Date();
  const period = periodParam ?? `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

  const periodMatch = period.match(/^(\d{4})-(\d{2})$/);
  if (!periodMatch) {
    return apiError(ErrorCode.BAD_REQUEST, "period must be YYYY-MM");
  }
  const [, yearStr, monthStr] = periodMatch;
  const periodStart = new Date(Date.UTC(parseInt(yearStr), parseInt(monthStr) - 1, 1));
  const periodEnd   = new Date(Date.UTC(parseInt(yearStr), parseInt(monthStr), 1));

  try {
    const enterpriseId = authSession.user.enterpriseId ?? null;
    const settings = await getEnterpriseSettings(enterpriseId);
    const { inputCostPer1kTokens, outputCostPer1kTokens } = settings.costRates;

    const bpFilter = enterpriseId
      ? eq(agentBlueprints.enterpriseId, enterpriseId)
      : isNull(agentBlueprints.enterpriseId);

    // Latest blueprint per agent to get ABP (businessUnit)
    const latestBlueprints = await db
      .selectDistinctOn([agentBlueprints.agentId], {
        agentId: agentBlueprints.agentId,
        abp:     agentBlueprints.abp,
      })
      .from(agentBlueprints)
      .where(bpFilter)
      .orderBy(agentBlueprints.agentId, desc(agentBlueprints.createdAt));

    // Build agentId → businessUnit map
    const buByAgent = new Map<string, string>();
    for (const bp of latestBlueprints) {
      const abpData = bp.abp as ABP | null;
      const bu = abpData?.ownership?.businessUnit ?? "Unassigned";
      buByAgent.set(bp.agentId, bu);
    }

    // Aggregate telemetry for the period
    const telFilter = enterpriseId
      ? and(
          eq(agentTelemetry.enterpriseId, enterpriseId),
          gte(agentTelemetry.timestamp, periodStart),
          lt(agentTelemetry.timestamp, periodEnd)
        )
      : and(
          isNull(agentTelemetry.enterpriseId),
          gte(agentTelemetry.timestamp, periodStart),
          lt(agentTelemetry.timestamp, periodEnd)
        );

    const telRows = await db
      .select({
        agentId:   agentTelemetry.agentId,
        tokensIn:  sql<number>`COALESCE(SUM(${agentTelemetry.tokensIn}), 0)::bigint`,
        tokensOut: sql<number>`COALESCE(SUM(${agentTelemetry.tokensOut}), 0)::bigint`,
      })
      .from(agentTelemetry)
      .where(telFilter)
      .groupBy(agentTelemetry.agentId);

    // Compute cost per business unit
    const buMap = new Map<string, { agentIds: Set<string>; costUsd: number }>();

    for (const row of telRows) {
      const bu = buByAgent.get(row.agentId) ?? "Unassigned";
      if (!buMap.has(bu)) buMap.set(bu, { agentIds: new Set(), costUsd: 0 });
      const entry = buMap.get(bu)!;
      entry.agentIds.add(row.agentId);
      entry.costUsd +=
        (Number(row.tokensIn)  * inputCostPer1kTokens +
         Number(row.tokensOut) * outputCostPer1kTokens) / 1000;
    }

    const byBusinessUnit = [...buMap.entries()]
      .map(([bu, { agentIds, costUsd }]) => ({
        businessUnit:  bu,
        agentCount:    agentIds.size,
        totalCostUsd:  Math.round(costUsd * 10000) / 10000,
      }))
      .sort((a, b) => b.totalCostUsd - a.totalCostUsd);

    const totalCostUsd = byBusinessUnit.reduce((sum, r) => sum + r.totalCostUsd, 0);

    return NextResponse.json({
      period,
      totalCostUsd: Math.round(totalCostUsd * 10000) / 10000,
      byBusinessUnit,
      costRates: { inputCostPer1kTokens, outputCostPer1kTokens },
    });
  } catch (err) {
    console.error(`[${requestId}] Failed to fetch portfolio cost:`, err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to fetch cost data", undefined, requestId);
  }
}
