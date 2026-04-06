---
id: 03-002
title: 'Governance-as-Code: Deterministic Policy Automation'
slug: governance-as-code
type: concept
audiences:
- compliance
- engineering
- executive
status: published
version: 1.0.0
platform_version: 1.0.0
created: '2026-04-05'
updated: '2026-04-05'
author: Intellios
reviewers: []
tags:
- governance
- policy
- compliance
- rules
- automation
- deterministic
- governance-as-code
prerequisites: []
related:
- 03-001
- 03-003
- 03-005
- 03-007
next_steps:
- 05-010
- 03-005
feedback_url: https://feedback.intellios.ai/kb
tldr: 'Governance-as-Code is Intellios''s foundational principle: governance policies
  are expressed as structured, machine-evaluable rules—not documents, checklists,
  or manual reviews. Policies use 11 deterministic operators and are evaluated the
  same way every time, ensuring reproducible, auditable compliance decisions that
  gate the agent creation pipeline.

  '
---


# Governance-as-Code: Deterministic Policy Automation

> **TL;DR:** Governance-as-Code is Intellios's foundational principle: governance policies are expressed as structured, machine-evaluable rules—not documents, checklists, or manual reviews. Policies use 11 deterministic operators and are evaluated the same way every time, ensuring reproducible, auditable compliance decisions that gate the agent creation pipeline.

## Overview

Governance in traditional enterprises is broken. Compliance policies live in spreadsheets, Word documents, or Confluence wikis. They are interpreted inconsistently, enforced reactively (if at all), and impossible to audit at scale. When a new AI system is built, teams ask: "Does this meet policy?" The answer comes from a compliance officer reading a policy document and making a judgment call—a process that is slow, subjective, and unauditable.

This approach fails at enterprise scale. It fails when you need to deploy dozens of AI agents per quarter. It fails when regulators demand evidence that every agent complies with specific rules. It fails when policies change and you need to understand the impact on deployed systems immediately.

**Governance-as-Code solves this problem by turning governance policies into code—structured, machine-evaluable rules that can be automatically applied to every agent at the moment of creation.**

Instead of asking "Does this agent meet policy?" and waiting for a human judgment, Intellios asks "Does this agent's blueprint match these policy rules?" and returns a deterministic, auditable answer in milliseconds. Error-severity violations block deployment. Warnings are informational. Remediations are suggested by Claude, but the decision to apply them remains with the developer. The entire process is transparent, reproducible, and compliant.

For regulated enterprises—financial services firms subject to SR 11-7, healthcare organizations under HIPAA, companies handling EU personal data under GDPR—Governance-as-Code is operationally essential. It shifts compliance from a post-deployment inspection to a design-time constraint. Non-compliant agents cannot reach production. Compliant agents move faster. Regulators get a complete audit trail showing that every agent was evaluated against defined policies.

## How It Works

### Policy Structure

A governance policy in Intellios is a collection of **rules**. Each rule is a structured assertion about what an Agent Blueprint Package must contain or must not contain.

```json
{
  "id": "pii-access-control-001",
  "name": "PII Access Control Baseline",
  "description": "Agents handling PII must declare explicit access controls and data retention policies.",
  "severity_default": "error",
  "rules": [
    {
      "id": "rule-001",
      "field": "capabilities.tools",
      "operator": "not_empty",
      "severity": "error",
      "message": "Agent must declare tools that access PII. If intentional, declare empty array."
    },
    {
      "id": "rule-002",
      "field": "governance.policies",
      "operator": "includes_type",
      "value": "data_retention",
      "severity": "error",
      "message": "Agent accessing PII must specify a data retention policy."
    },
    {
      "id": "rule-003",
      "field": "constraints.denied_actions",
      "operator": "contains",
      "value": "modify_customer_record",
      "severity": "error",
      "message": "Agent must explicitly deny modifications to customer records without human approval."
    },
    {
      "id": "rule-004",
      "field": "governance.audit.log_interactions",
      "operator": "equals",
      "value": true,
      "severity": "warning",
      "message": "Consider enabling interaction logging for audit compliance."
    }
  ]
}
```

### The 11 Operators

Each rule uses one of 11 deterministic operators to evaluate a field (addressed by dot-notation path into the ABP) against an optional comparison value:

