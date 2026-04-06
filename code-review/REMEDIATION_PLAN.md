# Remediation Plan — Intellios Code Review

**Date**: 2026-04-05
**Scope**: All findings from Phases 0-2 of comprehensive code review
**Total Findings**: 41 (4 CRITICAL, 12 HIGH, 20 MEDIUM, 5 LOW)

---

## Executive Summary

This remediation plan prioritizes all 41 identified issues into three timeframes: **IMMEDIATE** (blocking deployment), **SHORT-TERM** (next 1-2 sprints), and **MEDIUM-TERM** (1-2 months). The plan also identifies architectural improvements for the **LONG-TERM** roadmap.

**Critical Path**: 3 CRITICAL and 12 HIGH findings must be addressed before the next production deployment. Together, they represent data integrity violations, authorization bypasses, information disclosure, and DoS vectors.

---

## IMMEDIATE (Before Next Deployment)

These findings must be fixed before deploying to production. Total estimated effort: **40-60 engineer-hours** (2-3 engineer-sprints).

### P1-SEC-001 & P1-SEC-002: Database Transaction Fixes (CRITICAL)

**Files**: `src/app/api/auth/reset-password/route.ts` (lines 43-68), `src/app/api/auth/invite/accept/route.ts` (lines 35-76)

**Issues**:
- Password reset token reuse via race condition (check-then-update without lock)
- Invitation acceptance duplicate account creation (check-then-insert without lock)

**Why CRITICAL**: These are TOCTOU (Time-Of-Check-Time-Of-Use) race conditions that allow:
- Password reset tokens to be used multiple times by concurrent requests
- Duplicate user accounts to be created from the same invitation
- Both corrupt fundamental data integrity

**Required Changes**:
1. Wrap SELECT-UPDATE-UPDATE in password reset within `db.transaction()`
2. Wrap SELECT-CHECK-INSERT-UPDATE in invitation acceptance within `db.transaction()`
3. Ensure PostgreSQL uses row-level locking (SELECT ... FOR UPDATE) or rely on Drizzle's transaction isolation

**Effort**: 4 engineer-hours
**Risk**: Low (isolated to two endpoints)
**Testing**: Add integration tests for concurrent requests with same token/invitation

**Recommended Implementation**:
```typescript
// Password reset
await db.transaction(async (tx) => {
  const resetRecord = await tx.query.passwordResetTokens.findFirst({...});
  if (!resetRecord) throw new Error("invalid");
  await tx.update(passwordResetTokens).set({ usedAt: new Date() }).where(...);
  await tx.update(users).set({ passwordHash }).where(...);
});

// Invitation acceptance
await db.transaction(async (tx) => {
  const invitation = await tx.query.userInvitations.findFirst({...});
  const existingUser = await tx.query.users.findFirst({...});
  if (existingUser) throw new Error("user exists");
  const [newUser] = await tx.insert(users).values({...}).returning();
  await tx.update(userInvitations).set({ acceptedAt: new Date() }).where(...);
});
```

**Dependency Chain**: None (can be fixed independently)

---

### P1-BUG-001: Webhook Test Delivery WHERE Clause Fix (CRITICAL)

**File**: `src/lib/webhooks/deliver.ts` (line 195)

**Issue**: Test webhook delivery updates ALL delivery records for the webhook instead of the specific delivery record, corrupting historical data.

**Why CRITICAL**: Running a webhook test destroys the delivery history for that webhook. Masks real failures and makes debugging/monitoring impossible.

**Required Change**:
```typescript
// Line 195: WRONG
.where(eq(webhookDeliveries.webhookId, webhookId));

// CORRECT
const [deliveryRow] = await db.insert(webhookDeliveries).values({...}).returning({ id: webhookDeliveries.id });
// ... later ...
.where(eq(webhookDeliveries.id, deliveryRow.id));
```

**Effort**: 1 engineer-hour
**Risk**: Very low (one-line fix with clear correct behavior)
**Testing**: Create webhook, send real event, verify delivery record. Run test delivery, verify test record is separate and real record unchanged.

**Dependency Chain**: None

---

### P2-SEC-001: Telemetry API Key Enforcement (CRITICAL)

**File**: `src/app/api/telemetry/ingest/route.ts` (lines 39-45)

**Issue**: Telemetry ingest endpoint is completely unauthenticated when `TELEMETRY_API_KEY` is not configured. Allows arbitrary metric injection.

