---
id: 07-012
title: "How to Configure SSO Authentication"
slug: configure-sso
type: task
audiences:
  - engineering
status: published
version: 1.0.0
platform_version: 1.2.0
created: "2026-04-05"
updated: "2026-04-05"
tags:
  - sso
  - authentication
  - oidc
  - saml
  - admin
prerequisites:
  - 02-001
related:
  - 07-001
  - 07-003
next_steps:
  - 07-013
feedback_url: "https://feedback.intellios.ai/kb"
tldr: |
  Configure Single Sign-On (SSO) for your organization using OIDC or SAML. Takes 15–20 minutes to set up provider metadata, client credentials, and group-to-RBAC mappings, then test login.
---

## TL;DR

Set up SSO in 7 steps: navigate to Admin > SSO → select provider type → enter metadata URL → configure client credentials → map groups to roles → test login → enable for all users.

## Goal

Set up Single Sign-On (OIDC or SAML) for your organization so employees can log in with existing corporate identity without separate Intellios passwords.

## Prerequisites

- You have Admin or Engineering role in Intellios
- You have access to your organization's identity provider (Okta, Azure AD, OneLogin, etc.)
- You know your IdP's metadata endpoint URL or have metadata file ready
- You have access to create an OIDC/SAML application in your IdP
- You have ~15–20 minutes to complete setup and testing

## Steps

### Step 1: Navigate to SSO Configuration

Log into Intellios as an Admin. Click **Admin** in the top navigation, then select **Security > SSO Configuration**.

**Expected outcome:** SSO Configuration page appears with options for OIDC and SAML providers.

### Step 2: Select Provider Type

Choose your identity provider type:

- **OIDC:** For modern providers (Okta, Azure AD, Google Workspace, Auth0)
- **SAML:** For enterprise providers (Okta, Azure AD via SAML2, OneLogin, Ping Identity)

Click **Configure** next to your chosen provider type.

**Expected outcome:** Configuration form appears with fields for metadata URL and client credentials.

### Step 3: Enter Provider Metadata URL

In the IdP Metadata URL field, paste your identity provider's metadata endpoint. Examples:

- **Okta OIDC:** `https://your-org.okta.com/.well-known/openid-configuration`
- **Azure AD (OIDC):** `https://login.microsoftonline.com/your-tenant-id/v2.0/.well-known/openid-configuration`
- **SAML:** Paste the metadata XML URL or upload metadata file directly

Click **Fetch Metadata** or **Upload Metadata File**.

**Expected outcome:** Intellios retrieves and parses metadata. You should see extracted provider endpoints and certificate information.

### Step 4: Configure Client Credentials

Intellios displays required fields. Fill in:

- **Client ID:** From your IdP application (e.g., Okta app ID)
- **Client Secret:** From your IdP application (keep secure; never share)
- **Redirect URI:** Intellios displays the required redirect URI (e.g., `https://intellios.company.com/auth/callback`). Copy this and register it in your IdP.
- **Scopes (OIDC only):** Default is `openid profile email`. Add `groups` if you want group-based role mapping.

If you haven't created the Intellios application in your IdP yet, pause here and:

1. Log into your IdP admin console
2. Create a new OIDC/SAML application
3. Set the redirect/assertion consumer service URL to the value Intellios provided
4. Copy the generated Client ID and Secret
5. Return to Intellios and paste them

Click **Validate Credentials**.

**Expected outcome:** Credentials validated successfully (green checkmark). Intellios confirms it can authenticate with your IdP.

### Step 5: Map IdP Groups to Intellios Roles

In the "Group Mapping" section, define which IdP groups map to Intellios RBAC roles:

| IdP Group | Intellios Role |
|-----------|----------------|
| `intellios-admins` | Admin |
| `intellios-compliance` | Compliance |
| `intellios-engineers` | Engineering |
| `intellios-product` | Product |

For OIDC, map the `groups` claim from your IdP. For SAML, map the group attribute.

Enter your IdP group names in the left column and select the corresponding Intellios role in the right column. Click **Add Mapping** for each group.

**Expected outcome:** All mappings configured. Users in IdP groups will automatically receive corresponding Intellios roles on first login.

### Step 6: Test SSO Login

Click **Test Login**. A new window opens with your IdP's login screen.

1. Log in with a test account from your organization
2. Authorize Intellios to access your identity
3. You should be redirected back to Intellios and logged in

**Expected outcome:** You're logged in as your test user. Your Intellios role matches your IdP group mapping. Check the top-right user menu; it should show your name and role.

### Step 7: Enable SSO for All Users

If the test succeeded, click **Enable SSO for Organization**. You'll see a confirmation dialog:

> "Once enabled, users will be required to log in via SSO. Existing password-based logins will be disabled. Continue?"

Click **Confirm**. SSO is now active for all users.

**Expected outcome:** SSO enabled. The SSO Configuration page now shows status "Active" and displays when it was enabled.

## Verification

SSO is properly configured when:

1. You see "SSO Status: Active" in Admin > SSO Configuration
2. A test user can log in via their IdP credentials
3. The user's role in Intellios matches their IdP group mapping
4. The audit log shows SSO login events (Admin > Audit Logs, filter by "sso_login")
5. Non-admin users are redirected to IdP login when accessing Intellios

To verify end-to-end, log out of Intellios. Click "Log In". You should see an "Sign in with [IdP Name]" button instead of a username/password field. Click it and verify you're redirected to your IdP.

## Next Steps

- [View an agent's complete audit history](07-013) to verify SSO login events
- [Configure audit logging for compliance](05-014)
- [Review RBAC and permission model](07-001)
