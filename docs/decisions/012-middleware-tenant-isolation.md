# ADR-012: Middleware-Level Tenant Isolation

**Status:** accepted
**Date:** 2026-04-03
**Supersedes:** (none — extends the existing query-level isolation)

## Context

Intellios is a multi-tenant platform where every data table includes an `enterprise_id` column. Prior to this decision, tenant isolation was enforced at the query level in two ways:

1. **`assertEnterpriseAccess()`** — called in 51 resource-specific routes after fetching a record
2. **Inline WHERE clauses** — hand-written `enterpriseId` filters in 47+ list/query endpoints

This approach was **correct** (security audit found zero cross-tenant data leaks) but had structural weaknesses:

- **No single enforcement point.** Each route was responsible for its own isolation logic.
- **Inconsistent patterns.** Some routes used `assertEnterpriseAccess()`, others used inline filters, some used both.
- **SOC 2 audit risk.** Auditors prefer a centralized enforcement mechanism over distributed route-by-route checks.
- **Cron routes optionally authenticated.** If `CRON_SECRET` was unset, cron endpoints were publicly accessible.

## Decision

Implement middleware-level tenant isolation with three components:

### 1. Middleware Header Injection

The Next.js middleware extracts `enterprise_id` and `role` from the authenticated user's JWT and stamps them as request headers (`x-enterprise-id`, `x-user-role`, `x-actor-email`) on every authenticated request. The `__null__` sentinel distinguishes "no enterprise" from "missing header."

### 2. Enterprise Scope Utility (`enterprise-scope.ts`)

A new module provides:

- **`getEnterpriseId(request)`** — reads the middleware-injected headers, returning an `EnterpriseContext` object
- **`enterpriseScope(column, ctx)`** — generates the correct Drizzle WHERE filter for any table's `enterpriseId` column (admin → undefined, enterprise user → eq, null user → isNull)
- **`canAccessResource(resourceEnterpriseId, ctx)`** — boolean check for resource-specific access

Routes use these utilities instead of hand-coding isolation logic:

```typescript
const ctx = getEnterpriseId(request);
const filter = enterpriseScope(agentBlueprints.enterpriseId, ctx);
const rows = await db.select().from(agentBlueprints).where(filter);
```

### 3. Mandatory Cron Authentication

A `requireCronAuth()` utility replaces optional `CRON_SECRET` checks. If the environment variable is unset, the route returns 503 (fail closed) instead of allowing unauthenticated access.

## Consequences

**Positive:**
- Single enforcement point for tenant isolation (middleware → header → utility → DB)
- Enterprise ID originates from the signed JWT, not from request parameters
- SOC 2 auditors can point to one middleware file + one utility module
- Cron routes now fail closed when misconfigured
- Existing `assertEnterpriseAccess()` remains available as a secondary check for resource-specific access patterns

**Negative:**
- Incremental migration: not all 120 routes use the new utility yet (4 refactored as reference; remaining routes continue using inline filters which are functionally equivalent)
- Small overhead: middleware reads the JWT on every request (already happening via NextAuth's `auth()` wrapper)

**Migration Path:**
Routes can be migrated incrementally from inline filters to `enterpriseScope()`. The old and new patterns produce identical query behavior. A codemod or lint rule can flag routes that don't use the new utility.
