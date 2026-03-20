# Intellios — Product Roadmap

**Vision:** The governed control plane for enterprise AI agents — own design, governance, lifecycle, and observability. Execution happens on cloud provider runtimes. The value is the governance wrapper, not the compute.

**Last updated:** 2026-03-20 (Session 065)

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
| **P — Shared Platform** | 11 | 14 | 79% | 3 capabilities remaining (Observability, SSO, Portfolio Intelligence) |
| **A — Architect Product** | 19 | 19 | 100% | Feature-complete for current scope |
| **G — Governor Product** | 16 | 17 | 94% | Missing dedicated entry point / navigation |
| **D — Technical Debt** | 1 | 5 | 20% | Must address in H1 |
| **H1 — Close the Loop** | 16 | 18 | 89% | H1-1.x/2.x/3.x/4.1/4.3/5.x complete; H1-4.2 webhook dispatch + D-02 + H1-2.4 remaining |
| **H2 — Govern at Scale** | 0 | 17 | 0% | Not started |
| **H3 — Execution Platform** | 0 | 14 | 0% | Deferred; gated on prerequisites |
| | | | | |
| **Current Product (P+A+G+D)** | **47** | **55** | **85%** | Production-ready; 8 items remaining |
| **Full Vision (all horizons)** | **63** | **104** | **61%** | Design + governance + observability backbone complete; scale + execution ahead |

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

### P-11 — Eventing | **Partial**

**What exists:**
- `src/lib/events/types.ts` — `EventType` string union + `LifecycleEvent` interface
- `src/lib/events/bus.ts` — simple in-process event bus with `subscribe()` / `publish()`
- `src/lib/audit/log.ts` — `writeAuditLog()` writes to the audit table
- **Gap:** calling `writeAuditLog()` does NOT automatically fire webhooks. The two systems are not connected. Webhook delivery only fires when `dispatch()` is called explicitly — and most API routes do not call it.

**What to build:** See H1-4 for full implementation detail.

---

### P-12 — Observability | **Not started**

Zero production telemetry ingestion. No visibility into deployed agent behavior after deployment. This is the highest-value gap in the entire product.

**What to build:** See H1-1 for full implementation detail.

---

### P-13 — Enterprise SSO | **Not started**

Email/password authentication only. No SAML or OIDC federation.

**What to build:** See H2-3 for full implementation detail.

---

### P-14 — Portfolio Intelligence | **Partial**

**What exists:**
- Fleet governance dashboard with deployed agent posture and quality scores
- Viewer role with read-only governance visibility
- Daily AI-synthesized intelligence briefings (`intelligenceBriefings` table)
- System health snapshots (`systemHealthSnapshots` table)
- `src/lib/awareness/briefing-generator.ts` — daily briefing generation
- `src/lib/awareness/anomaly-detector.ts` — anomaly detection

**What's missing:** Risk trend analysis over time, cost attribution per agent. See H2-5 for full implementation detail.

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

### G-17 — Dedicated Governor Entry Point / Navigation | **Not started**

Governor role users (reviewer, compliance_officer) currently land on the main Architect-oriented dashboard. They need a dedicated product entry point with governor-specific navigation.

**What to build:** See H1-2 for full implementation detail.

---

## D — Technical Debt

Must resolve in H1. All items cross-reference the H1 deliverable that resolves them.

---

### D-01 — ABP Schema Migration Strategy | **Not started** | Severity: High

**Problem:** No migration path for ABPs stored in the database. If the ABP schema changes (adding the `execution` section in H1-3.2), existing stored ABPs will fail Zod validation when read. There are currently ~N ABPs in production with no `version` field and no `execution` section.

**What to build:** See H1-3.1 (migration framework), H1-3.2 (ABP v1.1.0 schema), H1-3.3 (migrate-on-read integration).

**Definition of done:**
- [ ] Every place that reads an ABP from the DB uses `readABP()` (migrate-on-read) instead of `blueprint.abp as ABP`
- [ ] Old ABPs without a `version` field auto-migrate to `"1.0.0"` on read
- [ ] New blueprints generated with `version: "1.1.0"` and `execution` section
- [ ] No runtime Zod parse errors on any existing stored ABP

---

### D-02 — Webhook Delivery Wiring | **Not started** | Severity: Medium

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

**Completion: 0/18 — 0%**

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
- [ ] Webhook dispatch fires for matching events (verified via `webhookDeliveries` table)
- [ ] D-02 marked resolved
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

