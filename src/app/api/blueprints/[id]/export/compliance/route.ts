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

/**
 * GET /api/blueprints/[id]/export/compliance
 *
 * Assembles and returns a structured JSON evidence package suitable for
 * regulatory submission. The bundle includes:
 *   - Full MRM Compliance Report (all 14 sections)
 *   - Blueprint quality score (AI evaluation dimensions)
 *   - All test run records for this blueprint version
 *   - Export metadata (who, when, format version)
 *
 * Status gate: blueprint must be in `approved` or `deployed` status.
 * Only approved/deployed agents have complete evidence chains.
 *
 * Access: compliance_officer | admin
 * Response: JSON attachment (Content-Disposition: attachment)
 * Side-effect: writes `blueprint.compliance_exported` audit entry
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session: authSession, error } = await requireAuth(["compliance_officer", "admin"]);
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

    // Status gate — only complete evidence chains are exportable
    if (blueprint.status !== "approved" && blueprint.status !== "deployed") {
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        "Compliance evidence export is only available for approved or deployed blueprints"
      );
    }

    // ── Assemble MRM report (all 14 sections) ─────────────────────────────
    const mrmReport = await assembleMRMReport(id, authSession.user.email!);
    if (!mrmReport) {
      return apiError(ErrorCode.NOT_FOUND, "Blueprint not found");
    }

    // ── Fetch latest blueprint quality score ──────────────────────────────
    const qualityScoreRows = await db
      .select()
      .from(blueprintQualityScores)
      .where(eq(blueprintQualityScores.blueprintId, id))
      .orderBy(desc(blueprintQualityScores.evaluatedAt))
      .limit(1);

    const qualityScore = qualityScoreRows[0] ?? null;

    // ── Fetch all test runs for this blueprint version ────────────────────
    const testRunRows = await db
      .select()
      .from(blueprintTestRuns)
      .where(eq(blueprintTestRuns.blueprintId, id))
      .orderBy(desc(blueprintTestRuns.startedAt));

    // ── Assemble evidence bundle ───────────────────────────────────────────
    const bundle = {
      exportMetadata: {
        bundleFormatVersion: "1.0",
        exportedAt: new Date().toISOString(),
        exportedBy: authSession.user.email!,
        blueprintId: id,
        agentId: blueprint.agentId,
        agentName: blueprint.name ?? "Unnamed Agent",
        blueprintVersion: blueprint.version,
        blueprintStatus: blueprint.status,
      },
      mrmReport,
      qualityEvaluation: qualityScore
        ? {
            id: qualityScore.id,
            overallScore: qualityScore.overallScore != null ? parseFloat(qualityScore.overallScore) : null,
            dimensions: {
              intentAlignment: qualityScore.intentAlignment != null ? parseFloat(qualityScore.intentAlignment) : null,
              toolAppropriateness: qualityScore.toolAppropriateness != null ? parseFloat(qualityScore.toolAppropriateness) : null,
              instructionSpecificity: qualityScore.instructionSpecificity != null ? parseFloat(qualityScore.instructionSpecificity) : null,
              governanceAdequacy: qualityScore.governanceAdequacy != null ? parseFloat(qualityScore.governanceAdequacy) : null,
              ownershipCompleteness: qualityScore.ownershipCompleteness != null ? parseFloat(qualityScore.ownershipCompleteness) : null,
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

    // Audit every compliance export
    await publishEvent({
      event: {
        type: "blueprint.compliance_exported",
        payload: {
          blueprintId: id,
          agentId: blueprint.agentId,
        },
      },
      actor: { email: authSession.user.email!, role: authSession.user.role },
      entity: { type: "blueprint", id },
      enterpriseId: blueprint.enterpriseId ?? null,
    });

    const filename = `compliance-evidence-${blueprint.name?.replace(/[^a-z0-9]/gi, "-").toLowerCase() ?? "agent"}-v${blueprint.version}-${new Date().toISOString().slice(0, 10)}.json`;

    return new NextResponse(JSON.stringify(bundle, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error(`[${requestId}] Failed to export compliance evidence:`, err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to export compliance evidence", undefined, requestId);
  }
}
