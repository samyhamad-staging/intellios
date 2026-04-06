# Findings Ledger

## Summary (Phases 1-2)
| Category | CRITICAL | HIGH | MEDIUM | LOW | Total |
|----------|----------|------|--------|-----|-------|
| Security | 3 | 10 | 12 | 3 | 28 |
| Bug | 1 | 1 | 4 | 2 | 8 |
| Optimization | 0 | 0 | 2 | 0 | 2 |
| Architecture | 0 | 1 | 2 | 0 | 3 |
| **Total** | **4** | **12** | **20** | **5** | **41** |

---

## CRITICAL Findings

---
**ID**: P1-SEC-001
**Severity**: CRITICAL
**Category**: Security
**File(s)**: `src/app/api/auth/reset-password/route.ts` (lines 43-68)
**Title**: Password reset token reuse via race condition (no transaction)
**Description**: The password reset flow performs SELECT → UPDATE password → UPDATE token as three separate operations without a database transaction. A concurrent request with the same token can pass the `isNull(usedAt)` check before the first request marks the token as used.
**Evidence**:
```typescript
// Line 43-49: SELECT to find valid token
const resetRecord = await db.query.passwordResetTokens.findFirst({
  where: and(
    eq(passwordResetTokens.tokenHash, tokenHash),
    isNull(passwordResetTokens.usedAt),          // Not yet used
    gt(passwordResetTokens.expiresAt, new Date()) // Not expired
  ),
});
// Line 60-63: UPDATE user password (no transaction)
await db.update(users).set({ passwordHash }).where(eq(users.id, resetRecord.userId));
// Line 65-68: UPDATE token as used (no transaction)
await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, resetRecord.id));
```
**Impact**: An attacker who intercepts or obtains a password reset token can exploit the race condition to change the user's password multiple times, or a second concurrent request could succeed and set a different password, causing confusion and potential account lockout.
**Reproduction / Trigger**: Send two concurrent POST requests to `/api/auth/reset-password` with the same token but different passwords. Both can pass the `isNull(usedAt)` check before either marks the token as used.
**Recommended Fix**: Wrap the entire SELECT-UPDATE-UPDATE flow in a database transaction with `SELECT ... FOR UPDATE` on the token row to prevent concurrent access:
```typescript
await db.transaction(async (tx) => {
  const resetRecord = await tx.query.passwordResetTokens.findFirst({
    where: and(eq(passwordResetTokens.tokenHash, tokenHash), isNull(passwordResetTokens.usedAt), gt(passwordResetTokens.expiresAt, new Date())),
  });
  if (!resetRecord) throw new Error("invalid");
  await tx.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, resetRecord.id));
  const passwordHash = await bcrypt.hash(body.password, 12);
  await tx.update(users).set({ passwordHash }).where(eq(users.id, resetRecord.userId));
});
```
**Related Findings**: P1-SEC-002
**Blast Radius**: Users table (password integrity), password_reset_tokens table

---
**ID**: P1-SEC-002
**Severity**: CRITICAL
**Category**: Security
**File(s)**: `src/app/api/auth/invite/accept/route.ts` (lines 35-76)
**Title**: Invitation acceptance race condition — duplicate account creation
**Description**: The invitation acceptance flow performs SELECT invitation → CHECK existing user → INSERT user → UPDATE invitation as four separate operations without a transaction. Two concurrent requests with the same invitation token can both pass the `isNull(acceptedAt)` check and create duplicate user accounts.
**Evidence**:
```typescript
// Line 35-41: SELECT invitation (no lock)
const invitation = await db.query.userInvitations.findFirst({
  where: and(eq(userInvitations.tokenHash, tokenHash), isNull(userInvitations.acceptedAt), gt(userInvitations.expiresAt, new Date())),
});
// Line 51-53: CHECK for existing user (TOCTOU gap)
const existingUser = await db.query.users.findFirst({ where: eq(users.email, invitation.email) });
// Line 64-70: INSERT user (can succeed twice in race)
await db.insert(users).values({ name: body.name, email: invitation.email, ... });
// Line 73-76: Mark invitation accepted
await db.update(userInvitations).set({ acceptedAt: new Date() }).where(eq(userInvitations.id, invitation.id));
```
**Impact**: Duplicate user accounts with the same email can be created. Depending on the database unique constraint on `users.email`, one will fail with a DB error (500). If there's no unique constraint, both succeed creating duplicate accounts — a data integrity violation.
**Reproduction / Trigger**: Send two concurrent POST requests to `/api/auth/invite/accept` with the same invitation token. Both pass the `isNull(acceptedAt)` check before either marks the invitation as accepted.
**Recommended Fix**: Wrap in a transaction. Additionally, ensure the `users.email` column has a UNIQUE constraint at the database level as a defense-in-depth measure.
**Related Findings**: P1-SEC-001
**Blast Radius**: Users table, user_invitations table, enterprise user counts

