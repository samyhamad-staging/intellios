---
id: 03-003
title: 'Policy Engine: Deterministic Governance Evaluation'
slug: policy-engine
type: concept
audiences:
- compliance
- engineering
status: published
version: 1.0.0
platform_version: 1.0.0
created: '2026-04-05'
updated: '2026-04-05'
author: Intellios
reviewers: []
tags:
- policy-engine
- governance-validator
- validation
- rules
- evaluation
- policies
- remediation
- deterministic
- control-plane
prerequisites:
- 03-001
- 03-002
related:
- 03-002
- 03-004
- 03-001
- 03-005
- 03-007
next_steps:
- 03-002
- 03-004
- 05-010
feedback_url: https://feedback.intellios.ai/kb
tldr: 'The Policy Engine is the evaluation subsystem within Intellios''s Control Plane
  that deterministically validates Agent Blueprint Packages against enterprise governance
  policies. It comprises the Governance Validator (evaluation engine) and policy storage
  layer. Every validation produces an immutable Validation Report containing violations
  with severity levels, and Claude generates remediation suggestions. Error-severity
  violations block the draft→in_review transition; warnings are informational.

  '
---


# Policy Engine: Deterministic Governance Evaluation

> **TL;DR:** The Policy Engine is the evaluation subsystem within Intellios's Control Plane that deterministically validates Agent Blueprint Packages against enterprise governance policies. It comprises the Governance Validator (evaluation engine) and policy storage layer. Every validation produces an immutable Validation Report containing violations with severity levels, and Claude generates remediation suggestions. Error-severity violations block the draft→in_review transition; warnings are informational.

## Overview

Enterprise governance requires that AI agents be evaluated against consistent, auditable rules before reaching production. Without automated policy evaluation, compliance decisions become subjective, slow, and impossible to scale. A compliance officer might approve one agent for using a particular data source while rejecting another for the same reason—inconsistent because the policy was interpreted differently. A regulator investigating a model failure cannot ask "Was this agent evaluated against policy?" if evaluation was manual and undocumented.

The **Policy Engine** solves this problem by automating governance evaluation. It is the subsystem within Intellios's Control Plane that evaluates every Agent Blueprint Package against enterprise policies in a deterministic, reproducible, and fully auditable manner. The Policy Engine comprises two core components:

1. **Governance Validator** — The evaluation engine that loads an ABP and a set of policies, evaluates each policy's rules using deterministic operators, and produces a Validation Report.
2. **Policy Storage Layer** — PostgreSQL-backed storage for versioned governance policies, enabling enterprises to define, version, and maintain a canonical set of rules.

The Policy Engine ensures that every agent created in Intellios is evaluated the same way every time. Non-compliant agents (those with error-severity violations) cannot progress to human review. Compliant agents move faster. Governance officers can defend every approval with definitive evidence: the exact policies applied, the exact fields checked, and the exact outcomes.

## How It Works

### The Evaluation Flow

The Policy Engine operates through a six-step evaluation pipeline:

