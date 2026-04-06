---
id: "04-010"
title: "Review API Reference"
slug: "review-api"
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
  - "04-008"
  - "03-004"
tags:
  - "api"
  - "blueprint-review"
  - "approval-workflow"
  - "governance"
  - "audit"
feedback_url: "https://feedback.intellios.ai/kb"
tldr: "REST API for managing the blueprint review and approval workflow. Retrieve review queues, approve/reject blueprints, and request design changes with complete audit trails."
---

# Review API Reference

> **TL;DR:** Manage the blueprint review and approval workflow: retrieve review queues, approve/reject blueprints, and request design changes with audit trails.

## Overview

The Review API powers the multi-step blueprint approval workflow. It provides a queue of blueprints awaiting review, endpoints for approving or rejecting with comments, and request-changes workflow for iterative design refinement. All reviewer actions are logged for compliance and audit purposes.

**Base URL:** `https://[your-intellios-host]/api/review`

**Authentication:** All endpoints require `Authorization: Bearer [token]` with `review:approver` or `review:admin` scope

**Content-Type:** `application/json`

---

## Endpoints

### 1. Get Review Queue

Retrieve all blueprints awaiting review with filtering and pagination.

```
GET /api/review
```

**Description**
Returns a paginated list of blueprints in `in_review` status, ordered by submission date. Includes governance validation reports, submitter info, and review history. Reviewers can filter by priority, validation status, or date range.

**Query Parameters**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `limit` | integer | 20 | Results per page (1–100) |
| `sort` | string | `submitted_at` | Sort field: `submitted_at`, `priority`, `validation_status` |
| `order` | enum | `desc` | Sort order: `asc`, `desc` |
| `filter_validation_status` | enum | (none) | Filter by validation result: `passed`, `warning`, `failed` |
| `filter_priority` | enum | (none) | Filter by priority: `low`, `medium`, `high`, `critical` |
| `filter_submitted_after` | ISO-8601 | (none) | Filter blueprints submitted after date |
| `assigned_to_me` | boolean | false | Show only blueprints assigned to current reviewer |

**Example Request**

```bash
GET /api/review?filter_validation_status=passed&filter_priority=high&sort=submitted_at&order=asc
```

**Response** (200 OK)

```json
{
  "success": true,
  "data": {
    "review_items": [
      {
        "blueprint_id": "[PLACEHOLDER-BLUEPRINT-ID-1]",
        "agent_id": "[PLACEHOLDER-AGENT-ID-1]",
        "name": "Claims Auto-Processor v2",
        "description": "Enhanced with batch processing",
        "version": "1.3.0",
        "status": "in_review",
        "created_by": "jane.doe@company.com",
        "submitted_at": "2026-04-05T10:00:00Z",
        "priority": "high",
        "validation_status": "passed",
        "validation_warnings": 0,
        "validation_violations": 0,
        "review_status": "awaiting_review",
        "assigned_to": ["compliance-lead@company.com"],
        "review_deadline": "2026-04-08T17:00:00Z",
        "days_in_queue": 0
      },
      {
        "blueprint_id": "[PLACEHOLDER-BLUEPRINT-ID-2]",
        "agent_id": "[PLACEHOLDER-AGENT-ID-2]",
        "name": "Document Router",
        "description": "Routes documents to appropriate processing agents",
        "version": "1.0.0",
        "status": "in_review",
        "created_by": "alex.smith@company.com",
        "submitted_at": "2026-04-04T14:30:00Z",
        "priority": "medium",
        "validation_status": "warning",
        "validation_warnings": 1,
        "validation_violations": 0,
        "review_status": "awaiting_review",
        "assigned_to": null,
        "review_deadline": "2026-04-07T17:00:00Z",
        "days_in_queue": 1
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 12,
      "pages": 1
    },
    "summary": {
      "total_in_queue": 12,
      "passed_validation": 10,
      "with_warnings": 2,
      "overdue": 1
    }
  },
  "meta": {
    "requestId": "[PLACEHOLDER-UUID]",
    "timestamp": "2026-04-05T14:30:00Z"
  }
}
```

**Error Codes**

| Code | Status | Description |
|------|--------|-------------|
| `INVALID_FILTER` | 400 | Filter value not recognized |

---

### 2. Approve Blueprint

Approve a blueprint and transition it to the approved state.

```
POST /api/review/{agentId}/approve
```

**Description**
Approves a blueprint for production use. Only reviewers with `review:approver` scope can approve. Updates the blueprint status to `approved` and triggers optional automated deployment. Records the approval with timestamp, reviewer name, and comment for audit.

**Path Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `agentId` | string | Yes | Agent identifier |

**Request Body**

```json
{
  "version": "1.3.0",
  "comment": "All governance policies passed. Design is sound. Approved for production deployment.",
  "deployment_target": "aws-agentcore-prod",
  "auto_deploy": true,
  "conditions": []
}
```

