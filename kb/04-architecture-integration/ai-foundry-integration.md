---
id: "04-005"
title: "Integrate Intellios with Azure AI Foundry"
slug: "ai-foundry-integration"
type: "task"
audiences:
  - "engineering"
status: "published"
version: "1.0.0"
platform_version: "1.2.0"
created: "2026-04-05"
updated: "2026-04-05"
author: "Intellios Platform Engineering"
reviewers: []
tags:
  - "azure"
  - "ai-foundry"
  - "runtime-adapter"
  - "multi-cloud"
  - "deployment"
  - "integration"
  - "microsoft"
prerequisites:
  - "04-003"
  - "03-001"
related:
  - "04-003"
  - "04-004"
  - "04-013"
next_steps:
  - "04-013"
  - "07-003"
feedback_url: "https://feedback.intellios.ai/kb"
tldr: >
  Step-by-step walkthrough for connecting Intellios to Azure AI Foundry via the Azure AI Foundry runtime adapter. Covers Azure authentication, RBAC configuration, environment setup, credential validation, deployment of your first agent blueprint, and observability integration. Expected time: 45–90 minutes.
---

# Integrate Intellios with Azure AI Foundry

> **TL;DR:** Connect your Intellios instance to Azure AI Foundry in 10 steps: verify prerequisites, create an Azure service principal, configure RBAC roles, set environment variables, enable the Azure AI Foundry adapter in admin settings, validate the connection, deploy a test agent, verify deployment in the Azure console, configure observability via Azure Monitor, and set up Event Grid webhooks.

## Goal

By the end of this guide, you will have a fully configured Azure AI Foundry adapter connected to your Intellios instance, have deployed a test agent blueprint to Azure AI Foundry, and have observability and lifecycle webhooks in place for multi-cloud operations.

## Prerequisites

Before starting, ensure you have:

- [ ] An Intellios instance (v1.2.0 or later) running on Azure Container Instances, Azure App Service, or local development environment with administrative access
- [ ] An active Microsoft Azure subscription with Owner or Contributor role on the subscription
- [ ] An Azure AI Foundry workspace (formerly Azure AI Studio) already created in your target region
- [ ] A resource group containing the AI Foundry workspace (e.g., `rg-intellios-agents`)
- [ ] Azure CLI v2.50+ installed locally and authenticated (`az --version` and `az account show`)
- [ ] An approved or draft Agent Blueprint Package (ABP) ready to deploy (see [Agent Blueprint Package](../03-core-concepts/agent-blueprint-package.md))
- [ ] Familiarity with Azure Identity and Access Management (RBAC), Azure Monitor, and the Azure AI Foundry portal
- [ ] A text editor to modify environment files (`.env.local` for development, deployment variables for production)

---

## Steps

### Step 1: Verify Azure Subscription and Resource Group

Confirm you have an active Azure subscription and locate the resource group that contains your AI Foundry workspace.

Run the following Azure CLI commands:

```bash
# List all Azure subscriptions and verify your active subscription
az account list --output table

# Show current subscription details
az account show --query '{id:id, name:name, state:state}'

# List resource groups in your subscription
az group list --output table --query '[].{Name:name, Location:location, State:managedBy}'
```

**Expected result:**
- The first command shows a list of subscriptions; your target subscription should have a checkmark.
- The second command displays your current subscription's ID, name, and state (should be "Enabled").
- The third command lists resource groups. Verify your AI Foundry resource group appears (e.g., `rg-intellios-agents`).

If the resource group does not exist, create it:

```bash
az group create --name rg-intellios-agents --location eastus
```

### Step 2: Create an Azure Service Principal for Intellios

Service principals enable Intellios to authenticate to Azure without storing user credentials. Create a service principal scoped to your AI Foundry resource group.

```bash
# Create a service principal named intellios-deployer
az ad sp create-for-rbac \
  --name intellios-deployer \
  --role Contributor \
  --scopes /subscriptions/[YOUR_SUBSCRIPTION_ID]/resourceGroups/rg-intellios-agents \
  --output json > /tmp/azure-sp.json

# Display the service principal details
cat /tmp/azure-sp.json
```

