# Intellios Roadmap

## Current Phase: Post-MVP Phase 1 (not yet started)

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

## Post-MVP Phase 1 — Production Readiness (not yet scoped)

Prerequisite work before Intellios can serve real enterprise users.

| Item | Priority | Notes |
|---|---|---|
| Authentication | P0 | Method TBD (NextAuth.js / Clerk / Supabase Auth). See OQ-002 (resolved: deferred). |
| Multi-tenancy | P0 | Row-level security or application-level filtering. Tied to auth model. |
| User roles | P1 | At minimum: intake user + reviewer. Scope from ADR-003 single-reviewer model. |
| ABP schema evolution strategy | P1 | Migration strategy needed before v1.1.0. See OQ-007. |
| Deployment pipeline | P2 | Package approved ABPs for delivery to target runtime environments. |

---

## Future Phases (not yet scoped)

- Runtime monitoring and observability
- Agent marketplace / catalog
- White-label branding customization
- Agent-to-agent communication protocols
