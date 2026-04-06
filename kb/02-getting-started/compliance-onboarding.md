---
id: 02-002
title: 'Compliance Onboarding: 30-Minute Framework Setup'
slug: compliance-onboarding
type: task
audiences:
- compliance
- risk
- governance
status: published
version: 1.0.0
platform_version: 1.2.0
created: '2026-04-05'
updated: '2026-04-05'
author: Intellios
reviewers: []
tags:
- quick-start
- compliance
- onboarding
- governance
- regulatory-framework
- policy-authoring
- sr-11-7
prerequisites:
- 05-001
- 05-002
- 05-003
related:
- 05-001
- 03-004
- 05-010
- 03-003
next_steps:
- 05-010
- 05-010
- 05-008
feedback_url: https://feedback.intellios.ai/kb
tldr: 'Map your regulatory framework to Intellios, seed four baseline policies, create
  a custom policy using the deterministic policy expression language, validate a sample
  blueprint, review the compliance evidence chain, and set up your review workflow.
  30 minutes. Outcome: Your governance posture is configured, auditable, and compliant
  with SR 11-7, OCC, and EU AI Act requirements.

  '
---


# Compliance Onboarding: 30-Minute Framework Setup

> **Bottom Line:** In 30 minutes, you'll map your regulatory framework to Intellios capabilities, seed
> your baseline governance policies, author your first custom policy, validate it against a sample agent,
> and establish your governance review workflow. Outcome: Your governance posture is configured and
> auditable by design.

## Your Compliance Challenge

Your organization deploys AI agents across production systems. Regulators expect:

- **SR 11-7** (Federal Reserve, financial services): Model inventory, governance documentation, risk
  classification, independent validation, ongoing monitoring, audit trails, and defined approval authority.
- **OCC Guidance** (Comptroller of the Currency, national banks): AI governance maturity assessment,
  control environment, risk management integration, and third-party management.
- **EU AI Act** (European Union, high-risk AI): Compliance evidence for high-risk systems, transparency,
  human oversight, and audit trail documentation.

**Your Current State:** You have governance requirements but lack the infrastructure to implement them
deterministically. Documentation is manual. Approval chains are email-based. Audit trails are assembled
post-deployment.

**Intellios Solves This:** Governance is deterministic. Policies are rules, not prose. Compliance evidence
is generated automatically. Audit trails are maintained in real-time.

---

## Step 1: Map Your Regulatory Framework to Intellios (5 minutes)

Before configuring policies, understand how Intellios addresses your regulatory obligations.

### SR 11-7 Mapping (Financial Services)

SR 11-7 requires:

| Requirement | Intellios Capability | Artifact |
|---|---|---|
| **Model inventory & unique identification** | Agent Registry with unique agent_id, versioning, metadata | Registry view + ABP metadata |
| **Clear model documentation** | Agent Blueprint Package (ABP) with identity, capabilities, constraints, governance sections | ABP JSON + markdown summary |
| **Development methodology & risk taxonomy** | Intake Engine with Phase 1 context, Phase 2 governance probing, Phase 3 review | IntakeContext + IntakePayload |
| **Independent validation** | Governance Validator with deterministic policy evaluation | Validation Report |
| **Governance roles & approval authority** | Review UI with lifecycle state machine, RBAC, approval chain | Approval workflow with timestamps |
| **Model change control & versioning** | Agent Registry with semantic versioning, full history, audit trail | agent_blueprints table + audit_log |
| **Data lineage, inputs, quality** | Intake Engine stakeholder contributions + constraints | IntakePayload + ABP constraints |

**Your Action:** Open the **[SR 11-7 Compliance Mapping](../05-governance-compliance/sr-11-7-mapping.md)** article. Confirm that each SR 11-7 requirement maps to an Intellios capability. This is your compliance roadmap.

### OCC Guidance Mapping (National Banks)

OCC expects AI governance maturity. Intellios demonstrates maturity via:

1. **Governance Infrastructure** — The Agent Registry, Governance Dashboard, and Policy Engine show
   systematic governance.
2. **Control Environment** — Deterministic policies enforce controls. Violations are detected automatically.
3. **Risk Management Integration** — Risk classification is captured in the Intake Engine. Risk policies are
   evaluated by the Governance Validator.
4. **Third-Party Management** — Runtime adapters document vendor selection (AWS, Azure, on-premise). ABP
   metadata tracks external dependencies.

**Your Action:** Note where your governance maturity gaps are. Intellios will fill them.

### EU AI Act Mapping (High-Risk AI)

