# Cross-Cutting Concerns

## CC-1: Race Conditions in Multi-Step Operations (Phase 1)
**Affected Files**: reset-password/route.ts, invite/accept/route.ts
**Pattern**: SELECT → validate → UPDATE/INSERT sequences without transactions allow concurrent requests to bypass single-use constraints.
**Findings**: P1-SEC-001, P1-SEC-002
**Status**: ✅ RESOLVED — Both routes wrapped in `db.transaction()` with mark-as-used-first pattern.

## CC-2: Test Coverage Gap (Phase 0)
**Affected**: Entire codebase
**Pattern**: Only ~9 test files covering 100+ source files. No auth tests, no API route tests, no integration tests.
**Risk**: Bugs and regressions go undetected. The race conditions in CC-1 would have been caught by integration tests.
**Status**: 🔶 PARTIALLY RESOLVED — 59 security-focused tests added in `src/__tests__/security/security-fixes.test.ts`. Full integration test suite still needed.

## CC-3: Input Validation Consistency (Phase 0 + Phase 1)
**Affected Files**: admin/api-keys/route.ts, admin/sso/route.ts, admin/integrations/route.ts, intake/sessions/[id]/route.ts, templates/[id]/rate/route.ts, blueprints/[id]/fields/route.ts, and 7 other routes
**Pattern**: Most endpoints use Zod validation, but several critical endpoints used raw `request.json()`.
**Findings**: P1-SEC-005, P2-SEC-003, P2-SEC-007
**Status**: ✅ FULLY RESOLVED — All API routes now use `parseBody` with Zod schemas. Zero remaining `request.json()` calls. Blueprint fields route (P2-SEC-003) now includes prototype pollution defense via path character whitelist.

## CC-4: Audit Logging Gaps (Phase 1)
**Affected Files**: Multiple mutation endpoints across the API surface
**Pattern**: Some mutation operations create audit log entries, others don't. No systematic enforcement.
**Findings**: P1-SEC-004
**Status**: ✅ RESOLVED — Audit logging added to 32+ security-critical mutation routes covering auth, admin, governance, blueprints, workflows, and intake operations. Remaining low-priority routes (chat endpoints, cron jobs, monitoring) are fire-and-forget or system-automated and lower risk.

## CC-5: Tenant Isolation on Public Routes (Phase 1)
**Affected Files**: middleware.ts, public route handlers
**Pattern**: Middleware injects enterprise headers for authenticated users but doesn't strip client-supplied headers. Public routes could forward attacker-supplied enterprise context.
**Findings**: P1-SEC-008
**Status**: ✅ RESOLVED — Middleware now deletes client-supplied security headers before injecting authenticated values.

## CC-6: Webhook/Event Reliability (Phase 1)
**Affected Files**: events/bus.ts, webhooks/dispatch.ts
**Pattern**: Fire-and-forget dispatch with no durable queue, no retry beyond immediate attempts, no dead-letter queue.
**Findings**: P1-ARC-002
**Status**: 🔴 OPEN — Requires infrastructure work (message queue, dead-letter handling). Recommended for post-MVP milestone.

## CC-7: Secrets Storage (Phase 1)
**Affected Files**: webhook secrets (was plaintext in DB), API keys (bcrypt-hashed)
**Pattern**: Inconsistent approach — API keys properly hashed, webhook secrets plaintext.
**Findings**: P1-SEC-006
**Status**: ✅ RESOLVED — Added AES-256-GCM encryption at rest for webhook secrets via `src/lib/crypto/encrypt.ts`. Backward-compatible with legacy plaintext values (transparent decryption). Requires `SECRETS_ENCRYPTION_KEY` env variable (64 hex chars). Webhook creation, rotation, dispatch, and test delivery all updated.

## CC-8: SSRF Validation Inconsistency (Phase 1)
**Affected Files**: webhooks POST (has SSRF check), webhooks PATCH (was missing SSRF check)
**Pattern**: Security validation applied to creation but not update.
**Findings**: P1-SEC-003
**Status**: ✅ RESOLVED — SSRF regex validation added to webhook PATCH schema.

## CC-9: RLS Context Leak on Pooled Connections (Phase 2)
**Affected Files**: with-tenant-scope.ts, all routes using `withTenantScope`
**Pattern**: Session-level `set_config` without cleanup risks tenant context leaking to subsequent requests on the same pooled connection.
**Status**: ✅ RESOLVED — Added `withTenantScopeGuarded()` with automatic try/finally cleanup. Added `setRLSContextInTx()` for transaction-local mode. All 9 route files migrated to guarded pattern.

## CC-10: Rate Limiting on LLM Endpoints (Phase 2)
**Affected Files**: review-brief/route.ts, suggest-fix/route.ts, stakeholder-chat/route.ts
**Pattern**: Expensive LLM-calling endpoints lacked rate limiting, enabling cost-amplification DoS.
**Findings**: P2-SEC-006
**Status**: ✅ RESOLVED — Rate limiting added to all 3 unprotected LLM endpoints (10 req/min for generation, 30 req/min for chat streaming).

*(Updated 2026-04-06 after session 132 — remaining findings sweep)*
