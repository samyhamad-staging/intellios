import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { agentBlueprints, agentTelemetry } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { evaluateRuntimePolicies } from "@/lib/governance/runtime-evaluator";
import { readABP } from "@/lib/abp/read";

/**
 * POST /api/telemetry/ingest
 *
 * Ingests production telemetry data points from deployed agents.
 * Auth: Bearer token via TELEMETRY_API_KEY env var (not session-based —
 * external agents push data without an Intellios session).
 *
 * If TELEMETRY_API_KEY is not set, the endpoint is open (dev/staging only).
 * Set it in production.
 */

const MetricPointSchema = z.object({
  agentId: z.string().uuid(),
  timestamp: z.string().datetime(),
  invocations: z.number().int().min(0),
  errors: z.number().int().min(0),
  latencyP50Ms: z.number().int().min(0).optional(),
  latencyP99Ms: z.number().int().min(0).optional(),
  tokensIn: z.number().int().min(0).default(0),
  tokensOut: z.number().int().min(0).default(0),
  policyViolations: z.number().int().min(0).default(0),
  customMetrics: z.record(z.string(), z.number()).optional(),
});

const IngestBodySchema = z.object({
  metrics: z.array(MetricPointSchema).min(1).max(1000),
});

export async function POST(request: NextRequest) {
  // Bearer token auth — external agents push data without a session
  const telemetryKey = process.env.TELEMETRY_API_KEY;
  if (telemetryKey) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${telemetryKey}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = IngestBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { metrics } = parsed.data;

  // Validate that all referenced agentIds exist as deployed blueprints
  const uniqueAgentIds = [...new Set(metrics.map((m) => m.agentId))];

  let validAgents: { agentId: string; enterpriseId: string | null; abp: unknown }[];
  try {
    validAgents = await db
      .selectDistinctOn([agentBlueprints.agentId], {
        agentId:      agentBlueprints.agentId,
        enterpriseId: agentBlueprints.enterpriseId,
        abp:          agentBlueprints.abp,
      })
      .from(agentBlueprints)
      .where(
        and(
          inArray(agentBlueprints.agentId, uniqueAgentIds),
          eq(agentBlueprints.status, "deployed")
        )
      );
  } catch (err) {
    console.error("[telemetry/ingest] DB query failed:", err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  const validAgentMap = new Map(validAgents.map((a) => [a.agentId, { enterpriseId: a.enterpriseId, abp: a.abp }]));

  // Partition metrics into valid and invalid
  const toInsert: (typeof agentTelemetry.$inferInsert)[] = [];
  const errors: { agentId: string; reason: string }[] = [];

  for (const metric of metrics) {
    if (!validAgentMap.has(metric.agentId)) {
      errors.push({
        agentId: metric.agentId,
        reason: "Agent not found or not in deployed status",
      });
      continue;
    }

    toInsert.push({
      agentId: metric.agentId,
      enterpriseId: validAgentMap.get(metric.agentId)?.enterpriseId ?? null,
      timestamp: new Date(metric.timestamp),
      invocations: metric.invocations,
      errors: metric.errors,
      latencyP50Ms: metric.latencyP50Ms ?? null,
      latencyP99Ms: metric.latencyP99Ms ?? null,
      tokensIn: metric.tokensIn,
      tokensOut: metric.tokensOut,
      policyViolations: metric.policyViolations,
      customMetrics: metric.customMetrics ?? null,
      source: "push",
    });
  }

  // Batch insert valid metrics
  if (toInsert.length > 0) {
    try {
      await db.insert(agentTelemetry).values(toInsert);
    } catch (err) {
      console.error("[telemetry/ingest] Insert failed:", err);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }
  }

  // ── Runtime policy evaluation (fire-and-forget, non-blocking) ──────────────
  // After inserting telemetry, evaluate runtime governance policies for each
  // affected agent. Errors are caught and logged — they must not affect the
  // ingest response.
  const affectedAgentIds = [...new Set(toInsert.map((r) => r.agentId))];
  void (async () => {
    for (const agentId of affectedAgentIds) {
      try {
        const agentRecord = validAgentMap.get(agentId);
        const enterpriseId = agentRecord?.enterpriseId ?? null;
        const abp = agentRecord?.abp ? readABP(agentRecord.abp) : undefined;
        await evaluateRuntimePolicies(agentId, enterpriseId, abp);
      } catch (err) {
        console.error("[telemetry/ingest] Runtime policy evaluation failed:", err, { agentId });
      }
    }
  })();

  return NextResponse.json({ ingested: toInsert.length, errors });
}
