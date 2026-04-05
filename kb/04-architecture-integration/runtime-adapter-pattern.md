---
id: "04-003"
title: "Configure a Runtime Adapter to Deploy Agents"
slug: "runtime-adapter-pattern"
type: "task"
audiences:
  - "engineering"
status: "draft"
version: "1.0.0"
platform_version: "1.2.0"
created: "2026-04-05"
updated: "2026-04-05"
author: "Intellios Platform Engineering"
reviewers: []
tags:
  - "runtime-adapter"
  - "deployment"
  - "aws-agentcore"
  - "integration"
  - "platform-engineering"
prerequisites:
  - "04-001"
  - "03-006"
  - "03-001"
related:
  - "04-004"
  - "04-011"
  - "08-005"
next_steps:
  - "04-004"
  - "07-003"
feedback_url: "[PLACEHOLDER]"
tldr: >
  Learn how Intellios runtime adapters translate governed Agent Blueprint Packages (ABPs) into cloud provider formats and execute agents at scale. This guide covers the adapter interface, AWS AgentCore integration, field mapping, deployment workflows, observability, and lifecycle management. Expected time: 60–90 minutes.
---

# Configure a Runtime Adapter to Deploy Agents

> **TL;DR:** Learn how Intellios runtime adapters translate governed Agent Blueprint Packages (ABPs) into cloud provider formats and execute agents at scale. This guide covers the adapter interface, AWS AgentCore integration, field mapping, deployment workflows, observability, and lifecycle management.

## Goal

By the end of this guide, you will understand the runtime adapter pattern, configure an AWS AgentCore adapter for your Intellios instance, and deploy a fully governed agent to production with observability and lifecycle event tracking enabled.

## Prerequisites

Before starting, ensure you have:

- [ ] An Intellios instance (v1.2.0 or later) with administrative access
- [ ] Familiarity with [Agent Blueprint Package (ABP)](../03-core-concepts/agent-blueprint-package.md) structure and v1.2.0 schema
- [ ] An AWS account with **Bedrock Agents** enabled in at least one region (e.g., `us-east-1`, `eu-west-1`)
- [ ] IAM role capable of creating/managing Bedrock agents: `bedrock:CreateAgent`, `bedrock:PrepareAgent`, `bedrock:UpdateAgent`, `bedrock:GetAgent`
- [ ] AWS credentials available as environment variables (`AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) or via instance role (ECS Fargate, EC2 IAM role, etc.)
- [ ] Node.js 18+ and npm/yarn installed locally (for testing adapter code)
- [ ] Familiarity with REST APIs, JSON payloads, and basic cloud infrastructure concepts

## Concept Overview: The Runtime Adapter Pattern

Intellios **does not execute agents itself**. Instead, it governs them through a lifecycle (design → review → approval → deployment → monitoring) and delegates execution to cloud provider runtimes via pluggable adapter interfaces.

A **runtime adapter** is the translation layer between Intellios's internal representation (the ABP) and a cloud provider's execution format (e.g., AWS Bedrock Agent definition, Azure AI Foundry deployment manifest). Think of it as a compiler that converts a standardized governance contract into provider-specific deployment instructions.

For a deeper conceptual understanding, see [Runtime Adapters](../03-core-concepts/runtime-adapters.md).

### Key Pattern Properties

1. **ABP is the source of truth** — Intellios governance policies are evaluated against the ABP, not the deployed runtime format.
2. **Adapters are pluggable** — New cloud runtimes (Azure AI Foundry, NVIDIA Dynamo, on-premises) can be added without modifying core Intellios logic.
3. **Translation is unidirectional** — ABP → provider format. Intellios does not import or sync changes from the deployed runtime back into the control plane.
4. **Observability bridges back** — While translation is one-way, observability signals (agent status, metrics, logs) flow back into Intellios via webhooks and health check endpoints.

---

## Steps

### Step 1: Understand the Adapter Interface

Before integrating a specific runtime, understand the canonical adapter contract. All adapters implement this TypeScript interface:

```typescript
interface RuntimeAdapter {
  /**
   * Translate: Convert an ABP (v1.1.0+) to the target runtime's format.
   * Input: ABP JSON object (parsed)
   * Output: Provider-specific deployment manifest (JSON or string)
   * Throws: AdapterTranslationError if ABP is incompatible or incomplete
   */
  translate(abp: AgentBlueprintPackage): ProviderManifest;

  /**
   * Deploy: Send the manifest to the cloud provider and obtain a deployment record.
   * Input: Manifest + credentials (from environment or config)
   * Output: DeploymentRecord with runtime identifiers (e.g., agent ID, ARN)
   * Throws: AdapterDeploymentError if deployment fails (auth, validation, timeout)
   */
  deploy(manifest: ProviderManifest, config: AdapterConfig): Promise<DeploymentRecord>;

  /**
   * Monitor: Query the deployed runtime for health and status.
   * Input: DeploymentRecord (contains runtime identifiers)
   * Output: HealthStatus with state (RUNNING, FAILED, UNHEALTHY) and metadata
   * Throws: AdapterMonitorError if the runtime is unreachable
   */
  monitor(record: DeploymentRecord, config: AdapterConfig): Promise<HealthStatus>;

  /**
   * Teardown: Decommission the agent in the target runtime (optional).
   * Input: DeploymentRecord
   * Output: void (or confirmation)
   * Throws: AdapterTeardownError if decommissioning fails
   */
  teardown(record: DeploymentRecord, config: AdapterConfig): Promise<void>;
}
```

**Intellios's role:**
- Calls `translate()` when a blueprint is approved.
- Calls `deploy()` when a reviewer clicks "Deploy" in the Blueprints UI.
- Calls `monitor()` periodically (or on-demand) to feed observability dashboards.
- Calls `teardown()` when an agent lifecycle reaches the "retired" state.

**Your adapter's role:**
- Implement the four methods to bridge Intellios and your target runtime.
- Store runtime identifiers (agent ID, ARN, version, etc.) in the `DeploymentRecord` struct.
- Handle credentials securely (read from environment, not from request bodies).
- Provide clear error messages that help operators diagnose failures.

### Step 2: Configure the AWS AgentCore Adapter

The AWS AgentCore adapter (for Amazon Bedrock Agents) is the primary reference implementation. Configure it now.

#### 2a. Set Environment Variables

Intellios reads AWS credentials from the process environment. Set these in your deployment (ECS task definition, Kubernetes secret, `.env.local` for local development):

```bash
# Required
AWS_REGION=us-east-1                                          # Bedrock region
AWS_ACCESS_KEY_ID=[YOUR_AWS_ACCESS_KEY]
AWS_SECRET_ACCESS_KEY=[YOUR_AWS_SECRET_ACCESS_KEY]
BEDROCK_AGENT_RESOURCE_ROLE_ARN=arn:aws:iam::123456789012:role/IntelliosBedrocAgent # IAM role for agents to assume

# Optional (for production hardening)
BEDROCK_DEPLOYMENT_TIMEOUT_MS=90000                           # Polling timeout (default: 90s)
BEDROCK_GUARDRAIL_ID=[GUARDRAIL_ID]                          # Optional: Bedrock Guardrails config
BEDROCK_GUARDRAIL_VERSION=[VERSION]                          # Required if GUARDRAIL_ID is set
```

> **Important:** The `BEDROCK_AGENT_RESOURCE_ROLE_ARN` is the IAM role that **deployed agents will assume**. This role determines what AWS services your agents can invoke. It must include permissions for Bedrock Foundational Models, your specified LLM (e.g., Claude, Haiku), and any tools you want agents to call.

#### 2b. Create the IAM Role for Agents

Your agents need an IAM role with these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:us-east-1:123456789012:log-group:/aws/bedrock/agent/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::my-bucket/agents/*"
    }
  ]
}
```

> **Note:** The exact permissions depend on your tools and use case. Financial services agents often need S3 (for compliance artifacts), DynamoDB (for transaction data), or Secrets Manager access.

#### 2c. Enable AgentCore in Intellios Admin Settings

1. Sign in to Intellios with an admin account.
2. Navigate to **Settings** → **Deployment Targets**.
3. Click **Add Deployment Target** and select **AWS Bedrock Agents**.
4. Fill in the configuration:

```json
{
  "agentcore": {
    "enabled": true,
    "region": "us-east-1",
    "agentResourceRoleArn": "arn:aws:iam::123456789012:role/IntelliosBedrocAgent",
    "guardrailConfiguration": {
      "guardrailId": "[PLACEHOLDER]",
      "guardrailVersion": "[PLACEHOLDER]"
    }
  }
}
```

5. Click **Validate** to confirm AWS credentials and role permissions.
6. Click **Save**.

**Expected result:** The adapter is now active. When you deploy a blueprint, Intellios will call the AgentCore adapter to translate the ABP and create a Bedrock agent.

### Step 3: Map ABP Fields to AgentCore Agent Definition

The AgentCore adapter translates ABP fields into Bedrock's `CreateAgent` API payload. Understanding this mapping helps you design blueprints that deploy correctly.

| ABP Field | AgentCore Field | Transformation |
|---|---|---|
| `metadata.id` | `tags.abpId` | Stored as-is; enables traceability |
| `metadata.enterprise_id` | `tags.enterpriseId` | Enables multi-tenancy traceability |
| `identity.name` | `agentName` | Truncated to 100 characters; must be unique per region |
| `identity.description` | `description` | Truncated to 200 characters; optional |
| `capabilities.instructions` | `instruction` | Concatenated from `persona` + `instructions`. Minimum 40 characters; padded if necessary |
| `capabilities.tools[]` | `actionGroups[]` | Each tool becomes an ActionGroup with `RETURN_CONTROL` pattern |
| `capabilities.tools[].name` | `actionGroupName` | Sanitized to `[a-zA-Z0-9_-]+` |
| `capabilities.tools[].description` | `actionGroup.description` | Tool behavior description |
| `capabilities.tools[].input_schema` | `functionSchema` | Converted to OpenAPI-compatible parameter schema |
| `constraints.denied_actions[]` | `guardrailConfiguration` | Mapped to Bedrock Guardrail blocked topics |
| `ownership.deploymentEnvironment` | `tags.environment` | Value: `dev`, `staging`, `prod` |
| `ownership.businessUnit` | `tags.businessUnit` | Value: e.g., `trading`, `risk`, `ops` |
| `ownership.costCenter` | `tags.costCenter` | Cost allocation tag |
| `execution.observability` | `memoryConfiguration` | `logInteractions=true` → `SESSION_SUMMARY` memory type |

#### Example: ABP to AgentCore Translation

**Input: Agent Blueprint Package (partial)**

```json
{
  "metadata": {
    "id": "abp-fin-trading-2024",
    "enterprise_id": "ent-acme-bank"
  },
  "identity": {
    "name": "Market Risk Advisor",
    "description": "Analyzes equity exposure and recommends hedges"
  },
  "capabilities": {
    "persona": "You are a financial risk expert at Acme Bank.",
    "instructions": "Analyze portfolio risk and recommend hedging strategies.",
    "tools": [
      {
        "name": "fetch_portfolio",
        "description": "Retrieve the user's current portfolio",
        "input_schema": {
          "type": "object",
          "properties": {
            "account_id": { "type": "string" },
            "as_of_date": { "type": "string", "format": "date" }
          },
          "required": ["account_id"]
        }
      }
    ]
  },
  "ownership": {
    "deploymentEnvironment": "prod",
    "businessUnit": "trading",
    "costCenter": "cc-1234"
  },
  "execution": {
    "observability": {
      "logInteractions": true
    }
  }
}
```

**Output: AgentCore Manifest (passed to Bedrock CreateAgent)**

```json
{
  "agentName": "Market Risk Advisor",
  "description": "Analyzes equity exposure and recommends hedges",
  "instruction": "You are a financial risk expert at Acme Bank.\nAnalyze portfolio risk and recommend hedging strategies.",
  "foundationModel": "anthropic.claude-3-5-sonnet-20241022-v2:0",
  "agentResourceRoleArn": "arn:aws:iam::123456789012:role/IntelliosBedrocAgent",
  "actionGroups": [
    {
      "actionGroupName": "fetch_portfolio",
      "description": "Retrieve the user's current portfolio",
      "actionGroupExecutor": {
        "customControl": "RETURN_CONTROL"
      },
      "functionSchema": {
        "functions": [
          {
            "name": "fetch_portfolio",
            "description": "Retrieve the user's current portfolio",
            "parameters": {
              "account_id": {
                "type": "string",
                "description": "Account identifier"
              },
              "as_of_date": {
                "type": "string",
                "format": "date",
                "description": "Date for portfolio snapshot"
              }
            },
            "required": ["account_id"]
          }
        ]
      }
    }
  ],
  "tags": {
    "abpId": "abp-fin-trading-2024",
    "enterpriseId": "ent-acme-bank",
    "environment": "prod",
    "businessUnit": "trading",
    "costCenter": "cc-1234"
  },
  "memoryConfiguration": {
    "enabledMemoryTypes": ["SESSION_SUMMARY"]
  }
}
```

**Key insights:**
- Bedrock does not execute tools itself; `RETURN_CONTROL` means the calling application receives the tool invocation and executes it. This is intentional — Intellios governs what tools exist, but your application controls how they execute.
- The `instruction` field is padded to meet Bedrock's 40-character minimum without losing ABP content.
- Tags enable cost allocation and multi-tenancy traceability in your AWS billing and observability systems.

### Step 4: Deploy an Agent Through the Adapter

Once the adapter is configured, deploying an agent is a three-step workflow.

#### 4a. Approve a Blueprint

In the Intellios **Review Queue**, approve a blueprint that has passed governance validation. The blueprint now transitions to the "approved" state.

#### 4b. Trigger Deployment

1. In the **Blueprints** UI, find the approved blueprint.
2. Click **Deploy** (or **Deploy to AWS AgentCore** if multiple adapters are available).
3. The UI shows a modal with:
   - ABP summary
   - Predicted AgentCore manifest (read-only)
   - Deployment target (region, role ARN)
   - Estimated deployment time: "up to 90 seconds"

4. Click **Confirm Deployment**.

**Behind the scenes:**
- Intellios calls `translate()` to convert ABP → AgentCore manifest.
- Intellios calls `deploy()` with AWS credentials from the environment.
- The adapter calls `BedrockAgentClient.createAgent()` with the manifest.
- The adapter then polls `GetAgent` every 500ms until the agent status is `PREPARED` (max 90 seconds).
- Once prepared, the agent ID and ARN are stored in the database: `agentBlueprints.deploymentTarget = "agentcore"` and `agentBlueprints.deploymentMetadata = { agentId, agentArn, agentVersion, ... }`.

#### 4c. Verify Deployment

After the modal closes, you should see:
- ✅ Deployment status: "SUCCESS"
- Agent ID: `AGENTKJQO12ABCD...` (Bedrock-assigned)
- ARN: `arn:aws:bedrock:us-east-1:123456789012:agent/AGENTXYZ...`
- Deployed at: `2026-04-05T15:30:22Z`

**Expected result:** The agent now exists in AWS Bedrock and can be invoked via the Bedrock `InvokeAgent` API.

### Step 5: Configure Observability Bridge

Deployed agents generate telemetry (invocation logs, metrics, errors). Intellios integrates this observability into the control plane via two mechanisms: **direct health checks** and **webhook callbacks**.

#### 5a. Enable Observability Signals in ABP

When designing an agent, set the `execution.observability` block in the ABP:

```json
{
  "execution": {
    "observability": {
      "logInteractions": true,
      "captureConversationTranscripts": true,
      "metricsNamespace": "intellios/agents",
      "feedbackWebhookUrl": "https://intellios.example.com/webhooks/agent-feedback"
    }
  }
}
```

| Field | Effect on AgentCore |
|---|---|
| `logInteractions` | Enables Bedrock's `SESSION_SUMMARY` memory type; conversation summaries are logged to CloudWatch |
| `captureConversationTranscripts` | Enables full interaction logging (invocations, tool calls, responses) |
| `metricsNamespace` | CloudWatch namespace for custom metrics (optional; requires agent code to emit them) |
| `feedbackWebhookUrl` | Callback URL for lifecycle events (see Step 6 below) |

#### 5b. Query Agent Health

Intellios provides a health check endpoint that queries deployed agents in real-time:

```bash
curl -X GET "https://intellios.example.com/api/monitor/agentcore-health" \
  -H "Authorization: Bearer [INTELLIOS_API_TOKEN]"
```

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2026-04-05T15:35:00Z",
  "agents": [
    {
      "agentId": "AGENTXYZ123",
      "abpId": "abp-fin-trading-2024",
      "bedrockStatus": "PREPARED",
      "preparedAt": "2026-04-05T15:30:45Z",
      "lastInvoked": "2026-04-05T15:34:12Z",
      "health": "healthy",
      "errorCount": 0,
      "activeInteractions": 2
    }
  ],
  "summary": {
    "totalAgents": 1,
    "healthyAgents": 1,
    "failedAgents": 0,
    "unhealthyAgents": 0
  }
}
```

> **Note:** This endpoint is user-triggered, not automatically polled on page load. Use it in observability dashboards, monitoring systems, or health check scripts. Each agent query is a live AWS API call, so avoid polling more frequently than every 30 seconds in production.

#### 5c. Stream Metrics to CloudWatch

AgentCore agents automatically emit metrics to CloudWatch under the `AWS/Bedrock` namespace:

```bash
aws cloudwatch list-metrics \
  --namespace "AWS/Bedrock" \
  --dimensions Name=AgentId,Value=AGENTXYZ123 \
  --region us-east-1