**Why CRITICAL**: Poisoned telemetry data corrupts monitoring dashboards, triggers false alerts, and corrupts governance compliance evaluation. An attacker can inject fake metrics for any deployed agent.

**Required Change**: Either (A) make TELEMETRY_API_KEY required in env.ts, or (B) reject requests when key is unset.

**Recommended Approach**: Option B (explicit rejection) is safer for staging environments:

```typescript
const telemetryKey = process.env.TELEMETRY_API_KEY;
if (!telemetryKey) {
  return NextResponse.json(
    { error: "Telemetry authentication not configured" },
    { status: 503 }
  );
}
if (request.headers.get("authorization") !== `Bearer ${telemetryKey}`) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

**Effort**: 1 engineer-hour
**Risk**: Low (may fail staging env if TELEMETRY_API_KEY is not set, which is intentional)
**Testing**: Deploy without TELEMETRY_API_KEY, verify 503 response. Deploy with key, verify auth is required.

**Dependency Chain**: None

---

### P3-CONSTRAINT-001: Database Schema Uniqueness Constraint

**File**: `src/lib/db/schema.ts` (agentBlueprints table)

**Issue**: No UNIQUE constraint on (agentId, version). Multiple concurrent version creation requests can create duplicates.

**Why Important**: Enables P2-BUG-003 race condition. Violates version uniqueness invariant.

**Required Change**: Add `unique()` constraint:

```typescript
export const agentBlueprints = pgTable(
  "agent_blueprints",
  { /* ... */ },
  (t) => ({
    uniqueVersionPerAgent: unique().on(t.agentId, t.version), // Add this
  })
);
```

Then create a Drizzle migration.

**Effort**: 2 engineer-hours (includes migration creation and testing)
**Risk**: Low (adding constraint to empty/valid data set)
**Testing**: Verify constraint blocks duplicate version creation. Test migration on staging DB.

**Dependency Chain**: Complements P2-BUG-003 fix

---

### P2-SEC-003: Blueprint Fields Route Zod Validation (HIGH)

**File**: `src/app/api/blueprints/[id]/fields/route.ts` (lines 84-86)

**Issue**: Route bypasses Zod validation, accepts raw `request.json()` without schema. Allows arbitrary field modification and potential prototype pollution.

**Why Important**: Fields route modifies ABP documents directly. Invalid input can corrupt critical governance sections.

**Required Change**:

```typescript
const FieldEditSchema = z.object({
  fieldPath: z.string()
    .min(1)
    .max(200)
    .regex(/^[a-zA-Z0-9._\[\]]+$/, "Invalid path characters"), // Whitelist safe paths
  value: z.unknown(), // ABP uses mixed types; validate per field
});