**Expected result:**

You will receive a JSON object containing:

```json
{
  "appId": "00000000-0000-0000-0000-000000000000",
  "displayName": "intellios-deployer",
  "password": "password-value",
  "tenant": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

**IMPORTANT:** Save this JSON securely. The `appId`, `password`, and `tenant` values are required in Step 5. Do not commit these to version control.

### Step 3: Verify Azure AI Foundry Workspace

Locate your AI Foundry workspace and gather its properties. These will be used to configure the adapter.

```bash
# List all AI Foundry workspaces in your subscription
az ml workspace list --resource-group rg-intellios-agents --output table

# Get detailed information about a specific workspace
az ml workspace show \
  --name [YOUR_WORKSPACE_NAME] \
  --resource-group rg-intellios-agents \
  --output json | jq '{id, name, location, subscription_id}'
```

**Expected result:**
- Workspace name matches your AI Foundry workspace (e.g., `intellios-workspace`).
- Location matches your chosen Azure region (e.g., `eastus`, `westeurope`).
- Subscription ID matches your subscription.

Save the workspace name, resource group, and subscription ID for Step 5.

### Step 4: Configure Azure RBAC Roles

The service principal needs specific Azure RBAC roles to deploy and manage agents in Azure AI Foundry.

Assign the required roles to the service principal:

```bash
# Get the service principal object ID
SP_OBJECT_ID=$(az ad sp show --id [YOUR_APP_ID] --query 'id' -o tsv)

# Assign Cognitive Services Contributor (required to deploy AI models)
az role assignment create \
  --assignee $SP_OBJECT_ID \
  --role "Cognitive Services Contributor" \
  --scope /subscriptions/[YOUR_SUBSCRIPTION_ID]/resourceGroups/rg-intellios-agents

# Assign ML Workspace Contributor (required to manage AI Foundry resources)
az role assignment create \
  --assignee $SP_OBJECT_ID \
  --role "Contributor" \
  --scope /subscriptions/[YOUR_SUBSCRIPTION_ID]/resourceGroups/rg-intellios-agents
```

Verify the role assignments:

```bash
az role assignment list \
  --assignee $SP_OBJECT_ID \
  --resource-group rg-intellios-agents \
  --output table
```

**Expected result:**
- Both role assignments appear in the output.
- Role Names include "Cognitive Services Contributor" and "Contributor".

### Step 5: Configure Azure Credentials in Your Intellios Environment

Intellios reads Azure credentials from environment variables. Set these in your deployment environment.

**For local development (`.env.local`):**

```bash
# Azure Subscription, Tenant, and Workspace Details
AZURE_SUBSCRIPTION_ID=[YOUR_SUBSCRIPTION_ID]
AZURE_TENANT_ID=[YOUR_TENANT_ID]
AZURE_RESOURCE_GROUP=rg-intellios-agents

# Azure AI Foundry Workspace
AZURE_AI_FOUNDRY_WORKSPACE_NAME=intellios-workspace
AZURE_AI_FOUNDRY_LOCATION=eastus

# Service Principal Credentials (for authentication)
AZURE_CLIENT_ID=[YOUR_APP_ID]
AZURE_CLIENT_SECRET=[YOUR_PASSWORD]

# Optional: Deployment timeout (milliseconds; default 120000)
AZURE_DEPLOYMENT_TIMEOUT_MS=120000

# Optional: Azure Monitor metrics namespace
AZURE_MONITOR_METRICS_NAMESPACE=intellios/agents
```

> **Security note:** Never commit credentials to version control. Use Azure Key Vault or environment files excluded from git (e.g., `.env.local` in `.gitignore`).

**For production (Azure App Service environment variables or Key Vault):**

If Intellios is deployed on Azure App Service, configure environment variables via the Azure portal or CLI:

```bash
az webapp config appsettings set \
  --resource-group rg-intellios-agents \
  --name [YOUR_APP_SERVICE_NAME] \
  --settings \
    AZURE_SUBSCRIPTION_ID=[YOUR_SUBSCRIPTION_ID] \
    AZURE_TENANT_ID=[YOUR_TENANT_ID] \
    AZURE_RESOURCE_GROUP=rg-intellios-agents \
    AZURE_AI_FOUNDRY_WORKSPACE_NAME=intellios-workspace \
    AZURE_AI_FOUNDRY_LOCATION=eastus \
    AZURE_DEPLOYMENT_TIMEOUT_MS=120000
