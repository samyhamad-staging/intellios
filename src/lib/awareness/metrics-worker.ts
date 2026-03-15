/**
 * Phase 28: Metrics Worker
 *
 * Computes a system health snapshot using pure SQL aggregations against
 * existing tables. No AI calls — this is a deterministic measurement pass.
 *
 * Called by POST /api/monitor/intelligence/snapshot.
 * After writing the snapshot, detectAnomalies() is invoked automatically.
 */

import { db } from "@/lib/db";
import {
  agentBlueprints,
  auditLog,
  deploymentHealth,
  governancePolicies,
  systemHealthSnapshots,
  webhookDeliveries,
} from "@/lib/db/schema";
import { and, count, eq, gte, isNotNull, isNull, ne, sql } from "drizzle-orm";
import { getEnterpriseSettings } from "@/lib/settings/get-settings";
import type { MetricsSnapshot } from "./types";

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/**
 * Run a full metrics aggregation pass and persist a system health snapshot.
 * Returns the written snapshot (with generated id and snapshotAt).
 */
export async function runMetricsSnapshot(
  enterpriseId: string | null
): Promise<MetricsSnapshot> {
  const settings = await getEnterpriseSettings(enterpriseId);
  const now = new Date();
  const minus7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const minus24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const minus48h = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  const enterpriseFilter = enterpriseId
    ? eq(agentBlueprints.enterpriseId, enterpriseId)
    : isNull(agentBlueprints.enterpriseId);

  // ── 1. Blueprint validity rate (7d rolling) ──────────────────────────────
  // % of blueprints created in the last 7 days that have validationReport.valid = true
  const recentBlueprints = await db
    .select({
      id: agentBlueprints.id,
      validationReport: agentBlueprints.validationReport,
    })
    .from(agentBlueprints)
    .where(and(enterpriseFilter, gte(agentBlueprints.createdAt, minus7d)));

  const total7d = recentBlueprints.length;
  const valid7d = recentBlueprints.filter(
    (b) => (b.validationReport as { valid?: boolean } | null)?.valid === true
  ).length;
  const blueprintValidityRate = total7d > 0 ? valid7d / total7d : null;

  // ── 2. Average refinements (last 30 blueprints) ──────────────────────────
  const last30 = await db
    .select({ refinementCount: agentBlueprints.refinementCount })
    .from(agentBlueprints)
    .where(enterpriseFilter)
    .orderBy(sql`${agentBlueprints.createdAt} DESC`)
    .limit(30);

  const avgRefinements =
    last30.length > 0
      ? last30.reduce((sum, b) => sum + (parseInt(b.refinementCount ?? "0", 10) || 0), 0) /
        last30.length
      : null;

  // ── 3. Review queue depth ────────────────────────────────────────────────
  const [queueRow] = await db
    .select({ cnt: count() })
    .from(agentBlueprints)
    .where(and(enterpriseFilter, eq(agentBlueprints.status, "in_review")));
  const reviewQueueDepth = Number(queueRow?.cnt ?? 0);

  // ── 4. SLA compliance rate (blueprints CREATED in last 7d that have been reviewed) ──
  // Correct definition: among blueprints created this week, what fraction were
  // reviewed within the SLA warn window measured from their creation time?
  // (Previous bug: filtered by reviewedAt >= minus7d, which accepted a blueprint
  //  created 30 days ago reviewed yesterday as "1-day turnaround".)
  const recentlyCreatedReviewed = await db
    .select({
      createdAt: agentBlueprints.createdAt,
      reviewedAt: agentBlueprints.reviewedAt,
    })
    .from(agentBlueprints)
    .where(
      and(
        enterpriseFilter,
        gte(agentBlueprints.createdAt, minus7d),
        isNotNull(agentBlueprints.reviewedAt)
      )
    );

  const warnMs = settings.sla.warnHours * 60 * 60 * 1000;
  const withinSla = recentlyCreatedReviewed.filter((b) => {
    if (!b.reviewedAt) return false;
    return b.reviewedAt.getTime() - b.createdAt.getTime() <= warnMs;
  }).length;
  const slaComplianceRate =
    recentlyCreatedReviewed.length > 0 ? withinSla / recentlyCreatedReviewed.length : null;

  // Average review turnaround (hours) — for context in briefing
  const avgTimeInReviewHours =
    recentlyCreatedReviewed.length > 0
      ? recentlyCreatedReviewed.reduce((sum, b) => {
          if (!b.reviewedAt) return sum;
          return sum + (b.reviewedAt.getTime() - b.createdAt.getTime()) / (1000 * 60 * 60);
        }, 0) / recentlyCreatedReviewed.length
      : null;

  // ── 5. Webhook success rate (last 24h, real deliveries only) ─────────────
  // Test deliveries (eventType = 'webhook.test') always target localhost/echo endpoints
  // and may fail by design. Excluding them gives an honest operational signal.
  // If no real deliveries occurred, webhookSuccessRate = null (reported as "N/A",
  // not 0%) — prevents false alerts when webhooks simply aren't in use.
  const webhookEnterpriseFilter = enterpriseId
    ? eq(webhookDeliveries.enterpriseId, enterpriseId)
    : isNull(webhookDeliveries.enterpriseId);

  const recentRealDeliveries = await db
    .select({
      status: webhookDeliveries.status,
      eventType: webhookDeliveries.eventType,
      responseStatus: webhookDeliveries.responseStatus,
    })
    .from(webhookDeliveries)
    .where(
      and(
        webhookEnterpriseFilter,
        gte(webhookDeliveries.createdAt, minus24h),
        ne(webhookDeliveries.eventType, "webhook.test")
      )
    );

  const webhookTotal = recentRealDeliveries.length;
  const webhookSuccess = recentRealDeliveries.filter((d) => d.status === "success").length;
  const webhookSuccessRate = webhookTotal > 0 ? webhookSuccess / webhookTotal : null;

  // Failure breakdown — gives the briefing enough context to diagnose root causes.
  // e.g. "all 413 failures are blueprint.report_exported with HTTP 404" → misconfiguration
  const webhookFailureBreakdown: Record<string, { count: number; httpStatuses: number[] }> = {};
  for (const d of recentRealDeliveries) {
    if (d.status !== "success") {
      const key = d.eventType;
      if (!webhookFailureBreakdown[key]) webhookFailureBreakdown[key] = { count: 0, httpStatuses: [] };
      webhookFailureBreakdown[key].count++;
      if (d.responseStatus && !webhookFailureBreakdown[key].httpStatuses.includes(d.responseStatus)) {
        webhookFailureBreakdown[key].httpStatuses.push(d.responseStatus);
      }
    }
  }

  // ── 6. Active policy count ────────────────────────────────────────────────
  const policyEnterpriseFilter = enterpriseId
    ? eq(governancePolicies.enterpriseId, enterpriseId)
    : isNull(governancePolicies.enterpriseId);

  const [policyRow] = await db
    .select({ cnt: count() })
    .from(governancePolicies)
    .where(and(policyEnterpriseFilter, isNull(governancePolicies.supersededAt)));
  const activePolicyCount = Number(policyRow?.cnt ?? 0);

  // ── 7. Blueprints generated in last 24h and 48h ──────────────────────────
  const [gen24hRow] = await db
    .select({ cnt: count() })
    .from(agentBlueprints)
    .where(and(enterpriseFilter, gte(agentBlueprints.createdAt, minus24h)));
  const blueprintsGenerated24h = Number(gen24hRow?.cnt ?? 0);

  const [gen48hRow] = await db
    .select({ cnt: count() })
    .from(agentBlueprints)
    .where(and(enterpriseFilter, gte(agentBlueprints.createdAt, minus48h)));
  const blueprintsGenerated48h = Number(gen48hRow?.cnt ?? 0);

  // ── 8. Deployed agents with critical health (last 24h check window) ───────
  const healthEnterpriseFilter = enterpriseId
    ? eq(deploymentHealth.enterpriseId, enterpriseId)
    : isNull(deploymentHealth.enterpriseId);

  const recentCritical = await db
    .select({ id: deploymentHealth.id })
    .from(deploymentHealth)
    .where(
      and(
        healthEnterpriseFilter,
        gte(deploymentHealth.lastCheckedAt, minus24h),
        eq(deploymentHealth.healthStatus, "critical")
      )
    );
  const violations24h = recentCritical.length;

  // ── Quality Index ─────────────────────────────────────────────────────────
  // Weight allocation:
  //   50% validity rate  (or 40% when webhook data is available — see below)
  //   20% refinement efficiency   (lower rework = better first-pass generation)
  //   20% SLA compliance          (operational responsiveness)
  //   10% policy coverage         (governance posture)
  //   10% webhook reliability     (only when real non-test deliveries exist)
  //
  // When no real webhook deliveries have occurred in 24h, the 10% webhook weight
  // is redistributed to validity rate. This avoids penalising or rewarding the
  // platform for a signal that simply isn't present yet.
  const refinementEfficiency =
    avgRefinements != null ? 1 - clamp(avgRefinements / 10, 0, 1) : 0.5;

  const policyScore = activePolicyCount > 0 ? 1.0 : 0.0;

  const qualityIndex =
    webhookSuccessRate != null
      ? (blueprintValidityRate ?? 0.5) * 40 +
        refinementEfficiency * 20 +
        (slaComplianceRate ?? 0.5) * 20 +
        policyScore * 10 +
        webhookSuccessRate * 10
      : (blueprintValidityRate ?? 0.5) * 50 +
        refinementEfficiency * 20 +
        (slaComplianceRate ?? 0.5) * 20 +
        policyScore * 10;

  const rawMetrics = {
    total7d,
    valid7d,
    last30Count: last30.length,
    webhookTotal,
    webhookSuccess,
    recentlyReviewedCount: recentlyCreatedReviewed.length,
    withinSla,
    avgTimeInReviewHours: avgTimeInReviewHours != null
      ? parseFloat(avgTimeInReviewHours.toFixed(2))
      : null,
    blueprintsGenerated48h,
    hasRealWebhookData: webhookTotal > 0,
    webhookFailureBreakdown: Object.keys(webhookFailureBreakdown).length > 0
      ? webhookFailureBreakdown
      : null,
  };

  // ── Persist snapshot ──────────────────────────────────────────────────────
  const [row] = await db
    .insert(systemHealthSnapshots)
    .values({
      enterpriseId: enterpriseId ?? null,
      qualityIndex: qualityIndex.toFixed(2),
      blueprintValidityRate: blueprintValidityRate != null ? blueprintValidityRate.toFixed(4) : null,
      avgRefinements: avgRefinements != null ? avgRefinements.toFixed(2) : null,
      reviewQueueDepth,
      slaComplianceRate: slaComplianceRate != null ? slaComplianceRate.toFixed(4) : null,
      webhookSuccessRate: webhookSuccessRate != null ? webhookSuccessRate.toFixed(4) : null,
      activePolicyCount,
      blueprintsGenerated24h,
      violations24h,
      rawMetrics,
    })
    .returning();

  return {
    id: row.id,
    enterpriseId: row.enterpriseId,
    snapshotAt: row.snapshotAt.toISOString(),
    qualityIndex: row.qualityIndex != null ? parseFloat(row.qualityIndex) : null,
    blueprintValidityRate: row.blueprintValidityRate != null ? parseFloat(row.blueprintValidityRate) : null,
    avgRefinements: row.avgRefinements != null ? parseFloat(row.avgRefinements) : null,
    reviewQueueDepth: row.reviewQueueDepth,
    slaComplianceRate: row.slaComplianceRate != null ? parseFloat(row.slaComplianceRate) : null,
    webhookSuccessRate: row.webhookSuccessRate != null ? parseFloat(row.webhookSuccessRate) : null,
    activePolicyCount: row.activePolicyCount,
    blueprintsGenerated24h: row.blueprintsGenerated24h,
    violations24h: row.violations24h,
    rawMetrics: row.rawMetrics as Record<string, unknown>,
  };
}

