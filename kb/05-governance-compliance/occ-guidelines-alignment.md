---
id: "05-002"
title: "OCC Guidelines Alignment: Model Risk Management for AI Agents"
slug: "occ-guidelines-alignment"
type: "reference"
audiences:
  - "compliance"
  - "executive"
status: "published"
version: "1.0.0"
platform_version: "1.2.0"
created: "2026-04-05"
updated: "2026-04-05"
tags:
  - "occ-guidelines"
  - "model-risk-management"
  - "regulatory-compliance"
  - "governance"
  - "validation"
tldr: >
  How Intellios satisfies OCC model risk management expectations through governance
  as code, independent validation, and comprehensive evidence chains
---

## Overview

The **Office of the Comptroller of the Currency (OCC)** issued comprehensive guidance on model risk management that complements the Federal Reserve's SR 11-7 framework. The OCC expectations, articulated across supervisory guidance, examination procedures, and regulatory correspondence, establish a **governance framework for managing model risk** with particular emphasis on:

- Clear organizational roles and board/senior management oversight
- Independent validation separate from model development
- Complete model inventories with sufficient documentation for replication
- Ongoing performance monitoring and outcome analysis
- Transparency in model decisions and behavioral documentation

For financial institutions deploying AI agents in regulated environments, the OCC framework demands that governance is not a post-deployment inspection but a **design-time control** built into the model development pipeline. Intellios satisfies each OCC expectation through deterministic governance automation, structured documentation, and auditable lifecycle management.

This article maps OCC requirements to Intellios capabilities and identifies which aspects are fully automated by the platform versus which require organizational processes beyond Intellios.

---

## OCC Requirements — Intellios Mapping

| OCC Requirement | Intellios Capability | Evidence Artifact | Automation Level |
|---|---|---|---|
| **Model Governance Framework** | Governance-as-Code + RBAC + lifecycle state machine | Policy registry + approval workflow + RBAC assignments | Full |
| **Board and Senior Management Oversight** | Blueprint Review UI + approval authority configuration | Review queue with approval chain + executive reporting hooks | Partial |
| **Clear Roles and Responsibilities** | RBAC system with role-based policy application | Organization hierarchy + role assignments + audit trail | Full |
| **Model Inventory Completeness** | Agent Registry with versioned agent records | Blueprint Registry view with search, filter, metadata | Full |
| **Unique Model Identification** | Agent `agent_id` + semantic versioning | ABP identity block + version history | Full |
| **Sufficient Documentation for Replication** | Agent Blueprint Package (ABP) | Structured JSON + generated markdown + schema versioning | Full |
| **Independent Model Validation** | Governance Validator (separate from generation) | Deterministic validation report + policy evaluation logs | Full |
| **Documented Validation Methodology** | Policy expression language + 11 deterministic operators | Policy rule definitions + operator documentation | Full |
| **Validation of Model Assumptions** | Re-validation API + policy impact simulation | Validation reports with timestamped outcomes | Partial |
| **Ongoing Performance Monitoring** | [PLACEHOLDER: Observability subsystem] | [PLACEHOLDER: Runtime telemetry + drift detection] | Not Yet |
| **Outcome Analysis and Reporting** | [PLACEHOLDER: Analytics + MRM reporting] | [PLACEHOLDER: Performance metrics + business outcome tracking] | Not Yet |
| **Model Change Control** | Agent Registry versioning + lifecycle transitions | Version history + audit log + change rationale | Full |

---

## Section 1: Model Governance Framework

### OCC Expectation

The OCC expects institutions to establish a **formal governance framework** for model risk management that defines:
- Clear roles and responsibilities for model development, validation, approval, and monitoring
- Board or senior management oversight of model risk
- Documented policies and procedures for model development and change management
- Escalation procedures for identified model defects or performance issues

### How Intellios Satisfies This

#### 1.1 Governance-as-Code: Deterministic Policy Framework

Intellios embeds governance directly into the agent creation pipeline through **Governance-as-Code**. Instead of external policy documents reviewed manually during development, governance policies are structured, machine-evaluable rules that automatically constrain every agent at the moment of creation.

