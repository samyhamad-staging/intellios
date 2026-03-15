/**
 * Governance Validator — orchestration service.
 * Loads policies from the DB, evaluates rules, enriches violations with suggestions.
 */

import { ABP } from "@/lib/types/abp";
import { GovernancePolicy, ValidationReport, Violation } from "./types";
import { evaluatePolicies } from "./evaluate";
import { addRemediationSuggestions } from "./remediate";
import { loadPolicies } from "./load-policies";

/**
 * Validate an ABP against applicable governance policies.
 * Returns a ValidationReport with violations and remediation suggestions.
 *
 * @param abp          - The Agent Blueprint Package to validate
 * @param enterpriseId - Enterprise to load policies for (null = global policies only)
 * @param policies     - Optional pre-loaded policies. When provided, skips the DB query.
 *                       Pass these when the caller already holds the policy set to avoid
 *                       a redundant round-trip (e.g., the generate route loads once and
 *                       passes to both generateBlueprint and validateBlueprint).
 */
export async function validateBlueprint(
  abp: ABP,
  enterpriseId: string | null = null,
  policies?: GovernancePolicy[]
): Promise<ValidationReport> {
  const resolvedPolicies = policies ?? await loadPolicies(enterpriseId);

  if (resolvedPolicies.length === 0) {
    return {
      valid: true,
      violations: [],
      policyCount: 0,
      evaluatedPolicyIds: [],
      generatedAt: new Date().toISOString(),
    };
  }

  // Deterministic evaluation pass
  let violations: Violation[] = evaluatePolicies(abp, resolvedPolicies);

  // Claude remediation pass (only if there are violations)
  if (violations.length > 0) {
    violations = await addRemediationSuggestions(abp, violations);
  }

  const hasErrors = violations.some((v) => v.severity === "error");

  return {
    valid: !hasErrors,
    violations,
    policyCount: resolvedPolicies.length,
    evaluatedPolicyIds: resolvedPolicies.map((p) => p.id),
    generatedAt: new Date().toISOString(),
  };
}
