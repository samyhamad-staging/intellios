# ADR-004: Implementation Technology Choices

**Status:** accepted
**Date:** 2026-03-12
**Supersedes:** none

## Context

With the MVP technology stack decided (ADR-002: Next.js, PostgreSQL, Claude API) and component behaviors scoped (ADR-003), the implementation phase requires specific library and pattern choices that affect code structure and developer experience.

## Decision

| Area | Choice | Rationale |
|---|---|---|
| Project structure | Single Next.js app | One deployable, no monorepo overhead for MVP. Internal structure supports future extraction. |
| ORM | Drizzle | Thin, SQL-like, type-safe. No separate query engine binary. Migrations via drizzle-kit. |
| Validation | Zod | TypeScript-native. Validates tool inputs, API bodies, and intake payloads. Derives types from schemas. |
| Styling | Tailwind CSS | Utility-first, no runtime cost, standard for Next.js. |
| Streaming | Vercel AI SDK (`ai`) | Purpose-built for streaming AI in Next.js. Provides `useChat`, `streamText`, and built-in tool-call handling. |
| State management | React hooks + context | Chat state is localized. No global state complexity. |
| Intake method | Claude with tool use | Tools map to ABP sections. Incremental payload construction during conversation. Strong typing at the boundary. |

## Consequences

**Benefits:**
- Vercel AI SDK eliminates boilerplate for streaming + tool use
- Drizzle + Zod give end-to-end type safety from DB to API to client
- Tool use approach builds structured data incrementally, not as a fragile post-extraction step

**Trade-offs:**
- Vercel AI SDK is an additional dependency beyond the Anthropic SDK
- Drizzle is less widely adopted than Prisma (smaller community, fewer tutorials)
- Tool use requires careful system prompt engineering to ensure Claude calls tools reliably
