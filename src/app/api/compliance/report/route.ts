import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  agentBlueprints,
  governancePolicies,
  runtimeViolations,
  portfolioSnapshots,
  agentTelemetry,
  intakeSessions,
} from "@/lib/db/schema";
import {
  and,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lt,
  sql,
} from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { getRequestId } from "@/lib/request-id";
import { getEnterpriseSettings } from "@/lib/settings/get-settings";
import type { ValidationReport } from "@/lib/governance/types";

/**
 * GET /api/compliance/report?period=YYYY-MM
 *
 * Returns a structured compliance report for the given month.
 * Includes: fleet summary, policy violations, cost summary,
 * risk distribution, and top at-risk agents.
 *
 * Access: admin | compliance_officer
 */
export async function GET(request: NextRequest) {
  const { session: authSession, error } = await requireAuth([
    "compliance_officer",
    "admin",
  ]);
  if (error) return error;
  const requestId = getRequestId(request);

  try {
    const { searchParams } = new URL(request.url);

    // Parse period (YYYY-MM), default to current month
    const periodParam = searchParams.get("period");
    const now = new Date();
    let year = now.getUTCFullYear();
    let month = now.getUTCMonth(); // 0-indexed

    if (periodParam && /^\d{4}-\d{2}$/.test(periodParam)) {
      const [y, m] = periodParam.split("-").map(Number);
      year = y;
      month = m - 1; // convert to 0-indexed
    }

    const periodStart = new Date(Date.UTC(year, month, 1));
    const periodEnd   = new Date(Date.UTC(year, month + 1, 1));
    const periodLabel = `${year}-${String(month + 1).padStart(2, "0")}`;

    const enterpriseId: string | null =
      authSession.user.role === "admin"
        ? (authSession.user.enterpriseId ?? null)
        : (authSession.user.enterpriseId ?? null);

    // Enterprise scope helpers
    const bpCondition =
      enterpriseId
        ? eq(agentBlueprints.enterpriseId, enterpriseId)
        : isNull(agentBlueprints.enterpriseId);

    const policyCondition =
      enterpriseId
        ? eq(governancePolicies.enterpriseId, enterpriseId)
        : isNull(governancePolicies.enterpriseId);

    const violationCondition =
      enterpriseId
        ? eq(runtimeViolations.enterpriseId, enterpriseId)
        : isNull(runtimeViolations.enterpriseId);

    // ── 1. Fleet summary ───────────────────────────────────────────────────
    const statusRows = await db
      .select({
        status: agentBlueprints.status,
        count: sql<number>`COUNT(DISTINCT ${agentBlueprints.agentId})::int`,
      })
      .from(agentBlueprints)
      .where(bpCondition)
      .groupBy(agentBlueprints.status);

    const statusCounts: Record<string, number> = {};
    for (const row of statusRows) statusCounts[row.status] = row.count;

    const totalAgents = Object.values(statusCounts).reduce((a, b) => a + b, 0);
    const deployedAgents = (statusCounts["deployed"] ?? 0) + (statusCounts["approved"] ?? 0);

    // ── 2. Compliance rate from prod blueprints ────────────────────────────
    const prodBlueprints = await db
      .selectDistinctOn([agentBlueprints.agentId], {
        id: agentBlueprints.id,
        agentId: agentBlueprints.agentId,
        sessionId: agentBlueprints.sessionId,
        name: agentBlueprints.name,
        status: agentBlueprints.status,
        version: agentBlueprints.version,
        validationReport: agentBlueprints.validationReport,
        tags: agentBlueprints.tags,
      })
      .from(agentBlueprints)
      .where(
        and(bpCondition, inArray(agentBlueprints.status, ["approved", "deployed"]))
      )
      .orderBy(agentBlueprints.agentId, desc(agentBlueprints.createdAt));

    const prodWithErrors = prodBlueprints.filter((bp) => {
      const report = bp.validationReport as ValidationReport | null;
      return report?.violations?.some((v) => v.severity === "error") ?? false;
    }).length;

    const complianceRate =
      prodBlueprints.length > 0
        ? Math.round(((prodBlueprints.length - prodWithErrors) / prodBlueprints.length) * 100)
        : null;

    // At-risk agents (errors or no validation)
    const atRiskAgents = prodBlueprints
      .filter((bp) => {
        const report = bp.validationReport as ValidationReport | null;
        if (!report) return true;
        return report.violations?.some((v) => v.severity === "error") ?? false;
      })
      .map((bp) => {
        const report = bp.validationReport as ValidationReport | null;
        const errors = report?.violations?.filter((v) => v.severity === "error") ?? [];
        return {
          agentId: bp.agentId,
          agentName: bp.name ?? "Unnamed Agent",
          status: bp.status,
          version: bp.version,
          violationCount: errors.length,
          topViolation: errors[0]?.message ?? "Not validated",
        };
      });

    // ── 3. Risk distribution (via intakeSessions joined through sessionId) ──
    // Join prod blueprints → intakeSessions to get riskTier
    const prodSessionIds = prodBlueprints
      .map((b) => b.sessionId)
      .filter((id): id is string => id !== null);

    const riskDist: Record<string, number> = {};
    if (prodSessionIds.length > 0) {
      const riskRows = await db
        .select({ riskTier: intakeSessions.riskTier })
        .from(intakeSessions)
        .where(inArray(intakeSessions.id, prodSessionIds));
      for (const row of riskRows) {
        const tier = row.riskTier ?? "unknown";
        riskDist[tier] = (riskDist[tier] ?? 0) + 1;
      }
    }

    // ── 4. Active policies ─────────────────────────────────────────────────
    const activePolicies = await db
      .select({
        id: governancePolicies.id,
        name: governancePolicies.name,
        type: governancePolicies.type,
        createdAt: governancePolicies.createdAt,
      })
      .from(governancePolicies)
      .where(and(policyCondition, isNull(governancePolicies.supersededAt)));

    // ── 5. Runtime violations for the period ──────────────────────────────
    const periodViolations = await db
      .select({
        policyId: runtimeViolations.policyId,
        policyName: runtimeViolations.policyName,
        agentId: runtimeViolations.agentId,
        severity: runtimeViolations.severity,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(runtimeViolations)
      .where(
        and(
          violationCondition,
          gte(runtimeViolations.detectedAt, periodStart),
          lt(runtimeViolations.detectedAt, periodEnd)
        )
      )
      .groupBy(
        runtimeViolations.policyId,
        runtimeViolations.policyName,
        runtimeViolations.agentId,
        runtimeViolations.severity
      )
      .orderBy(desc(sql`COUNT(*)`));

    // Roll up by policy
    const violationsByPolicy: Record<
      string,
      { policyId: string; policyName: string; errorCount: number; warningCount: number; agentCount: number }
    > = {};
    const affectedAgentsPerPolicy: Record<string, Set<string>> = {};
    for (const row of periodViolations) {
      const pid = row.policyId ?? "unknown";
      if (!violationsByPolicy[pid]) {
        violationsByPolicy[pid] = {
          policyId: pid,
          policyName: row.policyName ?? "Unknown Policy",
          errorCount: 0,
          warningCount: 0,
          agentCount: 0,
        };
        affectedAgentsPerPolicy[pid] = new Set();
      }
      if (row.severity === "error") violationsByPolicy[pid].errorCount += row.count;
      else violationsByPolicy[pid].warningCount += row.count;
      affectedAgentsPerPolicy[pid].add(row.agentId ?? "");
    }
    for (const pid of Object.keys(violationsByPolicy)) {
      violationsByPolicy[pid].agentCount = affectedAgentsPerPolicy[pid].size;
    }
    const topViolations = Object.values(violationsByPolicy)
      .sort((a, b) => b.errorCount - a.errorCount || b.warningCount - a.warningCount)
      .slice(0, 10);

    // ── 6. Cost summary ───────────────────────────────────────────────────
    const settings = await getEnterpriseSettings(enterpriseId);
    const { inputCostPer1kTokens, outputCostPer1kTokens } = settings.costRates;

    const telFilter = and(
      enterpriseId
        ? eq(agentTelemetry.enterpriseId, enterpriseId)
        : isNull(agentTelemetry.enterpriseId),
      gte(agentTelemetry.timestamp, periodStart),
      lt(agentTelemetry.timestamp, periodEnd)
    );

    const telRows = await db
      .select({
        agentId: agentTelemetry.agentId,
        tokensIn:  sql<number>`COALESCE(SUM(${agentTelemetry.tokensIn}), 0)::bigint`,
        tokensOut: sql<number>`COALESCE(SUM(${agentTelemetry.tokensOut}), 0)::bigint`,
      })
      .from(agentTelemetry)
      .where(telFilter)
      .groupBy(agentTelemetry.agentId);

    let totalCostUsd = 0;
    const costByAgent = telRows.map((row) => {
      const cost =
        (row.tokensIn * inputCostPer1kTokens + row.tokensOut * outputCostPer1kTokens) / 1000;
      totalCostUsd += cost;
      return {
        agentId: row.agentId,
        agentName: prodBlueprints.find((b) => b.agentId === row.agentId)?.name ?? row.agentId,
        tokensIn: Number(row.tokensIn),
        tokensOut: Number(row.tokensOut),
        costUsd: Math.round(cost * 10000) / 10000,
      };
    });
    costByAgent.sort((a, b) => b.costUsd - a.costUsd);

    // ── 7. Portfolio snapshot for the period (nearest week) ───────────────
    const snapshot = await db
      .select()
      .from(portfolioSnapshots)
      .where(
        and(
          enterpriseId
            ? eq(portfolioSnapshots.enterpriseId, enterpriseId)
            : isNull(portfolioSnapshots.enterpriseId),
          gte(portfolioSnapshots.weekStart, periodLabel),
          lt(portfolioSnapshots.weekStart, `${year}-${String(month + 2).padStart(2, "0")}-01`)
        )
      )
      .orderBy(desc(portfolioSnapshots.weekStart))
      .limit(1);

    // ── 8. Assemble report ─────────────────────────────────────────────────
    const report = {
      metadata: {
        reportType: "compliance_summary",
        period: periodLabel,
        generatedAt: new Date().toISOString(),
        enterpriseId,
        generatedBy: authSession.user.email ?? "unknown",
      },
      fleetSummary: {
        totalAgents,
        deployedAgents,
        statusCounts,
        complianceRate,
        atRiskCount: atRiskAgents.length,
        riskDistribution: riskDist,
        avgQualityScore:
          snapshot.length > 0 ? (snapshot[0].avgQualityScore ?? null) : null,
      },
      policies: {
        activeCount: activePolicies.length,
        policies: activePolicies.map((p) => ({
          id: p.id,
          name: p.name,
          type: p.type,
          createdAt: p.createdAt.toISOString(),
        })),
      },
      violations: {
        totalErrors: topViolations.reduce((s, v) => s + v.errorCount, 0),
        totalWarnings: topViolations.reduce((s, v) => s + v.warningCount, 0),
        topViolations,
      },
      atRiskAgents: atRiskAgents.slice(0, 20),
      cost: {
        period: periodLabel,
        totalCostUsd: Math.round(totalCostUsd * 10000) / 10000,
        ratesUsed: { inputCostPer1kTokens, outputCostPer1kTokens },
        topAgentsByCost: costByAgent.slice(0, 10),
      },
    };

    return NextResponse.json(report);
  } catch (err) {
    console.error(`[${requestId}] Failed to generate compliance report:`, err);
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      "Failed to generate compliance report",
      undefined,
      requestId
    );
  }
}
