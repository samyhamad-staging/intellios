---
id: 03-009
title: 'Control Plane: Orchestration, Validation, and Review'
slug: control-plane
type: concept
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
- control-plane
- governance-validator
- agent-registry
- blueprint-review-ui
- lifecycle-management
- policy-enforcement
- subsystem
prerequisites: []
related:
- 03-008
- 03-002
- 03-001
- 03-005
next_steps:
- 05-010
- 04-003
feedback_url: https://feedback.intellios.ai/kb
tldr: 'The Control Plane is the subsystem responsible for governance validation, lifecycle
  management, and agent registry operations. It comprises three tightly integrated
  components: the Governance Validator (which evaluates ABPs against enterprise policies
  using a deterministic expression language), the Agent Registry (which stores and
  versions ABPs with immutable audit trails), and the Blueprint Review UI (which provides
  the human interface for approving or rejecting generated agents).

  '
---


# Control Plane: Orchestration, Validation, and Review

> **TL;DR:** The Control Plane is the subsystem responsible for governance validation, lifecycle management, and agent registry operations. It comprises three tightly integrated components: the Governance Validator (which evaluates ABPs against enterprise policies using a deterministic expression language), the Agent Registry (which stores and versions ABPs with immutable audit trails), and the Blueprint Review UI (which provides the human interface for approving or rejecting generated agents).

## Overview

Once an agent blueprint is designed, it must be governed. Governance in an enterprise AI context means:
- **Does this agent comply with our policies?** (regulatory, security, data handling, safety)
- **Who is allowed to approve it?** (compliance officer, security lead, business owner)
- **Is it fit for production?** (validated, tested, audit trail documented)
- **Can we track changes and rollback?** (versioning, immutability, history)

Without systematic governance, agents become black boxes. Compliance teams cannot audit them. Security teams cannot verify controls. Operations cannot manage their lifecycle. Regulators see risk, not control.

The **Control Plane** is the subsystem that brings order to agent governance. It is composed of three components that work together in a cycle: the **Governance Validator** (which checks ABPs against policies deterministically), the **Agent Registry** (which stores ABPs with full version history and immutable audit trails), and the **Blueprint Review UI** (which provides the human interface for review and approval).

Together, the Control Plane implements a governance-lifecycle-review loop: ABPs flow in from Design Studio, are validated against policies, are reviewed by humans, are approved or rejected, and are stored in the registry with full audit provenance. At any point, operations can query the registry for the current or any historical version of an agent.

## How It Works

The Control Plane's process flows through three stages: policy validation, human review, and registry storage. An ABP progresses through defined lifecycle states, with governance checks gating each transition.

### Stage 1: Governance Validator

When an ABP arrives from the Design Studio, the **Governance Validator** evaluates it against all enterprise governance policies. This is a **deterministic, LLM-free process** — no language model, no ambiguity, no bias.

**How Validation Works**

The Governance Validator:

1. **Loads all active governance policies** — Enterprise administrators define governance policies (e.g., "all agents accessing PII must have audit logging," "high-risk agents require compliance sign-off"). Policies are stored in the Control Plane's policy database.

2. **Parses the 11-operator policy expression language** — Each policy is written in a simple, deterministic expression language with operators:
   - `exists` / `not_exists` — field presence
   - `equals` / `not_equals` — exact match
   - `contains` / `not_contains` — substring/array membership
   - `matches` — regex pattern
   - `count_gte` / `count_lte` — array/collection size
   - `includes_type` / `not_includes_type` — type checking

   Example policy: `governance.audit.log_interactions == true AND governance.audit.retention_days >= 90`

3. **Evaluates each policy against the ABP** — For each policy, the validator checks whether the ABP's fields satisfy the policy's conditions. The result is a pass or fail (binary, deterministic).

4. **Assigns severity to violations** — If a policy is violated, the violation is assigned a severity:
   - **Error** — Blocks lifecycle transition (e.g., "audit logging is required" failure prevents approval)
   - **Warning** — Flagged but does not block (e.g., "consider rate limiting" is a suggestion, not a hard requirement)
   - **Info** — Informational (e.g., "agent uses 3 external APIs")

5. **Generates a Validation Report** — The output is a structured report listing:
   - All passed policies (checkmark)
   - All failed policies (name, description, violation details, severity)
   - A **remediation suggestion** for each failed policy (AI-powered, generated after evaluation completes)

