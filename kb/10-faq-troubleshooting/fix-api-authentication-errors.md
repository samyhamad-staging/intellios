---
id: "10-008"
title: "API Returns 401 Unauthorized or 403 Forbidden"
slug: "api-authentication-errors"
type: "troubleshooting"
audiences: ["engineering"]
status: "published"
version: "1.0.0"
platform_version: "1.2.0"
created: "2026-04-05"
updated: "2026-04-05"
tags: ["api", "authentication", "authorization", "rbac", "tokens"]
tldr: "API requests return 401 (Unauthorized) or 403 (Forbidden) errors. Root causes: expired token, invalid credentials, insufficient OAuth scopes, or RBAC role mismatch. Verify token validity, scopes, and user role assignment."
feedback_url: "https://feedback.intellios.ai/kb"
---

## TL;DR

API calls fail with **401 Unauthorized** (authentication failure) or **403 Forbidden** (authorization failure). Check token expiration, credential validity, OAuth scope permissions, and RBAC role assignments. Tokens expire after 24 hours; refresh tokens before use.

---

## Symptom

- API request returns HTTP status code **401** with message "Invalid or missing authorization"
- API request returns HTTP status code **403** with message "Insufficient permissions" or "Access denied"
- Client libraries (Python SDK, Node.js SDK) raise `AuthenticationError` or `PermissionError`
- All API endpoints for a given user fail consistently

---

## Possible Causes (by likelihood)

1. **Expired or invalid token** — Bearer token expired (TTL: 24 hours) or malformed
2. **Invalid API credentials** — API key or client ID/secret incorrect or revoked
3. **Insufficient OAuth scopes** — Token granted for narrow scopes; endpoint requires broader access
4. **RBAC role mismatch** — User role lacks permission for the requested resource or action
5. **Revoked API key or OAuth token** — Key was manually revoked or SSO session invalidated

---

## Diagnosis Steps

### Step 1: Verify token format and expiration
```bash
# Check token structure (should be JWT)
TOKEN="your_bearer_token_here"
echo $TOKEN | cut -d. -f2 | base64 -d | jq .

# Look for "exp" field and compare to current Unix timestamp
# Current timestamp: $(date +%s)
# If exp < current_time, token is expired
```

### Step 2: Test with a fresh token
```bash
# Obtain new token via OAuth or API key exchange
curl -X POST https://auth.intellios.ai/v1/oauth/token \
  -d "grant_type=client_credentials" \
  -d "client_id=$CLIENT_ID" \
  -d "client_secret=$CLIENT_SECRET"

# Use the access_token from response for next request
```

### Step 3: Verify API key validity
```bash
# If using API key auth instead of OAuth
curl -H "X-API-Key: $API_KEY" \
  https://api.intellios.ai/v1/auth/verify

# Returns 200 if key is valid; 401 if revoked or invalid
```

### Step 4: Check token scopes
```bash
# Decode JWT and inspect scopes claim
TOKEN="your_bearer_token"
echo $TOKEN | cut -d. -f2 | base64 -d | jq .scope

# Expected scopes for common operations:
# - blueprints:read, blueprints:write
# - governance:read
# - registry:read, registry:write
```

### Step 5: Verify RBAC role permissions
Log into the platform → Administration → Users. Find the user and check assigned role. Compare to endpoint requirements:

| Endpoint | Required Role |
|----------|---------------|
| `GET /blueprints` | `agent-reader` or higher |
| `POST /blueprints` | `agent-creator` |
| `PUT /governance/policies` | `compliance-admin` |
| `DELETE /blueprints/{id}` | `admin` |

---

## Resolution

### If token expired (401):
1. Generate a new token using your credentials:
   ```bash
   curl -X POST https://auth.intellios.ai/v1/oauth/token \
     -d "grant_type=refresh_token" \
     -d "refresh_token=$REFRESH_TOKEN"
   ```
2. Use the new `access_token` in the Authorization header
3. Update your client code to refresh tokens before expiration (recommend: refresh at 80% of TTL)
4. **Verify:** API request succeeds with `200 OK` or `201 Created`

### If invalid credentials (401):
1. Check your API key or client credentials in Admin → API Keys
2. Regenerate the key if unsure of value
3. Copy the new key and update your environment variables or secrets manager
4. Retry the API request
5. **Verify:** `curl -H "X-API-Key: $NEW_KEY" https://api.intellios.ai/v1/auth/verify` returns 200

### If insufficient scopes (403):
1. Check the error response for scope requirement:
   ```bash
   # Example response:
   # {"error": "insufficient_scope", "required_scopes": "blueprints:write governance:read"}
   ```
2. Request a new OAuth token with required scopes:
   ```bash
   curl -X POST https://auth.intellios.ai/v1/oauth/authorize \
     -d "scope=blueprints:write governance:read"
   ```
3. Approve the scope grant in the SSO/OAuth provider
4. Retry the API call
5. **Verify:** API request succeeds

### If RBAC role insufficient (403):
1. Log into the platform as an admin
2. Navigate to Administration → Users
3. Find the user, click Edit
4. Increase role from (e.g.) `agent-reader` to `agent-creator`
5. Click Save. Changes take effect immediately.
6. Ask the user to refresh their session or obtain a new token
7. **Verify:** User can now access the restricted endpoint

### If API key revoked (401):
1. Admin → API Keys
2. Check if your key shows "Status: Revoked"
3. If revoked, delete it and generate a new key
4. Update all clients using the old key with the new key
5. **Verify:** Test with `curl -H "X-API-Key: $NEW_KEY" https://api.intellios.ai/v1/auth/verify`

---

## Prevention

- **Token management:** Implement automatic token refresh in SDKs (refresh at 80% of TTL, default 24h)
- **Key rotation:** Rotate API keys every 90 days; store in secure secrets manager (e.g., AWS Secrets Manager, HashiCorp Vault)
- **Scope minimization:** Request only scopes necessary for your use case
- **RBAC review:** Audit user roles quarterly; remove unnecessary elevated roles
- **Monitoring:** Log all 401/403 errors; alert on unusual patterns (e.g., 10+ failures in 5 min)

---

## Escalation

For persistent authentication issues, account lockouts, or SSO integration problems, see [escalation-paths.md](../escalation-paths.md).

---

## Related Articles

- [API Authentication Guide](../04-architecture-integration/api-authentication.md)
- [RBAC and Role Management](../07-administration-operations/rbac-roles.md)
- [OAuth 2.0 Setup](../04-architecture-integration/oauth-setup.md)
- [API Key Management](../07-administration-operations/api-key-management.md)
