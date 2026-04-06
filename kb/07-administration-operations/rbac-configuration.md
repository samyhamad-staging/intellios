---
id: "07-001"
title: "How to Set Up Roles and Permissions (RBAC)"
slug: "rbac-configuration"
type: "task"
audiences:
  - "engineering"
  - "compliance"
status: "draft"
version: "1.0.0"
platform_version: "1.2.0"
created: "2026-04-05"
updated: "2026-04-05"
author: "Intellios Platform Engineering"
reviewers: []
tags:
  - "rbac"
  - "access-control"
  - "security"
  - "multi-tenant"
  - "authentication"
  - "authorization"
prerequisites:
  - "04-001"
  - "08-005"
related:
  - "08-005"
  - "07-002"
  - "04-012"
next_steps:
  - "07-002"
  - "08-006"
feedback_url: "https://feedback.intellios.ai/kb"
tldr: >
  Intellios RBAC is in post-MVP planning. This document describes the intended architecture
  and implementation roadmap. Current MVP uses basic role field in users table (architect,
  reviewer, compliance_officer, admin, viewer). Full RBAC will introduce five role types
  with granular permissions, per-enterprise role assignment, and SSO/SAML integration.
  Audit trail logs all RBAC changes for compliance.
---

# How to Set Up Roles and Permissions (RBAC)

> **TL;DR:** Intellios Role-Based Access Control (RBAC) is designed for post-MVP release. This document describes the intended RBAC architecture, planned role hierarchy, granular permissions matrix, configuration steps, Single Sign-On (SSO) / Security Assertion Markup Language (SAML) integration points, and audit trail requirements. Current MVP uses a basic `role` field in the users table; full RBAC will introduce per-enterprise role management, dynamic permissions, and integration with enterprise identity systems.

---

## Status: Architecture & Roadmap

**Current State (MVP):**
- Basic role field in `users` table: `architect`, `reviewer`, `compliance_officer`, `admin`, `viewer`
- Role-based UI routing and API guards (basic authorization)
- No per-enterprise role customization
- No SSO/SAML integration

**Planned (Post-MVP):**
- Five-tier role architecture: Admin, Designer, Reviewer, Auditor, Policy Author
- Granular permission model: 20+ distinct actions (create agent, approve, deploy, manage policies, etc.)
- Per-enterprise role assignment and customization
- SSO/SAML integration with enterprise identity providers
- Comprehensive audit trail of all RBAC changes
- Role inheritance and delegation
- Time-limited role elevation (just-in-time access)

This document describes the **planned architecture** in full detail. Implementation will follow ADR-TBD (pending).

---

## Planned Role Hierarchy

### Five Core Roles

#### 1. Admin (Super User)

**Scope:** Platform-wide or enterprise-wide

**Intended Permissions:**
- Manage all users and role assignments in the enterprise
- Create, edit, delete governance policies
- View all blueprints, intake sessions, and audit trails
- Configure webhooks and integrations
- Access admin settings (enterprise settings, billing, API keys)
- Enable/disable features
- Export audit logs and compliance reports
- Approve all blueprints (bypass approval workflow if needed)
- Delete blueprints and policies (with audit logging)
- Rotate webhook secrets
- View system health dashboards

**Primary Use Case:** IT operations, security leaders, compliance officers who need total control.

---

#### 2. Designer (Agent Builder)

**Scope:** Agent design and creation

**Intended Permissions:**
- Create new intake sessions
- Answer intake questions and contribute requirements
- Generate initial blueprints via the Intake Engine
- Refine and iterate on blueprints (edit instructions, add/remove tools, adjust guardrails)
- Submit blueprints for review
- View validation reports and remediation suggestions
- Re-submit blueprints after rejection
- Create and manage test cases for their agents
- Run test suites on draft/rejected blueprints
- View their own audit trail entries
- Collaborate with reviewers (view comments, receive notifications)
- **Cannot:** Approve blueprints, delete policies, access admin settings, manage users

**Primary Use Case:** Data scientists, software engineers building agents for the enterprise.

---

#### 3. Reviewer (Approval Authority)

**Scope:** Governance enforcement and blueprint approval

