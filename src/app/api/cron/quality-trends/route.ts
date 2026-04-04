/**
 * Quality Trends Cron — H2-2.2.
 *
 * POST /api/cron/quality-trends
 *
 * Computes weekly quality snapshots for every deployed agent and upserts them
 * into the `qualityTrends` table. Also detects quality regressions (production
 * score dropping > 15 points below design-time score) and fires alerts.
 *
 * Recommended schedule: weekly, Sundays at 00:00 UTC.
 *   Vercel cron: "0 0 * * 0"
 *
 * Security: mandatory Bearer token via CRON_SECRET env var.
 * Query param `enterpriseId` scopes the run to a single enterprise (optional).
 */

import { NextRequest, NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/auth/cron-auth";
import { db } from "@/lib/db";
import {
  agentBlueprints,
  agentTelemetry,
  blueprintQualityScores,
  qualityTrends,
  runtimeViolations,
  users,
} from "@/lib/db/schema";
import { and, desc, eq, gte, inArray, isNull, or, sql } from "drizzle-orm";
import { createNotification } from "@/lib/notifications/store";
import { publishEvent } from "@/lib/events/publish";

const WINDOW_DAYS  = 7;   // one week
const REGRESSION_THRESHOLD = 15; // points below design score to trigger alert

/** ISO date string for the start of the current week (Monday). */
function currentWeekStart(): string {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun … 6=Sat
  const diff = day === 0 ? -6 : 1 - day; // offset to Monday
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diff));
  return monday.toISOString().slice(0, 10);
}

interface WeeklyMetrics {
  uptime:              number;
  policyAdherenceRate: number;
  errorRate:           number;
  productionScore:     number;
}

async function computeWeeklyMetrics(agentId: string): Promise<WeeklyMetrics> {
  const windowStart = new Date(Date.now() - WINDOW_DAYS * 86_400_000);

  const [telemetryAgg] = await db
    .select({
      totalInvocations: sql<number>`COALESCE(SUM(${agentTelemetry.invocations}), 0)`,
      totalErrors:       sql<number>`COALESCE(SUM(${agentTelemetry.errors}), 0)`,
      activeDays:        sql<number>`COUNT(DISTINCT DATE(${agentTelemetry.timestamp} AT TIME ZONE 'UTC'))`,
    })
    .from(agentTelemetry)
    .where(and(eq(agentTelemetry.agentId, agentId), gte(agentTelemetry.timestamp, windowStart)));

  const [violationAgg] = await db
    .select({
      violationDays: sql<number>`COUNT(DISTINCT DATE(${runtimeViolations.detectedAt} AT TIME ZONE 'UTC'))`,
    })
    .from(runtimeViolations)
    .where(
      and(
        eq(runtimeViolations.agentId, agentId),
        gte(runtimeViolations.detectedAt, windowStart)
      )
    );

  const totalInvocations = Number(telemetryAgg?.totalInvocations ?? 0);
  const totalErrors       = Number(telemetryAgg?.totalErrors ?? 0);
  const activeDays        = Number(telemetryAgg?.activeDays ?? 0);
  const violationDays     = Number(violationAgg?.violationDays ?? 0);

  const uptime              = activeDays / WINDOW_DAYS;
  const policyAdherenceRate = Math.max(0, (WINDOW_DAYS - violationDays) / WINDOW_DAYS);
  const errorRate           = totalInvocations > 0 ? Math.min(1, totalErrors / totalInvocations) : 0;
  const reliability         = 1 - errorRate;

  const productionScore = Math.round(
    policyAdherenceRate * 50 +
    uptime              * 30 +
    reliability         * 20
  );

  return { uptime, policyAdherenceRate, errorRate, productionScore };
}

