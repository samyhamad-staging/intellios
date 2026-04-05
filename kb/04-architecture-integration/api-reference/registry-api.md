---
id: "04-008"
title: "Registry API Reference"
slug: "registry-api"
type: "reference"
audiences:
  - "engineering"
status: "published"
version: "1.0.0"
platform_version: "1.2.0"
created: "2026-04-05"
updated: "2026-04-05"
author: "Intellios Platform Engineering"
related:
  - "04-011"
  - "04-007"
  - "04-010"
  - "03-003"
tags:
  - "api"
  - "agent-registry"
  - "blueprint-versioning"
  - "lifecycle-management"
  - "crud"
feedback_url: "[PLACEHOLDER]"
tldr: "REST API for querying, cloning, and managing agent blueprints throughout their lifecycle. Version control, lifecycle status transitions, and complete audit history."
---

# Registry API Reference

> **TL;DR:** Query, clone, and manage agent blueprints in the registry. Full version control, lifecycle management, and audit trails.

## Overview

The Registry API is the query and mutation interface for the Agent Blueprint Package registry. It provides CRUD operations, version control, lifecycle status transitions, and complete audit history for blueprints.

**Base URL:** `https://[your-intellios-host]/api/registry`

**Authentication:** All endpoints require `Authorization: Bearer [token]`

**Content-Type:** `application/json`

---

## Endpoints

### 1. List All Agents

Retrieve paginated list of all agents with filtering, sorting, and pagination.

```
GET /api/registry
```

**Description**
Returns a paginated list of agents in the registry. Supports filtering by status, creation date, and other fields, plus sorting and pagination controls.

