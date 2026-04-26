# Intellios — Open Questions

Live tracker of unresolved questions that must be answered before or during implementation. Questions are removed when resolved (with a reference to the ADR or decision that resolved them).

---

## Critical — Blocks Implementation

_None. MVP is complete._

---

## Medium — Nice to Resolve Early

### OQ-012 — AWS Agent Registry overlap with Intellios lifecycle management

**Context:** AWS Agent Registry (Preview, April 9, 2026) ships a governed catalog with draft→pending→approved lifecycle workflow, CloudTrail audit trails, IAM/OAuth access control, versioning, and deprecation. AWS claims it "tracks agents across their entire lifecycle, from initial development through deployment to eventual retirement." First documented in AgentCore Watch 2026-04 (`docs/strategy/agentcore-watch/2026-04.md`). Overlap assessment: axis (c) ~20% — at threshold.

**Question:** Does AWS Agent Registry's approval workflow + lifecycle tracking represent a competitive threat to Intellios's Agent Registry subsystem and Blueprint Review UI, or does the depth gap (SOD enforcement, multi-step approval chains, evidence package, 8-stage lifecycle arc, design-time governance) preserve sufficient differentiation to continue positioning Intellios as the governed control plane above the registry layer?

**Options:**
1. **Complementary framing** — Position AWS Agent Registry as the *catalog/discovery* layer (what exists) and Intellios as the *governance/lifecycle* layer (how it gets there and what evidence it leaves). Intellios wraps or ingests AWS Registry records rather than competing with them.
2. **Depth differentiation** — Emphasize the features AWS doesn't have: SOD, multi-step approval, evidence package, design-time blueprint governance. Accept that the surface areas overlap but argue the depth does not.
3. **Strategic concern** — AWS Registry is in Preview; its GA feature set may add the depth gaps. Treat this as a leading indicator of full lifecycle management competition and accelerate the evidence package (ADR-015) as the most defensible differentiator.

**Owner:** Architect.  
**Review date:** 2026-05-23 (or after AWS Agent Registry GA announcement, whichever comes first).

---

### OQ-011 — AgentCore Policy/Evaluations overlap with Intellios's Governance Validator

**Context:** AgentCore Policy (GA March 3, 2026) provides Cedar/natural-language policy authoring, runtime tool-call interception, RBAC via OAuth JWT, and Evaluations (pre-deployment quality scoring: correctness, helpfulness, tool selection accuracy, safety, goal success). First documented in AgentCore Watch 2026-04 (`docs/strategy/agentcore-watch/2026-04.md`). Overlap assessment: axis (b) ~25% — above 20% material threshold.

**Question:** Does AgentCore Policy's Evaluations feature (pre-deployment quality testing) materially subsume Intellios's Governance Validator differentiator, or do the layer distinctions (Intellios validates policy compliance at blueprint design time; AgentCore Policy enforces tool access at runtime; Evaluations scores quality, not policy conformance) preserve the differentiation?

**Specifically:** (a) Should Intellios explicitly position its governance as *complementary* to AgentCore Policy (governance happens before deployment in Intellios; tool-access enforcement happens at runtime in AgentCore)? (b) Does the runtime-vs-design-time distinction actually resonate with enterprise buyers, or do they perceive it as duplication? (c) Is "cross-runtime governance" (Intellios works on any runtime, not just AgentCore) the more durable framing?

**Owner:** Architect.  
**Review date:** 2026-05-23.

---

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
| OQ-009 | Evidence-package PDF renderer stack | **Option 2 — Headless Chromium via `playwright-core` + `@sparticuz/chromium-min`.** Reuses the existing HTML report shell at `src/app/blueprints/[id]/report/page.tsx` (1,230 lines, Tailwind `print:` variants integrated). `@sparticuz/chromium-min` keeps the function under Vercel's 250MB limit by loading a slim binary from a hosted URL on cold start. Determinism risk mitigated by S3 caching at `evidence/{id}/{version}.pdf` (write-once, render-once-per-version). Reversibility: route auth/status/S3/audit logic is renderer-agnostic; switching to pdf-lib later changes only `renderEvidencePDF()`. See ADR-015 + [Session 172 log](log/2026-04-25_session-172.md). | 2026-04-25 |
| OQ-010 | RETURN_CONTROL tool-mock service for Test Console | Keep synthetic marker (option 2). ADR-027 establishes the synthetic marker as canonical — building a mock service would blur the "governed test harness, not a runtime" positioning for non-trivial cost. Enterprises needing full tool round-trips should use real action-group endpoints outside Test Console. | 2026-04-23 |
| OQ-007 | ABP schema evolution strategy | Migrate-on-read via `readABP()` + `migrateABP()` + `detectVersion()` (H1-3). Old ABPs transparently upgraded when read. No forced migration. Registry owns migration. | 2026-04-01 |
| OQ-005 | Agent Registry: table relationship, version model, uniqueness | `agent_blueprints` is the registry. Separate rows per version. `agent_id` UUID is the logical agent key (uniqueness by UUID, not name). See agent-registry.md Implementation. | 2026-03-12 |
| OQ-001 | Governance policy expression language | Structured `{ field, operator, value, severity, message }` rules. 11 operators. `condition` field dropped. Policy schema advances to v1.1.0. See ADR-005. | 2026-03-12 |
| OQ-004 | Governance Validator trigger + lifecycle placement | Validation auto-runs after generation (stored in `validation_report`). Blueprint always stored. `draft → in_review` blocked on error violations. Manual re-validation via POST `/validate`. | 2026-03-12 |
| OQ-006 | Blueprint Review UI routing and access | Separate pages: `/blueprints/[id]` = Studio; `/registry/[agentId]` = review interface (Review tab visible when `in_review`). Queue at `/review`. "Request changes" stores comment, moves `in_review → draft`. Approved ABPs can only be deprecated (no re-review). See blueprint-review-ui.md. | 2026-03-12 |
| OQ-003 | Error handling strategy | Standard format `{ code, message, details? }` implemented in `src/lib/errors.ts`. `apiError(code, message)` + `aiError(err)` helpers cover all 15 routes. Claude API errors (rate limit, auth, timeout) produce specific `AI_RATE_LIMIT` / `AI_ERROR` codes at 429/502. Governance remediation degrades gracefully (returns violations without suggestions). No retry logic for MVP — transient failures return errors immediately. | 2026-03-12 |
| OQ-008 | Generation Engine quality validation | No separate quality validation layer for MVP. `generateObject` + Zod `ABPContentSchema` ensures structural validity. Claude generates comprehensive ABPs from rich intake data — in practice, generated blueprints are substantive (validated against 2 real agents). Human review (Blueprint Review UI) is the quality gate. Arbitrary thresholds (min instruction length, etc.) deferred until there is evidence of generation quality failures. No auto-retry for MVP. | 2026-03-12 |
| OQ-002 | Authentication and multi-tenancy | Explicitly deferred post-MVP. Auth is not part of the MVP scope — the goal was to validate the core pipeline loop (intake → generate → govern → review), which is complete. `enterprise_id` in `intake_sessions` and `governance_policies` is a placeholder for future tenant isolation. Authentication method, multi-tenancy model, and role structure are the first design decisions for Post-MVP Phase 1. | 2026-03-12 |
