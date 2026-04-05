---
id: "07-002"
title: "Policy Management Operations"
slug: "policy-management"
type: "task"
audiences:
  - "compliance"
  - "engineering"
status: "published"
version: "1.0.0"
platform_version: "1.2.0"
created: "2026-04-05"
updated: "2026-04-05"
author: "Intellios Platform Engineering"
reviewers: []
tags:
  - "policy"
  - "governance"
  - "compliance"
  - "policy-versioning"
  - "operations"
prerequisites:
  - "03-002"
  - "05-001"
related:
  - "05-001"
  - "07-001"
  - "04-012"
next_steps:
  - "05-002"
  - "10-003"
feedback_url: "[PLACEHOLDER]"
tldr: >
  Day-to-day governance policy operations in Intellios. Policies define compliance rules,
  safety constraints, and audit requirements. Create policies via the Policy Authoring GUI
  with expression language. Publish new versions without deleting old ones (immutable history).
  Enable/disable policies to pause enforcement. Test policies against existing blueprints
  before publishing. Policies follow a draft → active → deprecated lifecycle. Best practices
  include semantic version naming, change documentation, and pre-deployment testing.
---

# Policy Management Operations

> **TL;DR:** Use the Governance Dashboard to create, publish, enable, disable, and retire governance policies. Policies are versioned; each new version is immutable, with old versions retained for audit. Write policy rules using the Policy Expression Language (JSON-based rule set). Test policies against existing blueprints before publishing. Policies are enterprise-scoped and instantly affect all agent validation. Monitor policy impact across the blueprint portfolio.

---

## Overview

Governance policies are the constraints that every agent blueprint in your enterprise must satisfy. They codify compliance requirements, safety guardrails, audit obligations, and business rules.

**What policies do:**
- Define mandatory safeguards (e.g., "all agents must log decisions")
- Enforce access control (e.g., "agents accessing PII must be approved by Legal")
- Ensure data handling compliance (e.g., "agents cannot export data outside region X")
- Document audit trails (e.g., "all deployments must be auditable")
- Prevent risky agent behaviors (e.g., "no agent shall modify production data without explicit approval")

**Key principle:** Policies are **versioned, immutable, and enterprise-scoped**. When you publish a new version, Intellios keeps the old version for audit. You never modify a policy in place.

---

## The Policy Lifecycle

```
  ┌─────────┐     ┌────────┐     ┌──────────┐     ┌────────────┐
  │  Draft  │────>│ Active │────>│Deprecated│────>│   Archived │
  └─────────┘     └────────┘     └──────────┘     └────────────┘
       ▲               │               ▲
       │               │ (toggle)      │
       └─── Edit ──────┴─ Disable ────┘
```

### Draft
A policy under development. Not yet enforced. Visible only to Policy Authors and Admins. Use draft to write and test policies before publishing.

### Active
Published and enforced. New blueprints must pass validation against all active policies. Existing approved blueprints may have legacy violations (governance drift detection will flag them).

### Deprecated
No longer enforced, but retained in history. Used for audit and compliance records. You can promote a blueprint to a new policy version without re-evaluating against deprecated policies.

### Archived
Old versions, typically retained for 7+ years for compliance. Not displayed in the active policy list but queryable for audit purposes.

---

## Accessing the Governance Dashboard

1. **Log in** to Intellios with Compliance Officer, Policy Author, or Admin role
2. **Navigate to** **Governance** in the main menu
3. **You should see:**
   - Active Policies list
   - Draft Policies section
   - Policy version history
   - Test & Bulk Validation section
   - Audit log of policy changes

---

## Create a New Policy

### Step 1: Start a New Draft

Click **Create Policy** in the Governance Dashboard.

### Step 2: Fill in Metadata

```
Policy Name:        "Data Export Restrictions"
Policy Type:        "data_handling" (or: safety, compliance, access_control, audit)
Description:        "Agents must not export sensitive data outside enterprise regions."
Owner Email:        "compliance@acme.com"
Affected Agents:    [optional] Search and tag agents already subject to this policy
Effective Date:     [optional] Date when this policy becomes active
```

### Step 3: Define Rules

Use the **Policy Expression Language (PEL)** to write rules. Rules are stored as JSON and evaluated during blueprint validation.

**Example Rule (JSON):**
```json
{
  "id": "rule-data-export-001",
  "description": "Restrict data export to approved regions only",
  "expression": {
    "type": "conditional",
    "condition": {
      "property": "abp.tools.*.capabilities",
      "includes": "export_data"
    },
    "then": {
      "property": "abp.guardrails.data_handling.export_regions",
      "mustBeDefined": true,
      "mustMatch": {
        "pattern": "^(us-east|eu-west|ap-southeast)$",
        "message": "export_regions must match approved regional codes"
      }
    }
  },
  "severity": "error",
  "remediationSteps": [
    "Verify the agent's guardrails define allowed export regions",
    "Update 'abp.guardrails.data_handling.export_regions' to approved values",
    "Re-submit for validation"
  ]
}
```

