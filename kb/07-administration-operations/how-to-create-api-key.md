---
id: 07-011
title: "How to Create and Manage API Keys"
slug: create-manage-api-keys
type: task
audiences:
  - engineering
status: published
version: 1.0.0
platform_version: 1.2.0
created: "2026-04-05"
updated: "2026-04-05"
tags:
  - api
  - authentication
  - administration
  - security
prerequisites:
  - 01-001
related:
  - 04-014
  - 07-009
next_steps:
  - 04-014
feedback_url: "https://feedback.intellios.ai/kb"
tldr: "Navigate Admin > API Credentials, click Create Key, name it, select scopes (read, write, governance, admin), set expiration, copy key (shown once), test with curl."
---

## TL;DR

Generate a new API key with appropriate scopes for programmatic access by navigating to Admin > API Credentials, creating a key with desired scopes, copying the key, and testing it.

## Goal

Generate a new API key with appropriate scopes for programmatic access to Intellios.

## Prerequisites

- You have Admin or Engineer role in Intellios.
- You understand what the API key will be used for (e.g., CI/CD pipeline, third-party integration, testing).
- You know which scopes (permissions) the key needs (read, write, governance, admin).
- You have a secure way to store the key (environment variable, secrets vault, etc.).

## Steps

1. **Log in and navigate to Admin.** Open Intellios, click **Admin** in the sidebar.

2. **Click API Credentials or API Keys.** You will see the API key management interface showing any existing keys and a button to create new ones.

3. **Click Create Key.** Click the **Create Key**, **Generate Key**, or **+ New Key** button. A key creation form will appear.

4. **Name the key.** Enter a descriptive name in the **Key Name** field that indicates its purpose. Examples:
   - "CI/CD Pipeline"
   - "GitHub Actions"
   - "Third-party Integration - Slack"
   - "Local Development"
   This name is for your internal reference and helps you identify which key is used for what purpose.

5. **Select scopes.** Check the checkboxes for the permissions this key needs:
   - **read** — List and retrieve agents, policies, intake sessions, and deployment status. Required for most integrations.
   - **write** — Create, update, and delete agents, policies, and intake sessions. Required for automation and CI/CD deployments.
   - **governance** — Create, update, and validate blueprints against governance policies. Required if the integration validates agents before deployment.
   - **admin** — Manage users, API credentials, system configuration, and audit logs. Only grant this if absolutely necessary. Most integrations should use read, write, and governance.
   Principle of least privilege: Select only the scopes needed for your use case.

6. **Set expiration (optional).** Some organizations require API keys to expire for security. You may see an **Expiration** dropdown. Choose one of:
   - **Never expire** — Key is valid indefinitely (higher security risk).
   - **30 days**, **90 days**, **1 year**, or a custom date.
   If you set an expiration, make a note of it so you remember to rotate the key before it expires.

7. **Click Create or Generate.** Click the **Create Key**, **Generate**, or **Confirm** button. A confirmation message will appear showing your new key. The key will look like: `ik_prod_abc123xyz...` (the exact format depends on your environment).

8. **Copy the key immediately.** The key will only be displayed once. Click the **Copy** button or select and copy the full key value. Store it in your secrets vault, environment variable file, or password manager immediately. Do not leave the page without copying it—you will not be able to view it again.

9. **Confirm and close.** Click **Done** or **Close**. The key will now appear in your API Keys list with:
   - Key name
   - Scopes granted
   - Creation date
   - Expiration date (if set)
   - Last used date (will be empty until you make the first API call)

10. **(Optional) Test the key.** Open a terminal and test the key with curl:

    ```bash
    curl -X GET "https://YOUR_BASE_URL/api/intake" \
      -H "Authorization: Bearer YOUR_API_KEY" \
      -H "Content-Type: application/json"
    ```

    Replace `YOUR_BASE_URL` and `YOUR_API_KEY` with your instance URL and the key you just created. If the response is a 200 status with a JSON list, the key is working correctly.

## Key Management — Rotating and Revoking

**To revoke a key:** Click the key in the list, then click **Revoke** or **Delete**. The key will immediately stop working. All API calls using that key will fail with a 401 Unauthorized error.

**To rotate a key:** Create a new key with the same scopes, update your application to use the new key, then revoke the old key. This ensures no downtime.

## Verification

- The new key appears in the API Keys list with the name and scopes you specified.
- The key works with a test curl command (returns 200 and valid JSON).
- The key is securely stored (not visible in logs, code, or shared documents).
- If expiration was set, the expiration date appears on the key detail.
- Last-used timestamp updates after you make an API call with the key.

## Next Steps

- [How to Make Your First API Call (5-Minute Quickstart)](04-014)
- [How to Add a Team Member and Assign Roles](07-009)
