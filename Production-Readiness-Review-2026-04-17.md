# Intellios — Production-Readiness Review & Execution Plan

**Date:** 2026-04-17
**Reviewer role:** Principal Engineer / Product Architect / DevOps Lead
**Target:** Enterprise-grade, multi-tenant AI agent factory — production launch readiness
**Method:** Five-phase audit. Findings verified against code (file paths + line numbers where cited).

---

## Executive Summary

Intellios is further along than most pre-launch enterprise AI platforms I review. The architectural spine is disciplined: deterministic governance enforcement (not LLM-based), append-only audit trail, per-route `assertEnterpriseAccess` checks, a resilient AI call wrapper with exponential backoff (`src/lib/ai/resilient-generate.ts`), row-level tenancy via middleware header injection, and modern crypto (AES-256-GCM for secrets, bcrypt-12 for passwords, HMAC-SHA256 for webhooks). Security test coverage is unusually strong (1,000+ LOC targeting specific fix IDs like P1-SEC-008).

The issues that block production are not architectural — they are operational: a Postgres connection pool hard-coded to `max: 1` (`src/lib/db/index.ts:6`) that will serialize the entire platform under concurrent load; a missing validation-report enforcement in the blueprint review route, which means a reviewer can approve a blueprint with error-severity governance violations; non-atomic audit writes across most lifecycle routes (if the primary insert succeeds and the audit insert fails, the audit trail quietly diverges from state); console-based logging in ~175 API routes (`console.log`/`console.error`) that bypasses the bespoke JSON logger and will drown the prod log pipeline; and no APM / tracing / metrics endpoint, which means AI latency, cost, and tenant isolation failures will be invisible the moment real traffic hits.

The "LangGraph-compatible code generation" named in the system description is not implemented — the pipeline is linear. This is a docs/code drift problem, not a blocker.

**Production readiness: 72 / 100.** Recommendation: do not launch to paying enterprises until the six P0 items in Phase 4 land. A single engineer can execute them in 6–8 hours. Beyond that, the platform is ready for design-partner pilots within the week.

---

## Phase 1 — System Mapping & Architecture

### Stack summary
- **Runtime:** Next.js 16.1.6 (App Router), React 19, TypeScript 6 (strict)
- **Persistence:** Postgres via Drizzle 0.45, `postgres.js` driver, 39 migrations
- **Auth:** NextAuth v5 (JWT, 8h default, optional 30d "remember device"), bcryptjs rounds=12, optional OIDC/SSO JIT
- **AI:** `@ai-sdk/anthropic` + `ai` SDK v5, Claude Sonnet + Haiku split, AWS Bedrock AgentCore deploy path
- **Cache/limit:** Redis via `ioredis` (optional, falls back to in-memory Map)
- **Deploy:** Vercel-native (`src/vercel.json`), no IaC (Terraform/CDK)
- **UI:** Tailwind 4 + Catalyst UI Kit (27 components) with gradual migration from legacy `src/components/ui/`

### Subsystem map (verified against code)

| Subsystem | Entry | Core files |
|---|---|---|
| **Intake Engine** | `POST /api/intake/sessions/[id]/chat` | `src/lib/intake/{system-prompt,orchestrator,tools,classify,model-selector}.ts` |
| **Generation Engine** | `POST /api/blueprints` | `src/lib/generation/{generate,system-prompt}.ts` (uses `resilient-generate`) |
| **Governance Validator** | inline, `validateBlueprint()` | `src/lib/governance/{validator,evaluate,remediate,runtime-evaluator}.ts` |
| **Agent Registry** | `GET /api/registry` | table `agentBlueprints` (`src/lib/db/schema.ts`) |
| **Blueprint Review UI** | `POST /api/blueprints/[id]/review` | `src/app/api/blueprints/[id]/review/route.ts` + `src/components/review/` |
| **Deployment (AgentCore)** | `POST /api/blueprints/[id]/deploy/agentcore` | `src/lib/agentcore/{deploy,translate}.ts` |
| **Audit Trail** | event-driven via `writeAuditLog()` | `src/lib/audit/log.ts`, table `auditLog` |
| **Event Bus** | in-process pub/sub | `src/lib/events/{bus,publish}.ts` |
| **Notifications** | role-routed, 30s poll | `src/lib/notifications/{store,handler,email}.ts` |
| **Webhooks** | HMAC-SHA256, 3 retries | `src/lib/webhooks/{deliver,dispatch}.ts` |
| **Cron / drift** | 6 Vercel crons | `src/app/api/cron/*` |
| **Monitoring / telemetry** | CloudWatch poller | `src/lib/telemetry/agentcore-poller.ts` |

### Primary data flow (intake → deploy)