| Operator | Applies to | Passes when |
|---|---|---|
| `exists` | any | field is not null, undefined, empty string, or empty array |
| `not_exists` | any | field is null, undefined, empty string, or empty array |
| `equals` | scalar | field strictly equals `rule.value` |
| `not_equals` | scalar | field does not strictly equal `rule.value` |
| `contains` | string or array | string includes `rule.value`, or array element matches `rule.value` |
| `not_contains` | string or array | negation of `contains` |
| `matches` | string | string matches regex pattern in `rule.value` |
| `count_gte` | array | array length >= `rule.value` (numeric) |
| `count_lte` | array | array length <= `rule.value` (numeric) |
| `includes_type` | array of objects | array contains an element where `.type === rule.value` |
| `not_includes_type` | array of objects | no element has `.type === rule.value` |

### Evaluation Flow

When an Agent Blueprint Package is generated, the **Governance Validator** automatically evaluates it against all applicable policies:

```
1. ABP is generated from intake data
   ↓
2. Load enterprise governance policies (global + enterprise-specific)
   ↓
3. For each policy, evaluate each rule using deterministic operators
   (no AI, pure logic, same result every time)
   ↓
4. Collect violations (field path, operator, severity, message)
   ↓
5. Generate Claude-powered remediation suggestions in a single batched call
   ↓
6. Store validation report in database
   ↓
7. Block draft→in_review transition if error-severity violations exist
   ↓
8. Display violations and remediation options to the designer
```

The critical point: **evaluation is deterministic.** Given the same ABP and the same policies, the evaluator always produces the same result. No probabilistic outcomes. No LLM inference in the evaluation loop. This determinism is essential for compliance audits. When a regulator asks "Why was this agent approved?", you can point to the exact rule, the exact field value, and the exact logic that caused the approval.

### Severity Model

Rules specify a **severity** level:

- **Error** — Violations block the lifecycle transition `draft → in_review`. An agent with error-severity violations cannot proceed to human review until the violations are fixed. This is a hard gate.
- **Warning** — Informational only. Does not block any lifecycle transition. Warnings help designers understand best practices and coverage gaps without forcing compliance.

### Remediation Suggestions

After deterministic evaluation, the Governance Validator calls Claude to generate remediation suggestions for each violation in a single batched call. These suggestions are:

- **AI-assisted, not AI-decided.** Claude proposes fixes; the developer chooses to apply them or find an alternative approach.
- **Specific and actionable.** "Add a data retention policy to `governance.policies`" rather than generic advice.
- **Stored in the validation report** and displayed in the UI alongside the violation, making the path to compliance clear.

This hybrid approach—deterministic policy evaluation + Claude-powered remediation—balances automation with human judgment. Policies are not flexible or subject to LLM interpretation. But resolving violations benefits from Claude's understanding of blueprints, domain knowledge, and creative suggestions.

## Key Principles

1. **Deterministic Evaluation** — Policies are evaluated using structured logic with 11 defined operators. No machine learning inference in the policy evaluation loop. Same ABP + same policies = same result, always. This reproducibility is non-negotiable for compliance audits.

2. **Severity-Gated Lifecycle** — Error-severity violations block design-time transitions (draft → in_review), preventing non-compliant agents from reaching human review or deployment. Warning-severity violations are informational and do not block progression. Severity is explicit in policy rules.

3. **Composable Policies** — Policies are versioned, reusable rule sets that can be combined. A single governance policy might enforce "PII Access Control." Another might enforce "Audit Standards." A third might enforce "SOX Compliance." Enterprise admins compose policies into enterprise-wide policy sets and apply them consistently across all agents.

4. **AI-Assisted, Human-Decided Remediation** — Claude generates suggested fixes for violations, but remediation is not automatic. Developers review suggestions, apply what works, and override or ignore suggestions as appropriate. Governance rules are fixed; remediation paths are flexible.

5. **Auditability by Design** — Every policy evaluation is logged with its result, violations, and remediation suggestions. When an agent is approved, the approval includes a complete validation report. When policies change, a simulation endpoint shows impact on all deployed agents before the change is published. Compliance officers can answer "Why was this agent approved?" with definitive evidence.

6. **No Shadow Governance** — All governance policies are stored in a versioned policy registry (PostgreSQL), not scattered across documents or Slack. Policy changes are tracked. Policy impact is simulated before publishing. This creates a single source of truth for governance intent.

## Relationship to Other Concepts

Understanding Governance-as-Code requires understanding how it connects to the broader Intellios system:

- **[Agent Blueprint Package (ABP)](agent-blueprint-package.md)** — The artifact that policies evaluate. Every governance rule is a structured assertion about what must exist or not exist in an ABP.

