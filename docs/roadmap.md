# Intellios Roadmap

## Current Phase: Post-MVP Phase 1 (in progress — hardening complete, multi-tenancy and deployment remain)

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
| Multi-tenancy | P0 | Not started | Row-level security or application-level `enterprise_id` filtering. Schema columns exist. |
| ABP schema evolution strategy | P1 | Not started | Migration strategy needed before v1.1.0. See OQ-007. |
| Deployment pipeline | P2 | Not started | Package approved ABPs for delivery to target runtime environments. |
| Distributed rate limiting | P2 | Not started | Current in-memory limiter does not work across multiple server instances. Replace with Redis. |

---

## Future Phases (not yet scoped)

- Runtime monitoring and observability
- Agent marketplace / catalog
- White-label branding customization
- Agent-to-agent communication protocols