1. **Intake session created** → row in `intakeSessions` with `enterpriseId` scoping.
2. **Chat turn** (`src/app/api/intake/sessions/[id]/chat/route.ts`): `requireAuth` → rate limit (30/min) → expertise detection (`model-selector.ts`) → `streamText()` with tools from `intake/tools.ts` → tool handlers mutate `intakeSessions.intakePayload` JSON → assistant message persisted.
3. **Finalize** (`/finalize/route.ts`): validates minimum payload (name, description, ≥1 tool) → status `completed` → event.
4. **Generate** (`src/app/api/blueprints/route.ts`): rate limit (10/min) → `assertEnterpriseAccess` (line 49) → `loadPolicies(enterpriseId)` (line 72) → `resilientGenerateObject` with `ABPContentSchema` → synchronous `validateBlueprint()` (line 89) → insert into `agentBlueprints` (line 139) → best-effort audit insert (line 146) → `publishEvent`.
5. **Review** (`src/app/api/blueprints/[id]/review/route.ts`): role-gated (`reviewer|compliance_officer|admin`) → `assertEnterpriseAccess` → multi-step approval chain (`approvalProgress` JSON) with SOD check (`!allowSelfApproval`) → status transition → audit + event.
6. **Deploy** (`src/lib/agentcore/deploy.ts`): translate ABP → Bedrock Agent spec → CreateAgent/PrepareAgent polling loop (500ms, 90s cap) → rollback on failure → persist `deploymentMetadata`.
7. **Post-deploy**: nightly `/api/cron/governance-drift` re-evaluates deployed agents against current policies; `telemetry-sync` pulls Bedrock CloudWatch metrics; daily briefing generated by `awareness/briefing-generator.ts`.

### Critical-path files (the ones where a bug is catastrophic)

1. `src/lib/auth/enterprise.ts` — `assertEnterpriseAccess()` gates 235+ call sites. Any regression = cross-tenant leak.
2. `src/lib/db/index.ts` — database client construction. **`max: 1` today.**
3. `src/lib/governance/validator.ts` — single choke point for every blueprint decision.
4. `src/lib/ai/resilient-generate.ts` — every AI call that matters rides on this (3 retries, 1→2→4s backoff, 120s timeout via `Promise.race`).
5. `src/app/api/blueprints/route.ts` — generation + validation + persistence.
6. `src/app/api/blueprints/[id]/review/route.ts` — approval gate, multi-step chain, SOD enforcement.
7. `src/middleware.ts` — strips client-supplied `x-enterprise-id`/`x-user-role`/`x-actor-email` headers before re-injecting authenticated values (verified fix P1-SEC-008).
8. `src/lib/audit/log.ts` — append-only trail; all forensic evidence.
9. `src/lib/db/schema.ts` — source of truth for row-level scoping columns and indexes.
10. `src/lib/crypto/encrypt.ts` — AES-256-GCM for webhook HMAC secrets at rest.

### Docs vs. code drift

- **LangGraph**: named in system description; **not implemented**. No `langgraph` import anywhere. The pipeline is linear. Either implement or strike it from the spec.
- **PDF evidence package** (ADR-015): committed in docs; route still returns JSON only. Tracked as OQ-009, non-blocking.
- **"Error-severity violations block progression"** (INTELLIOS_SYSTEM_DESCRIPTION.md §2.2): **the review route does not check `validationReport.valid` before approval.** Doc says it blocks, code allows it. See Phase 3, finding G2.
- Everything else — append-only audit, AI-for-generation/deterministic-for-enforcement, multi-step approval, drift detection — matches code.

---

## Phase 2 — Deep Audit by Dimension

### A. Architecture — SOLID
The separation between generation (AI) and enforcement (deterministic) is correct and documented via ADR-003/005. Synchronous validation in the critical path avoids eventual-consistency failure modes. Row-level tenancy + middleware header sanitization + per-route ownership assertion is a defensible model. Catalyst migration is ~50/50 and acceptable; legacy `src/components/ui/` is not a risk.

**Weakness:** Event bus is in-process, fire-and-forget. Handler failures are swallowed. Documented as a future Redis Streams migration but no plan. Acceptable for MVP; not acceptable if any event path becomes business-critical.

### B. Reliability — AT RISK
Retry and timeout behavior for Claude calls is excellent where `resilientGenerateObject` is used (generation, remediation, orchestrator insights — all verified with grep). The intake `/chat` endpoint uses `streamText()` directly and **does not** have the same retry/timeout wrapping — it inherits AI SDK defaults and a Next.js `maxDuration` of 60s. If Bedrock throttles during an intake turn, the user sees an immediate 500.

Transactions are used in only 4 write paths (invite accept, policy create, template instantiation, and one more). The majority of write routes — including `POST /api/blueprints` — perform primary insert and audit insert as two separate statements with the audit wrapped in `try/catch { console.error }` (verified at `src/app/api/blueprints/route.ts:145-158`). Outcome: under partial failure, audit trail silently diverges from state. This is a compliance-grade problem.

Webhook retries are fixed at 0s → 1s → 2s with no exponential backoff or DLQ. Cron jobs do all work inline with no partial-completion semantics — a single slow enterprise in `portfolio-snapshot` can timeout the whole run.

