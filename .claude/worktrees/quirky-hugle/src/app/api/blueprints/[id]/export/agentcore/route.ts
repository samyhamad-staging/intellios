import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentBlueprints } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { assertEnterpriseAccess } from "@/lib/auth/enterprise";
import { getRequestId } from "@/lib/request-id";
import { publishEvent } from "@/lib/events/publish";
import { ABP } from "@/lib/types/abp";
import { buildAgentCoreExportManifest } from "@/lib/agentcore/translate";

/**
 * GET /api/blueprints/[id]/export/agentcore
 *
 * Generates an Amazon Bedrock AgentCore deployment manifest from an approved
 * or deployed blueprint. Returns JSON that can be applied directly with the
 * AWS CLI: aws bedrock-agent create-agent --cli-input-json file://manifest.json
 *
 * Access: reviewer, compliance_officer, admin
 * Requirement: blueprint must be in approved or deployed status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session: authSession, error } = await requireAuth([
    "reviewer",
    "compliance_officer",
    "admin",
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

    // Only allow export of approved or deployed blueprints — drafts and in-review
    // blueprints have not completed governance review and must not be exportable.
    const status = blueprint.status;
    if (status !== "approved" && status !== "deployed") {
      return apiError(
        ErrorCode.INVALID_STATE,
        `Only approved or deployed blueprints can be exported. This blueprint is '${status}'.`
      );
    }

    const abp = blueprint.abp as ABP;

    // Build the manifest using the translator (pure function, no AWS calls)
    const manifest = buildAgentCoreExportManifest(abp, {
      blueprintId: blueprint.id,
      blueprintVersion: blueprint.version ?? "1",
      exportedBy: authSession.user.email!,
      // Phase 1: no credentials stored in Intellios — the operator supplies these
      // agentResourceRoleArn is left as placeholder in the manifest
    });

    // Audit the export for compliance tracking
    await publishEvent({
      event: {
        type: "blueprint.agentcore_exported",
        payload: {
          blueprintId: id,
          agentId: blueprint.agentId,
        },
      },
      actor: { email: authSession.user.email!, role: authSession.user.role! },
      entity: { type: "blueprint", id },
      enterpriseId: blueprint.enterpriseId ?? null,
    });

    // Return as downloadable JSON with a filename header
    const agentSlug = (abp.identity.name ?? "agent")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const filename = `intellios-${agentSlug}-agentcore-manifest.json`;

    return new NextResponse(JSON.stringify(manifest, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error(`[${requestId}] Failed to generate AgentCore export:`, err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to generate export manifest", undefined, requestId);
  }
}
