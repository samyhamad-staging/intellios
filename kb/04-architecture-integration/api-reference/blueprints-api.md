---
id: "04-007"
title: "Blueprints API Reference"
slug: "blueprints-api"
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
  - "04-006"
  - "04-009"
  - "03-001"
tags:
  - "api"
  - "blueprint-generation"
  - "agent-blueprint-package"
  - "governance-validation"
  - "async"
feedback_url: "[PLACEHOLDER]"
tldr: "REST API for generating, refining, and validating Agent Blueprint Packages (ABPs) from intake payloads. Trigger governance policy validation and monitor generation status asynchronously."
---

# Blueprints API Reference

> **TL;DR:** Generate Agent Blueprint Packages from intake payloads, refine them with natural language, trigger governance validation, and monitor async status.

## Overview

The Blueprints API enables you to generate, refine, and validate Agent Blueprint Packages (ABPs) from structured intake payloads. All generation and validation operations are asynchronous; clients receive a `202 Accepted` response immediately with an operation ID, then poll for status.

**Base URL:** `https://[your-intellios-host]/api/blueprints`

**Authentication:** All endpoints require `Authorization: Bearer [token]`

**Content-Type:** `application/json`

---

## Endpoints

### 1. Generate Agent Blueprint Package

Generate a new ABP from an intake payload using the Generation Engine.

```
POST /api/blueprints/generate
```

**Description**
Triggers asynchronous generation of a complete ABP from an intake session's payload. The Generation Engine synthesizes the payload into a governance-ready blueprint with tools, workflows, safety constraints, and observability config. Returns a `202 Accepted` with operation ID for polling.

**Request Body**

```json
{
  "intake_session_id": "[PLACEHOLDER-SESSION-ID]",
  "generation_style": "production",
  "options": {
    "include_test_harness": true,
    "include_monitoring": true,
    "safety_level": "strict"
  }
}
```

**Parameters**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `intake_session_id` | string | Yes | ID of intake session with payload |
| `generation_style` | enum | No | `production` (default), `prototype`, `minimal` |
| `options.include_test_harness` | boolean | No | Default: true. Add test harness to blueprint |
| `options.include_monitoring` | boolean | No | Default: true. Add observability hooks |
| `options.safety_level` | enum | No | `strict` (default), `balanced`, `permissive` |

**Response** (202 Accepted)

```json
{
  "success": true,
  "data": {
    "operation": {
      "id": "[PLACEHOLDER-OP-ID]",
      "type": "blueprint_generation",
      "status": "queued",
      "created_at": "2026-04-05T12:00:00Z",
      "blueprint_id": "[PLACEHOLDER-BLUEPRINT-ID]",
      "intake_session_id": "[PLACEHOLDER-SESSION-ID]"
    }
  },
  "meta": {
    "requestId": "[PLACEHOLDER-UUID]",
    "timestamp": "2026-04-05T12:00:00Z"
  }
}
```

Store the `blueprint_id` for future reference. Use it to poll status via `GET /api/blueprints/[id]/status`.

**Error Codes**

| Code | Status | Description |
|------|--------|-------------|
| `SESSION_NOT_FOUND` | 404 | Intake session does not exist |
| `SESSION_NOT_FINALIZED` | 400 | Intake session must be finalized before generation |
| `INVALID_PAYLOAD` | 422 | Intake payload is incomplete or malformed |
| `GENERATION_QUOTA_EXCEEDED` | 429 | Enterprise has exceeded monthly generation quota |

---

### 2. Refine Agent Blueprint Package

Refine an existing ABP using natural language instructions.

```
POST /api/blueprints/{id}/refine
```

**Description**
Applies iterative refinements to a blueprint via natural language. The Refinement Engine modifies tools, workflows, constraints, or safety configs and generates a new blueprint version. Asynchronous operation; returns `202 Accepted`.

**Path Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Blueprint ID |

**Request Body**

```json
{
  "refinement": "Add support for processing claims in batches. The agent should be able to accept a CSV file with multiple claims and process them concurrently.",
  "version_strategy": "patch"
}
```

**Parameters**

| Field | Type | Description |
|-------|------|-------------|
| `refinement` | string | Natural language description of desired changes |
| `version_strategy` | enum | `patch` (default), `minor`, `major` for new version number |

**Response** (202 Accepted)

```json
{
  "success": true,
  "data": {
    "operation": {
      "id": "[PLACEHOLDER-OP-ID]",
      "type": "blueprint_refinement",
      "status": "queued",
      "created_at": "2026-04-05T12:15:00Z",
      "blueprint_id": "[PLACEHOLDER-BLUEPRINT-ID]",
      "version": "1.0.1"
    }
  },
  "meta": {
    "requestId": "[PLACEHOLDER-UUID]",
    "timestamp": "2026-04-05T12:15:00Z"
  }
}
```

