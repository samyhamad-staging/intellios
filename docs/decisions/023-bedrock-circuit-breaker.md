# ADR-023: Bedrock Circuit Breaker

**Status:** proposed
**Date:** 2026-04-17
**Supersedes:** (none) — extends ADR-016 (AI Resilience Layer)

## Context

ADR-016 established a retry + timeout + structured-logging wrapper (`resilientGenerateObject`) around the AI SDK's `generateObject`. Each call gets up to 3 attempts with 1 s / 2 s / 4 s exponential backoff and a 120 s per-attempt timeout. Session 148 (ADR-016 addendum — C6) added an equivalent `maxRetries: 3` configuration to all 7 `streamText` call sites.

This protects against *transient* failure — single-request network blips, a 429 burst, or a short-lived 5xx. It does **not** protect against *sustained* failure. During a 5-minute Bedrock degradation, every request burns through its full retry budget (7 s of wait + 3 error logs per request) before failing. Across concurrent users this produces three compounding problems:

1. **Latency cascade.** Every user-facing operation ends up waiting 7–10 s before returning an error. Chat endpoints that would otherwise return within 60 s time out at the Vercel function ceiling.
2. **Log flooding.** Three `ai.retry` warn entries per request × hundreds of in-flight requests × every 30 seconds during the outage — structured logging pipelines (H2 observability floor, ADR-022) drown in noise exactly when they're most needed for diagnosis.
3. **Cost waste.** Some failure modes (e.g., partial Bedrock region failover) succeed after retry with inconsistent latency; others (full outage) always fail but still consume API quota against the retry budget. There's no mechanism to stop trying once the signal is clear that retries are futile.

The fix pattern is well-known: a circuit breaker. When failures exceed a threshold in a short window, the breaker "opens" and subsequent requests fail fast without hitting the downstream service, until a cooldown elapses and a probe request tests whether the dependency has recovered.

The H3 finding in the session-148 production-readiness review called this out explicitly: "No circuit breaker on Bedrock — bounded retries don't protect against sustained outages."

## Decision

Introduce a per-model circuit breaker at `src/lib/ai/circuit-breaker.ts`, integrated into both the `generateObject` path (via `resilientGenerateObject`) and the 7 `streamText` call sites via a shared `withBedrockBreaker(modelId, fn)` helper.

### State machine

Classic three-state breaker per **model ID** (not per call site — multiple call sites sharing `sonnet` share a single breaker):

- **closed** (normal): requests pass through; failures accumulate in a sliding window.
- **open** (tripped): requests throw `CircuitOpenError` immediately; no Bedrock call is made; cooldown timer runs.
- **half-open** (probing): the single next request is allowed through. Success → back to closed (window reset). Failure → back to open with cooldown multiplied (exponential back-off of the breaker itself, up to a ceiling).

### Trigger

Breaker opens when `failureCount ≥ threshold` within the last `windowMs` milliseconds while in the closed state. Defaults: **5 failures in 30 s → open.** Env-overridable via `AI_BREAKER_THRESHOLD` and `AI_BREAKER_WINDOW_MS`.

### Cooldown

Initial cooldown is `AI_BREAKER_COOLDOWN_MS` (default **60 s**). On each failed half-open probe the cooldown doubles (60 → 120 → 240 → …) up to `AI_BREAKER_MAX_COOLDOWN_MS` (default **300 s**). When the breaker eventually closes, the cooldown resets to the initial value.

### Failure classification

Not every thrown error counts toward the breaker threshold. Misclassifying would either flap the breaker on client errors or fail to trip it on real outages.

