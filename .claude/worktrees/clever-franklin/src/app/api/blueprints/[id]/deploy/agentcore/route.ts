import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentBlueprints } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { assertEnterpriseAccess } from "@/lib/auth/enterprise";
import { getRequestId } from "@/lib/request-id";
import { publishEvent } from "@/lib/events/publish";
import { getEnterpriseSettings } from "@/lib/settings/get-settings";
import { ABP } from "@/lib/types/abp";
import { readABP } from "@/lib/abp/read";
import { deployToAgentCore } from "@/lib/agentcore/deploy";
import type { AgentCoreDeploymentRecord } from "@/lib/agentcore/types";

/**
 * POST /api/blueprints/[id]/deploy/agentcore
 *
 * Deploys an approved blueprint directly to Amazon Bedrock AgentCore.
 * Creates the agent, attaches action groups, prepares it, and waits until
 * the agent reaches PREPARED status (max 30s).
 *
 * On success: blueprint status → "deployed", deployment_target → "agentcore",
 * deployment_metadata → AgentCoreDeploymentRecord.
 *
 * Access: reviewer, compliance_officer, admin
 * Requirement: blueprint must be in "approved" status
 * Requirement: enterprise must have AgentCore deployment configured and enabled
 */
export async function POST(
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

    // Only approved blueprints can be deployed
    if (blueprint.status !== "approved") {
      return apiError(
        ErrorCode.INVALID_STATE,
        `Only approved blueprints can be deployed to AgentCore. This blueprint is '${blueprint.status}'.`
      );
    }

    // Load enterprise AgentCore configuration
    const settings = await getEnterpriseSettings(
      blueprint.enterpriseId ?? authSession.user.enterpriseId
    );
    const agentcoreConfig = settings.deploymentTargets?.agentcore;

    if (!agentcoreConfig || !agentcoreConfig.enabled) {
      return apiError(
        ErrorCode.AGENTCORE_NOT_CONFIGURED,
        "AgentCore deployment is not configured or enabled for this enterprise. " +
          "Configure it in Admin → Settings → Deployment Targets."
      );
    }

    if (!agentcoreConfig.agentResourceRoleArn || !agentcoreConfig.region) {
      return apiError(
        ErrorCode.AGENTCORE_NOT_CONFIGURED,
        "AgentCore deployment is missing required configuration: region or agentResourceRoleArn."
      );
    }

    const abp = readABP(blueprint.abp);

    // Deploy to AgentCore — this makes live AWS API calls and may take up to 30s
    let deploymentRecord: AgentCoreDeploymentRecord;
    try {
      deploymentRecord = await deployToAgentCore(
        abp,
        {
          region: agentcoreConfig.region,
          agentResourceRoleArn: agentcoreConfig.agentResourceRoleArn,
          foundationModel:
            agentcoreConfig.foundationModel ||
            "anthropic.claude-3-5-sonnet-20241022-v2:0",
          guardrailId: agentcoreConfig.guardrailId,
          guardrailVersion: agentcoreConfig.guardrailVersion,
        },
        { email: authSession.user.email! }
      );
    } catch (deployErr) {
      const msg = deployErr instanceof Error ? deployErr.message : String(deployErr);
      console.error(`[${requestId}] AgentCore deploy failed for blueprint ${id}:`, deployErr);
      return apiError(
        ErrorCode.AGENTCORE_DEPLOY_FAILED,
        `AgentCore deployment failed: ${msg}`,
        undefined,
        requestId
      );
    }

    // Update blueprint: status → deployed, record deployment target + metadata
    await db
      .update(agentBlueprints)
      .set({
        status: "deployed",
        deploymentTarget: "agentcore",
        deploymentMetadata: deploymentRecord as unknown as Record<string, unknown>,
        updatedAt: new Date(),
      })
      .where(eq(agentBlueprints.id, id));

    // Audit: deployment event — also triggers webhooks + notifications
    await publishEvent({
      event: {
        type: "blueprint.agentcore_deployed",
        payload: {
          blueprintId: id,
          agentId: blueprint.agentId,
          deploymentId: deploymentRecord.agentId,
        },
      },
      actor: { email: authSession.user.email!, role: authSession.user.role! },
      entity: { type: "blueprint", id },
      enterpriseId: blueprint.enterpriseId ?? null,
    });

    // Also emit a status_changed event so existing notification/webhook
    // handlers pick up the deployed transition
    await publishEvent({
      event: {
        type: "blueprint.status_changed",
        payload: {
          blueprintId: id,
          fromStatus: "approved",
          toStatus: "deployed",
          agentId: blueprint.agentId,
          agentName: blueprint.name ?? "",
          createdBy: blueprint.createdBy ?? "",
        },
      },
      actor: { email: authSession.user.email!, role: authSession.user.role! },
      entity: { type: "blueprint", id },
      enterpriseId: blueprint.enterpriseId ?? null,
    });

    return NextResponse.json(
      {
        success: true,
        deployment: deploymentRecord,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error(`[${requestId}] Unexpected error in AgentCore deploy:`, err);
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      "An unexpected error occurred during deployment.",
      undefined,
      requestId
    );
  }
}