**Intended Permissions:**
- View all blueprints and their governance status
- Review blueprints submitted for approval
- View validation reports in detail
- Approve or reject blueprints
- Request changes (partial rejection)
- View approval workflow progress (all steps)
- View full policy set and policy versions
- Understand policy impact on each blueprint
- Export compliance reports
- View audit trail for all blueprints
- Request policy clarifications from Policy Authors
- Delegate approval to another reviewer (temporary)
- **Cannot:** Create blueprints, modify policies, manage users, access admin settings, deploy

**Primary Use Case:** Compliance officers, risk managers, security architects who validate governance alignment.

---

#### 4. Auditor (Read-Only Observer)

**Scope:** Compliance and forensics

**Intended Permissions:**
- View all blueprints (all versions, all statuses)
- View all intake sessions and their message history
- View all governance policies and their versions
- View full audit trail (no filtering)
- Export audit logs in bulk (CSV, JSON, Parquet)
- Generate compliance reports
- Query deployment health and telemetry
- View system health snapshots and intelligence briefings
- Search blueprints and audit events
- **Cannot:** Modify anything, approve, reject, deploy, manage users, access admin settings

**Primary Use Case:** Internal audit, external auditors, compliance teams performing post-hoc reviews.

---

#### 5. Policy Author (Governance Designer)

**Scope:** Governance policy creation and maintenance

**Intended Permissions:**
- Create new governance policies
- Edit and publish new versions of policies
- Define policy rules and expressions
- Test policies against existing blueprints
- View which blueprints are affected by policies
- Enable/disable policies (toggle without deletion)
- Request feedback from reviewers on policy clarity
- View policy version history
- Document policy intent and change rationale
- **Cannot:** Approve blueprints, deploy, manage users, delete policies without admin override, access admin settings, modify other enterprises' policies

**Primary Use Case:** Compliance architects, legal teams defining enterprise governance constraints.

---

## Permissions Matrix

### Legend
- ✅ = Full permission
- ⚠️ = Own only (can only act on resources they created or own)
- ❌ = No permission
- 🔒 = Restricted (only in certain conditions)

