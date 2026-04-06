---
id: 03-006
title: 'Runtime Adapters: How Agents Connect to Cloud Platforms'
slug: runtime-adapters
type: concept
audiences:
- engineering
- product
status: published
version: 1.2.0
platform_version: 1.2.0
created: '2026-04-05'
updated: '2026-04-05'
author: Intellios Platform Engineering
reviewers: []
tags:
- runtime
- adapter
- agentcore
- ai-foundry
- cloud
- deployment
- execution
- multi-cloud
prerequisites: []
related:
- 03-001
- 03-005
- 07-003
next_steps:
- 04-003
- 04-003
feedback_url: https://feedback.intellios.ai/kb
tldr: 'Runtime adapters are the abstraction layer that translates governed Agent Blueprint
  Packages (ABPs) into cloud provider-specific execution formats. Intellios is a governance
  platform, not an execution platform—it designs and governs agents but delegates
  execution to cloud runtimes through pluggable adapters. This separation enables
  multi-cloud deployments, vendor independence, and consistent governance across different
  execution environments.

  '
---


# Runtime Adapters: How Agents Connect to Cloud Platforms

> **TL;DR:** Runtime adapters are the abstraction layer that translates governed Agent Blueprint Packages (ABPs) into cloud provider-specific execution formats. Intellios is a governance platform, not an execution platform—it designs and governs agents but delegates execution to cloud runtimes through pluggable adapters. This separation enables multi-cloud deployments, vendor independence, and consistent governance across different execution environments.

## Overview

Intellios creates agents, not to run them directly, but to govern them. The platform captures enterprise requirements, generates structured agent definitions, validates them against governance policies, stores them in a registry, and orchestrates their deployment to cloud runtimes. Intellios does **not** execute agents itself; instead, it leverages specialized execution platforms provided by cloud providers.

This separation of concerns—governance (Intellios) versus execution (cloud runtimes)—is by design. It enables enterprises to:

1. **Avoid vendor lock-in** — Deploy the same agent to AWS, Azure, or other runtimes without redesigning the agent.
2. **Optimize for cost and compliance** — Choose the runtime that best fits your data residency, performance, and budget requirements.
3. **Maintain consistent governance** — All agents follow the same governance policies, regardless of where they execute.
4. **Scale independently** — Governance infrastructure scales separately from execution infrastructure.

**Runtime adapters** are the bridge. They translate ABPs into runtime-specific configurations and manage the deployment lifecycle (deploy, monitor, teardown). Without adapters, Intellios governance would be tied to a single execution platform. With adapters, Intellios becomes truly multi-cloud.

## How It Works

### The Adapter Pattern

An adapter implements a standardized interface with four methods:

```
Intellios Control Plane
    ↓
    ├─ translate(abp) → ProviderManifest
    ├─ deploy(manifest) → DeploymentRecord
    ├─ monitor(record) → HealthStatus
    └─ teardown(record) → void
    ↓
Runtime Adapter (AWS, Azure, etc.)
    ↓
Cloud Provider Runtime (AgentCore, AI Foundry, etc.)
```

**translate()** — Converts an ABP to the target runtime's format. For AWS Bedrock Agents, this means generating a Bedrock `CreateAgent` request with CloudFormation templates, IAM roles, and action group definitions. For Azure AI Foundry, it generates ARM templates and deployment manifests. The translation is deterministic: the same ABP always produces the same output.

**deploy()** — Pushes the translated manifest to the cloud provider and waits for the agent to be ready. The adapter manages polling, retries, and error handling. On success, it stores runtime identifiers (e.g., AWS agent ID, ARN, version) in a `DeploymentRecord` for future reference.

**monitor()** — Queries the runtime for agent health, status, and metrics. Intellios calls this periodically to populate dashboards and health indicators. The monitor method bridges observability: runtime signals (CloudWatch metrics, logs, error counts) are collected by the adapter and returned to Intellios.

**teardown()** — Decommissions the agent in the cloud runtime. Called when an agent reaches the "retired" lifecycle state or when an operator explicitly requests removal. The adapter ensures all associated resources (Lambda functions, roles, endpoints) are cleaned up.

