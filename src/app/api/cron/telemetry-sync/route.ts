import { NextRequest, NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/auth/cron-auth";
import { syncAllAgentCoreTelemetry } from "@/lib/telemetry/sync";

/**
 * POST /api/cron/telemetry-sync
 *
 * Scheduled job that pulls CloudWatch metrics for all deployed AgentCore agents
 * and inserts them into `agentTelemetry` with source = 'cloudwatch'.
 *
 * Recommended schedule: every hour via Vercel Cron or an external scheduler.
 *
 * Security: mandatory Bearer token via CRON_SECRET env var.
 */
export async function POST(request: NextRequest) {
  const cronError = requireCronAuth(request);
  if (cronError) return cronError;

  try {
    const result = await syncAllAgentCoreTelemetry();

    return NextResponse.json({
      synced: result.synced,
      errors: result.errors,
      skipped: result.skipped,
      budgetExhausted: result.budgetExhausted,
      durationMs: result.durationMs,
      detail: result.detail,
    });
  } catch (err) {
    console.error("[cron/telemetry-sync] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