const { data: body, error: bodyError } = await parseBody(request, FieldEditSchema);
if (bodyError) {
  return apiError(ErrorCode.BAD_REQUEST, "Invalid field edit request");
}
```

**Effort**: 3 engineer-hours
**Risk**: Medium (defines whitelist of editable paths — must match business rules)
**Testing**: Test valid field paths. Test invalid/injection attempts (proto, systemPrompt overwrite). Verify existing valid edits still work.

**Dependency Chain**: None (but complements P2-SEC-007 pattern standardization)

---

### P1-SEC-008: Middleware Security Header Stripping (MEDIUM but important for IMMEDIATE)

**File**: `src/middleware.ts` (lines 77-155)

**Issue**: Middleware does not delete client-supplied security headers before processing, allowing header spoofing on public routes.

**Why Included in IMMEDIATE**: Simple 3-line fix that prevents future header injection attacks on any new public endpoints.

**Required Change**:

```typescript
const requestHeaders = new Headers(req.headers);
// DELETE client-supplied auth headers FIRST (before any processing)
requestHeaders.delete(ENTERPRISE_ID_HEADER);      // x-enterprise-id
requestHeaders.delete(ROLE_HEADER);               // x-user-role
requestHeaders.delete(ACTOR_EMAIL_HEADER);        // x-actor-email
// Then set authenticated values
if (isLoggedIn && req.auth?.user) {
  requestHeaders.set(ENTERPRISE_ID_HEADER, user.enterpriseId ?? "__null__");
  // ... rest of code ...
}
```

**Effort**: 0.5 engineer-hours
**Risk**: Very low
**Testing**: Send request with x-enterprise-id header to public route, verify it's not used.

**Dependency Chain**: None

---

## SHORT-TERM (1-2 Sprints)

These findings improve security and data integrity but are not immediate blockers if compensating controls are in place. Total estimated effort: **60-90 engineer-hours** (3-4 engineer-sprints).

### Security Findings Group 1: Input Validation & Rate Limiting (HIGH)

**Findings**: P1-SEC-005, P1-SEC-010, P2-SEC-005, P2-SEC-007

#### P1-SEC-005: API Key Creation Validation

**File**: `src/app/api/admin/api-keys/route.ts` (lines 40-41)

**Issue**: Bypasses Zod validation, uses raw `request.json()` and type assertion.

**Fix**:
```typescript
const CreateApiKeySchema = z.object({
  name: z.string().min(1).max(100).trim(),
  scopes: z.array(z.string().refine(s => VALID_SCOPES.includes(s))).max(20),
});
const { data: body, error: bodyError } = await parseBody(request, CreateApiKeySchema);
```

**Effort**: 2 engineer-hours
**Risk**: Low

#### P1-SEC-010: Invitation Acceptance Rate Limiting

**File**: `src/app/api/auth/invite/accept/route.ts`

**Issue**: No rate limiting (unlike register, forgot-password, reset-password endpoints).

**Fix**:
```typescript
const rateLimitResponse = await rateLimit(ip, {
  endpoint: "invite-accept",
  max: 10,
  windowMs: 60 * 60 * 1000,
});
if (rateLimitResponse) return rateLimitResponse;
```

**Effort**: 1 engineer-hour
**Risk**: Very low

#### P2-SEC-005: Public Invitation Chat Rate Limiting

**File**: `src/app/api/intake/invitations/[token]/chat/route.ts`

**Issue**: Public endpoint allows unlimited LLM calls via leaked/brute-forced invitation token.

**Fix**:
```typescript
const rateLimitResponse = await rateLimit(ip, {
  endpoint: "invitation-chat",
  max: 30,
  windowMs: 60 * 60 * 1000,
});
if (rateLimitResponse) return rateLimitResponse;
```

**Effort**: 1 engineer-hour
**Risk**: Very low

#### P2-SEC-007: Consistent parseBody Pattern

**Files**: Multiple routes using raw `request.json()`

**Issue**: Inconsistent error handling and missing validation across routes.

**Fix**: Audit all routes and replace raw JSON parsing with `parseBody()` + Zod schemas.

**Effort**: 4 engineer-hours
**Risk**: Low (standardization exercise)

**Group Total Effort**: 8 engineer-hours

---

### Security Findings Group 2: Cryptographic Hardening (HIGH)

**Findings**: P1-SEC-006, P2-SEC-002

#### P1-SEC-006: Webhook Secret Encryption at Rest

**Files**: `src/lib/webhooks/deliver.ts`, `src/lib/webhooks/dispatch.ts`

**Issue**: Webhook HMAC secrets stored as plaintext. Database breach exposes all webhook endpoints.

**Solution**: Apply application-level AES-256-GCM encryption to secrets before storage. Decrypt only for HMAC computation.

**Implementation Steps**:
1. Add `WEBHOOK_ENCRYPTION_KEY` (32-byte hex) to env.ts
2. Create `encryptSecret()` and `decryptSecret()` utility functions in `src/lib/webhooks/crypto.ts`
3. Update webhook creation (POST) to encrypt before storing
4. Update webhook delivery/dispatch to decrypt before HMAC
5. Create migration script to encrypt existing secrets (one-time task)

**Effort**: 6 engineer-hours (includes migration script and testing)
**Risk**: Medium (encryption/decryption must be correct; has key rotation implications)
**Testing**: Create webhook, verify secret in DB is ciphertext. Trigger delivery, verify HMAC signature still valid.

#### P2-SEC-002: Timing-Safe Bearer Token Comparison

**Files**: `src/app/api/telemetry/ingest/route.ts` (line 42), `src/lib/auth/cron-auth.ts` (line 29)

**Issue**: Uses non-constant-time string equality (`!==`), vulnerable to timing side-channel attacks.

**Fix**:
```typescript
import { timingSafeEqual } from "node:crypto";

const expected = Buffer.from(`Bearer ${telemetryKey}`);
const actual = Buffer.from(authHeader ?? "");
if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

**Effort**: 2 engineer-hours (find all bearer token comparisons, fix, test)
**Risk**: Very low

