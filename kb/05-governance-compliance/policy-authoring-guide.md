---
id: "05-010"
title: "Policy Authoring Guide: Creating Custom Governance Rules"
slug: "policy-authoring-guide"
type: "task"
audiences:
  - "compliance"
  - "engineering"
status: "published"
version: "1.0.0"
platform_version: "1.2.0"
created: "2026-04-05"
updated: "2026-04-05"
author: "Intellios"
reviewers: []
tags:
  - "governance"
  - "policy"
  - "policy-authoring"
  - "rules"
  - "compliance"
  - "operators"
  - "governance-as-code"
  - "deterministic"
prerequisites:
  - "Governance-as-Code: Deterministic Policy Automation"
  - "Agent Blueprint Package (ABP)"
  - "Policy Expression Language"
related:
  - "Governance-as-Code"
  - "Policy Expression Language"
  - "Governance Validator"
  - "Agent Lifecycle"
next_steps:
  - "Advanced Policy Authoring"
  - "Policy Testing and Validation"
feedback_url: "[PLACEHOLDER]"
tldr: >
  Learn to author deterministic governance policies that validate your AI agents against enterprise
  requirements. Map business rules to ABP fields, select the right operator, set severity levels, and
  test policies using the Governance API. Includes three worked examples: financial services compliance,
  data security controls, and operational standards.
---

# Policy Authoring Guide: Creating Custom Governance Rules

> **Bottom Line:** This guide teaches you to create custom governance policies that enforce your
> enterprise's specific requirements on every agent blueprint. You'll map business rules to ABP fields,
> author rules using 11 deterministic operators, compose rules into policies, and test them using the
> Governance API. No programming required. Policies are deterministic, auditable, and compliant by design.

---

## Overview: From Business Requirement to Governance Rule

Governance policies in Intellios start as business requirements and become machine-evaluable rules. The
journey has seven steps:

