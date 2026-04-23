# ADR-019: Governance Violations Block Blueprint Approval (with Audited Admin Override)

**Status:** accepted
**Date:** 2026-04-17
**Supersedes:** (none)

## Context

Every blueprint passes through the Governance Validator (`src/lib/governance/validator.ts`), which runs enterprise policies against the ABP and writes a `ValidationReport` onto the blueprint row:

```ts
interface ValidationReport {
  valid: boolean;
  violations: Violation[];  // severity: "error" | "warning"
  policyCount: number;
  evaluatedPolicyIds: string[];
  generatedAt: string;
}
```

Prior to this ADR, the validation report was stored, displayed in the reviewer UI, and audited — **but the approval endpoint did not consult it.** A reviewer could approve a blueprint with `validationReport.valid === false` and multiple error-severity violations. The UI nudged them not to, but the API allowed it. For a governance-first product, this is the single worst contract break: "approved" meant nothing more than "a reviewer clicked approve."

The requirement:

1. **Approval must enforce governance.** If the stored report has any error-severity violation, approve fails.
2. **Warnings do not block.** Warning-severity violations are advisory.
3. **An escape valve must exist.** Rare cases require an admin to approve despite an unresolved block (e.g., a policy bug we haven't fixed, a customer-specific exception). The override must be explicit, reasoned, and auditable.

## Decision

### Block contract

In `POST /api/blueprints/[id]/review`, when `action === "approve"`:

1. Compute `errorSeverityViolations(blueprint.validationReport)` — filter to `severity === "error"` on reports where `valid === false`.
2. If any error-severity violations exist and the caller did not request an override, return `GOVERNANCE_BLOCKED` (HTTP 409) with a machine-readable `violations` array and `overrideAvailable: userRole === "admin"` hint for the UI.
3. This check runs **before** the approval chain role/SOD checks — no role may approve past an active block.

### Override contract

An approval may include:

```ts
governanceOverride: true,
overrideReason: string  // ≥20 chars, ≤2000 chars, required when override is true
```

Override succeeds only when all three conditions hold:
- `governanceOverride === true`
- `userRole === "admin"`
- `overrideReason.trim().length >= 20`

A successful override:
- Proceeds with the normal approval flow (status transition, approval chain advance).
- Produces an **additional** `blueprint.approved.override` audit row containing `{ reason, blockers }`, on top of the normal `blueprint.reviewed` audit row.
- Sets `metadata.governanceOverride = true` on the `blueprint.reviewed` audit row for cross-referencing.
- Emits a `logger.warn("blueprint.approval.override")` event for monitoring.

Both audit inserts share a `db.transaction` with the status update (ADR-021) — if any insert fails, the approval rolls back.

### Error code

New `ErrorCode.GOVERNANCE_BLOCKED` (HTTP 409) distinguishes "blocked by unresolved violations" from `INVALID_STATE` (409, lifecycle-state conflicts like "not in_review"). The reviewer UI renders a violation-specific remediation experience on `GOVERNANCE_BLOCKED`.

## Consequences

**Benefits:**
- "Approved" now means "passes governance or has been explicitly overridden by an admin with a documented reason." The contract is real.
- Auditors can identify every override by querying for `action = 'blueprint.approved.override'`. The override-to-approval ratio becomes a KPI.
- The UI gets a structured violations payload at the moment of block, enabling in-context remediation.

**Trade-offs:**
- Admins gain the power to bypass governance — deliberate and necessary. The audit trail makes this transparent, and the 20-char reason threshold forces a minimum of documentation.
- A blueprint with only warning-severity violations still passes. This is intentional per the warning/error taxonomy in the validator, but it means policy authors must be disciplined about when to use `severity: "error"`.
- The check relies on the stored `validationReport`. If validation runs produce different results (e.g., after policies are edited) the block reflects the report at generate/remediate time, not the current policy state. This is acceptable for MVP; "re-validate on review" is a future enhancement tracked as an open question.
