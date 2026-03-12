# Governance Validator — Specification

**Subsystem:** Control Plane
**Status:** Draft

## Purpose

Validates an Agent Blueprint Package against enterprise policies, compliance rules, and safety constraints. Acts as a gate before an ABP can be stored or approved.

## Inputs

- An Agent Blueprint Package (ABP)
- Enterprise governance policies

## Outputs

- Validation result: pass or fail
- List of violations (if any), each with:
  - Policy name
  - Rule violated
  - Severity (error, warning)
  - Suggested remediation

## Behavior

1. Receive an ABP for validation.
2. Load applicable governance policies for the enterprise.
3. Check each policy rule against the ABP.
4. Return a structured validation report.
5. Block storage/approval if any `error`-severity violations exist.

## Resolved Decisions

- **Policy storage:** Governance policies are stored in PostgreSQL alongside the Agent Registry. See ADR-002.
- **Sync vs. async:** Synchronous for MVP. Validation runs inline before storage. See ADR-003.
- **Auto-fix suggestions:** Yes. The validator returns violations with Claude-powered suggested remediations. See ADR-003.