### C. Security & Compliance — READY (with caveats)
- AuthN/AuthZ: bcrypt-12, JWT, role-based guards on every sampled API route. Rate-limit + 15-min lockout after 10 consecutive failures. OIDC SSO with JIT provisioning.
- Multi-tenancy: 235+ `enterpriseId` references; `assertEnterpriseAccess` is consistently called after ID-based lookups. No IDOR gaps found in a sample of 15 routes. Middleware strips client-supplied security headers — verified in `src/__tests__/security/security-fixes.test.ts:565-653`.
- Secrets: env-validated at startup (`src/lib/env.ts`), AES-256-GCM for webhook HMAC secrets, no hardcoded credentials, timing-safe comparison for cron auth.
- Input validation: Zod on every sampled route.
- Prompt injection: `sanitizePromptInput()` in `src/lib/generation/system-prompt.ts:17-23` strips `<>`, role prefixes (`\nINSTRUCTION:`, `\nSYSTEM:`, etc.), 500-char cap. **Applied to generation prompts. Not universally applied to intake.** Intake is largely tool-driven, not concatenated, so the exposure is narrower but non-zero.

**Caveats:**
- Rate limits are per-email, not per-enterprise. A 100-user tenant can burst 1,000 generate calls/min at Bedrock.
- `SECRETS_ENCRYPTION_KEY` is optional; webhook secrets store plaintext with a warning if unset. Must be enforced in prod.
- No per-enterprise token/cost budgeting — a runaway agent could consume an unbounded Bedrock budget.

### D. Performance — ADEQUATE
The `max: 1` Postgres pool is the overriding bottleneck and is covered in Phase 3 as C1. Beyond that: Drizzle queries are parameterized and indexed (`enterpriseId`, `(entityType, entityId, createdAt)` on audit, etc.), streaming is used for 4 AI endpoints, Catalyst adoption keeps bundle size reasonable. Dashboard summary (`src/app/api/dashboard/summary/route.ts:29-42`) computes violation counts in application code rather than SQL aggregation — fine at MVP, will bite at 10k+ blueprints.

### E. AI Layer Quality — PARTIAL
- **Strengths:** Deterministic governance evaluator; structured output via Zod (`ABPContentSchema`); resilient wrapper with backoff + timeout + cost logging (`logAICall()`); Haiku/Sonnet routing by expertise.
- **Weaknesses:** Prompts are hardcoded TypeScript strings with no versioning or changelog; no prompt evals or regression tests; intake history is unbounded (accumulates every turn in context); no token/cost budget enforced per session or tenant; no circuit breaker after retry exhaustion.
- **Missing:** LangGraph / state-machine orchestration as promised in the spec. Not a production blocker; is an honesty issue.

### F. Observability — MAJOR GAP
A real JSON logger exists (`src/lib/logger.ts`) with request-scoped child loggers and proper error serialization. **It is not adopted consistently.** Raw `console.log`/`console.error` appears in ~175 API routes and ~305 places overall (including seed scripts and dev utilities). No Prometheus endpoint. No OpenTelemetry. No APM. CloudWatch metrics are pulled via cron into DB — after-the-fact, not real-time.

The AI layer logs tokens + latency + cost per call, but nothing is aggregated by tenant for billing/alerting. In production, if a customer reports "generation is slow," the only way to diagnose is to grep Vercel logs.

### G. Developer Experience — STRONG
Strict TypeScript (`strict: true`), 0 `@ts-ignore`, 32 `: any` (mostly in tests and dynamic-import boundaries). ESLint 9 flat config. `.env.example` is comprehensive. CONTRIBUTING.md is usable as onboarding. CLAUDE.md is excellent. 39 migrations all additive (no `DROP`). 16 ADRs with a maintained index. The session-log discipline is a differentiator — `docs/log/` + `docs/project-journal.md` give new engineers real narrative context. DX friction: no `db:setup` / `docker:up` npm scripts; manual Postgres bootstrap.

### H. User Experience — STRONG
47 top-level routes, real data flows (no "Lorem ipsum" / mock arrays found in `src/app/`), Catalyst adoption rising, 38 `loading.tsx`/`error.tsx` files (~40% coverage — good for Next.js App Router). Accessibility work tracked through specific ADRs (ADR-004 table `scope`, ADR-014 contrast tokens); WCAG AA claimed complete. Seven `TODO`/`FIXME` markers concentrated in template endpoints (non-critical path). One open question (OQ-009, PDF renderer) documented.

---

## Phase 3 — Gap Identification & Risk Classification

All findings below are verified against source, with file paths. Severity is operational (what breaks in prod), not aesthetic.

### CRITICAL — blocks production

**C1. Postgres connection pool hard-coded to `max: 1`**
- **File:** `src/lib/db/index.ts:6` — `const client = postgres(env.DATABASE_URL, { max: 1 });`
- **Impact:** Every DB operation on the instance serializes. Under any concurrent load — even 2 users refreshing the dashboard simultaneously — request latency spikes and timeouts cascade. On Vercel serverless this is somewhat mitigated by per-invocation isolation, but any long-lived server/API route handler holding the pool becomes a hard cap.
- **Risk if unaddressed:** Platform is single-threaded in the database layer. Guaranteed outage on day one of real traffic.

