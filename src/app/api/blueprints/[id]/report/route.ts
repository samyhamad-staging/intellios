import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentBlueprints } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { assertEnterpriseAccess } from "@/lib/auth/enterprise";
import { getRequestId } from "@/lib/request-id";
import { publishEvent } from "@/lib/events/publish";
import { assembleMRMReport } from "@/lib/mrm/report";
import { artifactExists, getSignedUrl, uploadArtifact } from "@/lib/storage/s3";

/**
 * GET /api/blueprints/[id]/report
 * Assembles and returns a full MRM Compliance Report for a blueprint version.
 *
 * Access: compliance_officer | admin | viewer — viewer role enables CRO/CISO
 * and external auditors to read governance reports without approval authority.
 *
 * Side-effect: writes a blueprint.report_exported audit log entry so that
 * every report export is permanently traceable (who pulled it, when).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session: authSession, error } = await requireAuth(["compliance_officer", "admin", "viewer"]);
  if (error) return error;
  const requestId = getRequestId(request);

  try {
    const { id } = await params;

    // Verify blueprint exists and caller has enterprise access before assembling
    const blueprint = await db.query.agentBlueprints.findFirst({
      where: eq(agentBlueprints.id, id),
    });
    if (!blueprint) {
      return apiError(ErrorCode.NOT_FOUND, "Blueprint not found");
    }

    const enterpriseError = assertEnterpriseAccess(blueprint.enterpriseId, authSession.user);
    if (enterpriseError) return enterpriseError;

    const report = await assembleMRMReport(id, authSession.user.email!);
    if (!report) {
      return apiError(ErrorCode.NOT_FOUND, "Blueprint not found");
    }

    // Audit every report export — provides traceability for regulatory inquiries
    await publishEvent({
      event: {
        type: "blueprint.report_exported",
        payload: {
          blueprintId: id,
          agentId: blueprint.agentId,
          agentName: blueprint.name ?? "",
        },
      },
      actor: { email: authSession.user.email!, role: authSession.user.role },
      entity: { type: "blueprint", id },
      enterpriseId: blueprint.enterpriseId ?? null,
    });

    // S3 cache: check for pre-generated report
    const s3Key = `reports/${id}/${blueprint.version}.json`;
    const cached = await artifactExists(s3Key);
    if (cached) {
      const signedUrl = await getSignedUrl(s3Key, 3600);
      if (signedUrl) return NextResponse.redirect(signedUrl, 302);
    }
    void uploadArtifact(s3Key, JSON.stringify(report), "application/json");

    return NextResponse.json(report);
  } catch (err) {
    console.error(`[${requestId}] Failed to assemble MRM report:`, err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to generate report", undefined, requestId);
  }
}
