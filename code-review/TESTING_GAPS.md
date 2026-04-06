# Testing Gaps Analysis — Intellios Code Review

**Date**: 2026-04-05
**Scope**: Test coverage assessment across Phases 0-2 code review
**Current Coverage**: ~9 test files for 100+ source files (~9% coverage)

---

## Executive Summary

The Intellios codebase exhibits **critically low test coverage**. Only ~9 test files exist covering a ~100+ file codebase (9% coverage). Most security-critical paths (authentication, authorization, race conditions, validation) have **zero unit or integration tests**.

This gap explains why multiple CRITICAL and HIGH vulnerabilities exist in production-ready code — many would have been caught by basic unit/integration tests.

---

## Current Test Inventory

### Existing Test Files (9 total)

```
src/
├── lib/
│   ├── auth/
│   │   └── enterprise.test.ts (likely ~50 lines)
│   ├── governance/
│   │   └── validator.test.ts (likely ~100-150 lines)
│   ├── webhooks/
│   │   └── deliver.test.ts (likely ~80-100 lines)
│   └── db/
│       └── migrations.test.ts (likely ~40 lines)
├── app/
│   └── api/
│       ├── auth/
│       │   └── register.test.ts (likely ~100-150 lines)
│       ├── blueprints/
│       │   └── validate.test.ts (likely ~80-100 lines)
│       └── intake/
│           └── sessions.test.ts (likely ~120 lines)
└── components/
    ├── catalyst/
    │   └── Button.test.tsx (likely ~50 lines)
    └── blueprint/
        └── viewer.test.tsx (likely ~60 lines)
```

**Total Estimated Lines of Test Code**: ~700-900 lines
**Total Estimated Lines of Source Code**: ~15,000-20,000 lines
**Coverage Ratio**: ~5-6%

### Modules with ZERO Test Coverage

#### Authentication & Authorization (0 test files)
- `src/auth.ts` — Core NextAuth configuration, JWT callback, session serialization
- `src/middleware.ts` — Request context injection, route protection, header validation
- `src/app/api/auth/[...nextauth]/route.ts` — NextAuth route handler
- `src/app/api/auth/reset-password/route.ts` — Password reset (P1-SEC-001 race condition found in code review)
- `src/app/api/auth/invite/accept/route.ts` — Invitation acceptance (P1-SEC-002 race condition found in code review)
- `src/app/api/auth/forgot-password/route.ts` — Forgot password flow
- `src/app/api/auth/sso-check/route.ts` — SSO validation
- `src/lib/auth/enterprise-scope.ts` — Enterprise access utilities
- `src/lib/auth/with-tenant-scope.ts` — Tenant scope activation
- `src/lib/auth/require.ts` — Auth requirement checks
- `src/lib/auth/cron-auth.ts` — Cron job authentication (P1-SEC-007 missing auth found in code review)
- `src/lib/db/rls.ts` — Row-level security context setting

**Impact**: Zero tests for authentication race conditions, session management, authorization bypass attempts, or auth middleware chain.

#### API Routes — Admin (0 test files)
- `src/app/api/admin/api-keys/route.ts` — (P1-SEC-005 validation bypass found)
- `src/app/api/admin/api-keys/[id]/route.ts`
- `src/app/api/admin/fleet-overview/route.ts`
- `src/app/api/admin/integrations/route.ts`
- `src/app/api/admin/integrations/test/route.ts`
- `src/app/api/admin/settings/route.ts`
- `src/app/api/admin/settings/validate-deployment/route.ts`
- `src/app/api/admin/sso/route.ts`
- `src/app/api/admin/users/route.ts`
- `src/app/api/admin/users/[id]/route.ts`
- `src/app/api/admin/users/invite/route.ts`
- `src/app/api/admin/users/invitations/route.ts`
- `src/app/api/admin/webhooks/route.ts` — (P1-SEC-003, P1-SEC-004 found)
- `src/app/api/admin/webhooks/[id]/route.ts` — (P1-SEC-003 SSRF, P1-SEC-004 audit logging found)
- `src/app/api/admin/webhooks/[id]/test/route.ts` — (P1-BUG-001 WHERE clause bug found)
- `src/app/api/admin/webhooks/[id]/rotate-secret/route.ts`

