# ADR-002: MVP Technology Stack

**Status:** accepted
**Date:** 2026-03-12
**Supersedes:** none

## Context

Before implementation can begin, the MVP needs technology choices for four areas: intake format, generation approach, storage backend, and UI framework. These decisions affect the entire system architecture and developer workflow.

Options considered for each:

**Intake format:** Conversational UI, structured form, or hybrid.
**Generation:** Claude API, template-based, or hybrid.
**Storage:** SQLite + filesystem, PostgreSQL, or filesystem only.
**UI:** React SPA, Next.js, or CLI.

## Decision

| Area | Choice | Rationale |
|---|---|---|
| Intake format | **Conversational UI** | Chat-based intake powered by Claude. Natural language, low friction, aligns with the Claude ecosystem. |
| Generation engine | **Claude API** | Use Claude to generate ABPs via structured prompting. Native to the ecosystem, flexible, high quality output. |
| Storage backend | **PostgreSQL** | Full relational database. Supports multi-tenant access, concurrent operations, and complex queries needed for the Agent Registry. |
| UI framework | **Next.js** | Full-stack React framework with SSR. Handles both the Blueprint Review UI and future dashboards. Server-side logic for API integration. |

## Consequences

**Benefits:**
- Conversational intake + Claude generation creates a cohesive, AI-native experience
- PostgreSQL provides a robust foundation that won't need replacing as the system scales
- Next.js gives a single framework for both frontend and backend API routes

**Trade-offs:**
- PostgreSQL requires database setup and management (vs. simpler SQLite)
- Next.js is more opinionated than plain React
- Conversational intake is harder to test deterministically than structured forms
- Claude API dependency for generation means output variability must be managed
