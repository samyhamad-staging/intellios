---
id: "05-001"
title: "SR 11-7 Compliance Mapping: Model Risk Management for AI Agents"
slug: "sr-11-7-mapping"
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
  - "sr-11-7"
  - "model-risk-management"
  - "regulatory-compliance"
  - "governance"
  - "federal-reserve"
tldr: >
  How Intellios satisfies Federal Reserve SR 11-7 guidance on model risk management
  through comprehensive governance as code and evidence gathering
---

## Overview

**SR 11-7: Guidance on Model Risk Management** (November 2011) is the Federal Reserve's foundational framework for managing risk in models used by financial institutions. Originally issued to address the use of quantitative and statistical models in banking, SR 11-7's principles apply directly to artificial intelligence and machine learning systems deployed in regulated environments.

This article maps the requirements of SR 11-7 to Intellios capabilities, demonstrating how Intellios — a governed control plane for enterprise AI agents — enables compliance teams to satisfy the Federal Reserve's core expectations for model development, validation, governance, monitoring, and documentation.

### Why SR 11-7 Applies to AI Agents

SR 11-7 defines a "model" as any system, method, or process used by a financial institution to estimate risks, make decisions, or automate functions with material business impact. The guidance applies to:

- Credit risk assessment models
- Pricing and valuation models
- Compliance and anti-money laundering detection systems
- Customer-facing recommendation systems
- Operational decision-support systems

**AI agents fall within this scope** because they:
1. Make autonomous or semi-autonomous decisions that affect customers, operations, or risk exposure
2. Process sensitive data (PII, transaction data, account information)
3. Operate under regulatory oversight and competitive scrutiny
4. Require independent validation and ongoing monitoring
5. Demand clear audit trails and governance oversight

Intellios addresses this requirement through a comprehensive platform that makes model risk management deterministic, auditable, and scalable across enterprise deployments.

---

## SR 11-7 Requirements — Intellios Mapping

| SR 11-7 Requirement | Intellios Capability | Evidence Artifact | Automation |
|---|---|---|---|
| Model inventory and unique identification | Agent Registry with unique agent_id, versioning, and metadata | Blueprint Registry view + ABP metadata block | Full |
| Clear model documentation | Agent Blueprint Package (ABP) with identity, capabilities, constraints, governance sections | ABP JSON document + generated markdown summary | Full |
| Model development methodology and model risk taxonomy | Intake Engine with Phase 1 context form + Phase 2 guided governance probing + Phase 3 review | IntakeContext + IntakePayload + Governance Coverage validation | Full |
| Independent model validation | Governance Validator with structured policy expression language + deterministic evaluation | Validation Report (stored in agent_blueprints.validation_report) | Full |
| Defined governance roles and approval authority | Blueprint Review UI with lifecycle state machine + RBAC + approval chain | Approval workflow with reviewedBy + reviewedAt timestamps | Full |
| Ongoing monitoring and drift detection | [PLACEHOLDER: Observability subsystem with runtime telemetry and drift alerts] | [PLACEHOLDER: Monitoring dashboard + drift alert logs] | Partial |
| Regular validation of model assumptions | Re-validation API endpoint for governance policies after ABP changes | Validation Report with versioned timestamp | Partial |
| Model change control and versioning | Agent Registry with semantic versioning + full version history + audit trail | agent_blueprints table with versioning + audit_log table | Full |
| Board/senior management reporting on model risk | [PLACEHOLDER: Model Risk Management (MRM) Report component with executive summary] | [PLACEHOLDER: MRM Report (PDF/JSON) with signed evidence chain] | Partial |
| Documentation of data lineage, inputs, and quality | Intake Engine stakeholder contributions + constraints section | IntakePayload + ABP constraints + stakeholder contributions | Full |
| Clear escalation procedures for model defects | Blueprint Review UI with rejection workflow + request-changes path | Review workflow history + remediation suggestions | Partial |

---

## Section 1: Model Development & Implementation

### SR 11-7 Expectation

> Banks should have strong governance and control processes in place for the development and implementation of models. These should include...clear identification of model type and intended use case, documented model development methodology, and defined roles and responsibilities.

### How Intellios Satisfies This

#### 1.1 Model Identification and Intake

Intellios begins every agent creation with a structured **Intake Engine** that captures enterprise context before any development proceeds.

**Phase 1 — Structured Context Capture**

