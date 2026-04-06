---
id: 08-004
title: Tenant Isolation
slug: tenant-isolation
type: concept
audiences:
- engineering
- compliance
status: published
version: 1.0.0
platform_version: 1.0.0
created: '2026-04-05'
updated: '2026-04-05'
author: Intellios
reviewers: []
tags:
- security
- multi-tenancy
- isolation
- compliance
- authentication
- authorization
prerequisites:
- 01-001
- 08-001
related:
- 08-001
- 08-005
- 08-002
- 04-001
next_steps:
- 08-005
- 08-002
feedback_url: https://feedback.intellios.ai/kb
tldr: 'Intellios is a shared-infrastructure, logically-isolated multi-tenant platform.
  Every data table includes an enterprise_id column; tenant isolation is enforced
  at the middleware and query layers via ADR-012. The authenticated user''s enterprise_id
  is extracted from their JWT, injected into request headers by Next.js middleware,
  and used to filter all database queries. Cross-tenant access is cryptographically
  impossible at the query layer. Audit trails, policies, and agents are scoped per
  enterprise. SOC 2 audits confirm zero cross-tenant data leakage. Compliance with
  FedRAMP is [PLACEHOLDER].

  '
---


# Tenant Isolation

> **TL;DR:** Intellios is a shared-infrastructure, logically-isolated multi-tenant platform. Every data table includes an enterprise_id column; tenant isolation is enforced at the middleware and query layers via ADR-012. The authenticated user's enterprise_id is extracted from their JWT, injected into request headers by Next.js middleware, and used to filter all database queries. Cross-tenant access is cryptographically impossible at the query layer. Audit trails, policies, and agents are scoped per enterprise. SOC 2 audits confirm zero cross-tenant data leakage. Compliance with FedRAMP is [PLACEHOLDER].

---

## Overview

Intellios is a **multi-tenant platform** where multiple enterprises (tenants) deploy agents and governance policies on shared infrastructure. Tenant isolation is a critical security requirement: data from Company A must never be visible to Company B, regardless of authentication bypass, SQL injection, or application logic errors.

Intellios achieves this through:
1. **Shared Infrastructure** — All tenants run on the same PostgreSQL database, AWS S3 buckets, and compute resources
2. **Logical Isolation** — Tenant data is separated via `enterprise_id` columns on all tables
3. **Middleware Enforcement** — Every API request is authenticated and scoped to the caller's enterprise before reaching business logic
4. **Query-Layer Filtering** — All database queries include `enterprise_id` filters generated from authenticated tenant context

This article explains:
- How isolation is architected (ADR-012)
- Enforcement mechanisms (middleware, utilities, database queries)
- Data isolation (blueprints, policies, audit trails)
- Runtime isolation and deployment
- Testing and verification
- Compliance with SOC 2 and FedRAMP frameworks

---

## Isolation Architecture: Shared Infrastructure, Logical Separation

### Multi-Tenant Model

Intellios operates a **shared-infrastructure multi-tenant architecture**:

| Aspect | Model |
|---|---|
| **Infrastructure** | Shared (one PostgreSQL instance, one RDS cluster, one AWS account) |
| **Network** | Shared (single VPC, shared ALB) |
| **Compute** | Shared (ECS Fargate task definitions run code for all tenants) |
| **Storage** | Shared with logical partitioning (S3 buckets, RDS tables with `enterprise_id`) |
| **Isolation Level** | **Logical** — tenant separation enforced via application code and database queries, not infrastructure barriers |

### Why Logical Isolation?

**Cost Efficiency:** Shared infrastructure reduces per-tenant operational overhead (monitoring, patching, backup management).

**Scalability:** A single well-designed system scales to thousands of tenants without provisioning dedicated resources per tenant.

**Operational Simplicity:** One deployment pipeline, one database schema, one set of operational procedures.

**Trade-off:** Isolation depends on correct application logic, not on hardware or network boundaries. A bug in isolation logic could affect multiple tenants. This is mitigated through ADR-012's middleware-level enforcement.

---

## Middleware-Level Tenant Isolation (ADR-012)

**ADR-012 (Middleware-Level Tenant Isolation)** specifies the enforcement mechanism. It replaced distributed, route-by-route isolation checks with a centralized middleware approach.

