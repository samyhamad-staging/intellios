/**
 * Runtime Policy Evaluator — H2-1.2.
 *
 * Evaluates runtime governance policies against live telemetry aggregates for
 * a deployed agent. This is a parallel evaluation path to the design-time
 * `evaluatePolicies()` in evaluate.ts — it operates on TelemetryWindow data
 * rather than on ABP document structure.
 *
 * Operator semantics:
 *   token_budget_daily          — total (tokensIn + tokensOut) over 24h window > threshold
 *   token_budget_per_interaction— avg tokens per invocation over window > threshold
 *   pii_action                  — configuration assertion; runtime enforcement deferred to H3
 *   scope_constraint            — deployed ABP tool list must be subset of allowed tools
 *   circuit_breaker_error_rate  — (errors / invocations) over window > threshold
 *
 * Deduplication: the same threshold breach is re-inserted on every ingest call
 * until the agent recovers. H2-1.3 groups violations by (ruleId, day) in the UI.
 * Rate-limited deduplication is deferred to H2-1.3.
 */

import { db } from "@/lib/db";
import { governancePolicies, agentTelemetry, runtimeViolations, agentBlueprints, users } from "@/lib/db/schema";
import { and, desc, eq, gte, inArray, isNull, or, sql } from "drizzle-orm";
import type { ABP } from "@/lib/types/abp";
import type {
  RuntimeGovernancePolicy,
  RuntimePolicyRule,
  RuntimeRuleOperator,
  RuntimeViolation,
  Severity,
} from "./types";
import { createNotification } from "@/lib/notifications/store";
import { publishEvent } from "@/lib/events/publish";
import { getEnterpriseSettings } from "@/lib/settings/get-settings";

// ── Telemetry window ───────────────────────────────────────────────────────────

interface TelemetryAggregate {
  totalTokensIn:    number;
  totalTokensOut:   number;
  totalInvocations: number;
  totalErrors:      number;
  errorRate:        number;  // totalErrors / totalInvocations, or 0 when invocations = 0
  avgTokensPerInvocation: number;
  windowStartAt:    Date;
  windowEndAt:      Date;
}

async function aggregateTelemetry(
  agentId: string,
  windowHours: number
): Promise<TelemetryAggregate> {
  const windowStartAt = new Date(Date.now() - windowHours * 3_600_000);
  const windowEndAt   = new Date();

  const [row] = await db
    .select({
      totalTokensIn:    sql<number>`COALESCE(SUM(${agentTelemetry.tokensIn}), 0)`,
      totalTokensOut:   sql<number>`COALESCE(SUM(${agentTelemetry.tokensOut}), 0)`,
      totalInvocations: sql<number>`COALESCE(SUM(${agentTelemetry.invocations}), 0)`,
      totalErrors:      sql<number>`COALESCE(SUM(${agentTelemetry.errors}), 0)`,
    })
    .from(agentTelemetry)
    .where(
      and(
        eq(agentTelemetry.agentId, agentId),
        gte(agentTelemetry.timestamp, windowStartAt)
      )
    );

  const totalTokensIn    = Number(row?.totalTokensIn ?? 0);
  const totalTokensOut   = Number(row?.totalTokensOut ?? 0);
  const totalInvocations = Number(row?.totalInvocations ?? 0);
  const totalErrors      = Number(row?.totalErrors ?? 0);
  const errorRate        = totalInvocations > 0 ? totalErrors / totalInvocations : 0;
  const avgTokensPerInvocation =
    totalInvocations > 0 ? (totalTokensIn + totalTokensOut) / totalInvocations : 0;

  return {
    totalTokensIn,
    totalTokensOut,
    totalInvocations,
    totalErrors,
    errorRate,
    avgTokensPerInvocation,
    windowStartAt,
    windowEndAt,
  };
}

// ── Operator dispatch table ────────────────────────────────────────────────────