The intake process requires the designer to complete a domain-signal form that captures:

- **Agent purpose** — Specific use case and intended business outcome
- **Deployment type** — `internal-only`, `customer-facing`, `partner-facing`, or `automated-pipeline`
- **Data sensitivity** — Classification from `public` through `regulated`
- **Regulatory scope** — Multi-select list (FINRA, SOX, GDPR, HIPAA, PCI-DSS)
- **Integration types** — System dependencies and data sources
- **Stakeholders consulted** — Domain specialists involved (compliance, risk, legal, security, IT, operations, business)

This structured approach ensures that **every agent is inventoried with regulatory context at inception**, not retrofitted after deployment.

**Evidence:** `IntakeContext` object stored in `intake_sessions.intake_context` (JSONB).

#### 1.2 Development Methodology and Governance Probing

**Phase 2 — Guided AI Conversation with Deterministic Governance Requirements**

The Intake Engine operates as a multi-turn AI conversation powered by Claude, but with constraints: the system prompt injects mandatory governance probing rules based on the Phase 1 context signals.

For example, if the designer selected:
- `dataSensitivity: regulated` → The system enforces discussion of **data handling policy, audit logging, and retention requirements**
- `regulatoryScope: FINRA` → The system requires **compliance policy documentation and specific retention periods**
- `deploymentType: customer-facing` → The system mandates **safety policy, behavioral constraints, and behavioral instructions**

These constraints are enforced at two levels:

1. **Soft enforcement** — Claude's system prompt instructs it to probe for and capture these requirements
2. **Hard enforcement** — The `mark_intake_complete` endpoint calls `checkGovernanceSufficiency()` and rejects finalization with a specific gap list if required governance sections are missing

**Stakeholder Contributions — Direct Input Lanes**

Seven domain specialists can submit requirements through dedicated input forms (compliance, risk, legal, security, IT, operations, business). Their contributions are:

- Captured with attribution and timestamp
- Injected verbatim into Claude's system prompt during Phase 2
- Displayed in the Phase 3 review screen with source attribution
- Included in the final MRM report as a dedicated section

This addresses SR 11-7's requirement that "model development involve relevant risk management, compliance, and business functions."

**Evidence:**
- `IntakePayload` object with fully captured requirements
- Stakeholder contribution records with attributed inputs
- System prompt with enforcement rules injected

#### 1.3 Generation and Blueprint Production

Once intake is complete and governance sufficiency is validated, the **Generation Engine** produces an **Agent Blueprint Package (ABP)**.

An ABP is a structured, versioned document containing:

| Section | Content | SR 11-7 Relevance |
|---|---|---|
| **metadata** | ID, timestamps, lifecycle status, enterprise ownership, tags | Unique model identification |
| **identity** | Agent name, description, persona, white-label branding | Model description and intended use |
| **capabilities** | Tools, system instructions, knowledge sources, integrations | Model methodology and inputs |
| **constraints** | Allowed domains, denied actions, rate limits | Model risk taxonomy and controls |
| **governance** | Policies, audit config, approval chain, ownership block | Governance framework and approval authority |
| **execution** | Model parameters, API endpoints, deployment target | Implementation configuration |

The ABP serves as the **canonical model documentation** required by SR 11-7. It is:
- Versioned semantically (1.0.0, 1.1.0, 2.0.0)
- Stored in the Agent Registry with full history
- Immutable once in `in_review` or higher status
- Available for audit and regulatory review

**Evidence:** Complete ABP JSON document stored in `agent_blueprints.abp` (JSONB).

---

## Section 2: Model Validation

### SR 11-7 Expectation

> Banks should have a program for independent validation of models. This program should include:
> - Evaluation of the reasonableness of model assumptions
> - Assessment of the adequacy of the data inputs
> - Assessment of the model's governance structure
> - Results of back-testing and model stress-testing
> - Assessment of model conceptual soundness

### How Intellios Satisfies This

#### 2.1 Governance Validator — Independent Policy Evaluation

The **Governance Validator** is an automated, deterministic system that evaluates every ABP against enterprise governance policies before it can enter the review lifecycle.

**Key Properties:**

