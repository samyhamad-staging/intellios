/**
 * Bedrock circuit breaker (ADR-023).
 *
 * Protects against *sustained* Bedrock degradation. The retry wrapper in
 * `resilient-generate.ts` handles single-request transient failures; this
 * breaker handles the case where transience becomes the new normal.
 *
 * State machine: closed → (threshold failures in window) → open → (cooldown)
 *                → half_open → (success) → closed
 *                                       ↘ (failure) → open (cooldown ×2)
 *
 * Per-model scope: sonnet and haiku have independent breakers so a partial
 * Bedrock outage does not over-block. Keyed by the resolved model ID string.
 *
 * In-memory per process. No Redis, no cross-instance state. See ADR-023 for
 * the reliability-control-vs-consensus trade-off.
 */

import { logger } from "@/lib/logger";

export type BreakerState = "closed" | "open" | "half_open";

/** Thrown when a call is rejected because the breaker for the given model is open. */
export class CircuitOpenError extends Error {
  readonly code = "CIRCUIT_OPEN" as const;
  constructor(
    public readonly modelId: string,
    public readonly retryAfterMs: number,
    public readonly nextProbeAt: number
  ) {
    super(`Bedrock circuit open for ${modelId}; retry after ${retryAfterMs}ms`);
    this.name = "CircuitOpenError";
  }
}

interface BreakerConfig {
  threshold: number;
  windowMs: number;
  initialCooldownMs: number;
  maxCooldownMs: number;
}

interface BreakerInternal {
  state: BreakerState;
  failures: number[]; // timestamps of in-window failures
  openedAt: number | null;
  cooldownMs: number;
  nextProbeAt: number;
  probeInFlight: boolean; // half-open single-flight guard
}

const DEFAULT_THRESHOLD = 5;
const DEFAULT_WINDOW_MS = 30_000;
const DEFAULT_COOLDOWN_MS = 60_000;
const DEFAULT_MAX_COOLDOWN_MS = 300_000;
const BLOCKED_LOG_SAMPLE_RATE = 20;

let cachedConfig: BreakerConfig | null = null;
function getConfig(): BreakerConfig {
  if (!cachedConfig) {
    cachedConfig = {
      threshold:         Number(process.env.AI_BREAKER_THRESHOLD ?? DEFAULT_THRESHOLD),
      windowMs:          Number(process.env.AI_BREAKER_WINDOW_MS ?? DEFAULT_WINDOW_MS),
      initialCooldownMs: Number(process.env.AI_BREAKER_COOLDOWN_MS ?? DEFAULT_COOLDOWN_MS),
      maxCooldownMs:     Number(process.env.AI_BREAKER_MAX_COOLDOWN_MS ?? DEFAULT_MAX_COOLDOWN_MS),
    };
  }
  return cachedConfig;
}

const registry = new Map<string, BreakerInternal>();
const blockedCounter = new Map<string, number>();

function getOrCreate(modelId: string): BreakerInternal {
  let b = registry.get(modelId);
  if (!b) {
    b = {
      state: "closed",
      failures: [],
      openedAt: null,
      cooldownMs: getConfig().initialCooldownMs,
      nextProbeAt: 0,
      probeInFlight: false,
    };
    registry.set(modelId, b);
  }
  return b;
}

/**
 * Classifies whether an error should count toward the breaker threshold.
 *
 * See ADR-023 "Failure classification" for the policy. In short:
 *   count: timeouts, network errors, 5xx, unknown errors
 *   skip:  4xx (including 429), CircuitOpenError
 */
export function isBreakerFailure(err: unknown): boolean {
  if (err instanceof CircuitOpenError) return false;
  if (err && typeof err === "object") {
    const e = err as { status?: unknown; statusCode?: unknown };
    const rawStatus = typeof e.status === "number" ? e.status : e.statusCode;
    if (typeof rawStatus === "number" && rawStatus >= 400 && rawStatus < 500) {
      return false;
    }
  }
  return true;
}

/**
 * Pre-flight check. Evaluates and transitions the breaker state for `modelId`:
 *   - closed → no-op
 *   - open + cooldown elapsed → transitions to half_open and reserves probe slot
 *   - open + cooldown not elapsed → throws CircuitOpenError
 *   - half_open + probe already in flight → throws CircuitOpenError
 *   - half_open + no probe in flight → reserves probe slot
 *
 * Callers MUST pair every successful completion of ensureCircuitClosed (i.e.
 * one that did not throw) with either recordBreakerSuccess or
 * recordBreakerError, otherwise a reserved probe slot in half_open state
 * leaks and blocks future probes until process restart.
 *
 * Use withBedrockBreaker for async-returning fn call sites (generateObject);
 * use ensureCircuitClosed + manual record for streaming/deferred call sites
 * (streamText) where the initial request completion is decoupled from the
 * caller's scope.
 */
