import { describe, it, expect } from "vitest";
import {
  BACKOFF_SCHEDULE_MS,
  JITTER_MAX,
  JITTER_MIN,
  classifyError,
  isRetryable,
  nextBackoffMs,
  type ErrorClass,
} from "../backoff";

describe("BACKOFF_SCHEDULE_MS", () => {
  it("is monotonically increasing", () => {
    for (let i = 1; i < BACKOFF_SCHEDULE_MS.length; i++) {
      expect(BACKOFF_SCHEDULE_MS[i]).toBeGreaterThan(BACKOFF_SCHEDULE_MS[i - 1]);
    }
  });

  it("has exactly 6 entries (1 inline + 6 scheduled = 7 total attempts)", () => {
    expect(BACKOFF_SCHEDULE_MS).toHaveLength(6);
  });

  it("terminal step is 24 hours", () => {
    expect(BACKOFF_SCHEDULE_MS[BACKOFF_SCHEDULE_MS.length - 1]).toBe(24 * 3_600_000);
  });

  it("total window before DLQ (no jitter) is ~35h 36m", () => {
    const total = BACKOFF_SCHEDULE_MS.reduce((a, b) => a + b, 0);
    // 60 + 300 + 1800 + 7200 + 28800 + 86400 seconds = 124,560s = 34h 36m
    // Plus up to 20% jitter on each step = ~41h worst case. Sanity: between 30h and 42h.
    expect(total).toBeGreaterThanOrEqual(30 * 3_600_000);
    expect(total).toBeLessThanOrEqual(42 * 3_600_000);
  });
});

describe("nextBackoffMs", () => {
  // Deterministic rand = 0.5 → jitter factor = 1.0 (midpoint)
  const RAND_MID = () => 0.5;
  const RAND_MIN = () => 0.0; // → 0.8x
  const RAND_MAX = () => 1.0 - 1e-9; // → ~1.2x

  it("returns first schedule entry after the inline attempt", () => {
    expect(nextBackoffMs(1, 7, RAND_MID)).toBe(60_000);
  });

  it("returns second schedule entry after the first retry", () => {
    expect(nextBackoffMs(2, 7, RAND_MID)).toBe(5 * 60_000);
  });

  it("returns null when attempts >= maxAttempts (DLQ signal)", () => {
    expect(nextBackoffMs(7, 7, RAND_MID)).toBeNull();
    expect(nextBackoffMs(8, 7, RAND_MID)).toBeNull();
  });

  it("applies minimum jitter factor (0.8x)", () => {
    expect(nextBackoffMs(1, 7, RAND_MIN)).toBe(Math.round(60_000 * JITTER_MIN));
  });

  it("applies maximum jitter factor (~1.2x)", () => {
    const result = nextBackoffMs(1, 7, RAND_MAX)!;
    expect(result).toBeGreaterThan(60_000 * 1.19);
    expect(result).toBeLessThanOrEqual(Math.round(60_000 * JITTER_MAX));
  });

  it("jitter produces variation across calls", () => {
    const results = new Set<number>();
    for (let i = 0; i < 50; i++) results.add(nextBackoffMs(1, 7, Math.random)!);
    // With 50 samples over a continuous [48_000, 72_000] range, we expect
    // dozens of distinct values — certainly more than one.
    expect(results.size).toBeGreaterThan(10);
  });

  it("clamps to final schedule entry when attempts exceeds schedule length", () => {
    // maxAttempts bumped to 12 for a known-flaky subscriber — attempts 7..11
    // should still schedule using the final step, not crash.
    const result = nextBackoffMs(9, 12, RAND_MID);
    expect(result).toBe(BACKOFF_SCHEDULE_MS[BACKOFF_SCHEDULE_MS.length - 1]);
  });

  it("handles completedAttempts=0 defensively (shouldn't happen but doesn't crash)", () => {
    // If somehow called with 0, fall back to first schedule entry.
    expect(nextBackoffMs(0, 7, RAND_MID)).toBe(60_000);
  });
});

describe("classifyError", () => {
  it("classifies 500 as http_5xx", () => {
    expect(classifyError({ response: { status: 500 } })).toBe("http_5xx");
  });

  it("classifies 503 as http_5xx", () => {
    expect(classifyError({ response: { status: 503 } })).toBe("http_5xx");
  });

  it("classifies 400 as http_4xx", () => {
    expect(classifyError({ response: { status: 400 } })).toBe("http_4xx");
  });

  it("classifies 404 as http_4xx", () => {
    expect(classifyError({ response: { status: 404 } })).toBe("http_4xx");
  });

  it("classifies 429 as http_4xx (status-range; retryability decided elsewhere)", () => {
    // classifyError reports the *class*; isRetryable handles the 429 exception.
    expect(classifyError({ response: { status: 429 } })).toBe("http_4xx");
  });

  it("classifies 408 as http_4xx", () => {
    expect(classifyError({ response: { status: 408 } })).toBe("http_4xx");
  });

  it("classifies TimeoutError as timeout", () => {
    const err = new Error("abort");
    err.name = "TimeoutError";
    expect(classifyError({ error: err })).toBe("timeout");
  });

  it("classifies AbortError as timeout", () => {
    const err = new Error("abort");
    err.name = "AbortError";
    expect(classifyError({ error: err })).toBe("timeout");
  });

  it("classifies DOMException-style cause as timeout", () => {
    const inner = new Error("inner abort");
    inner.name = "TimeoutError";
    const outer = new Error("fetch failed") as Error & { cause?: unknown };
    outer.cause = inner;
    expect(classifyError({ error: outer })).toBe("timeout");
  });

  it("classifies generic error as network", () => {
    expect(classifyError({ error: new Error("ECONNREFUSED") })).toBe("network");
  });

  it("classifies unknown/null error as network", () => {
    expect(classifyError({ error: null })).toBe("network");
    expect(classifyError({ error: "a string, somehow" })).toBe("network");
  });
});

describe("isRetryable", () => {
  it("network is retryable", () => {
    expect(isRetryable("network")).toBe(true);
  });

  it("timeout is retryable", () => {
    expect(isRetryable("timeout")).toBe(true);
  });

  it("http_5xx is retryable", () => {
    expect(isRetryable("http_5xx")).toBe(true);
  });

  it("http_4xx is non-retryable by default", () => {
    expect(isRetryable("http_4xx", 400)).toBe(false);
    expect(isRetryable("http_4xx", 401)).toBe(false);
    expect(isRetryable("http_4xx", 403)).toBe(false);
    expect(isRetryable("http_4xx", 404)).toBe(false);
    expect(isRetryable("http_4xx", 410)).toBe(false);
  });

  it("http_4xx 408 is retryable (Request Timeout exception)", () => {
    expect(isRetryable("http_4xx", 408)).toBe(true);
  });

  it("http_4xx 429 is retryable (Too Many Requests exception)", () => {
    expect(isRetryable("http_4xx", 429)).toBe(true);
  });

  it("http_4xx without status is non-retryable", () => {
    expect(isRetryable("http_4xx")).toBe(false);
    expect(isRetryable("http_4xx", null)).toBe(false);
  });

  it("webhook_inactive is non-retryable (no point hitting a deactivated endpoint)", () => {
    expect(isRetryable("webhook_inactive")).toBe(false);
  });

  it("unknown class falls through to non-retryable", () => {
    expect(isRetryable("something-else" as ErrorClass)).toBe(false);
  });
});
