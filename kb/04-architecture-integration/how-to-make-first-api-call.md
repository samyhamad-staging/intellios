---
id: 04-014
title: "How to Make Your First API Call (5-Minute Quickstart)"
slug: make-first-api-call
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
  - quickstart
  - integration
  - authentication
prerequisites:
  - 01-001
  - 04-001
related:
  - 07-011
  - 04-002
next_steps:
  - 07-011
feedback_url: "https://feedback.intellios.ai/kb"
tldr: "Get an API token from Admin > API Credentials, make a GET request to /api/intake, verify a 200 response, then make a POST request to create a test intake session."
---

## TL;DR

Verify API connectivity by obtaining an API token and making a successful authenticated GET and POST request to the Intellios API.

## Goal

Verify API connectivity by making a successful authenticated request to the Intellios API.

## Prerequisites

- You have Admin or Engineer role in Intellios.
- You have command-line access (terminal, PowerShell, or API client like Postman).
- curl is installed on your system (or you can use an alternative like httpie or Postman).
- You know the base URL of your Intellios instance (e.g., `https://intellios.example.com` or `https://api.intellios.ai`).

## Steps

1. **Get your API token.** Log in to Intellios, click **Admin** in the sidebar, then click **API Credentials** or **API Keys**. You will see a section to create or view API tokens. If no token exists, click **Create Token** or **Generate Key**. Copy the token value (it will look like `ik_prod_abc123xyz...`). Store it securely—you will not see it again.

2. **Open your terminal or API client.** Open a terminal window (macOS/Linux) or PowerShell (Windows), or open an API client like Postman.

3. **Make a GET request to list intake sessions.** This request tests authentication and basic connectivity. Replace `YOUR_BASE_URL` with your Intellios instance URL and `YOUR_API_TOKEN` with the token you copied:

   ```bash
   curl -X GET "https://YOUR_BASE_URL/api/intake" \
     -H "Authorization: Bearer YOUR_API_TOKEN" \
     -H "Content-Type: application/json"
   ```

   Example:
   ```bash
   curl -X GET "https://intellios.example.com/api/intake" \
     -H "Authorization: Bearer ik_prod_abc123xyz" \
     -H "Content-Type: application/json"
   ```

4. **Verify the 200 response.** You will see output. Look for:
   - **Status code 200** — Success. The response will include a JSON list of intake sessions (may be empty if this is a new instance).
   - **Status code 401** — Unauthorized. Check that your token is correct and not expired.
   - **Status code 403** — Forbidden. Your token may not have permission for this endpoint. Verify your role.
   - **Status code 404** — Not found. Check that the base URL is correct.

   A successful response looks like:
   ```json
   {
     "sessions": [
       {
         "id": "intake-001",
         "status": "completed",
         "createdAt": "2026-04-01T10:00:00Z"
       }
     ]
   }
   ```

5. **Make a POST request to create a test intake session.** Now test a write operation. Replace the values below:

   ```bash
   curl -X POST "https://YOUR_BASE_URL/api/intake" \
     -H "Authorization: Bearer YOUR_API_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Test Agent from API",
       "description": "Quick test to verify API connectivity",
       "agentType": "assistant",
       "targetAudience": "internal"
     }'
   ```

6. **Verify the 201 response.** A successful POST will return status code 201 (Created) with a JSON response containing the new session ID and metadata:

   ```json
   {
     "id": "intake-12345",
     "name": "Test Agent from API",
     "status": "draft",
     "createdAt": "2026-04-05T14:30:00Z"
   }
   ```

   If you see an error, check:
   - The JSON payload is valid (no syntax errors).
   - Required fields are included (name, agentType, etc.).
   - Your token has "write" permissions.

7. **(Optional) Verify via the UI.** Log in to Intellios, click **Intake** in the sidebar, and look for your test session in the list. It should appear with the name "Test Agent from API" and status "Draft".

## Verification

- The GET request returns status code 200 and a JSON response.
- The POST request returns status code 201 and includes a session ID in the response.
- You can see the created intake session in the Intellios UI (Intake section).
- Subsequent API requests using the same token work without authentication errors.

## Next Steps

- [How to Create and Manage API Keys](07-011)
- Read the full [API Reference](04-002) for all available endpoints and query parameters.
