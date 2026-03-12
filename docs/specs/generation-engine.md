# Generation Engine — Specification

**Subsystem:** Design Studio
**Status:** Draft

## Purpose

Produces an Agent Blueprint Package (ABP) from structured intake data. This is the core generative component of Intellios.

## Inputs

- Structured intake payload (from Intake Engine)

## Outputs

- A valid Agent Blueprint Package conforming to the ABP schema (`docs/schemas/abp/`)

## Behavior

1. Receive structured intake data.
2. Generate agent identity (name, description, persona) from requirements.
3. Select and configure tools/capabilities based on stated needs.
4. Apply constraints from enterprise requirements.
5. Attach governance policies.
6. Produce a complete ABP with status `draft`.
7. Validate the ABP against the current schema before output.

## Open Questions

- What model/approach powers the generation? (Claude API, template-based, hybrid)
- How are tool configurations resolved? (catalog lookup vs. generated)
- Should the engine support iterative refinement (multi-turn generation)?
