# Intellios — Product Roadmap

**Vision:** The governed control plane for enterprise AI agents — own design, governance, lifecycle, and observability. Execution happens on cloud provider runtimes. The value is the governance wrapper, not the compute.

**Last updated:** 2026-04-18 (Session 157 — Lifecycle Closure: invokeAgent + Test Console + retirement + ADR-027)

---

## Phase 3 — Lifecycle Closure (Session 157 complete; Session 158 pending live smoke)

**Goal:** close the two gaps blocking a credible end-to-end 8-stage lifecycle demo against real AWS AgentCore — runtime execution and retirement. Preserve the "governed control plane, not a runtime" positioning by framing the new invocation surface as a *test harness* (ADR-027).

### ✓ Session 157 (2026-04-18) — Runtime-execution + retirement closure

- `src/lib/agentcore/invoke.ts` — `invokeAgent()` adapter over `BedrockAgentRuntimeClient.InvokeAgentCommand`, returning `AsyncIterable<string>` of response chunks. RETURN_CONTROL rendered as synthetic `[tool call simulated — invoked: X]` marker (no real tool execution per ADR-027 guardrail).
- `POST /api/registry/[agentId]/invoke` — streaming route, reviewer/compliance_officer/admin only, 10/min per-actor rate limit, prompt-hash (SHA256-16) audit row, in-stream `[error:CODE]` markers on failure.
- `/registry/[agentId]/test` — Test Console page (Catalyst primitives + `ui/badge`), client-only `crypto.randomUUID()` sessionId, "Test harness — not a production runtime" banner, invokability gate on `status === "deployed" && deploymentTarget === "agentcore"`.
- `src/lib/agentcore/deploy.ts` — `retireFromAgentCore(deployment, actor)` issuing `DeleteAgentCommand` + poll-to-404 / 30s timeout; idempotent on `ResourceNotFoundException`. Hooked into `PATCH /api/blueprints/[id]/status` on the `deprecated` transition (best-effort, never blocks status change).
- **ADR-027** — Test Console as governed test harness (six guardrails: reviewer+ gate, rate limit, no server-side transcript, audit every invoke, no RETURN_CONTROL execution, explicit UI framing).
- `docs/demo/lifecycle-demo.md` — 8-stage Retail Bank Customer-FAQ walkthrough with per-stage fallback paths + troubleshooting matrix.
- Zero new typecheck errors; test suite unchanged (invokeAgent adapter is thin enough that a mock-only test would test SDK wiring, not product behavior — real confidence signal is the session-158 live smoke).

### ⋯ Session 172 (2026-04-25) — Epic 1.2 PDF Renderer kickoff (pre-validation)

- ✅ OQ-009 resolved Option 2 — headless Chromium via `playwright-core` + `@sparticuz/chromium-min` (see `docs/open-questions.md`).
- ✅ `src/lib/pdf/evidence-template.ts` — full HTML template, 14 MRM sections + 3 wrapper sections.
- ✅ `src/lib/pdf/render-evidence.ts` — Chromium launcher with serverless / local fallback.
- ✅ `src/app/api/blueprints/[id]/evidence-package/pdf/route.ts` — new route, mirrors JSON route's auth/status/audit/S3 pattern.
- ✅ `src/components/mrm/download-evidence-pdf-button.tsx` — primary action sibling to JSON button; wired into Blueprint report toolbar and Registry detail panel.
- ✅ `src/package.json` adds `@sparticuz/chromium-min ^131.0.1` and `playwright-core ^1.59.1`.
- ✅ `src/.env.example` documents `CHROMIUM_REMOTE_EXECUTABLE_URL`.
- ⏸ ADR-015 stays `proposed` — pending live render on Samy's dev machine + Vercel.
- 🔲 Next session: `npm install`, host the slim Chromium binary at a public URL, render the Retail Bank blueprint (`ed34ef1a`), visually compare to `samples/evidence-package-claims-triage-agent-v2.1-2026-04-09.pdf`, transition SCRUM-38 / SCRUM-42 in Jira, four-surface flip ADR-015, Confluence sync.

---

### ⋯ Session 158 (pending) — Live AWS smoke + demo rehearsal

- One-time live smoke deploy against a sandbox AWS account with a Bedrock execution role — validates `deploy.ts` + `translate.ts` + `invoke.ts` + `retireFromAgentCore` against the real Bedrock API contract end-to-end.
- ✅ `scripts/seed-demo.ts` — Retail Bank demo enterprise + 3 personas + 3 policies (session 158 bootstrap; shim at `scripts/seed-demo.ts`, logic at `src/lib/db/seed-retail-bank.ts`). Still pending: seed the `executionRoleArn` for the sandbox Bedrock role.
- Demo rehearsal + screen recording once live smoke is green.
- Resolve OQ-010 (RETURN_CONTROL tool-mock service — build/defer/publish-as-cookbook).

---

## ✓ Session 145 Complete (2026-04-08) — Contrast Token Cleanup (WCAG AA)

Shifted text color scale one Tailwind step to achieve WCAG AA compliance for all text tokens. Resolves accessibility findings A-01 and A-03.

