import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentBlueprints } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ValidationReport } from "@/lib/governance/types";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { assertEnterpriseAccess } from "@/lib/auth/enterprise";
import { getRequestId } from "@/lib/request-id";
import { writeAuditLog } from "@/lib/audit/log";
import { parseBody } from "@/lib/parse-body";
import { z } from "zod";

type Status = "draft" | "in_review" | "approved" | "rejected" | "deprecated" | "deployed";

const StatusBody = z.object({
  status: z.enum(["draft", "in_review", "approved", "rejected", "deprecated", "deployed"]),
});

// Valid forward transitions. Any status → deprecated is always allowed.
const VALID_TRANSITIONS: Record<Status, Status[]> = {
  draft: ["in_review", "deprecated"],
  in_review: ["approved", "rejected", "deprecated"],
  approved: ["deployed", "deprecated"],
  deployed: ["deprecated"],
  rejected: ["deprecated"],
  deprecated: [],
};

/**
 * PATCH /api/blueprints/[id]/status
 * Transitions the lifecycle status of a blueprint version.
 *
 * Body: { status: "in_review" | "approved" | "rejected" | "deprecated" }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session: authSession, error } = await requireAuth(["designer", "reviewer", "admin"]);
  if (error) return error;
  const requestId = getRequestId(request);

  const { data: body, error: bodyError } = await parseBody(request, StatusBody);
  if (bodyError) return bodyError;

  try {
    const { id } = await params;
    const { status: newStatus } = body;

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
    // Role-based transition enforcement (SOD: designers submit, reviewers decide)
    if (newStatus === "in_review" && authSession.user.role !== "designer" && authSession.user.role !== "admin") {
      return apiError(ErrorCode.FORBIDDEN, "Only designers can submit blueprints for review");
    }
    if (newStatus === "deprecated" && authSession.user.role !== "reviewer" && authSession.user.role !== "admin") {
      return apiError(ErrorCode.FORBIDDEN, "Only reviewers and administrators can deprecate blueprints");
    }

    if (!allowed.includes(newStatus)) {
      return apiError(
        ErrorCode.INVALID_STATE,
        `Cannot transition from ${currentStatus} to ${newStatus}. Allowed: ${allowed.join(", ") || "none"}`
      );
    }

    // Block submission for review if there are unresolved error-severity violations (ADR-003, ADR-005)
    if (newStatus === "in_review") {
      const report = blueprint.validationReport as ValidationReport | null;
      if (report) {
        const errorViolations = report.violations.filter((v) => v.severity === "error");
        if (errorViolations.length > 0) {
          return apiError(
            ErrorCode.INVALID_STATE,
            `Cannot submit for review: ${errorViolations.length} error-severity governance violation${errorViolations.length === 1 ? "" : "s"} must be resolved first. Re-validate after refining the blueprint.`,
            { violations: errorViolations }
          );
        }
      }
    }

    const [updated] = await db
      .update(agentBlueprints)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(agentBlueprints.id, id))
      .returning();

    await writeAuditLog({
      entityType: "blueprint",
      entityId: id,
      action: "blueprint.status_changed",
      actorEmail: authSession.user.email!,
      actorRole: authSession.user.role,
      enterpriseId: blueprint.enterpriseId ?? null,
      fromState: { status: currentStatus },
      toState: { status: newStatus },
    });

    return NextResponse.json({ id: updated.id, status: updated.status });
  } catch (error) {
    console.error(`[${requestId}] Failed to update blueprint status:`, error);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to update status", undefined, requestId);
  }
}
