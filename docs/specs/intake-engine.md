# Intake Engine — Specification

**Subsystem:** Design Studio
**Status:** Complete — Phase 7 (stakeholder requirement lanes, 2026-03-13)

## Purpose

Captures enterprise requirements, constraints, and governance context for agent creation. Produces a structured intake payload that the Generation Engine consumes and a Phase 1 context record that the governance validator and MRM report use.

The engine operates as a **three-phase process** designed to eliminate the completeness blindspot inherent in discovery-driven intake: Claude cannot know to probe for FINRA compliance if the user never mentions financial data. Phase 1 captures domain signals first; Phase 2 uses those signals to enforce context-appropriate governance requirements deterministically; Phase 3 requires explicit human acknowledgment of what was captured before generation proceeds.

## Inputs

- **Phase 1:** Enterprise user fills a structured context form (6 domain-signal fields)
- **Phase 2:** Enterprise user interaction via conversational UI (chat-based, powered by Claude), seeded with Phase 1 context
- **Phase 2 (parallel):** Stakeholder contributions submitted by domain specialists (compliance, risk, legal, security, IT, operations, business) via the contributions API — injected into the system prompt for verbatim incorporation
- Enterprise policies (referenced from governance system)

## Outputs

- **`IntakeContext`** — Phase 1 domain signals (deployment type, data sensitivity, regulatory scope, integrations, stakeholders)
- **`IntakePayload`** — Structured intake data containing agent identity, capabilities, constraints, governance policies, audit config, and optional ambiguity flags
- **Stakeholder contributions** — Attributed domain specialist inputs, included in MRM report Section 11 (`stakeholderContributions`)

## Three-Phase Architecture

### Phase 1 — Structured Context Form

The `IntakeContextForm` component is shown before the AI conversation begins. The user fills 6 fields:

| Field | Type | Purpose |
|---|---|---|
| `agentPurpose` | `string` | Brief description of agent's goal — seeds Claude's opening message |
| `deploymentType` | enum (4 options) | `internal-only` \| `customer-facing` \| `partner-facing` \| `automated-pipeline` |
| `dataSensitivity` | enum (5 levels) | `public` \| `internal` \| `confidential` \| `pii` \| `regulated` |
| `regulatoryScope` | multi-select | `FINRA` \| `SOX` \| `GDPR` \| `HIPAA` \| `PCI-DSS` \| `none` |
| `integrationTypes` | multi-select | `internal-apis` \| `external-apis` \| `databases` \| `file-systems` \| `none` |
| `stakeholdersConsulted` | multi-select | `legal` \| `compliance` \| `security` \| `it` \| `business-owner` \| `none` |

On submit, the form calls `PATCH /api/intake/sessions/[id]/context`. The session page transitions to Phase 2 only on success. The `IntakeContext` is stored in `intake_sessions.intake_context` (JSONB).

### Phase 2 — Guided AI Conversation

Claude receives both the current `IntakePayload` state and the `IntakeContext` from Phase 1 via `buildIntakeSystemPrompt(payload, context)`. The system prompt injects two additional sections:

**Enterprise Context block** — States the agent purpose, deployment type, data sensitivity, regulatory scope, integrations, and stakeholders consulted. Instructs Claude not to re-ask for this information and to use it to frame the opening message.

**Mandatory Governance Probing Rules** — A deterministic list of what must be captured before finalization, derived from the context signals:

| Trigger | Required governance |
|---|---|
| `dataSensitivity: pii` or `regulated` | data_handling policy + audit logging on + retention_days set |
| `regulatoryScope: FINRA` or `SOX` | compliance policy + retention_days set |
| `regulatoryScope: GDPR` or `HIPAA` | data_handling policy + pii_redaction on |
| `deploymentType: customer-facing` or `partner-facing` | safety policy + behavioral instructions set |
| `integrationTypes: external-apis` | access_control policy |