EU AI Act requires high-risk AI systems to have:

- Risk assessment and mitigation strategy
- Transparency and documentation
- Human oversight procedures
- Audit trail and record-keeping

Intellios addresses this via:

- **Risk Assessment** — Intake Engine captures regulatory scope, data sensitivity, constraints.
- **Transparency** — ABP is the transparency artifact. It documents agent purpose, capabilities, constraints,
  data handling.
- **Human Oversight** — Review Queue implements human approval before deployment.
- **Audit Trail** — Governance Dashboard logs every event (creation, modification, approval, deployment).

**Your Action:** If you're subject to EU AI Act, note the high-risk AI use cases. You'll configure specific
policies for them.

---

## Step 2: Review Seeded Baseline Policies (5 minutes)

Intellios ships with four seeded baseline policies. These are starting points; you'll customize them.

### Policy 1: Safety Baseline

**Purpose:** Enforce safety constraints (no harmful instructions, behavioral guardrails, risk mitigations).

**Example Rules:**

- Agent must have behavioral instructions defined
- Agent instructions must not authorize harmful actions
- Agent must have defined constraints (denied actions, data access limits)
- High-risk agents must have escalation procedures

**Regulatory Mapping:** SR 11-7 (governance), OCC (control environment).

### Policy 2: Audit Standards

**Purpose:** Enforce audit logging and transparency requirements.

**Example Rules:**

- Agent must log all tool invocations (timestamp, user, action, result)
- Agent must encrypt sensitive data in logs
- Agent must have defined audit retention period
- Regulated agents must have compliance-specific audit fields

**Regulatory Mapping:** SR 11-7 (audit trail), HIPAA (audit logging), SOX (audit standards).

### Policy 3: Access Control Baseline

**Purpose:** Enforce data access restrictions and PII protection.

**Example Rules:**

- Agent accessing PII must have audit logging enabled
- Agent accessing regulated data must have approval from data owner
- Agent must not access data outside its declared scope
- Agent must encrypt data in transit and at rest

**Regulatory Mapping:** GDPR (data protection), HIPAA (privacy), PCI-DSS (card data protection).

### Policy 4: Governance Coverage

**Purpose:** Ensure that governance artifacts are complete and current.

**Example Rules:**

- Agent must have a current approval
- Agent must have stakeholders documented (who was consulted?)
- Agent must have a risk classification
- Agent must reference applicable regulatory frameworks

**Regulatory Mapping:** SR 11-7 (governance), OCC (governance maturity).

**Your Action:** Navigate to the **Governance Policy Library** in Intellios. Review each baseline policy.
Confirm that they align with your enterprise requirements. If you need to modify them, save your changes.

---

## Step 3: Create Your First Custom Policy (8 minutes)

Now you'll author a policy tailored to your organization. Example: A policy requiring financial transaction
agents to have escalation procedures.

### Open the Policy Authoring Interface

Navigate to **Administration → Governance Policies → Create New Policy**.

### Define the Policy Metadata

```json
{
  "id": "custom-001",
  "name": "Financial Transaction Escalation",
  "description": "Agents handling financial transactions must have escalation procedures for amounts over threshold",
  "version": "1.0.0",
  "severity": "error",
  "regulatory_framework": ["SR 11-7"],
  "applicable_deployment_types": ["customer-facing", "automated-pipeline"]
}
```

