# Intellios — Open Questions

Live tracker of unresolved questions that must be answered before or during implementation. Questions are removed when resolved (with a reference to the ADR or decision that resolved them).

---

## Critical — Blocks Implementation

_None. MVP is complete._

---

## Medium — Nice to Resolve Early

_None._

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
| OQ-007 | ABP schema evolution strategy | Migrate-on-read via `readABP()` + `migrateABP()` + `detectVersion()` (H1-3). Old ABPs transparently upgraded when read. No forced migration. Registry owns migration. | 2026-04-01 |
| OQ-005 | Agent Registry: table relationship, version model, uniqueness | `agent_blueprints` is the registry. Separate rows per version. `agent_id` UUID is the logical agent key (uniqueness by UUID, not name). See agent-registry.md Implementation. | 2026-03-12 |
| OQ-001 | Governance policy expression language | Structured `{ field, operator, value, severity, message }` rules. 11 operators. `condition` field dropped. Policy schema advances to v1.1.0. See ADR-005. | 2026-03-12 |
| OQ-004 | Governance Validator trigger + lifecycle placement | Validation auto-runs after generation (stored in `validation_report`). Blueprint always stored. `draft → in_review` blocked on error violations. Manual re-validation via POST `/validate`. | 2026-03-12 |
| OQ-006 | Blueprint Review UI routing and access | Separate pages: `/blueprints/[id]` = Studio; `/registry/[agentId]` = review interface (Review tab visible when `in_review`). Queue at `/review`. "Request changes" stores comment, moves `in_review → draft`. Approved ABPs can only be deprecated (no re-review). See blueprint-review-ui.md. | 2026-03-12 |
| OQ-003 | Error handling strategy | Standard format `{ code, message, details? }` implemented in `src/lib/errors.ts`. `apiError(code, message)` + `aiError(err)` helpers cover all 15 routes. Claude API errors (rate limit, auth, timeout) produce specific `AI_RATE_LIMIT` / `AI_ERROR` codes at 429/502. Governance remediation degrades gracefully (returns violations without suggestions). No retry logic for MVP — transient failures return errors immediately. | 2026-03-12 |
| OQ-008 | Generation Engine quality validation | No separate quality validation layer for MVP. `generateObject` + Zod `ABPContentSchema` ensures structural validity. Claude generates comprehensive ABPs from rich intake data — in practice, generated blueprints are substantive (validated against 2 real agents). Human review (Blueprint Review UI) is the quality gate. Arbitrary thresholds (min instruction length, etc.) deferred until there is evidence of generation quality failures. No auto-retry for MVP. | 2026-03-12 |
| OQ-002 | Authentication and multi-tenancy | Explicitly deferred post-MVP. Auth is not part of the MVP scope — the goal was to validate the core pipeline loop (intake → generate → govern → review), which is complete. `enterprise_id` in `intake_sessions` and `governance_policies` is a placeholder for future tenant isolation. Authentication method, multi-tenancy model, and role structure are the first design decisions for Post-MVP Phase 1. | 2026-03-12 |
