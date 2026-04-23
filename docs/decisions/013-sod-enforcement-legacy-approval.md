# ADR-013: SOD enforcement in legacy single-step blueprint approval

**Status:** accepted
**Date:** 2026-04-08
**Supersedes:** (none)

## Context

The blueprint status route (`PATCH /api/blueprints/[id]/status`) supports two approval modes:

1. **Multi-step chain:** When `settings.approvalChain` has entries, approval requires sequential sign-offs. This path enforced SOD — checking that `blueprint.createdBy !== userEmail` and that the user hasn't already approved at an earlier step.

2. **Legacy single-step:** When `settings.approvalChain` is empty (the default), a reviewer can directly transition a blueprint from `in_review` to `approved`. This path did **not** enforce SOD, allowing a blueprint creator to approve their own work.

The separate review route (`POST /api/blueprints/[id]/review`) enforced SOD in both modes, but the status route's legacy path created a bypass. This was discovered during Session 141 when writing adversarial test cases for the blueprint lifecycle.

For a governance platform, this is a compliance failure: Separation of Duties is a foundational control in SOX, SOC 2, and enterprise risk management frameworks.

## Decision

Hoist the SOD check (`createdBy !== userEmail` when `allowSelfApproval` is false) above the approval-chain branch, so it applies to **both** the legacy single-step and multi-step paths.

The multi-step block retains its additional `existingApprovers.includes(userEmail)` check, which prevents the same person from approving at multiple steps in a chain — a concern specific to multi-step workflows.

The `settings.governance.allowSelfApproval` opt-out (default: `false`) is preserved. Enterprises that explicitly set this to `true` can still allow self-approval.

## Consequences

- **Governance integrity restored:** No approval path exists that bypasses SOD unless the enterprise explicitly opts out.
- **No breaking change for compliant workflows:** Any enterprise using SOD-compliant workflows (different creator and reviewer) sees no behavior change.
- **Potential disruption for non-compliant workflows:** If any enterprise was relying on the legacy path to allow self-approval without setting `allowSelfApproval: true`, they will now receive 403 errors. This is the correct behavior — the gap was a bug, not a feature.
- **Test coverage:** 3 new test cases explicitly verify the fix (block self-approval, allow with opt-out, allow different reviewer).
