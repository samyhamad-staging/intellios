import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { workflows, agentBlueprints } from "@/lib/db/schema";
import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { assertEnterpriseAccess } from "@/lib/auth/enterprise";
import { getRequestId } from "@/lib/request-id";
import { parseBody } from "@/lib/parse-body";
import { z } from "zod";
import { WorkflowSchema, WORKFLOW_STATUSES } from "@/lib/types/workflow";

// ─── Validation ───────────────────────────────────────────────────────────────

const UpdateWorkflowBody = z.object({
  name:        z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  definition:  WorkflowSchema.optional(),
  status:      z.enum(WORKFLOW_STATUSES).optional(),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function fetchWorkflow(id: string) {
  return db.query.workflows.findFirst({ where: eq(workflows.id, id) });
}

async function validateAgentRefs(
  agentIds: string[],
  enterpriseId: string | null | undefined
): Promise<NextResponse | null> {
  if (agentIds.length === 0) return null;

  const unique = [...new Set(agentIds)];

  const enterpriseFilter =
    enterpriseId
      ? or(isNull(agentBlueprints.enterpriseId), eq(agentBlueprints.enterpriseId, enterpriseId))
      : isNull(agentBlueprints.enterpriseId);

  const found = await db
    .selectDistinctOn([agentBlueprints.agentId], { agentId: agentBlueprints.agentId })
    .from(agentBlueprints)
    .where(and(inArray(agentBlueprints.agentId, unique), enterpriseFilter));

  const foundIds = new Set(found.map((r) => r.agentId));
  const missing  = unique.filter((id) => !foundIds.has(id));

  if (missing.length > 0) {
    return apiError(
      ErrorCode.VALIDATION_ERROR,
      `Unknown agent reference(s): ${missing.join(", ")}`,
      { missing }
    );
  }
  return null;
}

// ─── GET /api/workflows/[id] ──────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session: authSession, error } = await requireAuth();
  if (error) return error;

  const requestId = getRequestId(request);
  const { id } = await params;

  try {
    const workflow = await fetchWorkflow(id);
    if (!workflow) {
      return apiError(ErrorCode.NOT_FOUND, "Workflow not found", undefined, requestId);
    }

    const enterpriseError = assertEnterpriseAccess(workflow.enterpriseId, authSession.user);
    if (enterpriseError) return enterpriseError;

    return NextResponse.json({ workflow });
  } catch (err) {
    console.error(`[${requestId}] Failed to fetch workflow:`, err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to fetch workflow", undefined, requestId);
  }
}

// ─── PATCH /api/workflows/[id] ────────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session: authSession, error } = await requireAuth(["architect", "admin"]);
  if (error) return error;

  const { data: body, error: bodyError } = await parseBody(request, UpdateWorkflowBody);
  if (bodyError) return bodyError;

  const requestId = getRequestId(request);
  const { id } = await params;

  try {
    const existing = await fetchWorkflow(id);
    if (!existing) {
      return apiError(ErrorCode.NOT_FOUND, "Workflow not found", undefined, requestId);
    }

    const enterpriseError = assertEnterpriseAccess(existing.enterpriseId, authSession.user);
    if (enterpriseError) return enterpriseError;

    // Validate agent refs if definition is being updated
    if (body.definition) {
      const agentIds = body.definition.agents.map((a) => a.agentId);
      const refError = await validateAgentRefs(agentIds, authSession.user.enterpriseId);
      if (refError) return refError;
    }

    const [updated] = await db
      .update(workflows)
      .set({
        ...(body.name        !== undefined && { name:        body.name        }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.definition  !== undefined && { definition:  body.definition  }),
        ...(body.status      !== undefined && { status:      body.status      }),
        updatedAt: new Date(),
      })
      .where(eq(workflows.id, id))
      .returning();

    return NextResponse.json({ workflow: updated });
  } catch (err) {
    console.error(`[${requestId}] Failed to update workflow:`, err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to update workflow", undefined, requestId);
  }
}

// ─── DELETE /api/workflows/[id] ───────────────────────────────────────────────

/**
 * DELETE /api/workflows/[id]
 * Soft-deletes by setting status to "deprecated". Hard deletes are not supported.
 * Requires admin role.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session: authSession, error } = await requireAuth(["admin"]);
  if (error) return error;

  const requestId = getRequestId(request);
  const { id } = await params;

  try {
    const existing = await fetchWorkflow(id);
    if (!existing) {
      return apiError(ErrorCode.NOT_FOUND, "Workflow not found", undefined, requestId);
    }

    const enterpriseError = assertEnterpriseAccess(existing.enterpriseId, authSession.user);
    if (enterpriseError) return enterpriseError;

    const [deprecated] = await db
      .update(workflows)
      .set({ status: "deprecated", updatedAt: new Date() })
      .where(eq(workflows.id, id))
      .returning();

    return NextResponse.json({ workflow: deprecated });
  } catch (err) {
    console.error(`[${requestId}] Failed to deprecate workflow:`, err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to deprecate workflow", undefined, requestId);
  }
}
