/**
 * GET /api/health
 *
 * Liveness and dependency health check. Used by:
 *   - Vercel uptime monitoring
 *   - External uptime probes (UptimeRobot, Datadog synthetics, etc.)
 *   - Incident response — first thing to check when something is wrong
 *   - The CI deployment gate (future: once a staging URL exists)
 *
 * ## Response
 *
 *   200 OK       — all critical dependencies healthy (DB reachable).
 *                  Optional services (Redis, Anthropic key) may be degraded.
 *   503 Service  — DB is unreachable. The application cannot serve requests.
 *                  Unavailable
 *
 * ## Security
 *
 *   Intentionally unauthenticated — uptime probes need to reach this endpoint
 *   without credentials. MUST NOT expose tenant data, secrets, or internal
 *   configuration. Probe results are limited to status strings and latencies.
 *
 * ## Example responses
 *
 *   All healthy:
 *   {
 *     "status": "ok",
 *     "latencyMs": 12,
 *     "probes": {
 *       "db":        { "status": "ok",       "latencyMs": 8 },
 *       "redis":     { "status": "ok",       "latencyMs": 3 },
 *       "anthropic": { "status": "ok" }
 *     },
 *     "timestamp": "2026-04-16T20:00:00.000Z"
 *   }
 *
 *   DB down (returns 503):
 *   {
 *     "status": "error",
 *     "probes": {
 *       "db": { "status": "error", "latencyMs": 5001, "error": "Connection refused" },
 *       ...
 *     }
 *   }
 */

import { NextResponse } from "next/server";
import { runHealthChecks } from "@/lib/health";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic"; // Never cache — always run live probes.
export const runtime = "nodejs";        // Needs native postgres/ioredis modules.

export async function GET() {
  try {
    const report = await runHealthChecks();

    const status = report.status === "error" ? 503 : 200;

    if (report.status === "error") {
      logger.error("health.check.failed", { probes: report.probes });
    } else if (report.status === "degraded") {
      logger.warn("health.check.degraded", { probes: report.probes });
    }

    return NextResponse.json(report, { status });
  } catch (err) {
    // Catch-all: if runHealthChecks itself throws (shouldn't happen — it
    // catches internally) return a minimal 503 so the probe still gets
    // a meaningful response.
    logger.error("health.check.exception", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      {
        status: "error",
        latencyMs: 0,
        probes: {
          db:        { status: "error", latencyMs: 0, error: "health check threw unexpectedly" },
          redis:     { status: "error", latencyMs: 0 },
          anthropic: { status: "error" },
        },
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