**To write rules:**

1. **Click** "Add Rule"
2. **Choose a template** (or start blank):
   - Required Field template
   - Pattern Match template
   - Conditional template
   - Absence/Presence template
3. **Edit the rule** in JSON or YAML editor
4. **Test the rule** against a sample ABP (see "Test a Policy" section)
5. **Save the rule**

### Step 4: Add Multiple Rules

Repeat the "Add Rule" process for each constraint. Example policy with three rules:

```json
{
  "id": "policy-data-handling",
  "name": "Data Export Restrictions",
  "type": "data_handling",
  "description": "Agents handling customer data must implement regional export restrictions.",
  "version": 1,
  "rules": [
    {
      "id": "rule-001",
      "description": "Data export capabilities must be documented",
      "expression": {
        "type": "conditional",
        "condition": {
          "property": "abp.tools.*.capabilities",
          "includes": "export_data"
        },
        "then": {
          "property": "abp.guardrails.data_handling.export_regions",
          "mustBeDefined": true
        }
      },
      "severity": "error"
    },
    {
      "id": "rule-002",
      "description": "Data retention policy must be specified",
      "expression": {
        "type": "required",
        "property": "abp.guardrails.data_handling.retention_days",
        "message": "Data retention period must be defined"
      },
      "severity": "error"
    },
    {
      "id": "rule-003",
      "description": "PII handling must require approval",
      "expression": {
        "type": "conditional",
        "condition": {
          "property": "abp.capabilities.*.types",
          "includes": "pii"
        },
        "then": {
          "property": "abp.guardrails.approval_required",
          "equals": true
        }
      },
      "severity": "error"
    }
  ]
}
```

### Step 5: Save Draft

Click **Save** to store the draft policy. It's now visible only to Policy Authors and Admins.

---

## Test a Policy

Before publishing a policy, test it against blueprints to ensure it works as intended and doesn't create unintended violations.

### Test Against a Sample Blueprint

1. **In the policy editor**, click **Test Policy**
2. **Choose a test mode:**
   - **Test with sample ABP:** Paste a blueprint JSON
   - **Test against existing blueprints:** Select 1–10 existing blueprints to validate

3. **View results:**
   - ✅ **Passed:** Blueprint satisfies all rules
   - ⚠️ **Warnings:** Rules flagged but not blocking
   - ❌ **Failed:** Blueprint violates one or more rules

4. **For failures:**
   - Review the remediation steps
   - Adjust the policy rule or the blueprint
   - Re-test

**Example test result:**
```json
{
  "status": "failed",
  "violations": [
    {
      "ruleId": "rule-data-export-001",
      "severity": "error",
      "message": "Blueprint is missing 'abp.guardrails.data_handling.export_regions'",
      "remediationSteps": [
        "Add export_regions to the blueprint's data_handling guardrails",
        "Specify allowed regions (us-east, eu-west, ap-southeast)"
      ]
    }
  ],
  "passedChecks": [
    {
      "ruleId": "rule-002",
      "message": "Data retention policy is defined (30 days)"
    }
  ]
}
```

### Bulk Test Against All Blueprints

To understand impact before publishing, test the policy against your entire blueprint portfolio:

1. **Click** **Bulk Validate**
2. **Choose scope:**
   - All blueprints in enterprise
   - Blueprints with specific tags
   - Blueprints created after a date

3. **Review results:**
   - Summary: X% of blueprints pass; Y violations found
   - Breakdown by agent type, owner, status
   - List of blueprints that would fail (with links to fix them)

**Example bulk validation result:**
```
Total Blueprints: 42
Passed: 38 (90.5%)
Failed: 4 (9.5%)

Failing Blueprints:
  1. "Customer Data Processor" (owner: data-eng@acme.com)
     - Missing: abp.guardrails.data_handling.export_regions
     - Remediation: https://intellios.acme.com/registry/agent-123

  2. "PII Redactor" (owner: privacy@acme.com)
     - Violation: approval_required not set to true
     - Remediation: https://intellios.acme.com/registry/agent-456

  ... (more failures)
```

---

## Edit a Policy

**Important:** You edit a draft policy; you don't edit published policies in place. To change a published policy, you publish a new version.

### Edit Draft Policy