**Key capabilities:**

- **Policy Registry** — Enterprise admins define governance policies in a versioned, centralized registry. Policies are not spreadsheets or Confluence pages; they are structured rule sets with defined operators and severity levels.
- **Deterministic Evaluation** — When an Agent Blueprint Package is generated, the Governance Validator evaluates every blueprint against all applicable policies using 11 deterministic operators (`exists`, `equals`, `contains`, `matches`, `includes_type`, `count_gte`, etc.). The same blueprint + same policies always produce the same result. This reproducibility is essential for OCC audit readiness.
- **Severity-Gated Lifecycle** — Error-severity policy violations **block the draft→in_review transition**, preventing non-compliant agents from reaching approval. This creates a hard control gate that embeds governance into design rather than relying on human review to catch violations post-hoc.
- **Remediation Suggestions** — The Governance Validator calls Claude to generate specific, actionable remediation suggestions for each violation. Developers review suggestions and decide to apply, refine, or override them. This hybrid approach balances deterministic governance with human judgment.

**Evidence:** Policy registry (versioned policy definitions) + validation reports (deterministic evaluation outcomes stored for every blueprint).

#### 1.2 RBAC and Role-Based Policy Application

Intellios implements **Role-Based Access Control (RBAC)** that ties governance policies to organizational roles:

- **Admin** — Define and publish governance policies
- **Designer** — Create agent blueprints, trigger intake sessions, iterate on governance violations
- **Reviewer** — Human approval of blueprints that pass policy checks
- **Auditor** — Read-only access to blueprint registry, validation reports, and audit logs
- **Operator** — Deploy approved agents to runtimes

Policies can be marked as global (apply to all agents) or scoped to specific organizational units, deployment types, or data sensitivity classifications. This allows institutions to enforce baseline governance across the enterprise while permitting domain-specific policies for different lines of business.

**Evidence:** RBAC configuration stored in enterprise settings + policy scoping rules + audit logs showing which principal performed which action.

#### 1.3 Lifecycle State Machine: Approval Authority and Transitions

Every agent moves through a defined lifecycle with explicit state transitions that enforce governance:

```
draft
  ↓ (error-severity violations must be resolved)
in_review
  ↓ (reviewer approval required)
approved
  ↓ (deployment authorization required)
deployed
  ↓ (optional: sunsetting/retirement workflow)
retired
```

Each transition is logged with:
- **Actor** — Which principal (user, system) triggered the transition
- **Timestamp** — When the transition occurred
- **Rationale** — Optional comment explaining the decision
- **Validation state** — Governance validation results at the time of transition

This state machine is not a suggestion; it is a hard constraint enforced by the Agent Registry API. Non-approved agents cannot be deployed. Deployed agents cannot be deleted without explicit retirement procedures.

**Evidence:** Agent state history stored in `agent_blueprints.lifecycle_history` (JSONB array) with complete transition audit trail.

---

## Section 2: Board and Senior Management Oversight

### OCC Expectation

The OCC expects **board and senior management to have meaningful oversight** of model risk, including:
- Regular reporting on model performance, defects, and remediation
- Awareness of high-risk model portfolios and associated mitigation strategies
- Authority over model governance policies and approval thresholds
- Escalation procedures for critical model failures or compliance issues

### How Intellios Satisfies This

#### 2.1 Blueprint Review UI: Transparent Approval Queue

The Blueprint Review UI provides a **structured approval interface** where designated reviewers (senior managers, compliance officers, risk officers) can:

- See all agents pending review with complete documentation (intake context, governance coverage, policy violations, remediation history)
- Evaluate governance validation reports and understand why agents passed or failed policies
- Approve, request changes, or reject blueprints with documented rationale
- Track approval metrics (time-in-review, approval rate, policy violation trends)

The UI is designed for compliance/risk personnel, not engineers. It emphasizes governance compliance, regulatory requirements, and risk assessment—not technical implementation details.

**Evidence:** Review queue with approval chain + reviewer comments + approval/rejection timestamps.

#### 2.2 Executive Reporting Hooks

Intellios provides **hooks for executive reporting** (full implementation is organizational):

