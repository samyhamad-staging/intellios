# Intake Engine — Specification

**Subsystem:** Design Studio
**Status:** In Progress

## Purpose

Captures enterprise requirements, constraints, and preferences for agent creation. Produces structured intake data that the Generation Engine consumes.

## Inputs

- Enterprise user interaction via **conversational UI** (chat-based, powered by Claude)
- Enterprise policies (referenced from governance system)

## Outputs

- Structured intake payload containing:
  - Agent purpose and description
  - Desired capabilities and tools
  - Behavioral constraints
  - Branding preferences
  - Applicable governance policies

## Behavior

1. Present the enterprise user with a guided experience to define their agent.
2. Validate completeness of required fields.
3. Resolve references to enterprise policies from the Control Plane.
4. Produce a structured intake payload for the Generation Engine.

## Resolved Decisions

- **Intake format:** Conversational UI (chat-based, powered by Claude). See ADR-002.
- **Policy discovery:** Policies are fetched from the Control Plane (PostgreSQL) at intake time. See ADR-003.
- **Templates:** No templates for MVP. Every agent starts from scratch. See ADR-003.

## Implementation

See ADR-004 for implementation technology choices.

### Data Model

- **`intake_sessions`** — One row per intake session. Stores `enterprise_id`, `status` (`active` | `complete`), and `intake_payload` (JSONB, accumulates ABP sections as the conversation progresses).
- **`intake_messages`** — One row per message in a session. Stores `role`, `content`, and ordering metadata.
- **`governance_policies`** — Enterprise policies referenced during intake.

### API Routes

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/intake/sessions` | Create a new intake session |
| GET | `/api/intake/sessions/[id]` | Fetch session with message history |
| POST | `/api/intake/sessions/[id]/chat` | Streaming chat endpoint (Claude + tool use) |
| GET | `/api/intake/sessions/[id]/payload` | Get current intake payload state |
| POST | `/api/intake/sessions/[id]/finalize` | Validate and finalize intake |

### Claude Tool Use

The intake assistant uses 10 tools to incrementally build the `IntakePayload` as the conversation progresses:

| Tool | Purpose |
|---|---|
| `set_agent_identity` | Set agent name, description, persona |
| `set_branding` | Set brand name, voice tone, logo URL |
| `add_tool` | Add a tool/capability to the agent |
| `set_instructions` | Set behavioral instructions |
| `add_knowledge_source` | Add a knowledge source |
| `set_constraints` | Set constraint settings (output length, topic allowlist/blocklist) |
| `add_governance_policy` | Reference an enterprise policy by ID |
| `set_audit_config` | Set audit logging configuration |
| `get_intake_summary` | Check completeness of captured fields (read-only) |
| `mark_intake_complete` | Finalize intake after user confirmation |

Tools use Vercel AI SDK v5 (`tool()` + `zodSchema()` from the `ai` package).

### Streaming

The chat route uses `streamText` from AI SDK v5 with `stopWhen: stepCountIs(5)` to allow multi-step tool use. The response is returned via `toUIMessageStreamResponse()`. The frontend uses `useChat` from `@ai-sdk/react` with `DefaultChatTransport`.