1. **Click** the policy name in the Draft Policies list
2. **Modify rules, description, or metadata** as needed
3. **Test again** if you changed rules
4. **Click Save** to update the draft

### Publish a New Version

When you're ready to enforce the policy:

1. **Click Publish** on the draft policy
2. **Review the draft one final time**
3. **Enter a version number** (e.g., 1.0.0 → 1.1.0 or 2.0.0 for breaking changes)
4. **Add a change summary** (what changed, why):
   ```
   Version 1.1.0 - April 2026

   Changes:
   - Relaxed data retention requirement from 90 days to 30 days
   - Added exception for development agents
   - Added new rule for PII approval workflows

   Reason: Align with new data retention policy approved by Legal (PR-2026-0405)

   Impact: ~4 existing blueprints may need updates
   ```

5. **Confirm publish**

**The policy is now active.** All new blueprint validations will check against this version. Existing approved blueprints with violations will be flagged for governance drift.

---

## Enable / Disable Policies

Active policies can be toggled on and off without deletion.

### Disable a Policy

Click the **toggle** next to a policy name in the Active Policies list to disable it. The policy:
- Is no longer enforced on new blueprints
- Does not retroactively affect existing blueprints
- Remains in the policy set (visible in audit logs)
- Can be re-enabled instantly

**Use case:** You need a temporary exception or are phasing out a policy.

### Enable a Policy

Click the **toggle** to re-enable a disabled policy. New blueprint validations immediately include this policy again.

---

## Retire / Deprecate a Policy

When a policy is no longer needed, deprecate it instead of deleting it.

### Deprecate a Policy

1. **Click the policy** to open its details
2. **Click Deprecate**
3. **Enter a retirement reason:**
   ```
   Retirement Reason: Compliance requirement (SOC 2) no longer applies.

   Effective Date: 2026-05-01

   Impact: No new blueprints will validate against this policy.
   Existing blueprints will no longer show violations related to this policy.
   ```

4. **Confirm deprecation**

**Effect:**
- Policy moves to the Deprecated section
- No longer enforced on new blueprints
- No longer counts as a violation for existing blueprints
- Retained in audit logs and policy history
- Can be restored by an Admin if needed

---

## Policy Expression Language (PEL)

Intellios policies use a **JSON-based rule expression language** designed for non-programmers while supporting complex logic.

### Rule Types

#### 1. **Required Field**

Assert that a field exists and has a value.

```json
{
  "type": "required",
  "property": "abp.identity.owner",
  "message": "Every agent must have an owner email defined"
}
```

#### 2. **Pattern Match**

Validate a field against a regex pattern.

```json
{
  "type": "pattern",
  "property": "abp.identity.owner",
  "pattern": "^[^@]+@(acme\\.com|approved-partner\\.com)$",
  "message": "Agent owner must be an Acme employee or approved partner"
}
```

#### 3. **Conditional (If-Then)**

If a condition is true, assert a consequence.

```json
{
  "type": "conditional",
  "condition": {
    "property": "abp.purpose.risk_tier",
    "equals": "critical"
  },
  "then": {
    "property": "abp.approval_required",
    "equals": true,
    "message": "Critical agents must require approval"
  }
}
```

#### 4. **Enum (Allowed Values)**

Restrict a field to specific values.

```json
{
  "type": "enum",
  "property": "abp.purpose.agent_type",
  "allowedValues": ["automation", "decision-support"],
  "message": "Only automation and decision-support agents are approved; request exception for others"
}
```

#### 5. **Array Contains**

Assert that an array contains specific values.

```json
{
  "type": "arrayContains",
  "property": "abp.guardrails.safety_checks",
  "mustContain": ["output_validation", "rate_limiting"],
  "message": "All agents must include output validation and rate limiting"
}
```

#### 6. **Absence (Negative Check)**

Assert that a field is NOT present or a property does NOT match.

```json
{
  "type": "mustNotExist",
  "property": "abp.guardrails.data_export_unrestricted",
  "message": "Unrestricted data export is forbidden"
}
```

### Composing Rules

Combine conditions using **AND** and **OR**:

```json
{
  "type": "composite",
  "operator": "AND",
  "conditions": [
    {
      "property": "abp.purpose.agent_type",
      "equals": "autonomous"
    },
    {
      "property": "abp.guardrails.human_approval_required",
      "equals": true
    }
  ],
  "message": "Autonomous agents must require human approval before execution"
}
```

### Reserved Policy Expression Functions

