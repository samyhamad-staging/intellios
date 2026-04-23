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
  open-questions.md    ← Live tracker of unresolved questions (OQ-NNN)
  project-journal.md   ← Narrative evolution record (one entry per session)
  roadmap.md           ← Current phase, MVP scope, priorities
src/                   ← Application source code
  app/
    api/
      intake/          ← Intake Engine API routes
      blueprints/      ← Blueprint generation, refinement, validation, status, review
      registry/        ← Agent Registry API routes
      review/          ← Review queue API route
      governance/      ← Governance policy API routes
    intake/            ← Intake session UI pages
    blueprints/        ← Blueprint Studio UI pages
    registry/          ← Agent Registry UI pages
    review/            ← Review queue UI page
  components/
    catalyst/          ← Catalyst UI Kit (Tailwind Labs) — 27 polished components
    chat/              ← Chat UI: container, bubbles, input, tool display, streaming
    blueprint/         ← Blueprint view component
    governance/        ← Validation report component
    registry/          ← Status badge, lifecycle controls
    review/            ← Review panel component
  lib/
    db/                ← Drizzle ORM: schema, client, migrations
    intake/            ← Intake Engine logic: system prompt, tool definitions, handlers
    governance/        ← Governance Validator: types, evaluator, remediator, validator
    types/             ← Shared TypeScript types (ABP, intake payload)
  drizzle.config.ts    ← Drizzle ORM configuration
  next.config.ts       ← Next.js configuration
  package.json         ← Dependencies (Next.js 16, AI SDK v5, Drizzle, Zod)
  tsconfig.json        ← TypeScript configuration
```

## UI Component Library — Catalyst

`src/components/catalyst/` contains the full **Catalyst UI Kit** by Tailwind Labs (27 TypeScript components). Import from `@/components/catalyst`:

```tsx
import { Button, Badge, Table, TableHead, TableBody, TableRow, TableCell } from '@/components/catalyst'
import { Dialog, DialogTitle, DialogDescription, DialogBody, DialogActions } from '@/components/catalyst'
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem } from '@/components/catalyst'
import { Input, InputGroup } from '@/components/catalyst'
import { Sidebar, SidebarItem, SidebarSection, SidebarLabel } from '@/components/catalyst'
```

**Available components:** Alert · AuthLayout · Avatar · Badge · Button · Checkbox · Combobox · DescriptionList · Dialog · Divider · Dropdown · Fieldset · Heading · Input · Link · Listbox · Navbar · Pagination · Radio · Select · Sidebar · SidebarLayout · StackedLayout · Switch · Table · Text · Textarea

**Rules:**
- Prefer Catalyst components over hand-rolling new UI primitives.
- Catalyst components live in `src/components/catalyst/` and are owned by this project (copy-paste model — no npm package). Edit them freely.
- Existing `src/components/ui/` components remain in place. When redesigning a screen, prefer Catalyst as the baseline.
- Catalyst's `Link` is wired to Next.js `next/link` — use it for all client-side navigation.
- No extra npm dependencies: `@headlessui/react`, `clsx`, `next/link`, and `react` are the only imports.

---

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
- **Step 0 — Gap check (before any work):** Read `docs/log/_index.md` to find the date of the most recent log entry. Run `git log --since=YYYY-MM-DD --oneline` for that date. If commits exist that are not yet logged, create retroactive session logs for that unlogged work before starting new work. This keeps the audit trail continuous even when documentation was skipped at session end.
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
7. **Open questions** — update `docs/open-questions.md`: add new questions discovered during implementation; mark questions resolved (with reference to the resolving decision or ADR).
8. **Project journal** — append a narrative entry to `docs/project-journal.md` at the end of each session capturing the strategic context, key decisions made, and why they were made.
9. **Jira** — implementation work is tied to a SCRUM Story. At session start, identify or create the Story, transition it to **In Progress**, and record its key in the session-log front-matter. During the session, tick off acceptance-criteria checkboxes as they complete. At session close, post a Story comment with a one-paragraph summary and the commit SHA(s), then transition to **Done** if fully shipped. When an ADR is accepted, add a confirming comment to its linked Story. When new scope surfaces, create a Story under the correct Epic with `sys:*`, `concern:*`, and `adr-NNN` labels per the [Jira Playbook](https://samyhamad.atlassian.net/wiki/spaces/INTELLIOS/pages/2752514). Meta/governance sessions (CLAUDE.md edits, ADR authoring, documentation-only work) use the ADR + session log as sufficient evidence and do not require a Story.
10. **Confluence** — the [Intellios space](https://samyhamad.atlassian.net/wiki/spaces/INTELLIOS) mirrors the repo for human browsing. When a repo doc changes during a session (spec, ADR status, roadmap, journal entry), update the corresponding Confluence page in the same session — the repo commit and the Confluence edit belong together. New ADRs get a new child page under the ADR index; accepted ADRs have their status flipped on the page. Bump the Intellios Home "Last sync" line at session close.

Do not commit code without committing the corresponding documentation update in the same commit or an immediately following one. Do not close a session without the Jira comment and any Confluence mirrors in place. The policy for these additions is recorded in [ADR-029](docs/decisions/029-jira-confluence-evidence-mandate.md).

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
