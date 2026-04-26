import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  agentBlueprints,
  blueprintQualityScores,
  blueprintTestRuns,
} from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { assertEnterpriseAccess } from "@/lib/auth/enterprise";
import { getRequestId } from "@/lib/request-id";
import { publishEvent } from "@/lib/events/publish";
import { assembleMRMReport } from "@/lib/mrm/report";
import { artifactExists, getSignedUrl, uploadArtifact } from "@/lib/storage/s3";
import type { ApprovalStepRecord } from "@/lib/settings/types";
import { SAFE_BLUEPRINT_COLUMNS } from "@/lib/db/safe-columns";
import {
  renderEvidencePDF,
  evidencePackageFilename,
} from "@/lib/pdf/render-evidence";
import type { EvidencePackagePDFInput } from "@/lib/pdf/evidence-template";

/**
 * GET /api/blueprints/[id]/evidence-package/pdf
 *
 * Server-side PDF rendering of the evidence package — branded, audit-quality,
 * suitable for regulatory submission, internal audit committees, or Big-4
 * audit hand-off.
 *
 * The JSON variant at `GET /api/blueprints/[id]/evidence-package` remains
 * the authoritative shape; this PDF is a deterministic rendering of the same
 * data via headless Chromium (ADR-015 / OQ-009 resolved 2026-04-25 — Option 2).
 *
 * Status gate: blueprint must be `approved` or `deployed`.
 * Access: any authenticated user with enterprise access.
 * Side-effect: writes `blueprint.evidence_package_exported` audit entry with `format: "pdf"`.
 * Cache: `evidence/{id}/{version}.pdf` on S3, served via signed URL on hit.
 *
 * NOTE: The Vercel function for this route should be configured with at
 * least 2048 MB of memory due to Chromium's working-set requirements. See
 * Vercel project settings or `vercel.json` (TODO: add per-route override).
 */

// Force Node runtime — Chromium requires the full Node runtime, not Edge.
export const runtime = "nodejs";

// Allow up to 60s for cold-start render (Chromium download + render).
// Subsequent warm renders complete in ~1-3s.
export const maxDuration = 60;

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

    const [blueprint] = await db
      .select(SAFE_BLUEPRINT_COLUMNS)
      .from(agentBlueprints)
      .where(eq(agentBlueprints.id, id))
      .limit(1);
    if (!blueprint) {
      return apiError(ErrorCode.NOT_FOUND, "Blueprint not found");
    }

    const enterpriseError = assertEnterpriseAccess(
      blueprint.enterpriseId,
      authSession.user
    );
    if (enterpriseError) return enterpriseError;

    if (
      blueprint.status !== "approved" &&
      blueprint.status !== "deployed"
    ) {
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        "Evidence package export is only available for approved or deployed blueprints"
      );
    }

    const filename = evidencePackageFilename(
      blueprint.name,
      blueprint.version,
      "pdf"
    );

    // ── S3 cache: serve pre-rendered PDF when available ──────────────────
    const s3Key = `evidence/${id}/${blueprint.version}.pdf`;
    const cached = await artifactExists(s3Key);
    if (cached) {
      const signedUrl = await getSignedUrl(s3Key, 3600);
      if (signedUrl) {
        // Audit the cached export so the audit trail does not gap on cache hits.
        await publishEvent({
          event: {
            type: "blueprint.evidence_package_exported",
            payload: {
              blueprintId: id,
              agentId: blueprint.agentId,
              format: "pdf",
              cached: true,
            },
          },
          actor: {
            email: authSession.user.email!,
            role: authSession.user.role,
          },
          entity: { type: "blueprint", id },
          enterpriseId: blueprint.enterpriseId ?? null,
        });
        return NextResponse.redirect(signedUrl, 302);
      }
    }

    // ── Assemble the package (parallel to the JSON route's shape) ────────
    const mrmReport = await assembleMRMReport(id, authSession.user.email!);
    if (!mrmReport) {
      return apiError(ErrorCode.NOT_FOUND, "Blueprint not found");
    }

    const approvalProgress =
      (blueprint.approvalProgress as ApprovalStepRecord[]) ?? [];

    const qualityScoreRows = await db
      .select()
      .from(blueprintQualityScores)
      .where(eq(blueprintQualityScores.blueprintId, id))
      .orderBy(desc(blueprintQualityScores.evaluatedAt))
      .limit(1);
    const qualityScore = qualityScoreRows[0] ?? null;

    const testRunRows = await db
      .select()
      .from(blueprintTestRuns)
      .where(eq(blueprintTestRuns.blueprintId, id))
      .orderBy(desc(blueprintTestRuns.startedAt));

    const pkg: EvidencePackagePDFInput = {
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
      mrmReport,
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

    // ── Render PDF ────────────────────────────────────────────────────────
    const pdfBuffer = await renderEvidencePDF(pkg);

    // ── Cache to S3 (fire-and-forget for subsequent requests) ────────────
    void uploadArtifact(s3Key, pdfBuffer, "application/pdf");

    // ── Audit ─────────────────────────────────────────────────────────────
    await publishEvent({
      event: {
        type: "blueprint.evidence_package_exported",
        payload: {
          blueprintId: id,
          agentId: blueprint.agentId,
          format: "pdf",
          cached: false,
        },
      },
      actor: {
        email: authSession.user.email!,
        role: authSession.user.role,
      },
      entity: { type: "blueprint", id },
      enterpriseId: blueprint.enterpriseId ?? null,
    });

    // Convert Node Buffer to a Uint8Array for the Web `Response` body.
    const body = new Uint8Array(pdfBuffer);

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (err) {
    console.error(
      `[${requestId}] Failed to export evidence package PDF:`,
      err
    );
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      "Failed to render evidence package PDF",
      undefined,
      requestId
    );
  }
}