### Bidirectional Data Flow

While translation is unidirectional (ABP → runtime format), observability flows **back** into Intellios.

```
ABP (governed artifact)
    ↓
Adapter translates to: CloudFormation, ARM template, etc.
    ↓
Cloud Provider deploys agent
    ↓ (observability signals flow back)
CloudWatch logs, metrics, health status
    ↓
Adapter collects signals via webhooks and health checks
    ↓
Intellios displays in dashboards, audit logs, compliance reports
```

This bidirectional flow ensures that:
- Governance teams can audit what agents are actually running.
- Operations teams can see health and performance metrics in a centralized Intellios dashboard.
- Compliance systems can tie runtime behavior back to governance policies (e.g., "did the agent log all interactions as required?").

### Runtime Agnostic ABPs

The ABP schema is **runtime agnostic**. It does not reference AWS Lambda, Bedrock resource role ARNs, Azure regions, or any cloud-specific details. This is intentional.

For example, the ABP specifies:
```json
{
  "capabilities": {
    "tools": [
      {
        "name": "fetch_customer_account",
        "type": "api",
        "description": "Query customer account from database"
      }
    ]
  },
  "governance": {
    "policies": [
      {
        "name": "audit_logging",
        "rules": ["log_all_interactions == true"]
      }
    ]
  }
}
```

The adapter is responsible for the translation:
- AWS AgentCore adapter: Creates an ActionGroup with OpenAPI schema, hooks it to Lambda, sets CloudWatch logging.
- Azure AI Foundry adapter: Creates an API tool definition, deploys to Azure Functions, configures Application Insights logging.

Same ABP, different runtime implementations. The governance policy is identical in both: "audit logging is required." The runtime adapters enforce this requirement in their provider-specific way.

## Key Principles

### 1. Governance-Execution Separation

Intellios governs agent design and behavior; cloud runtimes execute agents. This separation is hard and final:

- Intellios **never** reads or syncs state from deployed runtimes back into the ABP. (Observability signals flow back; blueprint definitions do not.)
- ABPs are immutable once stored in the registry. Runtime-specific tuning (e.g., "increase Lambda timeout") does not propagate back to the ABP; instead, a new ABP version is created and redeployed.
- Governance policies evaluate ABPs, not deployed runtime configurations. If an agent's governance is violated, the remedy is to fix the ABP and redeploy—not to patch the runtime.

This separation ensures governance is deterministic and auditable.

### 2. Pluggable Adapters

New adapters can be added without modifying Intellios core logic. The platform provides:

- A standardized adapter interface (four methods: translate, deploy, monitor, teardown).
- A registry for adapter implementations.
- A configuration UI in Admin Settings to enable/disable adapters and set credentials.

**Current adapters:**
- **AWS AgentCore** (primary, production) — Deploys to Amazon Bedrock Agents. [ADR-010](../../docs/decisions/010-agentcore-integration.md), [ADR-011](../04-architecture-integration/agentcore-integration.md).
- **Azure AI Foundry** (planned) — Deploys to Azure AI services.

**Future adapters:**
- **NVIDIA Dynamo** — Deploys to NVIDIA's agent runtime.
- **On-premises/Kubernetes** — Custom enterprise runtimes.
- **Multi-cloud orchestration** — Route agents to different clouds based on data classification or cost.

### 3. Bidirectional Data Flow (Observability)

While the ABP → runtime translation is one-way, observability is bidirectional:

- **Outbound (ABP → runtime):** Intellios sends the ABP (via adapter) to the cloud runtime.
- **Inbound (runtime → Intellios):** Intellios receives observability signals through two channels:
  1. **Health checks:** Intellios periodically calls `monitor()` to query agent status, metrics, and errors.
  2. **Webhooks:** The runtime sends lifecycle events (agent deployed, invoked, failed, retired) back to Intellios via configured webhook URLs.

This inbound flow ensures that Intellios dashboards show the true state of deployed agents and that compliance systems can audit runtime behavior.

### 4. Runtime-Agnostic ABP Schema

The ABP references no cloud-specific fields. This enables:

- **Portability:** Deploy the same ABP to multiple clouds for failover, load balancing, or data residency compliance.
- **Provider independence:** Change cloud providers without modifying governance policies or agent definitions.
- **Governance stability:** Policies remain consistent across different runtimes.

Example: A financial services enterprise with data residency requirements might deploy the same agent to:
- AWS us-east-1 for US customer data
- Azure EU West for European customer data
- On-premises Kubernetes cluster for regulated financial data

All three deployments use the same ABP, validated against the same governance policies.

## Relationship to Other Concepts

- **[Agent Blueprint Package (ABP)](./agent-blueprint-package.md)** — The input to runtime adapters. The ABP specifies what the agent should do; adapters translate it to how runtimes should execute it. ABP v1.1.0 added an `execution` block for observability and runtime constraints. ABP v1.2.0 added an `ownership` block (deployment environment, data classification) used by adapters for placement decisions.

- **[Agent Lifecycle](./agent-lifecycle-states.md)** — Adapters implement lifecycle transitions. When an agent moves from "approved" to "deployed," the adapter's `deploy()` method is called. When an agent moves to "retired," the adapter's `teardown()` method is called. Adapters also receive lifecycle events from runtimes (via webhooks) and propagate them back to the control plane.

- **[Observability](./observability.md)** — Adapters bridge observability between Intellios and cloud runtimes. The `monitor()` method queries runtime health; webhooks receive lifecycle events. Intellios aggregates these signals into centralized dashboards and audit logs.

- **[Governance Validator](../03-core-concepts/policy-engine.md)** — Governance validation happens before deployment. The `translate()` method is called after validation passes, ensuring the adapter only translates compliant ABPs.

- **[Agent Registry](../03-core-concepts/agent-blueprint-package.md)** — The registry stores ABPs. When deployment is triggered, the specific ABP version is fetched from the registry and passed to the adapter for translation.

## Examples

### Example 1: Single Cloud Deployment (AWS)

A regional bank creates a mortgage assistant agent. After governance approval, the DevOps team deploys it to AWS:

1. The approved ABP is fetched from the Agent Registry.
2. The AWS AgentCore adapter's `translate()` method reads the ABP and generates:
   - Bedrock agent definition with tools and system instructions
   - CloudFormation template for IAM roles and policies
   - CloudWatch log groups with PII redaction (from governance policies)
3. The adapter's `deploy()` method pushes these to AWS Bedrock and waits for the agent to reach "PREPARED" status.
4. The agent ID and ARN are stored in the `DeploymentRecord`.
5. Every hour, Intellios calls the adapter's `monitor()` method to query agent health and metrics.
6. When customer interactions occur, CloudWatch logs are collected by the adapter and available in Intellios dashboards.

### Example 2: Multi-Cloud Deployment (Same ABP, Different Runtimes)

A global fintech company deploys the same agent to multiple clouds for data residency compliance:

**ABP (version 1.2.0):**
```json
{
  "metadata": { "id": "abp-trading-assistant-v1" },
  "identity": { "name": "Trading Assistant" },
  "capabilities": {
    "tools": [
      { "name": "fetch_positions", "type": "api" },
      { "name": "calculate_hedges", "type": "function" }
    ]
  },
  "ownership": {
    "dataClassification": "regulated"
  },
  "execution": {
    "observability": {
      "logInteractions": true,
      "feedbackWebhookUrl": "https://intellios.fintech.com/webhooks/events"
    }
  }
}
```

**Deployment topology:**

| Region | Runtime | Reason |
|---|---|---|
| US (us-east-1) | AWS Bedrock | US customer data, low-latency access |
| EU (eu-west-1) | Azure AI Foundry | GDPR compliance, EU data residency |
| Singapore (ap-southeast-1) | AWS Bedrock | Asia-Pacific customers |

**Process:**

1. The same ABP is deployed to three different adapters:
   - AWS AgentCore adapter (us-east-1 and ap-southeast-1)
   - Azure AI Foundry adapter (eu-west-1)

