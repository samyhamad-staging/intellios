# Agent Blueprint Package (ABP) — Specification

## Overview

The Agent Blueprint Package is the **core artifact** of Intellios. It is a structured, versioned document that fully describes an AI agent: its identity, capabilities, constraints, and governance policies.

Every subsystem in Intellios either produces, consumes, validates, or stores ABPs.

## Schema

The canonical schema is defined at `docs/schemas/abp/v1.0.0.schema.json`.

## Structure

An ABP contains these top-level sections:

| Section | Purpose |
|---|---|
| `version` | Schema version this ABP conforms to |
| `metadata` | ID, timestamps, lifecycle status, enterprise ownership |
| `identity` | Agent name, description, persona, white-label branding |
| `capabilities` | Tools, system instructions, knowledge sources |
| `constraints` | Allowed domains, denied actions, rate limits |
| `governance` | Policies, audit config, approval chain |

## Lifecycle States

```
draft → in_review → approved → deprecated
      ↑          ↘ rejected → deprecated
      └─── (request changes returns to draft)
```

- **draft** — Initial state after generation. Designer can refine.
- **in_review** — Submitted for human review. Requires no error-severity governance violations to enter.
- **approved** — Passed human review.
- **rejected** — Failed human review. Terminal state (can only deprecate).
- **deprecated** — No longer active. Terminal state.

Note: `in_review → draft` is the "request changes" path — a reviewer sends it back for revision.

## Versioning

- Each ABP has a unique `metadata.id`.
- Revisions to an ABP create new versions in the Agent Registry.
- The `version` field refers to the **schema version**, not the blueprint revision.
- Blueprint revision tracking is managed by the Agent Registry using an `agent_id` UUID that groups all versions of the same logical agent.

## Validation

After an ABP is generated and stored, the Governance Validator runs automatically:
1. The ABP must conform to the JSON Schema at `docs/schemas/abp/` (enforced by the Generation Engine at generation time via Zod).
2. The Governance Validator evaluates enterprise policy rules and stores a Validation Report with the blueprint.
3. If the report contains any error-severity violations, the `draft → in_review` transition is blocked until violations are resolved and the blueprint is re-validated.