```

Key metrics:
- `InvocationCount` — number of times the agent was invoked
- `AverageInvocationDuration` — milliseconds per invocation
- `ErrorCount` — failed invocations
- `ToolInvocationCount` — number of tool calls across all invocations

Wire these into your observability platform (DataDog, Splunk, Prometheus, etc.) using standard CloudWatch integrations.

### Step 6: Set Up Lifecycle Webhooks

Intellios supports outbound webhooks for agent lifecycle events. When an agent's state changes (deployed, retired, failed), Intellios posts a signed JSON payload to a configured URL.

#### 6a. Define the Webhook URL

In the ABP's `execution` block, set the `feedbackWebhookUrl`:

```json
{
  "execution": {
    "observability": {
      "feedbackWebhookUrl": "https://your-system.example.com/webhooks/intellios-agent-events"
    }
  }
}
```

This URL will receive POST requests whenever the agent's lifecycle state changes.

#### 6b. Implement a Webhook Receiver

Your webhook receiver must:
1. Accept POST requests with JSON body.
2. Verify the signature (see 6c).
3. Log or process the event.
4. Respond with HTTP 200 within 30 seconds.

**Example webhook handler (Node.js/Express):**

```javascript
import express from 'express';
import crypto from 'crypto';

const app = express();
const WEBHOOK_SECRET = process.env.INTELLIOS_WEBHOOK_SECRET; // Shared secret