**Query Parameters**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number (1-indexed) |
| `limit` | integer | 20 | Results per page (1–100) |
| `sort` | string | `created_at` | Sort field: `created_at`, `updated_at`, `name` |
| `order` | enum | `desc` | Sort order: `asc`, `desc` |
| `status` | string | (none) | Filter by status: `draft`, `in_review`, `approved`, `rejected`, `deprecated` |
| `enterprise_id` | string | (auth token's) | Filter by enterprise (admins only) |
| `created_after` | ISO-8601 | (none) | Filter blueprints created after date |
| `created_before` | ISO-8601 | (none) | Filter blueprints created before date |
| `search` | string | (none) | Full-text search on name and description |

**Example Request**

```bash
GET /api/registry?status=approved&sort=updated_at&order=desc&limit=50
```

**Response** (200 OK)

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "[PLACEHOLDER-BLUEPRINT-ID-1]",
        "agent_id": "[PLACEHOLDER-AGENT-ID-1]",
        "name": "Claims Auto-Processor",
        "description": "Processes insurance claims with document analysis",
        "version": "1.2.1",
        "status": "approved",
        "created_at": "2026-03-15T09:30:00Z",
        "updated_at": "2026-04-02T14:22:00Z",
        "created_by": "jane.doe@company.com",
        "approved_by": "compliance-lead@company.com",
        "approved_at": "2026-03-20T10:00:00Z"
      },
      {
        "id": "[PLACEHOLDER-BLUEPRINT-ID-2]",
        "agent_id": "[PLACEHOLDER-AGENT-ID-2]",
        "name": "Document Classifier",
        "description": "Classifies incoming documents for routing",
        "version": "2.0.0",
        "status": "approved",
        "created_at": "2026-02-01T08:15:00Z",
        "updated_at": "2026-03-30T11:45:00Z",
        "created_by": "alex.smith@company.com",
        "approved_by": "compliance-lead@company.com",
        "approved_at": "2026-02-10T16:20:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 47,
      "pages": 3
    }
  },
  "meta": {
    "requestId": "[PLACEHOLDER-UUID]",
    "timestamp": "2026-04-05T13:00:00Z"
  }
}
```

**Error Codes**

| Code | Status | Description |
|------|--------|-------------|
| `INVALID_FILTER` | 400 | Filter value not recognized |
| `INVALID_SORT_FIELD` | 400 | Sort field not valid |

---

### 2. Get Agent (Latest Version)

Retrieve the latest version of a specific agent.

```
GET /api/registry/{agentId}
```

**Description**
Returns the most recent blueprint for a given agent ID, including full ABP definition, validation report (if available), and metadata.

**Path Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `agentId` | string | Yes | Agent identifier |

**Query Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `include_blueprint` | boolean | Default: true. Include full ABP definition |
| `include_validation` | boolean | Default: true. Include validation report |

**Response** (200 OK)

```json
{
  "success": true,
  "data": {
    "agent": {
      "id": "[PLACEHOLDER-AGENT-ID]",
      "blueprint_id": "[PLACEHOLDER-BLUEPRINT-ID]",
      "name": "Claims Auto-Processor",
      "description": "Processes insurance claims with document analysis",
      "version": "1.2.1",
      "status": "approved",
      "created_at": "2026-03-15T09:30:00Z",
      "updated_at": "2026-04-02T14:22:00Z",
      "created_by": "jane.doe@company.com",
      "approved_by": "compliance-lead@company.com",
      "approved_at": "2026-03-20T10:00:00Z",
      "blueprint": {
        "agent_name": "Claims Auto-Processor",
        "agent_description": "Processes insurance claims with document analysis",
        "tools": [
          {
            "name": "parse_claim_form",
            "description": "Extract data from claim forms",
            "type": "rest_api",
            "endpoint": "[PLACEHOLDER-ENDPOINT]",
            "input_schema": { }
          }
        ],
        "workflows": [
          {
            "name": "process_claim",
            "steps": ["Parse form", "Validate policy", "Route decision"]
          }
        ]
      },
      "validation_report": {
        "status": "passed",
        "policies_evaluated": 5,
        "violations": 0,
        "warnings": 0
      },
      "metadata": {
        "department": "Operations",
        "business_owner": "director@company.com",
        "sla_minutes": 120
      },
      "deployed_at": "2026-03-25T08:00:00Z",
      "deployment_target": "aws-agentcore-prod"
    }
  },
  "meta": {
    "requestId": "[PLACEHOLDER-UUID]",
    "timestamp": "2026-04-05T13:05:00Z"
  }
}
```

**Error Codes**

| Code | Status | Description |
|------|--------|-------------|
| `AGENT_NOT_FOUND` | 404 | Agent ID does not exist |

---

### 3. List Agent Versions

Retrieve all versions of a specific agent with metadata.

```
GET /api/registry/{agentId}/versions
```

**Description**
Returns a paginated list of all blueprint versions for an agent, ordered by version number descending (latest first).

**Path Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `agentId` | string | Yes | Agent identifier |

**Query Parameters**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `limit` | integer | 20 | Results per page (1–100) |

**Response** (200 OK)

```json
{
  "success": true,
  "data": {
    "agent_id": "[PLACEHOLDER-AGENT-ID]",
    "versions": [
      {
        "blueprint_id": "[PLACEHOLDER-BLUEPRINT-ID-3]",
        "version": "1.2.1",
        "status": "approved",
        "created_at": "2026-04-02T11:00:00Z",
        "created_by": "jane.doe@company.com",
        "approved_at": "2026-04-02T14:22:00Z",
        "approved_by": "compliance-lead@company.com",
        "validation_status": "passed",
        "deployment_status": "deployed",
        "deployed_at": "2026-04-03T08:00:00Z"
      },
      {
        "blueprint_id": "[PLACEHOLDER-BLUEPRINT-ID-2]",
        "version": "1.2.0",
        "status": "approved",
        "created_at": "2026-03-28T09:15:00Z",
        "created_by": "jane.doe@company.com",
        "approved_at": "2026-03-28T16:45:00Z",
        "approved_by": "compliance-lead@company.com",
        "validation_status": "passed",
        "deployment_status": "deployed",
        "deployed_at": "2026-03-29T08:00:00Z"
      },
      {
        "blueprint_id": "[PLACEHOLDER-BLUEPRINT-ID-1]",
        "version": "1.1.0",
        "status": "approved",
        "created_at": "2026-03-15T09:30:00Z",
        "created_by": "jane.doe@company.com",
        "approved_at": "2026-03-20T10:00:00Z",
        "approved_by": "compliance-lead@company.com",
        "validation_status": "passed",
        "deployment_status": "deployed",
        "deployed_at": "2026-03-25T08:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 3,
      "pages": 1
    }
  },
  "meta": {
    "requestId": "[PLACEHOLDER-UUID]",
    "timestamp": "2026-04-05T13:10:00Z"
  }
}
```

**Error Codes**

| Code | Status | Description |
|------|--------|-------------|
| `AGENT_NOT_FOUND` | 404 | Agent ID does not exist |

---

### 4. Clone Agent Blueprint

Create a copy of a blueprint as a new draft for modification.

```
POST /api/registry/{agentId}/clone
```

**Description**
Clones the specified blueprint version into a new draft blueprint. The new blueprint has the same ABP definition but reset status to `draft`, allowing refinement before resubmission.

**Path Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `agentId` | string | Yes | Agent identifier |

**Request Body**

```json
{
  "source_version": "1.2.1",
  "new_name": "Claims Auto-Processor v2 (Batch Support)",
  "new_description": "Enhanced version with batch processing support",
  "clone_reason": "feature_enhancement"
}
```

**Parameters**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `source_version` | string | No | Version to clone (latest if omitted) |
| `new_name` | string | No | New name for cloned blueprint |
| `new_description` | string | No | New description |
| `clone_reason` | enum | No | Reason for clone: `feature_enhancement`, `bug_fix`, `customer_request`, `refactor`, `testing` |

**Response** (201 Created)

```json
{
  "success": true,
  "data": {
    "agent": {
      "id": "[PLACEHOLDER-AGENT-ID]",
      "blueprint_id": "[PLACEHOLDER-NEW-BLUEPRINT-ID]",
      "name": "Claims Auto-Processor v2 (Batch Support)",
      "description": "Enhanced version with batch processing support",
      "version": "1.3.0",
      "status": "draft",
      "created_at": "2026-04-05T13:15:00Z",
      "created_by": "jane.doe@company.com",
      "cloned_from_version": "1.2.1",
      "clone_reason": "feature_enhancement",
      "blueprint": {}
    }
  },
  "meta": {
    "requestId": "[PLACEHOLDER-UUID]",
    "timestamp": "2026-04-05T13:15:00Z"
  }
}
```

**Error Codes**

| Code | Status | Description |
|------|--------|-------------|
| `AGENT_NOT_FOUND` | 404 | Agent ID does not exist |
| `VERSION_NOT_FOUND` | 404 | Source version does not exist |

---

### 5. Update Lifecycle Status

Transition a blueprint's status in the lifecycle (approve, reject, deprecate).

```
PATCH /api/registry/{agentId}/status
```

**Description**
Transitions a blueprint between lifecycle states. Only available to review and approval roles. State machine is enforced: draft→in_review, in_review→approved/rejected, etc.

**Path Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `agentId` | string | Yes | Agent identifier |

**Request Body**

```json
{
  "status": "approved",
  "version": "1.2.1",
  "comment": "All governance policies passed. Approved for production deployment.",
  "deployment_target": "aws-agentcore-prod"
}
```

**Parameters**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `status` | enum | Yes | New status: `in_review`, `approved`, `rejected`, `deprecated` |
| `version` | string | No | Target version (latest if omitted) |
| `comment` | string | No | Reviewer comment (required for approve/reject) |
| `deployment_target` | string | No | Runtime deployment target (for approved status) |

**Response** (200 OK)

```json
{
  "success": true,
  "data": {
    "agent": {
      "id": "[PLACEHOLDER-AGENT-ID]",
      "blueprint_id": "[PLACEHOLDER-BLUEPRINT-ID]",
      "version": "1.2.1",
      "status": "approved",
      "updated_at": "2026-04-05T13:20:00Z",
      "approved_by": "compliance-lead@company.com",
      "approved_at": "2026-04-05T13:20:00Z",
      "approval_comment": "All governance policies passed. Approved for production deployment.",
      "deployment_target": "aws-agentcore-prod"
    }
  },
  "meta": {
    "requestId": "[PLACEHOLDER-UUID]",
    "timestamp": "2026-04-05T13:20:00Z"
  }
}
```

**Valid State Transitions**

| From | To | Role Required |
|------|-----|---------------|
| `draft` | `in_review` | Creator or reviewer |
| `in_review` | `approved` | Approver |
| `in_review` | `rejected` | Approver |
| `approved` | `deprecated` | Admin |
| `rejected` | `draft` | Creator |

**Error Codes**

| Code | Status | Description |
|------|--------|-------------|
| `AGENT_NOT_FOUND` | 404 | Agent ID does not exist |
| `INVALID_STATE_TRANSITION` | 409 | Status transition not allowed |
| `INSUFFICIENT_PERMISSIONS` | 403 | User lacks permission to approve/reject |
| `MISSING_COMMENT` | 400 | Comment required for this transition |

---

### 6. Get Audit History

Retrieve complete audit trail for a blueprint.

```
GET /api/registry/{agentId}/history
```

**Description**
Returns all changes to a blueprint, including creation, approvals, rejections, refinements, deployments, and status transitions, ordered chronologically.

**Path Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `agentId` | string | Yes | Agent identifier |

**Query Parameters**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `version` | string | (all) | Limit history to specific version |
| `event_type` | string | (all) | Filter by event: `created`, `approved`, `rejected`, `refined`, `deployed`, `validation_passed`, `validation_failed` |
| `limit` | integer | 100 | Max events (1–500) |

**Response** (200 OK)

```json
{
  "success": true,
  "data": {
    "agent_id": "[PLACEHOLDER-AGENT-ID]",
    "history": [
      {
        "event_id": "[PLACEHOLDER-EVENT-ID-5]",
        "event_type": "deployed",
        "timestamp": "2026-04-03T08:00:00Z",
        "actor": "automation@intellios.com",
        "version": "1.2.1",
        "details": {
          "deployment_target": "aws-agentcore-prod",
          "status": "success"
        }
      },
      {
        "event_id": "[PLACEHOLDER-EVENT-ID-4]",
        "event_type": "approved",
        "timestamp": "2026-04-02T14:22:00Z",
        "actor": "compliance-lead@company.com",
        "version": "1.2.1",
        "details": {
          "comment": "All governance policies passed. Approved for production deployment.",
          "deployment_target": "aws-agentcore-prod"
        }
      },
      {
        "event_id": "[PLACEHOLDER-EVENT-ID-3]",
        "event_type": "validation_passed",
        "timestamp": "2026-04-02T13:45:00Z",
        "actor": "system",
        "version": "1.2.1",
        "details": {
          "policies_evaluated": 5,
          "violations": 0
        }
      },
      {
        "event_id": "[PLACEHOLDER-EVENT-ID-2]",
        "event_type": "refined",
        "timestamp": "2026-04-02T11:00:00Z",
        "actor": "jane.doe@company.com",
        "version": "1.2.1",
        "previous_version": "1.2.0",
        "details": {
          "refinement": "Add support for batch claims processing"
        }
      },
      {
        "event_id": "[PLACEHOLDER-EVENT-ID-1]",
        "event_type": "created",
        "timestamp": "2026-03-15T09:30:00Z",
        "actor": "jane.doe@company.com",
        "version": "1.1.0",
        "details": {
          "intake_session_id": "[PLACEHOLDER-SESSION-ID]"
        }
      }
    ]
  },
  "meta": {
    "requestId": "[PLACEHOLDER-UUID]",
    "timestamp": "2026-04-05T13:25:00Z"
  }
}
```

**Error Codes**

| Code | Status | Description |
|------|--------|-------------|
| `AGENT_NOT_FOUND` | 404 | Agent ID does not exist |

---

## Lifecycle Status States

| Status | Meaning | Can Refine? | Deployed? |
|--------|---------|------------|-----------|
| `draft` | Initial state after creation or clone | Yes | No |
| `in_review` | Submitted for approval | No | No |
| `approved` | Approved by compliance/management | No | May be deployed |
| `rejected` | Rejected by reviewer | Yes (reset to draft) | No |
| `deprecated` | Superseded by newer version | No | Marked deprecated |

---

## Example: Full Agent Lifecycle

```bash
# 1. List approved agents
curl -X GET 'https://[host]/api/registry?status=approved&limit=10' \
  -H "Authorization: Bearer [TOKEN]"

# 2. Get latest version of agent
curl -X GET https://[host]/api/registry/[AGENT-ID] \
  -H "Authorization: Bearer [TOKEN]" | jq .data.agent.version

# 3. View all versions
curl -X GET https://[host]/api/registry/[AGENT-ID]/versions \
  -H "Authorization: Bearer [TOKEN]"

# 4. Clone for enhancement
curl -X POST https://[host]/api/registry/[AGENT-ID]/clone \
  -H "Authorization: Bearer [TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{
    "new_name": "Agent v2 (Enhanced)",
    "clone_reason": "feature_enhancement"
  }' | jq .data.agent.blueprint_id

# 5. Submit for review (via Blueprints refinement and validation, then)
curl -X PATCH https://[host]/api/registry/[AGENT-ID]/status \
  -H "Authorization: Bearer [TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "in_review",
    "version": "1.3.0",
    "comment": "Ready for review"
  }'

# 6. View audit history
curl -X GET https://[host]/api/registry/[AGENT-ID]/history \
  -H "Authorization: Bearer [TOKEN]"
```

---

## See Also

- [Agent Registry Concept](../../03-core-concepts/agent-blueprint-package.md)
- [Blueprints API](blueprints-api.md) — Generate and refine blueprints
- [Review API](review-api.md) — Approval workflow
