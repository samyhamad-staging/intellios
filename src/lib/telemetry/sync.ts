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
import { runCronBatch, recentFailedItemIds, prioritizeFailed } from "@/lib/cron/batch-runner";

const JOB_NAME = "telemetry-sync";

export interface SyncResult {
  synced: number;
  errors: number;
  skipped: number;
  budgetExhausted: boolean;
  durationMs: number;
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

  if (deployedAgents.length === 0) {
    return { synced: 0, errors: 0, skipped: 0, budgetExhausted: false, durationMs: 0, detail: [] };
  }

  // ADR-024 — prioritize recently-failed agents so chronic CloudWatch misses
  // don't get buried behind healthy ones.
  const failedIds = await recentFailedItemIds(JOB_NAME);
  const ordered = prioritizeFailed(deployedAgents, (a) => a.agentId, failedIds);

  // Per-agent detail accumulates outside the handler for inclusion in the response.
  const detail: Array<{ agentId: string; status: "ok" | "error"; message?: string }> = [];
  let synced = 0;

  const syncAgent = async (agent: typeof deployedAgents[number]) => {
    const meta = agent.deploymentMetadata as AgentCoreDeploymentRecord | null;
    if (!meta?.agentId || !meta.region) {
      detail.push({
        agentId: agent.agentId,
        status: "error",
        message: "Missing agentId or region in deploymentMetadata",
      });
      throw new Error("Missing agentId or region in deploymentMetadata");
    }

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
      detail.push({ agentId: agent.agentId, status: "ok" });
      return;
    }

    // Batch insert
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

    synced += points.length;
    detail.push({ agentId: agent.agentId, status: "ok" });
  };

  const runResult = await runCronBatch({
    jobName: JOB_NAME,
    items: ordered,
    itemId: (a) => a.agentId,
    handler: syncAgent,
  });

  // Any agent that didn't push an "ok" detail row and wasn't skipped is an error.
  // The runCronBatch loop records error detail rows for handlers that throw via the
  // detail.push() above (missing metadata case) and via the syncAgent catch in the
  // runner itself (other throws). For throws not caught above, add a synthetic row.
  const okIds = new Set(detail.filter((d) => d.status === "ok").map((d) => d.agentId));
  const errorIds = new Set(detail.filter((d) => d.status === "error").map((d) => d.agentId));
  for (let i = 0; i < ordered.length - runResult.skipped; i++) {
    const a = ordered[i];
    if (!okIds.has(a.agentId) && !errorIds.has(a.agentId)) {
      detail.push({
        agentId: a.agentId,
        status: "error",
        message: "sync failed — see cron_item_failures for details",
      });
    }
  }

  return {
    synced,
    errors: runResult.failed,
    skipped: runResult.skipped,
    budgetExhausted: runResult.budgetExhausted,
    durationMs: runResult.durationMs,
    detail,
  };
}