1. **Define your governance requirement** in business terms (e.g., "All agents handling financial data
   must declare compliance frameworks").
2. **Identify the ABP field** that corresponds to your requirement (use the field path reference table).
3. **Choose the right operator** from 11 deterministic operators (exists, equals, contains, matches,
   count_gte, etc.).
4. **Set the severity level** (error = blocks deployment; warning = informational).
5. **Write the rule JSON** using the structured template.
6. **Compose multiple rules into a policy** (group related rules together).
7. **Test the policy** against sample blueprints using the Governance API.
8. **Deploy the policy** to activate it for all new agent creation.

This guide walks you through each step with three complete, worked examples that you can adapt to your
own governance needs.

---

## Step 1: Define Your Governance Requirement

Start with a clear business statement of what your organization requires. Be specific and measurable.

**Bad:** "Agents should be secure."
**Good:** "All agents accessing customer data must declare explicit data retention policies and deny bulk
export actions."

Frame your requirement as a question: *What must or must not be true about the agent blueprint?*

Examples:
- "All customer-facing agents must have their purpose documented in a human-readable description."
- "Any agent using external APIs must declare those tools explicitly in the capabilities section."
- "Agents processing financial transactions must include audit logging."

Write this requirement down. You'll return to it when composing your remediation message.

---

## Step 2: Identify the ABP Field Path

Agent Blueprint Packages (ABPs) are structured JSON objects with a known schema. Governance rules inspect
specific fields of this structure using **dot-notation paths**.

### Quick Reference: Common ABP Field Paths

| Section | Field Path | Type | Example Value |
|---|---|---|---|
| **Identity** | `identity.name` | string | `"mortgage-faq-bot"` |
| | `identity.description` | string | `"Answers mortgage FAQs"` |
| **Capabilities** | `capabilities.tools` | array | `[{name: "...", type: "..."}, ...]` |
| | `capabilities.instructions` | string | `"You are a helpful assistant..."` |
| | `capabilities.tools[n].name` | string | `"fetch_rates"` |
| **Constraints** | `constraints.denied_actions` | array | `["delete_user", "export_data"]` |
| | `constraints.input_limits.max_tokens` | number | `2000` |
| **Governance** | `governance.policies` | array | `[{type: "data_retention", ...}]` |
| | `governance.compliance` | array | `["SOX", "GDPR"]` |
| | `governance.audit.log_interactions` | boolean | `true` |
| | `governance.risk_classification` | string | `"medium"` |
| **Execution** | `execution.timeout_seconds` | number | `30` |
| | `execution.sandbox_required` | boolean | `true` |

**For a complete field reference**, consult the [Agent Blueprint Package](../03-core-concepts/agent-blueprint-package.md)
specification or the schema at `docs/schemas/abp/v1.0.0.schema.json`.

### Finding Your Field Path

To find the right field path:

1. **Read your requirement:** "Agents accessing PII must have audit logging enabled."
2. **Identify the concept:** Audit logging is a governance decision.
3. **Locate the field:** `governance.audit.log_interactions` (a boolean).
4. **Confirm the type:** Is it a string, array, number, boolean, or object? (In this case, boolean.)

If your requirement mentions something not in the ABP, you have two options:
- **Adjust your requirement** to match an existing ABP field (recommended for MVP).
- **Propose a schema extension** by filing an issue with the Intellios team.

---

## Step 3: Choose the Right Operator

The **operator** defines how the rule evaluates the field. Intellios supports 11 deterministic operators
chosen to cover 95% of enterprise governance scenarios.

### The 11 Operators

| Operator | Applies To | Rule Passes When | Example |
|---|---|---|---|
| **exists** | any | Field is not null, undefined, empty string, or empty array | `field: "capabilities.instructions"`, `operator: "exists"` → Agent must have instructions |
| **not_exists** | any | Field is null, undefined, empty string, or empty array | `field: "constraints.denied_actions"`, `operator: "not_exists"` → No restrictions (unusual but valid) |
| **equals** | scalar (string, number, boolean) | Field exactly matches `rule.value` | `field: "governance.risk_classification"`, `value: "high"`, `operator: "equals"` → Risk level must be exactly "high" |
| **not_equals** | scalar | Field does not match `rule.value` | `field: "governance.risk_classification"`, `value: "unknown"`, `operator: "not_equals"` → Risk must be classified (not "unknown") |
| **contains** | string or array | String includes `rule.value` substring, OR array contains `rule.value` as element | `field: "identity.description"`, `value: "customer"`, `operator: "contains"` → Description mentions customers |
| **not_contains** | string or array | Negation of contains | `field: "constraints.denied_actions"`, `value: "modify_data"`, `operator: "not_contains"` → Cannot modify data is NOT allowed |
| **matches** | string | String matches regex pattern in `rule.value` | `field: "identity.description"`, `value: "^[A-Z].*"`, `operator: "matches"` → Description starts with uppercase |
| **count_gte** | array | Array length >= `rule.value` (numeric) | `field: "constraints.denied_actions"`, `value: 1`, `operator: "count_gte"` → At least one action is denied |
| **count_lte** | array | Array length <= `rule.value` (numeric) | `field: "capabilities.tools"`, `value: 5`, `operator: "count_lte"` → At most 5 tools |
| **includes_type** | array of objects | Array contains object where `.type === rule.value` | `field: "governance.policies"`, `value: "data_retention"`, `operator: "includes_type"` → Policy set includes a data_retention entry |
| **not_includes_type** | array of objects | No object has `.type === rule.value` | `field: "governance.policies"`, `value: "deprecated_framework"`, `operator: "not_includes_type"` → No deprecated policies |

### Decision Matrix: Choosing Your Operator

**My requirement checks if a field...**

- **...exists (is not empty)?** → Use `exists`
- **...equals a specific value?** → Use `equals`
- **...does NOT equal a value?** → Use `not_equals`
- **...contains a substring or list element?** → Use `contains`
- **...matches a pattern (regex)?** → Use `matches`
- **...has a specific number of elements?** → Use `count_gte` or `count_lte`
- **...includes a typed object (by `.type`)?** → Use `includes_type`

---

## Step 4: Set the Severity Level

Every rule has a **severity** that determines how the validation system treats violations.

| Severity | Meaning | Effect on Deployment |
|---|---|---|
| **error** | This rule is non-negotiable. | Violations **block** the transition `draft → in_review`. The agent cannot proceed to human review until the violation is fixed. This is a hard compliance gate. |
| **warning** | This rule is best-practice guidance. | Violations are **informational only**. They do not block any lifecycle transition. The agent can proceed even if the warning is unresolved. |

### When to Use Each

**Use error severity for:**
- Regulatory requirements (SOX, GDPR, HIPAA, etc.)
- Security and access control mandates
- Data retention and audit logging requirements
- Explicitly denied actions (e.g., no bulk data exports)

**Use warning severity for:**
- Best practices and recommendations
- Coverage guidance (e.g., "consider adding audit logging")
- Maturity level suggestions
- Quality-of-life improvements

**Pro Tip:** Start with warnings. Test the policy against real blueprints. Once you're confident the rule
catches the right cases (without false positives), promote it to error severity.

---

## Step 5: Write the Rule JSON

Each rule follows this template:

```json
{
  "id": "rule-unique-identifier",
  "field": "dot.notation.path.to.field",
  "operator": "operator-name",
  "value": "comparison-value-if-needed",
  "severity": "error | warning",
  "message": "Human-readable violation message for the designer"
}
```

### Template Annotations

| Field | Required? | Type | Notes |
|---|---|---|---|
| `id` | ✓ | string | Unique identifier within the policy (e.g., "pii-001", "audit-log-check"). Use lowercase with hyphens. |
| `field` | ✓ | string | Dot-notation ABP path (e.g., `governance.audit.log_interactions`). |
| `operator` | ✓ | string | One of the 11 operators (exists, equals, contains, matches, etc.). |
| `value` | Optional | any | Required for: equals, not_equals, contains, not_contains, matches, count_gte, count_lte, includes_type, not_includes_type. Omit for: exists, not_exists. |
| `severity` | ✓ | string | "error" (blocks deployment) or "warning" (informational). |
| `message` | ✓ | string | Clear, specific message describing the violation. Shown to the designer when the rule fails. Max 200 characters. |

### Example Rules

**Rule 1: Require audit logging (error)**
```json
{
  "id": "audit-001",
  "field": "governance.audit.log_interactions",
  "operator": "equals",
  "value": true,
  "severity": "error",
  "message": "Agent must enable interaction logging for audit compliance. Set governance.audit.log_interactions to true."
}
```

**Rule 2: Require at least one denied action (warning)**
```json
{
  "id": "safety-001",
  "field": "constraints.denied_actions",
  "operator": "count_gte",
  "value": 1,
  "severity": "warning",
  "message": "Consider explicitly denying at least one action to clarify agent scope and safety boundaries."
}
```

**Rule 3: Description must start with uppercase (warning)**
```json
{
  "id": "quality-001",
  "field": "identity.description",
  "operator": "matches",
  "value": "^[A-Z]",
  "severity": "warning",
  "message": "Agent description should start with an uppercase letter for consistency."
}
```

---

## Step 6: Compose Rules into a Policy

A governance policy is a collection of related rules grouped under a single name. Group rules by domain
or compliance area.

### Policy Template

```json
{
  "id": "policy-unique-id",
  "name": "Human-Readable Policy Name",
  "description": "What this policy enforces and why",
  "rules": [
    { "id": "rule-001", "field": "...", "operator": "...", ... },
    { "id": "rule-002", "field": "...", "operator": "...", ... },
    { "id": "rule-003", "field": "...", "operator": "...", ... }
  ]
}
```

**Policy naming conventions:**
- Use kebab-case for policy IDs: `policy-pii-access-control`, `policy-audit-standards`
- Use Title Case for policy names: "PII Access Control Baseline", "Audit Standards"
- Group related rules: All data-retention rules together, all audit rules together, etc.

### Good Policy Structure

A strong policy has 3–6 rules focused on a single compliance or safety domain. If you find yourself
grouping rules from very different domains, split into separate policies.

**Example: "PII Access Control" Policy (bad grouping)**
```json
{
  "id": "policy-pii-access",
  "name": "PII Access Control",
  "rules": [
    { "id": "r1", "field": "governance.policies", "operator": "includes_type", "value": "data_retention", ... },
    { "id": "r2", "field": "constraints.denied_actions", "operator": "includes_type", "value": "export_pii", ... },
    { "id": "r3", "field": "identity.name", "operator": "exists", ... },  // <- Unrelated!
    { "id": "r4", "field": "execution.sandbox_required", "operator": "equals", "value": true, ... }  // <- Unrelated!
  ]
}
```

The last two rules belong in a different policy (e.g., "Operational Safety").

---

## Step 7: Test the Policy Against Sample Blueprints

Before deploying your policy, validate it against a sample agent blueprint to ensure:
1. Rules evaluate correctly (no typos in field paths or operator names).
2. Field values in real blueprints match your assumptions.
3. Severity levels are appropriate (no false positives, no false negatives).

### Use the Governance API Validation Endpoint

**Endpoint:** `POST /api/blueprints/[id]/validate`

Call this endpoint to validate an existing blueprint against all governance policies (including your new
one, once it's created).

**Request:**
```json
POST /api/blueprints/123/validate
Content-Type: application/json

{}
```

**Response (example):**
```json
{
  "valid": false,
  "violations": [
    {
      "policyId": "policy-pii-access-control",
      "policyName": "PII Access Control Baseline",
      "ruleId": "pii-001",
      "fieldPath": "governance.policies",
      "operator": "includes_type",
      "severity": "error",
      "message": "Blueprint must include a data_retention policy to handle customer PII.",
      "suggestion": "Add a governance.policies entry with type 'data_retention' and specify retention rules (e.g., delete logs after 90 days)."
    }
  ],
  "policyCount": 8,
  "generatedAt": "2026-04-05T14:32:00Z"
}
```

**Interpretation:**
- `valid: false` → The blueprint has error-severity violations and cannot proceed to in_review.
- `violations[0].severity: "error"` → This violation blocks deployment.
- `suggestion` → Claude's remediation guidance (use this as reference for your response to designers).

### Testing Workflow

1. **Create a test ABP** (use Intake Engine to generate one, or hand-author a sample JSON).
2. **Call the validation endpoint** with the test ABP.
3. **Review violations** — Do they match your expectations? Are field paths correct?
4. **Adjust rules if needed** (typos, wrong operators, missing fields).
5. **Re-test** until behavior is correct.
6. **Deploy** the policy.

---

## Step 8: Deploy the Policy

Once you're confident in your policy, deploy it to make it active for all new agent blueprints.

**Endpoint:** `POST /api/governance/policies`

**Request:**
```json
POST /api/governance/policies
Content-Type: application/json

{
  "id": "policy-pii-access-control",
  "name": "PII Access Control Baseline",
  "description": "Agents handling customer PII must declare access controls, retention policies, and audit logging.",
  "rules": [
    {
      "id": "pii-001",
      "field": "governance.policies",
      "operator": "includes_type",
      "value": "data_retention",
      "severity": "error",
      "message": "Blueprint must include a data_retention policy."
    }
    // ... additional rules
  ]
}
```

**Response:**
```json
{
  "id": "policy-pii-access-control",
  "name": "PII Access Control Baseline",
  "createdAt": "2026-04-05T14:35:00Z",
  "version": "1.0.0",
  "ruleCount": 4,
  "status": "active"
}
```

Once deployed, the policy is applied to all new blueprints generated from the Intake Engine. Existing
blueprints can be re-validated using the validation endpoint.

---

## Three Worked Examples

### Example 1: Financial Services — SOX Compliance

**Business Requirement:** All agents operating in our mortgage and lending division must declare their
compliance frameworks explicitly. This is a SOX requirement for model governance documentation.

**Step 1: Define the Requirement (Done Above)**

**Step 2: Identify the Field**
- Field: `governance.compliance` (array of strings)
- Type: Array of compliance framework names (e.g., ["SOX", "GLBA"])

**Step 3: Choose the Operator**
- Requirement: "The compliance field must contain 'SOX'."
- Operator: `contains`

**Step 4: Set Severity**
- This is a regulatory requirement (SOX compliance).
- Severity: `error`

**Step 5: Write the Rule**
```json
{
  "id": "sox-001",
  "field": "governance.compliance",
  "operator": "contains",
  "value": "SOX",
  "severity": "error",
  "message": "Agent must declare SOX compliance in governance.compliance array. Financial services agents require documented compliance frameworks."
}
```

**Step 6: Build the Policy**
```json
{
  "id": "policy-sox-compliance",
  "name": "SOX Compliance Baseline",
  "description": "Agents in lending division must declare SOX compliance and maintain audit trails.",
  "rules": [
    {
      "id": "sox-001",
      "field": "governance.compliance",
      "operator": "contains",
      "value": "SOX",
      "severity": "error",
      "message": "Agent must declare SOX compliance. Add 'SOX' to governance.compliance array."
    },
    {
      "id": "sox-002",
      "field": "governance.audit.log_interactions",
      "operator": "equals",
      "value": true,
      "severity": "error",
      "message": "SOX requires audit logging of all agent interactions. Set governance.audit.log_interactions to true."
    },
    {
      "id": "sox-003",
      "field": "governance.policies",
      "operator": "includes_type",
      "value": "data_retention",
      "severity": "error",
      "message": "Declare data retention policy for audit trail management (e.g., retain logs 7 years per SOX)."
    }
  ]
}
```

**Step 7: Test**
Generate a test blueprint for a mortgage agent and validate it against this policy. Confirm that all three rules evaluate correctly.

**Step 8: Deploy**
Once validated, deploy via `POST /api/governance/policies`.

**Result:** Any new agent in the lending division must now declare SOX compliance, enable audit logging, and specify data retention. Non-compliant agents cannot proceed to in_review.

---

### Example 2: Data Security — PII Access Control (Multi-Rule Policy)

**Business Requirement:** Agents accessing personally identifiable information (PII) must declare explicit
access controls, enable audit logging, and define retention policies. This enforces data minimization and
supports GDPR/CCPA compliance.

**Step 1: Define the Requirement (Done Above)**

**Step 2: Identify the Fields**
- Field 1: `governance.policies` (array of policy objects, look for `.type === "data_retention"`)
- Field 2: `governance.audit.log_interactions` (boolean)
- Field 3: `constraints.denied_actions` (array, should include "export_pii")
- Field 4: `capabilities.tools` (array, should not be empty if agent accesses PII)

**Step 3: Choose Operators**
- Rule 1: Does `governance.policies` include data_retention type? → `includes_type`
- Rule 2: Is `governance.audit.log_interactions` true? → `equals`
- Rule 3: Does `constraints.denied_actions` include "export_pii"? → `contains`
- Rule 4: Is `capabilities.tools` non-empty? → `exists`

**Step 4: Set Severities**
- Rules 1, 2, 3: error (regulatory/security requirement)
- Rule 4: warning (best practice)

**Step 5 & 6: Write Rules and Build Policy**
```json
{
  "id": "policy-pii-access-control",
  "name": "PII Access Control Baseline",
  "description": "Agents accessing PII must declare data retention, audit logging, and action constraints.",
  "rules": [
    {
      "id": "pii-001",
      "field": "governance.policies",
      "operator": "includes_type",
      "value": "data_retention",
      "severity": "error",
      "message": "Agent accessing PII must declare a data retention policy. Add governance.policies entry with type 'data_retention'."
    },
    {
      "id": "pii-002",
      "field": "governance.audit.log_interactions",
      "operator": "equals",
      "value": true,
      "severity": "error",
      "message": "PII handling requires audit logging. Set governance.audit.log_interactions to true."
    },
    {
      "id": "pii-003",
      "field": "constraints.denied_actions",
      "operator": "contains",
      "value": "export_pii",
      "severity": "error",
      "message": "Agent must explicitly deny bulk PII exports. Add 'export_pii' to constraints.denied_actions array."
    },
    {
      "id": "pii-004",
      "field": "capabilities.tools",
      "operator": "exists",
      "severity": "warning",
      "message": "If agent accesses customer PII, explicitly declare those tools. Leave empty if no PII access is intended."
    },
    {
      "id": "pii-005",
      "field": "governance.compliance",
      "operator": "contains",
      "value": "GDPR",
      "severity": "warning",
      "message": "If agent processes EU personal data, add 'GDPR' to governance.compliance array."
    }
  ]
}
```

**Step 7: Test**
Create test blueprints:
- **Test A (should fail):** Blueprint with no data_retention policy. Expected: violation on pii-001.
- **Test B (should fail):** Blueprint with audit logging disabled. Expected: violation on pii-002.
- **Test C (should pass):** Blueprint with all controls in place. Expected: no error violations.

**Step 8: Deploy**
Deploy via `POST /api/governance/policies`.

**Result:** Any agent handling PII is now required to declare retention policies, enable audit logging, deny exports, and declare tools. This closes major GDPR/CCPA exposure points.

---

### Example 3: Operational Quality — Description Quality Standards

**Business Requirement:** Agent descriptions must be substantive (at least 50 characters) and start with
an uppercase letter. This ensures that the Agent Registry contains useful documentation and maintains
consistency.

**Step 1: Define the Requirement (Done Above)**

**Step 2: Identify the Field**
- Field: `identity.description` (string)

**Step 3: Choose Operators**
- Rule 1: Does the description have at least 50 characters? → `matches` with regex `^.{50,}$`
- Rule 2: Does it start with uppercase? → `matches` with regex `^[A-Z]`

**Step 4: Set Severity**
- Both rules: warning (best practice, not regulatory)

**Step 5 & 6: Write Rules and Build Policy**
```json
{
  "id": "policy-quality-standards",
  "name": "Agent Documentation Quality",
  "description": "Ensures agent descriptions are substantive and well-formatted for the registry.",
  "rules": [
    {
      "id": "quality-001",
      "field": "identity.description",
      "operator": "matches",
      "value": "^.{50,}$",
      "severity": "warning",
      "message": "Agent description should be at least 50 characters to provide meaningful context to users."
    },
    {
      "id": "quality-002",
      "field": "identity.description",
      "operator": "matches",
      "value": "^[A-Z]",
      "severity": "warning",
      "message": "Agent description should start with an uppercase letter for consistency in the registry."
    }
  ]
}
```

**Step 7: Test**
Create test blueprints:
- **Test A (warning):** `"description": "this agent fetches data"` (lowercase, 28 chars). Expected: 2 violations (both warnings).
- **Test B (pass):** `"description": "Fetches customer account data and processes mortgage application requests"` (uppercase, 90 chars). Expected: 0 violations.

**Step 8: Deploy**
Deploy via `POST /api/governance/policies`.

**Result:** The Agent Registry now contains substantive, well-formatted descriptions. Quality warnings help engineers improve documentation without blocking deployment.

---

## Common Mistakes and How to Avoid Them

### Mistake 1: Wrong Field Path

**Problem:** You author a rule with `field: "governance.logging"` but the actual ABP field is
`governance.audit.log_interactions`. The rule silently passes because the field doesn't exist (evaluates
as undefined).

**Symptom:** Rules that should fail are passing. You validate a blueprint and get no violations when you
expected some.

**Prevention:**
- Consult the ABP schema or use the [Agent Blueprint Package](../03-core-concepts/agent-blueprint-package.md) reference.
- Generate a test blueprint with the Intake Engine.
- Print the test blueprint JSON and verify your field path exists in the actual structure.
- Use the validation endpoint to test—if a rule doesn't produce expected violations, the field path is likely wrong.

### Mistake 2: Regex Syntax Errors

**Problem:** You author a rule with `value: "^[A-Z"` (unclosed bracket). The `matches` operator fails to compile the regex, and validation crashes or behaves unpredictably.

**Symptom:** Validation endpoint returns an error, or rules with regex operators don't evaluate at all.

**Prevention:**
- Test your regex in an online regex tester (e.g., regex101.com) before including it in a rule.
- Use simple patterns: `^[A-Z]` (starts with uppercase), `.*\.pdf$` (ends with .pdf), `\d{3}-\d{4}` (matches phone format).
- Document complex regexes in comments or rule messages.
- If regex feels too complex, use simpler operators like `contains` instead.

### Mistake 3: Severity Misuse

**Problem:** You set a warning as `severity: "error"` because you really want it enforced, but then
non-compliant agents cannot be created at all. Designers can't iterate, and your governance system
becomes a bottleneck.

**Symptom:** Blueprints are blocked on issues that should be fixable via suggestions. Teams complain that governance is slowing them down.

**Prevention:**
- Start with `warning` severity for new policies.
- Monitor violations in real deployments for 2–4 weeks.
- If the rule catches real issues consistently (no false positives), promote to `error` severity.
- Document the business reason for each error-severity rule in the policy description.
- Review severity levels quarterly; demote rules that are never violated.

### Mistake 4: Overly Specific Value Comparisons

**Problem:** You author a rule with `field: "identity.name"`, `operator: "equals"`, `value: "customer-service-bot"`.
This rule only passes for one specific agent name—useless for a general policy.

**Symptom:** Rule violations don't match your intent. Every agent has a different name, so the rule fails for all but one.

**Prevention:**
- Use `operator: "contains"` if you want to check for a keyword (e.g., `value: "bot"` matches "customer-service-bot" and "support-bot").
- Use `operator: "matches"` for pattern-based checks (e.g., `value: "^[a-z-]+$"` for lowercase-with-hyphens naming).
- Use `operator: "exists"` if you just want to ensure a field is present (don't compare to a specific value).

### Mistake 5: Ignoring the Difference Between `exists` and `count_gte`

**Problem:** You want to check that a list (e.g., `constraints.denied_actions`) has at least one element.
You author `operator: "exists"` thinking it checks array length. But `exists` just checks that the field
is not empty array or undefined. It doesn't validate minimum count.

**Better approach:** Use `operator: "count_gte"` with `value: 1`.

**Prevention:**
- For arrays, decide: Do I just need the array to be non-empty (`exists`)? Or do I need a minimum/maximum length (`count_gte`, `count_lte`)?
- For scalar values, `exists` checks non-null/non-empty.
- For arrays, `exists` checks non-empty array; `count_gte: 1` is equivalent.

---

## Best Practices for Policy Authoring

### 1. Start with Warnings, Graduate to Errors

New policies should launch with `warning` severity. This gives your teams a chance to adjust to the new
governance, understand the rationale, and provide feedback.

**Timeline:**
- **Week 0–2:** Launch with warning severity. Monitor violations.
- **Week 2–4:** Discuss violations with teams. Refine rule messages and remediation suggestions.
- **Week 4+:** Promote to error severity once you're confident the rule is accurate and fair.

### 2. Write Clear, Actionable Messages

The `message` field in a rule is the first thing designers see when a violation occurs. Make it specific
and actionable.

**Bad:** "Governance rule violation."
**Good:** "Agent must declare SOX compliance. Add 'SOX' to the governance.compliance array."

**Bad:** "Field is required."
**Good:** "Data retention policy is required for agents handling PII. Add governance.policies entry with type 'data_retention' and specify retention rules (e.g., 'Delete logs after 90 days')."

### 3. Document the Business Rationale

In the policy description, explain *why* the rule exists. This helps designers understand compliance context
and reduces friction.

**Bad:**
```json
{
  "name": "PII Rules",
  "description": "PII controls",
  "rules": [...]
}
```

**Good:**
```json
{
  "name": "PII Access Control Baseline",
  "description": "Agents accessing customer PII must declare access controls, retention policies, and audit logging. These controls ensure compliance with GDPR, CCPA, and GLBA—regulators expect documented data governance for any AI system processing personal information.",
  "rules": [...]
}
```

### 4. Test Against Real Blueprints Before Deploying

Don't deploy a new policy without validating it against 3–5 real agent blueprints (generated by the Intake
Engine in recent sessions). Confirm that:
- Rules evaluate correctly (field paths exist, operators work as expected).
- False positives are rare (rules don't flag compliant blueprints).
- False negatives are rare (rules don't miss non-compliant blueprints).

### 5. Version Policies Like Code

Use semantic versioning for policies:
- **1.0.0** → Initial release
- **1.0.1** → Bug fixes (typo in regex, wrong field path)
- **1.1.0** → New rules added (backwards compatible)
- **2.0.0** → Major breaking change (existing blueprints might fail)

Track versions in a changelog alongside your policy definitions.

### 6. Group Related Rules, Not Unrelated Ones

Keep policy scope focused. A policy should enforce rules from a single compliance domain or safety concern.

**Good:** "PII Access Control" (all rules about PII handling)
**Bad:** "Everything Important" (PII rules + audit rules + operational rules mixed together)

Use multiple, focused policies instead of mega-policies. This makes policies easier to understand, test,
and iterate on.

### 7. Make Remediation Suggestions Concrete

When Claude generates remediation suggestions for violations, it can only work with the violation details
you provide. Write specific rule messages to help Claude give better suggestions.

**Weak message (Claude can't give specific suggestions):**
"Add governance policies."

**Strong message (Claude can suggest concrete remediation):**
"Agent accessing customer PII must declare a data retention policy. Add governance.policies entry with type 'data_retention' and specify how long logs should be retained (e.g., 'Delete all interaction logs 90 days after creation')."

---

## Summary: The Policy Authoring Workflow

| Step | Input | Action | Output |
|---|---|---|---|
| 1 | Business requirement | Define in specific, measurable terms | Written requirement statement |
| 2 | Requirement | Identify corresponding ABP field | Field path (e.g., `governance.compliance`) |
| 3 | Field path | Choose operator | Operator name (exists, contains, matches, etc.) |
| 4 | Operator | Set severity | Severity (error or warning) |
| 5 | All above | Write rule JSON | Single rule object |
| 6 | Related rules | Group into policy | Policy JSON with multiple rules |
| 7 | Policy | Test against sample blueprints | Validation report (confirm expected violations) |
| 8 | Validated policy | Deploy via API | Policy becomes active for all new blueprints |

---

## Next Steps

- **[Advanced Policy Authoring](../05-governance-compliance/policy-authoring-guide.md)** — Combine multiple policies, simulate impact, test policy changes before publishing.
- **[Policy Expression Language](../03-core-concepts/policy-expression-language.md)** — Deep reference for all 11 operators and their exact semantics.
- **[Governance Validator](../03-core-concepts/policy-engine.md)** — Understand how policies are evaluated and how validation reports are generated.
- **[Agent Blueprint Package](../03-core-concepts/agent-blueprint-package.md)** — Full reference for all ABP fields and structure.

---

## See Also

- [Governance-as-Code](governance-as-code.md) — Foundational principles and architecture
- [SR 11-7 Compliance Mapping](sr-11-7-mapping.md) — How policies support regulatory compliance
- [Compliance Evidence Chain](compliance-evidence-chain.md) — How policies feed into audit and compliance reports
- [Governance Validator](../03-core-concepts/policy-engine.md) — Technical specification of the validation engine

---

*Last updated: 2026-04-05*