```
Step 1: ABP Stored in Agent Registry
  ├─ Agent is created via Intake Engine and Generation Engine
  ├─ ABP is immediately stored in Agent Registry (no gating at storage)
  └─ Designer can view, refine, and regenerate the ABP

Step 2: Designer Submits for Review
  ├─ Designer initiates the draft→in_review transition
  └─ Governance Validator is triggered

Step 3: Policy Load and Rule Evaluation
  ├─ Load all applicable policies from Policy Storage
  │  ├─ Global seeded policies (4 required baselines)
  │  └─ Enterprise-specific custom policies
  ├─ For each policy, for each rule:
  │  ├─ Evaluate rule operator (11 operators: exists, equals, contains, etc.)
  │  ├─ Compare against specific ABP field (dot-notation path)
  │  └─ Determine pass/fail
  └─ NO LLM or probabilistic inference in evaluation loop

Step 4: Violation Collection
  ├─ For each failed rule, create a Violation object:
  │  ├─ policyName: name of the policy that failed
  │  ├─ ruleId: unique identifier within policy
  │  ├─ fieldPath: exact ABP field evaluated (e.g., "capabilities.tools")
  │  ├─ severity: "error" or "warning"
  │  └─ message: human-readable violation description
  └─ Collect all violations into a list

Step 5: Claude-Powered Remediation (Batched)
  ├─ For each violation, generate remediation suggestions
  ├─ Use single batched Claude call (not per-violation)
  ├─ Claude returns actionable suggestions for fixing violations
  └─ Suggestions are advisory; developer chooses to apply or ignore

Step 6: Validation Report Generation and Storage
  ├─ Create Validation Report object:
  │  ├─ valid: boolean (true if no error-severity violations)
  │  ├─ violations: array of Violation objects
  │  ├─ policyCount: count of policies evaluated
  │  ├─ generatedAt: ISO 8601 timestamp
  │  └─ remediations: array of remediation suggestions from Claude
  ├─ Store report in agent_blueprints.validation_report (PostgreSQL)
  └─ Return result to designer UI

Step 7: Lifecycle Gate Enforcement
  ├─ If valid == true (no error-severity violations):
  │  └─ Allow draft→in_review transition
  ├─ If valid == false (error-severity violations exist):
  │  ├─ Block transition
  │  ├─ Display violations and remediations to designer
  │  └─ Designer must fix violations or regenerate ABP
  └─ No override or approval exception is possible
```

### The Validation Report

Every validation produces an immutable Validation Report stored in the database. The report captures the complete evaluation state:

```json
{
  "validationReportId": "vr-uuid-v4",
  "abpId": "agent-uuid-v4",
  "abpVersion": "1.2.0",
  "valid": false,
  "violations": [
    {
      "policyName": "Safety Baseline",
      "ruleId": "safety-001",
      "fieldPath": "capabilities.instructions",
      "severity": "error",
      "message": "Agent must have explicit behavioral instructions.",
      "remediation": "Add clear behavioral instructions to guide the agent's responses. Example: 'You are a customer support specialist. Answer questions about our products and services. Never provide personal financial or legal advice. Escalate disputes to a human agent immediately.'"
    },
    {
      "policyName": "Audit Standards",
      "ruleId": "audit-002",
      "fieldPath": "governance.audit.log_interactions",
      "severity": "warning",
      "message": "Consider enabling audit logging for compliance investigations.",
      "remediation": "Set governance.audit.log_interactions to true to enable comprehensive audit trails of all agent interactions."
    }
  ],
  "policyCount": 4,
  "violationCount": 2,
  "errorSeverityCount": 1,
  "warningSeverityCount": 1,
  "generatedAt": "2026-04-05T14:30:22Z",
  "evaluatedPolicies": [
    "Safety Baseline",
    "Audit Standards",
    "Access Control Baseline",
    "Governance Coverage"
  ]
}
```

### Severity Model and Lifecycle Gating

The Policy Engine uses a two-level severity model to gate agent progression:

**Error-Severity Violations** — These represent breaches of fundamental governance rules. An error-severity violation means the agent does not meet a mandatory requirement and cannot reach production. When an ABP has error-severity violations:
- The `draft → in_review` transition is **blocked**
- The ABP remains in draft status
- The designer receives violations and remediation suggestions
- The designer must fix violations or regenerate the ABP
- Re-submission re-triggers evaluation

**Warning-Severity Violations** — These are informational; they suggest best practices, coverage gaps, or optional enhancements. Warnings do not block any lifecycle transitions. An agent with only warning-severity violations can proceed to human review. Warnings help designers improve blueprints without creating hard blocks.

This model ensures that Intellios prevents non-compliant agents from reaching human reviewers while still encouraging continuous governance improvement.

## Key Principles