**C2. Blueprint review route does not enforce `validationReport.valid`**
- **File:** `src/app/api/blueprints/[id]/review/route.ts` — grep for `validationReport` returns zero matches; only role, SOD, status, and chain checks are enforced.
- **Impact:** A reviewer can approve a blueprint with error-severity governance violations despite the platform's core promise that such violations "block lifecycle progression" (INTELLIOS_SYSTEM_DESCRIPTION.md §2.2; ADR-005).
- **Risk if unaddressed:** Platform's single most-marketed guarantee is unenforced. One bad approval → non-compliant agent deployed → audit failure → contract loss.

**C3. Audit log writes are not atomic with entity writes**
- **File:** `src/app/api/blueprints/route.ts:139-158` (blueprint insert outside transaction; audit insert wrapped in `try/catch { console.error }`). Pattern repeats across most write routes.
- **Impact:** If the audit insert fails (network blip, pool exhaustion, etc.), the primary mutation has already committed. The audit trail silently diverges from state. Every enterprise compliance program treats this as a Sev-1.
- **Risk if unaddressed:** SOC2 / ISO27001 / any customer with a forensics clause will reject the platform during diligence.

**C4. Per-enterprise rate limiting is absent**
- **File:** `src/lib/rate-limit.ts` + every route's rate-limit call (keyed by email).
- **Impact:** A single tenant can exhaust Bedrock throughput for the entire platform. No per-tenant token or cost budget either.
- **Risk if unaddressed:** One noisy customer → platform-wide Bedrock 429s → every other customer's generation fails. Also unbounded cost exposure.

**C5. `SECRETS_ENCRYPTION_KEY` is optional; plaintext webhook secrets fallback is allowed in prod**
- **File:** `src/lib/crypto/encrypt.ts:44-56`.
- **Impact:** If the key isn't set, webhook HMAC secrets are stored plaintext with only a `logger.warn`. If a DB dump leaks, an attacker can forge signed events targeting every enterprise.
- **Risk if unaddressed:** Catastrophic if combined with a DB-read disclosure.

**C6. Intake chat endpoint has no retry/timeout wrapping**
- **File:** `src/app/api/intake/sessions/[id]/chat/route.ts` (verified via grep — no `resilient` or `retry` match).
- **Impact:** Every intake turn is a single Bedrock call with no backoff. A transient 429 or 503 during any turn → user sees hard 500 → session abandoned. Intake is the top-of-funnel user experience.
- **Risk if unaddressed:** First-impression failure rate spikes under any Bedrock degradation.

### HIGH — major risk, fix within week 1

**H1. ~175 raw `console.*` calls in API routes bypass the JSON logger**
- **Files:** Scattered across `src/app/api/**/route.ts` (including the critical `blueprints/route.ts:57, 149`).
- **Impact:** Log aggregation (Vercel → Datadog/Splunk/wherever) receives mixed formats. Alerts based on structured fields won't fire. No request correlation across those lines.

**H2. No APM / tracing / real-time metrics**
- **Files:** `src/lib/telemetry/*` pulls metrics via cron, not push. No `/api/metrics` Prometheus endpoint. No OTel initialization.
- **Impact:** Production incidents are diagnosed by grep. AI latency/cost regressions invisible until cron runs. No per-tenant cost attribution.

**H3. No circuit breaker on Bedrock**
- **File:** `src/lib/ai/resilient-generate.ts` retries 3 times then propagates. Nothing stops the 10th identical caller from also making 3 retries.
- **Impact:** Bedrock partial outage → thundering herd of retries → accelerates quota exhaustion.

**H4. Webhook delivery: no exponential backoff, no DLQ**
- **File:** `src/lib/webhooks/deliver.ts:9` — fixed 0/1/2s delays; on final failure, row sits in `webhookDeliveries` marked "failed" forever.
- **Impact:** Enterprise integrations miss events silently; requires manual admin intervention.

**H5. Cron jobs are inline, single-threaded, no partial-completion**
- **Files:** `src/app/api/cron/portfolio-snapshot/route.ts:77-180`, etc. No BullMQ/SQS.
- **Impact:** One slow enterprise in a nightly loop timeouts the whole cron → affected enterprise never recovers until next run.

**H6. Prompt sanitization not applied to intake path**
- **File:** `src/lib/intake/system-prompt.ts` does not import `sanitizePromptInput`. Intake is tool-driven (narrower surface) but any free-text context injected into the system prompt (e.g., agent purpose) is raw.
- **Impact:** Medium-sophistication prompt injection could hijack intake governance probing. Low-likelihood but high-consequence.

**H7. Dockerfile runs as root, no HEALTHCHECK, single-stage**
- **File:** `Dockerfile` at repo root.
- **Impact:** Container-escape surface, no liveness/readiness probe, unnecessarily large image. Only matters if you deploy off Vercel; document this explicitly.

**H8. No E2E tests running in CI**
- **File:** `src/e2e/` exists but `playwright.config.ts` tests are commented out of `.github/workflows/ci.yml`.
- **Impact:** Critical user flows (intake→generate→validate→approve→deploy) have no automated regression coverage.