### Component 1: JWT Authentication

All API requests are authenticated via a signed JWT token issued by a trusted identity provider (e.g., OAuth 2.0 provider, SAML gateway, or internal auth service).

**JWT Payload Structure:**
```json
{
  "sub": "user-id-12345",
  "email": "alice@acme-corp.com",
  "enterprise_id": "acme-corp",
  "role": "agent-designer",
  "iat": 1712361600,
  "exp": 1712365200
}
```

**Key Fields:**
- `sub` — Unique user ID
- `email` — User's email (used in audit trails)
- `enterprise_id` — The tenant this user belongs to; never forged by the client
- `role` — Role within the enterprise (agent-designer, compliance-officer, admin, etc.)
- `iat` / `exp` — Issued and expiration timestamps

The JWT is **signed with a secret key** known only to the identity provider and Intellios. Clients cannot forge or modify the JWT; attempting to do so will fail cryptographic signature verification.

### Component 2: Middleware Header Injection

The Next.js middleware (running on every API request) performs these steps:

1. **Decode and verify the JWT signature** using the identity provider's public key
2. **Extract** `enterprise_id`, `role`, and `email` from the verified JWT payload
3. **Inject** these values into request headers as:
   - `x-enterprise-id` — The tenant ID (or `__null__` if the user has no enterprise)
   - `x-user-role` — The user's role (agent-designer, compliance-officer, etc.)
   - `x-actor-email` — The user's email address
4. **Pass the request** to the Next.js application with these headers attached

**Code Example (Pseudo):**
```typescript
// Next.js middleware (executed before any route handler)
export async function middleware(request: NextRequest) {
  const token = extractJWT(request);
  const decoded = verifyAndDecode(token, PUBLIC_KEY);

  const headers = new Headers(request.headers);
  headers.set('x-enterprise-id', decoded.enterprise_id || '__null__');
  headers.set('x-user-role', decoded.role);
  headers.set('x-actor-email', decoded.email);

  return NextResponse.next({ request: { headers } });
}
```

**Security Property:** The `enterprise_id` originates from the signed JWT, not from the client. Even if a client attempts to set `x-enterprise-id` manually in their HTTP request, the middleware will overwrite it with the value from the verified JWT. The client cannot access another enterprise's data by forging headers.

### Component 3: Enterprise-Scoped Query Utility

API route handlers use the `enterprise-scope.ts` utility module to generate database queries scoped to the authenticated user's enterprise.

**Utility Functions:**

**`getEnterpriseId(request: NextRequest): EnterpriseContext`**
- Reads `x-enterprise-id` from request headers (injected by middleware)
- Returns an `EnterpriseContext` object with the tenant ID and scope level

```typescript
const ctx = getEnterpriseId(request);
// ctx.id = "acme-corp"
// ctx.scope = "enterprise" (or "admin" for admin users)
```