export async function POST(request: NextRequest) {
  const cronError = requireCronAuth(request);
  if (cronError) return cronError;

  const { searchParams } = new URL(request.url);
  const filterEnterprise = searchParams.get("enterpriseId") ?? null;

  try {
    const weekStart = currentWeekStart();

    // Load all deployed (+ suspended) agents in scope
    const deployed = await db.query.agentBlueprints.findMany({
      where: (t, { and: _and, inArray: _inArray, eq: _eq, or: _or, isNull: _isNull }) =>
        _and(
          _inArray(t.status, ["deployed", "suspended"]),
          filterEnterprise
            ? _eq(t.enterpriseId, filterEnterprise)
            : undefined
        ),
      columns: {
        id:           true,
        agentId:      true,
        name:         true,
        enterpriseId: true,
      },
    });

    let snapshots = 0;
    let regressions = 0;

    for (const agent of deployed) {
      try {
        // Design-time quality score (latest)
        const latestQuality = await db.query.blueprintQualityScores.findFirst({
          where: (t, { eq: _eq }) => _eq(t.blueprintId, agent.id),
          orderBy: (t, { desc: d }) => [d(t.evaluatedAt)],
          columns: { overallScore: true },
        });

        const designScore = latestQuality?.overallScore
          ? parseFloat(latestQuality.overallScore)
          : null;

        // Production quality metrics for this week
        const metrics = await computeWeeklyMetrics(agent.agentId);

        // Upsert snapshot (ON CONFLICT on the unique index)
        await db
          .insert(qualityTrends)
          .values({
            agentId:             agent.agentId,
            enterpriseId:        agent.enterpriseId,
            weekStart,
            designScore:         designScore ?? undefined,
            productionScore:     metrics.productionScore,
            policyAdherenceRate: metrics.policyAdherenceRate,
          })
          .onConflictDoUpdate({
            target:  [qualityTrends.agentId, qualityTrends.weekStart],
            set:     {
              designScore:         designScore ?? undefined,
              productionScore:     metrics.productionScore,
              policyAdherenceRate: metrics.policyAdherenceRate,
            },
          });

        snapshots++;

        // ── Regression detection ─────────────────────────────────────────────
        // Alert when production score drops > REGRESSION_THRESHOLD below design score.
        if (designScore !== null && (designScore - metrics.productionScore) > REGRESSION_THRESHOLD) {
          regressions++;
          const gap       = Math.round(designScore - metrics.productionScore);
          const agentName = agent.name ?? agent.agentId;
          const link      = `/registry/${agent.agentId}?tab=quality`;

          // Notify admin + compliance_officer
          const recipientRows = await db
            .select({ email: users.email })
            .from(users)
            .where(
              and(
                inArray(users.role, ["admin", "compliance_officer"]),
                agent.enterpriseId
                  ? or(eq(users.enterpriseId, agent.enterpriseId), isNull(users.enterpriseId))
                  : isNull(users.enterpriseId)
              )
            );

          const title   = `Quality regression: ${agentName}`;
          const message = `${agentName} production quality (${metrics.productionScore}/100) is ${gap} points below its design-time score (${Math.round(designScore)}/100). Review the Quality tab for details.`;

          for (const { email } of recipientRows) {
            void createNotification({
              recipientEmail: email,
              enterpriseId:   agent.enterpriseId,
              type:           "quality.regression",
              title,
              message,
              entityType:     "blueprint",
              entityId:       agent.id,
              link,
            });
          }

          // Webhook event
          void publishEvent({
            event: {
              type: "blueprint.quality_regression",
              payload: {
                agentId:         agent.agentId,
                blueprintId:     agent.id,
                agentName,
                designScore:     Math.round(designScore),
                productionScore: metrics.productionScore,
                gap,
                weekStart,
              },
            },
            actor:        { email: "system@intellios", role: "system" },
            entity:       { type: "blueprint", id: agent.id },
            enterpriseId: agent.enterpriseId ?? null,
          });
        }
      } catch (agentErr) {
        console.error("[quality-trends] Failed to snapshot agent:", agent.agentId, agentErr);
      }
    }

    return NextResponse.json({ weekStart, snapshots, regressions });
  } catch (err) {
    console.error("[quality-trends] Cron job failed:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
