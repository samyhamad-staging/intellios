---
id: "03-007"
title: "Compliance Evidence Chain"
slug: "compliance-evidence-chain"
type: "concept"
audiences:
  - "compliance"
  - "executive"
status: "published"
version: "1.0.0"
platform_version: "1.2.0"
created: "2026-04-05"
updated: "2026-04-05"
tags:
  - "compliance"
  - "evidence"
  - "audit-trail"
  - "traceability"
  - "documentation"
  - "regulatory"
  - "sr-11-7"
  - "accountability"
tldr: >
  How Intellios records, preserves, and traces every governance decision to enable
  regulatory examination readiness and institutional accountability
---

# Compliance Evidence Chain

## TL;DR

Intellios generates an immutable, complete evidence chain for every agent in the system. From initial stakeholder intake through deployment and monitoring, each decision point produces timestamped, actor-identified, and purpose-documented evidence. This chain directly satisfies regulatory requirements (SR 11-7, OCC guidance, EU AI Act transparency provisions) and ensures your institution can defend any agent decision during examination.

---

## Overview

Regulatory examiners and auditors no longer ask "Do you have governance?" They ask "Can you prove it?"

The Compliance Evidence Chain is Intellios's answer. It is a continuous record of every action, decision, and validation that touches an agent throughout its lifecycle. Nothing is retroactively edited. Nothing is deleted. Every entry includes:

- **Who** acted (user identity, role)
- **What** happened (intake input, generation output, validation result, review decision)
- **When** it occurred (precise timestamp)
- **Why** it happened (requirements, policy triggered, remediation applied)
- **Outcome** of the action (valid/invalid, approved/rejected, remediation accepted)

This chain solves three institutional needs simultaneously:

1. **Examination readiness** — When regulators ask "Show me how you validated this agent," you don't search scattered logs. You produce a single, coherent narrative trail.
2. **Accountability** — Decision authority is explicit. Leadership can trace which stakeholders contributed to requirements, which governance policies were enforced, and which reviewers approved deployment.
3. **Reproducibility** — Deterministic policy evaluation means you can audit any past decision by running the agent blueprint against the policies that were active on that date. Results are identical, making disputes about "what the rules said then" evaporable.

---

## How It Works

Evidence accumulates at five critical lifecycle stages, each adding detail to the chain.

### 1. Intake Records

The Intake Engine captures the complete conversation between stakeholders and the system. Evidence produced:

- Full transcript of stakeholder interactions and requirements gathering
- Structured intake payload (agent name, business purpose, risk classification, policy exceptions requested)
- Actor identity and timestamp for each contribution
- Version of the intake template applied

**Why it matters:** This proves intent and stakeholder alignment. When questioned about why an agent was designed to do X, you show the intake record demonstrating that business stakeholders explicitly requested it.

### 2. Generation Artifacts

The Generation Engine produces the Agent Blueprint Package (ABP) — the complete agent specification. Evidence produced:

- ABP version (immutable record, never overwritten)
- Metadata: generation timestamp, schema version used, generator configuration
- Lineage: which intake record produced this ABP
- Change summary if this is a revision (what changed, why)

**Why it matters:** This proves the agent was formally specified and documented before validation or deployment. You have a dated artifact showing exactly what was generated and from what input.

### 3. Governance Validation

The Governance Validator evaluates the blueprint against active policies. Evidence produced:

- Validation report: valid/invalid status, timestamp, evaluator identity
- Policy coverage: count of policies evaluated, all passing
- Violation detail (if invalid):
  - Policy name and version
  - Rule ID and business objective
  - Field path in ABP where violation occurred
  - Severity (critical, major, minor)
  - Violation message and remediation suggestion
- Remediation record (if violations were fixed):
  - Original ABP version
  - Remediation applied
  - Re-validation result
  - Approver identity who accepted the remediation

**Why it matters:** This is the centerpiece of SR 11-7 evidence. You prove the agent was validated against documented policies, violations were identified, and remediation was tracked and approved. Deterministic evaluation means running the same ABP against the same policy version produces identical results—no ambiguity about what the rules required.

### 4. Review Decisions

The Blueprint Review UI captures human review and approval. Evidence produced:

- Review assignment: which reviewer, when assigned, deadline
- Review completion: who reviewed, timestamp
- Decision: approve / reject / request-changes
- Rationale and comments (required field)
- Follow-up actions if request-changes (which issues to address, resubmission deadline)

**Why it matters:** This proves qualified human review occurred. You show who reviewed, what they decided, and why. This satisfies governance requirements for oversight and sign-off.

### 5. Lifecycle Transitions and Deployment

Every state change (draft → in-review → approved → deployed → active) is recorded. Evidence produced:

- State transition log: from-state, to-state, actor, timestamp, required comment
- Deployment record: deployed-by, deployed-to (environment/registry), timestamp, rollout plan
- Version lock: the exact ABP version deployed, immutably linked to deployment

**Why it matters:** This proves operational governance. You show the agent transitioned through defined stages, required sign-offs happened, and the exact version deployed is known and recoverable.

### Evidence Accumulation Diagram

```
Intake Record (REQ-001)
    ↓ [transcript, payload, timestamp]
    ↓
ABP v1.0.0 (GEN-042)
    ↓ [generated-from: REQ-001, schema: v3.2.0]
    ↓
Governance Validation (VAL-089)
    ↓ [valid: true, policies: 4/4 passing]
    ↓
Review Decision (REV-055)
    ↓ [approved-by: Jane Smith (Compliance), rationale: "meets risk profile"]
    ↓
Deployment (DEP-201)
    ↓ [deployed-by: Sarah Chen, to: production, timestamp: 2026-04-05T14:23:00Z]
    ↓
Audit Ready
    ↓ [complete chain: REQ-001 → GEN-042 → VAL-089 → REV-055 → DEP-201]
```

