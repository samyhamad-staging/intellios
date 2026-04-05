---
id: 07-006
title: Multi-Tenancy
slug: multi-tenancy
type: concept
audiences:
- engineering
status: published
created: &id001 2026-04-05
updated: *id001
tags:
- multi-tenancy
- isolation
- enterprise_id
- policy
- logical isolation
- RBAC
tldr: How Intellios implements logical isolation for multiple enterprises, brands,
  or teams
---

# Multi-Tenancy

Intellios supports multi-tenancy, enabling a single deployment to serve multiple logically isolated organizations, brands, or business units. This guide explains the architecture and isolation model.

---

## What is Multi-Tenancy?

Multi-tenancy allows a single Intellios instance to serve multiple independent "tenants" where each tenant:

- **Owns its agents:** Cannot see other tenants' agents
- **Has its own policies:** Can customize governance rules
- **Controls access:** Independent user base and role assignments
- **Maintains isolation:** Data logically segregated by `enterprise_id`

**Example use cases:**

1. **Multi-brand financial institution:** Each brand has own governance policies, registry, agent portfolio
2. **Global organization:** US operations, EU operations, APAC operations each as separate tenant
3. **Holding company:** Parent company + acquired subsidiaries each as separate tenant with separate policies
4. **Managed services:** Intellios hosting multiple clients (SaaS model)

---

## Architecture

### Isolation Mechanism

All data in Intellios is tagged with `enterprise_id`:

**Database schema:**
```sql
-- Agents table
CREATE TABLE agents (
  id UUID PRIMARY KEY,
  enterprise_id UUID NOT NULL,  -- Tenant identifier
  name VARCHAR(255),
  blueprint JSONB,
  created_at TIMESTAMP,
  FOREIGN KEY (enterprise_id) REFERENCES enterprises(id),
  INDEX (enterprise_id)  -- Query optimization
);

-- Governance policies table
CREATE TABLE governance_policies (
  id UUID PRIMARY KEY,
  enterprise_id UUID NOT NULL,  -- Tenant-specific policy
  version VARCHAR(10),
  operators JSONB,
  FOREIGN KEY (enterprise_id) REFERENCES enterprises(id),
  INDEX (enterprise_id)
);

-- Audit logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  enterprise_id UUID NOT NULL,  -- Event scoped to tenant
  action VARCHAR(50),
  resource_id UUID,
  timestamp TIMESTAMP,
  FOREIGN KEY (enterprise_id) REFERENCES enterprises(id),
  INDEX (enterprise_id)
);

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY,
  enterprise_id UUID NOT NULL,  -- User belongs to tenant
  email VARCHAR(255),
  roles JSONB,
  FOREIGN KEY (enterprise_id) REFERENCES enterprises(id),
  INDEX (enterprise_id, email)
);
```

### Middleware Enforcement

All API routes include `enterprise_id` scoping via middleware:

```typescript
// Example: API route to list agents
async function listAgents(req, res) {
  const enterpriseId = req.user.enterprise_id;  // From JWT token

  const agents = await db.query(
    'SELECT * FROM agents WHERE enterprise_id = $1',
    [enterpriseId]
  );

  return res.json(agents);
}
```

**Principle:** Every database query includes `WHERE enterprise_id = $1` filter. This is enforced in middleware before any handler executes.

---

## Governance Policies

### Global vs. Tenant-Specific Policies

**Global baseline policies** (set by Intellios for all tenants):
- Security baseline (no unvalidated external API calls)
- Audit logging requirements (immutable logs)
- Data residency constraints (e.g., EU data stays in EU)

**Tenant-specific policies** (customized per enterprise):
- Risk classification scheme (2-tier, 3-tier, 5-tier)
- Approval gates (who must sign off on high-risk agents)
- Tool whitelisting (which integrations are allowed)
- Token budgets (how much context can agent use)

**Example configuration:**

