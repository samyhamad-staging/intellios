---
id: 10-003
title: Engineering FAQ
slug: engineering-faq
type: reference
audiences:
- engineering
status: published
created: &id001 2026-04-05
updated: *id001
tags:
- deployment
- API
- database
- scaling
- security
- integration
- webhooks
- monitoring
tldr: Technical questions about deployment, architecture, and integration for engineering
  teams
---

# Engineering FAQ

## What's the tech stack?

**Backend:**
- **Runtime:** Node.js 20 LTS (TypeScript)
- **Framework:** Next.js 16 (API routes, middleware)
- **Database:** PostgreSQL 15+ (Drizzle ORM)
- **LLM SDKs:** Anthropic Python SDK, AWS Bedrock SDK
- **Auth:** JWT + OIDC (for enterprise integrations)
- **Container:** Docker, Kubernetes-ready
- **Cloud SDKs:** AWS SDK (primary), Azure SDK (roadmap), GCP SDK (roadmap)

**Frontend:**
- **Framework:** React 19 (Next.js App Router)
- **UI Kit:** Catalyst (27 Tailwind Labs components)
- **Styling:** Tailwind CSS
- **State Management:** TanStack Query (server state), Zustand (client state)
- **Forms:** React Hook Form + Zod validation
- **Chat UI:** Custom streaming components (Claude API v1)

**Infrastructure:**
- **Container Registry:** AWS ECR or self-hosted
- **Compute:** ECS, EKS, or self-hosted Kubernetes
- **Database:** RDS PostgreSQL or self-managed
- **Secrets:** AWS Secrets Manager or self-managed
- **Monitoring:** CloudWatch, open to DataDog/Prometheus/Grafana

**Testing:**
- **Unit/Integration:** Jest, React Testing Library
- **E2E:** Playwright
- **Load Testing:** k6

## How to deploy?

**Option 1: AWS Self-Managed (Recommended)**

```bash
# 1. Prepare environment
export AWS_REGION=us-east-1
export DB_HOST=your-rds-instance.amazonaws.com
export DB_PASSWORD=<from Secrets Manager>
export CLAUDE_API_KEY=<from Secrets Manager>

# 2. Build Docker image
docker build -t intellios:latest .
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com
docker tag intellios:latest $AWS_ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com/intellios:latest
docker push $AWS_ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com/intellios:latest

# 3. Deploy to ECS or EKS
kubectl apply -f k8s/manifests/ --namespace=intellios

# 4. Run migrations
npm run db:migrate

# 5. Health check
curl https://your-intellios-domain.com/api/health
```

**Option 2: On-Premises (Kubernetes)**

```bash
# Deploy to your Kubernetes cluster
kubectl create namespace intellios
helm install intellios ./helm/intellios --namespace intellios --values values-prod.yaml
```

**Option 3: Docker Compose (Development/Small Deployments)**

```bash
docker-compose -f docker-compose.prod.yml up -d
```

**Post-deployment:**
- Database migrations run automatically on startup
- Seed governance policies (default: 11 operators)
- Create initial admin user
- Configure LLM provider credentials (Claude API key or AWS Bedrock role)

**Deployment guide:** See `docs/deployment/` for cloud-specific instructions (AWS, Azure, GCP, on-prem).

## Database requirements?

**PostgreSQL 15+**

**Minimum specs:**
- **Storage:** 100 GB (scales 10 GB per 500 agents + historical audit logs)
- **Memory:** 4 GB
- **IOPS:** 1000 IOPS (SSD required)
- **Connections:** 50-100 (Intellios uses connection pooling)

**Scaling tiers:**

| Agents/Month | Agent Volume | Recommended DB | Estimated Storage |
|---|---|---|---|
| 1-5 | <100 | db.t3.medium (2 vCPU, 4 GB) | 50 GB |
| 6-20 | 100-500 | db.t3.large (2 vCPU, 8 GB) | 100 GB |
| 21-100 | 500-2000 | db.r5.xlarge (4 vCPU, 32 GB) | 200 GB |
| 100+ | 2000+ | db.r5.2xlarge (8 vCPU, 64 GB) | 500 GB+ |

**Important:** Use **RDS with automated backups** (not unmanaged PostgreSQL). Multi-AZ deployments recommended for production.

**Schema:** Drizzle ORM manages migrations. Key tables:
- `agents`: Agent blueprints and metadata
- `governance_policies`: Policy definitions and versions
- `validation_reports`: Timestamped validation results
- `audit_logs`: Immutable event log
- `runtime_adapters`: Deployed adapters and their configurations

## Scaling considerations?

**Horizontal scaling:**

1. **Stateless API servers:** Run multiple Intellios API instances behind a load balancer. Recommended: 2-4 instances per 1000 agents/month.