```

For credentials, use Azure Key Vault with App Service managed identity:

```bash
# Create a Key Vault (if not already present)
az keyvault create \
  --name intellios-vault \
  --resource-group rg-intellios-agents \
  --location eastus

# Store service principal credentials in Key Vault
az keyvault secret set \
  --vault-name intellios-vault \
  --name AzureClientId \
  --value [YOUR_APP_ID]

az keyvault secret set \
  --vault-name intellios-vault \
  --name AzureClientSecret \
  --value [YOUR_PASSWORD]

# Grant App Service managed identity access to the vault
az keyvault set-policy \
  --name intellios-vault \
  --object-id [APP_SERVICE_PRINCIPAL_ID] \
  --secret-permissions get list
```

**Expected result:** Intellios can now authenticate to Azure AI Foundry using the service principal credentials.

### Step 6: Enable the Azure AI Foundry Adapter in Admin Settings

Sign in to Intellios with an admin account and activate the Azure AI Foundry runtime adapter.

1. Click **Settings** (gear icon, top right).
2. Navigate to **Deployment Targets**.
3. Click **Add Deployment Target**.
4. Select **Azure AI Foundry** (or "Azure AI Foundry").
5. Fill in the form:

```json
{
  "adapter": "ai-foundry",
  "enabled": true,
  "subscriptionId": "[YOUR_SUBSCRIPTION_ID]",
  "resourceGroup": "rg-intellios-agents",
  "workspaceName": "intellios-workspace",
  "location": "eastus",
  "deploymentTimeoutMs": 120000,
  "observability": {
    "enabled": true,
    "metricsNamespace": "intellios/agents"
  }
}
```

6. Click **Validate Configuration** — Intellios will test Azure credentials and workspace access.
7. Click **Save**.

**Expected result:** The settings page now shows "Azure AI Foundry" as an active deployment target. The "Deploy" button in the Blueprints UI now supports multi-cloud selection.

### Step 7: Test the Adapter Connection

Verify the adapter can communicate with Azure AI Foundry by running a connection health check.

From the Intellios admin panel:

1. Navigate to **Deployment Targets** → **Azure AI Foundry**.
2. Click **Test Connection**.

The system will attempt to:
- Authenticate using the service principal.
- List AI Foundry workspaces in the subscription.
- Verify the workspace exists and is accessible.
- Confirm RBAC permissions on the resource group.

**Expected result:**
- Status: "Connection successful"
- Details show the workspace name, location, resource group, and subscription ID.

If the test fails, check:
- Azure credentials are set correctly in environment variables (see Step 5).
- The service principal has Cognitive Services Contributor and Contributor roles (see Step 4).
- The AI Foundry workspace exists and is in the specified resource group.

### Step 8: Deploy a Test Agent Blueprint

Deploy an approved or draft Agent Blueprint Package (ABP) to Azure AI Foundry to verify the full integration.

1. Navigate to **Blueprints** (left sidebar).
2. Find an approved blueprint or create a simple one:
   - Name: "Test Agent"
   - Description: "Integration test agent"
   - Tools: Add at least one simple tool (e.g., a tool that retrieves information).
3. Click the blueprint to open the detail view.
4. Click **Deploy** (or **Deploy to Azure AI Foundry** if multiple adapters are available).
5. A modal will appear with:
   - ABP summary
   - Predicted Azure AI Foundry manifest (read-only)
   - Deployment target: "Azure AI Foundry (eastus)"
   - Estimated time: "90–120 seconds"

6. Click **Confirm Deployment**.

The UI will show a progress indicator. Behind the scenes:
- Intellios translates the ABP to an Azure AI Foundry agent deployment manifest.
- The manifest is sent to Azure AI Foundry's deployment API.
- Intellios polls the agent status every 500ms until it reaches `Active` state (max 120 seconds).

**Expected result:**
- Deployment succeeds and the modal shows a green checkmark.
- Details include the agent ID (e.g., `agent-[random-uuid]`) and resource URI.
- Status: "Deployed" with a timestamp.

### Step 9: Verify Deployment in Azure Portal

Open the Azure AI Foundry console and verify the agent was created.

1. Sign in to the Azure portal.
2. Navigate to **AI Foundry** → your workspace → **Agents**.
3. Verify your test agent appears in the list (name matches the blueprint's identity.name).
4. Click the agent name to view its details:
   - Status: "Active"
   - Creation time: matches your deployment timestamp
   - Region: matches your configured location
   - Tools: match the blueprint's tools

5. Click **Test Chat** to invoke the agent from the portal:
   - Type a test prompt (e.g., "What are my agent's capabilities?").
   - The agent should respond without errors.

**Expected result:**
- Agent status in Azure AI Foundry is "Active".
- Agent invocation succeeds and returns a response.
- Logs appear in Azure Monitor under the configured metrics namespace.

### Step 10: Configure Observability and Webhooks

Set up observability signals and lifecycle webhooks so Intellios can monitor deployed agents across clouds.

#### 10a. Enable Observability in ABP

Update your blueprint's `execution` block to enable logging and webhooks:

```json
{
  "execution": {
    "observability": {
      "logInteractions": true,
      "captureConversationTranscripts": true,
      "metricsNamespace": "intellios/agents",
      "metricsInterval": 60,
      "feedbackWebhookUrl": "https://[YOUR_INTELLIOS_URL]/webhooks/agent-feedback"
    }
  }
}
```

#### 10b. Configure Azure Monitor Metrics Bridge

Connect Azure Monitor metrics to your Intellios observability dashboard:

```bash
# Create an Azure Monitor diagnostic setting to export metrics
az monitor metrics alert create \
  --name intellios-agent-health \
  --resource-group rg-intellios-agents \
  --scopes /subscriptions/[YOUR_SUBSCRIPTION_ID]/resourceGroups/rg-intellios-agents \
  --condition "avg Metric(intellios/agents/invocation_count) > 0" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action add-action-group [ACTION_GROUP_NAME]
