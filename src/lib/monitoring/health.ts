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
import { agentBlueprints, deploymentHealth } from "@/lib/db/schema";
import { eq, isNull } from "drizzle-orm";
import { loadPolicies } from "@/lib/governance/load-policies";
import { evaluatePolicies } from "@/lib/governance/evaluate";
import type { ABP } from "@/lib/types/abp";
import type { ValidationReport } from "@/lib/governance/types";

export type HealthStatus = "clean" | "critical" | "unknown";

export interface HealthCheckResult {
  agentId: string;
  blueprintId: string;
  healthStatus: "clean" | "critical";
  errorCount: number;
  warningCount: number;
  /** Health status before this check — used to detect clean↔critical transitions. */
  previousStatus: HealthStatus;
  checkedAt: string; // ISO
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
  const blueprint = await db.query.agentBlueprints.findFirst({
    where: eq(agentBlueprints.id, blueprintId),
  });
  if (!blueprint) return null;

  // 2. Load current enterprise policies (same or(isNull, eq) query used everywhere)
  const policies = await loadPolicies(enterpriseId);

  // 3. Pure rule evaluation — no AI, no remediation suggestions
  const violations = evaluatePolicies(blueprint.abp as ABP, policies);
  const errors   = violations.filter((v) => v.severity === "error");
  const warnings = violations.filter((v) => v.severity === "warning");
  const healthStatus: "clean" | "critical" = errors.length > 0 ? "critical" : "clean";

  // Build a minimal ValidationReport (violations present but no suggestions)
  const report: ValidationReport = {
    valid: errors.length === 0,
    violations,
    policyCount: policies.length,
    evaluatedPolicyIds: policies.map((p) => p.id),
    generatedAt: new Date().toISOString(),
  };

  // 4. Read previous status for transition detection
  const existing = await db.query.deploymentHealth.findFirst({
    where: eq(deploymentHealth.agentId, blueprint.agentId),
  });
  const previousStatus: HealthStatus =
    (existing?.healthStatus as HealthStatus) ?? "unknown";

  // 5. Upsert health record (INSERT or UPDATE on agentId conflict)
  await db
    .insert(deploymentHealth)
    .values({
      agentId:          blueprint.agentId,
      blueprintId:      blueprint.id,
      enterpriseId,
      healthStatus,
      errorCount:       errors.length,
      warningCount:     warnings.length,
      validationReport: report,
      lastCheckedAt:    new Date(),
      deployedAt,
    })
    .onConflictDoUpdate({
      target: deploymentHealth.agentId,
      set: {
        blueprintId:      blueprint.id,
        healthStatus,
        errorCount:       errors.length,
        warningCount:     warnings.length,
        validationReport: report,
        lastCheckedAt:    new Date(),
      },
    });

  return {
    agentId:        blueprint.agentId,
    blueprintId:    blueprint.id,
    healthStatus,
    errorCount:     errors.length,
    warningCount:   warnings.length,
    previousStatus,
    checkedAt:      new Date().toISOString(),
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

  const deployed = await db.query.agentBlueprints.findMany({
    where: (t, { and }) => and(eq(t.status, "deployed"), enterpriseFilter),
  });

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
