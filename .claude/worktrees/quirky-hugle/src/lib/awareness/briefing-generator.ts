/**
 * Phase 28: Daily Intelligence Briefing Generator
 *
 * Assembles metrics context and uses Claude Sonnet to synthesize a structured
 * daily briefing. Upserts to intelligence_briefings (one per enterprise per day).
 * If health is non-nominal, pushes in-app notifications to compliance officers + admin.
 */

import { generateObject } from "ai";
import { z } from "zod";
import { anthropic } from "@ai-sdk/anthropic";
import { db } from "@/lib/db";
import {
  auditLog,
  blueprintQualityScores,
  intelligenceBriefings,
  users,
} from "@/lib/db/schema";
import { and, desc, eq, gte, isNull, or, sql } from "drizzle-orm";
import { createNotification } from "@/lib/notifications/store";
import { getEnterpriseSettings } from "@/lib/settings/get-settings";
import { getRecentSnapshots } from "./metrics-worker";
import type { BriefingResult, BriefingSections, HealthStatus, MetricsSnapshot } from "./types";

/**
 * Generate (or regenerate) the daily intelligence briefing for the given
 * enterprise and date. Upserts by (enterpriseId, briefingDate).
 */
export async function generateDailyBriefing(
  enterpriseId: string | null,
  date: Date = new Date()
): Promise<BriefingResult> {
  const dateStr = date.toISOString().slice(0, 10); // YYYY-MM-DD
  const minus24h = new Date(date.getTime() - 24 * 60 * 60 * 1000);
  const minus7d = new Date(date.getTime() - 7 * 24 * 60 * 60 * 1000);

  // ── Gather metrics context ────────────────────────────────────────────────
  const snapshots = await getRecentSnapshots(enterpriseId, 2);
  const latest = snapshots[0] ?? null;
  const previous = snapshots[1] ?? null;

  // Recent quality scores (last 5)
  const enterpriseQualityFilter = enterpriseId
    ? eq(blueprintQualityScores.enterpriseId, enterpriseId)
    : isNull(blueprintQualityScores.enterpriseId);

  const recentScores = await db
    .select({
      overallScore: blueprintQualityScores.overallScore,
      flags: blueprintQualityScores.flags,
      evaluatedAt: blueprintQualityScores.evaluatedAt,
    })
    .from(blueprintQualityScores)
    .where(and(enterpriseQualityFilter, gte(blueprintQualityScores.evaluatedAt, minus7d)))
    .orderBy(desc(blueprintQualityScores.evaluatedAt))
    .limit(5);

  // 24h audit activity summary
  const enterpriseAuditFilter = enterpriseId
    ? eq(auditLog.enterpriseId, enterpriseId)
    : isNull(auditLog.enterpriseId);

  const recentAuditEvents = await db
    .select({ action: auditLog.action })
    .from(auditLog)
    .where(and(enterpriseAuditFilter, gte(auditLog.createdAt, minus24h)));

  const activitySummary: Record<string, number> = {};
  for (const { action } of recentAuditEvents) {
    activitySummary[action] = (activitySummary[action] ?? 0) + 1;
  }

  // ── Determine health status from latest snapshot ──────────────────────────
  let healthStatus: HealthStatus = "nominal";
  const anomalyMessages: string[] = [];

  if (latest) {
    if (latest.blueprintValidityRate != null && latest.blueprintValidityRate < 0.60) {
      healthStatus = "critical";
      anomalyMessages.push(`Blueprint validity rate critically low: ${(latest.blueprintValidityRate * 100).toFixed(0)}%`);
    } else if (latest.blueprintValidityRate != null && latest.blueprintValidityRate < 0.70) {
      if (healthStatus === "nominal") healthStatus = "attention";
      anomalyMessages.push(`Blueprint validity rate below threshold: ${(latest.blueprintValidityRate * 100).toFixed(0)}%`);
    }
    if (latest.reviewQueueDepth != null && latest.reviewQueueDepth > 10) {
      if (healthStatus === "nominal") healthStatus = "attention";
      anomalyMessages.push(`Review queue depth elevated: ${latest.reviewQueueDepth} items`);
    }
    // Only alert on webhook rate when real deliveries have been attempted
    const hasRealWebhooks = (latest.rawMetrics as Record<string, unknown>)?.hasRealWebhookData === true;
    if (hasRealWebhooks && latest.webhookSuccessRate != null && latest.webhookSuccessRate < 0.80) {
      if (healthStatus === "nominal") healthStatus = "attention";
      anomalyMessages.push(`Webhook delivery rate low: ${(latest.webhookSuccessRate * 100).toFixed(0)}%`);
    }
    if (previous?.qualityIndex != null && latest.qualityIndex != null) {
      const drop = previous.qualityIndex - latest.qualityIndex;
      if (drop > 10) {
        if (healthStatus === "nominal") healthStatus = "attention";
        anomalyMessages.push(`Quality Index dropped ${drop.toFixed(1)} points since last snapshot`);
      }
    }
  }

  // ── Build prompt context object ───────────────────────────────────────────
  // Include delta values for each metric so Claude can reason about trends,
  // not just current state.
  const delta = (curr: number | null | undefined, prev: number | null | undefined) =>
    curr != null && prev != null ? curr - prev : null;

  const fmtDelta = (d: number | null, unit = "") =>
    d == null ? null : `${d >= 0 ? "+" : ""}${d.toFixed(1)}${unit}`;

  const raw = latest?.rawMetrics as Record<string, unknown> | null;

  const metricsContext = {
    date: dateStr,
    // Current values
    qualityIndex: latest?.qualityIndex != null ? latest.qualityIndex.toFixed(1) : null,
    blueprintValidityRate: latest?.blueprintValidityRate != null
      ? (latest.blueprintValidityRate * 100).toFixed(0) + "%"
      : "N/A",
    avgRefinementsPerBlueprint: latest?.avgRefinements != null
      ? latest.avgRefinements.toFixed(1)
      : "N/A",
    reviewQueueDepth: latest?.reviewQueueDepth ?? 0,
    slaComplianceRate: latest?.slaComplianceRate != null
      ? (latest.slaComplianceRate * 100).toFixed(0) + "%"
      : "N/A",
    webhookSuccessRate: latest?.webhookSuccessRate != null
      ? (latest.webhookSuccessRate * 100).toFixed(0) + "%"
      : "N/A — no real webhook deliveries in last 24h",
    webhookFailureBreakdown: (raw?.webhookFailureBreakdown as Record<string, unknown> | null) ?? null,
    activePolicies: latest?.activePolicyCount ?? 0,
    blueprintsGenerated24h: latest?.blueprintsGenerated24h ?? 0,
    blueprintsGenerated48h: (raw?.blueprintsGenerated48h as number | null) ?? null,
    deployedAgentCriticalCount: latest?.violations24h ?? 0,
    avgTimeInReviewHours: (raw?.avgTimeInReviewHours as number | null) ?? null,
    // Deltas vs prior snapshot (null = no prior data)
    deltas: {
      qualityIndex: fmtDelta(delta(latest?.qualityIndex, previous?.qualityIndex)),
      blueprintValidityRate: fmtDelta(
        delta(latest?.blueprintValidityRate, previous?.blueprintValidityRate),
        " pp"
      ),
      slaComplianceRate: fmtDelta(
        delta(latest?.slaComplianceRate, previous?.slaComplianceRate),
        " pp"
      ),
      reviewQueueDepth: fmtDelta(
        delta(latest?.reviewQueueDepth, previous?.reviewQueueDepth)
      ),
    },
    // Blueprint-level quality AI scores (from quality-evaluator.ts, last 7d)
    blueprintQualityScores:
      recentScores.length > 0
        ? {
            count: recentScores.length,
            avgScore: (
              recentScores.reduce(
                (sum, s) => sum + (s.overallScore != null ? parseFloat(s.overallScore) : 0),
                0
              ) / recentScores.length
            ).toFixed(1),
            flaggedIssues: recentScores
              .flatMap((s) => s.flags as string[])
              .filter(Boolean),
          }
        : "No AI quality scores yet (scores generated when blueprints enter review)",
    // Audit activity counts for the last 24h
    activityLast24h: activitySummary,
    // Detected anomalies (already filtered and deduped)
    anomalies: anomalyMessages,
  };

  // ── Generate briefing via Claude ──────────────────────────────────────────
  const briefingSchema = z.object({
    generationQuality: z.string().describe("Quality Index with delta. Blueprint validity rate with delta. Average refinements — interpret whether low or high is good. If AI quality scores exist, state the avg and list any flagged issues. If no AI scores, say why and what triggers them."),
    lifecycle: z.string().describe("Blueprints generated in last 24h and 48h — is volume consistent? Review queue depth with delta. SLA compliance rate with delta. Avg time in review if available. Call out anything that indicates a bottleneck."),
    governance: z.string().describe("Active policy count. Policy events in last 24h. Deployed agents with critical health. Any policy simulations or compliance checks run. Interpret whether governance posture is healthy or at risk."),
    system: z.string().describe("Webhook success rate. If low, use webhookFailureBreakdown to diagnose: name the dominant failing event type, its HTTP status codes. If N/A, explain. Any health checks or test runs. Overall system reliability assessment."),
    attentionRequired: z.array(z.string()).describe("Individual action bullets. Each string is one bullet. Empty array if all metrics within thresholds."),
  });

  const systemPrompt = `You are the Intellios Platform Intelligence analyst. Intellios is an enterprise agent factory — it takes business requirements through an intake interview, generates Agent Blueprint Packages (ABPs), validates them against governance policies, and deploys them.

Your job is to write the founder's daily operational briefing. This is a critical decision-support tool, not a status report. The founder reads it first thing to know: (1) is anything wrong, (2) is quality improving or degrading, (3) what needs attention today.

Rules:
- Use exact numbers from the data. Never invent or estimate metrics.
- ALWAYS report deltas when available — direction matters more than absolute values.
- Be analytical: explain what the numbers mean, not just what they are.
- If a metric is N/A or has no data, say so plainly and explain what would produce that data.
- When something is genuinely good, say so briefly. Spend more words on anything that needs attention.
- Keep each section tight: no filler, no hedging.`;

  const userPrompt = `Generate the daily briefing for ${dateStr}.
Health status: ${healthStatus === "nominal" ? "NOMINAL" : healthStatus === "attention" ? "ATTENTION" : "CRITICAL"}

DATA:
${JSON.stringify(metricsContext, null, 2)}

For attentionRequired: return an empty array if all metrics are within thresholds. Otherwise list each action as a separate string (no leading bullet characters).`;

  let sections: BriefingSections | undefined;
  let content: string;
  try {
    const { object } = await generateObject({
      model: anthropic("claude-sonnet-4-6"),
      schema: briefingSchema,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.2,
    });
    sections = object;
    // Assemble legacy content string for backward compat DB storage
    const attentionText = object.attentionRequired.length > 0
      ? object.attentionRequired.map((b) => `- ${b}`).join("\n")
      : "None. All metrics within thresholds.";
    content = [
      `INTELLIOS DAILY BRIEF — ${dateStr}`,
      `Health: ${healthStatus === "nominal" ? "● NOMINAL" : healthStatus === "attention" ? "⚠ ATTENTION" : "🔴 CRITICAL"}`,
      "",
      "GENERATION QUALITY",
      object.generationQuality,
      "",
      "LIFECYCLE",
      object.lifecycle,
      "",
      "GOVERNANCE",
      object.governance,
      "",
      "SYSTEM",
      object.system,
      "",
      "ATTENTION REQUIRED",
      attentionText,
    ].join("\n");
  } catch (err) {
    console.error("[briefing-generator] Claude call failed:", err);
    // Fallback to a structured plain-text briefing from raw data
    content = buildFallbackBriefing(dateStr, healthStatus, metricsContext, anomalyMessages);
  }

  // ── Upsert to intelligence_briefings (check-then-insert-or-update) ────────
  const metricsSnapshotJson = metricsContext as unknown as Record<string, unknown>;
  const enterpriseFilter = enterpriseId
    ? eq(intelligenceBriefings.enterpriseId, enterpriseId)
    : isNull(intelligenceBriefings.enterpriseId);

  const existing = await db
    .select({ id: intelligenceBriefings.id })
    .from(intelligenceBriefings)
    .where(and(enterpriseFilter, eq(intelligenceBriefings.briefingDate, dateStr)))
    .limit(1);

  let row: typeof intelligenceBriefings.$inferSelect;
  if (existing.length > 0) {
    const [updated] = await db
      .update(intelligenceBriefings)
      .set({ content, healthStatus, generatedAt: sql`now()`, metricsSnapshot: metricsSnapshotJson })
      .where(eq(intelligenceBriefings.id, existing[0].id))
      .returning();
    row = updated;
  } else {
    const [inserted] = await db
      .insert(intelligenceBriefings)
      .values({ enterpriseId: enterpriseId ?? null, briefingDate: dateStr, content, healthStatus, metricsSnapshot: metricsSnapshotJson })
      .returning();
    row = inserted;
  }

  // ── Notify on non-nominal health ──────────────────────────────────────────
  if (healthStatus !== "nominal") {
    await notifyBriefingAvailable(enterpriseId, healthStatus, dateStr, anomalyMessages);
  }

  return {
    id: row.id,
    enterpriseId: row.enterpriseId,
    briefingDate: row.briefingDate,
    content: row.content,
    healthStatus: row.healthStatus as HealthStatus,
    generatedAt: row.generatedAt.toISOString(),
    metricsSnapshot: row.metricsSnapshot as Record<string, unknown>,
    sections,
  };
}