**Error Codes**

| Code | Status | Description |
|------|--------|-------------|
| `BLUEPRINT_NOT_FOUND` | 404 | Blueprint does not exist |
| `BLUEPRINT_LOCKED` | 409 | Blueprint is in review/approved state; cannot refine |
| `REFINEMENT_TOO_LONG` | 400 | Refinement exceeds 5,000 characters |

---

### 3. Trigger Governance Validation

Validate a blueprint against enterprise governance policies.

```
POST /api/blueprints/{id}/validate
```

**Description**
Triggers asynchronous validation of a blueprint against all active governance policies. Policies are evaluated deterministically; violations are detailed in the validation report. Returns `202 Accepted`.

**Path Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Blueprint ID |

**Request Body**

```json
{
  "policy_ids": ["[PLACEHOLDER-POLICY-ID-1]", "[PLACEHOLDER-POLICY-ID-2]"],
  "force_revalidate": false
}
```

**Parameters**

| Field | Type | Description |
|-------|------|-------------|
| `policy_ids` | string[] | Optional. Validate against specific policies only. If omitted, uses all active policies. |
| `force_revalidate` | boolean | Optional. Default: false. If true, re-run validation even if recent report cached. |

**Response** (202 Accepted)

```json
{
  "success": true,
  "data": {
    "operation": {
      "id": "[PLACEHOLDER-OP-ID]",
      "type": "governance_validation",
      "status": "queued",
      "created_at": "2026-04-05T12:20:00Z",
      "blueprint_id": "[PLACEHOLDER-BLUEPRINT-ID]"
    }
  },
  "meta": {
    "requestId": "[PLACEHOLDER-UUID]",
    "timestamp": "2026-04-05T12:20:00Z"
  }
}
```

Poll `GET /api/blueprints/[id]/status` to check validation progress.

**Error Codes**

| Code | Status | Description |
|------|--------|-------------|
| `BLUEPRINT_NOT_FOUND` | 404 | Blueprint does not exist |
| `POLICY_NOT_FOUND` | 404 | One or more policy IDs do not exist |
| `VALIDATION_TIMEOUT` | 504 | Validation exceeded time limit (>5 min) |

---

### 4. Get Blueprint Status

Poll the status of a generation, refinement, or validation operation.

```
GET /api/blueprints/{id}/status
```

**Description**
Returns the current status of any in-flight or recently completed operation. Responses vary based on operation type.

**Path Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Blueprint ID |

**Query Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `operation_id` | string | Optional. Poll a specific operation. If omitted, returns status of most recent operation. |

**Response: Generation In Progress** (200 OK)

```json
{
  "success": true,
  "data": {
    "blueprint": {
      "id": "[PLACEHOLDER-BLUEPRINT-ID]",
      "version": "1.0.0",
      "status": "generating",
      "operation": {
        "id": "[PLACEHOLDER-OP-ID]",
        "type": "blueprint_generation",
        "status": "in_progress",
        "progress_percent": 65,
        "started_at": "2026-04-05T12:00:00Z",
        "estimated_completion_at": "2026-04-05T12:02:30Z"
      }
    }
  },
  "meta": {
    "requestId": "[PLACEHOLDER-UUID]",
    "timestamp": "2026-04-05T12:01:00Z"
  }
}
```

**Response: Generation Complete** (200 OK)

```json
{
  "success": true,
  "data": {
    "blueprint": {
      "id": "[PLACEHOLDER-BLUEPRINT-ID]",
      "version": "1.0.0",
      "status": "generated",
      "name": "Claims Auto-Processor v1",
      "description": "Processes insurance claims with policy validation",
      "blueprint": {
        "agent_name": "Claims Auto-Processor",
        "tools": [
          {
            "name": "parse_claim_form",
            "description": "Extract structured data from claim submission forms",
            "type": "rest_api",
            "endpoint": "[PLACEHOLDER-ENDPOINT]"
          }
        ],
        "workflows": [
          {
            "name": "process_claim",
            "steps": ["Parse form", "Validate policy", "Route decision"]
          }
        ],
        "safety_config": {
          "max_retries": 3,
          "timeout_seconds": 30,
          "fallback_behavior": "escalate"
        }
      },
      "operation": {
        "id": "[PLACEHOLDER-OP-ID]",
        "type": "blueprint_generation",
        "status": "succeeded",
        "completed_at": "2026-04-05T12:02:10Z"
      },
      "created_at": "2026-04-05T12:00:00Z",
      "updated_at": "2026-04-05T12:02:10Z"
    }
  },
  "meta": {
    "requestId": "[PLACEHOLDER-UUID]",
    "timestamp": "2026-04-05T12:02:15Z"
  }
}
```

**Response: Validation Complete** (200 OK)