| Function | Syntax | Example |
|----------|--------|---------|
| Equals | `property: { equals: value }` | `{ equals: "critical" }` |
| Not Equals | `{ notEquals: value }` | `{ notEquals: "development" }` |
| In Array | `{ in: [val1, val2] }` | `{ in: ["us-east", "eu-west"] }` |
| Includes (substring/array) | `{ includes: value }` | `{ includes: "pii" }` |
| Regex Match | `{ matches: "regex" }` | `{ matches: "^[a-z-]+$" }` |
| Greater Than | `{ gt: value }` | `{ gt: 10 }` |
| Less Than | `{ lt: value }` | `{ lt: 100 }` |
| Defined | `{ isDefined: true }` | Check field exists |
| Deep Path | `abp.tools[*].name` | Wildcard array iteration |

For detailed PEL reference, see **Policy Expression Language Guide** (05-002).

---

## Best Practices

### 1. Semantic Versioning for Policies

Use semver (MAJOR.MINOR.PATCH) for policy versions:

- **MAJOR** (1.0.0 → 2.0.0): Breaking change; old blueprints may need updates
- **MINOR** (1.0.0 → 1.1.0): New rule added; generally backward compatible
- **PATCH** (1.0.0 → 1.0.1): Bug fix or clarification; no impact expected

**Examples:**
- `1.0.0` → Data Export Restrictions (initial release)
- `1.1.0` → Add exception for development agents (non-breaking)
- `2.0.0` → Restructure approval workflows (breaking; impacts ~30 agents)

### 2. Document Change Rationale

Every version should include:
- **What changed:** List new/modified/removed rules
- **Why:** Link to requirement, ticket, or audit finding
- **Impact estimate:** How many blueprints are affected?
- **Effective date:** When does it take effect?

**Example:**
```
Version 2.0.0 - Q2 2026 Compliance Update

What Changed:
  - New rule: All agents must log decisions to approved audit system
  - Modified rule: Approval is now required for "critical" tier (was "critical" + "high")
  - Removed rule: Legacy data retention requirement (superseded by global retention policy)

Why:
  - Requirement from Q2 2026 Compliance Review (SOC 2 audit ticket SOC2-2026-04-001)
  - Risk tier classification updated to match new Risk Tier Matrix

Impact:
  - 12 blueprints in "in_review" status will require updates
  - 28 approved blueprints will show governance drift (non-blocking, admin will investigate)
  - 3 blueprints fully compliant; no action required

Effective Date: 2026-05-01

Author: compliance@acme.com
Approved By: cto@acme.com (via ticket TICKET-1234)
```

### 3. Test Before Publishing

**Always test a new policy version against your blueprint portfolio:**

1. Create the draft
2. Run bulk validation against existing blueprints
3. Review failing blueprints; understand remediation effort
4. Coordinate with affected teams (designers, compliance)
5. Set an effective date that gives teams time to remediate
6. Publish

### 4. Provide Clear Remediation Steps

Every rule should include actionable remediation steps:

```json
{
  "id": "rule-approval-required",
  "description": "Critical agents must require approval before execution",
  "severity": "error",
  "remediationSteps": [
    "1. Open your blueprint in the Intake Engine",
    "2. Navigate to 'Guardrails' → 'Execution Controls'",
    "3. Check 'Require human approval before execution'",
    "4. Re-submit your blueprint for review",
    "Need help? See https://intellios.acme.com/docs/approval-workflows"
  ]
}
```

### 5. Version Policy Alongside Business Changes

When your compliance, risk, or legal landscape changes, update policies in lockstep:

- New regulation → New policy rule
- Merger acquisition → Integrate partner policies
- Risk incident → Tighten policy guardrails
- Approved exception → Add policy exception (with expiration)

### 6. Monitor Policy Impact

After publishing a policy, track:
- **Adoption:** How many new blueprints pass the policy?
- **Remediation:** How many existing blueprints need updates?
- **Exceptions:** How many formal exceptions have been granted?
- **Violations:** Are any approved blueprints drifting?

Use the **Governance Dashboard** → **Policy Impact** section to view these metrics.

### 7. Archive Old Versions

Retain old policy versions for audit, but archive them after 2–3 years:

```sql
-- Move old versions to archive table (example)
INSERT INTO policy_archive
SELECT * FROM governance_policies
WHERE superseded_at < now() - interval '3 years';

DELETE FROM governance_policies
WHERE id IN (SELECT id FROM policy_archive);
```

Ensure your audit trail and SIEM systems have already exported these records before deletion.

---

## Policy Exceptions

Sometimes a specific blueprint needs an exception to a policy rule.

### Request a Policy Exception

