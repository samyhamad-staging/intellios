# ADR-016: AI Resilience Layer — Retry, Timeout, and Model Configuration

**Status:** proposed
**Date:** 2026-04-14
**Supersedes:** (none)

## Context

All AI-powered subsystems (blueprint generation, refinement, governance remediation, intake classification, stakeholder orchestration) call the Anthropic API directly via the AI SDK's `generateObject`. As of session 147, these calls:

1. **Have no retry logic.** A single transient API error (network blip, 429 rate limit, 503) during the 30–60 s generation window causes total work loss and a visible error to the user.
2. **Hardcode model IDs.** `claude-sonnet-4-20250514` and `claude-haiku-4-5-20251001` are littered across four files. Any Anthropic model deprecation requires a code change and emergency deploy.
3. **Have no timeout enforcement.** A hung API connection blocks the request handler indefinitely.

The production risk is real: Anthropic deprecates model versions on a rolling basis, and transient 5xx errors are a normal part of operating at API scale.

## Decision

Introduce a two-file AI resilience layer at `src/lib/ai/`:

### `config.ts` — Centralized model registry

```
AI_MODEL_SONNET  (default: claude-sonnet-4-20250514)
AI_MODEL_HAIKU   (default: claude-haiku-4-5-20251001)
```

`models.sonnet` and `models.haiku` are the single source of truth. All call sites import from here. Model upgrades are now a one-line env var change with zero code deploy.

### `resilient-generate.ts` — Retry wrapper

Drop-in replacement for `generateObject` with:
- **3 retries** on any error, with exponential backoff: 1 s → 2 s → 4 s
- **120 s timeout** per attempt (overridable per call-site via `options.timeoutMs`)
- Structured warning logs on each retry attempt
- Final error re-thrown after all attempts exhausted (callers apply their own fallback)

**Call sites updated:** `generate.ts` (×2), `remediate.ts`, `classify.ts`, `orchestrator.ts`.

The existing graceful fallback patterns in `remediate.ts`, `classify.ts`, and `orchestrator.ts` are preserved — they catch the final thrown error and return safe defaults as before. The resilience layer adds up to 3 API attempts before those fallbacks trigger.

## Consequences

**Benefits:**
- Transient API failures (network, 429, 5xx) self-heal without user-visible errors
- Model deprecations handled via env var — no code change, no deploy required
- Total additional wait on 3-failure scenarios: max 7 s delay before fallback triggers
- Generation timeout (120 s) prevents hung connections from blocking indefinitely

**Trade-offs:**
- 3 retries on a non-retryable error (e.g., malformed schema, auth failure) adds ~7 s latency before failing. Acceptable: non-retryable errors should not occur in production and will surface clearly in logs.
- The `generateObject<T>` instantiation expression syntax requires TypeScript 4.7+. Next.js 16 ships with TypeScript 5.x — satisfied.
- No per-error-type retry discrimination (e.g., skip retry on 400). Deliberate: the overhead is trivial and the code is simpler. Revisit if retry storm patterns emerge.
