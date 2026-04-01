import { NextRequest, NextResponse } from "next/server";
import { checkAndFireAlerts } from "@/lib/telemetry/alerts";

/**
 * POST /api/cron/alert-check
 *
 * Evaluates all configured alert thresholds for every deployed agent and fires
 * notifications + events for any breached thresholds.
 *
 * Recommended schedule: every 15 minutes via Vercel Cron or external scheduler.
 *
 * Security: optional Bearer token via CRON_SECRET env var.
 * Query param `enterpriseId` scopes the check to a single enterprise (optional).
 */
export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const { searchParams } = new URL(request.url);
  const enterpriseId = searchParams.get("enterpriseId") ?? null;

  try {
    const result = await checkAndFireAlerts(enterpriseId);
    return NextResponse.json({ checked: result.checked, breached: result.breached });
  } catch (err) {
    console.error("[cron/alert-check] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
