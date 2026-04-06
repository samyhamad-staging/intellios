---
id: 02-003
title: 'Engineer Setup Guide: Deploy Intellios End-to-End in 60 Minutes'
slug: engineer-setup-guide
type: task
audiences:
- engineering
- devops
- platform
status: published
version: 1.0.0
platform_version: 1.2.0
created: '2026-04-05'
updated: '2026-04-05'
author: Intellios
reviewers: []
tags:
- quick-start
- engineering
- onboarding
- deployment
- setup
- environment-configuration
- database
- runtime-adapters
prerequisites: []
related:
- 04-001
- 04-003
- 04-013
- 07-003
next_steps:
- 04-003
- 03-003
- 04-013
feedback_url: https://feedback.intellios.ai/kb
tldr: 'Clone the Intellios repository, configure environment variables, run database
  migrations, start the Next.js development server, create a test agent via intake,
  configure the AgentCore runtime adapter, deploy your first governed agent, and verify
  observability. End-to-end in 60 minutes. Outcome: You have a working Intellios instance
  with a deployed agent and live governance validation.

  '
---



# Engineer Setup Guide: Deploy Intellios End-to-End in 60 Minutes

> **Bottom Line:** You'll configure Intellios from source, stand up a PostgreSQL database, start the
> Next.js development server, create a test agent through the governance flow, deploy it to AWS AgentCore
> (or your runtime), and verify observability. End result: A fully functional Intellios instance with a
> governed agent in production. 60 minutes.

## Prerequisites

### Accounts & Infrastructure

- **AWS Account** with:
  - Access to AgentCore (or Azure AI Foundry / on-premise Kubernetes cluster)
  - AgentCore API key (if using AWS)
  - VPC with public and private subnets (if not using managed services)

- **PostgreSQL Database** (v14+):
  - Option A (Recommended): AWS RDS (managed PostgreSQL)
  - Option B: Self-hosted PostgreSQL on EC2 or on-premise
  - Database size: 20 GB initial (scales with agent count)
  - Read replicas recommended for production (failover)

