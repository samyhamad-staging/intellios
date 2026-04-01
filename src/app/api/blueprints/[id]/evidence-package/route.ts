import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentBlueprints, blueprintQualityScores, blueprintTestRuns } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { assertEnterpriseAccess } from "@/lib/auth/enterprise";
import { getRequestId } from "@/lib/request-id";
import { publishEvent } from "@/lib/events/publish";
import { assembleMRMReport } from "@/lib/mrm/report";
import { artifactExists, getSignedUrl, uploadArtifact } from "@/lib/storage/s3";
import type { ApprovalStepRecord } from "@/lib/settings/types";

/**
 * GET /api/blueprints/[id]/evidence-package
 *
 * Assembles and returns a complete audit evidence package suitable for
 * regulatory examination, internal audit, or executive review.
 *
 * Contents:
 *   - Export metadata (who, when, format version)
 *   - Full MRM Compliance Report (14 sections: identity, capabilities,
 *     governance validation, review decision, SOD evidence, deployment
 *     record, model lineage, audit chain, stakeholder contributions,
 *     stakeholder coverage gaps, regulatory framework assessment,
 *     periodic review schedule)
 *   - Multi-step approval chain (all approval steps with timestamps)
 *   - Blueprint quality evaluation (AI-scored dimensions)
 *   - Behavioral test evidence (all test runs for this blueprint version)
 *
 * Status gate: blueprint must be `approved` or `deployed`.
 * Access: any authenticated user with enterprise access (designer through admin, including viewer).
 * Side-effect: writes `blueprint.evidence_package_exported` audit entry.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session: authSession, error } = await requireAuth([
    "architect",
    "reviewer",
    "compliance_officer",
    "admin",
    "viewer",
  ]);
  if (error) return error;
  const requestId = getRequestId(request);

  try {
    const { id } = await params;

    const blueprint = await db.query.agentBlueprints.findFirst({
      where: eq(agentBlueprints.id, id),
    });
    if (!blueprint) {
      return apiError(ErrorCode.NOT_FOUND, "Blueprint not found");
    }

    const enterpriseError = assertEnterpriseAccess(blueprint.enterpriseId, authSession.user);
    if (enterpriseError) return enterpriseError;

    // Status gate — only approved/deployed blueprints have complete evidence chains
    if (blueprint.status !== "approved" && blueprint.status !== "deployed") {
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        "Evidence package export is only available for approved or deployed blueprints"
      );
    }

    // ── Assemble full MRM report (all 14 sections) ─────────────────────────
    const mrmReport = await assembleMRMReport(id, authSession.user.email!);
    if (!mrmReport) {
      return apiError(ErrorCode.NOT_FOUND, "Blueprint not found");
    }

    // ── Multi-step approval chain ──────────────────────────────────────────
    const approvalProgress = (blueprint.approvalProgress as ApprovalStepRecord[]) ?? [];

    // ── Blueprint quality evaluation ───────────────────────────────────────
    const qualityScoreRows = await db
      .select()
      .from(blueprintQualityScores)
      .where(eq(blueprintQualityScores.blueprintId, id))
      .orderBy(desc(blueprintQualityScores.evaluatedAt))
      .limit(1);
    const qualityScore = qualityScoreRows[0] ?? null;

    // ── Behavioral test evidence ───────────────────────────────────────────
    const testRunRows = await db
      .select()
      .from(blueprintTestRuns)
      .where(eq(blueprintTestRuns.blueprintId, id))
      .orderBy(desc(blueprintTestRuns.startedAt));

    // ── Assemble evidence package ──────────────────────────────────────────
    const pkg = {
      exportMetadata: {
        packageFormatVersion: "1.0",
        exportedAt: new Date().toISOString(),
        exportedBy: authSession.user.email!,
        exportedByRole: authSession.user.role,
        blueprintId: id,
        agentId: blueprint.agentId,
        agentName: blueprint.name ?? "Unnamed Agent",
        blueprintVersion: blueprint.version,
        blueprintStatus: blueprint.status,
      },

      // Complete MRM report — all 14 sections including identity, capabilities,
      // governance validation, review decision, SOD evidence, deployment record,
      // model lineage, audit chain, stakeholder contributions, regulatory
      // framework assessment, and periodic review schedule.
      mrmReport,

      // Multi-step approval chain — each approval step with decision, actor,
      // timestamp, and comment. Required evidence when an enterprise uses
      // a tiered approval workflow (e.g., owner → risk → legal).
      approvalChain: {
        stepCount: approvalProgress.length,
        currentStep: blueprint.currentApprovalStep,
        steps: approvalProgress.map((step) => ({
          step: step.step,
          label: step.label,
          role: step.role,
          approvedBy: step.approvedBy,
          decision: step.decision,
          comment: step.comment ?? null,
          approvedAt: step.approvedAt,
        })),
      },

      // AI-scored blueprint quality dimensions (intentAlignment,
      // toolAppropriateness, instructionSpecificity, governanceAdequacy,
      // ownershipCompleteness). null when no evaluation has been run.
      qualityEvaluation: qualityScore
        ? {
            id: qualityScore.id,
            overallScore:
              qualityScore.overallScore != null
                ? parseFloat(qualityScore.overallScore)
                : null,
            dimensions: {
              intentAlignment:
                qualityScore.intentAlignment != null
                  ? parseFloat(qualityScore.intentAlignment)
                  : null,
              toolAppropriateness:
                qualityScore.toolAppropriateness != null
                  ? parseFloat(qualityScore.toolAppropriateness)
                  : null,
              instructionSpecificity:
                qualityScore.instructionSpecificity != null
                  ? parseFloat(qualityScore.instructionSpecificity)
                  : null,
              governanceAdequacy:
                qualityScore.governanceAdequacy != null
                  ? parseFloat(qualityScore.governanceAdequacy)
                  : null,
              ownershipCompleteness:
                qualityScore.ownershipCompleteness != null
                  ? parseFloat(qualityScore.ownershipCompleteness)
                  : null,
            },
            flags: (qualityScore.flags as string[]) ?? [],
            evaluatorModel: qualityScore.evaluatorModel,
            evaluatedAt: qualityScore.evaluatedAt.toISOString(),
          }
        : null,

      // All behavioral test runs recorded for this blueprint version.
      // Empty array for blueprints with no test suite configured.
      testEvidence: {
        runCount: testRunRows.length,
        runs: testRunRows.map((run) => ({
          id: run.id,
          status: run.status,
          totalCases: run.totalCases,
          passedCases: run.passedCases,
          failedCases: run.failedCases,
          runBy: run.runBy,
          startedAt: run.startedAt.toISOString(),
          completedAt: run.completedAt?.toISOString() ?? null,
          results: run.testResults,
        })),
      },
    };

    // Audit every evidence package export
    await publishEvent({
      event: {
        type: "blueprint.evidence_package_exported",
        payload: {
          blueprintId: id,
          agentId: blueprint.agentId,
        },
      },
      actor: { email: authSession.user.email!, role: authSession.user.role },
      entity: { type: "blueprint", id },
      enterpriseId: blueprint.enterpriseId ?? null,
    });

    const safeName =
      blueprint.name?.replace(/[^a-z0-9]/gi, "-").toLowerCase() ?? "agent";
    const filename = `evidence-package-${safeName}-v${blueprint.version}-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;

    // S3 cache: check for a pre-generated artifact, serve via signed URL if present
    const s3Key = `evidence/${id}/${blueprint.version}.json`;
    const cached = await artifactExists(s3Key);
    if (cached) {
      const signedUrl = await getSignedUrl(s3Key, 3600);
      if (signedUrl) return NextResponse.redirect(signedUrl, 302);
    }

    // Upload to S3 for future requests (fire-and-forget)
    void uploadArtifact(s3Key, JSON.stringify(pkg, null, 2), "application/json");

    return new NextResponse(JSON.stringify(pkg, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error(`[${requestId}] Failed to export evidence package:`, err);
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      "Failed to export evidence package",
      undefined,
      requestId
    );
  }
}