```

#### 10c. Set Up Event Grid Webhook

Configure Azure Event Grid to send agent lifecycle events to your Intellios webhook endpoint:

```bash
# Create an Event Grid custom topic
az eventgrid topic create \
  --name intellios-agents-topic \
  --resource-group rg-intellios-agents \
  --location eastus

# Subscribe to agent lifecycle events
az eventgrid event-subscription create \
  --name intellios-agent-lifecycle \
  --topic-name intellios-agents-topic \
  --resource-group rg-intellios-agents \
  --endpoint https://[YOUR_INTELLIOS_URL]/webhooks/agent-lifecycle \
  --endpoint-type webhook \
  --included-event-types agent.deployed agent.invoked agent.retired agent.error
```

#### 10d. Register Webhook in Admin Settings

1. Navigate to **Settings** → **Webhooks**.
2. Click **Add Webhook**.
3. Fill in:
   - **URL:** `https://[YOUR_INTELLIOS_URL]/webhooks/agent-lifecycle`
   - **Event Types:** Select `agent.deployed`, `agent.invoked`, `agent.retired`, `agent.error`
   - **Secret:** Generate a random 32-character hex string (e.g., `openssl rand -hex 16`). Copy this value.
   - **Retry Policy:** "Exponential backoff, up to 3 retries"
   - **Cloud Provider:** "Azure Event Grid"

4. Click **Test** to send a sample payload.
5. Verify your webhook receiver logs the test event (check application logs).
6. Click **Save**.

**Expected result:**
- Webhooks are registered in Admin Settings.
- Test webhook payload is received and logged.
- Future agent lifecycle events from Azure AI Foundry will trigger webhook callbacks.

---

## Verification

Confirm the entire Azure AI Foundry integration is working end-to-end.

### 1. Full Deployment Workflow