---
**ID**: P1-BUG-001
**Severity**: CRITICAL
**Category**: Bug
**File(s)**: `src/lib/webhooks/deliver.ts` (line 195)
**Title**: Test webhook delivery updates ALL delivery records for the webhook instead of the specific one
**Description**: The `deliverWebhookTest` function updates the delivery record using `webhookDeliveries.webhookId` instead of the specific delivery record's ID, corrupting all historical delivery records for that webhook.
**Evidence**:
```typescript
// Line 195: Updates by webhookId (matches ALL deliveries for this webhook)
.where(eq(webhookDeliveries.webhookId, webhookId));
// vs Line 110 in deliverWebhook which correctly uses:
.where(eq(webhookDeliveries.id, deliveryId));
```
**Impact**: Running a webhook test overwrites the `status`, `responseStatus`, `responseBody`, `attempts`, and `lastAttemptedAt` of ALL delivery records for that webhook — not just the test delivery. This corrupts the delivery history, masks real failures, and makes debugging impossible.
**Reproduction / Trigger**: Create a webhook, let it receive some real events, then trigger a test delivery via POST `/api/admin/webhooks/[id]/test`. Check the delivery history — all previous records are now updated with the test result.
**Recommended Fix**: Change line 195 to use the specific delivery ID. The function needs to capture the delivery record's ID from the insert:
```typescript
const [deliveryRow] = await db.insert(webhookDeliveries).values({...}).returning({ id: webhookDeliveries.id });
// Then later:
.where(eq(webhookDeliveries.id, deliveryRow.id));
```
**Related Findings**: None
**Blast Radius**: webhook_deliveries table, webhook monitoring, delivery log UI

---

## HIGH Findings

---
**ID**: P1-SEC-003
**Severity**: HIGH
**Category**: Security
**File(s)**: `src/app/api/admin/webhooks/[id]/route.ts` (lines 13-22, PATCH handler)
**Title**: Missing SSRF validation on webhook URL update (PATCH)
**Description**: The POST endpoint for creating webhooks includes `PRIVATE_HOST_RE` SSRF protection that blocks private/internal IPs. The PATCH endpoint for updating webhooks does NOT include this check, allowing an admin to change a webhook's URL to an internal host after creation.
**Evidence**:
```typescript
// POST schema (webhooks/route.ts line 14-31) has SSRF check:
const PRIVATE_HOST_RE = /^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|::1|0\.0\.0\.0)/;
// PATCH schema (webhooks/[id]/route.ts line 13-22) MISSING SSRF check:
const PatchWebhookSchema = z.object({
  url: z.string().url().refine((u) => u.startsWith("https://"), { message: "..." }).optional(),
  // NO PRIVATE_HOST_RE check
});
```
**Impact**: An admin can create a webhook with a valid public URL, then PATCH it to `https://169.254.169.254/latest/meta-data/` (AWS metadata) or `https://10.0.0.1/internal-api` to exfiltrate internal network data via webhook payloads.
**Reproduction / Trigger**: 1) Create webhook with valid URL. 2) PATCH the webhook URL to `https://169.254.169.254/latest/meta-data/`. 3) Trigger any event — the webhook payload is sent to the internal endpoint.
**Recommended Fix**: Extract the SSRF validation into a shared function and apply it to both POST and PATCH schemas.
**Related Findings**: None
**Blast Radius**: Internal network, AWS metadata service, other internal services

---
**ID**: P1-SEC-004
**Severity**: HIGH
**Category**: Security
**File(s)**: `src/app/api/admin/webhooks/[id]/route.ts` (lines 141-164, DELETE handler)
**Title**: Webhook deletion has no audit log entry
**Description**: The webhook DELETE endpoint performs the deletion without creating an audit log entry. Both webhook creation (POST in webhooks/route.ts) and API key creation include audit logging, but webhook deletion does not.
**Evidence**:
```typescript
// Lines 141-164: DELETE handler — no audit log
export async function DELETE(...) {
  await db.delete(webhooks).where(eq(webhooks.id, id));
  return NextResponse.json({ deleted: true }); // No audit entry
}
```
**Impact**: An attacker with admin access (or compromised admin session) can delete webhooks used for security monitoring without leaving any trace in the audit log. This enables covering tracks after disabling security notifications.
**Reproduction / Trigger**: Delete a webhook via DELETE `/api/admin/webhooks/[id]` and check the audit_log table — no entry exists.
**Recommended Fix**: Add `await db.insert(auditLog).values({ action: 'webhook.deleted', entityType: 'webhook', entityId: id, ... })` before the delete.
**Related Findings**: P1-ARC-001
**Blast Radius**: Audit trail integrity, compliance reporting, security monitoring

---
**ID**: P1-SEC-005
**Severity**: HIGH
**Category**: Security
**File(s)**: `src/app/api/admin/api-keys/route.ts` (lines 40-41, POST handler)
**Title**: API key creation endpoint bypasses Zod validation — uses raw `request.json()`
**Description**: The API key POST endpoint parses the request body with `request.json()` and casts with `as`, completely bypassing the `parseBody` + Zod validation pattern used by every other endpoint. This means no input sanitization, no length limits, and no type checking.
**Evidence**:
```typescript
// Line 40-41: Raw JSON parsing with type assertion (NO validation)
const body = await request.json();
const { name, scopes } = body as { name: string; scopes: string[] };
// Compare with every other endpoint which uses:
const { data: body, error: bodyError } = await parseBody(request, Schema);
```
**Impact**: Malformed input can cause unexpected behavior. The `name` check on line 43 is a weak substitute — it doesn't limit length, and `scopes` array elements are only checked against VALID_SCOPES but the array itself could be enormous. A crafted payload with a very large `name` string or thousands of scopes entries could cause performance issues or DB errors.
**Reproduction / Trigger**: POST to `/api/admin/api-keys` with `{ "name": "A".repeat(1000000), "scopes": [] }` — no validation rejects it.
**Recommended Fix**: Create a Zod schema and use `parseBody`:
```typescript
const CreateApiKeySchema = z.object({ name: z.string().min(1).max(100).trim(), scopes: z.array(z.string()).max(20) });
const { data: body, error: bodyError } = await parseBody(request, CreateApiKeySchema);
```
**Related Findings**: P1-SEC-006
**Blast Radius**: api_keys table, API key management UI