**Completion: 0/17 — 0%**

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
- [ ] `runtime` is a valid policy type in the governance system
- [ ] Runtime rule operators evaluate correctly
- [ ] Policy form supports creating runtime policies
- [ ] Existing policy CRUD, versioning, and simulation work with runtime policies
- [ ] `npx tsc --noEmit` passes with 0 errors

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
- [ ] `runtimeViolations` table exists with correct schema
- [ ] `evaluateRuntimePolicies()` correctly evaluates token budgets, error rates, circuit breaker thresholds
- [ ] Violations written when thresholds breached
- [ ] Telemetry ingestion triggers runtime policy evaluation
- [ ] `npx tsc --noEmit` passes with 0 errors

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
- [ ] Violations API returns paginated, filtered violations
- [ ] "Violations" tab appears for deployed agents
- [ ] Violation list renders with severity badges and metric details
- [ ] Notifications created for error-severity violations
- [ ] Webhook event fires for violations
- [ ] `npx tsc --noEmit` passes with 0 errors

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
- [ ] `suspended` status works throughout system (DB, API, UI)
- [ ] Circuit breaker auto-suspends when violation threshold exceeded
- [ ] `alert_only` mode notifies without suspending
- [ ] Suspended agents can be resumed through re-approval
- [ ] Status badge shows `suspended`
- [ ] Audit trail records suspension events
- [ ] `npx tsc --noEmit` passes with 0 errors

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
- [ ] Quality dashboard shows production metrics alongside design-time scores
- [ ] Policy adherence rate computed from violations data
- [ ] Uptime computed from telemetry data
- [ ] API returns production quality data
- [ ] `npx tsc --noEmit` passes with 0 errors

---

#### H2-2.2 — Quality Trend Analysis

**Depends on:** H2-2.1

**What to build:**

1. **New DB table `qualityTrends`**: weekly snapshots per agent. Columns: `id`, `agentId`, `enterpriseId`, `weekStart` (date), `designScore` (real), `productionScore` (real, nullable), `policyAdherenceRate` (real, nullable)

2. **Cron job** `POST /api/cron/quality-trends`: weekly, computes snapshot for each deployed agent

3. **Trend visualization** in quality dashboard: line chart showing quality score over past 12 weeks. Highlight regression (current score < previous week by > 10 points).

4. **Regression alert**: when production quality drops > 15 points below design-time quality: `createNotification()` + webhook event

**Definition of done:**
- [ ] Weekly snapshots stored in `qualityTrends`
- [ ] Cron job computes and stores snapshots
- [ ] Quality dashboard shows 12-week trend visualization
- [ ] Regression detection creates alerts
- [ ] `npx tsc --noEmit` passes with 0 errors

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
- [ ] SAML and OIDC providers configured in NextAuth
- [ ] SSO settings stored per-enterprise
- [ ] Admin SSO configuration page works
- [ ] Login page shows SSO option when configured
- [ ] SSO login creates/updates user record
- [ ] `npx tsc --noEmit` passes with 0 errors

---

#### H2-3.2 — Directory Sync + JIT Provisioning

**Depends on:** H2-3.1

**What to build:**

1. **JIT user creation**: on first SSO login, auto-create user with email + name from assertion, role mapped from directory group

2. **Group → role mapping** in enterprise settings `sso.groupRoleMapping`:
   - `{ "EngineeringLeads": "architect", "ComplianceTeam": "compliance_officer" }` — default for unknown groups: `viewer`

3. **Periodic sync** (stretch): `POST /api/cron/directory-sync` — query IdP for deactivated users, mark inactive in Intellios

**Definition of done:**
- [ ] First SSO login creates user with correct role from group mapping
- [ ] Subsequent SSO logins update user attributes
- [ ] Admin can configure group-to-role mappings
- [ ] Unknown groups default to viewer role
- [ ] `npx tsc --noEmit` passes with 0 errors

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
- [ ] `WorkflowSchema` validates workflow definitions
- [ ] `workflows` table exists
- [ ] CRUD routes work with auth + enterprise scoping
- [ ] Agent references validated against registry
- [ ] `npx tsc --noEmit` passes with 0 errors

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
- [ ] Registry API supports querying workflows
- [ ] Registry UI shows agents and workflows as separate views
- [ ] Workflow detail page renders definition and version history
- [ ] `npx tsc --noEmit` passes with 0 errors

---

#### H2-4.3 — Workflow Governance

**Depends on:** H2-4.1, H2-4.2

**What to build:**

1. **Workflow validation**: before `in_review`, validate all referenced agents are `approved` or `deployed`, no circular handoff rules, all shared context fields defined

2. **Workflow governance diff**: show changes between workflow versions (agents added/removed, handoff rules modified)

3. **Approval workflow**: same multi-step chain as blueprints. Audit trail via `publishEvent()`

4. **MRM report extension**: include workflow context section when blueprint is part of a deployed workflow

**Definition of done:**
- [ ] Workflow validation blocks invalid workflows from review
- [ ] Governance diff shows workflow changes
- [ ] Multi-step approval works for workflows
- [ ] Audit trail records workflow events
- [ ] `npx tsc --noEmit` passes with 0 errors

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
- [ ] Weekly snapshots stored and queryable
- [ ] Trend API returns time-series data
- [ ] Trend charts render in fleet dashboard
- [ ] `npx tsc --noEmit` passes with 0 errors

---

#### H2-5.2 — Cost Attribution

**Depends on:** H1-1.1

**What to build:**

1. **Cost computation** from telemetry: `tokensIn * inputCostPerToken + tokensOut * outputCostPerToken`. Cost rates in `enterpriseSettings.costRates` (new settings section).

