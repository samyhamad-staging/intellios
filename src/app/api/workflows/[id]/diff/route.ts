import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { workflows } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { assertEnterpriseAccess } from "@/lib/auth/enterprise";
import { getRequestId } from "@/lib/request-id";
import { diffWorkflows } from "@/lib/workflows/diff";
import type { WorkflowDefinition } from "@/lib/types/workflow";

/**
 * GET /api/workflows/[id]/diff?compareId=<uuid>
 * Returns a structured diff between two workflow records.
 *
 * [id]       = the "after" workflow (the newer one)
 * compareId  = the "before" workflow (the older one)
 *
 * Both must belong to the same enterprise (or be accessible to the caller).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session: authSession, error } = await requireAuth();
  if (error) return error;

  const requestId = getRequestId(request);
  const { id } = await params;
  const compareId = new URL(request.url).searchParams.get("compareId");

  if (!compareId) {
    return apiError(ErrorCode.BAD_REQUEST, "compareId query parameter is required", undefined, requestId);
  }

  try {
    const [afterWf, beforeWf] = await Promise.all([
      db.query.workflows.findFirst({ where: eq(workflows.id, id) }),
      db.query.workflows.findFirst({ where: eq(workflows.id, compareId) }),
    ]);

    if (!afterWf) {
      return apiError(ErrorCode.NOT_FOUND, "Workflow not found", undefined, requestId);
    }
    if (!beforeWf) {
      return apiError(ErrorCode.NOT_FOUND, `Comparison workflow (compareId: ${compareId}) not found`, undefined, requestId);
    }

    const afterErr  = assertEnterpriseAccess(afterWf.enterpriseId,  authSession.user);
    const beforeErr = assertEnterpriseAccess(beforeWf.enterpriseId, authSession.user);
    if (afterErr)  return afterErr;
    if (beforeErr) return beforeErr;

    const afterDef  = afterWf.definition  as WorkflowDefinition;
    const beforeDef = beforeWf.definition as WorkflowDefinition;

    const diff = diffWorkflows(
      {
        agents:        beforeDef.agents        ?? [],
        handoffRules:  beforeDef.handoffRules  ?? [],
        sharedContext: beforeDef.sharedContext ?? [],
      },
      {
        agents:        afterDef.agents        ?? [],
        handoffRules:  afterDef.handoffRules  ?? [],
        sharedContext: afterDef.sharedContext ?? [],
      }
    );

    return NextResponse.json({
      after:  { id: afterWf.id,  version: afterWf.version,  status: afterWf.status,  updatedAt: afterWf.updatedAt  },
      before: { id: beforeWf.id, version: beforeWf.version, status: beforeWf.status, updatedAt: beforeWf.updatedAt },
      diff,
    });
  } catch (err) {
    console.error(`[${requestId}] Failed to diff workflows:`, err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to compute workflow diff", undefined, requestId);
  }
}