---
**ID**: P1-SEC-006
**Severity**: HIGH
**Category**: Security
**File(s)**: `src/lib/webhooks/deliver.ts` (lines 31-36), `src/lib/webhooks/dispatch.ts` (lines 36-44)
**Title**: Webhook secrets stored and transmitted in plaintext — no encryption at rest
**Description**: Webhook HMAC secrets are stored as plaintext hex strings in the database and loaded via a direct SELECT. Unlike API keys (which are bcrypt-hashed), webhook secrets must be readable (for HMAC signing), but they are not encrypted at rest using an application-level encryption key.
**Evidence**:
```typescript
// dispatch.ts line 36-44: SELECT includes plaintext secret
const candidates = await db.select({
  id: webhooks.id, url: webhooks.url,
  secret: webhooks.secret,  // Plaintext in DB and in memory
  ...
}).from(webhooks);
// deliver.ts line 39: Used directly for HMAC
const signature = computeSignature(secret, body);
```
**Impact**: A database breach (SQL injection, backup leak, admin panel compromise) exposes all webhook secrets. An attacker can forge webhook signatures and send fake events to all registered webhook endpoints, potentially triggering destructive actions in downstream systems.
**Reproduction / Trigger**: Query `SELECT secret FROM webhooks` directly — all secrets are plaintext.
**Recommended Fix**: Encrypt webhook secrets with an application-level encryption key (AES-256-GCM) before storing. Decrypt only when computing HMAC signatures. Store the encryption key in environment variables, not the database.
**Related Findings**: None
**Blast Radius**: All webhook recipients, downstream integrations

---
**ID**: P1-SEC-007
**Severity**: HIGH
**Category**: Security
**File(s)**: `src/lib/auth/cron-auth.ts` (inferred), `src/lib/env.ts` (CRON_SECRET is optional), `vercel.json`
**Title**: Cron endpoints may be unprotected if CRON_SECRET is not set
**Description**: The `CRON_SECRET` environment variable is optional in `env.ts`. If not configured, the 6 cron endpoints (review-reminders, alert-check, telemetry-sync, quality-trends, portfolio-snapshot, governance-drift) may be accessible to anyone who knows the URL pattern.
**Evidence**: From env.ts reconnaissance — CRON_SECRET is listed as optional. From vercel.json — 6 cron jobs are configured. If the cron auth function doesn't reject requests when CRON_SECRET is empty/undefined, the endpoints are unprotected.
**Impact**: An attacker can trigger cron jobs at will — causing spam notifications (review-reminders), incorrect alerts (alert-check), data manipulation (telemetry-sync), and resource exhaustion (quality-trends triggering LLM calls).
**Reproduction / Trigger**: Send GET/POST to `/api/cron/review-reminders` without any authorization header when CRON_SECRET is not set.
**Recommended Fix**: Make CRON_SECRET required (not optional) in env.ts. In the cron-auth function, always reject if the secret is missing or empty.
**Related Findings**: None
**Blast Radius**: All 6 cron jobs, notification system, telemetry system, quality metrics

---
**ID**: P1-ARC-001
**Severity**: HIGH
**Category**: Architecture
**File(s)**: `src/lib/db/schema.ts` (multiple tables)
**Title**: createdBy/reviewedBy fields use email strings instead of user ID foreign keys
**Description**: All `createdBy` and `reviewedBy` columns across the schema use email address strings rather than UUID foreign keys referencing the `users` table. When a user is deleted, there is no CASCADE behavior — audit attribution becomes orphaned.
**Evidence**: In schema.ts — `createdBy: text("created_by")` appears on intakeSessions, agentBlueprints, webhooks, apiKeys — all storing email strings with no FK to users.id.
**Impact**: Deleted users leave dangling references. Email changes (if supported) break attribution. No referential integrity enforcement. Audit trail can become unverifiable.
**Reproduction / Trigger**: Delete a user from the users table — all their created blueprints, sessions, and webhooks still reference the now-nonexistent email.
**Recommended Fix**: Add a `createdById` UUID column with a FK to users.id (SET NULL on delete to preserve records) alongside the email for display purposes.
**Related Findings**: P1-SEC-004
**Blast Radius**: All tables with createdBy/reviewedBy, audit system, compliance reporting

---

## MEDIUM Findings