1. **Deterministic Evaluation** — The Policy Engine uses structured logic with 11 defined operators (exists, equals, contains, matches, count_gte, count_lte, includes_type, not_exists, not_equals, not_contains, not_includes_type). No machine learning, no probabilistic inference in the evaluation loop. Given the same ABP and the same policies, evaluation always produces the same result. This determinism is non-negotiable for compliance audits and regulatory defense.

2. **Storage-Then-Validate** — ABPs are stored in the Agent Registry immediately upon creation. Validation does not block storage. Designers can review, iterate on, and regenerate ABPs freely. Validation only blocks the `draft → in_review` transition, preventing non-compliant agents from reaching human review or production. This design separates the concerns of artifact persistence and governance enforcement.

3. **Severity-Based Gating** — Only error-severity violations block lifecycle transitions. Warning-severity violations are advisory and informational. This distinction allows enterprises to enforce mandatory compliance rules (errors) while encouraging best practices and coverage improvements (warnings) without creating organizational friction.

4. **Hybrid Evaluation and Remediation** — Policy evaluation is purely deterministic. No LLM is involved in deciding whether an agent complies with a rule. However, after evaluation completes, Claude generates remediation suggestions in a single batched call. Suggestions are advisory; developers choose to apply them, modify them, or pursue alternative approaches. This hybrid model balances automation with human judgment.

5. **Policy Composability and Versioning** — Policies are versioned, reusable rule sets stored in the policy registry. An enterprise can define multiple policies (Safety Baseline, Audit Standards, Access Control Baseline, Governance Coverage) and apply them consistently to all agents. Policies are composable: a custom policy can extend or build upon seeded policies. Policy versions track evolution, enabling simulation of policy impact before publishing changes.

6. **Auditability by Design** — Every validation report is immutable and permanently stored. When an agent is approved, the approval includes a reference to the validation report showing the exact policies evaluated, the exact violations (if any), and the exact remediations generated. When a policy changes, impact can be simulated across all deployed agents before the change is published. This creates a complete audit trail.

## The Four Seeded Global Policies

Intellios ships with four global governance policies that are automatically evaluated for every ABP. These policies establish baseline requirements:

### 1. Safety Baseline

Ensures that all agents have explicit safety constraints and behavioral guidance.

**Rules:**
- Agent must have a name
- Agent must have explicit behavioral instructions (system prompt)
- Agent must declare at least one denied action (clarifies scope)

**Purpose:** Prevents agents from deploying with vague or incomplete specifications that could lead to unsafe behavior.

### 2. Audit Standards

Ensures that agents have audit-relevant fields populated and auditable configurations.

**Rules:**
- If agent accesses external data sources, audit logging must be enabled
- Governance section must be populated with at least one policy
- Data retention settings must be explicitly defined

**Purpose:** Ensures that compliance officers and auditors can reconstruct what agents did and why.

### 3. Access Control Baseline

Ensures that data access is explicitly constrained and controlled.

**Rules:**
- If agent accesses customer data, access must be restricted by role or domain
- Denied actions must include at least one data modification restriction (e.g., modify_customer_record)
- All external tools must have documented authentication and authorization

**Purpose:** Prevents agents from accessing data beyond their scope or capability.

### 4. Governance Coverage

Ensures that the governance section of an ABP is sufficiently populated and comprehensive.

**Rules:**
- Governance section must exist and be non-empty
- At least one governance policy must be defined (safety, compliance, data_handling, or access_control)
- Ownership metadata must be populated (business unit, owner email, cost center)

**Purpose:** Ensures that agents are owned, tracked, and managed as controlled artifacts.

Enterprises can layer custom policies on top of these seeded baselines. Custom policies can enforce domain-specific rules (e.g., "All healthcare agents must have HIPAA compliance policy") or organizational rules (e.g., "All agents must declare a cost center for billing").

## Relationship to Other Concepts

The Policy Engine is central to Intellios's governance architecture:

- **[Governance-as-Code](./governance-as-code.md)** — The philosophical foundation. Policies are code, not documents. Governance-as-Code defines the principles; the Policy Engine implements them.

- **[Policy Expression Language](../03-core-concepts/policy-expression-language.md)** — The language used to write policy rules. The 11 operators and field-path syntax enable precise, deterministic rule evaluation.

- **[Agent Blueprint Package (ABP)](./agent-blueprint-package.md)** — The artifact being validated. Every ABP field can be referenced in a policy rule, making governance precise and auditable.

- **[Agent Lifecycle States](./agent-lifecycle-states.md)** — The Policy Engine enforces the critical `draft → in_review` gate. Error-severity violations automatically block this transition.

- **[Compliance Evidence Chain](./compliance-evidence-chain.md)** — Validation reports feed into the compliance evidence chain. Every approval includes validation evidence, creating a complete regulatory audit trail.

## Examples

### Example 1: Evaluation Walkthrough — Customer Service Agent

A regional bank completes intake and generation of a customer service agent. The designer submits for review, triggering the Policy Engine.

**Generated ABP (excerpt):**

```json
{
  "identity": {
    "name": "Customer Service Assistant",
    "description": "Answers customer questions about accounts and products."
  },
  "capabilities": {
    "tools": [
      {
        "name": "retrieve_customer_account",
        "type": "api",
        "description": "Fetch customer account details."
      }
    ]
    // ⚠️ Note: instructions field is NULL (missing)
  },
  "constraints": {
    "allowed_domains": ["account_inquiry", "product_information"],
    "denied_actions": []  // ⚠️ Empty
  },
  "governance": {
    "policies": [],  // ⚠️ Empty
    "audit": {
      "log_interactions": false  // ⚠️ Disabled
    }
  },
  "ownership": {
    "businessUnit": "Retail Banking",
    "ownerEmail": "alice@bank.com"
  }
}
```

**Policy Engine Evaluation:**

| Policy | Rule | Field | Operator | Expected | Actual | Result |
|---|---|---|---|---|---|---|
| Safety Baseline | safety-001 | `identity.name` | exists | exists | "Customer Service Assistant" | ✓ Pass |
| Safety Baseline | safety-002 | `capabilities.instructions` | exists | exists | null | ✗ **Error** |
| Safety Baseline | safety-003 | `constraints.denied_actions` | count_gte | >= 1 | [] (length 0) | ✗ **Error** |
| Audit Standards | audit-001 | `governance.audit.log_interactions` | equals | true | false | ✗ **Warning** |
| Audit Standards | audit-002 | `governance.policies` | not_empty | not empty | [] | ✗ **Error** |
| Access Control Baseline | access-001 | `constraints.allowed_domains` | not_empty | not empty | ["account_inquiry", "product_information"] | ✓ Pass |
| Governance Coverage | gov-001 | `governance` | exists | exists | {...} | ✓ Pass |
| Governance Coverage | gov-002 | `ownership.businessUnit` | exists | exists | "Retail Banking" | ✓ Pass |

**Validation Report Generated:**

