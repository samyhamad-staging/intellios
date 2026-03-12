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
| OQ-006 | Blueprint Review UI routing and access | Separate pages: `/blueprints/[id]` = Studio; `/registry/[agentId]` = review interface (Review tab visible when `in_review`). Queue at `/review`. "Request changes" stores comment, moves `in_review → draft`. Approved ABPs can only be deprecated (no re-review). See blueprint-review-ui.md. | 2026-03-12 |
| OQ-003 | Error handling strategy | Standard format `{ code, message, details? }` implemented in `src/lib/errors.ts`. `apiError(code, message)` + `aiError(err)` helpers cover all 15 routes. Claude API errors (rate limit, auth, timeout) produce specific `AI_RATE_LIMIT` / `AI_ERROR` codes at 429/502. Governance remediation degrades gracefully (returns violations without suggestions). No retry logic for MVP — transient failures return errors immediately. | 2026-03-12 |
| OQ-008 | Generation Engine quality validation | No separate quality validation layer for MVP. `generateObject` + Zod `ABPContentSchema` ensures structural validity. Claude generates comprehensive ABPs from rich intake data — in practice, generated blueprints are substantive (validated against 2 real agents). Human review (Blueprint Review UI) is the quality gate. Arbitrary thresholds (min instruction length, etc.) deferred until there is evidence of generation quality failures. No auto-retry for MVP. | 2026-03-12 |