**Group Total Effort**: 8 engineer-hours

---

### Security Findings Group 3: SSRF & Authorization Hardening (HIGH)

**Findings**: P1-SEC-003, P2-SEC-004, P2-SEC-008

#### P1-SEC-003: Webhook URL SSRF Validation

**File**: `src/app/api/admin/webhooks/[id]/route.ts` (PATCH handler, lines 13-22)

**Issue**: PATCH endpoint missing SSRF validation present in POST. Allows updating webhook URL to internal hosts.

**Fix**: Extract SSRF regex to shared constant, apply to both POST and PATCH schemas.

**Effort**: 2 engineer-hours

#### P2-SEC-004: Standardize Enterprise Access Checks

**Files**: Multiple routes (suggest-fix, clone, etc.)

**Issue**: Manual inline access checks instead of `assertEnterpriseAccess()` utility.

**Fix**: Audit all routes, replace manual checks with standard utility.

**Effort**: 4 engineer-hours
**Risk**: Low (refactoring for consistency)

#### P2-SEC-008: Add Defense-in-Depth withTenantScope()

**Files**: Routes modifying blueprints (clone, suggest-fix, etc.)

**Issue**: Rely solely on application-level checks, missing RLS activation.

**Fix**: Add `await withTenantScope(request);` at start of each mutation handler.

**Effort**: 2 engineer-hours

**Group Total Effort**: 8 engineer-hours

---

### Audit Logging Completeness (HIGH & MEDIUM)

**Findings**: P1-SEC-004, P2-BUG-004, P2-ARC-004

**Issue**: Webhook deletion, blueprint field edits, suggest-fix operations, and review brief generation have no audit log entries.

**Fix**: Add `publishEvent()` calls after successful mutations.

**Files Affected**:
- `src/app/api/admin/webhooks/[id]/route.ts` (DELETE)
- `src/app/api/blueprints/[id]/fields/route.ts` (PATCH)
- `src/app/api/blueprints/[id]/suggest-fix/route.ts` (POST)
- `src/app/api/blueprints/[id]/review-brief/route.ts` (inferred)

**Effort**: 3 engineer-hours
**Risk**: Very low
**Example**:
```typescript
await db.delete(webhooks).where(eq(webhooks.id, id));
await publishEvent("webhook.deleted", { webhookId: id, deletedBy: ctx.user.email });
```

---

### Data Integrity Fixes (MEDIUM)

**Findings**: P2-BUG-003, P2-BUG-005

#### P2-BUG-003: Version Uniqueness Race Condition

**File**: `src/app/api/blueprints/[id]/new-version/route.ts` (lines 59-71)

**Issue**: Check-then-insert race condition allows duplicate versions.

**Fix**: Wrap in transaction + add UNIQUE constraint (P3-CONSTRAINT-001 — handled above).

**Effort**: 2 engineer-hours (included with P3-CONSTRAINT-001)

#### P2-BUG-005: Test Run Orphaned State

**File**: `src/app/api/blueprints/[id]/test-runs/route.ts` (lines 116-148)

**Issue**: Test run left in "running" state if execution fails.

**Fix**: Add try-catch, update to "error" status on failure.

**Effort**: 1 engineer-hour
**Risk**: Very low

**Group Total Effort**: 3 engineer-hours

---

### Backend Session Security (MEDIUM)

**Finding**: P1-SEC-009

**File**: `src/auth.ts`

**Issue**: "Remember me" JWT extends session to 30 days without re-authentication.

**Fix**: Reduce to 7 days; implement step-up authentication for sensitive operations (admin actions, deployments, policy changes).

**Step-Up Auth Flow**:
1. Add `requiresStepUp` flag to sensitive endpoints
2. When flag is set, check JWT age: if > 1 hour old, redirect to re-authentication
3. Allow password or time-based OTP for re-auth
4. Issue new short-lived JWT with `stepUpTimestamp`

**Effort**: 8 engineer-hours (includes auth UI component and endpoint modifications)
**Risk**: Medium (impacts UX; requires careful design)

---

### Rate Limiting for Expensive Operations (MEDIUM)

**Finding**: P2-SEC-006

**Issue**: Export, diff, report, evidence-package endpoints lack rate limiting despite triggering expensive LLM calls.

**Solution**: Add rate limiting to all endpoints that perform LLM inference or generate large outputs.