These are enforced at two levels:
1. **Prompted enforcement** — Claude is told what to probe for in the system prompt
2. **Hard enforcement** — `mark_intake_complete` calls `checkGovernanceSufficiency()` and returns an error with a gap list if any required governance is missing; finalization is rejected until all gaps are closed

The `flag_ambiguous_requirement` tool allows Claude to record unclear or contradictory requirements to a `_flags` array in the payload. Flags are surfaced in the Phase 3 review screen.

### Phase 3 — Pre-Finalization Review Screen

The `IntakeReview` component replaces the simple completion banner. It is shown when the session status transitions to `completed` (after `mark_intake_complete` succeeds). It displays:

- **Enterprise context summary strip** — Deployment type, data sensitivity, regulatory scope, integrations, stakeholders consulted
- **Ambiguity flags panel** (expandable) — Each flag shows field, description, and the user's original statement
- **Per-section review cards** — Rich content display for each of the 7 ABP sections with an acknowledgment checkbox. Generate button is disabled until all filled sections are checked
- **Gated Generate button** — Activates only when all required sections are filled and all filled sections are acknowledged

---

## Phase 7 — Stakeholder Requirement Lanes

### Problem

The three-phase architecture (Phase 6) eliminated the governance blindspot but left a second gap: it captured requirements through a single channel — the designer. `stakeholdersConsulted` in Phase 1 recorded that domain specialists were consulted, but not what they said. In a Fortune 500 financial services context, a compliance officer's FINRA Rule 3110 requirements or a risk officer's denied-scenario list would only appear in the blueprint if the designer knew to raise them during the conversation.

### Solution

Direct, attributed input channels for 7 domain stakeholders. Each stakeholder submits their requirements through a domain-adaptive form. Their inputs are injected verbatim into Claude's system prompt during Phase 2, shown with attribution in the Phase 3 review screen, and included in the MRM report as a dedicated section.

### ContributionDomain Enum

| Value | Label |
|---|---|
| `compliance` | Compliance |
| `risk` | Risk |
| `legal` | Legal |
| `security` | Security |
| `it` | IT / Technology |
| `operations` | Operations |
| `business` | Business |

### Domain Field Keys

Each domain exposes the fields most relevant to that stakeholder's concerns:

| Domain | Fields |
|---|---|
| `compliance` | `regulatoryRequirements`, `prohibitedActions`, `auditRequirements` |
| `risk` | `riskConstraints`, `deniedScenarios`, `escalationProcedures` |
| `legal` | `legalConstraints`, `liabilityLimitations`, `dataHandlingRequirements` |
| `security` | `securityRequirements`, `accessControls`, `dataProtectionRequirements` |
| `it` | `technicalConstraints`, `integrationRequirements`, `performanceRequirements` |
| `operations` | `operationalConstraints`, `slaRequirements`, `escalationProcedures` |
| `business` | `businessObjectives`, `successMetrics`, `targetAudience` |

### StakeholderContribution Interface

```typescript
interface StakeholderContribution {
  id: string;
  sessionId: string;
  domain: ContributionDomain;
  contributorName: string;
  contributorRole: string;
  fields: Record<string, string>;   // domain-keyed field values
  submittedAt: Date;
}
```

### System Prompt Injection

`buildContributionsBlock(contributions: StakeholderContribution[])` generates a `## Stakeholder Requirements` block. For each contribution it emits a named header (`### [Domain] Requirements — [contributorName], [contributorRole]`) followed by each non-empty field as a labeled bullet. The block closes with an instruction to Claude to incorporate all requirements verbatim.

`buildIntakeSystemPrompt(payload, context?, contributions?)` accepts contributions as a third optional argument. When contributions are present, the block is appended after the Enterprise Context block and before the Current State block.

