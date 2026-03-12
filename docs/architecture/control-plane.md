# Control Plane — Architecture

## Overview

The Control Plane is responsible for governance, storage, and lifecycle management of Agent Blueprint Packages. It ensures that agents meet enterprise policies before they can be submitted for human review.

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
┌──────────────────┐
│  Agent Registry   │  ← ABP is always stored here (draft status)
│  (store + version)│
└────────┬─────────┘
         │
         ▼
┌─────────────────────┐
│ Governance Validator │  ← Runs automatically after storage
│ (validate against    │    Stores report in agent_blueprints
│  enterprise policies)│    Violations gate draft → in_review
└──────────┬──────────┘
           │
     Pass / Fail + Report
           │
           ▼ (only if no error violations)
┌──────────────────────┐
│ Blueprint Review UI   │  ← Reviewer: approve / reject / request changes
│ (in_review status)    │
└──────────────────────┘
```

## Boundaries

- The Control Plane **receives** ABPs from the Design Studio but does not generate them.
- The Agent Registry **always stores** the ABP — storage is never blocked.
- The Governance Validator runs **after storage** and its report is stored with the blueprint. Error-severity violations gate the `draft → in_review` lifecycle transition, not the storage step.
- The Agent Registry is the **single source of truth** for all blueprint versions.
- The Blueprint Review UI is a **read/decide** interface — it does not modify ABPs directly. "Request changes" moves the blueprint back to `draft` for the designer to refine.