1. **Designer** finds their blueprint fails a policy
2. **Click Request Exception** in the validation report
3. **Fill in the exception request:**
   ```
   Policy: "Data Export Restrictions"
   Failing Rule: "export_regions must be defined"

   Reason: "This agent is internal development; exports are to development databases only"

   Duration: "Until 2026-07-01 (end of development sprint)"

   Justification: "This is a temporary development tool and will be deprecated after this sprint"
   ```

4. **Submit for approval**

### Approve a Policy Exception

1. **Admin/Compliance Officer** receives the exception request
2. **Evaluates** the risk and justification
3. **Approves or denies** (with comment)
4. **If approved:**
   - Exception is added to the policy
   - Exception includes expiration date
   - Notification sent to designer
   - Blueprint can now proceed

---

## Bulk Operations

### Bulk Assign Policy to Agents

Apply a policy to specific agents retroactively:

1. **Policy** → **Assign to Agents**
2. **Select agents** (by tag, status, owner, date range)
3. **Review impact** (X blueprints will be re-evaluated)
4. **Confirm**
5. New validation results are available immediately

### Bulk Policy Update

Update multiple policies at once (e.g., all `data_handling` policies):

1. **Click Bulk Update**
2. **Filter policies** (by type, owner, status)
3. **Choose action:**
   - Add tag/label
   - Enable/disable
   - Set expiration date
   - Apply to specific agents

### Export Policy Report

Export a summary of all policies for compliance documentation:

1. **Click Export Policies**
2. **Choose format:** PDF, CSV, JSON
3. **Include:** Descriptions, rules, versions, change history, impact summary
4. **Download**

---

## Audit Trail for Policy Changes

All policy actions are logged in the `audit_log` table:

```json
{
  "id": "uuid",
  "entityType": "policy",
  "entityId": "policy-uuid",
  "action": "policy.updated",
  "actorEmail": "compliance@acme.com",
  "actorRole": "compliance_officer",
  "enterpriseId": "acme-corp",
  "fromState": {
    "name": "Data Export Restrictions",
    "version": 1,
    "rules": [...]
  },
  "toState": {
    "name": "Data Export Restrictions",
    "version": 2,
    "rules": [...]
  },
  "metadata": {
    "change_summary": "Added exception for development agents",
    "effective_date": "2026-05-01"
  },
  "createdAt": "2026-04-05T10:30:00Z"
}
```

**Query policy changes:**
```sql
SELECT action, actor_email, created_at, metadata
FROM audit_log
WHERE entity_type = 'policy'
  AND entity_id = 'policy-uuid'
ORDER BY created_at DESC;
```

---

## Common Workflows

### Workflow 1: Publish a New Compliance Requirement

1. **Legal/Compliance team** identifies new requirement (regulation, audit finding, risk)
2. **Create draft policy** with rules translating requirement to enforcement logic
3. **Test bulk validation** against existing blueprints
4. **Identify impacted teams** and coordinate timeline
5. **Set effective date** 2–4 weeks in future to allow remediation
6. **Publish policy**
7. **Monitor exceptions** and track remediation progress
8. **Post-deployment review:** Did teams meet the deadline? Any unexpected failures?

### Workflow 2: Retire an Outdated Policy

1. **Determine sunset date** (e.g., 6 months hence)
2. **Announce deprecation** to all teams
3. **Publish final version** marking policy as deprecated (optional)
4. **Disable policy** on effective date (no longer enforced)
5. **Monitor for 1 month** to ensure no issues
6. **Archive old versions** after 2–3 years

### Workflow 3: Refine a Policy After Incidents

1. **Incident occurs** (governance violation, security issue)
2. **Post-mortem analysis** identifies root cause and needed policy tightening
3. **Create new policy version** with stricter rules
4. **Test against all blueprints** to estimate impact
5. **Publish with effective date** allowing teams to remediate
6. **Track exceptions** if teams need time

### Workflow 4: Grant a Formal Exception

1. **Designer** requests exception to a policy
2. **Compliance team** evaluates risk, documents justification
3. **Approves or escalates** to CTO/CISO
4. **Records exception** with expiration date and approval chain
5. **Monitors expiration** and sends reminder before expiring
6. **Post-exception review:** Did the approved risk manifest? Was the exception justified?

---

## Summary

Policy management in Intellios:
- **Create policies** using JSON rule expressions to define compliance constraints
- **Test before publishing** to understand impact on your blueprint portfolio
- **Publish new versions** (never edit in place) for immutable audit history
- **Enable/disable** to pause enforcement without deletion
- **Deprecate** to retire policies while keeping audit history
- **Grant exceptions** for approved deviations
- **Monitor impact** across your blueprint portfolio
- **Document rationale** for compliance and knowledge transfer

Policies are the guardrails that keep your enterprise's AI agents safe, compliant, and trustworthy.
