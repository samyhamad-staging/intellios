---
id: 03-008
title: Design Studio
slug: design-studio
type: concept
audiences:
- engineering
- product
status: published
version: 1.0.0
platform_version: 1.2.0
created: '2026-04-05'
updated: '2026-04-05'
author: Intellios
reviewers: []
tags:
- design-studio
- intake-engine
- generation-engine
- agent-creation
- agent-design
- subsystem
- abp-generation
prerequisites: []
related:
- 03-001
- 03-002
- 03-001
next_steps:
- 03-009
- 03-011
feedback_url: https://feedback.intellios.ai/kb
tldr: 'The Design Studio is the subsystem where enterprises design and generate AI
  agents. It comprises two components: the Intake Engine (which captures requirements
  through a 3-phase conversation-driven process with 7 stakeholder input lanes) and
  the Generation Engine (which produces Agent Blueprint Packages from intake data
  using AI-powered generation and policy-aware refinement).

  '
---


# Design Studio

> **TL;DR:** The Design Studio is the subsystem where enterprises design and generate AI agents. It comprises two components: the Intake Engine (which captures requirements through a 3-phase conversation-driven process with 7 stakeholder input lanes) and the Generation Engine (which produces Agent Blueprint Packages from intake data using AI-powered generation and policy-aware refinement).

## Overview

Creating a governed, compliant AI agent requires capturing complex requirements from multiple stakeholders—business leaders, compliance officers, security teams, legal, IT operations, and more. Without a systematic intake process, requirements are lost, inconsistencies emerge, and governance gaps appear downstream.

The **Design Studio** is the subsystem that makes agent creation systematic, collaborative, and governance-aware. It is composed of two tightly integrated components: the **Intake Engine** (which gathers enterprise requirements through structured conversation) and the **Generation Engine** (which turns those requirements into a complete, policy-aware Agent Blueprint Package). Together, they form a pipeline from "we need an agent to do X" to "here is a validated, governance-approved ABP ready for review and deployment."

The Design Studio is where every agent begins. It is the front door to Intellios, the place where domain experts, product managers, compliance teams, and technical architects collaborate to define what an agent should do—before any code is written or policies are validated.

## How It Works

The Design Studio's process flows through two main phases: requirement capture (Intake Engine) and specification generation (Generation Engine). Together, these phases transform freeform business needs into a structured, machine-readable agent specification.

### Phase 1: Intake Engine

The Intake Engine captures enterprise requirements through a **3-phase structured process**:

**Phase 1A: Structured Context Form**

The designer begins with a form that captures the foundational context:
- **Agent Purpose** — What is the agent for? (e.g., "Answer customer questions about mortgage rates and application status")
- **Target Users** — Who will use this agent? (e.g., "bank customers, mortgage-seeking consumers")
- **Industry / Domain** — What sector? (e.g., "financial services")
- **Constraints** — Any hard limits? (e.g., "no data modification," "US customers only")
- **Risk Profile** — Low / medium / high? (e.g., "high—customer-facing, regulated data")

This form is intentionally brief. It establishes the scope without attempting to capture all requirements upfront.

**Phase 1B: AI-Powered Adaptive Conversation**

Once the context form is submitted, the Intake Engine launches an **adaptive multi-turn conversation with Claude**. This conversation is not a chatbot; it is a structured intake interview where Claude acts as a requirements engineer. The conversation:

- **Probes governance dimensions** — Claude asks targeted questions about compliance, data handling, access control, and risk mitigation based on the agent's risk profile. A high-risk agent will be asked deeper questions; a low-risk agent will move faster.

- **Uses adaptive model selection** — For complex turns (clarifying conflicting requirements, synthesizing multi-stakeholder input), Claude Sonnet handles the turn. For straightforward responses, Claude Haiku is used. This balances quality and cost.

- **Captures structured input via 11 Claude tools**:
  - `setAgentName` — refine or set the agent's name
  - `setAgentDescription` — define a clear, concise description
  - `addCapability` — specify what the agent can do (with scope, tools, constraints)
  - `addConstraint` — add a rule or limit (denied actions, domain boundaries)
  - `addGovernanceRequirement` — capture compliance/policy needs
  - `setIdentity` — define persona, branding, tone
  - `addTool` — describe an API, function, or integration the agent will call
  - `addKnowledgeSource` — add a document, database, or API the agent will reference
  - `addIntegration` — specify a system the agent integrates with
  - `setExecutionConfig` — set rate limits, timeouts, response length
  - `finalizePayload` — conclude the intake and assemble the intake_payload

