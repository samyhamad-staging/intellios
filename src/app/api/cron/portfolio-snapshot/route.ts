/**
 * Portfolio Snapshot Cron — H2-5.1.
 *
 * POST /api/cron/portfolio-snapshot
 *
 * Computes weekly fleet-level metrics per enterprise and upserts them into
 * the `portfolioSnapshots` table. Run weekly (Sundays 00:30 UTC, after
 * quality-trends which runs at 00:00).
 *
 * Metrics per enterprise:
 *   - totalAgents:      distinct agentIds across all statuses
 *   - deployedAgents:   agentIds with latest blueprint status deployed/suspended
 *   - complianceRate:   % of prod blueprints with no governance errors (0-100)
 *   - avgQualityScore:  average overallScore from latest blueprintQualityScores
 *   - totalViolations:  runtime violations in last 7 days
 *   - violationsByType: { error: N, warning: N }
 *   - agentsByRiskTier: { low: N, medium: N, high: N, critical: N }
 *
 * Security: mandatory Bearer token via CRON_SECRET env var.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/auth/cron-auth";
import { db } from "@/lib/db";
import {
  agentBlueprints,
  blueprintQualityScores,
  intakeSessions,
  portfolioSnapshots,
  runtimeViolations,
} from "@/lib/db/schema";
import {
  and,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  or,
  sql,
} from "drizzle-orm";
import type { ValidationReport } from "@/lib/governance/types";
import { runCronBatch, recentFailedItemIds, prioritizeFailed } from "@/lib/cron/batch-runner";

const JOB_NAME = "portfolio-snapshot";

/** ISO date string for the start of the current week (Monday). */
function currentWeekStart(): string {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun…6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diff));
  return monday.toISOString().slice(0, 10);
}

