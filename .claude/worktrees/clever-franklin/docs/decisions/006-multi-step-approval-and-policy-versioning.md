# ADR-006: Multi-Step Approval Workflow and Policy Versioning

**Status:** accepted
**Date:** 2026-03-13
**Supersedes:** Portions of ADR-003 (single-reviewer approval model; in-place policy mutation)

## Context

Two architectural gaps blocked regulated-industry production readiness after Phase 21:

**1. Single-reviewer approval**

SR 11-7 requires separation of model development, validation, and approval authority. The existing review model allowed any `reviewer` or `admin` to approve a blueprint in a single step — including, optionally, the same person who designed it (when `allowSelfApproval: true`). For financial services and healthcare enterprises this is a separation-of-duties violation. A bank deploying an AI credit-scoring agent requires at minimum: a technical reviewer (model validation), a compliance officer (regulatory check), and potentially a risk officer or risk committee. There was no way to configure or enforce such a chain.

**2. In-place policy mutation**

`PATCH /api/governance/policies/[id]` previously updated the policy row in place. This destroyed the evidence chain: a `ValidationReport` contains `evaluatedPolicyIds` — UUIDs of the policies evaluated when validation ran. After an in-place update, those IDs still point to the same row, but the row now has different content. There is no way to reconstruct the exact policy set active when a blueprint was approved, which is an MRM evidence gap.

## Decision

### Multi-Step Approval Workflow

An `approvalChain: ApprovalChainStep[]` field is added to `EnterpriseSettings`. Each step specifies a `role` and human-readable `label`. Steps are enforced in index order.

- When `approvalChain` is empty (the default), behavior is identical to the pre-Phase 22 single-step model. Full backward compatibility.
- When a chain is configured, each approval call validates the caller's role against `approvalChain[blueprint.currentApprovalStep].role`. Non-matching roles receive 403 Forbidden (unless `userRole === "admin"`).
- Each step appends an `ApprovalStepRecord` to `approvalProgress` (JSONB array on `agent_blueprints`). Records are append-only and include: `step`, `role`, `label`, `approvedBy`, `approvedAt`, `decision`, `comment`.
- On non-final step approval: `currentApprovalStep` advances, `status` remains `in_review`, a `blueprint.approval_step_completed` audit entry is written, and all users with `nextApproverRole` are notified.
- On final step approval: `status` transitions to `approved`, `blueprint.reviewed` audit action is written (same as legacy path).
- Rejection is always terminal at any step. A rejected `ApprovalStepRecord` is appended for evidence.
- SOD check is extended: `userEmail` is checked against both `blueprint.createdBy` and all `approvalProgress[*].approvedBy` to prevent any individual from participating in multiple steps (unless `allowSelfApproval: true`).

**No new `blueprint_approvals` table** — `approvalProgress` as JSONB on `agent_blueprints` is sufficient. All existing read paths already load this row.

### Policy Versioning

`PATCH /api/governance/policies/[id]` now executes a transaction:
1. Inserts a new policy row with `policyVersion = source.policyVersion + 1`, `previousVersionId = source.id`, `supersededAt = null`.
2. Sets `supersededAt = NOW()` on the old row.

`GET /api/governance/policies` adds `WHERE superseded_at IS NULL` so only active versions are returned.

`GET /api/governance/policies/[id]/history` walks the `previousVersionId` chain and returns history newest → oldest.

**Historical integrity is preserved by design**: `evaluatedPolicyIds` in existing `ValidationReport` objects are UUIDs. Since superseded rows are never deleted (ADR-003), those UUIDs continue to resolve to their exact evaluation-time content. The MRM report's Section 5 policy lineage subsection fetches these rows via `inArray(evaluatedPolicyIds)` and flags any where `supersededAt IS NOT NULL` as "policy revised since approval".

## Consequences

### Positive

- SR 11-7 separation-of-duties requirements can now be enforced at the platform level, not just by convention.
- Regulated enterprises can configure their exact approval chain (2, 3, or N steps) with role and label evidence captured per step.
- MRM Section 6 now renders a full approval chain evidence table suitable for regulatory submission.
- Policy change history is preserved with version numbers and supersession timestamps.
- Historical validation reports remain reproducible — any `evaluatedPolicyIds` UUID resolves to its evaluation-time content.
- Governance drift detection (Phase 19) is enhanced: a policy PATCH now creates a new UUID, so health checks comparing `evaluatedPolicyIds` against current active policy IDs correctly detect the policy change without any staleness logic changes.

### Trade-offs

- `PATCH /api/governance/policies/[id]` now returns a new `id` (the new version row). Any client caching the old ID for subsequent operations (edit page URL) must reload.
- The edit page URL (`/governance/policies/[id]/edit`) after a save points to the superseded version. The PATCH response contains the new ID; callers should redirect to the new ID. (The current edit page redirects to the Governance Hub, so this is not a UI issue in practice.)
- The `GET /api/governance/policies` filter for `supersededAt IS NULL` means direct access by ID to a superseded policy (for historical report reconstruction) requires the dedicated history endpoint or a direct `GET /api/governance/policies/[id]` with explicit ID.
- Enterprises with no `approvalChain` configured continue using the legacy single-step model — there is no forced migration path, which means enterprises that want multi-step enforcement must explicitly configure it.