**Endpoints to Rate Limit**:
- `/api/blueprints/[id]/export/code`
- `/api/blueprints/[id]/export/compliance`
- `/api/blueprints/[id]/export/evidence-package`
- `/api/blueprints/[id]/review-brief`
- `/api/blueprints/[id]/diff`
- `/api/compliance/reports/[id]/generate`
- Any other streaming/expensive endpoints

**Effort**: 3 engineer-hours

---

## MEDIUM-TERM (1-2 Months)

These improvements enhance security posture, scalability, and maintainability. Total estimated effort: **80-120 engineer-hours** (4-6 engineer-sprints).

### Test Coverage Expansion

**Finding**: All phases identify critical gaps in test coverage (~9 test files for 100+ source files).

**Strategy**:
1. Add unit tests for all auth flows (register, reset-password, invite-accept, SSO check)
2. Add integration tests for auth race conditions (concurrent password resets, invitation acceptances)
3. Add tests for multi-step mutation endpoints (all transaction-wrapped functions)
4. Add security-focused tests (SSRF bypass attempts, TOCTOU conditions)
5. Add tests for rate limiting behavior
6. Target: 70%+ coverage on `src/app/api` and `src/lib`

**Effort**: 40-60 engineer-hours (ongoing, incremental)
**Tools**: Jest + @testing-library for React components, Vitest for library code

**Priority Tests** (highest ROI):
- `src/app/api/auth/reset-password/route.ts` — concurrent token reuse
- `src/app/api/auth/invite/accept/route.ts` — concurrent duplicate creation
- `src/lib/webhooks/deliver.ts` — correct delivery record updates
- `src/app/api/blueprints/[id]/new-version/route.ts` — version uniqueness

---

### Database Schema Hardening

**Issues**:
- Missing foreign key relationships (createdBy/reviewedBy use email strings, not user IDs) — P1-ARC-001
- Missing UNIQUE constraints on other tables (agents, deployed agents, etc.)
- Missing CHECK constraints (e.g., version must be > 0, scores between 0-100)
- Missing indexes on commonly filtered columns

**Strategy**:
1. Audit all tables for referential integrity: Replace email-based audit fields with UUID FKs
2. Add UNIQUE constraints where appropriate (agent name per enterprise, deployment name, etc.)
3. Add CHECK constraints for data validation (status enums, numeric ranges)
4. Add indexes on frequently queried columns (enterpriseId, createdAt, status)
5. Create Drizzle migrations for each change

**Effort**: 12 engineer-hours
**Risk**: Medium (schema changes require careful migration planning)

---

### Content Security Policy (CSP) Implementation

**Finding**: P1-SEC-012

**Issue**: CSP allows `unsafe-inline` and `unsafe-eval` for scripts, providing no XSS protection.

**Solution**: Implement nonce-based CSP.

**Implementation**:
1. Generate random nonce per request in middleware
2. Add nonce to `script-src` directive: `script-src 'nonce-<nonce>'`
3. Add nonce attribute to all legitimate `<script>` tags in layout/templates
4. Audit for inline event handlers (onclick, onload) — convert to event listeners
5. Test with CSP violations reporter

**Effort**: 8 engineer-hours
**Risk**: Medium (may break third-party scripts; requires comprehensive testing)

---

### RLS Context Scope Hardening

**Finding**: P1-SEC-013

**Issue**: RLS context set at session-level; relies on serverless fresh connections. Would leak if connection pooling is added.

**Solution**: Switch to transaction-local scope (`true` instead of `false` in `set_config`).

**Implementation**:
1. Audit all queries to ensure they run within transactions
2. Refactor query chains to use explicit transactions: `await db.transaction(async tx => { ... })`
3. Document this constraint in ADR

**Effort**: 6 engineer-hours
**Risk**: High (affects all queries; must test thoroughly)
**Mitigation**: Incremental rollout — start with high-traffic endpoints

---

### Infrastructure & Connection Pooling

**Finding**: P1-OPT-001

**Issue**: Database connection pool limited to max:1. Any concurrent queries serialize.

**Solution**: Increase pool size for serverless and evaluate connection pooling for future scaling.

**Plan**:
1. **Immediate**: Increase to `max: 3-5` on Vercel serverless (verify no memory impact)
2. **Medium-term**: Evaluate PgBouncer or Neon connection pooling for future growth
3. **Long-term**: Monitor query performance metrics and optimize hot paths

**Effort**: 4 engineer-hours
**Risk**: Low (increase max, monitor for issues)