export async function POST(request: NextRequest) {
  const cronError = requireCronAuth(request);
  if (cronError) return cronError;

  const { searchParams } = new URL(request.url);
  const filterEnterprise = searchParams.get("enterpriseId") ?? null;

  try {
    const weekStart = currentWeekStart();
    const windowStart = new Date(Date.now() - 7 * 86_400_000);

    // ── 1. Discover enterprises to snapshot ────────────────────────────────
    const enterpriseRows = await db
      .selectDistinct({ enterpriseId: agentBlueprints.enterpriseId })
      .from(agentBlueprints)
      .where(
        filterEnterprise
          ? eq(agentBlueprints.enterpriseId, filterEnterprise)
          : undefined
      );

    const enterpriseIds = enterpriseRows.map((r) => r.enterpriseId);

    // ADR-024 — sort previously-failed tenants to the front so broken data
    // gets another attempt rather than being buried by ordering luck.
    const failedIds = await recentFailedItemIds(JOB_NAME);
    const ordered = prioritizeFailed(
      enterpriseIds,
      (id) => id ?? "__null__",
      failedIds
    );

    // ── 2-8. Per-enterprise snapshot computation ────────────────────────
    // Extracted into a handler so the batch runner can enforce a time budget,
    // isolate per-item failures, and record them to cron_item_failures.
    const snapshotEnterprise = async (enterpriseId: string | null) => {
      const bpFilter = enterpriseId
        ? eq(agentBlueprints.enterpriseId, enterpriseId)
        : isNull(agentBlueprints.enterpriseId);

      // Total distinct agents
      const [totalRow] = await db
        .select({ count: sql<number>`COUNT(DISTINCT ${agentBlueprints.agentId})::int` })
        .from(agentBlueprints)
        .where(bpFilter);
      const totalAgents = Number(totalRow?.count ?? 0);

      // Latest blueprint per agent
      const latestBlueprints = await db
        .selectDistinctOn([agentBlueprints.agentId], {
          id: agentBlueprints.id,
          agentId: agentBlueprints.agentId,
          status: agentBlueprints.status,
          sessionId: agentBlueprints.sessionId,
          validationReport: agentBlueprints.validationReport,
        })
        .from(agentBlueprints)
        .where(bpFilter)
        .orderBy(agentBlueprints.agentId, desc(agentBlueprints.createdAt));

      const deployedAgents = latestBlueprints.filter((b) =>
        ["deployed", "suspended"].includes(b.status)
      ).length;

      // Compliance rate (prod blueprints without governance errors)
      const prodBlueprints = latestBlueprints.filter((b) =>
        ["approved", "deployed"].includes(b.status)
      );
      let complianceRate: number | null = null;
      if (prodBlueprints.length > 0) {
        const withErrors = prodBlueprints.filter((b) => {
          const report = b.validationReport as ValidationReport | null;
          return report?.violations?.some((v) => v.severity === "error") ?? false;
        }).length;
        complianceRate = Math.round(
          ((prodBlueprints.length - withErrors) / prodBlueprints.length) * 100
        );
      }

      // Avg quality score
      const blueprintIds = latestBlueprints.map((b) => b.id);
      let avgQualityScore: number | null = null;
      if (blueprintIds.length > 0) {
        const qualityRows = await db
          .selectDistinctOn([blueprintQualityScores.blueprintId], {
            blueprintId: blueprintQualityScores.blueprintId,
            overallScore: blueprintQualityScores.overallScore,
          })
          .from(blueprintQualityScores)
          .where(inArray(blueprintQualityScores.blueprintId, blueprintIds))
          .orderBy(blueprintQualityScores.blueprintId, desc(blueprintQualityScores.evaluatedAt));

        if (qualityRows.length > 0) {
          const sum = qualityRows.reduce(
            (acc, r) => acc + parseFloat(r.overallScore ?? "0"),
            0
          );
          avgQualityScore = Math.round(sum / qualityRows.length);
        }
      }

      // Runtime violations last 7 days
      const violFilter = enterpriseId
        ? and(eq(runtimeViolations.enterpriseId, enterpriseId), gte(runtimeViolations.detectedAt, windowStart))
        : and(isNull(runtimeViolations.enterpriseId), gte(runtimeViolations.detectedAt, windowStart));

      const violRows = await db
        .select({
          severity: runtimeViolations.severity,
          count: sql<number>`COUNT(*)::int`,
        })
        .from(runtimeViolations)
        .where(violFilter)
        .groupBy(runtimeViolations.severity);

      const violationsByType: Record<string, number> = {};
      let totalViolations = 0;
      for (const row of violRows) {
        violationsByType[row.severity] = row.count;
        totalViolations += row.count;
      }

      // Agents by risk tier (from linked intake sessions)
      const sessionIds = latestBlueprints
        .map((b) => b.sessionId)
        .filter(Boolean) as string[];

      const agentsByRiskTier: Record<string, number> = {};
      if (sessionIds.length > 0) {
        const tierRows = await db
          .select({
            riskTier: intakeSessions.riskTier,
            count: sql<number>`COUNT(*)::int`,
          })
          .from(intakeSessions)
          .where(inArray(intakeSessions.id, sessionIds))
          .groupBy(intakeSessions.riskTier);

        for (const row of tierRows) {
          if (row.riskTier) agentsByRiskTier[row.riskTier] = row.count;
        }
      }

      // Delete existing snapshot for this week+enterprise, then insert
      // (Simple delete+insert since enterpriseId can be NULL, making ON CONFLICT
      // unreliable across null values in PostgreSQL unique indexes.)
      await db
        .delete(portfolioSnapshots)
        .where(
          and(
            enterpriseId
              ? eq(portfolioSnapshots.enterpriseId, enterpriseId)
              : isNull(portfolioSnapshots.enterpriseId),
            eq(portfolioSnapshots.weekStart, weekStart)
          )
        );

      await db.insert(portfolioSnapshots).values({
        enterpriseId,
        weekStart,
        totalAgents,
        deployedAgents,
        complianceRate,
        avgQualityScore,
        totalViolations,
        violationsByType,
        agentsByRiskTier,
      });
    };

    const result = await runCronBatch({
      jobName: JOB_NAME,
      items: ordered,
      itemId: (id) => id ?? "__null__",
      handler: snapshotEnterprise,
    });

    return NextResponse.json({
      weekStart,
      snapshotCount: result.succeeded,
      enterprises: result.total,
      failed: result.failed,
      skipped: result.skipped,
      budgetExhausted: result.budgetExhausted,
      durationMs: result.durationMs,
    });
  } catch (err) {
    console.error("[portfolio-snapshot] Cron job failed:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