### MEDIUM — important, fix within month 1

**M1.** Dashboard summary computes violation counts in app code, not SQL aggregation (`src/app/api/dashboard/summary/route.ts:29-42`). Will scale-limit at ~10k blueprints.
**M2.** Unbounded intake message history in context (`intakeSessions` stores every turn; nothing truncates on re-hydration). Token cost grows linearly with turn count.
**M3.** No prompt versioning / changelog — prompts are TS strings edited in place.
**M4.** No LangGraph integration despite docs claim. Either build or remove from spec.
**M5.** No prompt evals / regression tests for generation quality.
**M6.** Session length 8h default may be too long for regulated tenants; "remember device" 30d needs opt-in audit.
**M7.** No Terraform/CDK for any AWS resource (CloudWatch, Bedrock permissions, S3 buckets used for ABP export).
**M8.** `CSP` header includes `unsafe-inline` / `unsafe-eval` — fine in dev, should be nonce-based in prod (`next.config.ts`).
**M9.** PDF evidence package (ADR-015) still returns JSON (`/api/blueprints/[id]/evidence-package.pdf`). Tracked as OQ-009.
**M10.** No `db:setup` / `docker:up` npm scripts — onboarding friction.

### LOW — nice to have

**L1.** 7 `TODO`/`FIXME` markers in template routes.
**L2.** 32 `: any` usages (mostly in test utilities, acceptable).
**L3.** `prefers-reduced-motion` CSS block reported incomplete in 2026-04-07 audit; roadmap claims fixed — spot-verify.
**L4.** Catalyst vs. legacy `components/ui/` — 50/50 split, consolidate gradually.
**L5.** No webhook payload size cap (signatures over arbitrarily large bodies).
**L6.** Audit log has no documented retention policy (may conflict with GDPR data-subject deletion).

### Systemic vs. isolated

**Systemic:** C3 (atomicity), H1 (logging adoption), M3 (prompt versioning) — each reflects a pattern touching dozens of files.
**Isolated:** C1, C2, C5, C6 — single-file fixes with outsized blast radius.

---

## Phase 4 — Today's Execution Plan (6–8 hours, single engineer)

Ordered for maximum risk-reduction-per-hour. Every item is independently shippable; do not batch into one PR.

### Slot 1 (0:00–0:30) — C1: Raise DB pool size
**Title:** Configure Postgres pool size via env var, sane prod default.
**Why it matters:** Platform is single-threaded at the DB layer today. Highest-impact, lowest-effort fix on the list.
**Scope:** `src/lib/db/index.ts`, `src/lib/env.ts`, `.env.example`, CONTRIBUTING.md.
**Outcome:** `postgres(env.DATABASE_URL, { max: env.DB_POOL_MAX ?? 20, idle_timeout: 30, connect_timeout: 10 })`. Prod default 20, documented override.
**Risk if skipped:** P95 latency >5s under any real concurrency. Platform brownout on launch.

### Slot 2 (0:30–2:30) — C2: Enforce validationReport.valid in review
**Title:** Block approval when error-severity governance violations exist.
**Why it matters:** Restores the platform's core marketed guarantee. One-line bug → contractual liability.
**Scope:** `src/app/api/blueprints/[id]/review/route.ts` (add check after `in_review` gate, before role/SOD gates); update `src/__tests__/blueprints/` with coverage; update `docs/specs/blueprint-review-ui.md`; ADR if needed (extend ADR-005 or write ADR-017).
**Outcome:** `action === "approve"` + `validationReport.valid === false` + user is not admin-with-override → return `ErrorCode.INVALID_STATE` with the list of blocking violations.
**Risk if skipped:** A single compliance incident torches the enterprise pitch.

### Slot 3 (2:30–4:00) — C3: Atomic entity + audit writes in core lifecycle routes
**Title:** Wrap blueprint-create, blueprint-review, blueprint-deploy, policy-mutate in `db.transaction()`.
**Why it matters:** Closes the biggest forensic gap. SOC2 auditors will ask this exact question.
**Scope:** 4 files minimum — `src/app/api/blueprints/route.ts`, `src/app/api/blueprints/[id]/review/route.ts`, `src/app/api/blueprints/[id]/deploy/agentcore/route.ts`, `src/app/api/governance/policies/route.ts`. Use `db.transaction(async (tx) => { … })` and thread `tx` into a transaction-aware `writeAuditLog(tx, …)` helper. Remove the silent `try/catch { console.error }` around audit inserts.
**Outcome:** If audit fails, primary write rolls back. No divergence possible.
**Risk if skipped:** Silent audit drift. Compliance-breaking in the quiet way that nobody notices until diligence.

### Slot 4 (4:00–5:00) — C6: Wrap intake chat in resilient client
**Title:** Apply retry/timeout to intake streaming turn.
**Why it matters:** Intake is the funnel. A single Bedrock 429 bounces a user out of their first session.
**Scope:** `src/app/api/intake/sessions/[id]/chat/route.ts` — swap direct `streamText()` for a thin wrapper that performs the same retry semantics as `resilientGenerateObject` but preserves streaming. Alternatively add a simple 2-retry prelude (non-streaming preflight call) before committing to stream; or at minimum add `AbortSignal.timeout(120_000)`.
**Outcome:** Transient Bedrock failures surface as a visible retry rather than an opaque 500.
**Risk if skipped:** Top-of-funnel abandonment rate is demo-dependent on Bedrock's uptime.

