# ADR-022: Platform observability floor — instrumentation.ts, /api/healthz, structured-log migration

**Status:** accepted
**Date:** 2026-04-17
**Supersedes:** (none)
**Related:** ADR-017 (DB pool externalization), ADR-019 (governance block), ADR-020 (per-enterprise rate limits), ADR-021 (atomic entity + audit writes)

## Context

Session 148 landed six P0 production-readiness invariants: externalized DB pool config, governance-block-on-approval, atomic entity + audit writes, per-enterprise rate limits, production encryption-key enforcement, and `streamText` retry budgets. These invariants are only trustworthy if operators can see them fire — yet at the end of session 148 the platform had:

- No server-startup log confirming which version, region, or pool size a running instance was booted with.
- No dedicated liveness endpoint. The existing `/api/monitor/*` family reports per-agent deployment health, not platform readiness; load balancers and uptime monitors had nothing to hit.
- ~175 raw `console.error` calls scattered across API routes, including several inside the very C1–C6 routes that had just been hardened. Log aggregators expecting structured JSON would silently drop or misparse those lines.
- No reusable liveness probe for the optional Redis client (rate limiter + future caches).

The production-readiness review ranked a broad observability buildout as H2 (high priority, week-1). Slot 7 of the session 148 plan scoped the minimum pragmatic seed: one registration hook, one health endpoint, and the final log-migration pass on the six routes touched earlier that day. This ADR records those four scoped choices.

## Decision

1. **`src/instrumentation.ts` with Next.js-native `register()` hook.** Next.js 16 invokes `register()` once per server runtime on startup. The hook emits a single structured `app.boot` log containing: `runtime` (nodejs|edge), `nodeEnv`, `gitSha` (from `VERCEL_GIT_COMMIT_SHA`), `region`, `dbPoolMax`, `logLevel`, `pid`, and `bootedAt`. The whole body is wrapped in `try/catch`; instrumentation failures are swallowed silently so boot cannot fail because of a logger defect. No OTel dependency is added — `@vercel/otel` is a one-line upgrade documented in the file header and can be introduced later without editing any other code.

2. **`GET /api/healthz` — public liveness probe.** Unauthenticated. `runtime = "nodejs"`, `dynamic = "force-dynamic"`, `Cache-Control: no-store`. Probes run in parallel:
   - **DB:** `SELECT 1` via Drizzle, bounded by a 2-second `Promise.race`. Result: `"up"` / `"down"`.
   - **Redis:** `isRedisHealthy()` → `"up"` / `"fallback"` / `"down"`. Fallback is NOT considered degraded.
   - **Bedrock:** env-only check (`AWS_REGION` plus one of `AWS_ACCESS_KEY_ID`, `AWS_ROLE_ARN`, `AWS_WEB_IDENTITY_TOKEN_FILE`). Returns `"configured"` / `"not-configured"`. No real API call is made.
   Response body shape is stable: `{ status: "ok" | "degraded", version: string, uptimeSecs: number, services: { db, redis, bedrock }, checkedAt: ISO8601 }`. HTTP status is 200 when every critical service is healthy and 503 when any is `"down"` / `"not-configured"`. No stack traces, error messages, or enterprise data ever appear in the response.

3. **`isRedisHealthy(timeoutMs = 500)` exported from `src/lib/rate-limit.ts`.** Reuses the existing lazy `getRedis()` singleton; races `redis.ping()` against a timeout and returns the three-state enum. Never throws.

4. **`console.error` → `logger.error` migration for the six C1–C6 routes + rate-limit.ts.** Every remaining `console.error` inside the six routes touched by session 148 was swapped to a named structured log event (`blueprint.agentcore.aws.deploy.failed`, `blueprint.generate.claude.failed`, `blueprint.refine.stream.failed`, `blueprint.companion.chat.failed`, `help.chat.failed`, etc.) with `requestId` + `serializeError(err)`. Two `console.error` calls inside the Redis error path in `rate-limit.ts` were also migrated (`rate_limit.redis.error`, `rate_limit.redis.init.failed`).

## Consequences

**Positive.**

- Operators can now confirm, from a log line, which commit / region / pool config a running instance boots with — catching the single most common incident-response question in under a second.
- External uptime monitors (StatusCake, Better Uptime, Pingdom) and load balancer readiness probes have a stable endpoint that returns machine-readable JSON and the correct HTTP status code.
- The six critical routes hardened in session 148 now emit structured events at failure. Log aggregators (Datadog, Loki, CloudWatch Logs Insights) can alert on `msg:"blueprint.agentcore.aws.deploy.failed"` without regex-parsing a free-form string.
- The `isRedisHealthy()` helper is reusable; a future queue/cache implementation can call the same function and stay consistent with the healthz response shape.
- No new dependencies; bundle size unchanged.

**Trade-offs.**

- The Bedrock probe is config-only. An all-green healthz does not prove Bedrock is actually reachable — only that the minimum env vars are present. A throttled `ListFoundationModels` upgrade is a logical follow-up.
- The endpoint is public. An attacker can learn that Redis is in fallback, or that DB is down. The response surface is deliberately minimal; the operational value (anonymous uptime monitoring) outweighs the marginal info disclosure. If this becomes a concern, a richer internal-only `/api/admin/health` variant is straightforward to add.
- `@vercel/otel` is not wired. Traces are still absent. The instrumentation file establishes the extension point but provides no spans today.
- ~50 `console.*` calls still exist in non-C1–C6 routes (H1 in the production-readiness review). The pattern established here is directly reusable; migration is scope-bounded but not yet scheduled.

## Extension path

- **Add OTel.** `npm install @vercel/otel`, then in `register()` for the `nodejs` runtime: `const { registerOTel } = await import("@vercel/otel"); registerOTel({ serviceName: "intellios-web" });`. Configure OTLP endpoint via env. Zero other code changes.
- **Real Bedrock probe.** Cache a `BedrockClient.listFoundationModels()` call for 60s in module scope; surface `"up" | "degraded" | "down"` instead of `"configured" | "not-configured"`. Keep the 2-second healthz budget by reusing the cached result.
- **Finish H1 migration.** Apply the same `logger.error("<domain>.<action>.<outcome>", { requestId, err: serializeError(err) })` pattern to the remaining `console.*` calls in non-C1–C6 routes. No design decision required — purely mechanical.
- **Auth-gated richer health.** Add `/api/admin/health` behind admin auth returning connection counts, queue depths, recent error rates, Bedrock p95 latency. Keep `/api/healthz` narrow and public.
