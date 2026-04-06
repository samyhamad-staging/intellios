---
id: "04-009"
title: "Governance API Reference"
slug: "governance-api"
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
  - "05-001"
  - "05-002"
tags:
  - "api"
  - "governance-policies"
  - "policy-validation"
  - "compliance"
  - "enterprise-controls"
feedback_url: "https://feedback.intellios.ai/kb"
tldr: "REST API for defining, managing, and applying enterprise governance policies. Create policy rules, validate blueprints, and retrieve detailed validation reports with violation details."
---

# Governance API Reference

> **TL;DR:** Define and manage enterprise governance policies. Validate blueprints against policies and retrieve detailed violation reports.

## Overview

The Governance API enables you to create, manage, and apply enterprise governance policies that automatically validate Agent Blueprint Packages during the design and approval process. Policies define rules for tool usage, data residency, audit logging, cost limits, and other enterprise controls.

**Base URL:** `https://[your-intellios-host]/api/governance`

**Authentication:** All endpoints require `Authorization: Bearer [token]` with `governance:admin` scope

**Content-Type:** `application/json`

---

## Endpoints

### 1. List Governance Policies

Retrieve all policies for the enterprise with filtering and pagination.

```
GET /api/governance/policies
```

**Description**
Returns a paginated list of all active governance policies. Supports filtering by name, status, and creation date.

**Query Parameters**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `limit` | integer | 20 | Results per page (1–100) |
| `sort` | string | `created_at` | Sort field: `created_at`, `updated_at`, `name` |
| `order` | enum | `desc` | Sort order: `asc`, `desc` |
| `status` | enum | `active` | Filter by status: `active`, `archived`, `draft` |
| `search` | string | (none) | Full-text search on name and description |