type OperatorResult = {
  passes:        boolean;
  observedValue: number;
  threshold:     number;
  metric:        string;
} | null; // null = operator not applicable to available data; skip silently

type OperatorFn = (
  rule:      RuntimePolicyRule,
  telemetry: TelemetryAggregate,
  abp?:      ABP
) => OperatorResult;

const operatorHandlers = new Map<RuntimeRuleOperator, OperatorFn>([

  ["token_budget_daily", (rule, telemetry) => {
    const threshold = Number(rule.value);
    if (!isFinite(threshold) || threshold <= 0) return null;
    // Normalize to 24h window (telemetry.windowStartAt may span more or less)
    const windowHours =
      (telemetry.windowEndAt.getTime() - telemetry.windowStartAt.getTime()) / 3_600_000;
    const scaleFactor = windowHours > 0 ? 24 / windowHours : 1;
    const observedValue = (telemetry.totalTokensIn + telemetry.totalTokensOut) * scaleFactor;
    return {
      passes:        observedValue <= threshold,
      observedValue: Math.round(observedValue),
      threshold,
      metric:        "tokens_daily",
    };
  }],

  ["token_budget_per_interaction", (rule, telemetry) => {
    const threshold = Number(rule.value);
    if (!isFinite(threshold) || threshold <= 0) return null;
    if (telemetry.totalInvocations === 0) return null; // no data — cannot evaluate
    return {
      passes:        telemetry.avgTokensPerInvocation <= threshold,
      observedValue: Math.round(telemetry.avgTokensPerInvocation),
      threshold,
      metric:        "avg_tokens_per_interaction",
    };
  }],

  ["pii_action", (_rule, _telemetry, _abp) => {
    // Runtime enforcement of PII action (block/redact/log) requires intercepting
    // individual agent invocations at the Foundry layer — deferred to H3.
    // At H2 this operator is registered but always passes so policy authors may
    // document their PII intent without triggering false violations.
    return null;
  }],

  ["scope_constraint", (rule, _telemetry, abp) => {
    if (!abp) return null; // ABP not available — skip silently
    const allowedTools = Array.isArray(rule.value)
      ? (rule.value as string[])
      : typeof rule.value === "string"
      ? (rule.value as string).split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    if (allowedTools.length === 0) return null;

    const agentTools: string[] = (abp.capabilities?.tools ?? [])
      .map((t) => (typeof t === "string" ? t : (t as { name?: string }).name ?? ""))
      .filter(Boolean);

    const outOfScope = agentTools.filter((t) => !allowedTools.includes(t));
    return {
      passes:        outOfScope.length === 0,
      observedValue: outOfScope.length,
      threshold:     0,
      metric:        "out_of_scope_tools",
    };
  }],

  ["circuit_breaker_error_rate", (rule, telemetry) => {
    const threshold = Number(rule.value);
    if (!isFinite(threshold) || threshold < 0 || threshold > 1) return null;
    if (telemetry.totalInvocations === 0) return null; // no invocations — skip
    return {
      passes:        telemetry.errorRate <= threshold,
      observedValue: Number(telemetry.errorRate.toFixed(4)),
      threshold,
      metric:        "error_rate",
    };
  }],

]);

// ── Load runtime policies ──────────────────────────────────────────────────────

async function loadRuntimePolicies(
  enterpriseId: string | null
): Promise<RuntimeGovernancePolicy[]> {
  const enterpriseFilter =
    enterpriseId
      ? or(isNull(governancePolicies.enterpriseId), eq(governancePolicies.enterpriseId, enterpriseId))
      : isNull(governancePolicies.enterpriseId);

  const rows = await db
    .select()
    .from(governancePolicies)
    .where(
      and(
        eq(governancePolicies.type, "runtime"),
        isNull(governancePolicies.supersededAt),
        enterpriseFilter
      )
    );

  return rows.map((row) => ({
    id:           row.id,
    enterpriseId: row.enterpriseId,
    name:         row.name,
    type:         "runtime" as const,
    description:  row.description,
    rules:        (row.rules ?? []) as RuntimePolicyRule[],
  }));
}

