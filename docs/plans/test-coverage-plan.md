# Test Coverage Expansion Plan

**Date:** 2026-04-08
**Context:** 139 sessions of feature development complete. 417 test cases across 22 files. Zero API route tests. Zero component tests. 28 of 38 lib modules untested.

---

## Validated State of Testing

### What exists (working well)

| Domain | Files | Cases | Notes |
|--------|-------|-------|-------|
| Core intake logic | 4 | 64 | coverage, domains, model-selector, readiness — all pure functions, well-structured |
| Governance evaluation | 1 | 22 | Rule operators, policy matching — pure functions |
| Auth & enterprise scope | 2 | 34 | Role-based access, scope enforcement |
| Security fixes | 4 | 86 | P1/P2 vulnerabilities, SSRF, crypto, RLS, open redirect |
| AgentCore translation | 2 | 49 | ABP-to-Bedrock mapping, deploy route |
| Infrastructure | 3 | 77 | errors, parse-body, rate-limit — pure functions |
| Webhooks | 1 | 29 | Delivery, retry, signatures — mocked DB/fetch |
| ABP migration | 1 | 13 | Version detection and migration |
| SLA config | 1 | 7 | Configuration logic |
| E2E | 2 | 12 | Auth flows, API health (Playwright) |
| **Total** | **22** | **417** | |

### What's missing

| Gap | Scale | Risk |
|-----|-------|------|
| API route tests | 0 of 129 routes tested | **Critical** — routes contain auth gates, governance checks, state machine transitions, external service calls. A route-level bug bypasses all lib-level tests. |
| Component tests | 0 of 121 components tested | **Low for MVP** — UI rendering bugs are visible to QA. Not a compliance gap. |
| Untested lib modules | 28 of 38 | **Mixed** — some are thin wrappers (query, types), others are critical (db, deploy, events, generation) |
| Shared test utilities | None | **Productivity drag** — fixture builders are duplicated across 7+ files |

### What does NOT need testing (validated exclusions)

- **Catalyst UI Kit (27 components):** Third-party copy-paste components from Tailwind Labs. Tested upstream. Customizations are CSS-only.
- **Type definitions (`lib/types/`):** No runtime behavior.
- **Query keys/fetchers (`lib/query/`):** Thin wrappers around `fetch`. Testing these tests `fetch`, not business logic.
- **Loading/error skeletons:** Static React components with no logic.
- **Cron routes:** Thin triggers that call tested lib functions. Test the lib functions instead.

---

## Strategy: Test the Governance Contract

Intellios sells governance — the promise that an enterprise's AI agents are created, validated, and deployed under policy control. The test suite must prove that this contract holds. That means testing the **state machine boundaries** where decisions are enforced, not the pure-function internals (those are already well-covered).

### Priority framework

```
Impact = (blast radius of a bug) × (probability of regression) × (buyer visibility)
```

**Highest impact:** A bug that lets a blueprint bypass governance review and reach production. A buyer's security team will look for tests that prove this can't happen.

**Second highest:** A bug that corrupts data — wrong status, lost policy, orphaned webhook.

**Third:** A bug that leaks data across tenants or exposes secrets.

**Lowest priority for now:** UI rendering, read-only endpoints, analytics dashboards.

---

## Plan: 5 Work Packages

### WP-1: Test Infrastructure (prerequisite, ~30 min)

Create shared test utilities that every subsequent test will use:

**Deliverables:**
- `src/__tests__/helpers/mock-db.ts` — Standardized Drizzle mock that intercepts `db.select()`, `db.insert()`, `db.update()`, `db.delete()` chains. Reusable across all route tests.
- `src/__tests__/helpers/mock-auth.ts` — Standardized auth session mock (`requireAuth`, `getServerSession`) with presets for each role (architect, reviewer, compliance_officer, admin, viewer).
- `src/__tests__/helpers/fixtures.ts` — Factory functions for core objects: `makeBlueprint()`, `makePolicy()`, `makeSession()`, `makeUser()`, `makeWebhook()`, `makeApiKey()`. Consolidates the 7+ existing ad-hoc factories.
- `src/__tests__/helpers/route-test.ts` — Helper that constructs a `Request` object and calls a route handler, returning the `Response`. Eliminates boilerplate in every route test.

**Why first:** Every subsequent work package depends on these. The current codebase duplicates fixture builders across 7 files. Centralizing them once saves hours.

---

### WP-2: Blueprint Lifecycle Routes (highest risk, ~2 hrs)

The blueprint state machine is the core governance contract: `draft → in_review → approved → deployed` with rejection and deprecation paths. A bug here is a governance failure.