**Parameters**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `version` | string | No | Target version (latest if omitted) |
| `comment` | string | No | Optional reviewer comment visible to stakeholders |
| `deployment_target` | string | No | Runtime target (e.g., `aws-agentcore-prod`, `azure-ai-foundry-dev`) |
| `auto_deploy` | boolean | No | Automatically deploy after approval (default: false) |
| `conditions` | array | No | Conditional approvals (e.g., "only deploy if cost < $500/month") |

**Response** (200 OK)

```json
{
  "success": true,
  "data": {
    "approval": {
      "blueprint_id": "[PLACEHOLDER-BLUEPRINT-ID]",
      "agent_id": "[PLACEHOLDER-AGENT-ID]",
      "version": "1.3.0",
      "status": "approved",
      "approved_by": "compliance-lead@company.com",
      "approved_at": "2026-04-05T14:35:00Z",
      "comment": "All governance policies passed. Design is sound. Approved for production deployment.",
      "deployment_target": "aws-agentcore-prod",
      "auto_deploy": true,
      "deployment_status": "queued",
      "deployment_started_at": "2026-04-05T14:35:05Z"
    }
  },
  "meta": {
    "requestId": "[PLACEHOLDER-UUID]",
    "timestamp": "2026-04-05T14:35:00Z"
  }
}
```

**Error Codes**

| Code | Status | Description |
|------|--------|-------------|
| `AGENT_NOT_FOUND` | 404 | Agent ID does not exist |
| `BLUEPRINT_NOT_IN_REVIEW` | 409 | Blueprint is not in `in_review` status |
| `INSUFFICIENT_PERMISSIONS` | 403 | User lacks `review:approver` scope |
| `VALIDATION_NOT_PASSED` | 422 | Governance validation failed; cannot approve |
| `INVALID_DEPLOYMENT_TARGET` | 400 | Deployment target not configured |

---

### 3. Reject Blueprint

Reject a blueprint and transition it back to draft for revision.

```
POST /api/review/{agentId}/reject
```

**Description**
Rejects a blueprint during review and transitions it back to `draft` status. Allows the designer to make corrections based on reviewer feedback. Rejection is recorded with comment and reason for audit compliance.

**Path Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `agentId` | string | Yes | Agent identifier |

**Request Body**

```json
{
  "version": "1.3.0",
  "comment": "Tool configuration exceeds approved limit. Remove 5 tools and resubmit.",
  "rejection_reason": "governance_violation",
  "required_changes": [
    {
      "category": "tools",
      "description": "Reduce tool count from 15 to max 10"
    },
    {
      "category": "cost",
      "description": "Monthly cost estimate exceeds budget"
    }
  ]
}
```

**Parameters**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `version` | string | No | Target version (latest if omitted) |
| `comment` | string | Yes | Rejection reason visible to designer |
| `rejection_reason` | enum | No | Category: `governance_violation`, `design_issue`, `cost_concern`, `security_issue`, `other` |
| `required_changes` | array | No | List of specific changes needed (optional, for clarity) |

**Response** (200 OK)

```json
{
  "success": true,
  "data": {
    "rejection": {
      "blueprint_id": "[PLACEHOLDER-BLUEPRINT-ID]",
      "agent_id": "[PLACEHOLDER-AGENT-ID]",
      "version": "1.3.0",
      "status": "draft",
      "rejected_by": "compliance-lead@company.com",
      "rejected_at": "2026-04-05T14:40:00Z",
      "comment": "Tool configuration exceeds approved limit. Remove 5 tools and resubmit.",
      "rejection_reason": "governance_violation",
      "required_changes": [
        {
          "category": "tools",
          "description": "Reduce tool count from 15 to max 10"
        }
      ]
    }
  },
  "meta": {
    "requestId": "[PLACEHOLDER-UUID]",
    "timestamp": "2026-04-05T14:40:00Z"
  }
}
```

**Notification**
The blueprint creator receives an email notification with the rejection comment and required changes.

**Error Codes**

| Code | Status | Description |
|------|--------|-------------|
| `AGENT_NOT_FOUND` | 404 | Agent ID does not exist |
| `BLUEPRINT_NOT_IN_REVIEW` | 409 | Blueprint is not in `in_review` status |
| `INSUFFICIENT_PERMISSIONS` | 403 | User lacks `review:approver` scope |

---

### 4. Request Changes

Request design changes while keeping the blueprint in review (iterative refinement).

```
POST /api/review/{agentId}/request-changes
```

**Description**
Requests specific changes to a blueprint without rejecting it entirely. The blueprint remains in `in_review` status but is flagged for changes. The designer can refine directly while the blueprint stays in the queue. Useful for minor iterations.

**Path Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `agentId` | string | Yes | Agent identifier |

**Request Body**

```json
{
  "version": "1.3.0",
  "comment": "Please add audit logging to the cost estimate tool and re-validate.",
  "changes_requested": [
    {
      "component": "tools",
      "item": "cost_estimate_tool",
      "change": "Add audit_logging: enabled"
    }
  ],
  "re_review_deadline": "2026-04-07T17:00:00Z",
  "allow_inline_refinement": true
}
```

