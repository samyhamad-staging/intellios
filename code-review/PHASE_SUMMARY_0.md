# Phase 0 — Reconnaissance & Inventory Summary

## Date: 2026-04-05

## Codebase Overview
Intellios is a white-label enterprise agent factory built on Next.js 16 (App Router) with TypeScript. It uses PostgreSQL with Drizzle ORM, NextAuth v5 (JWT strategy), Anthropic Claude for AI operations, and deploys to Vercel serverless.

## Scale
- **API Routes**: ~110 route handlers across admin, auth, blueprints, intake, governance, compliance, monitoring, registry, workflows, templates, telemetry, cron
- **Library Modules**: ~107 files in src/lib/ covering 15+ subsystems
- **Frontend Pages**: ~30+ page components across admin, intake, blueprints, registry, review, compliance, monitor
- **UI Components**: 27 Catalyst components + custom components for chat, blueprint, governance, registry, review
- **Tests**: ~9 test files (critically low coverage)
- **Database Tables**: 17 tables with indexes and foreign keys

## Key Architecture Decisions
1. JWT-based sessions (8h default, 30d remember-me)
2. Multi-layer tenant isolation (middleware → app → PostgreSQL RLS)
3. Append-only audit log with event bus
4. Serverless deployment on Vercel with cron jobs
5. Redis for rate limiting with in-memory fallback

## Preliminary Risk Areas
1. **Test coverage**: ~9 test files for 100+ source files is critically low
2. **Beta dependency**: NextAuth v5 (beta.30) in production
3. **Connection pooling**: max:1 on serverless — may cause issues under load
4. **CSP policy**: unsafe-inline and unsafe-eval permitted
5. **Cron security**: CRON_SECRET is optional
6. **No CSRF tokens**: Relying on NextAuth session + SameSite cookies

## Entry Points Identified
- 110+ API route handlers (Next.js App Router)
- 6 Vercel cron jobs (daily/weekly schedules)
- Public auth endpoints (register, forgot-password, reset-password, invite)
- Public intake invitation endpoints
- Public templates endpoint
- Public waitlist endpoint
- AI streaming endpoints (chat, simulate, help)

## Next Phase
Phase 1 will deep-dive into all authentication, authorization, session management, and security-critical code paths.