- **Model Inventory Dashboard** — Count of total agents, approval rate, policy violation rate, deployment frequency
- **Risk Concentration** — Agents handling sensitive data (PII, financial records, healthcare data), regulatory scope (FINRA, SOX, GDPR), deployment type (customer-facing, internal, automated)
- **Governance Compliance** — Percentage of agents passing policies, remediation time, approval authority utilization
- **Change Velocity** — Agent creation rate, deployment rate, version update frequency (signals how actively the portfolio is evolving)

These metrics feed into MRM reports and board-level risk summaries. The data is deterministic—drawn directly from policy evaluation outcomes and lifecycle transitions—not from subjective assessments.

**Evidence:** Model inventory metadata + validation report summaries + lifecycle transition logs.

---

## Section 3: Model Inventory and Identification

### OCC Expectation

The OCC expects institutions to maintain a **complete, accurate model inventory** where every deployed model:
- Has unique identification
- Is assigned a risk classification
- Is documented sufficiently for independent review and replication
- Is tracked through its lifecycle from development to retirement

### How Intellios Satisfies This

#### 3.1 Agent Registry: Versioned, Searchable Inventory

The **Agent Registry** is the system-of-record for all agents. Every agent has:

- **Unique ID** — `agent_id` generated at intake initiation, immutable for the lifetime of the agent
- **Semantic Versioning** — Major, minor, patch versions tracking evolution (e.g., `1.2.3`)
- **Metadata** — Name, description, purpose, deployment type, data sensitivity, regulatory scope, stakeholders
- **Lifecycle Status** — Current state (draft, in_review, approved, deployed, retired) with transition history
- **Blueprint** — Complete ABP JSON defining capabilities, constraints, governance policies
- **Validation Report** — Governance validation results at the time of deployment

The Registry UI provides:
- **Search and filter** by name, purpose, deployment type, data sensitivity, regulatory scope, creator
- **Version history** with diffs showing what changed between versions
- **Audit trail** showing who modified what, when, and why
- **Cross-reference links** to intake sessions, validation reports, and approval decisions

**Evidence:** Agent Registry database (`agent_blueprints` table) with complete record of every agent ever created.

#### 3.2 Agent Blueprint Package (ABP): Documentation for Replication

The **Agent Blueprint Package** is a structured JSON document that contains everything needed for an independent validator, auditor, or regulator to understand and replicate an agent:

```json
{
  "identity": {
    "agent_id": "mortgage-faq-bot-v1",
    "name": "Mortgage FAQ Bot",
    "description": "Customer-facing bot answering FAQ about mortgage products",
    "purpose": "customer_education",
    "deployed_by": "Alice (alice@bank.com)",
    "deployed_at": "2026-03-15T10:30:00Z"
  },
  "intake_context": {
    "deployment_type": "customer-facing",
    "data_sensitivity": "regulated",
    "regulatory_scope": ["FINRA", "GLBA"],
    "stakeholders_consulted": ["compliance", "risk", "legal", "marketing"]
  },
  "capabilities": {
    "instructions": "You are a mortgage product FAQ assistant...",
    "tools": [
      { "name": "fetch_mortgage_products", "description": "Retrieve current mortgage offerings" },
      { "name": "fetch_faq_data", "description": "Retrieve FAQ from knowledge base" }
    ]
  },
  "constraints": {
    "denied_actions": [
      "modify_customer_account",
      "initiate_loan_application",
      "provide_investment_advice",
      "export_customer_data"
    ]
  },
  "governance": {
    "policies": [
      {
        "type": "data_retention",
        "rule": "Delete conversation logs after 90 days. Purge daily."
      },
      {
        "type": "audit_logging",
        "rule": "Log all customer interactions with timestamp and agent version."
      },
      {
        "type": "escalation",
        "rule": "Escalate complex customer issues to human agent. Do not attempt resolution."
      }
    ],
    "audit": {
      "log_interactions": true,
      "log_access": true
    }
  },
  "validation_report": {
    "evaluated_at": "2026-03-15T10:25:00Z",
    "policies_applied": ["policy-baseline", "policy-customer-facing", "policy-glba-compliance"],
    "violations": [],
    "warnings": [],
    "status": "passed"
  }
}
```

