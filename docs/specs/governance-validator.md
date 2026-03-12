# Governance Validator — Specification

**Subsystem:** Control Plane
**Status:** Complete

## Purpose

Validates an Agent Blueprint Package against enterprise policies, compliance rules, and safety constraints. Acts as a gate before an ABP can progress through the review lifecycle.

## Inputs

- An Agent Blueprint Package (ABP)
- Enterprise governance policies (loaded from DB)

## Outputs

- Validation result: pass or fail
- List of violations (if any), each with:
  - Policy name
  - Rule violated
  - Field path
  - Severity (error, warning)
  - Suggested remediation (Claude-generated)

## Behavior

1. Receive an ABP for validation.
2. Load applicable governance policies (global + enterprise-specific).
3. Evaluate each policy rule using the structured expression language (ADR-005).
4. Generate Claude-powered remediation suggestions for violations (batched single call).
5. Store the validation report in `agent_blueprints.validation_report`.
6. Block lifecycle transition `draft → in_review` if any `error`-severity violations exist.

## Resolved Decisions

- **Policy storage:** Governance policies are stored in PostgreSQL alongside the Agent Registry. See ADR-002.
- **Sync vs. async:** Synchronous for MVP. Validation runs inline after generation. See ADR-003.
- **Auto-fix suggestions:** Yes. The validator returns violations with Claude-powered suggested remediations. See ADR-003.
- **Expression language:** Structured `{ field, operator, value, severity, message }` rule format. 11 operators. See ADR-005. OQ-001 resolved.
- **Validation timing:** Automatic on generation; manual re-validation via `POST /api/blueprints/[id]/validate`. OQ-004 resolved.
- **Lifecycle gate:** `draft → in_review` transition blocked if error-severity violations exist. ABP is always stored so the designer can view and refine it.

## Implementation

### Policy Expression Language (ADR-005)

Each rule in a governance policy (schema v1.1.0):

```json
{
  "id": "rule-id",
  "field": "capabilities.instructions",
  "operator": "exists",
  "severity": "error",
  "message": "Agent must have behavioral instructions."
}
```

**Supported operators:** `exists`, `not_exists`, `equals`, `not_equals`, `contains`, `not_contains`, `matches`, `count_gte`, `count_lte`, `includes_type`, `not_includes_type`

**Field addressing:** Dot-notation path into the ABP (e.g., `"governance.policies"`, `"constraints.denied_actions"`).

### Service Architecture

| File | Role |
|---|---|
| `src/lib/governance/types.ts` | Shared TypeScript types (PolicyRule, Violation, ValidationReport) |
| `src/lib/governance/evaluate.ts` | Deterministic rule evaluator — no AI, pure logic |
| `src/lib/governance/remediate.ts` | Claude remediation suggester — batched single `generateObject` call |
| `src/lib/governance/validator.ts` | Orchestration: load policies → evaluate → remediate → return report |

### API Endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/blueprints/[id]/validate` | Manual validation; stores report in DB, returns it |
| GET | `/api/governance/policies` | List global governance policies |
| POST | `/api/governance/policies` | Create a governance policy |

### Validation Report Schema

Stored in `agent_blueprints.validation_report` (JSONB):

```typescript
{
  valid: boolean,          // true if no error-severity violations
  violations: Violation[], // empty array if valid
  policyCount: number,     // policies evaluated
  generatedAt: string      // ISO timestamp
}
```

### Seed Policies

Four global policies seeded in migration `0002_governance_validator.sql`:

| Policy | Type | Rules |
|---|---|---|
| Safety Baseline | safety | `identity.name` exists (error), `capabilities.instructions` exists (error), `identity.description` exists (warning) |
| Audit Standards | audit | `governance.audit.log_interactions` exists (warning) |
| Access Control Baseline | access_control | `constraints.denied_actions` exists (warning) |
| Governance Coverage | compliance | `governance.policies` count_gte 1 (warning) |

### UI Integration

- **Blueprint page** (`/blueprints/[id]`): Governance section in right panel shows validation status, violations list with severity badges, expandable remediation suggestions, and "Re-validate" button.
- After refinement: validation report is cleared (stale) — user should re-validate.
- Validation summary shown in page header (✓ passes governance / ✗ N errors).

## Known Unknowns

| # | Question | Blocks |
|---|---|---|
| OQ-002 | Authentication and multi-tenancy — how are governance policies scoped per enterprise? | Enterprise-specific policy loading (MVP loads global policies only) |