2. **Database:**
   - Connection pooling (PgBouncer) for high connection count scenarios
   - Read replicas for reporting queries (governance dashboards)
   - Partitioning audit logs by date (automatic retention policy enforced)

3. **Message queue (for high throughput):**
   - Optional: AWS SQS for asynchronous validation jobs
   - Default: inline validation (acceptable for <100 agents/month)

**Vertical scaling:**

- Increase compute (vCPU) for generation engine (LLM API calls can be CPU-intensive for prompt engineering)
- Increase database memory for concurrent validation queries

**Caching:**

- Redis optional (not required): Caches policy definitions and agent blueprints
- Without Redis: ~500ms per governance validation; with Redis: ~100ms

**Performance targets:**
- Agent generation: 30 seconds (including LLM calls)
- Governance validation: <2 seconds (deterministic, offline)
- API response times: <500ms (p99)
- Dashboard load: <3 seconds (p99)

**Load test:** Use `npm run load-test:10k-agents` to simulate 10,000 agent registry queries.

## API rate limits?

**Default rates (per minute):**

| Endpoint | Limit | Notes |
|---|---|---|
| `/api/intake/*` | 10 req/min per user | Multi-stakeholder forms, not rate-limited per se |
| `/api/blueprints/generate` | 2 req/min per user | LLM-expensive; queues if exceeded |
| `/api/governance/validate` | 5 req/min per blueprint | Deterministic, low cost |
| `/api/registry/*` | 100 req/min per user | Read-heavy, no strict limit |
| `/api/review/*` | 20 req/min per user | Review queue operations |

**Rate limit headers:**
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1712350000
```

**Exceeding limits:** Returns HTTP 429 with retry-after header.

**Exemptions:** Scheduled batch jobs (admin), webhooks (whitelisted IPs).

**Configuration:** Adjust limits in `config/rate-limits.yaml` (env-specific).

## How does the AI work?

**Generation Engine** uses Claude (Anthropic) or Bedrock (AWS):

1. **Prompt Engineering:**
   - System prompt: "You are an expert AI agent architect..."
   - Context: Intake data (requirements, use case, stakeholder inputs)
   - Constraints: Governance policy rules (max tokens, tool list, safety constraints)
   - Output format: Structured JSON (agent blueprint)

2. **LLM Call:**
   ```typescript
   const response = await anthropic.messages.create({
     model: "claude-3-5-sonnet-20241022",
     max_tokens: 4096,
     system: systemPrompt,
     messages: [{
       role: "user",
       content: intakeData
     }]
   });
   ```

3. **Output Validation:**
   - JSON schema validation (Zod)
   - Safety checks (no prompt injection, no data exfiltration directives)
   - Governance validator runs deterministic policy checks

**Key insight:** LLM generates blueprint; Intellios validates and governs. LLM is not responsible for compliance—Intellios is.

**Determinism:** Not guaranteed at LLM level (temperature=1.0 by default; set temperature=0 for reproducibility if needed). However, governance validation is fully deterministic.

## Can we add custom runtime adapters?

Yes. Runtime adapters let you deploy agents to custom environments (beyond AWS Lambda, Docker, Kubernetes).

**Example:** Deploy to Anthropic Workbench, GCP Vertex AI, or a proprietary system.

**Adapter interface:**

```typescript
interface RuntimeAdapter {
  name: string;
  version: string;
  deploy(blueprint: AgentBlueprint, config: RuntimeConfig): Promise<DeploymentResult>;
  invoke(agentId: string, input: any): Promise<any>;
  monitor(agentId: string): Promise<HealthStatus>;
}
```

**Steps to add adapter:**

1. **Implement interface** in `src/lib/runtime-adapters/custom-adapter.ts`
2. **Register** in `src/lib/runtime-adapters/registry.ts`
3. **Test** with `npm run test:adapter -- custom-adapter`
4. **Deploy** to production; appears in Agent Registry UI

**Example (AWS Lambda adapter):** See `src/lib/runtime-adapters/lambda.ts` (~200 lines).

**Custom adapter timeline:** 2-4 weeks (Intellios Product team can assist with integration).

## Webhook reliability?

**Webhooks** notify external systems when agents are deployed, updated, or disabled.

**Configuration:**

```yaml
webhooks:
  - event: "agent.deployed"
    url: "https://your-system.com/webhooks/agent-deployed"
    retries: 3
    timeout: 30s
    auth: "Bearer token-xxx"