This structure is:
- **Self-documenting** — Every field has clear meaning and purpose
- **Auditable** — Validation outcome is embedded in the blueprint record
- **Versioned** — The schema version is specified, enabling future evolution without breaking old records
- **Portable** — Can be exported, reviewed externally, or provided to auditors/regulators

**Evidence:** ABP JSON files stored in Agent Registry, exported on demand for regulatory review.

---

## Section 4: Independent Model Validation

### OCC Expectation

The OCC explicitly requires **independent validation separate from model development**. The validation function should:
- Be organizationally independent from the development team
- Have authority to approve or reject models
- Use documented, repeatable validation methodologies
- Produce evidence of validation for audit purposes
- Validate both model assumptions and actual performance against intended use case

### How Intellios Satisfies This

#### 4.1 Governance Validator: Separate Subsystem with Deterministic Methodology

The **Governance Validator** is a **separate subsystem, organizationally independent from the Intake Engine** (development). While intake generates blueprints, the validator evaluates them against enterprise policies without input from the development team.

**Key architectural separation:**

- **Development** (Intake Engine + Claude) → Creates blueprint based on designer input
- **Validation** (Governance Validator) → Evaluates blueprint against policies (deterministic, no human judgment in evaluation logic)
- **Approval** (Blueprint Review UI) → Human reviewer decides whether to approve/reject based on validation outcome (human judgment applied here)

This separation ensures that the validation process is not influenced by the development team's preferences or business pressure to approve questionable blueprints.

**Evidence:** Governance Validator codebase is distinct from Intake Engine; validation reports are generated by the validator, not the development team.

#### 4.2 Documented, Deterministic Validation Methodology

The Governance Validator uses a **precisely documented evaluation methodology** based on 11 deterministic operators:

| Operator | Semantics | Use Case |
|---|---|---|
| `exists` | Field is not null, undefined, empty string, or empty array | Ensuring required fields are declared |
| `not_exists` | Field is null, undefined, empty string, or empty array | Ensuring sensitive fields are absent |
| `equals` | Field strictly equals comparison value | Enforcing specific values (e.g., `log_interactions: true`) |
| `not_equals` | Field does not equal comparison value | Forbidding specific values |
| `contains` | String includes substring, or array includes element | Checking for required items in lists |
| `not_contains` | Negation of `contains` | Forbidding specific items |
| `matches` | String matches regex pattern | Validating formats (e.g., email addresses) |
| `count_gte` | Array length >= value | Enforcing minimum coverage |
| `count_lte` | Array length <= value | Enforcing maximum scope |
| `includes_type` | Array contains object with `.type === value` | Validating governance policy types |
| `not_includes_type` | No array element has `.type === value` | Forbidding policy types |

Every policy rule specifies which operator applies. Every evaluation uses only the defined operators. This ensures:
- **Reproducibility** — Same ABP + same policies = same evaluation result every time
- **Auditability** — Each violation can be traced to a specific rule, operator, and field
- **Testability** — Policies can be tested before deployment to ensure they behave as intended

**Evidence:** Policy definitions with explicit operator declarations + validation reports showing which rules passed/failed and why.

#### 4.3 Validation Report: Audit Trail and Evidence

Every time a blueprint is validated, a **Validation Report** is generated and stored:

```json
{
  "validation_report_id": "vr-20260315-001",
  "agent_id": "mortgage-faq-bot-v1",
  "evaluated_at": "2026-03-15T10:25:00Z",
  "evaluated_by": "governance-validator",
  "schema_version": "3.2.1",
  "policies_applied": [
    "policy-baseline",
    "policy-customer-facing",
    "policy-glba-compliance"
  ],
  "evaluation_results": [
    {
      "policy_id": "policy-baseline",
      "rules_evaluated": 5,
      "rules_passed": 5,
      "rules_failed": 0,
      "violations": []
    },
    {
      "policy_id": "policy-customer-facing",
      "rules_evaluated": 8,
      "rules_passed": 8,
      "rules_failed": 0,
      "violations": []
    },
    {
      "policy_id": "policy-glba-compliance",
      "rules_evaluated": 6,
      "rules_passed": 6,
      "rules_failed": 0,
      "violations": []
    }
  ],
  "total_rules_evaluated": 19,
  "total_violations": 0,
  "error_severity_violations": 0,
  "warning_severity_violations": 0,
  "status": "passed",
  "remediation_suggestions": []
}
```