export function ensureCircuitClosed(modelId: string): void {
  const b = getOrCreate(modelId);
  const now = Date.now();

  if (b.state === "open") {
    if (now >= b.nextProbeAt) {
      b.state = "half_open";
      b.probeInFlight = false;
      logger.info("ai.breaker.half_open", { modelId, cooldownMs: b.cooldownMs });
    } else {
      logBlocked(modelId);
      throw new CircuitOpenError(modelId, b.nextProbeAt - now, b.nextProbeAt);
    }
  }

  if (b.state === "half_open" && b.probeInFlight) {
    logBlocked(modelId);
    throw new CircuitOpenError(
      modelId,
      Math.max(1_000, b.nextProbeAt - now),
      b.nextProbeAt
    );
  }

  if (b.state === "half_open") {
    b.probeInFlight = true;
  }
}

/** Records a successful outcome for `modelId`. Closes a half_open breaker. */
export function recordBreakerSuccess(modelId: string): void {
  const b = registry.get(modelId);
  if (!b) return; // No breaker ever created → nothing to record
  onSuccess(b, modelId);
}

/** Records a failed outcome for `modelId`. May trip or reopen the breaker. */
export function recordBreakerError(modelId: string, err: unknown): void {
  const b = registry.get(modelId);
  if (!b) return;
  onCaughtError(b, modelId, err, Date.now());
}

/**
 * Execute `fn` under the breaker for `modelId`. If the breaker is open, throws
 * `CircuitOpenError` immediately. If `fn` throws a breaker-counted failure,
 * records it and potentially trips the breaker.
 */
export async function withBedrockBreaker<T>(
  modelId: string,
  fn: () => Promise<T>
): Promise<T> {
  ensureCircuitClosed(modelId);
  try {
    const result = await fn();
    recordBreakerSuccess(modelId);
    return result;
  } catch (err) {
    recordBreakerError(modelId, err);
    throw err;
  }
}

function onSuccess(b: BreakerInternal, modelId: string) {
  if (b.state === "half_open") {
    b.state = "closed";
    b.failures = [];
    b.openedAt = null;
    b.cooldownMs = getConfig().initialCooldownMs;
    b.probeInFlight = false;
    blockedCounter.delete(modelId);
    logger.info("ai.breaker.closed", { modelId });
  }
  // closed → closed: no state change; don't bother pruning old failures here,
  // onCaughtError prunes them on add.
}

function onCaughtError(b: BreakerInternal, modelId: string, err: unknown, now: number) {
  if (!isBreakerFailure(err)) {
    // Error does not count toward the breaker. Release any half-open slot
    // without transitioning — the probe is inconclusive.
    if (b.state === "half_open") {
      b.probeInFlight = false;
    }
    return;
  }

  if (b.state === "half_open") {
    // Probe failed — reopen with doubled cooldown (capped).
    const cfg = getConfig();
    b.cooldownMs = Math.min(b.cooldownMs * 2, cfg.maxCooldownMs);
    b.openedAt = now;
    b.nextProbeAt = now + b.cooldownMs;
    b.state = "open";
    b.probeInFlight = false;
    logger.warn("ai.breaker.opened", {
      modelId,
      cooldownMs: b.cooldownMs,
      probeFailed: true,
    });
    return;
  }

  // state === "closed" — add to sliding window and evaluate threshold.
  const cfg = getConfig();
  const cutoff = now - cfg.windowMs;
  b.failures = b.failures.filter((t) => t >= cutoff);
  b.failures.push(now);

  if (b.failures.length >= cfg.threshold) {
    b.state = "open";
    b.openedAt = now;
    b.cooldownMs = cfg.initialCooldownMs;
    b.nextProbeAt = now + b.cooldownMs;
    logger.warn("ai.breaker.opened", {
      modelId,
      cooldownMs: b.cooldownMs,
      windowMs: cfg.windowMs,
      failures: b.failures.length,
    });
  }
}

function logBlocked(modelId: string) {
  const n = (blockedCounter.get(modelId) ?? 0) + 1;
  blockedCounter.set(modelId, n);
  if (n === 1 || n % BLOCKED_LOG_SAMPLE_RATE === 0) {
    logger.warn("ai.breaker.blocked", { modelId, blockedCount: n });
  }
}

export type BedrockCircuitState = {
  status: "up" | "degraded" | "down";
  breakers: Record<
    string,
    { state: BreakerState; openedAt: number | null; cooldownMs: number }
  >;
};

/**
 * Snapshot of the current breaker registry. Used by /api/healthz (ADR-022).
 *
 * Status mapping:
 *   - "up": no breakers registered yet, or all closed
 *   - "degraded": at least one half_open (or mixed state)
 *   - "down": every registered breaker is open
 */
export function getBedrockCircuitState(): BedrockCircuitState {
  const breakers: BedrockCircuitState["breakers"] = {};
  const states: BreakerState[] = [];

  for (const [modelId, b] of registry.entries()) {
    breakers[modelId] = {
      state: b.state,
      openedAt: b.openedAt,
      cooldownMs: b.cooldownMs,
    };
    states.push(b.state);
  }

  let status: BedrockCircuitState["status"];
  if (states.length === 0 || states.every((s) => s === "closed")) {
    status = "up";
  } else if (states.every((s) => s === "open")) {
    status = "down";
  } else {
    status = "degraded";
  }

  return { status, breakers };
}

/**
 * Test-only. Resets registry + cached config so a test can set env vars fresh.
 * Production code must not call this.
 */
export function __resetBreakersForTest() {
  registry.clear();
  blockedCounter.clear();
  cachedConfig = null;
}
