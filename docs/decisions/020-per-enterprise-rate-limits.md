# ADR-020: Per-Enterprise (Tenant) Rate Limits on AI Endpoints

**Status:** proposed
**Date:** 2026-04-17
**Supersedes:** (none)

## Context

The existing `rateLimit()` helper in `src/lib/rate-limit.ts` enforces a per-user sliding-window limit (keyed by `actorEmail`). This protects individual users from misbehaving clients but does **nothing** to cap a single tenant's aggregate consumption.

The concrete attack/accident surface:

- A tenant with 100 active users each under the 30 req/min chat cap can collectively issue 3,000 req/min into Anthropic/Bedrock.
- Three tenants behaving this way saturate shared upstream throughput, degrading latency for every other tenant on the platform.
- A single tenant's bug (e.g., a client that polls the chat endpoint in a tight loop from many browser tabs) can exhaust Anthropic quota and 429 the entire platform.

The product is a white-label multi-tenant agent factory. Noisy-neighbor isolation is a hard requirement, not a nice-to-have.

## Decision

Add `enterpriseRateLimit(enterpriseId, config)` alongside the existing `rateLimit()`:

```ts
// Keyed by the enterprise, not by the user
const key = `ratelimit:enterprise:${endpoint}:${enterpriseId}`;
```

Uses the same Redis sliding-window + in-memory fallback the per-user limiter uses. Returns `BUDGET_EXCEEDED` (HTTP 429) on denial — a distinct error code from the per-user `RATE_LIMITED` so clients and dashboards can separate "this user is noisy" from "the tenant hit its ceiling."

Apply both limits (per-user then per-enterprise) on the five AI endpoints that talk to Bedrock:

| Endpoint | per-user / min | per-tenant / min |
|---|---|---|
| `POST /api/blueprints` (generate) | 10 | **60** |
| `POST /api/blueprints/[id]/refine/stream` (shares "generate" keyspace) | 10 | **60** |
| `POST /api/intake/sessions/[id]/chat` | 30 | **240** |
| `POST /api/blueprints/[id]/companion/chat` | 40 | **240** |
| `POST /api/help/chat` | 30 | **240** |

Per-tenant ceilings are sized to tolerate ~6–8 simultaneously-active users per tenant at their per-user cap — generous for expected usage, restrictive enough to prevent single-tenant domination of shared upstream throughput.

## Consequences

**Benefits:**
- A single tenant cannot saturate shared Bedrock throughput for the whole platform.
- Distinct error code (`BUDGET_EXCEEDED`) lets ops dashboards track "tenant hit ceiling" separately from per-user 429s — a leading indicator for tenant capacity planning.
- Zero schema change, zero migration. The limit numbers live in code and can be overridden in config without a deploy.

**Trade-offs:**
- A burst of legitimate concurrent activity from a single tenant (e.g., a training session with 20 users in `intake/chat`) may hit the 240/min ceiling. The observability signal (distinct error code + log event) makes this diagnosable, and the cap is easily adjusted.
- Enterprise-level limits only take effect when `authSession.user.enterpriseId` is set. Legacy/demo accounts without an enterprise bypass the enterprise cap — acceptable for MVP, tracked as an open question.
- The caps do not yet account for **cost per request** — 10 short chat messages cost less than 10 blueprint generations. A follow-up ADR will introduce a daily token budget drawn from `enterpriseSettings.dailyTokenBudget` and `logAICall`. Infrastructure exists; wiring deferred to a future session.
- Redis availability: the limiter falls back to in-process counters if Redis is unreachable, which means per-enterprise limits stop working across a multi-instance cluster during a Redis outage. Acceptable given Redis is already on the critical path for the per-user limiter; no new failure mode introduced.