```json
{
  "valid": false,
  "violations": [
    {
      "policyName": "Safety Baseline",
      "ruleId": "safety-002",
      "fieldPath": "capabilities.instructions",
      "severity": "error",
      "message": "Agent must have explicit behavioral instructions.",
      "remediation": "Add behavioral instructions such as: 'You are a customer service specialist. Answer questions about customer accounts and our product offerings. Always verify the customer's identity before discussing account details. Escalate disputes or complaints to a human agent immediately. Never offer financial or legal advice.'"
    },
    {
      "policyName": "Safety Baseline",
      "ruleId": "safety-003",
      "fieldPath": "constraints.denied_actions",
      "severity": "error",
      "message": "Agent must explicitly deny at least one action to clarify scope.",
      "remediation": "Add denied_actions such as: ['modify_account_details', 'approve_loan_applications', 'override_fraud_detection', 'initiate_transfers']"
    },
    {
      "policyName": "Audit Standards",
      "ruleId": "audit-002",
      "fieldPath": "governance.policies",
      "severity": "error",
      "message": "Agent must define at least one governance policy.",
      "remediation": "Add a data_handling policy: {type: 'data_handling', rules: ['pii_redaction == true', 'audit_logging == true', 'retention_days <= 90']}"
    },
    {
      "policyName": "Audit Standards",
      "ruleId": "audit-001",
      "fieldPath": "governance.audit.log_interactions",
      "severity": "warning",
      "message": "Consider enabling audit logging for SOX and regulatory compliance.",
      "remediation": "Set governance.audit.log_interactions to true to maintain complete audit trails of all customer interactions."
    }
  ],
  "policyCount": 4,
  "violationCount": 4,
  "errorSeverityCount": 3,
  "warningSeverityCount": 1,
  "valid": false
}
```

**Outcome:** The `draft → in_review` transition is **blocked** because three error-severity violations exist. The designer receives the violations and remediation suggestions in the UI. The designer reviews the suggestions, applies them, and regenerates the ABP. On resubmission, re-evaluation shows that all errors are resolved. The ABP transitions to `in_review` and enters the human review queue.

---

### Example 2: Custom Policy — Financial Services Scenario

A financial services firm defines a custom compliance policy to enforce GLBA (Gramm-Leach-Bliley Act) requirements:

**Custom Policy: GLBA Compliance**

```json
{
  "id": "policy-glba-compliance",
  "name": "GLBA Compliance",
  "severity_default": "error",
  "rules": [
    {
      "id": "glba-001",
      "field": "governance.policies",
      "operator": "includes_type",
      "value": "data_handling",
      "severity": "error",
      "message": "Agents handling customer financial information must have a data_handling policy."
    },
    {
      "id": "glba-002",
      "field": "governance.audit.log_interactions",
      "operator": "equals",
      "value": true,
      "severity": "error",
      "message": "GLBA requires audit logging of all customer interactions."
    },
    {
      "id": "glba-003",
      "field": "constraints.denied_actions",
      "operator": "contains",
      "value": "share_customer_data_externally",
      "severity": "error",
      "message": "GLBA prohibits sharing customer financial data with third parties. Must explicitly deny this action."
    },
    {
      "id": "glba-004",
      "field": "governance.audit.pii_redaction",
      "operator": "equals",
      "value": true,
      "severity": "error",
      "message": "All stored logs must redact PII per GLBA requirements."
    }
  ]
}
```

This custom policy is layered on top of the seeded global policies. When a mortgage assistant ABP is evaluated, it is checked against all 5 policies (4 global + 1 custom). If the ABP fails any GLBA rule, it cannot reach production.

---

## Summary

The Policy Engine is Intellios's enforcement mechanism for Governance-as-Code. By making policy evaluation deterministic, automated, and thoroughly auditable, the Policy Engine enables enterprises to:

- **Scale governance** — Hundreds or thousands of agents evaluated consistently against the same rules.
- **Shift left** — Compliance decisions happen at design time, preventing non-compliant agents from ever reaching production.
- **Defend approvals** — Every agent that reaches production has a validation report showing the exact policies evaluated and violations (if any) that were resolved.
- **Simulate policy changes** — Before publishing a new or modified policy, enterprises can simulate its impact across all deployed agents.
- **Remain audit-ready** — Validation reports are immutable, permanent evidence of governance compliance.

---

*See also: [Governance-as-Code](./governance-as-code.md), [Policy Expression Language](../03-core-concepts/policy-expression-language.md), [Agent Blueprint Package](./agent-blueprint-package.md), [Agent Lifecycle States](./agent-lifecycle-states.md), [Compliance Evidence Chain](./compliance-evidence-chain.md)*

*Next: [Understanding Governance Policies](./governance-as-code.md)*