1. **Deterministic evaluation** — No LLM in the validation logic. All rule evaluation uses structured expressions with 11 operators.
2. **Independent of generation** — Validation runs after generation is complete; the validator has no stake in the outcome.
3. **Policy-driven** — Validation rules are defined by the enterprise, not by the generation engine.
4. **Comprehensive reporting** — Violations are reported with severity, field path, remediation suggestions, and policy attribution.

#### 2.2 Policy Expression Language

Intellios governance policies are expressed in a deterministic, structured format (ADR-005). Each rule:

```json
{
  "id": "rule-audit-001",
  "field": "governance.audit.log_interactions",
  "operator": "exists",
  "severity": "error",
  "message": "Agent must have audit logging enabled for all interactions."
}
```

**Supported operators** (11 total):
- **Existence:** `exists`, `not_exists`
- **Equality:** `equals`, `not_equals`
- **Containment:** `contains`, `not_contains`
- **Pattern matching:** `matches` (regex)
- **Cardinality:** `count_gte`, `count_lte`
- **Type checking:** `includes_type`, `not_includes_type`

This language enables enterprises to express requirements such as:

| Requirement | Policy Rule |
|---|---|
| All agents must have documented behavioral instructions | `{ field: "capabilities.instructions", operator: "exists", severity: "error" }` |
| Financial services agents must document data retention policy | `{ field: "governance.dataRetention", operator: "exists", severity: "error" }` |
| Customer-facing agents must have deny lists for risky actions | `{ field: "constraints.denied_actions", operator: "count_gte", value: 5, severity: "warning" }` |
| Regulated agents must log all interactions | `{ field: "governance.audit.log_interactions", operator: "equals", value: true, severity: "error" }` |

#### 2.3 Validation Report and Lifecycle Gate

After generation, the Governance Validator produces a **Validation Report** stored in `agent_blueprints.validation_report`:

```json
{
  "valid": true,
  "violations": [
    {
      "policyName": "Audit Standards",
      "ruleId": "audit-001",
      "fieldPath": "governance.audit.log_interactions",
      "severity": "error",
      "message": "Agent must have audit logging enabled.",
      "remediationSuggestion": "Set governance.audit.log_interactions to true and configure retention_days to at least 90 days per your audit policy."
    }
  ],
  "policyCount": 4,
  "generatedAt": "2026-04-05T14:32:18Z"
}
```

**Lifecycle Gate:** An ABP cannot transition from `draft` to `in_review` status if the Validation Report contains any `error`-severity violations. This enforces **independent validation before human review**, aligning with SR 11-7's requirement for validation prior to approval.

**Four Seeded Global Policies:**

Every Intellios instance is seeded with four baseline governance policies:

| Policy | Type | Key Rules |
|---|---|---|
| **Safety Baseline** | safety | Agent must have name, capabilities, system instructions (all error-severity) |
| **Audit Standards** | audit | Audit logging configuration must be documented (warning-severity) |
| **Access Control Baseline** | access_control | Denied actions and constraint documentation required (warning-severity) |
| **Governance Coverage** | compliance | Agent must have at least one governance policy (warning-severity) |

Enterprises can create additional policies tailored to their regulatory environment (FINRA rules, SOX requirements, GDPR constraints, etc.).

**Evidence:** Validation Report with deterministic evaluation results, timestamped and stored with the blueprint.

#### 2.4 Manual Re-Validation

After a blueprint is refined, a designer can request re-validation via `POST /api/blueprints/[id]/validate`. This endpoint:

1. Re-runs the Governance Validator against the updated ABP
2. Generates a new Validation Report
3. Stores the report in the database with a fresh timestamp
4. Returns the report to the UI

This supports SR 11-7's requirement for "regular validation of model assumptions" as the model evolves.

---

## Section 3: Model Governance Framework

### SR 11-7 Expectation

> Banks should have a governance framework that clearly assigns roles, responsibilities, and reporting lines for model oversight. This should include involvement of the Board or senior management in model risk oversight and clear approval authority.

### How Intellios Satisfies This

#### 3.1 Lifecycle State Machine and Approval Authority

Every ABP progresses through a defined state machine that enforces clear approval authority:

```
draft
  ├─→ in_review (requires passing governance validation)
  │     ├─→ approved (human approval + governance passing)
  │     ├─→ rejected (human rejection → terminal)
  │     └─→ draft (request changes → back to editing)
  └─→ deprecated (retirement without review)
```

**State Transitions and Authority:**

