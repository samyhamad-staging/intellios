/**
 * Alert threshold evaluation for deployed agents — H1-1.5.
 *
 * `evaluateThresholds(agentId)` loads configured thresholds and compares
 * them against recent telemetry aggregates.
 *
 * `checkAndFireAlerts()` runs across all deployed agents for an enterprise,
 * creating notifications and publishing events for every breached threshold.
 */

import { db } from "@/lib/db";
import { agentBlueprints, agentTelemetry, alertThresholds, users } from "@/lib/db/schema";
import { and, eq, gt, sql, isNull } from "drizzle-orm";
import { SAFE_BLUEPRINT_COLUMNS } from "@/lib/db/safe-columns";
import { publishEvent } from "@/lib/events/publish";
import { createNotification } from "@/lib/notifications/store";
import { runCronBatch, recentFailedItemIds, prioritizeFailed } from "@/lib/cron/batch-runner";

const JOB_NAME = "alert-check";

// ── Types ─────────────────────────────────────────────────────────────────────

export type AlertMetric =
  | "error_rate"
  | "latency_p99"
  | "zero_invocations"
  | "policy_violations";

export type AlertOperator = "gt" | "lt" | "eq";

export interface ThresholdEvalResult {
  thresholdId: string;
  agentId: string;
  metric: AlertMetric;
  operator: AlertOperator;
  threshold: number;
  windowMinutes: number;
  currentValue: number | null;
  breached: boolean;
}

// ── Core evaluation ───────────────────────────────────────────────────────────

/**
 * Evaluate all enabled thresholds for a single agent.
 * Queries telemetry within each threshold's window and computes the metric.
 */
export async function evaluateThresholds(
  agentId: string
): Promise<ThresholdEvalResult[]> {
  const thresholds = await db.query.alertThresholds.findMany({
    where: (t, { and, eq }) => and(eq(t.agentId, agentId), eq(t.enabled, true)),
  });

  if (thresholds.length === 0) return [];

  const results: ThresholdEvalResult[] = [];

  for (const t of thresholds) {
    const windowStart = new Date(Date.now() - t.windowMinutes * 60_000);

    // Aggregate telemetry for the window
    const [agg] = await db
      .select({
        totalInvocations: sql<number>`SUM(${agentTelemetry.invocations})`,
        totalErrors:       sql<number>`SUM(${agentTelemetry.errors})`,
        maxLatencyP99:     sql<number>`MAX(${agentTelemetry.latencyP99Ms})`,
        totalViolations:   sql<number>`SUM(${agentTelemetry.policyViolations})`,
      })
      .from(agentTelemetry)
      .where(
        and(eq(agentTelemetry.agentId, agentId), gt(agentTelemetry.timestamp, windowStart))
      );

    const invocations = Number(agg?.totalInvocations ?? 0);
    const errors      = Number(agg?.totalErrors ?? 0);

    let currentValue: number | null = null;

    switch (t.metric as AlertMetric) {
      case "error_rate":
        currentValue = invocations > 0 ? errors / invocations : null;
        break;
      case "latency_p99":
        currentValue = agg?.maxLatencyP99 ? Number(agg.maxLatencyP99) : null;
        break;
      case "zero_invocations":
        // Breached when invocations === 0 (use 0 as current value for comparison)
        currentValue = invocations;
        break;
      case "policy_violations":
        currentValue = Number(agg?.totalViolations ?? 0);
        break;
    }

    let breached = false;
    if (currentValue !== null) {
      switch (t.operator as AlertOperator) {
        case "gt": breached = currentValue > t.value;  break;
        case "lt": breached = currentValue < t.value;  break;
        case "eq": breached = currentValue === t.value; break;
      }
    }

    results.push({
      thresholdId: t.id,
      agentId,
      metric:       t.metric as AlertMetric,
      operator:     t.operator as AlertOperator,
      threshold:    t.value,
      windowMinutes: t.windowMinutes,
      currentValue,
      breached,
    });
  }

  return results;
}

