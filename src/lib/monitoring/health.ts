/**
 * Deployment Health & Governance Drift Detection — Phase 19.
 *
 * Checks whether deployed agents remain compliant with the current enterprise
 * policy set. Uses evaluatePolicies() (pure deterministic rule engine, no AI)
 * so checks are fast enough to run on every policy mutation.
 *
 * Health statuses:
 *   clean    — 0 error-severity violations against current policies
 *   critical — 1+ error-severity violations (governance drift detected)
 *   unknown  — never been checked
 */

import { db } from "@/lib/db";
import { agentBlueprints, deploymentHealth, agentTelemetry } from "@/lib/db/schema";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { SAFE_BLUEPRINT_COLUMNS } from "@/lib/db/safe-columns";
import { loadPolicies } from "@/lib/governance/load-policies";
import { evaluatePolicies } from "@/lib/governance/evaluate";
import type { ABP } from "@/lib/types/abp";
import { readABP } from "@/lib/abp/read";
import type { ValidationReport } from "@/lib/governance/types";

export type HealthStatus = "clean" | "degraded" | "critical" | "unknown";

export interface HealthCheckResult {
  agentId: string;
  blueprintId: string;
  healthStatus: "clean" | "degraded" | "critical";
  errorCount: number;
  warningCount: number;
  /** Health status before this check — used to detect status transitions. */
  previousStatus: HealthStatus;
  checkedAt: string; // ISO
  // Production telemetry (null if no data available)
  productionErrorRate: number | null;
  productionLatencyP99: number | null;
  lastTelemetryAt: Date | null;
}

/**
 * Run a governance health check for a single deployed agent version.
 * Upserts the result into deployment_health keyed on agentId.
 * Returns null if the blueprint row cannot be found.
 */
