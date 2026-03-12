# Agent Registry — Specification

**Subsystem:** Control Plane
**Status:** Draft

## Purpose

Stores, versions, and manages Agent Blueprint Packages. Provides the canonical catalog of all agents within an enterprise.

## Inputs

- Agent Blueprint Packages (validated)
- Queries (lookup, search, filter)

## Outputs

- Stored ABP with version history
- Query results (list, detail, search)

## Behavior

1. Accept validated ABPs for storage.
2. Assign version numbers to each ABP revision.
3. Maintain full version history per agent.
4. Support lifecycle state transitions (draft, in_review, approved, deprecated).
5. Provide lookup by ID, search by name/tags, and filter by status.
6. Enforce uniqueness of agent IDs.

## Resolved Decisions

- **Storage backend:** PostgreSQL. See ADR-002.
- **Versioning:** Semantic versioning for ABP revisions. See ADR-003.
- **Deletion:** Deprecation only for MVP. No hard or soft delete. See ADR-003.
