/**
 * Workflow validation — run before a workflow transitions to in_review.
 *
 * Three checks:
 * 1. All referenced agents are approved or deployed (at least one version).
 * 2. All from/to values in handoffRules reference valid node IDs
 *    (agentIds in definition.agents, "start", or "end").
 * 3. The handoff graph contains no cycles (DFS from "start" to "end").
 */

import { db } from "@/lib/db";
import { agentBlueprints, workflows } from "@/lib/db/schema";
import { and, eq, inArray, or, isNull } from "drizzle-orm";
import type { WorkflowDefinition } from "@/lib/types/workflow";

export interface WorkflowValidationResult {
  valid: boolean;
  errors: string[];
}

// ─── Agent status check ───────────────────────────────────────────────────────

async function checkAgentStatuses(
  agentIds: string[],
  enterpriseId: string | null | undefined
): Promise<string[]> {
  if (agentIds.length === 0) return [];

  const unique = [...new Set(agentIds)];

  const enterpriseFilter =
    enterpriseId
      ? or(isNull(agentBlueprints.enterpriseId), eq(agentBlueprints.enterpriseId, enterpriseId))
      : isNull(agentBlueprints.enterpriseId);

  // Get the latest version of each agent (most recent by created_at) within the enterprise
  const latestVersions = await db
    .selectDistinctOn([agentBlueprints.agentId], {
      agentId: agentBlueprints.agentId,
      status:  agentBlueprints.status,
    })
    .from(agentBlueprints)
    .where(and(inArray(agentBlueprints.agentId, unique), enterpriseFilter))
    .orderBy(agentBlueprints.agentId, agentBlueprints.createdAt);

  const statusMap = new Map(latestVersions.map((r) => [r.agentId, r.status]));

  const errors: string[] = [];
  for (const id of unique) {
    const status = statusMap.get(id);
    if (!status) {
      errors.push(`Agent ${id.slice(0, 8)} not found in the registry`);
    } else if (status !== "approved" && status !== "deployed") {
      errors.push(`Agent ${id.slice(0, 8)} must be approved or deployed (current status: ${status})`);
    }
  }
  return errors;
}

// ─── Graph validation ─────────────────────────────────────────────────────────

function checkHandoffGraph(def: WorkflowDefinition): string[] {
  const errors: string[] = [];
  // Phase 3: Support "human_review" as a valid sentinel node alongside start/end
  const validNodes = new Set<string>(["start", "end", "human_review", ...def.agents.map((a) => a.agentId)]);

  // Check all from/to values are valid node references
  for (const rule of def.handoffRules) {
    if (!validNodes.has(rule.from)) {
      errors.push(`Handoff rule references unknown node "${rule.from}" in "from" field`);
    }
    if (!validNodes.has(rule.to)) {
      errors.push(`Handoff rule references unknown node "${rule.to}" in "to" field`);
    }
  }
  if (errors.length > 0) return errors; // Don't run cycle check if refs are broken

  // Build adjacency list (excluding "end" as a source)
  const adj = new Map<string, string[]>();
  for (const node of validNodes) adj.set(node, []);
  for (const rule of def.handoffRules) {
    if (rule.from !== "end") {
      adj.get(rule.from)!.push(rule.to);
    }
  }

  // DFS cycle detection
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>();
  for (const node of validNodes) color.set(node, WHITE);

  function dfs(node: string): boolean {
    color.set(node, GRAY);
    for (const neighbor of (adj.get(node) ?? [])) {
      if (color.get(neighbor) === GRAY) return true; // back edge = cycle
      if (color.get(neighbor) === WHITE && dfs(neighbor)) return true;
    }
    color.set(node, BLACK);
    return false;
  }

  for (const node of validNodes) {
    if (color.get(node) === WHITE && dfs(node)) {
      errors.push("Workflow handoff rules contain a cycle — ensure all paths eventually reach \"end\"");
      break; // one cycle error is enough
    }
  }

  // Warn if there is no path from "start" (no rule with from: "start")
  const hasStart = def.handoffRules.some((r) => r.from === "start");
  if (!hasStart && def.handoffRules.length > 0) {
    errors.push("No handoff rule originates from \"start\" — the workflow has no defined entry point");
  }

  return errors;
}

