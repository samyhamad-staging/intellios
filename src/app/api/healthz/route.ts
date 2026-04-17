/**
 * GET /api/healthz — platform liveness / readiness probe (ADR-022).
 *
 * Intentionally unauthenticated. Shape is stable for uptime monitors,
 * Kubernetes-style readiness probes, and Vercel's status endpoints.
 *
 * Returns 200 when every critical service is up; 503 when any are down.
 * Redis reporting "fallback" is NOT considered down — the rate limiter has a
 * documented in-memory fallback path.
 *
 * No stack traces, no error messages, no enterprise data ever leave this
 * endpoint. The response surface is deliberately narrow.
 */

import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { isRedisHealthy } from "@/lib/rate-limit";
import { logger, serializeError } from "@/lib/logger";

// Force Node.js runtime — the postgres.js driver used by Drizzle does not
// run on the edge runtime.
export const runtime = "nodejs";

// Never cache — every hit must reflect current state.
export const dynamic = "force-dynamic";

type ServiceStatus = "up" | "down" | "fallback" | "configured" | "not-configured";

interface HealthReport {
  status: "ok" | "degraded";
  version: string;
  uptimeSecs: number;
  services: {
    db: ServiceStatus;
    redis: ServiceStatus;
    bedrock: ServiceStatus;
  };
  checkedAt: string;
}

// 2-second ceiling so the probe never hangs the load balancer.
const DB_PROBE_TIMEOUT_MS = 2_000;

async function checkDb(): Promise<ServiceStatus> {
  try {
    const query = db.execute(sql`select 1 as ok`);
    const result = await Promise.race([
      query,
      new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), DB_PROBE_TIMEOUT_MS)
      ),
    ]);
    return result === null ? "down" : "up";
  } catch (err) {
    // Logged once per failure to aid triage; does not change response shape.
    logger.warn("healthz.db.probe.failed", { err: serializeError(err) });
    return "down";
  }
}

/**
 * Bedrock probe without making a real inference call. A real probe would cost
 * money on every monitor tick; we instead verify the minimum config required
 * for Bedrock to work at all. Follow-up can upgrade to a throttled
 * ListFoundationModels call via the bedrock-runtime client.
 */
function checkBedrock(): ServiceStatus {
  const hasRegion = Boolean(process.env.AWS_REGION);
  const hasCreds =
    Boolean(process.env.AWS_ACCESS_KEY_ID) ||
    Boolean(process.env.AWS_ROLE_ARN) ||
    Boolean(process.env.AWS_WEB_IDENTITY_TOKEN_FILE); // EKS / Vercel integration
  return hasRegion && hasCreds ? "configured" : "not-configured";
}

function shortGitSha(): string {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GIT_COMMIT_SHA;
  return sha ? sha.slice(0, 7) : "local";
}

export async function GET(): Promise<NextResponse> {
  const [dbStatus, redisStatus] = await Promise.all([
    checkDb(),
    isRedisHealthy(),
  ]);
  const bedrockStatus = checkBedrock();

  const anyCriticalDown =
    dbStatus === "down" ||
    redisStatus === "down" ||
    bedrockStatus === "not-configured";

  const body: HealthReport = {
    status: anyCriticalDown ? "degraded" : "ok",
    version: shortGitSha(),
    uptimeSecs: Math.round(process.uptime()),
    services: {
      db: dbStatus,
      redis: redisStatus,
      bedrock: bedrockStatus,
    },
    checkedAt: new Date().toISOString(),
  };

  return NextResponse.json(body, {
    status: anyCriticalDown ? 503 : 200,
    // Tell intermediaries never to cache this.
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
