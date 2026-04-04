import { NextRequest, NextResponse } from "next/server";
import { syncAllAgentCoreTelemetry } from "@/lib/telemetry/sync";

/**
 * POST /api/cron/telemetry-sync
 *
 * Scheduled job that pulls CloudWatch metrics for all deployed AgentCore agents
 * and inserts them into `agentTelemetry` with source = 'cloudwatch'.
 *
 * Recommended schedule: every hour via Vercel Cron or an external scheduler.
 *
 * Security: optional Bearer token via CRON_SECRET env var.
 * If CRON_SECRET is not set, the endpoint is open (dev/staging only).
 * Set it in production.
 */
export async function POST(request: NextRequest) {
  // Optional bearer auth — same pattern as /api/cron/review-reminders
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await syncAllAgentCoreTelemetry();

    return NextResponse.json({
      synced: result.synced,
      errors: result.errors,
      detail: result.detail,
    });
  } catch (err) {
    console.error("[cron/telemetry-sync] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