This report is:
- **Immutable** — Once generated, it cannot be modified (audit evidence requirement)
- **Timestamped** — Shows exactly when validation occurred
- **Complete** — Every rule evaluated is recorded, not just violations
- **Reproducible** — Can be re-generated with the same blueprint and policies to verify consistency

**Evidence:** Validation reports stored in `agent_blueprints.validation_report` (JSONB) and `validation_reports` table with complete audit trail.

---

## Section 5: Model Change Control and Documentation

### OCC Expectation

The OCC expects institutions to have:
- **Change control procedures** for model modifications
- **Version control** tracking model evolution
- **Documentation of rationale** for changes
- **Re-validation** of modified models before deployment

### How Intellios Satisfies This

#### 5.1 Semantic Versioning and Version History

Every agent is versioned using **Semantic Versioning** (MAJOR.MINOR.PATCH):

- **MAJOR** — Significant capability change or constraint modification (e.g., adding a new tool, removing a denied action). Requires re-validation.
- **MINOR** — Enhancement within existing capability (e.g., improved instructions, refined constraint). Requires re-validation if governance-relevant.
- **PATCH** — Bug fix or documentation correction (e.g., typo in instructions, clarification in description). Does not require re-validation if no governance-relevant fields changed.

Example version progression: `1.0.0` (initial deployment) → `1.1.0` (new tool added) → `1.1.1` (instructions clarified) → `2.0.0` (constraint model redesigned).

#### 5.2 Version History and Diff Tracking

The Agent Registry maintains **complete version history** with diffs:

```
mortgage-faq-bot
├── v1.0.0 (2026-03-15, deployed)
│   ├── Capabilities: fetch_mortgage_products, fetch_faq_data
│   ├── Constraints: [deny modify_customer_account, initiate_loan, export_data]
│   ├── Governance: data_retention (90 days), audit_logging
│   └── Validation: PASSED
│
├── v1.1.0 (2026-03-22, approved, pending deployment)
│   ├── Changes from v1.0.0:
│   │   ├── + Added tool: fetch_rate_calculator
│   │   ├── - Removed constraint: initiate_loan (still denied via instruction)
│   │   ├── ~ Updated instructions: clarified mortgage types covered
│   └── Validation: PASSED
│
└── v1.2.0 (2026-04-01, in_review)
    ├── Changes from v1.1.0:
    │   ├── ~ Updated data_retention policy: 60 days (stricter)
    │   ├── + Added audit_logging for rate_calculator tool
    │   └── Validation: IN PROGRESS
```

Each version can be compared, and the audit trail shows who created each version and why (through git-style commit messages or change rationale fields).

#### 5.3 Audit Log: Actor, Action, Timestamp, Rationale

Every change to a blueprint is logged:

```
Agent: mortgage-faq-bot, Version: 1.1.0
┌─ 2026-03-22 10:15:00 UTC
│  Actor: bob@bank.com (Designer)
│  Action: Committed changes from intake session int-20260322-001
│  Rationale: Added rate calculator tool per business requirement BR-2026-0842
│  Changes:
│    + Added capability: fetch_rate_calculator
│    ~ Updated instructions: "...You can also calculate estimated rates..."
│
├─ 2026-03-22 11:30:00 UTC
│  Actor: governance-validator (system)
│  Action: Validation executed
│  Result: PASSED (all policies validated successfully)
│  Violations: 0
│
└─ 2026-03-23 09:00:00 UTC
   Actor: carol@bank.com (Reviewer)
   Action: Approved for deployment
   Rationale: Governance compliance confirmed. Rate calculator tool has clear instructions and data retention policy.
```

This log is immutable and provides complete traceability for audits and regulatory review.