// ── Fleet-wide check ──────────────────────────────────────────────────────────

/**
 * Evaluate thresholds for all deployed agents in the enterprise.
 * For each breached threshold: create notification + publish event.
 */
export async function checkAndFireAlerts(enterpriseId: string | null): Promise<{
  checked: number;
  breached: number;
  failed: number;
  skipped: number;
  budgetExhausted: boolean;
  durationMs: number;
}> {
  // Load all deployed agents for the enterprise
  const deployedFilter = enterpriseId
    ? eq(agentBlueprints.enterpriseId, enterpriseId)
    : isNull(agentBlueprints.enterpriseId);
  const deployed = await db
    .select(SAFE_BLUEPRINT_COLUMNS)
    .from(agentBlueprints)
    .where(and(eq(agentBlueprints.status, "deployed"), deployedFilter));

  // Load compliance officer emails for notifications (shared across all agents)
  const notifyRoles = ["compliance_officer", "admin"];
  const recipients = await db.query.users.findMany({
    where: (u, { and, eq, inArray, or, isNull }) =>
      and(
        inArray(u.role, notifyRoles),
        enterpriseId
          ? eq(u.enterpriseId, enterpriseId)
          : isNull(u.enterpriseId)
      ),
  });
  const recipientEmails = recipients.map((u) => u.email);

  // ADR-024 — prioritize agents whose threshold evaluation failed recently so
  // broken-telemetry agents don't silently skip an alert cycle.
  const failedIds = await recentFailedItemIds(JOB_NAME);
  const ordered = prioritizeFailed(deployed, (a) => a.agentId, failedIds);

  // Counters outside the handler for inclusion in the response.
  let checked = 0;
  let breached = 0;

  const evaluateAgent = async (agent: typeof deployed[number]) => {
    const results = await evaluateThresholds(agent.agentId);
    checked += results.length;

    const agentName = agent.name ?? "Unknown Agent";

    for (const result of results) {
      if (!result.breached) continue;
      breached++;

      // Publish typed event (fire-and-forget)
      void publishEvent({
        event: {
          type: "blueprint.threshold_alert",
          payload: {
            agentId:       agent.agentId,
            blueprintId:   agent.id,
            agentName,
            metric:        result.metric,
            operator:      result.operator,
            threshold:     result.threshold,
            currentValue:  result.currentValue ?? 0,
            windowMinutes: result.windowMinutes,
          },
        },
        actor:        { email: "system@intellios", role: "system" },
        entity:       { type: "blueprint", id: agent.id },
        enterpriseId: agent.enterpriseId ?? null,
      });

      // Notify compliance officers + admins
      const metricLabel = formatMetric(result.metric, result.currentValue);
      for (const email of recipientEmails) {
        void createNotification({
          recipientEmail: email,
          enterpriseId:   agent.enterpriseId ?? null,
          type:           "threshold_alert",
          title:          `Alert: ${agentName} — ${result.metric} threshold breached`,
          message:        `${agentName}: ${metricLabel} (threshold: ${result.operator} ${result.threshold}, window: ${result.windowMinutes}m)`,
          entityType:     "blueprint",
          entityId:       agent.id,
          link:           `/registry/${agent.agentId}`,
        });
      }
    }
  };

  const result = await runCronBatch({
    jobName: JOB_NAME,
    items: ordered,
    itemId: (a) => a.agentId,
    handler: evaluateAgent,
  });

  return {
    checked,
    breached,
    failed: result.failed,
    skipped: result.skipped,
    budgetExhausted: result.budgetExhausted,
    durationMs: result.durationMs,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatMetric(metric: AlertMetric, value: number | null): string {
  if (value === null) return `${metric}: no data`;
  switch (metric) {
    case "error_rate":         return `error rate ${(value * 100).toFixed(1)}%`;
    case "latency_p99":        return `p99 latency ${value}ms`;
    case "zero_invocations":   return `invocations: ${value}`;
    case "policy_violations":  return `policy violations: ${value}`;
  }
}