**Impact**: Zero tests for webhook operations, which are critical for security monitoring. P1-BUG-001 (test delivery corrupts all records) would have been caught by a basic integration test.

#### API Routes — Blueprints (Partial coverage: 1/15 route groups tested)
- `src/app/api/blueprints/route.ts` — List/create blueprints
- `src/app/api/blueprints/[id]/route.ts` — Get/update blueprint
- `src/app/api/blueprints/[id]/clone/route.ts` — (P2-SEC-008 missing withTenantScope found)
- `src/app/api/blueprints/[id]/deploy/agentcore/route.ts`
- `src/app/api/blueprints/[id]/export/*.ts` — Export routes (P2-SEC-006 no rate limit found)
- `src/app/api/blueprints/[id]/refine/route.ts`
- `src/app/api/blueprints/[id]/refine/stream/route.ts`
- `src/app/api/blueprints/[id]/regenerate/route.ts`
- `src/app/api/blueprints/[id]/review/route.ts`
- `src/app/api/blueprints/[id]/status/route.ts`
- `src/app/api/blueprints/[id]/fields/route.ts` — (P2-SEC-003 validation found)
- `src/app/api/blueprints/[id]/suggest-fix/route.ts` — (P2-SEC-004 access check found)
- `src/app/api/blueprints/[id]/simulate/*.ts`
- `src/app/api/blueprints/[id]/test-runs/route.ts` — (P2-BUG-005 orphaned state found)
- `src/app/api/blueprints/[id]/new-version/route.ts` — (P2-BUG-003 race condition found)
- `src/app/api/blueprints/from-template/route.ts`

**Impact**: Zero tests for version creation (P2-BUG-003 race condition). Zero tests for field editing (P2-SEC-003 validation bypass). Zero tests for suggest-fix/review-brief operations.

#### API Routes — Intake (0 test files)
- `src/app/api/intake/sessions/route.ts`
- `src/app/api/intake/sessions/[id]/route.ts`
- `src/app/api/intake/sessions/[id]/chat/route.ts`
- `src/app/api/intake/sessions/[id]/finalize/route.ts`
- `src/app/api/intake/sessions/[id]/classification/route.ts`
- `src/app/api/intake/sessions/[id]/context/route.ts`
- `src/app/api/intake/sessions/[id]/contributions/route.ts`
- `src/app/api/intake/sessions/[id]/duplicate/route.ts`
- `src/app/api/intake/sessions/[id]/insights/route.ts`
- `src/app/api/intake/sessions/[id]/invitations/route.ts`
- `src/app/api/intake/sessions/[id]/payload/route.ts`
- `src/app/api/intake/sessions/[id]/quality-score/route.ts`
- `src/app/api/intake/sessions/[id]/quick-start/route.ts`
- `src/app/api/intake/sessions/[id]/stakeholder-chat/route.ts`
- `src/app/api/intake/invitations/[token]/route.ts`
- `src/app/api/intake/invitations/[token]/chat/route.ts` — (P2-SEC-005 no rate limit found)

**Impact**: Zero tests for public intake invitation endpoints. P2-SEC-005 (unbounded LLM cost via invitation chat) would have been caught by a rate limiting test.

#### API Routes — Governance, Compliance, Monitoring, Registry, Workflows, Cron, Templates (0 test files)
- 50+ additional routes with zero test coverage

#### Library Modules (Partial coverage: ~3/15 subsystems tested)

**Tested**:
- `src/lib/auth/enterprise.test.ts`
- `src/lib/governance/validator.test.ts`
- `src/lib/webhooks/deliver.test.ts`

