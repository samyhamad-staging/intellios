import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentBlueprints, auditLog, governancePolicies } from "@/lib/db/schema";
import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { getRequestId } from "@/lib/request-id";
import type { ValidationReport } from "@/lib/governance/types";

/**
 * GET /api/governance/analytics
 *
 * Returns aggregated governance analytics for the current enterprise.
 * Computed from existing tables — no dedicated analytics store required.
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
    const bpEnterpriseCondition =
      authSession.user.role === "admin" && !enterpriseId
        ? undefined // platform admin sees all
        : enterpriseId
        ? eq(agentBlueprints.enterpriseId, enterpriseId)
        : isNull(agentBlueprints.enterpriseId);

    const auditEnterpriseCondition =
      authSession.user.role === "admin" && !enterpriseId
        ? undefined
        : enterpriseId
        ? eq(auditLog.enterpriseId, enterpriseId)
        : isNull(auditLog.enterpriseId);

    const policyEnterpriseCondition =
      authSession.user.role === "admin" && !enterpriseId
        ? undefined
        : enterpriseId
        ? eq(governancePolicies.enterpriseId, enterpriseId)
        : isNull(governancePolicies.enterpriseId);

    // ── 1. Agent Status Counts ──────────────────────────────────────────────
    const statusRows = await db
      .select({
        status: agentBlueprints.status,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(agentBlueprints)
      .where(bpEnterpriseCondition)
      .groupBy(agentBlueprints.status);

    const agentStatusCounts: Record<string, number> = {};
    for (const row of statusRows) {
      agentStatusCounts[row.status] = row.count;
    }

    // ── 2. Latest blueprints for validation analysis ────────────────────────
    const latestBlueprints = await db
      .selectDistinctOn([agentBlueprints.agentId], {
        agentId: agentBlueprints.agentId,
        validationReport: agentBlueprints.validationReport,
      })
      .from(agentBlueprints)
      .where(bpEnterpriseCondition)
      .orderBy(agentBlueprints.agentId, desc(agentBlueprints.createdAt));

    // Validation pass rate
    const validated = latestBlueprints.filter((b) => b.validationReport !== null);
    const passing = validated.filter((b) => {
      const report = b.validationReport as ValidationReport | null;
      return (
        report?.violations?.filter((v) => v.severity === "error").length === 0
      );
    });
    const validationPassRate =
      validated.length > 0
        ? Math.round((passing.length / validated.length) * 100)
        : null;

    // ── 3. Monthly Submissions & Approvals (last 6 months) ─────────────────
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const [submissionRows, approvalRows] = await Promise.all([
      db
        .select({
          month: sql<string>`TO_CHAR(DATE_TRUNC('month', ${auditLog.createdAt}), 'YYYY-MM')`,
          count: sql<number>`COUNT(*)::int`,
        })
        .from(auditLog)
        .where(
          and(
            auditEnterpriseCondition,
            eq(auditLog.action, "blueprint.status_changed"),
            sql`${auditLog.toState}->>'status' = 'in_review'`,
            gte(auditLog.createdAt, sixMonthsAgo)
          )
        )
        .groupBy(sql`DATE_TRUNC('month', ${auditLog.createdAt})`)
        .orderBy(sql`DATE_TRUNC('month', ${auditLog.createdAt})`),
      db
        .select({
          month: sql<string>`TO_CHAR(DATE_TRUNC('month', ${auditLog.createdAt}), 'YYYY-MM')`,
          count: sql<number>`COUNT(*)::int`,
        })
        .from(auditLog)
        .where(
          and(
            auditEnterpriseCondition,
            eq(auditLog.action, "blueprint.status_changed"),
            sql`${auditLog.toState}->>'status' = 'approved'`,
            gte(auditLog.createdAt, sixMonthsAgo)
          )
        )
        .groupBy(sql`DATE_TRUNC('month', ${auditLog.createdAt})`)
        .orderBy(sql`DATE_TRUNC('month', ${auditLog.createdAt})`),
    ]);

    // Build a complete 6-month series (filling months with no data as 0)
    const months: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      months.push(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      );
    }

    const submissionMap = new Map(submissionRows.map((r) => [r.month, r.count]));
    const approvalMap = new Map(approvalRows.map((r) => [r.month, r.count]));

    const monthlySubmissions = months.map((month) => ({
      month,
      count: submissionMap.get(month) ?? 0,
    }));
    const monthlyApprovals = months.map((month) => ({
      month,
      count: approvalMap.get(month) ?? 0,
    }));

    // ── 4. Policy Violations by Type & Top Violated Policies ───────────────
    // Load enterprise governance policies for type mapping
    const policies = await db
      .select({ id: governancePolicies.id, name: governancePolicies.name, type: governancePolicies.type })
      .from(governancePolicies)
      .where(policyEnterpriseCondition);

    const policyTypeMap = new Map(policies.map((p) => [p.id, p.type]));

    // Aggregate violations across all latest blueprints
    const violationsByType: Record<string, number> = {};
    const violationsByPolicy: Record<string, { name: string; count: number }> = {};

    for (const blueprint of latestBlueprints) {
      const report = blueprint.validationReport as ValidationReport | null;
      if (!report?.violations) continue;
      for (const v of report.violations) {
        if (v.severity !== "error") continue;
        // By type
        const type = policyTypeMap.get(v.policyId) ?? "other";
        violationsByType[type] = (violationsByType[type] ?? 0) + 1;
        // By policy
        if (!violationsByPolicy[v.policyId]) {
          violationsByPolicy[v.policyId] = { name: v.policyName, count: 0 };
        }
        violationsByPolicy[v.policyId].count++;
      }
    }

    const policyViolationsByType = Object.entries(violationsByType)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    const topViolatedPolicies = Object.values(violationsByPolicy)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(({ name, count }) => ({ policyName: name, count }));

    // ── 5. Average Time to Approval ────────────────────────────────────────
    const statusChangeEvents = await db
      .select({
        entityId: auditLog.entityId,
        toState: auditLog.toState,
        createdAt: auditLog.createdAt,
      })
      .from(auditLog)
      .where(
        and(
          auditEnterpriseCondition,
          eq(auditLog.action, "blueprint.status_changed")
        )
      )
      .orderBy(auditLog.createdAt);

    // Track first in_review and subsequent approved per blueprint version
    const lifecycleMap: Record<string, { inReviewAt?: Date; approvedAt?: Date }> = {};
    for (const event of statusChangeEvents) {
      const status = (event.toState as { status?: string } | null)?.status;
      if (!lifecycleMap[event.entityId]) lifecycleMap[event.entityId] = {};
      if (status === "in_review" && !lifecycleMap[event.entityId].inReviewAt) {
        lifecycleMap[event.entityId].inReviewAt = event.createdAt;
      }
      if (status === "approved" && lifecycleMap[event.entityId].inReviewAt && !lifecycleMap[event.entityId].approvedAt) {
        lifecycleMap[event.entityId].approvedAt = event.createdAt;
      }
    }

    const approvalTimes = Object.values(lifecycleMap)
      .filter((e) => e.inReviewAt && e.approvedAt)
      .map(
        (e) =>
          (e.approvedAt!.getTime() - e.inReviewAt!.getTime()) / (1000 * 60 * 60)
      );

    const avgTimeToApprovalHours =
      approvalTimes.length > 0
        ? Math.round(
            approvalTimes.reduce((sum, t) => sum + t, 0) / approvalTimes.length
          )
        : null;

    return NextResponse.json({
      agentStatusCounts,
      validationPassRate,
      policyViolationsByType,
      monthlySubmissions,
      monthlyApprovals,
      topViolatedPolicies,
      avgTimeToApprovalHours,
    });
  } catch (err) {
    console.error(`[${requestId}] Failed to fetch governance analytics:`, err);
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      "Failed to fetch governance analytics",
      undefined,
      requestId
    );
  }
}