---

## Key Principles

### Immutability

No action in the evidence chain can be edited or deleted retroactively. If a decision was wrong, the correction creates a new record linked to the original. This prevents the appearance of concealment and ensures auditors can trust the timeline.

### Completeness

Every decision—approval, rejection, remediation, exception—generates evidence. There are no "informal" approvals or off-the-record decisions. The system enforces this by making comment fields mandatory and state transitions atomic.

### Reproducibility

Policy evaluation is deterministic. Given the same ABP and the same policy version, validation produces identical results. This means past decisions can be audited without ambiguity. If a policy was changed, a new version is created, and old versions remain available for historical validation.

### Traceability

The chain is end-to-end and unbroken. Regulators can follow a single agent from "Why was this built?" (intake) through "How was it governed?" (validation) to "Who approved it?" (review) to "Where is it running?" (deployment). No gaps, no missing documents.

---

## Relationship to Other Concepts

| Concept | Connection |
|---------|-----------|
| **SR 11-7 Mapping** | The evidence chain directly satisfies SR 11-7's documentation and validation evidence requirements. See SR 11-7 Mapping for detailed regulatory alignment. |
| **Governance-as-Code** | Policies are versioned and immutable, enabling deterministic re-evaluation of historical decisions. |
| **Agent Lifecycle States** | Each state transition is recorded with actor and timestamp, creating an audit trail of governance progression. |
| **Audit Trail Generation** | The evidence chain is the raw material for audit reports, regulatory responses, and internal compliance reviews. |

---

## Example: A Single Agent's Evidence Trail

An agent named **LoanReviewAssistant** moves from intake through approval. Here's the evidence produced:

**Day 1 — Intake (INTAKE-2026-04-01-0342)**
- Risk Management team and Credit team submit requirements via Intake Engine
- Transcript captured: business use case (assist loan officers with policy compliance review), risk level (high), exceptions requested (none)
- Timestamp: 2026-04-01 09:15:00 UTC
- Evidence: full intake payload, actor identities

**Day 2 — Generation (ABP-LOANREVIEW-v1.0.0)**
- Generation Engine produces LoanReviewAssistant blueprint
- Includes tool definitions (access policy docs, flag non-compliant patterns), knowledge base bindings, guardrails
- Metadata: generated from INTAKE-2026-04-01-0342, schema v3.2.0, 2026-04-02 14:30:00 UTC
- Evidence: immutable ABP, version record

**Day 2 — Validation (VALIDATION-LOANREVIEW-v1.0.0-RUN1)**
- Governance Validator evaluates the blueprint against four seeded policies:
  - Policy: PII-Minimization → PASS (no borrower PII in knowledge base)
  - Policy: Decision-Transparency → PASS (all recommendations include reasoning)
  - Policy: Model-Limits → PASS (tool scope limited to compliance review, no loan decisions)
  - Policy: Escalation-Protocol → PASS (non-compliant findings escalated to human reviewer)
- Result: VALID
- Timestamp: 2026-04-02 14:45:00 UTC
- Evidence: validation report, policy version, all-passing status

**Day 3 — Review (REVIEW-LOANREVIEW-0001)**
- Compliance Officer Jane Smith assigned to review
- Reviews ABP, validation report, risk classification
- Decision: APPROVED
- Rationale: "High-risk use case, but governance controls are robust. Tool scope is appropriately constrained. Knowledge base correctly excludes borrower data. Escalation protocol ensures human oversight. Ready for limited production trial."
- Timestamp: 2026-04-03 10:22:00 UTC
- Evidence: review assignment, reviewer identity, decision, rationale

**Day 4 — Deployment (DEPLOYMENT-LOANREVIEW-PROD-0001)**
- Sarah Chen (Operations) deploys ABP-LOANREVIEW-v1.0.0 to production
- Deployment plan: limited access (Risk Management team only), 2-week trial, daily monitoring
- Environment: production/credit
- Timestamp: 2026-04-04 16:00:00 UTC
- Evidence: deployment record, version lock, environment, actor

**Examination, Month 8:**
When regulators ask "Show me how you governed this loan review agent," the institution produces the complete chain. They can:
- Read the intake and see stakeholder intent
- Examine the ABP and confirm tool scope and guardrails
- Review the validation report and confirm policies were applied deterministically
- See Jane Smith's approval rationale
- Confirm the exact version deployed and when
- Run the current ABP against the dated policy versions and reproduce the validation result

Result: credible, coherent evidence of institutional governance.

---

## Implementation in Intellios

Intellios implements the evidence chain through:

- **Intake Engine** — captures and stores intake records with full transcripts
- **Generation Engine** — versions every ABP, stores lineage metadata
- **Governance Validator** — generates detailed validation reports with policy version tracking
- **Review Queue** — enforces comment fields and captures review decisions
- **Agent Registry** — stores all ABP versions separately (never overwrites), linked to validation and review records
- **No deletion policy** — audit trail cannot be pruned; evidence is permanent
- **Deterministic evaluation** — policies are versioned; old versions available for historical re-validation

The evidence chain is not an add-on. It is the operational spine of the system. Every feature is designed to feed it.