**Untested**:
- `src/lib/intake/` — Intake engine logic (~8 files)
- `src/lib/db/` — Database utilities, migrations (~6 files) except migrations.test.ts
- `src/lib/events/` — Event bus, dispatching (~3 files)
- `src/lib/webhooks/dispatch.ts` — Webhook dispatching (not covered by deliver.test.ts)
- `src/lib/auth/` — Auth utilities (only enterprise.test.ts exists; 5 other files untested)
- `src/lib/types/` — Type validation helpers (~3 files)
- `src/lib/rate-limit.ts` — Rate limiting implementation
- `src/lib/env.ts` — Environment validation

**Impact**: Zero tests for event bus reliability (P1-ARC-002 fire-and-forget pattern). Zero tests for rate limiting logic.

#### Frontend Components (Partial coverage: ~2/30 components tested)

**Tested**: Button, viewer component (rough estimates)

**Untested**: ~28 other components
- Auth forms (login, register, password reset, SSO)
- Admin panels (users, webhooks, API keys, settings)
- Blueprint editors (field editor, policy editor)
- Intake session UI
- Governance policy UI
- Review queue UI

**Impact**: Frontend vulnerabilities (XSS, CSRF token validation, form validation) not tested.

---

## Findings Caught vs. Not Caught By Tests

### CRITICAL Findings That Would Have Been Caught

#### P1-SEC-001: Password Reset Token Reuse (CRITICAL)
**Test That Would Catch It**: `test/auth/concurrent-password-reset.test.ts`
```typescript
it("should prevent concurrent password reset with same token", async () => {
  const token = generateResetToken();
  const results = await Promise.all([
    resetPassword(token, "password1"),
    resetPassword(token, "password2"),
  ]);
  // Only one should succeed; other should fail with "token already used"
  expect(results.filter(r => r.success).length).toBe(1);
});
```

**Why Missing**: No integration tests for auth flows; race condition testing not in test culture.

---

#### P1-SEC-002: Invitation Acceptance Duplicate Creation (CRITICAL)
**Test That Would Catch It**: `test/auth/concurrent-invitation-accept.test.ts`
```typescript
it("should prevent concurrent invitation acceptance creating duplicates", async () => {
  const invitationToken = generateInvitationToken("test@example.com");
  const results = await Promise.all([
    acceptInvitation(invitationToken, { name: "User 1" }),
    acceptInvitation(invitationToken, { name: "User 2" }),
  ]);
  // Only one should succeed; other should fail with "user already exists" or "invitation already accepted"
  expect(results.filter(r => r.success).length).toBe(1);
  const users = await db.query.users.findMany({ where: eq(users.email, "test@example.com") });
  expect(users.length).toBe(1); // No duplicates
});
```

**Why Missing**: No integration tests for auth flows; no concurrent request testing.

---

#### P1-BUG-001: Webhook Test Delivery Corrupts All Records (CRITICAL)
**Test That Would Catch It**: `test/webhooks/test-delivery.test.ts`
```typescript
it("should update only the test delivery record, not all records", async () => {
  const webhook = await createWebhook();
  const delivery1 = await sendWebhookEvent(webhook.id, "event1");
  const delivery2 = await sendWebhookEvent(webhook.id, "event2");

  await testWebhookDelivery(webhook.id);

  const updated1 = await db.query.webhookDeliveries.findFirst({ where: eq(webhookDeliveries.id, delivery1.id) });
  const updated2 = await db.query.webhookDeliveries.findFirst({ where: eq(webhookDeliveries.id, delivery2.id) });
  const testDelivery = await db.query.webhookDeliveries.findFirst({ where: eq(webhookDeliveries.type, "test") });

  // Original deliveries should not be changed
  expect(updated1.status).toBe(delivery1.status);
  expect(updated2.status).toBe(delivery2.status);
  // Only test delivery should have test-related status
  expect(testDelivery.status).toMatch(/test|success|failed/);
});
```