---
**ID**: P1-SEC-008
**Severity**: MEDIUM
**Category**: Security
**File(s)**: `src/middleware.ts` (lines 93-101)
**Title**: Middleware does not strip client-supplied security headers before injecting authenticated values
**Description**: The middleware reads from `req.headers` and injects `x-enterprise-id`, `x-user-role`, and `x-actor-email` into forwarded request headers. However, it does not first DELETE any existing values of these headers from the incoming request. While NextAuth middleware only sets these for authenticated users, any code path that runs before the auth check (or for unauthenticated routes) could potentially forward client-supplied headers.
**Evidence**:
```typescript
// Line 77: Creates new Headers from existing request headers (carries ALL original headers)
const requestHeaders = new Headers(req.headers);
// Line 93-101: Sets auth headers but doesn't delete pre-existing values first
if (isLoggedIn && req.auth?.user) {
  requestHeaders.set(ENTERPRISE_ID_HEADER, user.enterpriseId ?? "__null__");
  requestHeaders.set(ROLE_HEADER, user.role ?? "viewer");
  requestHeaders.set(ACTOR_EMAIL_HEADER, user.email ?? "");
}
// For UNAUTHENTICATED routes (lines 105-155), the original headers pass through unchanged
```
**Impact**: For authenticated users, `requestHeaders.set` overwrites any client-supplied value — so the impact is limited to unauthenticated routes. However, if any future code reads these headers on public routes (e.g., `/api/intake/invitations`), an attacker could spoof enterprise context.
**Reproduction / Trigger**: Send a request to a public route like `/api/intake/invitations/[token]` with `x-enterprise-id: victim-enterprise-id` header. If the route handler reads this header, it would receive the attacker's value.
**Recommended Fix**: At the top of middleware, always delete security headers before any processing:
```typescript
requestHeaders.delete(ENTERPRISE_ID_HEADER);
requestHeaders.delete(ROLE_HEADER);
requestHeaders.delete(ACTOR_EMAIL_HEADER);
```
**Related Findings**: None
**Blast Radius**: Public routes that might read enterprise context headers

---
**ID**: P1-SEC-009
**Severity**: MEDIUM
**Category**: Security
**File(s)**: `src/auth.ts` (JWT callback)
**Title**: JWT "remember me" extends session to 30 days without re-authentication
**Description**: When a user checks "Remember this device", the JWT maxAge extends from 8 hours to 30 days (2,592,000 seconds). There is no mechanism to require re-authentication for sensitive operations during this extended window.
**Evidence**: From auth.ts JWT callback — `if (token.remember) { token.exp = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; }`
**Impact**: A stolen JWT (XSS, device theft, shared computer) remains valid for 30 days. For an enterprise application handling agent governance, this is an excessive window of exposure.
**Reproduction / Trigger**: Log in with "Remember this device" checked. The JWT remains valid for 30 days without any re-verification.
**Recommended Fix**: Reduce remember-me duration to 7 days. Implement step-up authentication for sensitive operations (admin actions, deployment, policy changes) that requires password re-entry regardless of session age.
**Related Findings**: None
**Blast Radius**: All authenticated operations for 30 days per stolen token

---
**ID**: P1-SEC-010
**Severity**: MEDIUM
**Category**: Security
**File(s)**: `src/app/api/auth/invite/accept/route.ts` (entire file)
**Title**: Invitation acceptance endpoint has no rate limiting
**Description**: Unlike `/api/auth/register` (5/hour), `/api/auth/forgot-password` (5/hour), and `/api/auth/reset-password` (10/hour), the invitation acceptance endpoint has no rate limiting. An attacker can brute-force invitation tokens at full speed.
**Evidence**: No `rateLimit()` call anywhere in the file. Compare with register/route.ts which has:
```typescript
const rateLimitResponse = await rateLimit(ip, { endpoint: "register", max: 5, windowMs: 60 * 60 * 1000 });
```
**Impact**: Invitation tokens are SHA-256 hashed from 32-byte random values (256-bit entropy), so brute-force is computationally infeasible. However, the lack of rate limiting is an inconsistency that could become a problem if token generation entropy is ever reduced or if timing attacks are possible.
**Reproduction / Trigger**: Send thousands of requests per second to `/api/auth/invite/accept` — no rate limiting blocks them.
**Recommended Fix**: Add rate limiting consistent with other auth endpoints: `await rateLimit(ip, { endpoint: "invite-accept", max: 10, windowMs: 60 * 60 * 1000 });`
**Related Findings**: None
**Blast Radius**: Invitation system, server resources

---
**ID**: P1-SEC-011
**Severity**: MEDIUM
**Category**: Security
**File(s)**: `src/app/api/auth/invite/validate/route.ts` (inferred)
**Title**: Invitation validation endpoint may leak enterprise information
**Description**: The invitation validation endpoint returns the invitee's email and enterprise name to anyone who has a valid token. Combined with no rate limiting on the accept endpoint, this allows enumeration of enterprise names if tokens are guessable or leaked.
**Impact**: Enterprise name exposure is a minor information leak but could be used for social engineering or competitive intelligence.
**Reproduction / Trigger**: Call GET `/api/auth/invite/validate?token=<valid_token>` — returns email and enterprise name.
**Recommended Fix**: Consider returning only the minimum necessary information (e.g., just the email, not the enterprise name) to reduce information exposure.
**Related Findings**: P1-SEC-010
**Blast Radius**: Enterprise information confidentiality

