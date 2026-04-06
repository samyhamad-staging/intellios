import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentBlueprints, blueprintTestRuns, auditLog } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { assertEnterpriseAccess } from "@/lib/auth/enterprise";
import { getRequestId } from "@/lib/request-id";
import { publishEvent } from "@/lib/events/publish";
import { parseBody } from "@/lib/parse-body";
import { validateBlueprint } from "@/lib/governance/validator";
import { ABP } from "@/lib/types/abp";
import { checkDeploymentHealth } from "@/lib/monitoring/health";
import { getEnterpriseSettings } from "@/lib/settings/get-settings";
import { z } from "zod";
import type { ApprovalStepRecord } from "@/lib/settings/types";

type Status = "draft" | "in_review" | "approved" | "rejected" | "deprecated" | "deployed" | "suspended";

const StatusBody = z.object({
  status: z.enum(["draft", "in_review", "approved", "rejected", "deprecated", "deployed", "suspended"]),
  // changeRef is required at the API boundary for "deployed" transitions (enforced below).
  // Accepting it as optional here so Zod parses the field; the business rule is applied
  // explicitly after auth + transition checks so the error message is domain-specific.
  changeRef: z.string().max(100).optional(),
  deploymentNotes: z.string().max(1000).optional(),
  // comment is included in approval/rejection step records and as reviewComment
  comment: z.string().max(2000).optional(),
});

// Valid forward transitions. Any status → deprecated is always allowed.
const VALID_TRANSITIONS: Record<Status, Status[]> = {
  draft:      ["in_review", "deprecated"],
  in_review:  ["approved", "rejected", "deprecated"],
  approved:   ["deployed", "deprecated"],
  deployed:   ["deprecated"],
  rejected:   ["deprecated"],
  deprecated: [],
  // H2-1.4: suspended agents can be resumed (back to in_review) or deprecated.
  // The "resume" transition restarts the approval workflow. Requires admin.
  suspended:  ["in_review", "deprecated"],
};