**Parameters**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `version` | string | No | Target version (latest if omitted) |
| `comment` | string | Yes | Description of requested changes |
| `changes_requested` | array | No | Specific change requests (optional detail) |
| `re_review_deadline` | ISO-8601 | No | When changes must be submitted by |
| `allow_inline_refinement` | boolean | No | Allow designer to refine while in review (default: true) |

**Response** (200 OK)

```json
{
  "success": true,
  "data": {
    "review_update": {
      "blueprint_id": "[PLACEHOLDER-BLUEPRINT-ID]",
      "agent_id": "[PLACEHOLDER-AGENT-ID]",
      "version": "1.3.0",
      "status": "in_review",
      "review_status": "changes_requested",
      "requested_by": "compliance-lead@company.com",
      "requested_at": "2026-04-05T14:45:00Z",
      "comment": "Please add audit logging to the cost estimate tool and re-validate.",
      "changes_requested": [
        {
          "component": "tools",
          "item": "cost_estimate_tool",
          "change": "Add audit_logging: enabled"
        }
      ],
      "re_review_deadline": "2026-04-07T17:00:00Z",
      "allow_inline_refinement": true
    }
  },
  "meta": {
    "requestId": "[PLACEHOLDER-UUID]",
    "timestamp": "2026-04-05T14:45:00Z"
  }
}
```

**Notification**
The blueprint creator receives a notification that changes have been requested. If `allow_inline_refinement` is true, they can use the Blueprints API to refine immediately without leaving review.

**Error Codes**

| Code | Status | Description |
|------|--------|-------------|
| `AGENT_NOT_FOUND` | 404 | Agent ID does not exist |
| `BLUEPRINT_NOT_IN_REVIEW` | 409 | Blueprint is not in `in_review` status |
| `INSUFFICIENT_PERMISSIONS` | 403 | User lacks `review:approver` scope |

---

## Review Queue States

| Status | Meaning | Valid Actions |
|--------|---------|---------------|
| `awaiting_review` | Submitted; awaiting first review | approve, reject, request_changes |
| `changes_requested` | Reviewer requested changes | approve (after refinement), reject, request_changes (again) |
| `approved` | Approved by reviewer | (none; terminal) |
| `rejected` | Rejected; returned to draft | (none; back in draft state) |

---

## Review Workflow Example

```
┌─────────────────┐
│     Draft       │  Designer creates blueprint
└────────┬────────┘
         │ Submit for review (Registry API)
         ▼
┌──────────────────┐
│   In Review      │  Blueprint waits in queue
└────────┬─────────┘
         │
    ┌────┴─────┬──────────┐
    │           │          │
    ▼           ▼          ▼
Approve    Reject    Request Changes
    │           │          │
    │           │          └──► Awaiting Changes
    │           │               │
    │           │               └──► Re-submit ──┐
    │           │                                 │
    │           └─────────────► Draft ────────────┘
    │
    ▼
┌─────────────┐
│  Approved   │  Ready for deployment
└─────────────┘
```

---

## Example: Complete Review Workflow

```bash
# 1. Get review queue
curl -X GET 'https://[host]/api/review?filter_priority=high' \
  -H "Authorization: Bearer [TOKEN]" | jq .data.review_items

# 2. Approve a blueprint
curl -X POST https://[host]/api/review/[AGENT-ID]/approve \
  -H "Authorization: Bearer [TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{
    "comment": "Approved for production deployment",
    "deployment_target": "aws-agentcore-prod",
    "auto_deploy": true
  }'

# Or: Request changes instead
curl -X POST https://[host]/api/review/[AGENT-ID]/request-changes \
  -H "Authorization: Bearer [TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{
    "comment": "Add audit logging and re-validate",
    "re_review_deadline": "2026-04-07T17:00:00Z"
  }'

# Or: Reject with feedback
curl -X POST https://[host]/api/review/[AGENT-ID]/reject \
  -H "Authorization: Bearer [TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{
    "comment": "Tool count exceeds policy. Reduce to 10 maximum.",
    "rejection_reason": "governance_violation"
  }'
```

---

## Audit & Compliance

All reviewer actions (approve, reject, request-changes) are logged and immutable:

- **Timestamp:** Exact UTC time of action
- **Actor:** Email of reviewer who took action
- **Action:** Specific action taken
- **Comment:** Reviewer's reasoning
- **Blueprint Version:** Which version was reviewed
- **Request ID:** Correlation ID for tracing

Access audit logs via the Registry API `GET /api/registry/{agentId}/history`.

---

## Notifications

When review actions occur:

1. **Approval:** Creator receives notification; deployment begins if `auto_deploy: true`
2. **Rejection:** Creator receives notification with required changes; blueprint returns to draft
3. **Request Changes:** Creator receives notification; can refine immediately if `allow_inline_refinement: true`

Notifications are sent via email and in-app dashboard. Configure notification preferences in **Admin Console** → **Notifications**.

---

## See Also

- [Blueprint Review UI](../../03-core-concepts/agent-lifecycle-states.md) — Frontend for review workflow
- [Registry API](registry-api.md) — Check blueprint status, retrieve full details
- [Governance API](governance-api.md) — View validation reports before approving
- [Compliance & Governance](../../05-governance-compliance/_index.md) — Policy context
