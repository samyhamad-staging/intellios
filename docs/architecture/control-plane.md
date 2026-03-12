# Control Plane — Architecture

## Overview

The Control Plane is responsible for governance, storage, and lifecycle management of Agent Blueprint Packages. It ensures that agents meet enterprise policies before they can be approved.

## Components

| Component | Spec | Purpose |
|---|---|---|
| Governance Validator | `docs/specs/governance-validator.md` | Validates ABPs against policies |
| Agent Registry | `docs/specs/agent-registry.md` | Stores and versions ABPs |
| Blueprint Review UI | `docs/specs/blueprint-review-ui.md` | Human review interface |

## Data Flow

```
ABP (from Design Studio)
      │
      ▼
┌─────────────────────┐
│ Governance Validator │
│ (validate against    │
│  enterprise policies)│
└──────────┬──────────┘
           │
     Pass / Fail + Report
           │
           ▼
┌──────────────────┐       ┌──────────────────┐
│  Agent Registry   │◀─────▶│ Blueprint Review  │
│  (store + version)│       │       UI          │
└──────────────────┘       └──────────────────┘
```

## Boundaries

- The Control Plane **receives** ABPs from the Design Studio but does not generate them.
- The Governance Validator is a **gate** — ABPs with error-severity violations cannot proceed to storage.
- The Agent Registry is the **single source of truth** for all blueprint versions.
- The Blueprint Review UI is a **read/decide** interface — it does not modify ABPs directly.
