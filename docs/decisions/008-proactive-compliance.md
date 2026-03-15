# ADR-008: Proactive Compliance Intelligence

**Status:** accepted
**Date:** 2026-03-14
**Supersedes:** (none)

## Context

After Phase 23, the platform validates blueprints structurally (governance policies) and behaviorally (test harness). However, compliance officers still operated reactively:

1. **Policy changes lacked impact visibility.** Publishing a modified policy would silently break deployed agents. No mechanism existed to preview impact before saving.
2. **No consolidated compliance view.** Compliance officers navigated across five separate pages (Registry, Governance Hub, Monitor, Review Queue, Dashboard) to build a picture of enterprise compliance posture.
3. **SR 11-7 MRM evidence requires proactive risk management.** Governance tools should assist compliance officers in anticipating risk, not only documenting it after the fact.

The codebase already contained an unused architectural leverage point: `validateBlueprint(abp, enterpriseId, policies?)` accepts an optional pre-loaded policy array, bypassing the DB query entirely. This makes simulation trivially implementable without changing the validator.

## Decision

**1. Policy Impact Simulation (`POST /api/governance/policies/simulate`)**

A new API endpoint that takes a draft policy (new or modified) and runs the deterministic evaluator — `evaluatePolicies()` from `src/lib/governance/evaluate.ts` — against all `approved` and `deployed` blueprints. No AI calls. Returns per-blueprint classification:
- `new_violations` — blueprint would gain ≥1 new violation
- `resolved_violations` — blueprint would lose ≥1 violation (only meaningful when editing an existing policy)
- `no_change`

The simulation writes a `policy.simulated` audit entry for compliance trail evidence.

**"Preview Impact" button in `PolicyForm`** (`src/components/governance/policy-form.tsx`): A purple "Preview Impact" button between the rules section and the save button. Available on both the new-policy and edit-policy pages. The edit page passes `existingPolicyId` to enable resolved-violation detection. Shows inline summary (4 stat cards) + per-blueprint affected list with links. Marks results as "outdated" when the user modifies the form after simulating.

**2. Compliance Command Center (`/compliance`)**

A new page (`src/app/compliance/page.tsx`) for `compliance_officer | admin` roles. Aggregates from existing DB tables — no new tables required:

- **Section A: Enterprise Posture KPIs** — 5 stat cards (deployed agents, compliance rate, test coverage, review queue, at-risk count). Sourced from `GET /api/compliance/posture`.
- **Section B: At-Risk Agents table** — blueprints in `approved | deployed` status that have governance violations, degraded health, or no test runs. Per-row issue list with links to Registry.
- **Section C: Review Queue Pressure** — in-review blueprints sorted by age, with SLA indicators (amber 48h / red 72h). Links to Review Queue.
- **Section D: Policy Coverage table** — all active policies with violation counts and affected agent counts. Surfaces both systemically-violated policies (risk) and zero-violation policies (possible over-breadth).
- **Section E: 30-Day Trends** — reuses bar chart pattern from Governance Hub; data from the existing `GET /api/governance/analytics` endpoint.

**Nav link** added to `src/app/layout.tsx` for `compliance_officer | admin` roles, positioned before Governance.

## Consequences

**Positive:**
- Compliance officers can preview policy impact before publishing — proactive risk management rather than reactive incident response.
- A single page replaces 5-page navigation for compliance posture assessment.
- `policy.simulated` audit entries create a compliance trail showing that impact was reviewed before changes.
- Zero new DB tables. Zero new npm dependencies. Zero new AI calls.

**Constraints and trade-offs:**
- Simulation runs sequentially against all `approved | deployed` blueprints. For enterprises with >50 deployed agents, latency may reach ~2–3s (still acceptable for an explicit button press).
- The simulation uses `evaluatePolicies()` directly (no remediation pass), so simulation results show raw violations without suggestions. This is intentional — suggestions would require AI calls and slow the preview.
- Policy impact simulation shows only violations attributable to the **draft policy** in isolation. It does not model interaction effects with other concurrently-active policies. This is documented in the UI copy.
