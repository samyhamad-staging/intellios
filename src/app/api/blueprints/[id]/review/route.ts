import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentBlueprints, auditLog } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ALL_BLUEPRINT_COLUMNS } from "@/lib/db/safe-columns";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { assertEnterpriseAccess } from "@/lib/auth/enterprise";
import { getRequestId } from "@/lib/request-id";
import { publishEvent } from "@/lib/events/publish";
import { parseBody } from "@/lib/parse-body";
import { getEnterpriseSettings } from "@/lib/settings/get-settings";
import { logger, serializeError } from "@/lib/logger";
import { z } from "zod";
import type { ApprovalStepRecord } from "@/lib/settings/types";
import type { ValidationReport, Violation } from "@/lib/governance/types";

type ReviewAction = "approve" | "reject" | "request_changes";

const ACTION_STATUS: Record<ReviewAction, string> = {
  approve: "approved",
  reject: "rejected",
  request_changes: "draft",
};

const ReviewBody = z
  .object({
    action: z.enum(["approve", "reject", "request_changes"]),
    comment: z.string().max(2000).optional(),
    // ADR-019 — admins may approve a blueprint that has unresolved error-severity
    // governance violations, but only with an explicit override flag + reason.
    // The override produces a separate high-severity audit event.
    governanceOverride: z.boolean().optional(),
    overrideReason: z.string().min(20).max(2000).optional(),
  })
  .refine(
    (d) => !d.governanceOverride || (d.overrideReason && d.overrideReason.trim().length >= 20),
    { message: "governanceOverride requires overrideReason (≥20 chars)", path: ["overrideReason"] }
  );

/**
 * Extract blocking (error-severity) violations from a stored validation report.
 * Returns an empty array when the report is missing, already valid, or has only
 * warning-severity violations.
 */