| Action | Admin | Designer | Reviewer | Auditor | Policy Author |
|--------|-------|----------|----------|---------|---|
| **Agent Blueprint Operations** |
| Create intake session | ✅ | ✅ | ❌ | ❌ | ❌ |
| Answer intake questions | ✅ | ✅ | ❌ | ❌ | ❌ |
| Generate initial blueprint | ✅ | ✅ | ❌ | ❌ | ❌ |
| Refine blueprint | ✅ | ⚠️ | ❌ | ❌ | ❌ |
| Submit for review | ✅ | ⚠️ | ❌ | ❌ | ❌ |
| View blueprint (draft) | ✅ | ⚠️ | ✅ (submitted) | ✅ | ❌ |
| View blueprint (approved) | ✅ | ✅ | ✅ | ✅ | ❌ |
| Approve blueprint | ✅ | ❌ | ✅ | ❌ | ❌ |
| Reject blueprint | ✅ | ❌ | ✅ | ❌ | ❌ |
| Request changes | ✅ | ❌ | ✅ | ❌ | ❌ |
| Deploy blueprint | ✅ | 🔒 | ❌ | ❌ | ❌ |
| Deprecate blueprint | ✅ | ⚠️ | ❌ | ❌ | ❌ |
| Delete blueprint | ✅ | ⚠️ | ❌ | ❌ | ❌ |
| Create test case | ✅ | ⚠️ | ❌ | ❌ | ❌ |
| Run test suite | ✅ | ⚠️ | 🔒 | ❌ | ❌ |
| **Policy Management** |
| Create policy | ✅ | ❌ | ❌ | ❌ | ✅ |
| View policy | ✅ | ⚠️ | ✅ | ✅ | ✅ |
| Edit policy | ✅ | ❌ | ❌ | ❌ | ✅ |
| Publish policy version | ✅ | ❌ | ❌ | ❌ | ✅ |
| Enable/disable policy | ✅ | ❌ | ❌ | ❌ | ✅ |
| Delete policy | ✅ | ❌ | ❌ | ❌ | ❌ |
| Test policy against blueprints | ✅ | ❌ | 🔒 | ❌ | ✅ |
| View policy impact | ✅ | ⚠️ | ✅ | ✅ | ✅ |
| **Governance & Validation** |
| View validation report | ✅ | ⚠️ | ✅ | ✅ | ✅ |
| View governance violations | ✅ | ⚠️ | ✅ | ✅ | ✅ |
| View approval workflow | ✅ | ⚠️ | ✅ | ✅ | ❌ |
| **User & Role Management** |
| Create user | ✅ | ❌ | ❌ | ❌ | ❌ |
| Assign role | ✅ | ❌ | ❌ | ❌ | ❌ |
| Update user role | ✅ | ❌ | ❌ | ❌ | ❌ |
| Delete user | ✅ | ❌ | ❌ | ❌ | ❌ |
| View user list | ✅ | 🔒 | 🔒 | ❌ | ❌ |
| **Integration & Webhooks** |
| Create webhook | ✅ | ❌ | ❌ | ❌ | ❌ |
| View webhooks | ✅ | ❌ | ❌ | ❌ | ❌ |
| Test webhook | ✅ | ❌ | ❌ | ❌ | ❌ |
| Rotate webhook secret | ✅ | ❌ | ❌ | ❌ | ❌ |
| View webhook deliveries | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Audit & Compliance** |
| View audit trail (own) | ✅ | ✅ | ✅ | ✅ | ✅ |
| View audit trail (all) | ✅ | ❌ | 🔒 | ✅ | ❌ |
| Export audit logs | ✅ | ❌ | 🔒 | ✅ | ❌ |
| Generate compliance reports | ✅ | ❌ | ✅ | ✅ | ❌ |
| View system health | ✅ | ❌ | ❌ | ✅ | ❌ |
| **Admin Settings** |
| Access admin panel | ✅ | ❌ | ❌ | ❌ | ❌ |
| Modify enterprise settings | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage API keys | ✅ | ❌ | ❌ | ❌ | ❌ |
| View billing/usage | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## Configuration: Planned Implementation Steps

### Phase 1: Data Model Enhancement

Add RBAC schema to support granular permissions:

```typescript
// Planned: src/lib/db/schema.ts (post-MVP)

export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  enterpriseId: text("enterprise_id").notNull(),
  name: text("name").notNull(), // "admin", "designer", "reviewer", "auditor", "policy_author"
  displayName: text("display_name"),
  description: text("description"),
  isCustom: boolean("is_custom").notNull().default(false), // true = enterprise-defined, false = built-in
  permissions: jsonb("permissions").notNull().default([]), // permission IDs
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const permissions = pgTable("permissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(), // "blueprint:create", "policy:approve", etc.
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(), // "agent_management", "governance", "admin", "audit"
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const roleAssignments = pgTable("role_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  enterpriseId: text("enterprise_id").notNull(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  roleId: uuid("role_id").notNull().references(() => roles.id),
  grantedBy: text("granted_by").notNull(), // admin email
  grantedAt: timestamp("granted_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"), // for just-in-time elevation
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_role_assignments_user").on(table.userId),
  index("idx_role_assignments_enterprise").on(table.enterpriseId),
]);

export const rbacAuditLog = pgTable("rbac_audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  enterpriseId: text("enterprise_id"),
  action: text("action").notNull(), // "role_assigned", "role_revoked", "permission_added", "permission_removed"
  actorEmail: text("actor_email").notNull(),
  targetUserEmail: text("target_user_email"),
  targetRole: text("target_role"),
  permission: text("permission"),
  reason: text("reason"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_rbac_audit_enterprise").on(table.enterpriseId, table.createdAt),
  index("idx_rbac_audit_user").on(table.targetUserEmail),
]);
```

---

### Phase 2: API Authorization Layer

Implement middleware to enforce permissions on all routes:

```typescript
// Planned: src/lib/rbac/check-permission.ts (post-MVP)

import { db } from "@/lib/db";
import { roleAssignments, roles, permissions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function checkPermission(
  userId: string,
  enterpriseId: string,
  permissionCode: string
): Promise<boolean> {
  try {
    const assignment = await db
      .select({
        permissions: roles.permissions,
      })
      .from(roleAssignments)
      .leftJoin(roles, eq(roleAssignments.roleId, roles.id))
      .where(
        and(
          eq(roleAssignments.userId, userId),
          eq(roleAssignments.enterpriseId, enterpriseId)
        )
      )
      .limit(1);

    if (!assignment.length) {
      return false;
    }

    // Check if user's role has the required permission
    const userPermissions = assignment[0].permissions || [];
    return userPermissions.includes(permissionCode);
  } catch (error) {
    console.error("Permission check failed:", error);
    return false;
  }
}

export function requirePermission(permissionCode: string) {
  return async (req: Request) => {
    const userId = req.headers.get("X-User-ID");
    const enterpriseId = req.headers.get("X-Enterprise-ID");

    if (!userId || !enterpriseId) {
      throw new Error("Missing user or enterprise context");
    }

    const hasPermission = await checkPermission(
      userId,
      enterpriseId,
      permissionCode
    );

    if (!hasPermission) {
      throw new Error(`Missing required permission: ${permissionCode}`);
    }

    return true;
  };
}
```

---

### Phase 3: Admin UI for Role Management

Build an admin dashboard to manage roles per enterprise:

**Route:** `/admin/roles`

**Features:**
1. **Role Directory**
   - List all five roles with descriptions
   - Show built-in vs. custom roles
   - Show number of users per role

2. **User Assignment Panel**
   - Search users by email
   - Bulk assign roles
   - View current role and assignment date
   - Revoke roles (with confirmation)
   - Set role expiration (for just-in-time access)

3. **Permission Editor** (Admin only)
   - Define custom roles with subset of permissions
   - View permission descriptions
   - Clone built-in roles to customize
   - Apply custom role to users

4. **RBAC Audit Log**
   - Show all role assignments and revocations in the enterprise
   - Filter by user, role, date
   - Export audit trail

---

## SSO/SAML Integration (Planned)

### Architecture

Intellios will support enterprise SSO/SAML 2.0 to:
- Authenticate users via enterprise identity provider (Okta, Azure AD, Google Workspace, etc.)
- Automatically provision users and assign roles based on group membership
- Enable single sign-on across Intellios and other enterprise tools

### Configuration Steps (Planned)

1. **Admin** navigates to **Admin Settings** → **SSO/SAML**
2. **Upload SAML metadata** from identity provider or enter endpoint URL
3. **Configure attribute mappings:**
   - Email → SAML `email` claim
   - Display Name → SAML `name` claim
   - Role → SAML `groups` claim (maps group to Intellios role)
4. **Test SAML assertion** with sample payload
5. **Enable SSO** toggle to activate

### Example: Okta Integration

```json
{
  "provider": "okta",
  "entityId": "https://intellios.okta.com/app/exk123/sso/saml/metadata",
  "ssoUrl": "https://intellios.okta.com/app/exk123/sso/saml",
  "certificatePath": "/path/to/okta-cert.pem",
  "attributeMappings": {
    "email": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
    "name": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname",
    "groups": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/groupsid"
  },
  "groupRoleMappings": {
    "okta_admins": "admin",
    "okta_designers": "designer",
    "okta_reviewers": "reviewer",
    "okta_auditors": "auditor",
    "okta_policy_authors": "policy_author"
  }
}
```

---

## Audit Trail for RBAC Changes

All role assignments, revocations, and permission changes are logged in the `rbac_audit_log` table:

```json
{
  "id": "uuid",
  "enterpriseId": "acme-corp",
  "action": "role_assigned",
  "actorEmail": "admin@acme.com",
  "targetUserEmail": "designer@acme.com",
  "targetRole": "designer",
  "reason": "Onboarding new ML engineer",
  "metadata": {
    "grantedBy": "admin@acme.com",
    "expiresAt": "2026-05-05T00:00:00Z"
  },
  "createdAt": "2026-04-05T10:00:00Z"
}
```

**Audit Trail Queries:**

