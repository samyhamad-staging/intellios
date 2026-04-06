---
id: "04-004"
title: "Integrate Intellios with AWS AgentCore"
slug: "agentcore-integration"
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
  - "aws-agentcore"
  - "runtime-adapter"
  - "aws-bedrock"
  - "integration"
  - "deployment"
prerequisites:
  - "04-003"
  - "03-001"
related:
  - "04-003"
  - "04-013"
  - "08-005"
next_steps:
  - "04-013"
  - "07-003"
feedback_url: "https://feedback.intellios.ai/kb"
tldr: >
  Step-by-step walkthrough for connecting Intellios to AWS Bedrock Agents via the AgentCore adapter. Covers IAM setup, environment configuration, credential validation, and deployment of your first agent blueprint to production. Expected time: 45–90 minutes.
---

# Integrate Intellios with AWS AgentCore

> **TL;DR:** Connect your Intellios instance to AWS Bedrock Agents in 10 steps: verify prerequisites, configure AWS credentials, create an IAM role for agents, enable the AgentCore adapter in admin settings, validate the connection, deploy a test agent, verify deployment in the AWS console, configure observability, set up webhook callbacks, and implement production hardening.

## Goal

By the end of this guide, you will have a fully configured AWS AgentCore adapter connected to your Intellios instance, have deployed a test agent blueprint to AWS Bedrock Agents, and have observability and lifecycle webhooks in place.

## Prerequisites

Before starting, ensure you have:

- [ ] An Intellios instance (v1.2.0 or later) running on ECS Fargate, EC2, or local development environment with administrative access
- [ ] An active AWS account with the `AdministratorAccess` or equivalent IAM permissions
- [ ] AWS Bedrock Agents enabled in at least one region (e.g., `us-east-1`, `eu-west-1`)
- [ ] AWS CLI v2 installed locally and configured with credentials (`aws --version`)
- [ ] An approved or draft Agent Blueprint Package (ABP) ready to deploy (see [Agent Blueprint Package](../03-core-concepts/agent-blueprint-package.md))
- [ ] Familiarity with AWS Identity and Access Management (IAM), CloudWatch, and the Bedrock console
- [ ] A text editor to modify environment files (`.env.local` for development, task definitions for production)

---

## Steps

### Step 1: Verify AWS Account Permissions and Bedrock Availability

Confirm you have the necessary AWS permissions and Bedrock Agents is enabled in your target region.

Run the following AWS CLI commands to validate:

```bash
# Check Bedrock service availability in your region
aws bedrock list-foundation-models --region us-east-1 --query 'modelSummaries[?provider==`Anthropic`]'

# Verify your IAM identity
aws sts get-caller-identity
```

**Expected result:**
- The first command returns a list of Anthropic models (e.g., `anthropic.claude-3-5-sonnet-20241022-v2:0`).
- The second command returns your AWS account ID, user/role ARN, and current AWS identity.

If Bedrock is not available in your region, enable it via the AWS console: **Bedrock** → **Model Access** → **Manage Model Access** → enable Claude 3.5 Sonnet.

### Step 2: Create the IAM Role for Bedrock Agents

Deployed agents assume this role and use it to invoke the Claude model and any additional AWS services your agents need (S3, DynamoDB, Secrets Manager, etc.).

Create a new IAM role using the AWS CLI:

```bash
# Create the trust policy document
cat > /tmp/trust-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "bedrock.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create the IAM role
aws iam create-role \
  --role-name IntelliosBedrocAgentRole \
  --assume-role-policy-document file:///tmp/trust-policy.json \
  --description "IAM role for Intellios-deployed Bedrock agents"
```

Capture the role ARN from the output. It will look like: `arn:aws:iam::123456789012:role/IntelliosBedrocAgentRole`.

### Step 3: Attach Inline Policy for Bedrock Model Access

Attach a policy allowing the role to invoke the Claude 3.5 Sonnet model:

```bash
# Create the model access policy
cat > /tmp/model-policy.json <<'EOF'
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
    }
  ]
}
EOF

# Attach the policy to the role
aws iam put-role-policy \
  --role-name IntelliosBedrocAgentRole \
  --policy-name BedrockModelAccess \
  --policy-document file:///tmp/model-policy.json
```

### Step 4: Add CloudWatch Logging Permissions

Agents need permissions to write logs to CloudWatch. Add this policy:

```bash
# Create the CloudWatch logging policy
cat > /tmp/cloudwatch-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:us-east-1:123456789012:log-group:/aws/bedrock/agent/*"
    }
  ]
}
EOF

# Attach the policy to the role (replace 123456789012 with your AWS account ID)
aws iam put-role-policy \
  --role-name IntelliosBedrocAgentRole \
  --policy-name BedrockCloudWatchLogging \
  --policy-document file:///tmp/cloudwatch-policy.json
```

### Step 5: Configure AWS Credentials in Your Intellios Environment

Intellios reads AWS credentials from environment variables. Set these in your deployment environment.

**For local development (`.env.local`):**

```bash
# AWS Region (must match where Bedrock is enabled)
AWS_REGION=us-east-1

# AWS credentials (use IAM user access keys or temporary STS credentials)
AWS_ACCESS_KEY_ID=[YOUR_AWS_ACCESS_KEY]
AWS_SECRET_ACCESS_KEY=[YOUR_AWS_SECRET_ACCESS_KEY]

# The IAM role ARN that Bedrock agents will assume
BEDROCK_AGENT_RESOURCE_ROLE_ARN=arn:aws:iam::123456789012:role/IntelliosBedrocAgentRole

# Optional: Deployment timeout (milliseconds; default 90000)
BEDROCK_DEPLOYMENT_TIMEOUT_MS=90000
```

> **Security note:** Never commit credentials to version control. Use AWS Secrets Manager, Parameter Store, or environment files excluded from git (e.g., `.env.local` in `.gitignore`).

**For production (ECS Fargate task definition):**

If Intellios is deployed on ECS Fargate, add environment variables to your task definition JSON:

```json
{
  "family": "intellios",
  "containerDefinitions": [
    {
      "name": "intellios",
      "image": "intellios:latest",
      "environment": [
        { "name": "AWS_REGION", "value": "us-east-1" },
        { "name": "BEDROCK_AGENT_RESOURCE_ROLE_ARN", "value": "arn:aws:iam::123456789012:role/IntelliosBedrocAgentRole" },
        { "name": "BEDROCK_DEPLOYMENT_TIMEOUT_MS", "value": "90000" }
      ]
    }
  ]
}
```

For credentials, use task role IAM permissions. Attach the `BedrockModelAccess` policy to the task's IAM role instead of passing explicit keys.

**Expected result:** Intellios can now read AWS credentials from the environment and authenticate to AWS Bedrock.

### Step 6: Enable the AgentCore Adapter in Admin Settings

Sign in to Intellios with an admin account and activate the AWS AgentCore runtime adapter.

1. Click **Settings** (gear icon, top right).
2. Navigate to **Deployment Targets**.
3. Click **Add Deployment Target**.
4. Select **AWS Bedrock Agents** (or "AWS AgentCore").
5. Fill in the form:

```json
{
  "adapter": "agentcore",
  "enabled": true,
  "region": "us-east-1",
  "agentResourceRoleArn": "arn:aws:iam::123456789012:role/IntelliosBedrocAgentRole",
  "deploymentTimeoutMs": 90000,
  "guardrailConfiguration": {
    "enabled": false
  }
}
```

6. Click **Validate Configuration** — Intellios will test AWS credentials and role permissions.
7. Click **Save**.

**Expected result:** The settings page now shows "AgentCore (Bedrock Agents)" as an active deployment target. The "Deploy" button in the Blueprints UI is now enabled.

### Step 7: Test the Adapter Connection

Verify the adapter can communicate with AWS Bedrock by running a connection health check.

From the Intellios admin panel:

1. Navigate to **Deployment Targets** → **AWS Bedrock Agents**.
2. Click **Test Connection**.

The system will attempt to:
- List Bedrock models in the region.
- Verify the agent resource role ARN is valid.
- Confirm logging permissions.

**Expected result:**
- Status: "Connection successful"
- Details show the Bedrock region, role ARN, and available models.

If the test fails, check:
- AWS credentials are set correctly (see Step 5).
- The agent resource role exists and has the correct permissions (see Steps 2–4).
- Bedrock Agents is enabled in the target region.

### Step 8: Deploy a Test Agent Blueprint

Deploy an approved or draft Agent Blueprint Package (ABP) to AWS Bedrock Agents to verify the full integration.

1. Navigate to **Blueprints** (left sidebar).
2. Find an approved blueprint or create a simple one:
   - Name: "Test Agent"
   - Description: "Integration test agent"
   - Tools: Add at least one simple tool (e.g., a tool that retrieves information).