- **Supports 7 stakeholder input lanes** — The intake can include direct input from compliance, risk, legal, security, IT, operations, and business teams. Each stakeholder lane has a dedicated input interface. Contributions are merged into a single intake_payload, with conflict detection (e.g., business wants broad capabilities, security wants narrow constraints) flagged for resolution.

- **Supports express-lane templates** — For common agent patterns (e.g., "internal productivity assistant," "customer support bot," "data analysis agent"), the designer can skip Phase 1B and use a pre-built template. The template populates the intake_payload with sensible defaults for that pattern, and the designer reviews/edits before moving to Phase 1C.

**Phase 1C: Review and Finalization**

The designer sees a review screen showing the complete structured intake_payload:
- Agent metadata (name, description, purpose, target users)
- Capabilities (tools, instructions, knowledge sources, integrations)
- Constraints (allowed domains, denied actions, rate limits)
- Governance requirements (compliance, security, audit, risk mandates)
- Stakeholder contributions (timestamped, attributed, visible for conflict resolution)

The designer can edit, refine, or request changes. Once satisfied, they confirm, and the intake_payload is locked and moved to the Generation Engine.

### Phase 2: Generation Engine

The Generation Engine takes the **intake_payload** and produces a complete **Agent Blueprint Package (ABP)**.

The Generation Engine:

1. **Loads enterprise governance policies** — It retrieves all active governance policies from the Control Plane and injects them into its system prompt. This ensures the generated ABP will be policy-aware from the start.

2. **Uses Claude generateObject with Zod validation** — The Engine calls Claude with the Zod-defined ABP schema, asking Claude to generate a complete ABP based on the intake_payload and the enterprise's governance policies. Claude produces a structured JSON ABP that is validated schema-by-schema in real time.

3. **Supports iterative refinement** — After the initial ABP is generated, the designer (or a reviewer) can request natural-language refinements: "Make the agent more conservative with PII," "Add a constraint on data retention," "Restrict to authenticated users only." The Generation Engine re-generates the ABP with those refinements applied, re-validates, and shows the changes.

4. **Produces a "policy-ready" ABP** — Because the generator has access to the enterprise's governance policies, the ABP it produces is optimized to pass governance validation. This reduces the likelihood of violations and the need for rework after review.

Once the ABP is generated and passes initial validation, it transitions to the **Control Plane** for governance validation and human review.

### Dual-Layer Governance Enforcement

The Design Studio enforces governance in two layers:

1. **Prompted Governance** — During Phase 1B (the Intake Engine conversation), Claude is prompted to probe for governance requirements. If a high-risk agent is being designed, Claude will ask: "What data will this agent access? How will you prevent misuse? What audit logging is required?" These probes ensure governance is considered early.

2. **Hard Validation** — Before the ABP is handed off to the Control Plane, it is validated against enterprise policies. If a violation exists (e.g., the agent accesses sensitive data but has no audit logging), the generation fails and the designer is asked to refine the requirements. This prevents sending invalid ABPs downstream.

