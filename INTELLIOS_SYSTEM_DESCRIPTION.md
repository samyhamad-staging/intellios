# INTELLIOS_SYSTEM_DESCRIPTION.md

**Version:** 1.2.0
**Date:** 2026-03-17
**Status:** Canonical — reflects implementation through Phase 48
**Purpose:** Primary system description and source of truth for Intellios. Written for LLM ingestion, architectural reasoning, development guidance, and system evaluation.

---

## TABLE OF CONTENTS

1. [System Overview](#1-system-overview)
2. [Core System Objectives](#2-core-system-objectives)
3. [System Architecture Overview](#3-system-architecture-overview)
4. [Core Components](#4-core-components)
   - 4.1 [Intake Engine](#41-intake-engine)
   - 4.2 [Generation Engine](#42-generation-engine)
   - 4.3 [Governance Validator](#43-governance-validator)
   - 4.4 [Agent Registry](#44-agent-registry)
   - 4.5 [Blueprint Review UI](#45-blueprint-review-ui)
   - 4.6 [Compliance and Evidence Layer](#46-compliance-and-evidence-layer)
   - 4.7 [AgentCore Integration](#47-agentcore-integration)
   - 4.8 [Awareness and Measurement System](#48-awareness-and-measurement-system)
   - 4.9 [User Interface Layer](#49-user-interface-layer)
   - 4.10 [Stakeholder Collaboration Workspace](#410-stakeholder-collaboration-workspace)
   - 4.11 [Help System](#411-help-system)
   - 4.12 [Blueprint Template Library](#412-blueprint-template-library)
5. [Agent Generation Lifecycle](#5-agent-generation-lifecycle)
6. [Data and Knowledge Model](#6-data-and-knowledge-model)
7. [Governance and Safety Model](#7-governance-and-safety-model)
8. [Evaluation and Quality Measurement](#8-evaluation-and-quality-measurement)
9. [System Intelligence and Optimization](#9-system-intelligence-and-optimization)
10. [Deployment and Integration Model](#10-deployment-and-integration-model)
11. [Future Evolution](#11-future-evolution)
12. [Glossary](#12-glossary)

---

## 1. SYSTEM OVERVIEW

### 1.1 What Is Intellios

Intellios is a **white-label enterprise AI agent factory**. It enables enterprises to design, generate, govern, package, and deploy AI agents under their own brand and policies.

Intellios is a full-stack web application built to be the authoritative platform through which a regulated enterprise produces and manages AI agents — from the first stakeholder conversation through production deployment and continuous compliance monitoring.

### 1.2 The Problem Intellios Solves

Enterprises seeking to deploy AI agents face three compounding problems:

- **Discovery problem:** Non-expert stakeholders cannot specify agent requirements in the language AI systems need. Domain knowledge exists but cannot be translated.
- **Governance problem:** Enterprise policies, regulatory requirements (SR 11-7, EU AI Act, GDPR, FINRA, HIPAA), and safety constraints must be embedded into every agent before deployment. Manual enforcement is error-prone and invisible to auditors.
- **Evidence problem:** Regulators and model risk teams require machine-readable, traceable audit evidence proving that each deployed AI agent was designed, reviewed, validated, tested, and approved by qualified humans following documented procedures.

Intellios addresses all three simultaneously: structured intake captures stakeholder intent; AI-assisted generation translates that intent into a standardized artifact; deterministic governance validation enforces policies; and an append-only audit trail produces the evidence chain regulators require.

### 1.3 The AI Agent Factory Concept

An **agent factory** is a production system — not a one-off design tool. Like a manufacturing factory, it enforces:

- **Standardized inputs** — requirements captured via a structured, governed intake process
- **Standardized outputs** — every agent described by the same versioned artifact schema (the ABP)
- **Quality control** — every artifact validated against enterprise standards before release
- **Traceability** — every artifact traceable to its source requirements, its validators, its approvers, and its deployment record

### 1.4 Strategic Vision

Intellios is designed for Fortune 500 enterprises in regulated industries (financial services, healthcare, insurance). The strategic vision:

- Enable any enterprise designer — not only AI engineers — to produce deployment-ready AI agent specifications
- Enforce governance and separation of duties at every lifecycle stage without relying on human memory
- Produce a complete evidence dossier for every agent that satisfies SR 11-7 (model risk management), EU AI Act, and NIST AI RMF audit requirements
- Serve as the foundation for enterprise AI agent operations: monitoring, drift detection, revalidation, and continuous compliance

---

## 2. CORE SYSTEM OBJECTIVES

### 2.1 Enable Non-Expert Agent Design

- Designers with domain knowledge but no AI engineering background can produce complete agent specifications
- A conversational AI assistant (Claude) extracts and formalizes requirements through guided dialogue
- Structured forms capture governance-critical signals before the conversation begins, preventing blind spots
- Domain stakeholders (compliance, risk, legal, security, IT, operations, business) submit attributed requirements through dedicated contribution channels

### 2.2 Enforce Governance and Safety

- Enterprise governance policies are expressed as structured rule sets (field path + operator + value + severity)
- Every generated agent is automatically validated against all active policies before human review
- Error-severity violations block lifecycle progression; warning-severity violations are flagged but non-blocking
- Live revalidation runs at the `draft → in_review` transition to prevent stale governance reports from masking newly introduced policy violations

### 2.3 Accelerate Enterprise AI Adoption

- Generation Engine translates a complete intake payload into a valid Agent Blueprint Package in a single structured AI call
- Policy-aware generation means blueprints arrive pre-adapted to enterprise rules, eliminating the generate → violate → refine cycle
- Adaptive model selection routes ~75–80% of intake turns to Claude Haiku and reserves Claude Sonnet for high-complexity steps, reducing cost without reducing quality

### 2.4 Ensure Reliability and Explainability

- Every lifecycle event produces an append-only audit record with actor, action, timestamp, from-state, to-state, and metadata
- Every governance violation includes a Claude-generated remediation suggestion explaining what to change and why
- Every deployment produces a Model Risk Management (MRM) Compliance Report covering 13 structured sections including risk classification, governance evidence, approval chain, behavioral test evidence, and regulatory framework assessment
- Behavioral test harness uses Claude-as-judge to evaluate whether agents behave as designed and produces per-case verdicts with rationale

### 2.5 Provide Continuous Compliance Intelligence

- After deployment, agents are continuously re-checked against the current policy set (not the policy set at review time)
- Policy changes automatically trigger re-evaluation of all deployed agents
- Daily AI-generated briefings synthesize platform health across all quality and governance dimensions
- Anomaly detection fires notifications when quality or compliance metrics fall below enterprise-defined thresholds

---

## 3. SYSTEM ARCHITECTURE OVERVIEW

### 3.1 Architectural Layers

Intellios is organized into two primary subsystems:

```
┌──────────────────────────────────────────────────────────┐
│                      DESIGN STUDIO                        │
│                                                          │
│  ┌────────────────┐          ┌─────────────────────────┐ │
│  │  Intake Engine  │ ──────▶ │   Generation Engine      │ │
│  │  (requirements) │         │   (produces ABP)         │ │
│  └────────────────┘         └────────────┬────────────┘  │
└────────────────────────────────────────── │ ─────────────┘
                                            │ ABP (draft)
                                            ▼
┌──────────────────────────────────────────────────────────┐
│                      CONTROL PLANE                        │
│                                                          │
│  ┌──────────────────────┐  ┌────────────────────────┐   │
│  │  Governance Validator │  │     Agent Registry      │   │
│  │  (validates ABP)      │  │  (stores ABPs, versions)│   │
│  └──────────┬───────────┘  └────────────┬───────────┘   │
│             │                           │               │
│             └─────────────┬─────────────┘               │
│                           ▼                             │
│              ┌────────────────────────┐                 │
│              │  Blueprint Review UI    │                 │
│              │  (human approval gate)  │                 │
│              └────────────────────────┘                 │
└──────────────────────────────────────────────────────────┘
```

### 3.2 Cross-Cutting Systems

The following systems operate across both subsystems:

| System | Role |
|---|---|
| **Audit Trail** | Append-only record of every lifecycle event; drives notifications and webhooks |
| **Event Bus** | In-process pub/sub connecting audit writes to downstream handlers (notifications, webhooks, health checks, quality scoring) |
| **Notification System** | Routes lifecycle events to recipients by role; 30-second UI polling + email delivery |
| **Notification Bell** | `NotificationBell` component in the global nav bar; 30-second focus-aware polling; unread count badge; dropdown with type-specific icons and relative timestamps; mark-all-read action |
| **Webhook System** | Delivers HMAC-SHA256 signed lifecycle events to registered enterprise endpoints |
| **Awareness & Measurement** | Daily quality metrics, AI quality scoring, anomaly detection, briefing generation |
| **Deployment Health Monitor** | Continuous governance posture monitoring for deployed agents |

### 3.3 Architectural Philosophy

- **ABP as the single artifact:** Every subsystem either produces, stores, validates, or consumes the Agent Blueprint Package. The ABP is the lingua franca of the entire system.
- **Append-only audit trail:** No lifecycle action is valid without an audit entry. The event bus fires from audit writes, not from individual action sites.
- **Fail fast, gate hard:** Governance violations are detected and surfaced immediately. Error-severity violations block progression. No system state bypasses the validator.
- **AI for generation and evaluation; deterministic logic for enforcement:** Claude generates blueprints, suggests remediations, scores quality, and writes briefings. Policy enforcement and lifecycle transitions are deterministic, policy-driven logic with no AI in the critical path.
- **No AI in audit, no AI in lifecycle transitions:** Trust in the audit trail requires that no AI call mediates whether an action is recorded. Trust in lifecycle enforcement requires that no AI call mediates whether a transition is allowed.

### 3.4 Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, full-stack) |
| Language | TypeScript 5 |
| Database | PostgreSQL with Drizzle ORM |
| AI SDK | Vercel AI SDK v5 (`streamText`, `generateObject`) |
| AI Models | Anthropic Claude: Sonnet 4.6 `claude-sonnet-4-6` (generation, review brief, briefings), Haiku 4.5 `claude-haiku-4-5-20251001` (remediation, test evaluation, quality scoring, AI orchestrator, intake turns) |
| Auth | NextAuth v5, bcrypt, 8-hour JWT sessions |
| Validation | Zod on all POST/PATCH routes |
| Testing | vitest ^3.0.0, @vitest/coverage-v8 |
| AWS Integration | `@aws-sdk/client-bedrock-agent` (AgentCore deploy) |

---

## 4. CORE COMPONENTS

---

### 4.1 Intake Engine

**Subsystem:** Design Studio
**Purpose:** Captures enterprise requirements, constraints, and governance context for agent creation.

#### 4.1.1 Architecture: Three-Phase Process

The Intake Engine operates as a three-phase sequential process:

**Phase 1 — Structured Context Form**

Before any AI conversation begins, the designer fills a structured form with 6 domain-signal fields:

| Field | Type | Purpose |
|---|---|---|
| `agentPurpose` | string | Brief description of agent goal; seeds Claude's opening message |
| `deploymentType` | enum | `internal-only`, `customer-facing`, `partner-facing`, `automated-pipeline` |
| `dataSensitivity` | enum | `public`, `internal`, `confidential`, `pii`, `regulated` |
| `regulatoryScope` | multi-select | `FINRA`, `SOX`, `GDPR`, `HIPAA`, `PCI-DSS`, `none` |
| `integrationTypes` | multi-select | `internal-apis`, `external-apis`, `databases`, `file-systems`, `none` |
| `stakeholdersConsulted` | multi-select | `legal`, `compliance`, `security`, `it`, `business-owner`, `none` |

These signals are stored in `intake_sessions.intake_context` (JSONB) and used in Phase 2 to determine what governance topics Claude must probe.

**Phase 2 — Guided AI Conversation**

Claude drives a requirements capture conversation using 11 structured tools to incrementally build the `IntakePayload`:

| Tool | Purpose |
|---|---|
| `set_agent_identity` | Agent name, description, persona |
| `set_branding` | Brand name, voice tone, logo URL |
| `add_tool` | Tool/capability (upserts by name) |
| `set_instructions` | Behavioral instructions |
| `add_knowledge_source` | Knowledge source (upserts by name) |
| `set_constraints` | Output length, topic allow/block lists |
| `add_governance_policy` | Attach governance policy (upserts by name) |
| `set_audit_config` | Audit logging configuration |
| `flag_ambiguous_requirement` | Records unclear requirements to `_flags[]` |
| `get_intake_summary` | Read-only completeness check |
| `mark_intake_complete` | Finalize — runs governance sufficiency check first |

The system prompt dynamically injects:
1. **Base instructions** — conversation style, tool rules, section list
2. **Enterprise Context block** — Phase 1 signals + mandatory governance probing rules derived from the governance sufficiency matrix
3. **Stakeholder Requirements block** — attributed contributions from domain specialists (when present)
4. **Active Governance Policies block** — all enterprise policies with `[ERROR]`/`[WARN]` severity tags
5. **Current State block** — per-section filled/unfilled status to prevent re-asking

**Governance Sufficiency Matrix** — the engine enforces context-appropriate governance:

| Phase 1 Signal | Required Governance |
|---|---|
| `dataSensitivity: pii` or `regulated` | `data_handling` policy + audit logging + `retention_days` |
| `regulatoryScope: FINRA` or `SOX` | `compliance` policy + `retention_days` |
| `regulatoryScope: GDPR` or `HIPAA` | `data_handling` policy + PII redaction |
| `deploymentType: customer-facing` or `partner-facing` | `safety` policy + behavioral instructions |
| `integrationTypes: external-apis` | `access_control` policy |

`checkGovernanceSufficiency()` runs inside `mark_intake_complete`. If required governance elements are missing, finalization is rejected with a gap list. This is a hard gate — not advisory.

**Phase 3 — Pre-Finalization Review Screen**

After successful finalization, the `IntakeReview` component displays:
- Enterprise context summary strip
- Ambiguity flags panel (each flag: field, description, original statement)
- Per-section review cards with acknowledgment checkboxes
- Capture verification panel — what was discussed vs. what was tool-captured
- Policy quality warnings panel — inadequate policies flagged with Claude's rationale
- Generate button — disabled until all required sections are acknowledged

#### 4.1.2 Stakeholder Requirement Lanes

Seven domain channels allow specialists to submit attributed requirements alongside the designer's conversation:

| Domain | Domain-Specific Fields |
|---|---|
| `compliance` | `regulatoryRequirements`, `prohibitedActions`, `auditRequirements` |
| `risk` | `riskConstraints`, `deniedScenarios`, `escalationProcedures` |
| `legal` | `legalConstraints`, `liabilityLimitations`, `dataHandlingRequirements` |
| `security` | `securityRequirements`, `accessControls`, `dataProtectionRequirements` |
| `it` | `technicalConstraints`, `integrationRequirements`, `performanceRequirements` |
| `operations` | `operationalConstraints`, `slaRequirements`, `escalationProcedures` |
| `business` | `businessObjectives`, `successMetrics`, `targetAudience` |

Contributions are stored in `intake_contributions` (JSONB), injected verbatim into Claude's system prompt during Phase 2, and included in the MRM report as Section 11 (stakeholder evidence).

#### 4.1.3 Adaptive Model Selection

`selectIntakeModel()` routes each turn to Claude Sonnet or Haiku using priority-ordered rules:

| Condition | Model | Rationale |
|---|---|---|
| First turn (`messageCount <= 1`) | Sonnet | Opening synthesis requires full context |
| Payload complete + tools set | Sonnet | Finalization may occur; false negatives too costly |
| Explicit finalization language | Sonnet | `mark_intake_complete` requires full enumeration |
| Governance/regulatory keywords | Sonnet | Multi-constraint reasoning required |
| All other turns | Haiku | ~75–80% of a typical session |

This achieves an estimated 8× cost reduction on routine turns without compromising quality at governance-critical steps.

#### 4.1.4 API Routes

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/intake/sessions` | Create new intake session |
| GET | `/api/intake/sessions` | List sessions (designer sees own; admin sees all) |
| GET | `/api/intake/sessions/[id]` | Fetch session with message history |
| PATCH | `/api/intake/sessions/[id]/context` | Save Phase 1 `IntakeContext` |
| POST | `/api/intake/sessions/[id]/chat` | Streaming chat (Claude + 11 tools) |
| GET | `/api/intake/sessions/[id]/payload` | Current intake payload state |
| POST | `/api/intake/sessions/[id]/contributions` | Submit stakeholder contribution |
| GET | `/api/intake/sessions/[id]/contributions` | List all contributions for session |
| GET | `/api/intake/sessions/[id]/quality-score` | Most recent AI quality score |
| POST | `/api/intake/sessions/[id]/invitations` | Create stakeholder invitation (generates token + sends email) |
| GET | `/api/intake/sessions/[id]/invitations` | List all invitations for session |
| GET | `/api/intake/sessions/[id]/insights` | List AI Orchestrator insights for session |
| PATCH | `/api/intake/sessions/[id]/insights/[insightId]` | Approve or dismiss an AI Orchestrator insight |
| GET | `/api/intake/invitations/[token]` | Validate invitation token; returns session context and prior synthesis |
| POST | `/api/intake/invitations/[token]/chat` | Token-gated stakeholder AI interview (no Intellios account required) |

#### 4.1.5 Data Model

| Table | Purpose |
|---|---|
| `intake_sessions` | One row per session; `intake_payload` (JSONB), `intake_context` (JSONB), status |
| `intake_messages` | One row per message; role, content, ordering |
| `intake_contributions` | One row per stakeholder contribution; domain, contributor, fields (JSONB) |
| `intake_invitations` | Token-based invitations to external stakeholders; domain, RACI role, invitee name/email, token, expiry, status |
| `intake_ai_insights` | AI Orchestrator outputs per session; type (synthesis/conflict/gap/suggest_invite), content, status (pending/approved/dismissed) |

---

### 4.2 Generation Engine

**Subsystem:** Design Studio
**Purpose:** Produces an Agent Blueprint Package from a completed intake payload.

#### 4.2.1 Generation Strategy

1. A completed `IntakePayload` is retrieved from a finalized intake session
2. Enterprise policies are loaded once via `loadPolicies(enterpriseId)`
3. `buildGenerationSystemPrompt(policies)` builds a system prompt that includes all enterprise governance policies with `[ERROR]`/`[WARN]` severity tags, instructing Claude to satisfy error-severity rules proactively during generation
4. `generateObject()` (Vercel AI SDK v5) is called with the `ABPContentSchema` Zod schema — this enforces structural validity at the SDK level before the object is returned
5. System metadata (UUID, timestamps, status = `draft`) is assembled by the service layer — Claude never generates metadata fields
6. The assembled ABP is persisted to `agent_blueprints`
7. `validateBlueprint()` is called immediately after generation, with the pre-loaded policies passed in to skip a second DB query

Claude generates only **content sections** (identity, capabilities, constraints, governance, tags). This prevents hallucinated UUIDs or timestamps and ensures schema invariants are enforced by code, not by the model.

#### 4.2.2 Refinement Strategy

Designers can request natural-language changes to an existing blueprint:

1. `refineBlueprint(current, changeRequest, intake, policies)` re-calls `generateObject` with:
   - Current ABP content sections (for context)
   - Original intake payload (for full requirement context)
   - The designer's change request
   - Active enterprise policies (for pre-adaptation)
2. The full ABP is regenerated with the change applied
3. Original `metadata.id` and `created_at` are preserved; `refinementCount` is incremented
4. Validation runs automatically after refinement; validation report is refreshed

#### 4.2.3 API Routes

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/blueprints` | Generate ABP from completed intake session |
| GET | `/api/blueprints/[id]` | Fetch stored blueprint |
| POST | `/api/blueprints/[id]/refine` | Apply natural-language change, regenerate |
| POST | `/api/blueprints/[id]/regenerate` | Full regeneration from the originating intake payload |
| POST | `/api/blueprints/[id]/new-version` | Fork a new blueprint version under the same `agentId` |

---

### 4.3 Governance Validator

**Subsystem:** Control Plane
**Purpose:** Validates a blueprint against enterprise policies and safety constraints. Acts as the gate before lifecycle progression.

#### 4.3.1 Policy Expression Language

Each governance policy contains a set of rules. Every rule follows this structure:

```json
{
  "id": "rule-id",
  "field": "capabilities.instructions",
  "operator": "exists",
  "severity": "error",
  "message": "Agent must have behavioral instructions."
}
```

**Supported operators (11):**

| Operator | Meaning |
|---|---|
| `exists` | Field is present and non-empty |
| `not_exists` | Field is absent or empty |
| `equals` | Field equals exact value |
| `not_equals` | Field does not equal value |
| `contains` | Field contains substring or array item |
| `not_contains` | Field does not contain substring or array item |
| `matches` | Field matches regular expression |
| `count_gte` | Array field has at least N elements |
| `count_lte` | Array field has at most N elements |
| `includes_type` | Array contains item with matching type field |
| `not_includes_type` | Array does not contain item with matching type field |

**Field addressing:** Dot-notation path into the ABP (e.g., `capabilities.instructions`, `governance.policies`, `constraints.denied_actions`).

**Severity:**
- `error` — Blocks `draft → in_review` transition. Must be resolved before submission.
- `warning` — Flagged but non-blocking. Surfaces in validation report and Blueprint Workbench.

#### 4.3.2 Service Architecture

| File | Role |
|---|---|
| `src/lib/governance/types.ts` | TypeScript types: `PolicyRule`, `Violation`, `ValidationReport` |
| `src/lib/governance/evaluate.ts` | Deterministic rule evaluator — no AI, pure logic |
| `src/lib/governance/remediate.ts` | Claude Haiku remediation suggester — batched single `generateObject` call |
| `src/lib/governance/validator.ts` | Orchestration: load policies → evaluate → remediate → return report |
| `src/lib/governance/load-policies.ts` | Shared policy loader: `or(isNull, eq(enterpriseId))` — loads global + enterprise policies |

#### 4.3.3 Validation Report

Stored in `agent_blueprints.validation_report` (JSONB):

```typescript
{
  valid: boolean,            // true if no error-severity violations
  violations: Violation[],   // each: policyName, ruleId, fieldPath, severity, message, suggestion?
  policyCount: number,       // count of policies evaluated
  evaluatedPolicyIds: string[], // IDs of all evaluated policies (audit evidence)
  generatedAt: string        // ISO timestamp
}
```

Each violation includes an optional Claude-generated `suggestion` — actionable guidance on what to change. Suggestions are displayed in a styled blue block ("✦ Suggested fix") in the Blueprint Workbench.

#### 4.3.4 Seed Governance Policies

Four global policies are seeded at database initialization:

| Policy | Type | Rules |
|---|---|---|
| Safety Baseline | `safety` | `identity.name` exists (error), `capabilities.instructions` exists (error), `identity.description` exists (warning) |
| Audit Standards | `audit` | `governance.audit.log_interactions` exists (warning) |
| Access Control Baseline | `access_control` | `constraints.denied_actions` exists (warning) |
| Governance Coverage | `compliance` | `governance.policies` count_gte 1 (warning) |

#### 4.3.5 Policy Versioning

Every PATCH to a governance policy creates a new version row (new `id`) and supersedes the old row (`supersededAt` timestamp set). GET requests filter to active policies only. The full version chain is traversable via `previousVersionId`.

Policy version history is surfaced in:
- MRM Report Section 5 (policy lineage at the time of blueprint approval, with "policy revised since approval" warnings)
- Governance Hub policy cards (version badge + expandable history)

#### 4.3.6 Compliance Starter Policy Packs

Four pre-built policy packs available for one-click import:

| Pack | Policies |
|---|---|
| SR 11-7 Core | 4 policies covering model documentation, validation, and audit requirements |
| EU AI Act High-Risk | 5 policies for high-risk AI system requirements |
| GDPR Agent Data | 3 policies for personal data handling |
| AI Safety Baseline | 3 policies for behavioral safety and explainability |

#### 4.3.7 API Routes

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/blueprints/[id]/validate` | Manual validation; stores report in DB |
| GET | `/api/governance/policies` | List active governance policies |
| POST | `/api/governance/policies` | Create policy (compliance_officer + admin) |
| GET | `/api/governance/policies/[id]` | Fetch single policy |
| PATCH | `/api/governance/policies/[id]` | Update (creates new version row) |
| DELETE | `/api/governance/policies/[id]` | Delete enterprise policy |
| GET | `/api/governance/policies/[id]/history` | Full version chain |
| POST | `/api/governance/policies/simulate` | Impact simulation before publishing |
| GET | `/api/governance/templates` | List compliance starter packs |
| POST | `/api/governance/templates/[pack]/apply` | Import a starter pack |
| GET | `/api/governance/analytics` | Platform governance analytics |

---

### 4.4 Agent Registry

**Subsystem:** Control Plane
**Purpose:** Stores, versions, and manages Agent Blueprint Packages. The canonical catalog of all agents within an enterprise.

#### 4.4.1 Data Model

The `agent_blueprints` table serves as both the blueprint store and the Agent Registry version store. Each row is a versioned snapshot.

| Column | Type | Purpose |
|---|---|---|
| `id` | UUID | Row identifier; blueprint ID in generation flow |
| `agent_id` | UUID | Logical agent identifier — all versions share this |
| `version` | TEXT | Semver string (default `1.0.0`) |
| `name` | TEXT | Denormalized from `abp.identity.name` for search |
| `tags` | JSONB | Denormalized from `abp.metadata.tags` for search |
| `session_id` | UUID | FK to originating intake session |
| `abp` | JSONB | Full ABP document |
| `status` | TEXT | `draft`, `in_review`, `approved`, `rejected`, `deprecated`, `deployed` |
| `validation_report` | JSONB | Most recent governance validation result |
| `refinement_count` | TEXT | Number of in-place refinements |
| `deployment_target` | TEXT | `null`, `agentcore` |
| `deployment_metadata` | JSONB | AgentCore deployment record (agentId, ARN, region, model) |
| `current_approval_step` | INT | Index into approval chain (multi-step) |
| `approval_progress` | JSONB | Array of `ApprovalStepRecord` — evidence per step |

#### 4.4.2 Lifecycle State Machine

```
draft → in_review → approved → deployed → deprecated
              ↓
           rejected → deprecated
              ↓
           draft (request changes — only via review endpoint)
```

**Valid transitions:**
- `draft` → `in_review` (requires: no error-severity violations; optional: passing test run if `requireTestsBeforeApproval` is set)
- `draft` → `deprecated`
- `in_review` → `approved`, `rejected`, `draft` (request changes), `deprecated`
- `approved` → `deployed`, `deprecated`
- `deployed` → `deprecated`
- `deprecated` → terminal

**Separation of duties:** The designer who created the blueprint cannot approve it. The reviewer and deployer must be different users from the designer.

#### 4.4.3 Clone Operation

`POST /api/blueprints/[id]/clone` forks a blueprint into an independent logical agent:
- New `agentId` (UUID) + new blueprint `id` (UUID)
- `status: "draft"`, `version: "1.0.0"`, `refinementCount: "0"`
- Review fields, validation report, and deployment metadata cleared
- `abp.identity.name` set to `"${source.name} (Clone)"` unless overridden
- `blueprint.cloned` audit entry with source genealogy metadata
- Accessible by `designer` and `admin` only

#### 4.4.4 Version Diff

`GET /api/blueprints/[id]/diff?compareWith={blueprintId}` — structural diff engine (`abp-diff.ts`):
- Diffs identity, capabilities, constraints, governance sections
- Returns per-change significance: `major`, `minor`, `patch`
- Rendered in Registry "Versions" tab and Review Panel ("Changes from v{prev} → v{current}")

#### 4.4.5 API Routes

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/registry` | List agents (latest version per `agentId`) |
| GET | `/api/registry/[agentId]` | Agent detail + full version history |
| PATCH | `/api/blueprints/[id]/status` | Lifecycle transition |
| POST | `/api/blueprints/[id]/clone` | Fork into new logical agent |
| PATCH | `/api/blueprints/[id]/ownership` | Update ownership metadata block |
| GET | `/api/blueprints/[id]/diff` | Structural diff against another version |
| GET | `/api/blueprints/[id]/regulatory` | Regulatory framework assessment |
| GET | `/api/blueprints/[id]/report` | MRM Compliance Report (JSON) |

---

### 4.5 Blueprint Review UI

**Subsystem:** Control Plane
**Purpose:** Human-facing interface for reviewing, approving, or requesting changes to generated blueprints.

#### 4.5.1 Review Flow

1. Designer submits blueprint from `draft → in_review` (triggers live revalidation against current policies)
2. Blueprint appears in Review Queue at `/review`
3. Reviewer opens `/registry/[agentId]` → Review tab
4. AI Risk Brief is optionally generated (Claude Haiku): structured `riskLevel` / `summary` / `keyPoints` / `recommendation`
5. Reviewer selects: **Approve** (`→ approved`), **Reject** (`→ rejected`), or **Request Changes** (`→ draft`, requires comment)
6. Review decision, comment, and timestamp stored; audit entry written; designer notified

#### 4.5.2 Multi-Step Approval Chains

Enterprise settings define an ordered `approvalChain`:

```typescript
approvalChain: Array<{
  role: "reviewer" | "compliance_officer" | "admin",
  label: string
}>
```

- Each step requires a user holding the designated role
- Separation of duties enforced: no user may approve a step they already approved in an earlier step
- `approval_progress` array on the blueprint records each step's approver, role, timestamp, and comment
- Non-final step approvals advance `current_approval_step` and fire `blueprint.approval_step_completed` notifications to the next approver

#### 4.5.3 MRM Report Sections (13)

The MRM Compliance Report is assembled on demand and covers:

| Section | Title | Content |
|---|---|---|
| 1 | Cover | Agent name, version, status, enterprise ID, generated-by, generated-at |
| 2 | Risk Classification | Risk tier, tier basis, intended use, business owner, model owner, deployment type, data sensitivity, regulatory scope, stakeholders consulted |
| 3 | Agent Identity | Name, description, persona, tags |
| 4 | Capabilities | Tool count and list, knowledge source count, instructions configured flag |
| 5 | Governance Validation | Policy coverage, violation list with severity, policy version lineage with "revised since approval" warnings |
| 6 | Review Decision | Approval chain evidence (per-step approver, role, timestamp, comment), final decision, reviewer identity |
| 7 | SOD Evidence | Designer, reviewer, deployer identities; SOD satisfaction flag |
| 8 | Deployment Change Record | Change reference, deployment notes, deployed-by, deployed-at; AgentCore AWS resource details (agentId, ARN, region, model) when applicable |
| 9 | Model Lineage | Full version history + all historical deployment events across all versions |
| 10 | Audit Chain | Immutable lifecycle event log for this blueprint version (oldest-first) |
| 11 | Stakeholder Contributions | Attributed domain specialist inputs per contribution; coverage gap list |
| 12 | Regulatory Framework Assessment | Per-requirement evidence mapping for EU AI Act (9 req), SR 11-7 (9 req), NIST AI RMF (8 req) |
| 13 | Behavioral Test Evidence | Claude-as-judge test run results: per-case verdict, evaluation rationale, pass/fail counts |

Report is available as:
- JSON download (`GET /api/blueprints/[id]/report`)
- HTML browser view (`/blueprints/[id]/report`) — printable to PDF
- Compliance Evidence Bundle (`GET /api/blueprints/[id]/export/compliance`) — MRM report + quality eval + test runs bundled as JSON

#### 4.5.4 API Routes

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/review` | List all `in_review` blueprints |
| POST | `/api/blueprints/[id]/review` | Submit review decision |
| POST | `/api/blueprints/[id]/review-brief` | Generate AI Risk Brief (Haiku) |
| GET | `/api/blueprints/[id]/report` | MRM JSON report |
| GET | `/api/blueprints/[id]/export/compliance` | Full evidence bundle download |
| GET | `/api/blueprints/[id]/export/agentcore` | Bedrock export manifest download |

---

### 4.6 Compliance and Evidence Layer

**Purpose:** Instruments every lifecycle action for auditability and regulatory evidence.

#### 4.6.1 Audit Trail

- **Table:** `audit_log` — append-only; never modified or deleted
- **Every entry includes:** `id`, `enterprise_id`, `action` (typed `AuditAction`), `actor` (user email), `entity_type`, `entity_id`, `from_state`, `to_state`, `metadata` (JSONB), `created_at`
- **Total audit actions:** 18 typed actions across blueprints, policies, intake, deployment, governance checks, and exports

**Audit actions include:**

| Category | Actions |
|---|---|
| Blueprint | `blueprint.created`, `blueprint.refined`, `blueprint.submitted`, `blueprint.reviewed`, `blueprint.approved`, `blueprint.rejected`, `blueprint.deployed`, `blueprint.cloned`, `blueprint.status_changed` |
| AgentCore | `blueprint.agentcore_exported`, `blueprint.agentcore_deployed` |
| Governance | `blueprint.health_checked`, `blueprint.test_run_completed`, `blueprint.approval_step_completed` |
| Reports | `blueprint.report_exported`, `blueprint.compliance_exported` |
| Policies | `policy.created`, `policy.updated`, `policy.deleted`, `policy.simulated` |
| Intake | `intake.contribution_submitted` |

#### 4.6.2 Event Bus

`writeAuditLog()` is the single integration point. After each DB insert, it dispatches a `LifecycleEvent` to all registered handlers via a fire-and-forget in-process bus.

Registered event handlers:
1. **Notification handler** — routes events to recipients by role and event type
2. **Webhook dispatch handler** — delivers signed payloads to registered enterprise endpoints
3. **Policy impact handler** — fires `checkAllDeployedAgents()` on policy create/update/delete events
4. **Quality evaluator** — scores blueprints and intake sessions after relevant lifecycle events

#### 4.6.3 Outbound Webhooks

Admins register HTTPS endpoints subscribed to any subset of the 18 `EventType` values.

- **Payload signing:** HMAC-SHA256, `X-Intellios-Signature` header
- **Delivery:** 3-attempt retry (0ms / 1s / 2s backoff), fire-and-forget `Promise.allSettled`
- **Delivery log:** Every attempt stored in `webhook_deliveries` with status code and response body
- **Management:** `/admin/webhooks` — register, test, rotate secret, pause/resume, view delivery history

#### 4.6.4 Regulatory Framework Assessment

Deterministic classification against three frameworks — no AI calls:

| Framework | Requirements |
|---|---|
| **EU AI Act** | 9 requirements; risk tier determined from Phase 1 signals (deployment type, data sensitivity, regulatory scope) |
| **SR 11-7** | 9 requirements; model documentation, validation, independent review, ongoing monitoring |
| **NIST AI RMF** | 8 requirements; Govern, Map, Measure, Manage function assessments |

Each requirement maps evidence from ABP fields (presence of governance policies, audit config, test evidence, documentation fields). Evidence is included in MRM Report Section 12.

---

### 4.7 AgentCore Integration

**Purpose:** Enables Intellios-governed blueprints to be deployed to Amazon Bedrock AgentCore, either as export manifests (no AWS credentials required) or via one-click direct deployment.

#### 4.7.1 ABP to Bedrock Translation

`translateAbpToBedrockAgent()` in `src/lib/agentcore/translate.ts` maps ABP fields to Bedrock API structures:

| ABP Field | Bedrock Field |
|---|---|
| `identity.name` (sanitized `[a-zA-Z0-9_-]`, ≤100 chars) | `agentName` |
| `identity.persona` + `capabilities.instructions` (padded to ≥40 chars if non-empty; full fallback if empty) | `instruction` (max 4000 chars) |
| Each `capabilities.tools[n]` | `CreateAgentActionGroup` with `RETURN_CONTROL` action (no Lambda required) |
| `governance.audit.log_interactions: true` | `memoryConfiguration: { enabledMemoryTypes: ["SESSION_SUMMARY"] }` |
| `metadata.*` + `identity.*` | Resource `tags` for traceability |
| `deploymentTargets.agentcore.guardrailId/guardrailVersion` | `guardrailConfiguration` |

**Instruction handling:**
- Empty persona + empty instructions → `FALLBACK_INSTRUCTION` ("You are a helpful AI agent...")
- Non-empty but < 40 chars → padded with governance sentence to meet Bedrock minimum
- ≥ 40 chars → used as-is (truncated to 4000 if over)

#### 4.7.2 Export Path (No AWS Credentials)

`GET /api/blueprints/[id]/export/agentcore` returns a downloadable JSON manifest:
- `agentDefinition` — all CreateAgent fields
- `actionGroups` — CreateAgentActionGroup params for each tool
- `deploymentInstructions` — 6-step human-readable deployment guide
- `manifestVersion`, `exportedAt`, `blueprintId`

Available on `approved` and `deployed` blueprints. Writes `blueprint.agentcore_exported` audit entry.

#### 4.7.3 Direct Deploy Path (AWS Credentials in Server Environment)

`deployToAgentCore()` in `src/lib/agentcore/deploy.ts` executes a 5-step AWS SDK sequence:

1. **Pre-flight validation** — `validateAgentCoreConfig()` throws before `BedrockAgentClient` instantiation if region, ARN, or model is invalid; soft credential warning if no explicit AWS credentials (instance profiles are valid)
2. **CreateAgent** — creates the Bedrock agent; returns `agentId` + `agentArn`
3. **CreateAgentActionGroup** × N — one per ABP tool; `RETURN_CONTROL` action type; rollback (DeleteAgent) on failure
4. **PrepareAgent** — initiates Bedrock preparation
5. **Poll GetAgent** — 180 attempts × 500ms = 90 seconds maximum; terminal state (`FAILED`) or timeout triggers rollback

On success: stores `AgentCoreDeploymentRecord` in `agent_blueprints.deployment_metadata`; updates status to `deployed`; writes `blueprint.agentcore_deployed` audit entry.

**Error enrichment:** `enrichAgentCoreError()` maps raw AWS SDK error strings to actionable operator guidance:

| AWS Error Pattern | Operator Guidance |
|---|---|
| `AccessDeniedException` / `not authorized` | IAM role missing permissions; check Admin → Settings |
| `agentResourceRoleArn` / `ValidationException` | Invalid ARN format; update in Admin → Settings |
| `ServiceQuotaExceededException` | Bedrock agent quota; request increase in AWS console |
| `ResourceNotFoundException` + model | Model not enabled in region |
| `did not reach PREPARED state` | Prep timed out; check Bedrock console |

#### 4.7.4 Live Health Endpoint

`GET /api/monitor/agentcore-health` — user-triggered only (not polled on page load):
- Queries blueprints with `deployment_target = "agentcore"`
- Calls `GetAgentCommand` per agent with 5-second AbortController timeout
- Individual agent failures return `bedrockStatus: "UNREACHABLE"` — endpoint never fails wholesale
- Returns `{ agents: AgentHealthEntry[], summary: { total, prepared, unreachable, other } }`

#### 4.7.5 AgentCore Configuration

Enterprise AgentCore config stored in `enterprise_settings.settings.deploymentTargets.agentcore`:

```typescript
interface AgentCoreConfig {
  enabled: boolean;
  region: string;                  // validated: /^[a-z]{2}-[a-z]+-\d+$/
  agentResourceRoleArn: string;    // validated: /^arn:aws:iam::\d{12}:role\/.+$/
  foundationModel: string;
  guardrailId?: string;
  guardrailVersion?: string;       // required when guardrailId is set
}
```

Malformed config returns HTTP 400 with Zod error detail (validated by `AgentCoreConfigSchema` on every PUT to `/api/admin/settings`).

---

### 4.8 Awareness and Measurement System

**Purpose:** Continuous quality monitoring, anomaly detection, AI quality scoring, and daily intelligence briefing generation.

#### 4.8.1 Metrics Worker

`metrics-worker.ts` computes 8 metrics from the database:

| Metric | Description |
|---|---|
| `totalBlueprints` | All blueprints in enterprise |
| `approvedRate` | `approved + deployed` / total |
| `governanceValidityRate` | Blueprints with `valid: true` in validation report / total evaluated |
| `avgQualityIndex` | Average AI quality score across scored blueprints |
| `reviewQueueDepth` | Count of `in_review` blueprints |
| `avgReviewSLAHours` | Average time from `in_review` submission to decision |
| `slAComplianceRate` | % of reviews completed within SLA threshold |
| `webhookDeliveryRate` | Successful webhook deliveries / total attempted (last 24h) |

**Quality Index (QI):** Composite score 0–100 derived from governance validity rate, test coverage, blueprint quality score, and intake quality score. Higher is better.

Snapshots stored in `system_health_snapshots` with ISO timestamp; trend data retained for 30+ days.

#### 4.8.2 Quality Evaluator

`quality-evaluator.ts` — AI side-effect module using Claude Haiku:

**Blueprint quality dimensions (5):**

| Dimension | What is evaluated |
|---|---|
| `instructionClarity` | How clear and actionable the behavioral instructions are |
| `constraintCompleteness` | Whether constraints adequately define boundaries |
| `governanceCoverage` | Whether governance policies cover key risk areas |
| `toolSpecificity` | Whether tools are precisely described |
| `identityCoherence` | Whether persona and description are consistent |

**Intake quality dimensions (4):**

| Dimension | What is evaluated |
|---|---|
| `requirementBreadth` | How many distinct requirement areas were captured |
| `ambiguityLevel` | How much ambiguity remains in the captured requirements |
| `riskIdentification` | Whether risk factors were explicitly identified |
| `stakeholderAlignment` | Whether stakeholder perspectives are represented |

Scores are stored in `blueprint_quality_scores` and `intake_quality_scores`. Side-effect only — never throws; never blocks.

#### 4.8.3 Anomaly Detector

`anomaly-detector.ts` evaluates 4 threshold checks against each snapshot:

| Signal | Default Threshold |
|---|---|
| Quality Index below floor | < 70 |
| Governance validity rate low | < 80% |
| Review queue too deep | > 10 |
| Deployed agents in critical health | > 0 |

Anomalies are deduplicated via the `notifications` table to prevent alert fatigue. Compliance officers are notified when thresholds are crossed.

#### 4.8.4 Briefing Generator

`briefing-generator.ts` — daily Sonnet-powered synthesis:
- Calls `generateObject()` with a `BriefingSections` Zod schema (5 structured sections)
- Sections: Platform Health Assessment, Quality Trends, Risk Signals, Compliance Posture, Recommended Actions
- Each section has a `title`, `content`, `severity` (`nominal`/`warning`/`critical`), and optional `details`
- Upserts one briefing per calendar date (re-running produces an updated briefing for the same day)
- Optionally delivered to a Slack/Teams webhook when `settings.awareness.briefingWebhookUrl` is configured
- Displayed on the Intelligence page as structured cards with color-coded severity badges

#### 4.8.5 Intelligence Page (`/monitor/intelligence`)

- KPI strip with 8 current metrics and health badge
- Briefing history date strip (last 7 days with health dots)
- 30-day trend charts (4 SVG sparklines: QI, validity rate, review queue, webhook rate)
- ACTION REQUIRED strip when anomalies exist
- Blueprint and intake quality scores table with expandable dimension bars

---

### 4.9 User Interface Layer

Intellios exposes a set of role-gated pages. Below is the complete page inventory as of Phase 48.

#### 4.9.1 Role-Differentiated Home Screens (`/`)

Three views served from the root route based on the authenticated user's role:

| Role | Home Screen Focus |
|---|---|
| `designer` | My Work strip (in-progress blueprints) + New Agent CTA; recent intake sessions |
| `reviewer` | Review Queue focus; review-ready cards with SLA ring indicators |
| `admin` | Portfolio stats; platform KPIs; cross-role navigation |

#### 4.9.2 Intake Session Pages (`/intake`, `/intake/[sessionId]`)

- `/intake` — creates a new session and redirects to the session page
- `/intake/[sessionId]` — three-phase gated view: context form → AI conversation → review screen (Phase 3 `IntakeReview`)
- Phase state machine: `loading → context-form → conversation → review`

#### 4.9.3 Blueprint Workbench (`/blueprints/[id]`)

Three-column layout:
- **Left rail** — 7-section stepper (Identity, Capabilities, Tools, Constraints, Governance, Audit, Ownership) with per-section completion indicators (`✓` / `·`)
- **Center** — full ABP content with section-by-section rendering
- **Right panel** — Submit for Review button (disabled until governance blockers = 0), governance violations list, refinement input

Submit button calls live revalidation against current policies before transitioning to `in_review`.

#### 4.9.4 Pipeline Board (`/pipeline`)

Kanban board visible to all authenticated roles. Columns correspond to lifecycle stages:

| Column | Lifecycle Status |
|---|---|
| DRAFT | `draft` |
| IN REVIEW | `in_review` |
| APPROVED | `approved` |
| REJECTED | `rejected` |
| DEPRECATED | `deprecated` |

Each card shows agent name, violation count badge, version, and tags. Tag filter and text search filter across all columns simultaneously.

**SLA monitoring:** Cards in the IN REVIEW column display color rings based on time in review:
- No ring — within SLA (< 48 hours by default)
- Amber ring — SLA warning threshold crossed (default: 48 hours, env-var overridable)
- Red ring + "SLA breach" badge — SLA breach threshold crossed (default: 72 hours)

SLA thresholds are enterprise-configurable via Admin → Settings.

#### 4.9.5 Agent Registry (`/registry`, `/registry/[agentId]`)

- `/registry` — card grid of all agents (name, status badge, version, tags, created date); global text + status filter
- `/registry/[agentId]` — tabbed agent detail:
  - **Blueprint** — full ABP stepper view (7 sections)
  - **Summary** — plain-language human-readable summary of identity, capabilities, constraints, governance
  - **Governance** — ValidationReportView with Re-validate button
  - **Review** — ReviewPanel (visible only when `status = in_review`)
  - **Versions** — version history table
  - **Regulatory** — RegulatoryPanel with EU AI Act risk tier, SR 11-7, NIST AI RMF requirement assessments
  - Header: lifecycle action buttons, AgentCore export button (when approved/deployed), Clone button, "Open in Studio" link

#### 4.9.6 Review Queue (`/review`)

- Table of all `in_review` blueprints across the enterprise
- Columns: name, agent ID, version, submitted time, governance status, SLA status, approval step progress strip
- Each row links to `/registry/[agentId]` with the Review tab pre-selected
- Role filtering: `?role=X` shows only blueprints where the caller's role matches the active approval step
- Empty state: "No blueprints pending review"

#### 4.9.7 Deployment Console (`/deploy`)

Access: `reviewer`, `compliance_officer`, `admin`.

Two tables:
1. **Ready to Deploy** — `approved` blueprints with governance health indicator; "Deploy →" and "Export for AgentCore ↓" actions
2. **Live in Production** — `deployed` blueprints with governance health badge, deployment date, deployer; "Export for AgentCore ↓" action

Deploy action opens a confirmation modal requiring:
- Change reference (required — no one-click production deployments)
- Deployment notes (optional)
- Authorization acknowledgment checkbox

AgentCore direct deploy shows a 4-phase modal (confirm → deploying → success/error) with step progress labels.

#### 4.9.8 Executive Dashboard (`/dashboard`)

Access: `compliance_officer`, `admin`.

- Top-line KPI strip: deployed count, deployment rate, compliance rate, pending review count
- Pipeline funnel bar chart (counts per lifecycle stage)
- Governance health grid (deployed agents with health status)
- Recent deployments table (last 10 deployments with actor and change reference)
- Platform summary stats (total blueprints, total intake sessions, average refinement count)

#### 4.9.9 Compliance Command Center (`/compliance`)

Access: `compliance_officer`, `admin`.

Five sections:
1. **Enterprise Posture KPIs** — deployed count, clean count, critical count, compliance rate
2. **At-Risk Agents** — deployed agents in `critical` deployment health with policy violation details
3. **Review Queue Pressure** — count in review, SLA breach count, SLA warning count
4. **Policy Coverage Gaps** — policies with no deployed agents covered, policies with many violations
5. **30-Day Trends** — line chart of governance validity rate, QI, and review throughput

Data served from `GET /api/compliance/posture` — pure DB aggregation, no AI calls.

#### 4.9.10 Governance Hub (`/governance`)

Access: All roles (read); `compliance_officer`, `admin` (write).

- 4-stat coverage overview (total policies, global policies, enterprise policies, failing-agents count)
- Governance analytics section: 3-column KPI row, 6-month dual bar chart, top violated policies table, agent status distribution
- Policy Library — all policies as cards with type/scope badges, `v{N}` version badge, edit/view links
- Compliance Starter Packs — 4 packs (SR 11-7 Core, EU AI Act High-Risk, GDPR Agent Data, AI Safety Baseline); inline 409 conflict handling with "Overwrite" option
- "New Policy" CTA for `compliance_officer` + `admin`

#### 4.9.11 Audit Trail (`/audit`)

Access: `compliance_officer`, `admin`.

- Filter controls: entity type, actor email, date range, action type
- Load-on-demand table with expandable metadata JSONB viewer
- Per-row colored badges for all 18 audit action types
- CSV export (filtered results)

#### 4.9.12 Monitor / Intelligence (`/monitor`, `/monitor/intelligence`)

- `/monitor` — AgentCore Live Status section: "Check Live AWS Status" button triggers `GET /api/monitor/agentcore-health`; results table with agent name, agentId, region, Bedrock status badge, last deployed
- `/monitor/intelligence` — Intelligence page (see Section 4.8.5)

#### 4.9.13 Admin Pages (`/admin/settings`, `/admin/webhooks`, `/admin/users`)

Access: `admin` (settings, users); `admin` + `compliance_officer` (webhooks).

- `/admin/settings` — SLA thresholds, governance gates (require tests before approval), approval chain editor, notification preferences, Deployment Targets (AgentCore config)
- `/admin/webhooks` — register/pause/resume endpoint; secret rotation; per-event-type subscriptions; delivery history log
- `/admin/users` — user list with role management (role assignment, invite)

#### 4.9.14 Blueprint Template Library (`/templates`)

Access: All authenticated roles.

Pre-built blueprint templates that designers can instantiate as a starting point. Each template is a validated ABP stub with common identity, capabilities, and governance pre-filled for a specific use case. Instantiation creates a new `draft` blueprint via `POST /api/templates/[id]/use`.

#### 4.9.15 Welcome / Onboarding (`/welcome`)

Access: All authenticated roles (new users).

Onboarding walkthrough presented to newly registered users before their first session. Covers the agent factory pipeline, role-specific entry points, and first-action CTA.

---

### 4.10 Stakeholder Collaboration Workspace

**Purpose:** Enables external domain stakeholders (Compliance, Legal, IT, Risk, Operations, Business, Security) to contribute requirements to an intake session without an Intellios account, through token-gated AI interviews adapted to their RACI authority role.

#### 4.10.1 Invitation System

Designers send invitations from the Designer Insights Panel. Each invitation:
- Targets a specific domain and RACI role
- Generates a unique UUID token stored in `intake_invitations`
- Triggers an email with a link to `/contribute/[token]`
- Has an expiry (configurable; default 7 days) and status: `pending`, `accepted`, `expired`

No Intellios account or authentication is required to accept an invitation and contribute.

#### 4.10.2 RACI Authority Model

The AI interview at `/contribute/[token]` adapts its system prompt and tone to the invitee's RACI role:

| RACI Role | Interview Focus |
|---|---|
| Accountable | Non-negotiables; what the agent must never do; decision authority boundaries |
| Responsible | Implementation concerns; integration requirements; operational constraints |
| Consulted | Domain-specific requirements; compliance rules; expert knowledge capture |
| Informed | Concerns and dependencies; notification requirements; downstream impacts |

This ensures each interview extracts the most relevant information for that stakeholder's level of authority over the agent.

#### 4.10.3 AI Orchestrator

After every stakeholder contribution, the AI Orchestrator (Claude Haiku 4.5) fires asynchronously (fire-and-forget) and produces up to four insight types:

| Insight Type | Description |
|---|---|
| `synthesis` | Plain-language summary of all agreed requirements across all contributors so far |
| `conflict` | Detected contradictions between contributions (e.g., Compliance says "no PII" vs. Business says "personalize by customer") |
| `gap` | Requirement areas not yet covered by any contribution |
| `suggest_invite` | Recommended additional stakeholders to invite based on identified gaps |

Insights are stored in `intake_ai_insights` with status `pending`. The designer reviews them in the Designer Insights Panel and approves or dismisses each. Approving a `suggest_invite` insight auto-creates the invitation and triggers the email.

#### 4.10.4 Shared Synthesis

Each stakeholder AI interview starts with the current synthesis injected into the system prompt, so each contributor builds on — not repeats — prior work. This creates a progressive, collaborative requirements capture process rather than isolated siloed inputs.

#### 4.10.5 Designer Insights Panel

The intake session page includes a collapsible Insights Panel showing:
- Per-domain rows with RACI badge, invitee name, invitation status, and an inline invitation form
- AI Orchestrator insight cards (expandable) with approve/dismiss actions
- Real-time refresh after each contribution (2-second delay for orchestrator to complete)

#### 4.10.6 API Routes

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/intake/sessions/[id]/invitations` | Create invitation; generate token; send email |
| GET | `/api/intake/sessions/[id]/invitations` | List all invitations for session |
| GET | `/api/intake/sessions/[id]/insights` | List AI Orchestrator insights |
| PATCH | `/api/intake/sessions/[id]/insights/[insightId]` | Approve or dismiss insight |
| GET | `/api/intake/invitations/[token]` | Validate token; return session context + current synthesis |
| POST | `/api/intake/invitations/[token]/chat` | Token-gated stakeholder AI interview (streaming) |

---

### 4.11 Help System

**Purpose:** Contextual AI help chat available throughout the application for all authenticated users.

- **Routes:** `GET /api/help/ask` (single-turn), `POST /api/help/chat` (streaming multi-turn)
- **Model:** Claude Haiku 4.5
- **Context:** Help system prompt includes the user's current role and relevant Intellios feature context
- **UI:** `HelpChat` component surfaced via a help icon in the global nav; renders in a side panel

---

### 4.12 Blueprint Template Library

**Purpose:** Pre-built, validated blueprint stubs that accelerate agent creation for common use cases.

- Templates are stored as static definitions; each is a partial ABP with identity, capabilities, and governance pre-filled
- `GET /api/templates` — list available templates
- `POST /api/templates/[id]/use` — instantiate template as a new `draft` blueprint (new `agentId`, new `id`, status `draft`); redirects designer to Blueprint Workbench
- Accessible from the `/templates` page and from the intake session "Start from Template" CTA

---

## 5. AGENT GENERATION LIFECYCLE

### Stage 1: Stakeholder Input

**Actor:** Designer (and optional domain stakeholders, including external contributors without Intellios accounts)
**Location:** `/intake/[sessionId]`, `/contribute/[token]` (external stakeholders)

1. Designer creates a new intake session at `/intake`
2. Designer fills Phase 1 structured context form (6 domain-signal fields)
3. Designer optionally invites external domain stakeholders via token-gated links (no Intellios account required); each invitee receives an email with a unique token and conducts a RACI-adapted AI interview at `/contribute/[token]`
4. After each stakeholder contribution, the AI Orchestrator fires asynchronously: generates synthesis, conflict detection, gap analysis, and suggested next invitations; results surface as insight cards in the Designer Insights Panel
5. Designer reviews and acts on AI Orchestrator insights; approving a "suggest invite" insight auto-creates the invitation and sends the email
6. Domain stakeholders may also submit structured contributions via the in-session stakeholder contribution form (7 domain lanes)
7. Designer conducts Phase 2 conversation with Claude; Claude uses 11 tools to build the `IntakePayload`; prior stakeholder contributions and AI synthesis are injected into Claude's system prompt
8. Governance sufficiency check runs on `mark_intake_complete` — finalization is blocked if required governance is missing
9. Designer reviews Phase 3 review screen, acknowledges all sections, clicks Generate

### Stage 2: Intent Interpretation

**Actor:** Claude (Generation Engine system prompt)
**Mechanism:** `buildGenerationSystemPrompt(policies)` + `generateObject(ABPContentSchema)`

- Intake payload provides structured requirements
- Enterprise policies with `[ERROR]`/`[WARN]` severity tags are embedded in system prompt
- Claude generates content sections pre-adapted to enterprise policies
- `generateObject` enforces ABP schema structure at SDK level

### Stage 3: Blueprint Generation

**Actor:** Generation Engine
**API:** `POST /api/blueprints`

1. `IntakePayload` retrieved from completed session
2. Enterprise policies loaded once
3. `generateObject` produces all ABP content sections in a single call
4. Service layer assembles full ABP (adds UUID, timestamps, status = `draft`)
5. ABP persisted to `agent_blueprints`
6. `validateBlueprint()` runs automatically; validation report stored with blueprint
7. Designer redirected to Blueprint Workbench (`/blueprints/[id]`)
8. `blueprint.created` audit entry written

### Stage 4: Review and Refinement

**Actor:** Designer
**Location:** `/blueprints/[id]` (Blueprint Workbench)

1. Designer reviews generated ABP (7 sections via stepper)
2. Governance violations displayed with severity badges and AI-suggested fixes
3. Designer submits natural-language change requests; engine regenerates; validation auto-runs
4. When no error-severity violations remain, "Submit for Review" button activates
5. Submit triggers live revalidation against current policies; on pass, status transitions to `in_review`
6. `blueprint.submitted` audit entry; reviewer notified

### Stage 5: Human Approval Gate

**Actor:** Reviewer (or multi-step approval chain)
**Location:** `/review`, `/registry/[agentId]`

1. Blueprint appears in Review Queue
2. Reviewer opens blueprint: reads ABP content, governance violations, version diff (if revision)
3. Optionally generates AI Risk Brief (Claude Haiku): risk level, summary, key points, recommended action
4. Multi-step chains: each role approves in sequence; SOD enforced across all prior approvers
5. Decision: Approve (`→ approved`), Reject (`→ rejected`), Request Changes (`→ draft`)
6. Audit entry written; designer notified; webhooks dispatched

### Stage 6: Deployment

**Actor:** Reviewer or Admin
**Location:** `/deploy`

1. Approved blueprints appear in Deploy Console
2. Deployment confirmation modal: change reference (required), deployment notes, authorization checkbox
3. Two deployment paths:
   - **Standard deploy:** `status → deployed` (no external deployment target)
   - **AgentCore deploy:** 5-step AWS SDK sequence; on success, `deployment_metadata` stored; status → `deployed`
4. `blueprint.deployed` audit entry; `blueprint.agentcore_deployed` (if AgentCore)
5. Deployment health check fires immediately after deploy

### Stage 7: Monitoring and Compliance

**Actor:** Compliance Officer, Monitor page
**Location:** `/monitor`, `/monitor/intelligence`

1. `checkDeploymentHealth()` evaluates deployed agent against current policies on every policy change
2. `clean → critical` transitions notify compliance officers immediately
3. Manual re-check available for any agent
4. Intelligence page provides daily quality trends, briefing, anomaly signals
5. Compliance Evidence Bundle downloadable for regulatory submission

---

## 6. DATA AND KNOWLEDGE MODEL

### 6.1 Core Tables

| Table | Purpose |
|---|---|
| `users` | Enterprise users with roles (designer, reviewer, compliance_officer, admin) |
| `enterprise_settings` | Per-enterprise configuration (SLA thresholds, approval chains, awareness config, AgentCore config) |
| `governance_policies` | Versioned governance policy rules |
| `intake_sessions` | Intake sessions with payload and context JSONB |
| `intake_messages` | Chat messages within intake sessions |
| `intake_contributions` | Attributed stakeholder requirement contributions by domain |
| `intake_invitations` | Token-based invitations to external domain stakeholders; domain, RACI role, invitee name/email, token (UUID), expiry, status |
| `intake_ai_insights` | AI Orchestrator outputs: type (synthesis/conflict/gap/suggest_invite), content (JSONB), status (pending/approved/dismissed) |
| `agent_blueprints` | All blueprint versions with ABP JSONB, validation report, deployment metadata |
| `audit_log` | Append-only event record for all lifecycle actions |
| `notifications` | Routing inbox for lifecycle event notifications |
| `webhooks` | Registered outbound webhook endpoints |
| `webhook_deliveries` | Delivery attempt log per webhook event |
| `deployment_health` | Latest governance health state per deployed agent |
| `blueprint_test_cases` | Behavioral test case definitions per logical agent |
| `blueprint_test_runs` | Behavioral test execution results per blueprint version |
| `blueprint_quality_scores` | AI quality dimension scores per blueprint (5 dimensions) |
| `intake_quality_scores` | AI quality dimension scores per intake session (4 dimensions) |
| `system_health_snapshots` | Daily aggregated platform metrics (8 metrics) |
| `intelligence_briefings` | Daily AI-generated briefing text (structured JSON, 5 sections) |
| `password_reset_tokens` | Time-limited tokens for password recovery flows |
| `user_invitations` | Admin-initiated user invitations with tokenized acceptance |

### 6.2 Agent Blueprint Package (ABP) Schema

**Schema versions:** v1.0.0 (initial), v1.2.0 (adds optional `ownership` block)

**Top-level sections:**

```typescript
{
  version: string,          // schema version (e.g., "1.0.0")
  metadata: {
    id: string,             // UUID
    created_at: string,     // ISO timestamp
    created_by: string,     // creator email
    status: string,         // lifecycle state
    enterprise_id: string,  // tenant isolation
    tags?: string[]
  },
  identity: {
    name: string,           // agent name (sanitized for Bedrock: [a-zA-Z0-9_-], ≤100)
    description: string,
    persona: string,
    branding?: { brandName, voiceTone, logoUrl }
  },
  capabilities: {
    tools: Array<{ name, type, description, parameters? }>,
    instructions: string,
    knowledge_sources?: Array<{ name, type, url? }>
  },
  constraints: {
    allowed_domains?: string[],
    denied_actions?: string[],
    rate_limit?: number
  },
  governance: {
    policies: Array<{ name, type, description, rules: PolicyRule[] }>,
    audit: { log_interactions: boolean, retention_days?: number }
  },
  ownership?: {             // v1.2.0+, optional
    businessUnit?: string,
    ownerEmail?: string,
    costCenter?: string,
    deploymentEnvironment?: "production" | "staging" | "sandbox" | "internal",
    dataClassification?: "public" | "internal" | "confidential" | "regulated"
  }
}
```

### 6.3 Intake Payload Structure

The `IntakePayload` in `intake_sessions.intake_payload` mirrors the ABP content sections plus intake-specific tracking:

```typescript
{
  identity?: { name, description, persona, branding? },
  capabilities?: { tools[], instructions, knowledge_sources[] },
  constraints?: { allowed_domains[], denied_actions[], rate_limit? },
  governance?: { policies[], audit },
  _flags?: AmbiguityFlag[],                    // ambiguous requirements
  _captureVerification?: CaptureVerificationItem[],  // discussed vs. captured evidence
  _policyQualityAssessment?: PolicyQualityItem[]     // policy adequacy assessment
}
```

### 6.4 Enterprise Settings Structure

```typescript
{
  sla: {
    reviewWarningHours: number,    // default 48
    reviewBreachHours: number      // default 72
  },
  governance: {
    requireTestsBeforeApproval: boolean
  },
  approvalChain: Array<{ role: string, label: string }>,
  notifications: {
    emailEnabled: boolean,
    webhookUrl?: string
  },
  awareness: {
    qualityIndexThreshold: number,
    validityRateThreshold: number,
    reviewQueueThreshold: number,
    briefingWebhookUrl?: string
  },
  deploymentTargets: {
    agentcore?: AgentCoreConfig | null
  }
}
```

---

## 7. GOVERNANCE AND SAFETY MODEL

### 7.1 Governance Philosophy

Intellios operates under a **layered governance model**:

1. **Prevention** — Governance policies are injected into the generation system prompt so Claude produces compliant blueprints from the outset
2. **Detection** — Automatic validation after every generation and refinement; live revalidation at review submission
3. **Gate** — Error-severity violations block lifecycle progression; no bypass path exists
4. **Evidence** — Every validation run produces a timestamped `ValidationReport` with `evaluatedPolicyIds` for audit reproducibility
5. **Continuous monitoring** — Deployed agents re-evaluated against current policies after every policy change

### 7.2 Separation of Duties

Enforced at multiple levels:

- **Designer ≠ Reviewer:** The user who generated the blueprint cannot approve it (SOD check at review submission; warnings shown in UI)
- **Multi-step approval:** Each step must be completed by a different user; no user may occupy two positions in the same approval chain
- **Deploy requires changeRef:** No deployment proceeds without a documented change reference; one-click deployments are architecturally blocked
- **Role-gated actions:** Compliance report export (`compliance_officer`, `admin`); AgentCore live health check (`compliance_officer`, `admin`); policy management (`compliance_officer`, `admin`); user management (`admin`)

### 7.3 Governance Policy Coverage

Every enterprise has:
- 4 global seed policies (Safety Baseline, Audit Standards, Access Control Baseline, Governance Coverage)
- Optional enterprise-specific policies (created via UI or imported from starter packs)
- Optional compliance starter packs (SR 11-7, EU AI Act, GDPR, AI Safety Baseline)

Policy rules address: identity completeness, instruction presence, constraint definition, audit logging, governance policy count, policy type coverage, and domain-specific rules per enterprise.

### 7.4 Audit Completeness

- 18 typed `AuditAction` values — every meaningful system action has a dedicated action type
- Audit entries include: actor (email), entity type, entity ID, from/to state, and arbitrary metadata
- Audit log is append-only — no deletion, no modification
- Audit Trail UI at `/audit` — filter by action, actor, entity, date range; CSV export; restricted to `compliance_officer`, `admin`

### 7.5 Policy Impact Simulation

Before publishing a governance policy change, compliance officers can run `POST /api/governance/policies/simulate`:
- Evaluates current `approved` and `deployed` blueprints against the proposed policy
- Classifies each blueprint as: `new_violations` (policy would introduce new violations), `resolved_violations` (policy would clear existing violations), `no_change`
- Zero AI calls — deterministic evaluator only
- Results surfaced inline in PolicyForm with 4-stat summary and per-blueprint affected list

---

## 8. EVALUATION AND QUALITY MEASUREMENT

### 8.1 Governance Validation (Structural)

- **When:** Automatically after generation; automatically after refinement; live at `draft → in_review`; manually on demand
- **Method:** Deterministic rule evaluation — no AI in the critical path
- **Output:** `ValidationReport` with `valid`, `violations[]`, `policyCount`, `evaluatedPolicyIds`, `generatedAt`
- **Effect:** `error` violations block lifecycle; `warning` violations are advisory

### 8.2 Behavioral Test Harness (Functional)

Test cases are defined per logical agent (`blueprint_test_cases`). Each test case specifies:
- `input` — the user message to send to the agent
- `expectedBehavior` — natural-language description of what the agent should do
- `severity` — `required` (failure blocks test run status) or `informational`

Execution uses two Claude Haiku calls per test case:
1. **Execute:** Send `input` to the agent (using the ABP's system prompt) — capture the response
2. **Evaluate:** Judge whether the response satisfies `expectedBehavior` — return `pass`/`fail` + `evaluationRationale`

Test runs stored in `blueprint_test_runs` (append-only evidence). `requireTestsBeforeApproval` enterprise gate: `draft → in_review` blocked if no passing test run exists.

### 8.3 AI Quality Scoring (Dimensional)

Claude Haiku evaluates blueprints across 5 dimensions and intake sessions across 4 dimensions on a 0–5 scale. Scores are:
- Stored in `blueprint_quality_scores` / `intake_quality_scores`
- Aggregated into the Quality Index (platform-level composite score 0–100)
- Surfaced on the Intelligence page with dimension bar charts
- Included in the compliance evidence bundle

### 8.4 Regulatory Framework Assessment (Compliance)

Deterministic classification (no AI) against EU AI Act, SR 11-7, and NIST AI RMF:
- EU AI Act risk tier derived from Phase 1 signals (deployment type, data sensitivity, regulatory scope)
- Evidence for each requirement mapped from ABP field values
- Surfaced on Registry detail "Regulatory" tab and in MRM Report Section 12

### 8.5 Deployment Health Monitoring (Continuous)

After every policy change, `checkAllDeployedAgents()` re-evaluates all deployed blueprints:
- Uses `evaluatePolicies()` — deterministic, zero AI cost
- UPSERT to `deployment_health` table (one row per logical agent)
- `clean → critical` transitions notify compliance officers
- `critical → clean` restorations notify compliance officers
- Health status: `clean`, `critical`, `unknown`

---

## 9. SYSTEM INTELLIGENCE AND OPTIMIZATION

### 9.1 Policy-Aware Generation Loop

- Enterprise policies injected into generation system prompt at generation time
- Blueprints arrive pre-adapted to `[ERROR]`-severity rules, reducing governance violations before the first validation run
- Eliminates the generate → violate → refine cycle that was the primary source of wasted API calls pre-Phase 17

### 9.2 Adaptive Model Selection

- `selectIntakeModel()` routes intake turns by payload state and message content
- ~75–80% of turns use Claude Haiku (8× cheaper than Sonnet)
- Sonnet reserved for opening turns, governance-dense turns, and finalization steps
- Conservative bias: false negatives (Haiku on a complex turn) are treated as worse than false positives

### 9.3 Quality Feedback Loop

- Every blueprint and intake session is AI-scored after relevant lifecycle events
- Quality scores feed into the Quality Index composite metric
- QI trends are displayed on the Intelligence page and used by the anomaly detector
- Admin-triggerable backfill endpoint scores all previously unscored blueprints

### 9.4 Daily Intelligence Briefing

- `intellios-daily-briefing` scheduled task runs at 08:00 local time daily
- Feeds platform-level metrics snapshot to Claude Sonnet with 7-day delta context
- Output is structured JSON (5 sections with typed severity ratings) via `generateObject`
- Briefing is displayed as section cards on the Intelligence page
- Optionally delivered to a webhook endpoint (Slack/Teams integration)
- Briefing history navigable for 7 days with health status dots

### 9.5 Monitoring and Alerting

- 4-threshold anomaly detector fires notifications on: QI below floor, validity rate below threshold, review queue above depth, deployed agents in critical health
- Anomalies deduplicated via notification system — one alert per crossing, not per check cycle
- Anomalous KPI cards on Intelligence page link to the affected resource
- ACTION REQUIRED strip when active anomalies exist

---

## 10. DEPLOYMENT AND INTEGRATION MODEL

### 10.1 Blueprint Deployment Targets

| Target | Mechanism | AWS Credentials Required |
|---|---|---|
| Platform deploy | `status → deployed` in Intellios DB only | No |
| AgentCore Export | Download JSON manifest for manual AWS deployment | No |
| AgentCore Direct Deploy | 5-step AWS Bedrock Agent SDK sequence | Yes (server env vars) |

### 10.2 AgentCore Direct Deploy — AWS Prerequisites

1. **AWS credentials** — one of: `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`, `AWS_PROFILE`, ECS task role, EC2 instance profile
2. **IAM role** — trust policy allowing `bedrock.amazonaws.com` to assume the role; permissions: `bedrock:CreateAgent`, `bedrock:CreateAgentActionGroup`, `bedrock:PrepareAgent`, `bedrock:GetAgent`, `bedrock:DeleteAgent`, `bedrock:InvokeModel`, `bedrock:GetFoundationModel`
3. **Foundation model access** — model must be enabled in the configured AWS region via Bedrock console
4. **Settings configuration** — region, IAM role ARN, foundation model ID set in Admin → Settings → Deployment Targets

### 10.3 Outbound Webhook Integration

Enterprises can register HTTPS endpoints to receive lifecycle events:

- **Registration:** Admin → Webhooks → Register endpoint with event subscriptions
- **Payload format:** `{ eventType, entityId, enterpriseId, actor, payload, timestamp }`
- **Signature:** `X-Intellios-Signature: sha256={hmac-hex}` using `WEBHOOK_SECRET` for verification
- **Use cases:** CI/CD triggering on `blueprint.deployed`, SIEM integration, Slack notifications, external audit system synchronization

### 10.4 API Surface

Intellios exposes a comprehensive REST API under the Next.js App Router (`/api/**`). All routes:
- Require `NextAuth` session authentication
- Enforce enterprise-level data isolation via `enterprise_id` filtering
- Apply Zod validation on all `POST`/`PATCH` bodies
- Return typed error codes: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `INTERNAL_ERROR`, `AGENTCORE_NOT_CONFIGURED`, `AGENTCORE_DEPLOY_FAILED`

### 10.5 Role-Based Access Control

| Role | Capabilities |
|---|---|
| `designer` | Create and manage intake sessions, generate and refine blueprints, submit for review |
| `reviewer` | Review blueprints (approve, reject, request changes), deploy approved blueprints |
| `compliance_officer` | All reviewer capabilities, governance policy management, compliance reports, audit trail, monitor and health checks |
| `admin` | All capabilities, user management, enterprise settings, webhook management, cross-enterprise access |

---

## 11. FUTURE EVOLUTION

### 11.1 Planned Capabilities

| Capability | Description |
|---|---|
| Production hardening | Pagination for large registries, webhook health banner, ABP schema evolution strategy (OQ-007) |
| Periodic model review | SR 11-7 annual revalidation scheduling — automated reminders and evidence collection |
| White-label branding | Full UI brand customization (logo, color scheme, domain) per enterprise tenant |
| Agent-to-agent protocols | Communication and coordination standards for multi-agent workflows |
| Distributed rate limiting | Redis-backed rate limiting for multi-instance deployments |
| Additional deployment targets | Azure AI Foundry, Google Vertex AI, OpenAI Assistants API |
| Stakeholder workspace enhancements | Async threading, multi-round stakeholder sessions, contribution version tracking |

### 11.2 Known Limitations (Current)

| Limitation | Detail | Impact |
|---|---|---|
| `agentVersion: "1"` in AgentCore records | Bedrock assigns its own version numbers; stored `"1"` is a placeholder | Misleading if used in `InvokeAgent` calls directly; use `"DRAFT"` for invocation |
| In-memory rate limiting | Does not work across multiple server instances | Use single-instance deployment or replace with Redis for multi-instance |
| MVP versioning | Blueprint refinements update in place; new versions require manual clone + re-design | Full version branching deferred |
| ABP schema evolution | No migration strategy for blueprints stored at older schema versions | See OQ-007 |

---

## 12. GLOSSARY

| Term | Definition |
|---|---|
| **ABP** | Agent Blueprint Package — the core structured artifact produced by Intellios. A versioned JSON document describing an agent's identity, capabilities, constraints, and governance. |
| **Agent** | An AI-powered autonomous unit designed to perform tasks on behalf of an enterprise. In Intellios, agents are specified as ABPs before being deployed. |
| **AgentCore** | Amazon Bedrock AgentCore — the AWS managed service for hosting and running AI agents. Intellios can export ABPs as Bedrock deployment manifests or deploy directly via the Bedrock Agent API. |
| **Audit Trail** | The append-only `audit_log` table recording every lifecycle action: actor, action type, entity, from-state, to-state, metadata, timestamp. |
| **Blueprint** | Shorthand for Agent Blueprint Package (ABP). |
| **Blueprint Workbench** | The designer-facing page at `/blueprints/[id]` where blueprints are previewed, refined, validated, and submitted for review. |
| **Compliance Evidence Bundle** | Downloadable JSON package containing MRM report + AI quality evaluation + test run results + export metadata, for regulatory submission. |
| **Control Plane** | The subsystem responsible for governance, registry, and lifecycle management. Comprises: Governance Validator, Agent Registry, Blueprint Review UI. |
| **Design Studio** | The subsystem responsible for intake and blueprint generation. Comprises: Intake Engine, Generation Engine. |
| **Deployment Health** | Governance posture of a deployed agent — evaluated against the current policy set, not the policy set at review time. States: `clean`, `critical`, `unknown`. |
| **Enterprise** | A customer organization using Intellios. All data is scoped to an `enterprise_id`. |
| **Event Bus** | In-process pub/sub mechanism in Intellios. `writeAuditLog()` dispatches `LifecycleEvent`s after every audit insert. Handlers: notifications, webhooks, health checks, quality scoring. |
| **Generation Engine** | The component that produces an ABP from a completed intake payload using Claude `generateObject`. |
| **Governance Validator** | The component that evaluates an ABP against enterprise governance policies using deterministic rule evaluation. Produces a `ValidationReport`. |
| **IntakeContext** | Phase 1 structured context signals: deployment type, data sensitivity, regulatory scope, integrations, stakeholders consulted. Stored as JSONB in `intake_sessions`. |
| **IntakePayload** | The accumulating structured representation of captured requirements during Phase 2. Maps to ABP content sections plus intake-specific tracking fields. |
| **Intake Engine** | The component that captures enterprise requirements through a three-phase process (structured form → AI conversation → review screen). |
| **Lifecycle** | The ordered set of states an ABP passes through: `draft → in_review → approved → deployed → deprecated`. |
| **Lifecycle State Machine** | The formal set of valid status transitions with their access control and precondition rules. |
| **MRM Report** | Model Risk Management Compliance Report — a 13-section structured evidence document generated per blueprint for SR 11-7, EU AI Act, and NIST AI RMF regulatory compliance. |
| **Policy** | A named set of `PolicyRule` records defining constraints on ABP fields. Evaluated deterministically. |
| **PolicyRule** | A single governance rule: `{ field, operator, value, severity, message }`. Evaluated against an ABP using dot-notation field addressing. |
| **Quality Index (QI)** | Composite platform metric (0–100) aggregating governance validity rate, test coverage, and AI quality scores. |
| **Review Queue** | The list of ABPs in `in_review` status, accessible at `/review`. Entry point for human reviewers. |
| **Separation of Duties (SOD)** | Enforcement that no individual can both design and approve an agent. Multiple roles required across the lifecycle. |
| **Stakeholder Contributions** | Attributed requirement inputs from domain specialists (7 domains) submitted via dedicated forms. Injected verbatim into the generation system prompt and recorded in the MRM report. |
| **Validation Report** | The output of the Governance Validator: `{ valid, violations[], policyCount, evaluatedPolicyIds, generatedAt }`. Stored with each blueprint in `agent_blueprints.validation_report`. |
| **Violation** | A single policy rule failure in a Validation Report. Contains: policy name, rule ID, field path, severity, message, and optional Claude-generated remediation suggestion. |
| **White-label** | The capability for enterprises to brand Intellios-generated agents under their own brand identity and policies. |
| **AI Orchestrator** | A fire-and-forget Claude Haiku 4.5 module that runs after every stakeholder contribution. Produces four insight types: synthesis (agreed requirements summary), conflict (contradictions between contributors), gap (uncovered requirement areas), and suggest_invite (recommended additional stakeholders). |
| **RACI Authority Model** | The framework for adapting stakeholder AI interviews based on the invitee's authority role: Accountable (non-negotiables), Responsible (implementation concerns), Consulted (domain requirements), Informed (concerns and dependencies). |
| **Stakeholder Workspace** | The public, token-gated page at `/contribute/[token]` where invited external domain stakeholders conduct RACI-adapted AI interviews without an Intellios account. |
| **Token-Gated Invitation** | An invitation to an external stakeholder that grants access via a unique UUID token in a URL. No Intellios account required. Stored in `intake_invitations`. Expires after a configurable period. |
| **Insight** | An AI Orchestrator output stored in `intake_ai_insights`. Types: synthesis, conflict, gap, suggest_invite. Has a status of pending, approved, or dismissed. Surfaced in the Designer Insights Panel. |
| **Designer Insights Panel** | The collapsible panel in the intake session page showing per-domain stakeholder rows (RACI badge, invitee, status, inline invite form) and AI Orchestrator insight cards with approve/dismiss actions. |
| **Shared Synthesis** | The current AI-generated synthesis of all stakeholder contributions, injected into each new stakeholder's interview system prompt so contributors build progressively on prior requirements rather than repeating them. |
| **Blueprint Template** | A pre-built, validated ABP stub covering a common use case. Instantiated via `/api/templates/[id]/use` to create a new `draft` blueprint as a starting point. |

---

*End of INTELLIOS_SYSTEM_DESCRIPTION.md*