**Evidence:** Audit log stored in `audit_log` table with agent_id, actor, action, timestamp, rationale, and change delta.

---

## Section 6: Ongoing Monitoring and Drift Detection

### OCC Expectation

The OCC expects institutions to have:
- **Ongoing monitoring** of deployed agent performance
- **Drift detection** (performance degradation, assumption violations)
- **Procedures to address drift** (retraining, retirement, adjustment)
- **Regular re-validation** of model assumptions

### How Intellios Satisfies This

#### 6.1 Observability Hooks (Partial Implementation)

Intellios provides **hooks for observability** that enable runtime monitoring of deployed agents:

- **Instrumentation** — Every agent can emit telemetry: interaction count, error rate, tool call success rate, user satisfaction, compliance violations
- **Metrics** — Aggregated statistics: transactions/day, customer satisfaction, tool success rate, constraint violations
- **Alerts** — Thresholds for drift detection: "If error rate > 5%, trigger alert" or "If tool failure rate increases by 10%, escalate to reviewer"

**Note:** Full observability implementation (runtime telemetry collection, metrics aggregation, alerting) is a **platform component under development**. Intellios provides the infrastructure for observability (instrumentation points, data schema) but the operational observability stack is organizational responsibility at this phase.

**Evidence:** [PLACEHOLDER: Monitoring dashboard, drift alert logs]

#### 6.2 Re-Validation API and Policy Impact Simulation

When governance policies are **updated**, Intellios provides a **re-validation endpoint** that simulates the impact on all deployed agents:

```
POST /api/governance/policies/v2/simulate-impact

{
  "policy_id": "policy-glba-compliance",
  "new_version": "2.0.0",
  "new_rules": [ ... ],
  "scope": "all_agents"
}

Response:
{
  "agents_affected": 47,
  "agents_newly_violating": 12,
  "agents_newly_compliant": 3,
  "agents_unaffected": 32,
  "detailed_impact": [
    {
      "agent_id": "mortgage-faq-bot-v1",
      "current_status": "passed",
      "new_status": "violations (3 new errors)",
      "new_violations": [
        {
          "rule_id": "glba-001",
          "field": "governance.audit.log_access",
          "operator": "equals",
          "expected": true,
          "actual": false,
          "message": "GLBA compliance requires access logging for all PII-handling agents."
        }
      ]
    }
  ]
}
```

This simulation is **deterministic** — same policy version + same agent list = same impact report. Regulators can ask, "If we tightened the GLBA policy, which agents would be affected?" and Intellios can answer immediately with complete accuracy.

**Evidence:** Policy simulation results stored with timestamp and policy version, enabling audit trail of policy evolution and impact.

---

## Section 7: Mapping Detailed OCC Requirements to Intellios

Below is a comprehensive mapping of specific OCC examination procedures to Intellios capabilities. Where Intellios provides only partial support, the gap is noted with organizational responsibility.

### A. Model Development (OCC Exam Manual AI-12)

| OCC Exam Procedure | Intellios Support | Evidence | Gap (if any) |
|---|---|---|---|
| Verify model has unique identification | **Full** | Agent Registry with unique agent_id | None |
| Confirm clear documentation of intended use | **Full** | Intake context + ABP identity section | None |
| Assess model development methodology | **Full** | Intake Engine phases + governance coverage validation | None |
| Verify stakeholders consulted | **Full** | Intake stakeholders_consulted list | None |
| Confirm technical documentation sufficient for replication | **Full** | ABP JSON schema | None |
| Verify model assumptions documented | **Partial** | ABP constraints section documents denials; positive assumptions documented in instructions | Assumption testing methodology is organizational |
| Check for data quality controls | **Partial** | Intake data_sensitivity and constraints capture intent | Data quality monitoring is observability stack (not yet implemented) |

### B. Model Validation (OCC Exam Manual AI-12)

