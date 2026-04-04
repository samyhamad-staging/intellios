import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentBlueprints } from "@/lib/db/schema";
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { getRequestId } from "@/lib/request-id";
import {
  BedrockAgentClient,
  GetAgentCommand,
} from "@aws-sdk/client-bedrock-agent";
import type { AgentCoreDeploymentRecord } from "@/lib/agentcore/types";

type BedrockAgentStatus =
  | "PREPARED"
  | "FAILED"
  | "CREATING"
  | "PREPARING"
  | "NOT_PREPARED"
  | "DELETING"
  | "UNREACHABLE";

interface AgentHealthEntry {
  blueprintId: string;
  agentId: string;
  agentName: string | null;
  region: string;
  bedrockStatus: BedrockAgentStatus;
  lastDeployedAt: string;
}

/**
 * GET /api/monitor/agentcore-health
 *
 * For each blueprint deployed to AgentCore (AWS Bedrock), calls GetAgent to
 * retrieve the live agent status. Returns per-agent status + summary.
 *
 * This endpoint makes live AWS SDK calls — it should be triggered by user
 * action (a "Check Live Status" button), NOT polled automatically.
 *
 * Access: compliance_officer | admin | viewer
 */
export async function GET(request: NextRequest) {
  const { session: authSession, error } = await requireAuth(["compliance_officer", "admin", "viewer"]);
  if (error) return error;
  const requestId = getRequestId(request);

  try {
    const enterpriseFilter =
      authSession.user.role === "admin"
        ? undefined
        : authSession.user.enterpriseId
        ? eq(agentBlueprints.enterpriseId, authSession.user.enterpriseId)
        : isNull(agentBlueprints.enterpriseId);

    // Find all blueprints deployed to AgentCore with deployment metadata
    const deployedAgents = await db
      .select({
        id:                 agentBlueprints.id,
        name:               agentBlueprints.name,
        deploymentMetadata: agentBlueprints.deploymentMetadata,
        updatedAt:          agentBlueprints.updatedAt,
      })
      .from(agentBlueprints)
      .where(
        enterpriseFilter
          ? and(
              eq(agentBlueprints.status, "deployed"),
              eq(agentBlueprints.deploymentTarget, "agentcore"),
              isNotNull(agentBlueprints.deploymentMetadata),
              enterpriseFilter
            )
          : and(
              eq(agentBlueprints.status, "deployed"),
              eq(agentBlueprints.deploymentTarget, "agentcore"),
              isNotNull(agentBlueprints.deploymentMetadata)
            )
      );

    // Query Bedrock for each agent's live status
    const agents: AgentHealthEntry[] = await Promise.all(
      deployedAgents.map(async (bp) => {
        const meta = bp.deploymentMetadata as AgentCoreDeploymentRecord | null;
        if (!meta?.agentId || !meta?.region) {
          return {
            blueprintId:    bp.id,
            agentId:        meta?.agentId ?? "unknown",
            agentName:      bp.name,
            region:         meta?.region ?? "unknown",
            bedrockStatus:  "UNREACHABLE" as BedrockAgentStatus,
            lastDeployedAt: meta?.deployedAt ?? bp.updatedAt.toISOString(),
          };
        }

        try {
          const client = new BedrockAgentClient({ region: meta.region });

          // 5-second timeout per GetAgent call to prevent the endpoint hanging
          const abortController = new AbortController();
          const timeout = setTimeout(() => abortController.abort(), 5000);

          const result = await client.send(
            new GetAgentCommand({ agentId: meta.agentId }),
            { abortSignal: abortController.signal }
          );
          clearTimeout(timeout);

          const status = (result.agent?.agentStatus ?? "UNREACHABLE") as BedrockAgentStatus;

          return {
            blueprintId:    bp.id,
            agentId:        meta.agentId,
            agentName:      bp.name,
            region:         meta.region,
            bedrockStatus:  status,
            lastDeployedAt: meta.deployedAt,
          };
        } catch {
          // AWS call failed (credentials missing, network error, agent deleted, timeout)
          return {
            blueprintId:    bp.id,
            agentId:        meta.agentId,
            agentName:      bp.name,
            region:         meta.region,
            bedrockStatus:  "UNREACHABLE" as BedrockAgentStatus,
            lastDeployedAt: meta.deployedAt,
          };
        }
      })
    );

    const summary = {
      total:       agents.length,
      prepared:    agents.filter((a) => a.bedrockStatus === "PREPARED").length,
      unreachable: agents.filter((a) => a.bedrockStatus === "UNREACHABLE").length,
      other:       agents.filter(
        (a) => a.bedrockStatus !== "PREPARED" && a.bedrockStatus !== "UNREACHABLE"
      ).length,
    };

    return NextResponse.json({ agents, summary });
  } catch (err) {
    console.error(`[${requestId}] Failed to check AgentCore health:`, err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to check AgentCore health", undefined, requestId);
  }
}
