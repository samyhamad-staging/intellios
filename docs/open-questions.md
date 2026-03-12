# Intellios — Open Questions

Live tracker of unresolved questions that must be answered before or during implementation. Questions are removed when resolved (with a reference to the ADR or decision that resolved them).

---

## Critical — Blocks Implementation

---

### OQ-002 · Authentication and multi-tenancy model

**Component:** All (cross-cutting)
**Blocks:** Any production-readiness work; shapes database schema for tenant isolation
**Raised:** 2026-03-12 (Session 001, knowledge system audit)

The current implementation has no authentication. `enterprise_id` is stored in `intake_sessions` and `governance_policies` as a plain text field with no enforcement. There is no concept of users, roles, or session ownership.

**Questions to resolve:**
1. Authentication method for MVP: NextAuth.js, Clerk, Supabase Auth, or custom?
2. Multi-tenancy model: row-level security (RLS) in PostgreSQL, or application-level filtering?
3. For MVP: single enterprise (no multi-tenancy) or must multiple enterprises be isolated?
4. User roles: single reviewer role (per ADR-003) is decided for Blueprint Review UI — does the same apply to intake and generation?

**Decision needed from:** Samy (scope call — is auth in or out of MVP?)

---

## High — Should Resolve Before Building the Affected Component

### OQ-003 · Error handling strategy

**Component:** All (cross-cutting)
**Blocks:** Production-grade implementation of any component
**Raised:** 2026-03-12 (Session 001, knowledge system audit)

No spec defines error handling behavior. Currently:
- API routes return generic 500 errors with `{ error: "..." }` messages
- No error codes that the UI can act on programmatically
- No distinction between user errors (4xx) and system errors (5xx)
- No retry guidance for transient failures (e.g., Claude API timeouts)

**Questions to resolve:**
1. Standard error response format? (e.g., `{ code: string, message: string, details?: object }`)
2. Which errors should be surfaced to the end user vs. logged silently?
3. Retry behavior for Claude API calls: exponential backoff? How many retries?
4. How are partial failures handled (e.g., tool handler fails mid-intake)?

---

---

### OQ-006 · Blueprint Review UI routing and access

**Component:** Blueprint Review UI
**Blocks:** Blueprint Review UI implementation
**Raised:** 2026-03-12 (Session 001, knowledge system audit)

The current `src/app/blueprints/[id]/page.tsx` serves as a preview immediately after generation. It is not a formal review interface.

**Questions to resolve:**
1. Is the generation preview (`/blueprints/[id]`) the same as the review interface, or are they separate pages with different permissions?
2. How does a reviewer discover ABPs pending review — a queue page, a notification, a direct link?
3. What does "request changes" result in: a new intake session, a refinement pass, or a free-text comment for the generator to act on?
4. Is the review decision (approve/reject) the terminal state, or can an approved ABP be revoked?

---

## Medium — Nice to Resolve Early

### OQ-007 · ABP schema evolution strategy

**Component:** Core artifact
**Raised:** 2026-03-12 (Session 001, knowledge system audit)

The ABP schema changelog notes no migration strategy for ABPs stored under an older schema version. For MVP this is not urgent (only one schema version exists), but it becomes a problem as soon as v1.1.0 is defined.

**Questions to resolve:**
1. Are old ABPs migrated on read (schema-forward compatibility), on write (forced migration), or stored forever at their original version?
2. Who is responsible for migration: the Agent Registry, the application layer, or a separate migration job?

---

### OQ-008 · Generation Engine quality validation

**Component:** Generation Engine
**Raised:** 2026-03-12 (Session 001, knowledge system audit)

Generated ABPs are not quality-checked beyond Zod schema validation. A generated ABP can be schema-valid but semantically poor (e.g., empty instructions string, placeholder tool configurations).

**Questions to resolve:**
1. Should the Generation Engine validate content quality (e.g., minimum instruction length, non-empty tool configs)?
2. If the generated ABP fails quality checks, should it automatically retry with a more specific prompt?
3. What are the quality thresholds? (Is 50-word instructions acceptable? 200?)

---

## Resolved

| # | Question | Resolution | Date |
|---|---|---|---|
| — | Intake method (conversational vs. form) | Conversational (ADR-002) | 2026-03-12 |
| — | Generation method (template vs. AI) | Claude generateObject (ADR-002, ADR-003) | 2026-03-12 |
| — | Storage backend | PostgreSQL (ADR-002) | 2026-03-12 |
| — | ABP versioning scheme | Semantic versioning (ADR-003) | 2026-03-12 |
| — | Governance: sync vs. async | Synchronous for MVP (ADR-003) | 2026-03-12 |
| — | Blueprint editing by reviewer | Request changes only, no direct editing (ADR-003) | 2026-03-12 |
| — | ABP deletion | Deprecation only, no hard/soft delete (ADR-003) | 2026-03-12 |
| — | Frontend framework | Next.js App Router (ADR-004) | 2026-03-12 |
| — | ORM | Drizzle (ADR-004) | 2026-03-12 |
| — | AI SDK | Vercel AI SDK v5 (ADR-004) | 2026-03-12 |
| OQ-005 | Agent Registry: table relationship, version model, uniqueness | `agent_blueprints` is the registry. Separate rows per version. `agent_id` UUID is the logical agent key (uniqueness by UUID, not name). See agent-registry.md Implementation. | 2026-03-12 |
| OQ-001 | Governance policy expression language | Structured `{ field, operator, value, severity, message }` rules. 11 operators. `condition` field dropped. Policy schema advances to v1.1.0. See ADR-005. | 2026-03-12 |
| OQ-004 | Governance Validator trigger + lifecycle placement | Validation auto-runs after generation (stored in `validation_report`). Blueprint always stored. `draft → in_review` blocked on error violations. Manual re-validation via POST `/validate`. | 2026-03-12 |