app.post('/webhooks/intellios-agent-events', express.json(), (req, res) => {
  const signature = req.headers['x-intellios-signature'];
  const payload = JSON.stringify(req.body);

  // Verify signature
  const hash = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  if (signature !== hash) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const event = req.body;
  console.log(`Agent lifecycle event: ${event.type}`, event);

  switch (event.type) {
    case 'agent.deployed':
      // Log deployment in your system; emit metrics
      console.log(`Agent ${event.agentId} deployed in ${event.region}`);
      break;

    case 'agent.invoked':
      // Stream invocation telemetry (optional)
      console.log(`Agent invocation: ${event.duration}ms, success: ${event.success}`);
      break;

    case 'agent.retired':
      // Clean up resources; archive logs
      console.log(`Agent ${event.agentId} retired`);
      break;

    case 'agent.error':
      // Alert on errors; trigger incident response
      console.error(`Agent error: ${event.errorMessage}`);
      break;

    default:
      console.warn(`Unknown event type: ${event.type}`);
  }

  res.json({ received: true });
});

app.listen(3000, () => {
  console.log('Webhook receiver listening on port 3000');
});
```

#### 6c. Signature Verification

All webhook payloads are signed with `HMAC-SHA256`. The signature is in the `X-Intellios-Signature` header and is computed as:

```
signature = HMAC-SHA256(body, WEBHOOK_SECRET)
```

where `body` is the raw JSON request body and `WEBHOOK_SECRET` is your shared secret (provided by Intellios or retrieved from admin settings).

#### 6d. Register the Webhook in Admin Settings

1. Navigate to **Settings** → **Webhooks**.
2. Click **Add Webhook**.
3. Fill in:
   - **URL:** `https://your-system.example.com/webhooks/intellios-agent-events`
   - **Event Types:** Select `agent.deployed`, `agent.invoked`, `agent.retired`, `agent.error`
   - **Secret:** `[PLACEHOLDER: Generate a strong random secret, e.g., 32 hex chars]`
   - **Retry Policy:** Retry up to 3 times with exponential backoff if the receiver returns 5xx

