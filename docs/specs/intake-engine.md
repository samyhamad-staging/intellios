# Intake Engine — Specification

**Subsystem:** Design Studio
**Status:** Draft

## Purpose

Captures enterprise requirements, constraints, and preferences for agent creation. Produces structured intake data that the Generation Engine consumes.

## Inputs

- Enterprise user interaction via **conversational UI** (chat-based, powered by Claude)
- Enterprise policies (referenced from governance system)

## Outputs

- Structured intake payload containing:
  - Agent purpose and description
  - Desired capabilities and tools
  - Behavioral constraints
  - Branding preferences
  - Applicable governance policies

## Behavior

1. Present the enterprise user with a guided experience to define their agent.
2. Validate completeness of required fields.
3. Resolve references to enterprise policies from the Control Plane.
4. Produce a structured intake payload for the Generation Engine.

## Resolved Decisions

- **Intake format:** Conversational UI (chat-based, powered by Claude). See ADR-002.
- **Policy discovery:** Policies are fetched from the Control Plane (PostgreSQL) at intake time. See ADR-003.
- **Templates:** No templates for MVP. Every agent starts from scratch. See ADR-003.