### Slot 5 (5:00–5:30) — C5: Enforce `SECRETS_ENCRYPTION_KEY` in production
**Title:** Make encryption key mandatory when `NODE_ENV=production`.
**Why it matters:** One-line change that removes a plaintext-at-rest fallback.
**Scope:** `src/lib/env.ts` (Zod refinement: if prod, require key), `src/lib/crypto/encrypt.ts` (remove plaintext fallback path or gate behind dev-only flag), docs update.
**Outcome:** Prod boot fails fast if key is absent, never silently degrades to plaintext.

### Slot 6 (5:30–7:30) — C4: Per-enterprise rate + token budgets
**Title:** Add `enterpriseId`-keyed rate limit layer and daily token budget on AI routes.
**Why it matters:** Noisy-neighbor + runaway cost are the two AI-native production risks.
**Scope:** `src/lib/rate-limit.ts` (add `enterpriseLimit(key, max, windowMs)` using Redis if available), apply on `/api/blueprints`, `/api/blueprints/[id]/refine`, `/api/blueprints/[id]/companion/chat`, `/api/intake/sessions/[id]/chat`, `/api/help/chat`. Add `enterpriseTokenBudget` check: read `enterpriseSettings.dailyTokenBudget`, reject with `BUDGET_EXCEEDED` if `SUM(tokens)` from today's `logAICall` rows exceeds budget.
**Outcome:** Platform-level Bedrock starvation from a single tenant is prevented. Cost runaway is capped.
**Risk if skipped:** Day-1 incident when a single customer scripts their workflow.

### Slot 7 (7:30–8:00) — H2 seed: minimal APM + structured logging pass
**Title:** Stand up a pragmatic observability floor.
**Why it matters:** Without this, you cannot triage the next incident.
**Scope:** Add `instrumentation.ts` for Vercel OTel (one file, ~30 lines). Replace `console.error` in the 6 critical routes touched today with `logger.error(...)`. Add a `/api/monitor/health` endpoint returning `{ db: ok, redis: ok|fallback, bedrock: probe, version, uptime }` suitable for a status page.
**Outcome:** Tracing enabled platform-wide, core routes structured-logged, health endpoint live.

### What gets deferred to week 1 (not today)

- H3 circuit breaker, H4 webhook backoff/DLQ, H5 cron queueing, H6 intake prompt sanitization, H8 E2E tests. All important; none are platform-killers if launched this week under monitoring.

---

## Phase 5 — Deep Execution Design (Top 3)

### 5.1 — C1: DB Pool Size

**Current state** (`src/lib/db/index.ts`):
```ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { env } from "@/lib/env";

const client = postgres(env.DATABASE_URL, { max: 1 });
export const db = drizzle(client, { schema });
```

**Change set:**

1. **`src/lib/env.ts`** — add to the Zod schema:
   ```ts
   DB_POOL_MAX: z.coerce.number().int().min(1).max(100).default(20),
   DB_IDLE_TIMEOUT_SEC: z.coerce.number().int().min(1).default(30),
   DB_CONNECT_TIMEOUT_SEC: z.coerce.number().int().min(1).default(10),
   ```

2. **`src/lib/db/index.ts`** — update client construction:
   ```ts
   const client = postgres(env.DATABASE_URL, {
     max: env.DB_POOL_MAX,
     idle_timeout: env.DB_IDLE_TIMEOUT_SEC,
     connect_timeout: env.DB_CONNECT_TIMEOUT_SEC,
     onnotice: () => {}, // silence NOTICE logs in prod
   });
   ```

3. **`.env.example`** — document defaults; note that on serverless (Vercel Functions) each invocation gets its own pool, so `max: 5-10` per invocation is plenty; on long-running Node (Docker/EC2) use 20–40.

4. **Validation:** load-test with `k6` or `autocannon`:
   - `autocannon -c 50 -d 30 http://localhost:3000/api/dashboard/summary` — with `max: 1` this will queue. With `max: 20` it should hold p95 < 500ms on a warm cache.
   - Log line: `logger.info("db.pool.init", { max: env.DB_POOL_MAX })` at client construction so prod config is observable.

5. **Rollback plan:** revert env var to `1`. No schema change, no data migration. Safe.

**Test:** `src/lib/db/__tests__/pool.test.ts` — spin up 25 concurrent `db.select().from(users).limit(1)` calls, assert all resolve in < 2s.

---

### 5.2 — C2: Validation enforcement in blueprint review

**Current state** (`src/app/api/blueprints/[id]/review/route.ts`): approves based on role, SOD, status, chain step — but never inspects `blueprint.validationReport`.

**Design:**

