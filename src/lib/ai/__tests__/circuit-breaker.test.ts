/**
 * Bedrock circuit breaker tests (ADR-023).
 *
 * Exercises the state machine (closed → open → half_open → closed/open),
 * failure classification, per-model isolation, and the public API surface:
 *   - ensureCircuitClosed / recordBreakerSuccess / recordBreakerError
 *   - withBedrockBreaker
 *   - isBreakerFailure
 *   - getBedrockCircuitState
 *
 * Uses vi.useFakeTimers() so we can deterministically advance the sliding
 * window and cooldown clocks without race conditions.
 *
 * Every test starts by calling __resetBreakersForTest() to ensure a clean
 * registry + fresh config cache so env changes take effect.
 */

import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import {
  __resetBreakersForTest,
  CircuitOpenError,
  ensureCircuitClosed,
  getBedrockCircuitState,
  isBreakerFailure,
  recordBreakerError,
  recordBreakerSuccess,
  withBedrockBreaker,
} from "@/lib/ai/circuit-breaker";

const MODEL_A = "test-model-a";
const MODEL_B = "test-model-b";

beforeEach(() => {
  // Tighten the defaults so tests stay snappy. Must be set before any call
  // triggers getConfig() caching.
  process.env.AI_BREAKER_THRESHOLD = "3";
  process.env.AI_BREAKER_WINDOW_MS = "1000";
  process.env.AI_BREAKER_COOLDOWN_MS = "2000";
  process.env.AI_BREAKER_MAX_COOLDOWN_MS = "8000";
  __resetBreakersForTest();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-04-17T00:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
  delete process.env.AI_BREAKER_THRESHOLD;
  delete process.env.AI_BREAKER_WINDOW_MS;
  delete process.env.AI_BREAKER_COOLDOWN_MS;
  delete process.env.AI_BREAKER_MAX_COOLDOWN_MS;
  __resetBreakersForTest();
});

// ── isBreakerFailure ────────────────────────────────────────────────────────

describe("isBreakerFailure", () => {
  it("skips CircuitOpenError", () => {
    const err = new CircuitOpenError(MODEL_A, 1000, Date.now() + 1000);
    expect(isBreakerFailure(err)).toBe(false);
  });

  it("skips 4xx responses (including 429)", () => {
    expect(isBreakerFailure({ status: 400 })).toBe(false);
    expect(isBreakerFailure({ status: 401 })).toBe(false);
    expect(isBreakerFailure({ status: 429 })).toBe(false);
    expect(isBreakerFailure({ statusCode: 403 })).toBe(false);
  });

  it("counts 5xx responses", () => {
    expect(isBreakerFailure({ status: 500 })).toBe(true);
    expect(isBreakerFailure({ status: 502 })).toBe(true);
    expect(isBreakerFailure({ status: 503 })).toBe(true);
    expect(isBreakerFailure({ statusCode: 504 })).toBe(true);
  });

  it("counts timeouts, network errors, and unknown errors", () => {
    expect(isBreakerFailure(new Error("ETIMEDOUT"))).toBe(true);
    expect(isBreakerFailure(new Error("ECONNRESET"))).toBe(true);
    expect(isBreakerFailure("plain string")).toBe(true);
    expect(isBreakerFailure(undefined)).toBe(true);
  });
});

// ── State transitions ───────────────────────────────────────────────────────

describe("state machine: closed → open", () => {
  it("trips after threshold failures in the sliding window", () => {
    // 3 failures (threshold=3) within windowMs=1000 should trip.
    for (let i = 0; i < 3; i++) {
      ensureCircuitClosed(MODEL_A);
      recordBreakerError(MODEL_A, new Error("boom"));
    }

    expect(() => ensureCircuitClosed(MODEL_A)).toThrow(CircuitOpenError);
    const snap = getBedrockCircuitState();
    expect(snap.breakers[MODEL_A].state).toBe("open");
    expect(snap.status).toBe("down"); // only model registered, fully open
  });

  it("does NOT trip when failures are outside the window", () => {
    ensureCircuitClosed(MODEL_A);
    recordBreakerError(MODEL_A, new Error("boom"));

    // Advance past the window so the first failure ages out.
    vi.advanceTimersByTime(1500);

    ensureCircuitClosed(MODEL_A);
    recordBreakerError(MODEL_A, new Error("boom"));
    ensureCircuitClosed(MODEL_A);
    recordBreakerError(MODEL_A, new Error("boom"));

    // Only 2 in-window failures — breaker stays closed.
    expect(() => ensureCircuitClosed(MODEL_A)).not.toThrow();
    expect(getBedrockCircuitState().breakers[MODEL_A].state).toBe("closed");
  });

  it("ignores 4xx toward threshold", () => {
    for (let i = 0; i < 10; i++) {
      ensureCircuitClosed(MODEL_A);
      recordBreakerError(MODEL_A, { status: 429 });
    }
    expect(() => ensureCircuitClosed(MODEL_A)).not.toThrow();
  });
});