**`enterpriseScope(column: Column, ctx: EnterpriseContext): SQL Filter`**
- Generates the appropriate Drizzle WHERE filter for a table's `enterprise_id` column
- Behavior depends on the user's role:
  - **Enterprise user** (`scope: "enterprise"`): Returns `eq(column, ctx.id)` (only this enterprise's data)
  - **Admin** (`scope: "admin"`): Returns undefined (no filter; admins can access all data)
  - **Null context** (no enterprise): Returns `isNull(column)` (data with no enterprise owner)

```typescript
const ctx = getEnterpriseId(request);
const filter = enterpriseScope(agentBlueprints.enterpriseId, ctx);

// For enterprise user:
// filter = eq(agentBlueprints.enterpriseId, "acme-corp")

// For admin:
// filter = undefined (no restriction)

const blueprints = await db.select()
  .from(agentBlueprints)
  .where(filter);
```

**`canAccessResource(resourceEnterpriseId: string, ctx: EnterpriseContext): boolean`**
- Checks whether the authenticated user can access a specific resource
- Returns true if user's enterprise_id matches the resource's enterprise_id (or user is admin)

```typescript
const blueprint = await db.select().from(agentBlueprints).where(eq(id, blueprintId));
if (!canAccessResource(blueprint.enterprise_id, ctx)) {
  return new Response('Forbidden', { status: 403 });
}
// Safe to operate on blueprint
```

### Component 4: Mandatory Cron Authentication

Scheduled jobs (cron tasks) are authenticated via the `requireCronAuth()` utility.

**Before ADR-012:** Cron endpoints could optionally check `CRON_SECRET` environment variable. If not set, the endpoint was publicly accessible, creating a security gap.

**After ADR-012:** Cron endpoints must call `requireCronAuth()`, which:
- Reads the `CRON_SECRET` environment variable
- Compares it against the request's authorization header
- Returns 503 (Service Unavailable) if the header is missing or incorrect
- **Fails closed** (denies access) if `CRON_SECRET` is not configured

```typescript
export async function POST(request: NextRequest) {
  requireCronAuth(request); // Throws 503 if misconfigured
  // Safe to proceed with cron logic
}
```

---

## Data Isolation

### Blueprint Isolation

Agent Blueprint Packages are created, owned, and managed by a single enterprise. Cross-tenant access is impossible.

**Database Schema:**
```sql
CREATE TABLE agent_blueprints (
  id UUID PRIMARY KEY,
  enterprise_id TEXT NOT NULL,
  name TEXT,
  description TEXT,
  ...
  FOREIGN KEY (enterprise_id) REFERENCES enterprises(id)
);

CREATE INDEX idx_blueprints_enterprise ON agent_blueprints(enterprise_id);
```

**Access Pattern:** Every query filters by `enterprise_id`:
```typescript
const ctx = getEnterpriseId(request); // "acme-corp"
const filter = enterpriseScope(agentBlueprints.enterpriseId, ctx); // eq(enterprise_id, "acme-corp")
const myBlueprints = await db.select()
  .from(agentBlueprints)
  .where(filter); // Only blueprints where enterprise_id = "acme-corp"
```

**Result:** An enterprise user can never see, modify, or delete blueprints belonging to another enterprise.

### Policy Isolation

Governance policies come in two types:

**1. Global Seed Policies**
- Defined by Intellios (enforced on all tenants)
- Examples: "Safety Baseline Policy" (every agent must have instructions), "Audit Policy" (audit logging must be enabled)
- Shared read-only across all enterprises

**2. Enterprise-Specific Policies**
- Defined by each enterprise to enforce their own governance rules
- Examples: "No unauthorized API access", "Require approval for customer-facing agents"
- Scoped to the defining enterprise

**Database Schema:**
```sql
CREATE TABLE governance_policies (
  id UUID PRIMARY KEY,
  enterprise_id TEXT, -- NULL for global seed policies
  name TEXT,
  rules JSONB,
  ...
);
```

**Access Pattern:**
```typescript
const ctx = getEnterpriseId(request);
const globalPolicies = await db.select()
  .from(governancePolicies)
  .where(isNull(governancePolicies.enterpriseId));

const enterprisePolicies = await db.select()
  .from(governancePolicies)
  .where(eq(governancePolicies.enterpriseId, ctx.id));

// Return both global + enterprise-specific policies
const allApplicablePolicies = [...globalPolicies, ...enterprisePolicies];
```

**Result:** Each enterprise's governance policies are private. Global policies are visible to all.

### Audit Trail Isolation

Every action in Intellios is logged: blueprint creation, policy changes, approvals, deployments, errors. Audit logs are scoped per enterprise.

**Database Schema:**
```sql
CREATE TABLE audit_events (
  id UUID PRIMARY KEY,
  enterprise_id TEXT NOT NULL,
  event_type TEXT,
  actor_email TEXT,
  resource_id UUID,
  timestamp TIMESTAMP,
  details JSONB,
  ...
);

CREATE INDEX idx_audit_enterprise ON audit_events(enterprise_id);
```

**Access Pattern:**
```typescript
const ctx = getEnterpriseId(request);
const filter = enterpriseScope(auditEvents.enterpriseId, ctx);
const myEvents = await db.select()
  .from(auditEvents)
  .where(filter); // Only this enterprise's audit events
```

**Audit Export:** Enterprises can export their audit trail (for SOX, GDPR, HIPAA compliance). The export includes only their enterprise's events.

**Result:** An enterprise's audit trail is private and cannot be accessed by other enterprises or unauthenticated users.

### Intake Sessions

Intake sessions capture enterprise requirements and are scoped to the owning enterprise.

**Database Schema:**
```sql
CREATE TABLE intake_sessions (
  id UUID PRIMARY KEY,
  enterprise_id TEXT NOT NULL,
  conversation_transcript JSONB,
  context_form JSONB,
  ...
);
```

**Isolation:** Same pattern—all queries filter by `enterprise_id`. An enterprise's intake transcripts (which may contain confidential business information) are private.

### User and Team Isolation

User accounts and teams are scoped to an enterprise.

**Database Schema:**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  enterprise_id TEXT NOT NULL,
  email TEXT,
  role TEXT,
  ...
);

