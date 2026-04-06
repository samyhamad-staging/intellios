# Intellios Continuous Development Maturity Assessment

**Date:** April 5, 2026
**Assessor:** Independent SaaS Maturity Review
**Scope:** All systems required for consistent, efficient, safe, and scalable continuous development
**Method:** Evidence-based analysis of codebase, configuration, infrastructure, documentation, repository patterns, and operational controls
**Version:** 0.1.0 (as declared in package.json)

---

## 1. Executive Summary

**Overall maturity rating:** 1.4 / 5.0 (average across 16 system groups; item-level average across 113 subsystems is 1.2)

**Current stage assessment:** Late Prototype / Early MVP — The application has significant feature breadth with a sophisticated domain model, but lacks the operational infrastructure, testing discipline, deployment safety, and tenant hardening required for production SaaS delivery.

**Delivery readiness:** Not production-ready. The platform can be demonstrated but cannot be safely operated for paying multi-tenant customers. Core workflow (blueprint generation) was found broken during QA (HTTP 500). No CI/CD pipeline exists. No automated test gating protects deployments.

**Main strengths:**
- Exceptional documentation discipline (128 session logs, 11 ADRs, 5 architecture specs, 102 KB articles, continuous project journal)
- Sophisticated domain model — governance validation, policy expression language, compliance evidence, multi-agent orchestration
- Thoughtful AI integration — adaptive model routing (Sonnet/Haiku), context-driven risk tiering, deterministic compliance classification
- Mature UI component library (Catalyst, 27 components) with design token system, dark mode, and accessibility work
- Strong audit trail design — append-only audit log with enterprise scoping

**Main weaknesses:**
- Zero CI/CD pipeline — no GitHub Actions, no automated test gating, no build verification before deployment
- Minimal test coverage — 9 test files covering ~5 modules out of 129 API routes and dozens of libraries
- No E2E, integration, load, contract, or security testing
- Multi-tenancy is query-scoped, not middleware-enforced — no tenant provisioning, no per-tenant quotas, no tenant lifecycle management
- No containerization, no infrastructure-as-code, no environment parity controls
- No observability stack — no centralized logging, no metrics, no tracing, no alerting beyond in-app cron jobs
- No incident response, no runbooks, no rollback capability, no backup/restore procedures
- Single contributor (2 unique committers, both the same person/staging account)

**Biggest risks:**
1. Any Vercel deployment goes directly to production with no test gate — a broken build ships immediately
2. Tenant data isolation relies on consistent developer discipline in every route handler, not structural enforcement
3. No rollback mechanism exists — a bad deployment requires a manual code revert and redeploy
4. No backup/restore has been tested or documented operationally
5. Single-person development means zero code review, zero knowledge redundancy, zero bus-factor resilience

**Most important priorities (next 60–90 days):**
1. Establish CI/CD with automated test gating (blocks broken builds from deploying)
2. Add E2E tests for the 3 critical user flows
3. Harden tenant isolation with structural enforcement (middleware-level, not just query-level)
4. Implement proper environment separation (dev/staging/production)
5. Establish backup/restore and verify with a recovery drill

---

## 2. Overall Maturity by System Group

| # | System Group | Avg Score | Confidence | Overall Status | Primary Risk |
|---|---|---|---|---|---|
| 1 | Product & Delivery | 2.2 | Medium | Partially implemented | No release planning or sprint management system |
| 2 | Source Control & Engineering Workflow | 1.3 | High | Scaffolded | No code review, no branching strategy, no CI gate |
| 3 | Development Environment | 0.8 | High | Minimal | No environment separation, no preview environments |
| 4 | CI/CD | 0.5 | High | Missing | No pipeline exists — direct push to Vercel |
| 5 | Quality Assurance | 0.6 | High | Minimal | 9 test files, no E2E/integration/load/security testing |
| 6 | Multi-Tenant Architecture | 1.6 | Medium | Partially implemented | Query-scoped isolation, no provisioning, no quotas |
| 7 | Data & Platform | 1.6 | Medium | Partially implemented | No backup/restore verification, no DR plan |
| 8 | Observability & Reliability | 0.8 | High | Scaffolded | No external observability stack, no incident process |
| 9 | Security & Compliance | 1.3 | Medium | Partially implemented | Auth is beta library, no vulnerability scanning in pipeline |
| 10 | API & Integration | 1.8 | Medium | Partially implemented | No API versioning, no contract testing |
| 11 | Operational SaaS Business | 0.1 | High | Missing | No billing, no onboarding, no support system |
| 12 | Governance | 1.9 | Medium | Partially implemented | Product governance strong, platform governance weak |
| 13 | Developer Productivity | 2.1 | Medium | Partially implemented | Strong component library, but single-developer model |
| 14 | Financial Efficiency | 0.2 | High | Missing | No cost allocation, no budget monitoring |
| 15 | Feedback & Learning | 0.3 | High | Missing | No customer feedback loop, no experimentation |
| 16 | Business Continuity of Development | 0.7 | High | Missing | Single contributor, no runbooks, no backup maintainers |

---

## 3. Detailed Assessment by System Group

### 3.1 Product and Delivery Systems

#### Product roadmap and prioritization system
- **Maturity score:** 2
- **Confidence:** Medium
- **Evidence basis:** Confirmed in docs (docs/roadmap.md — 191KB, phase-based with completion tracking)
- **Status classification:** Partially implemented
- **Current state summary:** A comprehensive roadmap exists with wave-based prioritization (Wave 1–3, DPR phase). Sessions are tracked against roadmap items. However, this is a single-author document maintained by the sole developer, not a shared team artifact with stakeholder input or formal prioritization framework.
- **What is working:** Clear phase gates (P1/P2 sprints, Wave 1–3, DPR). Completion tracking with session references. 36/36 Wave 3 items marked complete.
- **What is missing or weak:** No formal prioritization framework (RICE, MoSCoW, etc.). No stakeholder input process. No customer-driven prioritization. Single author maintains the roadmap — no visibility to a broader team.
- **Risks:** Prioritization reflects one person's judgment. No mechanism to incorporate market or customer signals.
- **Recommended next actions:** Adopt a lightweight prioritization framework. Move roadmap to a tool accessible by stakeholders.

#### Requirements and backlog management system
- **Maturity score:** 2
- **Confidence:** Medium
- **Evidence basis:** Confirmed in docs (open-questions.md, UX audit spreadsheets, Vigil TASK_QUEUE.md)
- **Status classification:** Partially implemented
- **Current state summary:** Requirements are captured in session logs, open questions, and UX audit documents. The Vigil system generates a prioritized TASK_QUEUE.md from automated scans. But there is no formal backlog management tool (no Jira, Linear, GitHub Issues, or equivalent).
- **What is working:** Open questions tracked with resolution status. Vigil synthesizes automated findings into prioritized tasks. UX audit items tracked to completion (36/36).
- **What is missing or weak:** No persistent backlog tool. Requirements live scattered across markdown files. No ticket lifecycle (created → assigned → in-progress → done). No capacity planning.
- **Risks:** Work items can be lost in documentation. No way to track work across multiple contributors.
- **Recommended next actions:** Adopt a lightweight issue tracker. Even GitHub Issues would provide structure.

#### Design system and UX standards
- **Maturity score:** 2
- **Confidence:** High
- **Evidence basis:** Confirmed in code (src/components/catalyst/, design-tokens.md, status-theme.ts)
- **Status classification:** Partially implemented
- **Current state summary:** Catalyst UI Kit (27 components) provides a solid foundation. Design tokens defined in CSS custom properties (design-tokens.md, 24KB). Status colors consolidated in status-theme.ts. Dark mode implemented with semantic properties. Accessibility work done (skip links, 44px touch targets, sr-only). However, responsive design is completely absent — the app is unusable on tablets and mobile (per QA report C-12).
- **What is working:** Consistent component library. Semantic design tokens replacing hardcoded colors. Dark mode. Accessibility hardening (WCAG 2.1 AA partial).
- **What is missing or weak:** Zero responsive breakpoints. No mobile layout. No cross-browser validation documented. No visual regression testing.
- **Risks:** Platform cannot serve users on non-desktop devices. No automated way to catch visual regressions.
- **Recommended next actions:** Implement responsive breakpoints. Add visual regression testing (Chromatic, Percy, or screenshot comparison).

#### Release planning and sprint/flow management
- **Maturity score:** 2
- **Confidence:** Medium
- **Evidence basis:** Inferred from patterns (session logs show sprint-like phases: P1 Sprint, P2 Sprint, Wave 1–3)
- **Status classification:** Partially implemented
- **Current state summary:** Work is organized into named phases and sprints visible in session logs. But there is no sprint management tool, no velocity tracking, no burndown/burnup, no capacity planning. The "sprints" are informal planning units used by a single developer.
- **What is working:** Named phases provide structure. Session logs create accountability.
- **What is missing or weak:** No team-scale sprint management. No estimation. No velocity tracking.
- **Risks:** Cannot scale to a team without introducing formal flow management.
- **Recommended next actions:** Defer until team grows beyond 1–2 people. Current approach is adequate for solo development.

#### Documentation and knowledge management
- **Maturity score:** 4
- **Confidence:** High
- **Evidence basis:** Confirmed in docs (128 session logs, 102 KB articles, project journal at 332KB, glossary, 11 ADRs, 5 specs, 4 architecture docs)
- **Status classification:** Operational
- **Current state summary:** This is Intellios' strongest system. Every session is logged. Every architectural decision is recorded. A 102-article knowledge base covers platform overview, getting started, core concepts, architecture, governance, use cases, administration, security, ROI, FAQ, glossary, and release notes. KB has a governance plan, style guide, templates, and cross-reference validation script.
- **What is working:** Session logging is disciplined and continuous. ADRs capture rationale. KB is comprehensive and well-organized. Glossary enforces terminology. Project journal provides narrative continuity.
- **What is missing or weak:** KB articles may describe aspirational state rather than current implementation (needs cross-verification). Documentation freshness review process exists in Vigil but operational cadence unclear.
- **Risks:** Documentation may outpace implementation, creating a false sense of maturity. Single author means documentation reflects one perspective.
- **Recommended next actions:** Add documentation freshness dates. Cross-verify KB claims against current implementation state.

#### Change management and rollout coordination
- **Maturity score:** 1
- **Confidence:** High
- **Evidence basis:** Not evidenced
- **Status classification:** Missing
- **Current state summary:** No change management process exists. Changes go directly from development to production via Vercel auto-deploy. No rollout coordination, no canary deployments, no staged rollouts, no feature flags for gradual exposure.
- **What is working:** Nothing formal.
- **What is missing or weak:** Everything — no change advisory board, no rollout plans, no communication templates, no rollback procedures.
- **Risks:** Any deployment is an all-or-nothing change affecting all tenants simultaneously.
- **Recommended next actions:** Implement feature flags. Establish a deployment checklist. Define rollback procedures.

---

### 3.2 Source Control and Engineering Workflow Systems