describe("state machine: open → half_open → closed", () => {
  function tripBreaker(modelId: string) {
    for (let i = 0; i < 3; i++) {
      ensureCircuitClosed(modelId);
      recordBreakerError(modelId, new Error("boom"));
    }
  }

  it("blocks calls during cooldown", () => {
    tripBreaker(MODEL_A);

    // Cooldown is 2000ms.
    vi.advanceTimersByTime(500);
    expect(() => ensureCircuitClosed(MODEL_A)).toThrow(CircuitOpenError);
  });

  it("transitions to half_open after cooldown and admits one probe", () => {
    tripBreaker(MODEL_A);
    vi.advanceTimersByTime(2500);

    // First caller gets the probe slot.
    expect(() => ensureCircuitClosed(MODEL_A)).not.toThrow();
    // Second caller is blocked (single-flight).
    expect(() => ensureCircuitClosed(MODEL_A)).toThrow(CircuitOpenError);
  });

  it("closes on successful probe", () => {
    tripBreaker(MODEL_A);
    vi.advanceTimersByTime(2500);
    ensureCircuitClosed(MODEL_A); // half_open probe
    recordBreakerSuccess(MODEL_A);

    expect(getBedrockCircuitState().breakers[MODEL_A].state).toBe("closed");
    // Can now call normally.
    expect(() => ensureCircuitClosed(MODEL_A)).not.toThrow();
  });

  it("reopens with doubled cooldown on failed probe", () => {
    tripBreaker(MODEL_A);
    vi.advanceTimersByTime(2500);
    ensureCircuitClosed(MODEL_A); // half_open probe
    recordBreakerError(MODEL_A, new Error("still broken"));

    const snap = getBedrockCircuitState().breakers[MODEL_A];
    expect(snap.state).toBe("open");
    expect(snap.cooldownMs).toBe(4000); // doubled from 2000
  });

  it("caps exponential cooldown at maxCooldownMs", () => {
    // Trip + fail probe repeatedly to drive cooldown toward the cap.
    for (let round = 0; round < 6; round++) {
      // Clear any closed-state failures so the next round trips cleanly.
      // In each round we just need one failed probe — after the first open,
      // subsequent failures are in the half_open path which doubles cooldown.
      if (round === 0) {
        for (let i = 0; i < 3; i++) {
          ensureCircuitClosed(MODEL_A);
          recordBreakerError(MODEL_A, new Error("boom"));
        }
      } else {
        const current = getBedrockCircuitState().breakers[MODEL_A].cooldownMs;
        vi.advanceTimersByTime(current + 100);
        ensureCircuitClosed(MODEL_A);
        recordBreakerError(MODEL_A, new Error("still broken"));
      }
    }

    // Should be capped at 8000.
    expect(getBedrockCircuitState().breakers[MODEL_A].cooldownMs).toBe(8000);
  });

  it("releases probe slot without transition on non-counting error", () => {
    tripBreaker(MODEL_A);
    vi.advanceTimersByTime(2500);
    ensureCircuitClosed(MODEL_A); // half_open probe reserved

    // 4xx does not count — probe slot released, but state stays half_open.
    recordBreakerError(MODEL_A, { status: 400 });
    expect(getBedrockCircuitState().breakers[MODEL_A].state).toBe("half_open");

    // Next caller can probe again.
    expect(() => ensureCircuitClosed(MODEL_A)).not.toThrow();
  });
});