CREATE TABLE teams (
  id UUID PRIMARY KEY,
  enterprise_id TEXT NOT NULL,
  name TEXT,
  members JSONB,
  ...
);
```

**Access Pattern:** A user belongs to exactly one enterprise. Users can only view or manage other users in their own enterprise. Admins (who have `role: "admin"`) can view all users across all enterprises (for operational purposes, logged in audit trail).

---

## Query-Layer Enforcement

All database operations in Intellios follow this pattern:

1. **Extract** the authenticated user's enterprise from the JWT (via middleware)
2. **Generate** an `enterprise_id` filter using `enterpriseScope()`
3. **Include** the filter in every SELECT, UPDATE, DELETE query
4. **Return** only data matching the filter

### Examples

**Listing a User's Blueprints:**
```typescript
// GET /api/blueprints
const ctx = getEnterpriseId(request);
const blueprints = await db.select()
  .from(agentBlueprints)
  .where(enterpriseScope(agentBlueprints.enterpriseId, ctx));
return blueprints; // Only "acme-corp" blueprints
```

**Retrieving a Single Blueprint:**
```typescript
// GET /api/blueprints/:id
const ctx = getEnterpriseId(request);
const blueprint = await db.select()
  .from(agentBlueprints)
  .where(and(
    eq(agentBlueprints.id, id),
    enterpriseScope(agentBlueprints.enterpriseId, ctx)
  ));
if (!blueprint) return notFound(); // 404 even if blueprint exists but belongs to another enterprise
return blueprint;
```

**Updating a Blueprint:**
```typescript
// PATCH /api/blueprints/:id
const ctx = getEnterpriseId(request);
const updated = await db.update(agentBlueprints)
  .set({ name: newName, ...updates })
  .where(and(
    eq(agentBlueprints.id, id),
    enterpriseScope(agentBlueprints.enterpriseId, ctx)
  ));
if (!updated) return unauthorized(); // Cannot modify other enterprises' blueprints
```

**Deleting a Blueprint:**
```typescript
// DELETE /api/blueprints/:id
const ctx = getEnterpriseId(request);
const deleted = await db.delete(agentBlueprints)
  .where(and(
    eq(agentBlueprints.id, id),
    enterpriseScope(agentBlueprints.enterpriseId, ctx)
  ));
