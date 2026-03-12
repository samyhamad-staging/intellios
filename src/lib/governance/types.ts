/**
 * Governance Validator — shared types.
 * See ADR-005 for the policy expression language specification.
 */

export type RuleOperator =
  | "exists"
  | "not_exists"
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "matches"
  | "count_gte"
  | "count_lte"
  | "includes_type"
  | "not_includes_type";

export type Severity = "error" | "warning";

/** One assertion rule within a policy (v1.1.0 format — see ADR-005). */
export interface PolicyRule {
  id: string;
  field: string;        // dot-notation path into ABP
  operator: RuleOperator;
  value?: unknown;      // comparison value; not required for exists/not_exists
  severity: Severity;
  message: string;      // human-readable violation message
}

/** A stored governance policy as loaded from the database. */
export interface GovernancePolicy {
  id: string;
  enterpriseId: string | null;
  name: string;
  type: string;
  description: string | null;
  rules: PolicyRule[];
}

/** A single rule violation produced by the evaluator. */
export interface Violation {
  policyId: string;
  policyName: string;
  ruleId: string;
  field: string;
  operator: string;
  severity: Severity;
  message: string;
  suggestion: string | null; // populated by the remediation pass
}

/** Full validation report stored in agent_blueprints.validation_report. */
export interface ValidationReport {
  valid: boolean;              // true if no error-severity violations
  violations: Violation[];
  policyCount: number;         // how many policies were evaluated
  generatedAt: string;         // ISO timestamp
}
