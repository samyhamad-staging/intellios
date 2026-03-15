import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentBlueprints } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { assertEnterpriseAccess } from "@/lib/auth/enterprise";
import { getRequestId } from "@/lib/request-id";
import { writeAuditLog } from "@/lib/audit/log";
import { parseBody } from "@/lib/parse-body";
import { getEnterpriseSettings } from "@/lib/settings/get-settings";
import { z } from "zod";
import type { ApprovalStepRecord } from "@/lib/settings/types";

type ReviewAction = "approve" | "reject" | "request_changes";

const ACTION_STATUS: Record<ReviewAction, string> = {
  approve: "approved",
  reject: "rejected",
  request_changes: "draft",
};

const ReviewBody = z.object({
  action: z.enum(["approve", "reject", "request_changes"]),
  comment: z.string().max(2000).optional(),
});

/**
 * POST /api/blueprints/[id]/review
 * Submits a review decision for a blueprint that is currently `in_review`.
 *
 * Body: { action: "approve" | "reject" | "request_changes", comment?: string }
 *
 * Phase 22 — multi-step approval:
 * When the enterprise has an approvalChain configured, "approve" advances one step
 * at a time (staying in_review until the last step). The caller's role must match
 * the active step's required role. "reject" is always terminal. "request_changes"
 * returns to draft at any point.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Include compliance_officer and admin — they may be multi-step approvers
  const { session: authSession, error } = await requireAuth(["reviewer", "compliance_officer", "admin"]);
  if (error) return error;
  const requestId = getRequestId(request);

  const { data: body, error: bodyError } = await parseBody(request, ReviewBody);
  if (bodyError) return bodyError;

  try {
    const { id } = await params;
    const { action, comment } = body;

    if (action === "request_changes" && !comment?.trim()) {
      return apiError(ErrorCode.BAD_REQUEST, "A comment is required when requesting changes.");
    }

    const blueprint = await db.query.agentBlueprints.findFirst({
      where: eq(agentBlueprints.id, id),
    });

    if (!blueprint) {
      return apiError(ErrorCode.NOT_FOUND, "Blueprint not found");
    }

    const enterpriseError = assertEnterpriseAccess(blueprint.enterpriseId, authSession.user);
    if (enterpriseError) return enterpriseError;

    if (blueprint.status !== "in_review") {
      return apiError(ErrorCode.INVALID_STATE, `Blueprint is not in review. Current status: ${blueprint.status}`);
    }

    // Extract agent name for notification routing (best-effort)
    const abp = blueprint.abp as Record<string, unknown> | null;
    const agentName =
      (abp?.metadata as Record<string, unknown> | undefined)?.name ??
      (abp?.identity as Record<string, unknown> | undefined)?.name ??
      "Unnamed Agent";

    const userEmail = authSession.user.email!;
    const userRole = authSession.user.role!;

    // ─── Multi-step approval chain enforcement ────────────────────────────────
    // Only applies to "approve" action — reject and request_changes bypass the chain.
    if (action === "approve") {
      const settings = await getEnterpriseSettings(blueprint.enterpriseId);
      const chain = settings.approvalChain ?? [];

      if (chain.length > 0) {
        const stepIndex = blueprint.currentApprovalStep;
        const activeStep = chain[stepIndex];

        if (!activeStep) {
          return apiError(ErrorCode.BAD_REQUEST, "No active approval step configured for this blueprint");
        }

        // Role check: caller must match the step's required role (or be admin)
        if (userRole !== activeStep.role && userRole !== "admin") {
          return apiError(
            ErrorCode.FORBIDDEN,
            `Step ${stepIndex + 1} (${activeStep.label}) requires role: ${activeStep.role}. Your role: ${userRole}`
          );
        }

        // SOD check: no approver may be the blueprint's creator
        if (!settings.governance.allowSelfApproval) {
          const existingApprovers = (blueprint.approvalProgress as ApprovalStepRecord[]).map((s) => s.approvedBy);
          if (blueprint.createdBy === userEmail || existingApprovers.includes(userEmail)) {
            return apiError(ErrorCode.FORBIDDEN, "Self-approval is not permitted (SOD requirement)");
          }
        }

        const stepRecord: ApprovalStepRecord = {
          step: stepIndex,
          role: activeStep.role,
          label: activeStep.label,
          approvedBy: userEmail,
          approvedAt: new Date().toISOString(),
          decision: "approved",
          comment: comment?.trim() || null,
        };

        const newProgress = [
          ...(blueprint.approvalProgress as ApprovalStepRecord[]),
          stepRecord,
        ];

        const isLastStep = stepIndex >= chain.length - 1;
        const reviewedAt = new Date();

        if (isLastStep) {
          // Final step — transition to fully approved
          const [updated] = await db
            .update(agentBlueprints)
            .set({
              status: "approved",
              currentApprovalStep: stepIndex,
              approvalProgress: newProgress,
              reviewComment: comment?.trim() || null,
              reviewedAt,
              reviewedBy: userEmail,
              updatedAt: reviewedAt,
            })
            .where(eq(agentBlueprints.id, id))
            .returning({ id: agentBlueprints.id, status: agentBlueprints.status, reviewComment: agentBlueprints.reviewComment, reviewedAt: agentBlueprints.reviewedAt });

          await writeAuditLog({
            entityType: "blueprint",
            entityId: id,
            action: "blueprint.reviewed",
            actorEmail: userEmail,
            actorRole: userRole,
            enterpriseId: blueprint.enterpriseId ?? null,
            fromState: { status: "in_review", step: stepIndex },
            toState: { status: "approved" },
            metadata: {
              agentId: id,
              agentName,
              createdBy: blueprint.createdBy ?? null,
              reviewAction: "approve",
              comment: comment?.trim() || null,
              step: stepIndex,
              label: activeStep.label,
              finalStep: true,
            },
          });

          return NextResponse.json(updated);
        } else {
          // Non-final step — advance and stay in in_review
          const nextStep = chain[stepIndex + 1];
          await db
            .update(agentBlueprints)
            .set({
              status: "in_review",
              currentApprovalStep: stepIndex + 1,
              approvalProgress: newProgress,
              updatedAt: new Date(),
            })
            .where(eq(agentBlueprints.id, id));

          await writeAuditLog({
            entityType: "blueprint",
            entityId: id,
            action: "blueprint.approval_step_completed",
            actorEmail: userEmail,
            actorRole: userRole,
            enterpriseId: blueprint.enterpriseId ?? null,
            fromState: { status: "in_review", step: stepIndex },
            toState: { status: "in_review", step: stepIndex + 1, nextApproverRole: nextStep.role, nextApproverLabel: nextStep.label },
            metadata: {
              agentId: id,
              agentName,
              createdBy: blueprint.createdBy ?? null,
              comment: comment?.trim() || null,
              completedStep: stepIndex,
              label: activeStep.label,
            },
          });

          return NextResponse.json({
            id,
            status: "in_review",
            nextStep: stepIndex + 1,
            nextApproverRole: nextStep.role,
            nextApproverLabel: nextStep.label,
          });
        }
      }
      // chain.length === 0 → fall through to legacy single-step handling below
    }

    // ─── Legacy single-step handling (and reject / request_changes) ───────────

    const newStatus = ACTION_STATUS[action];
    const reviewedAt = new Date();

    const updateFields: Record<string, unknown> = {
      status: newStatus,
      reviewComment: comment?.trim() || null,
      reviewedAt,
      reviewedBy: userEmail,
      updatedAt: reviewedAt,
    };

    // For step-advance or rejection in multi-step mode, append step record to approvalProgress
    if (action === "reject") {
      const settings = await getEnterpriseSettings(blueprint.enterpriseId);
      const chain = settings.approvalChain ?? [];
      if (chain.length > 0) {
        const stepIndex = blueprint.currentApprovalStep;
        const activeStep = chain[stepIndex];

        // Role check for rejection too
        if (userRole !== activeStep?.role && userRole !== "admin") {
          return apiError(
            ErrorCode.FORBIDDEN,
            `Step ${stepIndex + 1} requires role: ${activeStep?.role ?? "reviewer"}`
          );
        }

        const stepRecord: ApprovalStepRecord = {
          step: stepIndex,
          role: activeStep?.role ?? userRole,
          label: activeStep?.label ?? "Review",
          approvedBy: userEmail,
          approvedAt: new Date().toISOString(),
          decision: "rejected",
          comment: comment?.trim() || null,
        };
        updateFields.approvalProgress = [
          ...(blueprint.approvalProgress as ApprovalStepRecord[]),
          stepRecord,
        ];
      }
    }

    const [updated] = await db
      .update(agentBlueprints)
      .set(updateFields)
      .where(eq(agentBlueprints.id, id))
      .returning({
        id: agentBlueprints.id,
        status: agentBlueprints.status,
        reviewComment: agentBlueprints.reviewComment,
        reviewedAt: agentBlueprints.reviewedAt,
      });

    await writeAuditLog({
      entityType: "blueprint",
      entityId: id,
      action: "blueprint.reviewed",
      actorEmail: userEmail,
      actorRole: userRole,
      enterpriseId: blueprint.enterpriseId ?? null,
      fromState: { status: "in_review" },
      toState: { status: newStatus },
      metadata: {
        agentId: id,
        agentName,
        createdBy: blueprint.createdBy ?? null,
        reviewAction: action,
        comment: comment?.trim() || null,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(`[${requestId}] Failed to submit review:`, error);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to submit review", undefined, requestId);
  }
}