async function notifyBriefingAvailable(
  enterpriseId: string | null,
  healthStatus: HealthStatus,
  dateStr: string,
  anomalies: string[]
): Promise<void> {
  try {
    const enterpriseFilter = enterpriseId
      ? or(eq(users.enterpriseId, enterpriseId), isNull(users.enterpriseId))
      : isNull(users.enterpriseId);

    const recipients = await db
      .select({ email: users.email })
      .from(users)
      .where(
        and(
          enterpriseFilter,
          or(eq(users.role, "compliance_officer"), eq(users.role, "admin"))
        )
      );

    const prefix = healthStatus === "critical" ? "🔴" : "⚠️";
    const title = `${prefix} Daily Brief ${dateStr}: ${healthStatus.toUpperCase()}`;
    const message =
      anomalies.length > 0
        ? `Action required: ${anomalies[0]}${anomalies.length > 1 ? ` (+${anomalies.length - 1} more)` : ""}`
        : "Daily intelligence briefing is ready.";

    for (const { email } of recipients) {
      await createNotification({
        recipientEmail: email,
        enterpriseId,
        type: "awareness.briefing",
        title,
        message,
        entityType: "blueprint",
        entityId: "briefing",
        link: "/monitor/intelligence",
      });
    }

    // Outbound webhook delivery to configured briefing endpoint (e.g. Slack incoming webhook)
    const settings = await getEnterpriseSettings(enterpriseId);
    const webhookUrl = settings.awareness.briefingWebhookUrl;
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "intellios.briefing",
            briefingDate: dateStr,
            healthStatus,
            title,
            summary: message,
            anomalies,
            link: "/monitor/intelligence",
          }),
        });
      } catch (webhookErr) {
        console.error("[briefing-generator] Briefing webhook delivery failed:", webhookErr);
      }
    }
  } catch (err) {
    console.error("[briefing-generator] Failed to send briefing notification:", err);
  }
}