1. **Read the validation report right after the existing status check** (around line ~80, after `blueprint.status !== "in_review"` guard):
   ```ts
   if (action === "approve") {
     const report = blueprint.validationReport as ValidationReport | null;
     const errorSeverityViolations = (report?.violations ?? [])
       .filter((v) => v.severity === "error");

     if (errorSeverityViolations.length > 0) {
       // Admins with explicit override flag may approve non-compliant blueprints;
       // this generates a separate high-severity audit event.
       const override = body.governanceOverride === true && authSession.user.role === "admin";

       if (!override) {
         return apiError(
           ErrorCode.GOVERNANCE_BLOCKED,
           "Blueprint has unresolved error-severity governance violations. Request changes or resolve violations before approving.",
           { violations: errorSeverityViolations.map((v) => ({ ruleId: v.ruleId, path: v.path, message: v.message })) }
         );
       }

       // Emit a separate audit entry capturing the override decision.
       await writeAuditLog(tx, {
         action: "blueprint.approved.override",
         entityType: "blueprint",
         entityId: id,
         actorEmail: userEmail,
         actorRole: userRole,
         enterpriseId: blueprint.enterpriseId,
         metadata: { violations: errorSeverityViolations, reason: body.overrideReason ?? null },
       });
     }
   }
   ```

2. **Extend `ReviewBody` Zod schema:**
   ```ts
   const ReviewBody = z.object({
     action: z.enum(["approve", "reject", "request_changes"]),
     comment: z.string().max(4000).optional(),
     governanceOverride: z.boolean().optional(),
     overrideReason: z.string().min(20).max(2000).optional(),
   }).refine(
     (d) => !d.governanceOverride || (d.overrideReason && d.overrideReason.length >= 20),
     { message: "governanceOverride requires overrideReason with ≥20 chars" }
   );
   ```

3. **Add new error code** in `src/lib/errors.ts`: `GOVERNANCE_BLOCKED = "GOVERNANCE_BLOCKED"` → HTTP 409 Conflict.

4. **UI update** (`src/components/review/` and `src/app/blueprints/[id]/page.tsx`): when `validationReport` contains errors, replace the primary "Approve" button with a destructive-styled "Approve with override (admin only)" button that opens a modal requiring the reason. Non-admin reviewers see a disabled approve button with inline "Resolve violations first" explanation.

5. **Spec + ADR:**
   - Update `docs/specs/blueprint-review-ui.md` §Approval rules.
   - Write `docs/decisions/017-error-severity-blocks-approval.md` citing INTELLIOS_SYSTEM_DESCRIPTION.md §2.2 and ADR-005. Status: `proposed`.

6. **Tests** (`src/__tests__/blueprints/review.test.ts`):
   - `rejects approval when validationReport.valid === false and no override`
   - `allows admin override with reason, emits blueprint.approved.override audit event`
   - `non-admin cannot override even with flag`
   - `rejects override when reason missing or <20 chars`
   - `approves normally when validationReport.valid === true`

7. **Rollback plan:** feature-flag via env `FEATURE_BLOCK_NONCOMPLIANT_APPROVAL` (default true). If a real customer has approved blueprints in flight with existing error violations, flag allows a 24h grace while they clear the backlog.

**Validation:** Run the existing multi-step-approval test suite; extend with the new cases above. Manually smoke-test in staging: create blueprint, inject violation, attempt approval as reviewer (expect 409), attempt as admin without override (expect 409), attempt as admin with override + reason (expect 200 + override audit event).

---

### 5.3 — C3: Atomic entity + audit writes

**Current state:** Blueprint insert and audit insert run as separate statements; audit insert is wrapped in `try/catch { console.error }` at `src/app/api/blueprints/route.ts:145-158`. Same pattern in review, deploy, policy routes. Event publish is separate again.

**Design principle:** entity mutation and audit entry must share a transaction. Events (`publishEvent`) fire *after* commit to avoid double-send on retry.

**Change set:**

1. **Refactor `src/lib/audit/log.ts`** — make `writeAuditLog` transaction-aware:
   ```ts
   import type { PgTransaction } from "drizzle-orm/pg-core";
   type Tx = PgTransaction<any, any, any>;

   export async function writeAuditLog(
     tx: Tx | typeof db,
     entry: AuditLogEntry
   ): Promise<void> {
     await tx.insert(auditLog).values({ ...entry, createdAt: new Date() });
   }
   ```
   Callers outside a transaction pass `db`; callers inside pass `tx`.

2. **Refactor `src/lib/events/publish.ts`** — split into two phases:
   - `publishEventPostCommit(payload)` queues the event in a local array returned from the transaction.
   - The route awaits the transaction, then iterates the queued events and calls `dispatchEvent(event)`.

