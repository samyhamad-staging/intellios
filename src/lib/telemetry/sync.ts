/**
 * AgentCore telemetry sync — pulls metrics from CloudWatch for all deployed
 * AgentCore agents and inserts them into the `agentTelemetry` table.
 *
 * Called by the POST /api/cron/telemetry-sync cron route.
 */

import { db } from "@/lib/db";
import { agentBlueprints, agentTelemetry } from "@/lib/db/schema";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { pollAgentCoreMetrics } from "./agentcore-poller";
import type { AgentCoreDeploymentRecord } from "@/lib/agentcore/types";

export interface SyncResult {
  synced: number;
  errors: number;
  detail: Array<{ agentId: string; status: "ok" | "error"; message?: string }>;
}

/**
 * Iterate all deployed AgentCore agents, poll their CloudWatch metrics, and
 * batch-insert into `agentTelemetry` with `source = 'cloudwatch'`.
 *
 * To avoid re-ingesting data already stored, the poll window starts from the
 * latest `timestamp` already in `agentTelemetry` for this agent (or 24h ago
 * if no rows exist yet).
 */
export async function syncAllAgentCoreTelemetry(): Promise<SyncResult> {
  // 1. Find all deployed AgentCore blueprints (latest per logical agent)
  const deployedAgents = await db
    .select({
      blueprintId: agentBlueprints.id,
      agentId: agentBlueprints.agentId,
      enterpriseId: agentBlueprints.enterpriseId,
      deploymentMetadata: agentBlueprints.deploymentMetadata,
    })
    .from(agentBlueprints)
    .where(
      and(
        eq(agentBlueprints.status, "deployed"),
        eq(agentBlueprints.deploymentTarget, "agentcore"),
        isNotNull(agentBlueprints.deploymentMetadata)
      )
    );

  const result: SyncResult = { synced: 0, errors: 0, detail: [] };

  if (deployedAgents.length === 0) return result;

  // 2. For each agent, determine the poll window and fetch metrics
  for (const agent of deployedAgents) {
    const meta = agent.deploymentMetadata as AgentCoreDeploymentRecord | null;
    if (!meta?.agentId || !meta.region) {
      result.errors++;
      result.detail.push({
        agentId: agent.agentId,
        status: "error",
        message: "Missing agentId or region in deploymentMetadata",
      });
      continue;
    }

    try {
      // Find the latest telemetry timestamp for this agent to avoid duplicates
      const latestRow = await db
        .select({ maxTs: sql<Date | null>`MAX(${agentTelemetry.timestamp})` })
        .from(agentTelemetry)
        .where(
          and(
            eq(agentTelemetry.agentId, agent.agentId),
            eq(agentTelemetry.source, "cloudwatch")
          )
        );

      const maxTs = latestRow[0]?.maxTs;
      const since = maxTs
        ? new Date(maxTs.getTime() + 1) // start just after the last synced point
        : new Date(Date.now() - 24 * 60 * 60 * 1000); // default: last 24h

      const until = new Date();

      const points = await pollAgentCoreMetrics(
        agent.agentId,
        meta.region,
        meta.agentId,
        since,
        until
      );

      if (points.length === 0) {
        result.detail.push({ agentId: agent.agentId, status: "ok" });
        continue;
      }

      // 3. Batch insert
      await db.insert(agentTelemetry).values(
        points.map((p) => ({
          agentId: p.agentId,
          enterpriseId: agent.enterpriseId ?? null,
          timestamp: new Date(p.timestamp),
          invocations: p.invocations,
          errors: p.errors,
          latencyP50Ms: p.latencyP50Ms ?? null,
          latencyP99Ms: p.latencyP99Ms ?? null,
          tokensIn: p.tokensIn,
          tokensOut: p.tokensOut,
          policyViolations: p.policyViolations,
          source: "cloudwatch" as const,
        }))
      );

      result.synced += points.length;
      result.detail.push({ agentId: agent.agentId, status: "ok" });
    } catch (err) {
      console.error("[telemetry/sync] Failed to sync agent:", agent.agentId, err);
      result.errors++;
      result.detail.push({
        agentId: agent.agentId,
        status: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return result;
}