**Routes to test:**
1. `POST /api/blueprints` — Create. Verify: returns draft status, saves to DB, audit log.
2. `POST /api/blueprints/[id]/status` — Transition. Verify:
   - `draft → in_review`: succeeds with valid blueprint
   - `draft → approved`: **blocked** (must go through review)
   - `in_review → approved`: succeeds for reviewer role
   - `in_review → rejected`: succeeds, stores rejection reason
   - `approved → deployed`: succeeds only with governance validation passing
   - `deployed → deprecated`: succeeds
   - `rejected → draft`: succeeds (back to editing)
   - Invalid transitions: all return 400
   - Wrong role: returns 403
3. `POST /api/blueprints/[id]/review` — Approval gate. Verify:
   - Only `reviewer` or `admin` can approve
   - Blueprint must be `in_review` status
   - Approval stores reviewer identity
   - Rejection requires comment
4. `POST /api/blueprints/[id]/validate` — Governance check. Verify:
   - Runs all active policies against blueprint
   - Returns violation list
   - Does not change blueprint status
5. `POST /api/blueprints/[id]/deploy/agentcore` — Deploy. Verify:
   - Blueprint must be `approved`
   - AWS call is attempted (mocked)
   - Status moves to `deployed` on success
   - Rolls back on AWS failure

**Test file:** `src/__tests__/routes/blueprint-lifecycle.test.ts`
**Expected cases:** ~40

---

### WP-3: Governance Policy Routes (~1.5 hrs)

Policies are the rules that blueprints are validated against. A bug in policy CRUD means either policies don't apply (governance gap) or can't be created (workflow blocker).

**Routes to test:**
1. `POST /api/governance/policies` — Create. Verify: saves with correct structure, version 1, active by default.
2. `PUT /api/governance/policies/[id]` — Update. Verify: increments version, preserves history, scoped agents respected.
3. `DELETE /api/governance/policies/[id]` — Delete. Verify: checks for dependents, blocks if blueprints rely on it (or soft-deletes).
4. `POST /api/governance/templates/[pack]/apply` — Bulk apply. Verify: creates multiple policies from template, correct enterprise scoping.
5. `GET /api/governance/policies/[id]/dependents` — Read. Verify: returns blueprints that reference this policy.

**Cross-cutting concerns to verify:**
- Enterprise scope isolation — policy from enterprise A not visible to enterprise B
- Role authorization — only admin/compliance_officer can mutate policies
- Audit logging — every mutation logged

**Test file:** `src/__tests__/routes/governance-policies.test.ts`
**Expected cases:** ~25

---

### WP-4: Auth & Identity Routes (~1.5 hrs)

These routes handle user creation, credential management, and session security. Already partially covered by `security-fixes.test.ts`, but that file tests the security properties (race conditions, timing attacks) — not the functional behavior (successful registration, valid login, role assignment).

**Routes to test:**
1. `POST /api/auth/register` — Verify: creates user, hashes password, assigns default role, rejects duplicate email.
2. `POST /api/auth/forgot-password` — Verify: generates token, sends email (mocked), token has expiry.
3. `POST /api/auth/reset-password` — Verify: validates token, updates password hash, invalidates token. (Security properties already tested — test happy path + validation.)
4. `POST /api/auth/invite/accept` — Verify: creates user from invitation, assigns invited role, marks invitation used. (Race condition already tested — test functional flow.)
5. `POST /api/admin/users` — Verify: admin-only, creates user with role, rejects invalid role.
6. `POST /api/admin/api-keys` — Verify: generates key, hashes for storage, returns plaintext once, scope validation.
7. `DELETE /api/admin/api-keys/[id]` — Verify: revokes key, cannot use revoked key.

**Test file:** `src/__tests__/routes/auth-identity.test.ts`
**Expected cases:** ~30

---

### WP-5: Intake Finalization Route (~1 hr)

The intake → blueprint generation pipeline is the second most critical flow after the governance lifecycle. Finalization takes a conversational intake session and produces an ABP via Claude.

**Routes to test:**
1. `POST /api/intake/sessions/[id]/finalize` — Verify:
   - Rejects if session is not ready (insufficient domain coverage)
   - Calls generation engine (mocked LLM)
   - Stores generated blueprint in registry with `draft` status
   - Links blueprint to intake session
   - Returns blueprint ID
   - Rejects duplicate finalization of same session
   - Handles LLM failure gracefully (no partial blueprint)

**Test file:** `src/__tests__/routes/intake-finalization.test.ts`
**Expected cases:** ~12

---

## Vitest Config Update

Expand coverage tracking to include all tested modules:

```ts
coverage: {
  include: [
    "lib/**",
    "app/api/**",
  ],
  exclude: [
    "lib/types/**",
    "lib/query/**",
    "**/*.d.ts",
  ],
  thresholds: {
    lines: 60,     // Realistic target given current state
    functions: 60,
  },
},
```

---

## What This Plan Does NOT Include (and why)

