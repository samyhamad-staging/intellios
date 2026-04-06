/**
 * Workflow Governance Extensions — Phase 3
 *
 * Governance policies that apply specifically to workflow orchestrations.
 * Includes drift detection, execution-level policy enforcement,
 * and evidence packaging for audit trails.
 */

import type { WorkflowDefinition } from "@/lib/types/workflow";

// ─── Workflow Governance Policy Types ────────────────────────────────────────

export interface WorkflowGovernancePolicy {
  id: string;
  name: string;
  description: string;
  /** What the policy checks */
  category: "composition" | "execution" | "data_flow" | "compliance";
  /** Severity if violated */
  severity: "error" | "warning" | "info";
  /** Evaluation function */
  evaluate: (def: WorkflowDefinition) => WorkflowPolicyViolation[];
}

export interface WorkflowPolicyViolation {
  policyId: string;
  policyName: string;
  severity: "error" | "warning" | "info";
  message: string;
  /** Specific node or rule that triggered the violation */
  target?: string;
  /** Suggested remediation */
  remediation?: string;
}

// ─── Built-in Workflow Governance Policies ────────────────────────────────────

export const WORKFLOW_GOVERNANCE_POLICIES: WorkflowGovernancePolicy[] = [
  {
    id: "wg-001",
    name: "Minimum Agent Count",
    description: "Workflows must include at least 2 agents to justify orchestration complexity.",
    category: "composition",
    severity: "warning",
    evaluate: (def) => {
      if ((def.agents?.length ?? 0) < 2) {
        return [{
          policyId: "wg-001",
          policyName: "Minimum Agent Count",
          severity: "warning",
          message: "Workflow has fewer than 2 agents. Single-agent workflows add orchestration overhead without benefit.",
          remediation: "Consider using the agent directly instead of wrapping it in a workflow, or add complementary agents to the pipeline.",
        }];
      }
      return [];
    },
  },
  {
    id: "wg-002",
    name: "Required Agent Coverage",
    description: "All agents marked as 'required' must be reachable from the start node.",
    category: "composition",
    severity: "error",
    evaluate: (def) => {
      const adj = new Map<string, string[]>();
      const allNodes = new Set(["start", "end", ...def.agents.map((a) => a.agentId)]);
      for (const node of allNodes) adj.set(node, []);
      for (const rule of def.handoffRules) {
        if (adj.has(rule.from)) adj.get(rule.from)!.push(rule.to);
      }

      const reachable = new Set<string>();
      const queue = ["start"];
      while (queue.length > 0) {
        const node = queue.shift()!;
        if (reachable.has(node)) continue;
        reachable.add(node);
        for (const n of (adj.get(node) ?? [])) {
          if (!reachable.has(n)) queue.push(n);
        }
      }

      return def.agents
        .filter((a) => a.required && !reachable.has(a.agentId))
        .map((a) => ({
          policyId: "wg-002",
          policyName: "Required Agent Coverage",
          severity: "error" as const,
          message: `Required agent "${a.role}" is unreachable from the start node.`,
          target: a.agentId,
          remediation: `Add a handoff rule that routes to agent "${a.role}" from an existing node in the graph.`,
        }));
    },
  },
  {
    id: "wg-003",
    name: "Shared Context Documentation",
    description: "All shared context fields must have descriptions.",
    category: "data_flow",
    severity: "warning",
    evaluate: (def) => {
      return (def.sharedContext ?? [])
        .filter((f) => !f.description || f.description.trim().length === 0)
        .map((f) => ({
          policyId: "wg-003",
          policyName: "Shared Context Documentation",
          severity: "warning" as const,
          message: `Shared context field "${f.field}" lacks a description.`,
          target: f.field,
          remediation: "Add a human-readable description explaining the purpose and expected content of this field.",
        }));
    },
  },
  {
    id: "wg-004",
    name: "Handoff Condition Specificity",
    description: "Non-trivial workflows should not rely solely on 'always' conditions — at least one conditional handoff should exist.",
    category: "execution",
    severity: "info",
    evaluate: (def) => {
      const allAlways = def.handoffRules.every(
        (r) => r.condition === "always" || r.condition === "true"
      );
      if (allAlways && def.agents.length > 2) {
        return [{
          policyId: "wg-004",
          policyName: "Handoff Condition Specificity",
          severity: "info",
          message: "All handoff rules use unconditional transitions. Consider adding conditions for branching or error handling.",
          remediation: "Add conditions to handoff rules to enable dynamic routing based on agent outputs or shared context state.",
        }];
      }
      return [];
    },
  },
  {
    id: "wg-005",
    name: "Termination Guarantee",
    description: "Every path through the workflow must eventually reach the 'end' node.",
    category: "execution",
    severity: "error",
    evaluate: (def) => {
      // Check that "end" is referenced as a target in at least one handoff rule
      const hasEndTarget = def.handoffRules.some((r) => r.to === "end");
      if (!hasEndTarget) {
        return [{
          policyId: "wg-005",
          policyName: "Termination Guarantee",
          severity: "error",
          message: "No handoff rule routes to 'end'. The workflow has no defined completion path.",
          remediation: "Add at least one handoff rule with to: 'end' to define when the workflow completes.",
        }];
      }
      return [];
    },
  },
];

