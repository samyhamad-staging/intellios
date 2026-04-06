/**
 * Workflow Execution API — Phase 3
 *
 * POST /api/workflows/[id]/execute — Start a new workflow execution.
 * GET  /api/workflows/[id]/execute — List executions for a workflow.
 *
 * The execution engine runs agents sequentially following the handoff rules,
 * maintaining shared context across steps. Supports human-in-the-loop pausing
 * and parallel agent groups (Phase 3 extensions).
 *
 * Note: This is the API surface. The actual execution orchestrator runs
 * asynchronously — the POST endpoint starts the execution and returns
 * immediately with the execution ID. Clients poll or subscribe via webhook.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { workflows, workflowExecutions, workflowExecutionSteps, auditLog } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { assertEnterpriseAccess } from "@/lib/auth/enterprise";
import { getRequestId } from "@/lib/request-id";
import { parseBody } from "@/lib/parse-body";
import { z } from "zod";
import type { WorkflowDefinition } from "@/lib/types/workflow";
import type { ExecutionConfig } from "@/lib/workflows/execution-types";
import { DEFAULT_EXECUTION_CONFIG } from "@/lib/workflows/execution-types";

// ─── Validation ───────────────────────────────────────────────────────────────

const ExecuteBody = z.object({
  /** Initial input data for the orchestration */
  input: z.record(z.string(), z.unknown()).optional().default({}),
  /** Optional execution configuration overrides */
  config: z.object({
    maxSteps: z.number().int().min(1).max(200).optional(),
    maxDurationMs: z.number().int().min(1000).max(3600000).optional(),
    maxTokenBudget: z.number().int().min(1000).max(1000000).optional(),
    captureReasoningTraces: z.boolean().optional(),
    webhookUrl: z.string().url().optional(),
  }).optional(),
});

// ─── POST /api/workflows/[id]/execute ─────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session: authSession, error } = await requireAuth(["architect", "admin"]);
  if (error) return error;
  const requestId = getRequestId(request);

  const { data: body, error: bodyError } = await parseBody(request, ExecuteBody);
  if (bodyError) return bodyError;

  try {
    const { id } = await params;

    // Load the workflow
    const workflow = await db.query.workflows.findFirst({
      where: eq(workflows.id, id),
    });

    if (!workflow) {
      return apiError(ErrorCode.NOT_FOUND, "Workflow not found");
    }

    const enterpriseError = assertEnterpriseAccess(workflow.enterpriseId, authSession.user);
    if (enterpriseError) return enterpriseError;

    // Status gate: only execute approved workflows
    if (workflow.status !== "approved") {
      return apiError(
        ErrorCode.BAD_REQUEST,
        "Only approved workflows can be executed. Current status: " + workflow.status
      );
    }

    const definition = workflow.definition as WorkflowDefinition;

    // Validate definition has agents and handoff rules
    if (!definition.agents || definition.agents.length === 0) {
      return apiError(ErrorCode.BAD_REQUEST, "Workflow has no agents defined");
    }
    if (!definition.handoffRules || definition.handoffRules.length === 0) {
      return apiError(ErrorCode.BAD_REQUEST, "Workflow has no handoff rules defined");
    }

    // Merge config with defaults
    const config: ExecutionConfig = {
      ...DEFAULT_EXECUTION_CONFIG,
      ...body.config,
    };

    // Create the execution record
    const [execution] = await db
      .insert(workflowExecutions)
      .values({
        workflowId: workflow.workflowId,
        workflowRecordId: workflow.id,
        status: "running",
        context: {},
        input: body.input,
        enterpriseId: workflow.enterpriseId,
        triggeredBy: authSession.user.email!,
      })
      .returning();

    // Audit log
    try {
      await db.insert(auditLog).values({
        actorEmail: authSession.user.email!,
        actorRole: authSession.user.role!,
        action: "workflow.executed",
        entityType: "workflow",
        entityId: workflow.id,
        enterpriseId: workflow.enterpriseId ?? null,
        metadata: { executionId: execution.id },
      });
    } catch (auditErr) {
      console.error(`[${requestId}] Failed to write audit log:`, auditErr);
    }

    // TODO: Phase 3 — Spawn the async execution orchestrator.
    // For now, we create the execution record and return immediately.
    // The orchestrator would:
    //   1. Start from the "start" sentinel node
    //   2. Evaluate handoff rules to find the first agent
    //   3. Invoke the agent with shared context
    //   4. Record the step in workflow_execution_steps
    //   5. Update shared context with agent output
    //   6. Repeat until "end" sentinel or max steps reached
    //   7. Handle human_review nodes by pausing the execution
    //   8. Handle parallel groups by invoking agents concurrently

    return NextResponse.json({
      execution: {
        id: execution.id,
        workflowId: execution.workflowId,
        status: execution.status,
        input: execution.input,
        triggeredBy: execution.triggeredBy,
        startedAt: execution.startedAt,
        config,
      },
      message: "Workflow execution started. Poll GET /api/workflows/[id]/execute/[executionId] for status.",
    }, { status: 202 });

  } catch (err) {
    console.error(`[${requestId}] Failed to start workflow execution:`, err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to start workflow execution", undefined, requestId);
  }
}

// ─── GET /api/workflows/[id]/execute ──────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session: authSession, error } = await requireAuth();
  if (error) return error;
  const requestId = getRequestId(request);

  try {
    const { id } = await params;

    // Load the workflow to verify access
    const workflow = await db.query.workflows.findFirst({
      where: eq(workflows.id, id),
    });

    if (!workflow) {
      return apiError(ErrorCode.NOT_FOUND, "Workflow not found");
    }

    const enterpriseError = assertEnterpriseAccess(workflow.enterpriseId, authSession.user);
    if (enterpriseError) return enterpriseError;

    // List executions for this workflow
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 100);
    const status = searchParams.get("status") ?? "";

    const filters = [eq(workflowExecutions.workflowId, workflow.workflowId)];
    if (status) {
      filters.push(eq(workflowExecutions.status, status));
    }

    const executions = await db
      .select()
      .from(workflowExecutions)
      .where(and(...filters))
      .orderBy(desc(workflowExecutions.startedAt))
      .limit(limit);

    return NextResponse.json({
      executions,
      total: executions.length,
    });
  } catch (err) {
    console.error(`[${requestId}] Failed to list workflow executions:`, err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to list executions", undefined, requestId);
  }
}