```json
{
  "success": true,
  "data": {
    "blueprint": {
      "id": "[PLACEHOLDER-BLUEPRINT-ID]",
      "version": "1.0.0",
      "status": "validated",
      "validation_report": {
        "status": "passed",
        "policies_evaluated": 3,
        "violations": 0,
        "warnings": 1,
        "policy_results": [
          {
            "policy_id": "[PLACEHOLDER-POLICY-ID-1]",
            "policy_name": "Tool Limit Policy",
            "status": "passed",
            "message": "Blueprint uses 2 tools; policy allows max 10"
          },
          {
            "policy_id": "[PLACEHOLDER-POLICY-ID-2]",
            "policy_name": "Data Residency Policy",
            "status": "passed",
            "message": "All data operations respect EU data residency"
          },
          {
            "policy_id": "[PLACEHOLDER-POLICY-ID-3]",
            "policy_name": "Audit Logging Policy",
            "status": "warning",
            "message": "Audit logging configured but not tested in harness"
          }
        ]
      },
      "operation": {
        "id": "[PLACEHOLDER-OP-ID]",
        "type": "governance_validation",
        "status": "succeeded",
        "completed_at": "2026-04-05T12:20:45Z"
      }
    }
  },
  "meta": {
    "requestId": "[PLACEHOLDER-UUID]",
    "timestamp": "2026-04-05T12:20:50Z"
  }
}
```

**Error Codes**

| Code | Status | Description |
|------|--------|-------------|
| `BLUEPRINT_NOT_FOUND` | 404 | Blueprint does not exist |
| `OPERATION_NOT_FOUND` | 404 | Operation ID not found |

---

## Operation Status Values

| Status | Meaning | Can Poll? |
|--------|---------|-----------|
| `queued` | Operation is waiting to start | Yes |
| `in_progress` | Operation is running | Yes |
| `succeeded` | Operation completed successfully | No, final |
| `failed` | Operation encountered error | No, final |
| `cancelled` | Operation was cancelled by user | No, final |

---

## Polling Strategy

For production workflows, use exponential backoff with jitter:

```javascript
async function pollUntilComplete(blueprintId, maxWaitMs = 300000) {
  const startTime = Date.now();
  let backoffMs = 1000;

  while (Date.now() - startTime < maxWaitMs) {
    const response = await fetch(`/api/blueprints/${blueprintId}/status`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();

    if (data.data.blueprint.status === 'succeeded' ||
        data.data.blueprint.status === 'failed') {
      return data.data.blueprint;
    }

    // Exponential backoff with jitter: 1s, 2s, 4s, 8s, 16s (max)
    const jitterMs = Math.random() * backoffMs * 0.1;
    await new Promise(r => setTimeout(r, backoffMs + jitterMs));
    backoffMs = Math.min(backoffMs * 2, 16000);
  }

  throw new Error('Polling timeout');
}
```

---

## Validation Report Schema

The `validation_report` object returned after validation contains:

```json
{
  "status": "passed|failed|warning",
  "policies_evaluated": 5,
  "violations": 2,
  "warnings": 1,
  "policy_results": [
    {
      "policy_id": "[PLACEHOLDER]",
      "policy_name": "Max Tools",
      "status": "passed|failed|warning",
      "message": "Human-readable result",
      "violated_rules": [
        {
          "rule_id": "[PLACEHOLDER]",
          "rule_name": "max_tools",
          "condition": "blueprint.tools.length <= 10",
          "actual_value": 8,
          "threshold": 10
        }
      ]
    }
  ]
}
```

---

## Example: Full Generation Workflow

```bash
# 1. Generate ABP from intake payload
curl -X POST https://[host]/api/blueprints/generate \
  -H "Authorization: Bearer [TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{
    "intake_session_id": "[SESSION-ID]",
    "generation_style": "production",
    "options": {"include_monitoring": true}
  }' | jq -r .data.operation.blueprint_id

# 2. Poll status until complete (or use script above)
for i in {1..30}; do
  curl -X GET https://[host]/api/blueprints/[BLUEPRINT-ID]/status \
    -H "Authorization: Bearer [TOKEN]" | jq .data.blueprint.status
  sleep 2
done

# 3. Trigger governance validation
curl -X POST https://[host]/api/blueprints/[BLUEPRINT-ID]/validate \
  -H "Authorization: Bearer [TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{"force_revalidate": false}'

# 4. Retrieve validation report (poll status again)
curl -X GET https://[host]/api/blueprints/[BLUEPRINT-ID]/status \
  -H "Authorization: Bearer [TOKEN]" | jq .data.blueprint.validation_report
```

---

## See Also

- [Agent Blueprint Package Concept](../../03-core-concepts/agent-blueprint-package.md)
- [Governance API](governance-api.md) — Policy management
- [Intake API](intake-api.md) — Payload source
- [Registry API](registry-api.md) — Store and version blueprints