**Explanation:**
- `id` — Unique identifier for this policy (you'll reference it in reports)
- `name` — Human-readable policy name
- `description` — What the policy enforces and why
- `severity` — "error" = blocks deployment; "warning" = allows deployment but flags for review
- `regulatory_framework` — Which regulations this policy addresses
- `applicable_deployment_types` — When this policy applies (only to customer-facing agents, for example)

### Write the Policy Rules

Intellios uses a **Policy Expression Language** — deterministic rules that evaluate agent blueprints.

You'll write three rules:

**Rule 1: Agent must have escalation procedure defined**

```json
{
  "id": "rule-001",
  "field": "constraints.escalation_procedure",
  "operator": "exists",
  "severity": "error",
  "message": "Financial transaction agents must define an escalation procedure."
}
```

**Explanation:**
- `field` — The path in the Agent Blueprint Package to check (in this case, the `escalation_procedure`
  field under `constraints`)
- `operator` — The evaluation operation: "exists" means the field must be present and non-null
- `severity` — "error" means a violation blocks deployment
- `message` — What appears in the Violation Report if the rule fails

**Rule 2: Escalation threshold must be defined**

```json
{
  "id": "rule-002",
  "field": "constraints.escalation_threshold_usd",
  "operator": "exists",
  "severity": "error",
  "message": "Financial transaction agents must define a transaction amount threshold for escalation (e.g., $10,000)."
}
```

**Rule 3: Escalation threshold must be reasonable (not more than $1M)**

```json
{
  "id": "rule-003",
  "field": "constraints.escalation_threshold_usd",
  "operator": "count_lte",
  "value": 1000000,
  "severity": "warning",
  "message": "Escalation threshold exceeds $1M. Consider a lower threshold for higher control."
}
```

**Explanation:**
- `operator: "count_lte"` — Checks if the numeric value is less than or equal to the specified value
- `value` — The threshold value (1,000,000)
- `severity: "warning"` — A violation flags for review but allows deployment

### Save the Policy

Click **Save Policy**. Intellios validates the JSON syntax. If valid, the policy is stored and becomes
available for use.

**Your Action:** Write this policy in the Intellios UI. You've now authored your first enterprise
governance policy.

---

## Step 4: Run Governance Validation on a Sample Blueprint (7 minutes)

Now validate the policy against a test agent blueprint.

### Access a Sample Blueprint

Navigate to **Blueprint Registry → Sample Agents → "Loan Processing Agent"** (or any sample agent).

### Trigger Policy Validation

Click **Run Governance Validation** (top right). The system evaluates the agent blueprint against all active
policies, including your new "Financial Transaction Escalation" policy.

### Review the Validation Report

The report shows:

```
Policy: Governance Coverage
├── Rule: rule-001 (Agent must have approval) → PASS
├── Rule: rule-002 (Agent must have risk classification) → PASS
└── Rule: rule-003 (Agent must reference regulatory framework) → PASS

Policy: Financial Transaction Escalation
├── Rule: rule-001 (Agent must have escalation procedure) → FAIL
│   Message: "Financial transaction agents must define an escalation procedure."
│   Remediation: Add a 'constraints.escalation_procedure' field to the ABP with a description of escalation steps.
├── Rule: rule-002 (Agent must have escalation threshold) → PASS
└── Rule: rule-003 (Escalation threshold is reasonable) → PASS

Overall Status: 2 violations (1 error, 1 warning)
Compliance Level: 75%
```

**Key Insight:** The report is deterministic. The same ABP + same policies = same result, always. No human
judgment; pure logic.

### Understand Remediation

For each violation, the report suggests remediation. Click **Remediate** to edit the agent blueprint and fix
violations. Rerun validation to confirm the fix.

**Your Action:** Examine the validation report. Understand which rules passed, which failed, and why.

---

## Step 5: Review the Compliance Evidence Chain (3 minutes)

Navigate back to the validated blueprint. Click the **Evidence** tab.

You'll see:

### Compliance Evidence: SR 11-7

```
SR 11-7 Requirement: Model Risk Management Framework

├── Model Inventory
│   Agent ID: loan-processor-v1.2.0
│   Agent Name: Loan Processing Agent
│   Creation Date: 2026-04-05
│   Last Modified: 2026-04-05
│   Status: approved
│   Approver: jane.doe@bank.com (Risk Officer)
│   Approval Date: 2026-04-05

├── Governance Documentation
│   Risk Classification: High
│   Regulatory Scope: [FINRA, SOX]
│   Data Sensitivity: Regulated
│   Constraints: [defined in ABP]
│   Audit Requirements: [defined in ABP]

├── Approval Chain
│   Reviewer 1: alice@bank.com (Compliance Officer) - Approved 2026-04-05 14:30 UTC
│   Reviewer 2: bob@bank.com (Risk Officer) - Approved 2026-04-05 15:45 UTC
│   Reviewer 3: carlos@bank.com (General Counsel) - Approved 2026-04-05 16:20 UTC

├── Policy Evaluation
│   Policies Evaluated: 4
│   Policies Passed: 3
│   Policies With Violations: 1
│   Violation Remediated: Yes
│   Final Status: Approved

└── Audit Trail
   Event 1: intake_complete (2026-04-05 10:00 UTC)
   Event 2: governance_validation_run (2026-04-05 10:15 UTC)
   Event 3: review_started (2026-04-05 13:00 UTC)
   Event 4: reviewer_1_approved (2026-04-05 14:30 UTC)
   Event 5: reviewer_2_approved (2026-04-05 15:45 UTC)
   Event 6: reviewer_3_approved (2026-04-05 16:20 UTC)
   Event 7: blueprint_approved (2026-04-05 16:25 UTC)
   Event 8: deployment_initiated (2026-04-05 17:00 UTC)
```

**This is what regulators expect.** A complete, time-stamped, policy-driven evidence chain that demonstrates
control. When a Federal Reserve examiner asks, "How do you manage model risk for AI agents?" You show them
this.

**Your Action:** Note how the evidence chain is comprehensive, deterministic, and auditable.

---

## Step 6: Configure Your Review Workflow (2 minutes)

Navigate to **Administration → Review Workflow**.

### Define Your Approval Chain

```json
{
  "workflow_id": "default-approval",
  "name": "Standard Approval Workflow",
  "stages": [
    {
      "stage": 1,
      "role": "compliance_officer",
      "required_approvers": 1,
      "description": "Compliance verification"
    },
    {
      "stage": 2,
      "role": "risk_officer",
      "required_approvers": 1,
      "description": "Risk classification and mitigation review"
    },
    {
      "stage": 3,
      "role": "general_counsel",
      "required_approvers": 1,
      "description": "Legal and regulatory compliance"
    }
  ],
  "sla_hours": 48,
  "escalation": "auto-escalate to director if SLA exceeded"
}
```

**Explanation:**
- **Stages** — Sequential approval steps. Stage 1 must complete before Stage 2, etc.
- **required_approvers** — How many people must approve at each stage
- **SLA** — Service level agreement (48 hours per stage)
- **Escalation** — What happens if SLA is exceeded

### Assign Reviewers

Click **Assign Reviewers**. Map your teams to roles:

- Compliance Officer → alice@bank.com, diana@bank.com
- Risk Officer → bob@bank.com, eva@bank.com
- General Counsel → carlos@bank.com

### Activate the Workflow

Click **Activate**. Going forward, all blueprints advancing to review will flow through this approval chain.

**Your Action:** Define your approval workflow. This ensures consistent, auditable governance decisions.

---

## Verify Setup: Governance Posture Dashboard

Navigate to **Insights → Governance Posture Dashboard**. You'll see:

```
Governance Framework Status
├── Policies Configured: 5 (4 baseline + 1 custom)
├── Agents Covered: 0 (no agents yet)
├── Regulatory Frameworks Mapped: 3 (SR 11-7, OCC, EU AI Act)
├── Review Workflow: configured (3-stage approval)
├── Audit Trail: enabled

Policy Compliance Readiness
├── Safety Baseline: ready
├── Audit Standards: ready
├── Access Control Baseline: ready
├── Governance Coverage: ready
├── Financial Transaction Escalation (custom): ready

Regulatory Readiness
├── SR 11-7: 95% ready (all requirements mapped)
├── OCC Guidance: 90% ready (maturity indicators visible)
├── EU AI Act: 85% ready (high-risk AI process defined)
```

**This confirms that your governance framework is configured and operational.**

---

## Best Practices: Authoring Robust Policies

As you expand your policy library, follow these principles:

### 1. Use Deterministic Operators

The Policy Expression Language provides 11 deterministic operators:

- `exists` — Field is present and non-null
- `equals` — Field value equals specified value
- `contains` — String field contains substring
- `matches` — String field matches regex pattern
- `count_gte` / `count_lte` — Numeric field is >= or <= threshold
- `array_contains` — Array field contains specified element
- `array_min_length` / `array_max_length` — Array size constraints
- `is_boolean_true` / `is_boolean_false` — Boolean field validation
- `has_key` — JSON object has specified key

Use these instead of prose rules. Deterministic rules are auditable and repeatable.

### 2. Layer Severity Strategically

- **Error (blocks deployment)** — Use for non-negotiable controls (mandatory escalation procedures, audit
  logging for regulated data, approval for high-risk agents)
- **Warning (flags for review)** — Use for best practices that can be overridden with justification (prefer
  encryption, prefer human-in-loop for edge cases)

### 3. Write Clear Remediation Messages

Your violation messages should tell reviewers exactly how to fix the issue:

**Bad:**
```
"Escalation procedure missing"
```

**Good:**
```
"Financial transaction agents must define an escalation procedure. Add a 'constraints.escalation_procedure'
field to the ABP with: (1) transaction amount threshold, (2) escalation recipient (manager/director), (3)
escalation steps (email, phone, dashboard alert)."
```

### 4. Reference Regulatory Requirements

In your policy metadata, explicitly reference the regulation or internal standard:

```json
{
  "regulatory_framework": ["SR 11-7 § 1.1 (Model Risk Management Framework)"],
  "internal_standard": ["MRM-POL-001 (Model Approval Authority)"]
}
```

This creates an auditable link between governance rules and regulatory obligations.

---

## Next Steps

You've configured your governance framework. Here's what to do next:

### This Week
1. **Share the baseline policies with your team** — Confirm they align with your risk appetite and
   regulatory requirements.
2. **Refine your custom policies** — Add 2-3 more policies covering your enterprise-specific requirements
   (industry, size, risk profile).
3. **Confirm the review workflow** — Ensure your approval chain is realistic and SLAs are achievable.

### Next Week
1. **Create a compliance policy library** — Document all policies (purpose, regulatory mapping, rules,
   examples, exceptions).
2. **Train your teams** — Show compliance, risk, and engineering teams how to read validation reports and
   understand remediation.
3. **Pilot with your first real agent** — Have a team use the Intake Engine to create their first agent and
   run through governance validation and approval.

### Month 2+
1. **Monitor policy violations and remediation** — Track which rules are most frequently violated. Refine
   rules or provide better guidance.
2. **Expand regulatory framework coverage** — Add policies for HIPAA, GDPR, PCI-DSS, SOX as applicable to
   your organization.
3. **Optimize the review workflow** — Measure approval cycle time. Adjust SLAs and reviewer assignments based
   on actual data.

---

## FAQ for Compliance Teams

**Q: What if an agent violates a policy but we want to deploy it anyway?**
A: Create an exception. In the Review UI, a reviewer can document the business justification, assign
risk/mitigation to an executive sponsor, and approve with an exception. The exception is logged and
auditable.

**Q: Can we use Intellios policies to enforce internal standards, not just regulatory requirements?**
A: Absolutely. The Policy Expression Language is agnostic to whether you're enforcing SR 11-7 or your own
"MRM-POL-001 (Model Approval Authority)" standard. Reference both in the policy metadata.

**Q: How do we handle agent versions? If v1.0 is approved, does v1.1 need re-review?**
A: Policy evaluation is re-run for every version. If v1.1 introduces changes that violate existing policies,
violations are flagged. You can re-baseline v1.1 with minimal review if no new violations appear. The
versioning and approval history is maintained automatically.

**Q: What's the difference between a "warning" and an "error" violation?**
A: "Error" violations block deployment. The blueprint cannot advance to approved status until resolved.
"Warning" violations flag issues but allow deployment if a reviewer approves with justification. Use errors
for non-negotiable controls; warnings for best practices.

**Q: How do we audit the audit trail?**
A: The Governance Dashboard logs every event (policy evaluation, approval, deployment, change). These logs
are immutable and exportable. For regulatory reporting, extract logs via API or dashboard export in JSON,
CSV, or PDF format.

**Q: Can we integrate Intellios evidence chains with our existing compliance systems (COSO, audit tools)?**
A: Yes. Intellios generates machine-readable evidence in JSON and CSV. Most firms integrate via API calls or
scheduled exports. We have reference integrations available; ask your solutions architect.

---

## Verify Your Success

After completing this guide, you should be able to confirm:

1. **Governance policies are active** — Navigate to Governance > Policies and verify at least one policy is in "active" status
2. **Audit trail is capturing events** — Check the audit log and confirm recent intake or validation events appear
3. **You can locate** the SR 11-7 compliance mapping and understand how Intellios maps to each requirement
4. **Evidence export works** — Generate a test compliance evidence package and verify it downloads successfully
5. **You know your escalation path** — You can identify who to contact for governance questions and how to file a compliance concern

If any verification step fails, see [Escalation Paths](../10-faq-troubleshooting/escalation-paths.md) for support contacts.

---

## Related Reading

- **[SR 11-7 Compliance Mapping](../05-governance-compliance/sr-11-7-mapping.md)** — Detailed mapping of each
  SR 11-7 requirement to Intellios capabilities.
- **[Policy Expression Language](../03-core-concepts/policy-expression-language.md)** — Complete operator
  reference and syntax guide.
- **[Policy Authoring Guide](../05-governance-compliance/policy-authoring-guide.md)** — Advanced policy
  authoring patterns and regulatory framework integration.
- **[Governance Validator](../03-core-concepts/policy-engine.md)** — How the policy evaluation engine
  works and how to debug violations.
- **[Compliance Evidence Chain](../03-core-concepts/compliance-evidence-chain.md)** — Deep dive into the
  evidence artifacts Intellios generates.

---

*Next: [Advanced Policy Authoring](../05-governance-compliance/policy-authoring-guide.md)*
