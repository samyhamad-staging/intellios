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

// ─── Runtime Policy Types (H2-1.1) ───────────────────────────────────────────

/**
 * Operators for runtime policies — evaluated against live telemetry aggregates,
 * not against the ABP document structure.
 *
 * - `token_budget_daily`          : total tokens in+out over a 24-hour window exceeds limit
 * - `token_budget_per_interaction`: average tokens per invocation exceeds limit
 * - `pii_action`                  : documents PII handling action (block/redact/log);
 *                                   runtime enforcement deferred to H3 Foundry layer
 * - `scope_constraint`            : checks deployed ABP tool list against an allowlist
 * - `circuit_breaker_error_rate`  : error rate (errors/invocations) over window exceeds threshold
 */
export type RuntimeRuleOperator =
  | "token_budget_daily"
  | "token_budget_per_interaction"
  | "pii_action"
  | "scope_constraint"
  | "circuit_breaker_error_rate";

/** One assertion rule within a runtime policy. */
export interface RuntimePolicyRule {
  id: string;
  operator: RuntimeRuleOperator;
  /**
   * Operator-specific value:
   * - `token_budget_daily`          : number (max tokens per 24h)
   * - `token_budget_per_interaction`: number (max avg tokens per invocation)
   * - `pii_action`                  : "block" | "redact" | "log"
   * - `scope_constraint`            : string[] (allowed tool names)
   * - `circuit_breaker_error_rate`  : number 0–1 (e.g. 0.1 = 10% error rate)
   */
  value: unknown;
  severity: Severity;
  message: string;
}

/**
 * A runtime violation detected by `evaluateRuntimePolicies()`.
 * Written to the `runtimeViolations` table.
 */
export interface RuntimeViolation {
  policyId: string;
  policyName: string;
  ruleId: string;
  severity: Severity;
  metric: string;          // e.g. "tokens_daily", "error_rate", "avg_tokens_per_interaction"
  observedValue: number;
  threshold: number;
  message: string;
  telemetryTimestamp: Date; // the telemetry window end timestamp used for evaluation
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

/** A stored runtime governance policy as loaded from the database. */
export interface RuntimeGovernancePolicy {
  id: string;
  enterpriseId: string | null;
  name: string;
  type: "runtime";
  description: string | null;
  rules: RuntimePolicyRule[];
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
  evaluatedPolicyIds: string[]; // IDs of policies evaluated in this run (for staleness detection)
  generatedAt: string;         // ISO timestamp
}