**Claude-Powered Remediation Suggestions**

After deterministic evaluation, the Governance Validator runs Claude asynchronously to generate remediation suggestions. For each failed policy, Claude is asked: "This policy was violated. What changes to the ABP would fix it?" Claude responds with concrete suggestions (e.g., "Add 'log_interactions: true' to the governance.audit block"). These suggestions are non-binding guidance—the designer or reviewer can accept, reject, or modify them.

**Policy Evaluation is Governance-Gated**

Error-severity violations gate lifecycle transitions. An ABP cannot leave draft status if error-severity violations exist. This is a hard rule, not a guideline.

### Stage 2: Blueprint Review UI

If the ABP passes governance validation (no error-severity violations), it transitions to **in_review** status and appears in the **Review Queue** at `/review`.

The Review Queue shows all ABPs awaiting human review:

| Agent | Designer | Risk | Status | Violations | Action |
|-------|----------|------|--------|------------|--------|
| Mortgage Assistant | Alice | High | in_review | 1 warning | Review |
| Sales Analytics | Bob | Medium | in_review | 0 errors | Review |
| Internal FAQ Bot | Carol | Low | in_review | 0 errors | Review |

**The Review Interface**

Reviewers click on an ABP to open the review panel. The panel displays:

1. **The complete ABP** — Formatted as a readable specification with all six blocks (metadata, identity, capabilities, constraints, governance, ownership). Reviewers can see exactly what the agent will do.

2. **The Validation Report** — All policies are listed with pass/fail status, severity, and (if failed) remediation suggestions. This gives the reviewer confidence that governance has been validated.

3. **Stakeholder Contributions** — If multiple stakeholders provided input during intake, their contributions are visible and attributed. Reviewers can see who asked for what and when.

4. **Actions**:
   - **Approve** — ABP transitions to `approved` status and is moved to the Agent Registry for deployment
   - **Reject** — ABP transitions to `rejected` status with a reason. Designer is notified and can create a new version or modify and re-submit.
   - **Request Changes** — ABP transitions to `draft` status, allowing the designer to modify it. Once modified, the designer can re-submit, triggering governance validation again.

**Review Workflow**

The typical review flow:

1. Reviewer opens the ABP, reads the spec and validation report.
2. If validation passed and ABP is well-designed → **Approve**. ABP moves to `approved`, ready for deployment.
3. If there are warning-level violations or design concerns → **Request Changes**. Designer sees feedback, modifies the ABP in the Design Studio, and re-submits for validation and review.
4. If the ABP violates core policies despite passing validation → **Reject**. Designer and compliance team sync to understand the gap and design a compliant version.

Reviewers must provide a comment when approving, rejecting, or requesting changes. Comments are stored in the audit trail.

### Stage 3: Agent Registry

Once an ABP is approved, it is stored in the **Agent Registry**, a PostgreSQL-backed versioned repository of all agents in the enterprise.

**How the Registry Works**

The Agent Registry:

1. **Stores ABPs as immutable records** — Each ABP version is a separate row in the `agents` table. Once stored, it cannot be modified. Changes require creating a new version.

2. **Implements semantic versioning** — ABPs follow semantic versioning (1.0.0, 1.0.1, 1.1.0, 2.0.0). Version increments are assigned by the designer or automation based on change type:
   - `patch` — Bug fixes, constraint refinements
   - `minor` — New capabilities or knowledge sources
   - `major` — Breaking changes (e.g., removed tools, incompatible constraint changes)

3. **Tracks lifecycle state** — Each ABP record includes its current status (draft, in_review, approved, rejected, deprecated, deployed). Status transitions are logged with timestamp and actor.

4. **Maintains full audit trail** — Every ABP stores:
   - `created_at` / `created_by` — Genesis
   - `approved_at` / `approved_by` — Approval timestamp and reviewer
   - `validation_report` — The full validation report from governance check
   - `stakeholder_contributions` — Timestamped, attributed input from each stakeholder lane
   - `change_log` — Version-by-version summary of changes

5. **Supports clone/fork operations** — Teams can clone an existing ABP to create a variant (e.g., "Mortgage Assistant v1.0" → "Mortgage Assistant v1.1" with a new capability). The clone inherits the parent's properties but is treated as a new design starting from draft status.

