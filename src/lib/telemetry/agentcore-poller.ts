/**
 * AgentCore (Amazon Bedrock Agent) CloudWatch metrics poller.
 *
 * Fetches production telemetry for a deployed Bedrock Agent from CloudWatch
 * and returns it in the Intellios telemetry schema format.
 *
 * CloudWatch namespace: AWS/Bedrock
 * Dimensions used:     AgentId, AgentVersion (DRAFT = live version)
 *
 * Metrics fetched (per 1-hour period, last 24h by default):
 *   - Invocations        → invocations
 *   - ClientError        → errors
 *   - InvocationLatency  → latencyP50Ms (p50 stat), latencyP99Ms (p99 stat)
 *   - InputTokenCount    → tokensIn
 *   - OutputTokenCount   → tokensOut
 */

import {
  CloudWatchClient,
  GetMetricDataCommand,
  type MetricDataQuery,
  type MetricDataResult,
} from "@aws-sdk/client-cloudwatch";

export interface TelemetryDataPoint {
  agentId: string;
  timestamp: string; // ISO 8601
  invocations: number;
  errors: number;
  latencyP50Ms: number | null;
  latencyP99Ms: number | null;
  tokensIn: number;
  tokensOut: number;
  policyViolations: number;
}

/**
 * Fetch CloudWatch metrics for a deployed Amazon Bedrock Agent.
 *
 * @param intelliosAgentId - The Intellios agentId (for labelling output rows)
 * @param region - AWS region where the Bedrock agent is deployed
 * @param bedrockAgentId - The Bedrock-assigned agent ID (e.g. "ABCDEF1234")
 * @param since - Start of the polling window (default: 24h ago)
 * @param until - End of the polling window (default: now)
 * @returns Array of hourly telemetry data points in Intellios schema format
 */
export async function pollAgentCoreMetrics(
  intelliosAgentId: string,
  region: string,
  bedrockAgentId: string,
  since?: Date,
  until?: Date
): Promise<TelemetryDataPoint[]> {
  const now = new Date();
  const startTime = since ?? new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const endTime = until ?? now;

  const client = new CloudWatchClient({ region });

  const dimensions = [
    { Name: "AgentId", Value: bedrockAgentId },
    { Name: "AgentVersion", Value: "DRAFT" },
  ];

  // 1-hour granularity — aligns with typical telemetry aggregation windows.
  const periodSeconds = 3600;

  const queries: MetricDataQuery[] = [
    {
      Id: "invocations",
      MetricStat: {
        Metric: {
          Namespace: "AWS/Bedrock",
          MetricName: "Invocations",
          Dimensions: dimensions,
        },
        Period: periodSeconds,
        Stat: "Sum",
      },
    },
    {
      Id: "errors",
      MetricStat: {
        Metric: {
          Namespace: "AWS/Bedrock",
          MetricName: "ClientError",
          Dimensions: dimensions,
        },
        Period: periodSeconds,
        Stat: "Sum",
      },
    },
    {
      Id: "latencyP50",
      MetricStat: {
        Metric: {
          Namespace: "AWS/Bedrock",
          MetricName: "InvocationLatency",
          Dimensions: dimensions,
        },
        Period: periodSeconds,
        Stat: "p50",
      },
    },
    {
      Id: "latencyP99",
      MetricStat: {
        Metric: {
          Namespace: "AWS/Bedrock",
          MetricName: "InvocationLatency",
          Dimensions: dimensions,
        },
        Period: periodSeconds,
        Stat: "p99",
      },
    },
    {
      Id: "tokensIn",
      MetricStat: {
        Metric: {
          Namespace: "AWS/Bedrock",
          MetricName: "InputTokenCount",
          Dimensions: dimensions,
        },
        Period: periodSeconds,
        Stat: "Sum",
      },
    },
    {
      Id: "tokensOut",
      MetricStat: {
        Metric: {
          Namespace: "AWS/Bedrock",
          MetricName: "OutputTokenCount",
          Dimensions: dimensions,
        },
        Period: periodSeconds,
        Stat: "Sum",
      },
    },
  ];

  const command = new GetMetricDataCommand({
    MetricDataQueries: queries,
    StartTime: startTime,
    EndTime: endTime,
    ScanBy: "TimestampAscending",
  });

  const response = await client.send(command);
  const results: MetricDataResult[] = response.MetricDataResults ?? [];

  // Index results by Id for easy lookup
  const byId = new Map<string, MetricDataResult>();
  for (const r of results) {
    if (r.Id) byId.set(r.Id, r);
  }

  // Collect all unique timestamps across all metrics
  const timestampsSet = new Set<number>();
  for (const r of results) {
    for (const t of r.Timestamps ?? []) {
      timestampsSet.add(t.getTime());
    }
  }

  if (timestampsSet.size === 0) return [];

  const timestamps = Array.from(timestampsSet).sort((a, b) => a - b);

  function valueAt(id: string, tsMs: number): number {
    const r = byId.get(id);
    if (!r) return 0;
    const idx = (r.Timestamps ?? []).findIndex((t) => t.getTime() === tsMs);
    if (idx === -1) return 0;
    return (r.Values ?? [])[idx] ?? 0;
  }

  function valueOrNullAt(id: string, tsMs: number): number | null {
    const r = byId.get(id);
    if (!r) return null;
    const idx = (r.Timestamps ?? []).findIndex((t) => t.getTime() === tsMs);
    if (idx === -1) return null;
    const v = (r.Values ?? [])[idx];
    return v ?? null;
  }

  return timestamps.map((tsMs) => ({
    agentId: intelliosAgentId,
    timestamp: new Date(tsMs).toISOString(),
    invocations: Math.round(valueAt("invocations", tsMs)),
    errors: Math.round(valueAt("errors", tsMs)),
    latencyP50Ms: valueOrNullAt("latencyP50", tsMs) !== null
      ? Math.round(valueOrNullAt("latencyP50", tsMs)!)
      : null,
    latencyP99Ms: valueOrNullAt("latencyP99", tsMs) !== null
      ? Math.round(valueOrNullAt("latencyP99", tsMs)!)
      : null,
    tokensIn: Math.round(valueAt("tokensIn", tsMs)),
    tokensOut: Math.round(valueAt("tokensOut", tsMs)),
    policyViolations: 0, // CloudWatch has no policy violation metric — detected by Intellios governance checks
  }));
}
