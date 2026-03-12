# ADR-003: MVP Component Behavior Decisions

**Status:** accepted
**Date:** 2026-03-12
**Supersedes:** none

## Context

Each MVP component spec had open questions about behavior scope. These decisions determine what the MVP includes and what is deferred.

## Decision

### Intake Engine
- **Templates:** No templates for MVP. Every agent starts from scratch. Templates can be added in a future phase.
- **Policy discovery:** Policies are fetched from the Control Plane at intake time (details in spec).

### Generation Engine
- **Iterative refinement:** Yes. The user can review a generated ABP and request changes in conversation. Multi-turn generation aligns with the conversational intake format.

### Governance Validator
- **Auto-fix suggestions:** Yes. The validator returns violations with suggested remediations powered by Claude. This improves UX and reduces back-and-forth.
- **Sync vs. async:** Synchronous for MVP. Validation runs inline before storage.

### Blueprint Review UI
- **Direct editing:** No. Reviewers can approve, reject, or request changes with comments. Requested changes go back through the generation/validation loop. This preserves the integrity of the pipeline.
- **Roles and permissions:** Deferred to a future phase. MVP assumes a single reviewer role.

### Agent Registry
- **Versioning:** Semantic versioning for ABP revisions.
- **Soft-delete:** Deprecation only for MVP. No hard or soft delete.

## Consequences

**Benefits:**
- Iterative refinement + auto-fix suggestions create a high-quality agent creation loop
- Request-changes-only review preserves pipeline integrity (every ABP passes through generation and validation)
- Scoping out templates and complex permissions keeps the MVP focused

**Trade-offs:**
- No templates means slower first-run experience for enterprises
- Auto-fix suggestions add complexity to the Governance Validator
- Single reviewer role may not meet enterprise needs immediately
