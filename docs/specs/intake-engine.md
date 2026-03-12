# Intake Engine — Specification

**Subsystem:** Design Studio
**Status:** Draft

## Purpose

Captures enterprise requirements, constraints, and preferences for agent creation. Produces structured intake data that the Generation Engine consumes.

## Inputs

- Enterprise user interaction (form, conversational, or API)
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

## Open Questions

- What is the intake format? (Conversational UI vs. structured form vs. both)
- How are enterprise policies discovered and pre-populated?
- Should intake support templates for common agent types?
