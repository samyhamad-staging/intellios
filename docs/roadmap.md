# Intellios Roadmap

## Current Phase: Post-MVP Phase 2 (Phase 1 complete; Phase 2: enterprise UX — Pipeline Board, role-differentiated home, Blueprint Workbench ✓ Phase A delivered)

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

### Phase C — Lifecycle Extension

| Item | Priority | Status |
|---|---|---|
| Blueprint plain-language summary | P2 | Not started — business-readable agent description for non-technical reviewers |
| Version diff view | P2 | Not started — compare blueprint versions side by side |
| Deployment Console | P2 | Not started — deploy queue, environment config, runtime health |
| Executive Dashboard | P2 | Not started — KPIs, portfolio health for exec stakeholders |

---

## Future Phases (not yet scoped)

- Runtime monitoring and observability
- Agent marketplace / catalog
- White-label branding customization
- Agent-to-agent communication protocols