6. **Implements migrate-on-read** — As the ABP schema evolves (v1.0.0 → v1.1.0 → v1.2.0), older ABPs in the registry continue to work. When an older ABP is read (e.g., for deployment or audit), the system detects its schema version and applies forward-compatible transformations automatically. Old ABPs never break.

7. **No deletion — only deprecation** — Once an ABP is approved and deployed, it is never deleted. If it is no longer needed, it transitions to `deprecated` status. The record remains in the registry for audit trail completeness.

**Querying the Registry**

Operations teams and compliance teams query the registry via APIs:
- **Get latest version of agent X** → Returns the current production ABP
- **Get version 1.2.0 of agent X** → Returns the historical ABP for audit or rollback
- **List all agents in business unit Y** → Returns all agents owned by a team
- **Find all agents with denied_actions containing "delete"** → Search for agents with specific constraints
- **Export audit trail for agent X** → Full compliance evidence chain for an audit

## Control Plane Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                       CONTROL PLANE SUBSYSTEM                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │            FROM DESIGN STUDIO: ABP (in_review status)         │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                               ↓                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │               GOVERNANCE VALIDATOR                            │  │
│  ├───────────────────────────────────────────────────────────────┤  │
│  │                                                                │  │
│  │  1. Load all enterprise governance policies                   │  │
│  │  2. Parse policy expression language (11-operator DSL)        │  │
│  │  3. Deterministically evaluate ABP against each policy        │  │
│  │     ├─ Passed policies: ✓                                     │  │
│  │     └─ Failed policies: ✗ (severity: error | warning | info) │  │
│  │  4. Generate validation report                                │  │
│  │  5. (Async) Generate Claude-powered remediation suggestions   │  │
│  │                                                                │  │
│  │  Output: Validation Report (passed, failed, severity, fixes)  │  │
│  │                                                                │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                               ↓                                      │
│             ┌─────────────────────────────────────────────┐         │
│             │ Error-severity violations?                   │         │
│             ├─────────────────────────────────────────────┤         │
│             │ YES: Return to Design Studio (draft status)  │         │
│             │ NO:  Continue to Blueprint Review UI         │         │
│             └─────────────────────────────────────────────┘         │
│                               ↓                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │            BLUEPRINT REVIEW UI (/review)                      │  │
│  ├───────────────────────────────────────────────────────────────┤  │
│  │                                                                │  │
│  │  Review Queue: All in_review ABPs                             │  │
│  │  ┌────────────────┬──────────┬──────────────────────────────┐ │  │
│  │  │ Agent          │ Designer │ Validation Report            │ │  │
│  │  ├────────────────┼──────────┼──────────────────────────────┤ │  │
│  │  │ Mortgage Asst. │ Alice    │ ✓ Passed (0 errors)          │ │  │
│  │  │ Data Analytics │ Bob      │ ⚠ 1 warning (0 errors)       │ │  │
│  │  └────────────────┴──────────┴──────────────────────────────┘ │  │
│  │                                                                │  │
│  │  Reviewer Actions:                                             │  │
│  │  ├─ Approve → ABP → Agent Registry (approved status)          │  │
│  │  ├─ Reject  → ABP → Draft (designer creates new version)      │  │
│  │  └─ Request Changes → ABP → Draft (designer modifies & resubmits)
│  │                                                                │  │
│  │  (All actions require comments; comments stored in audit)     │  │
│  │                                                                │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                               ↓                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    AGENT REGISTRY                             │  │
│  ├───────────────────────────────────────────────────────────────┤  │
│  │                                                                │  │
│  │  PostgreSQL JSONB storage for all ABPs:                       │  │
│  │                                                                │  │
│  │  Agents Table:                                                │  │
│  │  ┌──────┬──────────┬─────────┬──────────┬──────────────────┐ │  │
│  │  │ ID   │ Version  │ Status  │ Approved │ Validation Report │ │  │
│  │  │      │          │         │ By       │                  │ │  │
│  │  ├──────┼──────────┼─────────┼──────────┼──────────────────┤ │  │
│  │  │ m1   │ 1.0.0    │approved │ Carol    │ [full report]    │ │  │
│  │  │ m1   │ 1.1.0    │approved │ Carol    │ [full report]    │ │  │
│  │  │ m1   │ 2.0.0    │approved │ Carol    │ [full report]    │ │  │
│  │  │ d2   │ 1.0.0    │approved │ David    │ [full report]    │ │  │
│  │  └──────┴──────────┴─────────┴──────────┴──────────────────┘ │  │
│  │                                                                │  │
│  │  Features:                                                    │  │
│  │  ├─ Semantic versioning (1.0.0, 1.0.1, 1.1.0, 2.0.0)         │  │
│  │  ├─ Immutable records (changes = new version)                │  │
│  │  ├─ Full audit trail (created, approved, who, when, why)     │  │
│  │  ├─ Schema migration (migrate-on-read, backward compatible)  │  │
│  │  ├─ Clone/fork operations (create variants)                  │  │
│  │  ├─ No deletion (only deprecation)                           │  │
│  │  └─ Query APIs (get by ID/version, search, export audit)     │  │
│  │                                                                │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                       │
└──────────────────────────────────→ To: Runtime Adapters (Deployment) │
```

## Key Principles

1. **Deterministic Governance** — The Governance Validator uses no language models in its evaluation loop. Policies are evaluated deterministically using a simple expression language. This ensures that governance decisions are repeatable, auditable, and free from bias. (Claude is used only for remediation suggestions after evaluation, not in the validation decision itself.)

2. **Human Review is Mandatory** — Automated governance validation is powerful, but human judgment is irreplaceable. Even ABPs that pass all policies must be reviewed by a human (compliance officer, security lead, or business owner) before approval. The Blueprint Review UI provides the interface for this human gate.

3. **Immutable Audit Trail** — Every decision (approval, rejection, change request) and every piece of evidence (validation report, stakeholder contributions, reviewer comments) is stored immutably in the Control Plane. This creates a compliance-ready audit trail: at any future date, an auditor can ask "Why was this agent approved?" and find the full evidence chain.

4. **Versioning Enables Rollback** — Because ABPs are versioned semantically in the Agent Registry, operations can always roll back to a previous version if a problem arises. If agent v2.0.0 behaves unexpectedly, ops can revert to v1.9.0 immediately. The registry maintains the full history.

5. **Governance Policies are Enterprise-Owned** — Policies are defined by compliance and security teams, not by Intellios. The Control Plane is the engine; the enterprise defines the rules. This enables multi-industry, multi-regulatory deployments where each enterprise codifies its own governance.

6. **Schema Evolution is Non-Breaking** — As Intellios evolves the ABP schema (adding new fields for new governance dimensions), older ABPs in the registry continue to work without migration. Migrate-on-read ensures backward compatibility and eliminates the need for schema upgrade projects.

## Relationship to Other Concepts

The Control Plane is the governance enforcement center of Intellios. It interacts with many other subsystems and concepts:

- **[Design Studio](./design-studio.md)** — The Control Plane consumes ABPs produced by the Design Studio. Governance validation and human review ensure only compliant ABPs leave the Control Plane.

- **[Governance-as-Code](./governance-as-code.md)** — The policies that the Control Plane enforces are defined using governance-as-code principles. Policies are versioned, audited, and can be updated by the enterprise without code deployment.

- **[Policy Expression Language](./policy-expression-language.md)** — The Governance Validator evaluates policies written in this 11-operator deterministic language. Understanding the language is essential for writing policies.

- **[Agent Blueprint Package (ABP)](./agent-blueprint-package.md)** — The ABP is the artifact that the Control Plane validates, reviews, and stores. Every field in the ABP can be referenced in a governance policy.

- **[Agent Lifecycle States](./agent-lifecycle-states.md)** — The Control Plane manages the lifecycle state machine (draft → in_review → approved/rejected → deployed → deprecated). Status transitions are gated by governance checks.

- **[Runtime Adapters](../04-architecture-integration/runtime-adapter-pattern.md)** — Once an ABP is approved and stored in the Agent Registry, runtime adapters retrieve it and deploy it to specific platforms (AWS, Azure, etc.).

## Examples

### Example: Mortgage Assistant Review and Approval

The Design Studio produced an ABP for a mortgage assistant (see Design Studio example). The ABP is handed to the Control Plane.

**Governance Validation**

The Governance Validator evaluates the ABP against the bank's 4 seeded global policies:

1. **Safety Baseline** — "All agents must have at least one safety constraint." ✓ PASS (agent has denied_actions: ["modify_account_data", "approve_loans"])

2. **Audit Standards** — "Agents accessing PII must have audit logging enabled with >= 90 days retention." ✓ PASS (agent has governance.audit.log_interactions: true, retention_days: 90)

3. **Access Control Baseline** — "Agents must define either allowed_domains, rate_limits, or require authentication." ✓ PASS (agent has all three)

4. **Governance Coverage** — "Every policy type (safety, compliance, data_handling, access_control, audit) must be represented." ✓ PASS (agent has all types)

All policies pass. No error-severity violations. The ABP transitions to in_review.

**Human Review**

Carol, the bank's compliance officer, logs into the Review Queue and sees the mortgage assistant ABP.

She clicks to open the review panel:

- **ABP Specification**: She reviews the full spec—identity, capabilities (core banking API, rate feed), constraints, governance. Everything looks reasonable.
- **Validation Report**: All 4 policies passed. She notes that validation is comprehensive.
- **Stakeholder Contributions**: She sees that the bank's IT team added a constraint about SSO authentication, and the business team specified rate limits. The contributions are well-documented.

Carol reviews the GLBA compliance requirements manually. The ABP correctly specifies:
- PII redaction in logs ✓
- No third-party sharing ✓
- Customer authentication ✓

Carol adds a comment: "Looks good. Mortgage assistant is GLBA-compliant and has all necessary controls. Approved for production deployment." She clicks **Approve**.

The ABP transitions to `approved` status and is stored in the Agent Registry with:
- `approved_at`: 2026-03-16T14:22:00Z
- `approved_by`: carol@bank.com
- `approval_comment`: "Looks good. Mortgage assistant is GLBA-compliant and has all necessary controls. Approved for production deployment."

**Registry Storage**

The ABP is now in the Agent Registry:
- Agent ID: m-001
- Version: 1.0.0
- Status: approved
- Validation Report: [full report]
- Approval Chain: [Carol's approval]

Operations can now deploy this ABP to production using the AWS runtime adapter.

### Example: Data Analytics Agent — Request Changes

A designer submits an ABP for an internal data analytics agent. The Design Studio's generator produced an ABP, but the designer made a choice that the governance validator flags.

**Governance Validation**

The Governance Validator checks the ABP against the enterprise's policies:

1. **Data Minimization Policy** — "If an agent accesses external data sources, it must have a rule preventing republication."
   - The agent has an external market research API but the constraints do not include a denied_action for republication.
   - ✗ FAIL (error-severity violation)

The validation report returns with 1 error-severity violation. The ABP cannot move to review; it must return to draft status. The designer is notified.

**Designer Modifies the ABP**

The designer receives the feedback: "Add a denied_action for republication of market research data." The designer logs back into the Design Studio, opens the ABP, and uses the iterative refinement feature:

Designer: "Add a constraint: The agent cannot republish or share market research data outside the company."

The Generation Engine re-generates the ABP with the new constraint and re-validates:
- `constraints.denied_actions`: [..., "republish_external_data", "share_external_data"]
- The data_minimization policy now passes.

The designer re-submits. The ABP goes through governance validation again.

**Second Governance Validation**

All policies now pass. The ABP transitions to in_review.

**Human Review**

David, the security lead, reviews the ABP:
- Validation report: All checks pass ✓
- Constraints look appropriate for an internal tool ✓
- Stakeholder contributions from IT and compliance are thorough ✓

David approves. The ABP transitions to approved and is stored in the Agent Registry.

---

## Summary

The Control Plane is where governance comes to life. It transforms the Design Studio's generated ABPs into enforced, audited, approved agent specifications. The three-component architecture—Governance Validator, Blueprint Review UI, and Agent Registry—implements a clear governance-lifecycle-review loop:

1. **Validate** — Deterministically check the ABP against governance policies
2. **Review** — Allow humans to evaluate and approve
3. **Store** — Persist the ABP with full audit trail and enable future queries and deployments

By combining deterministic policy evaluation with human oversight, and by maintaining immutable version history, the Control Plane enables enterprises to deploy agents with confidence that governance has been applied and is auditable.

---

*See also: [Design Studio](./design-studio.md), [Governance-as-Code](./governance-as-code.md), [Agent Lifecycle States](./agent-lifecycle-states.md)*

*Next: [Writing Governance Policies](../05-governance-compliance/policy-authoring-guide.md)*