```sql
-- All role changes for a user
SELECT * FROM rbac_audit_log
WHERE target_user_email = 'user@acme.com'
ORDER BY created_at DESC;

-- All role assignments by an admin
SELECT * FROM rbac_audit_log
WHERE actor_email = 'admin@acme.com'
  AND action IN ('role_assigned', 'role_revoked')
ORDER BY created_at DESC;

-- Users with elevated roles expiring soon
SELECT target_user_email, target_role, expires_at
FROM rbac_audit_log
WHERE action = 'role_assigned'
  AND expires_at < now() + interval '7 days'
  AND expires_at > now()
ORDER BY expires_at ASC;
```

---

## Best Practices

1. **Principle of Least Privilege:** Assign the minimum role required for the user's job function. For example, designers should not be admins.

2. **Regular Role Audits:** Quarterly review role assignments and revoke roles no longer needed.

3. **Use Just-In-Time (JIT) Elevation for Admin Actions:** Grant temporary admin access for short-lived tasks; set `expiresAt` when assigning elevated roles.

4. **Segregation of Duties:** Avoid assigning both "Approver" and "Deployer" roles to the same person. Separate governance from execution.

5. **Audit Trail Retention:** Retain RBAC audit logs for at least 7 years for compliance.

6. **Role-Based Notifications:** Send notifications when roles are assigned or revoked so users are aware of access changes.

7. **SSO Enforcement:** Enable SSO/SAML for all users once configured. Disable local password authentication to centralize identity management.

---

## Planned Permission Categories

| Category | Permissions |
|----------|---|
| **Agent Management** | `blueprint:create`, `blueprint:refine`, `blueprint:submit`, `blueprint:view_own`, `blueprint:view_all`, `blueprint:deploy`, `blueprint:deprecate`, `blueprint:delete` |
| **Governance** | `policy:create`, `policy:edit`, `policy:publish`, `policy:enable`, `policy:disable`, `policy:delete`, `blueprint:approve`, `blueprint:reject`, `blueprint:request_changes` |
| **Test & Validation** | `test_case:create`, `test_case:run`, `test_case:delete`, `validation:run` |
| **Audit & Compliance** | `audit_log:view_own`, `audit_log:view_all`, `audit_log:export`, `report:generate_compliance` |
| **Admin** | `user:create`, `user:update`, `user:delete`, `role:assign`, `role:revoke`, `settings:modify`, `webhook:manage`, `integration:configure` |

---

## Migration Path from MVP to Full RBAC

**Stage 1 (MVP → v1.1.0):**
- Deploy role and permission tables
- Implement permission check middleware
- Migrate existing role field to new role assignment system

**Stage 2 (v1.1.0 → v1.2.0):**
- Build admin UI for role assignment
- Add RBAC audit logging
- Enable custom role definition

**Stage 3 (v1.2.0 → v1.3.0):**
- Integrate SSO/SAML
- Add just-in-time (JIT) elevation
- Implement role delegation

---

## Current MVP Status

The MVP currently uses a basic role field in the `users` table with hardcoded role checks in API routes:

```typescript
// src/lib/auth/check-role.ts (MVP)
export function requireRole(allowedRoles: string[]) {
  return (req: Request) => {
    const userRole = req.headers.get("X-User-Role");
    if (!allowedRoles.includes(userRole)) {
      throw new Error("Insufficient permissions");
    }
  };
}

// Usage in API routes
export async function POST(req: Request) {
  requireRole(["admin", "reviewer"])(req);
  // ... handle request
}
```

This will be replaced by the granular permission system described above once the post-MVP RBAC feature ships.

---

## Summary

Intellios' planned RBAC system introduces:
- **Five core roles:** Admin, Designer, Reviewer, Auditor, Policy Author
- **Granular permissions:** 20+ distinct actions, enforceable via middleware
- **Per-enterprise configuration:** Custom roles, group mappings, expiration
- **SSO/SAML integration:** Centralized identity management via enterprise providers
- **Complete audit trail:** All role changes logged and queryable for compliance

The MVP uses basic roles; full RBAC ships post-MVP as a foundational security feature.
