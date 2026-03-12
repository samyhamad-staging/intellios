import { NextResponse } from "next/server";

interface Window {
  timestamps: number[];
  windowMs: number;
  max: number;
}

// In-memory store. Key: `${email}:${endpoint}`.
// Entries are lazily evicted when the window is checked.
const store = new Map<string, Window>();

export interface RateLimitConfig {
  /** Identifier for this limit (e.g. "chat", "generate"). Combined with actorEmail to form the store key. */
  endpoint: string;
  /** Maximum number of requests allowed in the window. */
  max: number;
  /** Window size in milliseconds. Default: 60_000 (1 minute). */
  windowMs?: number;
}

/**
 * Check and record a request against the rate limit for the given actor.
 * Returns null if the request is allowed, or a 429 NextResponse if it is denied.
 *
 * Uses a sliding-window algorithm: only requests within the last `windowMs` ms count.
 */
export function rateLimit(
  actorEmail: string,
  config: RateLimitConfig
): NextResponse | null {
  const { endpoint, max, windowMs = 60_000 } = config;
  const key = `${actorEmail}:${endpoint}`;
  const now = Date.now();
  const cutoff = now - windowMs;

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [], windowMs, max };
    store.set(key, entry);
  }

  // Evict timestamps outside the current window
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

  if (entry.timestamps.length >= max) {
    const oldestInWindow = entry.timestamps[0];
    const retryAfterMs = oldestInWindow + windowMs - now;
    const retryAfterSecs = Math.ceil(retryAfterMs / 1000);

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

  entry.timestamps.push(now);
  return null;
}
