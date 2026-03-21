/**
 * Workflow governance diff — compare two WorkflowDefinition snapshots.
 *
 * Used by GET /api/workflows/[id]/diff to surface what changed between
 * two workflow versions for the governance review record.
 */

import type { WorkflowAgent, HandoffRule, SharedContextField } from "@/lib/types/workflow";

export interface WorkflowDiff {
  agentsAdded:        WorkflowAgent[];
  agentsRemoved:      WorkflowAgent[];
  rulesAdded:         HandoffRule[];
  rulesRemoved:       HandoffRule[];
  /** Rules that exist in both but whose condition or priority changed. */
  rulesModified:      Array<{ before: HandoffRule; after: HandoffRule }>;
  contextFieldsAdded:   SharedContextField[];
  contextFieldsRemoved: SharedContextField[];
  /** true when no changes were detected at all. */
  unchanged: boolean;
}

type WorkflowSnapshot = {
  agents:        WorkflowAgent[];
  handoffRules:  HandoffRule[];
  sharedContext: SharedContextField[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function agentKey(a: WorkflowAgent) { return a.agentId; }
function ruleKey(r: HandoffRule)    { return `${r.from}→${r.to}`; }
function fieldKey(f: SharedContextField) { return f.field; }

// ─── Diff ─────────────────────────────────────────────────────────────────────

export function diffWorkflows(before: WorkflowSnapshot, after: WorkflowSnapshot): WorkflowDiff {
  // ── Agents ──
  const beforeAgentMap = new Map(before.agents.map((a) => [agentKey(a), a]));
  const afterAgentMap  = new Map(after.agents.map((a) => [agentKey(a), a]));

  const agentsAdded   = after.agents.filter((a) => !beforeAgentMap.has(agentKey(a)));
  const agentsRemoved = before.agents.filter((a) => !afterAgentMap.has(agentKey(a)));

  // ── Handoff rules ──
  const beforeRuleMap = new Map(before.handoffRules.map((r) => [ruleKey(r), r]));
  const afterRuleMap  = new Map(after.handoffRules.map((r) => [ruleKey(r), r]));

  const rulesAdded:    HandoffRule[] = [];
  const rulesRemoved:  HandoffRule[] = [];
  const rulesModified: Array<{ before: HandoffRule; after: HandoffRule }> = [];

  for (const [key, afterRule] of afterRuleMap) {
    const beforeRule = beforeRuleMap.get(key);
    if (!beforeRule) {
      rulesAdded.push(afterRule);
    } else if (beforeRule.condition !== afterRule.condition || beforeRule.priority !== afterRule.priority) {
      rulesModified.push({ before: beforeRule, after: afterRule });
    }
  }
  for (const [key, beforeRule] of beforeRuleMap) {
    if (!afterRuleMap.has(key)) rulesRemoved.push(beforeRule);
  }

  // ── Shared context fields ──
  const beforeFieldMap = new Map(before.sharedContext.map((f) => [fieldKey(f), f]));
  const afterFieldMap  = new Map(after.sharedContext.map((f) => [fieldKey(f), f]));

  const contextFieldsAdded   = after.sharedContext.filter((f) => !beforeFieldMap.has(fieldKey(f)));
  const contextFieldsRemoved = before.sharedContext.filter((f) => !afterFieldMap.has(fieldKey(f)));

  const unchanged =
    agentsAdded.length === 0 &&
    agentsRemoved.length === 0 &&
    rulesAdded.length === 0 &&
    rulesRemoved.length === 0 &&
    rulesModified.length === 0 &&
    contextFieldsAdded.length === 0 &&
    contextFieldsRemoved.length === 0;

  return {
    agentsAdded,
    agentsRemoved,
    rulesAdded,
    rulesRemoved,
    rulesModified,
    contextFieldsAdded,
    contextFieldsRemoved,
    unchanged,
  };
}