### API Routes

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/intake/sessions/[id]/contributions` | Submit a stakeholder contribution. Auth + enterprise access guard. Writes `intake.contribution_submitted` audit entry. Dispatches notification event. |
| GET | `/api/intake/sessions/[id]/contributions` | List all contributions for a session. Auth + enterprise access guard. |

### Phase 2 Sidebar Panel

`StakeholderContributionsPanel` renders in the sidebar of the Phase 2 conversation screen (at the bottom of `IntakeProgress`). It shows:
- Count badge ("N contributions")
- Per-contribution cards: domain color chip, contributor name + role, field count
- "Add Contribution" affordance (links to contribution form)

`StakeholderContributionForm` is a domain-adaptive form component. Selecting a domain reveals the fields specific to that domain. Required fields: contributor name, role, domain. Field inputs are textareas. On submit, calls `POST /api/intake/sessions/[id]/contributions` and closes.

### Phase 3 Review Screen

`IntakeReview` renders a contributions panel before the section cards. The panel lists all submitted contributions with full field content, attributed to contributor name, role, and domain. This gives the reviewing designer explicit confirmation of what each stakeholder submitted before finalizing.

### MRM Report Section 11

`MRMReport.stakeholderContributions` is an array of:

```typescript
{
  domain: string;
  contributorName: string;
  contributorRole: string;
  fields: Record<string, string>;
  submittedAt: string;
}
```

`assembleMRMReport()` runs a 6th DB query (`intakeContributions.findMany` by `sessionId`) and populates Section 11. Empty-array safe for blueprints generated before Phase 7.

---

## Resolved Decisions

- **Intake format:** Conversational UI (chat-based, powered by Claude). See ADR-002.
- **Policy discovery:** Policies are fetched from the Control Plane (PostgreSQL) at intake time. See ADR-003.
- **Templates:** No templates. Every agent starts from scratch. See ADR-003.
- **Phase 1 context capture:** Structured form before conversation eliminates governance discovery blindspot. Context stored in `intake_sessions.intake_context` JSONB column.
- **Governance enforcement model:** Dual-layer — prompted (system prompt probing rules) + hard (mark_intake_complete sufficiency check). Prevents silent governance gaps.

## Implementation

See ADR-004 for implementation technology choices.

### Data Model

- **`intake_sessions`** — One row per intake session. Stores `enterprise_id`, `status` (`active` | `completed`), `intake_payload` (JSONB, accumulates ABP sections), and `intake_context` (JSONB, Phase 1 domain signals — null until Phase 1 submitted).
- **`intake_messages`** — One row per message in a session. Stores `role`, `content`, and ordering metadata.
- **`intake_contributions`** — One row per stakeholder contribution. Stores `session_id`, `enterprise_id`, `domain`, `contributor_name`, `contributor_role`, `fields` (JSONB), `submitted_at`. Migration: `0007_intake_contributions.sql`.
- **`governance_policies`** — Enterprise policies referenced during intake.

### API Routes

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/intake/sessions` | Create a new intake session |
| GET | `/api/intake/sessions/[id]` | Fetch session with message history |
| PATCH | `/api/intake/sessions/[id]/context` | Save Phase 1 IntakeContext |
| POST | `/api/intake/sessions/[id]/chat` | Streaming chat endpoint (Claude + tool use) |
| GET | `/api/intake/sessions/[id]/payload` | Get current intake payload state |
| POST | `/api/intake/sessions/[id]/contributions` | Submit a stakeholder contribution |
| GET | `/api/intake/sessions/[id]/contributions` | List all contributions for a session |

### Claude Tool Use

The intake assistant uses 11 tools to incrementally build the `IntakePayload`:

| Tool | Purpose |
|---|---|
| `set_agent_identity` | Set agent name, description, persona |
| `set_branding` | Set brand name, voice tone, logo URL |
| `add_tool` | Add a tool/capability to the agent |
| `set_instructions` | Set behavioral instructions |
| `add_knowledge_source` | Add a knowledge source |
| `set_constraints` | Set constraint settings (output length, topic allowlist/blocklist) |
| `add_governance_policy` | Attach a governance policy |
| `set_audit_config` | Set audit logging configuration |
| `flag_ambiguous_requirement` | Record an ambiguous or contradictory requirement to `_flags[]` in the payload |
| `get_intake_summary` | Check completeness of captured fields (read-only) |
| `mark_intake_complete` | Finalize intake — runs governance sufficiency check before calling `finalizeSession()` |

Tools use Vercel AI SDK v5 (`tool()` + `zodSchema()` from the `ai` package). `stopWhen: stepCountIs(10)`.

### System Prompt

`buildIntakeSystemPrompt(payload, context?, contributions?)` builds the system prompt dynamically on each request:

1. **Base prompt** — Conversation style guide, tool usage rules, section list
2. **Enterprise Context block** (injected when `context` is provided) — Phase 1 signals + mandatory governance probing rules derived from the governance sufficiency matrix
3. **Stakeholder Requirements block** (injected when contributions are present) — Per-domain, attributed requirement text generated by `buildContributionsBlock()`. Claude is instructed to incorporate all requirements verbatim.
4. **Current State block** — Per-section filled/unfilled status with detail lines (agent name, tool list, policy list, etc.) so Claude never re-asks for already-captured information

### Governance Sufficiency Matrix

`checkGovernanceSufficiency(payload, context)` in `src/lib/intake/tools.ts` — called by `mark_intake_complete`. Returns an array of `{ type, reason }` for each required but missing governance element. If non-empty, `mark_intake_complete` returns `success: false` with the gap list rather than finalizing.

### Streaming

The chat route uses `streamText` from AI SDK v5 with `stopWhen: stepCountIs(10)`. The response is returned via `toUIMessageStreamResponse()`. The frontend uses `useChat` from `@ai-sdk/react` with `DefaultChatTransport`.

### Session Page State Machine

The intake session page (`src/app/intake/[sessionId]/page.tsx`) operates as a state machine:

```
loading → context-form    (if intakeContext is null)
        → review          (if session.status = "completed")
        → conversation    (if intakeContext is set and session is active)

conversation → review     (after mark_intake_complete succeeds)
```

On mount, the page fetches the session to determine the initial phase. On `completed`, it also fetches the current payload to populate the review screen.

### Tool Update Semantics

- **Serialization:** All `updatePayload` calls are chained on a request-scoped promise queue. This prevents data loss when Claude calls multiple tools in the same step (parallel execution).
- **Deduplication:** `add_tool`, `add_knowledge_source`, and `add_governance_policy` upsert by name — calling them again with the same name updates the existing entry rather than creating a duplicate.
- **Flag accumulation:** `flag_ambiguous_requirement` appends to `_flags[]` in the payload — never overwrites. Each flag gets a unique timestamp-derived ID.

### Progress Sidebar

`IntakeProgress` component polls `/api/intake/sessions/[id]/payload` after each AI response (via `refreshTick` prop from the parent page). It displays:
- 7 ABP sections with filled/unfilled state and detail lines (e.g., tool names, policy names)
- Progress bar (% of sections complete)
- Required vs optional distinction
- Readiness indicator ("Ready to finalize" when required sections are filled)

### MRM Report Integration

When a blueprint's MRM Compliance Report is assembled, `assembleMRMReport()` fetches the originating intake session and reads both `intake_context` and `intake_contributions`.

The `riskClassification` section is enriched with:
- `deploymentType` — from Phase 1 context
- `dataSensitivity` — from Phase 1 context
- `regulatoryScope` — from Phase 1 context
- `stakeholdersConsulted` — from Phase 1 context

Section 11 (`stakeholderContributions`) contains the full attributed contribution records from `intake_contributions`.

All fields are null/empty-array safe for backwards compatibility with blueprints generated before Phase 6 and Phase 7.