---
**ID**: P1-SEC-012
**Severity**: MEDIUM
**Category**: Security
**File(s)**: `src/next.config.ts` (CSP header)
**Title**: CSP allows `unsafe-inline` and `unsafe-eval` for scripts
**Description**: The Content Security Policy includes `'unsafe-inline' 'unsafe-eval'` in the `script-src` directive. This significantly weakens XSS protection, as inline scripts and eval() can execute freely.
**Evidence**: From next.config.ts: `script-src 'self' 'unsafe-inline' 'unsafe-eval'`
**Impact**: If any XSS vector is found in the application, the CSP will not block exploitation. The CSP effectively provides no protection against script injection attacks.
**Reproduction / Trigger**: Any XSS vector (reflected or stored) will execute successfully because CSP permits inline scripts.
**Recommended Fix**: Implement nonce-based CSP: generate a random nonce per request, include it in `script-src 'nonce-<value>'`, and add the nonce attribute to all legitimate `<script>` tags.
**Related Findings**: None
**Blast Radius**: All pages served by the application

---
**ID**: P1-SEC-013
**Severity**: MEDIUM
**Category**: Security
**File(s)**: `src/lib/db/rls.ts` (line 34)
**Title**: RLS context set with session-level scope — relies on serverless fresh-connection assumption
**Description**: `set_config` is called with `false` (session-level, not transaction-level). This means the RLS context persists for the entire connection lifetime. The code comments acknowledge this is safe "because serverless gives fresh connections." If connection pooling is ever added (e.g., PgBouncer), RLS context from one request could leak to another.
**Evidence**:
```typescript
// Line 34: false = session-level, not transaction-level
await db.execute(sql`SELECT set_config('app.current_enterprise_id', ${ctx.enterpriseId}, false)`);
```
**Impact**: Currently safe on Vercel serverless (max:1 connection). If infrastructure changes to include connection pooling, RLS context leaks between requests — causing cross-tenant data exposure.
**Reproduction / Trigger**: Not exploitable in current deployment. Would become CRITICAL if connection pooling is added.
**Recommended Fix**: Switch to `true` (transaction-local) and ensure all queries run within transactions. Add a comment/ADR documenting this constraint.
**Related Findings**: P1-OPT-001
**Blast Radius**: All tenant-scoped data (complete cross-tenant exposure if triggered)

---
**ID**: P1-BUG-002
**Severity**: MEDIUM
**Category**: Bug
**File(s)**: `src/lib/webhooks/deliver.ts` (line 107)
**Title**: Webhook delivery attempt count is incorrectly calculated
**Description**: The `attempts` field in the delivery record update uses a misleading formula that doesn't accurately reflect the number of attempts made.
**Evidence**:
```typescript
// Line 107: Approximate attempt count
attempts: MAX_ATTEMPTS - (succeeded ? MAX_ATTEMPTS - 1 : 0), // approximate
// This evaluates to: succeeded ? 1 : 3
// But the actual number of attempts could be 1, 2, or 3
```
**Impact**: The delivery record shows either 1 (success) or 3 (failed) attempts, never 2. If the first attempt fails but the second succeeds, it reports 1 attempt instead of 2. This makes monitoring and debugging inaccurate.
**Reproduction / Trigger**: Set up a webhook endpoint that fails on the first request but succeeds on the second. Check the delivery record — it shows 1 attempt.
**Recommended Fix**: Track the actual attempt count: `let attemptsMade = 0;` at the top, increment in the loop, and use it in the update.
**Related Findings**: P1-BUG-001
**Blast Radius**: Webhook monitoring dashboard, delivery statistics

---
**ID**: P1-ARC-002
**Severity**: MEDIUM
**Category**: Architecture
**File(s)**: `src/lib/events/bus.ts`, `src/lib/webhooks/dispatch.ts` (line 78)
**Title**: Event bus uses fire-and-forget dispatch — webhook/notification failures silently lost
**Description**: The webhook dispatch handler uses `void Promise.allSettled(...)` — failures are caught by the outer try/catch and logged to console, but never retried, stored in a dead-letter queue, or alerted on.
**Evidence**:
```typescript
// dispatch.ts line 78-82: Fire-and-forget
void Promise.allSettled(
  matched.map((wh) => deliverWebhook(wh.id, wh.url, wh.secret, payload, wh.enterpriseId))
);
```
**Impact**: If the Vercel function terminates before all webhook deliveries complete (e.g., under load), some deliveries are silently dropped. The individual `deliverWebhook` function has 3 retries with short delays, but the outer dispatch can be killed by the runtime.
**Reproduction / Trigger**: Trigger a lifecycle event when a webhook endpoint is slow (>5s response). The Vercel function may terminate before delivery completes.
**Recommended Fix**: Consider using Vercel's `waitUntil` for background work, or move to a durable queue (Vercel KV queue, SQS, etc.) for reliable delivery.
**Related Findings**: None
**Blast Radius**: All webhook recipients, downstream integrations

---

## LOW Findings