```yaml
# Global policies (Intellios-maintained)
global_policies:
  - audit_logging_required: true
  - data_encryption_at_rest: true
  - maximum_retention_period: 7_years

# Tenant-specific policies (Bank A customizes)
enterprise_policies:
  enterprise_id: "bank-a-uuid"
  risk_classification:
    low: "Customer support agents, non-decisioning"
    medium: "Recommendation agents, with human review"
    high: "Credit decisioning, fund transfers"
  approval_gates:
    high_risk: ["compliance", "risk"]
    medium_risk: ["compliance"]
  tool_whitelist:
    - credit_bureau_lookup
    - customer_database_read
    - transaction_history_read
  token_budget:
    default: 2000
    high_risk: 1500  # More constrained for sensitive decisions
```

---

## Data Scoping

### Query Scoping

All queries automatically filtered by `enterprise_id`:

**Without multi-tenancy (vulnerable):**
```typescript
// UNSAFE: Returns all agents in system
const agents = await db.query('SELECT * FROM agents');
```

**With multi-tenancy (safe):**
```typescript
// SAFE: Returns only agent tenant's agents
const enterpriseId = req.user.enterprise_id;
const agents = await db.query(
  'SELECT * FROM agents WHERE enterprise_id = $1',
  [enterpriseId]
);
```

**Enforcement:** Middleware validates `enterprise_id` on every request before handler executes.

### Cross-Tenant Access (Exceptional)

In rare cases, cross-tenant access may be needed:

**Use case:** Intellios admin needs to audit all tenants' agents (compliance, security)

**Implementation:**
```typescript
// Admin endpoint (requires special role)
async function adminAuditAllTenants(req, res) {
  if (req.user.role !== 'INTELLIOS_ADMIN') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Admin can query across all enterprises
  const allAgents = await db.query('SELECT * FROM agents');
  return res.json(allAgents);
}
```

**Audit trail:** Admin access is logged with timestamp, admin user, and action.

---

## User & Role Management

### User Ownership

Each user belongs to exactly one tenant:

```typescript
interface User {
  id: string;
  email: string;
  enterprise_id: string;  // User bound to single tenant
  roles: Role[];  // Role array within that tenant
}
```

**Implication:** User cannot switch between tenants without separate login.

### Role-Based Access Control (RBAC)

Roles are tenant-scoped:

| Role | Permissions | Scope |
|------|---|---|
| **Admin** | Full control (users, policies, governance) | Single tenant |
| **Reviewer** | Approve/reject agents in review queue | Single tenant |
| **Agent Owner** | Create/modify own agents; deploy | Single tenant |
| **Viewer** | Read-only access to registry, dashboards | Single tenant |

**Example:** Bank A's Admin cannot access Bank B's data even with same JWT (middleware enforces tenant boundary).

---

## Deployment Topology

### Single-Tenant Deployment (Traditional)

One Intellios instance per customer:

```
┌─ AWS Account A (Bank A) ──┐
│  Intellios Instance       │
│  PostgreSQL (Bank A data) │
└───────────────────────────┘

┌─ AWS Account B (Bank B) ──┐
│  Intellios Instance       │
│  PostgreSQL (Bank B data) │
└───────────────────────────┘
```

**Pros:** Maximum isolation, data residency compliance

**Cons:** Operational overhead, multiple databases to manage

### Multi-Tenant Deployment (Shared Infrastructure)

One Intellios instance serves multiple customers:

