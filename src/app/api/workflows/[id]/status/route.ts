import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { workflows } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { assertEnterpriseAccess } from "@/lib/auth/enterprise";
import { getRequestId } from "@/lib/request-id";
import { parseBody } from "@/lib/parse-body";
import { publishEvent } from "@/lib/events/publish";
import { validateWorkflowForReview } from "@/lib/workflows/validate";
import { z } from "zod";
import type { WorkflowStatus } from "@/lib/types/workflow";

// ─── Validation ───────────────────────────────────────────────────────────────

const StatusBody = z.object({
  status:  z.enum(["draft", "in_review", "approved", "rejected", "deprecated"]),
  comment: z.string().max(2000).optional(),
});

type Status = WorkflowStatus;

// Valid forward transitions
const VALID_TRANSITIONS: Record<Status, Status[]> = {
  draft:      ["in_review", "deprecated"],
  in_review:  ["approved", "rejected", "draft"],  // "draft" = send back for changes
  approved:   ["deprecated"],
  rejected:   ["draft"],                            // allow resubmission
  deprecated: [],
};

// ─── PATCH /api/workflows/[id]/status ────────────────────────────────────────

/**
 * PATCH /api/workflows/[id]/status
 * Transitions the lifecycle status of a workflow.
 *
 * Role gates:
 * - architect / admin → submit (draft → in_review) or reset (in_review → draft)
 * - reviewer / admin  → approve or reject (in_review → approved / rejected)
 * - admin             → deprecate (any → deprecated)
 *
 * Validation gate:
 * - Before in_review: validateWorkflowForReview() checks agent statuses and graph integrity.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session: authSession, error } = await requireAuth([
    "architect", "designer", "reviewer", "compliance_officer", "admin",
  ]);
  if (error) return error;

  const { data: body, error: bodyError } = await parseBody(request, StatusBody);
  if (bodyError) return bodyError;

  const requestId = getRequestId(request);
  const { id } = await params;
  const { status: newStatus, comment } = body;

  try {
    const workflow = await db.query.workflows.findFirst({ where: eq(workflows.id, id) });

    if (!workflow) {
      return apiError(ErrorCode.NOT_FOUND, "Workflow not found", undefined, requestId);
    }

    const enterpriseError = assertEnterpriseAccess(workflow.enterpriseId, authSession.user);
    if (enterpriseError) return enterpriseError;

    const currentStatus = workflow.status as Status;

    if (currentStatus === newStatus) {
      return apiError(ErrorCode.CONFLICT, `Workflow is already ${newStatus}`);
    }

    const allowed = VALID_TRANSITIONS[currentStatus];
    if (!allowed.includes(newStatus)) {
      return apiError(
        ErrorCode.INVALID_STATE,
        `Cannot transition from ${currentStatus} to ${newStatus}. Allowed: ${allowed.join(", ") || "none"}`
      );
    }

    // ── Role gates ──────────────────────────────────────────────────────────
    const role = authSession.user.role!;

    if (newStatus === "in_review" && role !== "architect" && role !== "admin") {
      return apiError(ErrorCode.FORBIDDEN, "Only architects can submit workflows for review");
    }
    if (newStatus === "approved" && role !== "reviewer" && role !== "admin") {
      return apiError(ErrorCode.FORBIDDEN, "Only reviewers can approve workflows");
    }
    if (newStatus === "rejected" && role !== "reviewer" && role !== "admin") {
      return apiError(ErrorCode.FORBIDDEN, "Only reviewers can reject workflows");
    }
    if (newStatus === "deprecated" && role !== "admin") {
      return apiError(ErrorCode.FORBIDDEN, "Only administrators can deprecate workflows");
    }
    // SOD: the workflow creator cannot be the reviewer
    if ((newStatus === "approved" || newStatus === "rejected") && workflow.createdBy === authSession.user.email) {
      return apiError(ErrorCode.FORBIDDEN, "Self-approval is not permitted (SOD requirement)");
    }

    // ── Validation gate ─────────────────────────────────────────────────────
    if (newStatus === "in_review") {
      const validation = await validateWorkflowForReview(id, authSession.user.enterpriseId);
      if (!validation.valid) {
        return apiError(
          ErrorCode.INVALID_STATE,
          `Cannot submit for review: ${validation.errors.length} validation error${validation.errors.length === 1 ? "" : "s"} must be resolved first.`,
          { errors: validation.errors }
        );
      }
    }

    // ── Persist ─────────────────────────────────────────────────────────────
    const [updated] = await db
      .update(workflows)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(workflows.id, id))
      .returning();

    // ── Audit event ─────────────────────────────────────────────────────────
    const userEmail = authSession.user.email!;

    const isReviewDecision = newStatus === "approved" || newStatus === "rejected";
    if (isReviewDecision) {
      await publishEvent({
        event: {
          type: "workflow.reviewed",
          payload: {
            workflowId: id,
            name: workflow.name,
            decision: newStatus === "approved" ? "approve" : "reject",
            reviewer: userEmail,
            comment: comment ?? null,
          },
        },
        actor: { email: userEmail, role },
        entity: { type: "workflow", id },
        enterpriseId: workflow.enterpriseId ?? null,
      });
    } else {
      await publishEvent({
        event: {
          type: "workflow.status_changed",
          payload: {
            workflowId: id,
            name: workflow.name,
            fromStatus: currentStatus,
            toStatus: newStatus,
            changedBy: userEmail,
          },
        },
        actor: { email: userEmail, role },
        entity: { type: "workflow", id },
        enterpriseId: workflow.enterpriseId ?? null,
      });
    }

    return NextResponse.json({ id: updated.id, status: updated.status });
  } catch (err) {
    console.error(`[${requestId}] Failed to update workflow status:`, err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to update workflow status", undefined, requestId);
  }
}