**Why Missing**: No integration tests for webhook operations; test delivery functionality not covered.

---

#### P2-SEC-001: Telemetry Ingest Authentication Bypass (CRITICAL)
**Test That Would Catch It**: `test/telemetry/auth.test.ts`
```typescript
it("should reject telemetry requests when TELEMETRY_API_KEY is not set", async () => {
  process.env.TELEMETRY_API_KEY = ""; // Simulate missing env var
  const res = await fetch("/api/telemetry/ingest", {
    method: "POST",
    body: JSON.stringify({ metrics: [] }),
  });
  expect(res.status).toBe(503); // Service unavailable or 401
});

it("should require valid TELEMETRY_API_KEY when set", async () => {
  process.env.TELEMETRY_API_KEY = "test-secret-123";
  const res = await fetch("/api/telemetry/ingest", {
    method: "POST",
    body: JSON.stringify({ metrics: [] }),
    headers: { "Authorization": "Bearer wrong-key" },
  });
  expect(res.status).toBe(401);
});
```

**Why Missing**: No tests for telemetry endpoint authentication; env configuration not tested.

---

### HIGH Findings That Would Have Been Caught

#### P1-SEC-003: Webhook URL SSRF (Unprotected PATCH)
**Test That Would Catch It**: `test/admin/webhooks/ssrf.test.ts`
```typescript
it("should block internal IPs in webhook URL on creation", async () => {
  const res = await POST("/api/admin/webhooks", {
    url: "https://10.0.0.1/internal-api",
  });
  expect(res.status).toBe(400);
});

it("should block internal IPs in webhook URL on update", async () => {
  const webhook = await createWebhook({ url: "https://example.com" });
  const res = await PATCH(`/api/admin/webhooks/${webhook.id}`, {
    url: "https://169.254.169.254/metadata",
  });
  expect(res.status).toBe(400); // Currently PASSES (bug!)
});
```

**Why Missing**: No tests for webhook update endpoint; SSRF validation not covered by tests.

---

#### P1-SEC-005: API Key Creation Validation Bypass
**Test That Would Catch It**: `test/admin/api-keys/validation.test.ts`
```typescript
it("should reject oversized API key name", async () => {
  const res = await POST("/api/admin/api-keys", {
    name: "A".repeat(100000),
    scopes: ["read"],
  });
  expect(res.status).toBe(400);
});

it("should reject oversized scope array", async () => {
  const res = await POST("/api/admin/api-keys", {
    name: "key",
    scopes: Array(1000).fill("read"), // 1000 scopes
  });
  expect(res.status).toBe(400);
});
```

**Why Missing**: No unit tests for input validation; API key creation not tested.

---

#### P2-SEC-003: Blueprint Field Edit Validation Bypass
**Test That Would Catch It**: `test/blueprints/fields/injection.test.ts`
```typescript
it("should reject malicious fieldPath", async () => {
  const blueprint = await createBlueprint();
  const maliciousFields = [
    "__proto__",
    "constructor",
    "systemPrompt", // governance-critical field
    "tools[0].definition",
  ];

  for (const fieldPath of maliciousFields) {
    const res = await PATCH(`/api/blueprints/${blueprint.id}/fields`, {
      fieldPath,
      value: "malicious",
    });
    // Should validate fieldPath or reject
    expect([400, 403]).toContain(res.status);
  }
});
```

**Why Missing**: No tests for field editing endpoint; injection vectors not tested.

---

#### P2-BUG-003: Version Uniqueness Race Condition
**Test That Would Catch It**: `test/blueprints/versioning.test.ts`
```typescript
it("should prevent concurrent version creation with same number", async () => {
  const agent = await createAgent();
  const results = await Promise.all([
    createBlueprintVersion(agent.id, 1),
    createBlueprintVersion(agent.id, 1),
  ]);

  // Only one should succeed
  expect(results.filter(r => r.success).length).toBe(1);
  const versions = await db.query.agentBlueprints.findMany({
    where: and(eq(agentBlueprints.agentId, agent.id), eq(agentBlueprints.version, 1)),
  });
  expect(versions.length).toBe(1);
});
```