**Changes:**
- ✅ Light secondary: slate-500 → slate-600 (#475569, 7.58:1)
- ✅ Light tertiary: slate-400 → slate-500 (#64748b, 4.76:1)
- ✅ Dark secondary: slate-400 → slate-300 (#cbd5e1, 12.02:1)
- ✅ Dark tertiary: slate-500 → slate-400 (#94a3b8, 6.96:1)
- ✅ shadcn compat aliases + chart-tokens.ts synced
- ✅ ADR-014 written

**Impact:** Zero class-name changes. 1,380 usages across 103+ files inherit new values automatically via CSS custom properties.

---

## ✓ Session 144 Complete (2026-04-08) — SOD Enforcement Gap Fix

Fixed the Separation of Duties enforcement gap discovered in Session 141. The legacy single-step approval path in `PATCH /api/blueprints/[id]/status` now enforces `createdBy ≠ approver` unless the enterprise explicitly opts out via `allowSelfApproval`.

**Changes:**
- ✅ Hoisted SOD check above approval-chain branch in status route
- ✅ 2 new test cases + 1 modified (56 → 58 blueprint lifecycle cases)
- ✅ ADR-013 written

**Test count:** 552 + 2 = **554 total tests**

**Findings resolved:**
- ~~SOD enforcement gap: legacy single-step mode in `/status` route does not enforce creator≠approver~~ → **Fixed (ADR-013)**

---

## ✓ Session 143 Complete (2026-04-08) — Test Coverage Expansion Session C (PLAN COMPLETE)

Final session of the 3-session test expansion plan. Intake finalization route tests + vitest config + full suite verification.

**Intake Finalization Tests (WP-5) — 12 cases:**
- ✅ POST /api/intake/sessions/[id]/finalize — 12 cases (happy path, 404, 409 already-finalized, 3 payload validation, auth, enterprise scope, audit, events, designer role)

**Vitest Config:**
- ✅ Coverage tracking expanded from 5 lib modules to `lib/**` + `app/api/**`
- ✅ Thresholds set to 60% lines/functions (realistic for current state)

**Full Verification:** 135 new cases across 4 files, all passing.

**3-Session Plan Final Tally:**

| Session | Cases | Routes |
|---------|-------|--------|
| A (141) | 56 | 5 blueprint lifecycle routes |
| B (142) | 67 | 7 governance + 7 auth routes |
| C (143) | 12 | 1 intake finalization route |
| **Total** | **135** | **22 API routes** |

**Test count:** 417 + 135 = **552 total tests**

---

## ✓ Session 142 Complete (2026-04-08) — Test Coverage Expansion Session B

Governance policy + auth/identity route test suites — 67 new test cases across 13 API routes, completing Session B of the 3-session test expansion plan.

**Governance Policy Tests (WP-3) — 36 cases:**
- ✅ GET /api/governance/policies — 3 cases (list, auth, tenant scope)
- ✅ POST /api/governance/policies — 6 cases (create, roles, validation, audit, events)
- ✅ GET /api/governance/policies/[id] — 5 cases (fetch, 404, enterprise scope isolation)
- ✅ PATCH /api/governance/policies/[id] — 7 cases (version append, role restrictions, transaction, events)
- ✅ DELETE /api/governance/policies/[id] — 6 cases (delete, 404, role restrictions, events)
- ✅ GET /api/governance/policies/[id]/dependents — 3 cases (count, 404, auth)
- ✅ POST /api/governance/templates/[pack]/apply — 6 cases (apply, 404, duplicate 409, force mode, auth, events)

**Auth & Identity Tests (WP-4) — 31 cases:**
- ✅ POST /api/auth/register — 6 cases (registration, duplicate 409, rate limit, validation, bcrypt, gov seed)
- ✅ POST /api/auth/forgot-password — 4 cases (send email, enumeration prevention, rate limit, SHA-256)
- ✅ POST /api/auth/reset-password — 5 cases (valid token, expired 400, P1-SEC-001 transaction, rate limit, bcrypt)
- ✅ POST /api/auth/invite/accept — 6 cases (accept, expired 400, duplicate 409, P1-SEC-002 transaction, rate limit, role)
- ✅ GET /api/admin/api-keys — 2 cases (list strips keyHash, admin-only)
- ✅ POST /api/admin/api-keys — 4 cases (create plaintext-once, admin-only, bcrypt, audit)
- ✅ DELETE /api/admin/api-keys/[id] — 4 cases (revoke, 404, admin-only, audit)

**Test count:** 464 + 67 = **531 total tests**
**API routes with tests:** 21 (up from 8)

**Remaining (Session C):**
- 🔲 Intake finalization tests (~12 cases) + vitest config update + verification + docs

---

## ✓ Session 141 Complete (2026-04-08) — Test Coverage Expansion Session A

Blueprint lifecycle route test suite — the highest-risk untested surface in the codebase. 56 test cases across 5 API routes, backed by 4 reusable test helper modules.

**Test Infrastructure (WP-1):**
- ✅ `mock-db.ts` — Chainable Drizzle ORM mock with configurable result functions
- ✅ `mock-auth.ts` — requireAuth + assertEnterpriseAccess helpers
- ✅ `fixtures.ts` — Blueprint, settings, intake session, validation report factories
- ✅ `route-test-utils.ts` — NextRequest builder, response helpers, async params

**Blueprint Lifecycle Tests (WP-2):**
- ✅ PATCH /status — 33 cases (transitions, role enforcement, SOD, governance gate, test-pass gate, multi-step chains, deployment side-effects, audit logging)
- ✅ POST /review — 9 cases (approve/reject/request_changes, access control, multi-step SOD)
- ✅ POST /validate — 4 cases (happy path, persistence, 404, enterprise scope)
- ✅ POST /deploy/agentcore — 6 cases (happy path, status gate, config gate, AWS failure, 404, scope)
- ✅ POST /blueprints — 5 cases (generate, session checks, enterprise scope, rate limit)

**Test count:** 408 existing + 56 new = **464 total tests**

**Remaining (Sessions B & C):**
- ✅ Session B: Governance policy route tests (36 cases) + auth/identity route tests (31 cases) — COMPLETE
- ✅ Session C: Intake finalization tests (12 cases) + vitest config update + verification + docs — COMPLETE

**Findings:**
- ~~SOD enforcement gap: legacy single-step mode in `/status` route does not enforce creator≠approver~~ → **Fixed in Session 144 (ADR-013)**
- Role naming: `designer` is authenticated but always 403'd on `in_review` transitions (only `architect` passes)
- Truncated source files: `settings/types.ts`, `deploy-route.test.ts`, `package.json` need host-side repair

---

## ✓ Session 139 Complete (2026-04-07) — Autonomous UX Optimization Sprint

Autonomous 6-task UX optimization sprint covering loading states, error boundaries, form validation, copy consistency, and accessibility. 23 new files, 4 modified, 2 audit documents. Zero regressions, zero new dependencies.

**Loading & Error States:**
- ✅ 12 new `loading.tsx` streaming skeleton files for critical dynamic routes
- ✅ 9 new `error.tsx` boundary files with contextual messaging and return links
- ✅ Empty states audited — 7/8 target pages already covered (rescoped)

**Form Validation:**
- ✅ Login page inline email validation with aria-invalid/aria-describedby
- ✅ Register form inline email validation + 4-bar password strength indicator

**Audits:**
- ✅ Copy & Microcopy audit: 8.5/10, 4 issues found, 2 ellipsis fixes applied → `docs/audits/copy-audit-2026-04-07.md`
- ✅ WCAG 2.2 AA accessibility audit: 7.5/10, 11 issues found, 3-phase remediation plan → `docs/audits/a11y-audit-2026-04-07.md`

**Audit remediation (Session 140):**
- ✅ A-04: `scope="col"` on Catalyst TableHeader
- ✅ A-07: Completed truncated `prefers-reduced-motion` block in globals.css
- ✅ A-02: Fixed `text-red-500/60` contrast → `text-red-700 dark:text-red-400`
- ✅ A-06: Added `aria-label` to 6 icon-only buttons
- ✅ Copy Issue 2: Consolidated duplicated STATUS_LABELS (registry + blueprints pages)
- ✅ Copy Issue 3: Added actionable guidance to 2 terse error messages

**Remaining (design decision needed):**
- 🔲 A-01/A-03: `text-text-tertiary` contrast at small text sizes — requires decision on whether to darken the global token or do targeted swaps

---

## ✓ Session 131 Complete (2026-04-06) — Security Remediation Phase 2 — Complete CC Resolution

Completed comprehensive security remediation of all actionable cross-cutting concerns from the 7-phase code review. ~50 files modified, 5 new files created, 4 new test files.

**Security Fixes:**
- **CC-3 (Input Validation)**: ✅ All routes now use `parseBody` + Zod (last straggler: SSO PUT fixed)
- **CC-4 (Audit Logging)**: ✅ 45+ mutation routes across 3 priority tiers now have audit logging
- **CC-7 (Secrets at Rest)**: ✅ AES-256-GCM encryption for webhook secrets via `SECRETS_ENCRYPTION_KEY`
- **CC-9 (RLS Context Leak)**: ✅ `withTenantScopeGuarded` with auto-cleanup, 9 routes migrated
- **CC-6 (Event Reliability)**: 🔲 Post-MVP (requires durable queue infrastructure)

**Test Coverage:**
- `crypto-encrypt.test.ts` — 13 tests for AES-256-GCM module
- `ssrf-validation.test.ts` — 20+ tests for PRIVATE_HOST_RE
- `open-redirect.test.ts` — 15+ tests for callbackUrl sanitization
- `rls-context-guard.test.ts` — 6 tests for withTenantScopeGuarded

---

## ✓ Session 128 Complete (2026-04-05) — Agent Team Formation Audit — Remaining Items

Implemented the final outstanding items from the 12-pass audit. 4 files created, 4 modified. 0 deps, 0 migrations.

- **Guided Workflow Creation Wizard** — 5-step dialog (basics+templates, agent selection, handoff rules with auto-scaffolding, shared context, review) replacing the simple creation dialog. Template selection pre-populates all steps.
- **Inline ABP Field Editing** — Click-to-edit component (7 field types: text, textarea, number, boolean, select, tags, json) with PATCH API (`/api/blueprints/[id]/fields`). Draft-only gate preserves governance audit trail. Integrated into BlueprintView for identity, instructions, and constraints sections.

**Component Status:**
- Workflow Template Library: ✅ MVP (6 static templates + API)
- Agent Comparison: ✅ MVP (multi-select, side-by-side panel)
- Multi-Agent Code Export: ✅ MVP (TypeScript generation + API)
- ABP v1.3.0 Interface: ✅ Schema + changelog
- Execution Engine: 🔲 Schema + types + API surface (orchestrator TODO — H3 milestone)
- Workflow Governance: ✅ MVP (5 policies + drift detection)
- Visual Workflow Builder: ✅ MVP (pure React+CSS/SVG canvas, drag-and-drop, bezier edges)
- Guided Creation Wizard: ✅ MVP (5-step dialog with template support)
- Inline ABP Editing: ✅ MVP (7 field types, PATCH API, draft-only)

---

## ✓ Session 127 Complete (2026-04-05) — Agent Team Formation Audit — Full Implementation

Full implementation of all recommendations from the 12-pass agent team capability audit. 10 files created, 12 modified. 0 deps, 0 migrations.

**Phase 1 — Immediate Quick Wins (7 items):** Glossary (6 workflow terms), workflow detail page (Orchestration Definition banner, Export Definition, improved labels), registry (tab rename to "Orchestrations", New Orchestration dialog, agent count badges), agent detail (orchestration dependency strip), lifecycle controls (deprecation impact warning), dashboard (contextual orchestration prompt), help system (workflow FAQ + suggested questions).

**Phase 2 — Short-term Features (4 items):** Workflow template library (6 enterprise patterns: Sequential Pipeline, Classifier-Router, Supervisor-Delegate, Parallel Analysis, Human-in-the-Loop, Escalation Chain), agent comparison mode (multi-select up to 3, side-by-side panel), multi-agent code export (TypeScript orchestration file via Anthropic SDK), ABP v1.3.0 I/O contracts (inputs, outputs, errors).

**Phase 3 — Medium-term Capabilities (5 items):** Workflow execution DB schema (workflow_executions + workflow_execution_steps + workflow_templates tables), execution type system (statuses, events, extended node types, failure policies), execution API (POST start + GET list), workflow governance (5 built-in policies + drift detection), extended validation (human_review nodes, execution readiness checks).

---

## ✓ Session 126 Complete (2026-04-04) — W3-01 (P3): Dark Mode — **WAVE 3 COMPLETE**

1 Wave 3 item implemented. Zero new npm dependencies. Zero schema migrations. 3 files modified, 1 created.

- **Dark Mode (W3-01, P3)** — Class-based dark theme (`html.dark`) implemented end-to-end. `@custom-variant dark (&:where(.dark, .dark *))` added to `globals.css` so all Catalyst `dark:` utilities activate on the `.dark` class. `html.dark {}` block overrides all semantic CSS custom properties: surfaces (`#0f172a / #1e293b / #334155`), borders (`#334155 / #475569`), text (`#f8fafc / #94a3b8 / #64748b`), primary brand (`#6366f1` — lighter for dark bg contrast), all status/risk/policy subtle+muted+border as semi-transparent rgba, shadcn compat tokens, content-bg, shadows, and scrollbar. Anti-flash inline `<script>` before `<body>` in `layout.tsx` reads `localStorage('theme')` and falls back to `prefers-color-scheme`, adding `.dark` before React hydrates. `ThemeToggle` Sun/Moon button component created; added to sidebar user footer row. **Wave 3 UX Audit 36/36 complete.**

**UX Audit tracker:** 36/36 items complete. Wave 3 fully done. All P0–P3 items resolved.

---

## ✓ Session 125 Complete (2026-04-04) — W3-09 (P3): Optimistic Updates

1 Wave 3 item implemented. Zero new npm dependencies. Zero schema migrations. 3 files modified, 0 created.

- **Optimistic updates for status transitions (W3-09, P3)** — `useMutation` from `@tanstack/react-query` adopted in three mutation sites. `LifecycleControls`: blueprint status transitions (`PATCH /api/blueprints/:id/status`) now update the detail page UI and the `registry.agents()` list cache immediately on click, with automatic rollback on error. `monitor/page.tsx`: health check-one button (`POST /api/monitor/:agentId/check`) optimistically sets the row's `healthStatus` to `"unknown"` while the check runs; `checkingId` state removed in favour of `checkOneMutation.isPending`. `workflow/[id]/page.tsx`: workflow status transitions update local state instantly; `transitioning` state removed. All three mutations snapshot cache/state on `onMutate`, restore on `onError`, and background-invalidate on `onSettled`. 0 new TypeScript errors.

**UX Audit tracker:** 35/36 items complete. Remaining: W3-01 (Dark Mode).

---

## ✓ Session 124 Complete (2026-04-04) — W3-08 (P3): Accessibility Hardening

1 Wave 3 item implemented. Zero new npm dependencies. Zero schema migrations. 5 files modified, 1 created.

- **Accessibility hardening (W3-08, P3)** — Skip link (`sr-only focus:not-sr-only`) targeting `id="main-content"` on `<main aria-label="Main content">`. Mobile hamburger button expanded from ~32px to 44px+ touch target (WCAG 2.1 AA) with `aria-expanded` + `aria-controls` wired to drawer `id`. `TableHeader` component gains `scope="col"` default — all 40+ data tables now have correct column scope without callsite changes. `SkeletonList` gains `role="status"`, `aria-live="polite"`, `aria-busy="true"`, sr-only "Loading…" text. New `ui/visually-hidden.tsx`: `VisuallyHidden` (sr-only wrapper) and `LiveRegion` (polite status announcer) utilities. Registry and governance pages gain `aria-live="polite"` content wrappers and `role="alert"` on error divs. Fixed stale `wflowsLoaded` references from the W3-07 migration.

**UX Audit tracker:** 34/36 items complete. Remaining: W3-09 (Optimistic Updates), W3-01 (Dark Mode).

---

## ✓ Session 123 Complete (2026-04-04) — W3-07 (P1): React Query Client-Side Cache

1 Wave 3 item implemented. 1 new npm dependency. Zero schema migrations. 7 files modified, 2 files created.

- **React Query adoption (W3-07, P1)** — `@tanstack/react-query` v5.96.2 added. `QueryClientProvider` with browser singleton (staleTime 30s, gcTime 5min, retry 1, refetchOnWindowFocus) wired into root `Providers`. Central `lib/query/keys.ts` key factory (typed arrays for 9 domains) and `lib/query/fetchers.ts` typed fetcher library (11 functions + `apiFetch` error helper) created. 5 priority list pages migrated: `registry/page.tsx` (agents + lazy workflows), `blueprints/page.tsx`, `governance/page.tsx` (3 parallel fetches + analytics with enabled guard; `loadPolicies()` → `invalidateQueries`), `review/page.tsx` (session → `useSession`, queue → `useQuery` with role-derived key), `monitor/page.tsx` (`useQuery` with `refetchInterval: 30s`; mutations use `invalidateQueries`). 0 new TypeScript errors.

**UX Audit tracker:** 33/41 items complete. Remaining: W3-01 (Dark Mode), W3-08 (Accessibility hardening), W3-09 (Optimistic Updates), W3-10 (Dark Mode CSS).

---

## ✓ Session 122 Complete (2026-04-04) — UX Audit Wave 3: W3-02 Compliance Evidence Inline Viewer (P0)

1 Wave 3 item implemented. Zero new npm dependencies. Zero schema migrations. 1 file modified.

- **Compliance Evidence Inline Viewer (W3-02, P0)** — Evidence Summary section added to the Regulatory tab in `registry/[agentId]/page.tsx`. Two new cards inserted between the "Export Evidence Package" button and `<RegulatoryPanel />`. (1) Quality Evaluation card: overall score banner (green/amber/red by threshold), Catalyst `DescriptionList` with all 5 dimensions (Intent Alignment, Tool Appropriateness, Instruction Specificity, Governance Adequacy, Ownership Completeness) as percentages, `InlineAlert variant="warning"` flag list. (2) Test Evidence card: latest run status badge with pass rate, `Table dense` showing last 5 runs (date, status, passed, failed, run by). Loading state via `animate-pulse` skeleton while `qualityLoading` is true. Zero new API calls — uses already-fetched `qualityScore` and `testRuns` page state.

**UX Audit tracker:** 32/41 items complete. Remaining: W1-11 (Client-Side Cache), W3-01 (Dark Mode), W3-07 (React Query), W3-08 (Accessibility hardening), W3-09 (Optimistic Updates), W3-10 (Dark Mode CSS).

---

## ✓ Session 121 Complete (2026-04-04) — UX Audit Wave 3: Polish & Delight (W3-03 — W3-06)

4 Wave 3 items implemented. Zero new npm dependencies. 1 schema migration. ~15 files modified, 3 created, 1 deleted.

- **Per-agent policy scope (W3-03, P0)** — `scoped_agent_ids JSONB DEFAULT NULL` column added to `governance_policies` (migration 0035). `GovernancePolicy` type extended with `scopedAgentIds: string[] | null`. `loadPolicies(enterpriseId, agentId?)` filters scoped policies in memory. `validateBlueprint` accepts optional `agentId` 4th param; wired at the validate route and status route submission gate. PATCH/create routes accept `scopedAgentIds` in body; PATCH inherits from previous version when key absent. `policy-form.tsx` gains "Agent Scope" section: radio toggle (All agents / Specific agents), async agent picker (fetches `/api/registry`), Catalyst Checkbox per agent, search filter, selection summary, readOnly badge display. Governance list shows amber scope count badge. Dashboard: 31/41 items done (P0 7/7, P1 7/7, P2 8/8, P3 4/6, Catalyst 10/10).
- **Catalyst `InlineAlert` component (W3-04, P1)** — Extended `catalyst/alert.tsx` with `InlineAlert` (4 variants: error/warning/info/success; `role="alert"`). Adopted in `policies/new`, `policies/[id]/edit`, and `blueprints/page.tsx`, replacing 4 ad-hoc error/warning divs.
- **Policy cascade warning (W3-05, P3)** — New `GET /api/governance/policies/[id]/dependents` endpoint returns count of active blueprints in scope (W3-03 scope-aware). Edit page fetches count lazily on Delete click; amber banner shows "evaluated against N blueprints" or "not currently evaluated against any active blueprints" before confirming deletion.
- **Catalyst Badge deduplication (W3-06, P2)** — `catalyst/badge.tsx` deleted. Barrel export removed from `catalyst/index.ts`. `ui/badge` is now the sole canonical badge component. Zero import breakage — no file referenced Catalyst Badge directly.

**UX Audit tracker:** 31/41 items complete. Remaining: W1-11 (Client-Side Cache), W3-01 (Dark Mode), W3-02 (Accessibility), W3-05 (Optimistic Updates), P1-4 (React Query).

---

## ✓ Session 120 Complete (2026-04-05) — UX Audit Wave 2: Core UX (completion)

Completed the final 2 of 7 Wave 2 Core UX items. Zero new dependencies. Zero schema migrations. 5 files modified.

- **Search coverage: admin users (W2-06)** — Search input, clear button, `filteredUsers` memo, and "No users match" empty state added to `admin/users/page.tsx`. Pattern matches TableToolbar search UI.
- **Catalyst Combobox — ABP field path (W2-07)** — `combobox.tsx` extended with `onInputChange` for free-text entry. `policy-form.tsx` `RuleRow` adopts Combobox with 23 ABP field path suggestions (`identity.*`, `model.*`, `tools[].`, `security.*`, etc.). Falls back to plain read-only input when `readOnly=true`.
- **Catalyst Checkbox — review queue bulk selection (W2-07)** — `review/page.tsx` adds `selectedIds` state, `toggleSelect`, `toggleSelectAll`, `bulkAssignToMe` helpers. Select-all Checkbox (with indeterminate state), per-card Checkbox (stopPropagation inside Link), and contextual bulk action bar ("Assign to me", "Clear selection").

Wave 2 is now fully complete (7/7 items). Ready to begin Wave 3 — Polish & Delight.

---

## ✓ Session 119 Complete (2026-04-04) — UX Audit Wave 1: Foundation

14 items from the comprehensive UX audit Wave 1 "Foundation" tier implemented. A full 7-phase audit (Navigation & IA, Component Library Consistency, Design Token Usage, Accessibility, Form UX, Error Handling, Copy & Messaging) produced a 41-item tracker. Wave 1 addresses all quick wins resolving component duplication, design token alignment, dangerous-action safeguards, and accessibility patterns. Zero new npm dependencies. Zero schema migrations. ~20 files modified, 2 files created, 1 file deleted.

- **Component library consolidation** — Deleted dead `ui/heading.tsx` (hardcoded `text-zinc-950` bypassing design tokens). Redirected `ui/index.ts` barrel to `catalyst/heading`. Replaced `ui/switch`, `ui/description-list`, and `ui/divider` with thin re-exports to their canonical `catalyst/` counterparts, eliminating dual-maintenance surfaces.
- **Catalyst Button migration** — `lifecycle-controls.tsx` and `registry/[agentId]/page.tsx` migrated from legacy `ui/button` (variant API) to `catalyst/button` (color/outline/plain API). Added `variantToCatalystProps()` helper for the mapping.
- **Dangerous-action confirmation dialogs** — Deprecate and Reject actions in `lifecycle-controls.tsx` now require Catalyst Dialog confirmation with contextual description. API key revocation and webhook deletion likewise wrapped in Catalyst confirmation dialogs. No irreversible action is now one-click.
- **Semantic design tokens throughout** — Governance hub and compliance pages converted from 30+ hardcoded Tailwind color classes (`bg-red-50`, `text-green-700`, etc.) to semantic token utilities (`bg-danger-muted`, `text-success`, `bg-policy-safety-subtle`, etc.). Policy-type color maps in governance hub use per-type policy tokens.
- **Governor sidebar token alignment** — `bg-violet-600` → `bg-primary`; icon color `#a78bfa` → `var(--sidebar-accent)`; active nav glow via `var(--sidebar-active-glow)`; sidebar width via `var(--sidebar-width, 240px)`; logo fallback → `var(--color-primary)`. Enterprise branding can now fully override sidebar appearance without code changes.
- **Navigation & layout** — `mobile-layout.tsx` content area wrapped in `max-w-screen-2xl mx-auto` for readability on ultrawide displays.
- **Error boundaries** — `app/governor/error.tsx` and `app/admin/error.tsx` created as Next.js error boundaries for the two sub-apps. Both use semantic danger tokens, Catalyst Button for retry, and contextual back links.
- **Form UX enhancements** — `form-field.tsx` extended with optional `maxLength` / `currentLength` (character counter with three color states) and `touched` (on-blur validation, backward compatible). No existing callsites require changes.
- **Review panel approval history** — Collapsible "Approval History (N)" section added to `review-panel.tsx` above the Decision radio buttons. Shows each prior step's action badge (semantic colors), reviewer identity, rationale, and timestamp.
- **Policy form UX** — `policy-form.tsx`: info-note and Add Rule button converted to info tokens; disabled simulation now explains why; rule error text tokenized; focus rings tokenized; added link to Governance Hub for runtime violations.
- **Governance policy links** — `validation-report.tsx`: policy names in violation cards now link to `/governance/policies/${id}/edit` when `policyId` is present, enabling direct remediation navigation.
- **Catalyst heading standardization** — Line-height utilities aligned across heading levels (level 2 and subheading level 2 corrected for tighter spacing consistency).

---

## ✓ Session 118 Complete (2026-04-04) — UI Polish: Heroicons to Lucide & Page Header Standardization

See session 118 log entry.

---

## ✓ Session 117 Complete (2026-04-04) — TableToolbar & Pagination Components + QA Remediation Sprint

See session 117 log entry.

---

## ✓ Session 116 Complete (2026-04-03) — Residual P1 Sprint

2 P1 items implemented, 7 confirmed already done. Zero new dependencies. Zero schema migrations. 2 files modified.

- **Red team risk block in deploy modals (P1-239)** — `getLatestRedTeamTier(blueprintId)` helper reads `localStorage["redteam-history-${blueprintId}"]` (written by the red-team panel after each run). Both `DeployConfirmModal` and `AgentCoreDeployModal` now render an orange advisory warning when the most recent simulation returned HIGH or CRITICAL. The warning differentiates from the existing red intake-risk block (which comes from the DB), is non-blocking, and uses the IIFE pattern in `AgentCoreDeployModal` to avoid adding state to the already-complex component.
- **Live per-attack progress during red-team runs (P1-275)** — `RedTeamPanel`'s static loading spinner replaced with a simulated per-attack progress counter. `TOTAL_ATTACKS = 10` and `ESTIMATED_SECONDS = 25` are constants; a `useEffect` ticker fires every 2.5 s (capped at attack 9 so it never shows "complete" before the actual response). The loading state shows: "Running attack N of 10 · ~Xs remaining", a CSS-transitioned progress bar, and a 10-pip row with completed/active/pending states. Resets to 0 on unmount/completion.
- **Confirmed already implemented (7 items):** P1-133 (session re-entry warm recap), P1-262 (quality rubric tooltips), P1-226 (confirm-before-apply refinement), P1-227 (version checkpoint), P1-354 (governor sub-page context banners), P1-355 (review next critical quick-action).

---

## ✓ Session 115 Complete (2026-04-03) — P2 UX Sprint Final

3 P2 items. **P2 sprint now complete.** Zero new dependencies. Zero schema migrations. 6 files modified.

- **Inviter trust banner on invite accept page (P2-91)** — `GET /api/auth/invite/validate` extended to join the `users` table on `invitedBy` and return `inviterName` + `enterpriseName` (derived by title-casing the `enterpriseId` slug via `formatEnterpriseName()`). The invite accept page now shows an indigo trust banner: "Sarah Chen at Acme Bank has invited you to Intellios." Only rendered when at least one of the two fields is known; handles partial data gracefully.
- **"Remember this device" toggle on login (P2-57)** — `Credentials` provider updated to accept a `remember` field. In the `jwt()` callback, `token.exp` is set to 30 days from now when `remember === "true"`, extending the session from the default 8 hours. Login page: `rememberDevice` state hydrated from `localStorage` on mount; a custom-styled checkbox ("Remember this device for 30 days") shown between the password field and error display; preference written to `localStorage` on every submit; `String(rememberDevice)` passed as the `remember` credential.
- **Per-department cost view on admin fleet page (P2-562)** — `GET /api/admin/fleet-overview` extended with a `byAgentType` query joining `agentBlueprints` → `intakeSessions` to produce per-agent-type total/deployed counts. Fleet page adds: (1) a violet platform cost summary banner (`deployedAgents × $150/mo` blended estimate); (2) "Est. Monthly Cost" column in the enterprise table with per-enterprise and platform-total figures; (3) a "By Agent Category" grid showing each agent type (Automation/Decision Support/Autonomous/Data Access) with department label, total/deployed counts, deploy-rate progress bar, and per-type cost rate ($120–$250/mo).

---

## ✓ Session 114 Complete (2026-04-03) — P2 UX Sprint (continued)

6 P2 items. Zero new dependencies. Zero schema migrations. 8 files modified, 1 created.

- **Blueprint search/filter on home page (P2-34)** — New `HomeAgentList` client component replaces the static architect agent list. Adds a search input and 5 status filter chips (All / Draft / In Review / Approved / Deployed) with real-time client-side filtering via `useMemo`. Empty state shows a "no match" view with a "Clear filters" link. The server component passes the full `myAgents` array as a prop — zero additional server round-trips.
- **Signup progress indicator (P2-69)** — A 3-step indicator (Organization → Identity → Security) appears above the registration form. The active step is derived from `form` state via `useMemo`: Organization done when company name filled; Identity done when first/last/email filled; Security done when both password fields ≥ 8 chars. Step dots transition gray → indigo → green ✓; connecting lines fill proportionally as steps complete.
- **Password reset confirmation screen (P2-101)** — The sparse post-reset success state is replaced with a proper confirmation: animated pulse-ring check icon, personalized security notice (previous sessions invalidated, update password manager, contact admin if unexpected), prominent "Sign in now →" CTA, and a 5-second countdown auto-redirect using `useEffect` + `useRouter`. The countdown is visible below the CTA and decrements visibly.
- **Invite Stakeholder chip in domain strip (P2-134)** — `InviteStakeholderChip` appended to the `DomainProgressStrip` when `sessionId` prop is provided. Renders as a compact pill ("Invite") at the far end of the strip. Click opens a popover form: email (required), name (optional), domain select (7 options: compliance/risk/legal/security/it/operations/business), RACI role select (4 options). POSTs to the existing `POST /api/intake/sessions/${sessionId}/invitations` endpoint. Shows a "Invitation sent!" confirmation state before auto-closing. Intake session page wired with `sessionId={sessionId}` prop.
- **Stakeholder submission confirmation (P2-181)** — `SubmittedState` in `stakeholder-workspace.tsx` replaced with a rich, personalized confirmation screen. Now receives `inviteeName`, `sessionName`, and `domainLabel` props. Shows: animated pulse-ring check, personalized headline ("Thanks, Jane!" when name known), domain and session context, "What happens next" 3-step card (contribution visible, stakeholder coverage count with pending indicator, blueprint will incorporate constraints), optional team synthesis, collaborator roster, and "You can close this tab" footer. Replaces opaque technical jargon with plain human language.

---

## ✓ Session 113 Complete (2026-04-03) — P2 UX Sprint (continued)

8 P2 items. Zero new dependencies. Zero schema migrations. 10 files modified/created. Session spanned 2 context windows with seamless continuation.

- **Export Regulatory Evidence button (P2-287)** — `DownloadEvidenceButton` wired to registry agent detail regulatory tab; visible only when agent is `approved` or `deployed`; downloads structured JSON evidence bundle via the existing MRM endpoint. Reviewers and compliance officers can now pull an audit-ready package in one click.
- **Pipeline audience + sort filters (P2-488)** — Audience chip row (All / Actionable / Clean / Violations) and sort select (Updated / Created / Name) added above the pipeline grid. Both filters composed in a single `useMemo`. Architects and governors can now focus on what needs their attention without scanning the full list.
- **Webhook delivery log enhancements (P2-552)** — Color-coded dot+text status badges, HTTP status cell with green/red coloring, `lastAttemptedAt` column with ISO tooltip, red-tinted rows for failed deliveries. `DeliveryLogHeader` shows success/fail/pending counts, a client-side CSV export button, and a refresh button. Makes the delivery log usable for active troubleshooting rather than just passive audit.
- **Test Connection buttons for integrations (P2-532)** — New `POST /api/admin/integrations/test` API route handles live connectivity for all 4 adapters: Slack (webhook POST), Teams (MessageCard POST), ServiceNow (GET sys_user with Basic auth), Jira (GET /myself with Basic auth). `TestConnectionButton` component shows idle/testing/ok/fail states with 8-second auto-reset. Admins can now validate integrations without leaving the settings page.
- **Bulk CSV invite on Users page (P2-512)** — `BulkInviteForm` component: file input via `useRef`, client-side CSV parser (max 50 rows, skips header, strips quotes), preview table, sequential send loop with per-row status chips, done summary. "Bulk CSV" toggle button added to Users page header. Eliminates the need to invite team members one by one.
- **Validate Deployment Target button (P2-502)** — `POST /api/admin/settings/validate-deployment` runs 4 checks: AWS region format regex, IAM Role ARN pattern (`arn:aws:iam::\d{12}:role/.+`), foundation model presence, and AWS credential env vars. `ValidateDeploymentTargetButton` component renders inside the AgentCore settings block, showing per-check colored rows (✓/✗ with detail text). Prevents misconfigured deployments from failing silently at runtime.
- **Template preview modal (P2-169)** — Clicking a template card in the QuickStart modal now opens `TemplatePreviewPanel` as an absolute overlay within the modal card. The panel shows: full description, tags, persona snippet, all tools with type badge + description, governance policy chips. "Use This Template" CTA navigates to the express lane; back arrow returns to the list. Removes the blind leap from template name to full express lane setup.
- **Clone existing agent tab in QuickStart modal (P2-123)** — Third "Clone" tab added to QuickStart modal. Fetches `GET /api/blueprints` on first open; searchable agent list by name; clicking an agent pre-fills the name as "Copy of {originalName}"; "Clone Agent" POSTs to `/api/blueprints/${id}/clone` and navigates to the new blueprint page. Makes it natural to fork a proven agent as a starting point rather than rebuilding from scratch.

---

## ✓ Session 112 Complete (2026-04-03) — P2 UX Sprint (continued)

5 P2 items. Zero new dependencies. Zero schema migrations. 6 files modified.

- **Red-team run history (P2-240)** — Completed from prior session. `useRunHistory` hook with localStorage persistence per blueprintId; history strip with colored risk-tier chips above launch button; "Re-run" vs "Run Red-Team" label based on whether current version has a prior run.
- **Cross-version test comparison (P2-276)** — After a red-team run completes, a "Version Comparison" strip appears when a prior version's result exists in history. Shows both versions (tier badge + score), a directional arrow, and a delta: "↑ +2 attacks resisted · risk improved" (green) or "↓ -1 · risk increased" (orange). Uses localStorage data — zero API calls.
- **Version selector in simulation sandbox (P2-423)** — `SimulatePanel` now accepts an `allVersions` prop. When multiple versions exist, a row of version pill chips renders above the Chat/Red Team mode toggle. Clicking a chip switches `blueprintId` and `version` for both the chat sandbox and red-team panel; chat history is cleared on switch. Registry page now passes the `versions` array.
- **Command palette policy search (P2-584)** — Policies fetched once on palette open from `GET /api/governance/policies`, held in a ref, filtered client-side on query change. A "Policies" `Command.Group` renders after "Agents" with `ShieldCheck` icons, policy name, type label, and description preview. Navigates to `/governance?policy={id}`. Placeholder updated to "Search pages, agents, and policies…".
- **Notification preferences routing matrix (P2-607)** — Extended `EnterpriseSettings.notifications` with an optional `routing` object (7 events × 3 channels) and `digestFrequency` ("immediate" | "daily" | "weekly"). Safe defaults added. Admin settings page gains two new subsections: a bordered event × channel checkbox table with alternating row backgrounds, and a digest frequency radio group with contextual description. Zero schema migration (JSONB deep-merge with defaults).

---

## ✓ Session 111 Complete (2026-04-03) — P2 UX Sprint (continued)

6 P2 items across 5 IDs. Zero new dependencies. Zero schema migrations. 10 files modified.

- **Re-review comparison banner (P2-573)** — When a blueprint was being re-reviewed after changes, reviewers had no upfront signal that this was a re-review or easy way to find what changed. Added a violet "↔ Re-review: v1.1 → v1.2 · See what changed ↓" banner at the very top of the review panel when a prior blueprint version exists. Clicking "See what changed" expands the VersionDiff section and smooth-scrolls to it — reviewers no longer need to hunt for the diff.
- **AI Risk Brief thumbs feedback (P2-252)** — The AI Risk Brief had no feedback mechanism, making it impossible to signal when assessments were inaccurate. Added ThumbsUp/ThumbsDown buttons (already imported, never used) below the recommendation row. Toggling a thumb shows brief confirmation micro-copy. Client-side only — creates a training signal pattern ready for backend wiring.
- **Quality score delta vs previous version (P2-264)** — Architects doing iterative refinement had no way to know if their change improved or degraded the quality score. Added `previousScore` and `previousVersion` props to `QualityDashboard`. The registry page now fetches the penultimate version's quality score and passes it. Green ↑/red ↓ arrows appear at the overall headline and beside each of the 5 dimension scores.
- **Help panel copilot live context (P2-595)** — The "Ask Intellios" help panel always gave generic answers regardless of what the user was looking at. Pages now dispatch a custom `intellios:help-context` event carrying the current agent name, blueprint status, and violation count. The panel listens, shows a violet context strip in the header, and passes the context in the API request body. The system prompt explicitly instructs the model to reference the context when answering questions about "this agent" or "these violations".
- **Notification grouping (P2-606)** — High-frequency events (e.g., 10 governance violations on the same agent) created 10 separate notification rows, making the panel unreadable. Added `groupNotifications()` which collapses same-type + same-entity runs into a single digest card: "Agent X — 5× Blueprint Status Changed · View all 5 →". Single events render as before.
- **Governance analytics date range + narrative (P2-344)** — The governance analytics section always showed all-time data with no period context, and no narrative summary for executive readers. Added a "Last 30 / Last 90 / Last 365 days" chip picker that re-fetches analytics with `?days=N`. Added an auto-computed narrative summary box: "In the last 90 days: 14 agents approved with 91% pass rate, 3 violations detected, 7 agents running in production."

---

## ✓ Session 110 Complete (2026-04-03) — P2 UX Sprint (continued)

5 P2 items. Zero new dependencies. Zero schema migrations. 5 files modified.

- **Daily briefing widget on dashboard (P2-467)** — The Intellios dashboard had no connection to the AI intelligence briefings generated by the monitoring subsystem. Added `AiBriefingWidget` below the Recent Deployments section. Fetches the latest briefing from the existing `/api/monitor/intelligence/briefing` endpoint, shows a health-colored card (green/amber/red/gray), a ~200-char content preview, and a "View full briefing →" link to the monitor page. Zero new API routes.
- **Context-aware companion AI prompts (P2-216)** — The Blueprint Companion's empty-state prompt chips were static, showing the same suggestions regardless of the blueprint's governance or quality state. Added three ranked prompt sets: `VIOLATION_PROMPTS` (surfaces when governance violations exist), `QUALITY_PROMPTS` (surfaces when quality score < 3.0/5.0), and `BASE_COMPANION_PROMPTS` (default). A context hint chip above the suggestions tells the architect why certain prompts are being ranked first.
- **API key usage count in admin UI (P2-522)** — The admin API Keys page listed key names and scopes but not usage data, making it impossible to audit which keys were active. Added `usageCount` to the `ApiKey` interface and a formatted "Xk req / 0 req" display stacked below the last-used date in each key row. Full count tooltip on hover.
- **Ambiguity flags sorted by heuristic impact (P2-146)** — Unresolved ambiguity flags on the Intake Review page appeared in creation order, burying critical governance/capability flags after minor identity ones. Added a `flagImpact()` heuristic that classifies fields by keyword match against a `HIGH_IMPACT_FIELDS` set (governance, capabilities, tools, instructions, constraints, etc.). Flags now sort high-impact first. Each flag shows a red "High impact" or slate "Low impact" badge in its header row.
- **Auto-highlight changed section after refinement (P2-228)** — After running a blueprint refinement, architects had no visual cue about which section was updated. Added `detectChangedSection()` which JSON-serializes each of the 8 ABP sections (identity, instructions, tools, knowledge, constraints, governance, audit, ownership) and returns the first that differs between pre- and post-refinement ABPs. `handleRefine` now sets `activeSection` to the changed section and smooth-scrolls to it after a 150ms render delay.

---

## ✓ Session 109 Complete (2026-04-03) — P2 UX Sprint (continued)

5 P2 items. Zero new dependencies. Zero schema migrations. 4 files modified.

- **Add to Calendar (P2-366)** — The governance compliance calendar API endpoint existed but had no UI entry point. Added a blue "Add to Calendar" button to the governance Quick Actions bar. Clicking downloads an `.ics` file with all compliance review deadlines and policy renewal dates, ready to import into Outlook or Google Calendar. Available to all analytics-capable roles.
- **Workflow step flow visualization (P2-411)** — The workflow detail page listed agents and handoff rules as text tables with no visual representation of orchestration order. Added a `WorkflowFlowDiagram` component at the top of the page. Uses BFS traversal from the "start" sentinel to order nodes, renders them as labeled boxes with SVG arrow connectors, and marks branching points with an amber badge. Handles wide workflows via horizontal scroll.
- **Deployment history timeline (P2-379)** — The Versions tab had a table of versions but no temporal deployment view. Added a deployment history timeline at the top of the tab when at least one version was deployed. Shows each deployed version in chronological order with deploy date, deployer, and "ran Xd" duration until superseded. The latest version gets a green dot. Uses the already-loaded `versions` state — zero additional API calls.
- **Export violations as CSV (P2-447)** — SOC 2 auditors request runtime violation logs as evidence. Added "Export CSV" button to the violations panel filter row. Generates an RFC-4180 CSV client-side using `Blob` + `URL.createObjectURL` — instant, zero server round-trip. Columns: id, severity, policyName, ruleId, metric, observedValue, threshold, message, detectedAt. Filename includes agentId, time range, and date.
- **Analytics last-refreshed timestamp (P2-356)** — Governance stakeholders couldn't tell if the analytics sparklines reflected current data. Added `analyticsLoadedAt` state that captures the fetch completion time. When the analytics section is expanded, "Refreshed HH:MM" appears in the header row with a full datetime tooltip.

---

## ✓ Session 108 Complete (2026-04-03) — P2 UX Sprint

5 P2 items. Zero new dependencies. Zero schema migrations. 7 files modified/created.

- **Health pulse badge in agent header (P2-401)** — The agent registry detail page showed a status badge but surfaced no health signal. A green "Healthy" or red "N error(s)" pill now appears inline in the page header right after the lifecycle status badge. Wires into `healthData` already fetched by the page — zero additional API calls. Tooltip shows full error/warning counts and last-checked timestamp. Hidden when health is unknown (not yet checked).
- **Policy breadcrumbs (P2-324)** — The New Policy and Edit Policy pages showed a right-aligned "← Governance" back link but no breadcrumb trail. Replaced with a full Governance / Policies / {name} breadcrumb `<nav>` above each page header. Edit page shows the policy name truncated at 200px with a native `title` tooltip for long names. Removes the back-link redundancy while improving wayfinding.
- **Telemetry empty state code snippet (P2-435)** — The production dashboard empty state was a vague message pointing to an API endpoint. Added a full `TelemetrySnippetPanel` component with Python and cURL tabs, syntax-highlighted dark code block, and a copy-to-clipboard button. The `agentId` is dynamically interpolated into the payload so the snippet is ready to run. A footer hint directs users to the API key location in admin settings.
- **Status filter legend tooltips (P2-390)** — The registry status filter pills (Draft, In Review, Approved, Deployed…) gave no indication of what each status means. Added `STATUS_DESCRIPTIONS` record and wired `title={STATUS_DESCRIPTIONS[s]}` onto each pill. Hovering any status pill now shows a plain-English description of what that lifecycle state means.
- **Duplicate intake session (P2-113)** — There was no way to reuse a session's captured context as a starting point for a related agent. Added `POST /api/intake/sessions/[id]/duplicate` which creates a new active session copying `intakeContext`, `intakePayload`, `agentType`, `riskTier`, and `expertiseLevel` — but not chat messages (fresh conversation on pre-populated payload). A `DuplicateSessionButton` appears on hover in the intake session list alongside the existing delete button; navigates to the new session on success.

---

## ✓ Session 107 Complete (2026-04-03) — P1 UX Sprint (continued)

3 P1 items. Zero new dependencies. Zero schema migrations. 5 files modified.

- **Welcome page role personalization (P1-81)** — Every role was shown the same generic setup checklist. The welcome page now reads the user's role from the session and renders a tailored hero card and step sequence. Admin sees Settings → Invite Team → Governance. Compliance Officer sees the governance dashboard and alert config. Reviewer is pointed straight to the review queue. Architect (default) sees the Design Studio path. Hero headline, CTA text, and secondary link also adapt per role — the page now functions as a role-specific launchpad rather than a generic onboarding screen.
- **Blueprint persistent action tray (P1-204)** — The 4 core blueprint actions (Refine with AI, Simulate, Export, Deploy) were scattered across multiple tabs and menus, forcing architects to hunt for them. A compact 4-column action tray now appears at the very top of the right rail on every blueprint page, always visible when the agent has a registry ID. One click to reach any core action from anywhere in the blueprint workbench.
- **Notification channel config — Slack + PagerDuty (P1-433)** — Alert thresholds existed but had no delivery mechanism beyond email. Added Slack incoming webhook URL and PagerDuty Events API v2 integration key to the `EnterpriseSettings.notifications` type, the API Zod schema, and the admin settings UI. The Notifications section is now structured into three labelled subsections (Email · Slack · PagerDuty). Each channel shows a green "active" confirmation when configured. Stored in the existing JSONB settings column — zero DB migrations.

---

## ✓ Session 106 Complete (2026-04-03) — P1 UX Sprint (continued)

5 P1 items. Zero new dependencies. Zero schema migrations. 6 files modified.

- **Preview ABP before generating (P1-157)** — Architects had no way to review the structured intake payload before committing to blueprint generation. A "Preview ABP" button in the sticky footer of the Intake Review component opens a slide-in overlay showing all captured data (Identity, Capabilities, Constraints, Governance, Context). A "Generate Blueprint →" shortcut button in the panel footer lets architects proceed directly from the preview.
- **Reviewer self-assignment in review queue (P1-299)** — The review queue had no assignment workflow; all blueprints looked equally unclaimed. Each queue card now has an "Assign to me" button (using `e.stopPropagation()` to avoid triggering the parent link). Assignments are stored in localStorage keyed by `blueprintId`. "My assignments" bubble to the top of the sorted list. An assignment counter chip appears above the queue when any assignments exist.
- **Export Compliance Report (P1-334)** — Governance teams needed a board-ready compliance document. Added "Export Compliance Report" button to the Governance Hub Quick Actions (visible to viewers and up, only when analytics are loaded). Clicking generates a print-optimised HTML report in a new window — `window.print()` fires automatically so the browser's native PDF dialog opens. Report covers: KPI summary (pass rate, violations, approved agents, avg approval time), violations by category, top violated policies, agents requiring attention, and the full active policy list. Zero new dependencies — no PDF library required.
- **Enterprise branding on register page (P1-67/68)** — The register page was a plain gray form, disconnected from the enterprise dark theme of the login page. Converted `register/page.tsx` to use the same dark gradient background, dot-grid overlay, ambient glow orbs, and Cpu logo lockup as login. Updated `register-form.tsx` to use a dark glassmorphism card (backdrop-blur, white/10 borders, transparent inputs, indigo focus rings, gradient submit button). Relabelled "Company name" to "Enterprise name" to match enterprise product positioning.
- **Test SSO Configuration button (P1-542)** — SSO admins had no way to validate their OIDC configuration without asking a user to attempt a real login. Added "Test SSO Configuration" button to the SSO settings footer. Opens a modal showing the current config snapshot (protocol, issuer, domain, enabled status). "Start Test Login" opens the OIDC `/api/auth/signin/oidc` route in a 520×640 popup — a genuine end-to-end test against the configured IdP. Polls for popup close; reports success or specific error (blocked popup, timeout). Button is disabled when issuer is empty or platform OIDC is not configured.

---

## ✓ Session 105 Complete (2026-04-03) — P1 UX Sprint (continued)

7 P1 items. Zero new dependencies. Zero schema migrations. 9 files modified.

- **Test case template library (P1-42)** — Test suites previously required architects to write all test cases from scratch. The Tests tab now shows a "Quick add from library" chip row with 5 pre-authored templates: PII exfiltration attempt, Out-of-scope request, Prompt injection probe (all Standard tier), plus Escalation bypass attempt and Data exfiltration via tool (Critical tier, marked with red dot). One click pre-fills the form and opens it. No DB query needed — all client-side.
- **Red-team risk warning in deploy (P1-43)** — High and critical risk agents can now be deployed without any warning — a compliance gap. Extended `GET /api/registry` with a LEFT JOIN on `intakeSessions` to surface `riskTier` per agent blueprint. Both the standard Deploy-to-Production modal and the AgentCore deploy modal now render a red `⚠ [tier] risk tier` banner when `riskTier` is high or critical, reminding operators that security review is required.
- **Review decision notifications fixed (P1-251)** — The notification handler for `blueprint.reviewed` events was reading `meta.reviewAction` but the review route publishes `payload.decision`. Result: all review notifications sent generic "Blueprint reviewed" titles rather than action-specific "Approved" / "Rejected" / "Changes requested". Fixed with a one-line `(meta.reviewAction ?? meta.decision)` alias in the handler. Creators now receive properly-titled notifications on every review decision.
- **Demo mode env flag (P1-56)** — Demo account quick-fill buttons on the login page were always visible, looking unprofessional to enterprise buyers. Wrapped the entire demo accounts section in `process.env.NEXT_PUBLIC_DEMO_MODE === "true"`. Default: hidden. Documented in `.env.example`.
- **Onboarding checklist persistence (P1-80)** — The welcome page setup checklist had no memory. Converted from server component to `"use client"`. Added localStorage-backed `visitedSteps: Set<string>`. Each step shows a green `CheckCircle2` icon after first visit. CTA changes to "Revisit →". Progress counter shows "X/3 visited" or "✓ All done".
- **Confirm-before-apply for companion AI suggestions (P1-226)** — Companion AI "Apply" buttons triggered blueprint refinement immediately with no confirmation step. Added `pendingApplyPrompt` state; clicking Apply now stages the prompt. A confirmation banner shows the suggestion text and requires an explicit "Confirm — Apply Changes" click. Cancel discards without running refinement.

---

## ✓ Session 104 Complete (2026-04-03) — P1 UX Sprint (continued)

3 P1 items from the UX Experience Map. Zero new dependencies. Zero schema migrations. 3 files modified.

- **Simulate panel saved scenario library (P1-32)** — Architects running repeated compliance tests (PII exfiltration, out-of-scope requests, edge cases) previously had to retype or paste the same prompts every session. The sandbox now has a saved scenario library: a horizontally-scrollable chip list above the messages area. Clicking a chip immediately sends that prompt. A "+ Add" button opens an inline form (label + prompt text). Scenarios are stored in `localStorage` keyed by `blueprintId`. Hover-reveal ✕ to delete. Built without modifying `ChatInput` — click-to-send was the correct pattern since `ChatInput` manages its own input state internally.
- **Monitor alert acknowledgement (P1-33)** — Degraded and critical agents on the Deployment Monitor page were previously read-only — there was no workflow for confirming a known issue had been reviewed. Each degraded/critical row now shows an "Acknowledge" button (matching the violations panel pattern from P1-31). Clicking dims the row to 60% opacity and shows a green "Undo" toggle. An "X acknowledged" chip appears in the table count row. `localStorage`-persisted, browser-local — consistent with the rest of the acknowledgement pattern in this sprint.
- **Generate Blueprint time estimate (P1-34)** — The intake review Generate button now reads "Generate Blueprint (~20s) →". A single-character addition that sets accurate expectations and prevents the architect from abandoning the page thinking the action has stalled.

---

## ✓ Session 103 Complete (2026-04-03) — P1 UX Sprint (continued)

3 P1 items from the UX Experience Map. Zero new dependencies. Zero schema migrations. 3 files modified.

- **Companion AI tab + one-click apply (P1-29)** — `CompanionChat` was fully implemented but never imported anywhere. The blueprint page right rail now has a two-tab header: "Refine" (existing manual chat) and "Companion AI" (the AI design partner). When an architect clicks "Apply Change" on a suggestion card, the component switches to the Refine tab and calls the refinement API directly — no copy-paste required. `handleRefine` was extended to accept an optional `directPrompt` so both paths share the same execution logic.
- **Companion chat history persistence (P1-30)** — Architects revisit blueprints over multiple sessions. The companion chat now loads its prior conversation from `localStorage` as `initialMessages` on mount and saves messages back on every update. A trash icon in the header clears the history (and reloads the page to reset the `useChat` state, since the hook has no public reset API). No backend changes.
- **Violations per-row acknowledgement (P1-31)** — Runtime violations with no resolution workflow are noise; there's no way to distinguish known/accepted issues from new ones. Each violation row now has an "Acknowledge" button that stores the ID in `localStorage` (keyed per agent). Acknowledged rows dim to 60% opacity, switch to a green "acknowledged" badge, and get a strikethrough message. The header shows an "X acknowledged" green chip. Toggle ("Undo") un-acknowledges. No DB migration — browser-local for this sprint.

---

## ✓ Session 102 Complete (2026-04-03) — P1 UX Sprint (continued)

3 P1 items from the UX Experience Map. Zero new dependencies. Zero schema migrations. 4 files modified.

- **Deploy console rollback CTA (P1-26)** — When an AgentCore deployment fails, operators previously had only a "Done" button — leaving them without a clear path to recovery. The error-phase footer now shows "← Try previous version" as a `Link` to the agent's registry page, where all versions are listed and a stable version can be selected for re-deployment. One additional line of JSX; no API changes needed.
- **Production KPI period-over-period deltas (P1-27)** — The five KPI cards (Invocations, Error Rate, P50 Latency, P99 Latency, Tokens) now each show a "+X% vs prior 7d" or "−X% vs prior 7d" badge in green (improvement) or red (regression). Computed from a `prev7d` window (days 8–14) against the existing `last7d` window. Sub-1% changes are suppressed to avoid noise. A KPI card showing "14,832 invocations" is ambiguous — "+12% vs prior 7d" immediately contextualises whether the agent is growing or in decline.
- **Policy form auto-save (P1-28)** — Governors building complex governance policies can now navigate away without losing work. A `draftKey` prop on `PolicyForm` enables: 30-second localStorage auto-save, draft restoration on page reload (when no `initialValues` are present), and a "Draft saved X min ago" indicator in the submit row. The new-policy page passes `draftKey="policy-draft-new"` and clears the draft immediately before routing on successful save. Built with three `useEffect` hooks; no backend calls, no schema changes.

---

## ✓ Session 101 Complete (2026-04-03) — P1 UX Sprint (continued)

3 P1 items from the UX Experience Map. Zero new dependencies. Zero schema migrations. 3 files modified.

- **Simulate panel audit indicator (P1-23)** — The sandbox header now shows a small green badge: "This session is being audited for compliance evidence." The firstMessage audit flag was already wired into the transport — this change surfaces that fact to the user. Architects and reviewers now know their simulation sessions are logged as governance evidence, which both builds trust and satisfies compliance requirements.
- **Violations panel trend sparkline (P1-24)** — A daily bar chart now appears between the filters and the violation list (for 7d and 30d time ranges). Computed from the already-loaded violations array — no new API call. Orange bars for active violations, red for the peak day. Without the trend, a count of "14 violations" is ambiguous — you can't tell if it's improving or worsening.
- **Dashboard role-aware Next Actions (P1-25)** — The dashboard now fetches `/api/me` in parallel with the summary data and renders a "Your Next Actions" section with 3 role-specific priority cards. Architect: drafts in progress / quality scores / deployments ready. Reviewer / compliance officer: review queue (amber when non-empty) / governance compliance / audit log. Governor / admin: pending approvals (amber when non-empty) / fleet health / policies. Each card is a direct link. Replaces the role-blind generic dashboard that showed the same information regardless of who was viewing it.

---

## ✓ Session 100 Complete (2026-04-03) — P1 UX Sprint (continued)

3 P1 items from the UX Experience Map. Zero new dependencies. Zero schema migrations. 6 files modified.

- **Governor "Review next critical" CTA (P1-20)** — A violet action card now appears above the Pending Approvals grid on the Governor command center. It shows the first (highest-priority) blueprint in the review queue: agent name, how long it's been waiting, and queue depth. Clicking navigates directly to `?tab=review` on that agent's registry page. Only renders when the queue is non-empty. Governors previously had no way to jump straight to the most urgent item.
- **Governor context banner on sub-pages (P1-21)** — All four governor sub-pages (Approvals, Audit, Fleet, Policies) were bare 2-line re-exports of their originals — rendering identically to the non-governor versions with no role framing. Each is now a wrapper component that renders a violet "Governor · [context description]" banner strip above the original page. The banner communicates scope ("fleet-wide", "enterprise-wide") and confirms the governor's elevated view.
- **Review decision SLA badge (P1-22)** — A `ReviewSlaBadge` now appears at the top of `ReviewPanel`, above the AI Risk Brief. It shows: "Waiting Xd · SLA 5d · Xd remaining". Three states: gray (safe), amber (< 24h remaining), red + "Overdue Xd" (past SLA). `REVIEW_SLA_DAYS = 5` constant is editable. Reviewers were previously unaware of urgency context while making decisions.

---

## ✓ Session 099 Complete (2026-04-03) — P1 UX Sprint (continued)

3 P1 items from the UX Experience Map. Zero new dependencies. Zero schema migrations. 3 files modified.

- **Red team report JSON export (P1-17)** — The `RedTeamPanel` now has an "Export" button in the report header (alongside "Re-run"). Clicking downloads the full `RedTeamReport` serialised to JSON with agent name, version, and export timestamp as wrapper metadata. Filename: `red-team-report-{agent}-v{version}.json`. This is the security evidence artefact governance teams need for audit files and examiner responses.
- **Quality dimension rubric tooltips (P1-18)** — Each of the 5 quality dimension rows in `QualityDashboard` now has a `(?)` help button. Clicking opens a tooltip showing the 1/3/5 scoring rubric for that dimension (e.g. "1 = no tools or entirely wrong tools · 3 = some tools listed but descriptions vague · 5 = all required tools specified with correct scoping and parameter constraints"). Tooltip closes on outside click. Without these rubrics, a score of 3.2 on "Tool Appropriateness" was unactionable — now it has a clear target.
- **Test run live progress indicator (P1-19)** — The "Run Tests" button in the Tests tab is now replaced by a live progress block while a run is executing: "Running case X of N · ~Ys remaining" plus a 1px animated progress bar. Driven by a `setInterval` elapsed counter and an estimated 8s/case pace. Caps at 95% to avoid a stuck appearance. Previous behavior (static "Running N tests…" disabled button) caused architects to navigate away assuming the run had frozen on slow connections.

---

## ✓ Session 098 Complete (2026-04-03) — P1 UX Sprint (continued)

3 P1 items from the UX Experience Map. Zero new dependencies. Zero schema migrations. 3 files modified.

- **Notification "Mark all as read" button (P1-14)** — Removed the previous behavior where opening the notification dropdown automatically marked all notifications as read (a surprising, hard-to-reverse side effect). Now the dropdown opens without affecting read state. An explicit "Mark all as read" button appears in the header when unread notifications exist. Clicking it triggers the optimistic update and background PATCH. Unread count badge added to the header alongside the label.
- **Governance analytics section collapsed by default (P1-15)** — The analytics section (3 KPI cards + 2 charts + skeleton loader) is now hidden by default. A clickable toggle replaces the static heading. When collapsed, a 1-line summary shows inline: "Pass rate: 87% · 3 violations · 2d avg approval". Expanding shows the full analytics content. This saves ~300px of prime scroll real estate for users who visit the governance page to take action.
- **Blueprint quality gate advisory (P1-16)** — The blueprint workbench now fetches the quality score from `/api/blueprints/[id]/quality` on mount. When the `overallScore` is below 3.0/5.0 (`QUALITY_GATE_THRESHOLD`), an orange advisory warning appears above the Submit button: "Quality score is X.X/5.0 — below the recommended threshold of 3.0. Consider addressing quality issues before submitting." Includes a direct link to the Quality tab in the registry. Non-blocking — architects can still submit.

---

## ✓ Session 097 Complete (2026-04-03) — P1 UX Sprint (continued)

1 P1 item from the UX Experience Map. Zero new dependencies. Zero schema migrations. 1 file modified.

- **Blueprint detail — governance violations acknowledgement workflow (P1-13)** — Warning-severity violations in the blueprint workbench right rail now have an explicit "Acknowledge" button. Clicking it dims the card to 60% opacity, turns it green, changes the badge to "✓ ack", and collapses the suggestion box (acknowledged = read + accepted). A header counter ("X/Y acknowledged") tracks progress. The Submit button changes its label to "Acknowledge N warnings below" until all warnings are acknowledged, at which point it becomes the normal "Submit for Review" CTA. A green "All warnings reviewed" summary appears below the list when all warnings are acknowledged and no errors remain. The clean governance section (previously shown on `valid=true` even with warnings present) now correctly only renders when `violations.length === 0`. Acknowledgement state is session-scoped — no DB schema change needed.

---

## ✓ Session 096 Complete (2026-04-03) — P1 UX Sprint (continued)

1 P1 item from the UX Experience Map. Zero new dependencies. Zero schema migrations. 1 file modified.

- **Registry filter state persisted in URL params (P1-12)** — `activeTab`, `searchQuery`, and `statusFilter` in the Registry page are now initialized from `?tab=`, `?q=`, and `?status=` URL params on mount. Every filter interaction (`setSearchQuery`, `setStatusFilter`, `switchTab`) updates the URL via `router.replace(..., { scroll: false })`. Defaults are omitted to keep the base URL clean. Practical benefits: filtered views are now shareable (e.g. `/registry?status=deployed`), browser Back/Forward navigate to the correct filter state, and refreshing the page preserves the current filters.

---

## ✓ Session 095 Complete (2026-04-03) — P1 UX Sprint (continued)

1 P1 item from the UX Experience Map. Zero new dependencies. Zero schema migrations. 1 file modified.

- **Home page — role-aware next actions (P1-11)** — Three role gaps addressed in `src/app/page.tsx`:
  - *Compliance officer* now sees 4 governance-focused quick-action cards (Review Queue · Governance Hub · Compliance Posture · Agent Registry) on a 4-column grid, replacing the reviewer-targeted 3-card set it previously shared.
  - *Empty-queue state* expanded for both roles: compliance officers get "Review Governance Hub" (violet CTA) + "Browse Agent Registry" (neutral); reviewers get "Browse Recent Agents". The green checkmark "all clear" signal is preserved above the guidance.
  - *Viewer role* in the admin/overview branch now renders an "Explore" navigation block (Agent Registry · Pipeline Board · Governance Hub · Blueprints) before the admin action queue, replacing a blank zone with contextual forward navigation.

---

## ✓ Session 094 Complete (2026-04-03) — P1 UX Sprint (continued)

3 P1 items from the UX Experience Map. Zero new dependencies. Zero schema migrations. 4 files modified, 2 created.

- **Governance hub quick actions** — Quick-action bar rendered after data load (below page header), before analytics section. Buttons: New Policy (canManagePolicies), Import Pack (canManagePolicies + packs exist, scrolls to `#template-packs`), Active Violations count-badge (scrolls to `#violations`), Audit Trail (for non-analytics roles). Added `id="template-packs"` to starter packs section. Actions are contextual — only visible items relevant to the user's role and current data state are shown.
- **Landing page Request Access modal** — All three "Request access" CTAs now open a modal (`RequestAccessModal`, render-prop pattern) instead of navigating to `/register`. Modal: email + company (required) + role select + freeform message. On submit: POSTs to new `POST /api/waitlist` endpoint which emits a structured `WAITLIST_SUBMISSION` JSON log (Vercel log drain capturable). Success state: "You're on the list" with confirmation. Zero schema migration needed.
- **Ask Intellios affordance** — `HelpPanel` gains a `variant="row"` prop rendering a full-width, labeled nav-style button ("Ask Intellios" + violet AI badge). Sidebar renders this above the user footer (separated by `borderTop`), replacing the 13px icon buried in the footer icon cluster. Default `"icon"` variant preserved for backward compatibility.

---

## ✓ Session 093 Complete (2026-04-03) — P1 UX Sprint (continued)

3 P1 items from the UX Experience Map. Zero new dependencies, zero schema migrations. 4 files modified.

- **Regulatory panel — contextual fix guidance** — For each `missing` requirement across all three frameworks (EU AI Act, SR 11-7, NIST AI RMF), a blue "How to fix" box now appears with a plain-language instruction and a direct link to the relevant Intellios page (Governance, Admin Settings, Blueprints, or Intake). Coverage: all 26 defined requirement IDs. Header summary shows total gap count with "fix guidance below" nudge. `FrameworkSection` header now shows a gap count badge.
- **Registry list — health pulse indicator** — Each agent row now shows a 2.5-size colored dot: green (validated, 0 violations), amber (validated, warnings only), red (has governance errors), gray (not yet validated). `warningCount` added to registry API response alongside existing `violationCount`. Tooltip on hover states the reason.
- **Agent detail — status context bar** — A contextual strip now appears below the header for `draft`, `approved`, `rejected`, and `deprecated` states (deployed and in_review already had strips). The bar shows the state's meaning and a primary CTA: Submit for Review (draft), Deploy to Production (approved, links to /deploy), Create New Version (rejected), Clone as New Agent (deprecated). Inline `handleContextBarTransition` callback wired to existing lifecycle API. `LifecycleControls` in header preserved as fallback.

---

## ✓ Session 092 Complete (2026-04-03) — P1 UX Sprint

5 P1 items from the UX Experience Map. Zero new dependencies, zero schema migrations. 4 files modified.

- **Blueprints sidebar nav** — `FileText` nav item added after Design Studio for architect/admin roles. Blueprints now reachable from every page.
- **Architect home quick actions** — Expanded to 4 cards (New Intake · Blueprints · Pipeline · Registry). Blueprints promoted as the primary creation artifact.
- **Reviewer home urgency** — Red callout surfaces the highest-risk pending blueprint at the top of the home page. Pending list sorted by governance severity. `Violations` badge vs `Review` badge distinguishes risk level.
- **Admin settings section nav** — Sticky horizontal tab strip with IntersectionObserver tracking active section as user scrolls. 7 sections: Branding · Periodic Review · Review SLA · Governance Rules · Notifications · Approval Chain · Deployment.
- **Express Lane progress indicator** — 4 step-dots in the header: Identity · Capabilities · Constraints · Governance. Turns emerald with checkmark once each section's key field is filled. Clickable to toggle sections.

---

## ✓ Session 091 Complete (2026-04-03) — P0 UX Fixes

**All 4 P0 issues from the UX Experience Map resolved.** Zero new dependencies, zero schema migrations.

- **Blueprint list page** — `src/app/blueprints/page.tsx` created. `GET /api/blueprints` endpoint added. Search, 5-tab status filter, governance badges, empty state with intake CTA.
- **Review queue priority sort + SLA** — Risk tier derived from `validationReport` (CRITICAL/HIGH/MEDIUM/LOW). SLA countdown (24/48/72/96h from `updatedAt`). Queue sorted highest risk first, then oldest within tier. Live 30-second tick.
- **Express Lane inline validation** — Agent name (required, ≥2 chars, human-name heuristic), tool names (snake_case regex), retention days (1–365). Fires on blur + keystroke-after-touch. Blocks form submission.
- **Welcome page hero CTA** — Gradient hero card with "Create your first agent" as the primary action. Setup steps demoted to optional secondary section below.

---

## ✓ Session 090 Complete (2026-04-03) — UX Experience Map: Full Platform Audit

**GTM Analysis Phase.** Comprehensive audit of all human-facing experiences in the Intellios platform, producing a scored, prioritized, interactive UX Experience Map (`intellios-ux-map.jsx`). Four progressive passes over the full codebase (page.tsx files, all components by LOC, API routes, lib/ directory) built a complete experience inventory from 41 → 53 experiences. No code changes — strategic analysis and documentation only.

**Final map state:** 53 experiences · 48 directed flows · 107 recommendations (4 P0 · 60 P1 · 43 P2) across 6 clusters: Entry (7), Create (7), Review (11), Govern (6), Operate (11), Admin (11).

**Key discoveries that changed the product picture:**
- `help-panel` is a live multi-turn AI copilot (Phase 47, claude-haiku-4-5, page-aware) — not a static FAQ. Needs a visible "Ask Intellios" affordance.
- `admin-settings` controls 7 sections of live governance enforcement (circuit breaker, multi-step approval chain, SR 11-7 periodic review, AWS deployment targets, SLA thresholds) — currently mischaracterized as "branding, model config." Needs section navigation.
- `blueprint-report` is a formal 8-section MRM Report written for bank examiners, with audit logging on every view — currently underpromoted in the platform.
- `review-decision` (440 LOC, AI risk brief + approve/reject, SLA badge, version diff) — the most consequential human decision point in the entire workflow — was entirely absent from the map.
- 4 P0 priorities precisely specified: (1) Blueprint list page missing (`/blueprints/page.tsx`), (2) Review queue priority sorting + SLA timers, (3) Express Lane inline field validation, (4) Welcome hero action ("Create your first agent").

**Pitch deck:** Also completed in Session 089 (same date) — 12-slide investor pitch deck for the $2.5M pre-seed raise.

---

## ✓ Session 089 Complete (2026-04-03) — GTM Preparation: Investor Pitch Deck

12-slide pre-seed investor pitch deck ($2.5M raise). Midnight Executive palette (DEEP_NAVY #12183D / ICE_BLUE #CADCFC / ACCENT cyan #38BDF8). Built with python-pptx. Visual QA via LibreOffice PDF conversion + pdftoppm image inspection. Spacing fixes applied after QA round 1. Pricing tiers: Starter $2,500/mo · Enterprise $15,000/mo · Platform custom. Narrative arc: Title → Problem → Solution → How It Works → Product (ABP) → Market (TAM $86B / SAM $12B / SOM $480M) → Business Model → Competitive Landscape → Traction → Why Now → Team → The Ask. 1 new file, 0 code changes.

---

## ✓ Session 088 Complete (2026-04-03) — Express-Lane Intake + Middleware Tenant Isolation

**Part 1: Express-Lane Intake.** Template-based fast path for blueprint generation — users skip the full 3-phase intake conversation and generate a blueprint from a pre-configured template in under 2 minutes. QuickStartModal enhanced with tabbed UI ("Describe Your Agent" + "Start from Template"). Express-lane page (`/intake/express/[templateId]`) with section-by-section editor. `POST /api/blueprints/from-template` API: template resolve → merge customizations → stub session → ABP assembly → governance validation → persist.

**Part 2: Middleware Tenant Isolation (ADR-012).** Centralized enterprise_id enforcement at the middleware layer for SOC 2 readiness. Full security audit of all 120 API routes (zero critical vulnerabilities). Middleware now injects `x-enterprise-id`, `x-user-role`, `x-actor-email` from JWT on every authenticated request. New `enterpriseScope()` utility generates Drizzle WHERE filters from middleware headers (single enforcement point). 4 key routes refactored as reference pattern (`/api/registry`, `/api/dashboard/summary`, `/api/review`, `/api/governance/policies`). All 6 cron routes hardened with mandatory `requireCronAuth()` — fails 503 (closed) when `CRON_SECRET` is unset. 6 new files, 14 modified, 0 migrations, 0 new deps.

---

## ✓ Session 087 Complete (2026-04-02) — Design Studio Session List UX/UI Overhaul

Seven UX/UI changes to the `/intake` session list addressing ghost session pollution, navigation, search, and staleness. **Ghost prevention (P0):** `QuickStartModal` gates session creation behind a purpose description (min 10 chars) — session created only on submit, not on button click. `NewIntakeButton` now opens the modal. **Tab navigation (P1):** `IntakePageClient` client wrapper with "In Progress (N)" | "Complete (N)" tabs, defaulting to In Progress — eliminates the scroll-to-find-completed problem. **Session grouping:** real active sessions (hasContext || filledDomains > 0) vs. ghost sessions (empty, collapsed by default). **Ghost bulk cleanup (P2):** "Clean up N" in the ghost section header runs parallel DELETE calls + router.refresh(). **Client-side search (P2):** filters by agentName or agentPurpose, no server round-trip. **Staleness signal (P1):** sessions > 7 days show amber "Inactive Xd" badge and absolute date. **Domain strip improved (P1):** h-2 w-4 bars (was h-1.5 w-2.5), x/7 label on all rows. **Continue → affordance (P2):** visible on hover for sessions with real progress. 2 new files, 2 modified, 0 migrations, 0 new deps.

---

## ✓ Session 086 Complete (2026-04-02) — Design Studio Conversation Phase UX/UI Enhancement

Nine UX/UI changes to the intake session view (conversation phase). Design Intelligence panel redesigned with two-state animation (ghost checklist → live data resolved on first tool call). Unified 2-row header replacing separate floating classification bar. Live domain nav (7 pills wired to payload state via stable useRef callback). Risk tier badge always visible in header. Agent name breadcrumb wired to liveAgentName state. Phase 1 context summary banner above chat (deployment, data sensitivity, regulatory chips, purpose quote). Context-adaptive input placeholder keyed on last tool call. Stakeholder locked-state UI with domain chip preview. 0 new files, 3 modified, 0 migrations, 0 new deps.

---

## ✓ Session 085 Complete (2026-04-01) — Agent Design Studio UX Polish

Six polish items addressing first-impression friction in the intake session page. Progressive disclosure in Required Governance and Coverage Analysis sidebar panels (satisfied first, pending capped at 3 + expand). Removed red dots from domain chips (redundant with fill bars, read as errors). Replaced SVG score ring with `X/7 domains` monospace counter (progress, not grade). Stakeholder Input section collapses to a single muted row during ANALYZING state. Domain chip clicks produce a ghost pill message style (bg-primary/8, border, italic, Navigation icon) tracked via `useRef<Set<string>>` — distinguishes navigation from user speech. Added `pendingActiveDomain` optimistic override so chip clicks highlight immediately without waiting for AI response metadata. Round 1 completions also documented: payload fetch on revisit, chat max-w-4xl, interactive domain chips with tooltip, panel label renames (DESIGN INTELLIGENCE, ANALYZING, Coverage Analysis), page header and sidebar label updates. 0 new files, 5 modified.

---

## ✓ Session 082 Complete (2026-04-01) — Domain Progress Strip + DPR Roadmap

Replaced 3-step stepper (Context → Requirements → Review) and classification bar with a unified Domain Progress Strip. 7 ABP domains rendered as chips with 4-dot fill indicators (0-4 richness scale, risk-tier-aware thresholds), active domain glow (inferred from tool calls → probing topics → lowest fill), classification badges inline, readiness score badge. AI messages now show subtle domain tag. New `domains.ts` lib with `computeDomainProgress()` + `inferActiveDomain()`. Transparency metadata extended with `domains[]` and `activeDomain`. Strategic roadmap revision: archived H1/H2 horizons, introduced DPR (Design Partner Readiness) phase with 3 tracks. 2 new files, 6 modified, 0 migrations, 0 new deps. tsc: 0 errors.

---

## ✓ Session 081 Complete (2026-04-01) — CVE Fix + Merge + Vercel Deploy

Resolved all 10 npm CVEs: `npm audit fix` (brace-expansion, flatted, picomatch, fast-xml-parser, Next.js ×5), drizzle-kit 0.31.9→0.31.10, `overrides.esbuild ^0.25.12` to force patched esbuild into @esbuild-kit/core-utils nested install. 0 vulnerabilities. Merged `feat/intake-v2-hardening` → `master`, pushed to `origin/main` triggering Vercel production deploy. tsc: 0 errors.

---

## ✓ Session 080 Complete (2026-03-31) — Catalyst Phase 2 (Switch + DescriptionList + Divider)

Applied Catalyst Switch to 2 files (integrations ×4 checkboxes, settings AgentCore toggle). DescriptionList to 2 files (deploy modal, blueprint summary). Divider to 1 file (chat markdown hr). Skipped genuine form checkboxes and print-layout fields. tsc: 0 errors.

---

## ✓ Session 079 Complete (2026-03-31) — Catalyst UI Kit Integration + Table Migration

7 Catalyst components added (Table, Switch, DescriptionList, Heading, Divider, Text, CatalystLink). @headlessui/react installed. SSO toggle → Switch. All 12 raw-table files migrated to Catalyst Table (striped, dense variants). 0 raw tables remain. tsc: 0 errors.

---

## ✓ Session 078 Complete (2026-03-31) — Premium Landing Page

Full premium marketing page at /landing with @heroicons/react. 9 sections: sticky nav, hero with gradient blob, compliance framework badges (SR 11-7/EU AI Act/NIST/ISO/SOC 2), 5-step pipeline visualization, 3 feature cards, 4-stat bar, 8-item feature grid, 4 role cards, dark CTA, columnar footer. tsc: 0 errors.

---

## ✓ Session 077 Complete (2026-03-31) — Recharts + Radix Select Deployment

Applied Recharts to quality dashboard (line chart), governance page (bar + donut charts). Replaced all 20 remaining raw `<select>` elements across 11 files with Radix Select. Responsive grid breakpoints on governance + monitor. aria-label on 4 icon-only buttons. tsc: 0 errors.

---

## ✓ Session 076 Complete (2026-03-31) — UI/UX Optimization Sprint (Phase 0–3)

UI/UX Optimization Sprint initial pass. Fixed a latent animation bug (tw-animate-css installed; all dialog/dropdown animations now functional). Replaced the 465-line custom command palette with cmdk (polished fuzzy search, keyboard nav, animations). Added sonner toast system (global `<Toaster>` in layout; replaced custom `[toast, setToast]` inline state in 3 admin pages). Created Radix-backed UI components: `tabs.tsx` (applied to registry agents/workflows toggle), `select.tsx`, `sheet.tsx`. Added `animate-in slide-in-from-right` to the mobile intake sidebar overlay. Installed Recharts and created 3 shared chart wrappers (`BarChart`, `LineChart`, `DonutChart`) with a design token map (`chart-tokens.ts`). Created `Skeleton`/`SkeletonList` and `EmptyState` utility components; applied both to `registry/page.tsx` (replacing manual pulse arrays and inline empty state divs). 9 new files, 8 modified, 6 new dependencies. tsc: 0 errors.

---

## ✓ Session 075 Complete (2026-03-31) — Intake v2 P1 Hardening

P1 hardening sprint against the all-conversation Intake v2. Three targeted fixes: (1) **Mobile sidebar** — `IntakeProgress` now `hidden lg:flex`; mobile users get a "Progress" toggle in the header that renders the sidebar as a full-viewport overlay, restoring full chat width on narrow screens; (2) **Classification loading resilience** — `classificationLoadingTicksRef` tracks consecutive refreshTicks where context is saved but `agentType` is absent; spinner clears after 2 unanswered ticks, preventing the infinite "Classifying…" state when classification API fails silently; (3) **Context cold-path** — `onContextSubmit` DB save now wrapped in try/catch with explicit throw + console.error; tool surfaces a clean "Failed to save context — please try again" message to Claude instead of an unhandled exception; classification failure remains non-fatal. 0 new files, 3 modified, 0 migrations, 0 new deps. tsc: 0 errors.

---

## ✓ Session 074 Complete (2026-03-31) — Intake Transparency Overhaul

Evaluated the intake process (UX 7.5/10, UI 7/10, Transparency 3.5/10 → target 7+/10). Designed and implemented a `messageMetadata`-based transparency system using AI SDK v6 that streams AI calculations live alongside each response. Five new collapsible sidebar panels: score decomposition (3-dimension bars replacing opaque %), classification explainer (risk tier signals + rationale + conversation depth), governance checklist (live satisfied/pending status with reasons), probing topics (mandatory/recommended with covered status), model & expertise indicator (Sonnet/Haiku with reason + Guided/Adaptive/Expert). Tool call chips enhanced with "Captured"/"Failed" result status badges and result JSON on expand. TypeScript UIMessage content field fix. Local preview unblocked. Verified end-to-end with live AI conversation (sidebar panels populated correctly from streamed metadata). 2 new files, 4 modified, 0 migrations, 0 new deps.

---

## ✓ Session 073 Complete (2026-03-31) — Log Backfill + keen-pascal Merge

Retroactive session logs for 069–071 created. Gap-check instruction added to CLAUDE.md (Step 0: read _index, compare with git log, create missing logs before starting new work). Strategic assessment: 4-sprint priority stack produced; H3 gate reconfirmed (requires 3 design partners). Squash merge of `claude/keen-pascal` → `main` (17 commits → 3 squash commits; 54 files; 1 conflict resolved). Preview server started but blocked by missing `.env.local` in zealous-banzai worktree. Session 072 log written.

---

## ✓ Session 072 Complete (2026-03-31) — All-Conversation Intake v2 + Font Tokenization + A11y

All-conversation intake v2: Phase 1 structured form eliminated; `submit_intake_context` tool added (Claude calls after conversational confirmation of 6 context fields); `CONTEXT_COLLECTION_PROMPT` mode added (sole job: collect context, then transition to full governance probing prompt); cold start fix (`INTAKE_OPENER` pre-populated as first message — no blank loading state); 3-step phase stepper (Context · Requirements · Review); orientation panel (6 context areas + 7 blueprint sections, transitions to Blueprint Progress once context arrives); readiness score hidden until score > 0. Font tokenization: `text-2xs` (10px) and `text-xs-tight` (11px) tokens defined in globals.css; 90+ arbitrary `text-[10px]`/`text-[11px]` replacements across 48 files. Badge migration batch 4: intake-review + completeness-map migrated to unified Badge component. A11y: sidebar ARIA landmarks + `aria-current="page"`, `aria-label` on controls (help panel, command palette, contributions panel, violations panel, tool call display). Pipeline empty states for all 4 kanban columns. Admin section nav converted from collapsible to static label. 54 files, 0 migrations, 0 new deps.

---

## ✓ Session 071 Complete (2026-03-30) — Intake UX Hardening + Admin Overview Redesign + Unified Badge System

Intake UX: /landing redirect loop fixed (ERR_TOO_MANY_REDIRECTS for all unauthenticated visitors); Revise button fixed (was anchor→full reload, now PATCH session status + client-side phase switch); chat history restored on Revise; discard button with inline confirm + DELETE endpoint (cascade-safe, completed sessions protected). Admin Overview: compact stats strip (3× vertical space saving), action callouts → inline chips, Fleet Governance summary bar replaces 4 tiles, side-by-side activity layout, redundant agents list removed. Unified Badge system: 7 semantic variants (neutral/info/success/warning/danger/accent/muted) replace 30+ inline color definitions; consistent `rounded-full px-2 py-0.5 text-xs font-medium` across all badge-like elements; 6 files migrated. 9 commits, 0 migrations, 0 new deps.

---

## ✓ Session 070 Complete (2026-03-30) — Cron Downgrade + Design System v1.2

Cron downgrade: alert-check and telemetry-sync reduced to daily for Vercel Hobby plan compliance (restore to `*/15` and `0 *` on Pro). Design System v1.2: primary violet-700→indigo-600 (cooler, more enterprise-native tone); cool-shift all surfaces and borders to blue-tinted slate; indigo-tinted box shadows; new `.btn-primary` gradient+glow utility; glass-morphism login page; sidebar header gradient + active nav glow. 5 files modified, 0 migrations, 0 new deps.

---

## ✓ Session 069 Complete (2026-03-29) — SEC-001–007 Security Hardening

86 API routes scanned against OWASP Top 10 patterns. 7 findings (0 critical/high, 3 medium, 4 low) — all resolved: SEC-001 cron fails-closed when CRON_SECRET unset; SEC-002 forgot-password IP rate limit (5/hr); SEC-003 webhook SSRF prevention (RFC 1918 + loopback blocked in schema); SEC-004/006 npm audit fix (Next.js CVEs + flatted/picomatch dev deps); SEC-005 requireAuth 403 no longer exposes role names; SEC-007 reset-password IP rate limit (10/hr). Deferred: esbuild/drizzle-kit CVEs (no prod runtime exposure, requires breaking drizzle-kit upgrade). Full report at `docs/log/health/2026-03-29_security.md`. 6 src files modified, 0 migrations, 0 new deps.

---

## ✓ Session 066b Complete (2026-03-28) — Intake Review Page Polish + Design System v1.1

13 intake review UX enhancements (RV-001–013): sticky footer with live confirmation counter, human-readable retention formatting, per-section "← Revise" links, 3-step visual stepper, risk/sensitivity/regulatory badges, color-coded policy type chips, denied actions blocked list, collapsible empty sections, domain tile anchor links + hover tooltips, stakeholder gap warning banner. Design System v1.1 adds status, risk tier, and policy type semantic color tokens. 3 files modified, 0 migrations, 0 new deps.

---

## ✓ Session 065b Complete (2026-03-28) — Vercel Serverless Fixes + UE-001–009 Intake Chat UX

6 production fixes unblocking Vercel deployment: postgres `max:1` for serverless connection limits, `await` classification in context route (fire-and-forget killed by serverless), missing `created_by` migration (now 0034) causing HTTP 500 on intake session creation, missing UI components + quality dashboard committed (0024), intake button error surfacing. 9 intake chat UX enhancements (UE-001–009). 2 new migrations, 20 files modified.

---

## ✓ Session 068 Complete (2026-03-22) — H3-3 + H3-4 (7 of 14 H3 items shipped)

---

## How Claude Should Use This Roadmap

This document is the **source of truth** for what has been built and what needs to be built. At the start of every session:

1. **Read the completion summary** to understand current state.
2. **For the deliverable you're implementing**, read the full "What to build" and "Definition of done" sections — these are authoritative implementation specs.
3. **For any system you're touching**, check the "What was built" + "Key files" of the relevant completed item to understand what already exists. Do not re-implement completed capabilities.
4. **Before adding DB columns or tables**, read `src/lib/db/schema.ts` in full to understand existing structure.
5. **TypeScript validation**: every session must end with `npx tsc --noEmit` passing with 0 errors.
6. **DB driver**: use `postgres` (not `pg`) with `drizzle-orm/postgres-js`. Run migrations from the `src/` directory using `npx tsx --env-file=.env.local`.

---

## Completion Summary

| Area | Complete | Total | % | Status |
|---|---|---|---|---|
| **P — Shared Platform** | 14 | 14 | 100% | Feature-complete |
| **A — Architect Product** | 19 | 19 | 100% | Feature-complete for current scope |
| **G — Governor Product** | 17 | 17 | 100% | Feature-complete |
| **D — Technical Debt** | 5 | 5 | 100% | All debt resolved (D-01 via H1-3, D-02 via H1-4.2, D-03/04/05 complete) |
| **H1 — Close the Loop** | 17 | 17 | 100% | All 17 items complete; event bus wired end-to-end; observability + alerts live |
| **H2 — Govern at Scale** | 17 | 17 | 100% | All 17 items complete including H2-6 Governor completeness sprint |
| **H3 — Execution Platform** | 7 | 14 | 50% | H3-3 (Continuous Governance) + H3-4 (Ecosystem) complete; H3-1/H3-2 deferred (gated) |
| | | | | |
| **Current Product (P+A+G+D)** | **55** | **55** | **100%** | Production-ready; all planned capabilities shipped |
| **Full Vision (all horizons)** | **92** | **103** | **89%** | Core product 100%; H1+H2 100%; H3 7/14 (governance + ecosystem shipped; foundry deferred) |
| **UI/UX Sprint (076–082)** | **7** | **7** | **100%** | Catalyst UI, landing page, domain progress strip, CVE fix, Recharts, Radix Select |
| **DPR — Design Partner Readiness** | **7** | **10** | **70%** | Tracks 1+2 complete (7/7 items); Track 3 GTM pending (Samy-led) |

---

## DPR — Design Partner Readiness

**Status: Active** — Introduced session 082. Replaces feature development with product maturity.

**Why:** Intellios reached feature saturation (89% of full vision). The problem is no longer "what to build" — it's "how to make what exists feel enterprise-grade." H3-1/H3-2 remain correctly gated on 3 design partners. The priority is now: strengthen the product, polish first impressions, define GTM strategy.

### Track 1: Product Hardening

| Item | Description | Status | Sessions |
|------|-------------|--------|----------|
| **DPR-1.1** | Test coverage for critical paths (intake, governance, lifecycle, domains) — target 80%+ on `src/lib/` | **Complete** (Session 082) | 2-3 |
| **DPR-1.2** | Error handling audit — structured error responses, error boundaries, graceful degradation | **Complete** (Session 083) | 1 |
| **DPR-1.3** | Performance baseline — Lighthouse, N+1 queries, streaming latency | **Complete** (Session 083) | 1 |

### Track 2: First Impression Polish

| Item | Description | Status | Sessions |
|------|-------------|--------|----------|
| **DPR-2.1** | Chat UX fixes — bottom-anchor messages, softer user bubbles, contextual placeholder, one-question-per-turn | **Complete** (Session 082) | 1 |
| **DPR-2.2** | Loading states pass — skeleton loading + empty states on every page | **Complete** (Session 083) | 1 |
| **DPR-2.3** | Demo data refresh — Acme Financial seed updated for latest features | **Complete** (Session 083) | 1 |
| **DPR-2.4** | Onboarding refinement — guided first-agent-blueprint experience | **Complete** (Session 083) | 1 |

### Track 3: GTM Foundation (Samy-led, Claude assists)

| Item | Description | Status | Owner |
|------|-------------|--------|-------|
| **DPR-3.1** | Target persona definition — buyer, user, pain, trigger | Pending | Samy |
| **DPR-3.2** | Positioning & messaging — value prop, differentiators, "why now" | Pending | Samy |
| **DPR-3.3** | Pricing model — tiers, design partner offer | Pending | Samy |
| **DPR-3.4** | Outreach materials — one-pager, demo script, email templates | Pending | Claude + Samy |

### Sequencing

1. **DPR-2.1** Chat UX fixes (highest-visibility, low-effort)
2. **DPR-1.1** Test coverage (confidence foundation)
3. **DPR-2.2 + 2.3** Loading states + demo data
4. **DPR-3.1 + 3.2** Persona + positioning (parallel, Samy)
5. **DPR-1.2** Error handling audit
6. **DPR-2.4** Onboarding refinement
7. **DPR-3.4** Outreach materials

### Definition of Done

- 80%+ test coverage on `src/lib/intake/`, `src/lib/governance/`, `src/lib/sla/`
- Every page loads in <2s (3G simulation)
- Chat UX passes the "screenshot test" (no embarrassing gaps)
- Demo data tells a compelling 12-minute story
- Landing page communicates value in 5 seconds
- Target persona defined and documented
- One-pager exists for leave-behind

---

## P — Shared Platform

Infrastructure that every product and role depends on.

---

### P-01 — Identity + RBAC | **Complete**

**What was built:** NextAuth.js session authentication with bcrypt password hashing. 5 roles: `architect`, `reviewer`, `compliance_officer`, `admin`, `viewer`. Role stored in `users.role` column and injected into the JWT token. Every API route calls `requireAuth()` at the top to enforce auth and RBAC.

**Key files:**
- `src/lib/auth/require.ts` — `requireAuth(allowedRoles?)` returns `{ session, error }` tuple; used in all API routes
- `src/app/api/auth/[...nextauth]/route.ts` — NextAuth provider config; reads role from DB into JWT
- `src/auth.ts` — NextAuth configuration export (session + JWT callbacks)
- `src/lib/db/schema.ts` — `users` table: `email`, `passwordHash`, `role` (text), `enterpriseId` (text, nullable)

---

### P-02 — Multi-tenancy | **Complete**

**What was built:** Application-level tenant isolation via `enterprise_id` column on all core tables. All queries filter by `session.user.enterpriseId`. Null `enterpriseId` means platform-level (super admin). No row-level security at the database layer — isolation is enforced in application code.

**Key files:**
- `src/lib/db/schema.ts` — `enterprise_id` column on `users`, `intakeSessions`, `agentBlueprints`, `governancePolicies`, `notifications`, `webhooks`, `deploymentHealth`, and all other tenant-scoped tables
- `src/lib/auth/enterprise.ts` — helpers to extract enterprise context from session

---

### P-03 — Policy Engine | **Complete**

**What was built:** Rule evaluation engine with 11 operators (`equals`, `not_equals`, `contains`, `not_contains`, `gt`, `lt`, `gte`, `lte`, `matches`, `in`, `not_in`) using dot-notation field access on ABP JSON documents (e.g., `governance.riskTier`). Rules stored in `governancePolicies.rules` as a JSON array.

**Key files:**
- `src/lib/governance/evaluate.ts` — `evaluateRule()`, `evaluatePolicy()`, `evaluatePolicies()` — the core evaluation engine
- `src/lib/governance/types.ts` — `PolicyRule`, `PolicyType`, `EvaluationResult`, `ValidationViolation` types
- `src/lib/governance/load-policies.ts` — loads active enterprise policies from DB

---

### P-04 — Governance Validator | **Complete**

**What was built:** Runs all active enterprise policies against an ABP. Returns a `ValidationReport` with violations (severity: `error`/`warning`), overall pass/fail status, and AI-generated remediation suggestions per violation. Called automatically at blueprint generation time and on-demand via `/api/blueprints/[id]/validate`.

**Key files:**
- `src/lib/governance/validator.ts` — `validateBlueprint(abp, policies)` — main validation entry point
- `src/lib/governance/remediate.ts` — AI remediation suggestion generation per violation
- `src/lib/governance/types.ts` — `ValidationReport` type
- `src/app/api/blueprints/[id]/validate/route.ts` — on-demand validation endpoint

---

### P-05 — Lifecycle Engine | **Complete**

**What was built:** Blueprint status FSM: `draft → in_review → approved → deployed → deprecated`. Also `rejected` from `in_review`. Multi-step configurable approval workflow (1-step or 2-step) stored in enterprise settings. SOD enforcement prevents architects from approving their own blueprints. `agentBlueprints.approvalProgress` tracks per-step records.

**Key files:**
- `src/app/api/blueprints/[id]/status/route.ts` — status transitions with SOD enforcement
- `src/app/api/blueprints/[id]/review/route.ts` — reviewer approve/reject with multi-step progress
- `src/components/registry/lifecycle-controls.tsx` — deploy/submit/approve/reject buttons (role-gated)
- `src/lib/sla/config.ts` — SLA deadline config per status transition
- `src/lib/db/schema.ts` — `agentBlueprints.status`, `currentApprovalStep`, `approvalProgress`

---

### P-06 — Audit + Evidence | **Complete**

**What was built:** Append-only `auditLog` table records every lifecycle event with before/after state snapshots. MRM reports (14-section SR 11-7 compliance documents) generated as HTML + JSON. Evidence packages (14-section ZIP bundles with all governance artifacts) for external auditors. Regulatory framework mapping to GDPR, CCPA, SOX, HIPAA.

**Key files:**
- `src/lib/audit/log.ts` — `writeAuditLog()` — **the only write path** to the `auditLog` table; never write audit rows directly
- `src/lib/mrm/report.ts` — `generateMRMReport()` — 14-section MRM report generator
- `src/lib/mrm/types.ts` — `MRMReport`, `SODEvidence` type definitions
- `src/app/api/blueprints/[id]/evidence-package/route.ts` — ZIP bundle generation (14 sections)
- `src/app/api/blueprints/[id]/report/route.ts` — MRM report generation endpoint
- `src/app/api/audit/route.ts` — `GET /api/audit` — paginated, filtered audit log query
- `src/lib/regulatory/classifier.ts` + `src/lib/regulatory/frameworks.ts` — regulatory mapping

---

### P-07 — Evaluation | **Complete**

**What was built:** Three evaluation subsystems: (1) Blueprint quality scoring — 5 dimensions × 1-5 scale → 0-100 overall score, AI-evaluated; (2) Intake quality scoring — 4 dimensions (breadth, ambiguity, risk identification, stakeholder alignment); (3) Red-team security evaluation — 5 attack categories (prompt injection, data exfiltration, instruction override, jailbreak, social engineering). Behavioral test harness with pass/fail test cases stored per logical agent.

**Key files:**
- `src/lib/awareness/quality-evaluator.ts` — blueprint + intake quality AI evaluator
- `src/lib/testing/red-team.ts` — red-team attack definitions and AI-based evaluation
- `src/lib/testing/executor.ts` — behavioral test case execution engine
- `src/lib/testing/types.ts` — `TestCaseResult`, `RedTeamResult` types
- `src/app/api/registry/[agentId]/quality/route.ts` — quality score retrieval API
- `src/components/blueprint/quality-dashboard.tsx` — 5-dimension quality visualization
- `src/app/api/blueprints/[id]/simulate/red-team/route.ts` — red-team API endpoint
- `src/app/api/blueprints/[id]/test-runs/route.ts` — test harness execution + results

---

### P-08 — Registry + Versioning | **Complete**

**What was built:** Agent registry stores all blueprint versions keyed on `agentId` (UUID for the logical agent, shared across all versions). Semantic versioning on `agentBlueprints.version`. Version diff engine computes structural changes between any two ABPs. Blueprint lineage records `previousBlueprintId` and `governanceDiff` at version-creation time.

**Key files:**
- `src/app/api/registry/route.ts` — `GET /api/registry` — list agents with latest version per `agentId`
- `src/app/api/registry/[agentId]/route.ts` — version history for a logical agent
- `src/lib/diff/abp-diff.ts` — `diffABP()` — structural diff engine
- `src/app/api/blueprints/[id]/new-version/route.ts` — create new version (same `agentId`, incremented version, stores predecessor + governance diff)
- `src/app/api/blueprints/[id]/clone/route.ts` — clone blueprint (new `agentId`, fresh history)
- `src/app/registry/[agentId]/page.tsx` — registry detail page with all tabs

---

### P-09 — Notifications | **Complete**

**What was built:** In-app notification bell (polling `GET /api/notifications`) + email via Resend API. Notifications created by `createNotification()`. Email delivery gated by enterprise settings `notifications.emailEnabled`. Recipients determined by role-based routing logic.

**Key files:**
- `src/lib/notifications/store.ts` — `createNotification()` — creates in-app notification row
- `src/lib/notifications/email.ts` — `sendEmail()` via Resend API
- `src/lib/notifications/handler.ts` — maps lifecycle events to notification calls
- `src/lib/notifications/recipients.ts` — role-based recipient resolution
- `src/components/nav/notification-bell.tsx` — polling notification bell UI

---

### P-10 — Webhooks | **Complete**

**What was built:** Admin-configured HTTPS endpoints receiving HMAC-SHA256 signed lifecycle events. Per-enterprise webhook registration with event-type filtering. Delivery log with retry tracking in `webhookDeliveries`. Secret rotation + manual test fire endpoints.

**Key files:**
- `src/lib/webhooks/dispatch.ts` — event bus handler; routes events to matching webhooks
- `src/lib/webhooks/deliver.ts` — HTTPS delivery with HMAC-SHA256 signing and exponential retry
- `src/lib/webhooks/types.ts` — `WebhookPayload`, `LifecycleEvent` types
- `src/app/api/admin/webhooks/route.ts` — webhook CRUD (GET/POST)
- `src/app/api/admin/webhooks/[id]/route.ts` — single webhook (GET/PATCH/DELETE)
- `src/app/api/admin/webhooks/[id]/test/route.ts` — manual test delivery
- `src/app/api/admin/webhooks/[id]/rotate-secret/route.ts` — secret rotation

---

### P-11 — Eventing | **Complete**

**What exists:**
- `src/lib/events/types.ts` — `EventType` string union + `LifecycleEvent` interface
- `src/lib/events/bus.ts` — simple in-process event bus with `subscribe()` / `publish()`
- `src/lib/audit/log.ts` — `writeAuditLog()` writes to the audit table
- **Gap:** calling `writeAuditLog()` does NOT automatically fire webhooks. The two systems are not connected. Webhook delivery only fires when `dispatch()` is called explicitly — and most API routes do not call it.

**What to build:** See H1-4 for full implementation detail.

---

### P-12 — Observability | **Complete**

**What was built:** Full telemetry ingestion pipeline (H1-1.1), CloudWatch/AgentCore connector (H1-1.2), Production dashboard tab (H1-1.3), deployment health integration (H1-1.4), threshold alerts (H1-1.5). See H1-1 for full detail.

---

### P-13 — Enterprise SSO | **Complete**

**What was built:** OIDC federation with dynamic provider loading, JIT user provisioning, group-to-role mapping, SSO admin UI, email-domain SSO detection on login page. See H2-3 for full detail.

---

### P-14 — Portfolio Intelligence | **Complete**

**What exists:**
- Fleet governance dashboard with deployed agent posture and quality scores
- Viewer role with read-only governance visibility
- Daily AI-synthesized intelligence briefings (`intelligenceBriefings` table)
- System health snapshots (`systemHealthSnapshots` table)
- `src/lib/awareness/briefing-generator.ts` — daily briefing generation
- `src/lib/awareness/anomaly-detector.ts` — anomaly detection

**What was built (H2-5):** `portfolioSnapshots` table + weekly cron + trend API + governor sparklines (H2-5.1); `costRates` settings + per-agent cost API + fleet cost rollup + registry cost column (H2-5.2); Executive Dashboard at `/governor/executive` with 6 KPI cards + PDF export (H2-5.3).

---

## A — Architect Product

The design studio. Feature-complete as of Phase 54. **19/19 — 100%.**

**Buyer:** AI/ML teams, innovation leads, platform engineering.

---

### A-01 — 3-Phase Structured Intake | **Complete**

**What was built:** Intake sessions have 3 sequential phases. Phase 1 captures core context (agent name, purpose, target audience, tools requested). Phase 2 is risk-aware probing driven by the agent's type and risk tier — different probing paths for automation vs. autonomous agents and low vs. critical risk. Phase 3 covers use case elaboration.

**Key files:**
- `src/lib/intake/system-prompt.ts` — phase-specific system prompt construction
- `src/lib/intake/tools.ts` — AI SDK tool definitions for each intake phase
- `src/lib/intake/probing.ts` — risk-aware probing question generation
- `src/app/api/intake/sessions/[id]/chat/route.ts` — main intake chat streaming handler
- `src/app/api/intake/sessions/[id]/context/route.ts` — Phase 1 context submission
- `src/app/api/intake/sessions/[id]/classification/route.ts` — agent type + risk tier classification

---

### A-02 — Multi-Turn AI Conversation | **Complete**

**What was built:** Streaming intake chat using AI SDK v6 (`useChat` hook, `DefaultChatTransport`, `sendMessage({ text })`). Server-sent events for streaming. Tool calls rendered inline in the message list. Error state with Retry button uses `error` + `reload` from `useChat`.

**Key files:**
- `src/components/chat/chat-container.tsx` — `useChat` hook, message list, error/retry banner
- `src/components/chat/chat-input.tsx` — text input with streaming-aware disable state
- `src/app/api/intake/sessions/[id]/chat/route.ts` — AI SDK streaming response
- `src/components/chat/tool-call-display.tsx` — inline tool result rendering

---

### A-03 — Expertise Detection + Adaptive Routing | **Complete**

**What was built:** After turn 2 of intake, the AI evaluates user expertise level (`guided` / `adaptive` / `expert`) from message vocabulary, detail level, and domain knowledge signals. Stored in `intakeSessions.expertiseLevel`. All subsequent prompts adapt depth, vocabulary, and follow-up questions to match the detected expertise level.

**Key files:**
- `src/lib/intake/model-selector.ts` — expertise level detection
- `src/lib/intake/system-prompt.ts` — expertise-aware prompt adaptation
- `src/app/api/intake/sessions/[id]/classification/route.ts` — stores classification result

---

### A-04 — Stakeholder Collaboration | **Complete**

**What was built:** 7 domain workspaces (compliance, risk, legal, security, IT, operations, business). Architects invite domain experts via tokenized email links. Each expert fills domain-specific structured fields without seeing other domains. An AI orchestrator synthesizes all contributions, detects cross-domain requirement conflicts, and identifies coverage gaps.

**Key files:**
- `src/app/api/intake/sessions/[id]/invitations/route.ts` — invite generation (creates token, sends email)
- `src/app/api/intake/sessions/[id]/contributions/route.ts` — contribution CRUD
- `src/app/api/intake/sessions/[id]/stakeholder-chat/route.ts` — per-domain AI chat
- `src/lib/intake/orchestrator.ts` — conflict detection, gap analysis, synthesis
- `src/components/intake/stakeholder-workspace.tsx` — stakeholder domain UI
- `src/app/api/intake/invitations/[token]/route.ts` — tokenized invite acceptance

---

### A-05 — AI Orchestrator | **Complete**

**What was built:** Synthesizes multiple stakeholder domain contributions, detects requirement conflicts between domains (e.g., security requires encryption but IT says encryption impedes performance), identifies which of the 7 governance domains have incomplete coverage, and generates integrated insights.

**Key files:**
- `src/lib/intake/orchestrator.ts` — main orchestration logic
- `src/lib/intake/coverage.ts` — 7-domain coverage gap detection
- `src/app/api/intake/sessions/[id]/insights/route.ts` — AI insight generation endpoint
- `src/app/api/intake/sessions/[id]/insights/[insightId]/route.ts` — single insight operations

---

### A-06 — Intake Confidence + Readiness Scoring | **Complete**

**What was built:** Readiness score (0-100) evaluates intake completeness across all required fields and governance domains. Score < threshold blocks blueprint generation with a specific message about what's missing. Displayed as a progress indicator on the intake page.

**Key files:**
- `src/lib/intake/readiness.ts` — `computeReadiness()` — completeness scoring algorithm
- `src/app/api/intake/sessions/[id]/finalize/route.ts` — finalization gate (checks readiness)

---

### A-07 — Completeness Map | **Complete**

**What was built:** 7×1 visual grid showing which governance domains have been addressed by intake responses and stakeholder contributions. Cells show filled/empty with domain labels. Used to guide architects toward missing areas before generating.

**Key files:**
- `src/components/intake/completeness-map.tsx` — visual 7-domain grid component
- `src/lib/intake/coverage.ts` — coverage computation per domain

---

### A-08 — Blueprint Generation | **Complete**

**What was built:** Claude `generateObject()` produces a full ABP document from finalized intake data + context + classification. Governance validation runs immediately after generation. Blueprint stored in `agentBlueprints` with validation report denormalized. Returns `{ id, agentId, abp, validationReport }`.

**Key files:**
- `src/lib/generation/generate.ts` — `generateBlueprint()`, `assembleABP()`
- `src/lib/generation/system-prompt.ts` — generation system prompt (BASE_GENERATION_PROMPT)
- `src/app/api/blueprints/route.ts` — `POST /api/blueprints` — generation endpoint (auth: architect/admin)
- `src/lib/types/abp.ts` — `ABPSchema` Zod schema, `ABP` TypeScript type

---

### A-09 — Multi-Turn Refinement Chat | **Complete**

**What was built:** Streaming multi-turn chat for refining an existing blueprint. Each message produces a full updated ABP. The AI explains changes made. Uses AI SDK `streamText()` with `toDataStreamResponse()`. Error state with Retry button.

**Key files:**
- `src/app/api/blueprints/[id]/refine/stream/route.ts` — streaming refinement endpoint
- `src/components/blueprint/refinement-chat.tsx` — refinement chat UI with error/retry
- `src/app/api/blueprints/[id]/refine/route.ts` — non-streaming refinement (legacy)

---

### A-10 — Blueprint Regeneration | **Complete**

**What was built:** Re-runs generation from stored intake data. Used when intake is significantly updated or the previous generation was inadequate. Replaces the ABP in-place on the same blueprint record.

**Key files:**
- `src/app/api/blueprints/[id]/regenerate/route.ts` — `POST /api/blueprints/[id]/regenerate`

---

### A-11 — Blueprint Studio | **Complete**

**What was built:** 7-section tabbed UI showing all ABP sections: identity, tools, instructions, constraints, ownership, governance section, behavioral tests. Studio has tabs: Overview, Quality, Simulate, Red Team, Tests, Lineage. Each section editable via refinement.

**Key files:**
- `src/app/blueprints/[id]/page.tsx` — Blueprint Studio page
- `src/components/blueprint/blueprint-view.tsx` — ABP section rendering components
- `src/app/registry/[agentId]/page.tsx` — registry detail page (Quality, Simulate, Red Team, Tests, Lineage tabs)

---

### A-12 — Agent Simulation | **Complete**

**What was built:** Stateless chat playground simulating the agent as if deployed. System prompt constructed from ABP (instructions, constraints, persona). No state persisted between simulation messages.

**Key files:**
- `src/app/api/blueprints/[id]/simulate/chat/route.ts` — simulation chat streaming endpoint
- `src/components/registry/simulate-panel.tsx` — simulation UI (on the Simulate tab)

---

### A-13 — Red-Team Security Evaluation | **Complete**

**What was built:** 5 attack categories evaluated against the agent: prompt injection, data exfiltration, instruction override, jailbreak, social engineering. Each attack: AI generates adversarial prompt, runs against agent, evaluates pass/fail with evidence transcript.

**Key files:**
- `src/lib/testing/red-team.ts` — attack definitions + AI-based evaluation
- `src/lib/types/red-team.ts` — `RedTeamResult` type
- `src/app/api/blueprints/[id]/simulate/red-team/route.ts` — red-team API endpoint
- `src/components/registry/red-team-panel.tsx` — red-team results UI

---

### A-14 — Behavioral Test Harness | **Complete**

**What was built:** Test cases (inputPrompt + expectedBehavior) stored per logical agent (`agentId`). Run against any blueprint version. Results stored in `blueprintTestRuns` as append-only evidence. Test severity: required / informational.

**Key files:**
- `src/lib/testing/executor.ts` — test case execution engine (AI evaluates expected vs. actual)
- `src/app/api/registry/[agentId]/test-cases/route.ts` — test case CRUD
- `src/app/api/registry/[agentId]/test-cases/[caseId]/route.ts` — single test case
- `src/app/api/blueprints/[id]/test-runs/route.ts` — run test suite + store results

---

### A-15 — Blueprint Quality Dashboard | **Complete**

**What was built:** 5-dimension AI quality evaluation: intent alignment, tool appropriateness, instruction specificity, governance adequacy, ownership completeness. Each dimension scored 1-5. Overall score 0-100. AI generates flags (specific improvement notes) per dimension. Score stored in `blueprintQualityScores`.

**Key files:**
- `src/lib/awareness/quality-evaluator.ts` — AI quality evaluation (calls Claude)
- `src/components/blueprint/quality-dashboard.tsx` — quality visualization component
- `src/app/api/registry/[agentId]/quality/route.ts` — quality score retrieval API
- `src/lib/db/schema.ts` — `blueprintQualityScores` table

---

### A-16 — Blueprint Template Library | **Complete**

**What was built:** 6 starter templates covering common agent archetypes (Customer Service, Code Review, Compliance Monitor, Data Access, Decision Support, Automation). Each is a pre-populated ABP. Selecting a template creates an intake session pre-filled with template data.

**Key files:**
- `src/lib/templates/blueprint-templates.ts` — 6 template definitions
- `src/app/api/templates/route.ts` — `GET /api/templates` — template list
- `src/app/api/templates/[id]/use/route.ts` — `POST /api/templates/[id]/use` — creates intake session from template
- `src/components/templates/use-template-button.tsx` — template selection UI

---

### A-17 — Agent Code Export | **Complete**

**What was built:** Exports an ABP as a working TypeScript agent implementation file. Generates a class with system prompt, tool stubs, and governance constraints embedded as comments.

**Key files:**
- `src/lib/export/code-generator.ts` — TypeScript code generation
- `src/app/api/blueprints/[id]/export/code/route.ts` — code export endpoint

---

### A-18 — Clone + Version Iteration | **Complete**

**What was built:** Clone creates a new blueprint with a fresh `agentId` and version 1.0.0 — completely independent lineage. New-version creates v1.1.0/v2.0.0/etc. from a deployed agent (same `agentId`, records `previousBlueprintId` + `governanceDiff`).

**Key files:**
- `src/app/api/blueprints/[id]/clone/route.ts` — clone endpoint (new agentId)
- `src/app/api/blueprints/[id]/new-version/route.ts` — version iteration (same agentId)

---

### A-19 — Contextual Help Copilot + Command Palette | **Complete**

**What was built:** Sliding help panel powered by Claude. System prompt includes current page, feature list, and role context. Command palette (Cmd+K / Ctrl+K) with keyboard-navigable page links and live agent registry search.

**Key files:**
- `src/app/api/help/chat/route.ts` — help copilot AI endpoint (`buildHelpSystemPrompt()`)
- `src/components/help/help-panel.tsx` — sliding help panel with chat
- `src/components/nav/command-palette.tsx` — Cmd+K command palette with registry search

---

## G — Governor Product

Governance, approval, and compliance interface. **16/17 — 94%.**

**Buyer:** CRO, CISO, compliance officers, external auditors.

---

### G-01 — Policy CRUD + Lifecycle | **Complete**

**What was built:** Governance policies with 5 types (`safety`, `compliance`, `data_handling`, `access_control`, `audit`). Each policy has a JSON `rules` array with dot-notation field references and operator conditions. CRUD with enterprise scoping. Active policies auto-applied during blueprint validation.

**Key files:**
- `src/app/api/governance/policies/route.ts` — `GET/POST /api/governance/policies`
- `src/app/api/governance/policies/[id]/route.ts` — `GET/PATCH/DELETE` single policy
- `src/components/governance/policy-form.tsx` — policy creation/edit form
- `src/lib/db/schema.ts` — `governancePolicies` table

---

### G-02 — Policy Versioning | **Complete**

**What was built:** Each `PATCH` to a policy creates a new row linked via `previousVersionId`. Old versions preserved (append-only integrity). `policyVersion` integer increments. `supersededAt` timestamp set on old version.

**Key files:**
- `src/app/api/governance/policies/[id]/route.ts` — PATCH handler creates new version row
- `src/app/api/governance/policies/[id]/history/route.ts` — full version chain query

---

### G-03 — Policy Template Library | **Complete**

**What was built:** Pre-built SR 11-7 compliant policy template packs. Enterprises import template packs as a starting point for governance. Templates cover model risk management, data governance, and access controls.

**Key files:**
- `src/lib/governance/policy-templates.ts` — template pack definitions
- `src/app/api/governance/templates/route.ts` — `GET /api/governance/templates`
- `src/app/api/governance/templates/[pack]/apply/route.ts` — apply template pack to enterprise

---

### G-04 — Policy Simulation | **Complete**

**What was built:** Test a policy rule set against any ABP before activating the policy. Returns which rules pass/fail without persisting anything to the database.

**Key files:**
- `src/app/api/governance/policies/simulate/route.ts` — `POST /api/governance/policies/simulate`

---

### G-05 — Governance Hub | **Complete**

**What was built:** Analytics dashboard showing policy violation heatmap, policy usage across blueprints, violation trend over time, most frequently triggered rules, and quality score distributions.

**Key files:**
- `src/app/api/governance/analytics/route.ts` — analytics aggregation endpoint

---

### G-06 — Multi-Step Approval Workflow | **Complete**

**What was built:** Configurable N-step approval chain per enterprise (stored in enterprise settings as `ApprovalStep[]`). Each step requires a specific role. Progress tracked in `agentBlueprints.approvalProgress`. SOD: the architect who submitted cannot be a reviewer in any step. AI-generated review brief summarizes key risks for reviewers.

**Key files:**
- `src/app/api/blueprints/[id]/review/route.ts` — step-by-step approval / rejection
- `src/app/api/blueprints/[id]/review-brief/route.ts` — AI review brief generation
- `src/lib/settings/types.ts` — `ApprovalStep[]` enterprise setting shape
- `src/lib/settings/get-settings.ts` — enterprise settings loader with defaults
- `src/lib/db/schema.ts` — `agentBlueprints.approvalProgress` (jsonb)

---

### G-07 — Review Queue | **Complete**

**What was built:** `GET /api/review` returns all blueprints with `status = 'in_review'` for the current enterprise. Review console shows governance validation report, reviewer comments, SLA status, and approval controls.

**Key files:**
- `src/app/api/review/route.ts` — review queue with SLA calculation
- `src/components/review/review-panel.tsx` — review UI with governance violations + controls

---

### G-08 — MRM Compliance Report | **Complete**

**What was built:** 14-section SR 11-7 compliant report covering model inventory, purpose, validation methodology, risk classification, ownership, SOD evidence, governance controls, monitoring plan, escalation procedures, regulatory mapping, change history, test results, remediation log, and sign-off chain. Generated as HTML (display) and JSON (machine consumption).

**Key files:**
- `src/lib/mrm/report.ts` — `generateMRMReport()` — 14-section report generator
- `src/lib/mrm/types.ts` — `MRMReport`, `SODEvidence`, all section types
- `src/app/api/blueprints/[id]/report/route.ts` — report generation API
- `src/app/blueprints/[id]/report/page.tsx` — report display page (print-optimized)

---

### G-09 — Evidence Package Export | **Complete**

**What was built:** 14-section ZIP archive for external auditors. Contents: MRM report (HTML+JSON), governance validation report, audit trail, test results, red-team report, regulatory mapping, ownership chain, SOD evidence, policy snapshot, quality scores, version history, deployment metadata, review history, sign-off records.

**Key files:**
- `src/app/api/blueprints/[id]/evidence-package/route.ts` — ZIP bundle generation

---

### G-10 — Regulatory Mapping Report | **Complete**

**What was built:** Maps ABP characteristics to applicable articles within GDPR, CCPA, SOX, and HIPAA. Identifies which articles are relevant to the agent, which requirements are satisfied, and which need attention.

**Key files:**
- `src/lib/regulatory/classifier.ts` — ABP → regulatory framework mapping logic
- `src/lib/regulatory/frameworks.ts` — GDPR/CCPA/SOX/HIPAA article definitions
- `src/app/api/blueprints/[id]/regulatory/route.ts` — regulatory report API
- `src/app/api/blueprints/[id]/export/compliance/route.ts` — compliance export

---

### G-11 — Compliance Posture Dashboard | **Complete**

**What was built:** Fleet-level compliance view: percentage of agents with clean/critical/unknown governance health, policy adherence rate, SLA compliance rate. Aggregated across all deployed agents in the enterprise.

**Key files:**
- `src/app/api/compliance/posture/route.ts` — `GET /api/compliance/posture`

---

### G-12 — Fleet Governance Dashboard | **Complete**

**What was built:** CRO/CISO view showing all deployed agents with governance health status, quality scores, violation counts, and risk tier. Sortable. Viewer role can access this view.

**Key files:**
- `src/app/api/monitor/route.ts` — fleet monitoring data
- `src/app/api/monitor/check-all/route.ts` — trigger health checks for all deployed agents
- `src/components/dashboard/fleet-governance-dashboard.tsx` — fleet dashboard component

---

### G-13 — Blueprint Lineage with Governance Diff | **Complete**

**What was built:** Version history shows each version alongside its `governanceDiff` — which policies had more/fewer violations compared to the previous version. `governanceDiff` computed and stored at version-creation time (not recomputed on read). Diff shows added/removed/changed ABP sections.

**Key files:**
- `src/lib/diff/abp-diff.ts` — `diffABP()` — structural diff computation
- `src/app/api/blueprints/[id]/diff/route.ts` — diff retrieval endpoint
- `src/components/registry/version-diff.tsx` — diff visualization UI

---

### G-14 — SR 11-7 Periodic Review Scheduling | **Complete**

**What was built:** Each deployed agent has `nextReviewDue` date (computed from deployment date + enterprise SLA config). Cron job sends reminder notifications at 30, 14, and 7 days before due. `lastReminderSentAt` prevents duplicate sends. Completing a periodic review resets the schedule.

**Key files:**
- `src/app/api/cron/review-reminders/route.ts` — reminder cron job (check due dates, send notifications)
- `src/app/api/blueprints/[id]/periodic-review/complete/route.ts` — complete review, reset `nextReviewDue`
- `src/lib/db/schema.ts` — `agentBlueprints.nextReviewDue`, `lastPeriodicReviewAt`, `lastReminderSentAt`

---

### G-15 — Deployment Health Checks | **Complete**

**What was built:** Periodic re-validation of deployed agents against the **current** policy set (policies may have changed since deployment). Upserts `deploymentHealth` table with `healthStatus`: `clean` / `critical` / `unknown`. Daily AI-synthesized intelligence briefings summarize fleet health. System health snapshots record aggregate metrics.

**Key files:**
- `src/lib/monitoring/health.ts` — `checkDeploymentHealth()`, `checkAllDeployedAgents()`
- `src/app/api/monitor/check-all/route.ts` — trigger all health checks
- `src/app/api/monitor/[agentId]/check/route.ts` — single agent health check
- `src/lib/awareness/briefing-generator.ts` — daily AI briefing generation
- `src/lib/awareness/metrics-worker.ts` — system health snapshot computation
- `src/app/api/monitor/intelligence/briefing/route.ts` — briefing retrieval
- `src/lib/db/schema.ts` — `deploymentHealth`, `systemHealthSnapshots`, `intelligenceBriefings` tables

---

### G-16 — Viewer Role | **Complete**

**What was built:** Read-only role (`viewer`) with access to blueprints, governance dashboards, audit trails, compliance reports, and fleet status. Cannot create, modify, approve, or deploy. All read API endpoints include `viewer` in their `requireAuth()` allowed roles list. Write endpoints exclude viewer.

**Key files:**
- `src/lib/auth/require.ts` — `requireAuth(["viewer", ...])` — viewer included in all read paths

---

### G-17 — Dedicated Governor Entry Point / Navigation | **Complete**

Governor role users (reviewer, compliance_officer) currently land on the main Architect-oriented dashboard. They need a dedicated product entry point with governor-specific navigation.

**What was built:** See H1-2 for full implementation detail. Governor layout + sidebar (H1-2.1), role-based landing page routing (H1-2.2), and Governor home dashboard (H1-2.3) are all complete. Executive link added to governor sidebar in H2-6.1.

---

## D — Technical Debt

Must resolve in H1. All items cross-reference the H1 deliverable that resolves them.

---

### D-01 — ABP Schema Migration Strategy | **Complete** | Severity: High

**Problem:** No migration path for ABPs stored in the database. If the ABP schema changes (adding the `execution` section in H1-3.2), existing stored ABPs will fail Zod validation when read. There are currently ~N ABPs in production with no `version` field and no `execution` section.

**What to build:** See H1-3.1 (migration framework), H1-3.2 (ABP v1.1.0 schema), H1-3.3 (migrate-on-read integration).

**Definition of done:**
- [ ] Every place that reads an ABP from the DB uses `readABP()` (migrate-on-read) instead of `blueprint.abp as ABP`
- [ ] Old ABPs without a `version` field auto-migrate to `"1.0.0"` on read
- [ ] New blueprints generated with `version: "1.1.0"` and `execution` section
- [ ] No runtime Zod parse errors on any existing stored ABP

---

### D-02 — Webhook Delivery Wiring | **Complete** | Severity: Medium

**Problem:** The admin webhook CRUD UI and webhook delivery infrastructure exist (`webhooks`, `webhookDeliveries` tables; `dispatch.ts`; `deliver.ts`). However, API routes call `writeAuditLog()` which does NOT trigger `dispatch.ts`. Webhooks are never actually sent.

**What to build:** See H1-4.2 (event bus + webhook dispatch wiring).

**Definition of done:**
- [ ] Creating a webhook via admin UI + triggering a blueprint lifecycle event → delivery record appears in `webhookDeliveries` with `status: 'success'`
- [ ] All `writeAuditLog()` call sites replaced with `publishEvent()` which writes audit log AND dispatches webhooks

---

### D-03 — In-Memory Rate Limiting | **Complete** | Severity: Medium

**Problem:** `src/lib/rate-limit.ts` uses an in-process `Map<string, Window>` sliding window. This fails silently across multiple Node.js instances (every instance has its own window, so a user can multiply their effective rate limit by the instance count). Unacceptable in any multi-instance deployment.

**What to build:** See H1-5.1 (Redis-backed rate limiting).

**Definition of done:**
- [ ] `rateLimit()` uses Redis sorted sets when `REDIS_URL` env var is set
- [ ] Falls back to in-memory `Map` when `REDIS_URL` is absent (local dev)
- [ ] Same public API and 429 response format as current implementation

---

### D-04 — Help System Prompt Coverage | **Complete** | Severity: Low

**Problem:** `buildHelpSystemPrompt()` in `src/app/api/help/chat/route.ts` describes features from early phases only. It is missing: stakeholder collaboration (Phase 48), red-team testing (Phase 41), blueprint quality dashboard (Phase 54), refinement chat (Phase 54), blueprint lineage (Phase 52), agent registry search in command palette (Phase 54), viewer role (Phase 53). Role list still says "designer" in some places instead of "architect".

**What to build:** See H1-5.3 (help prompt refresh) for the exact text additions required.

**Definition of done:**
- [ ] `buildHelpSystemPrompt()` covers all 7 missing feature areas
- [ ] No references to "designer" role — all say "architect"
- [ ] Role list includes "viewer"

---

### D-05 — DB Schema Role Comments | **Complete**

Updated in Phase 54 (architect rename). `src/lib/db/schema.ts` comment on `users.role` reads: `// architect | reviewer | compliance_officer | admin | viewer`.

---

## Cancelled / Deferred

| Item | Decision | Date |
|---|---|---|
| Reviewer Monitoring Access | Cancelled — reviewer scope is sufficient | 2026-03-19 |
| Split Admin Roles | Cancelled — single admin role adequate for current scale | 2026-03-19 |
| Command as standalone product | Absorbed into Portfolio Intelligence (P-14) — it's a view, not a product | 2026-03-19 |
| Foundry execution runtime | Deferred to H3. Gated on: runtime governance + observability + 3 design partners | 2026-03-19 |
| Enterprise memory / knowledge graph | Deferred to H3. No telemetry to populate it yet. Accumulates as side effect of execution | 2026-03-19 |

---

## H1 — Close the Loop (Now → 3 months)

**Theme:** Connect deployed agents back to the governance system. "Governed AI agents" must be a continuous property, not a point-in-time check.

**Completion: 17/17 — 100%**

---

### H1-1: Production Observability Pipeline [P0]

Closes the highest-value gap: Intellios has zero visibility into what deployed agents do in production.

---

#### H1-1.1 — Telemetry Data Model + Ingestion API

**Depends on:** nothing

**What to build:**

1. **New DB table `agentTelemetry`** in `src/lib/db/schema.ts`:
   - Columns: `id` (uuid PK), `agentId` (text, FK → `agentBlueprints.agentId`), `enterpriseId` (text, nullable), `timestamp` (timestamp), `invocations` (integer), `errors` (integer), `latencyP50Ms` (integer), `latencyP99Ms` (integer), `tokensIn` (integer), `tokensOut` (integer), `policyViolations` (integer), `customMetrics` (jsonb, nullable), `source` (text — `"push"` or `"cloudwatch"`), `createdAt` (timestamp, default now)
   - Index on `(agentId, timestamp)` for time-range queries
   - Index on `(enterpriseId)` for tenant filtering

2. **New API route `src/app/api/telemetry/ingest/route.ts`**:
   - `POST /api/telemetry/ingest` — accepts array of metric data points
   - Auth: API key in `Authorization: Bearer <key>` header (not session-based — external agents push data)
   - API key validation: match against env var `TELEMETRY_API_KEY` for simplicity (full API key management deferred to H3-4.3)
   - Request body Zod schema: `{ metrics: Array<{ agentId, timestamp, invocations, errors, latencyP50Ms, latencyP99Ms, tokensIn, tokensOut, policyViolations, customMetrics? }> }`
   - Validate each `agentId` exists in `agentBlueprints` with status `deployed`
   - Batch insert into `agentTelemetry`
   - Return `{ ingested: number, errors: Array<{ agentId, reason }> }`

3. **New API route `src/app/api/telemetry/[agentId]/route.ts`**:
   - `GET /api/telemetry/[agentId]?since=<ISO>&until=<ISO>&granularity=<hour|day|week>`
   - Auth: `requireAuth()` — any authenticated user can read telemetry for their enterprise
   - Query `agentTelemetry` where `agentId` matches and within time range
   - Return time-series array sorted by timestamp

4. **Drizzle migration**: generate and apply via `npx drizzle-kit generate` then `npx drizzle-kit push` (run from `src/` directory with `--env-file=.env.local`)

**Definition of done:**
- [x] `agentTelemetry` table exists in schema with correct columns and indexes
- [x] `POST /api/telemetry/ingest` accepts valid payloads and inserts rows
- [x] `POST /api/telemetry/ingest` rejects invalid agentIds with structured errors
- [x] `POST /api/telemetry/ingest` rejects requests without valid API key (401)
- [x] `GET /api/telemetry/[agentId]` returns time-series data filtered by time range
- [x] `npx tsc --noEmit` passes with 0 errors

---

#### H1-1.2 — AgentCore Telemetry Connector

**Depends on:** H1-1.1

**What to build:**

1. **New lib module `src/lib/telemetry/agentcore-poller.ts`**:
   - Function `pollAgentCoreMetrics(agentId: string, region: string, bedrockAgentId: string)`: calls AWS CloudWatch `getMetricData` for Bedrock agent metrics (invocations, errors, latency)
   - Maps Bedrock metric names to Intellios telemetry schema fields
   - Returns array of telemetry data points in the same shape as the ingest API body

2. **New lib module `src/lib/telemetry/sync.ts`**:
   - Function `syncAllAgentCoreTelemetry()`: queries `agentBlueprints` where `deploymentTarget = 'agentcore'` AND `status = 'deployed'`, extracts `deploymentMetadata.agentId` / `region` / `agentArn`, calls `pollAgentCoreMetrics` for each, batch-inserts into `agentTelemetry` with `source = 'cloudwatch'`
   - Tracks last sync timestamp per agent to avoid duplicate data

3. **New API route `src/app/api/cron/telemetry-sync/route.ts`**:
   - `POST /api/cron/telemetry-sync` — triggers `syncAllAgentCoreTelemetry()`
   - Auth: same pattern as `src/app/api/cron/review-reminders/route.ts` (cron secret header)
   - Returns `{ synced: number, errors: number }`

4. **AWS SDK dependency**: add `@aws-sdk/client-cloudwatch` to `package.json`

**Definition of done:**
- [x] `pollAgentCoreMetrics()` fetches CloudWatch data for a given Bedrock agent
- [x] `syncAllAgentCoreTelemetry()` iterates all deployed AgentCore agents and ingests telemetry
- [x] Cron route callable and returns sync results
- [x] Telemetry rows appear in `agentTelemetry` with `source = 'cloudwatch'`
- [x] `npx tsc --noEmit` passes with 0 errors

---

#### H1-1.3 — Production Tab UI

**Depends on:** H1-1.1

**What to build:**

1. **Add `"production"` tab** to `src/app/registry/[agentId]/page.tsx`:
   - Add to the `Tab` type union: `| "production"`
   - Add to the `tabs` array: `{ id: "production", label: "Production" }`
   - Only show tab when blueprint status is `deployed`
   - Fetch `GET /api/telemetry/[agentId]?since=<7d ago>` in a `useEffect`
   - Store in state: `telemetryData`, `telemetryLoading`

2. **New component `src/components/registry/production-dashboard.tsx`**:
   - Props: `{ agentId: string; data: TelemetryDataPoint[] | null; loading: boolean }`
   - **Empty state**: "No production telemetry yet. Configure your agent to send metrics to the Intellios telemetry API."
   - **Status indicator**: badge — `Healthy` (errors < 5% of invocations, last 24h), `Degraded` (5-20%), `Offline` (zero invocations last 6h), `Unknown` (no data)
   - **KPI cards row**: Total invocations (7d), Error rate (%), P50 latency (ms), P99 latency (ms), Tokens consumed
   - **Time-series chart**: simple div-based bar visualization (one row per day, bar width proportional to max value — same approach as existing quality dashboard bars). Show invocations and errors.
   - **"Last seen" timestamp**: relative time since most recent telemetry data point

**Definition of done:**
- [x] "Production" tab appears on registry detail page for deployed agents only
- [x] Tab fetches telemetry data from API
- [x] Empty state shown when no data exists
- [x] KPI cards display correct aggregated values
- [x] Status indicator computes health from error rate + recency
- [x] Time-series visualization renders per-day bars
- [x] `npx tsc --noEmit` passes with 0 errors

---

#### H1-1.4 — Health Check Integration

**Depends on:** H1-1.1, H1-1.2

**What to build:**

1. **Extend `src/lib/monitoring/health.ts`**:
   - Modify `checkDeploymentHealth()` to also query latest telemetry from `agentTelemetry` (last 24h aggregate)
   - New health status logic: `critical` if governance violations > 0 OR error rate > 20%; `degraded` if error rate 5-20% OR zero invocations for 6h; `clean` otherwise
   - Add `degraded` as a valid value for `deploymentHealth.healthStatus`
   - Store production metrics in `deploymentHealth` — add columns `productionErrorRate` (numeric), `productionLatencyP99` (integer), `lastTelemetryAt` (timestamp) via schema migration

2. **Update monitor dashboard** `src/app/monitor/page.tsx`:
   - Show combined governance + production health status
   - "Degraded" agents shown in amber alongside "Critical" in red
   - Add "Production Status" column with last-seen timestamp

**Definition of done:**
- [x] `checkDeploymentHealth()` incorporates telemetry data into health status
- [x] New `degraded` status value works throughout the system (DB, API, UI)
- [x] Monitor dashboard shows combined governance + production health
- [x] `deploymentHealth` table has new production metric columns
- [x] `npx tsc --noEmit` passes with 0 errors

---

#### H1-1.5 — Threshold Alerts

**Depends on:** H1-1.1, H1-4.2

**What to build:**

1. **New DB table `alertThresholds`** in `src/lib/db/schema.ts`:
   - Columns: `id` (uuid PK), `agentId` (text), `enterpriseId` (text, nullable), `metric` (text — `"error_rate"`, `"latency_p99"`, `"zero_invocations"`, `"policy_violations"`), `operator` (text — `"gt"`, `"lt"`, `"eq"`), `value` (real), `windowMinutes` (integer), `enabled` (boolean, default true), `createdBy` (text), `createdAt`, `updatedAt`

2. **New lib module `src/lib/telemetry/alerts.ts`**:
   - `evaluateThresholds(agentId)`: loads thresholds, queries recent telemetry within each window, evaluates conditions, returns `{ threshold, currentValue, breached }[]`
   - `checkAndFireAlerts()`: for each deployed agent, call `evaluateThresholds()`, for breached thresholds: create notification via `createNotification()` + publish event `blueprint.threshold_alert` via `publishEvent()`

3. **New API routes**:
   - `GET/POST /api/registry/[agentId]/alerts/route.ts` — CRUD for alert thresholds
   - `POST /api/cron/alert-check/route.ts` — triggers `checkAndFireAlerts()` for all deployed agents

4. **UI**: "Alert Thresholds" section in production dashboard. List thresholds with enable/disable toggle. "Add Threshold" form: metric selector, operator, value, window.

**Definition of done:**
- [x] `alertThresholds` table exists with correct schema
- [x] Thresholds CRUD works via API
- [x] `checkAndFireAlerts()` evaluates telemetry against thresholds correctly
- [x] Breached thresholds create in-app notifications
- [x] Breached thresholds fire webhook events via event bus
- [x] New event type `blueprint.threshold_alert` added to `AuditAction` + `EventType`
- [x] Production dashboard UI shows threshold management
- [x] `npx tsc --noEmit` passes with 0 errors

---

### H1-2: Governor Product Extraction

No new backend — UX extraction of existing governance capabilities into a focused entry point.

---

#### H1-2.1 — Governor Layout + Navigation

**Depends on:** nothing

**What to build:**

1. **New layout `src/app/governor/layout.tsx`**:
   - Server component wrapping all Governor pages
   - Uses a governor-specific sidebar (separate from main Architect sidebar in `src/components/nav/sidebar.tsx`)
   - Shares platform header: `NotificationBell`, `HelpPanel`, user menu
   - Access: `requireAuth(["reviewer", "compliance_officer", "admin"])` — architects cannot access Governor

2. **New sidebar component `src/components/nav/governor-sidebar.tsx`**:
   - Navigation sections:
     - **Approvals**: `/governor/approvals` — pending review queue
     - **Policies**: `/governor/policies` — policy management
     - **Compliance**: `/governor/compliance` — compliance posture
     - **Fleet**: `/governor/fleet` — fleet governance dashboard
     - **Audit**: `/governor/audit` — audit log
   - Same visual style as `src/components/nav/sidebar.tsx` (dark background, border-r, nav sections)
   - Include branding area and command palette trigger

3. **Governor page stubs** — each re-exports or wraps the existing page content:
   - `src/app/governor/page.tsx` — placeholder (will become home page in H1-2.3)
   - `src/app/governor/approvals/page.tsx` — renders existing review queue content
   - `src/app/governor/policies/page.tsx` — renders existing governance policy list
   - `src/app/governor/compliance/page.tsx` — renders existing compliance posture
   - `src/app/governor/fleet/page.tsx` — renders existing fleet governance dashboard
   - `src/app/governor/audit/page.tsx` — renders existing audit log viewer

4. **Update `src/components/nav/sidebar.tsx`**: add "Governor" link in the Governance section for reviewer/compliance_officer/admin roles, pointing to `/governor`

**Definition of done:**
- [x] `/governor` route renders with dedicated sidebar navigation
- [x] All 5 sub-pages render existing functionality without duplication of logic
- [x] Governor sidebar shows correct nav items with active state highlighting
- [x] Platform header (notifications, help, user) present in Governor layout
- [x] Only reviewer, compliance_officer, and admin can access `/governor` (architects get 403)
- [x] Main sidebar includes a "Governor" link for eligible roles
- [x] `npx tsc --noEmit` passes with 0 errors

---

#### H1-2.2 — Role-Based Landing

**Depends on:** H1-2.1

**What to build:**

1. **Modify `src/app/page.tsx`** (root page):
   - After auth check, read user's role from session
   - Redirect logic (server-side `redirect()` from `next/navigation`):
     - `compliance_officer` → `/governor`
     - `reviewer` → `/governor`
     - `architect` → stay on `/` (existing Architect home)
     - `admin` → stay on `/` (existing overview)
     - `viewer` → stay on `/` (existing read-only view)

**Definition of done:**
- [x] Compliance officers and reviewers land on `/governor` after login
- [x] Architects, admins, and viewers land on `/` after login
- [x] Redirect is server-side (no flash of wrong page on client)
- [x] `npx tsc --noEmit` passes with 0 errors

---

#### H1-2.3 — Governor Home Page

**Depends on:** H1-2.1

**What to build:**

1. **Implement `src/app/governor/page.tsx`** as a rich dashboard:
   - **Pending Approvals card**: count of blueprints in `in_review` + top 5 with name, submitted-by, SLA remaining. Data: `GET /api/review`
   - **Policy Health card**: active policies count, policies with recent violations count, stale policies count (not updated in 90+ days). Data: `GET /api/governance/analytics`
   - **Compliance KPIs**: overall compliance rate (% of deployed agents with `clean` health), average quality score, SLA compliance rate. Data: `GET /api/compliance/posture`
   - **Recent Audit Activity**: last 10 audit entries from past 24h with action, actor, timestamp. Data: `GET /api/audit?since=<24h ago>&limit=10`
   - All data fetched client-side via `useEffect` (same pattern as existing dashboard pages)

**Definition of done:**
- [x] Governor home page shows 4 data cards with live data
- [x] Pending approvals link to individual blueprint review pages
- [x] Policy health shows active/violated/stale counts
- [x] Compliance KPIs render correctly
- [x] Recent audit entries shown chronologically
- [x] Empty states shown when no data
- [x] `npx tsc --noEmit` passes with 0 errors

---

### H1-3: ABP Schema Migration

Resolves D-01 / OQ-007. Required before any artifact expansion in H2.

---

#### H1-3.1 — Migration Framework

**Depends on:** nothing

**What to build:**

1. **New lib module `src/lib/abp/migrate.ts`**:
   - `type ABPVersion = "1.0.0" | "1.1.0"` (extend as versions are added)
   - `type MigrationFn = (abp: Record<string, unknown>) => Record<string, unknown>`
   - Registry: `const MIGRATIONS: Map<string, MigrationFn>` — keyed by `"fromVersion→toVersion"`
   - `registerMigration(from, to, fn)` — adds to registry
   - `detectVersion(abp)` — reads `abp.version`; if missing, returns `"1.0.0"` (all current ABPs lack explicit version)
   - `migrateABP(abp, targetVersion)` — detects current version, walks the chain, applies each step, returns migrated ABP with updated `version` field
   - Throws descriptive error if no migration path exists

2. **New helper `src/lib/abp/read.ts`**:
   - `readABP(raw: unknown): ABP` — calls `migrateABP(raw, LATEST_VERSION)` then `ABPSchema.parse()`
   - This is the **single function all code should use** to read ABPs from the database
   - Do NOT replace existing read sites yet — that happens in H1-3.3

3. **Unit tests `src/lib/abp/__tests__/migrate.test.ts`**:
   - v1.0.0 ABP (no `version` field) detected as `"1.0.0"`
   - `migrateABP()` applies registered migrations in order
   - Migrating to current version is a no-op
   - Missing migration path throws

**Definition of done:**
- [x] `migrateABP()` correctly chains migrations from detected version to target
- [x] `detectVersion()` handles ABPs with and without `version` field
- [x] `readABP()` returns a fully typed, validated, migrated ABP
- [x] Unit tests cover all 4 cases above (13 passing)
- [x] `npx tsc --noEmit` passes with 0 errors

---

#### H1-3.2 — ABP v1.1.0 Schema

**Depends on:** H1-3.1

**What to build:**

1. **Extend ABP Zod schema** in `src/lib/types/abp.ts`:
   - Add `version: z.string().default("1.0.0")` to `ABPSchema`
   - Add `execution` section to `ABPContentSchema`:
     ```typescript
     execution: z.object({
       observability: z.object({
         metricsEnabled: z.boolean().default(true),
         logLevel: z.enum(["none", "errors", "info", "debug"]).default("errors"),
         samplingRate: z.number().min(0).max(1).default(1.0),
         telemetryEndpoint: z.string().nullable().default(null),
       }).default({}),
       runtimeConstraints: z.object({
         maxTokensPerInteraction: z.number().nullable().default(null),
         maxConcurrentSessions: z.number().nullable().default(null),
         circuitBreakerThreshold: z.number().min(0).max(1).nullable().default(null),
         sessionTimeoutMinutes: z.number().nullable().default(null),
       }).default({}),
       feedback: z.object({
         alertWebhook: z.string().nullable().default(null),
         escalationEmail: z.string().nullable().default(null),
       }).default({}),
     }).default({})
     ```
   - All fields have defaults — existing ABPs pass validation after migration

2. **Register 1.0.0 → 1.1.0 migration** in `src/lib/abp/migrate.ts`:
   - Migration function: adds `version: "1.1.0"` and `execution: {}` (defaults applied by Zod at parse time)

3. **Update schema changelog** `docs/schemas/abp/changelog.md`:
   - v1.1.0: added `execution` section (observability, runtimeConstraints, feedback), added explicit `version` field

4. **Create `docs/schemas/abp/v1.1.0.schema.json`** reflecting the new structure

**Definition of done:**
- [x] `ABPSchema` includes `execution` section with all sub-fields and defaults
- [x] `ABPSchema` includes `version` field
- [x] All existing stored ABPs pass validation after migration (defaults fill missing fields)
- [x] 1.0.0 → 1.1.0 migration registered and working end-to-end
- [x] Schema changelog updated; versioned JSON schema file created
- [x] `npx tsc --noEmit` passes with 0 errors

---

#### H1-3.3 — Generation Engine Update

**Depends on:** H1-3.2

**What to build:**

1. **Update `src/lib/generation/system-prompt.ts`**:
   - Add generation instructions for the `execution` section to `BASE_GENERATION_PROMPT`:
     - Set `execution.observability.metricsEnabled: true` for all production agents
     - Set `execution.observability.logLevel` based on risk tier: high/critical → `"info"`, medium → `"errors"`, low → `"none"`
     - Set `execution.runtimeConstraints.maxTokensPerInteraction` proportional to agent complexity
     - Set `execution.runtimeConstraints.circuitBreakerThreshold: 0.1` for high/critical risk agents

2. **Update `src/lib/generation/generate.ts`**:
   - `assembleABP()`: set `version: "1.1.0"` on newly generated ABPs
   - `refineBlueprint()`: preserve `execution` section during refinement

3. **Integrate migrate-on-read** — replace all `blueprint.abp as ABP` casts with `readABP(blueprint.abp)`. Key files to update (search for `as ABP` across the codebase):
   - `src/lib/mrm/report.ts`
   - `src/lib/monitoring/health.ts`
   - `src/app/api/blueprints/[id]/route.ts`
   - `src/app/api/blueprints/[id]/validate/route.ts`
   - `src/app/api/blueprints/[id]/refine/route.ts` and `stream/route.ts`
   - `src/app/api/blueprints/[id]/export/code/route.ts`
   - `src/app/api/blueprints/[id]/export/agentcore/route.ts`
   - `src/app/api/blueprints/[id]/simulate/chat/route.ts`
   - `src/app/api/registry/[agentId]/route.ts`
   - Any other file — search for `as ABP` to find all sites

4. **Update Blueprint Studio** `src/app/blueprints/[id]/page.tsx`:
   - Add "Execution" section to the stepper
   - Display observability config, runtime constraints, feedback settings
   - Editable fields for each sub-section

**Definition of done:**
- [x] New blueprints generated with `version: "1.1.0"` and populated `execution` section
- [x] Execution section content varies by risk tier
- [x] All `as ABP` casts replaced with `readABP()` — old blueprints auto-migrate on read
- [ ] Blueprint Studio shows execution section (deferred — not part of this sprint)
- [x] Refinement preserves execution section
- [x] `npx tsc --noEmit` passes with 0 errors

---

### H1-4: Eventing Formalization

Formalizes the implicit event system into a typed, dispatchable event bus. Resolves D-02.

---

#### H1-4.1 — Typed Event Definitions

**Depends on:** nothing

**What to build:**

1. **Rewrite `src/lib/events/types.ts`**:
   - Replace string union `EventType` with discriminated union `IntelliosEvent`:
     ```typescript
     type IntelliosEvent =
       | { type: "blueprint.created"; payload: { blueprintId: string; agentId: string; name: string; createdBy: string } }
       | { type: "blueprint.status_changed"; payload: { blueprintId: string; fromStatus: string; toStatus: string } }
       | { type: "blueprint.reviewed"; payload: { blueprintId: string; decision: string; reviewer: string; comment: string | null } }
       | { type: "policy.created"; payload: { policyId: string; name: string; type: string } }
       // ... one variant per existing EventType string value
     ```
   - Each variant has a typed `payload` — no more `Record<string, unknown>`
   - Export `EventEnvelope` type: `{ id: string; event: IntelliosEvent; timestamp: string; enterpriseId: string | null; actor: { email: string; role: string }; entity: { type: string; id: string } }`

2. **Synchronize `AuditAction` and `EventType`**: they are currently duplicate string unions in separate files. Derive `AuditAction` from `IntelliosEvent["type"]` — single source of truth.

3. All existing `writeAuditLog()` callers must still compile — make changes additive/backward-compatible.

**Definition of done:**
- [x] `IntelliosEvent` discriminated union covers all existing event types with typed payloads
- [x] `EventEnvelope` type wraps event with metadata
- [x] `AuditAction` derived from `IntelliosEvent["type"]`
- [x] All existing `writeAuditLog()` call sites still compile without modification
- [x] `npx tsc --noEmit` passes with 0 errors

---

#### H1-4.2 — Event Bus + Webhook Dispatch

**Depends on:** H1-4.1. Resolves D-02.

**What to build:**

1. **New function `publishEvent()`** in `src/lib/events/publish.ts`**:
   - Signature: `publishEvent(envelope: EventEnvelope): Promise<void>`
   - Internally: (1) writes audit log row via `writeAuditLog()`, (2) dispatches to event bus handlers (which includes `src/lib/webhooks/dispatch.ts`)
   - Replaces the current two-step `writeAuditLog() → dispatch()` pattern

2. **Migrate call sites**: replace all `writeAuditLog()` calls across API routes with `publishEvent()`:
   - Search for `writeAuditLog(` across all `src/app/api/` files
   - Each call site constructs an `EventEnvelope` with typed payload
   - This is approximately 40 call sites — mechanical migration

3. **Verify webhook dispatch works end-to-end**:
   - `src/lib/webhooks/dispatch.ts` registers as an event bus handler
   - `src/lib/webhooks/deliver.ts` does HMAC-signed HTTP POST with retry
   - After migration: create a webhook via admin UI, trigger an event, check `webhookDeliveries` table for a success record

4. **Add webhook delivery status to admin UI**: in `src/app/admin/webhooks/page.tsx`, show recent deliveries with status and response code

**Definition of done:**
- [x] `publishEvent()` function exists and combines audit write + event dispatch
- [x] All `writeAuditLog()` call sites migrated to `publishEvent()`
- [x] Webhook dispatch fires for matching events (writeAuditLog → dispatch → webhookDispatchHandler chain verified in code; delivery log UI in admin webhooks page)
- [x] D-02 marked resolved
- [x] `npx tsc --noEmit` passes with 0 errors

---

#### H1-4.3 — Event Filtering API

**Depends on:** H1-4.1, H1-4.2

**What to build:**

1. **New API route `src/app/api/events/route.ts`**:
   - `GET /api/events?type=<eventType>&entityType=<type>&since=<ISO>&until=<ISO>&limit=<n>&offset=<n>`
   - Auth: `requireAuth()` — any authenticated user, filtered to their enterprise
   - Queries `auditLog` with filters, returns array of `EventEnvelope`-shaped objects
   - Default: last 100 events, most recent first

**Definition of done:**
- [x] `GET /api/events` returns paginated, filtered event list
- [x] All filters work: type, entityType, time range
- [x] Enterprise scoping enforced
- [x] Response shape matches `EventEnvelope` type
- [x] `npx tsc --noEmit` passes with 0 errors

---

### H1-5: Infrastructure Hardening

---

#### H1-5.1 — Redis Rate Limiting

**Depends on:** nothing. Resolves D-03.

**What to build:**

1. **Rewrite `src/lib/rate-limit.ts`**:
   - Current: in-memory `Map<string, Window>` sliding window
   - New: Redis-backed sliding window using sorted sets
   - Read `REDIS_URL` from env — if absent, fall back to current in-memory implementation
   - Use `ioredis` package (add to `package.json` via `npm install ioredis`)
   - Redis key pattern: `ratelimit:${endpoint}:${actorEmail}`
   - Algorithm: `ZADD` current timestamp, `ZREMRANGEBYSCORE` to evict expired, `ZCARD` to count hits
   - TTL: auto-expire keys after `windowMs` milliseconds
   - **Same public API**: `rateLimit(actorEmail, config)` returns `NextResponse | null`

2. **Add `REDIS_URL`** to `src/lib/env.ts` as optional string env var

**Definition of done:**
- [x] `rateLimit()` uses Redis when `REDIS_URL` is set
- [x] Falls back to in-memory `Map` when `REDIS_URL` is absent
- [x] Same 429 response format as current
- [x] Redis keys auto-expire via TTL
- [x] `REDIS_URL` added to env schema as optional
- [x] D-03 marked resolved
- [x] `npx tsc --noEmit` passes with 0 errors

---

#### H1-5.2 — Artifact Storage (S3)

**Depends on:** nothing

**What to build:**

1. **New lib module `src/lib/storage/s3.ts`**:
   - S3 client from `AWS_REGION` + `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`
   - Bucket from env var `ARTIFACT_BUCKET`
   - `uploadArtifact(key, body, contentType): Promise<string>` — returns S3 key
   - `getSignedUrl(key, expiresInSeconds?): Promise<string>` — pre-signed download URL (default: 1 hour)
   - `artifactExists(key): Promise<boolean>` — HEAD check

2. **Integrate with evidence package export** (`src/app/api/blueprints/[id]/evidence-package/route.ts`):
   - After generating ZIP, upload to S3 with key `evidence/{blueprintId}/{timestamp}.zip`
   - Add column `evidencePackageKey` (text, nullable) to `agentBlueprints`
   - On subsequent requests: if `evidencePackageKey` exists and blueprint unchanged, return signed URL instead of regenerating

3. **Integrate with MRM report** and **code export** — same caching pattern

4. **Add `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`** to `package.json`

5. **Fallback**: when `ARTIFACT_BUCKET` is not set, skip caching and generate on-demand (current behavior — no regression)

**Definition of done:**
- [x] S3 upload/signed-URL functions work
- [x] Evidence packages cached in S3, served via signed URL on repeat requests
- [x] MRM reports and code exports cached
- [x] When `ARTIFACT_BUCKET` absent, behavior identical to current
- [x] `npx tsc --noEmit` passes with 0 errors

---

#### H1-5.3 — Help Prompt Refresh

**Depends on:** nothing. Resolves D-04.

**What to build:**

1. **Update `buildHelpSystemPrompt()`** in `src/app/api/help/chat/route.ts`:
   - Add sections for these missing features:
     - **Stakeholder Collaboration**: 7 domains (compliance, risk, legal, security, IT, operations, business), invite-based, AI orchestrator synthesizes contributions and detects conflicts
     - **Red-Team Testing**: 5 attack categories (prompt injection, data exfiltration, instruction override, jailbreak, social engineering), via Simulate tab
     - **Blueprint Quality Dashboard**: 5 dimensions × 1-5 score, 0-100 overall, AI flags per dimension, via Quality tab in registry
     - **Refinement Chat**: multi-turn streaming chat, natural language instructions, AI explains changes
     - **Blueprint Lineage**: version diff showing structural changes and governance diff between versions
     - **Agent Search**: Cmd+K (Ctrl+K on Windows) to open command palette, type agent name to search registry
     - **Viewer Role**: read-only access to everything, cannot create/modify/approve/deploy
   - Replace any remaining "designer" references with "architect"
   - Update role list to: `architect | reviewer | compliance_officer | admin | viewer`

**Definition of done:**
- [x] `buildHelpSystemPrompt()` covers all 7 new feature areas
- [x] No "designer" role references remain
- [x] Role list includes "viewer"
- [x] Help copilot can answer questions about each new feature area
- [x] D-04 marked resolved
- [x] `npx tsc --noEmit` passes with 0 errors

---

### H1 — DO NOT BUILD:
- Foundry, knowledge graph, multi-agent workflows, runtime governance engine
- Multi-cloud deployment adapters (Bedrock-only is sufficient for early customers)
- Enterprise SSO (email/password is adequate pre-scale)

---

## H2 — Govern at Scale (Months 3–9)

**Theme:** Extend governance from design-time to runtime. Intellios becomes the authority on agent behavior in production.

**Completion: 17/17 — 100%**

---

### H2-1: Runtime Governance Engine

---

#### H2-1.1 — Runtime Policy Type

**Depends on:** H1-1.1

**What to build:**

1. **Extend policy type enum**: `governancePolicies.type` currently accepts `safety | compliance | data_handling | access_control | audit`. Add `runtime` as a valid type.

2. **New runtime rule operators** in `src/lib/governance/evaluate.ts`:
   - `token_budget_daily` — max tokens per agent per day
   - `token_budget_per_interaction` — max tokens per single interaction
   - `pii_action` — action when PII detected: `block`, `redact`, or `log`
   - `scope_constraint` — allowed topics/actions whitelist
   - `circuit_breaker_error_rate` — error rate threshold (0-1) that triggers circuit breaker

3. **Runtime policy creation UI**: extend `src/components/governance/policy-form.tsx` to support `runtime` type with runtime-specific rule builders.

**Definition of done:**
- [x] `runtime` is a valid policy type in the governance system
- [x] Runtime rule operators evaluate correctly
- [x] Policy form supports creating runtime policies
- [x] Existing policy CRUD, versioning, and simulation work with runtime policies
- [x] `npx tsc --noEmit` passes with 0 errors

---

#### H2-1.2 — Telemetry-Based Violation Detection

**Depends on:** H2-1.1, H1-1.1

**What to build:**

1. **New DB table `runtimeViolations`** in `src/lib/db/schema.ts`:
   - Columns: `id` (uuid PK), `agentId` (text), `enterpriseId` (text, nullable), `policyId` (text, FK → `governancePolicies.id`), `policyName` (text), `ruleId` (text), `severity` (text — error/warning), `metric` (text), `observedValue` (real), `threshold` (real), `message` (text), `telemetryTimestamp` (timestamp), `detectedAt` (timestamp, default now)

2. **New lib module `src/lib/governance/runtime-evaluator.ts`**:
   - `evaluateRuntimePolicies(agentId, telemetryWindow)`: loads runtime policies for agent's enterprise, evaluates each rule against telemetry, inserts violations into `runtimeViolations`
   - Returns `{ violations: RuntimeViolation[], checked: number }`

3. **Hook into telemetry ingestion**: after `POST /api/telemetry/ingest` inserts data, call `evaluateRuntimePolicies()` for each affected agent

**Definition of done:**
- [x] `runtimeViolations` table exists with correct schema
- [x] `evaluateRuntimePolicies()` correctly evaluates token budgets, error rates, circuit breaker thresholds
- [x] Violations written when thresholds breached
- [x] Telemetry ingestion triggers runtime policy evaluation
- [x] `npx tsc --noEmit` passes with 0 errors

---

#### H2-1.3 — Runtime Violation UI + Alerts

**Depends on:** H2-1.2

**What to build:**

1. **New API route `src/app/api/registry/[agentId]/violations/route.ts`**:
   - `GET /api/registry/[agentId]/violations?since=<ISO>&severity=<error|warning>&limit=<n>`

2. **Add "Violations" tab** to `src/app/registry/[agentId]/page.tsx` (deployed agents with runtime policies only)

3. **New component `src/components/registry/violations-panel.tsx`**:
   - Props: `{ agentId: string; violations: RuntimeViolation[]; loading: boolean }`
   - Violation list with severity badge, policy name, observed vs. threshold, timestamp
   - Filter by severity and time range

4. **Alert on critical violations**: `createNotification()` for admin + compliance_officer; publish `blueprint.runtime_violation` webhook event via `publishEvent()`

**Definition of done:**
- [x] Violations API returns paginated, filtered violations
- [x] "Violations" tab appears for deployed agents
- [x] Violation list renders with severity badges and metric details
- [x] Notifications created for error-severity violations
- [x] Webhook event fires for violations
- [x] `npx tsc --noEmit` passes with 0 errors

---

#### H2-1.4 — Governance-Gated Circuit Breaker

**Depends on:** H2-1.2, H2-1.3

**What to build:**

1. **New lifecycle status `suspended`**: add alongside `draft | in_review | approved | rejected | deployed | deprecated` in `src/lib/db/schema.ts` and all status-handling code.

2. **Auto-suspend logic** in `src/lib/governance/runtime-evaluator.ts`:
   - After evaluation, if error-severity violations exceed enterprise circuit breaker threshold: update blueprint status to `suspended`, write audit event, notify admin + compliance_officer

3. **Enterprise setting** `governance.circuitBreakerAction` in `src/lib/settings/types.ts`:
   - `"auto_suspend"` (default) or `"alert_only"`

4. **Resume flow**: `suspended → deployed` requires re-approval. Add resume button to lifecycle controls for admin.

5. **Update `src/components/registry/status-badge.tsx`**: add `suspended` variant (red pulsing badge)

**Definition of done:**
- [x] `suspended` status works throughout system (DB, API, UI)
- [x] Circuit breaker auto-suspends when violation threshold exceeded
- [x] `alert_only` mode notifies without suspending
- [x] Suspended agents can be resumed through re-approval
- [x] Status badge shows `suspended`
- [x] Audit trail records suspension events
- [x] `npx tsc --noEmit` passes with 0 errors

---

### H2-2: Production Quality Measurement

---

#### H2-2.1 — Production Quality Scoring

**Depends on:** H1-1.1, H2-1.2

**What to build:**

1. **Extend `src/components/blueprint/quality-dashboard.tsx`**:
   - Add "Production Quality" section below existing design-time scores
   - New metrics: Policy Adherence Rate (% of telemetry windows with zero violations), Uptime % (% of time with non-zero invocations), Error Rate
   - Data from `agentTelemetry` + `runtimeViolations`

2. **New API route `src/app/api/registry/[agentId]/quality/production/route.ts`**:
   - Returns production quality metrics for the last 30 days

3. **Combined score**: design-time (existing 0-100) displayed alongside production score. Format: "Design: X / Production: Y"

**Definition of done:**
- [x] Quality dashboard shows production metrics alongside design-time scores
- [x] Policy adherence rate computed from violations data
- [x] Uptime computed from telemetry data
- [x] API returns production quality data
- [x] `npx tsc --noEmit` passes with 0 errors

---

#### H2-2.2 — Quality Trend Analysis

**Depends on:** H2-2.1

**What to build:**

1. **New DB table `qualityTrends`**: weekly snapshots per agent. Columns: `id`, `agentId`, `enterpriseId`, `weekStart` (date), `designScore` (real), `productionScore` (real, nullable), `policyAdherenceRate` (real, nullable)

2. **Cron job** `POST /api/cron/quality-trends`: weekly, computes snapshot for each deployed agent

3. **Trend visualization** in quality dashboard: line chart showing quality score over past 12 weeks. Highlight regression (current score < previous week by > 10 points).

4. **Regression alert**: when production quality drops > 15 points below design-time quality: `createNotification()` + webhook event

**Definition of done:**
- [x] Weekly snapshots stored in `qualityTrends`
- [x] Cron job computes and stores snapshots
- [x] Quality dashboard shows 12-week trend visualization
- [x] Regression detection creates alerts
- [x] `npx tsc --noEmit` passes with 0 errors

---

### H2-3: Enterprise SSO

---

#### H2-3.1 — SAML 2.0 + OIDC Federation

**Depends on:** nothing

**What to build:**

1. **Configure NextAuth providers** in `src/app/api/auth/[...nextauth]/route.ts`:
   - Add SAML provider (via `next-auth` SAML support or `@auth/saml-provider`)
   - Add generic OIDC provider for Azure AD / Google Workspace / Okta
   - Provider config stored per-enterprise in `enterpriseSettings.sso`

2. **Add `sso` section to `EnterpriseSettings`** in `src/lib/settings/types.ts`:
   - `enabled: boolean`, `protocol: "saml" | "oidc"`, `issuer: string`, `clientId: string`, `clientSecret: string`, `metadataUrl: string` (SAML), `attributeMapping: { email, name, groups }`

3. **Admin SSO configuration page** `src/app/admin/sso/page.tsx`

4. **Login page update**: show "Sign in with SSO" button when SSO is configured for the enterprise domain

**Definition of done:**
- [x] SAML and OIDC providers configured in NextAuth (OIDC via env vars; SAML documented as future)
- [x] SSO settings stored per-enterprise (`enterpriseSettings.sso`)
- [x] Admin SSO configuration page works (`/admin/sso`)
- [x] Login page shows SSO option when configured (domain-based detection)
- [x] SSO login creates/updates user record (JIT in signIn callback)
- [x] `npx tsc --noEmit` passes with 0 errors

---

#### H2-3.2 — Directory Sync + JIT Provisioning

**Depends on:** H2-3.1

**What to build:**

1. **JIT user creation**: on first SSO login, auto-create user with email + name from assertion, role mapped from directory group

2. **Group → role mapping** in enterprise settings `sso.groupRoleMapping`:
   - `{ "EngineeringLeads": "architect", "ComplianceTeam": "compliance_officer" }` — default for unknown groups: `viewer`

3. **Periodic sync** (stretch): `POST /api/cron/directory-sync` — query IdP for deactivated users, mark inactive in Intellios

**Definition of done:**
- [x] First SSO login creates user with correct role from group mapping
- [x] Subsequent SSO logins update user attributes (name refresh)
- [x] Admin can configure group-to-role mappings (via `/admin/sso`)
- [x] Unknown groups default to viewer role
- [x] `npx tsc --noEmit` passes with 0 errors

---

### H2-4: Artifact Family v1

---

#### H2-4.1 — Workflow Definition Schema

**Depends on:** H1-3.1

**What to build:**

1. **New Zod schema `src/lib/types/workflow.ts`**:
   ```typescript
   WorkflowSchema = z.object({
     version: z.string().default("1.0.0"),
     name: z.string(),
     description: z.string(),
     agents: z.array(z.object({
       agentId: z.string(),
       role: z.string(),
       required: z.boolean(),
     })),
     handoffRules: z.array(z.object({
       from: z.string(),   // agentId or "start"
       to: z.string(),     // agentId or "end"
       condition: z.string(),
       priority: z.number(),
     })),
     sharedContext: z.array(z.object({
       field: z.string(),
       type: z.enum(["string", "number", "boolean", "json"]),
       description: z.string(),
     })),
   })
   ```

2. **New DB table `workflows`**: `id`, `workflowId` (logical ID), `name`, `description`, `definition` (jsonb), `status` (same lifecycle as blueprints), `version`, `enterpriseId`, `createdBy`, `createdAt`, `updatedAt`

3. **CRUD API routes**:
   - `GET/POST /api/workflows/route.ts`
   - `GET/PATCH/DELETE /api/workflows/[id]/route.ts`
   - Validate all referenced `agentId`s exist in the blueprint registry

**Definition of done:**
- [x] `WorkflowSchema` validates workflow definitions
- [x] `workflows` table exists
- [x] CRUD routes work with auth + enterprise scoping
- [x] Agent references validated against registry
- [x] `npx tsc --noEmit` passes with 0 errors

---

#### H2-4.2 — Multi-Artifact Registry

**Depends on:** H2-4.1

**What to build:**

1. **Extend registry API** `src/app/api/registry/route.ts`:
   - Add `artifactType` query param: `blueprint` (default) or `workflow`
   - When `workflow`: query `workflows` table, return unified response shape with `artifactType` discriminator

2. **Extend registry UI** `src/app/registry/page.tsx`:
   - Add tabs: "Agents" (blueprints) and "Workflows"
   - Workflow list: name, status, agent count, version

3. **Workflow detail page** `src/app/registry/workflow/[workflowId]/page.tsx`:
   - Agent list, handoff rules, shared context, version history, lifecycle controls

**Definition of done:**
- [x] Registry API supports querying workflows (`GET /api/workflows`)
- [x] Registry UI shows agents and workflows as separate views
- [x] Workflow detail page renders definition and version history
- [x] `npx tsc --noEmit` passes with 0 errors

---

#### H2-4.3 — Workflow Governance

**Depends on:** H2-4.1, H2-4.2

**What to build:**

1. **Workflow validation**: before `in_review`, validate all referenced agents are `approved` or `deployed`, no circular handoff rules, all shared context fields defined

2. **Workflow governance diff**: show changes between workflow versions (agents added/removed, handoff rules modified)

3. **Approval workflow**: same multi-step chain as blueprints. Audit trail via `publishEvent()`

4. **MRM report extension**: include workflow context section when blueprint is part of a deployed workflow

**Definition of done:**
- [x] Workflow validation blocks invalid workflows from review
- [x] Governance diff shows workflow changes
- [x] Multi-step approval works for workflows
- [x] Audit trail records workflow events
- [x] `npx tsc --noEmit` passes with 0 errors

---

### H2-5: Portfolio Intelligence

---

#### H2-5.1 — Risk Trend Analysis

**Depends on:** H1-1.1

**What to build:**

1. **New DB table `portfolioSnapshots`**: weekly fleet metrics. Columns: `id`, `enterpriseId`, `weekStart` (date), `totalAgents` (integer), `deployedAgents` (integer), `complianceRate` (real), `avgQualityScore` (real), `totalViolations` (integer), `violationsByType` (jsonb), `agentsByRiskTier` (jsonb)

2. **Cron job** `POST /api/cron/portfolio-snapshot`: weekly fleet metrics aggregation per enterprise

3. **Trend API** `GET /api/portfolio/trends?weeks=12`: returns time-series of snapshots

4. **Trend visualization** in fleet governance dashboard: compliance rate over time, violation count over time, fleet size over time

**Definition of done:**
- [x] Weekly snapshots stored and queryable
- [x] Trend API returns time-series data
- [x] Trend charts render in fleet dashboard
- [x] `npx tsc --noEmit` passes with 0 errors

---

#### H2-5.2 — Cost Attribution

**Depends on:** H1-1.1

**What to build:**

1. **Cost computation** from telemetry: `tokensIn * inputCostPerToken + tokensOut * outputCostPerToken`. Cost rates in `enterpriseSettings.costRates` (new settings section).

2. **Per-agent cost API** `GET /api/registry/[agentId]/cost?period=<month>`

3. **Fleet cost rollup API** `GET /api/portfolio/cost?period=<month>`: grouped by `agentBlueprints.ownership.businessUnit`

4. **Cost column** in registry list page

**Definition of done:**
- [x] Cost rates configurable per enterprise
- [x] Per-agent cost API returns correct calculations
- [x] Fleet cost rollup groups by business unit
- [x] Registry list shows cost column
- [x] `npx tsc --noEmit` passes with 0 errors

---

#### H2-5.3 — Executive Dashboard

**Depends on:** H2-5.1, H2-5.2

**What to build:**

1. **New page `src/app/governor/executive/page.tsx`** (admin + compliance_officer only):
   - Fleet size (total, deployed, by status)
   - Compliance posture (% compliant, trend arrow)
   - Risk distribution (by risk tier)
   - Cost summary (total monthly, top 5 by cost)
   - Quality trend (12-week line, overall index)
   - Top 5 alerts (most recent critical notifications)
   - All data from existing APIs

2. **PDF export**: "Export PDF" button — use browser print CSS (`@media print` stylesheet) for simplicity

**Definition of done:**
- [x] Executive dashboard renders all 6 data cards
- [x] PDF export produces clean print-ready output
- [x] Access restricted to admin + compliance_officer
- [x] All data from existing APIs (no new backend)
- [x] `npx tsc --noEmit` passes with 0 errors

---

### H2-6: Governor Completeness Sprint

---

#### H2-6.1 — Executive Link in Governor Sidebar

**Depends on:** H2-5.3

**What to build:**

1. Add "Executive" nav item to `src/components/nav/governor-sidebar.tsx` pointing to `/governor/executive` with `BarChart2` icon.

**Definition of done:**
- [x] Executive Dashboard accessible from governor sidebar nav
- [x] Active state highlights correctly on `/governor/executive`
- [x] `npx tsc --noEmit` passes with 0 errors

---

#### H2-6.2 — Compliance Report Export

**Depends on:** H2-5.2, H2-5.3

**What to build:**

1. **API** `GET /api/compliance/report?period=YYYY-MM&format=json` — returns a structured compliance report:
   - Period metadata (enterprise, month, generated_at)
   - Fleet summary (totalAgents, deployedAgents, complianceRate, avgQualityScore)
   - Active policies list (name, type, ruleCount, lastViolation)
   - Top violations (agentId, agentName, policyName, severity, count, lastSeen)
   - Cost summary (totalCostUsd by businessUnit)
   - Risk distribution (by riskTier)
   - Access: admin + compliance_officer

2. **UI button** on `/governor/compliance`: "Download Report" → fetches `/api/compliance/report` and triggers browser JSON download via `Blob + URL.createObjectURL`.

**Definition of done:**
- [x] Report API returns structured JSON for the requested period
- [x] Compliance page has "Download Report" button
- [x] Download triggers correctly in browser (JSON file download)
- [x] Access restricted to admin + compliance_officer
- [x] `npx tsc --noEmit` passes with 0 errors

---

#### H2-6.3 — Platform Admin Fleet Overview

**Depends on:** H2-5.1

**What to build:**

1. **API** `GET /api/admin/fleet-overview` — super-admin only (admin role + null enterpriseId check):
   - Cross-enterprise fleet counts: total agents, deployed agents, compliance rates per enterprise
   - Platform-wide totals
   - Returns array of `{ enterpriseId | null, agentCount, deployedCount, complianceRate, avgQualityScore }`

2. **Admin page** `src/app/admin/fleet/page.tsx`:
   - Table of all enterprises with their fleet stats
   - Platform totals row
   - Links to enterprise-specific governor view
   - Access: admin only

**Definition of done:**
- [x] Fleet overview API returns cross-enterprise data (admin-only)
- [x] Admin fleet page renders enterprise table
- [x] Platform totals displayed
- [x] `npx tsc --noEmit` passes with 0 errors

---

## H3 — Execution Platform (Months 9–18)

**Theme:** Extend from design + governance into workflow composition and execution monitoring.

**Gate:** 3+ enterprise design partners with validated execution orchestration needs. Do not build speculatively.

**Completion: 7/14 — 50%** (H3-3 + H3-4 shipped session 068; H3-1 + H3-2 deferred pending design partner gate)

---

### H3-1: Foundry MVP

---

#### H3-1.1 — Workflow Composition UI

**Depends on:** H2-4.1

**What to build:**

1. **New page `src/app/workflows/compose/page.tsx`**: visual workflow editor
   - Canvas with drag-and-drop agent nodes from registry
   - Handoff connectors between nodes (lines with condition labels)
   - Conditional routing branches (if/else splits)
   - "Start" and "End" nodes
   - Save/load workflow definitions to `workflows` table

2. **Canvas implementation**: use `reactflow` or custom SVG renderer. Nodes are agent cards (name + status badge). Edges are handoff rules.

3. **Sidebar panel**: agent picker (search registry), handoff rule editor, shared context field editor

**Definition of done:**
- [ ] Visual workflow editor renders with drag-and-drop
- [ ] Agents added from registry search
- [ ] Handoff connections drawn between agents
- [ ] Workflow saved to and loaded from database
- [ ] `npx tsc --noEmit` passes with 0 errors

---

#### H3-1.2 — Execution Monitoring

**Depends on:** H1-1.1, H2-4.2

**What to build:**

1. **New DB table `workflowRuns`**: `id`, `workflowId`, `status` (running/completed/failed/paused), `currentStep` (agentId), `startedAt`, `completedAt`, `input` (jsonb), `output` (jsonb), `stepHistory` (jsonb array of step results)

2. **Dashboard page** `src/app/workflows/runs/page.tsx`: list active and recent runs, current step highlighted, elapsed time, error state

3. **API**: `GET /api/workflows/[id]/runs`, `GET /api/workflows/[id]/runs/[runId]`

**Definition of done:**
- [ ] Workflow runs tracked with step-by-step history
- [ ] Runs dashboard shows active and completed runs
- [ ] Run detail shows step progression
- [ ] `npx tsc --noEmit` passes with 0 errors

---

#### H3-1.3 — Workflow-Level Governance

**Depends on:** H2-4.3

**What to build:**

1. Workflow deployment approval (same multi-step approval chain as blueprints)
2. Workflow audit trail via `publishEvent()`
3. Workflow governance diff between versions
4. MRM report workflow section when blueprint is part of a deployed workflow

**Definition of done:**
- [ ] Workflow deployments require approval
- [ ] Workflow events in audit trail
- [ ] Governance diff works for workflow versions
- [ ] MRM report includes workflow context
- [ ] `npx tsc --noEmit` passes with 0 errors

---

#### H3-1.4 — Workflow Simulation

**Depends on:** H3-1.1, A-12

**What to build:**

1. **Dry-run endpoint** `POST /api/workflows/[id]/simulate`: accepts test input, runs each agent in sequence using `/api/blueprints/[id]/simulate/chat`, passes output as input to next agent per handoff rules

2. **Simulation report**: per-agent response, handoff decisions, total latency, governance violations detected

3. **UI**: "Simulate" button on workflow detail page, results inline

**Definition of done:**
- [ ] Workflow simulation runs each agent in sequence with handoff logic
- [ ] Report shows per-agent results
- [ ] UI displays results
- [ ] `npx tsc --noEmit` passes with 0 errors

---

### H3-2: Enterprise Memory v1

---

#### H3-2.1 — Execution History Store

**Depends on:** H1-1.1

**What to build:**

1. **New DB table `executionHistory`**: `id`, `agentId`, `blueprintId`, `blueprintVersion`, `enterpriseId`, `interactionSummary` (text), `decisionRationale` (text, nullable), `outcome` (text — success/failure/escalated), `metadata` (jsonb), `timestamp`

2. **Ingestion**: extend telemetry ingest API to accept optional `interactionLogs`; parse and store as execution history

3. **Query API** `GET /api/agents/[agentId]/history?since=&until=&outcome=&limit=`

**Definition of done:**
- [ ] Execution history stored with summaries and outcomes
- [ ] Query API supports time range, outcome, pagination
- [ ] Linked to agent + blueprint version
- [ ] `npx tsc --noEmit` passes with 0 errors

---

#### H3-2.2 — Pattern Extraction

**Depends on:** H3-2.1

**What to build:**

1. **AI analysis job**: periodically analyze execution history using Claude to extract common resolution patterns, escalation triggers, and recurring failure modes

2. **Store patterns** in `agentPatterns` table: `id`, `agentId`, `patternType` (resolution/escalation/failure), `description`, `frequency`, `confidence`, `extractedAt`

3. **Surface in UI**: "Insights" section on agent detail page; use patterns in refinement chat context

**Definition of done:**
- [ ] Pattern extraction produces meaningful patterns from execution history
- [ ] Patterns stored and queryable
- [ ] Patterns surfaced in agent detail UI
- [ ] `npx tsc --noEmit` passes with 0 errors

---

### H3-3: Continuous Governance

---

#### H3-3.1 — Scheduled Policy Re-evaluation

**Depends on:** H2-1.1

**What to build:**

1. **Cron job** `POST /api/cron/governance-drift`: for each deployed agent, re-validate blueprint against current policy set. Compare to last validation. New violations = governance drift detected.

2. **Drift notifications**: notify admin + compliance_officer when drift detected. Include which policies changed and which violations appeared.

3. **Drift column in fleet dashboard**: "Drifted" badge on agents with new violations vs. approval-time

**Definition of done:**
- [x] Scheduled re-evaluation detects governance drift
- [x] Drift notifications sent
- [x] Fleet dashboard shows drift status
- [x] `npx tsc --noEmit` passes with 0 errors

**Status: COMPLETE** (session 068)

---

#### H3-3.2 — Self-Healing Remediation

**Depends on:** H3-3.1, A-09

**What to build:**

1. **AI remediation suggestions**: when drift or violations detected, use Claude to propose specific ABP changes to resolve violations

2. **Auto-create draft**: new blueprint version (draft status) with Claude's suggested changes applied, linked to triggering violations

3. **Architect review flow**: "Suggested Fix" appears in Studio with diff showing Claude's changes. Architect can accept/modify/reject.

**Definition of done:**
- [x] Claude proposes ABP changes based on violations
- [x] Suggested Fix panel in Blueprint Studio with diff and accept/dismiss actions
- [x] Architect can accept (triggers refine) or dismiss
- [x] `npx tsc --noEmit` passes with 0 errors

**Status: COMPLETE** (session 068)

---

#### H3-3.3 — Compliance Calendar

**Depends on:** G-14

**What to build:**

1. **New page `src/app/governor/calendar/page.tsx`**: calendar view showing SR 11-7 review due dates, policy review schedules, regulatory submission deadlines

2. **Automated reminders**: extend `POST /api/cron/review-reminders` to send notifications at 30, 14, 7 days before deadlines

3. **iCal export**: generate `.ics` file for subscribing in external calendar apps

**Definition of done:**
- [x] Calendar page shows all compliance-related deadlines
- [x] Reminders at 30/14/7 day intervals
- [x] iCal export works
- [x] `npx tsc --noEmit` passes with 0 errors

**Status: COMPLETE** (session 068)

---

### H3-4: Ecosystem

---

#### H3-4.1 — Template Marketplace

**Depends on:** A-16

**What to build:**

1. **Extend template system**: add `source` (built-in/community), `rating` (average), `usageCount`, `author`, `publishedAt` to template schema

2. **Browse UI**: gallery with search, filter by category/risk-tier/rating, preview before import, usage metrics

3. **Submission flow**: architects publish blueprints as templates (strip enterprise-specific data, add description/tags)

4. **Rating system**: `templateRatings` table, 1-5 stars

**Definition of done:**
- [x] Templates have community metadata
- [x] Gallery with search and filtering
- [x] Architects can publish blueprints as templates
- [x] Rating system works
- [x] `npx tsc --noEmit` passes with 0 errors

**Status: COMPLETE** (session 068)

---

#### H3-4.2 — Enterprise Integrations

**Depends on:** H1-4.2

**What to build:**

1. **Integration adapter framework** `src/lib/integrations/adapter.ts`: base interface `sendNotification()`, `createTicket()`, `syncStatus()`

2. **ServiceNow adapter**: creates incident tickets on critical violations

3. **Jira adapter**: creates approval tasks when blueprints enter review, updates status on approve/reject

4. **Slack/Teams adapter**: sends messages to configured channel via incoming webhook URLs

5. **Admin integration config page** `src/app/admin/integrations/page.tsx`

**Definition of done:**
- [x] Adapter interface with implementations for ServiceNow, Jira, Slack
- [x] Each configurable per-enterprise
- [x] Events trigger adapter actions (via dispatchIntegrationEvent)
- [x] Admin page for managing integrations
- [x] `npx tsc --noEmit` passes with 0 errors

**Status: COMPLETE** (session 068)

---

#### H3-4.3 — API-First + SDK

**Depends on:** H1-4.3

**What to build:**

1. **OpenAPI 3.1 spec**: `docs/api/openapi.yaml` covering all public API routes

2. **API key management**: `apiKeys` table (`id`, `enterpriseId`, `name`, `keyHash`, `scopes`, `createdBy`, `createdAt`, `lastUsedAt`, `revokedAt`). Admin page for creating/revoking keys.

3. **TypeScript SDK**: `packages/sdk-typescript/` — typed client from OpenAPI spec

4. **Python SDK**: `packages/sdk-python/` — typed client from OpenAPI spec

**Definition of done:**
- [x] OpenAPI spec covers all public routes
- [x] API key creation/revocation via admin UI
- [ ] TypeScript SDK installable and functional (deferred — SDK packages require separate build setup)
- [ ] Python SDK installable and functional (deferred — SDK packages require separate build setup)
- [x] `npx tsc --noEmit` passes with 0 errors

**Status: PARTIAL COMPLETE** (session 068) — API key management + OpenAPI spec done; SDK code gen deferred

---

#### H3-4.4 — Multi-Cloud Deployment

**Depends on:** P-08

**What to build:**

1. **Deployment adapter interface** `src/lib/deploy/adapter.ts`: `deploy(abp, config): Promise<DeploymentRecord>`, `getStatus(record): Promise<string>`

2. **Azure AI Foundry adapter**: translate ABP → Azure AI Foundry deployment manifest

3. **Google Vertex AI adapter**: translate ABP → Vertex AI agent definition

4. **Deployment target selector** in `src/app/blueprints/[id]/page.tsx`: choose target (Bedrock / Azure / Vertex / Custom). Config in `enterpriseSettings.deploymentTargets`.

**Definition of done:**
- [x] Deployment adapter interface with Azure + Vertex implementations
- [x] ABP translated to each cloud manifest format
- [x] Deployment target selector in UI (Blueprint Studio, approved blueprints)
- [x] Deployed agents tracked with target-specific metadata (via existing deploymentMetadata field)
- [x] `npx tsc --noEmit` passes with 0 errors

**Status: COMPLETE** (session 068)

---

## Dependency Graph (Critical Path)

```
H1-1.1 (Telemetry model)
  ├── H1-1.2 (AgentCore connector)
  ├── H1-1.3 (Production tab UI)
  ├── H1-1.4 (Health integration) ← H1-1.2
  ├── H1-1.5 (Threshold alerts) ← H1-4.2
  ├── H2-1.1 (Runtime policy type)
  │     ├── H2-1.2 (Violation detection)
  │     ├── H2-1.3 (Violation UI)
  │     └── H2-1.4 (Circuit breaker) ← H2-1.2
  ├── H2-2.1 (Production quality) ← H2-1.2
  ├── H2-5.1 (Risk trends)
  └── H2-5.2 (Cost attribution)

H1-3.1 (Migration framework)
  ├── H1-3.2 (ABP v1.1.0)
  │     └── H1-3.3 (Generation update)
  └── H2-4.1 (Workflow schema)
        ├── H2-4.2 (Multi-artifact registry)
        └── H2-4.3 (Workflow governance)

H1-4.1 (Event definitions)
  └── H1-4.2 (Event bus + webhook dispatch)
        ├── H1-4.3 (Event filtering API)
        └── H1-1.5 (Threshold alerts)

H1-2.1 (Governor layout) → H1-2.2 (Routing) → H1-2.3 (Home page)
H1-5.1, H1-5.2, H1-5.3 — independent, no dependencies
```

**Critical path to H2:** H1-1.1 → H1-1.2 → H2-1.1 → H2-1.2

**Critical path to H3:** H1-3.1 → H2-4.1 → H3-1.1

---

## Session Execution Guide

Each deliverable is scoped to fit a single Claude session. Recommended order for H1:

**Sprint 1 (foundations, all independent — can parallelize):**
- H1-1.1 (Telemetry data model + ingest API)
- H1-4.1 (Typed event definitions)
- H1-5.1 (Redis rate limiting)
- H1-5.3 (Help prompt refresh)

**Sprint 2 (connect):**
- H1-1.2 (AgentCore connector) — requires H1-1.1
- H1-4.2 (Event bus + webhook dispatch) — requires H1-4.1
- H1-3.1 (Migration framework) — independent

**Sprint 3 (surface):**
- H1-1.3 (Production tab UI) — requires H1-1.1
- H1-2.1 (Governor layout) — independent
- H1-3.2 (ABP v1.1.0 schema) — requires H1-3.1

**Sprint 4 (integrate):**
- H1-1.4 (Health check integration) — requires H1-1.1, H1-1.2
- H1-2.2 (Role-based landing) — requires H1-2.1
- H1-2.3 (Governor home page) — requires H1-2.1
- H1-3.3 (Generation engine update) — requires H1-3.2

**Sprint 5 (complete):**
- H1-1.5 (Threshold alerts) — requires H1-1.1, H1-4.2
- H1-4.3 (Event filtering API) — requires H1-4.1, H1-4.2
- H1-5.2 (S3 artifact storage) — independent

---

## Key Risks

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| R-1 | **Foundry prematurity** | 12 months of runtime engineering with no revenue | Gate on 3+ design partners + H2 prerequisites complete |
| R-2 | **Observability gap erodes governance claim** | Buyers ask "how do you ensure compliance after deployment?" — today: "we don't" | H1-1 is P0; nothing else matters until deployed agents report back |
| R-3 | **Enterprise integration tax** | Each enterprise has different stacks; unbounded integration work | Adapter framework (H3-4.2) + prioritize top 3 stacks |
| R-4 | **Knowledge graph black hole** | 18 months of schema design with no outcome | No standalone project; H3-2 accumulates as side effect of observable execution |
| R-5 | **Product family fragmentation** | Multiple product names = multiple procurement conversations | One platform, role-based experiences; pricing by capability tier |

---

## Accomplished — Phase History (Reference)

54 phases shipped between 2026-03-12 and 2026-03-19.

### Foundation (Phases 1–5)
Core pipeline loop: intake → generate → validate → review. Auth + RBAC. Audit logging. Rate limiting. Input validation. Error handling.

### Governance Infrastructure (Phases 6, 10–11, 14–15, 22)
MRM compliance reporting (14 sections). Policy CRUD + lifecycle audit. Governance integrity validation. Multi-step approval workflow + policy versioning (ADR-006).

### Enterprise Features (Phases 9, 12–13, 16–17, 24–25)
Intake session management. User management (CRUD + invitations). Role-differentiated home screens. Pipeline board + blueprint workbench. Notification system (in-app + email). Outbound webhooks (HMAC-signed).

### Intelligence + Monitoring (Phases 23, 28, 44)
Blueprint quality scoring (5 dimensions). Intake quality scoring (4 dimensions). Deployment health snapshots. Daily AI-synthesized intelligence briefings. System health metrics. Governance scores surfaced in UI. Auth middleware activated.

### Deployment Integration (Phases 26–27, 33)
AgentCore manifest export. Direct AWS Bedrock deploy. AgentCore confidence hardening (error handling, model scoring).

### Compliance + Evidence (Phases 21, 29–30, 35, 50, 52)
MRM report JSON + HTML export. Evidence package export (14-section audit bundles). Regulatory mapping report. SR 11-7 periodic review scheduling. Blueprint lineage with governance diff.

### Intake Evolution (Phases 8, 31, 48–49)
Context enrichment (risk-aware probing). Classification-driven intake (agent type + risk tier). Stakeholder collaboration workspace (7 domains, RACI, AI orchestrator). Intake confidence engine (expertise detection, adaptive routing, readiness scoring, completeness map).

### Registry + Advanced Features (Phases 17, 19, 22–23, 34, 40–43, 45–47)
Blueprint Studio (7-section stepper). Review console + queue. Multi-step approval with SOD. Behavioral test harness. Lifecycle controls. Agent simulation playground. Code export (TypeScript). Blueprint template library (6 starters). Clone + version iteration. Contextual help copilot. Command palette (Cmd+K) with agent search.

### Security + Quality (Phases 41, 51–54)
Adversarial red-teaming (5 attack categories). Fleet governance dashboard. Blueprint lineage with governance diff. Viewer role + audit trail. Architect Command Center: blueprint quality dashboard, multi-turn refinement chat, command palette agent search, intake error/retry. Designer → Architect role rename.
