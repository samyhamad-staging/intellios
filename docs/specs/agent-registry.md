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

## Known Unknowns

These questions must be resolved before this component can be implemented. See `docs/open-questions.md` for full detail.

| # | Question | Blocks |
|---|---|---|
| OQ-005 | Relationship between `agent_blueprints` table (created for Generation Engine) and the Agent Registry — are they the same, or does the Registry wrap it? | Schema design |
| OQ-005 | Version history model — separate rows per version, or JSONB array? | Schema design, query design |
| OQ-005 | Agent uniqueness definition — what field(s) identify an agent as unique within an enterprise? | Uniqueness enforcement |
| OQ-002 | Authentication and multi-tenancy — how is enterprise isolation enforced for stored ABPs? | All registry operations |
| OQ-007 | ABP schema evolution — how are ABPs stored at an older schema version handled when the schema advances? | Long-term data integrity |
