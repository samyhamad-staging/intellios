/**
 * Workflow Code Export — Phase 2.
 * GET /api/workflows/[id]/export/code
 *
 * Downloads a ready-to-run TypeScript orchestration file generated
 * from a workflow's definition. Only available for approved workflows.
 */

import { NextRequest } from "next/server";
import { apiError, ErrorCode } from "@/lib/errors";
import { db } from "@/lib/db";
import { workflows } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require";
import { assertEnterpriseAccess } from "@/lib/auth/enterprise";
import { getRequestId } from "@/lib/request-id";
import { generateWorkflowCode } from "@/lib/export/workflow-code-generator";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session: authSession, error } = await requireAuth([
    "architect",
    "reviewer",
    "compliance_officer",
    "admin",
  ]);
  if (error) return error;
  const requestId = getRequestId(request);

  try {
    const { id } = await params;

    const workflow = await db.query.workflows.findFirst({
      where: eq(workflows.id, id),
    });

    if (!workflow) {
      return apiError(ErrorCode.NOT_FOUND, "Workflow not found");
    }

    const enterpriseError = assertEnterpriseAccess(workflow.enterpriseId, authSession.user);
    if (enterpriseError) return enterpriseError;

    // Status gate: only export approved workflows
    if (workflow.status !== "approved") {
      return apiError(
        ErrorCode.BAD_REQUEST,
        "Code export is only available for approved workflows"
      );
    }

    const definition = workflow.definition as import("@/lib/types/workflow").WorkflowDefinition;

    const code = generateWorkflowCode(definition, {
      workflowId: workflow.workflowId,
      workflowName: workflow.name,
      version: workflow.version,
      exportedAt: new Date().toISOString(),
    });

    const safeName = workflow.name
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .toLowerCase();

    return new Response(code, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeName}-orchestration.ts"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error(`[${requestId}] Workflow code export error:`, err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to generate orchestration code", undefined, requestId);
  }
}