```

**Reliability guarantees:**

- **At-least-once delivery:** Event is retried up to 3 times (exponential backoff: 5s, 25s, 125s)
- **Idempotency:** Each webhook includes `idempotency-key` header; your system should deduplicate
- **Signing:** Webhooks signed with HMAC-SHA256 (verify signature to prevent spoofing)

**Dead letter queue:** After 3 retries, failed webhooks are logged and can be manually re-triggered via admin API.

**Monitoring:** Dashboard shows webhook delivery status and failure rates.

## Monitoring?

**Built-in metrics:**

- Agent count by status (approved, pending review, rejected)
- Validation pass/fail rates (trend over time)
- Generation times (LLM response times, blueprint size)
- Deployment success rates
- Agent execution metrics (invocation count, latency, error rate)

**Export options:**

1. **Prometheus scraping:** Intellios exposes `/metrics` endpoint (Prometheus format)
2. **CloudWatch integration:** Auto-publishes metrics to CloudWatch
3. **Custom exporters:** Extend `src/lib/monitoring/` to send metrics to Datadog, New Relic, etc.

**Key dashboards:**

- **Governance Dashboard:** Policy adherence, operators executed, exception trends
- **Operations Dashboard:** Agent deployment timeline, review queue status, SLA compliance
- **Security Dashboard:** Failed validation events, policy changes, access logs

**Alerts (configurable):**

- High validation failure rate (>10%)
- Agent deployment SLA breach (>30 min in review queue)
- Database connection pool exhaustion
- LLM API errors (rate limiting, service unavailability)

## How to extend the platform?

**Extension points:**

1. **Governance Operators:** Add custom policy rules (conditional logic, domain-specific constraints)
2. **Runtime Adapters:** Deploy to new environments (custom orchestration, proprietary systems)
3. **UI Components:** Extend Intake UI with domain-specific forms (e.g., financial product configuration)
4. **Webhooks:** Integrate with external systems (incident management, configuration management, audit systems)
5. **Custom Validators:** Add post-governance checks (e.g., jailbreak testing, fairness audits)

**Extension framework:** See `docs/architecture/extensibility.md` for patterns and examples.

**Recommended:** Open a GitHub issue or contact engineering team before undertaking major extensions to ensure alignment.

## Security model?

**Layers:**

1. **Network:** VPC isolation, no public endpoints
2. **Authentication:** JWT + optional OIDC (enterprise SSO)
3. **Authorization:** Role-based access control (RBAC): Admin, Reviewer, Agent Owner, Viewer
4. **Encryption:**
   - TLS 1.2+ in transit (all API calls)
   - AES-256 at rest (database, S3)
   - Field-level encryption for sensitive data (API keys, webhook URLs)
5. **Secrets management:** AWS Secrets Manager (not in logs or config files)
6. **Audit logging:** Immutable event log (7-year retention, tamper-proof)
7. **Rate limiting:** Prevents brute-force, API abuse

**Assumptions:** Your infrastructure (AWS account, Kubernetes cluster) is already secured per your organization's standards. Intellios inherits those security controls.

## CI/CD integration?

Intellios integrates with GitOps workflows:

```bash
# Export agent blueprint as code (to version control)
intellios export --agent=my-agent --output=agent.yaml

# Version control agent blueprint
git add agent.yaml
git commit -m "Update agent prompt engineering"
git push

# CI/CD pipeline: validate blueprint
intellios validate --file=agent.yaml --policy=governance-policy-v1.0.0

# If valid, deploy to registry (Intellios)
intellios register --file=agent.yaml

# Webhook notifies deployment system
# External system deploys agent to production
```

**Git integration:** Agent blueprints can be stored in Git (JSON or YAML). Use Intellios CLI for validation in CI/CD.

**Terraform:** Blueprints can be provisioned via Terraform provider [PLACEHOLDER: `terraform-provider-intellios`] (planned Q3 2026).

## Migration from existing systems?

**Common sources:**

1. **Homegrown agents:** JSON/YAML descriptions → Intellios blueprints (mapping tool provided)
2. **LangChain agents:** LangChain YAML → Intellios blueprint JSON (converter provided)
3. **AWS Bedrock agents:** Bedrock agent definition → Intellios blueprint (mapping tool provided)

**Migration process:**

1. Assess: Inventory all agents in your system
2. Plan: Prioritize which agents to migrate (low-risk, high-risk, etc.)
3. Map: Use Intellios migration tools to convert definitions
4. Validate: Ensure migrated blueprints pass governance validation
5. Test: Deploy to staging, verify behavior matches original agent
6. Approve: Human review via Review Queue
7. Deploy: Migrate to production under Intellios governance

**Timeline:** Typically 1-2 months for a Fortune 500 organization with 50-100 agents.

**Support:** Intellios Professional Services team can assist (optional service).

## Who can help with technical questions?

Contact engineering support: [PLACEHOLDER: engineering@intellios.com] or #intellios-engineering on your enterprise Slack.

For urgent issues: escalate via [PLACEHOLDER: on-call engineer rotation].