1. Approve a blueprint in the Intellios Review Queue.
2. Deploy it to Azure AI Foundry via the Blueprints UI.
3. Verify deployment succeeds within 120 seconds.

```bash
# Verify the agent exists in Azure AI Foundry
az ml agent list \
  --workspace-name intellios-workspace \
  --resource-group rg-intellios-agents \
  --query "[?name=='Test Agent']"
```

**Success criteria:**
- Agent appears in the CLI output with status `Active`.

### 2. Query Agent Health via Intellios API

```bash
curl -X GET "https://[YOUR_INTELLIOS_URL]/api/monitor/ai-foundry-health" \
  -H "Authorization: Bearer [INTELLIOS_API_TOKEN]"
```

**Success criteria:**
- HTTP 200 response
- Response includes deployed agents with `foundryStatus: "Active"`
- `health` field shows `"healthy"`

### 3. Invoke the Agent via Azure AI Foundry

```bash
# az ai-foundry agent invoke --agent-name "mortgage-assistant" --input "What rates are available?"
az ml agent invoke \
  --agent-id [AGENT_ID_FROM_STEP_8] \
  --workspace-name intellios-workspace \
  --resource-group rg-intellios-agents \
  --input-text "Hello agent, what can you do?"
```

**Success criteria:**
- Command returns HTTP 200 with an agent response.
- Response content is returned in the output.

### 4. Verify Azure Monitor Logs

```bash
# Query Azure Monitor logs for agent activity
az monitor log-analytics query \
  --workspace [LOG_ANALYTICS_WORKSPACE_ID] \
  --analytics-query "traces | where message contains 'agent' | take 50"
```

**Success criteria:**
- Logs appear showing agent invocations, tool calls, and responses.
- No error messages in the logs.

### 5. Confirm Webhook Callback

After deploying an agent or invoking it, check your webhook receiver logs:

```bash
# If webhook receiver is running locally
tail -f /var/log/app.log | grep "agent\."

# Or check application error logging
grep "Event Grid event received" /var/log/app.log
```

**Success criteria:**
- Webhook events are logged (e.g., `agent.deployed`, `agent.invoked`).
- Signature verification passes (Event Grid token validation).
- No HTTP 500 errors.

---

## Multi-Cloud Deployment

Once both AWS AgentCore and Azure AI Foundry are configured, you can deploy the same Agent Blueprint Package (ABP) to both clouds for redundancy and geographic distribution.

### 1. Deploy to Multiple Targets

In the Blueprints UI, after clicking **Deploy**:

1. Select **Multi-Cloud** deployment mode.
2. Check both **AWS Bedrock Agents** and **Azure AI Foundry**.
3. Configure deployment parameters for each cloud (regions, timeout values, observability endpoints).
4. Click **Confirm Multi-Cloud Deployment**.

Intellios will:
- Translate the ABP once.
- Deploy to both runtimes in parallel.
- Track deployment status per cloud.
- Aggregate health metrics from both clouds.

### 2. Verify Consistency Across Clouds

After multi-cloud deployment, verify the agent behaves identically on both runtimes:

```bash
# Test on AWS Bedrock
aws bedrock-agent-runtime invoke-agent \
  --agent-id [AWS_AGENT_ID] \
  --agent-alias-id ALNEKQW6D7 \
  --session-id test-001 \
  --input-text "Tell me about yourself" \
  --region us-east-1

# Test on Azure AI Foundry
# az ai-foundry agent invoke --agent-name "claims-processor" --input "Process claim CLM-2024-001"
az ml agent invoke \
  --agent-id [AZURE_AGENT_ID] \
  --workspace-name intellios-workspace \
  --resource-group rg-intellios-agents \
  --input-text "Tell me about yourself"

# Compare responses for consistency
# Both agents should return substantively identical responses
```

### 3. Monitor Multi-Cloud Health

Use Intellios dashboards to view health metrics from both clouds side-by-side:

1. Navigate to **Observability** → **Agent Health**.
2. Filter by deployment target (AWS / Azure).
3. Compare latency, error rates, and throughput across clouds.

---

## Troubleshooting