| Transition | Requires | Authority | Evidence |
|---|---|---|---|
| draft → in_review | No error-severity violations | Designer + Governance System | Validation Report |
| in_review → approved | Human review + explicit approval | Designated Reviewer (RBAC) | reviewedBy + reviewedAt + reviewComment |
| in_review → rejected | Human review + explicit rejection | Designated Reviewer (RBAC) | reviewedBy + reviewedAt + reviewComment |
| in_review → draft | Request for changes | Designated Reviewer (RBAC) | Review audit log entry |
| approved → deprecated | Retirement decision | Administrator/Governance Officer | Deprecation timestamp + audit entry |

**Approval Metadata:** Every approval is recorded with:
- `reviewedBy` — Identity of the reviewer (email, ID, or system account)
- `reviewedAt` — ISO 8601 timestamp of the approval decision
- `reviewComment` — Free-text justification or additional context from the reviewer

This metadata forms part of the immutable audit trail and is included in the MRM report as evidence of governance compliance.

#### 3.2 Role-Based Access Control (RBAC)

Intellios enforces role-based permissions on lifecycle transitions:

| Role | Permissions |
|---|---|
| **Designer** | Create intake sessions, generate blueprints, refine in draft status, submit for review |
| **Reviewer** | View blueprints in in_review status, approve/reject/request changes, view validation reports |
| **Governance Officer** | Define governance policies, manage policy versioning, audit validation history |
| **Administrator** | All permissions; manage users and role assignments; full audit access |

[PLACEHOLDER: Full RBAC implementation including policy enforcement and auditability]

#### 3.3 Ownership Block

Every ABP includes an `ownership` metadata block that documents:

```json
{
  "enterpriseId": "uuid",
  "businessOwner": "john.smith@company.com",
  "technicalOwner": "ai-ops@company.com",
  "riskOwner": "risk-team@company.com",
  "complianceOwner": "compliance@company.com",
  "deploymentApprovedBy": "cro@company.com",
  "deploymentApprovedAt": "2026-04-05T10:00:00Z"
}
```

This structure ensures that **governance accountability is explicitly assigned** across business, technical, risk, and compliance functions. It can be updated via `PATCH /api/blueprints/[id]/ownership` by authorized personnel.

**Evidence:** Ownership block in ABP metadata, immutable and auditable.

#### 3.4 Audit Trail and Compliance Evidence Chain

Every action on an ABP is recorded in an immutable audit log:

| Event | Timestamp | Metadata | Evidence |
|---|---|---|---|
| Blueprint created | ISO 8601 | Generation session ID, intake context | agent_blueprints.created_at |
| Governance validation | ISO 8601 | Policy count, violations, severity distribution | validation_report |
| Submitted for review | ISO 8601 | Designer, session ID | agent_blueprints.status |
| Approved/Rejected | ISO 8601 | Reviewer, comment, basis for decision | reviewedBy, reviewedAt, reviewComment |
| Refined (in draft) | ISO 8601 | Change description, field path, old/new values | [PLACEHOLDER: Change tracking] |
| Deprecated | ISO 8601 | Reason, approving officer | deprecation_reason, deprecated_by, deprecated_at |

[PLACEHOLDER: Full audit log schema and queryable API]

**MRM Report Integration:** All audit events are retrievable for inclusion in the Model Risk Management Report (Section 6).

---

## Section 4: Ongoing Monitoring and Drift Detection

### SR 11-7 Expectation

> Banks should have processes in place to monitor the ongoing performance and condition of models. This includes monitoring changes in model inputs, output distributions, and model use, as well as detecting model degradation or drift from original specifications.

### How Intellios Satisfies This

#### 4.1 Specification Drift Detection

[PLACEHOLDER: Observability subsystem with runtime telemetry collection]

Every approved ABP becomes the **source of truth** for the agent's authorized behavior. The constraints section of the ABP defines:

- **allowed_domains** — Systems and data sources the agent may access
- **denied_actions** — Actions that are strictly prohibited
- **rate_limits** — Invocation frequency caps and quota thresholds
- **data_handling** — PII redaction rules, retention requirements, encryption policies

At runtime, an observability layer [PLACEHOLDER: to be specified in future document] monitors:

1. **Input drift** — Are the agent's inputs aligned with the capabilities section of the ABP?
2. **Output drift** — Are outputs consistent with the identity and behavioral instructions?
3. **Constraint violations** — Has the agent violated any constraints (denied actions, rate limits, data handling)?
4. **Integration drift** — Are external API calls consistent with the declared integrations?