2. Each adapter translates the ABP to its provider's format:
   - AWS: Creates Bedrock agents with respective IAM roles
   - Azure: Creates Azure AI agent definitions with Azure RBAC

3. All three deployments enforce the same governance policies:
   - Audit logging enabled
   - Tool invocations logged
   - PII redaction applied

4. Webhooks from all three runtimes post events to the same Intellios webhook URL.

5. Intellios dashboards show the status of all three deployments in a single view, with regional labels.

**Result:** One governance policy enforced across three clouds. Data residency requirements met. No code duplication or policy inconsistency.

### Example 3: Adapter Translation in Detail (AWS AgentCore)

**Input ABP (partial):**
```json
{
  "metadata": { "id": "abp-loan-processor-v2" },
  "identity": { "name": "Loan Application Processor" },
  "capabilities": {
    "instructions": "Process loan applications. Verify customer identity. Check credit score. Gather required documents.",
    "tools": [
      {
        "name": "verify_identity",
        "type": "api",
        "description": "Query customer identity database",
        "config": { "endpoint": "https://banking.internal/api/verify" }
      }
    ]
  },
  "constraints": {
    "denied_actions": ["approve_loan_without_review", "access_external_credit_system"]
  },
  "governance": {
    "policies": [
      {
        "name": "audit_logging",
        "rules": ["log_all_interactions == true", "pii_redaction == true"]
      }
    ]
  },
  "ownership": {
    "deploymentEnvironment": "production"
  }
}
```

**AWS AgentCore Adapter Translation:**

```
ABP Identity Block
├─ name: "Loan Application Processor"
└─ instructions: "Process loan applications..."
        ↓
Bedrock CreateAgent Request
├─ agentName: "Loan Application Processor"
├─ instruction: "Process loan applications..."
└─ foundationModel: "anthropic.claude-3-5-sonnet-20241022-v2:0"

ABP Capabilities.Tools
├─ verify_identity (API tool)
        ↓
Bedrock ActionGroups
├─ actionGroupName: "verify_identity"
├─ functionSchema: { "functions": [ { "name": "verify_identity", ... } ] }

ABP Governance.Policies
├─ audit_logging: log_all_interactions == true
        ↓
Bedrock Agent Configuration
├─ memoryConfiguration: { "enabledMemoryTypes": ["SESSION_SUMMARY"] }
├─ tags: { "auditPolicy": "enabled", "piiRedaction": "enabled" }

ABP Constraints.denied_actions
├─ approve_loan_without_review
├─ access_external_credit_system
        ↓
Bedrock Guardrail Configuration
├─ blockedTopics: ["loan_approval_override", "external_credit_access"]

ABP Ownership.deploymentEnvironment
├─ production
        ↓
CloudFormation Stack Tags
├─ Environment: "production"
├─ CostCenter: "[from ownership block]"
└─ BusinessUnit: "[from ownership block]"
```

**Output: Bedrock Agent + CloudFormation Stack**

The adapter generates deployment artifacts that Bedrock can execute. The governance properties (audit logging, denied actions, data classification) are preserved and enforced.

## Summary

Runtime adapters are the critical link between Intellios's governance domain and cloud execution environments. They enable enterprises to:

- **Govern agents consistently** across multiple clouds and runtimes
- **Deploy agents portably** without rewriting governance policies
- **Monitor agents centrally** with observability signals flowing back from runtimes
- **Scale independently** with governance and execution infrastructure designed separately
- **Avoid lock-in** by supporting multiple cloud providers through pluggable adapters

By separating governance (Intellios) from execution (cloud runtimes), Intellios becomes a strategic platform for enterprise AI governance—not a rigid, vendor-locked execution engine.

---

*See also: [Agent Blueprint Package (ABP)](./agent-blueprint-package.md) · [Agent Lifecycle](./agent-lifecycle-states.md) · [Configure a Runtime Adapter to Deploy Agents](../04-architecture-integration/runtime-adapter-pattern.md)*

*Related ADRs: [ADR-010: AWS AgentCore Integration Strategy](../../docs/decisions/010-agentcore-integration.md) · [ADR-011: AgentCore Architecture](../04-architecture-integration/agentcore-integration.md)*