If you encounter issues during integration:

| Symptom | Likely Cause | Resolution |
|---|---|---|
| Error: "Deploy button not available" or "No deployment target configured" | Azure AI Foundry adapter not enabled in Admin Settings | Navigate to **Settings → Deployment Targets** and verify Azure AI Foundry is enabled with valid workspace, resource group, and subscription. Run **Test Connection**. |
| Error: `AuthenticationFailed: Service principal failed to authenticate` | Azure credentials are invalid or service principal was not created | Verify `AZURE_CLIENT_ID` and `AZURE_CLIENT_SECRET` are set. Run `az account show` to confirm you are authenticated. Re-create the service principal: `az ad sp create-for-rbac --name intellios-deployer --role Contributor`. |
| Error: `InvalidResourceGroup: Resource group 'rg-intellios-agents' not found` | Resource group does not exist or credentials lack access | Create the resource group: `az group create --name rg-intellios-agents --location eastus`. Verify subscription: `az account show --query id`. |
| Error: `Insufficient permissions to perform operation on workspace` | Service principal lacks Cognitive Services Contributor or Contributor role | Assign required roles: `az role assignment create --assignee [SP_OBJECT_ID] --role "Cognitive Services Contributor" --scope /subscriptions/[SUB_ID]/resourceGroups/rg-intellios-agents`. |
| Deployment hangs for >120 seconds, then times out | Agent preparation is slow (large instruction, many tools) | Increase `AZURE_DEPLOYMENT_TIMEOUT_MS` to 180000 (3 minutes). Simplify agent (fewer tools, shorter instructions). This is normal for complex agents. |
| Deployment succeeds, but health check shows `foundryStatus: "Failed"` | Agent definition has validation error (invalid tool schema, instruction too short) | Open the Azure AI Foundry console → Agents → select agent → Logs tab. Check for validation errors in the agent definition (invalid tool schema, instruction too short, missing required fields). |
| Error: "Azure CLI not found or not authenticated" | Azure CLI is not installed or you are not authenticated to Azure | Install Azure CLI: `curl -sL https://aka.ms/InstallAzureCLIDeb \| bash`. Authenticate: `az login` and verify with `az account show`. |
| Webhook receiver returns HTTP 403 "Event Grid signature verification failed" | Event Grid token signature invalid or secret mismatch | Verify the Event Grid topic subscription and custom headers. Re-create the subscription with the correct webhook URL and token. |
| Agent invocation returns error "Tool not found" | Tool defined in ABP but not present in deployed agent | Verify tool name in ABP matches tool name in the Azure AI Foundry agent definition (case-sensitive). Check the Azure portal → Agent → "Tools" tab. |

For additional help, see [Runtime Adapter Configuration](runtime-adapter-pattern.md) or [Deployment Guide](deployment-guide.md).

---

## Next Steps

Now that you have integrated Intellios with Azure AI Foundry:

- **Expand to production:** Follow [Deployment Guide](deployment-guide.md) to set up a production-grade Intellios instance on Azure Container Instances or App Service with autoscaling, multi-region deployment, and backup policies.
- **Monitor at scale:** Set up observability dashboards in [Observability and Monitoring](../07-administration-operations/observability-dashboards.md) to track agent health, performance, and compliance across Azure and AWS.
- **Multi-cloud operations:** Deploy approved agents to both AWS AgentCore and Azure AI Foundry simultaneously for redundancy and geographic distribution. See [Runtime Adapters](../03-core-concepts/runtime-adapters.md).
- **Automate lifecycle:** Configure CI/CD integration to automatically deploy approved agents to your target clouds. Document your deployment topology in [Architecture Decision Records](../../docs/decisions/).

---

*See also: [Integrate Intellios with AWS AgentCore](agentcore-integration.md) · [Configure a Runtime Adapter to Deploy Agents](runtime-adapter-pattern.md) · [Deployment Guide](deployment-guide.md) · [Runtime Adapters](../03-core-concepts/runtime-adapters.md) · [Agent Blueprint Package (ABP)](../03-core-concepts/agent-blueprint-package.md)*