```
┌─ Shared AWS Account ───────────────────┐
│                                         │
│  ┌─ Intellios Instance ────────────┐  │
│  │ (Shared container/Lambda)       │  │
│  └─────────────────────────────────┘  │
│                                         │
│  ┌─ PostgreSQL ──────────────────┐   │
│  │ enterprise_id scoping         │   │
│  │ ├─ Bank A agents (scoped)     │   │
│  │ ├─ Bank B agents (scoped)     │   │
│  │ └─ Insurance Co agents        │   │
│  └───────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

**Pros:** Operational efficiency, shared compute/storage

**Cons:** Shared blast radius (one bug affects all tenants), data residency complexity

### Hybrid Approach

Data in shared infrastructure, with logical isolation per tenant:

```
Shared PostgreSQL with enterprise_id scoping
↓
Bank A queries: WHERE enterprise_id = 'bank-a-uuid'
Bank B queries: WHERE enterprise_id = 'bank-b-uuid'
```

**Recommended for:** Fortune 500 organizations (good balance of operational efficiency + data isolation)

---

## Operational Considerations

### Database Backups

Backups include all tenant data. Restore options:

1. **Full database restore:** All tenants restored together (point-in-time recovery)
2. **Selective tenant restore:** Restore only Bank A's data if Bank A had corruption
   - Use PostgreSQL point-in-time recovery (PITR) with restore to temporary DB
   - Extract Bank A data, re-integrate into production DB

**Recommendation:** RDS automated backups with 35-day retention (supports selective restore).

### Monitoring & Observability

Metrics are tagged by `enterprise_id`:

```
agent_generation_latency{enterprise_id="bank-a-uuid"}: 32.5s
agent_generation_latency{enterprise_id="bank-b-uuid"}: 28.3s
agent_validation_failures{enterprise_id="insurance-co"}: 2
```

**Benefit:** Execs can see how Intellios performs for their tenant specifically.

### Cost Attribution

Track usage per tenant:

```
Bank A: 45 agents generated, 823 validations, 12 TB storage
Bank B: 23 agents generated, 456 validations, 8 TB storage
```

**Useful for:** SaaS billing, chargeback models, capacity planning.

---

## Planned Enhancements

### v1.3.0 (Q2 2026)

- **Per-tenant webhooks:** Tenants can configure their own webhook endpoints (currently global)
- **Per-tenant IP whitelisting:** Each tenant can restrict API access to their IP range
- **Tenant audit dashboard:** Tenants see only their own audit logs (improved privacy)

### v2.0.0 (Q4 2026)

- **Advanced policy composition:** Compound conditionals (if-then logic) within governance policies
- **Cross-tenant policy inheritance:** Child tenants inherit parent tenant policies with overrides
- **Tenant capacity limits:** Enforce quotas per tenant (max agents, max validations/month)

---

## Security Considerations

### Middleware Enforcement (ADR-012)

See `docs/decisions/ADR-012-multi-tenancy-middleware.md` for architectural decision on how multi-tenancy isolation is enforced.

**Key principle:** Every data access must pass through middleware that validates `enterprise_id` matches user's assigned enterprise.

### Testing & Validation

Multi-tenancy isolation is tested via:

1. **Unit tests:** Ensure queries include `enterprise_id` filter
2. **Integration tests:** Attempt cross-tenant access; verify rejection
3. **Security audit:** Third-party pen testing (FedRAMP readiness)

**Quarterly validation:** Automated test suite runs `test-tenancy-isolation.sh` to verify no data leakage.

---

## Troubleshooting

### Common Issue: User Cannot See Their Agents

**Symptom:** User logged in, but agent registry is empty.

**Root cause:** User's `enterprise_id` in JWT doesn't match agents' `enterprise_id` in database.

**Troubleshooting:**
```bash
# Check user's enterprise assignment
SELECT enterprise_id FROM users WHERE email = 'alice@bank.com';
# Result: enterprise_id = "bank-a-uuid"

# Check agent's enterprise_id
SELECT enterprise_id FROM agents WHERE name = 'credit-agent';
# Result: enterprise_id = "bank-b-uuid" (mismatch!)

# Fix: Update user or agent's enterprise_id to match
UPDATE users SET enterprise_id = 'bank-b-uuid' WHERE email = 'alice@bank.com';
```

### Cross-Tenant Data Leak (Rare)

**Symptom:** User sees another tenant's agents.

**Response:**
1. Immediately revoke user's API token
2. Audit which data was accessed (check request logs)
3. Notify affected tenants
4. Escalate to security team (potential breach)

---

## Additional Resources

- **Deployment guide:** [Link to deployment docs]
- **ADR on multi-tenancy middleware:** [Link to ADR-012]
- **Data scoping patterns:** [Link to architecture docs]
