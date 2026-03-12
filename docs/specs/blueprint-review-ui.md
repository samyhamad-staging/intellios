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