| Error type | Counts as failure? | Rationale |
|---|---|---|
| Network / DNS / connection reset | Yes | Classic outage signal |
| Bedrock 5xx (500, 502, 503, 504) | Yes | Server-side failure |
| Timeout (our 120 s ceiling) | Yes | Indistinguishable from unresponsive Bedrock from our perspective |
| Bedrock 429 rate limit | **No** | Client-side throttling, not server degradation. Rate-limit storms would flap the breaker and block unrelated calls. |
| Bedrock 4xx (400, 401, 403, 404) | **No** | Client error (bad schema, bad auth). The dependency is fine; the request is wrong. |
| `CircuitOpenError` (breaker's own error) | **No** | Self-reinforcing loop. Circuit opens the first time; fast-fails would otherwise keep the window saturated indefinitely. |

### Scope: per-model, not global

Separate breakers for `sonnet` and `haiku`. Bedrock endpoints can fail independently — Sonnet lives in one model provider path, Haiku another, and regional failover has asymmetric impact. A single global breaker would over-block: if Sonnet has a 10-minute outage, Haiku requests (classification, remediation) should continue unaffected.

Per-model state is keyed on the resolved model ID (`process.env.AI_MODEL_SONNET ?? "claude-sonnet-4-20250514"` etc.) so env-var swaps automatically get their own breaker.

### Persistence: in-memory per process

No Redis, no DB, no cross-instance coordination. Two reasons:

1. **Reliability control, not consensus.** Circuit breakers are a local protection against local waste. Each process independently discovers the outage within `threshold × (1/traffic_rate)` time — at realistic production traffic (5+ rps per process), all processes trip within ~30 s of the start of a sustained outage.
2. **Avoid the dependency chain.** Session 148 added Redis for per-enterprise rate limits with a documented in-memory fallback (ADR-020) exactly so rate limiting doesn't go down when Redis goes down. Adding a Redis dependency for circuit-breaker state would recreate that coupling for a feature whose whole purpose is reliability.

### Error shape

```ts
class CircuitOpenError extends Error {
  code = "CIRCUIT_OPEN";
  modelId: string;
  retryAfterMs: number;
  nextProbeAt: number; // epoch ms
}
```

Callers decide whether to surface as HTTP 503 `SERVICE_DEGRADED` with a `Retry-After` header or to degrade gracefully (e.g., chat endpoint returns a static "model temporarily unavailable" message instead of streaming).

### Observability

Four log events, namespaced under `ai.breaker.*`:

| Event | Level | When |
|---|---|---|
| `ai.breaker.opened` | warn | Transition closed → open |
| `ai.breaker.half_open` | info | Cooldown elapsed, probe attempt |
| `ai.breaker.closed` | info | Probe succeeded, transition half_open → closed |
| `ai.breaker.blocked` | warn | Request rejected with CircuitOpenError (sampled to 1/N to avoid flooding) |

Introspection for `/api/healthz`:

```ts
getBedrockCircuitState() → {
  status: "up" | "degraded" | "down",
  breakers: Record<modelId, { state: "closed"|"open"|"half_open", openedAt?: number, cooldownMs?: number }>
}
```

Healthz reports:
- `"up"` — all breakers closed
- `"degraded"` — any breaker half_open (or open within recent window)
- `"down"` — all breakers open

The healthz route (ADR-022) already reports Bedrock as `"configured" | "missing"` — this ADR upgrades that to a live health signal.

## Consequences

**Benefits:**
- Sustained Bedrock degradation fails fast after ~30 s instead of cascading latency and retry storms across every in-flight request.
- Log volume during an outage drops by ~30× (one `ai.breaker.blocked` per N blocked requests vs. three `ai.retry` per request).
- API quota waste bounded: once the breaker opens, no further Bedrock calls are made until cooldown.
- Healthz endpoint (ADR-022) now reports a real Bedrock health signal, not just env-presence. Load balancers and runbooks have a single source of truth for "is the AI layer working."
- Per-model isolation means partial outages (Sonnet region down, Haiku fine) don't over-block.

**Trade-offs:**
- **Tuning the threshold is an operational choice.** 5 failures in 30 s is a guess — too low flaps on normal flakes, too high delays the circuit opening. We'll likely need to retune after observing the first real outage. Env-var overrides make this a config change, not a code change.
- **Probe requests are user-facing during recovery.** The one allowed half-open probe is a real user request. If it fails, that user sees a 503. Acceptable — the alternative (fabricated probe requests) requires maintaining synthetic test inputs for every endpoint.
- **In-memory state does not survive process restarts.** A deploy during an outage resets all breakers to closed. Each process discovers the outage again on its first N failures. This is fine for normal deploys (which are rare during outages anyway) but worth noting.
- **No retry of the failed request after cooldown.** The breaker fails fast; it does not queue requests and retry them when the circuit closes. Callers needing that behavior add their own retry layer (the existing `resilientGenerateObject` retry budget is within the breaker, not around it — once the breaker opens, retries inside also fast-fail).
- **429 not being a failure is a deliberate policy call.** If Bedrock shifts 429 from meaning "you're too fast" to meaning "we're degraded and shedding load," the breaker won't catch it. We accept this because the current 429 semantics match the first case and rate-limit flap would be worse than the miss.

**Migration:**
- `resilientGenerateObject` gains a `withBedrockBreaker` wrap around its inner `generateObject` call. No caller changes required.
- 7 `streamText` call sites each get their body wrapped: `return withBedrockBreaker(modelId, () => streamText({...}))`. Mechanical.
- Healthz route (ADR-022) extends its bedrock probe from env-presence to `getBedrockCircuitState()`.
- New env vars documented in `.env.example`. All have defaults — no required-var change.

**Explicitly deferred:**
- Per-tenant breakers. One noisy tenant with a malformed schema could generate enough 4xx-that-aren't-counted to avoid tripping the breaker for other tenants, but if their error pattern did trip the breaker, other tenants would be blocked. Consider only if observed.
- Manual circuit-open admin endpoint. Ops currently cannot force the breaker open for scheduled maintenance; would need `POST /api/admin/ai/breaker/open`. Deferred.
- Metrics export (Prometheus/OTel). Breaker state transitions are logged but not exported as metrics. Once the observability layer (ADR-022) chooses a backend this can be added.
