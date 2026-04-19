/**
 * Health Check Probes
 *
 * Used by /api/health to verify the system's critical dependencies.
 * Designed for uptime monitors and Vercel health checks.
 *
 * ## Dependency tiers
 *
 *   Critical    — DB (Postgres). A failure here means the application
 *                 cannot serve any meaningful request. The /api/health
 *                 route returns 503 when the DB probe fails.
 *
 *   Degraded    — Redis (rate limiting), Anthropic key (AI features).
 *                 Absence or failure of these degrades functionality
 *                 but does not make the app entirely non-functional.
 *                 The route returns 200 with status "degraded" for these.
 *
 * ## Security
 *
 *   The health endpoint is intentionally unauthenticated — uptime monitors
 *   and Vercel health probes need to reach it without credentials.
 *   It MUST NOT return any tenant data, secrets, or internal config values.
 *   The probes here return only "ok" | "degraded" | "error" strings.
 */

import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { env } from "@/lib/env";

export type ProbeStatus = "ok" | "degraded" | "error";

export interface HealthReport {
  status: "ok" | "degraded" | "error";
  latencyMs: number;
  probes: {
    db: { status: ProbeStatus; latencyMs: number; error?: string };
    redis: { status: ProbeStatus; latencyMs: number; error?: string };
    anthropic: { status: ProbeStatus };
  };
  timestamp: string;
}

// ── DB probe ─────────────────────────────────────────────────────────────────

async function probeDb(): Promise<{ status: ProbeStatus; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
    return { status: "ok", latencyMs: Date.now() - start };
  } catch (err) {
    return {
      status: "error",
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : "unknown error",
    };
  }
}

// ── Redis probe ───────────────────────────────────────────────────────────────

// Thin interface so tests can inject a fake without fighting require() mocking.
export interface RedisClient {
  connect(): Promise<void>;
  ping(): Promise<string>;
  quit(): Promise<void>;
}

/**
 * Create a real ioredis client for the production path.
 * Exported so tests can swap it out via the `redisFactory` param of
 * `runHealthChecks`.
 */
export function defaultRedisFactory(url: string): RedisClient {
  // Dynamic import keeps ioredis out of the bundle when Redis is not configured.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Redis = require("ioredis");
  return new Redis(url, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    connectTimeout: 3000,
    enableReadyCheck: false,
  });
}

async function probeRedis(
  redisUrl: string | undefined,
  factory: (url: string) => RedisClient
): Promise<{ status: ProbeStatus; latencyMs: number; error?: string }> {
  const start = Date.now();

  if (!redisUrl) {
    return { status: "degraded", latencyMs: 0, error: "REDIS_URL not configured" };
  }

  try {
    const client = factory(redisUrl);
    await client.connect();
    await client.ping();
    await client.quit();
    return { status: "ok", latencyMs: Date.now() - start };
  } catch (err) {
    return {
      status: "degraded",
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : "unknown error",
    };
  }
}

// ── Anthropic probe ───────────────────────────────────────────────────────────
// We do NOT make a live API call — that would be slow and waste tokens.
// Presence of a correctly-formatted key is sufficient for a health check;
// actual AI functionality is tested by integration/e2e tests.

function probeAnthropic(): { status: ProbeStatus } {
  const key = env.ANTHROPIC_API_KEY;
  if (key && key.startsWith("sk-ant-") && key.length > 20) {
    return { status: "ok" };
  }
  return { status: "degraded" };
}

// ── Aggregate ─────────────────────────────────────────────────────────────────

/**
 * Run all health probes concurrently and return an aggregated report.
 *
 * The overall status is:
 *   "error"    — DB probe failed (critical dependency)
 *   "degraded" — Redis or Anthropic probe degraded
 *   "ok"       — all probes healthy
 *
 * @param redisFactory — optional override for the Redis client constructor.
 *   Defaults to {@link defaultRedisFactory}. Pass a stub in tests to avoid
 *   requiring a real Redis connection.
 */
export async function runHealthChecks(
  redisFactory: (url: string) => RedisClient = defaultRedisFactory
): Promise<HealthReport> {
  const start = Date.now();

  const [dbResult, redisResult] = await Promise.all([
    probeDb(),
    probeRedis(env.REDIS_URL, redisFactory),
  ]);
  const anthropicResult = probeAnthropic();

  let overallStatus: ProbeStatus = "ok";
  if (dbResult.status === "error") {
    overallStatus = "error";
  } else if (
    redisResult.status !== "ok" ||
    anthropicResult.status !== "ok"
  ) {
    overallStatus = "degraded";
  }

  return {
    status: overallStatus,
    latencyMs: Date.now() - start,
    probes: {
      db: dbResult,
      redis: redisResult,
      anthropic: anthropicResult,
    },
    timestamp: new Date().toISOString(),
  };
}