- **[Governance Validator](../03-core-concepts/policy-engine.md)** — The subsystem that implements governance-as-code. It loads policies, runs the deterministic evaluator, batches remediation suggestions, and stores validation reports.

- **[Agent Lifecycle](agent-lifecycle.md)** — The state machine that agents move through (draft → in_review → approved → deployed). Governance policies constrain these transitions. An agent cannot leave draft until error-severity violations are resolved.

- **[Compliance Evidence Chain](../03-core-concepts/compliance-evidence-chain.md)** — How Intellios generates and maintains audit trails, model inventories, and compliance documentation. Governance-as-Code generates the deterministic evidence that feeds into compliance reports for regulators.

- **[Policy Engine](../03-core-concepts/policy-engine.md)** — The runtime system that enforces governance policies during agent execution. Governance-as-Code defines the policies; the Policy Engine applies them at runtime.

## Examples

### Example 1: PII Access Control Policy

A financial services firm operates under SOX and GLBA regulations. They define a PII Access Control policy to ensure that any agent handling customer data includes explicit access controls and retention policies.

**Policy Definition:**

```json
{
  "id": "policy-pii-access-control",
  "name": "PII Access Control Baseline",
  "rules": [
    {
      "id": "pii-001",
      "field": "governance.policies",
      "operator": "includes_type",
      "value": "data_retention",
      "severity": "error",
      "message": "Blueprint must define a data retention policy (e.g., delete logs after 90 days)."
    },
    {
      "id": "pii-002",
      "field": "capabilities.tools",
      "operator": "not_empty",
      "severity": "error",
      "message": "If agent accesses PII, declare tools explicitly. If intentional, set to empty array."
    },
    {
      "id": "pii-003",
      "field": "constraints.denied_actions",
      "operator": "includes_type",
      "value": "export_customer_data",
      "severity": "error",
      "message": "Must explicitly deny bulk customer data exports."
    },
    {
      "id": "pii-004",
      "field": "governance.audit.log_interactions",
      "operator": "equals",
      "value": true,
      "severity": "warning",
      "message": "Consider enabling interaction logging for SOX audit trails."
    }
  ]
}
```

**Generated Agent Blueprint (Customer Service Bot):**

```json
{
  "identity": {
    "name": "mortgage-faq-bot",
    "description": "Answers customer questions about mortgage products."
  },
  "capabilities": {
    "tools": [
      {
        "name": "fetch_customer_account",
        "description": "Retrieve customer account details (name, account balance, loan terms)."
      },
      {
        "name": "fetch_mortgage_rates",
        "description": "Retrieve current mortgage rates from external rate feed."
      }
    ],
    "instructions": "Answer customer mortgage questions with accuracy and professionalism."
  },
  "constraints": {
    "denied_actions": [
      "export_customer_data",
      "modify_customer_account",
      "approve_loan_application_without_human"
    ]
  },
  "governance": {
    "policies": [
      {
        "type": "data_retention",
        "rule": "Delete all logged customer interactions after 90 days. Purge daily."
      }
    ],
    "audit": {
      "log_interactions": true
    }
  }
}
```

**Evaluation:**

| Rule | Field | Operator | Value | Field Value in ABP | Result | Severity |
|---|---|---|---|---|---|---|
| pii-001 | `governance.policies` | `includes_type` | `data_retention` | `[{type: "data_retention", ...}]` | ✓ Pass | error |
| pii-002 | `capabilities.tools` | `not_empty` | (none) | `[{name: "fetch_customer_account"}, ...]` | ✓ Pass | error |
| pii-003 | `constraints.denied_actions` | `includes_type` | `export_customer_data` | `["export_customer_data", ...]` | ✓ Pass | error |
| pii-004 | `governance.audit.log_interactions` | `equals` | `true` | `true` | ✓ Pass | warning |

**Outcome:** Blueprint passes all error-severity rules. Can proceed to in_review. Warning is informational (already compliant in this case).

---

### Example 2: Safety Baseline Policy with Remediation

A healthcare organization seeded the following Safety Baseline policy to ensure all agents have explicit instructions and behavioral constraints.

**Policy Definition:**

```json
{
  "id": "policy-safety-baseline",
  "name": "Safety Baseline",
  "rules": [
    {
      "id": "safety-001",
      "field": "identity.name",
      "operator": "exists",
      "severity": "error",
      "message": "Agent must have a name."
    },
    {
      "id": "safety-002",
      "field": "capabilities.instructions",
      "operator": "exists",
      "severity": "error",
      "message": "Agent must have explicit behavioral instructions."
    },
    {
      "id": "safety-003",
      "field": "constraints.denied_actions",
      "operator": "count_gte",
      "value": 1,
      "severity": "warning",
      "message": "Consider listing at least one explicitly denied action to clarify agent scope."
    }
  ]
}
```

