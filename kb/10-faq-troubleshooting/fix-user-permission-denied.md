---
id: "10-014"
title: "User Cannot Access Features or Sees Permission Denied Errors"
slug: "user-permission-denied"
type: "troubleshooting"
audiences: ["engineering", "compliance"]
status: "published"
version: "1.0.0"
platform_version: "1.2.0"
created: "2026-04-05"
updated: "2026-04-05"
tags: ["rbac", "permissions", "access-control", "users", "roles"]
tldr: "User encounters 'Permission Denied' or cannot access features. Check: RBAC role assignment (e.g., user has read-only role, needs write role), enterprise_id mismatch, SSO group mapping incorrect. Verify role and resource ownership."
feedback_url: "https://feedback.intellios.ai/kb"
---

## TL;DR

User cannot access features or receives "Permission Denied" error. Causes: incorrect RBAC role assigned (e.g., "agent-reader" instead of "agent-creator"), enterprise_id mismatch in SSO, or SSO group mapping not configured. Verify user role, enterprise affiliation, and SSO/SAML group claims.

---

## Symptom

- User sees "Permission Denied" or "Access Restricted" message in UI
- User cannot click buttons (e.g., "Create Blueprint" grayed out) or see certain screens
- API calls return HTTP status code **403 Forbidden** with message "Insufficient permissions"
- User cannot see blueprints created by other team members (visibility issue)
- Feature access depends on role (e.g., only "compliance-admin" can edit governance policies)

---

## Possible Causes (by likelihood)

1. **Wrong RBAC role assigned** — User assigned "agent-reader" but needs "agent-creator" or higher
2. **Enterprise_id mismatch** — User belongs to different enterprise than resource owner
3. **SSO group mapping incorrect** — SAML/OAuth groups not mapped to Intellios roles correctly
4. **Resource ownership** — User can only edit resources they created (if policy configured that way)
5. **Multi-tenancy isolation** — User account limited to specific tenant/workspace

---

## Diagnosis Steps

### Step 1: Check user's current RBAC role
Log into platform as admin → Administration → Users. Find the user. Note the assigned role:

| Role | Permissions |
|------|-------------|
| `agent-reader` | View blueprints, run read-only operations |
| `agent-creator` | Create, edit, refine blueprints; review intake |
| `compliance-auditor` | View compliance reports, policies (read-only) |
| `compliance-admin` | Create/edit governance policies, approve blueprints |
| `admin` | Full platform access; manage users, security settings |

The user's current role is likely insufficient for their intended action.

### Step 2: Check user's enterprise assignment
Admin → Users → [User] → Details. Note the "Enterprise" field:
```
Enterprise: Acme Corp
```

Verify this matches the enterprise where the resource exists. If user's enterprise is "Acme Corp" but they're trying to access a blueprint in "Beta Corp", access will be denied.

### Step 3: Verify SSO/SAML group mapping
If using SSO, check group mappings:
Admin → Security → SSO Configuration. Look for "Group Mappings":

```
SAML Group | Intellios Role
---------------------------
engineering | agent-creator
compliance | compliance-admin
managers | agent-reader
```

Verify:
- User's SSO group (from SAML assertion) is in the list
- Group maps to the intended Intellios role
- User is in the correct group in SSO provider (check in Okta, Azure AD, etc.)

### Step 4: Test API access with user's credentials
```bash
# Get user's token (via OAuth or API key)
TOKEN="user_token_here"

# Test API call
curl -H "Authorization: Bearer $TOKEN" \
  https://api.intellios.ai/v1/blueprints/{blueprint_id}

# If 403, response includes required permission:
# {
#   "error": "insufficient_permissions",
#   "required_permission": "blueprints:write",
#   "user_permissions": ["blueprints:read"]
# }
```

### Step 5: Check resource visibility/ownership
Log into platform as admin. Find the resource (e.g., blueprint). Check:
- **Owner:** Who created this resource? User might not have permission to edit others' resources
- **Visibility:** Is resource marked "Private" (only owner) or "Team" (team members)?
- **Shared with:** Are there explicit sharing rules limiting access?

---

## Resolution

### If wrong RBAC role assigned:
1. Log in as admin
2. Admin → Users → [User Name] → Edit
3. Change "Role" dropdown to appropriate role:
   - For blueprint creation: `agent-creator`
   - For policy management: `compliance-admin`
   - For full access: `admin`
4. Click "Save"
5. Notify user to refresh their session or log out/log back in
6. **Verify:** User can now access the feature; try the action again

### If enterprise_id mismatch:
1. Verify user belongs to correct enterprise:
   - Admin → Users → [User] → Enterprise should match where resource is
2. If user needs access to multiple enterprises:
   - Create a separate account for each enterprise, or
   - Request multi-enterprise support from Intellios (contact support)
3. Currently, a user can only belong to one enterprise
4. **Verify:** User's enterprise matches resource's enterprise

### If SSO group mapping incorrect:
1. Check user's group in SSO provider (Okta, Azure AD, etc.)
   - Okta: Directory → People → [User] → Groups
   - Azure: Users → [User] → Groups
   - Note the group name (e.g., "engineering-team")

2. Verify group is mapped in Intellios:
   - Admin → Security → SSO → Group Mappings
   - Look for the group name
   - If missing, add mapping:
     - Group: `engineering-team`
     - Role: `agent-creator`

3. If group exists but mapping is wrong, edit the mapping and update the role

4. User's next SSO login will apply the new role

5. **Verify:** User has correct role after next login; can access features

### If resource ownership restriction:
1. Check if blueprint/policy has ownership restriction:
   - Blueprint Details → Sharing → "Only owner can edit" (if toggled)
2. If user needs to edit others' resources:
   - Either: Original owner must make it "Team editable"
   - Or: User must have `admin` role (unrestricted access)
3. If resource is locked to original owner, ask owner to grant edit permissions:
   - Owner opens resource → Sharing → Add [User] as "Editor"
4. **Verify:** User can now edit the shared resource

### If multi-tenancy isolation:
1. Check if user is restricted to specific workspace/tenant:
   - Admin → Users → [User] → Details → Workspace: [Name]
2. If workspace is set and limiting access, update it:
   - Change workspace to "All" (if policy allows), or
   - Change to the correct workspace where resource exists
3. **Verify:** User can now access resources in correct workspace

---

## Prevention

- **Onboarding checklist:** When adding new users, verify RBAC role matches job function
- **SSO group audit:** Quarterly audit of group mappings; ensure groups match actual org structure
- **Permission testing:** After RBAC changes, test with a test account before deploying to users
- **Documentation:** Maintain role-to-responsibility matrix; ensure managers know which role to assign
- **Alerts:** Log permission denials by user/resource; alert on unusual patterns (e.g., repeated 403s)

---

## Escalation

For complex permission scenarios, cross-enterprise access requests, or SAML/OAuth integration issues, see [escalation-paths.md](../escalation-paths.md).

---

## Related Articles

- [RBAC and Role Management](../07-administration-operations/rbac-roles.md)
- [User Management Guide](../07-administration-operations/user-management.md)
- [SSO and SAML Setup](../07-administration-operations/sso-saml-setup.md)
- [Enterprise Multi-Tenancy](../04-architecture-integration/multi-tenancy.md)
- [Resource Sharing Policies](../07-administration-operations/resource-sharing.md)