| OCC Exam Procedure | Intellios Support | Evidence | Gap (if any) |
|---|---|---|---|
| Verify independent validation separate from development | **Full** | Governance Validator is separate subsystem | None |
| Confirm validation methodology documented | **Full** | 11 operators + policy rule definitions | None |
| Assess validation evidence completeness | **Full** | Validation reports with all rules evaluated | None |
| Verify model assumptions tested | **Partial** | Constraints validated structurally; behavioral assumption testing is governance policy responsibility | Institutions must define policies that capture critical assumptions |
| Check for performance validation baseline | **Partial** | Initial deployment validation captured in validation report | Ongoing performance baseline is observability stack responsibility |

### C. Model Governance (OCC Exam Manual AI-12)

| OCC Exam Procedure | Intellios Support | Evidence | Gap (if any) |
|---|---|---|---|
| Verify clear governance structure and roles | **Full** | RBAC configuration + role definitions | None |
| Confirm board/senior mgmt oversight | **Partial** | Blueprint Review UI + reporting hooks | Board reporting templates/cadence are organizational |
| Verify defined approval authority | **Full** | Lifecycle state machine + reviewer RBAC | None |
| Assess policy framework | **Full** | Governance-as-Code + policy registry | None |
| Verify model inventory | **Full** | Agent Registry with versioning and metadata | None |
| Check escalation procedures | **Partial** | Blueprint rejection workflow + change request path | Escalation decision logic (who to notify, when) is organizational |

### D. Ongoing Monitoring (OCC Exam Manual AI-12)

| OCC Exam Procedure | Intellios Support | Evidence | Gap (if any) |
|---|---|---|---|
| Verify performance monitoring in place | **Not Yet** | [PLACEHOLDER] | Observability stack (in development) |
| Confirm monitoring frequency adequate | **Not Yet** | [PLACEHOLDER] | Observability stack (in development) |
| Assess drift detection procedures | **Not Yet** | [PLACEHOLDER] | Observability stack (in development) |
| Verify corrective action procedures | **Partial** | Version control enables rapid iteration + re-deployment | Trigger procedures for corrective action are organizational |

### E. Documentation and Reporting (OCC Exam Manual AI-12)

| OCC Exam Procedure | Intellios Support | Evidence | Gap (if any) |
|---|---|---|---|
| Verify MRM documentation sufficient for independent review | **Full** | ABP + validation reports + audit logs | None |
| Confirm version control | **Full** | Semantic versioning + complete version history | None |
| Check change control procedures | **Full** | Audit log of all modifications + state transitions | None |
| Verify audit trail | **Full** | Complete audit log with actor, action, timestamp, rationale | None |
| Assess board reporting | **Partial** | Reporting data available; templates/cadence are organizational | Executive reporting format and frequency are organizational |
| Verify escalation documentation | **Partial** | Rejection workflows logged; escalation decision framework is organizational | Escalation decision logic is organizational |

---

## What Requires Organizational Processes Beyond Intellios

While Intellios automates significant governance compliance, several elements require **organizational processes and procedures** outside the platform:

### 1. Performance Monitoring and Drift Detection (Observability Stack)
- Intellios provides instrumentation points and data schemas
- Your organization must deploy monitoring infrastructure (metrics collection, alerting, dashboards)
- You define thresholds for acceptable performance and drift triggers
- **Status:** Observability subsystem is under development; preview available Q2 2026

### 2. Board and Executive Reporting
- Intellios generates raw data (agent inventory, validation outcomes, approval metrics)
- Your organization must define reporting templates, frequency, and presentation format
- Board reporting is typically quarterly or semi-annual; Intellios provides ad-hoc query capability
- Executive dashboards can be built using the Agent Registry API and reporting hooks

### 3. Corrective Action and Escalation Procedures
- Intellios records when agents fail governance validation
- Your organization must define: Who is notified? How quickly? What actions are required?
- Examples: "If an agent has >3 policy violations, escalate to Chief Risk Officer within 24 hours"
- RBAC and audit logging in Intellios support whatever escalation procedure you define

### 4. Ongoing Performance Monitoring Baselines
- Intellios validates governance assumptions at design time (through policies)
- Your organization must define runtime performance baselines (accuracy, latency, user satisfaction)
- Intellios stores and versions blueprints; your observability stack measures runtime behavior
- Drift detection compares runtime performance against baseline

