/**
 * Deterministic governance rule evaluator.
 * Evaluates PolicyRule assertions against an ABP. No AI calls — pure logic.
 * See ADR-005 for operator semantics.
 */

import { ABP } from "@/lib/types/abp";
import { PolicyRule, GovernancePolicy, Violation } from "./types";

// ─── Field resolution ─────────────────────────────────────────────────────────

/** Resolve a dot-notation field path against the ABP object. */
function resolveField(abp: ABP, fieldPath: string): unknown {
  const parts = fieldPath.split(".");
  let current: unknown = abp;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

// ─── Operator evaluation ──────────────────────────────────────────────────────

function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/** Returns true if the rule PASSES (i.e., no violation). */
function evaluateRule(abp: ABP, rule: PolicyRule): boolean {
  const fieldValue = resolveField(abp, rule.field);
  const { operator, value: ruleValue } = rule;

  switch (operator) {
    case "exists":
      return !isEmpty(fieldValue);

    case "not_exists":
      return isEmpty(fieldValue);

    case "equals":
      return fieldValue === ruleValue;

    case "not_equals":
      return fieldValue !== ruleValue;

    case "contains": {
      if (typeof fieldValue === "string")
        return fieldValue.includes(String(ruleValue));
      if (Array.isArray(fieldValue)) return fieldValue.includes(ruleValue);
      return false;
    }

    case "not_contains": {
      if (typeof fieldValue === "string")
        return !fieldValue.includes(String(ruleValue));
      if (Array.isArray(fieldValue)) return !fieldValue.includes(ruleValue);
      return true; // non-string non-array passes
    }

    case "matches": {
      if (typeof fieldValue !== "string") return false;
      try {
        return new RegExp(String(ruleValue)).test(fieldValue);
      } catch {
        return false;
      }
    }

    case "count_gte":
      return Array.isArray(fieldValue) && fieldValue.length >= Number(ruleValue);

    case "count_lte":
      return Array.isArray(fieldValue) && fieldValue.length <= Number(ruleValue);

    case "includes_type":
      return (
        Array.isArray(fieldValue) &&
        fieldValue.some(
          (item) => (item as { type?: unknown })?.type === ruleValue
        )
      );

    case "not_includes_type":
      return (
        !Array.isArray(fieldValue) ||
        !fieldValue.some(
          (item) => (item as { type?: unknown })?.type === ruleValue
        )
      );

    default:
      // Unknown operator — pass to avoid false blocks
      return true;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Evaluate all rules across all policies against the given ABP.
 * Returns violations for every rule that fails. Suggestions are null — filled by remediate.ts.
 */
export function evaluatePolicies(
  abp: ABP,
  policies: GovernancePolicy[]
): Violation[] {
  const violations: Violation[] = [];

  for (const policy of policies) {
    for (const rule of policy.rules) {
      const passes = evaluateRule(abp, rule);
      if (!passes) {
        violations.push({
          policyId: policy.id,
          policyName: policy.name,
          ruleId: rule.id,
          field: rule.field,
          operator: rule.operator,
          severity: rule.severity,
          message: rule.message,
          suggestion: null,
        });
      }
    }
  }

  return violations;
}
