# Blueprint Review UI — Specification

**Subsystem:** Control Plane
**Status:** Draft

## Purpose

Provides a human-facing interface for reviewing, approving, or requesting changes to generated Agent Blueprint Packages.

## Inputs

- Agent Blueprint Packages (from the Agent Registry)
- Governance validation results

## Outputs

- Review decisions: approve, reject, or request changes
- Review comments and annotations

## Behavior

1. Display a list of ABPs pending review.
2. Show full blueprint details in a readable format.
3. Display governance validation results alongside the blueprint.
4. Allow reviewers to approve, reject, or request changes.
5. Capture review comments.
6. Update ABP status in the Agent Registry based on review decisions.

## Resolved Decisions

- **Technology stack:** Next.js (full-stack React with SSR). See ADR-002.
- **Editing:** Request changes only. Reviewers can approve, reject, or request changes with comments. Changes go back through the generation/validation loop. See ADR-003.
- **Roles and permissions:** Deferred to a future phase. MVP assumes a single reviewer role. See ADR-003.

## Known Unknowns

These questions must be resolved before this component can be implemented. See `docs/open-questions.md` for full detail.

| # | Question | Blocks |
|---|---|---|
| OQ-006 | Is the generation preview page (`/blueprints/[id]`) the same as the review interface, or are they separate pages? | Page architecture |
| OQ-006 | How does a reviewer discover ABPs pending review — queue page, notification, or direct link? | Review queue design |
| OQ-006 | What does "request changes" produce — a new intake session, a refinement pass, or a comment? | Review action implementation |
| OQ-002 | Authentication and multi-tenancy — how does the reviewer authenticate and which ABPs can they see? | Access control |
