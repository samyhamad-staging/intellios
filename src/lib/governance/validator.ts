/**
 * Governance Validator — orchestration service.
 * Loads policies from the DB, evaluates rules, enriches violations with suggestions.
 */

import { db } from "@/lib/db";
import { governancePolicies } from "@/lib/db/schema";
import { or, isNull, eq } from "drizzle-orm";
import { ABP } from "@/lib/types/abp";
import { GovernancePolicy, PolicyRule, ValidationReport, Violation } from "./types";
import { evaluatePolicies } from "./evaluate";
import { addRemediationSuggestions } from "./remediate";

/**
 * Load applicable governance policies for an enterprise.
 * In MVP (no auth), loads all global policies (enterprise_id IS NULL).
 * When enterprise_id is provided, also loads enterprise-specific policies.
 */
async function loadPolicies(enterpriseId: string | null): Promise<GovernancePolicy[]> {
  const rows = await db
    .select()
    .from(governancePolicies)
    .where(
      enterpriseId
        ? or(isNull(governancePolicies.enterpriseId), eq(governancePolicies.enterpriseId, enterpriseId))
        : isNull(governancePolicies.enterpriseId)
    );

  return rows.map((row) => ({
    id: row.id,
    enterpriseId: row.enterpriseId,
    name: row.name,
    type: row.type,
    description: row.description,
    rules: (row.rules ?? []) as PolicyRule[],
  }));
}

/**
 * Validate an ABP against applicable governance policies.
 * Returns a ValidationReport with violations and remediation suggestions.
 *
 * @param abp - The Agent Blueprint Package to validate
 * @param enterpriseId - Enterprise to load policies for (null = global policies only)
 */
export async function validateBlueprint(
  abp: ABP,
  enterpriseId: string | null = null
): Promise<ValidationReport> {
  const policies = await loadPolicies(enterpriseId);

  if (policies.length === 0) {
    return {
      valid: true,
      violations: [],
      policyCount: 0,
      generatedAt: new Date().toISOString(),
    };
  }

  // Deterministic evaluation pass
  let violations: Violation[] = evaluatePolicies(abp, policies);

  // Claude remediation pass (only if there are violations)
  if (violations.length > 0) {
    violations = await addRemediationSuggestions(abp, violations);
  }

  const hasErrors = violations.some((v) => v.severity === "error");

  return {
    valid: !hasErrors,
    violations,
    policyCount: policies.length,
    generatedAt: new Date().toISOString(),
  };
}