4. Click **Test** (sends a sample payload).
5. Verify your receiver logs the test event.
6. Click **Save**.

**Webhook Payload Example (agent.deployed event):**

```json
{
  "event_id": "evt-abc123def456",
  "type": "agent.deployed",
  "timestamp": "2026-04-05T15:30:45Z",
  "agent": {
    "abpId": "abp-fin-trading-2024",
    "agentId": "AGENTXYZ123",
    "agentArn": "arn:aws:bedrock:us-east-1:123456789012:agent/AGENTXYZ123",
    "region": "us-east-1"
  },
  "deployment": {
    "deployedAt": "2026-04-05T15:30:45Z",
    "deployedBy": "platform-engineer@acme.com",
    "environment": "prod"
  }
}
```

---

## Verification

Confirm the entire adapter integration is working end-to-end:

### 1. Deploy a Test Blueprint

Create or approve a simple agent blueprint with at least one tool. Deploy it via the Intellios UI. Monitor the modal — deployment should complete within 90 seconds.

```bash
# Option: Deploy via CLI (if available)
intellios blueprints deploy --id abp-test-001 --target agentcore --region us-east-1
```

### 2. Query Agent Health

```bash
curl -X GET "https://intellios.example.com/api/monitor/agentcore-health" \
  -H "Authorization: Bearer [API_TOKEN]"
```

