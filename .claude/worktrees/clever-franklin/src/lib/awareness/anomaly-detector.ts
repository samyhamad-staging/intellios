/**
 * Phase 28: Anomaly Detector
 *
 * Checks metric thresholds after each snapshot write. For each crossed
 * threshold, pushes an in-app notification to compliance officers and
 * the configured admin email — unless the same anomaly already fired
 * within the last 24 hours (deduplication).
 */

import { db } from "@/lib/db";
import { notifications, users } from "@/lib/db/schema";
import { and, desc, eq, gte, isNull, or } from "drizzle-orm";
import { createNotification } from "@/lib/notifications/store";
import { getEnterpriseSettings } from "@/lib/settings/get-settings";
import type { AnomalySignal, MetricsSnapshot } from "./types";

/**
 * Detect anomalies by comparing the given snapshot against configured
 * thresholds and the previous snapshot. Fires notifications for new signals.
 * Returns the list of detected anomalies (including already-deduped ones).
 */
export async function detectAnomalies(
  snapshot: MetricsSnapshot,
  previousSnapshot: MetricsSnapshot | null
): Promise<AnomalySignal[]> {
  const settings = await getEnterpriseSettings(snapshot.enterpriseId);
  const thresholds = settings.awareness.alertThresholds;
  const signals: AnomalySignal[] = [];

  // ── 1. Blueprint validity rate ────────────────────────────────────────────
  if (
    snapshot.blueprintValidityRate != null &&
    snapshot.blueprintValidityRate < thresholds.validityRateMin
  ) {
    signals.push({
      metric: "blueprint_validity_rate",
      value: snapshot.blueprintValidityRate,
      threshold: thresholds.validityRateMin,
      severity: "attention",
      message: `Blueprint validity rate is ${(snapshot.blueprintValidityRate * 100).toFixed(0)}% (threshold: ${(thresholds.validityRateMin * 100).toFixed(0)}%)`,
    });
  }

  // ── 2. Quality index drop (vs. previous snapshot) ─────────────────────────
  if (
    snapshot.qualityIndex != null &&
    previousSnapshot?.qualityIndex != null &&
    previousSnapshot.qualityIndex - snapshot.qualityIndex > thresholds.qualityIndexDrop
  ) {
    const drop = previousSnapshot.qualityIndex - snapshot.qualityIndex;
    signals.push({
      metric: "quality_index_drop",
      value: snapshot.qualityIndex,
      threshold: thresholds.qualityIndexDrop,
      severity: "attention",
      message: `Quality Index dropped ${drop.toFixed(1)} points (from ${previousSnapshot.qualityIndex.toFixed(1)} to ${snapshot.qualityIndex.toFixed(1)})`,
    });
  }

  // ── 3. Webhook success rate (real deliveries only) ───────────────────────
  // Only fire if real (non-test) webhook deliveries occurred. The rawMetrics
  // hasRealWebhookData flag distinguishes "0 real deliveries" from "deliveries failed".
  const hasRealWebhooks =
    (snapshot.rawMetrics as Record<string, unknown>)?.hasRealWebhookData === true;
  if (
    hasRealWebhooks &&
    snapshot.webhookSuccessRate != null &&
    snapshot.webhookSuccessRate < thresholds.webhookSuccessRateMin
  ) {
    signals.push({
      metric: "webhook_success_rate",
      value: snapshot.webhookSuccessRate,
      threshold: thresholds.webhookSuccessRateMin,
      severity: "attention",
      message: `Webhook delivery rate is ${(snapshot.webhookSuccessRate * 100).toFixed(0)}% (threshold: ${(thresholds.webhookSuccessRateMin * 100).toFixed(0)}%)`,
    });
  }

  // ── 4. Review queue depth ─────────────────────────────────────────────────
  if (
    snapshot.reviewQueueDepth != null &&
    snapshot.reviewQueueDepth > thresholds.reviewQueueMax
  ) {
    signals.push({
      metric: "review_queue_depth",
      value: snapshot.reviewQueueDepth,
      threshold: thresholds.reviewQueueMax,
      severity: "attention",
      message: `Review queue has ${snapshot.reviewQueueDepth} items (threshold: ${thresholds.reviewQueueMax})`,
    });
  }

  // ── 5. Quality Index absolute floor ──────────────────────────────────────
  // The "drop" check (signal 2) catches sudden degradation. This catches a
  // sustained low quality state even without a recent drop.
  if (snapshot.qualityIndex != null && snapshot.qualityIndex < 70) {
    signals.push({
      metric: "quality_index_low",
      value: snapshot.qualityIndex,
      threshold: 70,
      severity: snapshot.qualityIndex < 55 ? "critical" : "attention",
      message: `Quality Index is ${snapshot.qualityIndex.toFixed(1)}/100 — below the 70-point floor`,
    });
  }

  // ── 6. Critical deployed agents ───────────────────────────────────────────
  if (snapshot.violations24h != null && snapshot.violations24h > 0) {
    signals.push({
      metric: "deployed_agents_critical",
      value: snapshot.violations24h,
      threshold: 0,
      severity: "critical",
      message: `${snapshot.violations24h} deployed agent${snapshot.violations24h > 1 ? "s" : ""} reported critical health in the last 24h`,
    });
  }

  // ── Dispatch notifications for new signals ────────────────────────────────
  for (const signal of signals) {
    await maybeSendAnomalyNotification(signal, snapshot);
  }

  return signals;
}

