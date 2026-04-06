# Contributing to Intellios

## Prerequisites

- Node.js 22+ (see `src/.nvmrc`)
- PostgreSQL 14+ (local or Docker)
- Redis (optional — used for distributed rate limiting)

## Setup

```bash
# Clone the repo
git clone https://github.com/samyhamad-staging/intellios.git
cd intellios/src

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL, ANTHROPIC_API_KEY, AUTH_SECRET

# Run database migrations
npm run db:migrate

# Seed demo data (optional)
npx tsx lib/db/seed-users.ts
npx tsx lib/db/seed-demo.ts

# Start development server
npm run dev
```

## Development Workflow

### Branch Strategy

- `main` is the production branch — never push directly
- Create feature branches: `feat/description`, `fix/description`, `chore/description`
- All changes require a pull request with CI passing

### Before Submitting a PR

Run all checks locally:

```bash
# TypeScript
npx tsc --noEmit

# Tests
npm test

# Lint
npx next lint --dir .

# Build
npm run build
```

### Multi-Tenancy Rules

Every API route that accesses tenant data MUST:

1. Call `requireAuth()` to verify authentication
2. Use `assertEnterpriseAccess()` or `enterpriseScope()` for data filtering
3. Never return data from one tenant to another
4. Include `enterpriseId` in all new database queries

### Documentation Requirements

Every code change must include corresponding documentation updates:

- **Spec** — Update `docs/specs/` if component behavior changed
- **ADR** — Create `docs/decisions/` entry for significant technical decisions
- **Session log** — Append to current session log in `docs/log/`
- **Roadmap** — Update `docs/roadmap.md` if component status changed

### Database Migrations

- Generate: `npm run db:generate`
- Apply: `npm run db:migrate`
- Never use `db:push` against production
- All migrations must be backward-compatible or include a rollback plan
- Test migrations against staging before production

## Architecture

See `CLAUDE.md` for full project layout and conventions.
See `docs/architecture/overview.md` for system design.
See `docs/decisions/_index.md` for architectural decision records.

## Code Style

- TypeScript strict mode
- Prefer Catalyst UI components over custom primitives
- Use Zod for all input validation
- Use `@/` path aliases for imports
- Follow existing patterns for API routes, components, and tests
