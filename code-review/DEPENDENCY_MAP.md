# Dependency Map

## Tech Stack
- **Framework**: Next.js 16.1.6 (App Router)
- **Language**: TypeScript 5.9.3
- **Database**: PostgreSQL via `postgres` driver + Drizzle ORM 0.45.1
- **Authentication**: NextAuth v5 (beta.30) with JWT strategy
- **AI**: Anthropic Claude via AI SDK v6 (@ai-sdk/anthropic 3.0.58)
- **Cache/Rate Limiting**: Redis (ioredis 5.10.1) with in-memory fallback
- **Cloud**: AWS (Bedrock, S3, CloudWatch)
- **UI**: Catalyst (Tailwind Labs), Headless UI, Radix UI, Heroicons, Lucide
- **Validation**: Zod v4.3.6
- **Email**: Resend
- **Testing**: Vitest 3.2.4 + Playwright 1.59.1
- **Deployment**: Vercel (serverless)

## Architecture Layers

```
[Browser] → [Next.js Middleware] → [API Routes] → [Business Logic] → [Database]
                  ↓                      ↓              ↓
            [Auth Check]          [Rate Limiting]  [Enterprise Scope]
            [Role Guard]          [Input Validation] [RLS Context]
            [Header Injection]    [Audit Logging]   [Event Bus]
```

## Module Dependencies

### Auth Chain
```
middleware.ts
  → auth.ts (NextAuth config)
    → lib/db/schema.ts (users table)
    → lib/auth/enterprise-scope.ts

lib/auth/require.ts
  → auth.ts (getServerSession)

lib/auth/with-tenant-scope.ts
  → lib/auth/enterprise-scope.ts
  → lib/db/rls.ts

lib/auth/cron-auth.ts
  → lib/env.ts (CRON_SECRET)
```

### Data Access Chain
```
API Route handlers
  → lib/auth/require.ts (auth check)
  → lib/auth/with-tenant-scope.ts (tenant isolation)
    → lib/auth/enterprise-scope.ts (WHERE filter)
    → lib/db/rls.ts (PostgreSQL RLS)
  → lib/db/index.ts (Drizzle client)
    → lib/db/schema.ts (table definitions)
  → lib/parse-body.ts (Zod validation)
  → lib/audit/log.ts (audit trail)
  → lib/events/publish.ts (event dispatch)
```

### AI/Generation Chain
```
Intake chat routes → lib/intake/orchestrator.ts → AI SDK → Anthropic API
Blueprint generation → lib/generation/generate.ts → AI SDK → Anthropic API
Blueprint refinement → lib/generation/generate.ts
Simulate/Red-team → lib/testing/executor.ts, red-team.ts → AI SDK
Help chat → AI SDK streaming
```

### Governance Chain
```
Blueprint validation → lib/governance/validator.ts
  → lib/governance/load-policies.ts → DB (governance_policies table)
  → lib/governance/evaluate.ts (rule engine)
  → lib/governance/remediate.ts (auto-fix suggestions)
```

### Deployment Chain
```
Blueprint deploy → lib/agentcore/deploy.ts
  → lib/agentcore/translate.ts (ABP → Bedrock format)
  → AWS Bedrock Agent API
  → lib/deploy/adapter.ts (generic adapter)
    → lib/deploy/azure.ts
    → lib/deploy/vertex.ts
```

### Event/Notification Chain
```
lib/events/publish.ts
  → lib/audit/log.ts (audit trail)
  → lib/notifications/handlers.ts (in-app notifications)
  → lib/webhooks/dispatch.ts (outbound webhooks)
  → lib/integrations/* (Jira, ServiceNow, Slack)
```

### Cron Job Chain
```
vercel.json (schedules)
  → /api/cron/* routes
    → lib/auth/cron-auth.ts (CRON_SECRET validation)
    → lib/telemetry/sync.ts
    → lib/monitoring/health-check.ts
    → lib/awareness/quality-evaluator.ts
    → lib/sla/config.ts
```

## External Service Dependencies
| Service | Used By | Purpose |
|---------|---------|---------|
| PostgreSQL | lib/db/* | Primary data store |
| Redis | lib/rate-limit.ts | Rate limiting, caching |
| Anthropic API | lib/intake/*, lib/generation/*, lib/testing/* | AI operations |
| AWS Bedrock | lib/agentcore/* | Agent deployment |
| AWS S3 | lib/storage/* | Artifact storage |
| AWS CloudWatch | lib/telemetry/* | Metrics |
| Resend | lib/notifications/* | Email delivery |
| Jira | lib/integrations/jira.ts | Ticket creation |
| ServiceNow | lib/integrations/servicenow.ts | Incident management |
| Slack | lib/integrations/slack.ts | Chat notifications |
