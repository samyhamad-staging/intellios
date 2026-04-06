---
id: 03-004
title: 'Policy Expression Language: Syntax and Operator Reference'
slug: policy-expression-language
type: reference
audiences:
- engineering
- compliance
status: published
version: 1.0.0
platform_version: 1.2.0
created: '2026-04-05'
updated: '2026-04-05'
author: Intellios
reviewers: []
tags:
- policy
- rules
- operators
- expression-language
- governance
- field-paths
- severity
- governance-as-code
prerequisites:
- 03-001
- 03-002
related:
- 03-003
- 03-002
- 03-001
next_steps:
- 05-010
- 03-003
feedback_url: https://feedback.intellios.ai/kb
tldr: 'The Policy Expression Language is Intellios''s structured rule system for expressing
  governance constraints. It defines 11 deterministic operators (exists, equals, contains,
  matches, count_gte, and more) that evaluate Agent Blueprint Package fields using
  dot-notation paths. Rules have severity levels (error, warning) that determine lifecycle
  gates and reporting. No AI inference; purely deterministic evaluation. Same ABP
  + same policies = same result, always.

  '
---


# Policy Expression Language: Syntax and Operator Reference

> **TL;DR:** The Policy Expression Language is Intellios's structured rule system for expressing governance constraints. It defines 11 deterministic operators (exists, equals, contains, matches, count_gte, and more) that evaluate Agent Blueprint Package fields using dot-notation paths. Rules have severity levels (error, warning) that determine lifecycle gates and reporting. No AI inference; purely deterministic evaluation.

## Overview

The Policy Expression Language enables enterprises to define governance rules as structured, machine-readable policy rules. Each rule evaluates a specific field in an Agent Blueprint Package against a constraint using a deterministic operator. Rules are not prose, not templates, and not AI-inferred; they are pure logic executed identically every time.

Use this reference to:
- Write new governance policies for your enterprise
- Understand what each operator evaluates
- Debug policy violations during governance review
- Extend the policy system with new rules

The language is evaluated by the [Governance Validator](./governance-validator.md) subsystem, which runs automatically when an ABP is generated or manually when an ABP is refined.

---

## Rule Structure

Every policy rule is a JSON object with five required fields:

```json
{
  "id": "rule-001",
  "field": "capabilities.instructions",
  "operator": "exists",
  "severity": "error",
  "message": "Agent must have behavioral instructions."
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | Yes | Unique identifier for this rule within its policy. Used in violation reports and remediation. Format: kebab-case (e.g., `rule-001`, `require-audit-logging`). |
| `field` | string | Yes | Dot-notation path into the ABP to evaluate (e.g., `metadata.status`, `capabilities.tools`, `constraints.denied_actions`). See Field Path Reference below. |
| `operator` | enum | Yes | The evaluation operation to perform. One of the 11 operators listed in the Operator Reference section below. |
| `value` | any | No | The comparison value. Required for operators: `equals`, `not_equals`, `contains`, `not_contains`, `matches`, `count_gte`, `count_lte`, `includes_type`, `not_includes_type`. Omit for `exists` and `not_exists`. |
| `severity` | enum | Yes | Either `error` or `warning`. Errors block `draft → in_review` transitions. Warnings are informational. |
| `message` | string | Yes | A human-readable violation message shown to the agent designer. Should explain what is required and why (e.g., "Agent must have behavioral instructions to ensure consistent personality."). |

---

## Operator Reference

The Policy Expression Language provides 11 deterministic operators for evaluating ABP fields.

### All Operators — Quick Reference

| Operator | Description | Value Type | Applicable Fields | Example |
|---|---|---|---|---|
| `exists` | Field is present and non-null | (none) | Any | `{ "field": "capabilities.instructions", "operator": "exists" }` |
| `not_exists` | Field is absent or null | (none) | Any | `{ "field": "governance.approval_chain", "operator": "not_exists" }` |
| `equals` | Field strictly equals value | any | Any scalar or object | `{ "field": "metadata.status", "operator": "equals", "value": "approved" }` |
| `not_equals` | Field does not equal value | any | Any scalar or object | `{ "field": "constraints.allowed_domains[0]", "operator": "not_equals", "value": "internal" }` |
| `contains` | String field contains substring OR array field contains element | string or any | String or array | `{ "field": "capabilities.instructions", "operator": "contains", "value": "escalate" }` |
| `not_contains` | String field does not contain substring OR array does not contain element | string or any | String or array | `{ "field": "constraints.denied_actions", "operator": "not_contains", "value": "delete_data" }` |
| `matches` | Field matches regular expression pattern | regex string | String | `{ "field": "identity.name", "operator": "matches", "value": "^[A-Z]" }` |
| `count_gte` | Array field length is >= value | number | Array | `{ "field": "capabilities.tools", "operator": "count_gte", "value": 1 }` |
| `count_lte` | Array field length is <= value | number | Array | `{ "field": "governance.policies", "operator": "count_lte", "value": 50 }` |
| `includes_type` | Array of objects includes item where subfield matches value | object: `{path: string, value: any}` | Array of objects | `{ "field": "capabilities.tools", "operator": "includes_type", "value": {"path": "type", "value": "api"} }` |
| `not_includes_type` | Array of objects does not include item where subfield matches value | object: `{path: string, value: any}` | Array of objects | `{ "field": "capabilities.tools", "operator": "not_includes_type", "value": {"path": "type", "value": "llm"} }` |

### Detailed Operator Descriptions

#### `exists`

Field is present in the ABP and non-null. Does not check the field's value, only its presence.

**Use case:** Require that critical fields are specified (e.g., every agent must have instructions).

```json
{
  "id": "require-instructions",
  "field": "capabilities.instructions",
  "operator": "exists",
  "severity": "error",
  "message": "Agent must have behavioral instructions defined."
}
```

**Evaluation:** If `capabilities.instructions` is any non-null value (including empty string or empty array), the rule passes. If `capabilities.instructions` is `null` or missing, the rule fails.

---

#### `not_exists`

Field is absent from the ABP or is null. The inverse of `exists`.

**Use case:** Prohibit certain fields from being populated (e.g., legacy fields that should not be used).

```json
{
  "id": "deprecate-legacy-auth",
  "field": "capabilities.legacy_auth_method",
  "operator": "not_exists",
  "severity": "warning",
  "message": "Legacy authentication field should not be used. Use 'capabilities.auth.modern_method' instead."
}
```

**Evaluation:** If `capabilities.legacy_auth_method` is missing or `null`, the rule passes. If it is present and non-null, the rule fails.

---

#### `equals`

Field's value is exactly equal to the specified value (strict `===` comparison for scalars, deep equality for objects).

**Use case:** Enforce that a field has a specific value (e.g., status must be "approved").

```json
{
  "id": "require-approved-status",
  "field": "metadata.status",
  "operator": "equals",
  "value": "approved",
  "severity": "error",
  "message": "Only approved agents can be deployed to production."
}
```

**Evaluation:** Compares `metadata.status` to the string `"approved"`. Case-sensitive. If they match, rule passes.

---

#### `not_equals`

Field's value is not equal to the specified value.

**Use case:** Prohibit a specific value (e.g., deployment environment cannot be "sandbox").

```json
{
  "id": "prohibit-sandbox-deployment",
  "field": "ownership.deployment_environment",
  "operator": "not_equals",
  "value": "sandbox",
  "severity": "warning",
  "message": "This agent should be deployed to a production or staging environment, not sandbox."
}
```

---

#### `contains`

For **strings**: The field contains the substring value.
For **arrays**: The field contains an element equal to value.

**Use case:** Verify that required keywords or permissions are mentioned in instructions or that required tools are included.

```json
{
  "id": "require-escalation-in-instructions",
  "field": "capabilities.instructions",
  "operator": "contains",
  "value": "escalate",
  "severity": "error",
  "message": "Instructions must explicitly mention escalation to human specialists."
}
```

```json
{
  "id": "require-approval-tool",
  "field": "constraints.denied_actions",
  "operator": "contains",
  "value": "approve_without_audit",
  "severity": "error",
  "message": "Agent must deny unapproved actions without audit trail."
}
```

**Evaluation:** Substring match is case-sensitive. Array element match uses strict equality.

---

#### `not_contains`

For **strings**: The field does not contain the substring value.
For **arrays**: The field does not contain an element equal to value.

**Use case:** Prohibit dangerous instructions, risky tools, or forbidden actions.

```json
{
  "id": "prohibit-dangerous-instructions",
  "field": "capabilities.instructions",
  "operator": "not_contains",
  "value": "ignore security",
  "severity": "error",
  "message": "Agent instructions cannot contain text that overrides security controls."
}
```

---

#### `matches`

Field matches a regular expression pattern. The field must be a string. The value is a regex pattern (provided as a string, evaluated as a JavaScript regex).

**Use case:** Validate naming conventions, enforce format requirements, or pattern-match against sensitive keywords.

```json
{
  "id": "name-follows-convention",
  "field": "identity.name",
  "operator": "matches",
  "value": "^[A-Z][a-z]+ (Assistant|Bot|Agent)$",
  "severity": "warning",
  "message": "Agent name should follow the format 'Service Assistant' or 'Service Bot'."
}
```

```json
{
  "id": "prohibit-pii-in-name",
  "field": "identity.name",
  "operator": "matches",
  "value": "(?i)(phone|ssn|password|secret|key)",
  "severity": "error",
  "message": "Agent name cannot contain references to PII, secrets, or sensitive data types."
}
```

**Evaluation:** JavaScript `RegExp` matching. Use `(?i)` for case-insensitive matching. Empty string matches pass `/.*/` but fail `/^.+$/`.

---

#### `count_gte`

Array field has length >= value.

**Use case:** Require a minimum number of tools, policies, or approval signers.

```json
{
  "id": "require-minimum-tools",
  "field": "capabilities.tools",
  "operator": "count_gte",
  "value": 1,
  "severity": "error",
  "message": "Agent must declare at least one tool or knowledge source."
}
```

```json
{
  "id": "require-two-approvers",
  "field": "governance.approval_chain",
  "operator": "count_gte",
  "value": 2,
  "severity": "error",
  "message": "High-risk agents must have at least two approval signers."
}
```

**Evaluation:** Counts array elements. If the field is not an array or is null, the rule fails.

---

#### `count_lte`

Array field has length <= value.

**Use case:** Cap the number of tools, policies, or integrations to prevent sprawl and complexity.

```json
{
  "id": "limit-tool-count",
  "field": "capabilities.tools",
  "operator": "count_lte",
  "value": 10,
  "severity": "warning",
  "message": "Consider consolidating to fewer tools for maintainability. Current count exceeds 10."
}
```

---

#### `includes_type`

Array of objects includes at least one item where a specified subfield matches a specified value.

**Use case:** Verify that an array contains an object with specific properties (e.g., array includes a tool of type "api").

The value is an object: `{ "path": "fieldName", "value": matchValue }`.

```json
{
  "id": "require-api-tool",
  "field": "capabilities.tools",
  "operator": "includes_type",
  "value": {
    "path": "type",
    "value": "api"
  },
  "severity": "warning",
  "message": "Agent should integrate at least one external API for data access."
}
```

**Evaluation:** Iterates through the array. For each object, checks if the subfield (e.g., `type`) equals the match value. If any object matches, rule passes. If no objects match or array is empty, rule fails.

---

#### `not_includes_type`

Array of objects does not include any item where a specified subfield matches a specified value.

**Use case:** Prohibit certain tool types or integrations from the agent's toolkit.

```json
{
  "id": "prohibit-llm-tools",
  "field": "capabilities.tools",
  "operator": "not_includes_type",
  "value": {
    "path": "type",
    "value": "llm"
  },
  "severity": "error",
  "message": "This agent cannot use other LLM models as tools. It must use its own reasoning."
}
```

**Evaluation:** Iterates through the array. If any object's subfield matches the value, rule fails. If no objects match or array is empty, rule passes.

---

## Field Path Reference

Field paths use **dot-notation** to reference nested fields in the ABP. Start at the root level and traverse down using dots.

### Common Field Paths

| Path | Description | Example Value Type |
|---|---|---|
| `metadata.id` | Unique identifier of the agent blueprint | string (UUID) |
| `metadata.status` | Lifecycle status of the blueprint | string: "draft", "in_review", "approved", "rejected", "deprecated" |
| `metadata.created_at` | ISO timestamp of creation | string (ISO 8601) |
| `metadata.created_by` | Email of blueprint creator | string |
| `metadata.enterprise_id` | UUID of owning enterprise | string (UUID) |
| `metadata.tags` | Array of categorization tags | array of strings |
| `identity.name` | Display name of the agent | string |
| `identity.description` | Human-readable description | string |
| `identity.persona` | Behavioral instructions for the agent | string |
| `identity.branding.display_name` | White-label display name | string |
| `identity.branding.icon_url` | Icon URL | string (URL) |
| `capabilities.instructions` | System prompt and behavioral rules | string |
| `capabilities.tools` | Array of available tools (API, function, etc.) | array of objects |
| `capabilities.tools[n].name` | Name of a specific tool | string |
| `capabilities.tools[n].type` | Tool type | string: "api", "function", "mcp_server" |
| `capabilities.knowledge_sources` | Array of knowledge sources | array of objects |
| `capabilities.knowledge_sources[n].uri` | URI of a knowledge source | string (URI) |
| `constraints.allowed_domains` | Array of permitted conversation domains | array of strings |
| `constraints.denied_actions` | Array of prohibited actions | array of strings |
| `constraints.max_tokens_per_response` | Maximum response length | number |
| `constraints.rate_limits.requests_per_minute` | Rate limit (requests/minute) | number |
| `governance.policies` | Array of governance policies | array of objects |
| `governance.policies[n].name` | Name of a specific policy | string |
| `governance.policies[n].type` | Policy category | string: "safety", "audit", "data_handling", "access_control", "compliance" |
| `governance.audit.log_interactions` | Whether interactions are logged | boolean |
| `governance.audit.retention_days` | Data retention period | number |
| `governance.audit.pii_redaction` | Whether PII is redacted from logs | boolean |
| `governance.approval_chain` | Array of approval signers | array of objects |
| `governance.approval_chain[n].role` | Approval role (e.g., "compliance_officer") | string |
| `governance.approval_chain[n].approved` | Approval status | boolean |
| `ownership.businessUnit` | Owning business unit | string |
| `ownership.ownerEmail` | Primary owner email | string |
| `ownership.deploymentEnvironment` | Deployment target | string: "production", "staging", "sandbox", "internal" |
| `ownership.dataClassification` | Data sensitivity level | string: "public", "internal", "confidential", "regulated" |

**Note:** Array indices are not typically used in field paths; instead, use `includes_type` or `not_includes_type` operators to search within arrays.

---

## Severity Model

Every rule has a severity: either `error` or `warning`. Severity determines how violations are treated.

### Severity Levels

| Severity | Description | Lifecycle Impact | UI Display | Typical Use |
|---|---|---|---|---|
| `error` | Critical violation. Blocks progression. | Blocks `draft → in_review` transition. ABP cannot enter review status until error violations are resolved. | Red badge in validation report. | Safety constraints, compliance requirements, non-negotiable rules. |
| `warning` | Informational violation. Non-blocking. | Does not block transitions. ABP can progress to in_review status even with active warnings. | Yellow/orange badge in validation report. | Best practices, recommendations, nice-to-haves, deprecation notices. |

### Lifecycle Transition Rules

| Transition | Allows Errors? | Allows Warnings? | Notes |
|---|---|---|---|
| draft → in_review | No | Yes | ABP must resolve all error violations before submission for review. Warnings are visible but non-blocking. |
| in_review → approved | No (implicit) | Yes | Reviewer sees all violations (errors and warnings). Typically, warnings are accepted. |
| in_review → rejected | N/A | N/A | Rejection is always allowed, regardless of violation count. |
| approved → deprecated | N/A | N/A | Deprecation is always allowed. |

---

## Examples

### Example 1: Safety Baseline Rule

**Scenario:** Your enterprise requires that all agents have explicit behavioral instructions to ensure consistent personality and safety.

```json
{
  "id": "require-instructions",
  "field": "capabilities.instructions",
  "operator": "exists",
  "severity": "error",
  "message": "Agent must have behavioral instructions defined in capabilities.instructions. These instructions control the agent's personality, communication style, and safety boundaries."
}
```

**Evaluation:**

- **ABP has instructions**: `"capabilities.instructions": "You are a helpful assistant. Always verify user identity before disclosing account details. Escalate disputes to a human specialist."` → Rule **PASSES**.
- **ABP lacks instructions**: `"capabilities": { "tools": [...] }` (no instructions field) → Rule **FAILS** (error severity, blocks in_review transition).
- **Instructions are empty string**: `"capabilities.instructions": ""` → Rule **PASSES** (field exists, even if empty).

---

### Example 2: Audit Logging Requirement

**Scenario:** Your enterprise requires that all agents logging interactions redact personally identifiable information (PII).

```json
{
  "id": "require-pii-redaction",
  "field": "governance.audit.pii_redaction",
  "operator": "equals",
  "value": true,
  "severity": "error",
  "message": "Audit logging must include PII redaction to comply with CCPA and GDPR. Set governance.audit.pii_redaction to true."
}
```

**Evaluation:**

- **PII redaction enabled**: `"governance": { "audit": { "pii_redaction": true } }` → Rule **PASSES**.
- **PII redaction disabled**: `"governance": { "audit": { "pii_redaction": false } }` → Rule **FAILS** (error severity).
- **Audit block missing**: `"governance": {}` (no audit field) → Rule **FAILS** (error severity; field does not exist).

---

### Example 3: Tool Type Requirement

**Scenario:** Your enterprise wants all agents to have at least one API integration for real-time data fetching.

```json
{
  "id": "require-api-integration",
  "field": "capabilities.tools",
  "operator": "includes_type",
  "value": {
    "path": "type",
    "value": "api"
  },
  "severity": "warning",
  "message": "Consider adding at least one API integration to fetch real-time data. This increases agent capability and reduces reliance on static knowledge sources."
}
```

**Evaluation:**

- **Tools include an API**: `"capabilities": { "tools": [{ "name": "get_rates", "type": "api" }, { "name": "search_kb", "type": "function" }] }` → Rule **PASSES** (includes an item where type == "api").
- **No API tools**: `"capabilities": { "tools": [{ "name": "search_kb", "type": "function" }] }` → Rule **FAILS** (warning severity; visible but non-blocking).
- **No tools at all**: `"capabilities": { "tools": [] }` → Rule **FAILS** (warning severity).

---

### Example 4: Denied Actions Requirement

**Scenario:** Your enterprise prohibits agents from modifying customer data without explicit human approval. The agent must deny the action.

```json
{
  "id": "prohibit-unaudit-modification",
  "field": "constraints.denied_actions",
  "operator": "contains",
  "value": "modify_customer_data_without_approval",
  "severity": "error",
  "message": "Agent must explicitly deny modification of customer data without human approval. Add 'modify_customer_data_without_approval' to constraints.denied_actions."
}
```

**Evaluation:**

- **Denied action list includes the prohibition**: `"constraints": { "denied_actions": ["modify_customer_data_without_approval", "delete_account", "issue_refund_over_1000"] }` → Rule **PASSES**.
- **Denied action list does not include it**: `"constraints": { "denied_actions": ["delete_account"] }` → Rule **FAILS** (error severity, blocks in_review).

---

## Seeded Global Policies

Intellios includes four global governance policies that are automatically available to all enterprises. These policies enforce baseline safety, audit, and compliance standards.

### Policy: Safety Baseline

**Type:** `safety`
**Description:** Ensures all agents have required identity and behavioral definitions.

| Rule ID | Field | Operator | Severity | Message |
|---|---|---|---|---|
| `safety-001` | `metadata.id` | exists | error | Agent must have a unique identifier. |
| `safety-002` | `identity.name` | exists | error | Agent must have a display name. |
| `safety-003` | `capabilities.instructions` | exists | error | Agent must have behavioral instructions. |
| `safety-004` | `identity.description` | exists | warning | Agent should have a human-readable description. |

---

### Policy: Audit Standards

**Type:** `audit`
**Description:** Requires audit logging configuration for compliance and accountability.

| Rule ID | Field | Operator | Severity | Message |
|---|---|---|---|---|
| `audit-001` | `governance.audit.log_interactions` | exists | warning | Consider enabling interaction logging for audit and compliance. |
| `audit-002` | `governance.audit.retention_days` | count_gte | warning | Audit logs should be retained for at least 30 days. |
| `audit-003` | `governance.audit.pii_redaction` | equals | warning | If logging interactions, enable PII redaction to protect customer privacy. |

---

### Policy: Access Control Baseline

**Type:** `access_control`
**Description:** Ensures agents declare their boundaries and restrictions.

| Rule ID | Field | Operator | Severity | Message |
|---|---|---|---|---|
| `access-001` | `constraints.denied_actions` | exists | warning | Agent should declare explicitly denied actions. |
| `access-002` | `constraints.allowed_domains` | count_gte | warning | Agent should declare its allowed conversation domains. |

---

### Policy: Governance Coverage

**Type:** `compliance`
**Description:** Ensures agents have at least baseline governance policies attached.

| Rule ID | Field | Operator | Severity | Message |
|---|---|---|---|---|
| `governance-001` | `governance.policies` | count_gte | warning | Agent should have at least one governance policy defined. |

---

## Notes & Caveats

### No Compound Conditionals

The Policy Expression Language does not support compound conditions (AND, OR, NOT logic across multiple fields). Each rule evaluates a single field in isolation.

To enforce compound logic, create multiple rules in the same policy:

```json
{
  "name": "high_value_agent_controls",
  "type": "compliance",
  "rules": [
    {
      "id": "high-value-rule-1",
      "field": "ownership.dataClassification",
      "operator": "equals",
      "value": "regulated",
      "severity": "error",
      "message": "High-value agents require regulated data classification."
    },
    {
      "id": "high-value-rule-2",
      "field": "governance.approval_chain",
      "operator": "count_gte",
      "value": 2,
      "severity": "error",
      "message": "High-value agents require approval from two signers."
    }
  ]
}
```

Both rules must pass for the policy to pass.

### No Cross-Field References

Rules cannot reference or compare two different fields. For example, you cannot write a rule like "if field A contains X, then field B must be Y." Each rule is scoped to a single field.

If you need cross-field validation, consider breaking it into separate policies or handling it at the business logic layer (e.g., in the Intake Engine or Generation Engine).

### Regex Matching Behavior

- Regex patterns are evaluated as JavaScript `RegExp` objects.
- Patterns are case-sensitive by default. Use `(?i)` inline flag for case-insensitive matching: `(?i)sensitive`.
- The entire string is not automatically anchored; use `^` and `$` to anchor if needed.
  - `matches: "approved"` will match "approved", "unapproved", "pre-approved", etc.
  - `matches: "^approved$"` will match only exactly "approved".

### Array Indexing

Field paths do not support array indexing by position (e.g., `capabilities.tools[0].name`). To validate array contents, use:
- `count_gte` / `count_lte` for array length constraints
- `includes_type` / `not_includes_type` for searching within arrays by property

---

## Evaluation Determinism

The Policy Expression Language is **deterministic and auditable**. This is a core principle:

> **Same ABP + Same Policies = Same Result, Always**

There is no randomness, no LLM inference, no "best guess." A rule either passes or fails based on the field value and operator. Violations are generated immediately and stored. This makes governance:

- **Auditable:** You can replay a validation and get the same result.
- **Explainable:** Violations point to specific fields with specific reasons.
- **Reproducible:** No race conditions, no timing dependencies.
- **Scalable:** Validation is fast and can run on thousands of agents without performance degradation.

---

*See also: [Governance Validator](./governance-validator.md), [Governance-as-Code](./governance-as-code.md), [Agent Blueprint Package](./agent-blueprint-package.md)*

*Next: [Defining Enterprise Governance Policies](../05-governance-compliance/policy-authoring-guide.md), [Governance Validator Walkthrough](../05-governance-compliance/policy-authoring-guide.md)*