---
**ID**: P1-SEC-014
**Severity**: LOW
**Category**: Security
**File(s)**: `src/lib/env.ts`
**Title**: AUTH_SECRET validation only checks length (32 chars), not entropy
**Description**: The environment validation checks `AUTH_SECRET.min(32)` but doesn't verify entropy. A value like `"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"` would pass validation.
**Impact**: Weak AUTH_SECRET could make JWT signing predictable. In practice, any deployment guide will recommend generating a random secret, so this is a defense-in-depth concern.
**Recommended Fix**: Add a comment documenting the requirement for cryptographic randomness. Consider checking for character diversity.
**Related Findings**: None
**Blast Radius**: JWT signing security

---
**ID**: P1-SEC-015
**Severity**: LOW
**Category**: Security
**File(s)**: `src/app/api/admin/api-keys/route.ts` (line 57)
**Title**: API key bcrypt cost factor (10) is lower than password cost factor (12)
**Description**: API keys use bcrypt cost factor 10 while user passwords use 12. API keys have higher entropy (128-bit random), so the lower cost factor is acceptable, but the inconsistency should be documented.
**Impact**: Negligible — the 128-bit entropy of the key makes brute-force infeasible regardless of bcrypt cost.
**Recommended Fix**: Add a code comment explaining the deliberate cost factor difference, or centralize bcrypt cost in a constant.
**Related Findings**: None
**Blast Radius**: API key security (negligible impact)

---

## Optimization Findings

---
**ID**: P1-OPT-001
**Severity**: MEDIUM
**Category**: Optimization
**File(s)**: `src/lib/db/index.ts`
**Title**: Database connection pool limited to max:1
**Description**: The Postgres connection is configured with `max: 1`, meaning only one query can execute at a time. Any concurrent queries within the same serverless invocation must wait.
**Evidence**: `const client = postgres(env.DATABASE_URL, { max: 1 });`
**Impact**: Operations that need multiple concurrent queries (e.g., transaction + read, or parallel fetches) are serialized. Under load, this can cause timeouts on Vercel's 10s/60s function limits.
**Recommended Fix**: Increase to `max: 3-5` for serverless. Evaluate connection pooling needs if moving beyond Vercel.
**Related Findings**: P1-SEC-013
**Blast Radius**: All database operations, request latency

---

# Phase 2 Findings

---
**ID**: P2-SEC-001
**Severity**: CRITICAL
**Category**: Security
**File(s)**: `src/app/api/telemetry/ingest/route.ts` (lines 39-45)
**Title**: Telemetry ingest endpoint completely open when TELEMETRY_API_KEY is not set
**Description**: The telemetry ingest endpoint accepts up to 1000 metric data points per request. When `TELEMETRY_API_KEY` is not configured, the endpoint is completely unauthenticated. The comment says "dev/staging only" but there is no runtime enforcement preventing this in production.
**Evidence**:
```typescript
const telemetryKey = process.env.TELEMETRY_API_KEY;
if (telemetryKey) {  // If not set, auth is completely skipped
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${telemetryKey}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
```
**Impact**: An attacker can inject arbitrary telemetry data for any deployed agent — fake error rates, inflated costs, spoofed latency metrics. This poisons the monitoring dashboard, triggers false alerts, and corrupts governance compliance data. The runtime policy evaluation (line 133) will evaluate policies against injected data.
**Reproduction / Trigger**: POST to `/api/telemetry/ingest` with any valid-looking metric body. If TELEMETRY_API_KEY is unset, all data is accepted.
**Recommended Fix**: Either (a) require TELEMETRY_API_KEY in env.ts (make it non-optional), or (b) reject requests when the key is not set (like cron-auth.ts does):
```typescript
if (!telemetryKey) {
  return NextResponse.json({ error: "Telemetry auth not configured" }, { status: 503 });
}
```
**Related Findings**: P1-SEC-007
**Blast Radius**: agent_telemetry table, monitoring dashboard, governance drift detection, alert system

---
**ID**: P2-SEC-002
**Severity**: HIGH
**Category**: Security
**File(s)**: `src/app/api/telemetry/ingest/route.ts` (line 42), `src/lib/auth/cron-auth.ts` (line 29)
**Title**: Bearer token comparisons use non-timing-safe string equality
**Description**: Both the telemetry ingest and cron auth use JavaScript `===` for comparing bearer tokens to secrets. This is vulnerable to timing side-channel attacks where an attacker can deduce the secret character-by-character by measuring response times.
**Evidence**:
```typescript
// cron-auth.ts line 29:
if (authHeader !== `Bearer ${cronSecret}`) {
// telemetry/ingest line 42:
if (authHeader !== `Bearer ${telemetryKey}`) {
```
**Impact**: A patient attacker can brute-force the secrets using timing analysis. The practical risk is moderate (requires many requests and precise timing), but for a security-sensitive enterprise application, this should use constant-time comparison.
**Reproduction / Trigger**: Send requests with systematically varied bearer tokens and measure response time differences.
**Recommended Fix**: Use `crypto.timingSafeEqual`:
```typescript
import { timingSafeEqual } from "node:crypto";
const expected = Buffer.from(`Bearer ${cronSecret}`);
const actual = Buffer.from(authHeader ?? "");
if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) { ... }
```
**Related Findings**: P1-SEC-007
**Blast Radius**: All cron endpoints, telemetry ingest

