import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentBlueprints } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { assertEnterpriseAccess } from "@/lib/auth/enterprise";
import { getRequestId } from "@/lib/request-id";
import { writeAuditLog } from "@/lib/audit/log";
import { assembleMRMReport } from "@/lib/mrm/report";

/**
 * GET /api/blueprints/[id]/report
 * Assembles and returns a full MRM Compliance Report for a blueprint version.
 *
 * Access: compliance_officer and admin only — these roles are accountable for
 * model risk documentation and regulatory submissions.
 *
 * Side-effect: writes a blueprint.report_exported audit log entry so that
 * every report export is permanently traceable (who pulled it, when).
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
    await writeAuditLog({
      entityType: "blueprint",
      entityId: id,
      action: "blueprint.report_exported",
      actorEmail: authSession.user.email!,
      actorRole: authSession.user.role,
      enterpriseId: blueprint.enterpriseId ?? null,
      metadata: {
        agentId: blueprint.agentId,
        agentName: blueprint.name ?? "Unnamed Agent",
        reportVersion: report.cover.currentVersion,
      },
    });

    return NextResponse.json(report);
  } catch (err) {
    console.error(`[${requestId}] Failed to assemble MRM report:`, err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to generate report", undefined, requestId);
  }
}
