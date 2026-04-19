import { NextRequest, NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/auth/cron-auth";
import { checkAndFireAlerts } from "@/lib/telemetry/alerts";

/**
 * GET /api/cron/alert-check
 *
 * Evaluates all configured alert thresholds for every deployed agent and fires
 * notifications + events for any breached thresholds.
 *
 * Schedule: daily via Vercel Cron (see `vercel.json`). Vercel Crons invoke
 * scheduled paths as GET — this handler must export GET, not POST, to match
 * the dispatch method (sibling cron routes do the same).
 *
 * Security: mandatory Bearer token via CRON_SECRET env var.
 * Query param `enterpriseId` scopes the check to a single enterprise (optional).
 */
export async function GET(request: NextRequest) {
  const cronError = requireCronAuth(request);
  if (cronError) return cronError;

  const { searchParams } = new URL(request.url);
  const enterpriseId = searchParams.get("enterpriseId") ?? null;

  try {
    const result = await checkAndFireAlerts(enterpriseId);
    return NextResponse.json({
      checked: result.checked,
      breached: result.breached,
      failed: result.failed,
      skipped: result.skipped,
      budgetExhausted: result.budgetExhausted,
      durationMs: result.durationMs,
    });
  } catch (err) {
    console.error("[cron/alert-check] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
