# ADR-017: Database Connection Pool Externalization

**Status:** proposed
**Date:** 2026-04-17
**Supersedes:** (none)

## Context

The Postgres client in `src/lib/db/index.ts` was hardcoded to `postgres(env.DATABASE_URL, { max: 1 })` — a single connection per process, idle-timeout unset, connect-timeout unset. This was an early-development default that never changed.

Under realistic multi-user concurrency this ceiling is catastrophic:

- Two simultaneous requests from different users serialize behind a single connection.
- A long-running transaction (blueprint generation can take 30–60 s inside a write path) blocks every other request on the same Node process.
- There is no visibility into pool exhaustion — requests silently queue until they time out at whatever layer imposes the outer timeout.

Production deployments differ: long-running Node (Docker, EC2 with an ALB) wants a larger pool; serverless (Vercel Functions, each invocation gets its own isolated pool) wants a smaller one. A single hardcoded value cannot satisfy both, and changing it requires a code deploy.

## Decision

Externalize pool sizing to three env vars, validated by the existing Zod env schema with production-appropriate defaults:

```
DB_POOL_MAX             (default: 20,  range 1–100)
DB_IDLE_TIMEOUT_SEC     (default: 30,  range 1–600)
DB_CONNECT_TIMEOUT_SEC  (default: 10,  range 1–60)
```

Wire them into `postgres()` in `db/index.ts`:

```ts
const client = postgres(env.DATABASE_URL, {
  max: env.DB_POOL_MAX,
  idle_timeout: env.DB_IDLE_TIMEOUT_SEC,
  connect_timeout: env.DB_CONNECT_TIMEOUT_SEC,
  onnotice: () => {},
});
```

Emit a structured `logger.info("db.pool.init", ...)` event at module load so pool sizing is observable in production logs. Document recommended values for each deployment shape in `.env.example`.

## Consequences

**Benefits:**
- Long-running deployments (Docker/EC2) now get a functional pool without code changes.
- Serverless deployments can set `DB_POOL_MAX=5` per function without modifying source.
- Pool size appears in logs at boot, so misconfigurations are diagnosable.
- Zod validation prevents runaway values (max 100, minimum 1).

**Trade-offs:**
- Default `max=20` requires Postgres to allow ≥20 connections × Node process count. Most managed Postgres providers default to ≥100 connections; not a concern for realistic production sizes.
- A misconfigured `DB_POOL_MAX=100` with 4 Node processes produces 400 connections, potentially exhausting Postgres. Mitigation: the upper bound is enforced, and runbook guidance should cover total-connection math.
- Tests that spin up `db` without setting env vars will see defaults — acceptable because the defaults are safe for single-instance test runs.