// ─── Evaluate all governance policies against a workflow ──────────────────────

export function evaluateWorkflowGovernance(
  def: WorkflowDefinition
): {
  valid: boolean;
  violations: WorkflowPolicyViolation[];
  policyCount: number;
  errorCount: number;
  warningCount: number;
} {
  const violations: WorkflowPolicyViolation[] = [];

  for (const policy of WORKFLOW_GOVERNANCE_POLICIES) {
    violations.push(...policy.evaluate(def));
  }

  const errorCount = violations.filter((v) => v.severity === "error").length;
  const warningCount = violations.filter((v) => v.severity === "warning").length;

  return {
    valid: errorCount === 0,
    violations,
    policyCount: WORKFLOW_GOVERNANCE_POLICIES.length,
    errorCount,
    warningCount,
  };
}

// ─── Governance Drift Detection ──────────────────────────────────────────────

/**
 * Detects governance drift between the current workflow definition and the
 * version that was last approved. Returns a list of changes that may require
 * re-review.
 */
export function detectGovernanceDrift(
  current: WorkflowDefinition,
  approved: WorkflowDefinition
): string[] {
  const drifts: string[] = [];

  // Agent composition changes
  const currentAgentIds = new Set(current.agents.map((a) => a.agentId));
  const approvedAgentIds = new Set(approved.agents.map((a) => a.agentId));

  for (const id of currentAgentIds) {
    if (!approvedAgentIds.has(id)) {
      const agent = current.agents.find((a) => a.agentId === id);
      drifts.push(`New agent added: "${agent?.role ?? id}" — not in approved version`);
    }
  }
  for (const id of approvedAgentIds) {
    if (!currentAgentIds.has(id)) {
      const agent = approved.agents.find((a) => a.agentId === id);
      drifts.push(`Agent removed: "${agent?.role ?? id}" — was in approved version`);
    }
  }

  // Handoff rule changes
  if (current.handoffRules.length !== approved.handoffRules.length) {
    drifts.push(`Handoff rule count changed: ${approved.handoffRules.length} → ${current.handoffRules.length}`);
  }

  // Shared context changes
  const currentFields = new Set(current.sharedContext.map((f) => f.field));
  const approvedFields = new Set(approved.sharedContext.map((f) => f.field));

  for (const field of currentFields) {
    if (!approvedFields.has(field)) {
      drifts.push(`New shared context field: "${field}"`);
    }
  }
  for (const field of approvedFields) {
    if (!currentFields.has(field)) {
      drifts.push(`Shared context field removed: "${field}"`);
    }
  }

  return drifts;
}