// ── Per-model isolation ─────────────────────────────────────────────────────

describe("per-model isolation", () => {
  it("tripping model A does not affect model B", () => {
    for (let i = 0; i < 3; i++) {
      ensureCircuitClosed(MODEL_A);
      recordBreakerError(MODEL_A, new Error("boom"));
    }

    expect(() => ensureCircuitClosed(MODEL_A)).toThrow(CircuitOpenError);
    expect(() => ensureCircuitClosed(MODEL_B)).not.toThrow();

    const snap = getBedrockCircuitState();
    expect(snap.breakers[MODEL_A].state).toBe("open");
    expect(snap.breakers[MODEL_B].state).toBe("closed");
    // Mixed state rolls up to "degraded" (not "down").
    expect(snap.status).toBe("degraded");
  });
});

// ── withBedrockBreaker ──────────────────────────────────────────────────────

describe("withBedrockBreaker", () => {
  it("returns the result of the wrapped fn on success", async () => {
    const result = await withBedrockBreaker(MODEL_A, async () => 42);
    expect(result).toBe(42);
    expect(getBedrockCircuitState().breakers[MODEL_A].state).toBe("closed");
  });

  it("records error and rethrows on failure", async () => {
    await expect(
      withBedrockBreaker(MODEL_A, async () => {
        throw new Error("bedrock down");
      })
    ).rejects.toThrow("bedrock down");

    // One failure recorded — not yet tripped.
    expect(() => ensureCircuitClosed(MODEL_A)).not.toThrow();
  });

  it("short-circuits with CircuitOpenError once tripped", async () => {
    for (let i = 0; i < 3; i++) {
      await expect(
        withBedrockBreaker(MODEL_A, async () => {
          throw new Error("boom");
        })
      ).rejects.toThrow();
    }

    // 4th call — breaker is open, should reject with CircuitOpenError without
    // invoking fn.
    const fn = vi.fn(async () => "should not be called");
    await expect(withBedrockBreaker(MODEL_A, fn)).rejects.toBeInstanceOf(
      CircuitOpenError
    );
    expect(fn).not.toHaveBeenCalled();
  });
});

// ── getBedrockCircuitState rollup ───────────────────────────────────────────

describe("getBedrockCircuitState rollup", () => {
  it("returns 'up' when no breakers are registered", () => {
    expect(getBedrockCircuitState().status).toBe("up");
  });

  it("returns 'up' when all breakers are closed", () => {
    ensureCircuitClosed(MODEL_A);
    recordBreakerSuccess(MODEL_A);
    ensureCircuitClosed(MODEL_B);
    recordBreakerSuccess(MODEL_B);
    expect(getBedrockCircuitState().status).toBe("up");
  });

  it("returns 'down' when every breaker is open", () => {
    for (let i = 0; i < 3; i++) {
      ensureCircuitClosed(MODEL_A);
      recordBreakerError(MODEL_A, new Error("boom"));
      ensureCircuitClosed(MODEL_B);
      recordBreakerError(MODEL_B, new Error("boom"));
    }
    expect(getBedrockCircuitState().status).toBe("down");
  });

  it("returns 'degraded' on mixed state", () => {
    for (let i = 0; i < 3; i++) {
      ensureCircuitClosed(MODEL_A);
      recordBreakerError(MODEL_A, new Error("boom"));
    }
    ensureCircuitClosed(MODEL_B);
    recordBreakerSuccess(MODEL_B);
    expect(getBedrockCircuitState().status).toBe("degraded");
  });
});

// ── record-without-ensure safety ────────────────────────────────────────────

describe("record functions are safe when no breaker exists", () => {
  it("recordBreakerSuccess is a no-op for unknown model", () => {
    expect(() => recordBreakerSuccess("unregistered")).not.toThrow();
    expect(getBedrockCircuitState().breakers["unregistered"]).toBeUndefined();
  });

  it("recordBreakerError is a no-op for unknown model", () => {
    expect(() =>
      recordBreakerError("unregistered", new Error("boom"))
    ).not.toThrow();
    expect(getBedrockCircuitState().breakers["unregistered"]).toBeUndefined();
  });
});