2. **Per-agent cost API** `GET /api/registry/[agentId]/cost?period=<month>`

3. **Fleet cost rollup API** `GET /api/portfolio/cost?period=<month>`: grouped by `agentBlueprints.ownership.businessUnit`

4. **Cost column** in registry list page

**Definition of done:**
- [ ] Cost rates configurable per enterprise
- [ ] Per-agent cost API returns correct calculations
- [ ] Fleet cost rollup groups by business unit
- [ ] Registry list shows cost column
- [ ] `npx tsc --noEmit` passes with 0 errors

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
- [ ] Executive dashboard renders all 6 data cards
- [ ] PDF export produces clean print-ready output
- [ ] Access restricted to admin + compliance_officer
- [ ] All data from existing APIs (no new backend)
- [ ] `npx tsc --noEmit` passes with 0 errors

---

## H3 — Execution Platform (Months 9–18)

**Theme:** Extend from design + governance into workflow composition and execution monitoring.

**Gate:** 3+ enterprise design partners with validated execution orchestration needs. Do not build speculatively.

**Completion: 0/14 — 0%**

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
- [ ] Scheduled re-evaluation detects governance drift
- [ ] Drift notifications sent
- [ ] Fleet dashboard shows drift status
- [ ] `npx tsc --noEmit` passes with 0 errors

---

#### H3-3.2 — Self-Healing Remediation

**Depends on:** H3-3.1, A-09

**What to build:**

1. **AI remediation suggestions**: when drift or violations detected, use Claude to propose specific ABP changes to resolve violations

2. **Auto-create draft**: new blueprint version (draft status) with Claude's suggested changes applied, linked to triggering violations

3. **Architect review flow**: "Suggested Fix" appears in Studio with diff showing Claude's changes. Architect can accept/modify/reject.

**Definition of done:**
- [ ] Claude proposes ABP changes based on violations
- [ ] Draft version auto-created with suggested fixes
- [ ] Diff view shows proposed changes
- [ ] Architect can accept/modify/reject
- [ ] `npx tsc --noEmit` passes with 0 errors

---

#### H3-3.3 — Compliance Calendar

**Depends on:** G-14

**What to build:**

1. **New page `src/app/governor/calendar/page.tsx`**: calendar view showing SR 11-7 review due dates, policy review schedules, regulatory submission deadlines

2. **Automated reminders**: extend `POST /api/cron/review-reminders` to send notifications at 30, 14, 7 days before deadlines

3. **iCal export**: generate `.ics` file for subscribing in external calendar apps

**Definition of done:**
- [ ] Calendar page shows all compliance-related deadlines
- [ ] Reminders at 30/14/7 day intervals
- [ ] iCal export works
- [ ] `npx tsc --noEmit` passes with 0 errors

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
- [ ] Templates have community metadata
- [ ] Gallery with search and filtering
- [ ] Architects can publish blueprints as templates
- [ ] Rating system works
- [ ] `npx tsc --noEmit` passes with 0 errors

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
- [ ] Adapter interface with implementations for ServiceNow, Jira, Slack
- [ ] Each configurable per-enterprise
- [ ] Events trigger adapter actions
- [ ] Admin page for managing integrations
- [ ] `npx tsc --noEmit` passes with 0 errors

---

#### H3-4.3 — API-First + SDK

**Depends on:** H1-4.3

**What to build:**

1. **OpenAPI 3.1 spec**: `docs/api/openapi.yaml` covering all public API routes

2. **API key management**: `apiKeys` table (`id`, `enterpriseId`, `name`, `keyHash`, `scopes`, `createdBy`, `createdAt`, `lastUsedAt`, `revokedAt`). Admin page for creating/revoking keys.

3. **TypeScript SDK**: `packages/sdk-typescript/` — typed client from OpenAPI spec

4. **Python SDK**: `packages/sdk-python/` — typed client from OpenAPI spec

**Definition of done:**
- [ ] OpenAPI spec covers all public routes
- [ ] API key creation/revocation via admin UI
- [ ] TypeScript SDK installable and functional
- [ ] Python SDK installable and functional
- [ ] `npx tsc --noEmit` passes with 0 errors

---

#### H3-4.4 — Multi-Cloud Deployment

**Depends on:** P-08

**What to build:**

1. **Deployment adapter interface** `src/lib/deploy/adapter.ts`: `deploy(abp, config): Promise<DeploymentRecord>`, `getStatus(record): Promise<string>`

2. **Azure AI Foundry adapter**: translate ABP → Azure AI Foundry deployment manifest

3. **Google Vertex AI adapter**: translate ABP → Vertex AI agent definition

4. **Deployment target selector** in `src/app/blueprints/[id]/page.tsx`: choose target (Bedrock / Azure / Vertex / Custom). Config in `enterpriseSettings.deploymentTargets`.

**Definition of done:**
- [ ] Deployment adapter interface with Azure + Vertex implementations
- [ ] ABP translated to each cloud manifest format
- [ ] Deployment target selector in UI
- [ ] Deployed agents tracked with target-specific metadata
- [ ] `npx tsc --noEmit` passes with 0 errors

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
