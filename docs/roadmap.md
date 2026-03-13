# Intellios Roadmap

## Current Phase: Post-MVP Phase 10 ✓ Complete (2026-03-13) — Governance Policy Management delivered

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

## Future Phases (not yet scoped)

- Runtime monitoring and observability
- Agent marketplace / catalog
- White-label branding customization
- Agent-to-agent communication protocols
