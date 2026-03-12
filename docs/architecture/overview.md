# Architecture Overview

## System Purpose

Intellios enables enterprises to design, generate, govern, and manage AI agents through a structured pipeline. The core output is the **Agent Blueprint Package (ABP)** — a versioned artifact that fully describes an agent.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Design Studio                     │
│                                                      │
│  ┌──────────────┐       ┌───────────────────────┐   │
│  │ Intake Engine │──────▶│  Generation Engine     │   │
│  │              │       │  (produces ABP)        │   │
│  └──────────────┘       └───────────┬───────────┘   │
│                                     │               │
└─────────────────────────────────────┼───────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────┐
│                   Control Plane                      │
│                                                      │
│  ┌─────────────────────┐  ┌───────────────────────┐ │
│  │ Governance Validator │  │   Agent Registry      │ │
│  │ (validates ABP)      │  │   (stores ABPs)       │ │
│  └──────────┬──────────┘  └───────────┬───────────┘ │
│             │                         │             │
│             └────────┬────────────────┘             │
│                      ▼                              │
│           ┌──────────────────┐                      │
│           │ Blueprint Review │                      │
│           │       UI         │                      │
│           └──────────────────┘                      │
└─────────────────────────────────────────────────────┘
```

## Subsystems

### Design Studio

Responsible for the creative/generative phase of agent creation.

- **Intake Engine** — Captures enterprise requirements: what the agent should do, constraints, integrations, branding preferences.
- **Generation Engine** — Takes intake data and produces a complete Agent Blueprint Package.

See: `docs/architecture/design-studio.md`

### Control Plane

Responsible for governance, storage, and lifecycle management.

- **Governance Validator** — Checks ABPs against enterprise policies, compliance rules, and safety constraints.
- **Agent Registry** — Stores and versions ABPs. Provides lookup, search, and lifecycle state tracking.
- **Blueprint Review UI** — Human interface for reviewing generated blueprints before approval.

See: `docs/architecture/control-plane.md`

## Core Data Flow

1. Enterprise provides requirements via the **Intake Engine**.
2. **Generation Engine** produces an ABP.
3. **Governance Validator** checks the ABP against policies.
4. ABP is stored in the **Agent Registry**.
5. Human reviewer approves/rejects via the **Blueprint Review UI**.
6. Approved ABPs become available for deployment (future phase).

## Core Artifact

The **Agent Blueprint Package (ABP)** is the central data structure. It flows through every subsystem. Its schema is defined at `docs/schemas/abp/` and its specification at `docs/architecture/abp-spec.md`.