#### Git repository strategy and branching standards
- **Maturity score:** 1
- **Confidence:** High
- **Evidence basis:** Confirmed in config (git branch -a shows main + 4 claude/* branches, no branching strategy documented)
- **Status classification:** Ad hoc
- **Current state summary:** All development happens on `main`. Feature branches (claude/*) exist but appear to be auto-generated by Claude Code sessions, not a deliberate branching strategy. No branch protection rules visible. No documented branching model (GitFlow, trunk-based, etc.).
- **What is working:** Code is in git. Remote is on GitHub.
- **What is missing or weak:** No branch protection. No required reviews. No branching strategy. Direct pushes to main.
- **Risks:** Any push to main triggers deployment. No safety net between development and production.
- **Recommended next actions:** Enable branch protection on main. Require PR reviews. Document a branching strategy (trunk-based with short-lived feature branches recommended for this team size).

#### Code review / pull request system
- **Maturity score:** 0
- **Confidence:** High
- **Evidence basis:** Not evidenced (no PR templates, no GitHub Actions, 2 contributors are the same person)
- **Status classification:** Missing
- **Current state summary:** No code review process exists. All commits are authored by a single contributor (Samy Hamad / samyhamad-staging). No PR templates exist. No review requirements are configured.
- **What is working:** Nothing.
- **What is missing or weak:** No peer review. No automated review. No PR templates. No review checklists.
- **Risks:** Defects, security issues, and architectural drift go undetected. No second pair of eyes on any change.
- **Recommended next actions:** When team grows, establish mandatory PR reviews. In the interim, consider AI-assisted code review (e.g., GitHub Copilot review) as a lightweight check.

#### Engineering standards and architecture guidelines
- **Maturity score:** 3
- **Confidence:** Medium
- **Evidence basis:** Confirmed in docs (CLAUDE.md conventions, ADRs, architecture docs, TypeScript strict mode)
- **Status classification:** Implemented but immature
- **Current state summary:** CLAUDE.md defines clear conventions: terminology, schema versioning, session logging, documentation requirements. Architecture is documented in 4 files. 11 ADRs capture significant decisions. TypeScript strict mode enforced. However, these standards are instructions for an AI assistant, not team-wide engineering standards with enforcement mechanisms.
- **What is working:** Clear conventions in CLAUDE.md. ADR discipline. TypeScript strict mode.
- **What is missing or weak:** No linting rules beyond default ESLint/Next.js. No automated architecture enforcement (e.g., ArchUnit, dependency-cruiser). Standards are Claude-facing, not team-facing.
- **Risks:** Standards work because one person (with AI) follows them. They may not survive team scaling without automation.
- **Recommended next actions:** Extract team-facing engineering standards from CLAUDE.md. Add automated enforcement where possible.

#### Dependency and package management
- **Maturity score:** 2
- **Confidence:** High
- **Evidence basis:** Confirmed in code (package.json with 51 prod + 11 dev dependencies, esbuild override)
- **Status classification:** Partially implemented
- **Current state summary:** Dependencies are managed via npm. Package.json is clean with specific version ranges. An esbuild override exists for Node.js compatibility. Security audit was performed (Session 69) with CVE fixes applied. However, no lockfile strategy documented, no automated dependency update process (no Renovate/Dependabot), and deferred moderate CVEs in esbuild/drizzle-kit.
- **What is working:** Dependencies are declared. Security audit was performed. CVEs addressed where possible.
- **What is missing or weak:** No automated dependency updates. Deferred CVEs. No lockfile verification in CI (no CI exists). NextAuth is on beta (v5.0.0-beta.30) — a critical auth dependency on a pre-release version.
- **Risks:** Dependencies can drift. Known CVEs remain unpatched. Auth library is pre-release with potential breaking changes.
- **Recommended next actions:** Enable Dependabot or Renovate. Prioritize upgrading NextAuth to stable when available. Address deferred CVEs.

#### Feature flag / configuration management
- **Maturity score:** 1
- **Confidence:** High
- **Evidence basis:** Confirmed in code (NEXT_PUBLIC_DEMO_MODE env var is the only flag; src/lib/awareness/ is monitoring, not feature flags)
- **Status classification:** Conceptual
- **Current state summary:** A single environment variable (NEXT_PUBLIC_DEMO_MODE) controls demo behavior. The `awareness/` directory implements monitoring and anomaly detection, not feature flags. No feature flag system (LaunchDarkly, Unleash, or custom) exists.
- **What is working:** Demo mode toggle exists.
- **What is missing or weak:** No feature flag infrastructure. All features are hardcoded on/off. No gradual rollout capability. No per-tenant feature control.
- **Risks:** Cannot safely roll out new features to a subset of tenants. Cannot quickly disable a broken feature without a code deployment.
- **Recommended next actions:** Implement a basic feature flag system. Even a database-backed flag table would provide essential capability.

#### Secrets management
- **Maturity score:** 2
- **Confidence:** Medium
- **Evidence basis:** Confirmed in code (.env.example documents required secrets; no hardcoded secrets found in codebase)
- **Status classification:** Partially implemented
- **Current state summary:** Secrets are externalized to environment variables. .env.example documents all required secrets with guidance (e.g., "use IAM roles in production"). No hardcoded secrets found in source. CRON_SECRET protects scheduled jobs. Webhook secrets use HMAC-SHA256. However, no secrets manager integration (AWS Secrets Manager, Vault) exists. Secret rotation is manual. No secret scanning in CI.
- **What is working:** Secrets externalized. No secrets in code. HMAC signing for webhooks. Cron authentication.
- **What is missing or weak:** No secrets manager integration. Manual rotation. No secret scanning (no CI exists). No rotation policy.
- **Risks:** Secrets in environment variables are less secure than a dedicated secrets manager. No automated rotation means compromised secrets persist.
- **Recommended next actions:** Integrate with Vercel's environment variable encryption or AWS Secrets Manager for production. Add secret scanning to future CI pipeline.

---

### 3.3 Development Environment Systems

#### Local development environment standardization
- **Maturity score:** 1
- **Confidence:** High
- **Evidence basis:** Confirmed in code (no .nvmrc, no .tool-versions, no Docker, no devcontainer)
- **Status classification:** Ad hoc
- **Current state summary:** Developers run `npm run dev` with a local PostgreSQL database. .env.example documents required variables. No Node.js version pinning (.nvmrc absent). No containerized dev environment. No devcontainer configuration.
- **What is working:** .env.example provides setup guidance. npm scripts are clear.
- **What is missing or weak:** No Node.js version pinning. No containerized development. No "works on my machine" prevention. No setup automation script.
- **Risks:** A new developer may use an incompatible Node.js version. Local environment differences could cause inconsistent behavior.
- **Recommended next actions:** Add .nvmrc. Create a docker-compose.yml for local PostgreSQL + Redis. Document setup in a CONTRIBUTING.md.

#### Ephemeral preview environments
- **Maturity score:** 1
- **Confidence:** Medium
- **Evidence basis:** Inferred from patterns (Vercel may auto-create preview deployments for PRs, but no PR workflow exists)
- **Status classification:** Scaffolded
- **Current state summary:** Vercel natively supports preview deployments on pull requests. However, since no PR workflow exists (all work goes to main), this capability is not operationalized. Preview environments would require a branching/PR strategy to activate.
- **What is working:** Vercel infrastructure supports previews.
- **What is missing or weak:** Not operationalized. No PR workflow to trigger previews. No preview database isolation.
- **Risks:** Cannot preview changes before they hit production.
- **Recommended next actions:** Establish PR workflow first, then Vercel previews activate automatically.

#### Shared dev/test/staging/production environments
- **Maturity score:** 0
- **Confidence:** High
- **Evidence basis:** Not evidenced (single environment visible — production on Vercel)
- **Status classification:** Missing
- **Current state summary:** Only one environment is visible: production on Vercel. No staging, no testing, no development environment. The .env.example references a single DATABASE_URL. No environment-specific configuration. No environment promotion workflow.
- **What is working:** Production exists.
- **What is missing or weak:** No staging. No testing environment. No environment promotion. No environment parity controls.
- **Risks:** All development testing happens against production infrastructure or local-only. No safe place to validate changes before production.
- **Recommended next actions:** Create at minimum a staging environment on Vercel with a separate database. This is a high-priority gap.

#### Tenant-safe seed data and test data management
- **Maturity score:** 2
- **Confidence:** High
- **Evidence basis:** Confirmed in code (src/lib/db/seed-users.ts, seed-demo.ts — 4 demo users, 5 demo agents)
- **Status classification:** Partially implemented
- **Current state summary:** Idempotent seed scripts create demo users (4 roles) and demo agents (5 lifecycle stages). These support local development and demonstration. However, seed data does not test multi-tenant isolation (all seeds use a single implicit enterprise). No test data factories for automated testing.
- **What is working:** Idempotent seeds. Role diversity in demo data. Lifecycle stage diversity.
- **What is missing or weak:** No multi-tenant seed data. No data factories for tests. No anonymized production data tooling.
- **Risks:** Cannot verify tenant isolation with seed data alone. Seed data may diverge from production reality.
- **Recommended next actions:** Add multi-enterprise seed data (2+ enterprises with overlapping agent types) to test isolation. Create test data factories for automated tests.

#### Environment configuration parity controls
- **Maturity score:** 0
- **Confidence:** High
- **Evidence basis:** Not evidenced
- **Status classification:** Missing
- **Current state summary:** No mechanism ensures parity between environments because only one environment exists. No environment configuration validation. No drift detection between environments.
- **What is working:** Nothing.
- **What is missing or weak:** Everything — only one environment exists.
- **Risks:** When staging/production split eventually happens, configuration drift is likely.
- **Recommended next actions:** Address after creating staging environment. Use Vercel environment groups or similar.

---

### 3.4 CI/CD Systems

#### Continuous integration pipeline
- **Maturity score:** 0
- **Confidence:** High
- **Evidence basis:** Confirmed (no .github/workflows/, no CI config files of any kind)
- **Status classification:** Missing
- **Current state summary:** No CI pipeline exists. No GitHub Actions, no CircleCI, no Jenkins, nothing. Code pushed to main goes directly to Vercel for deployment. No automated checks run before deployment.
- **What is working:** Nothing.
- **What is missing or weak:** Everything — no lint check, no type check, no test execution, no build verification before deployment.
- **Risks:** Broken code deploys to production immediately. The QA report confirmed broken routes (HTTP 500 on blueprint generation) that would have been caught by even basic CI.
- **Recommended next actions:** This is the single highest-priority infrastructure gap. Create a GitHub Actions workflow that runs lint, typecheck, test, and build on every push. Block deployment on failure.

#### Automated build and artifact generation
- **Maturity score:** 1
- **Confidence:** Medium
- **Evidence basis:** Inferred from patterns (Vercel auto-builds on push to main)
- **Status classification:** Scaffolded
- **Current state summary:** Vercel automatically builds the Next.js application on push to main. This provides basic build automation. However, there is no build verification step before deployment. No artifact versioning. No build metadata tracking.
- **What is working:** Vercel auto-build functions.
- **What is missing or weak:** No pre-deployment build verification. No artifact versioning. No build history beyond Vercel's dashboard.
- **Risks:** Build failures on Vercel are only discovered after push, not before.
- **Recommended next actions:** Add `npm run build` to CI pipeline to catch build failures before Vercel deployment.

#### Automated test execution pipeline
- **Maturity score:** 0
- **Confidence:** High
- **Evidence basis:** Not evidenced (tests exist but are not gated in any pipeline)
- **Status classification:** Missing
- **Current state summary:** Vitest is configured with 80% coverage thresholds. Tests can be run manually (`npm test`). But no pipeline executes tests automatically. Test failures do not block anything.
- **What is working:** Test runner is configured. Coverage thresholds are defined.
- **What is missing or weak:** Tests are not automated in any pipeline. Coverage thresholds are not enforced.
- **Risks:** Tests exist but may not be run regularly. Regressions can ship without detection.
- **Recommended next actions:** Add test execution to CI pipeline. Enforce coverage thresholds as a gate.

#### Continuous deployment / release automation
- **Maturity score:** 1
- **Confidence:** Medium
- **Evidence basis:** Inferred from patterns (Vercel deploys on push to main)
- **Status classification:** Scaffolded
- **Current state summary:** Vercel provides continuous deployment: push to main → build → deploy. This is functional but has zero safety gates. No approval required. No staged rollout. No canary deployment.
- **What is working:** Automated deployment works end-to-end.
- **What is missing or weak:** No safety gates. No staged rollout. No approval step. No deployment notifications.
- **Risks:** Every push to main is an unvalidated production deployment.
- **Recommended next actions:** Add CI checks as a prerequisite. Consider Vercel's deployment protection for staging.

#### Rollback and deployment recovery system
- **Maturity score:** 0
- **Confidence:** High
- **Evidence basis:** Not evidenced
- **Status classification:** Missing
- **Current state summary:** No rollback mechanism is documented or configured. Vercel supports instant rollback to previous deployments via its dashboard, but this capability is not documented, not tested, and not integrated into any incident response process.
- **What is working:** Vercel's native rollback exists as an undocumented escape hatch.
- **What is missing or weak:** No documented rollback procedure. No rollback testing. No automated rollback triggers.
- **Risks:** In an incident, the team would need to manually discover and use Vercel's rollback feature under pressure.
- **Recommended next actions:** Document rollback procedure. Test it. Include in incident response runbook.

#### Database migration and schema deployment controls
- **Maturity score:** 2
- **Confidence:** Medium
- **Evidence basis:** Confirmed in code (35+ Drizzle migrations in src/lib/db/migrations/, drizzle-kit configured)
- **Status classification:** Partially implemented
- **Current state summary:** Drizzle ORM manages schema with 35+ migration files. Migrations are versioned and sequential. `npm run db:migrate` applies pending migrations. `npm run db:push` can force schema sync. However, no migration is tested in CI. No rollback migration strategy documented. No migration validation before production. `db:push` is a dangerous command with no guard rails.
- **What is working:** Migration files are versioned. Drizzle provides type-safe schema management.
- **What is missing or weak:** No migration testing in CI. No rollback migrations. No guard against destructive schema changes. No migration execution as part of deployment pipeline.
- **Risks:** A bad migration could corrupt production data with no rollback path. `db:push` could overwrite production schema.
- **Recommended next actions:** Add migration execution to deployment pipeline. Remove `db:push` from production scripts. Test migrations against a staging database before production.

---

### 3.5 Quality Assurance Systems

#### Unit testing system
- **Maturity score:** 2
- **Confidence:** High
- **Evidence basis:** Confirmed in code (9 test files, Vitest configured, 80% coverage threshold declared)
- **Status classification:** Partially implemented
- **Current state summary:** Vitest is configured with v8 coverage. Test files exist for: AgentCore deployment (2 files), intake engine (4 files: coverage, domains, model-selector, readiness), governance evaluator (1 file), SLA calculation (1 file), ABP utilities (1 file). Coverage threshold is set to 80% for lines and functions. However, 9 test files across 129 API routes and dozens of library modules means coverage is far below the declared threshold in practice.
- **What is working:** Critical business logic has tests (policy evaluation, intake readiness, model selection, AgentCore deployment). Test quality is good where it exists (e.g., deploy-route.test.ts is 320 lines with happy/failure paths).
- **What is missing or weak:** Vast majority of code untested. API route handlers have zero tests. Auth/middleware untested. React components untested. Coverage threshold is aspirational, not enforced.
- **Risks:** Regressions in untested code paths go undetected. The 80% threshold is a false signal of quality.
- **Recommended next actions:** Prioritize tests for API routes (especially auth, blueprints, governance). Enforce coverage in CI. Be honest about actual coverage level.

#### Integration testing system
- **Maturity score:** 0
- **Confidence:** High
- **Evidence basis:** Not evidenced
- **Status classification:** Missing
- **Current state summary:** No integration tests exist. No database integration tests. No API integration tests. No service-to-service integration tests.
- **What is working:** Nothing.
- **What is missing or weak:** Everything. The intake → generation → validation → review pipeline has no integration test.
- **Risks:** Individual units may pass but the pipeline may fail (as evidenced by the QA report finding blueprint generation broken).
- **Recommended next actions:** Create integration tests for the core pipeline: intake session → blueprint generation → governance validation → review decision.

#### End-to-end testing system
- **Maturity score:** 0
- **Confidence:** High
- **Evidence basis:** Not evidenced (no Playwright, Cypress, or Selenium configuration)
- **Status classification:** Missing
- **Current state summary:** No E2E test framework is installed or configured. The only E2E-like validation is a manual visual QA report (docs/qa/visual-qa-report-2026-04-04.md) which found 13 critical issues including broken core workflows.
- **What is working:** Manual QA was performed and documented (42 findings).
- **What is missing or weak:** No automated E2E tests. Manual QA is not repeatable or gated.
- **Risks:** Core user flows break silently. The manual QA report is already stale (one day old but issues not yet fixed).
- **Recommended next actions:** Install Playwright. Write E2E tests for: (1) intake → blueprint generation, (2) review workflow, (3) login and role-based access.

#### Contract / API compatibility testing
- **Maturity score:** 1
- **Confidence:** Medium
- **Evidence basis:** Confirmed in docs (docs/api/openapi.yaml exists)
- **Status classification:** Conceptual
- **Current state summary:** An OpenAPI spec exists (docs/api/openapi.yaml), which is a prerequisite for contract testing. However, no contract testing tool (Pact, Dredd, or similar) is configured. The spec may be stale relative to actual routes.
- **What is working:** OpenAPI spec documents API shape.
- **What is missing or weak:** No automated contract validation. No spec-to-implementation sync check.
- **Risks:** API changes can break consumers without detection. OpenAPI spec may drift from implementation.
- **Recommended next actions:** Add OpenAPI validation to CI (e.g., spectral linting). Consider Dredd or similar for contract testing.

#### Regression testing system
- **Maturity score:** 0
- **Confidence:** High
- **Evidence basis:** Not evidenced
- **Status classification:** Missing
- **Current state summary:** No regression test suite. No automated regression detection. The Vigil system detects TypeScript regressions (REGRESSIONS.md) but this is type-checking, not behavioral regression testing.
- **What is working:** Vigil catches TypeScript compile errors nightly.
- **What is missing or weak:** No behavioral regression tests. No regression suite run before deployment.
- **Risks:** Behavioral regressions ship to production undetected.
- **Recommended next actions:** Building CI with existing unit tests provides baseline regression detection. E2E tests provide behavioral regression coverage.

#### Performance and load testing
- **Maturity score:** 0
- **Confidence:** High
- **Evidence basis:** Not evidenced (no k6, Artillery, Locust, or similar)
- **Status classification:** Missing
- **Current state summary:** No load testing infrastructure. No performance benchmarks. No capacity planning data. Bundle size is tracked (3.4 MB documented in Session 83) but no runtime performance testing.
- **What is working:** Bundle size awareness exists.
- **What is missing or weak:** No load tests. No performance baselines. No capacity planning.
- **Risks:** Production performance under multi-tenant load is unknown. First real load could reveal bottlenecks.
- **Recommended next actions:** Defer until closer to production launch, but establish baseline performance benchmarks for critical endpoints (intake chat, blueprint generation, governance validation).

#### Security testing in pipeline
- **Maturity score:** 1
- **Confidence:** Medium
- **Evidence basis:** Confirmed in docs (Session 69 security audit, Vigil OWASP surface scan weekly)
- **Status classification:** Conceptual
- **Current state summary:** A one-time security audit was performed (Session 69, 7 findings, all resolved). Vigil runs a weekly OWASP surface scan. npm audit was run manually. However, none of this is in a CI pipeline. No SAST, DAST, or SCA tools are automated.
- **What is working:** Security awareness exists. Manual audit was thorough. Vigil provides periodic scanning.
- **What is missing or weak:** No automated security scanning in CI. No SAST/DAST. No dependency vulnerability alerts.
- **Risks:** New security vulnerabilities introduced by code changes go undetected until the next manual audit or Vigil scan.
- **Recommended next actions:** Add `npm audit` to CI. Enable GitHub Dependabot alerts. Consider adding a SAST tool.

#### Accessibility testing
- **Maturity score:** 2
- **Confidence:** Medium
- **Evidence basis:** Confirmed in code (skip links, 44px touch targets, sr-only announcements, scope="col" on tables)
- **Status classification:** Partially implemented
- **Current state summary:** Accessibility work has been done: skip links, screen reader announcements, touch target sizing, semantic table headers. A UX audit covered accessibility items. However, no automated accessibility testing (axe-core, pa11y) is configured.
- **What is working:** Manual accessibility improvements applied. WCAG 2.1 AA partial compliance.
- **What is missing or weak:** No automated a11y testing. No a11y CI gate. No comprehensive audit against full WCAG 2.1 AA checklist.
- **Risks:** Accessibility regressions possible without automated checking.
- **Recommended next actions:** Add axe-core to E2E tests. Add eslint-plugin-jsx-a11y to linting.

#### Cross-browser / device validation
- **Maturity score:** 0
- **Confidence:** High
- **Evidence basis:** Confirmed absent (QA report C-12: "Zero responsive breakpoints — unusable on tablets/mobile")
- **Status classification:** Missing
- **Current state summary:** No responsive design. No cross-browser testing. QA report explicitly confirms the application is unusable below 1024px.
- **What is working:** Nothing for non-desktop viewports.
- **What is missing or weak:** No responsive design. No cross-browser testing.
- **Risks:** Enterprise users on tablets or with accessibility zoom cannot use the platform.
- **Recommended next actions:** Implement responsive breakpoints before customer-facing launch.

---

### 3.6 Multi-Tenant Architecture Control Systems

#### Tenant identity and isolation model
- **Maturity score:** 2
- **Confidence:** Medium
- **Evidence basis:** Confirmed in code (enterpriseId on all major tables, enterpriseScope() helper, middleware header injection)
- **Status classification:** Partially implemented
- **Current state summary:** Every major table has an `enterpriseId` column with supporting indexes. Middleware injects `x-enterprise-id` from JWT. `enterpriseScope()` generates WHERE clause filters. `assertEnterpriseAccess()` validates resource ownership. However, isolation is enforced at the query level by developer discipline, not at a structural level (no Row-Level Security, no schema-per-tenant, no middleware rejection of cross-tenant requests).
- **What is working:** Consistent enterpriseId schema. Helper functions for scoping. Middleware header injection.
- **What is missing or weak:** No structural enforcement (PostgreSQL RLS, schema isolation). Relies on every route handler correctly using enterpriseScope(). A single missed filter leaks tenant data. No automated verification that all routes are scoped.
- **Risks:** A single developer mistake in a new route handler could expose cross-tenant data. As the codebase grows, maintaining consistent query-level isolation becomes harder.
- **Recommended next actions:** Implement PostgreSQL Row-Level Security (RLS) as a structural safety net. Alternatively, create an automated test that verifies all data-access routes include enterprise scoping.

#### Tenant provisioning and lifecycle management
- **Maturity score:** 0
- **Confidence:** High
- **Evidence basis:** Not evidenced (no provisioning API, no lifecycle management)
- **Status classification:** Missing
- **Current state summary:** No tenant provisioning workflow exists. Enterprises are created implicitly via SSO JIT provisioning (email domain matching) or manual database manipulation. No tenant activation, suspension, or deletion workflow. No tenant onboarding automation.
- **What is working:** SSO JIT provisioning creates users within enterprises.
- **What is missing or weak:** No API to create/activate/suspend/delete tenants. No onboarding automation. No self-service tenant setup.
- **Risks:** Cannot onboard new customers without manual database work. Cannot offboard or suspend a tenant programmatically.
- **Recommended next actions:** Build a tenant provisioning API (create, activate, suspend) as a prerequisite for customer onboarding.

#### Tenant configuration / entitlements management
- **Maturity score:** 2
- **Confidence:** Medium
- **Evidence basis:** Confirmed in code (enterprise_settings table with JSONB settings, SSO config, branding)
- **Status classification:** Partially implemented
- **Current state summary:** `enterprise_settings` table stores per-tenant configuration as JSONB (SSO settings, integrations, branding). Admin UI allows configuration updates. However, no entitlement system exists — no plan tiers, no feature gating, no usage-based entitlements.
- **What is working:** Per-tenant settings storage. Admin UI for configuration. SSO configuration per tenant.
- **What is missing or weak:** No entitlement model. No plan tiers. No feature gating per tenant.
- **Risks:** Cannot differentiate tenant capabilities. Cannot enforce plan limits.
- **Recommended next actions:** Design entitlement model before launching paid tiers.

#### Tenant-aware authorization and RBAC
- **Maturity score:** 3
- **Confidence:** Medium
- **Evidence basis:** Confirmed in code (5 roles: architect/reviewer/compliance_officer/admin/viewer, middleware route guards, requireAuth())
- **Status classification:** Implemented but immature
- **Current state summary:** Five roles with middleware-enforced route access. `requireAuth(allowedRoles?)` gates API routes. Route-level access map in middleware.ts. However, QA report C-10 found that direct URL access can bypass sidebar-based access control, indicating that some authorization is UI-level only, not server-enforced.
- **What is working:** Role-based middleware for major route groups. API route auth checks.
- **What is missing or weak:** C-10 vulnerability: some routes accessible by URL despite sidebar hiding them. No fine-grained permissions beyond role-based access. No permission matrix documented.
- **Risks:** Users can access restricted functionality via direct URL. Role granularity may be insufficient for enterprise needs.
- **Recommended next actions:** Fix C-10 by ensuring all routes enforce authorization server-side. Document a permission matrix.

#### Usage limits / quotas / throttling
- **Maturity score:** 1
- **Confidence:** High
- **Evidence basis:** Confirmed in code (rate-limit.ts with per-user sliding window, but no per-tenant quotas)
- **Status classification:** Conceptual
- **Current state summary:** Rate limiting exists per-user-per-endpoint (e.g., 10 generations/min). Uses Redis sorted sets (multi-instance safe) with in-memory fallback. However, rate limiting is per-user email, not per-enterprise. No tenant-level quotas for API calls, agent creation, storage, or AI token usage.
- **What is working:** Per-user rate limiting with Redis backend.
- **What is missing or weak:** No per-tenant quotas. No usage caps. No throttling at the enterprise level. One enterprise's heavy usage could impact others.
- **Risks:** A single tenant could consume disproportionate resources (especially AI API calls). No way to enforce plan-based limits.
- **Recommended next actions:** Add enterprise-level rate limiting. Design a quota system for AI token usage, agent count, and API calls.

#### Data partitioning and tenant boundary enforcement
- **Maturity score:** 2
- **Confidence:** Medium
- **Evidence basis:** Confirmed in code (query-level WHERE clauses, composite indexes on enterpriseId)
- **Status classification:** Partially implemented
- **Current state summary:** Tenant data is co-located in shared tables with enterpriseId-based filtering. Composite indexes support efficient tenant-scoped queries. However, no structural partition exists (no RLS, no schema isolation). Platform admin role bypasses all tenant filters.
- **What is working:** Consistent enterpriseId columns. Efficient indexing. Helper functions.
- **What is missing or weak:** No structural enforcement. Admin role is overly broad. No data export or tenant-specific backup capability.
- **Risks:** Cross-tenant data leakage via missed query filter. Admin access lacks granularity.
- **Recommended next actions:** Implement PostgreSQL RLS. Add audit logging for admin cross-tenant access.

#### Tenant-safe background job execution
- **Maturity score:** 2
- **Confidence:** Medium
- **Evidence basis:** Confirmed in code (cron routes accept optional enterpriseId parameter, governance drift iterates per-blueprint with correct scoping)
- **Status classification:** Partially implemented
- **Current state summary:** Cron jobs (6 configured) support optional enterprise scoping. Governance drift detection processes each blueprint with its own enterpriseId. However, job isolation is not enforced — a cron job failure for one tenant could affect processing for others. No job queue with tenant-aware scheduling. Fire-and-forget model means job failures are logged but not retried.
- **What is working:** Cron jobs are tenant-aware. Governance drift processes per-tenant correctly.
- **What is missing or weak:** No job queue infrastructure. No retry mechanism. No tenant-isolated job execution. Cron auth relies on bearer token only.
- **Risks:** A failing tenant's data could block or slow jobs for all tenants. CRON_SECRET compromise allows arbitrary cron execution.
- **Recommended next actions:** Add per-tenant error isolation in cron jobs. Consider a job queue (BullMQ, Inngest) for reliability.

#### Tenant-aware caching strategy
- **Maturity score:** 1
- **Confidence:** High
- **Evidence basis:** Confirmed in code (Redis optional, used only for rate limiting; React Query client-side caching)
- **Status classification:** Conceptual
- **Current state summary:** Redis is optionally used for rate limiting only. React Query provides client-side caching (per-user session, tenant-safe by nature). No server-side caching layer exists. No shared cache that could leak across tenants.
- **What is working:** No cross-tenant cache leakage risk (because no shared server cache exists).
- **What is missing or weak:** No server-side caching strategy. Performance under load may suffer without caching.
- **Risks:** Minimal risk currently (nothing to leak). Performance risk under load.
- **Recommended next actions:** Defer until performance data justifies caching. When implementing, ensure cache keys include enterpriseId.

#### Tenant-aware search / indexing controls
- **Maturity score:** 2
- **Confidence:** High
- **Evidence basis:** Confirmed in code (SQL queries with enterpriseId filters, denormalized search fields)
- **Status classification:** Partially implemented
- **Current state summary:** Search is SQL-based using denormalized fields (agent name, tags) with enterpriseId filtering. No dedicated search engine (Elasticsearch, Typesense). Search is naturally tenant-scoped because it runs through the same query-level filtering.
- **What is working:** Search is tenant-scoped by design. Adequate for current data volumes.
- **What is missing or weak:** No full-text search. No search indexing. May not scale to large tenant data volumes.
- **Risks:** Low risk currently. Scale risk if tenant data grows significantly.
- **Recommended next actions:** Defer. SQL-based search is adequate for MVP.

---

### 3.7 Data and Platform Systems

#### Primary database management system
- **Maturity score:** 3
- **Confidence:** Medium
- **Evidence basis:** Confirmed in code (PostgreSQL via Drizzle ORM, type-safe schema, 35+ migrations)
- **Status classification:** Implemented but immature
- **Current state summary:** PostgreSQL with Drizzle ORM provides a solid database layer. Schema is type-safe with TypeScript. 35+ versioned migrations track schema evolution. Connection pooling is limited (max 1 connection for serverless cost control). KB deployment guide references RDS PostgreSQL 14+ with Multi-AZ.
- **What is working:** Type-safe ORM. Versioned migrations. Schema well-designed with proper indexes.
- **What is missing or weak:** Single connection limit is a production bottleneck. No connection pooling (PgBouncer/Supavisor). Multi-AZ is documented but not confirmed operational.
- **Risks:** Single connection limit will fail under concurrent load. No confirmed production database hardening.
- **Recommended next actions:** Configure proper connection pooling for production. Verify Multi-AZ is active. Increase max connections.

#### Schema versioning and migration system
- **Maturity score:** 3
- **Confidence:** High
- **Evidence basis:** Confirmed in code (Drizzle Kit, 35+ migration files, migration npm scripts)
- **Status classification:** Implemented but immature
- **Current state summary:** Drizzle Kit generates and applies migrations. 35+ migrations exist covering the full schema evolution. ABP schema uses semantic versioning with on-read migration for backward compatibility. However, no migration rollback strategy. No migration testing. `db:push` command exists (dangerous for production).
- **What is working:** Versioned, sequential migrations. Semantic versioning for ABP schema. On-read migration for backward compatibility.
- **What is missing or weak:** No rollback migrations. No migration testing before production. Dangerous `db:push` command available.
- **Risks:** A destructive migration could be irreversible. Schema changes are not validated before production.
- **Recommended next actions:** Add down migrations for all new migrations. Test migrations against staging before production. Remove or gate `db:push` for production.

#### Backup and restore system
- **Maturity score:** 1
- **Confidence:** Medium
- **Evidence basis:** Confirmed in docs (KB articles on backup-recovery.md, backup-schedule.md) but not confirmed operational
- **Status classification:** Planned only
- **Current state summary:** KB articles document backup procedures and schedule guidance. S3 integration exists for artifact storage. However, no automated backup is configured, no backup verification, no restore drill documented. RDS automated backups may be active (standard AWS default) but not confirmed.
- **What is working:** Documentation exists. S3 available for artifact backup.
- **What is missing or weak:** No confirmed automated backup. No restore testing. No backup verification. No point-in-time recovery validation.
- **Risks:** Data loss in a failure scenario with no verified recovery path. "Documented but not tested" backup is equivalent to no backup.
- **Recommended next actions:** Confirm RDS automated backups are active. Run a restore drill. Document and test the full recovery procedure.

#### Disaster recovery and business continuity system
- **Maturity score:** 0
- **Confidence:** High
- **Evidence basis:** Not evidenced
- **Status classification:** Missing
- **Current state summary:** No DR plan. No RPO/RTO targets defined. No cross-region failover. KB deployment guide mentions Multi-AZ (single-region HA) but no DR strategy.
- **What is working:** Nothing.
- **What is missing or weak:** Everything — no DR plan, no RPO/RTO, no cross-region capability.
- **Risks:** A regional AWS outage could cause extended downtime with unknown data loss.
- **Recommended next actions:** Define RPO/RTO targets. Document DR plan. This can be deferred for early MVP but must be addressed before enterprise customers commit.

#### Data retention and archival controls
- **Maturity score:** 1
- **Confidence:** Medium
- **Evidence basis:** Inferred from patterns (audit_log is append-only, telemetry has 24h/30d windows, no formal retention policy)
- **Status classification:** Conceptual
- **Current state summary:** Audit log is append-only (good). Telemetry uses rolling windows (24h error rates, 30d snapshots). However, no formal data retention policy. No data archival process. No data purging for compliance (GDPR right to erasure).
- **What is working:** Audit trail preservation. Telemetry windowing.
- **What is missing or weak:** No formal retention policy. No archival. No GDPR erasure capability.
- **Risks:** Unbounded data growth. Compliance risk for GDPR-regulated tenants.
- **Recommended next actions:** Define retention policy. Implement archival for audit logs beyond retention period.

#### Audit logging and data lineage
- **Maturity score:** 3
- **Confidence:** Medium
- **Evidence basis:** Confirmed in code (append-only audit_log table, writeAuditLog(), 30+ event types, blueprint lineage with previousBlueprintId)
- **Status classification:** Implemented but immature
- **Current state summary:** Comprehensive audit logging: append-only table, enterprise-scoped, tracks actor/action/entity/state transitions/metadata. Blueprint lineage tracks version chain (previousBlueprintId, governanceDiff). Event bus dispatches to notifications/webhooks/monitoring. However, audit log has no tamper detection (no hash chain), no export capability for compliance, no retention management.
- **What is working:** Consistent audit trail. Blueprint lineage. Event-driven dispatch. Enterprise scoping.
- **What is missing or weak:** No tamper detection. No export for compliance auditors. No retention management.
- **Risks:** Audit trail is trustworthy only if database access is controlled. No evidence of database access restriction.
- **Recommended next actions:** Add audit log export for compliance. Consider hash chaining for tamper detection. Restrict direct database access.

#### Analytics / warehouse pipeline
- **Maturity score:** 1
- **Confidence:** Medium
- **Evidence basis:** Confirmed in code (systemHealthSnapshots, portfolioSnapshots, quality trends — all in-app SQL aggregation)
- **Status classification:** Scaffolded
- **Current state summary:** In-app analytics via cron jobs: quality trends (weekly), portfolio snapshots (weekly), system health snapshots (periodic). Intelligence briefings generated by AI. All stored in PostgreSQL. No data warehouse, no ETL pipeline, no analytics tool (Metabase, Looker, etc.).
- **What is working:** Periodic metric aggregation. Health scoring. AI-powered briefings.
- **What is missing or weak:** No data warehouse. No ETL. No external analytics tool. In-app analytics queries compete with transactional workload.
- **Risks:** Analytics queries on production database can impact performance. No historical trend analysis beyond snapshot retention.
- **Recommended next actions:** Defer data warehouse. Current in-app analytics adequate for MVP. Separate analytics queries to read replica when load increases.

#### Master data and reference data management
- **Maturity score:** 2
- **Confidence:** Medium
- **Evidence basis:** Confirmed in code (policy templates, workflow templates, regulatory framework classifiers)
- **Status classification:** Partially implemented
- **Current state summary:** Reference data includes: policy templates (common governance patterns), workflow templates (6 orchestration patterns), regulatory classifiers (EU AI Act, SR 11-7, NIST AI RMF). Glossary defines canonical terms. However, no formal MDM system. Reference data is hardcoded in TypeScript, not configurable.
- **What is working:** Regulatory frameworks well-modeled. Policy templates available. Glossary enforced.
- **What is missing or weak:** Reference data is code, not configuration. No admin UI to manage reference data. No versioning for reference data changes.
- **Risks:** Reference data changes require code deployments.
- **Recommended next actions:** Low priority. Acceptable for MVP. Consider admin-configurable reference data for enterprise customization later.

---

### 3.8 Observability and Reliability Systems

#### Centralized logging
- **Maturity score:** 1
- **Confidence:** High
- **Evidence basis:** Inferred from patterns (console.log/error in code, Vercel provides log tailing, no structured logging library)
- **Status classification:** Conceptual
- **Current state summary:** Application uses console.log/console.error. Vercel provides log tailing and search for serverless function execution. No structured logging library (winston, pino). No log aggregation service (Datadog, ELK, CloudWatch Logs). Request ID is propagated (good) but not consistently included in log output.
- **What is working:** Request ID propagation exists. Vercel provides basic log access.
- **What is missing or weak:** No structured logging. No log aggregation. No log retention beyond Vercel defaults. No log-based alerting.
- **Risks:** Debugging production issues requires Vercel dashboard access. No correlation between requests. Logs may be lost after Vercel retention period.
- **Recommended next actions:** Add structured logging (pino recommended for Next.js). Ship logs to a centralized service.

#### Metrics and monitoring
- **Maturity score:** 1
- **Confidence:** Medium
- **Evidence basis:** Confirmed in code (in-app health snapshots, quality metrics, but no external metrics system)
- **Status classification:** Scaffolded
- **Current state summary:** In-app monitoring via cron jobs collects quality metrics, health snapshots, and anomaly detection. AWS CloudWatch SDK is a dependency. However, no external metrics dashboard (Grafana, Datadog, CloudWatch dashboards) is configured. No application metrics (request latency, error rates, throughput) are exported.
- **What is working:** In-app business metrics (quality index, blueprint validity rate, SLA compliance). Anomaly detection with thresholds.
- **What is missing or weak:** No application performance metrics. No infrastructure metrics. No dashboards. CloudWatch SDK present but not configured for custom metrics export.
- **Risks:** Cannot detect infrastructure issues (CPU, memory, database connections). No visibility into application performance.
- **Recommended next actions:** Configure Vercel Analytics (built-in). Add CloudWatch custom metrics for critical paths. Create at least one dashboard.

#### Distributed tracing
- **Maturity score:** 1
- **Confidence:** High
- **Evidence basis:** Confirmed in code (x-request-id propagation in middleware)
- **Status classification:** Conceptual
- **Current state summary:** Request ID is generated/forwarded on every request via middleware. This is the foundation for tracing but no tracing system (OpenTelemetry, Jaeger, X-Ray) is integrated. No span creation. No trace visualization.
- **What is working:** Request ID propagation — the prerequisite for tracing.
- **What is missing or weak:** No tracing system. No span instrumentation. No trace visualization.
- **Risks:** Cannot trace a request through the intake → generation → validation → review pipeline. Debugging complex failures requires log correlation by request ID (tedious).
- **Recommended next actions:** Defer full tracing. Request ID is sufficient for MVP if structured logging is added.

#### Alerting and incident detection
- **Maturity score:** 2
- **Confidence:** Medium
- **Evidence basis:** Confirmed in code (anomaly-detector.ts with threshold-based alerts, cron/alert-check daily, notifications to compliance officers)
- **Status classification:** Partially implemented
- **Current state summary:** In-app anomaly detection monitors: blueprint validity rate drops, quality index declines, webhook success rate, review queue depth. Alerts dispatched to compliance officers and admins via in-app notifications. Daily cron checks alert conditions. However, no external alerting (PagerDuty, OpsGenie, email-on-critical). No infrastructure alerting. Alerts are business-metric focused, not operational.
- **What is working:** Business metric anomaly detection. Automated daily checks. In-app notification delivery.
- **What is missing or weak:** No infrastructure alerting. No external notification (PagerDuty). No escalation paths. No on-call integration.
- **Risks:** Infrastructure failures go undetected until users report them. Business alerts have no escalation beyond in-app notifications.
- **Recommended next actions:** Add external alerting for critical failures (email at minimum). Integrate with an on-call system before production launch.

#### Incident response and on-call system
- **Maturity score:** 0
- **Confidence:** High
- **Evidence basis:** Not evidenced
- **Status classification:** Missing
- **Current state summary:** No incident response process. No on-call rotation. No runbooks. No status page. No incident communication templates.
- **What is working:** Nothing.
- **What is missing or weak:** Everything.
- **Risks:** When (not if) a production incident occurs, there is no structured response.
- **Recommended next actions:** Create basic incident response runbook. Define escalation paths. Set up a status page (even a simple one).

#### Error tracking
- **Maturity score:** 1
- **Confidence:** High
- **Evidence basis:** Confirmed in code (error-boundary.tsx for React, try/catch in API routes, but no error tracking service)
- **Status classification:** Conceptual
- **Current state summary:** React error boundary catches UI crashes. API routes use try/catch with structured error responses. However, no error tracking service (Sentry, Bugsnag) is integrated. Errors are logged to console only.
- **What is working:** Error boundaries prevent blank screens. Structured error responses from API.
- **What is missing or weak:** No error aggregation. No error trends. No alerting on error spikes. No stack trace collection in production.
- **Risks:** Production errors are invisible unless users report them.
- **Recommended next actions:** Integrate Sentry or equivalent. This is a high-value, low-effort improvement.

#### SLO / SLA / error budget system
- **Maturity score:** 1
- **Confidence:** Medium
- **Evidence basis:** Confirmed in code (SLA review thresholds: WARN 48h, ALERT 72h; SLA calculation in lib/sla/; no external SLO system)
- **Status classification:** Scaffolded
- **Current state summary:** Internal SLA tracking for review turnaround time (configurable thresholds). SLA compliance rate computed in health snapshots. However, no customer-facing SLA. No SLO definitions for availability, latency, or error rates. No error budget tracking.
- **What is working:** Review SLA tracking with configurable thresholds.
- **What is missing or weak:** No availability SLO. No latency SLO. No error budget. No customer-facing commitments.
- **Risks:** Cannot make or measure availability commitments to customers.
- **Recommended next actions:** Define internal SLOs for availability and latency before customer launch.

#### Root cause analysis and postmortem process
- **Maturity score:** 0
- **Confidence:** High
- **Evidence basis:** Not evidenced
- **Status classification:** Missing
- **Risks:** Incidents repeat because lessons are not captured.
- **Recommended next actions:** Create a postmortem template. Commit to writing postmortems for any incident.

#### Capacity and cost monitoring
- **Maturity score:** 0
- **Confidence:** High
- **Evidence basis:** Not evidenced
- **Status classification:** Missing
- **Risks:** Resource exhaustion or cost surprises under load.
- **Recommended next actions:** Defer. Monitor Vercel usage dashboard. Set AWS budget alerts.

---

### 3.9 Security and Compliance Systems

#### Identity and access management for internal teams
- **Maturity score:** 1
- **Confidence:** Medium
- **Evidence basis:** Inferred (GitHub access for one user, Vercel dashboard access — no formal IAM)
- **Status classification:** Ad hoc
- **Current state summary:** Single developer with direct access to everything. No formal team IAM. No separation of duties between development and operations.
- **What is working:** Simple by default (one person = no access control conflicts).
- **What is missing or weak:** No team IAM. No access reviews. No separation of duties. No MFA requirement documented.
- **Risks:** When team grows, access management starts from zero.
- **Recommended next actions:** Enable MFA on GitHub and Vercel. Document access policies before adding team members.

#### Customer authentication system
- **Maturity score:** 2
- **Confidence:** Medium
- **Evidence basis:** Confirmed in code (NextAuth v5 beta, credentials + OIDC SSO, JWT 8-hour sessions, bcrypt passwords)
- **Status classification:** Partially implemented
- **Current state summary:** NextAuth v5 (beta.30) provides credentials and OIDC SSO. JWT sessions with 8-hour expiry (financial services standard). bcrypt password hashing. JIT provisioning on SSO sign-in. Remember-me extends to 30 days. However, NextAuth is on a beta version. No MFA support. Password policy not enforced in code. No account lockout after failed attempts (only rate limiting on forgot-password).
- **What is working:** Dual auth (credentials + SSO). JWT session management. bcrypt hashing. JIT provisioning.
- **What is missing or weak:** Beta auth library. No MFA. No password policy enforcement. No account lockout. No session invalidation on password change.
- **Risks:** Beta library may have undiscovered vulnerabilities or breaking changes. No MFA for an enterprise platform is a significant security gap.
- **Recommended next actions:** Plan migration to NextAuth stable. Implement MFA. Add password complexity requirements. Add account lockout.

#### Authorization and permission governance
- **Maturity score:** 2
- **Confidence:** Medium
- **Evidence basis:** Confirmed in code (5 roles, middleware route guards, QA found URL bypass C-10)
- **Status classification:** Partially implemented
- **Current state summary:** Five roles (architect, reviewer, compliance_officer, admin, viewer) with middleware enforcement. Route-level access control defined in middleware.ts. API routes use requireAuth(). However, QA report C-10 found routes accessible via direct URL that should be restricted. No fine-grained permissions. No permission documentation.
- **What is working:** Role-based access for major route groups. API auth enforcement.
- **What is missing or weak:** URL bypass vulnerability. No fine-grained permissions. No permission matrix. No permission audit trail.
- **Risks:** Users accessing unauthorized functionality via URL. Insufficient granularity for enterprise customers who need custom role definitions.
- **Recommended next actions:** Fix C-10 URL bypass. Document permission matrix. Consider ABAC for fine-grained control.

#### Encryption key management
- **Maturity score:** 1
- **Confidence:** Medium
- **Evidence basis:** Confirmed in code (AUTH_SECRET for JWT, bcrypt for passwords, HMAC-SHA256 for webhooks, TLS assumed)
- **Status classification:** Conceptual
- **Current state summary:** Keys exist (AUTH_SECRET, API key hashes, webhook HMAC secrets) but are managed as environment variables. No key rotation automation. No dedicated KMS (AWS KMS, Vault). No encryption at rest beyond database defaults.
- **What is working:** Secrets externalized. HMAC signing implemented. Webhook secret rotation API exists.
- **What is missing or weak:** No KMS. No key rotation automation. No encryption at rest verification. No key access audit.
- **Risks:** Key compromise has no automated remediation. No evidence of database encryption at rest.
- **Recommended next actions:** Verify RDS encryption at rest is enabled. Plan KMS integration for production.

#### Vulnerability scanning and patch management
- **Maturity score:** 1
- **Confidence:** Medium
- **Evidence basis:** Confirmed in docs (Session 69 security audit, Vigil OWASP scan, manual npm audit)
- **Status classification:** Conceptual
- **Current state summary:** One-time security audit (7 findings, all resolved). Vigil runs weekly OWASP surface scan. npm audit performed manually. Deferred CVEs in esbuild and drizzle-kit. No automated scanning in CI. No Dependabot/Renovate.
- **What is working:** Security awareness. One-time audit was thorough.
- **What is missing or weak:** No continuous vulnerability scanning. No automated dependency updates. Deferred CVEs.
- **Risks:** New vulnerabilities in dependencies go undetected between manual audits.
- **Recommended next actions:** Enable GitHub Dependabot. Add npm audit to CI.

#### Security event monitoring
- **Maturity score:** 1
- **Confidence:** Medium
- **Evidence basis:** Confirmed in code (audit log captures auth events, rate limiting on auth endpoints)
- **Status classification:** Scaffolded
- **Current state summary:** Audit log captures authentication events. Rate limiting on password reset (5 req/hr) and password recovery (10 req/hr). SSRF prevention on webhook URLs. However, no security-specific monitoring. No brute force detection beyond rate limiting. No anomalous access pattern detection.
- **What is working:** Rate limiting on auth endpoints. SSRF prevention. Audit trail.
- **What is missing or weak:** No security event monitoring service. No brute force detection. No anomalous access alerting.
- **Risks:** Sophisticated attacks (credential stuffing, slow brute force) would go undetected.
- **Recommended next actions:** Add failed login monitoring. Alert on unusual access patterns.

#### Secure SDLC controls
- **Maturity score:** 1
- **Confidence:** High
- **Evidence basis:** Confirmed in docs (security audit performed, CSP headers, security hardening commits)
- **Status classification:** Conceptual
- **Current state summary:** CSP headers configured. Security headers (HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy). One security audit performed. However, no SAST/DAST in pipeline (no pipeline exists). No code review. No security-focused testing.
- **What is working:** Security headers. CSP. Hardening applied where identified.
- **What is missing or weak:** No automated security scanning in development workflow. No code review. No threat modeling.
- **Risks:** Security vulnerabilities introduced by new code are only caught by periodic manual audits.
- **Recommended next actions:** Add security scanning to CI when CI is established.

#### Compliance evidence collection
- **Maturity score:** 2
- **Confidence:** Medium
- **Evidence basis:** Confirmed in code (regulatory classifier, SR 11-7 mapping, EU AI Act readiness, compliance evidence export)
- **Status classification:** Partially implemented
- **Current state summary:** Deterministic compliance classification against EU AI Act, SR 11-7, and NIST AI RMF. Evidence status mapping (satisfied/partial/missing/not_applicable). Compliance dashboard in UI. Evidence export functionality. However, this is for the agents managed by the platform — not for the platform's own compliance. No SOC 2 evidence collection for Intellios itself.
- **What is working:** Agent compliance classification is sophisticated. Regulatory framework mapping is thorough. Evidence export exists.
- **What is missing or weak:** No platform-level compliance evidence. No SOC 2 controls. No compliance certification.
- **Risks:** Enterprise customers will require SOC 2 or equivalent for the platform itself, not just for the agents it manages.
- **Recommended next actions:** Begin SOC 2 Type I preparation. Map existing controls (audit log, RBAC, encryption) to SOC 2 criteria.

#### Privacy, consent, and data handling controls
- **Maturity score:** 1
- **Confidence:** Medium
- **Evidence basis:** Confirmed in code (PII redaction config in audit, dataSensitivity classification in intake, but no operational GDPR controls)
- **Status classification:** Conceptual
- **Current state summary:** Intake captures data sensitivity level (public/internal/confidential/pii/regulated). Audit config supports PII redaction setting. However, no data subject access request (DSAR) capability. No consent management. No data deletion capability. No privacy impact assessment.
- **What is working:** Data sensitivity awareness in the model. PII redaction configuration.
- **What is missing or weak:** No GDPR DSAR handling. No consent management. No data deletion. No privacy policy enforcement.
- **Risks:** Non-compliant for GDPR-regulated tenants. Data deletion requests cannot be fulfilled.
- **Recommended next actions:** Implement tenant data export and deletion. Create DSAR handling process.

#### Vendor / third-party risk controls
- **Maturity score:** 0
- **Confidence:** High
- **Evidence basis:** Not evidenced
- **Status classification:** Missing
- **Current state summary:** Critical dependencies on Anthropic (AI), Vercel (hosting), AWS (deployment), Resend (email). No vendor risk assessment documented. No vendor dependency documentation.
- **Risks:** Single-vendor dependencies with no fallback. Anthropic API outage = platform unusable.
- **Recommended next actions:** Document vendor dependencies and criticality. Identify fallback options for critical vendors.

---

### 3.10 API and Integration Systems

#### API gateway / service routing
- **Maturity score:** 2
- **Confidence:** Medium
- **Evidence basis:** Confirmed in code (Next.js API routes with middleware, 129 routes across 19 domains)
- **Status classification:** Partially implemented
- **Current state summary:** Next.js middleware serves as a lightweight API gateway: authentication, authorization, request ID injection, route-level access control. No dedicated API gateway (Kong, AWS API Gateway). API routes are collocated with the application.
- **What is working:** Middleware provides consistent auth and tenant scoping. Route organization is clear.
- **What is missing or weak:** No dedicated API gateway. No API analytics. No global rate limiting at the gateway level.
- **Risks:** Cannot independently scale or protect the API layer. No global rate limiting.
- **Recommended next actions:** Adequate for MVP. Consider API gateway when API becomes public-facing.

#### API versioning and lifecycle management
- **Maturity score:** 1
- **Confidence:** High
- **Evidence basis:** Confirmed in code (no API versioning scheme visible, OpenAPI spec exists)
- **Status classification:** Conceptual
- **Current state summary:** 129 API routes with no versioning scheme. No /v1/ prefix. No version headers. OpenAPI spec exists but may not be versioned. API key management supports scopes but not version pinning.
- **What is working:** OpenAPI spec documents current API shape. API keys exist.
- **What is missing or weak:** No API versioning. Breaking changes affect all consumers immediately. No deprecation process.
- **Risks:** API changes break integrations with no warning or migration path.
- **Recommended next actions:** Add /v1/ prefix to API routes before external consumers integrate.

#### Webhook management
- **Maturity score:** 3
- **Confidence:** Medium
- **Evidence basis:** Confirmed in code (webhook CRUD, HMAC-SHA256 signing, SSRF prevention, delivery logging, secret rotation, 3-retry delivery)
- **Status classification:** Implemented but immature
- **Current state summary:** Enterprise-scoped webhooks with HMAC-SHA256 signing. SSRF prevention (RFC 1918 block). Delivery logging (status, response code, response body excerpt, attempts). Secret rotation API. 3-attempt retry. However, fire-and-forget delivery — no dead letter queue. No webhook delivery dashboard. Retry is within a single request, not queued.
- **What is working:** Signing, SSRF prevention, logging, rotation — solid security model.
- **What is missing or weak:** No dead letter queue. No queued retry. No delivery dashboard. All retries happen synchronously.
- **Risks:** Failed webhooks after 3 attempts are permanently lost. No visibility into delivery success rates beyond health snapshots.
- **Recommended next actions:** Add a dead letter queue for failed deliveries. Consider async retry with exponential backoff.

#### Integration sandbox / test harness
- **Maturity score:** 2
- **Confidence:** Medium
- **Evidence basis:** Confirmed in code (API key prefix ik_test_ for test environment, blueprint test harness with Claude-as-judge)
- **Status classification:** Partially implemented
- **Current state summary:** API keys support test (ik_test_) vs production (ik_live_) prefix. Blueprint test harness allows running test cases against agents with Claude-as-judge evaluation. However, no isolated sandbox environment for API testing. Test vs live keys don't route to different backends.
- **What is working:** Test key concept exists. Blueprint testing with Claude-as-judge.
- **What is missing or weak:** No sandbox environment. Test/live key distinction is not operationalized.
- **Risks:** Test API calls hit the same database and resources as production.
- **Recommended next actions:** Defer sandbox environment. Operationalize test key isolation when environment separation exists.

#### Rate limiting and abuse protection
- **Maturity score:** 2
- **Confidence:** Medium
- **Evidence basis:** Confirmed in code (sliding window rate limiter, Redis-backed, per-endpoint limits, auth endpoint hardening)
- **Status classification:** Partially implemented
- **Current state summary:** Sliding window rate limiting with Redis (multi-instance safe) and in-memory fallback. Applied to auth endpoints and AI generation endpoints. 429 responses with Retry-After. However, not applied to all endpoints. No per-tenant rate limiting. No IP-based global rate limiting. No abuse detection beyond rate limits.
- **What is working:** Rate limiting infrastructure is solid. Auth endpoints protected. AI endpoints protected.
- **What is missing or weak:** Incomplete endpoint coverage. No tenant-level limits. No global IP rate limiting. No abuse detection patterns.
- **Risks:** Unprotected endpoints vulnerable to abuse. Single tenant can consume disproportionate resources.
- **Recommended next actions:** Apply rate limiting to all public API endpoints. Add per-tenant limits for AI operations.

#### Contract governance for internal and external APIs
- **Maturity score:** 1
- **Confidence:** Medium
- **Evidence basis:** Confirmed in docs (OpenAPI spec exists, Zod validation on inputs)
- **Status classification:** Conceptual
- **Current state summary:** OpenAPI spec documents API shape. Zod validates request inputs at the route level. However, no automated contract validation. No breaking change detection. No API review process.
- **What is working:** Zod input validation. OpenAPI documentation.
- **What is missing or weak:** No automated contract testing. No breaking change detection. No API review process.
- **Risks:** API changes break consumers without detection.
- **Recommended next actions:** Add OpenAPI spec validation to CI when CI exists.

---

### 3.11 Operational SaaS Business Systems

#### Subscription and billing system
- **Maturity score:** 0
- **Confidence:** High
- **Evidence basis:** Not evidenced
- **Status classification:** Missing

#### Entitlement / plan management
- **Maturity score:** 0
- **Confidence:** High
- **Evidence basis:** Not evidenced
- **Status classification:** Missing

#### Customer onboarding and tenant activation
- **Maturity score:** 0
- **Confidence:** High
- **Evidence basis:** Not evidenced (no provisioning API, no onboarding workflow)
- **Status classification:** Missing

#### Support and ticketing system
- **Maturity score:** 0
- **Confidence:** High
- **Evidence basis:** Not evidenced (KB has escalation-paths.md but no support system)
- **Status classification:** Missing

#### Customer communication / status update system
- **Maturity score:** 0
- **Confidence:** High
- **Evidence basis:** Not evidenced (no status page, no communication templates)
- **Status classification:** Missing

#### Churn / health monitoring
- **Maturity score:** 0
- **Confidence:** High
- **Evidence basis:** Not evidenced
- **Status classification:** Missing

#### Usage metering
- **Maturity score:** 1
- **Confidence:** Medium
- **Evidence basis:** Confirmed in code (telemetry tables, invocation counts, but no usage-based billing)
- **Status classification:** Scaffolded
- **Current state summary:** Telemetry tracks agent invocations, error rates, and latency. Blueprint generation counts are tracked. However, no usage metering for billing purposes. No per-tenant usage dashboards for customers.
- **What is working:** Basic telemetry exists.
- **What is missing or weak:** No billing-ready usage metering. No customer-facing usage reporting.

#### CRM / customer success workflow integration
- **Maturity score:** 0
- **Confidence:** High
- **Evidence basis:** Not evidenced
- **Status classification:** Missing

**Section summary:** Operational SaaS business systems are almost entirely absent. This is expected for a pre-revenue platform but represents a significant gap before commercial launch. Average score: 0.1.

---

### 3.12 Governance Systems

**Important distinction:** This section assesses governance of the development process and platform operations — not the product's agent governance engine (which is a product feature, scored under Multi-Tenant Architecture and API/Integration). The product governance engine is strong; the platform development governance is not.

#### Architecture review and decision record system
- **Maturity score:** 4
- **Confidence:** High
- **Evidence basis:** Confirmed in docs (11 accepted ADRs, decision template, index, CLAUDE.md mandates ADRs)
- **Status classification:** Operational
- **Current state summary:** 11 ADRs accepted, each following a consistent template (context, decision, consequences, alternatives). ADR index maintained. CLAUDE.md mandates recording new decisions before implementation. Template available. This is one of the strongest systems in the project.
- **What is working:** Consistent ADR practice. Good rationale documentation. Alternatives captured. Status tracking.
- **What is missing or weak:** ADRs after Session 87 may be missing (ADR-012 is proposed but not accepted). No team review process for ADRs (single author).
- **Risks:** Decision discipline may weaken under time pressure or with more contributors.
- **Recommended next actions:** Ensure recent decisions (workflow orchestration, ABP v1.3.0) have ADRs. Establish review process for ADRs when team grows.

#### Risk and dependency tracking
- **Maturity score:** 2
- **Confidence:** Medium
- **Evidence basis:** Confirmed in docs (open-questions.md with resolution tracking, ADRs capture trade-offs)
- **Status classification:** Partially implemented
- **Current state summary:** Open questions tracked with resolution status. ADRs capture trade-offs and known limitations. However, no formal risk register. No dependency tracking for external systems. No risk scoring or prioritization.
- **What is working:** Open questions resolved systematically. Trade-offs documented in ADRs.
- **What is missing or weak:** No formal risk register. No dependency tracking. No risk scoring.
- **Risks:** Risks are scattered across documents rather than centralized.
- **Recommended next actions:** Create a lightweight risk register. Document external dependency risks.

#### Policy management and control enforcement
- **Maturity score:** 3
- **Confidence:** Medium
- **Evidence basis:** Confirmed in code (governance policy engine, 14 operators, per-agent scoping, validation gating)
- **Status classification:** Implemented but immature
- **Current state summary:** Policy management is a core product capability: CRUD for policies, 14 rule operators, per-agent scoping, error/warning severity, validation gates draft→in_review. Policy versioning with immutable history. However, this governs the product's agents, not the platform's own development policies.
- **What is working:** Sophisticated policy engine for the product. Immutable policy versioning.
- **What is missing or weak:** No development governance policies (release approval, change control). Product governance ≠ development governance.
- **Risks:** Conflating product governance with platform governance. The platform itself lacks governance controls.
- **Recommended next actions:** Distinguish product governance from development governance. Establish development governance controls.

#### Data governance
- **Maturity score:** 1
- **Confidence:** Medium
- **Evidence basis:** Confirmed in code (data classification in intake, tenant scoping, but no formal data governance)
- **Status classification:** Conceptual
- **Current state summary:** Data sensitivity classification exists (public/internal/confidential/pii/regulated). Tenant scoping partitions data. However, no data catalog, no data lineage beyond blueprint versioning, no data quality monitoring, no data classification enforcement.
- **What is working:** Data sensitivity awareness. Tenant partitioning.
- **What is missing or weak:** No data catalog. No data quality monitoring. No classification enforcement.
- **Risks:** Data handling may not match declared sensitivity levels.
- **Recommended next actions:** Defer formal data governance. Ensure data handling matches declared sensitivity in code.

#### Release approval workflow for higher-risk changes
- **Maturity score:** 0
- **Confidence:** High
- **Evidence basis:** Not evidenced
- **Status classification:** Missing
- **Current state summary:** No release approval workflow. All changes deploy automatically on push to main. No approval gate for database migrations, security changes, or tenant-impacting modifications.
- **Risks:** High-risk changes deploy without review or approval.
- **Recommended next actions:** Add manual approval step in deployment pipeline for production deployments (Vercel supports deployment protection).

#### Portfolio / initiative management
- **Maturity score:** 2
- **Confidence:** Medium
- **Evidence basis:** Confirmed in docs (roadmap.md with phase tracking, portfolio snapshots in product)
- **Status classification:** Partially implemented
- **Current state summary:** Roadmap tracks phases and initiatives. In-product portfolio analytics track agent fleet health. However, no formal portfolio management tool. Single-person initiative management.
- **What is working:** Roadmap provides initiative tracking. In-product portfolio analytics.
- **What is missing or weak:** No multi-stakeholder portfolio management. Single author.
- **Risks:** Initiative planning reflects one perspective.
- **Recommended next actions:** Adequate for current stage.

#### Access review and segregation of duties
- **Maturity score:** 0
- **Confidence:** High
- **Evidence basis:** Not evidenced (single contributor, no access reviews)
- **Status classification:** Missing
- **What is missing or weak:** No access reviews. No segregation of duties. One person has all access.
- **Risks:** No checks on access. No separation between development and operations.
- **Recommended next actions:** Establish when team grows beyond 1 person.

---

### 3.13 Developer Productivity Systems

#### Internal developer portal or service catalog
- **Maturity score:** 1
- **Confidence:** Medium
- **Evidence basis:** Confirmed in docs (KB getting-started section, CLAUDE.md as developer guide)
- **Status classification:** Scaffolded
- **Current state summary:** KB has an engineer setup guide. CLAUDE.md serves as a development guide. No Backstage, Port, or equivalent developer portal.
- **What is working:** Onboarding documentation exists. Development conventions documented.
- **What is missing or weak:** No service catalog. No self-service developer portal.
- **Risks:** Low — single developer currently.
- **Recommended next actions:** Defer. CLAUDE.md and KB are sufficient for now.

#### Reusable templates / scaffolding
- **Maturity score:** 2
- **Confidence:** Medium
- **Evidence basis:** Confirmed in code (ADR template, KB templates, policy templates, workflow templates)
- **Status classification:** Partially implemented
- **Current state summary:** ADR template for decision records. KB has 5 article templates (concept, decision-guide, reference, task, troubleshooting). Policy templates for common governance patterns. Workflow templates (6 orchestration patterns). However, no code scaffolding tool (plop, hygen). No API route template.
- **What is working:** Documentation templates well-maintained. Governance templates useful.
- **What is missing or weak:** No code scaffolding. No route/component generation templates.
- **Risks:** Low — templates support documentation and governance well.
- **Recommended next actions:** Low priority.

#### Shared component library
- **Maturity score:** 4
- **Confidence:** High
- **Evidence basis:** Confirmed in code (Catalyst UI Kit, 27 components, barrel export, consistent usage across app)
- **Status classification:** Operational
- **Current state summary:** Catalyst UI Kit with 27 TypeScript components provides a comprehensive, consistent component library. Barrel export for easy importing. Components used consistently across the application. Design tokens established. Status theme centralized. Dark mode supported. This is one of the strongest systems.
- **What is working:** Comprehensive component set. Consistent usage. Design tokens. Dark mode. Accessibility.
- **What is missing or weak:** No visual component documentation (Storybook). No visual regression testing. Responsive design absent.
- **Risks:** Components lack responsive variants. No Storybook means discoverability relies on code reading.
- **Recommended next actions:** Consider Storybook for component documentation and visual testing.

#### Internal tooling / automation scripts
- **Maturity score:** 3
- **Confidence:** Medium
- **Evidence basis:** Confirmed in code (Vigil scan system, seed scripts, KB validation script, npm scripts)
- **Status classification:** Implemented but immature
- **Current state summary:** Vigil provides automated quality scanning (TypeScript audit, dead code, spec drift, OWASP surface scan, test gaps). Seed scripts for demo data. KB has cross-reference validation script. npm scripts for common operations. However, Vigil is a documentation-based scan system (Claude Code scheduled tasks), not a CI-integrated pipeline.
- **What is working:** Vigil scans are sophisticated and well-designed. Seed scripts are idempotent. Validation scripts exist.
- **What is missing or weak:** Vigil findings are not gated in any pipeline. Automation is advisory, not enforced.
- **Risks:** Vigil findings can be ignored without consequence.
- **Recommended next actions:** Integrate Vigil findings into CI pipeline when CI exists.

#### AI-assisted development guardrails
- **Maturity score:** 3
- **Confidence:** Medium
- **Evidence basis:** Confirmed in docs (CLAUDE.md extensively guides AI development, conventions enforced via instruction)
- **Status classification:** Implemented but immature
- **Current state summary:** CLAUDE.md provides detailed instructions for AI-assisted development: terminology, schema conventions, documentation requirements, session logging, architecture constraints. AI development is the primary development method (Claude Code sessions). However, guardrails are instruction-based, not tool-enforced. No AI output validation beyond TypeScript compiler.
- **What is working:** Comprehensive AI guidance. Consistent development approach across 128 sessions. Documentation discipline maintained through AI instructions.
- **What is missing or weak:** Guardrails are instruction-based only. No automated validation of AI outputs. No AI code review.
- **Risks:** AI instructions can be ignored or misinterpreted. Quality depends on instruction quality.
- **Recommended next actions:** Add automated checks (lint, test, build) as post-AI-generation validation.

#### Engineering metrics dashboard
- **Maturity score:** 1
- **Confidence:** Medium
- **Evidence basis:** Confirmed in docs (effort-log.md tracks session effort, Vigil tracks TypeScript errors)
- **Status classification:** Scaffolded
- **Current state summary:** Effort log tracks Claude and Samy effort per session (170KB). Vigil tracks TypeScript error counts over time. Bundle size tracked. However, no DORA metrics, no deployment frequency tracking, no lead time measurement.
- **What is working:** Effort tracking exists. Error trending.
- **What is missing or weak:** No DORA metrics. No engineering health dashboard. No deployment metrics.
- **Risks:** Cannot measure development velocity or efficiency.
- **Recommended next actions:** Defer formal metrics. Track deployment frequency when CI/CD exists.

#### Technical debt management system
- **Maturity score:** 2
- **Confidence:** Medium
- **Evidence basis:** Confirmed in docs (Vigil dead code scan, TypeScript audit, deferred CVEs tracked, known limitations in ADRs)
- **Status classification:** Partially implemented
- **Current state summary:** Vigil identifies dead code weekly. TypeScript audit runs nightly. Deferred CVEs tracked (esbuild, drizzle-kit). ADRs document known limitations. However, no formal tech debt register. No debt prioritization. No debt paydown allocation.
- **What is working:** Automated detection (Vigil). Known limitations documented.
- **What is missing or weak:** No formal tech debt register. No prioritization framework. No allocated debt paydown time.
- **Risks:** Tech debt accumulates without prioritized remediation.
- **Recommended next actions:** Create a lightweight tech debt register from Vigil findings.

---

### 3.14 Financial Efficiency Systems

#### Cloud cost allocation by environment / tenant / service
- **Maturity score:** 0
- **Confidence:** High
- **Evidence basis:** Not evidenced
- **Status classification:** Missing

#### Budget alerts and spend monitoring
- **Maturity score:** 0
- **Confidence:** High
- **Evidence basis:** Not evidenced
- **Status classification:** Missing

#### Unit economics tracking
- **Maturity score:** 0
- **Confidence:** High
- **Evidence basis:** Not evidenced (no cost-per-tenant, cost-per-agent, or cost-per-generation tracking)
- **Status classification:** Missing

#### Performance-to-cost optimization workflow
- **Maturity score:** 1
- **Confidence:** Medium
- **Evidence basis:** Confirmed in code (model selection routing ~75-80% to Haiku reduces AI cost, single DB connection for serverless cost control)
- **Status classification:** Conceptual
- **Current state summary:** Adaptive model selection routes 75-80% of intake turns to cheaper Haiku model. Single database connection reduces serverless costs. Fleet cost analysis page exists in admin. However, no systematic cost optimization workflow. No cost monitoring.
- **What is working:** Cost-conscious AI model routing. Serverless connection optimization.
- **What is missing or weak:** No cost monitoring. No cost optimization process.
- **Risks:** AI costs could escalate without visibility. No cost-per-tenant tracking for pricing.
- **Recommended next actions:** Track AI API costs per tenant. Set up Anthropic usage monitoring.

#### License and tool usage management
- **Maturity score:** 0
- **Confidence:** High
- **Evidence basis:** Not evidenced
- **Status classification:** Missing

**Section summary:** Financial efficiency systems are almost entirely absent. The adaptive model routing shows cost awareness in the AI layer, but no systematic financial management exists. Average score: 0.2.

---

### 3.15 Feedback and Learning Systems

#### Customer feedback intake
- **Maturity score:** 0
- **Confidence:** High
- **Evidence basis:** Not evidenced (waitlist exists but no feedback collection)
- **Status classification:** Missing

#### In-product feedback capture
- **Maturity score:** 0
- **Confidence:** High
- **Evidence basis:** Not evidenced
- **Status classification:** Missing

#### Experimentation / A/B testing system
- **Maturity score:** 0
- **Confidence:** High
- **Evidence basis:** Not evidenced (no feature flags, no experimentation framework)
- **Status classification:** Missing

#### Session replay / product analytics
- **Maturity score:** 0
- **Confidence:** High
- **Evidence basis:** Not evidenced (no PostHog, Amplitude, Mixpanel, or similar)
- **Status classification:** Missing

#### VOC-to-roadmap loop
- **Maturity score:** 0
- **Confidence:** High
- **Evidence basis:** Not evidenced
- **Status classification:** Missing

#### Operational retrospectives and continuous improvement process
- **Maturity score:** 2
- **Confidence:** Medium
- **Evidence basis:** Confirmed in docs (project journal captures reflections, session logs note lessons learned)
- **Status classification:** Partially implemented
- **Current state summary:** Project journal entries include strategic reflections (e.g., "consistency work compounds," "infrastructure pays dividends"). Session logs capture what worked and what didn't. However, no formal retrospective process. No improvement tracking. Single person reflecting, not a team exercise.
- **What is working:** Reflective practice in journal. Lessons captured.
- **What is missing or weak:** No formal retrospective cadence. No improvement action tracking. Single perspective.
- **Risks:** Lessons are captured but not systematically acted upon.
- **Recommended next actions:** Formalize when team grows.

**Section summary:** Feedback and learning systems are almost entirely absent. The project journal provides personal reflection but no customer feedback, no experimentation, no analytics. Average score: 0.3.

---

### 3.16 Business Continuity of Development

#### Team onboarding and role clarity
- **Maturity score:** 1
- **Confidence:** Medium
- **Evidence basis:** Confirmed in docs (KB engineer setup guide, CLAUDE.md conventions, but single-person team)
- **Status classification:** Scaffolded
- **Current state summary:** KB has engineer setup guide. CLAUDE.md defines development conventions. KB has role-specific onboarding (engineer, PM, compliance, executive). However, these are product-user onboarding guides, not internal team onboarding. No team role definitions. No RACI matrix.
- **What is working:** Documentation would help a new developer orient.
- **What is missing or weak:** No internal team onboarding. No role definitions. No RACI.
- **Risks:** New team members start from zero on internal processes.
- **Recommended next actions:** Create a CONTRIBUTING.md before hiring additional developers.

#### Skills coverage and ownership mapping
- **Maturity score:** 0
- **Confidence:** High
- **Evidence basis:** Not evidenced (single contributor owns everything)
- **Status classification:** Missing
- **Current state summary:** One person owns all code, all infrastructure, all operations. No skills matrix. No ownership mapping.
- **What is working:** Nothing to map — one person.
- **What is missing or weak:** Complete single-person dependency.
- **Risks:** Single point of failure for all project knowledge.
- **Recommended next actions:** Document critical system knowledge. Prioritize hiring for key skill gaps.

#### Runbooks and playbooks
- **Maturity score:** 1
- **Confidence:** Medium
- **Evidence basis:** Confirmed in docs (KB has playbooks for product use cases, but no operational runbooks)
- **Status classification:** Scaffolded
- **Current state summary:** KB has playbooks: agent onboarding, incident response for model drift, shadow AI remediation. However, these are product-feature playbooks for customers, not operational runbooks for the platform team. No deployment runbook. No incident response runbook. No database recovery runbook.
- **What is working:** Product playbooks exist and are well-written.
- **What is missing or weak:** No operational runbooks. No deployment guide for the team. No incident playbook.
- **Risks:** In an incident, there is no documented response procedure.
- **Recommended next actions:** Create operational runbooks: deployment, rollback, database recovery, incident response.

#### Key-person dependency reduction
- **Maturity score:** 0
- **Confidence:** High
- **Evidence basis:** Not evidenced (confirmed single contributor in git log)
- **Status classification:** Missing
- **Current state summary:** All development, all decisions, all operations depend on a single person. Bus factor = 1. No pair programming, no knowledge sharing, no documentation of tacit knowledge.
- **What is working:** Documentation partially mitigates (session logs, ADRs, project journal capture context).
- **What is missing or weak:** Actual bus factor is 1. Documentation helps but cannot replace a second capable team member.
- **Risks:** Project halts entirely if the single contributor is unavailable. This is the highest strategic risk.
- **Recommended next actions:** Priority hiring. In the interim, documentation is the mitigation (which is already strong).

#### Documentation freshness reviews
- **Maturity score:** 2
- **Confidence:** Medium
- **Evidence basis:** Confirmed in docs (Vigil spec-drift scan weekly, CLAUDE.md mandates doc updates with code)
- **Status classification:** Partially implemented
- **Current state summary:** Vigil runs weekly spec drift detection. CLAUDE.md mandates documentation updates with every code change. KB governance plan includes freshness review cadence. However, the visual QA report found stale/broken pages (C-01 through C-13), suggesting documentation and implementation have drifted in some areas.
- **What is working:** Vigil automates drift detection. Documentation mandate exists.
- **What is missing or weak:** Drift exists despite detection mechanisms. No enforcement of freshness reviews.
- **Risks:** Documentation creates false confidence if it outpaces implementation.
- **Recommended next actions:** Run Vigil spec drift scan and address findings before customer demos.

#### Backup maintainers for critical systems
- **Maturity score:** 0
- **Confidence:** High
- **Evidence basis:** Not evidenced
- **Status classification:** Missing
- **Current state summary:** No backup maintainers for any system. All systems have a single operator.
- **Risks:** Any system failure requires the single contributor to resolve.
- **Recommended next actions:** Identify the 3 most critical systems and create operational documentation sufficient for an emergency backup operator.

**Section summary:** Business continuity of development is the weakest system group, primarily due to single-person dependency. Strong documentation partially mitigates but cannot substitute for team resilience. Average score: 0.7.

---

## 4. Cross-Cutting Findings

### 4.1 Top 10 Highest-Risk Maturity Gaps

| # | Gap | Why It Matters | Severity | Likely Consequences If Not Addressed |
|---|---|---|---|---|
| 1 | **No CI/CD pipeline** | Every push to main deploys to production with zero validation | Critical | Broken deployments (already happening — C-13 blueprint generation 500 error shipped to production), data corruption from untested migrations, security vulnerabilities deployed |
| 2 | **Single-person dependency** | Bus factor = 1 across all systems | Critical | Project halts entirely if contributor unavailable. All knowledge, access, and operational capability concentrated in one person |
| 3 | **No environment separation** | All development testing effectively happens against production or localhost | Critical | Cannot validate changes before production. No safe place to test migrations, load behavior, or multi-tenant scenarios |
| 4 | **Tenant isolation is query-scoped only** | Every route handler must correctly filter by enterpriseId — structural enforcement absent | High | A single missed WHERE clause leaks cross-tenant data. As codebase grows, risk compounds. One mistake = data breach |
| 5 | **No backup/restore verification** | Backup existence is assumed (RDS defaults) but never tested | High | In a data loss event, recovery time and completeness are unknown. Could lose customer data with no recovery path |
| 6 | **No E2E or integration testing** | Core user flows have zero automated validation | High | Regressions in critical paths ship undetected. Manual QA already found 13 critical issues — automated testing would catch these continuously |
| 7 | **Auth on beta library** | NextAuth v5.0.0-beta.30 is pre-release software handling authentication | High | Undiscovered vulnerabilities. Breaking changes on update. Enterprise customers may require stable, audited auth |
| 8 | **No incident response process** | When production fails, there is no structured response | High | Extended outage duration. Panic-driven debugging. No communication to affected tenants. No learning from incidents |
| 9 | **No observability stack** | No centralized logging, metrics, tracing, or external alerting | High | Production issues invisible until users report them. Cannot diagnose root causes efficiently. Cannot measure availability |
| 10 | **No rollback capability** | No documented or tested rollback for bad deployments | Medium | Bad deployments require emergency code revert and redeploy. Extended incident duration. Database migrations may be irreversible |

### 4.2 Top 10 Recommended Next Actions in Priority Order

| # | Action | Why Now | Dependency It Unlocks | Expected Impact | Suggested Owner |
|---|---|---|---|---|---|
| 1 | **Create CI pipeline with test gating** | Every deployment is currently unvalidated. Existing tests are not even run. | Enables all future quality gates (security scanning, coverage enforcement, migration testing, E2E tests) | Prevents broken deployments. Catches regressions. Foundation for all quality improvement. | Engineering lead |
| 2 | **Create staging environment** | Cannot safely validate changes before production. | Enables migration testing, integration testing, preview demos, QA cycles | Separates development risk from production risk. Enables safe experimentation. | Engineering lead / DevOps |
| 3 | **Fix critical QA findings (C-01 through C-13)** | Core workflows are broken in production (blueprint generation 500, access control bypass, page crashes) | Unblocks product demonstrations and design partner onboarding | Platform becomes demonstrable and functional for the core use case | Engineering lead |
| 4 | **Add E2E tests for 3 critical flows** | No automated validation of user-facing behavior | Enables regression detection for the paths that matter most | Catches the type of issues found in manual QA continuously | Engineering lead |
| 5 | **Implement PostgreSQL RLS for tenant isolation** | Current query-scoped isolation relies on developer discipline in every route | Provides structural safety net for multi-tenant data protection | Eliminates the risk class of "missed WHERE clause = data breach" | Engineering lead |
| 6 | **Integrate error tracking (Sentry)** | Production errors are invisible | Enables error trends, alerting, and proactive issue detection | Immediately improves production visibility. Low effort, high value. | Engineering lead |
| 7 | **Establish backup/restore and run recovery drill** | Unverified backup = no backup | Proves data can be recovered. Identifies recovery time. | Moves from "hope" to "confidence" on data protection | Engineering lead / DevOps |
| 8 | **Create incident response runbook** | No structured response to production failures | Enables composed incident handling, reduces outage duration | Preparedness for inevitable production issues | Engineering lead |
| 9 | **Enable Dependabot + add npm audit to CI** | Known CVEs remain unpatched. No automated vulnerability detection. | Continuous vulnerability detection | Prevents accumulation of known vulnerabilities | Engineering lead |
| 10 | **Plan NextAuth stable migration** | Beta auth library is a security and stability risk | Enables enterprise security confidence | Removes "beta software in auth stack" risk | Engineering lead |

### 4.3 Top 5 Foundational Systems to Strengthen Before Scaling

1. **CI/CD Pipeline** — Every other quality and safety improvement depends on having an automated pipeline. Without CI, tests don't run, security doesn't scan, builds don't verify, and deployments don't gate. CI is the foundation upon which all other engineering discipline is built. You cannot scale development without it.

2. **Environment Separation (staging + production)** — You cannot safely develop, test, or validate multi-tenant behavior in a single-environment world. Staging enables migration testing, integration testing, performance validation, and demo preparation. Without it, every change is an experiment on production.

3. **Tenant Isolation Enforcement** — Query-scoped isolation works when one careful developer writes every route. It becomes a liability as the team, codebase, and tenant count grow. Structural enforcement (PostgreSQL RLS) converts "developer must remember" into "database enforces." This must be in place before enterprise customers trust their data to the platform.

4. **Observability** — You cannot operate what you cannot see. Before scaling customers, you need centralized logging, error tracking, and basic metrics. Otherwise, you learn about outages from customer complaints.

5. **Backup and Recovery** — Before scaling customers, you must prove you can recover from data loss. An untested backup is not a backup. A verified recovery procedure is a prerequisite for enterprise trust.

### 4.4 Key Sequencing and Dependency Logic

**Phase 1 (Weeks 1–3): Foundation**
CI pipeline → staging environment → fix critical QA findings

CI must come first because it enables test gating. Staging must come second because it provides a safe environment for testing fixes. Critical QA fixes come third because they unblock product demonstration.

**Phase 2 (Weeks 3–6): Safety**
PostgreSQL RLS → E2E tests → Sentry integration → backup verification

RLS provides structural tenant safety. E2E tests provide behavioral safety. Sentry provides visibility. Backup verification provides data safety. These can partially parallelize.

**Phase 3 (Weeks 6–10): Operations**
Incident runbook → Dependabot → structured logging → NextAuth migration plan

These prepare for production operations. They can proceed in parallel with Phase 2 work.

**What should NOT be scaled prematurely:**
- **Customer count** — Do not onboard enterprise customers until tenant isolation is structurally enforced and backup/restore is verified.
- **Team size** — Do not scale the team until CI/CD, code review, and branching strategy are in place. Adding developers without these foundations creates chaos.
- **Feature breadth** — Do not add more features until the existing core flow works reliably end-to-end. The platform has impressive breadth but the foundation beneath it has gaps.

---

## 5. Final Stage Judgment

**Current stage:** Late Prototype / Early MVP

**Why:** Intellios has remarkable feature breadth — a sophisticated domain model, comprehensive UI, governance engine, multi-agent orchestration, regulatory compliance mapping, 102-article knowledge base, and 128 documented development sessions. However, it lacks the operational infrastructure that separates a prototype from a production system: no CI/CD, no environment separation, no verified backup, no observability, no incident response, minimal testing, and single-person dependency. The core workflow (blueprint generation) was found broken in production QA. The platform can be demonstrated but cannot be safely operated for multi-tenant enterprise customers.

**What must be true to move to the next stage (Production-Ready MVP):**
- CI pipeline runs lint, typecheck, test, and build on every push, gating deployment
- Staging environment exists with its own database, used for all validation before production
- Core user flows (intake → generation → validation → review) pass E2E tests
- Tenant isolation is structurally enforced (PostgreSQL RLS)
- Backup/restore has been tested with a successful recovery drill
- Error tracking is active (Sentry or equivalent) with alerting on critical errors
- At minimum one additional contributor has committed code and can operate the system
- All 13 critical QA findings are resolved
- An incident response runbook exists and has been walked through

**What must not be assumed yet:**
- That documentation maturity equals operational maturity (it does not — documentation describes intent, operations prove capability)
- That the governance engine validates the platform itself (it governs the agents, not the platform)
- That query-scoped tenant isolation is sufficient for enterprise trust (it is not — one missed filter = data breach)
- That Vercel auto-deploy constitutes a CI/CD pipeline (it is deployment automation without validation)
- That 128 sessions of documented AI development creates team resilience (it creates a documented single-person dependency)
- That the knowledge base articles represent current reality (several describe planned/aspirational capabilities, per KB deployment-guide.md referencing ECS Fargate while actual deployment is Vercel serverless)

---

## 6. Brutal Truth Summary for Leadership

**What Intellios is genuinely good at today:**
The domain model is sophisticated and well-thought-out. The governance validation engine, policy expression language, regulatory compliance mapping (EU AI Act, SR 11-7, NIST AI RMF), and audit trail design demonstrate real enterprise-grade thinking. The documentation discipline is exceptional — 128 sessions logged, 11 ADRs, a 102-article knowledge base. The UI component library (Catalyst, 27 components) with design tokens, dark mode, and accessibility work is production-quality. The AI integration (adaptive model routing, context-driven risk tiering, stakeholder orchestration) is creative and cost-conscious.

**What is still fragile or immature:**
Everything beneath the application layer. There is no CI/CD pipeline — code goes straight from a developer's machine to production. There is no staging environment. Tests cover a fraction of the codebase and are never run automatically. Tenant isolation relies on every route handler having the correct WHERE clause, with no structural safety net. There is no observability stack — production errors are invisible unless users report them. There is no incident response process. Auth runs on a beta library. Backup/restore has never been verified. The core blueprint generation workflow returns HTTP 500 in production. The application is completely unusable on non-desktop devices.

**Whether leadership should treat it as concept, prototype, MVP, or early platform foundation:**
Treat it as a **late prototype approaching MVP**. The feature breadth is impressive and the domain thinking is strong, but the operational foundation is not yet present. This is a well-designed car body sitting on a temporary frame — the engineering of the visible product is ahead of the infrastructure required to operate it safely and reliably. The gap between "what it does" and "how safely it does it" needs to close before enterprise customers are onboarded.

**The few things that matter most over the next 60–90 days:**

1. **Build the CI/CD pipeline (Week 1).** This is the single most impactful action. It takes a few hours to set up GitHub Actions with lint + typecheck + test + build. Every subsequent improvement depends on this.

2. **Create a staging environment (Week 2).** Separate production from development. This costs almost nothing on Vercel (second project, separate database) but fundamentally changes the safety profile.

3. **Fix the broken core workflow (Week 2).** Blueprint generation returning 500 errors means the product's primary value proposition doesn't work. This blocks everything customer-facing.

4. **Add structural tenant isolation (Weeks 3–4).** PostgreSQL RLS converts "hope developers remember" into "database enforces." This is a prerequisite for enterprise trust.

5. **Verify backup/restore works (Week 4).** Run a recovery drill. If you can't recover from data loss, you can't serve enterprise customers.

Everything else — billing, customer onboarding, feature expansion, team scaling — should wait until these five foundations are in place. The platform's domain sophistication is a genuine competitive advantage, but that advantage is fragile without the operational infrastructure to support it. Build the foundation first.