function errorSeverityViolations(report: ValidationReport | null): Violation[] {
  if (!report || report.valid) return [];
  return report.violations.filter((v) => v.severity === "error");
}

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

    const [blueprint] = await db
      .select(ALL_BLUEPRINT_COLUMNS)
      .from(agentBlueprints)
      .where(eq(agentBlueprints.id, id))
      .limit(1);

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

    // ─── Governance enforcement (ADR-019) ─────────────────────────────────────
    // An approval cannot succeed while the blueprint's stored validation report
    // still contains error-severity violations. Admins may override with an
    // explicit flag + justification — this produces a separate audit entry
    // (blueprint.approved.override) in addition to the normal review audit.
    let governanceOverrideActive = false;
    if (action === "approve") {
      const blockers = errorSeverityViolations(blueprint.validationReport as ValidationReport | null);
      if (blockers.length > 0) {
        const overrideRequested = body.governanceOverride === true;
        if (!overrideRequested || userRole !== "admin") {
          return apiError(
            ErrorCode.GOVERNANCE_BLOCKED,
            "Blueprint has unresolved error-severity governance violations. Resolve them or request changes before approving.",
            {
              violations: blockers.map((v) => ({
                policyId: v.policyId,
                policyName: v.policyName,
                ruleId: v.ruleId,
                field: v.field,
                severity: v.severity,
                message: v.message,
                suggestion: v.suggestion,
              })),
              overrideAvailable: userRole === "admin",
            }
          );
        }
        governanceOverrideActive = true;
        logger.warn("blueprint.approval.override", {
          requestId,
          blueprintId: id,
          actorEmail: userEmail,
          blockerCount: blockers.length,
          reason: body.overrideReason,
        });
      }
    }

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
          // Final step — transition to fully approved. Update + audit (+ optional
          // override audit) share a transaction (ADR-021). If the audit insert
          // fails, the status flip rolls back so we never end up with an
          // "approved" blueprint that has no corresponding review audit entry.
          const updated = await db.transaction(async (tx) => {
            const [row] = await tx
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

            await tx.insert(auditLog).values({
              actorEmail: userEmail,
              actorRole: userRole,
              action: "blueprint.reviewed",
              entityType: "blueprint",
              entityId: id,
              enterpriseId: blueprint.enterpriseId ?? null,
              metadata: {
                decision: "approve",
                notes: comment?.trim() || null,
                step: stepIndex,
                finalStep: true,
                ...(governanceOverrideActive ? { governanceOverride: true } : {}),
              },
            });

            if (governanceOverrideActive) {
              await tx.insert(auditLog).values({
                actorEmail: userEmail,
                actorRole: userRole,
                action: "blueprint.approved.override",
                entityType: "blueprint",
                entityId: id,
                enterpriseId: blueprint.enterpriseId ?? null,
                metadata: {
                  reason: body.overrideReason,
                  step: stepIndex,
                  blockers: errorSeverityViolations(blueprint.validationReport as ValidationReport | null)
                    .map((v) => ({ policyId: v.policyId, ruleId: v.ruleId, field: v.field, message: v.message })),
                },
              });
            }

            return row;
          });

          // Event dispatch runs post-commit — downstream handler failures must
          // not roll back the primary approval.
          try {
            await publishEvent({
              event: {
                type: "blueprint.reviewed",
                payload: {
                  blueprintId: id,
                  decision: "approve",
                  reviewer: userEmail,
                  comment: comment?.trim() || null,
                  agentId: id,
                  agentName: String(agentName),
                  createdBy: blueprint.createdBy ?? "",
                },
              },
              actor: { email: userEmail, role: userRole },
              entity: { type: "blueprint", id },
              enterpriseId: blueprint.enterpriseId ?? null,
            });
          } catch (eventErr) {
            logger.error("event.dispatch.failed", { requestId, type: "blueprint.reviewed", blueprintId: id, err: serializeError(eventErr) });
          }

          return NextResponse.json(updated);
        } else {
          // Non-final step — advance and stay in in_review. Update + audit share
          // a transaction (ADR-021) so the step counter never advances without
          // a matching audit record.
          const nextStep = chain[stepIndex + 1];
          await db.transaction(async (tx) => {
            await tx
              .update(agentBlueprints)
              .set({
                status: "in_review",
                currentApprovalStep: stepIndex + 1,
                approvalProgress: newProgress,
                updatedAt: new Date(),
              })
              .where(eq(agentBlueprints.id, id));

            await tx.insert(auditLog).values({
              actorEmail: userEmail,
              actorRole: userRole,
              action: "blueprint.approval_step_completed",
              entityType: "blueprint",
              entityId: id,
              enterpriseId: blueprint.enterpriseId ?? null,
              metadata: {
                step: stepIndex,
                label: activeStep.label,
                nextStep: stepIndex + 1,
                nextRole: nextStep.role,
                notes: comment?.trim() || null,
              },
            });
          });

          try {
            await publishEvent({
              event: {
                type: "blueprint.approval_step_completed",
                payload: {
                  blueprintId: id,
                  agentId: id,
                  agentName: String(agentName),
                  step: stepIndex,
                  label: activeStep.label,
                  nextApproverRole: nextStep.role,
                  nextApproverLabel: nextStep.label,
                },
              },
              actor: { email: userEmail, role: userRole },
              entity: { type: "blueprint", id },
              enterpriseId: blueprint.enterpriseId ?? null,
            });
          } catch (eventErr) {
            logger.error("event.dispatch.failed", { requestId, type: "blueprint.approval_step_completed", blueprintId: id, err: serializeError(eventErr) });
          }

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

    // Update + audit (+ optional override audit) share a transaction (ADR-021)
    // so a successful status change is never split from its audit trail.
    const updated = await db.transaction(async (tx) => {
      const [row] = await tx
        .update(agentBlueprints)
        .set(updateFields)
        .where(eq(agentBlueprints.id, id))
        .returning({
          id: agentBlueprints.id,
          status: agentBlueprints.status,
          reviewComment: agentBlueprints.reviewComment,
          reviewedAt: agentBlueprints.reviewedAt,
        });

      await tx.insert(auditLog).values({
        actorEmail: userEmail,
        actorRole: userRole,
        action: "blueprint.reviewed",
        entityType: "blueprint",
        entityId: id,
        enterpriseId: blueprint.enterpriseId ?? null,
        metadata: {
          decision: action,
          notes: comment?.trim() || null,
          ...(governanceOverrideActive ? { governanceOverride: true } : {}),
        },
      });

      if (governanceOverrideActive) {
        await tx.insert(auditLog).values({
          actorEmail: userEmail,
          actorRole: userRole,
          action: "blueprint.approved.override",
          entityType: "blueprint",
          entityId: id,
          enterpriseId: blueprint.enterpriseId ?? null,
          metadata: {
            reason: body.overrideReason,
            blockers: errorSeverityViolations(blueprint.validationReport as ValidationReport | null)
              .map((v) => ({ policyId: v.policyId, ruleId: v.ruleId, field: v.field, message: v.message })),
          },
        });
      }

      return row;
    });

    // Event dispatch runs post-commit. Downstream failures don't roll back the
    // primary review — the audit trail is already durable.
    try {
      await publishEvent({
        event: {
          type: "blueprint.reviewed",
          payload: {
            blueprintId: id,
            decision: action,
            reviewer: userEmail,
            comment: comment?.trim() || null,
            agentId: id,
            agentName: String(agentName),
            createdBy: blueprint.createdBy ?? "",
          },
        },
        actor: { email: userEmail, role: userRole },
        entity: { type: "blueprint", id },
        enterpriseId: blueprint.enterpriseId ?? null,
      });
    } catch (eventErr) {
      logger.error("event.dispatch.failed", { requestId, type: "blueprint.reviewed", blueprintId: id, err: serializeError(eventErr) });
    }

    return NextResponse.json(updated);
  } catch (error) {
    logger.error("blueprint.review.failed", { requestId, err: serializeError(error) });
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to submit review", undefined, requestId);
  }
}