- **DNS & Network**:
  - Domain name (for production; localhost works for development)
  - TLS certificate (Let's Encrypt OK for development)
  - Outbound HTTPS access to AWS AgentCore / Azure / runtime endpoint

### Local Development Environment

- **Node.js 20+** (LTS):
  ```bash
  node --version  # Should output v20.x.x or higher
  npm --version   # Should output npm 10.x.x or higher
  ```

- **Git** (latest):
  ```bash
  git --version
  ```

- **Environment Variables Tool** (optional but recommended):
  - Use `.env.local` file (Next.js convention) or direnv

---

## Step 1: Clone and Configure (10 minutes)

### Clone the Repository

```bash
git clone https://github.com/intellios/intellios.git
cd intellios
```

### Install Dependencies

```bash
npm install
# or: yarn install
```

This installs:
- Next.js 16 (frontend + API routes)
- AI SDK v5 (LLM integration)
- Drizzle ORM (database)
- TypeScript, ESLint, Prettier
- React components (Catalyst UI Kit)

### Configure Environment Variables

Create `.env.local` in the project root:

```bash
# ============================================================================
# Core Configuration
# ============================================================================

# Environment (development | staging | production)
NODE_ENV=development

# Next.js Base URL (used for API calls from browser)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ============================================================================
# Database Configuration
# ============================================================================

# PostgreSQL connection string
# Format: postgresql://username:password@hostname:port/database
DATABASE_URL=postgresql://intellios_user:secure_password_here@localhost:5432/intellios_db

# Optional: Drizzle Kit debug (logs migrations)
DRIZZLE_DEBUG=false

# ============================================================================
# LLM Configuration (Claude API)
# ============================================================================

# Anthropic API Key (for Intake Engine's AI conversation)
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxx

# Model to use (Claude 3.5 Sonnet recommended for Intake)
INTELLIOS_MODEL=claude-3-5-sonnet-20241022

# LLM Configuration
INTELLIOS_MAX_TOKENS=4096
INTELLIOS_TEMPERATURE=0.7

# ============================================================================
# Runtime Adapter Configuration
# ============================================================================

# Default Runtime Adapter (agentcore | azure | kubernetes)
DEFAULT_RUNTIME_ADAPTER=agentcore

# ---- AWS AgentCore Configuration ----

# AWS Region
AWS_REGION=us-east-1

# AgentCore API Endpoint
AGENTCORE_API_ENDPOINT=https://agentcore.us-east-1.amazonaws.com

# AgentCore API Key
AGENTCORE_API_KEY=your_agentcore_api_key_here

# ---- Optional: Azure AI Foundry ----

# Azure Subscription ID
AZURE_SUBSCRIPTION_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Azure Resource Group
AZURE_RESOURCE_GROUP=intellios-rg

# Azure API Endpoint
AZURE_API_ENDPOINT=https://your-instance.openai.azure.com

# ---- Optional: On-Premise Kubernetes ----

# Kubernetes API Server
K8S_API_SERVER=https://kubernetes.internal:6443

# Kubernetes Namespace
K8S_NAMESPACE=intellios

# ============================================================================
# Governance Configuration
# ============================================================================

# Enable Governance Validator
GOVERNANCE_ENABLED=true

# Governance Policy Mode (strict | permissive)
# strict = error violations block deployment
# permissive = error violations flagged but allow override
GOVERNANCE_MODE=strict

# ============================================================================
# Security Configuration
# ============================================================================

# Session Secret (for Next.js session management)
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
NEXTAUTH_SECRET=your_random_secret_here_minimum_32_chars

# Allow Insecure Auth (development only)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_URL_INTERNAL=http://localhost:3000

# ============================================================================
# Observability
# ============================================================================

# Enable Debug Logging
DEBUG=intellios:*

# Observability Bridge (bridges runtime telemetry to Intellios)
OBSERVABILITY_ENABLED=true
OBSERVABILITY_ENDPOINT=http://localhost:3000/api/observability/events

# ============================================================================
# Feature Flags
# ============================================================================

# Enable/disable optional features
FEATURE_FLAG_POLICY_EDITOR=true
FEATURE_FLAG_ADVANCED_MONITORING=false
FEATURE_FLAG_MULTI_RUNTIME=true
```

### Validate Environment Variables

```bash
# Check that all required variables are set
npm run validate-env

# Output should show:
# ✓ DATABASE_URL configured
# ✓ ANTHROPIC_API_KEY configured
# ✓ AGENTCORE_API_KEY configured
# ✓ All required variables present
```

---

## Step 2: Set Up the Database (10 minutes)

### Create PostgreSQL Database

If using **AWS RDS**:

```bash
# Create RDS instance via AWS CLI
aws rds create-db-instance \
  --db-instance-identifier intellios-db \
  --db-instance-class db.t4g.small \
  --engine postgres \
  --engine-version 15.3 \
  --master-username intellios_user \
  --master-user-password "secure_password_here" \
  --allocated-storage 20 \
  --publicly-accessible false \
  --region us-east-1

# Wait for instance to be available (3-5 minutes)
aws rds describe-db-instances \
  --db-instance-identifier intellios-db \
  --query 'DBInstances[0].DBInstanceStatus'
```

If using **self-hosted PostgreSQL**:

```bash
# On your PostgreSQL server
createdb intellios_db
createuser intellios_user
psql -U postgres -d intellios_db -c "ALTER USER intellios_user WITH PASSWORD 'secure_password_here';"
psql -U postgres -d intellios_db -c "GRANT ALL PRIVILEGES ON DATABASE intellios_db TO intellios_user;"
```

### Run Database Migrations

Intellios uses **Drizzle ORM** for database schema management.

```bash
# Generate migration from schema
npm run drizzle:generate

# Run migrations against the database
npm run drizzle:migrate

# Verify migration status
npm run drizzle:status

# Output should show:
# Migration 001-initial-schema: ✓ Applied 2026-04-05
# Migration 002-add-governance-fields: ✓ Applied 2026-04-05
# Migration 003-add-audit-tables: ✓ Applied 2026-04-05
# ...
# Total: 8 migrations applied
```

### Seed Initial Data (Optional)

Seed baseline governance policies:

```bash
npm run seed:baseline-policies

# Output should show:
# Seeding baseline policies...
# ✓ Safety Baseline policy created (policy_id: baseline-safety-001)
# ✓ Audit Standards policy created (policy_id: baseline-audit-001)
# ✓ Access Control Baseline policy created (policy_id: baseline-acl-001)
# ✓ Governance Coverage policy created (policy_id: baseline-governance-001)
# Done. 4 policies seeded.
```

### Verify Database Connection

```bash
# Test database connectivity
npm run test:db-connection

# Output should show:
# Testing database connection...
# ✓ Connected to PostgreSQL (host: localhost, port: 5432, database: intellios_db)
# ✓ Schema verified (8 tables, 24 columns)
# Connection successful.
```

---

## Step 3: Start the Development Server (3 minutes)

### Run the Next.js Development Server

```bash
npm run dev

# Output should show:
# ready - started server on 0.0.0.0:3000, url: http://localhost:3000
# event - compiled successfully
# info - Intellios platform is ready
# info - Governance validator loaded with 4 baseline policies
# info - Runtime adapters initialized: agentcore, azure, kubernetes
```

### Verify Server is Running

In another terminal:

```bash
# Health check
curl http://localhost:3000/api/health

# Output should show:
# {
#   "status": "healthy",
#   "timestamp": "2026-04-05T14:30:00Z",
#   "version": "1.2.0",
#   "database": "connected",
#   "governance_validator": "ready"
# }
```

### Access the Dashboard

Open http://localhost:3000 in your browser. You should see:

- **Intellios Dashboard** (home page)
- **Navigation Menu** — Intake, Registry, Review Queue, Governance, Administration
- **Status Indicators** — Database: Connected, Governance: Ready, Runtime Adapters: 3 configured

---

## Step 4: Create a Test Agent via Intake (15 minutes)

### Start an Intake Session

Click **Intake → New Agent**. A structured intake form appears.

### Phase 1: Structured Context Capture

Fill in the form:

```
Agent Name: Loan Processing Agent
Agent Purpose: Process loan applications and determine basic eligibility

Deployment Type: customer-facing
Data Sensitivity: regulated
Regulatory Scope: [FINRA, SOX]
Integration Types: [database, payment-system, email]

Stakeholders Consulted:
  ☑ Compliance Officer (alice@bank.com)
  ☑ Risk Officer (bob@bank.com)
  ☐ Security Officer
  ☑ Operations (ops@bank.com)
```

Click **Next**. The system stores this context.

### Phase 2: Governance Probing (AI Conversation)

The Intake Engine prompts you with an AI-driven conversation. Example flow:

**System:** "I see this is a customer-facing agent accessing regulated data. Let's discuss governance requirements."

**System:** "This agent will access regulated financial data. Describe your data handling policy. Should logs be encrypted? What's the retention period?"

**Your Response:** "Yes, logs must be encrypted. PII is retained for 90 days then deleted. Access is logged to audit trail."

**System:** "Good. Who has approval authority for this agent? Who decides if it's deployed?"

**Your Response:** "Risk Officer (Bob) approves. Compliance (Alice) countersigns for regulatory framework."

**System:** "Understood. What's the highest loan amount this agent can approve without escalation?"

**Your Response:** "The agent only assesses eligibility. Final approval requires human review. No automatic approvals."

**System:** "Perfect. Any constraints on when this agent can operate?"

**Your Response:** "Only during business hours, 9 AM - 5 PM EST. Outside those hours, it logs and queues requests."

The system captures all responses in the **IntakePayload** and generates an ABP skeleton.

Click **Complete Intake**. The system validates that governance requirements were captured. If gaps exist,
it rejects with specific gaps (e.g., "Approval authority not specified").

### Phase 3: Auto-Generated Blueprint

The system generates the **Agent Blueprint Package (ABP)**:

```json
{
  "metadata": {
    "id": "loan-processor-v1.0.0",
    "name": "Loan Processing Agent",
    "purpose": "Process loan applications and determine basic eligibility",
    "version": "1.0.0",
    "created_at": "2026-04-05T14:35:00Z",
    "stakeholders": ["alice@bank.com", "bob@bank.com", "ops@bank.com"]
  },
  "capabilities": {
    "models": ["claude-3-5-sonnet-20241022"],
    "tools": [
      "query-applicant-database",
      "check-credit-score",
      "verify-income-documents",
      "send-email-notification"
    ],
    "instructions": "You are a loan eligibility assessment agent. Your role is to evaluate loan applications and determine basic eligibility based on applicant data and financial criteria. You do NOT approve loans; you assess eligibility and escalate to human review. Always be transparent about your reasoning."
  },
  "constraints": {
    "data_access": ["applicant_name", "applicant_ssn", "credit_score", "income_documents"],
    "denied_actions": [
      "approve_loan",
      "access_other_applicant_data",
      "modify_credit_score",
      "send_external_communication"
    ],
    "escalation_procedure": "If eligibility cannot be determined, escalate to risk_officer for manual review",
    "escalation_threshold_usd": null,
    "operating_hours": "09:00-17:00 EST",
    "audit_logging": true,
    "pii_encryption": "AES-256"
  },
  "governance": {
    "regulatory_scope": ["FINRA", "SOX"],
    "data_sensitivity": "regulated",
    "risk_classification": "high",
    "policies_applicable": ["baseline-safety-001", "baseline-audit-001", "baseline-acl-001"],
    "approval_authority": ["bob@bank.com"],
    "approval_confirmation": ["alice@bank.com"]
  }
}
```

### Submit for Governance Validation

Click **Submit for Validation**. The system evaluates the ABP against all active policies.

Expected outcome: The agent passes governance validation (or flags minor warnings). The ABP advances to
**Review Queue**.

---

## Step 5: Configure the AgentCore Runtime Adapter (12 minutes)

The **Runtime Adapter** translates the ABP into cloud-specific configuration and deploys it.

### Access Runtime Adapter Configuration

Navigate to **Administration → Runtime Adapters → AgentCore → Configure**.

### Set AgentCore Deployment Parameters

```json
{
  "adapter_id": "agentcore-primary",
  "runtime_type": "agentcore",
  "region": "us-east-1",
  "account_id": "123456789012",
  "agentcore_endpoint": "https://agentcore.us-east-1.amazonaws.com",
  "deployment": {
    "vpc_id": "vpc-0123456789abcdef0",
    "subnet_ids": ["subnet-0123456789", "subnet-9876543210"],
    "security_group_ids": ["sg-0123456789abcdef0"],
    "instance_type": "t4g.medium",
    "auto_scaling": {
      "min_instances": 2,
      "max_instances": 10,
      "target_cpu_utilization": 70
    },
    "logging": {
      "enabled": true,
      "retention_days": 30,
      "log_group": "/aws/agentcore/intellios"
    },
    "monitoring": {
      "cloudwatch_enabled": true,
      "x_ray_enabled": true
    }
  },
  "authentication": {
    "api_key_name": "AGENTCORE_API_KEY",
    "kms_key_id": "arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012"
  }
}
```

### Verify AgentCore Connection

```bash
# Test AgentCore API connectivity
npm run test:agentcore-connection --api-key=$AGENTCORE_API_KEY

# Output should show:
# Testing AgentCore connection...
# ✓ Connected to AgentCore API (us-east-1)
# ✓ API version: 2.1.0
# ✓ Quota: 100 agents available
# Connection successful.
```

---

## Step 6: Deploy Your First Governed Agent (15 minutes)

### Initiate Deployment

Navigate to the **Review Queue** and find your "Loan Processing Agent" blueprint (in_review state).

Click **Approve & Deploy**.

A deployment dialog appears:

```
Agent: Loan Processing Agent v1.0.0
Status: Ready for Deployment
Governance: ✓ All policies passed

Select Runtime Adapter: [AgentCore (us-east-1)]
Deployment Configuration: [default]

Estimated Deployment Time: 3-5 minutes

☑ Enable Observability Bridge
☑ Enable Auto-Scaling
☑ Enable CloudWatch Logging
```

Click **Deploy**.

The system:

1. **Locks the ABP** — No further changes allowed (immutable)
2. **Translates to AgentCore config** — Converts ABP to AWS-specific deployment manifest
3. **Deploys to AgentCore** — Pushes agent code and configuration to AWS
4. **Initializes observability** — Sets up CloudWatch logs, X-Ray tracing, and Intellios observability bridge
5. **Updates Agent Registry** — Sets status to "deployed", logs deployment timestamp and runtime ID

Monitor deployment progress:

```
Deployment: Loan Processing Agent v1.0.0
├── Step 1: ABP Validation — ✓ Passed (0.2s)
├── Step 2: AgentCore Translation — ✓ Complete (1.5s)
├── Step 3: Infrastructure Provisioning — ⏳ In progress...
│   └─ VPC: ready
│   └─ Security group: ready
│   └─ IAM role: ready
│   └─ EC2 instance: launching...
├── Step 4: Agent Deployment — Pending
└── Step 5: Health Check — Pending

Estimated remaining time: 2 minutes
```

Once complete, you'll see:

```
Deployment: Loan Processing Agent v1.0.0
Status: ✓ DEPLOYED
Runtime: AWS AgentCore (region: us-east-1)
Agent Endpoint: https://agentcore.us-east-1.amazonaws.com/agents/loan-processor-v1-0-0
Agent Status: RUNNING
Execution Logs: available at /api/agents/loan-processor-v1-0-0/logs
Metrics: available at /api/agents/loan-processor-v1-0-0/metrics
```

---

## Step 7: Verify Observability Bridge (5 minutes)

The **Observability Bridge** streams runtime telemetry (logs, metrics, traces) from AgentCore back to
Intellios.

### Check Observability Status

Navigate to **Administration → Observability → Status**:

```
Observability Bridge Status
├── AgentCore Connection: ✓ Connected
├── Telemetry Ingestion: ✓ Enabled
├── Log Streaming: ✓ Active
└── Metrics Collection: ✓ Active (interval: 30s)

Agent: Loan Processing Agent
├── Execution Count: 3
├── Average Latency: 1,240ms
├── Error Rate: 0%
├── Last Execution: 2026-04-05 14:45:32 UTC
└── Status: healthy
```

### View Agent Execution Logs

Navigate to **Registry → Loan Processing Agent → Logs**:

```
Execution Log: Loan Processing Agent

[2026-04-05 14:45:30] INTAKE
  request_id: req-abc123def456
  input: {"applicant_name": "John Doe", "annual_income": 85000}
  timestamp: 2026-04-05T14:45:30Z

[2026-04-05 14:45:31] TOOL_CALL
  tool: query-applicant-database
  args: {"applicant_name": "John Doe"}
  result: {"applicant_id": "APP-00123", "credit_score": 720}

[2026-04-05 14:45:32] TOOL_CALL
  tool: check-credit-score
  args: {"credit_score": 720}
  result: {"eligibility": "qualified", "tier": "standard"}

[2026-04-05 14:45:33] COMPLETION
  output: {"eligibility": "qualified", "loan_amount_recommended": 150000}
  latency: 1.2s
  status: success
```

### View Metrics

Navigate to **Registry → Loan Processing Agent → Metrics**:

```
Agent Metrics: Last 24 Hours

Executions: 3
├── Total: 3
├── Successful: 3
├── Failed: 0

Latency:
├── Average: 1,240ms
├── P50: 1,100ms
├── P99: 1,800ms

Errors:
├── Rate: 0%
├── Count: 0

Resource Usage:
├── CPU: 15% (avg)
├── Memory: 320 MB (avg)
└── Network: 2.5 MB in/out
```

---

## Verification Checklist

Confirm that everything is working:

- [ ] Environment variables configured (`.env.local` created)
- [ ] Database migrations run successfully (`npm run drizzle:migrate`)
- [ ] Development server started and healthy (http://localhost:3000/api/health returns 200)
- [ ] Intake session completed and ABP generated
- [ ] Governance validation passed (no blocking violations)
- [ ] Agent approved and deployed to AgentCore
- [ ] Observability bridge connected and streaming logs
- [ ] Agent endpoint responding (curl https://agentcore.../agents/loan-processor-v1-0-0)

If any step fails, check the troubleshooting section below.

---

## CLI Commands Reference

Quick reference for common operations:

```bash
# Development
npm run dev              # Start dev server (localhost:3000)
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint
npm run format           # Run Prettier

# Database
npm run drizzle:generate # Generate migration from schema
npm run drizzle:migrate  # Run pending migrations
npm run drizzle:status   # Check migration status
npm run drizzle:push     # Push schema to database directly (dev only)
npm run seed:baseline-policies  # Seed governance policies

# Testing
npm run test             # Run test suite
npm run test:db-connection      # Verify database connectivity
npm run test:agentcore-connection # Verify AgentCore connectivity

# Deployment
npm run deploy:dev       # Deploy to development environment
npm run deploy:staging   # Deploy to staging environment
npm run deploy:production # Deploy to production environment
```

---

## Troubleshooting

### "Cannot connect to PostgreSQL"

**Symptom:** `Error: ECONNREFUSED 127.0.0.1:5432`

**Solution:**
1. Verify PostgreSQL is running: `sudo systemctl status postgresql` (Linux) or check Services (Windows)
2. Verify DATABASE_URL is correct: `echo $DATABASE_URL`
3. Test connectivity: `psql -U intellios_user -h localhost -d intellios_db`
4. If using RDS, verify security group allows inbound on port 5432 from your IP

### "ANTHROPIC_API_KEY not found"

**Symptom:** `Error: Missing required environment variable: ANTHROPIC_API_KEY`

**Solution:**
1. Get your API key from https://console.anthropic.com/account/keys
2. Add to `.env.local`: `ANTHROPIC_API_KEY=sk-ant-...`
3. Restart dev server: `npm run dev`

### "AgentCore connection failed"

**Symptom:** `Error: Failed to connect to AgentCore API`

**Solution:**
1. Verify AGENTCORE_API_KEY is set: `echo $AGENTCORE_API_KEY`
2. Verify AGENTCORE_API_ENDPOINT is correct for your region
3. Verify AWS credentials in your environment (run `aws sts get-caller-identity`)
4. Check AgentCore service status in AWS Console

### "Governance validation stuck"

**Symptom:** Validation runs for > 10 seconds without completing

**Solution:**
1. Check server logs: `npm run dev` should show errors
2. Verify database connection: `npm run test:db-connection`
3. Check baseline policies are seeded: `SELECT COUNT(*) FROM governance_policies;`
4. Restart server: `npm run dev`

### "Agent deployment fails"

**Symptom:** Deployment halts with error "Infrastructure provisioning failed"

**Solution:**
1. Check AgentCore quota: `aws agentcore describe-account-resources`
2. Verify VPC and security group exist and are accessible
3. Check IAM role permissions (needs ec2:CreateInstance, logs:CreateLogGroup, etc.)
4. Review CloudWatch logs: `aws logs tail /aws/agentcore/intellios --follow`

---

## Next Steps

You've deployed Intellios and your first governed agent. Here's what to do next:

### This Week
1. **Configure additional runtime adapters** — If using Azure or on-premise K8s, set up additional adapters
2. **Create custom governance policies** — Define 2-3 policies specific to your organization
3. **Invite your team** — Add compliance, risk, and product team members to the platform
4. **Deploy 2-3 more agents** — Get comfortable with the intake, validation, and deployment flow

### Next Week
1. **Set up monitoring dashboards** — Create dashboards for governance compliance and agent health
2. **Configure backup and disaster recovery** — RDS automated backups, agent rollback procedures
3. **Document your deployment** — Create runbooks for deployment, scaling, and troubleshooting
4. **Plan for production** — DNS, TLS, auto-scaling, multi-region strategy

### Month 2+
1. **Implement CI/CD pipeline** — Automate intake, validation, and deployment
2. **Scale to multi-cloud** — Deploy agents to multiple runtimes simultaneously
3. **Integrate with compliance systems** — Export evidence chains to your COSO/audit platform
4. **Optimize costs** — Review AgentCore usage and right-size instances

---

## Verify Your Success

After completing this guide, you should be able to confirm:

1. **API connectivity works** — Run `curl -H "Authorization: Bearer $TOKEN" https://[your-host]/api/intake` and receive a 200 response
2. **You can create an intake session** — POST to `/api/intake` and receive a session ID
3. **You can trigger blueprint generation** — POST to `/api/blueprints/generate` with a valid session ID
4. **Webhook delivery works** — If configured, verify your endpoint receives a test event
5. **You understand** the API reference documentation and can locate endpoint details for intake, blueprints, governance, and registry

If any verification step fails, see [Engineering FAQ](../10-faq-troubleshooting/engineering-faq.md) or [API Authentication Troubleshooting](../10-faq-troubleshooting/fix-api-authentication-errors.md).

---

## Related Documentation

- **[System Architecture](../04-architecture-integration/system-architecture.md)** — High-level platform
  architecture and subsystem interactions
- **[Runtime Adapter Pattern](../04-architecture-integration/runtime-adapter-pattern.md)** — How runtime
  adapters work and how to extend them
- **[Deployment Guide](../04-architecture-integration/deployment-guide.md)** — Advanced deployment
  configurations (high availability, multi-region, disaster recovery)
- **[Observability Bridge](../07-administration-operations/observability-dashboards.md)** — How telemetry flows from
  runtime back to Intellios
- **[API Reference](../04-architecture-integration/api-reference/_index.md)** — REST API endpoints for programmatic
  agent management

---

*Next: [Advanced Runtime Adapter Configuration](../04-architecture-integration/runtime-adapter-pattern.md)*