export async function checkDeploymentHealth(
  blueprintId: string,
  enterpriseId: string | null,
  deployedAt: Date
): Promise<HealthCheckResult | null> {
  // 1. Fetch the blueprint
  const [blueprint] = await db
    .select(SAFE_BLUEPRINT_COLUMNS)
    .from(agentBlueprints)
    .where(eq(agentBlueprints.id, blueprintId))
    .limit(1);
  if (!blueprint) return null;

  // 2. Load current enterprise policies (same or(isNull, eq) query used everywhere)
  const policies = await loadPolicies(enterpriseId);

  // 3. Pure rule evaluation — no AI, no remediation suggestions
  const violations = evaluatePolicies(readABP(blueprint.abp), policies);
  const errors   = violations.filter((v) => v.severity === "error");
  const warnings = violations.filter((v) => v.severity === "warning");

  // 4. Query 24h telemetry aggregate for production health signal
  const since24h = new Date(Date.now() - 24 * 3_600_000);
  const since6h  = new Date(Date.now() -  6 * 3_600_000);

  const [telemetry24h, telemetry6h, latestTelemetry] = await Promise.all([
    db
      .select({
        totalInvocations: sql<number>`SUM(${agentTelemetry.invocations})`,
        totalErrors:       sql<number>`SUM(${agentTelemetry.errors})`,
        maxLatencyP99:     sql<number>`MAX(${agentTelemetry.latencyP99Ms})`,
        maxTimestamp:      sql<Date | null>`MAX(${agentTelemetry.timestamp})`,
      })
      .from(agentTelemetry)
      .where(and(eq(agentTelemetry.agentId, blueprint.agentId), gt(agentTelemetry.timestamp, since24h))),
    db
      .select({ totalInvocations: sql<number>`SUM(${agentTelemetry.invocations})` })
      .from(agentTelemetry)
      .where(and(eq(agentTelemetry.agentId, blueprint.agentId), gt(agentTelemetry.timestamp, since6h))),
    db
      .select({ maxTimestamp: sql<Date | null>`MAX(${agentTelemetry.timestamp})` })
      .from(agentTelemetry)
      .where(eq(agentTelemetry.agentId, blueprint.agentId)),
  ]);

  const totalInv24 = Number(telemetry24h[0]?.totalInvocations ?? 0);
  const totalErr24 = Number(telemetry24h[0]?.totalErrors ?? 0);
  const prodErrorRate = totalInv24 > 0 ? totalErr24 / totalInv24 : null;
  const prodLatencyP99 = telemetry24h[0]?.maxLatencyP99 ? Number(telemetry24h[0].maxLatencyP99) : null;
  const lastTelemetryAt = latestTelemetry[0]?.maxTimestamp ?? null;
  const inv6h = Number(telemetry6h[0]?.totalInvocations ?? 0);

  // 5. Compute combined governance + production health status
  //   critical: governance errors > 0 OR production error rate > 20%
  //   degraded: production error rate 5–20% OR zero invocations in last 6h (with telemetry data)
  //   clean: otherwise
  let healthStatus: "clean" | "degraded" | "critical";
  if (errors.length > 0 || (prodErrorRate !== null && prodErrorRate > 0.2)) {
    healthStatus = "critical";
  } else if (
    (prodErrorRate !== null && prodErrorRate > 0.05) ||
    (lastTelemetryAt !== null && inv6h === 0)
  ) {
    healthStatus = "degraded";
  } else {
    healthStatus = "clean";
  }

  // Build a minimal ValidationReport (violations present but no suggestions)
  const report: ValidationReport = {
    valid: errors.length === 0,
    violations,
    policyCount: policies.length,
    evaluatedPolicyIds: policies.map((p) => p.id),
    generatedAt: new Date().toISOString(),
  };

  // 6. Read previous status for transition detection
  const existing = await db.query.deploymentHealth.findFirst({
    where: eq(deploymentHealth.agentId, blueprint.agentId),
  });
  const previousStatus: HealthStatus =
    (existing?.healthStatus as HealthStatus) ?? "unknown";

  // 7. Upsert health record (INSERT or UPDATE on agentId conflict)
  await db
    .insert(deploymentHealth)
    .values({
      agentId:               blueprint.agentId,
      blueprintId:           blueprint.id,
      enterpriseId,
      healthStatus,
      errorCount:            errors.length,
      warningCount:          warnings.length,
      validationReport:      report,
      lastCheckedAt:         new Date(),
      deployedAt,
      productionErrorRate:   prodErrorRate,
      productionLatencyP99:  prodLatencyP99,
      lastTelemetryAt:       lastTelemetryAt ? new Date(lastTelemetryAt) : null,
    })
    .onConflictDoUpdate({
      target: deploymentHealth.agentId,
      set: {
        blueprintId:           blueprint.id,
        healthStatus,
        errorCount:            errors.length,
        warningCount:          warnings.length,
        validationReport:      report,
        lastCheckedAt:         new Date(),
        productionErrorRate:   prodErrorRate,
        productionLatencyP99:  prodLatencyP99,
        lastTelemetryAt:       lastTelemetryAt ? new Date(lastTelemetryAt) : null,
      },
    });

  return {
    agentId:              blueprint.agentId,
    blueprintId:          blueprint.id,
    healthStatus,
    errorCount:           errors.length,
    warningCount:         warnings.length,
    previousStatus,
    checkedAt:            new Date().toISOString(),
    productionErrorRate:  prodErrorRate,
    productionLatencyP99: prodLatencyP99,
    lastTelemetryAt:      lastTelemetryAt ? new Date(lastTelemetryAt) : null,
  };
}

/**
 * Check all currently-deployed agents for a given enterprise.
 * Returns a summary of how many were checked and how many are critical.
 */
export async function checkAllDeployedAgents(
  enterpriseId: string | null
): Promise<{ checked: number; critical: number; results: HealthCheckResult[] }> {
  const enterpriseFilter = enterpriseId
    ? eq(agentBlueprints.enterpriseId, enterpriseId)
    : isNull(agentBlueprints.enterpriseId);

  const deployed = await db
    .select(SAFE_BLUEPRINT_COLUMNS)
    .from(agentBlueprints)
    .where(and(eq(agentBlueprints.status, "deployed"), enterpriseFilter));

  const results: HealthCheckResult[] = [];
  for (const bp of deployed) {
    const result = await checkDeploymentHealth(
      bp.id,
      bp.enterpriseId ?? null,
      bp.updatedAt  // updatedAt reflects when status was last changed (i.e. deployed)
    );
    if (result) results.push(result);
  }

  return {
    checked:  results.length,
    critical: results.filter((r) => r.healthStatus === "critical").length,
    results,
  };
}