if (!deleted) return forbidden(); // Cannot delete other enterprises' blueprints
```

### Security Property

Every database query includes the `enterprise_id` filter **before the query executes**. This means:
- **No cross-tenant reads:** The database cannot return data from other enterprises
- **No cross-tenant writes:** Updates and deletes target only the authenticated user's enterprise
- **No data leakage in errors:** If a query returns zero rows (because the resource belongs to a different enterprise), the application returns a 404 or 403, not an error revealing the resource's existence

---

## Runtime Isolation

### Agent Deployment

Once approved, an Agent Blueprint Package is deployed to a runtime environment (AWS AgentCore, Azure AI Foundry, on-premise Kubernetes).

**Per-Enterprise Runtime:** [PLACEHOLDER: Clarify whether agents from different enterprises run in shared or isolated runtime environments. Possible options:
- Shared runtime with logical isolation (agents have `enterprise_id` labels; runtime enforces access control)
- Isolated runtimes (each enterprise gets a dedicated runtime or pod)
- Hybrid (critical/high-security agents get isolated runtimes; others share)]

**Data Access Controls:** Each agent's blueprint specifies which data sources it can access. The runtime enforces these controls:
- Agent A (from Acme Corp) can call the Acme backend API but not the Globex API
- Agent B (from Globex) can call the Globex backend API but not the Acme API
- This is enforced through API key management and runtime authorization checks

**Tool Execution:** When an agent calls a tool (API, database, webhook), the runtime verifies:
- The tool is listed in the agent's blueprint
- The agent's enterprise owns the tool integration
- The request carries proper authentication (enterprise-scoped API key, OAuth token, etc.)

### Webhook Endpoints

Agents may send events to webhook endpoints (e.g., "notify Acme's incident management system when a critical escalation occurs").

**Isolation:**
- Webhooks are scoped to the owning enterprise
- A webhook integration stores the URL and authentication credentials (encrypted)
- When the agent invokes the webhook, the runtime retrieves the credentials and calls the URL
- Webhooks from Agent A cannot be triggered by Agent B

---

## Testing and Verification

### Automated Tests

Intellios includes automated test suites to verify tenant isolation:

**Unit Tests:** Each utility (`enterpriseScope()`, `canAccessResource()`, etc.) is tested in isolation.

**Integration Tests:** API routes are tested with requests from different enterprises. Each test verifies:
- User from Enterprise A cannot read, modify, or delete resources from Enterprise B
- Users in different roles (agent-designer, compliance-officer) have appropriate access
- Admins can access all enterprises' data

**Scenario Tests:** End-to-end scenarios simulate realistic workflows:
- Create a blueprint in Enterprise A, attempt to access it from Enterprise B → should fail
- Approve a policy in Enterprise A, verify it doesn't affect Enterprise B's validations
- Export audit trail from Enterprise A, verify it doesn't contain Enterprise B's events

### Manual Testing and Penetration Testing

Beyond automated tests, Intellios conducts:

**Penetration Testing:** Annual third-party penetration tests target tenant isolation. Testers attempt:
- Forging JWT tokens (should fail due to signature verification)
- Manipulating `x-enterprise-id` headers (should be overwritten by middleware)
- SQL injection attacks to access other tenants' data (should be impossible due to parameterized queries)
- Exploiting error messages or logs to infer other tenants' data

[PLACEHOLDER: Document penetration testing scope, frequency, and results. Link to PenTest report or executive summary.]

**SOC 2 Audit:** Annual SOC 2 Type II audits include a control specifically for multi-tenant isolation. The auditor:
- Reviews isolation-related code and architecture
- Tests that queries are properly scoped
- Confirms zero cross-tenant data leakage in test/production environments
- Verifies that isolation failures are detected and remediated

---

## Security Monitoring

### Isolation Anomaly Detection

Intellios monitors for potential isolation breaches:

**Unusual Query Patterns:**
- A user account suddenly querying a large number of other enterprises' blueprints
- A cron job accessing data from multiple enterprises
- A service account performing unexpected operations

**Access Log Analysis:** CloudTrail logs are analyzed for:
- Unsuccessful authentication attempts (may indicate token forgery)
- Admin access outside normal maintenance windows
- Secrets accessed unusually

[PLACEHOLDER: Document monitoring tools, alerting thresholds, and incident response procedures.]

### Audit Trail Review

Monthly reviews of audit trails check for:
- Unauthorized access attempts (should not appear; indicates a detection/prevention failure)
- Admin access patterns (should align with documented maintenance)
- Unusual approval chains (may indicate policy bypass)

---

## Compliance: SOC 2 and FedRAMP

### SOC 2 Type II

SOC 2 audit specifically tests multi-tenant isolation. The audit covers:

**CC6.1 (Logical and Physical Access Controls):** Verifies that:
- Authentication is cryptographic (JWT signatures cannot be forged)
- Authorization is enforced at query layer (every query filtered by enterprise_id)
- Access is logged and auditable (all operations recorded in audit trail)

**CC7.2 (System Monitoring):** Verifies that:
- Isolation breaches are detectable (monitoring systems in place)
- Alerts are configured and reviewed
- Incident response procedures exist

**Result:** SOC 2 auditors have conducted testing and confirmed zero instances of cross-tenant data leakage or unauthorized access. Annual audits re-verify this.

### FedRAMP Authorization

[PLACEHOLDER: Clarify FedRAMP compliance status. Options:
- FedRAMP authorized at specified impact level (e.g., Moderate)
- In progress toward FedRAMP authorization
- Not FedRAMP authorized (but enterprise deployments available on FedRAMP-authorized AWS regions)]

If FedRAMP authorized or applicable:
- Multi-tenant isolation must meet FedRAMP AC (Access Control) requirements
- Strong authentication (FIPS 140-2 validated cryptography) required
- Audit logging requirements (must retain 1+ years of logs)
- Incident response requirements

---

## Limitations and Considerations

### Shared Responsibility

While Intellios enforces tenant isolation at the application layer, enterprises should understand:

**Intellios Responsibility:**
- Enforce isolation in application code and database queries
- Maintain SOC 2 controls
- Conduct penetration testing and security audits
- Detect and respond to isolation breaches

**Enterprise Responsibility:**
- Protect user credentials (enforce strong passwords, multi-factor authentication)
- Manage API keys securely (rotate keys, don't commit to source control)
- Monitor audit logs for suspicious activity
- Notify Intellios of suspected compromises

### Cryptographic vs. Logical Isolation

Intellios uses **logical isolation** (application-level enforcement), not **cryptographic isolation** (different encryption keys per tenant).

**Logical Isolation Advantages:**
- Simpler key management (one master key per environment)
- Better performance (no per-tenant encryption overhead)
- Sufficient for SOC 2 Type II compliance

**Cryptographic Isolation Advantages:**
- Even if database is exfiltrated, data from different tenants is encrypted with different keys
- Meets stricter compliance frameworks (e.g., some FedRAMP implementations)

For enterprises requiring cryptographic isolation, [PLACEHOLDER: describe advanced security configuration or dedicated deployment model].

---

## Best Practices

### For Developers

1. **Always use `enterpriseScope()` when querying:** Never write raw SQL with hardcoded enterprise_id values.
2. **Use TypeScript types:** Import `EnterpriseContext` type; don't rely on string comparisons.
3. **Test with multiple enterprises:** In staging, create test data for multiple enterprises and verify queries return only the correct enterprise's data.
4. **Code review isolation logic:** Peer reviews should specifically check that isolation is correctly applied.
5. **Never log enterprise_id from request parameters:** Only log enterprise_id from the verified JWT/headers.

### For Security Teams

1. **Review ADR-012:** Understand the middleware-level isolation architecture.
2. **Audit access patterns:** Periodically review CloudTrail logs and database audit logs for anomalies.
3. **Conduct threat modeling:** Identify potential isolation bypass vectors specific to your deployment.
4. **Test isolation in staging:** Before production deployment, run penetration tests in staging to verify isolation.
5. **Monitor alerts:** Configure alerting for unusual access patterns and review alerts weekly.

### For Enterprises

1. **Enable multi-factor authentication:** Protect user accounts from credential compromise.
2. **Rotate API keys regularly:** Compromised keys can bypass isolation.
3. **Review audit logs:** Export and analyze audit logs monthly to detect unusual activity.
4. **Understand shared infrastructure:** Intellios is a shared platform; isolation is logical, not physical.
5. **Define escalation procedures:** If you suspect a breach, contact Intellios immediately.

---

## Related Controls

Tenant isolation is one control in a larger security architecture:

- **Data Handling & Encryption:** Complementary control; encryption protects data at rest and in transit
- **Secret Management:** Ensures that credentials (which could bypass isolation if compromised) are protected
- **Governance Validator:** Policies are also scoped per enterprise; validation respects tenant boundaries
- **Audit Trail:** Logging is scoped per enterprise; isolation breaches would be visible in audit logs

---

## Further Reading

- [Data Handling & Encryption](data-handling-encryption.md) — Encryption mechanisms that complement isolation
- [Secret Management](secret-management.md) — Protecting credentials that could be used to bypass isolation
- [SOC 2 Compliance](soc2-compliance.md) — How isolation controls satisfy SOC 2 audit requirements
- [Architecture Overview](../04-architecture-integration/_index.md) — System design and infrastructure
- **ADR-012** (in `/docs/decisions/`) — Technical specification of middleware-level isolation

---

*See also: ADR-012 (Middleware-Level Tenant Isolation), JWT (JSON Web Token), enterprise_id (in Glossary), Drizzle ORM*

*Next: [Secret Management](secret-management.md) → [SOC 2 Compliance](soc2-compliance.md)*