---
**ID**: P2-SEC-003
**Severity**: HIGH
**Category**: Security
**File(s)**: `src/app/api/blueprints/[id]/fields/route.ts` (lines 84-86)
**Title**: Blueprint field edit route bypasses Zod validation — raw request.json()
**Description**: The fields route reads the request body via `request.json()` with no Zod schema validation. The `fieldPath` and `value` parameters are used directly to modify the ABP document, which is a critical artifact.
**Evidence**:
```typescript
const body = await request.json();
const { fieldPath, value } = body;  // No validation
```
**Impact**: Arbitrary data can be injected into ABP documents. A crafted `fieldPath` could overwrite governance-critical sections. A `value` of unexpected type could corrupt the document structure.
**Reproduction / Trigger**: PATCH `/api/blueprints/[id]/fields` with `{ "fieldPath": "__proto__", "value": { "isAdmin": true } }` — prototype pollution. Or `{ "fieldPath": "systemPrompt", "value": "ignore all policies" }`.
**Recommended Fix**: Add Zod schema with path whitelist or pattern validation.
**Related Findings**: P1-SEC-005, CC-3
**Blast Radius**: ABP documents, governance validation, deployment

---
**ID**: P2-SEC-004
**Severity**: HIGH
**Category**: Security
**File(s)**: `src/app/api/blueprints/[id]/suggest-fix/route.ts` (lines 42-44)
**Title**: Manual enterprise access check instead of standard utility
**Description**: This route implements enterprise access checking with inline code instead of using `assertEnterpriseAccess` or `canAccessResource`. The manual check has a different logic pattern from the standard utility.
**Evidence**:
```typescript
if (session.user.role !== "admin" && blueprint.enterpriseId !== session.user.enterpriseId) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
```
**Impact**: Inconsistent access control logic. If the standard utility is updated (e.g., to handle new roles or edge cases), this route won't get the fix. Also uses raw NextResponse instead of apiError.
**Recommended Fix**: Replace with `assertEnterpriseAccess(blueprint.enterpriseId, ctx)`.
**Related Findings**: CC-5
**Blast Radius**: Blueprint suggest-fix endpoint

---
**ID**: P2-SEC-005
**Severity**: HIGH
**Category**: Security
**File(s)**: `src/app/api/intake/invitations/[token]/chat/route.ts` (inferred)
**Title**: Public invitation chat endpoint has no rate limiting — LLM cost DoS
**Description**: The public invitation chat endpoint (for stakeholder contributions) calls the LLM without any rate limiting. Since it requires only a valid invitation token (not authentication), an attacker with a leaked or brute-forced token can generate unlimited LLM costs.
**Impact**: Unbounded Anthropic API costs. A single compromised invitation token enables unlimited LLM queries.
**Reproduction / Trigger**: Obtain a valid invitation token and send rapid POST requests to the chat endpoint.
**Recommended Fix**: Add rate limiting by IP and by token: `await rateLimit(ip, { endpoint: "invitation-chat", max: 30, windowMs: 60 * 60 * 1000 });`
**Related Findings**: P1-SEC-010
**Blast Radius**: Anthropic API costs, platform availability

---
**ID**: P2-BUG-003
**Severity**: MEDIUM
**Category**: Bug
**File(s)**: `src/app/api/blueprints/[id]/new-version/route.ts` (lines 59-71)
**Title**: Version uniqueness check-then-insert race condition
**Description**: The route checks for duplicate versions via SELECT, then inserts. Two concurrent requests can both pass the check and create duplicate versions.
**Evidence**:
```typescript
const existing = await db.query.agentBlueprints.findFirst({
  where: and(eq(agentBlueprints.agentId, source.agentId), eq(agentBlueprints.version, newVersion), ...),
});
if (existing) { return apiError(ErrorCode.CONFLICT, ...); }
// ... gap ...
const [newBlueprint] = await db.insert(agentBlueprints).values({...}).returning();
```
**Impact**: Duplicate blueprint versions for the same agent. Violates version uniqueness invariant.
**Recommended Fix**: Add UNIQUE constraint on (agentId, version) in DB schema. Wrap in transaction.
**Related Findings**: P1-SEC-001, P1-SEC-002
**Blast Radius**: agent_blueprints table, version management

---
**ID**: P2-BUG-004
**Severity**: MEDIUM
**Category**: Bug
**File(s)**: Multiple blueprint routes (fields, suggest-fix, review-brief)
**Title**: Three mutation endpoints missing audit logging
**Description**: The fields route (ABP field editing), suggest-fix route (AI-driven fix suggestions), and review-brief route (AI-driven review brief generation) perform mutations or costly operations without creating audit log entries.
**Evidence**: No `publishEvent()` or `db.insert(auditLog)` calls in these routes.
**Impact**: ABP modifications, AI-generated governance suggestions, and review briefs are invisible to the audit trail. Compliance officers cannot track who changed what or when AI was consulted.
**Recommended Fix**: Add `publishEvent()` calls after successful mutations.
**Related Findings**: P1-SEC-004, CC-4
**Blast Radius**: Audit trail, compliance reporting