**Generated Agent Blueprint (Clinical Research Assistant):**

```json
{
  "identity": {
    "name": "clinical-research-copilot",
    "description": "Assists researchers in literature review and data extraction."
  },
  "capabilities": {
    "tools": [],
    "instructions": null  // Oops! Instructions are missing
  },
  "constraints": {
    "denied_actions": []
  }
}
```

**Evaluation:**

| Rule | Field | Result | Severity |
|---|---|---|---|
| safety-001 | `identity.name` | ✓ Pass | error |
| safety-002 | `capabilities.instructions` | ✗ **Violation** | error |
| safety-003 | `constraints.denied_actions` | ✓ Pass (empty array = length 0, not >= 1) | warning |

**Violations Reported:**

```
Error: Rule safety-002 violated
Field: capabilities.instructions
Operator: exists
Message: Agent must have explicit behavioral instructions.

Suggested Remediation (Claude):
"Add behavioral instructions to guide the agent. For a research assistant, consider:
'You are a clinical research copilot. Your role is to assist researchers in
literature review and data extraction from published studies. You must not:
- Provide medical advice or diagnosis. - Modify or delete research data.
- Access patient records or identifiable data. Escalate questions about study
methodology to the research lead.'"
```

**Developer Action:** The designer reads the suggestion, refines it to match the organization's voice, and updates the blueprint. On re-validation, the rule passes. The agent can now proceed to in_review.

---

## Why Governance-as-Code Matters for Regulated Enterprises

**Regulatory Compliance Under Pressure**

Financial regulators (Federal Reserve SR 11-7), healthcare authorities (FDA, HHS), and data protection bodies (ICO, CNIL) increasingly expect enterprises to demonstrate that AI systems are governed. SR 11-7 explicitly requires documented governance policies, model risk management, and audit trails. Governance-as-Code generates all three automatically—policies are defined in code, risk is managed by gating deployments, and audit trails are inherent.

**Speed Without Sacrificing Control**

Traditional governance is a bottleneck. Compliance officers review blueprints manually, asking "Does this meet policy?" Governance-as-Code answers that question instantly and deterministically. Agents that comply move within hours. Agents that don't comply receive remediations and can iterate. Your enterprise accelerates AI deployment while *reducing* compliance risk, not increasing it.

**Auditability and Non-Repudiation**

When a regulator asks, "Why was this agent approved?", you don't point to a policy document and a human judgment. You provide a complete validation report showing the exact policies evaluated, the exact rules applied, the exact fields checked, and the exact outcomes. This level of transparency and repeatability is impossible with manual governance.

**Policy as Infrastructure**

Like infrastructure-as-code in DevOps, Governance-as-Code treats policies as versioned, reusable, testable assets. Policies are not scattered across documents. They live in a policy registry, are version-controlled, and can be tested against blueprints before publishing changes. Policy impact can be simulated across all deployed agents. This rigor is essential for enterprises managing tens or hundreds of agents.

---

## Next Steps

Now that you understand Governance-as-Code principles, explore these topics:

- **[Defining Governance Policies](../05-governance-compliance/policy-authoring-guide.md)** — Learn how to write deterministic rules using the 11 operators.
- **[Agent Lifecycle](agent-lifecycle.md)** — Understand how governance policies constrain agent progression through the creation pipeline.
- **[Governance Validator](../03-core-concepts/policy-engine.md)** — Deep dive into the validation engine and API.
- **[Compliance Evidence Chain](../03-core-concepts/compliance-evidence-chain.md)** — See how governance-as-code feeds into regulatory compliance evidence generation.
- **[SR 11-7 Compliance Mapping](../05-governance-compliance/sr-11-7-mapping.md)** — Learn how Intellios satisfies Federal Reserve Model Risk Management requirements.

---

*See also: [Agent Blueprint Package](agent-blueprint-package.md), [Governance Validator](../03-core-concepts/policy-engine.md), [Agent Lifecycle](agent-lifecycle.md), [Compliance Evidence Chain](../03-core-concepts/compliance-evidence-chain.md)*

*Next: [Defining Governance Policies](../05-governance-compliance/policy-authoring-guide.md)*