---

### Telemetry Optimization

**Finding**: P2-OPT-002

**Issue**: Every telemetry ingest request queries all deployed blueprints to validate agent IDs.

**Solution**: Cache valid agent IDs in Redis with 5-minute TTL.

**Implementation**:
1. Create `getValidAgentIds()` function with Redis caching
2. Cache key: `valid-agent-ids:{enterpriseId}`
3. Invalidate on blueprint deployment/deletion via event bus
4. Fall back to DB query on cache miss

**Effort**: 4 engineer-hours
**Risk**: Low (caching layer, graceful fallback)

---

### Audit Trail & Event Bus Reliability

**Finding**: P1-ARC-002

**Issue**: Event bus uses fire-and-forget dispatch. Failures silently lost.

**Solution**: Move to durable event queue (Vercel KV queue or similar).

**Implementation**:
1. Replace `void Promise.allSettled()` with queue enqueue
2. Add background job processor (using `vercel/functions` or similar)
3. Implement retry logic with exponential backoff
4. Add dead-letter queue for permanently failed deliveries
5. Add monitoring for queue depth and processing latency

**Effort**: 12 engineer-hours
**Risk**: Medium (requires background job infrastructure)

---

### Consistency Audit & Patterns

**Findings**: P2-ARC-003, CC-5

**Issue**: Inconsistent enterprise access checking patterns across routes.

**Solution**: Standardize on a single pattern.

**Plan**:
1. Audit all 110+ API routes for access control patterns
2. Identify non-standard checks
3. Create centralized `AccessControl` utility with named functions
4. Refactor routes to use standard utility
5. Add linter rule to flag manual access checks (optional ESLint plugin)

**Effort**: 16 engineer-hours
**Risk**: Low (refactoring for consistency)

---

## LONG-TERM (Strategic Improvements)

These improvements enhance security maturity, compliance, and scalability. Effort estimates are approximate.

### Security Testing in CI

**Add to CI/CD pipeline**:
- **SAST** (Static Application Security Testing): SonarQube, Snyk, or similar
- **Dependency scanning**: npm audit, Snyk, Dependabot
- **DAST** (Dynamic Application Security Testing): OWASP ZAP or Burp Suite
- **Secrets detection**: git-secrets, truffleHog
- **Infrastructure scanning**: Checkov (Terraform/IaC)

**Effort**: 8 engineer-hours + ongoing maintenance

---

### Integration Test Suite for Auth Flows

**Add comprehensive tests**:
- Multi-factor authentication flows
- Session refresh and expiration
- Concurrent authentication attempts
- Cross-tenant boundary violations
- Role-based access control enforcement

**Effort**: 20-30 engineer-hours

---

### TypeScript Strictness

**Current**: tsconfig.json likely has loose settings.

**Goal**: Enable `noUncheckedIndexedAccess: true` and audit for type safety improvements.

**Effort**: 10-20 engineer-hours (depends on baseline)

---

### Migration to OAuth/OIDC for Enterprise SSO

**Current**: Uses NextAuth v5 with email/password and basic SSO.

**Future**: Support enterprise identity providers (Okta, AzureAD, Google Workspace) with proper SAML/OIDC support.

**Effort**: 40-60 engineer-hours

---

## Implementation Sequencing & Dependencies

```
Phase 1: IMMEDIATE (Week 1-2)
├─ P1-SEC-001 (password reset transaction)
├─ P1-SEC-002 (invitation accept transaction)
├─ P1-BUG-001 (webhook delivery WHERE clause)
├─ P2-SEC-001 (telemetry API key)
├─ P3-CONSTRAINT-001 (unique version constraint)
├─ P2-SEC-003 (blueprint fields validation)
└─ P1-SEC-008 (middleware header stripping)

Phase 2: SHORT-TERM (Week 3-6)
├─ P1-SEC-005 (API key validation)
├─ P1-SEC-010 (invitation rate limiting)
├─ P2-SEC-005 (invitation chat rate limiting)
├─ P2-SEC-007 (parseBody standardization)
├─ P1-SEC-006 (webhook secret encryption) *requires env key setup*
├─ P2-SEC-002 (timing-safe bearer tokens)
├─ P1-SEC-003 (webhook SSRF validation)
├─ P2-SEC-004 (standardize access checks)
├─ P2-SEC-008 (add withTenantScope)
├─ P1-SEC-004 (webhook deletion audit)
├─ P2-BUG-004 (field edit audit logging)
├─ P2-ARC-004 (event bus audit publishing)
├─ P2-BUG-003 (version uniqueness transaction)
├─ P2-BUG-005 (test run error state)
├─ P1-SEC-009 (remember-me duration + step-up auth)
└─ P2-SEC-006 (expensive operation rate limiting)

Phase 3: MEDIUM-TERM (Weeks 7-12)
├─ Test coverage expansion (incremental)
├─ Database schema hardening
├─ CSP nonce implementation
├─ RLS context scope fix
├─ Connection pool increase
├─ Telemetry caching optimization
├─ Audit trail durable queue
└─ Enterprise access pattern audit

Phase 4: LONG-TERM (Q3-Q4)
├─ Security testing in CI/CD
├─ Integration test suite
├─ TypeScript strictness improvements
└─ OAuth/OIDC enterprise SSO
```