/**
 * PATCH /api/blueprints/[id]/status
 * Transitions the lifecycle status of a blueprint version.
 *
 * Body: { status: "in_review" | "approved" | "rejected" | "deprecated", comment?, changeRef?, deploymentNotes? }
 *
 * When an enterprise has approvalChain configured (Phase 22):
 * - "approved" transitions advance one step at a time, remaining in_review until the last step.
 * - Each step validates the caller's role against the chain definition.
 * - Rejection is always terminal regardless of step.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Include compliance_officer — they may be part of a multi-step approval chain
  const { session: authSession, error } = await requireAuth(["architect", "designer", "reviewer", "compliance_officer", "admin"]);
  if (error) return error;
  const requestId = getRequestId(request);

  const { data: body, error: bodyError } = await parseBody(request, StatusBody);
  if (bodyError) return bodyError;

  try {
    const { id } = await params;
    const { status: newStatus, changeRef, deploymentNotes, comment } = body;

    const blueprint = await db.query.agentBlueprints.findFirst({
      where: eq(agentBlueprints.id, id),
    });

    if (!blueprint) {
      return apiError(ErrorCode.NOT_FOUND, "Blueprint not found");
    }

    const enterpriseError = assertEnterpriseAccess(blueprint.enterpriseId, authSession.user);
    if (enterpriseError) return enterpriseError;

    const currentStatus = blueprint.status as Status;

    if (currentStatus === newStatus) {
      return apiError(ErrorCode.CONFLICT, `Blueprint is already ${newStatus}`);
    }

    const allowed = VALID_TRANSITIONS[currentStatus];
    // Role-based transition enforcement (SOD: designers submit, reviewers decide, reviewers/admins deploy)
    if (newStatus === "in_review" && authSession.user.role !== "architect" && authSession.user.role !== "admin") {
      return apiError(ErrorCode.FORBIDDEN, "Only designers can submit blueprints for review");
    }
    if (newStatus === "deprecated" && authSession.user.role !== "reviewer" && authSession.user.role !== "admin") {
      return apiError(ErrorCode.FORBIDDEN, "Only reviewers and administrators can deprecate blueprints");
    }
    // SOD: the designer who created the blueprint must not also control its production promotion.
    if (newStatus === "deployed" && authSession.user.role !== "reviewer" && authSession.user.role !== "admin") {
      return apiError(ErrorCode.FORBIDDEN, "Only reviewers and administrators can deploy blueprints to production");
    }

    // H2-1.4: Only admins can resume a suspended agent (back to in_review).
    if (currentStatus === "suspended" && authSession.user.role !== "admin") {
      return apiError(ErrorCode.FORBIDDEN, "Only administrators can resume a suspended agent");
    }

    if (!allowed.includes(newStatus)) {
      return apiError(
        ErrorCode.INVALID_STATE,
        `Cannot transition from ${currentStatus} to ${newStatus}. Allowed: ${allowed.join(", ") || "none"}`
      );
    }

    // Require a change reference for all production deployments — enforced at the API
    // boundary so no UI path (LifecycleControls, direct API call, etc.) can bypass it.
    if (newStatus === "deployed" && !changeRef?.trim()) {
      return apiError(
        ErrorCode.BAD_REQUEST,
        "A change reference number is required to deploy to production. " +
          "Obtain a change ticket from your change management system and provide it in the changeRef field."
      );
    }

    // Governance integrity gate: always re-run validation at submission time (ADR-003, ADR-005).
    // This prevents stale validation reports (e.g. policies added/changed after last manual validate)
    // from allowing non-compliant blueprints through the review gate.
    if (newStatus === "in_review") {
      // W3-03: pass agentId so scoped policies are filtered correctly at submission time
      const freshReport = await validateBlueprint(
        blueprint.abp as ABP,
        blueprint.enterpriseId ?? null,
        undefined,
        blueprint.agentId
      );

      // Persist the fresh report so Blueprint Workbench and MRM report see the current state
      await db
        .update(agentBlueprints)
        .set({
          validationReport: freshReport,
          // Reset approval workflow state on new submission
          currentApprovalStep: 0,
          approvalProgress: [],
          updatedAt: new Date(),
        })
        .where(eq(agentBlueprints.id, id));

      const errorViolations = freshReport.violations.filter((v) => v.severity === "error");
      if (errorViolations.length > 0) {
        return apiError(
          ErrorCode.INVALID_STATE,
          `Cannot submit for review: ${errorViolations.length} error-severity governance violation${errorViolations.length === 1 ? "" : "s"} must be resolved first. Re-validate after refining the blueprint.`,
          { violations: errorViolations, report: freshReport }
        );
      }

      // Phase 23: behavioral test gate — check requireTestsBeforeApproval setting.
      // Fall back to the authenticated user's enterprise when the blueprint has no
      // enterpriseId (e.g. blueprints created before multi-tenancy was enforced).
      const settingsEnterpriseId =
        blueprint.enterpriseId ?? authSession.user.enterpriseId ?? null;
      const submissionSettings = await getEnterpriseSettings(settingsEnterpriseId);
      if (submissionSettings.governance.requireTestsBeforeApproval) {
        const latestPassingRun = await db.query.blueprintTestRuns.findFirst({
          where: and(
            eq(blueprintTestRuns.blueprintId, id),
            eq(blueprintTestRuns.status, "passed")
          ),
          orderBy: [desc(blueprintTestRuns.startedAt)],
        });
        if (!latestPassingRun) {
          return apiError(
            ErrorCode.VALIDATION_ERROR,
            "Enterprise policy requires at least one passing test run before a blueprint can be submitted for review. " +
              "Add test cases and run them from the Registry detail page."
          );
        }
      }
    }

    // ─── Multi-Step Approval Logic ────────────────────────────────────────────
    // Applies when transitioning to "approved" or "rejected" and a chain is configured.
    // "deprecated" is always allowed to any authorized admin/reviewer.

    const userEmail = authSession.user.email!;
    const userRole = authSession.user.role!;

    if (newStatus === "approved" || newStatus === "rejected") {
      const settings = await getEnterpriseSettings(blueprint.enterpriseId);
      const chain = settings.approvalChain ?? [];

      if (chain.length > 0) {
        // MULTI-STEP MODE
        const stepIndex = blueprint.currentApprovalStep;
        const activeStep = chain[stepIndex];

        if (!activeStep) {
          return apiError(ErrorCode.BAD_REQUEST, "No active approval step configured for this blueprint");
        }

        // Validate the caller's role matches the active step's required role
        if (userRole !== activeStep.role && userRole !== "admin") {
          return apiError(
            ErrorCode.FORBIDDEN,
            `Step ${stepIndex + 1} (${activeStep.label}) requires role: ${activeStep.role}`
          );
        }

        // SOD check: no approver in the chain may be the blueprint's creator
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
          decision: newStatus === "approved" ? "approved" : "rejected",
          comment: comment ?? null,
        };

        const newProgress = [
          ...(blueprint.approvalProgress as ApprovalStepRecord[]),
          stepRecord,
        ];

        if (newStatus === "rejected") {
          // Rejection is always terminal
          await db
            .update(agentBlueprints)
            .set({
              status: "rejected",
              approvalProgress: newProgress,
              reviewedBy: userEmail,
              reviewedAt: new Date(),
              reviewComment: comment ?? null,
              updatedAt: new Date(),
            })
            .where(eq(agentBlueprints.id, id));

          await publishEvent({
            event: {
              type: "blueprint.reviewed",
              payload: {
                blueprintId: id,
                decision: "reject",
                reviewer: userEmail,
                comment: comment ?? null,
                agentId: blueprint.agentId,
                agentName: blueprint.name ?? "",
                createdBy: blueprint.createdBy ?? "",
              },
            },
            actor: { email: userEmail, role: userRole },
            entity: { type: "blueprint", id },
            enterpriseId: blueprint.enterpriseId ?? null,
          });

          return NextResponse.json({ id, status: "rejected" });
        }

        // Approved step — check if this was the last step
        const isLastStep = stepIndex >= chain.length - 1;

        if (isLastStep) {
          // Final approval — transition to approved
          await db
            .update(agentBlueprints)
            .set({
              status: "approved",
              currentApprovalStep: stepIndex,
              approvalProgress: newProgress,
              reviewedBy: userEmail,
              reviewedAt: new Date(),
              reviewComment: comment ?? null,
              // H3-3.1: Capture baseline validation report at approval time for drift detection
              baselineValidationReport: blueprint.validationReport,
              updatedAt: new Date(),
            })
            .where(eq(agentBlueprints.id, id));

          await publishEvent({
            event: {
              type: "blueprint.reviewed",
              payload: {
                blueprintId: id,
                decision: "approve",
                reviewer: userEmail,
                comment: comment ?? null,
                agentId: blueprint.agentId,
                agentName: blueprint.name ?? "",
                createdBy: blueprint.createdBy ?? "",
              },
            },
            actor: { email: userEmail, role: userRole },
            entity: { type: "blueprint", id },
            enterpriseId: blueprint.enterpriseId ?? null,
          });

          return NextResponse.json({ id, status: "approved" });
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

          await publishEvent({
            event: {
              type: "blueprint.approval_step_completed",
              payload: {
                blueprintId: id,
                agentId: blueprint.agentId,
                agentName: blueprint.name ?? "",
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

          return NextResponse.json({ id, status: "in_review", nextStep: stepIndex + 1, nextApproverRole: nextStep.role });
        }
      }
      // chain.length === 0 → fall through to legacy single-step handling below
    }

    // ─── Legacy single-step / default transitions ─────────────────────────────

    const updateFields: Record<string, unknown> = { status: newStatus, updatedAt: new Date() };

    // For approved/rejected in legacy mode: set review fields
    if (newStatus === "approved" || newStatus === "rejected") {
      updateFields.reviewedBy = userEmail;
      updateFields.reviewedAt = new Date();
      updateFields.reviewComment = comment ?? null;
    }
    // H3-3.1: Capture baseline validation report at approval time for drift detection
    if (newStatus === "approved") {
      updateFields.baselineValidationReport = blueprint.validationReport;
    }

    const [updated] = await db
      .update(agentBlueprints)
      .set(updateFields)
      .where(eq(agentBlueprints.id, id))
      .returning();

    try {
      await db.insert(auditLog).values({
        actorEmail: authSession.user.email!,
        actorRole: authSession.user.role!,
        action: "blueprint.status_changed",
        entityType: "blueprint",
        entityId: id,
        enterpriseId: blueprint.enterpriseId ?? null,
        metadata: { fromStatus: currentStatus, toStatus: newStatus },
      });
    } catch (auditErr) {
      console.error(`[${requestId}] Failed to write audit log:`, auditErr);
    }

    // Extract agent name for notification routing (best-effort, falls back gracefully)
    const abp = blueprint.abp as Record<string, unknown> | null;
    const agentName =
      (abp?.metadata as Record<string, unknown> | undefined)?.name ??
      (abp?.identity as Record<string, unknown> | undefined)?.name ??
      "Unnamed Agent";

    const isReviewDecision = newStatus === "approved" || newStatus === "rejected";
    const legacyEvent = isReviewDecision
      ? {
          type: "blueprint.reviewed" as const,
          payload: {
            blueprintId: id,
            decision: newStatus === "approved" ? "approve" : "reject",
            reviewer: userEmail,
            comment: comment ?? null,
            agentId: blueprint.agentId,
            agentName: String(agentName),
            createdBy: blueprint.createdBy ?? "",
          },
        }
      : {
          type: "blueprint.status_changed" as const,
          payload: {
            blueprintId: id,
            fromStatus: currentStatus,
            toStatus: newStatus,
            agentId: blueprint.agentId,
            agentName: String(agentName),
            createdBy: blueprint.createdBy ?? "",
          },
        };

    await publishEvent({
      event: legacyEvent,
      actor: { email: userEmail, role: userRole },
      entity: { type: "blueprint", id },
      enterpriseId: blueprint.enterpriseId ?? null,
    });

    // On deployment: create initial governance health record (fire-and-forget, does not block response).
    // Uses evaluatePolicies() — pure rule engine, no AI cost.
    if (newStatus === "deployed") {
      void checkDeploymentHealth(id, blueprint.enterpriseId ?? null, new Date());

      // Phase 36: SR 11-7 — schedule periodic review due date if enabled
      const deploySettings = await getEnterpriseSettings(blueprint.enterpriseId ?? null);
      if (deploySettings.periodicReview.enabled) {
        const cadenceMs = deploySettings.periodicReview.defaultCadenceMonths * 30.44 * 24 * 60 * 60 * 1000;
        const nextReviewDue = new Date(Date.now() + cadenceMs);
        await db
          .update(agentBlueprints)
          .set({ nextReviewDue })
          .where(eq(agentBlueprints.id, id));
        void publishEvent({
          event: {
            type: "blueprint.periodic_review_reminder",
            payload: {
              blueprintId: id,
              agentId: blueprint.agentId,
              agentName: String(agentName),
            },
          },
          actor: { email: userEmail, role: userRole },
          entity: { type: "blueprint", id },
          enterpriseId: blueprint.enterpriseId ?? null,
        });
      }
    }

    return NextResponse.json({ id: updated.id, status: updated.status });
  } catch (error) {
    console.error(`[${requestId}] Failed to update blueprint status:`, error);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to update status", undefined, requestId);
  }
}
