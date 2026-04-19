import { NextRequest, NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/auth/cron-auth";
import { syncAllAgentCoreTelemetry } from "@/lib/telemetry/sync";

/**
 * GET /api/cron/telemetry-sync
 *
 * Scheduled job that pulls CloudWatch metrics for all deployed AgentCore agents
 * and inserts them into `agentTelemetry` with source = 'cloudwatch'.
 *
 * Schedule: hourly via Vercel Cron (see `vercel.json`). Vercel Crons invoke
 * scheduled paths as GET — this handler must export GET, not POST, to match
 * the dispatch method (sibling cron routes do the same).
 *
 * Security: mandatory Bearer token via CRON_SECRET env var.
 */
export async function GET(request: NextRequest) {
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