/**
 * Fetch the most recent N snapshots for an enterprise (newest-first).
 */
export async function getRecentSnapshots(
  enterpriseId: string | null,
  limit = 14
): Promise<MetricsSnapshot[]> {
  const filter = enterpriseId
    ? eq(systemHealthSnapshots.enterpriseId, enterpriseId)
    : isNull(systemHealthSnapshots.enterpriseId);

  const rows = await db
    .select()
    .from(systemHealthSnapshots)
    .where(filter)
    .orderBy(sql`${systemHealthSnapshots.snapshotAt} DESC`)
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    enterpriseId: row.enterpriseId,
    snapshotAt: row.snapshotAt.toISOString(),
    qualityIndex: row.qualityIndex != null ? parseFloat(row.qualityIndex) : null,
    blueprintValidityRate: row.blueprintValidityRate != null ? parseFloat(row.blueprintValidityRate) : null,
    avgRefinements: row.avgRefinements != null ? parseFloat(row.avgRefinements) : null,
    reviewQueueDepth: row.reviewQueueDepth,
    slaComplianceRate: row.slaComplianceRate != null ? parseFloat(row.slaComplianceRate) : null,
    webhookSuccessRate: row.webhookSuccessRate != null ? parseFloat(row.webhookSuccessRate) : null,
    activePolicyCount: row.activePolicyCount,
    blueprintsGenerated24h: row.blueprintsGenerated24h,
    violations24h: row.violations24h,
    rawMetrics: row.rawMetrics as Record<string, unknown>,
  }));
}