## Design Studio Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      DESIGN STUDIO SUBSYSTEM                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    INTAKE ENGINE                           │ │
│  ├────────────────────────────────────────────────────────────┤ │
│  │                                                             │ │
│  │  Phase 1A: Structured Context Form                         │ │
│  │  ┌─────────────────────────────────────────────────────┐  │ │
│  │  │ Purpose | Users | Domain | Constraints | Risk Level │  │ │
│  │  └─────────────────────────────────────────────────────┘  │ │
│  │                          ↓                                 │ │
│  │  Phase 1B: Adaptive Intake Conversation                    │ │
│  │  ┌─────────────────────────────────────────────────────┐  │ │
│  │  │ Claude (Sonnet/Haiku adaptive)                       │  │ │
│  │  │ ├─ Probe governance dimensions                       │  │ │
│  │  │ ├─ Capture via 11 structured tools                  │  │ │
│  │  │ └─ Merge 7 stakeholder input lanes                  │  │ │
│  │  │    (compliance, risk, legal, security, IT,          │  │ │
│  │  │     operations, business)                            │  │ │
│  │  │                                                       │  │ │
│  │  │ Alternative: Express-lane template (for common       │  │ │
│  │  │ patterns, skip Phase 1B)                             │  │ │
│  │  └─────────────────────────────────────────────────────┘  │ │
│  │                          ↓                                 │ │
│  │  Phase 1C: Review & Finalize intake_payload               │ │
│  │  ┌─────────────────────────────────────────────────────┐  │ │
│  │  │ ✓ Review | Edit | Confirm intake_payload            │  │ │
│  │  └─────────────────────────────────────────────────────┘  │ │
│  │                                                             │ │
│  └────────────────────────────────────────────────────────────┘ │
│                          ↓ intake_payload                        │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                   GENERATION ENGINE                        │ │
│  ├────────────────────────────────────────────────────────────┤ │
│  │                                                             │ │
│  │  1. Load enterprise governance policies                    │ │
│  │  2. Generate ABP via Claude + Zod schema validation        │ │
│  │  3. Support iterative refinement (natural language)        │ │
│  │  4. Enforce hard validation before handoff                 │ │
│  │                                                             │ │
│  │  Output: Policy-ready Agent Blueprint Package (ABP)        │ │
│  │                                                             │ │
│  └────────────────────────────────────────────────────────────┘ │
│                          ↓ ABP                                    │
│                                                                   │
└────────────────────────────────────────────────────────────────→│
                                                    To: Control Plane
                                        (Governance Validation & Review)