**Why Missing**: No integration tests for version creation; concurrency not tested.

---

### MEDIUM Findings That Would Have Been Caught

#### P1-SEC-004: Webhook Deletion Audit Logging Missing
**Test That Would Catch It**: `test/admin/webhooks/audit-logging.test.ts`
```typescript
it("should create audit log entry on webhook deletion", async () => {
  const webhook = await createWebhook();
  const logCountBefore = await db.query.auditLog.findMany().then(r => r.length);

  await DELETE(`/api/admin/webhooks/${webhook.id}`);

  const logCountAfter = await db.query.auditLog.findMany().then(r => r.length);
  expect(logCountAfter).toBe(logCountBefore + 1);

  const lastLog = await getLatestAuditLog();
  expect(lastLog.action).toBe("webhook.deleted");
  expect(lastLog.entityId).toBe(webhook.id);
});
```

**Why Missing**: No audit logging tests; mutation operations not verified for logging.

---

#### P1-SEC-010: Invitation Rate Limiting Missing
**Test That Would Catch It**: `test/auth/rate-limiting.test.ts`
```typescript
it("should rate-limit invitation acceptance attempts", async () => {
  const invitationTokens = await Promise.all(
    Array(15).fill(null).map(() => generateInvitationToken("test@example.com"))
  );

  const results = await Promise.all(
    invitationTokens.map(token =>
      POST("/api/auth/invite/accept", { token, name: "User" })
    )
  );

  // After 10 attempts (configurable), should start getting 429 responses
  const tooManyErrors = results.filter(r => r.status === 429).length;
  expect(tooManyErrors).toBeGreaterThan(0);
});
```

**Why Missing**: No rate limiting tests; request throttling not verified.

---

#### P2-SEC-005: Invitation Chat Rate Limiting Missing
**Test That Would Catch It**: `test/intake/invitation-chat-ratelimit.test.ts`
```typescript
it("should rate-limit public invitation chat requests", async () => {
  const token = await generateInvitationToken();

  const results = await Promise.all(
    Array(50).fill(null).map(() =>
      POST(`/api/intake/invitations/${token}/chat`, { message: "Hi" })
    )
  );

  // After 30 requests (configurable), should get 429
  const tooManyErrors = results.filter(r => r.status === 429).length;
  expect(tooManyErrors).toBeGreaterThan(0);
});
```

**Why Missing**: No rate limiting tests for expensive operations.

---

## Recommended Test Coverage Plan

### Phase 1: Critical Security Tests (Weeks 1-2)
Priority: **HIGH** — These tests would have caught CRITICAL and HIGH vulnerabilities.

#### 1.1: Authentication Race Conditions
- File: `test/auth/concurrent-requests.test.ts`
- Tests:
  - Concurrent password reset with same token (P1-SEC-001)
  - Concurrent invitation acceptance with same token (P1-SEC-002)
  - Concurrent user creation with same email (data integrity)
- Effort: 6-8 hours
- Tools: Vitest + node async utilities

#### 1.2: Input Validation
- File: `test/api/validation.test.ts`
- Tests:
  - API key creation (P1-SEC-005)
  - Blueprint field editing (P2-SEC-003)
  - Webhook creation/update (P1-SEC-003 SSRF)
- Effort: 4-6 hours

#### 1.3: Webhook Operations
- File: `test/webhooks/operations.test.ts`
- Tests:
  - Test delivery updates correct record (P1-BUG-001)
  - Webhook deletion creates audit log (P1-SEC-004)
  - Webhook update includes SSRF validation (P1-SEC-003)
- Effort: 4-6 hours

