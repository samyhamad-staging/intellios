/**
 * Workflow Template Library — Phase 2
 *
 * Pre-built orchestration patterns for common enterprise use cases.
 * Each template provides a WorkflowDefinition skeleton with placeholder
 * agent IDs (to be replaced with real agent references during creation)
 * and sensible default handoff rules and shared context.
 */

import type { WorkflowDefinition } from "@/lib/types/workflow";

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  /** Category for grouping in the template picker UI */
  category: "pipeline" | "routing" | "review" | "analysis" | "automation";
  /** Tags for search/filter */
  tags: string[];
  /** Number of agents in the template */
  agentCount: number;
  /** The orchestration pattern this template implements */
  pattern: string;
  /** Template definition — agent IDs are placeholders (AGENT_1, AGENT_2, etc.) */
  definition: WorkflowDefinition;
}

// ─── Template Definitions ────────────────────────────────────────────────────

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: "sequential-pipeline",
    name: "Sequential Pipeline",
    description:
      "A linear pipeline where each agent processes and passes output to the next. Ideal for document processing, data enrichment, or multi-stage analysis workflows.",
    category: "pipeline",
    tags: ["linear", "processing", "ETL", "document"],
    agentCount: 3,
    pattern: "Sequential",
    definition: {
      version: "1.0.0",
      name: "Sequential Pipeline",
      description: "Linear pipeline: Agent A → Agent B → Agent C",
      agents: [
        { agentId: "AGENT_1", role: "Intake Processor", required: true },
        { agentId: "AGENT_2", role: "Enrichment Agent", required: true },
        { agentId: "AGENT_3", role: "Output Formatter", required: true },
      ],
      handoffRules: [
        { from: "start", to: "AGENT_1", condition: "always", priority: 0 },
        { from: "AGENT_1", to: "AGENT_2", condition: "processing.complete === true", priority: 0 },
        { from: "AGENT_2", to: "AGENT_3", condition: "enrichment.complete === true", priority: 0 },
        { from: "AGENT_3", to: "end", condition: "always", priority: 0 },
      ],
      sharedContext: [
        { field: "input.data", type: "json", description: "Raw input payload from the triggering event" },
        { field: "processing.status", type: "string", description: "Status of the current pipeline stage" },
        { field: "output.result", type: "json", description: "Final formatted output" },
      ],
    },
  },
  {
    id: "classifier-router",
    name: "Classifier–Router",
    description:
      "A classifier agent analyzes incoming requests and routes them to the appropriate specialist agent based on classification results. Perfect for support ticket routing, intent classification, or content categorization.",
    category: "routing",
    tags: ["classification", "routing", "support", "triage"],
    agentCount: 4,
    pattern: "Fan-out",
    definition: {
      version: "1.0.0",
      name: "Classifier–Router",
      description: "Classifier routes to specialist agents based on category",
      agents: [
        { agentId: "AGENT_1", role: "Classifier", required: true },
        { agentId: "AGENT_2", role: "Specialist A", required: false },
        { agentId: "AGENT_3", role: "Specialist B", required: false },
        { agentId: "AGENT_4", role: "Specialist C", required: false },
      ],
      handoffRules: [
        { from: "start", to: "AGENT_1", condition: "always", priority: 0 },
        { from: "AGENT_1", to: "AGENT_2", condition: "classification.category === 'A'", priority: 0 },
        { from: "AGENT_1", to: "AGENT_3", condition: "classification.category === 'B'", priority: 1 },
        { from: "AGENT_1", to: "AGENT_4", condition: "classification.category === 'C'", priority: 2 },
        { from: "AGENT_2", to: "end", condition: "always", priority: 0 },
        { from: "AGENT_3", to: "end", condition: "always", priority: 0 },
        { from: "AGENT_4", to: "end", condition: "always", priority: 0 },
      ],
      sharedContext: [
        { field: "request.content", type: "string", description: "Original request content to classify" },
        { field: "classification.category", type: "string", description: "Classification result from the classifier agent" },
        { field: "classification.confidence", type: "number", description: "Confidence score of the classification" },
        { field: "response.result", type: "json", description: "Specialist agent response" },
      ],
    },
  },
  {
    id: "supervisor-delegate",
    name: "Supervisor–Delegate",
    description:
      "A supervisor agent orchestrates and reviews outputs from multiple delegate agents. The supervisor can request revisions or approve results. Ideal for quality assurance, editorial review, or compliance checking.",
    category: "review",
    tags: ["supervisor", "quality", "review", "compliance"],
    agentCount: 3,
    pattern: "Supervisor",
    definition: {
      version: "1.0.0",
      name: "Supervisor–Delegate",
      description: "Supervisor coordinates delegates and reviews their output",
      agents: [
        { agentId: "AGENT_1", role: "Supervisor", required: true },
        { agentId: "AGENT_2", role: "Delegate Worker A", required: true },
        { agentId: "AGENT_3", role: "Delegate Worker B", required: true },
      ],
      handoffRules: [
        { from: "start", to: "AGENT_1", condition: "always", priority: 0 },
        { from: "AGENT_1", to: "AGENT_2", condition: "task.assignment === 'A'", priority: 0 },
        { from: "AGENT_1", to: "AGENT_3", condition: "task.assignment === 'B'", priority: 1 },
        { from: "AGENT_2", to: "AGENT_1", condition: "task.complete === true", priority: 0 },
        { from: "AGENT_3", to: "AGENT_1", condition: "task.complete === true", priority: 0 },
        { from: "AGENT_1", to: "end", condition: "review.approved === true", priority: 2 },
      ],
      sharedContext: [
        { field: "task.assignment", type: "string", description: "Which delegate should handle the next subtask" },
        { field: "task.complete", type: "boolean", description: "Whether the current delegate has finished" },
        { field: "review.approved", type: "boolean", description: "Whether the supervisor has approved all outputs" },
        { field: "review.feedback", type: "string", description: "Supervisor feedback for revision requests" },
      ],
    },
  },
  {
    id: "parallel-analysis",
    name: "Parallel Analysis",
    description:
      "Multiple agents analyze the same input simultaneously from different perspectives, then a synthesizer combines their findings. Best for risk assessment, multi-factor analysis, or competitive intelligence.",
    category: "analysis",
    tags: ["parallel", "analysis", "synthesis", "risk"],
    agentCount: 4,
    pattern: "Fan-out / Fan-in",
    definition: {
      version: "1.0.0",
      name: "Parallel Analysis",
      description: "Fan-out to parallel analysts, fan-in to synthesizer",
      agents: [
        { agentId: "AGENT_1", role: "Analyst A", required: true },
        { agentId: "AGENT_2", role: "Analyst B", required: true },
        { agentId: "AGENT_3", role: "Analyst C", required: false },
        { agentId: "AGENT_4", role: "Synthesizer", required: true },
      ],
      handoffRules: [
        { from: "start", to: "AGENT_1", condition: "always", priority: 0 },
        { from: "start", to: "AGENT_2", condition: "always", priority: 0 },
        { from: "start", to: "AGENT_3", condition: "always", priority: 0 },
        { from: "AGENT_1", to: "AGENT_4", condition: "analysis.complete === true", priority: 0 },
        { from: "AGENT_2", to: "AGENT_4", condition: "analysis.complete === true", priority: 0 },
        { from: "AGENT_3", to: "AGENT_4", condition: "analysis.complete === true", priority: 0 },
        { from: "AGENT_4", to: "end", condition: "synthesis.complete === true", priority: 0 },
      ],
      sharedContext: [
        { field: "input.data", type: "json", description: "Input data to analyze from multiple perspectives" },
        { field: "analysis.complete", type: "boolean", description: "Whether the analyst has completed their assessment" },
        { field: "findings", type: "json", description: "Accumulated findings from all analysts" },
        { field: "synthesis.result", type: "json", description: "Synthesized result combining all analyses" },
      ],
    },
  },
  {
    id: "human-in-the-loop",
    name: "Human-in-the-Loop Review",
    description:
      "An agent processes input, then a human reviewer approves or rejects the output before the workflow continues. Essential for high-risk decisions, regulated processes, or sensitive content generation.",
    category: "review",
    tags: ["human-review", "approval", "compliance", "regulated"],
    agentCount: 2,
    pattern: "Human-in-the-loop",
    definition: {
      version: "1.0.0",
      name: "Human-in-the-Loop Review",
      description: "Agent produces draft, human reviews, agent finalizes",
      agents: [
        { agentId: "AGENT_1", role: "Draft Generator", required: true },
        { agentId: "AGENT_2", role: "Finalizer", required: true },
      ],
      handoffRules: [
        { from: "start", to: "AGENT_1", condition: "always", priority: 0 },
        { from: "AGENT_1", to: "human_review", condition: "draft.ready === true", priority: 0 },
        { from: "human_review", to: "AGENT_1", condition: "review.decision === 'revise'", priority: 0 },
        { from: "human_review", to: "AGENT_2", condition: "review.decision === 'approve'", priority: 1 },
        { from: "AGENT_2", to: "end", condition: "always", priority: 0 },
      ],
      sharedContext: [
        { field: "input.request", type: "json", description: "Original request details" },
        { field: "draft.content", type: "json", description: "Generated draft awaiting human review" },
        { field: "draft.ready", type: "boolean", description: "Whether the draft is ready for review" },
        { field: "review.decision", type: "string", description: "Human reviewer decision: approve or revise" },
        { field: "review.notes", type: "string", description: "Human reviewer notes and feedback" },
        { field: "output.final", type: "json", description: "Final approved output" },
      ],
    },
  },
  {
    id: "escalation-chain",
    name: "Escalation Chain",
    description:
      "A tiered escalation pipeline where simple requests are handled by the first agent, and only complex or high-risk items escalate to more specialized (or human) reviewers. Perfect for support, compliance, or incident management.",
    category: "automation",
    tags: ["escalation", "tiered", "support", "incident"],
    agentCount: 3,
    pattern: "Escalation",
    definition: {
      version: "1.0.0",
      name: "Escalation Chain",
      description: "Tier 1 handles simple cases; complex cases escalate to Tier 2 and Tier 3",
      agents: [
        { agentId: "AGENT_1", role: "Tier 1 Handler", required: true },
        { agentId: "AGENT_2", role: "Tier 2 Specialist", required: true },
        { agentId: "AGENT_3", role: "Tier 3 Expert", required: false },
      ],
      handoffRules: [
        { from: "start", to: "AGENT_1", condition: "always", priority: 0 },
        { from: "AGENT_1", to: "end", condition: "resolution.resolved === true", priority: 0 },
        { from: "AGENT_1", to: "AGENT_2", condition: "escalation.needed === true", priority: 1 },
        { from: "AGENT_2", to: "end", condition: "resolution.resolved === true", priority: 0 },
        { from: "AGENT_2", to: "AGENT_3", condition: "escalation.needed === true", priority: 1 },
        { from: "AGENT_3", to: "end", condition: "always", priority: 0 },
      ],
      sharedContext: [
        { field: "request.content", type: "string", description: "Original request or incident details" },
        { field: "request.severity", type: "string", description: "Assessed severity: low, medium, high, critical" },
        { field: "escalation.needed", type: "boolean", description: "Whether the current tier needs to escalate" },
        { field: "escalation.reason", type: "string", description: "Reason for escalation to the next tier" },
        { field: "resolution.resolved", type: "boolean", description: "Whether the issue has been resolved at this tier" },
        { field: "resolution.summary", type: "string", description: "Summary of the resolution" },
      ],
    },
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Get all unique categories from templates */
export function getTemplateCategories(): string[] {
  return [...new Set(WORKFLOW_TEMPLATES.map((t) => t.category))];
}

/** Find a template by ID */
export function getTemplateById(id: string): WorkflowTemplate | undefined {
  return WORKFLOW_TEMPLATES.find((t) => t.id === id);
}

/** Search templates by name, description, or tags */
export function searchTemplates(query: string): WorkflowTemplate[] {
  const q = query.toLowerCase();
  return WORKFLOW_TEMPLATES.filter(
    (t) =>
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.tags.some((tag) => tag.toLowerCase().includes(q)) ||
      t.pattern.toLowerCase().includes(q)
  );
}