3. **Update the 4 core write routes (today's scope):**

   **`src/app/api/blueprints/route.ts`** — today this looks like:
   ```ts
   const [blueprint] = await db.insert(agentBlueprints).values({...}).returning();
   try { await db.insert(auditLog).values({...}); } catch (e) { console.error(...) }
   await publishEvent({...});
   ```

   Becomes:
   ```ts
   const { blueprint, pendingEvents } = await db.transaction(async (tx) => {
     const [bp] = await tx.insert(agentBlueprints).values({...}).returning();
     await writeAuditLog(tx, {
       action: "blueprint.created",
       entityType: "blueprint",
       entityId: bp.id,
       actorEmail: authSession.user.email!,
       actorRole: authSession.user.role!,
       enterpriseId,
       metadata: { agentId: bp.agentId, name: bp.name },
     });
     return {
       blueprint: bp,
       pendingEvents: [{
         event: { type: "blueprint.created", payload: { blueprintId: bp.id, agentId: bp.agentId, name: bp.name ?? "", createdBy: authSession.user.email! } },
         actor: { email: authSession.user.email!, role: authSession.user.role },
         entity: { type: "blueprint", id: bp.id },
         enterpriseId,
       }],
     };
   });
   // Post-commit dispatch — failures here do NOT roll back the primary write.
   for (const e of pendingEvents) {
     try { await dispatchEvent(e); } catch (err) { logger.error("event.dispatch.failed", { err: serializeError(err) }); }
   }
   ```

   Apply the same pattern to `blueprints/[id]/review/route.ts`, `blueprints/[id]/deploy/agentcore/route.ts`, `governance/policies/route.ts` (create + update).

4. **Semantics of post-commit event dispatch:**
   - Events *must not* cause rollback; they reflect already-committed state.
   - Failed webhook dispatches are already captured in `webhookDeliveries` with retry state — no change needed.
   - Failed notification writes are logged but don't affect the primary operation.

5. **Tests** (`src/__tests__/reliability/atomicity.test.ts`):
   - Using a test `db` with a mocked `auditLog` that throws: verify primary insert is rolled back.
   - Using a test `db` with a mocked event dispatcher that throws: verify primary insert is *not* rolled back and event failure is logged.
   - Verify `createdAt` on auditLog matches the transaction's commit time (within tolerance).

6. **Migration concerns:** none — schema unchanged. Risk is purely behavioral: we're adding a transaction boundary that was missing. Ensure no long-running operations (Bedrock calls) are inside the transaction. Confirm: in `blueprints/route.ts`, `validateBlueprint()` and `generateBlueprint()` run *before* the transaction opens. Good.

7. **Follow-up (week 1, not today):** audit all remaining write routes (~90 by the reliability agent's count) and convert them one domain at a time: intake → review → deploy → webhooks → policies → integrations.

**Validation:** Run the unit tests above. Run the full integration suite. Deploy to staging, run a chaos test — inject a 50% failure rate in audit inserts, verify primary mutations roll back and users see a clear error.

**Rollback plan:** revert the 4 route changes; schema untouched; `writeAuditLog` signature change is backward-compatible (takes `db | tx`).

---

## Final Summary

### Production readiness score: **72 / 100**

**Breakdown:**
- Architecture: 8/10
- Reliability: 6/10 (C1, C3, C6 drag)
- Security & Compliance: 8/10 (strong, minus C4/C5)
- Performance: 6/10 (C1 is decisive; otherwise fine)
- AI Layer Quality: 7/10 (resilient wrapper good; no evals, no budgets)
- Observability: 4/10 (the weakest dimension)
- DX: 9/10
- UX: 8/10

### Top risks

1. **DB pool `max: 1`** — guaranteed outage under concurrent load.
2. **Non-compliant blueprint approval** — the platform's central promise is unenforced in code.
3. **Non-atomic audit writes** — forensic integrity compromised; SOC2 blocker.
4. **Tenant cost/rate starvation** — one noisy customer degrades the whole platform.
5. **No observability floor** — every production incident will be diagnosed by grep.

### Recommended next phase (post-today)

**Week 1:** finish logger migration (H1), add circuit breaker (H3), webhook exponential backoff + DLQ (H4), cron job queue (H5), intake prompt sanitization (H6), re-enable E2E tests in CI with a staging env (H8), extend atomic-write refactor to all remaining lifecycle routes.

**Week 2:** prompt versioning (M3), prompt evals (M5), per-tenant cost attribution + dashboard (partial H2 + M follow-up), decide LangGraph (build or remove from spec — M4), nonce-based CSP (M8).

**Week 3–4:** PDF evidence renderer (M9 / ADR-015), Terraform for CloudWatch + alarms (M7), containerized deploy path hardening (H7), retention policy for audit log (L6).

**Governance:** publish ADR-017 (approval blocks on error-severity violations), ADR-018 (atomicity standard for lifecycle writes), ADR-019 (observability standard). Update `docs/open-questions.md` with OQ-010 (LangGraph: build or strike) and OQ-011 (per-enterprise cost attribution model).

With the six P0 items in Phase 4 landed today, the platform crosses from "talented prototype" into "defensible enterprise SaaS." The team has been disciplined about documentation and ADRs — that same discipline applied to the operational gaps above will close the remaining distance to a confident GA launch within 2–3 weeks.

---

*Generated 2026-04-17. All file paths and line numbers verified against `main` at time of review. Questions or disagreements with any finding — open an ADR or refute with code; both are welcome.*