**Drift Alerts:** When observed behavior deviates from the ABP specification by more than a configurable threshold, alerts are generated:

```json
{
  "alertId": "uuid",
  "agentId": "uuid",
  "driftType": "constraint_violation",
  "fieldPath": "constraints.denied_actions",
  "expectedValue": "[\"delete_user\", \"modify_policy\"]",
  "observedValue": "[\"delete_user\", \"modify_policy\", \"create_superuser\"]",
  "severity": "error",
  "detectedAt": "2026-04-05T14:15:00Z",
  "remediationActions": ["pause_agent", "escalate_to_risk_team"]
}
```

#### 4.2 Model Input Monitoring

The Intake Engine captures a `Phase 1 IntakeContext` that documents the agent's intended data sources and sensitivity profile. At runtime:

- **Data lineage monitoring** — Verify that data flows match the declared integrations
- **Sensitivity classification** — Confirm that data touching the agent matches its declared sensitivity level (public, confidential, PII, regulated)
- **Quality baselines** — Track data freshness, completeness, and null rates against baseline expectations

[PLACEHOLDER: Data monitoring dashboard with baseline comparisons]

#### 4.3 Model Output Monitoring

Every ABP includes a `capabilities.instructions` section that defines the agent's behavioral constraints and expected output format. Output monitoring includes:

- **Output format validation** — Are outputs consistent with declared format (JSON schema, free text, structured)?
- **Instruction compliance** — Are outputs respecting the behavioral constraints?
- **Confidence calibration** — If the agent reports confidence/uncertainty, are those estimates well-calibrated?

[PLACEHOLDER: Output monitoring dashboard with compliance metrics]

#### 4.4 Escalation and Remediation

When drift is detected, automated escalation procedures are triggered:

1. **Severity error** → Automatic pause; escalate to risk team immediately
2. **Severity warning** → Escalate to governance officer; recommend manual review
3. **Severity info** → Log for audit trail; notify agent owner

[PLACEHOLDER: Escalation workflow and remediation playbook]

---

## Section 5: Documentation and Reporting

### SR 11-7 Expectation

> Banks should maintain comprehensive documentation of all models, including model development, validation, governance, ongoing monitoring, and issues. This documentation should be readily available for examination by supervisory authorities.

### How Intellios Satisfies This

#### 5.1 The Agent Blueprint Package as Model Documentation

The **Agent Blueprint Package (ABP)** is the canonical model documentation artifact. It is:

- **Structured** — JSON schema with enforced fields (no free-form narratives that might be ambiguous or incomplete)
- **Versioned** — Semantic versioning with full history in the Agent Registry
- **Audited** — Every creation, update, and state transition is timestamped and attributed
- **Queryable** — Stored in PostgreSQL, available for search, filtering, and export
- **Exportable** — Available in JSON, Markdown, and [PLACEHOLDER: PDF] formats for regulatory submission

#### 5.2 Agent Registry — The Model Inventory

The **Agent Registry** (`/api/registry`) provides a complete model inventory with:

```json
{
  "agents": [
    {
      "agentId": "uuid-123",
      "name": "Loan Approval Agent v2",
      "status": "approved",
      "version": "2.0.0",
      "createdAt": "2026-02-10T10:00:00Z",
      "lastModifiedAt": "2026-04-02T14:30:00Z",
      "businessOwner": "lending-team@company.com",
      "deploymentStatus": "production",
      "dataClassification": "regulated",
      "regulatoryScope": ["FINRA"],
      "versionHistory": [
        { "version": "1.0.0", "status": "deprecated", "createdAt": "2026-01-15T09:00:00Z" },
        { "version": "2.0.0", "status": "approved", "createdAt": "2026-02-10T10:00:00Z" }
      ]
    }
  ],
  "totalCount": 42
}
```

This registry serves as **auditable model inventory** for regulatory examination.

#### 5.3 Model Risk Management (MRM) Report

[PLACEHOLDER: MRM Report Component]

Intellios can generate a comprehensive **Model Risk Management Report** for each ABP that includes:

| Section | Content | Source |
|---|---|---|
| 1. Executive Summary | Model overview, risk rating, approval status | ABP metadata + governance validation |
| 2. Model Description | Identity, purpose, intended use, business context | ABP identity section + IntakeContext |
| 3. Development Methodology | Intake process, stakeholder involvement, governance probing rules | IntakePayload + stakeholder contributions |
| 4. Model Validation Results | Governance policy violations, severity distribution, remediation status | Validation Report + re-validation history |
| 5. Governance Framework | Roles, approval authority, oversight structure, RBAC | Ownership block + approval metadata |
| 6. Data Documentation | Inputs, sensitivity classification, retention requirements, compliance handling | Constraints section + data_handling policy |
| 7. Behavioral Specifications | System instructions, capabilities, constraints, denied actions | Capabilities + constraints sections |
| 8. Deployment Configuration | Integration points, rate limits, audit logging | Execution section + governance.audit |
| 9. Monitoring and Drift Detection | Monitoring approach, alert thresholds, escalation procedures | [PLACEHOLDER: Observability config] |
| 10. Approval Chain | Reviewers, approval timestamps, review comments, change history | Approval metadata + audit trail |
| 11. Stakeholder Contributions | Attributed input from compliance, risk, legal, security, IT, operations, business | Intake Engine stakeholder lane outputs |
| 12. Audit Trail | Timestamped events from creation through deployment | Audit log |

The MRM Report is:
- **Generated deterministically** from stored ABP and governance artifacts
- **Comprehensive** — Includes all SR 11-7 required sections
- **Auditable** — Every piece of data is sourced from immutable records
- **Exportable** — Available as JSON, Markdown, or [PLACEHOLDER: PDF with digital signature]

**Evidence Chain:** Every fact in the MRM Report is linked to a specific data artifact (ABP field, validation record, approval timestamp), making it suitable for regulatory examination.

#### 5.4 Compliance Evidence Chain

Intellios maintains an immutable **compliance evidence chain** that records:

1. **Model definition** — ABP with all sections complete and validated
2. **Independent validation** — Governance Validator output with policy coverage and violations addressed
3. **Human review** — Approval chain with reviewer identity and timestamp
4. **Governance framework** — Ownership block and role assignments
5. **Monitoring configuration** — Observability settings, alert thresholds, escalation procedures
6. **Audit log** — All state transitions, refinements, and operational events

This chain is:
- **Deterministic** — Generated from structured data, not narratives
- **Verifiable** — Can be reconstructed from immutable database records
- **Audit-ready** — Formatted for presentation to regulatory authorities

---

## Section 6: Examination Readiness

### How to Prepare for Regulatory Examination Using Intellios

Regulatory examinations by the Federal Reserve, OCC, or other supervisory authorities typically require:

1. **Model inventory** — Complete list of all models in use, with dates, status, and business owners
2. **Model documentation** — Specifications, inputs, methodologies, validation results
3. **Governance evidence** — Approval authority, review records, RBAC, oversight structure
4. **Validation evidence** — Independent validation results, policy evaluations, violation remediation
5. **Monitoring evidence** — Ongoing performance metrics, drift detection, escalation logs
6. **Audit trail** — Complete record of model creation, changes, and governance decisions

#### Step 1: Generate Model Inventory

```bash
GET /api/registry?status=approved&dataSensitivity=regulated
```

This query returns all approved models that handle regulated data. The result includes:
- Agent ID, name, version, status
- Business owner, technical owner, risk owner, compliance owner
- Data classification and regulatory scope
- Deployment status and dates
- Full version history

**Export for examiners:** JSON or [PLACEHOLDER: PDF] export with all metadata and versioning.

#### Step 2: Retrieve ABP Documentation

```bash
GET /api/registry/[agentId]
```

This endpoint returns the complete ABP for a specific agent, including:
- All sections (metadata, identity, capabilities, constraints, governance, execution)
- Full version history (compare versions to show change control)
- Validation Report with policy coverage
- Approval chain with reviewer metadata

**Export for examiners:** Formatted ABP document (JSON or Markdown).

#### Step 3: Generate MRM Report

```bash
GET /api/blueprints/[id]/mrm-report
```

[PLACEHOLDER: MRM Report API endpoint]

This generates a comprehensive Model Risk Management Report with:
- Executive summary and risk rating
- All required SR 11-7 sections (development, validation, governance, monitoring, documentation)
- Proof of governance validation and policy compliance
- Approval chain and stakeholder contributions
- Audit trail of all state transitions