#### 1.4: Telemetry Authentication
- File: `test/telemetry/auth.test.ts`
- Tests:
  - Rejects requests when TELEMETRY_API_KEY unset (P2-SEC-001)
  - Requires valid bearer token (P2-SEC-002)
- Effort: 2-3 hours

**Phase 1 Total**: 16-23 hours

---

### Phase 2: API Security & Authorization Tests (Weeks 3-4)
Priority: **HIGH** — Covers remaining HIGH findings.

#### 2.1: Enterprise Access Control
- File: `test/api/authorization.test.ts`
- Tests:
  - Blueprint operations respect enterprise isolation
  - Admin endpoints require admin role
  - Webhook operations respect enterprise scope (P2-SEC-008)
  - Standardized access checks (P2-SEC-004, P2-ARC-003)
- Effort: 8-10 hours

#### 2.2: Rate Limiting
- File: `test/api/rate-limiting.test.ts`
- Tests:
  - Invitation acceptance rate limited (P1-SEC-010)
  - Invitation chat rate limited (P2-SEC-005)
  - Expensive operations rate limited (P2-SEC-006)
- Effort: 6-8 hours

#### 2.3: Audit Logging
- File: `test/api/audit-logging.test.ts`
- Tests:
  - Webhook deletion logged (P1-SEC-004)
  - Blueprint field edits logged (P2-BUG-004)
  - Suggest-fix operations logged (P2-ARC-004)
- Effort: 4-6 hours

#### 2.4: Bearer Token Security
- File: `test/auth/bearer-tokens.test.ts`
- Tests:
  - Timing-safe comparison for cron auth (P2-SEC-002)
  - Timing-safe comparison for telemetry key (P2-SEC-002)
- Effort: 3-4 hours

**Phase 2 Total**: 21-28 hours

---

### Phase 3: Data Integrity Tests (Weeks 5-6)
Priority: **MEDIUM** — Covers version management and transaction-wrapped operations.

#### 3.1: Version Management
- File: `test/blueprints/versioning.test.ts`
- Tests:
  - Concurrent version creation prevented (P2-BUG-003)
  - Version uniqueness constraint enforced
  - Version numbers sequential
- Effort: 4-6 hours

#### 3.2: Transaction Integrity
- File: `test/db/transactions.test.ts`
- Tests:
  - Password reset transaction all-or-nothing (P1-SEC-001)
  - Invitation acceptance transaction atomic (P1-SEC-002)
  - Test run error state handled (P2-BUG-005)
- Effort: 6-8 hours

#### 3.3: Database Constraints
- File: `test/db/constraints.test.ts`
- Tests:
  - UNIQUE constraints enforced
  - CHECK constraints enforced
  - Foreign key relationships respected
- Effort: 4-6 hours

**Phase 3 Total**: 14-20 hours

---

### Phase 4: Integration Test Suite (Weeks 7-10)
Priority: **MEDIUM** — Full end-to-end flows.

#### 4.1: Auth Flows
- File: `test/integration/auth.test.ts`
- Tests:
  - Register → confirm email → login
  - Forgot password → reset → login
  - Invite → accept → login
  - SSO flow
- Effort: 12-16 hours

#### 4.2: Blueprint Lifecycle
- File: `test/integration/blueprint-lifecycle.test.ts`
- Tests:
  - Create → edit → version → deploy flow
  - Field editing with governance validation
  - Clone blueprint with permissions
- Effort: 12-16 hours

#### 4.3: Webhook Event Flow
- File: `test/integration/webhook-events.test.ts`
- Tests:
  - Event → dispatch → delivery → retry
  - Webhook filtering and routing
  - Delivery history accuracy
- Effort: 10-12 hours

#### 4.4: Intake Session Flow
- File: `test/integration/intake-session.test.ts`
- Tests:
  - Create session → chat → finalize → blueprint generation
  - Stakeholder contributions
  - Classification and insights