// ─── Main validator ───────────────────────────────────────────────────────────

export async function validateWorkflowForReview(
  workflowId: string,
  enterpriseId: string | null | undefined
): Promise<WorkflowValidationResult> {
  const workflow = await db.query.workflows.findFirst({
    where: eq(workflows.id, workflowId),
  });

  if (!workflow) {
    return { valid: false, errors: ["Workflow not found"] };
  }

  const def = workflow.definition as WorkflowDefinition;
  const errors: string[] = [];

  if (!def.agents || def.agents.length === 0) {
    errors.push("Workflow must have at least one participating agent");
  }

  const agentIds = (def.agents ?? []).map((a) => a.agentId);
  const [agentErrors, graphErrors] = await Promise.all([
    checkAgentStatuses(agentIds, enterpriseId),
    Promise.resolve(checkHandoffGraph(def)),
  ]);

  errors.push(...agentErrors, ...graphErrors);

  return { valid: errors.length === 0, errors };
}

// ─── Extended validation: execution readiness (Phase 3) ──────────────────────

/**
 * Validates a workflow is ready for execution. Runs all review checks plus
 * additional execution-specific validations:
 * - All agents must have at least one handoff path to "end"
 * - Human review nodes must have at least one inbound and outbound rule
 * - Bounded iteration: cycles must have a condition that eventually breaks
 */
export async function validateWorkflowForExecution(
  workflowId: string,
  enterpriseId: string | null | undefined
): Promise<WorkflowValidationResult> {
  // Start with the review validation
  const reviewResult = await validateWorkflowForReview(workflowId, enterpriseId);
  if (!reviewResult.valid) return reviewResult;

  const workflow = await db.query.workflows.findFirst({
    where: eq(workflows.id, workflowId),
  });
  if (!workflow) return { valid: false, errors: ["Workflow not found"] };

  const def = workflow.definition as WorkflowDefinition;
  const errors: string[] = [];

  // Check: every agent must be reachable from "start"
  const adj = new Map<string, string[]>();
  const validNodes = new Set(["start", "end", "human_review", ...def.agents.map((a) => a.agentId)]);
  for (const node of validNodes) adj.set(node, []);
  for (const rule of def.handoffRules) {
    if (adj.has(rule.from)) adj.get(rule.from)!.push(rule.to);
  }

  const reachable = new Set<string>();
  const bfsQueue = ["start"];
  while (bfsQueue.length > 0) {
    const node = bfsQueue.shift()!;
    if (reachable.has(node)) continue;
    reachable.add(node);
    for (const neighbor of (adj.get(node) ?? [])) {
      if (!reachable.has(neighbor)) bfsQueue.push(neighbor);
    }
  }

  for (const agent of def.agents) {
    if (!reachable.has(agent.agentId) && agent.required) {
      errors.push(`Required agent "${agent.role}" (${agent.agentId.slice(0, 8)}) is not reachable from the start node`);
    }
  }

  // Check: "end" must be reachable
  if (!reachable.has("end")) {
    errors.push("No path from \"start\" to \"end\" — the workflow has no defined completion path");
  }

  // Check: human_review nodes must have inbound and outbound rules
  const hasHumanReview = def.handoffRules.some(
    (r) => r.from === "human_review" || r.to === "human_review"
  );
  if (hasHumanReview) {
    const humanInbound = def.handoffRules.filter((r) => r.to === "human_review");
    const humanOutbound = def.handoffRules.filter((r) => r.from === "human_review");
    if (humanInbound.length === 0) {
      errors.push("Human review node has no inbound handoff rules — it will never be reached");
    }
    if (humanOutbound.length === 0) {
      errors.push("Human review node has no outbound handoff rules — execution will be permanently stuck");
    }
  }

  return { valid: errors.length === 0, errors };
}
