# Architectural Decision Records

| # | Title | Status | Date |
|---|---|---|---|
| 001 | [Git-native knowledge management system](001-knowledge-system.md) | accepted | 2026-03-12 |
| 002 | [MVP technology stack](002-mvp-technology-stack.md) | accepted | 2026-03-12 |
| 003 | [MVP component behavior decisions](003-component-behavior-decisions.md) | accepted | 2026-03-12 |
| 004 | [Implementation technology choices](004-implementation-tech-choices.md) | accepted | 2026-03-12 |
| 005 | [Governance policy expression language](005-governance-policy-expression-language.md) | accepted | 2026-03-12 |
| 006 | [Multi-step approval workflow and policy versioning](006-multi-step-approval-and-policy-versioning.md) | accepted | 2026-03-13 |
| 007 | [Blueprint test harness](007-blueprint-test-harness.md) | accepted | 2026-03-14 |
| 008 | [Proactive compliance intelligence](008-proactive-compliance.md) | accepted | 2026-03-14 |
| 009 | [Outbound webhook integration](009-webhook-integration.md) | accepted | 2026-03-14 |
| 010 | [Amazon Bedrock AgentCore integration strategy](010-agentcore-integration.md) | accepted | 2026-03-14 |
| 011 | [AgentCore integration confidence hardening](011-agentcore-confidence-hardening.md) | accepted | 2026-03-15 |
| 012 | [Middleware-level tenant isolation](012-middleware-tenant-isolation.md) | proposed | 2026-04-03 |
| 013 | [SOD enforcement in legacy single-step blueprint approval](013-sod-enforcement-legacy-approval.md) | proposed | 2026-04-08 |
| 014 | [Text contrast token scale shift for WCAG AA compliance](014-text-contrast-token-shift.md) | proposed | 2026-04-08 |
| 015 | [PDF rendering of evidence package](015-pdf-rendering-of-evidence-package.md) | proposed | 2026-04-09 |
| 016 | [AI resilience layer — retry, timeout, model configuration](016-ai-resilience-layer.md) | proposed | 2026-04-14 |
| 017 | [Database connection pool externalization](017-db-pool-externalization.md) | proposed | 2026-04-17 |
| 018 | [Hard-require SECRETS_ENCRYPTION_KEY in production](018-secrets-encryption-key-production-required.md) | proposed | 2026-04-17 |
| 019 | [Governance violations block blueprint approval (with audited admin override)](019-governance-blocks-approval.md) | proposed | 2026-04-17 |
| 020 | [Per-enterprise (tenant) rate limits on AI endpoints](020-per-enterprise-rate-limits.md) | proposed | 2026-04-17 |
| 021 | [Atomic entity + audit writes via db.transaction](021-atomic-entity-audit-writes.md) | proposed | 2026-04-17 |
| 022 | [Platform observability floor — instrumentation.ts, /api/healthz, structured-log migration](022-platform-observability-floor.md) | proposed | 2026-04-17 |
| 023 | [Bedrock circuit breaker — per-model in-memory state machine with sliding-window failure threshold and exponential cooldown backoff](023-bedrock-circuit-breaker.md) | proposed | 2026-04-17 |
| 024 | [Cron batch runner — DB-backed time-budget guard, per-item failure isolation, and priority-reorder on recent failures](024-cron-batch-runner.md) | proposed | 2026-04-18 |
| 025 | [Intake prompt injection defense — three-layer sanitization with delimited untrusted-input blocks](025-intake-prompt-sanitization.md) | proposed | 2026-04-18 |