async function maybeSendAnomalyNotification(
  signal: AnomalySignal,
  snapshot: MetricsSnapshot
): Promise<void> {
  try {
    const minus24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const dedupeTitle = `awareness.anomaly.${signal.metric}`;

    // Deduplication: skip if same metric notification fired in last 24h
    const existing = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.type, dedupeTitle),
          gte(notifications.createdAt, minus24h),
          snapshot.enterpriseId
            ? eq(notifications.enterpriseId, snapshot.enterpriseId)
            : isNull(notifications.enterpriseId)
        )
      )
      .limit(1);

    if (existing.length > 0) return; // already fired

    // Recipients: compliance officers + admins in enterprise scope
    const enterpriseFilter = snapshot.enterpriseId
      ? or(eq(users.enterpriseId, snapshot.enterpriseId), isNull(users.enterpriseId))
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

    const severityPrefix = signal.severity === "critical" ? "🔴" : "⚠️";
    const title = `${severityPrefix} Platform Alert: ${signal.message}`;

    for (const { email } of recipients) {
      await createNotification({
        recipientEmail: email,
        enterpriseId: snapshot.enterpriseId,
        type: dedupeTitle,
        title,
        message: signal.message,
        entityType: "blueprint",
        entityId: snapshot.id,
        link: "/monitor/intelligence",
      });
    }
  } catch (err) {
    console.error("[anomaly-detector] Failed to send anomaly notification:", err, signal);
  }
}

/**
 * Get the snapshot immediately preceding the given snapshot (by time).
 * Returns null if no prior snapshot exists.
 */
export async function getPreviousSnapshot(
  current: MetricsSnapshot
): Promise<MetricsSnapshot | null> {
  const { systemHealthSnapshots } = await import("@/lib/db/schema");
  const { sql } = await import("drizzle-orm");

  const filter = current.enterpriseId
    ? eq(systemHealthSnapshots.enterpriseId, current.enterpriseId)
    : isNull(systemHealthSnapshots.enterpriseId);

  const rows = await db
    .select()
    .from(systemHealthSnapshots)
    .where(filter)
    .orderBy(desc(systemHealthSnapshots.snapshotAt))
    .limit(2);

  // rows[0] is the current snapshot (just written), rows[1] is the prior one
  const prior = rows.find((r) => r.id !== current.id);
  if (!prior) return null;

  void sql; // suppress unused import warning

  return {
    id: prior.id,
    enterpriseId: prior.enterpriseId,
    snapshotAt: prior.snapshotAt.toISOString(),
    qualityIndex: prior.qualityIndex != null ? parseFloat(prior.qualityIndex) : null,
    blueprintValidityRate: prior.blueprintValidityRate != null ? parseFloat(prior.blueprintValidityRate) : null,
    avgRefinements: prior.avgRefinements != null ? parseFloat(prior.avgRefinements) : null,
    reviewQueueDepth: prior.reviewQueueDepth,
    slaComplianceRate: prior.slaComplianceRate != null ? parseFloat(prior.slaComplianceRate) : null,
    webhookSuccessRate: prior.webhookSuccessRate != null ? parseFloat(prior.webhookSuccessRate) : null,
    activePolicyCount: prior.activePolicyCount,
    blueprintsGenerated24h: prior.blueprintsGenerated24h,
    violations24h: prior.violations24h,
    rawMetrics: prior.rawMetrics as Record<string, unknown>,
  };
}
