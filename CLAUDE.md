# Intellios — Project Instructions for Claude

## What is Intellios?

Intellios is a **white-label enterprise agent factory**. It enables enterprises to design, generate, govern, package, and deploy AI agents under their own brand and policies.

## Project Layout

```
CLAUDE.md              ← You are here. Start here every session.
docs/
  architecture/        ← System design: subsystems, data flow, boundaries
  decisions/           ← ADRs (Architectural Decision Records)
  log/                 ← Session logs: audit trail of all interactions and actions
  schemas/             ← Versioned JSON Schema files for core artifacts
  specs/               ← Behavior specifications for each component
  glossary.md          ← Canonical term definitions
  roadmap.md           ← Current phase, MVP scope, priorities
src/                   ← Application source code
  app/                 ← Next.js App Router (pages + API routes)
    api/intake/        ← Intake Engine REST API endpoints
    intake/            ← Intake session UI pages
  components/          ← React UI components
    chat/              ← Chat UI: container, bubbles, input, tool display
  lib/
    db/                ← Drizzle ORM: schema, client
    intake/            ← Intake Engine logic: system prompt, tool definitions
    types/             ← Shared TypeScript interfaces (IntakePayload, etc.)
  drizzle.config.ts    ← Drizzle ORM configuration
  next.config.ts       ← Next.js configuration
  package.json         ← Dependencies (Next.js 16, AI SDK v5, Drizzle, Zod)
  tsconfig.json        ← TypeScript configuration
```

## Conventions

### Terminology
- Always use terms exactly as defined in `docs/glossary.md`.
- If you encounter an undefined term, add it to the glossary before using it.

### Before Creating or Modifying Components
1. Check `docs/specs/` for an existing specification.
2. Check `docs/schemas/` for existing schema definitions.
3. Check `docs/architecture/` for subsystem boundaries and data flow.
4. Check `docs/decisions/_index.md` for prior decisions that constrain the design.

### Architectural Decisions
- Before proposing a significant technical choice, check `docs/decisions/_index.md` for prior decisions.
- Record new decisions as ADR files in `docs/decisions/` using the template at `docs/decisions/_template.md`.
- New ADRs start with status `proposed`. A human marks them `accepted`.

### Schema Changes
- Schemas use [Semantic Versioning](https://semver.org/).
- To change a schema: create a new versioned file (e.g., `v1.1.0.schema.json`) and update the corresponding `changelog.md`.
- Never modify a released schema file in place.

### Session Logging
- At the start of each session, create a new log file in `docs/log/` named `YYYY-MM-DD_session-NNN.md`.
- After every significant action (file created, decision made, spec changed, question resolved), append to the action log.
- Before ending a session, write the summary section.
- Keep `docs/log/_index.md` updated with each new session.

### Documentation Updates — MANDATORY

Documentation is not optional and not an afterthought. Every task is incomplete until its documentation is current. This applies every session, without exception.

After every implementation task:
1. **Spec** — update the relevant `docs/specs/` file (status, implementation section, behavior changes).
2. **Roadmap** — update `docs/roadmap.md` component status when a component progresses or completes.
3. **Session log** — append new actions to the current session's log file in `docs/log/`.
4. **Effort log** — update `docs/log/effort-log.md` with the session's Claude and Samy effort at session close.
5. **Architecture** — update `docs/architecture/` if subsystem boundaries or data flow changed.
6. **ADRs** — record new significant technical decisions as ADR files before or alongside implementation.

Do not commit code without committing the corresponding documentation update in the same commit or an immediately following one.

## Key Subsystems

| Subsystem | Description | Spec |
|---|---|---|
| Intake Engine | Captures enterprise requirements for agent creation | `docs/specs/intake-engine.md` |
| Generation Engine | Produces Agent Blueprint Packages from intake data | `docs/specs/generation-engine.md` |
| Governance Validator | Validates blueprints against enterprise policies | `docs/specs/governance-validator.md` |
| Agent Registry | Stores and manages blueprint versions | `docs/specs/agent-registry.md` |
| Blueprint Review UI | Human review interface for generated blueprints | `docs/specs/blueprint-review-ui.md` |

## Core Artifact

The **Agent Blueprint Package (ABP)** is the central artifact. Its schema is at `docs/schemas/abp/`. Its specification is at `docs/architecture/abp-spec.md`.