| Excluded | Reason |
|----------|--------|
| Component tests | No compliance value. UI bugs are visible to manual QA. Add after route coverage is solid. |
| E2E expansion | Playwright is configured and working. 12 cases cover auth flows. Expand once the app runs against a real DB. |
| Lib module unit tests (events, notifications, telemetry) | Thin wrappers or fire-and-forget. Testing routes that call them is more valuable than testing them in isolation. |
| Integration tests with real DB | Requires PostgreSQL in CI. Valuable but a separate infrastructure investment. |
| Performance/load testing | Post-MVP concern. |

---

## Execution: 3-Session Split

The work is split across three Cowork sessions to fit within context window limits and maintain test quality. Each session is self-contained: it reads the code it needs, writes tests, and verifies they pass before ending.

### Session A: WP-1 + WP-2 — Infrastructure + Blueprint Lifecycle ✅ COMPLETE (Session 141)

**Completed 2026-04-08.** Created 4 helper modules + 56-case test suite (revised from 40-case estimate after validation revealed multi-step approval chain complexity).

**Deliverables:**
- `src/__tests__/blueprints/helpers/mock-db.ts` — Chainable Drizzle mock
- `src/__tests__/blueprints/helpers/mock-auth.ts` — Auth session helpers
- `src/__tests__/blueprints/helpers/fixtures.ts` — Factory functions with deep-merge
- `src/__tests__/blueprints/helpers/route-test-utils.ts` — NextRequest builder + async params
- `src/__tests__/blueprints/blueprint-lifecycle.test.ts` — 56 cases across 5 routes

**Findings:** SOD gap in legacy single-step status route — **fixed in Session 144 (ADR-013)**. `designer` role authenticated but always 403'd on `in_review`. Multiple truncated source files on host.

**Actual context usage:** ~71% (higher than 60% estimate due to 16 extra test cases)

---

### Session B: WP-3 + WP-4 — Governance Policies + Auth & Identity ✅ COMPLETE (Session 142)

**Completed 2026-04-08.** Created 2 test files with 67 cases total (revised from 55-case estimate after adding enterprise scope isolation tests and security pattern verification).

**Deliverables:**
- `src/__tests__/governance/governance-policies.test.ts` — 36 cases across 7 route groups
- `src/__tests__/auth/auth-identity.test.ts` — 31 cases across 7 route groups

**Findings:** Session A mock-db required extension — governance routes use bare `await db.select().from().where()` without `.limit()`, requiring a thenable mock pattern. Auth routes require `node:crypto` mock (not just `crypto`) due to Node.js module aliasing. Insert chain needed `onConflictDoUpdate` extension for enterprise settings.

**Actual context usage:** ~60% (slightly higher than 55% estimate due to mock debugging)

---

### Session C: WP-5 + Config + Verification + Docs ✅ COMPLETE (Session 143)

**Completed 2026-04-08.** Created 1 test file with 12 cases (matching estimate). All passed on first run — no fixes needed.

**Deliverables:**
- `src/__tests__/intake/intake-finalization.test.ts` — 12 cases
- `src/vitest.config.ts` — expanded coverage tracking (lib/** + app/api/**)
- Full verification: 135 new cases across 4 files, all passing

**Note:** The finalization route does not call the LLM/generation engine (contrary to the plan's assumption). It validates the payload and marks the session as `completed`. Generation happens in a separate flow (POST /api/blueprints). This made the tests simpler than expected.

**Actual context usage:** ~35% (simpler than estimated)

---

### Session dependency graph

```
Session A (WP-1 + WP-2)
  │
  ├── Session B (WP-3 + WP-4)    ← depends on helpers from A
  │
  └── Session C (WP-5 + Config)   ← depends on helpers from A
```

Sessions B and C are independent of each other and can run in either order. Session A must complete first.

---

## Expected Outcome

| Metric | Before | After A | After B | After C (final) |
|--------|--------|---------|---------|------------------|
| Test files | 22 | 26 (+4 helpers, +1 test) | 28 (+2 tests) ✅ actual | 29 (+1 test) ✅ actual |
| Test cases | 417 | 464 (+56) ✅ actual | 531 (+67) ✅ actual | 552 (+12) ✅ actual · **554 after SOD fix** |
| API routes with tests | 0 | 8 ✅ actual | 21 ✅ actual | 22 ✅ actual |
| Critical (T1) routes tested | 0/41 | 7/41 ✅ actual | 18/41 ✅ actual | 19/41 (46%) ✅ actual |
| Governance lifecycle tested | No | **Yes** ✅ | Yes + policies ✅ | Yes + policies + intake ✅ |
| Shared test utilities | 0 | 4 modules ✅ | 4 modules ✅ | 4 modules ✅ |

The goal is not 100% coverage — it's proving the governance contract holds under test. A buyer's due diligence reviewer should be able to read `blueprint-lifecycle.test.ts` and see that unauthorized status transitions, role bypasses, and unvalidated deployments are explicitly tested and rejected.