**Response** (200 OK)

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "[PLACEHOLDER-POLICY-ID-1]",
        "name": "Tool Limit Policy",
        "description": "Limits the number of tools an agent can access",
        "status": "active",
        "version": "1.0.0",
        "created_at": "2026-02-01T10:00:00Z",
        "updated_at": "2026-04-01T14:30:00Z",
        "created_by": "governance@company.com",
        "enforcement_level": "strict",
        "rules_count": 1
      },
      {
        "id": "[PLACEHOLDER-POLICY-ID-2]",
        "name": "Data Residency Policy",
        "description": "Enforces data storage in EU region",
        "status": "active",
        "version": "2.1.0",
        "created_at": "2026-01-15T08:00:00Z",
        "updated_at": "2026-03-20T11:15:00Z",
        "created_by": "governance@company.com",
        "enforcement_level": "strict",
        "rules_count": 3
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 2,
      "pages": 1
    }
  },
  "meta": {
    "requestId": "[PLACEHOLDER-UUID]",
    "timestamp": "2026-04-05T14:00:00Z"
  }
}
```

---

### 2. Create Governance Policy

Create a new governance policy with rule definitions.

```
POST /api/governance/policies
```

**Description**
Creates a new policy with an array of rules. Policies use a declarative rule language for evaluating blueprint attributes. Rules are evaluated deterministically during validation.

**Request Body**

```json
{
  "name": "Tool Limit Policy",
  "description": "Limits the number of tools an agent can access to reduce attack surface",
  "rules": [
    {
      "id": "max_tools",
      "name": "Maximum Tools",
      "description": "Blueprint cannot define more than 10 tools",
      "condition": "blueprint.tools.length <= 10",
      "violation_message": "Blueprint defines {actual} tools; policy allows maximum {threshold}",
      "severity": "error",
      "remediation": "Remove unnecessary tools or request exception from security team"
    }
  ],
  "enforcement_level": "strict",
  "applies_to_statuses": ["draft", "in_review", "approved"]
}
```

**Parameters**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Policy name (unique) |
| `description` | string | No | Policy description |
| `rules` | array | Yes | Array of rule objects (see rule schema below) |
| `enforcement_level` | enum | No | `strict` (reject violations), `warning` (log only), `advisory` (log info) |
| `applies_to_statuses` | array | No | Blueprint statuses to validate: `draft`, `in_review`, `approved` (all if omitted) |

**Rule Schema**

```json
{
  "id": "unique_rule_id",
  "name": "Display name",
  "description": "Explanation of the rule",
  "condition": "Blueprint attribute expression",
  "violation_message": "Message with {actual} and {threshold} placeholders",
  "severity": "error|warning|info",
  "remediation": "How to fix violations"
}
```

**Condition Language**

Rules use a simple expression language to evaluate blueprint attributes:

| Operator | Example | Meaning |
|----------|---------|---------|
| `.length` | `blueprint.tools.length <= 10` | Array/object size |
| `<=`, `>=`, `==`, `!=` | `blueprint.cost_estimate <= 1000` | Comparison operators |
| `.includes()` | `blueprint.deployment_region.includes("eu")` | String array membership |
| `.every()` | `blueprint.tools.every(t => t.requires_auth)` | All elements match |
| `.some()` | `blueprint.tools.some(t => t.type == "external_api")` | At least one matches |

**Response** (201 Created)

```json
{
  "success": true,
  "data": {
    "policy": {
      "id": "[PLACEHOLDER-POLICY-ID]",
      "name": "Tool Limit Policy",
      "description": "Limits the number of tools an agent can access",
      "status": "active",
      "version": "1.0.0",
      "created_at": "2026-04-05T14:05:00Z",
      "created_by": "governance@company.com",
      "enforcement_level": "strict",
      "applies_to_statuses": ["draft", "in_review", "approved"],
      "rules": [
        {
          "id": "max_tools",
          "name": "Maximum Tools",
          "condition": "blueprint.tools.length <= 10",
          "severity": "error"
        }
      ]
    }
  },
  "meta": {
    "requestId": "[PLACEHOLDER-UUID]",
    "timestamp": "2026-04-05T14:05:00Z"
  }
}
```

**Error Codes**

| Code | Status | Description |
|------|--------|-------------|
| `POLICY_NAME_EXISTS` | 409 | Policy name already exists |
| `INVALID_RULE_SYNTAX` | 400 | Rule condition has syntax error |
| `INVALID_ENFORCEMENT_LEVEL` | 400 | Enforcement level not recognized |

---

### 3. Get Governance Policy

Retrieve a specific policy by ID.

```
GET /api/governance/policies/{id}
```

**Description**
Returns the full policy definition including all rules, metadata, and usage statistics.

**Path Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Policy ID |

**Response** (200 OK)

```json
{
  "success": true,
  "data": {
    "policy": {
      "id": "[PLACEHOLDER-POLICY-ID]",
      "name": "Tool Limit Policy",
      "description": "Limits the number of tools an agent can access",
      "status": "active",
      "version": "1.0.0",
      "created_at": "2026-02-01T10:00:00Z",
      "updated_at": "2026-04-01T14:30:00Z",
      "created_by": "governance@company.com",
      "enforcement_level": "strict",
      "applies_to_statuses": ["draft", "in_review", "approved"],
      "rules": [
        {
          "id": "max_tools",
          "name": "Maximum Tools",
          "description": "Blueprint cannot define more than 10 tools",
          "condition": "blueprint.tools.length <= 10",
          "violation_message": "Blueprint defines {actual} tools; policy allows maximum {threshold}",
          "severity": "error",
          "remediation": "Remove unnecessary tools or request exception from security team",
          "stats": {
            "violations_last_30_days": 2,
            "blueprints_validated": 45
          }
        }
      ],
      "stats": {
        "blueprints_evaluated": 245,
        "violations_detected": 8,
        "violations_last_30_days": 2,
        "last_violation_at": "2026-04-02T09:30:00Z"
      }
    }
  },
  "meta": {
    "requestId": "[PLACEHOLDER-UUID]",
    "timestamp": "2026-04-05T14:10:00Z"
  }
}
```

**Error Codes**

| Code | Status | Description |
|------|--------|-------------|
| `POLICY_NOT_FOUND` | 404 | Policy ID does not exist |

---

### 4. Update Governance Policy

Update an existing policy's rules or settings.

```
PUT /api/governance/policies/{id}
```

**Description**
Updates a policy's rules, enforcement level, or other settings. Creates a new policy version automatically (semantic versioning). Previous versions are retained for audit purposes.

**Path Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Policy ID |

**Request Body**

```json
{
  "description": "Limits the number of tools an agent can access to reduce attack surface (updated)",
  "rules": [
    {
      "id": "max_tools",
      "name": "Maximum Tools",
      "description": "Blueprint cannot define more than 10 tools",
      "condition": "blueprint.tools.length <= 10",
      "violation_message": "Blueprint defines {actual} tools; policy allows maximum {threshold}",
      "severity": "error",
      "remediation": "Remove unnecessary tools or request exception from security team"
    },
    {
      "id": "no_dangerous_tools",
      "name": "Dangerous Tools Prohibited",
      "description": "Cannot use shell_execution or code_evaluation tools",
      "condition": "!blueprint.tools.some(t => ['shell_execution', 'code_evaluation'].includes(t.name))",
      "violation_message": "Policy prohibits dangerous tools: {tool_names}",
      "severity": "error",
      "remediation": "Remove dangerous tool from blueprint"
    }
  ],
  "enforcement_level": "strict",
  "change_reason": "Added rule prohibiting dangerous tools"
}
```

**Response** (200 OK)

```json
{
  "success": true,
  "data": {
    "policy": {
      "id": "[PLACEHOLDER-POLICY-ID]",
      "name": "Tool Limit Policy",
      "version": "1.1.0",
      "status": "active",
      "created_at": "2026-02-01T10:00:00Z",
      "updated_at": "2026-04-05T14:15:00Z",
      "updated_by": "governance@company.com",
      "rules": [
        {
          "id": "max_tools",
          "name": "Maximum Tools",
          "severity": "error"
        },
        {
          "id": "no_dangerous_tools",
          "name": "Dangerous Tools Prohibited",
          "severity": "error"
        }
      ],
      "change_history": [
        {
          "version": "1.1.0",
          "timestamp": "2026-04-05T14:15:00Z",
          "change_reason": "Added rule prohibiting dangerous tools",
          "updated_by": "governance@company.com"
        }
      ]
    }
  },
  "meta": {
    "requestId": "[PLACEHOLDER-UUID]",
    "timestamp": "2026-04-05T14:15:00Z"
  }
}
```

**Error Codes**

| Code | Status | Description |
|------|--------|-------------|
| `POLICY_NOT_FOUND` | 404 | Policy ID does not exist |
| `INVALID_RULE_SYNTAX` | 400 | Rule condition has syntax error |

---

### 5. Validate Blueprint Against Policies

Synchronously validate a blueprint against a set of policies.

```
POST /api/governance/validate
```

**Description**
Evaluates a blueprint's attributes against specified policies. This is a synchronous endpoint used for quick validation during design. For async validation during blueprint generation, use the Blueprints API.

**Request Body**

```json
{
  "blueprint": {
    "agent_name": "Claims Auto-Processor",
    "tools": [
      {
        "name": "parse_claim_form",
        "type": "rest_api"
      },
      {
        "name": "validate_policy",
        "type": "rest_api"
      }
    ],
    "deployment_region": "eu-west-1",
    "cost_estimate": 450
  },
  "policy_ids": ["[PLACEHOLDER-POLICY-ID-1]", "[PLACEHOLDER-POLICY-ID-2]"]
}
```

**Parameters**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `blueprint` | object | Yes | Blueprint to validate (partial or full ABP) |
| `policy_ids` | array | No | Specific policies to validate (all if omitted) |

**Response** (200 OK)

```json
{
  "success": true,
  "data": {
    "validation_report": {
      "blueprint_id": null,
      "status": "passed",
      "timestamp": "2026-04-05T14:20:00Z",
      "policies_evaluated": 2,
      "violations": 0,
      "warnings": 0,
      "policy_results": [
        {
          "policy_id": "[PLACEHOLDER-POLICY-ID-1]",
          "policy_name": "Tool Limit Policy",
          "status": "passed",
          "message": "Blueprint uses 2 tools; policy allows maximum 10",
          "rules_evaluated": 1
        },
        {
          "policy_id": "[PLACEHOLDER-POLICY-ID-2]",
          "policy_name": "Data Residency Policy",
          "status": "passed",
          "message": "Deployment region eu-west-1 matches policy requirement",
          "rules_evaluated": 2
        }
      ]
    }
  },
  "meta": {
    "requestId": "[PLACEHOLDER-UUID]",
    "timestamp": "2026-04-05T14:20:00Z"
  }
}
```

**Response with Violations** (200 OK)

```json
{
  "success": true,
  "data": {
    "validation_report": {
      "status": "failed",
      "violations": 1,
      "warnings": 1,
      "policy_results": [
        {
          "policy_id": "[PLACEHOLDER-POLICY-ID-1]",
          "policy_name": "Tool Limit Policy",
          "status": "failed",
          "violated_rules": [
            {
              "rule_id": "max_tools",
              "rule_name": "Maximum Tools",
              "severity": "error",
              "condition": "blueprint.tools.length <= 10",
              "actual_value": 15,
              "threshold": 10,
              "violation_message": "Blueprint defines 15 tools; policy allows maximum 10",
              "remediation": "Remove unnecessary tools or request exception from security team"
            }
          ]
        },
        {
          "policy_id": "[PLACEHOLDER-POLICY-ID-2]",
          "policy_name": "Data Residency Policy",
          "status": "warning",
          "violated_rules": [
            {
              "rule_id": "audit_logging",
              "rule_name": "Audit Logging Required",
              "severity": "warning",
              "condition": "blueprint.observability.audit_logging.enabled == true",
              "actual_value": false,
              "violation_message": "Audit logging not configured (warning only)",
              "remediation": "Enable audit logging in blueprint observability configuration"
            }
          ]
        }
      ]
    }
  }
}
```

**Error Codes**

| Code | Status | Description |
|------|--------|-------------|
| `POLICY_NOT_FOUND` | 404 | One or more policy IDs do not exist |
| `INVALID_BLUEPRINT` | 400 | Blueprint format malformed |

---

### 6. Get Validation Report for Blueprint

Retrieve a previously generated validation report for a blueprint.

```
GET /api/governance/validate/{blueprintId}
```

**Description**
Returns the most recent validation report for a blueprint, including all rule evaluations and violations. Useful for checking compliance status without re-running validation.

**Path Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `blueprintId` | string | Yes | Blueprint ID |

**Query Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `include_history` | boolean | Include all historical validation reports |

**Response** (200 OK)

```json
{
  "success": true,
  "data": {
    "report": {
      "blueprint_id": "[PLACEHOLDER-BLUEPRINT-ID]",
      "blueprint_version": "1.2.1",
      "report_id": "[PLACEHOLDER-REPORT-ID]",
      "status": "passed",
      "generated_at": "2026-04-02T13:45:00Z",
      "validated_by": "system",
      "policies_evaluated": 5,
      "violations": 0,
      "warnings": 1,
      "policy_results": [
        {
          "policy_id": "[PLACEHOLDER-POLICY-ID-1]",
          "policy_name": "Tool Limit Policy",
          "version": "1.0.0",
          "status": "passed",
          "rules_evaluated": 1
        },
        {
          "policy_id": "[PLACEHOLDER-POLICY-ID-2]",
          "policy_name": "Data Residency Policy",
          "version": "2.1.0",
          "status": "passed",
          "rules_evaluated": 3
        }
      ]
    }
  },
  "meta": {
    "requestId": "[PLACEHOLDER-UUID]",
    "timestamp": "2026-04-05T14:25:00Z"
  }
}
```

**Error Codes**

| Code | Status | Description |
|------|--------|-------------|
| `BLUEPRINT_NOT_FOUND` | 404 | Blueprint does not exist |
| `REPORT_NOT_FOUND` | 404 | No validation report for blueprint |

---

## Policy Rule Examples

### Tool Limit
```json
{
  "id": "max_tools",
  "name": "Maximum Tools",
  "condition": "blueprint.tools.length <= 10",
  "severity": "error"
}
```

### Dangerous Tools Prohibited
```json
{
  "id": "no_dangerous_tools",
  "name": "Dangerous Tools Prohibited",
  "condition": "!blueprint.tools.some(t => ['shell_execution', 'code_evaluation'].includes(t.name))",
  "severity": "error"
}
```

### Data Residency
```json
{
  "id": "eu_residency",
  "name": "EU Data Residency",
  "condition": "blueprint.deployment_region.includes('eu')",
  "severity": "error"
}
```

### Cost Limit
```json
{
  "id": "monthly_cost",
  "name": "Monthly Cost Limit",
  "condition": "blueprint.cost_estimate <= 5000",
  "severity": "warning"
}
```

### Audit Logging Required
```json
{
  "id": "audit_logging",
  "name": "Audit Logging Required",
  "condition": "blueprint.observability.audit_logging.enabled == true",
  "severity": "error"
}
```

---

## Example: Policy Management Workflow

```bash
# 1. Create a governance policy
curl -X POST https://[host]/api/governance/policies \
  -H "Authorization: Bearer [TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tool Limit Policy",
    "rules": [{
      "id": "max_tools",
      "condition": "blueprint.tools.length <= 10",
      "severity": "error"
    }]
  }' | jq .data.policy.id

# 2. List all policies
curl -X GET https://[host]/api/governance/policies \
  -H "Authorization: Bearer [TOKEN]"

# 3. Get specific policy
curl -X GET https://[host]/api/governance/policies/[POLICY-ID] \
  -H "Authorization: Bearer [TOKEN]"

# 4. Validate blueprint against policies
curl -X POST https://[host]/api/governance/validate \
  -H "Authorization: Bearer [TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{
    "blueprint": {"tools": [{...}, {...}]},
    "policy_ids": ["[POLICY-ID]"]
  }' | jq .data.validation_report

# 5. Update policy with new rule
curl -X PUT https://[host]/api/governance/policies/[POLICY-ID] \
  -H "Authorization: Bearer [TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{
    "rules": [{...}, {...}],
    "change_reason": "Added new compliance requirement"
  }'
```

---

## See Also

- [Governance Validator Concept](../../03-core-concepts/policy-engine.md)
- [Compliance & Governance](../../05-governance-compliance/_index.md)
- [Policy Best Practices](../../05-governance-compliance/policy-authoring-guide.md)
- [Blueprints API](blueprints-api.md) — Async validation during generation