**Critical Path** (longest chain of dependencies):
1. P1-SEC-001, P1-SEC-002 (blocking until fixed)
2. P1-BUG-001 (blocking webhook operations)
3. P2-SEC-001 (blocking telemetry)
4. P3-CONSTRAINT-001 (enables P2-BUG-003 fix)

All IMMEDIATE items should complete in parallel where possible (only the above have dependencies).

---

## Effort Summary

| Timeframe | Group | Effort | Engineer-Weeks |
|-----------|-------|--------|-----------------|
| IMMEDIATE | Transactions (P1-SEC-001, 002) | 4h | 0.5 |
| | Webhook data fix (P1-BUG-001) | 1h | 0.1 |
| | Telemetry auth (P2-SEC-001) | 1h | 0.1 |
| | DB constraint (P3-CONSTRAINT-001) | 2h | 0.25 |
| | Validation fixes (P2-SEC-003) | 3h | 0.4 |
| | Header stripping (P1-SEC-008) | 0.5h | 0.1 |
| | **Subtotal** | **11.5h** | **1.4** |
| SHORT-TERM | Input validation group | 8h | 1 |
| | Crypto hardening group | 8h | 1 |
| | SSRF/auth group | 8h | 1 |
| | Audit logging | 3h | 0.4 |
| | Data integrity | 3h | 0.4 |
| | Session security | 8h | 1 |
| | Expensive op rate limiting | 3h | 0.4 |
| | **Subtotal** | **41h** | **5.2** |
| MEDIUM-TERM | Test coverage (ongoing) | 40-60h | 5-7.5 |
| | DB schema hardening | 12h | 1.5 |
| | CSP nonce implementation | 8h | 1 |
| | RLS scope fix | 6h | 0.75 |
| | Connection pool & telemetry opt | 8h | 1 |
| | Event bus durable queue | 12h | 1.5 |
| | Pattern audit & refactor | 16h | 2 |
| | **Subtotal** | **102-122h** | **12.75-15.25** |
| **TOTAL** | | **154.5-174.5h** | **19.5-21.65** |

---

## Risk Mitigation

### Highest-Risk Changes
1. **RLS context scope (P1-SEC-013)**: Test exhaustively on staging; incremental rollout
2. **Connection pool increase**: Monitor memory and query performance on Vercel
3. **Step-up authentication (P1-SEC-009)**: A/B test UX impact; plan migration strategy
4. **Durable event queue (P1-ARC-002)**: Choose mature queue system; have rollback plan

### Verification Checklist
- [ ] All IMMEDIATE changes have automated tests
- [ ] Security fixes validated by code review (2+ engineers)
- [ ] Staging deployment completes without errors
- [ ] Load tests pass on staging with fixes applied
- [ ] Audit log review confirms new entries are created
- [ ] No regression in monitoring dashboards

---

## Success Criteria

**IMMEDIATE Completion**:
- All 3 CRITICAL issues resolved
- All 8 HIGH issues blocking IMMEDIATE group resolved
- Zero race condition exploitation vectors remain
- Telemetry ingest required authentication

**SHORT-TERM Completion**:
- All HIGH findings addressed
- Input validation standardized across API
- Audit trail comprehensive
- Rate limiting prevents DoS on public endpoints

**MEDIUM-TERM Completion**:
- Test coverage >= 70% on security-critical paths
- Database schema fully hardened (no referential integrity gaps)
- CSP provides meaningful XSS protection
- RLS context scope safe for connection pooling migration