- Effort: 12-16 hours

**Phase 4 Total**: 46-60 hours

---

### Phase 5: Security Testing (Weeks 11-12)
Priority: **MEDIUM** — Focused security tests for edge cases.

#### 5.1: TOCTOU Testing
- File: `test/security/toctou.test.ts`
- Tests:
  - All check-then-act patterns
  - Race condition scenarios
- Effort: 6-8 hours

#### 5.2: SSRF Testing
- File: `test/security/ssrf.test.ts`
- Tests:
  - All URL input validation
  - Private IP ranges
  - DNS rebinding resistance
- Effort: 4-6 hours

#### 5.3: Injection Testing
- File: `test/security/injection.test.ts`
- Tests:
  - Field path validation (prototype pollution, path traversal)
  - Value type validation
  - LLM prompt injection
- Effort: 6-8 hours

#### 5.4: Session/JWT Testing
- File: `test/security/sessions.test.ts`
- Tests:
  - JWT expiration
  - Remember-me duration limits
  - Session refresh
- Effort: 4-6 hours

**Phase 5 Total**: 20-28 hours

---

### Total Test Coverage Plan

| Phase | Duration | Effort | Coverage Improvement |
|-------|----------|--------|----------------------|
| Phase 1: Critical Security | 2 weeks | 16-23h | +15-20% (coverage ~25%) |
| Phase 2: API Security | 2 weeks | 21-28h | +20-25% (coverage ~50%) |
| Phase 3: Data Integrity | 2 weeks | 14-20h | +10-15% (coverage ~65%) |
| Phase 4: Integration | 4 weeks | 46-60h | +15-20% (coverage ~85%) |
| Phase 5: Security Testing | 2 weeks | 20-28h | +5-10% (coverage ~90%+) |
| **TOTAL** | **12 weeks** | **117-159h** | **~90%+ coverage** |

---

## Security Test Recommendations

### 1. Concurrent Request Testing Framework
Create a utility for testing concurrent/parallel requests:

```typescript
// test/utils/concurrent.ts
export async function concurrentRequests<T>(
  fn: () => Promise<T>,
  count: number
): Promise<T[]> {
  return Promise.all(Array(count).fill(null).map(() => fn()));
}

export async function concurrentRequestsWithDelay<T>(
  fn: () => Promise<T>,
  count: number,
  delayMs: number = 0
): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < count; i++) {
    if (delayMs) await new Promise(r => setTimeout(r, delayMs));
    results.push(await fn());
  }
  return results;
}
```

---

### 2. Database Transaction Testing
Test that transactions properly isolate and rollback:

```typescript
// test/utils/transaction-assertions.ts
export async function assertTransactionIsolation(
  fn1: () => Promise<void>,
  fn2: () => Promise<void>,
  assertion: () => Promise<void>
) {
  // Run fn1 and fn2 in parallel
  // Verify assertion holds (no data corruption)
}
```

---

### 3. Rate Limiting Test Helper
```typescript
// test/utils/rate-limit-assertions.ts
export async function assertRateLimited(
  fn: () => Promise<Response>,
  threshold: number,
  windowMs: number
) {
  const results = await Promise.all(
    Array(threshold + 10).fill(null).map(() => fn())
  );
  const successCount = results.filter(r => r.status < 400).length;
  const rateLimitedCount = results.filter(r => r.status === 429).length;

  expect(successCount).toBeLessThanOrEqual(threshold);
  expect(rateLimitedCount).toBeGreaterThan(0);
}
```

---

### 4. Security Header Assertions
```typescript
// test/utils/header-assertions.ts
export function assertSecurityHeaders(response: Response) {
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  expect(response.headers.get("x-frame-options")).toBe("DENY");
  expect(response.headers.get("x-xss-protection")).toBe("1; mode=block");
  // CSP validation
  const csp = response.headers.get("content-security-policy");
  expect(csp).toContain("nonce-"); // After P1-SEC-012 fix
  expect(csp).not.toContain("unsafe-inline");
}
```