// ── Main evaluation function ───────────────────────────────────────────────────

/**
 * Evaluate all active runtime policies for a deployed agent.
 * Inserts violations into `runtimeViolations` for each breached rule.
 *
 * @param agentId      - UUID of the logical agent (matches agentBlueprints.agentId)
 * @param enterpriseId - Tenant scope (null = platform-level)
 * @param abp          - Optional deployed blueprint ABP for scope_constraint evaluation
 * @param windowHours  - Telemetry aggregation window (default: 24h)
 *
 * @returns { violations: number; checked: number }
 */
export async function evaluateRuntimePolicies(
  agentId:      string,
  enterpriseId: string | null,
  abp?:         ABP,
  windowHours   = 24
): Promise<{ violations: number; checked: number }> {
  const policies = await loadRuntimePolicies(enterpriseId);
  if (policies.length === 0) return { violations: 0, checked: 0 };

  const telemetry = await aggregateTelemetry(agentId, windowHours);

  const toInsert: (typeof runtimeViolations.$inferInsert)[] = [];
  let checked = 0;

  for (const policy of policies) {
    for (const rule of policy.rules) {
      checked++;
      const handler = operatorHandlers.get(rule.operator);
      if (!handler) continue;

      const result = handler(rule, telemetry, abp);
      if (result === null) continue; // operator not applicable

      if (!result.passes) {
        toInsert.push({
          agentId,
          enterpriseId,
          policyId:           policy.id,
          policyName:         policy.name,
          ruleId:             rule.id,
          severity:           rule.severity as Severity,
          metric:             result.metric,
          observedValue:      result.observedValue,
          threshold:          result.threshold,
          message:            rule.message,
          telemetryTimestamp: telemetry.windowEndAt,
        });
      }
    }
  }

  if (toInsert.length > 0) {
    await db.insert(runtimeViolations).values(toInsert);

    // ── Alerts for error-severity violations (H2-1.3) ──────────────────────
    // Fire notifications + webhook events for each error-severity violation.
    // Errors only — warnings are surfaced in the UI but don't trigger alerts.
    const errorViolations = toInsert.filter((v) => v.severity === "error");
    if (errorViolations.length > 0) {
      void (async () => {
        try {
          // Resolve blueprint ID + agent name for event/notification payloads
          const blueprint = await db.query.agentBlueprints.findFirst({
            where: (t, { and: _and, eq: _eq }) =>
              _and(_eq(t.agentId, agentId), _eq(t.status, "deployed")),
            orderBy: (t, { desc: d }) => [d(t.createdAt)],
            columns: { id: true, name: true },
          });

          const blueprintId = blueprint?.id ?? agentId;
          const agentName   = blueprint?.name ?? agentId;

          // Load admin + compliance_officer emails for this enterprise
          const recipientRows = await db
            .select({ email: users.email })
            .from(users)
            .where(
              and(
                inArray(users.role, ["admin", "compliance_officer"]),
                enterpriseId
                  ? or(eq(users.enterpriseId, enterpriseId), isNull(users.enterpriseId))
                  : isNull(users.enterpriseId)
              )
            );
          const recipientEmails = recipientRows.map((r) => r.email);

          for (const violation of errorViolations) {
            const title   = `Runtime violation: ${agentName}`;
            const message = `${violation.message} (${violation.metric}: observed ${violation.observedValue}, threshold ${violation.threshold})`;
            const link    = `/registry/${agentId}?tab=violations`;

            // In-app notifications
            for (const email of recipientEmails) {
              void createNotification({
                recipientEmail: email,
                enterpriseId,
                type:           "runtime.violation",
                title,
                message,
                entityType:     "blueprint",
                entityId:       blueprintId,
                link,
              });
            }

            // Webhook event (fire-and-forget)
            void publishEvent({
              event: {
                type: "blueprint.runtime_violation",
                payload: {
                  agentId,
                  blueprintId,
                  agentName,
                  policyId:      violation.policyId,
                  policyName:    violation.policyName,
                  ruleId:        violation.ruleId,
                  severity:      violation.severity,
                  metric:        violation.metric,
                  observedValue: violation.observedValue,
                  threshold:     violation.threshold,
                  message:       violation.message,
                },
              },
              actor:        { email: "system@intellios", role: "system" },
              entity:       { type: "blueprint", id: blueprintId },
              enterpriseId,
            });
          }
        } catch (err) {
          console.error("[runtime-evaluator] Failed to send violation alerts:", err, { agentId });
        }
      })();

      // ── Circuit breaker auto-suspend (H2-1.4) ────────────────────────────
      // If enterprise settings have circuitBreaker.action === "auto_suspend" and
      // the number of error violations meets or exceeds the threshold, suspend the
      // agent. This block runs fire-and-forget — suspension failures are logged but
      // must never block the telemetry ingest response.
      void (async () => {
        try {
          const settings = await getEnterpriseSettings(enterpriseId);
          const cb = settings.governance.circuitBreaker;

          if (errorViolations.length >= cb.errorViolationThreshold) {
            if (cb.action === "auto_suspend") {
              // Find the currently deployed blueprint for this agent
              const deployedBlueprint = await db.query.agentBlueprints.findFirst({
                where: (t, { and: _and, eq: _eq }) =>
                  _and(_eq(t.agentId, agentId), _eq(t.status, "deployed")),
                orderBy: (t, { desc: d }) => [d(t.createdAt)],
                columns: { id: true, name: true, enterpriseId: true },
              });

              if (!deployedBlueprint) return; // already suspended or not deployed

              // Suspend the agent
              await db
                .update(agentBlueprints)
                .set({ status: "suspended", updatedAt: new Date() })
                .where(eq(agentBlueprints.id, deployedBlueprint.id));

              const blueprintId = deployedBlueprint.id;
              const agentName   = deployedBlueprint.name ?? agentId;

              // Audit event
              void publishEvent({
                event: {
                  type: "blueprint.status_changed",
                  payload: {
                    blueprintId,
                    fromStatus: "deployed",
                    toStatus:   "suspended",
                    agentId,
                    agentName,
                    createdBy:  "system",
                  },
                },
                actor:        { email: "system@intellios", role: "system" },
                entity:       { type: "blueprint", id: blueprintId },
                enterpriseId,
              });

              // Notify admin + compliance_officer about the suspension
              const recipientRows = await db
                .select({ email: users.email })
                .from(users)
                .where(
                  and(
                    inArray(users.role, ["admin", "compliance_officer"]),
                    enterpriseId
                      ? or(eq(users.enterpriseId, enterpriseId), isNull(users.enterpriseId))
                      : isNull(users.enterpriseId)
                  )
                );

              const title   = `Agent suspended: ${agentName}`;
              const message = `${agentName} was automatically suspended by the governance circuit breaker after ${errorViolations.length} error-severity runtime violation(s) (threshold: ${cb.errorViolationThreshold}). Administrator action required to resume.`;
              const link    = `/registry/${agentId}?tab=violations`;

              for (const { email } of recipientRows) {
                void createNotification({
                  recipientEmail: email,
                  enterpriseId,
                  type:       "runtime.agent_suspended",
                  title,
                  message,
                  entityType: "blueprint",
                  entityId:   blueprintId,
                  link,
                });
              }

              console.info("[runtime-evaluator] Circuit breaker fired — agent suspended", {
                agentId,
                blueprintId,
                errorViolations: errorViolations.length,
                threshold: cb.errorViolationThreshold,
              });
            }
            // "alert_only" mode: violation alerts (above) are the notification — no suspension.
          }
        } catch (err) {
          console.error("[runtime-evaluator] Circuit breaker evaluation failed:", err, { agentId });
        }
      })();
    }
  }

  return { violations: toInsert.length, checked };
}