### 5. Model Assumption Testing
- Intellios validates structural assumptions (constraints, capabilities declared, retention policies specified)
- Your organization must define tests for behavioral assumptions (e.g., "Does the agent follow instructions?" "Does it escalate appropriately?")
- These tests can be captured as governance policies (e.g., "Must pass safety validation suite before deployment")

---

## Implementation Readiness: OCC Examination Checklist

Use this checklist to assess your Intellios implementation against OCC expectations:

### Model Inventory & Identification
- [ ] All agents registered in Agent Registry with unique agent_id
- [ ] Every agent has current deployed version with semantic version number
- [ ] Agent metadata includes: name, purpose, deployment type, data sensitivity, regulatory scope
- [ ] Agent Registry is searchable and provides version history view

### Governance Framework
- [ ] Governance policies defined and published in policy registry
- [ ] RBAC configured with clear role definitions (developer, reviewer, admin, auditor)
- [ ] Blueprint Review UI configured with approval authority chain
- [ ] Policy evaluation is deterministic (same result every time for same blueprint + policies)

### Model Documentation
- [ ] Every agent has complete ABP with all required sections (identity, capabilities, constraints, governance)
- [ ] ABP is sufficient for independent reviewer to understand intended use and limitations
- [ ] Intake context captures stakeholder consultation and governance coverage
- [ ] Documentation is version-controlled alongside code

### Independent Validation
- [ ] Governance Validator is operationally independent from Intake Engine
- [ ] Validation methodology documented (11 operators, policy rule definitions)
- [ ] Every blueprint evaluated against all applicable policies before approval
- [ ] Validation reports generated and stored for every deployment

### Change Control
- [ ] Agent versioning follows semantic versioning (MAJOR.MINOR.PATCH)
- [ ] Complete version history maintained with diffs
- [ ] Every change logged with actor, timestamp, rationale
- [ ] Changed agents re-validated before deployment approval

### Board Oversight
- [ ] Agent inventory dashboard available to executives
- [ ] Metrics tracked: total agents, approval rate, policy violation rate
- [ ] Risk concentration visible: agents by data sensitivity, regulatory scope, deployment type
- [ ] Executive reporting templates defined (quarterly MRM report, etc.)

### Audit Readiness
- [ ] Complete audit trail of all agent modifications and approvals
- [ ] Validation reports immutable and timestamped
- [ ] Policies versioned with change history
- [ ] Ad-hoc query capability for regulatory review (Agent Registry API)

---

## Conclusion

The **OCC's model risk management expectations are operationally demanding**: institutions must have governance frameworks that are deterministic, auditable, and scalable. Traditional approaches—policies in documents, governance reviews by compliance staff—do not scale when an institution deploys dozens of AI agents per quarter.

Intellios satisfies the **core OCC requirements** through:

1. **Governance-as-Code** — Policies are structured, machine-evaluable rules, not interpretable documents
2. **Deterministic Validation** — Policy evaluation is reproducible and auditable
3. **Independent Validator** — Governance Validator is separate from development
4. **Complete Documentation** — ABP provides sufficient detail for independent replication
5. **Version Control and Audit Trail** — Every change is tracked with full traceability
6. **RBAC and Approval Authority** — Clear roles, responsibility boundaries, and audit logging

For regulatory examination, Intellios generates the evidence artifacts that OCC examiners expect: model inventory, governance policies, validation reports, change logs, and approval records. The platform shifts compliance from a **post-deployment inspection** to a **design-time constraint**, enabling faster, safer agent deployment.

Organizations using Intellios still bear responsibility for **observability infrastructure, performance monitoring, corrective action procedures, and board reporting**—but Intellios automates the governance foundation that makes these organizational processes efficient and auditable.

---

## Related Resources

- **SR 11-7 Compliance Mapping** — How Intellios satisfies Federal Reserve guidance
- **Governance-as-Code** — Principles and operators underlying policy evaluation
- **Agent Blueprint Package** — Complete specification of the ABP schema
- **Agent Lifecycle** — State machine and approval workflow
- **Compliance Evidence Chain** — How Intellios generates audit evidence for regulatory review

---

*Last updated: 2026-04-05*
