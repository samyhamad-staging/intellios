import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentBlueprints, agentTelemetry } from "@/lib/db/schema";
import { and, desc, eq, gte, isNull, lt, sql } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { getRequestId } from "@/lib/request-id";
import { getEnterpriseSettings } from "@/lib/settings/get-settings";

/**
 * GET /api/registry
 * Returns all registered agents — latest version per agentId, scoped to the
 * caller's enterprise. Admins see all agents across enterprises.
 */
export async function GET(request: NextRequest) {
  const { session: authSession, error } = await requireAuth();
  if (error) return error;
  const requestId = getRequestId(request);
  try {
    // Build enterprise filter: admin sees all; others see their enterprise only
    const enterpriseFilter =
      authSession.user.role === "admin"
        ? undefined
        : authSession.user.enterpriseId
        ? eq(agentBlueprints.enterpriseId, authSession.user.enterpriseId)
        : isNull(agentBlueprints.enterpriseId);

    // Fetch blueprints; DISTINCT ON agentId ordered by created_at desc gives latest per agent
    const agents = await db
      .selectDistinctOn([agentBlueprints.agentId], {
        id: agentBlueprints.id,
        agentId: agentBlueprints.agentId,
        version: agentBlueprints.version,
        name: agentBlueprints.name,
        tags: agentBlueprints.tags,
        status: agentBlueprints.status,
        sessionId: agentBlueprints.sessionId,
        validationReport: agentBlueprints.validationReport,
        createdAt: agentBlueprints.createdAt,
        updatedAt: agentBlueprints.updatedAt,
      })
      .from(agentBlueprints)
      .where(enterpriseFilter)
      .orderBy(agentBlueprints.agentId, desc(agentBlueprints.createdAt));

    // Sort the results by updatedAt desc (distinctOn forces agentId ordering)
    agents.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    // ── Cost data: single aggregate query for current month ──────────────
    const now = new Date();
    const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const periodEnd   = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

    const enterpriseId = authSession.user.role === "admin" ? null : (authSession.user.enterpriseId ?? null);
    const settings = await getEnterpriseSettings(enterpriseId);
    const { inputCostPer1kTokens, outputCostPer1kTokens } = settings.costRates;

    const telFilter = enterpriseId
      ? and(eq(agentTelemetry.enterpriseId, enterpriseId), gte(agentTelemetry.timestamp, periodStart), lt(agentTelemetry.timestamp, periodEnd))
      : and(isNull(agentTelemetry.enterpriseId), gte(agentTelemetry.timestamp, periodStart), lt(agentTelemetry.timestamp, periodEnd));

    const costRows = await db
      .select({
        agentId:   agentTelemetry.agentId,
        tokensIn:  sql<number>`COALESCE(SUM(${agentTelemetry.tokensIn}), 0)::bigint`,
        tokensOut: sql<number>`COALESCE(SUM(${agentTelemetry.tokensOut}), 0)::bigint`,
      })
      .from(agentTelemetry)
      .where(telFilter)
      .groupBy(agentTelemetry.agentId);

    const costByAgent = new Map(
      costRows.map((r) => [
        r.agentId,
        Math.round(
          ((Number(r.tokensIn) * inputCostPer1kTokens +
            Number(r.tokensOut) * outputCostPer1kTokens) /
            1000) *
            10000
        ) / 10000,
      ])
    );

    // Derive violationCount from the stored validation report (errors only)
    const enriched = agents.map((a) => {
      const report = a.validationReport as {
        violations?: { severity: string }[];
      } | null;
      const violationCount = report?.violations
        ? report.violations.filter((v) => v.severity === "error").length
        : null; // null = not yet validated
      const monthlyCostUsd = costByAgent.get(a.agentId) ?? null;
      return { ...a, violationCount, monthlyCostUsd, validationReport: undefined };
    });

    return NextResponse.json({ agents: enriched });
  } catch (error) {
    console.error(`[${requestId}] Failed to list registry agents:`, error);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to list agents", undefined, requestId);
  }
}