**Export for examiners:** Formatted report (JSON or PDF with digital signature).

#### Step 4: Retrieve Audit Trail

```bash
GET /api/blueprints/[id]/audit-log?limit=500
```

[PLACEHOLDER: Audit log API endpoint]

This returns a timestamped, immutable record of all events:
- Blueprint creation and metadata updates
- Governance validation runs and results
- State transitions (draft → in_review → approved)
- Approvals with reviewer identity and timestamp
- Changes and refinements (with old/new values)
- Deprecation and retirement

**Export for examiners:** Audit log in JSON or [PLACEHOLDER: CSV] format for analysis.

#### Step 5: Prepare Response to Examination Findings

If an examiner questions a specific governance decision or validation result:

1. **Retrieve the relevant validation report** — Show the specific policies applied, rules evaluated, and violations detected
2. **Show the remediation** — If violations were found, retrieve the blueprints where violations were addressed
3. **Provide the approval chain** — Show who reviewed the model, when, and what their conclusion was
4. **Document the rationale** — Use the ownership block and review comments to explain governance decisions

All of this information is generated deterministically from the audit trail and cannot be backdated or modified.

#### Quick Reference: What Examiners Will Look For

| Question | Intellios Artifact | How to Respond |
|---|---|---|
| "What models are in production?" | Agent Registry filtered by status=approved | `GET /api/registry?status=approved` + MRM Report |
| "When was this model approved?" | ABP metadata + approval timestamps | reviewedAt field in ABP |
| "Who reviewed this model?" | ABP approval metadata | reviewedBy field in ABP |
| "What governance policies apply?" | Governance Validator report | Validation Report in ABP.validation_report |
| "Was the model independently validated?" | Validation Report with policy coverage | validation_report.policyCount and violations |
| "How is the model monitored?" | Observability configuration + drift alerts | [PLACEHOLDER: Monitoring dashboard] |
| "What data does the model use?" | ABP capabilities and constraints sections | capabilities.tools and constraints.allowed_domains |
| "Can you show the change history?" | Agent Registry version history | versionHistory in registry response |
| "Were there any governance violations?" | Validation Report violations with severity | validation_report.violations array |

---

## Section 7: Scope and Limitations

### What Intellios Provides

Intellios is a **governance control plane** that makes model risk management infrastructure deterministic and auditable. It provides:

- **Structured capture** of model intent, requirements, and governance constraints
- **Independent validation** of models against enterprise policies (deterministic, no LLM)
- **Immutable audit trail** of all governance decisions and model changes
- **Lifecycle management** with clear approval authority and state machines
- **Compliance evidence generation** in formats suitable for regulatory examination

### What Intellios Does NOT Provide

Intellios does not replace the fundamental responsibilities of compliance, risk, and governance teams. The following remain organizational responsibilities:

#### 1. **Policy Definition and Calibration**

Intellios enforces policies, but **your organization defines them**. Governance teams must:

- Define what "compliant" means in your regulatory environment (FINRA, SOX, GDPR, internal policy)
- Establish policy rules in the governance system
- Calibrate rule severity and remediation expectations
- Keep policies current as regulations change

*Intellios role:* Apply policies consistently and deterministically; generate violations and audit evidence.

#### 2. **Human Model Validation and Review**

Intellios validates against policies; humans validate the model's conceptual soundness. Model reviewers must:

- Assess whether the model's assumptions are reasonable given its use case
- Verify that data inputs are adequate and appropriate
- Validate that the model's methodology is sound
- Make independent judgment on approval vs. rejection

*Intellios role:* Provide the policy compliance evidence and structured data for human review; facilitate the approval workflow.

#### 3. **Production Monitoring and Escalation**

Intellios provides monitoring infrastructure; operational teams must monitor and escalate. Your organization must:

- Configure monitoring thresholds appropriate for the model's risk level
- Establish escalation procedures for drift and defects
- Maintain a playbook for pausing or retiring models that fail monitoring
- Document monitoring results for the MRM report

*Intellios role:* Detect drift against the ABP specification; trigger escalation workflows; maintain monitoring audit trail.

#### 4. **External Data Quality and Lineage**

Intellios documents data inputs; external systems own data quality. Your organization must:

- Maintain data lineage and transformations outside Intellios
- Validate external data quality against declared baselines
- Document data retention and compliance handling in systems of record
- Escalate data quality issues through your data governance program

