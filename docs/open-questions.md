# Intellios — Open Questions

Live tracker of unresolved questions that must be answered before or during implementation. Questions are removed when resolved (with a reference to the ADR or decision that resolved them).

---

## Critical — Blocks Implementation

_None. MVP is complete._

---

## Medium — Nice to Resolve Early

### OQ-009 — Evidence-package PDF renderer stack

**Context:** ADR-015 (2026-04-09) commits Intellios to shipping a server-side PDF renderer on `GET /api/blueprints/[id]/evidence-package.pdf` alongside the existing JSON export. The reference implementation lives at `samples/build_evidence_pdf.py` (reportlab, Python) and defines the target layout. The production renderer must live in the Next.js app (TypeScript).

**Question:** Which rendering stack should the production route use?

**Options:**
1. **Node-native PDF library** — `pdf-lib` or `pdfkit`. Full programmatic control, deterministic output, small bundle impact, long-term maintenance ours. High implementation cost — every page builder, table, code block, and chip must be recreated in TypeScript.
2. **Headless Chromium via Playwright** — reuse the existing HTML report shell at `src/app/blueprints/[id]/report/page.tsx` with a dedicated print stylesheet, print to PDF in a headless browser. Lower implementation cost (most layout already exists in React), but large deploy-size + memory footprint, cold-start latency, and a moving-target dependency.
3. **Puppeteer** — same trade-offs as Playwright; marginally lighter but similar footprint.

**Trade-offs to weigh:**
- Vercel / serverless function size limits (headless Chromium is tight against the 250 MB limit).
- Cold-start latency on the evidence-package export endpoint (acceptable if the result is cached to `evidence/{id}/{version}.pdf` and served on re-export).
- Sync with the HTML report: option 2 keeps one source of truth; option 1 requires two renderers to stay in sync as `MRMReport` evolves.
- Deterministic byte-identical output across environments (easier with option 1, brittle with headless browsers across versions).

**Target resolver:** founder + whoever implements the route. Target timing: before the next design-partner pilot where the PDF will be shown as a product output rather than a sample.

---

### OQ-010 — RETURN_CONTROL tool-mock service for Test Console

**Context:** ADR-027 (2026-04-18) ships the Test Console as a governed *test* harness, not a runtime. One guardrail of that framing is that `RETURN_CONTROL` responses from Bedrock (where the agent asks the caller to execute a tool and return the result) are rendered as a synthetic `[tool call simulated — invoked: X]` chunk rather than actually invoking the tool. That is correct for positioning, but it makes end-to-end tool exercises in Test Console structurally impossible — a reviewer can confirm the agent *wants* to call a tool, but cannot see what the agent does *after* the tool returns data.

**Question:** Should Intellios ship a built-in "tool mock service" — a small stub HTTP endpoint per tool name declared in the ABP, returning canned or fixture-driven responses — so that Test Console can complete a full reasoning loop including tool round-trips?

**Options:**
1. **Ship a tool-mock service.** Per-ABP fixture file (`tool-mocks/{agentId}.json`) keyed by tool name, returning deterministic JSON. Test Console invocation loop feeds the mock response back into `InvokeAgent` via the same `sessionId`. Pros: demo becomes visceral — reviewers see the whole loop. Cons: blurs the "not a runtime" positioning; non-trivial implementation cost (fixture format, UI for setting fixtures, schema validation against ABP `tools[]`); the fixtures themselves become an additional surface that can drift from production tool contracts.
2. **Ship nothing; keep the synthetic marker.** Tool exercises happen in the enterprise's own runtime (AgentCore with real action-group endpoints), not in Test Console. Reviewers sign off on the *intent* to call a tool; post-deploy evidence of the actual call lives in CloudWatch traces. Pros: preserves positioning cleanly; zero additional surface. Cons: demo feels incomplete — the control-plane story ends mid-loop.
3. **Defer to enterprise.** Publish a "tool mock example" as a separate GitHub project or cookbook; Test Console stays synthetic-marker-only. Pros: lets the pattern evolve with enterprise feedback; no product-surface risk. Cons: harder to demo until enterprises build their own.

**Trade-offs to weigh:**
- How much of the lifecycle demo's impact depends on the full tool round-trip vs. the governance story? (Bias says: governance story carries — tool-call intent is enough for reviewers.)
- What's the failure mode if a mock fixture diverges from the production action-group contract? (The mock gets stale; reviewers approve behavior that doesn't match production. Guardrail: fixtures must be marked "FOR TEST CONSOLE ONLY" and never influence governance/approval artifacts.)
- Is this really a Test Console problem or a `/docs/specs/blueprint-test-harness.md` (ADR-007) problem? ADR-007 defines a richer test harness concept that may be the right home for tool mocks.

**Target resolver:** founder + whoever runs the first design-partner demo. Target timing: resolve before session 160, ideally in the post-session-158-rehearsal retrospective.

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
