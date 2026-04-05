---
id: "04-011"
title: "API Reference"
slug: "api-reference"
type: "reference"
audiences:
  - "engineering"
status: "published"
version: "1.0.0"
platform_version: "1.2.0"
created: "2026-04-05"
updated: "2026-04-05"
author: "Intellios Platform Engineering"
tags:
  - "api"
  - "rest"
  - "integration"
  - "reference"
  - "endpoints"
related:
  - "04-001"
  - "04-002"
  - "04-003"
  - "08-003"
feedback_url: "[PLACEHOLDER]"
tldr: "Complete reference documentation for all Intellios REST APIs: Intake Engine, Blueprint Generation, Agent Registry, Governance Validation, and Review Queue."
---

# API Reference

> **TL;DR:** Complete reference documentation for all Intellios REST APIs organized by subsystem.

## Overview

Intellios exposes a comprehensive REST API under `/api/` organized into five subsystems. All endpoints accept `application/json` and return JSON responses with standardized error codes.

**Base URL:** `https://[your-intellios-host]/api`

**Authentication:** All endpoints require an `Authorization: Bearer [token]` header with valid Intellios API credentials.

**Rate Limiting:** Standard tier allows 100 req/s per enterprise.

---

## Subsystem APIs

### [Intake API](intake-api.md)
Create and manage intake sessions that capture enterprise requirements for agent design. Stream multi-turn conversations, add stakeholder contributions, and retrieve structured intake payloads.

**Endpoints:**
- `POST /api/intake` — Create new intake session
- `GET /api/intake/[id]` — Retrieve session
- `POST /api/intake/[id]/message` — Send message (streaming)
- `POST /api/intake/[id]/stakeholder` — Add stakeholder contribution
- `GET /api/intake/[id]/payload` — Get current intake payload

---

### [Blueprints API](blueprints-api.md)
Generate, refine, and validate Agent Blueprint Packages (ABPs) from intake data. Trigger governance validation, monitor generation status, and review validation reports.

**Endpoints:**
- `POST /api/blueprints/generate` — Generate ABP from intake
- `POST /api/blueprints/[id]/refine` — Refine ABP with natural language
- `POST /api/blueprints/[id]/validate` — Trigger governance validation
- `GET /api/blueprints/[id]/status` — Get generation/validation status

---

### [Registry API](registry-api.md)
Query, clone, and manage agent blueprints throughout their lifecycle. Version control, lifecycle status transitions, and audit history.

**Endpoints:**
- `GET /api/registry` — List all agents (with filtering & pagination)
- `GET /api/registry/[agentId]` — Get latest version
- `GET /api/registry/[agentId]/versions` — List all versions
- `POST /api/registry/[agentId]/clone` — Clone agent blueprint
- `PATCH /api/registry/[agentId]/status` — Update lifecycle status
- `GET /api/registry/[agentId]/history` — Audit trail

---

### [Governance API](governance-api.md)
Define, manage, and apply governance policies. Create policy rules, validate ABPs against enterprise standards, and retrieve validation reports.

**Endpoints:**
- `GET /api/governance/policies` — List policies
- `POST /api/governance/policies` — Create policy
- `GET /api/governance/policies/[id]` — Get policy
- `PUT /api/governance/policies/[id]` — Update policy
- `POST /api/governance/validate` — Validate ABP against policies
- `GET /api/governance/validate/[blueprintId]` — Get validation report

---

### [Review API](review-api.md)
Manage the blueprint review and approval workflow. Retrieve review queues, approve/reject blueprints, and request design changes with audit trail.

**Endpoints:**
- `GET /api/review` — Get review queue
- `POST /api/review/[agentId]/approve` — Approve with comment
- `POST /api/review/[agentId]/reject` — Reject with comment
- `POST /api/review/[agentId]/request-changes` — Request changes with comment

---

## Standard Response Format

All endpoints follow this response structure:

```json
{
  "success": true,
  "data": {
    "[resource]": { }
  },
  "meta": {
    "requestId": "[uuid]",
    "timestamp": "[ISO-8601]"
  }
}
```

Error responses:

```json
{
  "success": false,
  "error": {
    "code": "ERR_CODE",
    "message": "Human-readable description",
    "details": { }
  },
  "meta": {
    "requestId": "[uuid]",
    "timestamp": "[ISO-8601]"
  }
}
```

---

## Common HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| **200** | OK | Request succeeded, response in `data` |
| **201** | Created | New resource created (Blueprints, Policies) |
| **202** | Accepted | Async operation queued (generation, validation) |
| **400** | Bad Request | Malformed JSON, missing required field |
| **401** | Unauthorized | Missing or invalid token |
| **403** | Forbidden | Enterprise policy violation, insufficient permissions |
| **404** | Not Found | Resource does not exist |
| **409** | Conflict | Resource in wrong state (e.g., cannot approve a rejected blueprint) |
| **422** | Unprocessable Entity | Validation failed (governance policy breach) |
| **429** | Too Many Requests | Rate limit exceeded |
| **500** | Internal Server Error | Platform error; contact support |

---

## Pagination

List endpoints (`/api/registry`, `/api/governance/policies`, `/api/review`) support pagination:

**Query Parameters:**
```
?page=1&limit=20&sort=created_at&order=desc
```

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [ ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 145,
      "pages": 8
    }
  }
}
```

---

## Filtering

Most list endpoints support filtering via query parameters:

```
?status=approved&enterprise_id=[PLACEHOLDER]&created_after=2026-04-01
```

Refer to individual endpoint documentation for supported filter fields.

---

## Async Operations

Generation (`POST /api/blueprints/generate`) and validation (`POST /api/blueprints/[id]/validate`) are asynchronous. Clients receive a `202 Accepted` response immediately with an operation ID, then poll `GET /api/blueprints/[id]/status` to track progress.

---

## Error Handling

All error responses include:
- **code** — Machine-readable error code for client logic
- **message** — Human-readable description
- **details** — Optional context (validation errors, field violations)

Example:
```json
{
  "success": false,
  "error": {
    "code": "GOVERNANCE_VALIDATION_FAILED",
    "message": "Blueprint violates 2 governance policies",
    "details": {
      "violations": [
        {
          "policy_id": "[PLACEHOLDER]",
          "rule": "max_tools",
          "message": "Blueprint defines 12 tools; policy allows max 10"
        }
      ]
    }
  }
}
```

---

## Authentication

All endpoints require an `Authorization: Bearer [token]` header:

```bash
curl -H "Authorization: Bearer [TOKEN]" \
  https://[your-intellios-host]/api/intake
```

Obtain tokens via the **Admin Console** → **API Credentials** or programmatically via `/api/auth/token` (see [API Authentication](../../08-security-trust/secret-management.md)).

---

## Suggested Reading Order

1. **[Intake API](intake-api.md)** — Start if building intake capture workflows
2. **[Blueprints API](blueprints-api.md)** — Generate and validate agents
3. **[Governance API](governance-api.md)** — Set up policy validation
4. **[Review API](review-api.md)** — Implement approval workflows
5. **[Registry API](registry-api.md)** — Query and manage agent lifecycle

---

## Code Examples

SDKs and runnable examples are available in the [Engineer Setup Guide](../../02-getting-started/engineer-setup-guide.md).

---

## Support

For API issues:
- Check error codes and details in response body
- Review individual endpoint documentation for constraints
- See [Engineering FAQ](../../10-faq-troubleshooting/engineering-faq.md)
- Contact Intellios support with the `X-Request-ID` header from error response