function buildFallbackBriefing(
  dateStr: string,
  healthStatus: HealthStatus,
  metrics: Record<string, unknown>,
  anomalies: string[]
): string {
  const healthLabel =
    healthStatus === "nominal" ? "● NOMINAL" :
    healthStatus === "attention" ? "⚠ ATTENTION" : "🔴 CRITICAL";

  return `INTELLIOS DAILY BRIEF — ${dateStr}
Health: ${healthLabel}

GENERATION QUALITY
Quality Index: ${metrics.qualityIndex ?? "N/A"}. Blueprint validity rate: ${metrics.blueprintValidityRate ?? "N/A"}. Average refinements per blueprint: ${metrics.avgRefinementsPerBlueprint ?? "N/A"}.

LIFECYCLE
${metrics.blueprintsGenerated24h ?? 0} blueprint(s) generated in the last 24 hours. Review queue: ${metrics.reviewQueueDepth ?? 0} items. SLA compliance: ${metrics.slaComplianceRate ?? "N/A"}.

GOVERNANCE
${metrics.activePolicies ?? 0} active governance policies. Deployed agents with critical health in last 24h: ${metrics.deployedAgentCriticalCount ?? 0}.

SYSTEM
Webhook delivery rate: ${metrics.webhookSuccessRate ?? "N/A"}.

ATTENTION REQUIRED
${anomalies.length > 0 ? anomalies.map((a) => `- ${a}`).join("\n") : "None today."}`;
}

/**
 * Get the most recent briefings for an enterprise.
 */
export async function getRecentBriefings(
  enterpriseId: string | null,
  limit = 7
): Promise<BriefingResult[]> {
  const filter = enterpriseId
    ? eq(intelligenceBriefings.enterpriseId, enterpriseId)
    : isNull(intelligenceBriefings.enterpriseId);

  const rows = await db
    .select()
    .from(intelligenceBriefings)
    .where(filter)
    .orderBy(desc(intelligenceBriefings.generatedAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    enterpriseId: row.enterpriseId,
    briefingDate: row.briefingDate,
    content: row.content,
    healthStatus: row.healthStatus as HealthStatus,
    generatedAt: row.generatedAt.toISOString(),
    metricsSnapshot: row.metricsSnapshot as Record<string, unknown>,
  }));
}