```

## Key Principles

1. **Structured Intake Over Freeform** — The Intake Engine is not a blank chat box. It guides the designer through a structured process (context form → adaptive interview → review) to ensure completeness and consistency. This structure makes the intake auditable and repeatable.

2. **Multi-Stakeholder by Design** — Governance in enterprises is not owned by a single person. The Intake Engine supports 7 dedicated input lanes (compliance, risk, legal, security, IT, operations, business) so that all relevant voices are heard upfront. Conflicts are surfaced and resolved during design, not discovered during review.

3. **Policy-Aware Generation** — The Generation Engine is not a neutral ABP factory. It knows about the enterprise's governance policies and generates ABPs optimized to satisfy them. This reduces violations and rework downstream.

4. **Adaptive Conversation** — The intake interview is not generic. It adapts to the agent's risk profile (high-risk agents are asked deeper questions) and uses cost-efficient models (Haiku for simple turns, Sonnet for complex) to balance quality and cost.

5. **Fail-Fast Validation** — Governance violations are caught at generation time, not after design is complete. If an intake_payload violates policy, the Generation Engine fails fast and guides the designer to refine the requirements. This prevents wasted effort on unapproved designs.

6. **Express-Lane Acceleration** — For common agent patterns, pre-built templates allow designers to skip the full intake conversation and launch governance-ready agents in minutes. Express-lane templates are maintained by the governance team and audited like any other governance control.

## Relationship to Other Concepts

The Design Studio produces the ABP, the central artifact of Intellios. It is connected to many other subsystems:

- **[Agent Blueprint Package (ABP)](./agent-blueprint-package.md)** — The Design Studio's output. The Generation Engine produces ABPs; the Control Plane validates them; the Agent Registry stores them.

- **[Governance-as-Code](./governance-as-code.md)** — The Design Studio's generator loads enterprise governance policies and uses them to guide ABP generation. Policies are written in the policy expression language and evaluated during review.

- **[Control Plane](./control-plane.md)** — Once the Design Studio produces an ABP, the Control Plane takes over. The Governance Validator checks the ABP against policies, and the Blueprint Review UI allows humans to approve or reject it.

- **[Agent Registry](../04-architecture-integration/api-reference/registry-api.md)** — Once an ABP is approved, it is stored in the Agent Registry, where it can be versioned, forked, and deployed.

- **[Stakeholder Contributions](./stakeholder-contributions.md)** — The Intake Engine's 7 stakeholder input lanes are a core feature. This related concept article explains each lane in detail.

## Examples

### Example: Financial Services — Mortgage Assistant

A regional bank product manager logs into the Design Studio to create a mortgage-rate assistant for their website.

**Phase 1A: Context Form**
- Purpose: "Answer customer questions about current mortgage rates and application status"
- Target Users: "Bank customers, mortgage seekers, mobile and web"
- Industry: "Financial Services"
- Constraints: "No account modifications, no unauthorized data sharing"
- Risk Profile: "High" (customer-facing, regulated data, financial transactions)

**Phase 1B: Intake Conversation**
Claude's adaptive interview begins. Because the risk profile is high, Claude asks detailed questions:

- "What data will the agent access?" → Answer: "Core banking system (customer account details), external rate feed, internal FAQ."
- "Who is allowed to use this agent?" → Answer: "Any customer, authenticated via login."
- "What data governance rules apply?" → Answer: "PII must be redacted in logs, 90-day retention (SOX), no third-party sharing (GLBA)."
- "What escalation procedures must the agent follow?" → Answer: "If a customer disputes a rate, escalate to a human specialist immediately."

Claude captures these answers using the `addCapability`, `addConstraint`, `addGovernanceRequirement`, and `addTool` tools. The intake also receives input from the bank's compliance officer (via the compliance stakeholder lane):
- "Add requirement: All interactions must be logged for audit trail"
- "Add constraint: Agent must not approve loans or modify account data"

**Phase 1C: Review**
The product manager reviews the assembled intake_payload and confirms it is complete. The intake is finalized.

**Phase 2: Generation**
The Generation Engine:
1. Loads the bank's governance policies (Data Minimization, Audit Standards, Access Control Baseline, Compliance Evidence)
2. Generates an ABP with:
   - **Capabilities**: APIs to core banking system, rate feed, FAQ search; system prompt instructing careful customer communication and escalation
   - **Constraints**: Allowed domains (mortgage rate inquiry, application status); denied actions (modify account, approve loans, send unsolicited messages)
   - **Governance**: Audit logging with PII redaction, 90-day retention, access control to authenticated customers only
3. Validates the ABP against all policies—all checks pass.

The ABP is now handed to the Control Plane for human review and approval.

### Example: Internal Data Analysis Agent with Multi-Stakeholder Input

An enterprise data team wants to build an internal data analysis agent that accesses sales databases and third-party market research data.

**Phase 1A: Context Form**
- Purpose: "Help sales managers analyze market trends and internal sales performance"
- Target Users: "Sales managers (internal staff only)"
- Industry: "Enterprise software"
- Constraints: "Market research data licensed—cannot be republished externally"
- Risk Profile: "Medium" (internal use, moderate data sensitivity)

**Phase 1B: Intake with Multi-Stakeholder Input**

The primary designer (the data team lead) and stakeholders from compliance, security, and IT all input to the intake:

- **Designer**: Specifies the agent should access sales databases and market research APIs, run Python analysis notebooks, and present results in dashboards.
- **Compliance**: Adds requirement: "All analysis must be logged. Licensing terms require usage tracking."
- **Security**: Adds constraint: "Market research data cannot leave company network. Access restricted to sales managers via role-based access."
- **IT**: Adds integration: "Must authenticate via corporate SSO. Python execution must run in isolated sandbox."

Claude's conversation synthesizes these inputs and captures them in the intake_payload. A conflict surfaces: the designer wanted to store analysis results in a public shared folder; security specifies no external sharing. The intake system flags this for the designer to resolve. The designer agrees with security and the constraint is updated: "Analysis results stored in internal secure folder only."

**Phase 1C: Review**
All stakeholders review the final intake_payload. The designer, compliance officer, security lead, and IT representative all confirm. The intake is finalized.

**Phase 2: Generation**
The Generation Engine produces an ABP with:
- **Capabilities**: Sales database APIs, market research APIs, Python execution sandbox
- **Constraints**: Allowed domains (sales analysis, market analysis); denied actions (external data sharing, republishing market research); role-based access (sales manager role required)
- **Governance**: Usage logging for licensing compliance, access control via SSO and role check, data classification (confidential)

All enterprise policies pass validation. The ABP is ready for review.

---

## Summary

The Design Studio is the front door of agent creation in Intellios. It transforms freeform business needs into governance-aware, policy-ready Agent Blueprint Packages. By combining structured intake with adaptive conversation and multi-stakeholder input, the Design Studio ensures that agents are designed with compliance, security, and business requirements in mind from day one.

The two-component architecture—Intake Engine and Generation Engine—separates concerns clearly: requirements capture from specification generation. This separation enables both domain experts (who shape requirements) and architects (who ensure governance readiness) to contribute effectively.

---

*See also: [Agent Blueprint Package (ABP)](./agent-blueprint-package.md), [Control Plane](./control-plane.md), [Stakeholder Contributions](./stakeholder-contributions.md)*

*Next: [Understanding the Control Plane](./control-plane.md)*
