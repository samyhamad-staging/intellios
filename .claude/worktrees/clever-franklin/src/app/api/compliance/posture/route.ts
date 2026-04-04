import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  agentBlueprints,
  deploymentHealth,
  blueprintTestRuns,
  governancePolicies,
} from "@/lib/db/schema";
import { and, desc, eq, inArray, isNotNull, isNull, lt, sql } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { getRequestId } from "@/lib/request-id";
import type { ValidationReport } from "@/lib/governance/types";

/**
 * GET /api/compliance/posture
 *
 * Aggregates enterprise compliance posture from existing tables.
 * No new DB tables required — pure aggregation query.
 *
 * Access: compliance_officer | admin | viewer
 */
export async function GET(request: NextRequest) {
  const { session: authSession, error } = await requireAuth([
    "compliance_officer",
    "admin",
    "viewer",
  ]);
  if (error) return error;
  const requestId = getRequestId(request);

  try {
    const enterpriseId = authSession.user.enterpriseId ?? null;

    // Enterprise scope conditions
    const bpCondition =
      authSession.user.role === "admin" && !enterpriseId
        ? undefined
        : enterpriseId
        ? eq(agentBlueprints.enterpriseId, enterpriseId)
        : isNull(agentBlueprints.enterpriseId);

    const healthCondition =
      authSession.user.role === "admin" && !enterpriseId
        ? undefined
        : enterpriseId
        ? eq(deploymentHealth.enterpriseId, enterpriseId)
        : isNull(deploymentHealth.enterpriseId);

    const policyCondition =
      authSession.user.role === "admin" && !enterpriseId
        ? undefined
        : enterpriseId
        ? eq(governancePolicies.enterpriseId, enterpriseId)
        : isNull(governancePolicies.enterpriseId);

    // ── 1. Blueprint status distribution ───────────────────────────────────
    const statusRows = await db
      .select({
        status: agentBlueprints.status,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(agentBlueprints)
      .where(bpCondition)
      .groupBy(agentBlueprints.status);

    const statusCounts: Record<string, number> = {};
    for (const row of statusRows) {
      statusCounts[row.status] = row.count;
    }

    // ── 2. Deployment health summary ───────────────────────────────────────
    const healthRows = await db
      .select({
        healthStatus: deploymentHealth.healthStatus,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(deploymentHealth)
      .where(healthCondition)
      .groupBy(deploymentHealth.healthStatus);

    const healthCounts = { clean: 0, critical: 0, unknown: 0 };
    for (const row of healthRows) {
      const key = row.healthStatus as keyof typeof healthCounts;
      if (key in healthCounts) healthCounts[key] = row.count;
    }

    // ── 3. Approved + deployed blueprints (latest per agent) ───────────────
    const prodBlueprints = await db
      .selectDistinctOn([agentBlueprints.agentId], {
        id: agentBlueprints.id,
        agentId: agentBlueprints.agentId,
        name: agentBlueprints.name,
        status: agentBlueprints.status,
        version: agentBlueprints.version,
        validationReport: agentBlueprints.validationReport,
        createdBy: agentBlueprints.createdBy,
        createdAt: agentBlueprints.createdAt,
        updatedAt: agentBlueprints.updatedAt,
      })
      .from(agentBlueprints)
      .where(
        and(
          bpCondition,
          inArray(agentBlueprints.status, ["approved", "deployed"])
        )
      )
      .orderBy(agentBlueprints.agentId, desc(agentBlueprints.createdAt));

    // ── 4. Test coverage ───────────────────────────────────────────────────
    // Blueprints in prod that have ≥1 passing test run
    const prodBlueprintIds = prodBlueprints.map((b) => b.id);

    let testedCount = 0;
    if (prodBlueprintIds.length > 0) {
      const testedRows = await db
        .selectDistinctOn([blueprintTestRuns.blueprintId], {
          blueprintId: blueprintTestRuns.blueprintId,
        })
        .from(blueprintTestRuns)
        .where(
          and(
            inArray(blueprintTestRuns.blueprintId, prodBlueprintIds),
            eq(blueprintTestRuns.status, "passed")
          )
        );
      testedCount = testedRows.length;
    }

    const testCoverage = {
      total: prodBlueprints.length,
      tested: testedCount,
      pct:
        prodBlueprints.length > 0
          ? Math.round((testedCount / prodBlueprints.length) * 100)
          : null,
    };

    // ── 5. At-risk agents ──────────────────────────────────────────────────
    // Agents with: failing validation errors, or degraded health, or no tests

    // Load health records keyed by agentId
    const healthRecords = await db
      .select({
        agentId: deploymentHealth.agentId,
        healthStatus: deploymentHealth.healthStatus,
        errorCount: deploymentHealth.errorCount,
        lastCheckedAt: deploymentHealth.lastCheckedAt,
      })
      .from(deploymentHealth)
      .where(healthCondition);

    const healthByAgentId = new Map(
      healthRecords.map((h) => [h.agentId, h])
    );

    // Load test run status keyed by blueprintId
    let testRunStatusMap = new Map<string, string>();
    if (prodBlueprintIds.length > 0) {
      const latestRuns = await db
        .selectDistinctOn([blueprintTestRuns.blueprintId], {
          blueprintId: blueprintTestRuns.blueprintId,
          status: blueprintTestRuns.status,
        })
        .from(blueprintTestRuns)
        .where(inArray(blueprintTestRuns.blueprintId, prodBlueprintIds))
        .orderBy(blueprintTestRuns.blueprintId, desc(blueprintTestRuns.startedAt));

      testRunStatusMap = new Map(
        latestRuns.map((r) => [r.blueprintId, r.status])
      );
    }

    type AtRiskAgent = {
      blueprintId: string;
      agentId: string;
      agentName: string;
      status: string;
      version: string;
      issues: string[];
      healthStatus: string | null;
      lastCheckedAt: string | null;
    };

    const atRiskAgents: AtRiskAgent[] = [];

    for (const bp of prodBlueprints) {
      const issues: string[] = [];

      // Validation errors
      const report = bp.validationReport as ValidationReport | null;
      if (report) {
        const errorCount = report.violations.filter(
          (v) => v.severity === "error"
        ).length;
        if (errorCount > 0) {
          issues.push(`${errorCount} governance violation${errorCount > 1 ? "s" : ""}`);
        }
      } else {
        issues.push("Not validated");
      }

      // Health status
      const health = healthByAgentId.get(bp.agentId);
      if (health) {
        if (health.healthStatus === "critical") {
          issues.push(`Health: critical (${health.errorCount} errors)`);
        }
      }

      // Test coverage
      const testStatus = testRunStatusMap.get(bp.id);
      if (!testStatus || testStatus !== "passed") {
        if (!testStatus) {
          issues.push("No tests executed");
        } else if (testStatus === "failed") {
          issues.push("Tests failing");
        }
      }

      if (issues.length > 0) {
        atRiskAgents.push({
          blueprintId: bp.id,
          agentId: bp.agentId,
          agentName: bp.name ?? "Unnamed Agent",
          status: bp.status,
          version: bp.version,
          issues,
          healthStatus: health?.healthStatus ?? null,
          lastCheckedAt: health?.lastCheckedAt?.toISOString() ?? null,
        });
      }
    }

    // ── 6. Review queue pressure ───────────────────────────────────────────
    const inReviewBlueprints = await db
      .selectDistinctOn([agentBlueprints.agentId], {
        id: agentBlueprints.id,
        agentId: agentBlueprints.agentId,
        name: agentBlueprints.name,
        version: agentBlueprints.version,
        createdBy: agentBlueprints.createdBy,
        createdAt: agentBlueprints.createdAt,
      })
      .from(agentBlueprints)
      .where(
        and(bpCondition, eq(agentBlueprints.status, "in_review"))
      )
      .orderBy(agentBlueprints.agentId, desc(agentBlueprints.createdAt));

    const now = Date.now();
    const reviewQueue = inReviewBlueprints.map((bp) => {
      const ageHours = Math.floor(
        (now - bp.createdAt.getTime()) / (1000 * 60 * 60)
      );
      return {
        blueprintId: bp.id,
        agentId: bp.agentId,
        agentName: bp.name ?? "Unnamed Agent",
        version: bp.version,
        submittedBy: bp.createdBy ?? "unknown",
        ageHours,
        slaStatus:
          ageHours >= 72 ? "breach" : ageHours >= 48 ? "warning" : "ok",
      };
    });

    // Oldest in_review
    const oldestReviewHours =
      reviewQueue.length > 0
        ? Math.max(...reviewQueue.map((r) => r.ageHours))
        : null;

    // ── 7. Policy coverage gaps ────────────────────────────────────────────
    // Active policies: policies without supersededAt
    const activePolicies = await db
      .select({
        id: governancePolicies.id,
        name: governancePolicies.name,
        type: governancePolicies.type,
      })
      .from(governancePolicies)
      .where(
        and(
          policyCondition,
          isNull(governancePolicies.supersededAt)
        )
      );

    // Count violations per policy across all prod blueprints
    const violationsByPolicy: Record<
      string,
      { name: string; type: string; violationCount: number; affectedAgentCount: number }
    > = {};
    for (const p of activePolicies) {
      violationsByPolicy[p.id] = {
        name: p.name,
        type: p.type,
        violationCount: 0,
        affectedAgentCount: 0,
      };
    }

    for (const bp of prodBlueprints) {
      const report = bp.validationReport as ValidationReport | null;
      if (!report?.violations) continue;
      const affectedPolicies = new Set<string>();
      for (const v of report.violations) {
        if (v.severity === "error" && violationsByPolicy[v.policyId]) {
          violationsByPolicy[v.policyId].violationCount++;
          affectedPolicies.add(v.policyId);
        }
      }
      for (const policyId of affectedPolicies) {
        if (violationsByPolicy[policyId]) {
          violationsByPolicy[policyId].affectedAgentCount++;
        }
      }
    }

    const policyCoverage = Object.values(violationsByPolicy).sort(
      (a, b) => b.violationCount - a.violationCount
    );

    // ── 8. Overdue periodic reviews ────────────────────────────────────────
    const overdueBlueprints = await db
      .selectDistinctOn([agentBlueprints.agentId], {
        blueprintId: agentBlueprints.id,
        agentId: agentBlueprints.agentId,
        agentName: agentBlueprints.name,
        version: agentBlueprints.version,
        nextReviewDue: agentBlueprints.nextReviewDue,
        lastPeriodicReviewAt: agentBlueprints.lastPeriodicReviewAt,
      })
      .from(agentBlueprints)
      .where(
        and(
          bpCondition,
          eq(agentBlueprints.status, "deployed"),
          isNotNull(agentBlueprints.nextReviewDue),
          lt(agentBlueprints.nextReviewDue, new Date()),
        )
      )
      .orderBy(agentBlueprints.agentId, agentBlueprints.nextReviewDue);

    const overdueReviews = overdueBlueprints.map((bp) => ({
      blueprintId: bp.blueprintId,
      agentId: bp.agentId,
      agentName: bp.agentName ?? "Unnamed Agent",
      version: bp.version,
      nextReviewDue: bp.nextReviewDue!.toISOString(),
      lastPeriodicReviewAt: bp.lastPeriodicReviewAt?.toISOString() ?? null,
    }));

    // ── 9. Summary KPIs ────────────────────────────────────────────────────
    const deployedCount = (statusCounts["deployed"] ?? 0) + (statusCounts["approved"] ?? 0);
    const prodWithErrors = prodBlueprints.filter((bp) => {
      const report = bp.validationReport as ValidationReport | null;
      return report?.violations?.some((v) => v.severity === "error") ?? false;
    }).length;
    const complianceRate =
      prodBlueprints.length > 0
        ? Math.round(
            ((prodBlueprints.length - prodWithErrors) / prodBlueprints.length) * 100
          )
        : null;

    return NextResponse.json({
      // KPIs
      deployedCount,
      healthCounts,
      testCoverage,
      reviewQueueCount: inReviewBlueprints.length,
      oldestReviewHours,
      atRiskCount: atRiskAgents.length,
      complianceRate,
      statusCounts,
      // Detailed data
      atRiskAgents,
      reviewQueue,
      policyCoverage,
      overdueReviews,
    });
  } catch (err) {
    console.error(`[${requestId}] Failed to fetch compliance posture:`, err);
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      "Failed to fetch compliance posture",
      undefined,
      requestId
    );
  }
}
