import { NextResponse } from "next/server";

export interface RateLimitConfig {
  /** Identifier for this limit (e.g. "chat", "generate"). Combined with actorEmail to form the store key. */
  endpoint: string;
  /** Maximum number of requests allowed in the window. */
  max: number;
  /** Window size in milliseconds. Default: 60_000 (1 minute). */
  windowMs?: number;
}

// ── In-memory fallback (single-instance only) ─────────────────────────────────

interface Window {
  timestamps: number[];
  windowMs: number;
  max: number;
}

const _store = new Map<string, Window>();

function rateLimitMemory(
  key: string,
  max: number,
  windowMs: number
): { allowed: boolean; retryAfterSecs?: number } {
  const now = Date.now();
  const cutoff = now - windowMs;

  let entry = _store.get(key);
  if (!entry) {
    entry = { timestamps: [], windowMs, max };
    _store.set(key, entry);
  }

  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

  if (entry.timestamps.length >= max) {
    const retryAfterMs = entry.timestamps[0] + windowMs - now;
    return { allowed: false, retryAfterSecs: Math.ceil(retryAfterMs / 1000) };
  }

  entry.timestamps.push(now);
  return { allowed: true };
}

// ── Redis sliding-window (multi-instance safe) ────────────────────────────────
// Uses a sorted set per key. Each member is a random UUID; the score is the
// request timestamp in ms. Expired members are pruned on every check.
// The key auto-expires after `windowMs` ms so Redis never accumulates stale keys.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _redis: any | null = null;
let _redisInitialized = false;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getRedis(): any | null {
  if (_redisInitialized) return _redis;
  _redisInitialized = true;

  const url = process.env.REDIS_URL;
  if (!url) return null;

  try {
    // Dynamic import keeps ioredis out of the bundle when Redis is not configured.
    // This module is server-only so top-level require is safe.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Redis = require("ioredis");
    _redis = new Redis(url, {
      // Fail fast on connection errors rather than queuing indefinitely.
      lazyConnect: false,
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
    });
    _redis!.on("error", (err: Error) => {
      console.error("[rate-limit] Redis error — falling back to in-memory:", err.message);
      _redis = null;
    });
  } catch (err) {
    console.error("[rate-limit] Failed to create Redis client:", err);
    _redis = null;
  }

  return _redis;
}

async function rateLimitRedis(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  redis: any,
  key: string,
  max: number,
  windowMs: number
): Promise<{ allowed: boolean; retryAfterSecs?: number }> {
  const now = Date.now();
  const cutoff = now - windowMs;
  const member = `${now}:${Math.random().toString(36).slice(2)}`;

  // Lua script: atomic sliding-window check + record
  // Returns [count_after_add, oldest_score_in_window]
  const result = (await redis.eval(
    `
    local key = KEYS[1]
    local now = tonumber(ARGV[1])
    local cutoff = tonumber(ARGV[2])
    local member = ARGV[3]
    local max = tonumber(ARGV[4])
    local ttl = tonumber(ARGV[5])

    -- Remove expired members
    redis.call('ZREMRANGEBYSCORE', key, '-inf', cutoff)

    -- Check current count before adding
    local count = redis.call('ZCARD', key)

    if count >= max then
      -- Over limit — get the oldest timestamp so caller can compute retry-after
      local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
      return {0, tonumber(oldest[2] or now)}
    end

    -- Add this request
    redis.call('ZADD', key, now, member)
    redis.call('PEXPIRE', key, ttl)
    return {1, 0}
    `,
    1,
    key,
    now,
    cutoff,
    member,
    max,
    windowMs
  )) as [number, number];

  const [accepted, oldestScore] = result;

  if (accepted === 0) {
    const retryAfterMs = oldestScore + windowMs - now;
    return { allowed: false, retryAfterSecs: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
  }

  return { allowed: true };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Check and record a request against the rate limit for the given actor.
 * Returns null if the request is allowed, or a 429 NextResponse if denied.
 *
 * Uses Redis sorted-set sliding window when `REDIS_URL` is set (multi-instance
 * safe). Falls back to an in-process Map when Redis is unavailable (local dev).
 */
export async function rateLimit(
  actorEmail: string,
  config: RateLimitConfig
): Promise<NextResponse | null> {
  const { endpoint, max, windowMs = 60_000 } = config;
  const key = `ratelimit:${endpoint}:${actorEmail}`;

  let result: { allowed: boolean; retryAfterSecs?: number };

  const redis = getRedis();
  if (redis) {
    try {
      result = await rateLimitRedis(redis, key, max, windowMs);
    } catch (err) {
      // Redis error during check — fall back to in-memory rather than blocking requests.
      console.error("[rate-limit] Redis check failed, falling back to in-memory:", err);
      result = rateLimitMemory(key, max, windowMs);
    }
  } else {
    result = rateLimitMemory(key, max, windowMs);
  }

  if (!result.allowed) {
    const retryAfterSecs = result.retryAfterSecs ?? 60;
    return NextResponse.json(
      {
        code: "RATE_LIMITED",
        message: `Rate limit exceeded. Maximum ${max} requests per ${windowMs / 1000}s. Retry after ${retryAfterSecs}s.`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSecs) },
      }
    );
  }

  return null;
}
