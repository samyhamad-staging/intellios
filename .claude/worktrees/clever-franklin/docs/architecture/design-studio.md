# Design Studio — Architecture

## Overview

The Design Studio is responsible for the creative and generative phase of agent creation. It transforms enterprise requirements into a structured Agent Blueprint Package.

## Components

| Component | Spec | Purpose |
|---|---|---|
| Intake Engine | `docs/specs/intake-engine.md` | Captures requirements |
| Generation Engine | `docs/specs/generation-engine.md` | Produces ABPs |

## Data Flow

```
Enterprise User
      │
      ▼
┌──────────────┐     Structured      ┌───────────────────┐
│ Intake Engine │───── Intake ───────▶│ Generation Engine  │
│              │     Payload          │                   │
└──────────────┘                      └────────┬──────────┘
                                               │
                                          ABP (draft)
                                               │
                                               ▼
                                      Control Plane
```

## Boundaries

- The Design Studio **produces** ABPs but does not store or validate them.
- Governance policies are **referenced** during intake but **enforced** by the Control Plane.
- The Design Studio has no direct dependency on the Agent Registry — it outputs an ABP and hands it off.