**Success criteria:**
- HTTP 200
- `agents[].bedrockStatus == "PREPARED"`
- `agents[].health == "healthy"`

### 3. Invoke the Agent via Bedrock API

```bash
aws bedrock-agent-runtime invoke-agent \
  --agent-id AGENTXYZ123 \
  --agent-alias-id ALNEKQW6D7 \
  --session-id user-session-001 \
  --input-text "What is my current portfolio exposure?" \
  --region us-east-1
```

**Success criteria:**
- Agent responds without errors
- Agent invokes the expected tools
- Logs appear in CloudWatch under `/aws/bedrock/agent/...`

### 4. Receive a Webhook Callback

Trigger the webhook receiver (e.g., by deploying another agent). Check your application logs:

```bash
tail -f /var/log/webhooks.log | grep "Agent lifecycle event"
```

**Success criteria:**
- Event is logged
- Signature verification passes
- No HTTP 500 errors

### 5. End-to-End: From Blueprint to Invocation

1. Approve a blueprint in Intellios.
2. Deploy it to AgentCore.
3. Invoke the deployed agent via the Bedrock CLI or SDK.
4. Verify the invocation appears in CloudWatch Logs (under `/aws/bedrock/agent/...`).
5. Confirm a webhook event was received by your system.

---

## Troubleshooting