---
**ID**: P2-BUG-005
**Severity**: MEDIUM
**Category**: Bug
**File(s)**: `src/app/api/blueprints/[id]/test-runs/route.ts` (lines 116-148)
**Title**: Test run left in "running" state if execution fails after record creation
**Description**: The route inserts a test run record with status "running", then executes the test suite, then updates with results. If execution throws, the record remains in "running" state permanently.
**Impact**: Orphaned "running" test runs in the database. UI may show perpetually running tests.
**Recommended Fix**: Wrap in try-catch and update to "error" status on failure:
```typescript
try { ... } catch (err) {
  await db.update(blueprintTestRuns).set({ status: "error" }).where(eq(blueprintTestRuns.id, runRow.id));
}
```
**Related Findings**: P1-SEC-001
**Blast Radius**: blueprint_test_runs table, test runs UI

---
**ID**: P2-SEC-006
**Severity**: MEDIUM
**Category**: Security
**File(s)**: Multiple export/diff/report routes
**Title**: Export, diff, and report endpoints lack rate limiting
**Description**: The evidence-package, export/code, export/compliance, diff, and report endpoints perform expensive operations (LLM calls, large data processing) without rate limiting.
**Impact**: DoS via repeated expensive operations. LLM cost amplification.
**Recommended Fix**: Add rate limiting to all endpoints that perform LLM calls or generate large outputs.
**Related Findings**: P2-SEC-005
**Blast Radius**: API availability, LLM costs

---
**ID**: P2-SEC-007
**Severity**: MEDIUM
**Category**: Security
**File(s)**: `src/app/api/blueprints/[id]/suggest-fix/route.ts`, `src/app/api/blueprints/[id]/ownership/route.ts`
**Title**: Multiple routes use manual try-catch JSON parsing instead of parseBody
**Description**: At least two routes parse request bodies with raw `request.json()` + manual try-catch instead of the standardized `parseBody()` helper, resulting in inconsistent error responses and missing validation details.
**Impact**: Inconsistent error responses confuse API consumers. Missing validation feedback.
**Recommended Fix**: Replace with `parseBody(request, Schema)` pattern.
**Related Findings**: P1-SEC-005, CC-3
**Blast Radius**: API consumer experience, validation consistency

---
**ID**: P2-SEC-008
**Severity**: MEDIUM
**Category**: Security
**File(s)**: `src/app/api/blueprints/[id]/clone/route.ts` (lines 28-90)
**Title**: Clone route missing withTenantScope() defense-in-depth
**Description**: The clone route does not call `withTenantScope(request)` to activate RLS, unlike other routes that modify data. It relies solely on the application-level enterprise check.
**Impact**: If the application-level check is bypassed (e.g., via header spoofing on a path not covered by middleware), the database RLS layer won't catch it.
**Recommended Fix**: Add `await withTenantScope(request);` at the start of the handler.
**Related Findings**: CC-5
**Blast Radius**: Blueprint cloning, tenant isolation

---
**ID**: P2-ARC-003
**Severity**: MEDIUM
**Category**: Architecture
**File(s)**: Multiple blueprint routes
**Title**: Inconsistent enterprise access checking patterns across routes
**Description**: Some routes use `assertEnterpriseAccess()`, some use manual `if (role !== admin && eid !== eid)` checks, and some use `enterpriseScope()` in queries. This inconsistency makes security auditing difficult and increases the risk of bugs.
**Impact**: Harder to verify correctness. Changes to access control logic may not propagate to manually-checked routes.
**Recommended Fix**: Standardize on a single pattern (preferably `canAccessResource` from enterprise-scope.ts) and audit all routes for consistency.
**Related Findings**: P2-SEC-004, CC-5
**Blast Radius**: All routes with enterprise access checks

---
**ID**: P2-ARC-004
**Severity**: MEDIUM
**Category**: Architecture
**File(s)**: `src/app/api/blueprints/[id]/suggest-fix/route.ts` (lines 120-131)
**Title**: Audit log entry via raw DB insert bypasses event bus
**Description**: The suggest-fix route writes directly to the audit_log table instead of using `publishEvent()`. This means webhooks, notifications, and other event handlers are not triggered.
**Impact**: Downstream event consumers (webhooks, Slack, Jira) don't receive blueprint.fix_suggested events.
**Recommended Fix**: Replace `db.insert(auditLog)` with `publishEvent()`.
**Related Findings**: P1-SEC-004, CC-4
**Blast Radius**: Event bus consumers, webhook recipients

---
**ID**: P2-OPT-002
**Severity**: MEDIUM
**Category**: Optimization
**File(s)**: `src/app/api/telemetry/ingest/route.ts` (lines 69-81)
**Title**: Telemetry ingest queries all deployed blueprints for each batch
**Description**: Every ingest request queries `agentBlueprints` with `selectDistinctOn` and `inArray` to validate agent IDs. For high-frequency telemetry (deployed agents reporting every minute), this generates heavy DB load.
**Impact**: Database performance degradation under load. Each ingest may scan the entire blueprints table.
**Recommended Fix**: Cache valid agent IDs in Redis with short TTL (5 minutes). Only query DB on cache miss.
**Related Findings**: P1-OPT-001
**Blast Radius**: Database performance, telemetry throughput
