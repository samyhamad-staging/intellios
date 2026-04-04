/**
 * GET /api/registry/[agentId]/cost?period=YYYY-MM
 *
 * Per-agent cost for the given calendar month computed from telemetry.
 * Defaults to the current month if period is omitted.
 *
 * Cost formula: (tokensIn * inputCostPer1kTokens + tokensOut * outputCostPer1kTokens) / 1000
 * Rates come from enterprise settings (costRates section).
 *
 * Access: all authenticated roles
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentBlueprints, agentTelemetry } from "@/lib/db/schema";
import { and, desc, eq, gte, isNull, lt, sql } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { getRequestId } from "@/lib/request-id";
import { getEnterpriseSettings } from "@/lib/settings/get-settings";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { session: authSession, error } = await requireAuth();
  if (error) return error;
  const requestId = getRequestId(request);
  const { agentId } = await params;

  const { searchParams } = new URL(request.url);
  const periodParam = searchParams.get("period");

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

    // Verify agent exists and belongs to this enterprise
    const [bp] = await db
      .selectDistinctOn([agentBlueprints.agentId], { agentId: agentBlueprints.agentId })
      .from(agentBlueprints)
      .where(
        and(
          eq(agentBlueprints.agentId, agentId),
          enterpriseId
            ? eq(agentBlueprints.enterpriseId, enterpriseId)
            : isNull(agentBlueprints.enterpriseId)
        )
      )
      .orderBy(agentBlueprints.agentId, desc(agentBlueprints.createdAt));

    if (!bp) {
      return apiError(ErrorCode.NOT_FOUND, "Agent not found", undefined, requestId);
    }

    const settings = await getEnterpriseSettings(enterpriseId);
    const { inputCostPer1kTokens, outputCostPer1kTokens } = settings.costRates;

    const [agg] = await db
      .select({
        tokensIn:  sql<number>`COALESCE(SUM(${agentTelemetry.tokensIn}), 0)::bigint`,
        tokensOut: sql<number>`COALESCE(SUM(${agentTelemetry.tokensOut}), 0)::bigint`,
        invocations: sql<number>`COALESCE(SUM(${agentTelemetry.invocations}), 0)::bigint`,
      })
      .from(agentTelemetry)
      .where(
        and(
          eq(agentTelemetry.agentId, agentId),
          gte(agentTelemetry.timestamp, periodStart),
          lt(agentTelemetry.timestamp, periodEnd)
        )
      );

    const tokensIn  = Number(agg?.tokensIn  ?? 0);
    const tokensOut = Number(agg?.tokensOut ?? 0);
    const invocations = Number(agg?.invocations ?? 0);
    const totalCostUsd = (tokensIn * inputCostPer1kTokens + tokensOut * outputCostPer1kTokens) / 1000;

    return NextResponse.json({
      agentId,
      period,
      totalCostUsd:  Math.round(totalCostUsd * 10000) / 10000,
      totalTokensIn:  tokensIn,
      totalTokensOut: tokensOut,
      totalInvocations: invocations,
      costRates: { inputCostPer1kTokens, outputCostPer1kTokens },
    });
  } catch (err) {
    console.error(`[${requestId}] Failed to fetch agent cost:`, err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to fetch cost data", undefined, requestId);
  }
}