If you encounter issues during integration:

| Symptom | Likely Cause | Resolution |
|---|---|---|
| Deploy button shows "Deployment target not configured" | AgentCore adapter not enabled in Admin Settings | Navigate to **Settings → Deployment Targets** and verify AgentCore is enabled with valid region and role ARN |
| Deployment hangs for >90 seconds, then times out | AWS Bedrock is slow to prepare the agent (multiple tools, complex instructions) | Increase `BEDROCK_DEPLOYMENT_TIMEOUT_MS` to 120000 (2 minutes) in your environment. This is normal for agents with 5+ tools |
| Deploy succeeds, but health check shows `bedrockStatus: "FAILED"` | Agent definition has a validation error (instruction too short, invalid tool schema, etc.) | Check CloudWatch Logs under `/aws/bedrock/agent/`. The agent's error message will identify the issue. Common: `denied_actions[]` field is not a valid Bedrock guardrail blocklist |
| Health check endpoint returns HTTP 401 "Unauthorized" | API token missing or expired | Include the `Authorization: Bearer [TOKEN]` header. Retrieve token from **Settings → API Keys** |
| Webhook receiver returns HTTP 403 for valid signatures | Webhook secret mismatch | Verify the secret in **Settings → Webhooks** matches the secret used in your HMAC-SHA256 calculation |
| Agent invocation succeeds but tool calls fail with "not found" | Tool not included in ActionGroup, or tool name is misspelled | Verify the tool is defined in the ABP and appears in the Bedrock agent's `actionGroups[]`. Tool names are case-sensitive |
| Error: `AccessDeniedExceptionError: User is not authorized to perform: bedrock:CreateAgent` | IAM credentials lack permissions | Verify the AWS credentials have the `bedrock:CreateAgent`, `bedrock:PrepareAgent`, `bedrock:GetAgent` actions on Bedrock resources in the specified region. Test with `aws sts get-caller-identity` |
| Error: `Invalid ARN format for agentResourceRoleArn` | Role ARN is malformed | Verify the ARN follows the pattern: `arn:aws:iam::ACCOUNT_ID:role/ROLE_NAME`. Retrieve the correct ARN from the IAM console: **Roles** → **Role Name** → copy the ARN in the summary |

For additional help, see [AWS AgentCore Integration](agentcore-integration.md) or contact your Intellios support escalation point.

---

## Next Steps

Now that you have configured a runtime adapter and deployed your first agent:

- **Monitor and tune:** See [Observability Dashboards](../07-administration-operations/observability-dashboards.md) to set up alerts and SLOs for deployed agents.
- **Add Azure integration:** Once AgentCore is stable, extend your deployment targets. See [Azure AI Foundry Integration](ai-foundry-integration.md).
- **Automate lifecycle:** Configure [Webhook Integration](webhook-integration.md) for full lifecycle automation (CI/CD deployment, compliance audit trails, incident response).
- **Scale to multi-cloud:** Design a deployment topology that targets multiple clouds based on data residency or cost. Document in your architecture ADRs (see [docs/decisions/](../../docs/decisions/)).

---

*See also: [Runtime Adapters](../03-core-concepts/runtime-adapters.md) · [AWS AgentCore Integration](agentcore-integration.md) · [Agent Blueprint Package (ABP)](../03-core-concepts/agent-blueprint-package.md) · [ADR-010: AgentCore Integration Strategy](../../docs/decisions/010-agentcore-integration.md)*
