/**
 * Workflow Execution Types — Phase 3
 *
 * Type definitions for the workflow execution engine, including
 * execution state, step tracking, and orchestration events.
 */

// ─── Execution Status ────────────────────────────────────────────────────────

export const EXECUTION_STATUSES = [
  "running",
  "completed",
  "failed",
  "cancelled",
  "paused",       // Human-in-the-loop — awaiting human review decision
] as const;

export type ExecutionStatus = typeof EXECUTION_STATUSES[number];

export const STEP_STATUSES = [
  "running",
  "completed",
  "failed",
  "skipped",
  "awaiting_review", // Human-in-the-loop step
] as const;

export type StepStatus = typeof STEP_STATUSES[number];

// ─── Execution Records ───────────────────────────────────────────────────────

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  workflowRecordId: string;
  status: ExecutionStatus;
  context: Record<string, unknown>;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  error: ExecutionError | null;
  totalTokens: number;
  totalCostUsd: number;
  stepCount: number;
  enterpriseId: string | null;
  triggeredBy: string;
  startedAt: string;
  completedAt: string | null;
}

export interface ExecutionStep {
  id: string;
  executionId: string;
  stepNumber: number;
  agentId: string;
  agentRole: string;
  status: StepStatus;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  error: ExecutionError | null;
  handoffRule: {
    from: string;
    to: string;
    condition: string;
    priority: number;
  } | null;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  durationMs: number | null;
  startedAt: string;
  completedAt: string | null;
}

export interface ExecutionError {
  code: string;
  message: string;
  agentId?: string;
  stepNumber?: number;
  recoverable: boolean;
}

// ─── Execution Events ────────────────────────────────────────────────────────

export type ExecutionEvent =
  | { type: "execution.started"; executionId: string; workflowId: string; triggeredBy: string }
  | { type: "step.started"; executionId: string; stepNumber: number; agentId: string; agentRole: string }
  | { type: "step.completed"; executionId: string; stepNumber: number; agentId: string; output: Record<string, unknown>; durationMs: number; tokens: { input: number; output: number } }
  | { type: "step.failed"; executionId: string; stepNumber: number; agentId: string; error: ExecutionError }
  | { type: "execution.paused"; executionId: string; reason: "human_review"; pendingStepNumber: number }
  | { type: "execution.resumed"; executionId: string; decision: "approve" | "revise"; reviewer: string }
  | { type: "execution.completed"; executionId: string; output: Record<string, unknown>; totalTokens: number; totalCostUsd: number }
  | { type: "execution.failed"; executionId: string; error: ExecutionError }
  | { type: "execution.cancelled"; executionId: string; cancelledBy: string };

// ─── Extended Orchestration Patterns ─────────────────────────────────────────

/** Node types for the extended workflow graph (Phase 3) */
export type WorkflowNodeType =
  | "agent"          // Standard agent invocation
  | "parallel"       // Fan-out: run multiple agents simultaneously
  | "human_review"   // Pause for human decision
  | "condition"      // Evaluate a condition and branch
  | "aggregator";    // Fan-in: wait for multiple parallel agents and combine results

/** Extended handoff rule with failure policy */
export interface ExtendedHandoffRule {
  from: string;
  to: string;
  condition: string;
  priority: number;
  /** What to do if the target agent fails */
  failurePolicy?: {
    action: "fail_execution" | "skip_and_continue" | "retry" | "fallback";
    maxRetries?: number;
    fallbackAgentId?: string;
    /** Timeout in ms before considering the step failed */
    timeoutMs?: number;
  };
}

/** Parallel execution group — all agents run simultaneously */
export interface ParallelGroup {
  id: string;
  agentIds: string[];
  /** How to handle partial failures in the group */
  failureStrategy: "fail_fast" | "wait_all" | "majority";
  /** Maximum concurrent agents (for rate limiting) */
  maxConcurrency?: number;
}

/** Human-in-the-loop review point */
export interface HumanReviewNode {
  id: string;
  /** Roles allowed to make the review decision */
  allowedRoles: string[];
  /** Fields to display to the reviewer */
  displayFields: string[];
  /** Available decisions */
  decisions: {
    value: string;
    label: string;
    /** Which node to route to for this decision */
    routeTo: string;
  }[];
  /** Auto-approve timeout in minutes (null = no timeout) */
  timeoutMinutes: number | null;
  /** Default decision if timeout reached */
  timeoutDecision?: string;
}

// ─── Execution Configuration ─────────────────────────────────────────────────

export interface ExecutionConfig {
  /** Maximum total steps before force-stopping (prevents infinite loops) */
  maxSteps: number;
  /** Maximum total execution time in ms */
  maxDurationMs: number;
  /** Maximum total token budget */
  maxTokenBudget: number;
  /** Whether to record agent reasoning traces for debugging */
  captureReasoningTraces: boolean;
  /** Webhook URL for real-time execution events */
  webhookUrl?: string;
}

export const DEFAULT_EXECUTION_CONFIG: ExecutionConfig = {
  maxSteps: 50,
  maxDurationMs: 10 * 60 * 1000, // 10 minutes
  maxTokenBudget: 100_000,
  captureReasoningTraces: false,
};