*Intellios role:* Document declared data sensitivity and retention in the ABP; cross-reference external data quality systems.

#### 5. **Regulatory Interaction and Examination Response**

Intellios generates evidence; your compliance team manages the relationship. Your organization must:

- Prepare examination responses and documentation packages
- Interact directly with regulators
- Explain examination findings and provide context
- Determine whether findings require model changes or policy updates

*Intellios role:* Generate comprehensive, auditable evidence packages suitable for regulator review.

### Operational Prerequisites

To use Intellios effectively for SR 11-7 compliance:

1. **Governance policies must be defined** — Start with the four seeded baseline policies; customize for your regulatory environment
2. **Review authority must be assigned** — Designate reviewers with appropriate risk/compliance background via RBAC
3. **Stakeholder coordination must be established** — Ensure compliance, risk, legal, security, and IT can contribute to intake
4. **Monitoring infrastructure must be deployed** — Configure observability to detect drift against ABP specifications
5. **Documentation process must be institutionalized** — Commit to generating MRM reports and maintaining the audit trail

---

## Section 8: Glossary of Key Terms

| Term | Definition |
|---|---|
| **Agent Blueprint Package (ABP)** | The core structured artifact that fully describes an agent: identity, capabilities, constraints, governance policies, and execution configuration. Serves as model documentation. |
| **Agent Registry** | The database and API that stores ABPs, manages versioning, tracks lifecycle state, and provides auditable model inventory. |
| **Governance Validator** | The subsystem that validates ABPs against enterprise governance policies using deterministic rule evaluation. Outputs a Validation Report. |
| **Governance Policy** | A set of enterprise rules expressed in structured format (field + operator + value + severity). Applied to ABPs to ensure compliance. |
| **Intake Engine** | The subsystem that captures enterprise requirements, regulatory context, and stakeholder input through a three-phase process. Outputs an IntakePayload consumed by the Generation Engine. |
| **Validation Report** | The output of the Governance Validator for a given ABP. Contains valid (boolean), violations (list), policyCount, and generatedAt timestamp. Stored immutably. |
| **Lifecycle State Machine** | The set of valid ABP status transitions: draft → in_review → approved/rejected → deprecated. Enforces governance gates. |
| **Compliance Evidence Chain** | The immutable, timestamped, auditable record of all facts relevant to SR 11-7 compliance: model definition, validation, approval, governance framework, monitoring configuration, and audit trail. |
| **Model Risk Management (MRM) Report** | A comprehensive document generated from the ABP and governance artifacts that satisfies SR 11-7 documentation requirements. Includes all required sections for regulatory examination. |
| **Drift Detection** | Runtime monitoring that compares observed agent behavior against the ABP specification, detecting deviations in inputs, outputs, constraints, or integrations. |

---

## Section 9: References and Further Reading

### Federal Reserve Guidance

- **SR 11-7: Guidance on Model Risk Management** (November 2011) — The foundational framework for model risk management in banking
- **SR 16-19: Guidance on Governance of Model Risk Management** (October 2021) — Updated guidance on governance framework and oversight

### Intellios Documentation

- **docs/architecture/abp-spec.md** — Canonical specification of the Agent Blueprint Package
- **docs/specs/governance-validator.md** — Detailed specification of policy validation
- **docs/specs/intake-engine.md** — Three-phase intake process and stakeholder contributions
- **docs/specs/agent-registry.md** — Model inventory, versioning, and lifecycle management
- **docs/decisions/005-governance-policy-expression-language.md** — Design decision on the structured policy expression language

### For Compliance and Risk Teams

- **KB-05-002: Building Governance Policies** — How to define and calibrate governance rules for your regulatory environment [PLACEHOLDER]
- **KB-05-003: Intake Process for Regulated Agents** — Step-by-step guide for capturing compliance requirements in intake [PLACEHOLDER]
- **KB-05-004: Model Monitoring and Escalation** — Configuring drift detection and response workflows [PLACEHOLDER]

---

## Revision History

| Date | Version | Changes | Author |
|---|---|---|---|
| 2026-04-05 | 1.0.0 | Initial publication | Intellios Compliance Team |

---

**Document Classification:** Internal Use — Compliance and Risk Teams
**Last Updated:** 2026-04-05
**Next Review Date:** 2026-10-05 (6-month review cycle)