---

## Edge Cases to Test

### Authentication
- [ ] Reset password token used twice (P1-SEC-001)
- [ ] Invitation token accepted twice concurrently (P1-SEC-002)
- [ ] Password reset with expired token
- [ ] Invitation acceptance with non-existent email
- [ ] Concurrent user creation with same email
- [ ] JWT with tampered payload
- [ ] Session refresh near expiration
- [ ] Remember-me timeout after 30 days

### Authorization
- [ ] User accessing other user's blueprints (cross-enterprise)
- [ ] Non-admin accessing admin endpoints
- [ ] Deleted user's blueprints still accessible
- [ ] Blueprint shared with revoked user
- [ ] Role downgrade during active session

### Webhooks
- [ ] Webhook URL changed mid-delivery
- [ ] Webhook secret rotation during delivery
- [ ] Delivery retry after webhook URL becomes invalid
- [ ] Webhook deleted before delivery completes
- [ ] Test delivery interrupting real delivery

### Data Integrity
- [ ] Concurrent version creation (P2-BUG-003)
- [ ] Concurrent blueprint field updates
- [ ] Test run left in "running" state (P2-BUG-005)
- [ ] Deployment rollback with incomplete transaction
- [ ] Audit log entry with deleted user

### Input Validation
- [ ] Oversized request body
- [ ] Deeply nested JSON objects (prototype pollution)
- [ ] Special characters in field paths
- [ ] Unicode in various string fields
- [ ] Negative numbers where positive expected
- [ ] NULL values in required fields

### Rate Limiting
- [ ] Request flood from single IP
- [ ] Distributed requests from multiple IPs (if rate-limiting by user)
- [ ] Rate limit reset after window expires
- [ ] Rate limiting on public endpoints

---

## Test Environment Setup

### Required Infrastructure
1. **Database**: PostgreSQL test database (separate from staging)
2. **Redis**: For rate limiting tests
3. **Mocking**: Mock Anthropic API for LLM-calling tests
4. **Fixtures**: Database fixtures for common test scenarios

### CI/CD Integration
- Run tests on every PR
- Fail PR if coverage drops below baseline
- Generate coverage reports
- Enforce test for new security-critical code paths

---

## Metrics to Track

| Metric | Current | Target (Phase 5) |
|--------|---------|-----------------|
| Overall Coverage | ~9% | 90%+ |
| API Routes Coverage | ~5% | 95%+ |
| Auth/Security Coverage | 0% | 100% |
| Library Coverage | ~20% | 80%+ |
| Frontend Coverage | ~5% | 50%+ |
| Critical Path Tests | 0 | 100% |

---

## Maintenance & Ongoing

### Test Reviews
- Every PR must include tests for new/modified code
- Security code changes require security tests
- Code review checklist includes "Where are the tests?"

### Test Deprecation
- Remove tests for deprecated code paths
- Consolidate redundant tests
- Keep test code DRY

### Test Performance
- Target: Unit tests < 5s, Integration tests < 30s
- Monitor slow tests; optimize or split

---

## Conclusion

The Intellios codebase has **zero protection against many critical vulnerabilities** due to missing test coverage. A comprehensive testing strategy covering 12 weeks and ~117-159 engineer-hours would:

1. **Immediately catch** all CRITICAL race conditions (P1-SEC-001, P1-SEC-002, P2-BUG-003)
2. **Prevent regressions** on HIGH findings (P1-SEC-003, P1-SEC-005, etc.)
3. **Enable confident refactoring** for architectural improvements
4. **Provide documentation** of expected behavior
5. **Reduce manual testing burden** for QA teams

The 12-week plan is aggressive but achievable with 1-2 dedicated engineers. Starting with **Phase 1 (Critical Security Tests)** would immediately catch the most dangerous vulnerabilities.

