/**
 * Workflow Definition Schema — H2-4.1
 *
 * A Workflow is an orchestration artifact that composes multiple AI agents
 * into a sequential or conditional pipeline. It is a first-class artifact
 * in the Intellios registry alongside Agent Blueprint Packages.
 *
 * The `definition` field is the canonical serialisation of this schema
 * and is stored as JSONB in the `workflows` table.
 */

import { z } from "zod";

// ─── Sub-schemas ─────────────────────────────────────────────────────────────

/** A participating agent and its role within the workflow. */
export const WorkflowAgentSchema = z.object({
  /** Logical agent ID (uuid) — must reference a deployed agent blueprint. */
  agentId: z.string().uuid(),
  /**
   * Human-readable role label for this agent within the workflow,
   * e.g. "Intake Classifier", "Risk Reviewer", "Report Generator".
   */
  role: z.string().min(1).max(100),
  /** If true the workflow cannot complete without this agent. */
  required: z.boolean(),
});

/** A directed handoff rule between two workflow participants. */
export const HandoffRuleSchema = z.object({
  /**
   * Source participant — either a logical agentId or the sentinel string
   * "start" (workflow entry point).
   */
  from: z.string().min(1),
  /**
   * Destination participant — either a logical agentId or the sentinel
   * string "end" (workflow exit point).
   */
  to: z.string().min(1),
  /**
   * Natural-language or code-style condition that triggers this handoff,
   * e.g. "confidence >= 0.8" or "output.riskTier === 'high'".
   */
  condition: z.string().min(1),
  /**
   * Evaluation priority when multiple rules share the same `from` node.
   * Lower numbers are evaluated first.
   */
  priority: z.number().int().min(0),
});

/** A field in the shared context passed between agents in the workflow. */
export const SharedContextFieldSchema = z.object({
  /** Dot-separated field path, e.g. "customer.riskScore" */
  field: z.string().min(1).max(200),
  type: z.enum(["string", "number", "boolean", "json"]),
  description: z.string(),
});

// ─── Workflow Definition ──────────────────────────────────────────────────────

export const WorkflowSchema = z.object({
  /** Schema version — semver. */
  version: z.string().default("1.0.0"),
  /** Human-readable name for the workflow. */
  name: z.string().min(1).max(200),
  /** Purpose and scope of the workflow. */
  description: z.string(),
  /** Ordered list of agents that participate in the workflow. */
  agents: z.array(WorkflowAgentSchema),
  /**
   * Directed handoff rules defining how control flows between agents.
   * Must include at least one rule originating from "start".
   */
  handoffRules: z.array(HandoffRuleSchema),
  /** Shared context fields passed between agents as a structured envelope. */
  sharedContext: z.array(SharedContextFieldSchema),
});

// ─── TypeScript types ─────────────────────────────────────────────────────────

export type WorkflowDefinition = z.infer<typeof WorkflowSchema>;
export type WorkflowAgent     = z.infer<typeof WorkflowAgentSchema>;
export type HandoffRule       = z.infer<typeof HandoffRuleSchema>;
export type SharedContextField = z.infer<typeof SharedContextFieldSchema>;

// ─── Workflow status lifecycle ────────────────────────────────────────────────
// Mirrors the agent blueprint lifecycle (minus "deployed" — workflows are
// published, not deployed to a runtime target).

export const WORKFLOW_STATUSES = [
  "draft",
  "in_review",
  "approved",
  "rejected",
  "deprecated",
] as const;

export type WorkflowStatus = typeof WORKFLOW_STATUSES[number];
