# Intellios Roadmap

## Current Phase: Session 065 ✓ Complete (2026-03-18) — Architect Experience Audit: Final Items

Post-submission transparency (approval progress timeline in workbench right rail for `in_review` blueprints — step-by-step reviewer name, decision, timestamp, comment) and pause/resume intelligence (Welcome back banner for stale drafts >24h with section/violation/refinement count summary, session-dismissible). Completes 7/10 audit recommendations from the hard Architect Experience Vision audit. Remaining deferred: progressive collaboration live feed (#8, requires WebSocket/polling), multi-agent data model primitives (#9, requires ABP schema design work).

**Estimated alignment score vs. Architect Experience Vision: ~65–70 / 100** (up from 44 at audit start).

---

## ✓ Session 064 Complete (2026-03-18) — Design System + UX Improvements

Design system fully token-based (no raw Tailwind color classes remaining in UI). Status badges and risk tier indicators use icon shape + color. Five information hierarchy improvements across main pages. KpiCard extracted as shared component. Remaining design audit items: component consolidation (DataTable, SectionCard, AgentRow), typography/spacing/shadow token sets, empty-state component.

---

## ✓ Phase 53 Complete (2026-03-17) — Viewer Role + Role Model Optimization

---

## ✓ Phase 53 Complete (2026-03-17) — Viewer Role + Role Model Optimization

New 5th role `viewer` added to the Intellios role model (previously: `designer | reviewer | compliance_officer | admin`). **Context:** Phase 49 evaluation identified that giving a CRO/CISO/external auditor fleet-posture visibility required making them `admin` — granting user management, enterprise settings, and AgentCore deployment authority, which no enterprise security team would accept. **Viewer capabilities (read-only):** fleet governance dashboard, compliance posture page, monitoring intelligence, audit trail (enterprise-scoped), governance analytics, MRM reports, evidence packages, agent registry. **Viewer cannot:** create/edit blueprints, approve/reject/deploy, create/edit governance policies, trigger health checks, manage users or enterprise settings. **Implementation:** `"viewer"` added to `Role` type; 8 API read-gates updated; 3 admin user-management routes updated (viewer is now an assignable role in the invite/create/update flows); sidebar updated with Governance + Monitor nav sections for viewer; home page hides `NewIntakeButton` for viewer (falls through to fleet overview); compliance page client-side gate updated; governance page `canViewAnalytics` extended to viewer. **Rec 4 fix (same session):** `GET /api/blueprints/[id]/export/code` was missing the `approved | deployed` status gate that compliance and AgentCore exports already enforce — now added. **Rec 3 (non-issue):** `GET /api/blueprints/[id]/test-runs` already uses `requireAuth()` with no role restriction; compliance officers already had access. 17 files modified, 0 migrations, 0 new deps. TypeScript: 0 new errors (pre-existing errors in test files unchanged).

---

## ✓ Phase 52 Complete (2026-03-17) — Blueprint Lineage with Governance Diff

When a blueprint spawns a new version via "Create New Version," the system now automatically computes and permanently stores the governance diff between source and new blueprint. **Schema**: two new columns on `agent_blueprints` — `previous_blueprint_id UUID` (FK, null for v1) and `governance_diff JSONB` (null for v1). **Diff engine**: existing `diffABP()` function (added in Phase 23) called in the new-version route at creation time; diff includes per-section breakdown (governance/capabilities/constraints/identity), per-change type (added/removed/modified), significance (major/minor/patch), and totalChanges. **Audit enhancement**: `governanceDiffSignificance` and `governanceDiffChangeCount` stored in the blueprint.created audit event for every new version. **Registry UI**: "VERSION LINEAGE" panel in Versions tab renders when at least one version has `governanceDiff != null`; shows v{from}→v{to} arrow, colored significance badge (major=red, minor=amber, patch=gray), change count, "View changes ↓" toggle, expandable per-section breakdown with per-change type icons (+/−/~), and governance implication notes (re-validation required for governance section changes; safety policy review triggered for instruction changes; constraint re-validation recommended for tool changes). Verified end-to-end: created v2.0.0 from deployed v1.0.0 Credit Risk Assessment Agent — "Patch — identity or metadata only", 0 changes (correct for metadata-only new version). 1 new migration (0023), 4 files modified. **Completes the three-action strategic plan from Phase 49 evaluation.** TypeScript: 0 errors.

---

## ✓ Phase 51 Complete (2026-03-17) — Fleet Governance Dashboard

CRO/CISO-facing aggregate risk posture view on the admin Overview page. **New component** `FleetGovernanceDashboard` (async server component) — joins `agentBlueprints` with `intakeSessions` to get `riskTier`; filters to `approved | deployed` status; enterprise-scoped. **Risk tier derivation**: uses intake classification when available; falls back to governance policy-type logic (safety + compliance → high, one → medium, neither → low) for older agents without intake context. **Renders**: 4 risk tier KPI cards (Critical/High/Medium/Low counts, color-coded), governance alert chips (overdue for review, with governance errors, not yet validated), per-agent fleet table (agent name + version + status + policy count, risk tier badge, governance health ✓/⚠/✗, next review date or "Overdue" badge, "View Report" evidence link). Admin sees all agents; non-admin roles are enterprise-filtered. No new data model — pure query + presentation layer over existing governance infrastructure. 1 new file, 1 modified.

---

## ✓ Phase 50 Complete (2026-03-17) — Evidence Package Export

One-click regulatory evidence bundle for approved and deployed agents. **New route** `GET /api/blueprints/[id]/evidence-package` — accessible to `designer | reviewer | compliance_officer | admin` (broader than the existing compliance export, which required `compliance_officer | admin`). Status gate: `approved | deployed` only. **Bundle contents**: full 14-section MRM compliance report (assembled by `assembleMRMReport()`), multi-step approval chain (`approvalProgress` records with decision/actor/timestamp/comment), AI quality evaluation (5 scored dimensions), and all behavioral test run evidence. **Blueprint Studio integration**: new "Audit Evidence" section in the right rail for approved/deployed blueprints — "EXAM-READY" badge, framing copy, "View Compliance Report" link (to print-optimized MRM report page), "↓ Export Evidence Package" button (triggers download). Audit: `blueprint.evidence_package_exported` written on every export. No new data model — all data existed. 1 new file, 1 modified.

---

## ✓ Phase 49 Complete (2026-03-17) — Intake Confidence Engine

Intake reads the room. **Expertise detection**: after turn 2, `detectExpertiseLevel()` scores user messages for technical vs. business vocabulary and uncertainty signals — returning `"guided"`, `"adaptive"`, or `"expert"`. The detected level persists to `intakeSessions.expertise_level` and adapts Claude's communication register: Guided mode gets structured sub-questions, examples, and plain-language framing; Expert mode gets concise validation-focused exchanges without hand-holding; Adaptive mirrors the designer's vocabulary. **Adaptive model routing**: Guided mode routes to Sonnet for first 6 turns (richer language quality for non-technical designers). **Topic-specific probing rules**: `buildTopicProbingRules()` generates 0-8 soft advisory rules from context + agent type — customer-facing agents get fallback/rate-limiting/error-messaging probes; external API agents get auth/retry probes; PII data gets masking-scope probes; autonomous agents get human-oversight/override/escalation probes. These inject after the existing governance probing block in the system prompt. **Live Readiness Score**: Phase 2 sidebar shows a 0-100 score (section coverage + governance depth + specificity) with color-coded progress bar and label ("Getting started" → "Building requirements…" → "Nearly complete" → "✓ Ready to finalize"); updates on every payload poll. **Completeness Map**: Phase 3 review shows a 7-domain grid — status-colored cards (required/optional × filled/sparse/empty) with stakeholder-contribution indicators and trigger-reason labels that explain why a domain is required. **Tentative-items warning**: soft amber callout on the generate button when `unresolvedFlags > 0` — non-blocking, surfaces uncertainty without preventing generation. 1 schema migration (0022), 5 new files, 6 modified. TypeScript: 0 new errors.

---

## ✓ Phase 48 Complete (2026-03-17) — Stakeholder Collaboration Workspace

## ✓ Phase 48 Complete (2026-03-17) — Stakeholder Collaboration Workspace

Full multi-stakeholder AI-orchestrated collaboration system. **External domain experts** (Compliance, Legal, IT, etc.) can now contribute requirements without an Intellios account via token-gated public workspaces. **RACI authority model** per domain: each stakeholder's AI interview is tonally adapted — Accountable owners focus on non-negotiables, Responsible owners on implementation concerns, Consulted experts on domain requirements, Informed stakeholders on concerns/dependencies. **Shared synthesis**: stakeholders see a live AI-generated summary of what's already been agreed, so each interview builds on prior contributions rather than repeating them. **AI Orchestrator** (`claude-haiku-4-5-20251001`) runs fire-and-forget after every contribution: generates synthesis + conflict detection + gap analysis + suggested next invitations; saves as `intakeAIInsights` rows. **Designer insights panel**: per-domain rows with RACI badge, invitee name, status; inline invite form; AI Orchestrator section with collapse/expand insight cards, dismiss, approve-to-act. **Auto-invitation on insight approval**: when a designer approves a "suggest invite" insight, the system auto-creates the invitation and sends the email — closing the orchestrator→action loop. 10 new files, 8 modified, 2 DB migrations (0020/0021). TypeScript: 0 errors.

---

## ✓ Session 056 Complete (2026-03-16) — UI/UX Polish Pass

Four targeted improvements to data-dense screens. **Workspace Activity deduplication:** `groupItems()` collapses consecutive identical `(actorName, description)` pairs with `×N` count badge — 25 identical rows → 1 with ×25. **User Management redesign:** 3-column `[3fr_2fr_1fr]` grid; two-line user cell (name + email); role-colored `border-l-2` stat cards; hover-reveal PenLine edit icon; Mail icon invite button; self-row `bg-violet-50/40` highlight; human-readable dates with `whitespace-nowrap`. **Compliance Activity Trends:** all-zero early exit to clean empty state (no empty bars); combined overlapping bar per month (blue-100 background + green-400/70 fill); `[80px_1fr_72px]` grid; `"Oct 2025"` month labels from ISO `"2025-10"`; right-aligned `submitted / approved` counts. **Intake Sessions rows:** `"by [username] · [timeAgo]"` as third content line (username from email before `@`); removed right-side metadata div; tags + chevron remain. 0 new files, 4 rewrites, 0 migrations, 0 deps. TypeScript: 0 errors.

---

## ✓ Phase 47 Complete (2026-03-16) — Help Copilot

One-shot Q&A had no conversation memory — follow-up questions lost all context. **Multi-turn copilot:** `/api/help/ask` replaced by `/api/help/chat` accepting full `UIMessage[]` history + pathname; `convertToModelMessages()` + `toUIMessageStreamResponse()` (same pattern as Blueprint Simulate). Client upgraded from manual `ReadableStream` decoding to `useChat()` hook with `DefaultChatTransport({ body: { pathname } })` in `useMemo([pathname])`. `MessageBubble` renders user (dark right) + assistant (light left) bubbles. Three-dot streaming indicator. Trash2 clear button in header resets to suggestion cards. System prompt updated to instruct multi-turn behavior and proactive follow-up suggestions. Token limit doubled to 800. Panel widened to 400px. 1 new file, 1 rewrite, 1 deleted, 0 migrations, 0 deps. TypeScript: 0 production errors.

---

## ✓ Phase 46 Complete (2026-03-16) — Contextual Help Panel

Zero help infrastructure existed. Users had no way to understand features or workflows without leaving the page. **"Ask Intellios" help panel:** `?` (HelpCircle) button in sidebar footer triggers a 360px right-side overlay. Suggested questions are computed entirely client-side (no API call) using `usePathname()` + role — 8 pathname prefixes × role → 4 tailored questions, with a global fallback. Users can also type any free-form question. Streaming AI answers via `claude-haiku-4-5-20251001` with `toTextStreamResponse()` — responses feel instant. ReactMarkdown renders formatted answers. Backdrop click or Escape key closes the panel. `buildHelpSystemPrompt()` covers all 5 subsystems, agent lifecycle, 4 roles, risk tiers, agent types, and governance concepts. 2 new files, 1 modified, 0 migrations, 0 deps. TypeScript: 0 production errors.

---

## ✓ Phase 45 Complete (2026-03-16) — Notification Settings, Blueprint Regeneration + Status Polling

Three behavioral gaps closed. **Notification settings wired:** `handler.ts` now loads `getEnterpriseSettings()` and gates all `sendEmail()` calls behind `notifyOnApproval`; `adminEmail` CC added for approved/deployed events. `createNotification()` remains unconditional — in-app notifications always fire. **Blueprint regeneration:** `POST /api/blueprints/[id]/regenerate` re-runs `generateBlueprint()` + `validateBlueprint()` from stored intake session, updates draft row in-place (no insert), resets `refinementCount` to 0. "Regenerate Blueprint" button in Blueprint Studio right rail (draft only) with two-step amber confirm state. **Status polling:** 30s visibility-aware `setInterval` polling `useEffect` added to registry detail page using the existing `load()` callback — catches external status changes without manual refresh. 1 new file, 5 modified, 0 migrations, 0 deps. TypeScript: 0 errors.

---

## ✓ Phase 44 Complete (2026-03-16) — Surface Latent Data + Activate Middleware

Three gaps closed using existing data and infrastructure: **Auth middleware activated** — `proxy.ts` renamed to `middleware.ts` (git mv, no content change); edge auth was never running. **Governance scores in Versions tab** — `validationReport` was already fetched but not displayed; added Governance column with pass/fail badge and error/warning counts from `violations` by severity. **Quality Index KPI on admin Overview** — `getRecentSnapshots()` called directly from server component; Governance Health section with score/100 and delta now visible on the first page admins see. 0 new files, 3 modified, 0 migrations, 0 deps. TypeScript: 0 errors.

---

## ✓ Phase 43 Complete (2026-03-16) — Last-Mile Completions + Blueprint Iteration

Three orphaned/broken features closed. **Notification Bell wired**: `NotificationBell` (Phase 3) added to sidebar header — was fully built but never imported. **Version diff confirmed complete**: `GET /api/blueprints/[id]/diff` + `diffABP()` engine + `VersionDiff` component were all already built; feature is end-to-end functional. **Blueprint iteration**: `POST /api/blueprints/[id]/new-version` creates a new draft version of the same logical agent (same `agentId`, major semver bump, lifecycle state reset); "Create New Version" button in `LifecycleControls` for approved/deployed status. 1 new file, 3 modified. 0 DB migrations. 0 new npm dependencies. TypeScript: 0 errors.

---

## ✓ Phase 42 Complete (2026-03-16) — Activation & Visibility

Blueprint Template Library (6 production-ready starters, `/templates` gallery, one-click use flow, welcome page step 1) + Workspace Activity Feed (humanized audit log on admin Overview). 7 new files, 6 modified, 0 migrations, 0 deps. TypeScript: 0 errors.

---

## ✓ Phase 41 Complete (2026-03-16) — Growth & Security

Self-Service Enterprise Registration: any organization can create a workspace from the landing page — admin account created, enterprise settings seeded, SR 11-7 governance policies pre-loaded, `/welcome` onboarding checklist. Adversarial Red-Teaming: two-phase AI security evaluation in the Simulate tab — Sonnet generates 10 tailored attack prompts (2 per category: scope_creep, jailbreak, data_exfiltration, instruction_override, governance_bypass), Haiku evaluates all 10 in parallel, produces a scored RedTeamReport with risk tier (LOW/MEDIUM/HIGH/CRITICAL) and expandable attack rows. Landing + login CTAs updated to drive registrations. 5 new files. 0 DB migrations. 0 new npm dependencies. TypeScript: 0 errors.

---

## ✓ Phase 40 Complete (2026-03-16) — Close the Factory Loop

Three components that make "deploy" mean something. **Agent Playground**: "Simulate" tab on Registry detail — live sandboxed Claude chat using the blueprint's system prompt, tools as narrative context, and governance rules as constraints. Stateless (messages client-side only). **Agent Code Export**: "Export Agent Code ↓" button downloads a single-file TypeScript agent with system prompt, tool stubs, and a working agentic loop. **Public Landing Page**: `/landing` serves unauthenticated visitors; unauthenticated `/` redirects there. 5 new files. 0 DB migrations. 0 new npm dependencies. TypeScript: 0 errors.

---

## ✓ Phase 39 Complete (2026-03-15) — Role-Optimized UX

12 targeted UX fixes across Designer, Reviewer, Compliance Officer, and all roles. No new routes, migrations, or dependencies. Key changes: intake form submit button violet+spinner, quality popover dimension descriptions, classification rationale display, pipeline Draft empty CTA, review step badge role-awareness, violations→Governance Hub link, approval history in Versions tab, compliance KPI card anchors + subtitles + count links, null agent name fallback shows short ID, AgentCore success modal "View in Registry".

---

## ✓ Phase 38 Complete (2026-03-15) — Classification-First Adaptive Intake

---

## ✓ MVP — Complete (2026-03-12)

**Goal:** Demonstrate the core loop — intake requirements, generate a blueprint, validate it, store it, and review it.

### MVP Scope

| Component | Status | Priority |
|---|---|---|
| Intake Engine | Complete | P0 |
| Generation Engine | Complete | P0 |
| Governance Validator | Complete | P0 |
| Agent Registry | Complete | P0 |
| Blueprint Review UI | Complete | P0 |
| ABP Schema v1.0.0 | Defined | P0 |

### MVP Success Criteria

All criteria validated end-to-end on 2026-03-12 (Session 002) against PostgreSQL with a live Anthropic API key.

1. ✓ An enterprise user can provide requirements through the Intake Engine.
2. ✓ The Generation Engine produces a valid ABP from those requirements.
3. ✓ The Governance Validator checks the ABP against a set of policies.
4. ✓ The ABP is stored in the Agent Registry with versioning.
5. ✓ A human reviewer can view and approve/reject the ABP through the Review UI.

---

## Post-MVP Phase 1 — Production Readiness

Prerequisite work before Intellios can serve real enterprise users.

| Item | Priority | Status | Notes |
|---|---|---|---|
| Authentication | P0 | ✓ Complete (Session 003) | NextAuth v5 credentials provider, bcrypt, 8-hour JWT sessions |
| User roles + RBAC | P1 | ✓ Complete (Session 003) | 4 roles: designer, reviewer, compliance_officer, admin. SOD enforced on review. |
| Audit log | P0 | ✓ Complete (Session 003) | Append-only `audit_log` table; wired into all lifecycle events |
| Rate limiting | P1 | ✓ Complete (Session 003) | Sliding-window in-memory; chat 30/min, generate+refine 10/min |
| Input validation | P1 | ✓ Complete (Session 003) | Zod on all POST/PATCH routes via `parseBody()` helper |
| Security headers | P1 | ✓ Complete (Session 003) | CSP, X-Frame-Options, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy |
| Request correlation IDs | P1 | ✓ Complete (Session 003) | `X-Request-Id` injected by middleware, threaded through all routes and error responses |
| Environment variable validation | P1 | ✓ Complete (Session 003) | `src/lib/env.ts` validates DATABASE_URL, ANTHROPIC_API_KEY, AUTH_SECRET at startup |
| Intake Engine UX | P1 | ✓ Complete (Session 003) | Dynamic system prompt, markdown rendering, suggested prompts, session history, sidebar detail |
| Multi-tenancy | P0 | ✓ Complete (Session 004) | Application-level `enterprise_id` filtering on all 16 routes; `assertEnterpriseAccess()` helper; admin has cross-enterprise access |
| ABP schema evolution strategy | P1 | Not started | Migration strategy needed before v1.1.0. See OQ-007. |
| Deployment pipeline | P2 | Not started | Package approved ABPs for delivery to target runtime environments. |
| Distributed rate limiting | P2 | Not started | Current in-memory limiter does not work across multiple server instances. Replace with Redis. |

---

## Post-MVP Phase 2 — Enterprise UX

Transforms Intellios from a functional tool into a governed enterprise platform. Implemented in three phases (A → B → C) derived from the full UX architecture evaluation (Session 005).

### Phase A — Foundation ✓ Complete (2026-03-13 Session 005)

| Item | Status | Notes |
|---|---|---|
| Role-differentiated home screens | ✓ Complete | Designer (My Work + intake CTA), Reviewer (Review Queue focus), Admin (portfolio stats). Server component with direct DB reads. |
| Pipeline Board | ✓ Complete | Kanban board at `/pipeline`. DRAFT → IN_REVIEW → APPROVED → REJECTED → DEPRECATED columns. Violation count badges. Tag filter. |
| Blueprint Workbench redesign | ✓ Complete | Three-column layout: left-rail section stepper (7 sections, ✓/· per section), center (blueprint content), right (Submit for Review + violations + refinement). Submit button disabled until governance blockers = 0. |
| Navigation update | ✓ Complete | Pipeline link added for all authenticated users. |
| Registry API enrichment | ✓ Complete | `/api/registry` now returns `violationCount` (derived from stored validation report). |

### Phase B — Governance & Oversight ✓ Complete (2026-03-13 Session 005)

| Item | Status | Notes |
|---|---|---|
| Governance Hub | ✓ Complete | `/governance` — 4-stat coverage overview, agents-requiring-attention list, policy library with type/scope badges, compliance-by-stage table |
| Review Console upgrade | ✓ Complete | Structured radio decision form (approve/request_changes/reject), inline governance report with violation detail, SOD warning when reviewer = designer, required rationale stored in audit log |
| Audit Trail UI | ✓ Complete | `/audit` — filter by entity type/actor/date, load-on-demand table, expandable metadata, CSV export. Restricted to compliance_officer + admin. |
| `/api/me` endpoint | ✓ Complete | Returns current user email/name/role for client-side SOD checks |

### Phase C — Lifecycle Extension ✓ Complete (2026-03-13 Session 005)

| Item | Priority | Status | Notes |
|---|---|---|---|
| `deployed` lifecycle status | P2 | ✓ Complete | Added `deployed` to all type enums (status route, ABP schema, lifecycle controls, status badge, pipeline board). Transition: `approved → deployed → deprecated`. |
| Blueprint plain-language summary | P2 | ✓ Complete | `BlueprintSummary` component + "Summary" tab on registry detail page. Human-readable view of identity, capabilities, constraints, governance, audit. |
| Deployment Console | P2 | ✓ Complete | `/deploy` — ready-to-deploy queue, one-click deploy, live production table with governance health. |
| Executive Dashboard | P2 | ✓ Complete | `/dashboard` — top-line KPIs (deployed count, deployment rate, compliance rate, pending review), pipeline funnel bar chart, governance health grid, recent deployments table, platform summary stats. |
| Navigation update | P2 | ✓ Complete | Deploy link added for reviewer/compliance_officer/admin. Dashboard link for compliance_officer/admin. |
| Version diff view | P3 | Not started — compare blueprint versions side by side |

---

---

## Post-MVP Phase 3 — Workflow Intelligence ✓ Complete (2026-03-13 Session 006)

Transforms Intellios from a governed pipeline into a self-managing enterprise platform. Reviewers and designers are notified in real time; compliance officers receive SLA breach alerts; no one needs to poll the UI to know their work is waiting.

| Item | Priority | Status | Notes |
|---|---|---|---|
| Event bus | P0 | ✓ Complete | In-process `LifecycleEvent` bus (`src/lib/events/`). `registerHandler()` + fire-and-forget `dispatch()`. |
| Notifications DB table | P0 | ✓ Complete | `notifications` table + migration `0005_notifications.sql`. Two indexes: recipient inbox + enterprise audit. |
| Notification routing handler | P0 | ✓ Complete | `src/lib/notifications/handler.ts` — routes lifecycle events to correct recipients (reviewers, designers, compliance officers) by event type and `toState`. Self-registers via side-effect import in `audit/log.ts`. |
| Audit-as-event-source | P0 | ✓ Complete | `writeAuditLog` is the single event integration point — dispatches `LifecycleEvent` after DB insert. No duplicate call sites. |
| Email delivery (Resend) | P1 | ✓ Complete | `src/lib/notifications/email.ts` — Resend API, graceful no-op when `RESEND_API_KEY` absent. |
| Notifications API | P0 | ✓ Complete | `GET /api/notifications` (list + unread count) + `PATCH /api/notifications` (mark all read). |
| NotificationBell UI | P0 | ✓ Complete | `src/components/nav/notification-bell.tsx` — 30s focus-aware polling, unread count badge, dropdown with type icons + relative timestamps. |
| SLA monitoring | P1 | ✓ Complete | `src/lib/sla/config.ts` — `getSlaStatus()` with 48h warn / 72h alert (env-var overridable). Pipeline Board: amber ring at warn, red ring + "SLA breach" badge at alert. |
| Route metadata enrichment | P0 | ✓ Complete | Status + review routes now pass `agentName`, `agentId`, `createdBy` in audit metadata — enables correct notification recipient lookup. |

---

---

## Post-MVP Phase 4 — Enterprise UX Hardening ✓ Complete (2026-03-13 Session 007)

Addresses the three most critical gaps identified in the Fortune 500 financial services UX evaluation.

| Item | Priority | Status | Notes |
|---|---|---|---|
| Deployment confirmation modal | P0 | ✓ Complete | Change reference (required), deployment notes (optional), authorization checkbox. All stored in audit log metadata. Deploy button opens modal; no one-click production deployments. |
| Global search — Registry | P0 | ✓ Complete | Text search by name, agentId, or tag + status filter dropdown. `useMemo` client-side filter. Result count + clear filters affordance. |
| Global search — Pipeline Board | P0 | ✓ Complete | Text search input alongside tag filter. `matchesSearch()` helper + `useMemo`. Clear link when active. |
| Review decision banner | P0 | ✓ Complete | Color-coded banner between tabs and content on Blueprint detail: green (approved), red (rejected), amber (changes requested). Shows reviewer identity, timestamp, and comment. |
| Status route — change management fields | P0 | ✓ Complete | `changeRef` + `deploymentNotes` added to Zod schema; stored in audit metadata on `deployed` transitions. |
| Three-layer deployment defense | P0 | ✓ Complete | (1) `LifecycleControls` redirects to `/deploy` modal — no direct deploy from detail page. (2) API rejects `deployed` without `changeRef`. (3) RBAC guard: only `reviewer`/`admin` may transition to `deployed`. SOD fully enforced. |

---

## Post-MVP Phase 5 — MRM Compliance Report ✓ Complete (2026-03-13 Session 008)

Enables compliance officers and model risk teams to extract a single, structured evidence
package per deployed agent — satisfying SR 11-7 model documentation and audit trail requirements.

| Item | Priority | Status | Notes |
|---|---|---|---|
| `MRMReport` type definition | P0 | ✓ Complete | `src/lib/mrm/types.ts` — 10-section typed interface. |
| Report assembly function | P0 | ✓ Complete | `src/lib/mrm/report.ts` — assembles from blueprint record, version history, and audit log. 4 DB queries. |
| Report API endpoint | P0 | ✓ Complete | `GET /api/blueprints/[id]/report` — compliance_officer + admin only. Writes `blueprint.report_exported` audit entry on every call. |
| Export audit trail | P0 | ✓ Complete | `blueprint.report_exported` added to `AuditAction` + `EventType`. Every download is permanently traceable. |
| Export button on Blueprint detail | P0 | ✓ Complete | "Export MRM Report" button in Registry detail header — role-gated (compliance_officer + admin). Downloads `mrm-report-{name}-v{version}.json`. |
| Risk Classification section | P0 | ✓ Complete | Risk tier (High/Medium/Low) derived from governance policy types. Intended use, business owner, model owner. Derivation basis stated for human validation. |
| Model Lineage section | P0 | ✓ Complete | Full version history (all agent versions) + deployment lineage (every production deploy across all versions, with changeRef). |

---

## Post-MVP Phase 6 — Enterprise Intake Architecture ✓ Complete (2026-03-13 Session 009)

Eliminates the completeness and governance blindspot in the original single-phase intake design.
Transforms intake from a discovery-driven conversation into a structured, evidence-grade capture process.

| Item | Priority | Status | Notes |
|---|---|---|---|
| DB migration: `intake_context` column | P0 | ✓ Complete | `ALTER TABLE intake_sessions ADD COLUMN IF NOT EXISTS intake_context JSONB` |
| `IntakeContext` type | P0 | ✓ Complete | 6 fields: agentPurpose, deploymentType, dataSensitivity, regulatoryScope, integrationTypes, stakeholdersConsulted |
| `PATCH /api/intake/sessions/[id]/context` | P0 | ✓ Complete | Validates + saves Phase 1 context; auth + enterprise access guards |
| `IntakeContextForm` component (Phase 1) | P0 | ✓ Complete | Structured form with 6 field groups; all required before conversation begins |
| System prompt context injection | P0 | ✓ Complete | `buildContextBlock()` injects Enterprise Context + Mandatory Governance Probing Rules (5 trigger rules) |
| Governance sufficiency matrix | P0 | ✓ Complete | `checkGovernanceSufficiency()` in tools.ts; `mark_intake_complete` rejects if required governance missing |
| `flag_ambiguous_requirement` tool | P1 | ✓ Complete | Stores to `_flags` array in payload; surfaced in Phase 3 review screen |
| `IntakeReview` component (Phase 3) | P0 | ✓ Complete | Per-section review cards, acknowledgment checkboxes, flags panel, context strip, gated Generate button |
| Session page three-phase gating | P0 | ✓ Complete | Phase type: loading → context-form → conversation → review; correct state machine across all flows |
| MRM report intake context enrichment | P1 | ✓ Complete | riskClassification section now includes deploymentType, dataSensitivity, regulatoryScope, stakeholdersConsulted |

---

## Post-MVP Phase 7 — Stakeholder Requirement Lanes ✓ Complete (2026-03-13 Session 010)

Closes the gap between knowing that domain specialists were consulted and capturing what they
actually said. Transforms `stakeholdersConsulted` from a participation boolean into a full
attributed evidence record.

| Item | Priority | Status | Notes |
|---|---|---|---|
| DB migration: `intake_contributions` table | P0 | ✓ Complete | `0007_intake_contributions.sql` — id, session_id, enterprise_id, domain, contributor_name, contributor_role, fields (JSONB), submitted_at |
| `ContributionDomain` type + `StakeholderContribution` interface | P0 | ✓ Complete | 7 domains; fields typed as `Record<string, string>` per domain |
| `AuditAction` + `EventType` extension | P0 | ✓ Complete | `intake.contribution_submitted` added to both union types |
| `POST /api/intake/sessions/[id]/contributions` | P0 | ✓ Complete | Zod validation, enterprise access guard, audit log write |
| `GET /api/intake/sessions/[id]/contributions` | P0 | ✓ Complete | List contributions for session; auth + enterprise guard |
| `StakeholderContributionForm` component | P0 | ✓ Complete | Domain-adaptive form — selecting domain reveals 3 domain-specific fields |
| `StakeholderContributionsPanel` component | P0 | ✓ Complete | Phase 2 sidebar panel: count badge, per-contribution cards, Add Contribution affordance |
| System prompt injection (`buildContributionsBlock`) | P0 | ✓ Complete | Attributed per-domain sections; injected between context block and current state block |
| Session page + chat route contributions wiring | P0 | ✓ Complete | Contributions fetched on mount + after AI response; passed to progress + review components |
| `IntakeProgress` contributions rendering | P0 | ✓ Complete | `StakeholderContributionsPanel` rendered at bottom of Phase 2 sidebar |
| `IntakeReview` contributions panel | P0 | ✓ Complete | Full attributed contribution content shown before section cards in Phase 3 |
| MRM report Section 11 (`stakeholderContributions`) | P1 | ✓ Complete | 6th DB query in `assembleMRMReport()`; empty-array safe for pre-Phase 7 blueprints |

---

## Post-MVP Phase 8 — Policy Substance Enforcement + Contribution Coverage Indicators ✓ Complete (2026-03-13 Session 011)

Closes two silent failure modes that survived Phase 7:

| Item | Priority | Status | Notes |
|---|---|---|---|
| Policy substance check in `checkGovernanceSufficiency` | P0 | ✓ Complete | Required policies must have ≥1 non-empty rule or description ≥25 chars; empty shells return `_substance` gap and block finalization |
| Policy substance instruction in system prompt | P0 | ✓ Complete | `buildContextBlock` now warns Claude to include substantive content when calling `add_governance_policy` |
| `src/lib/intake/coverage.ts` — coverage helper | P0 | ✓ Complete | `getExpectedContributionDomains` + `getMissingContributionDomains` derived from Phase 1 signals |
| Sidebar coverage gap strip | P0 | ✓ Complete | `StakeholderContributionsPanel` renders amber strip with missing domain chips when `context` prop is provided |
| Phase 3 review missing-domain callout | P0 | ✓ Complete | `IntakeReview` renders non-blocking amber callout listing missing expected domains |
| Context prop pass-through | P0 | ✓ Complete | `IntakeProgress` → `StakeholderContributionsPanel`; session page passes `intakeContext` |

---

## Post-MVP Phase 9 — Intake Session Management + MRM Coverage Gap ✓ Complete (2026-03-13 Session 012)

Closes two remaining gaps: no way for designers to navigate back to in-progress sessions; MRM report documented which domains contributed but not which expected domains were absent.

| Item | Priority | Status | Notes |
|---|---|---|---|
| `GET /api/intake/sessions` | P0 | ✓ Complete | Lists sessions for current user/enterprise; designer sees own sessions, admin sees all enterprise sessions; derives agentName + agentPurpose from JSONB |
| `src/app/intake/page.tsx` — session list | P0 | ✓ Complete | Server component; In Progress + Completed sections; rows link to `/intake/{id}`; empty state with CTA |
| "Intake" nav link | P0 | ✓ Complete | Added for designer + admin roles, positioned before Pipeline |
| MRM `stakeholderCoverageGaps` field | P1 | ✓ Complete | `string[] \| null` in Section 11; computed via `getMissingContributionDomains`; null for pre-Phase 8 blueprints |

---

## Post-MVP Phase 10 — Governance Policy Management ✓ Complete (2026-03-13 Session 013)

Closes the governance configuration gap: compliance officers and admins can now create, edit, and delete enterprise governance policies entirely through the UI without needing direct API access.

| Item | Priority | Status | Notes |
|---|---|---|---|
| `GET /api/governance/policies/[id]` | P0 | ✓ Complete | Fetch single policy; compliance_officer + admin; enterprise-scoped access control |
| `PATCH /api/governance/policies/[id]` | P0 | ✓ Complete | Partial update; compliance_officer cannot modify global/platform policies; admin unrestricted |
| `DELETE /api/governance/policies/[id]` | P0 | ✓ Complete | Delete policy; same access control rules as PATCH; returns `{ deleted: true }` |
| POST — compliance_officer role | P0 | ✓ Complete | `POST /api/governance/policies` now accepts compliance_officer in addition to admin |
| `PolicyForm` component — rule builder | P0 | ✓ Complete | Shared form: name/type/description + interactive rule builder for all 11 operators; value field hidden for exists/not_exists; client-side validation |
| `/governance/policies/new` page | P0 | ✓ Complete | Client component; POSTs to policies API; redirects to Governance Hub on success |
| `/governance/policies/[id]/edit` page | P0 | ✓ Complete | Pre-populated from API; platform-policy read-only mode; two-step delete confirmation for enterprise policies |
| Governance Hub — New Policy CTA | P0 | ✓ Complete | "New Policy" button in Policy Library header; visible to compliance_officer + admin |
| Governance Hub — Edit/View links | P0 | ✓ Complete | Per-card link: "Edit →" for enterprise policies, "View →" for platform policies; visible to managers |
| Governance Hub — empty state | P1 | ✓ Complete | Shows "Create first policy" CTA for managers; "Contact your administrator" for others |

---

## Post-MVP Phase 11 — Policy Lifecycle Audit ✓ Complete (2026-03-13 Session 014)

Closes the compliance gap introduced by Phase 10: every governance policy mutation is now permanently recorded in the audit trail.

| Item | Priority | Status | Notes |
|---|---|---|---|
| `policy.updated` + `policy.deleted` in `EventType` | P0 | ✓ Complete | Mirror `AuditAction` 1:1 per event bus convention |
| `policy.updated` + `policy.deleted` in `AuditAction` | P0 | ✓ Complete | Type-safe across all call sites |
| `policy.created` audit wired into POST handler | P0 | ✓ Complete | Was defined but never called; now fires with `toState: { name, type, ruleCount }` |
| `policy.updated` audit wired into PATCH handler | P0 | ✓ Complete | `fromState` + `toState` capture name, type, ruleCount before and after |
| `policy.deleted` audit wired into DELETE handler | P0 | ✓ Complete | `fromState` captures final policy state before deletion |
| Audit Trail UI — all 10 actions labeled | P1 | ✓ Complete | `policy.updated` (orange), `policy.deleted` (rose), `blueprint.report_exported` (teal), `intake.contribution_submitted` (sky) added |

---

## Post-MVP Phase 12 — Admin User Management ✓ Complete (2026-03-13 Session 014)

Enables administrators to onboard new users, view the enterprise roster, and adjust roles without database access.

| Item | Priority | Status | Notes |
|---|---|---|---|
| `GET /api/admin/users` | P0 | ✓ Complete | Enterprise-scoped list; admin only; excludes passwordHash |
| `POST /api/admin/users` | P0 | ✓ Complete | Create user: name, email, role, password (bcrypt cost 12); email uniqueness enforced; 409 on conflict |
| `PATCH /api/admin/users/[id]` | P0 | ✓ Complete | Update name and/or role; enterprise-scoped access; admin cannot change own role |
| `/admin/users` page | P0 | ✓ Complete | Role summary stats, Create User form, user table with inline role editor; alphabetically sorted |
| "Users" nav link | P0 | ✓ Complete | Admin-only; positioned after Dashboard |
| `/api/me` — id field | P1 | ✓ Complete | Added `id` to response for client-side self-protection in user management UI |

---

## Post-MVP Phase 13 — Governance Integrity ✓ Complete (2026-03-13 Session 015)

Closes the P0 governance staleness vulnerability: the `in_review` gate now always runs validation live against the current policy set, preventing stale validation reports from masking policy violations introduced between a designer's last manual validate and their submission.

| Item | Priority | Status | Notes |
|---|---|---|---|
| Live revalidation on `in_review` submission | P0 | ✓ Complete | `validateBlueprint()` called inside the status route's `in_review` transition; fresh report persisted; stale stored-report check removed |
| `evaluatedPolicyIds` in `ValidationReport` | P0 | ✓ Complete | IDs of all policies evaluated per run; enables audit evidence and future staleness detection |
| Governance revalidation audit metadata | P1 | ✓ Complete | `governanceRevalidatedAt` timestamp in `in_review` audit log entry |
| Staleness warning strip in Blueprint Workbench | P1 | ✓ Complete | Amber strip when report loaded from DB — "re-validate to check against current policies before submitting" |

---

## Post-MVP Phase 14 — MRM Report HTML View ✓ Complete (2026-03-13 Session 016)

Closes the P1 MRM usability gap: compliance officers and model risk committees can now open a browser-rendered version of the MRM Compliance Report and print it to PDF without leaving the application or touching JSON.

| Item | Priority | Status | Notes |
|---|---|---|---|
| `src/components/mrm/print-button.tsx` client component | P1 | ✓ Complete | `window.print()` call isolated to keep report page server-rendered |
| `/blueprints/[id]/report` server page | P1 | ✓ Complete | All 11 MRM sections rendered as structured HTML; role-gated (compliance_officer + admin); enterprise access enforced; audit entry on every view |
| Print-to-PDF | P1 | ✓ Complete | `print:hidden` on toolbar; `print:break-before-page` on section headers; no library dependency |
| "View MRM Report" link on Registry detail | P1 | ✓ Complete | Added alongside JSON export; "Export MRM Report" renamed "Export JSON" to distinguish formats |
| HTML view audit entry | P1 | ✓ Complete | `blueprint.report_exported` with `metadata.format: "html"` — identical auditability to JSON export |

---

## Post-MVP Phase 15 — Policy-Aware Intake ✓ Complete (2026-03-13 Session 017)

Closes the policy-awareness gap in the intake conversation: Claude now sees the enterprise's active governance policies while helping designers define agent requirements and generates blueprints pre-adapted to them.

| Item | Priority | Status | Notes |
|---|---|---|---|
| `buildPoliciesBlock()` in `system-prompt.ts` | P1 | ✓ Complete | Renders `## Active Enterprise Governance Policies` section with all rules, severity tags, field paths, and saturation guidance |
| `buildIntakeSystemPrompt` signature update | P1 | ✓ Complete | Added optional `policies?: GovernancePolicy[]` 4th parameter; block injected between context and contributions blocks |
| Enterprise policy load in chat route | P1 | ✓ Complete | Same `or(isNull, eq(enterpriseId))` query as `validateBlueprint()`; policies mapped to `GovernancePolicy[]` and passed to system prompt builder |

---

## Blueprint-to-Session Traceability ✓ Complete (2026-03-13 Session 018)

Closes the navigation gap between blueprints and the intake sessions that produced them.

| Item | Priority | Status | Notes |
|---|---|---|---|
| "← Intake Session" link on Blueprint Workbench | P2 | ✓ Complete | `sessionId` captured from `GET /api/blueprints/[id]` response; link shown in header when set |
| "← Intake Session" link on Registry detail | P2 | ✓ Complete | `sessionId` added to `BlueprintVersion` interface; link shown in header when `latest.sessionId` present |

---

## Post-MVP Phase 16 — Intake Quality Gates ✓ Complete (2026-03-13 Session 019)

Closes the two silent failure modes identified in the intake confidence assessment: requirements described conversationally but not tool-captured, and governance policies that are structurally present but operationally vague.

| Item | Priority | Status | Notes |
|---|---|---|---|
| `AmbiguityFlag`, `CaptureVerificationItem`, `PolicyQualityItem` types in `intake.ts` | P1 | ✓ Complete | Canonical types replacing local definition; `_captureVerification` and `_policyQualityAssessment` added to `IntakePayload` |
| Per-type quality rubric in `buildContextBlock` | P1 | ✓ Complete | Minimum adequacy standards for all 5 policy types injected into intake system prompt |
| `mark_intake_complete` schema expansion | P1 | ✓ Complete | `captureVerification` (required) + `policyQualityAssessment` (required) added; tool description updated |
| Capture verification gate in `checkGovernanceSufficiency` | P1 | ✓ Complete | Any `capturedAs: null` item blocks finalization with descriptive error |
| Policy quality warnings (non-blocking) | P1 | ✓ Complete | `adequate: false` items persisted and surfaced in Phase 3; do not block submission |
| Assessments persisted to payload | P1 | ✓ Complete | `updatePayload` called before `finalizeSession()` so Phase 3 always has current data |
| Phase 3 Capture Verification panel | P1 | ✓ Complete | Collapsible table: area / what was discussed / captured as (monospace green) or "Not captured" (red) |
| Phase 3 Policy Quality Warnings panel | P1 | ✓ Complete | Amber panel listing inadequate policies with Claude's rationale; visible to designer and reviewer |

---

## Post-MVP Phase 17 — Generation Intelligence ✓ Complete (2026-03-13 Session 020)

Eliminates three structural inefficiencies in the generation pipeline: duplicated policy loading, post-generation governance violation discovery, and uniform model cost for all intake turns.

| Item | Priority | Status | Notes |
|---|---|---|---|
| `src/lib/governance/load-policies.ts` — shared policy loader | P0 | ✓ Complete | Extracts `or(isNull, eq(enterpriseId))` pattern shared by validator, chat route, generate route, refine route into a single export |
| `validateBlueprint` optional `policies?` parameter | P0 | ✓ Complete | Backward-compatible; when provided, skips DB query (`resolvedPolicies = policies ?? await loadPolicies(enterpriseId)`); internal variable renamed to avoid shadowing |
| `buildGenerationSystemPrompt(policies?)` function | P1 | ✓ Complete | Replaced static string constant; appends `## Enterprise Governance Policies` block with `[ERROR]`/`[WARN]` severity-tagged rules when policies are provided |
| Policy-aware `generateBlueprint` + `refineBlueprint` | P1 | ✓ Complete | Both functions accept optional `policies?: GovernancePolicy[]`; generation route loads policies once and passes to both generate + validate, eliminating the second DB query |
| `src/lib/intake/model-selector.ts` — adaptive model selection | P1 | ✓ Complete | `selectIntakeModel(ctx: ModelSelectionContext): IntakeModel` — Haiku for ~75–80% of turns; Sonnet for opening turn, payload-complete turns, explicit finalization language, governance/regulatory keywords |
| `stepCountIs(20)` ceiling | P1 | ✓ Complete | Raised from 10; in AI SDK v5 this limits LLM inference steps (rounds), not individual tool calls |
| Haiku for remediation suggestions | P2 | ✓ Complete | `addRemediationSuggestions` switched to `claude-3-5-haiku-20241022`; short structured factual completions per violation — Haiku is reliable and 8× cheaper |

---

## Post-MVP Phase 18 — Blueprint Workbench UX Reliability ✓ Complete (2026-03-13 Session 021)

Resolves four latent reliability issues in the Blueprint Workbench that were invisible until specific navigation paths triggered them.

| Item | Priority | Status | Notes |
|---|---|---|---|
| Remove ABP from URL params | P0 | ✓ Complete | `handleGenerate` redirect simplified to `/blueprints/${id}?agentId=${agentId}`; workbench always loads from API |
| `agentId` as state + API hydration | P0 | ✓ Complete | Submit for Review button no longer hidden on direct navigation; `agentIdState` populated from API fetch when URL param absent |
| Auto-validate after refinement | P1 | ✓ Complete | `handleRefine` automatically calls `/validate` after a successful refine; Apply Changes button disabled during validation |
| Surface validation errors on explicit calls | P1 | ✓ Complete | `handleValidate` catch block now calls `setError` instead of silently swallowing failures |

---

## Post-MVP Phase 19 — Deployment Health & Governance Drift Detection ✓ Complete (2026-03-13 Session 022)

Closes the governance blindspot for deployed agents: a blueprint clean at review time can silently drift out of compliance after any policy update. Phase 19 adds continuous posture monitoring without AI cost.

| Item | Priority | Status | Notes |
|---|---|---|---|
| `deployment_health` DB table + migration | P0 | ✓ Complete | `0008_deployment_health.sql` — one row per logical agent (UPSERT on `agentId`); `health_status` (clean/critical/unknown), `error_count`, `warning_count`, `validation_report`, `last_checked_at`, `deployed_at` |
| `deploymentHealth` Drizzle schema | P0 | ✓ Complete | Added to `src/lib/db/schema.ts` after `notifications` table |
| `blueprint.health_checked` EventType + AuditAction | P0 | ✓ Complete | Added to both union types; enables full audit trail for every health check |
| `src/lib/monitoring/health.ts` | P0 | ✓ Complete | `checkDeploymentHealth` + `checkAllDeployedAgents` — uses `evaluatePolicies()` (no AI, no cost); UPSERT pattern; returns `previousStatus` for transition detection |
| `src/lib/monitoring/policy-impact-handler.ts` | P0 | ✓ Complete | Side-effect module; registered via `audit/log.ts` import; fires `checkAllDeployedAgents` on every `policy.created/updated/deleted` event; writes `blueprint.health_checked` audit entries |
| Notification routing for health transitions | P1 | ✓ Complete | `notifications/handler.ts` extended to detect `clean→critical` (degraded) and `critical→clean` (restored); compliance officers notified with `deployment.health_degraded` / `deployment.health_restored` — transition-only to prevent alert fatigue |
| Fire-and-forget initial check on deployment | P0 | ✓ Complete | `status/route.ts` calls `void checkDeploymentHealth(...)` after audit log write for `deployed` transitions; does not block PATCH response |
| `GET /api/monitor` | P0 | ✓ Complete | `requireAuth(reviewer/co/admin)`; returns all deployed agents with health data + `{ total, clean, critical, unknown }` summary |
| `POST /api/monitor/[agentId]/check` | P0 | ✓ Complete | Single-agent manual re-check; writes audit entry; returns updated health record |
| `POST /api/monitor/check-all/route.ts` | P0 | ✓ Complete | Bulk re-check all deployed agents; writes audit per result |
| `/monitor` page | P0 | ✓ Complete | 4 KPI cards, search + health filter, table with health badges (clean/critical/not-checked), per-row "Check Now" (co/admin), "Check All Agents" button, empty state |
| Governance health strip on Registry detail | P1 | ✓ Complete | 3-variant strip (unknown/clean/critical) between header and tabs for deployed agents; "Check Now" / "Re-check" / "Run First Check" (co/admin) updates inline |
| "Monitor" nav link | P0 | ✓ Complete | `reviewer | compliance_officer | admin`; after "Deploy", before "Governance" |

---

## Post-MVP Phase 20 — Regulatory Intelligence & Version Audit Trail ✓ Complete (2026-03-13 Session 023)

Adds regulatory vocabulary that Fortune 500 compliance officers and regulators expect. Every blueprint is now assessed deterministically against EU AI Act, SR 11-7, and NIST AI RMF — no AI calls, no schema migrations.

| Item | Priority | Status | Notes |
|---|---|---|---|
| `src/lib/regulatory/frameworks.ts` | P0 | ✓ Complete | Type definitions + requirement ID constants for EU AI Act (9), SR 11-7 (9), NIST AI RMF (8) |
| `src/lib/regulatory/classifier.ts` | P0 | ✓ Complete | Pure functions: `classifyEUAIAct`, `classifySR117`, `classifyNISTRMF`, `assessAllFrameworks`; EU AI Act risk tier from intake context signals; all evidence mapped from ABP fields |
| `GET /api/blueprints/[id]/regulatory` | P0 | ✓ Complete | 3 DB queries, no writes; runs classifier on current blueprint state |
| `RegulatoryPanel` component | P0 | ✓ Complete | Expandable framework sections; EU AI Act risk tier badges; NIST function strength dots |
| "Regulatory" tab on Registry detail | P0 | ✓ Complete | Visible to all roles; renders `RegulatoryPanel` for latest blueprint version |
| `src/lib/diff/abp-diff.ts` | P0 | ✓ Complete | Pure structural diff engine; significance: major/minor/patch; diffs identity/capabilities/constraints/governance |
| `GET /api/blueprints/[id]/diff` | P0 | ✓ Complete | `?compareWith={blueprintId}`; asserts same `agentId`; returns `ABPDiff` |
| `VersionDiff` component | P0 | ✓ Complete | Collapsible per-section blocks; +/−/~ indicators; significance badge; `defaultCollapsed` mode for review panel |
| Version comparison in Versions tab | P1 | ✓ Complete | Dropdown shown when `versions.length >= 2`; renders `VersionDiff` on selection |
| Version diff in Review Panel | P0 | ✓ Complete | Collapsible "Changes from v{prev} → v{current}" at top of panel when `previousBlueprintId` provided |
| `src/lib/governance/policy-templates.ts` | P0 | ✓ Complete | 4 packs: sr-11-7-core (4 policies), eu-ai-act-high-risk (5), gdpr-agent-data (3), ai-safety-baseline (3) |
| `GET /api/governance/templates` | P0 | ✓ Complete | Returns static pack metadata; no DB query |
| `POST /api/governance/templates/[pack]/apply` | P0 | ✓ Complete | Duplicate guard (409 + `{ duplicates }`) unless `force=true`; creates real enterprise policies; audits each |
| Compliance Starter Packs UI | P0 | ✓ Complete | 2-column pack cards in Governance Hub; inline 409 conflict prompt with "Overwrite" / Cancel; success/error toast |
| MRM Report Section 12 | P1 | ✓ Complete | `regulatoryFrameworks` field in `MRMReport`; `assembleMRMReport` computes via `assessAllFrameworks` |

---

## Post-MVP Phase 21 — Enterprise Completeness ✓ Complete (2026-03-13 Session 024)

Five gaps blocking Fortune 500 production readiness, selected from a ranked audit of 20 identified issues. Items ranked 6–20 deferred (webhooks, multi-step approval, policy versioning, bulk operations) as they require stakeholder alignment or external dependencies. The five delivered items are individually additive with no breaking changes.

| Item | Priority | Status | Notes |
|---|---|---|---|
| MRM HTML Report Section 12 | P0 | ✓ Complete | Regulatory Framework Assessment table rendered in `/blueprints/[id]/report`; per-requirement evidence rows with ✓/⚠/✗ status; NIST function strength dots; direct `assessAllFrameworks()` call (no HTTP self-call) |
| Agent Clone API | P0 | ✓ Complete | `POST /api/blueprints/[id]/clone`; new `agentId` + new blueprint `id`; status=draft, version=1.0.0; `blueprint.cloned` audit; `designer | admin` only |
| Agent Clone UI | P0 | ✓ Complete | Clone button on Registry detail page header + per-card clone in Registry list; optional name override modal; navigates to new agent on success |
| ABP Ownership Metadata (v1.2.0) | P1 | ✓ Complete | Optional `ownership` block: `businessUnit`, `ownerEmail`, `costCenter`, `deploymentEnvironment`, `dataClassification`; `PATCH /api/blueprints/[id]/ownership`; Workbench editor + Registry summary card; docs/schemas/abp/v1.2.0.schema.json |
| Enterprise Settings | P0 | ✓ Complete | `enterprise_settings` DB table; `src/lib/settings/types.ts` + `get-settings.ts`; GET+PUT `/api/admin/settings`; `/admin/settings` page (SLA/governance/notifications); Settings nav link for admin |
| Governance Analytics | P1 | ✓ Complete | `GET /api/governance/analytics`; Governance Hub analytics section with 3-column KPI row, 6-month dual bar chart (no npm deps), top violated policies table, agent status distribution |

---

## Post-MVP Phase 22 — Governance Maturity ✓ Complete (2026-03-13 Session 025)

Two regulated-industry production blockers resolved. SR 11-7 separation-of-duties requirements can now be enforced with sequential multi-role approval chains. Governance policies now version on every edit, preserving the historical validation evidence chain required for MRM audit reproducibility. Zero new npm dependencies. Zero breaking changes. One migration file.

| Item | Priority | Status | Notes |
|---|---|---|---|
| DB migration: approval columns + policy versioning columns | P0 | ✓ Complete | `0010_multi_step_approval.sql`; `current_approval_step`, `approval_progress` on `agent_blueprints`; `policy_version`, `previous_version_id`, `superseded_at` on `governance_policies`; backward-compatible defaults |
| `ApprovalChainStep` + `ApprovalStepRecord` types | P0 | ✓ Complete | `src/lib/settings/types.ts`; `approvalChain: ApprovalChainStep[]` on `EnterpriseSettings`; default `[]` = legacy single-step |
| Policy versioning — PATCH creates new row | P0 | ✓ Complete | Transaction: insert new version row + `supersededAt` old row; GET list filtered to active-only; rows never deleted (ADR-003) |
| Policy history endpoint | P0 | ✓ Complete | `GET /api/governance/policies/[id]/history`; walks `previousVersionId` chain (limit 20); `compliance_officer \| admin` |
| Approval chain enforcement in review route | P0 | ✓ Complete | Role check against active step; `ApprovalStepRecord` appended per step; `blueprint.approval_step_completed` fired on non-final advances |
| Approval chain enforcement in status route | P0 | ✓ Complete | Resets `currentApprovalStep/approvalProgress` on submission; same chain enforcement on approval/rejection transitions |
| `blueprint.approval_step_completed` audit + event + notification | P0 | ✓ Complete | Added to `AuditAction` + `EventType`; handler fans out to users with `nextApproverRole`; `getUsersByRole` in `recipients.ts` |
| `approvalChain` in admin settings UI + API Zod schema | P0 | ✓ Complete | Ordered step list with role selector + label; `ApprovalChainStepSchema` in settings route |
| Review queue step filtering | P1 | ✓ Complete | `?role=X` filters to caller's step; step progress strip + prior approval chips on each card |
| Registry detail approval progress strip + role-gated review | P0 | ✓ Complete | `✓/→/○` progress strip; prior approvals table; step context banner; "not your turn" guard |
| Governance Hub policy version badges + history | P1 | ✓ Complete | `v{N}` badge when `policyVersion > 1`; expandable inline version table via history endpoint |
| MRM Section 6 — approval chain evidence table | P0 | ✓ Complete | Full step table when `approvalProgress.length > 0`; legacy 3-field view when empty |
| MRM Section 5 — policy version lineage (5.1) | P0 | ✓ Complete | Batch-fetch `evaluatedPolicyIds` rows; version at evaluation + "policy revised since approval" warnings |

---

## Post-MVP Phase 23 — Blueprint Test Harness ✓ Complete (2026-03-14 Session 026)

Closes the behavioral verification gap: every blueprint was previously validated only structurally (governance rule checks) — not behaviorally (does the agent actually behave as designed?). SR 11-7 requires performance testing evidence, not only documentation review. Phase 23 adds a complete behavioral test layer with Claude-as-judge evaluation, permanent MRM evidence records, and an optional enterprise gate that blocks review submission until a passing test run exists.

| Item | Priority | Status | Notes |
|---|---|---|---|
| DB migration: `blueprint_test_cases` + `blueprint_test_runs` | P0 | ✓ Complete | `0011_test_harness.sql`; test cases per logical agent (shared across versions); test runs per blueprint version (append-only evidence) |
| `src/lib/testing/types.ts` | P0 | ✓ Complete | `TestCase`, `TestCaseResult`, `TestRun` interfaces |
| `src/lib/testing/executor.ts` — execution engine | P0 | ✓ Complete | `buildAgentSystemPrompt` from ABP fields; two Haiku calls per case (execute → evaluate); `runTestSuite` returns `{ results, passedCases, failedCases, status }` accounting for required vs. informational severity |
| Test case CRUD routes — `GET/POST /api/registry/[agentId]/test-cases` | P0 | ✓ Complete | List all roles; create `designer\|admin`; enterprise-scoped via latest blueprint |
| Test case item routes — `PATCH/DELETE /api/registry/[agentId]/test-cases/[caseId]` | P1 | ✓ Complete | Partial update + deletion; `designer\|admin`; ownership verified |
| Test run routes — `GET/POST /api/blueprints/[id]/test-runs` | P0 | ✓ Complete | GET newest-first; POST executes suite, inserts running→completed row, writes `blueprint.test_run_completed` audit entry |
| `requireTestsBeforeApproval` enterprise setting | P1 | ✓ Complete | `src/lib/settings/types.ts`; admin settings Zod schema + UI toggle; status route gate on `draft→in_review` |
| `blueprint.test_run_completed` audit action + event | P0 | ✓ Complete | Added to `AuditAction` + `EventType` |
| `VALIDATION_ERROR` added to `ErrorCode` | P0 | ✓ Complete | HTTP 422; used by submission gate + no-test-cases guard |
| Tests tab on Registry detail | P0 | ✓ Complete | Lazy-loaded on first activation; test suite panel (list + Add Test Case form + delete); test runs panel (Run Tests button, latest run banner with ✓/✗ verdict, per-case expandable detail, prior run history) |
| Test Suite widget in Blueprint Workbench | P1 | ✓ Complete | Compact right-rail widget; test case count; last run summary; Run Tests button; amber strip when cases exist but no passing run |
| MRM Report Section 13 — Behavioral Test Evidence | P0 | ✓ Complete | Server-fetched latest `TestRun` for blueprint; summary row (executor, date, total, verdict); per-case verdict table with evaluation rationale; "no tests executed" empty state with SR 11-7 note |

---

## Post-MVP Phase 24 — Proactive Compliance Intelligence ✓ Complete (2026-03-14 Session 027)

Closes the compliance reactivity gap: compliance officers previously operated reactively (policy changes silently affected deployed agents; compliance posture required 5-page navigation). Phase 24 adds proactive tooling: policy impact simulation before publishing, and a Compliance Command Center consolidating enterprise posture, at-risk agents, review queue pressure, policy coverage, and activity trends.

| Item | Priority | Status | Notes |
|---|---|---|---|
| `policy.simulated` audit action + event | P0 | ✓ Complete | Added to `AuditAction` + `EventType` |
| `POST /api/governance/policies/simulate` | P0 | ✓ Complete | Deterministic evaluator only (zero AI calls); loads `approved|deployed` blueprints; classifies each as `new_violations|resolved_violations|no_change`; writes `policy.simulated` audit entry |
| `GET /api/compliance/posture` | P0 | ✓ Complete | Pure aggregation from existing tables: status counts, health counts, test coverage, at-risk agents, review queue, policy coverage |
| "Preview Impact" button in `PolicyForm` | P0 | ✓ Complete | Purple button between rules and save; inline 4-stat summary + per-blueprint affected list; "outdated" warning when form changes after simulation; `existingPolicyId` passed from edit page for resolved-violation detection |
| Edit policy page passes `existingPolicyId` | P0 | ✓ Complete | Enables baseline violation comparison for modified policies |
| `/compliance` page — all 5 sections | P0 | ✓ Complete | Enterprise Posture KPIs, At-Risk Agents table, Review Queue Pressure, Policy Coverage Gaps, 30-Day Trends; `compliance_officer|admin` access; redirects other roles |
| Nav link for `/compliance` | P0 | ✓ Complete | Added to `layout.tsx` for `compliance_officer|admin`; positioned before Governance |
| ADR-008 | P0 | ✓ Complete | Documents simulation design, zero-AI-call constraint, and Command Center aggregation approach |

---

## Post-MVP Phase 25 — Outbound Webhook Integration ✓ Complete (2026-03-14 Session 028)

Transforms the platform from a governance silo into an integration hub. Admins register HTTPS endpoints subscribed to lifecycle events; Intellios POSTs HMAC-SHA256 signed payloads on each matching event — enabling CI/CD automation, SIEM integration, Slack/Teams bots, and external audit system synchronization.

| Item | Priority | Status | Notes |
|---|---|---|---|
| `webhooks` + `webhook_deliveries` DB tables + migration | P0 | ✓ Complete | `0012_webhooks.sql`; `events TEXT[]` (empty = all); `active` boolean for pause/resume without deletion; cascade-delete on deliveries |
| `src/lib/webhooks/types.ts` | P0 | ✓ Complete | `WebhookPayload` + `WebhookRecord` interfaces |
| `src/lib/webhooks/deliver.ts` | P0 | ✓ Complete | `deliverWebhook()` — 3-attempt retry (0ms/1s/2s), HMAC-SHA256 signing, delivery log; `deliverWebhookTest()` — synchronous test delivery |
| `src/lib/webhooks/dispatch.ts` | P0 | ✓ Complete | Event handler; enterprise-scoped webhook load; event-type filter; fire-and-forget `Promise.allSettled`; self-registers with event bus on import |
| Event bus wiring | P0 | ✓ Complete | Side-effect import `import "@/lib/webhooks/dispatch"` added to `audit/log.ts` |
| `GET/POST /api/admin/webhooks` | P0 | ✓ Complete | List (no secrets) + register (auto-generates secret, returns once) |
| `GET/PATCH/DELETE /api/admin/webhooks/[id]` | P0 | ✓ Complete | Fetch with last 20 deliveries + update name/url/events/active + delete |
| `POST /api/admin/webhooks/[id]/test` | P0 | ✓ Complete | Synchronous test delivery; returns status + HTTP code inline |
| `POST /api/admin/webhooks/[id]/rotate-secret` | P0 | ✓ Complete | Generates new 32-byte secret; returns once |
| `/admin/webhooks` page | P0 | ✓ Complete | Register form with event group checkboxes (Blueprint/Policy/Intake/Settings); amber secret-reveal callout; webhook cards with active toggle, test, delivery log, rotate secret, delete; signature verification docs block |
| Webhooks nav link | P0 | ✓ Complete | Added to `layout.tsx` for `admin`; positioned after Settings |
| ADR-009 | P0 | ✓ Complete | Documents HMAC signing design, enterprise scoping, fire-and-forget delivery model, no-new-deps constraint |

---

---

## AgentCore Integration Phase 1 — Export ✓ Complete (2026-03-14 Session 029)

Enables any approved or deployed blueprint to be exported as a self-contained Amazon Bedrock AgentCore deployment manifest. The manifest contains all fields needed for `CreateAgent` + `CreateAgentActionGroup` in Bedrock, including RETURN_CONTROL action groups (no Lambda required), tags for traceability back to Intellios, and human-readable deployment instructions. No AWS credentials required in Intellios — the operator applies the manifest manually or via CI/CD.

| Item | Priority | Status | Notes |
|---|---|---|---|
| `src/lib/agentcore/types.ts` | P0 | ✓ Complete | TypeScript shapes for Bedrock Agent API: `BedrockAgentDefinition`, `BedrockActionGroup`, `BedrockFunctionSchema`, `AgentCoreExportManifest`, `AgentCoreDeploymentRecord` |
| `src/lib/agentcore/translate.ts` | P0 | ✓ Complete | Pure ABP → Bedrock translation: `translateAbpToBedrockAgent()` + `buildAgentCoreExportManifest()`; RETURN_CONTROL tool pattern; field sanitization; fallback instruction for <40-char cases; traceability tags |
| `GET /api/blueprints/[id]/export/agentcore` | P0 | ✓ Complete | `reviewer|compliance_officer|admin`; approved/deployed blueprints only; returns downloadable JSON with `Content-Disposition` header; writes `blueprint.agentcore_exported` audit entry |
| "Export for AgentCore ↓" on Deploy Console | P0 | ✓ Complete | Shown on approved (Ready to Deploy) cards and deployed (Live in Production) table rows |
| "Export for AgentCore ↓" on Registry detail | P0 | ✓ Complete | Orange-tinted button visible to reviewer/compliance_officer/admin when blueprint is approved or deployed |
| ADR-010 | P0 | ✓ Complete | Documents adapter/deployment-target pattern, ABP→Bedrock field mapping, RETURN_CONTROL rationale, no-credentials-in-DB decision |

---

## AgentCore Integration Phase 2 — Direct Deploy ✓ Complete (2026-03-14 Session 030)

Enables one-click deployment to Bedrock AgentCore from Intellios. AWS credentials from server environment variables; enterprise AgentCore config (region, IAM role ARN, model, guardrail) in Admin Settings; `agentId`/`agentArn`/`region`/`model` stored in `agentBlueprints.deployment_metadata`; "AgentCore ↗" badge and deployment strip on Registry detail.

| Item | Priority | Status | Notes |
|---|---|---|---|
| `src/lib/agentcore/deploy.ts` | P0 | Not started | AWS SDK `@aws-sdk/client-bedrock-agent`; `createBedrockAgent()` + `prepareAgent()` + poll until PREPARED |
| `@aws-sdk/client-bedrock-agent` | P0 | ✓ Complete | First AWS SDK dependency; isolated to `src/lib/agentcore/deploy.ts` |
| DB migration 0013: `deployment_target` + `deployment_metadata` | P0 | ✓ Complete | `migration 0013_agentcore_deployment.sql`; two columns added + pushed to DB |
| `src/lib/agentcore/deploy.ts` | P0 | ✓ Complete | `deployToAgentCore()`: CreateAgent → CreateAgentActionGroup × n → PrepareAgent → poll GetAgent until PREPARED; timeout rollback via DeleteAgent |
| `EnterpriseSettings.deploymentTargets.agentcore` | P1 | ✓ Complete | `region`, `agentResourceRoleArn`, `foundationModel`, `guardrailId` optional; `AgentCoreConfig` interface |
| `POST /api/blueprints/[id]/deploy/agentcore` | P0 | ✓ Complete | Calls `deployToAgentCore()`; updates status → deployed; writes `blueprint.agentcore_deployed` + `blueprint.status_changed` audit entries (triggers webhooks + notifications) |
| AgentCore Deploy Modal on Deploy Console | P0 | ✓ Complete | 4-phase modal (confirm/deploying/success/error); progress label cycling; success shows agentId/ARN/region + AWS console link |
| Deployment target badge on Registry detail | P1 | ✓ Complete | "AgentCore ↗" pill badge + orange deployment details strip (agentId, region, model, ARN, deployed-at/by, AWS console link) |
| "Deployment Targets" section in Admin Settings | P1 | ✓ Complete | AgentCore block with enable toggle; region/model/roleARN/guardrail fields |
| `blueprint.agentcore_deployed` audit + event | P1 | ✓ Complete | Added to `AuditAction` + `EventType` unions; fires on successful deployment |
| `AGENTCORE_NOT_CONFIGURED` + `AGENTCORE_DEPLOY_FAILED` error codes | P1 | ✓ Complete | 400 + 502 respectively; returned with descriptive messages |

---

## AgentCore Integration Phase 3 — Polish ✓ Complete (2026-03-14 Session 031)

| Item | Priority | Status | Notes |
|---|---|---|---|
| MRM Report "Deployment Target" section | P2 | ✓ Complete | `deploymentTarget` + `agentcoreRecord` added to `MRMReport.deploymentRecord`; Section 8 renders orange AWS Resource Details strip with agentId, ARN, region, model, deployed-at/by, AWS console link |
| Audit Trail `blueprint.agentcore_deployed` event surface | P2 | ✓ Complete | Orange badge + inline AgentCore summary (agentId, region, ARN) without expanding; labels/colors added for all 18 action types |
| `blueprint.agentcore_exported` event in Webhook dispatch | P2 | ✓ Complete | Already complete: `writeAuditLog` dispatches to event bus for every EventType; no code change needed |

---

## Phase 28 — Awareness and Measurement System ✓ Complete (2026-03-14 Session 032)

Continuous platform quality monitoring answering three questions: Are agents being generated correctly? Is quality improving over time? Is the system reliable and safe?

| Item | Priority | Status | Notes |
|---|---|---|---|
| DB migration 0014 (4 tables) | P0 | ✓ Complete | `blueprint_quality_scores`, `intake_quality_scores`, `system_health_snapshots`, `intelligence_briefings` |
| `src/lib/awareness/types.ts` | P0 | ✓ Complete | `MetricsSnapshot`, `QualityScoreResult`, `IntakeScoreResult`, `AnomalySignal`, `BriefingResult`, `IntelligencePayload` |
| `src/lib/awareness/metrics-worker.ts` | P0 | ✓ Complete | 8-metric SQL aggregation; Quality Index composite (0–100); writes snapshots |
| `src/lib/awareness/anomaly-detector.ts` | P1 | ✓ Complete | 4-threshold checks; dedup via notifications table; fires compliance_officer notifications |
| `src/lib/awareness/quality-evaluator.ts` | P0 | ✓ Complete | AI side-effect; Haiku scores blueprints (5 dims) + intake sessions (4 dims) on event; never throws |
| `src/lib/awareness/briefing-generator.ts` | P0 | ✓ Complete | Sonnet daily briefing (5-section narrative); upserts by date; notifications on non-nominal health |
| API routes (4) | P0 | ✓ Complete | `/api/monitor/intelligence`, `/snapshot`, `/briefing` (GET+POST) |
| `/monitor/intelligence` page | P0 | ✓ Complete | KPI strip, health badge, briefing panel, SVG sparkline, quality scores table |
| Settings `awareness` block | P1 | ✓ Complete | 4 alert thresholds + optional `briefingWebhookUrl` |
| Scheduled task | P1 | ✓ Complete | `intellios-daily-briefing`; cron `0 8 * * *`; POSTs to briefing endpoint |

---

## Phase 29 — Intelligence Maturation ✓ Complete (2026-03-15 Session 034)

Transforms the Intelligence page from a single-day snapshot into a genuine daily intelligence dashboard. Adds briefing history navigation, 30-day trend charts, quality score backfill, anomaly resource links, and briefing webhook delivery.

| Item | Priority | Status | Notes |
|---|---|---|---|
| `runBlueprintQualityScoreForId` export | P0 | ✓ Complete | Extracted from event handler; enables direct scoring by blueprint ID |
| `POST /api/monitor/intelligence/backfill` | P0 | ✓ Complete | Scores all unscored blueprints in `in_review\|approved\|deployed`; safe to re-run |
| `IntelligencePayload.briefingHistory` | P0 | ✓ Complete | Last 7 briefings returned; GET route now fetches 30 snapshots |
| Briefing history date strip | P0 | ✓ Complete | 7-day date buttons with health dots; click navigates between days |
| 30-day trend charts (4 metrics) | P0 | ✓ Complete | QI, validity rate, review queue, webhook rate; threshold lines; inverted color for queue |
| Anomaly KPI card links | P1 | ✓ Complete | Anomalous KPI cards link to the affected resource (pipeline/review/admin/webhooks) |
| ACTION REQUIRED strip | P1 | ✓ Complete | Amber strip listing anomalies with value, reason, and "Go →" link |
| Briefing webhook delivery | P1 | ✓ Complete | POSTs to `settings.awareness.briefingWebhookUrl` when set; enables Slack/Teams integration |
| "⟳ Score Existing" admin button | P1 | ✓ Complete | Header button fires backfill; shows scored/skipped toast; refreshes data |

---

## Phase 30 — Compliance Evidence Export ✓ Complete (2026-03-15 Session 035)

Per-agent downloadable evidence package for regulatory submission; intake quality score surface across the platform.

| Item | Priority | Status | Notes |
|---|---|---|---|
| `blueprint.compliance_exported` event type | P0 | ✓ Complete | Added to `EventType` and `AuditAction`; every export is a traceable lifecycle event |
| `GET /api/blueprints/[id]/export/compliance` | P0 | ✓ Complete | JSON evidence bundle: MRM report + quality eval + test runs + export metadata; status-gated to `approved\|deployed`; `Content-Disposition: attachment` |
| `DownloadEvidenceButton` component | P0 | ✓ Complete | Client component; browser fetch → Blob → `<a download>`; loading state; only renders when enabled |
| "↓ Download Evidence Package" on MRM report | P0 | ✓ Complete | Added to MRM report toolbar next to Print button; visible for `approved\|deployed` |
| "Export Evidence ↓" on Registry detail | P0 | ✓ Complete | Indigo-styled `<a download>` in compliance actions block; visible for `approved\|deployed` |
| `GET /api/intake/sessions/[id]/quality-score` | P1 | ✓ Complete | Returns most recent intake AI quality score or `null` if not yet evaluated |
| Intake quality score chip on session page | P1 | ✓ Complete | Green/amber/red `Intake quality NN/100` chip in review-phase header |
| `recentIntakeScores` in Intelligence payload | P1 | ✓ Complete | Last 10 intake scores added to `IntelligencePayload`; fetched in parallel in API route |
| "Recent Intake Quality Scores" table on Intelligence page | P1 | ✓ Complete | Dimension table (Breadth, Ambiguity, Risk ID, Stakeholder, Overall) with session links |

---

## Phase 31 — AI Experience Optimization ✓ Complete (2026-03-15 Session 036)

Makes Intellios's embedded AI capabilities visible, interpretable, and trustworthy. Nine targeted UX improvements across three categories: AI reasoning surfaced, AI text styled, AI assistance at high-stakes decision points. No DB migrations. No new npm dependencies.

| Item | Priority | Status | Notes |
|---|---|---|---|
| Governance violation AI suggestion cards | P0 | ✓ Complete | `suggestion` in blue `bg-blue-50 border-l-2 border-blue-300` block labeled `✦ Suggested fix`; policy message stays `text-gray-900` |
| Test harness judge rationale expansion | P0 | ✓ Complete | Click `N/M passed` to expand per-case results with Claude's `evaluationRationale` in italic for failures |
| Intelligence quality score dimension bars | P1 | ✓ Complete | Click quality score row to expand 5 dimension bars; amber + `⚠ below threshold` for dims < 3.0 |
| Context-aware streaming labels | P1 | ✓ Complete | `STREAMING_LABELS` map; `lastToolCallName` derived from message history; shows e.g. "Capturing tool details…" with dots |
| Stale validation signal during refinement | P1 | ✓ Complete | Validation section dims to `opacity-50 pointer-events-none` when `refining \|\| validating` with existing report |
| Intake score loading + dimension popover | P1 | ✓ Complete | Animate-pulse placeholder chip during score fetch; clickable chip opens popover with 4 dimension bars |
| Generation step progress | P1 | ✓ Complete | 4-step label cycling during `generateObject()` wait; indigo progress dots |
| Structured briefing sections | P0 | ✓ Complete | `generateObject()` migration with 5-section Zod schema; section cards with icons + colored badges; `<pre>` fallback for old records; `BriefingSections` type in `types.ts` |
| AI Risk Brief on review panel | P0 | ✓ Complete | New `POST /api/blueprints/[id]/review-brief` (Claude Haiku); structured `riskLevel`/`summary`/`keyPoints`/`recommendation` schema; "Generate Brief" button + shimmer loading + non-interactive recommendation badge |

---

## Phase 32 — UI Transformation ✓ Complete (2026-03-15 Session 037)

Transforms Intellios from a gray prototype into a polished product-grade interface. Design direction: dark sidebar + light content (Linear/Vercel aesthetic). Installed `lucide-react` and `geist`. No DB migrations. No new API routes. No behavioral changes.

| Item | Priority | Status | Notes |
|---|---|---|---|
| Install lucide-react + geist | P0 | ✓ Complete | `lucide-react ^0.487.0` + `geist ^1.3.0` added to package.json |
| CSS design tokens + Geist font | P0 | ✓ Complete | `--sidebar-bg/border/text/accent`, `--content-bg`, `--shadow-card/raised` in `:root`; WebKit scrollbar styles |
| Dark sidebar layout | P0 | ✓ Complete | `slate-900` sidebar (240px); violet-500 accent; role-gated nav; user chip; replaces horizontal top-nav |
| `sidebar.tsx` new component | P0 | ✓ Complete | Brand strip, grouped nav with Lucide icons, active state (`border-l-2 border-violet-500`), user chip + sign-out |
| Layout.tsx sidebar integration | P0 | ✓ Complete | `flex h-screen overflow-hidden` layout; login page excluded; Geist Sans applied via `next/font` |
| Overview page redesign | P1 | ✓ Complete | `LayoutDashboard` icon, stats row, quick-action cards, activity list |
| Intake page redesign | P1 | ✓ Complete | `MessageSquare` icon, session rows, amber in-progress strip, `Inbox` empty state |
| Pipeline page surgical edits | P1 | ✓ Complete | Removed `← Home`, layout constraint removed |
| Registry page redesign | P1 | ✓ Complete | `Library` icon, `Search` in bar, `Bot` row icons, pill toggle status filter |
| Review page redesign | P1 | ✓ Complete | `ClipboardList` icon, pending count badge, `ClipboardCheck` empty state |
| Governance page redesign | P1 | ✓ Complete | `Shield` icon, `Plus` on New Policy (violet), `Download` on template import |
| Compliance page redesign | P1 | ✓ Complete | `CheckSquare` icon, `AlertTriangle` on risk indicators, 3+2 KPI layout |
| Dashboard page redesign | P1 | ✓ Complete | `BarChart3` icon, `TrendingUp`/`TrendingDown` on KPI cards |
| Deploy page redesign | P1 | ✓ Complete | `Rocket` icon, green `border-l-2` ready rows, `Globe` on live rows, modal emoji→icon |
| Monitor page redesign | P1 | ✓ Complete | `Activity` icon, `RefreshCw` on Check All, removed `max-w` constraint |
| Audit page redesign | P1 | ✓ Complete | `ScrollText` icon, `Download` icon on Export CSV |
| Admin pages redesign (users, settings, webhooks) | P1 | ✓ Complete | Consistent inline header pattern, violet-600 CTAs, removed breadcrumb links |
| Governance sub-pages redesign (new, edit) | P1 | ✓ Complete | `px-8 py-8` + `max-w-3xl`, `h-64` loading states |
| StatusBadge colored dot | P2 | ✓ Complete | `STATUS_DOT` record; `h-1.5 w-1.5 rounded-full` dot before label |
| BlueprintView section icons | P2 | ✓ Complete | Optional `icon?: LucideIcon` prop; 7 sections mapped to Lucide icons |
| ReviewPanel action icons | P2 | ✓ Complete | `Sparkles` on AI Brief; `ThumbsUp`/`ThumbsDown` on submit button |
| ChatContainer prompt card icons | P2 | ✓ Complete | `ArrowRight` right-aligned; hover color violet |

---

## Phase 33 — AgentCore Integration Confidence ✓ Complete (2026-03-15 Session 038)

Systematically hardens the AgentCore integration (Phases 29–30) to reach production-grade confidence. No DB migrations. No new runtime npm dependencies (vitest is devDependency only). Pre-existing webhooks.tsx TypeScript error unrelated to this phase.

| Item | Priority | Status | Notes |
|---|---|---|---|
| Settings Zod schema for agentcore config | P0 | ✓ Complete | `AgentCoreConfigSchema` in admin settings PUT; region regex, ARN regex, guardrail co-validation; HTTP 400 on malformed config |
| Instruction padding fix | P0 | ✓ Complete | Short-but-real instructions padded (not replaced) to meet Bedrock's 40-char minimum |
| Polling timeout 30s → 90s | P0 | ✓ Complete | `POLL_MAX_ATTEMPTS = 180`; UI copy updated; dynamic error message self-corrects |
| Pre-flight config validation | P0 | ✓ Complete | `validateAgentCoreConfig()` called before `BedrockAgentClient` instantiation; fails with clear message before any AWS calls |
| Error message enrichment | P0 | ✓ Complete | `enrichAgentCoreError()` maps 6 AWS error patterns to actionable operator guidance in the deploy modal |
| vitest setup | P0 | ✓ Complete | `vitest ^3.0.0` + `@vitest/coverage-v8` devDependencies; `vitest.config.ts`; `test`, `test:watch`, `test:coverage` scripts |
| Translation layer unit tests | P0 | ✓ Complete | 37 tests for `translateAbpToBedrockAgent()` + `buildAgentCoreExportManifest()`; zero AWS dependency; covers name sanitization, instruction padding, action groups, memory, tags, guardrails, manifest |
| Deploy route integration tests | P1 | ✓ Complete | 12 tests with `vi.mock(@aws-sdk/client-bedrock-agent)`; covers happy path, all 3 failure steps, rollback, polling timeout, terminal state, pre-flight validation |
| AgentCore live health endpoint | P1 | ✓ Complete | `GET /api/monitor/agentcore-health`; calls `GetAgent` per deployed agent; 5s timeout; `UNREACHABLE` on failure; summary object |
| Monitor page AgentCore Live Status section | P1 | ✓ Complete | "Check Live AWS Status" button (compliance_officer + admin only); Bedrock status badges; only renders when AgentCore agents exist |
| ADR-011 | P2 | ✓ Complete | Captures test runner choice, timeout rationale, padding behavior change, agentVersion limitation |
| Operator setup guide | P2 | ✓ Complete | `docs/guides/agentcore-setup.md` — IAM setup, credential sources, model access, settings config, export vs deploy paths, live monitoring, known limitations, troubleshooting |

**Test results:** 49/49 passing (37 translation + 12 deploy). Coverage target: ≥80% lines on `lib/agentcore/**`.

---

## Phase 34 — Showcase Readiness ✓ Complete (2026-03-15 Session 039)

Hardens Intellios for live demo showcasing. Six targeted deliverables that collectively eliminate blank error screens, loading gaps, empty states, and the absence of rich demo data. No DB migrations. No new npm dependencies.

| Item | Priority | Status | Notes |
|---|---|---|---|
| `src/app/error.tsx` — branded error boundary | P0 | ✓ Complete | Next.js client error boundary; `error.digest` reference ID; "Try again" reset + "Return home"; matching design system |
| `src/app/not-found.tsx` — branded 404 | P0 | ✓ Complete | Static 404 page; no sidebar (unauthenticated layout); violet-600 "404" label; matching design system |
| `src/lib/db/seed-demo.ts` — Acme Financial demo seed | P0 | ✓ Complete | ~530 lines; idempotent (hardcoded UUIDs); 5 agents at all lifecycle stages; 3 policies; 8-event audit trail; test cases; trend data; pre-written briefing; 3-step approval chain |
| Blueprint generation success flash | P0 | ✓ Complete | 900ms green "✓ Blueprint ready — opening workbench…" state before `router.push()`; eliminates abrupt page change |
| `src/app/blueprints/[id]/report/loading.tsx` — MRM skeleton | P1 | ✓ Complete | Co-located Suspense skeleton; prevents blank screen during 2–5s `assembleMRMReport()`; matches report structure |
| Intelligence page cold-start message | P1 | ✓ Complete | Non-admins now see actionable message; only admins see "Generate Briefing" CTA |
| `docs/demo/DEMO_SETUP.md` | P0 | ✓ Complete | Complete setup guide: prerequisites, env vars, DB commands, credentials, 12-min 9-stop demo flow, troubleshooting, what not to demo live |

---

## Phase 35 — Demo Flow Fidelity ✓ Complete (2026-03-15 Session 040)

Fixes three demo-blocking gaps identified by systematic codebase audit of all 9 showcase stops. No DB migrations. No new npm dependencies.

| Item | Priority | Status | Notes |
|---|---|---|---|
| MRM Report access — extend to all roles | P0 | ✓ Complete | Removed role restriction on report page + registry link; compliance exports remain gated to compliance_officer + admin |
| Governance Hub — inline "Preview Impact" on policy cards | P0 | ✓ Complete | `SimResult` type + `simulatingId`/`simResults` state + `handlePreviewImpact()` + button + inline result panel (counts + agent list with registry links); reuses existing simulate API |
| Review panel — step advancement toast | P1 | ✓ Complete | 2s green toast "Approval submitted — advancing to [label]" on intermediate step; checks `data.nextApproverLabel` in API response |
| DEMO_SETUP.md corrections | P1 | ✓ Complete | Stops 4, 5, 6, 9 updated to reflect working flows |

---

## Phase 36 — First Customer Readiness ✓ Complete (2026-03-15 Session 041)

Three commercial viability gaps closed before a first enterprise customer engagement. No new npm dependencies.

| Item | Priority | Status | Notes |
|---|---|---|---|
| White-label branding | P0 | ✓ Complete | `branding` + `periodicReview` settings blocks; sidebar logo/name/color from DB; MRM report footer; admin settings live preview; server-side layout injection |
| SR 11-7 periodic review scheduling | P0 | ✓ Complete | Migration 0015; `nextReviewDue` set on deploy; MRM Section 14; Compliance overdue table; registry overdue badge; 1 new audit action |
| Audit trail pagination | P1 | ✓ Complete | API `offset`+`count` params; parallel count query; 50-row pages; prev/next UI; page X of Y indicator |

---

## Phase 37 — Operational Completeness ✓ Complete (2026-03-15 Session 042)

Four operational gaps that block real-world deployment: the periodic review compliance loop, password reset, user invitations, and review reminder automation. Zero new npm dependencies. Three DB migrations (0016–0018).

| Item | Priority | Status | Notes |
|---|---|---|---|
| Periodic review completion UI/API | P0 | ✓ Complete | `POST /api/blueprints/[id]/periodic-review/complete`; completion buttons on Compliance page + Registry detail; confirmation modal with notes; event → notification email to compliance officers |
| Password reset | P0 | ✓ Complete | `forgot-password` + `reset-password` routes and pages; cryptographic token (raw sent by email, SHA-256 hash stored); 1h TTL; enumeration-safe 200 response; "Forgot your password?" link on login page |
| User invitation system | P1 | ✓ Complete | `invite` + `invitations` admin API routes; `validate` + `accept` public auth routes; invite acceptance page; admin users page "Invite User" button + pending invitations table; 72h TTL; duplicate-invitation guard |
| Periodic review reminders | P1 | ✓ Complete | Daily cron `GET /api/cron/review-reminders`; per-enterprise `reminderDaysBefore` setting honored; cycle-deduplication via `lastReminderSentAt`; `vercel.json` at 08:00 UTC daily; optional `CRON_SECRET` bearer auth |

---

## Future Phases (not yet scoped)

- Production hardening (OQ-007 ABP schema evolution, distributed rate limiting)
- Agent marketplace / catalog
- Agent-to-agent communication protocols
