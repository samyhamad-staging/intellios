# Intellios — Project Journal

A narrative record of how this project has evolved over time. Written retrospectively at the end of each session to capture strategic context, reasoning, and the arc of development — things that are not visible from code commits or action logs alone.

---

## Session 001 (continued) — 2026-03-12: MVP Completion

### Governance Validator

The governance policy expression language (OQ-001) was the central design question. Three options were evaluated:

- **Structured `{ field, operator, value, severity, message }` rules** (chosen): Deterministic, easy to author in JSON, exhaustive coverage with 11 operators. Requires no AI at evaluation time — pure logic.
- **JSON Logic**: A proven standard with libraries, but introduces an external dependency and is harder for non-technical policy authors to write.
- **Claude-evaluated rules**: Natural language rules interpreted by Claude at runtime. Maximum flexibility, but non-deterministic (same rule can produce different results on reruns) and slow.

The determinism requirement was decisive. Governance is a gate — its output must be reproducible. Structure was chosen.

The validator architecture is a two-pass pipeline: (1) deterministic rule evaluation — pure TypeScript, no AI; (2) Claude-powered remediation suggestion — a single batched `generateObject` call that enriches all violations simultaneously. This keeps the evaluation correct and the suggestions helpful, without coupling correctness to AI availability.

OQ-004 (when to validate) was resolved as: automatic validation runs after generation, blueprint always stored regardless of violations, and the `draft → in_review` status transition is gated on zero error-severity violations. This lets designers iterate on the blueprint while seeing governance feedback in real time.

### Agent Registry

The Agent Registry question was primarily OQ-005: separate registry table, or is `agent_blueprints` the registry? Separate tables are cleaner conceptually but add join complexity for every query. Evolving `agent_blueprints` means the registry is always co-located with the ABP data.

The decision: `agent_blueprints` IS the registry. A new `agent_id` UUID field groups versions of the same logical agent. The lifecycle state machine (`draft → in_review → approved/rejected → deprecated`) is enforced at the API layer. `selectDistinctOn` (PostgreSQL-specific) gives latest-per-agent queries in a single scan.

### Blueprint Review UI

The last component required resolving OQ-006: page architecture. The decision was to keep the generation Studio (`/blueprints/[id]`) and the formal review interface (`/registry/[agentId]`) as separate pages. The Studio is for designers iterating on a blueprint. The registry detail page is for reviewers making formal decisions.

The Review tab on the registry detail page appears only when `status === "in_review"`, with an amber dot indicator. "Request changes" (the most nuanced action) stores a reviewer comment and moves the blueprint back to `draft` — the designer receives the feedback, refines in the Studio, and resubmits. This keeps the editorial loop tightly defined without requiring a separate comment thread or notification system.

### MVP Success Criteria — All Met

All 5 P0 components are complete and the build verifies cleanly (22 routes):

1. ✓ Enterprise user provides requirements through the Intake Engine
2. ✓ Generation Engine produces a valid ABP from those requirements
3. ✓ Governance Validator checks the ABP against governance policies
4. ✓ ABP is stored in the Agent Registry with versioning
5. ✓ Human reviewer can view and approve/reject via the Blueprint Review UI

### What the Second Half of Session 001 Added

The first half established the knowledge system and first two components (Intake + Generation). The second half completed the pipeline: Governance Validator, Agent Registry, Blueprint Review UI. Total session: ~177 actions, ~3 commits (knowledge system improvements, Governance Validator, Blueprint Review UI). The MVP loop is fully demonstrable.

### What Remains (Post-MVP)

Four open questions remain from the OQ tracker:

- **OQ-002** (authentication/multi-tenancy): Deferred intentionally. The DB schema has `enterprise_id` placeholders but no enforcement. The right time to address this is when a second enterprise needs to use the system.
- **OQ-003** (error handling strategy): All routes return basic `{ error: "..." }` messages. A structured error format (`{ code, message, details }`) would improve frontend UX and observability.
- **OQ-007** (ABP schema evolution): Only one schema version (v1.0.0) exists. Migration strategy deferred until v1.1.0 is needed.
- **OQ-008** (generation quality): Generated ABPs pass Zod schema validation but semantic quality (instruction richness, tool config completeness) is not checked. Quality validation would improve generated output.

---

## Session 001 — 2026-03-12

### The Problem Being Solved

Intellios started with a clear product vision: enterprises need a way to create, govern, and deploy AI agents under their own brand and policies without building the underlying infrastructure from scratch. The core insight is that agent design is a structured problem — requirements can be captured systematically, blueprints can be generated and validated against policy, and the entire lifecycle can be managed through a governed workflow.

The first session was not about writing application code. It was about establishing the foundation that everything else would be built on: a knowledge management system, a canonical artifact definition (the ABP), and a shared vocabulary.

### How the Knowledge System Was Designed

The first architectural decision was where to keep project knowledge. Three options were evaluated:

- **External wiki** (Notion, Confluence): Good for human reading, but not version-controlled with the code; divergence is inevitable; no first-class Git integration.
- **Database-backed system**: Queryable and programmable, but requires infrastructure before anything else exists; excessive for the current scale; harder to review in pull requests.
- **Git-native structured docs** (chosen): Markdown + JSON Schema files in the repository. Every change is a commit. Docs and code are always at the same revision. Claude can read and write them with the same tools used for code.

This choice shaped the entire project's working style. Claude operates primarily by reading `CLAUDE.md` at the start of each session to re-establish context, then reading relevant specs and ADRs before taking action. The human reviewer (Samy) approves decisions recorded as ADRs.

### Defining the Agent Blueprint Package

The ABP is the central artifact of Intellios. Getting its schema right early was critical because every other subsystem either produces or consumes it. The v1.0.0 schema established the following sections:

- **`identity`**: What the agent is (name, description, persona, branding)
- **`capabilities`**: What the agent can do (tools, instructions, knowledge sources)
- **`constraints`**: What the agent is limited to (domains, denied actions, rate limits)
- **`governance`**: How the agent is governed (policies, audit config)

A key design principle: the schema separates **content** (what Claude generates) from **metadata** (what the system assigns — ID, version, timestamps, status). This prevents Claude from hallucinating system-assigned values during generation.

### The 15 Open Questions

After the initial knowledge system was established, 15 open questions had been identified across all 5 component specs. Samy answered all 15 in a single session exchange — the highest-value input of the entire session. The decisions included:

- Intake method: conversational UI (not form-based)
- Generation method: Claude API call with structured output (not template-based)
- Storage: PostgreSQL (not NoSQL — relational consistency matters for policy enforcement)
- Versioning: semantic versioning for ABP revisions
- Governance: synchronous validation for MVP (async deferred)

These 15 answers were recorded as ADR-002 (technology stack) and ADR-003 (component behavior).

### Building the Intake Engine

With the foundation established, the Intake Engine was the first component implemented. The key architectural insight was using **Claude tool use for incremental payload construction** rather than processing a single user description at the end of the conversation.

Each tool maps to an ABP schema section. As the user describes their agent in natural language, Claude calls tools (`set_agent_identity`, `add_tool`, `set_constraints`, etc.) to build the payload progressively. This means:
1. The user sees immediate feedback as sections are captured
2. The payload is always in a valid, partially-complete state
3. The intake can be resumed or inspected at any point

The Vercel AI SDK v5 was chosen for streaming. This turned out to be a significant implementation challenge — v5 had a completely redesigned API from v4, and ~12 different breaking changes had to be resolved. The key API differences: `UIMessage` instead of `Message`, `useChat` with `DefaultChatTransport`, `sendMessage` instead of `append`, `convertToModelMessages` for message format conversion, `stepCountIs` for loop termination.

A critical race condition was discovered during code review: when Claude calls multiple tools in a single step (which it frequently does), the tool handlers execute in parallel and race to update the `intake_payload` JSONB column. This was fixed by serializing all payload updates through a promise queue — each update waits for the previous one to complete before reading and writing state.

### Building the Generation Engine

The Generation Engine converts a completed intake payload into a full ABP. Three generation approaches were considered:

- **Tool use**: Claude calls tools to populate each ABP section incrementally. Flexible, but complex to orchestrate and harder to ensure completeness.
- **`generateObject` with Zod schema** (chosen): SDK-level schema enforcement. Claude generates the entire content section in one call. Type-safe, no JSON parsing fragility, schema violations are caught by the SDK.
- **Streaming text + JSON parse**: Simple to implement, but parsing failures are silent and schema drift is hard to catch.

`generateObject` was selected because it enforces correctness at the framework level, not the application level. The schema is the validation — there's no separate validation pass needed.

Refinement uses a full-regeneration pattern: the current ABP, original intake, and requested change are all passed to Claude, which produces a new complete ABP. This is simpler than targeted patching and produces more coherent results (changes can cascade through all sections when appropriate).

### Effort Profile

This session demonstrated the leverage model that Intellios is designed to exemplify: **13 messages from Samy produced 2 fully implemented MVP components, 50+ files, and a complete knowledge system**. The majority of Samy's effort was 15 high-value decisions in a single exchange. Claude's implementation effort was approximately ~143K input / ~79K output tokens (~$2.20 estimated cost).

### What Remains

At the end of Session 001, the Intake Engine and Generation Engine are complete. Three MVP components remain:

- **Governance Validator** — most complex: requires a policy expression language (currently unspecified), rule evaluation engine, and violation reporting
- **Agent Registry** — most straightforward: CRUD with versioning, lifecycle state machine, search
- **Blueprint Review UI** — depends on both Governance Validator (to display validation results) and Agent Registry (to fetch ABPs)

The most significant unresolved architectural question is the governance policy expression language: how are policy rules expressed in a way that is both machine-evaluable and human-readable? This blocks the Governance Validator implementation.

---

*Add new entries at the top of this file (most recent first) after updating this section title and date.*
