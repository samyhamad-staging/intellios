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
draft → in_review → approved → (deployed) → deprecated
                  ↘ rejected
```

- **draft** — Initial state after generation.
- **in_review** — Submitted for human review.
- **approved** — Passed review and governance validation.
- **rejected** — Failed review.
- **deprecated** — No longer active.

## Versioning

- Each ABP has a unique `metadata.id`.
- Revisions to an ABP create new versions in the Agent Registry.
- The `version` field refers to the **schema version**, not the blueprint revision.
- Blueprint revision tracking is managed by the Agent Registry.

## Validation

Before an ABP is stored or approved, it must:
1. Conform to the JSON Schema at `docs/schemas/abp/`.
2. Pass governance validation via the Governance Validator.