3. Click the blueprint to open the detail view.
4. Click **Deploy** (or **Deploy to AWS AgentCore** if multiple adapters are available).
5. A modal will appear with:
   - ABP summary
   - Predicted AgentCore manifest (read-only)
   - Deployment target: "AWS Bedrock Agents (us-east-1)"
   - Estimated time: "60–90 seconds"

6. Click **Confirm Deployment**.

The UI will show a progress indicator. Behind the scenes:
- Intellios translates the ABP to an AgentCore manifest.
- The manifest is sent to Bedrock's `CreateAgent` API.
- Intellios polls the agent status every 500ms until it reaches `PREPARED` state (max 90 seconds).

**Expected result:**
- Deployment succeeds and the modal shows a green checkmark.
- Details include the agent ID (e.g., `AGENTKJQO12ABCD...`) and ARN.
- Status: "Deployed" with a timestamp.

### Step 9: Verify Deployment in AWS Console

Open the AWS Bedrock console and verify the agent was created.

1. Sign in to the AWS console.
2. Navigate to **Bedrock** → **Agents**.
3. Verify your test agent appears in the list (name matches the blueprint's identity.name).
4. Click the agent name to view its details:
   - Status: "Prepared"
   - Creation time: matches your deployment timestamp
   - Resource role: matches your `IntelliosBedrocAgentRole`
   - Tools (action groups): match the blueprint's tools

5. Click **Test Agent** to invoke it from the console:
   - Type a test prompt (e.g., "What are my agent's capabilities?").
   - The agent should respond without errors.

**Expected result:**
- Agent status in Bedrock is "Prepared".
- Agent invocation succeeds and returns a response.
- Logs appear in CloudWatch under `/aws/bedrock/agent/...`.

### Step 10: Configure Observability and Webhooks

Set up observability signals and lifecycle webhooks so Intellios can monitor deployed agents.

#### 10a. Enable Observability in ABP

Update your blueprint's `execution` block to enable logging and webhooks:

```json
{
  "execution": {
    "observability": {
      "logInteractions": true,
      "captureConversationTranscripts": true,
      "metricsNamespace": "intellios/agents",
      "feedbackWebhookUrl": "https://[YOUR_INTELLIOS_URL]/webhooks/agent-feedback"
    }
  }
}
```

#### 10b. Register a Webhook in Admin Settings

1. Navigate to **Settings** → **Webhooks**.
2. Click **Add Webhook**.
3. Fill in:
   - **URL:** `https://[YOUR_INTELLIOS_URL]/webhooks/agent-feedback`
   - **Event Types:** Select `agent.deployed`, `agent.invoked`, `agent.retired`, `agent.error`
   - **Secret:** Generate a random 32-character hex string (e.g., `openssl rand -hex 16`). Copy this value.
   - **Retry Policy:** "Exponential backoff, up to 3 retries"

4. Click **Test** to send a sample payload.
5. Verify your webhook receiver logs the test event (check application logs).
6. Click **Save**.

**Expected result:**
- Webhooks are registered in Admin Settings.
- Test webhook payload is received and logged.
- Future agent lifecycle events will trigger webhook callbacks.

---

## Verification

Confirm the entire AWS AgentCore integration is working end-to-end.

### 1. Full Deployment Workflow

1. Approve a blueprint in the Intellios Review Queue.
2. Deploy it to AWS AgentCore via the Blueprints UI.
3. Verify deployment succeeds within 90 seconds.

```bash
# Verify the agent exists in Bedrock
aws bedrock-agent list-agents --region us-east-1 --query 'agents[?name==`Test Agent`]'
```

**Success criteria:**
- Agent appears in the CLI output with status `PREPARED`.

### 2. Query Agent Health via Intellios API

```bash
curl -X GET "https://[YOUR_INTELLIOS_URL]/api/monitor/agentcore-health" \
  -H "Authorization: Bearer [INTELLIOS_API_TOKEN]"
```

**Success criteria:**
- HTTP 200 response
- Response includes deployed agents with `bedrockStatus: "PREPARED"`
- `health` field shows `"healthy"`

### 3. Invoke the Agent via Bedrock

```bash
aws bedrock-agent-runtime invoke-agent \
  --agent-id [AGENT_ID_FROM_STEP_8] \
  --agent-alias-id ALNEKQW6D7 \
  --session-id user-session-001 \
  --input-text "Hello agent, what can you do?" \
  --region us-east-1
```

**Success criteria:**
- Command returns HTTP 200 with an agent response.
- Response content is returned in the output.

### 4. Verify CloudWatch Logs

```bash
aws logs tail /aws/bedrock/agent/ --follow --region us-east-1
```

**Success criteria:**
- Logs appear showing agent invocations, tool calls, and responses.
- No error messages in the logs.

### 5. Confirm Webhook Callback

After deploying an agent or invoking it, check your webhook receiver logs:

```bash
# If webhook receiver is running locally
tail -f /var/log/app.log | grep "Agent lifecycle event"

# Or check application error logging
grep "agent\." /var/log/app.log
```

**Success criteria:**
- Webhook events are logged (e.g., `agent.deployed`, `agent.invoked`).
- Signature verification passes.
- No HTTP 500 errors.

---

## Troubleshooting

If you encounter issues during integration:

| Symptom | Likely Cause | Resolution |
|---|---|---|
| Error: "Deploy button not available" or "No deployment target configured" | AgentCore adapter not enabled in Admin Settings | Navigate to **Settings → Deployment Targets** and verify AgentCore is enabled with valid region and role ARN. Run **Test Connection**. |
| Error: `AccessDeniedExceptionError: User is not authorized to perform: bedrock:CreateAgent` | AWS credentials or IAM role lacks permissions | Verify `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are set. Confirm the IAM role has `bedrock:CreateAgent`, `bedrock:PrepareAgent`, `bedrock:GetAgent` permissions. Test with `aws sts get-caller-identity`. |
| Error: `Invalid ARN format for agentResourceRoleArn` | Role ARN is malformed | Verify ARN follows pattern `arn:aws:iam::ACCOUNT_ID:role/ROLE_NAME`. Retrieve correct ARN: AWS console → **IAM** → **Roles** → role name → copy from summary. |
| Deployment hangs for >90 seconds, then times out | Agent preparation is slow (large instruction, many tools) | Increase `BEDROCK_DEPLOYMENT_TIMEOUT_MS` to 120000 (2 minutes). Simplify agent (fewer tools, shorter instructions). This is normal for complex agents. |
| Deployment succeeds, but health check shows `bedrockStatus: "FAILED"` | Agent definition has validation error (invalid tool schema, instruction too short) | Check CloudWatch Logs: AWS console → **CloudWatch** → **Logs** → `/aws/bedrock/agent/` → view agent's log stream. Error message identifies the issue. |
| Error: "Bedrock service is not available in region `us-east-1`" | Bedrock Agents not enabled in the target region | Enable Bedrock: AWS console → **Bedrock** → **Model Access** → **Manage Model Access** → enable Claude 3.5 Sonnet. Wait 5 minutes and retry. |
| Webhook receiver returns HTTP 403 "Signature verification failed" | Webhook secret mismatch | Verify the secret in **Settings → Webhooks** matches the secret used in your HMAC-SHA256 signature calculation. |
| Agent invocation returns error "Tool not found" | Tool defined in ABP but not present in deployed agent | Verify tool name in ABP matches tool name in the Bedrock agent definition (case-sensitive). Tools are converted to ActionGroups; check the Bedrock console → agent → "Action groups" tab. |

For additional help, see [Runtime Adapter Configuration](runtime-adapter-pattern.md) or [Deployment Guide](deployment-guide.md).

---

## Next Steps

Now that you have integrated Intellios with AWS AgentCore:

- **Expand to production:** Follow [Deployment Guide](deployment-guide.md) to set up a production-grade Intellios instance with autoscaling, multi-region deployment, and backup policies.
- **Monitor at scale:** Set up observability dashboards in [Observability and Monitoring](../07-administration-operations/observability-dashboards.md) to track agent health, performance, and compliance.
- **Extend to other clouds:** Once AgentCore is stable, add other runtime adapters (Azure AI Foundry, NVIDIA Dynamo, on-premises). See [Runtime Adapters](../03-core-concepts/runtime-adapters.md).
- **Automate lifecycle:** Configure CI/CD integration to automatically deploy approved agents. Document your deployment topology in [Architecture Decision Records](../../docs/decisions/).

---

*See also: [Configure a Runtime Adapter to Deploy Agents](runtime-adapter-pattern.md) · [Deployment Guide](deployment-guide.md) · [Runtime Adapters](../03-core-concepts/runtime-adapters.md) · [Agent Blueprint Package (ABP)](../03-core-concepts/agent-blueprint-package.md) · [ADR-010: AgentCore Integration Strategy](../../docs/decisions/010-agentcore-integration.md)*
