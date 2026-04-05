---
id: "03-001"
title: "Agent Blueprint Package (ABP)"
slug: "agent-blueprint-package"
type: "concept"
audiences:
  - "engineering"
  - "compliance"
  - "product"
status: "published"
version: "1.2.0"
platform_version: "1.2.0"
created: "2026-04-05"
updated: "2026-04-05"
author: "Intellios"
reviewers: []
tags:
  - "abp"
  - "blueprint"
  - "agent-blueprint-package"
  - "artifact"
  - "schema"
  - "agent-definition"
  - "versioning"
  - "core-artifact"
prerequisites: []
related:
  - "Governance-as-Code"
  - "Agent Lifecycle"
  - "Agent Registry"
  - "Governance Validator"
next_steps:
  - "Understanding Governance Policies"
  - "Deploying Agents with Runtime Adapters"
feedback_url: "[PLACEHOLDER]"
tldr: >
  The Agent Blueprint Package (ABP) is Intellios's central artifact—a structured,
  versioned JSON package that fully describes an AI agent's identity, capabilities,
  constraints, and governance policies. Every agent is represented as an ABP; every
  subsystem in Intellios (design, governance, registry, deployment) operates on ABPs.
---

# Agent Blueprint Package (ABP)

> **TL;DR:** The Agent Blueprint Package (ABP) is Intellios's central artifact—a structured, versioned JSON package that fully describes an AI agent's identity, capabilities, constraints, and governance policies. Every agent is represented as an ABP; every subsystem in Intellios (design, governance, registry, deployment) operates on ABPs.

## Overview

Enterprise AI governance requires a single source of truth for each agent. Without structured agent definitions, governance becomes impossible: compliance teams cannot audit what agents do, security teams cannot see what data they access, operations cannot track their lifecycle, and regulators cannot assess their risk.

The **Agent Blueprint Package (ABP)** is Intellios's answer. It is a comprehensive, versioned, machine-readable specification of an agent—not just its capabilities, but its identity, constraints, governance policies, and organizational ownership. The ABP is produced by the Generation Engine from enterprise intake data, validated by the Governance Validator against policies, reviewed by humans, versioned in the Agent Registry, and deployed via runtime adapters.

Think of the ABP as a blueprint for a physical building: it specifies every structural element, safety system, and compliance requirement needed for construction and operation. Just as construction teams, inspectors, and facility managers all work from the same blueprint, every subsystem in Intellios works from the same ABP. When the blueprint changes, all downstream systems see the change. When you audit the building, you audit against the blueprint. When you build a new copy in a different location, you use the same blueprint.

The ABP is not procedural instructions or prose; it is a deterministic structure that governance engines can evaluate, compliance systems can audit, and deployment systems can consume. This structural nature is essential for scale: enterprises can generate hundreds or thousands of agents and maintain consistent governance and auditability across all of them.

## How It Works

An ABP is a JSON document structured into six core blocks, each with a specific purpose:

### The ABP Structure

```json
{
  "version": "1.2.0",
  "metadata": {
    "id": "agent-uuid-v4",
    "created_at": "2026-03-15T09:30:00Z",
    "created_by": "alice@bank.com",
    "status": "approved",
    "enterprise_id": "enterprise-uuid",
    "tags": ["financial-services", "customer-facing", "high-value"]
  },
  "identity": {
    "name": "Mortgage Assistant",
    "description": "Answers customer questions about mortgage rates, terms, and application status.",
    "persona": "You are a friendly, knowledgeable mortgage specialist. You explain complex financial concepts clearly and escalate disputes to human specialists without delay.",
    "branding": {
      "display_name": "Our Bank's Mortgage Assistant",
      "icon_url": "https://bank.com/assets/mortgage-icon.svg",
      "color_primary": "#1f4788",
      "color_secondary": "#d4a574"
    }
  },
  "capabilities": {
    "tools": [
      {
        "name": "retrieve_customer_account",
        "type": "api",
        "description": "Fetch customer account details from core banking system.",
        "config": {
          "endpoint": "https://banking.internal/api/v1/accounts",
          "auth": "oauth2",
          "rate_limit": "100_per_minute"
        }
      },
      {
        "name": "get_mortgage_rates",
        "type": "api",
        "description": "Query current mortgage rates from third-party rate feed.",
        "config": {
          "endpoint": "https://ratefeeds.com/api/rates",
          "auth": "api_key"
        }
      },
      {
        "name": "search_knowledge_base",
        "type": "function",
        "description": "Search FAQ and product documentation.",
        "config": {}
      }
    ],
    "instructions": "You are a mortgage specialist assistant. Answer customer questions about mortgage products, rates, and application processes. Always verify customer identity through the retrieve_customer_account tool before discussing account-specific details. If a customer disputes an interest rate or terms, escalate immediately to a human specialist without attempting to override or negotiate. Do not offer legal or tax advice.",
    "knowledge_sources": [
      {
        "name": "mortgage_faq",
        "type": "file",
        "uri": "s3://bank-docs/mortgage-faq.pdf"
      },
      {
        "name": "product_terms",
        "type": "database",
        "uri": "postgresql://docs-db/product_terms"
      }
    ]
  },
  "constraints": {
    "allowed_domains": [
      "mortgage_products",
      "customer_account_inquiry",
      "rate_information"
    ],
    "denied_actions": [
      "modify_account_data",
      "initiate_transfers",
      "approve_loans",
      "override_fraud_detection",
      "send_unsolicited_outbound_communication"
    ],
    "max_tokens_per_response": 500,
    "rate_limits": {
      "requests_per_minute": 60,
      "requests_per_day": 5000
    }
  },
  "governance": {
    "policies": [
      {
        "name": "audit_logging",
        "type": "audit",
        "description": "All interactions must be logged for SOX compliance.",
        "rules": [
          "log_all_interactions == true",
          "pii_redaction == true",
          "retention_days >= 90"
        ]
      },
      {
        "name": "data_handling",
        "type": "data_handling",
        "description": "Customer PII handling per GLBA and CCPA.",
        "rules": [
          "pii_fields_redacted == true",
          "data_minimization == true",
          "no_third_party_sharing == true"
        ]
      },
      {
        "name": "access_control",
        "type": "access_control",
        "description": "Restrict tool access to approved integrations.",
        "rules": [
          "only_approved_integrations == true",
          "denied_actions_enforced == true"
        ]
      }
    ],
    "audit": {
      "log_interactions": true,
      "retention_days": 90,
      "pii_redaction": true
    },
    "approval_chain": [
      {
        "role": "compliance_officer",
        "user_id": "carol@bank.com",
        "approved": true,
        "approved_at": "2026-03-16T14:22:00Z"
      },
      {
        "role": "security_lead",
        "user_id": "david@bank.com",
        "approved": true,
        "approved_at": "2026-03-16T15:45:00Z"
      }
    ]
  },
  "ownership": {
    "businessUnit": "Retail Banking",
    "ownerEmail": "alice@bank.com",
    "costCenter": "CC-2024-001",
    "deploymentEnvironment": "production",
    "dataClassification": "regulated"
  }
}
```

### The Six Blocks

**Metadata** — Provenance and lifecycle information. Every ABP has a unique ID (UUID), creation timestamp, creator identity, current status (draft, in_review, approved, rejected, deprecated, deployed), and optional tags for categorization.

**Identity** — The agent's brand and personality. Name, description, persona instructions, and white-label branding configuration (display name, icon, colors). This block enables enterprises to brand the agent as their own product while the underlying governance and technical definition remain centrally managed.

**Capabilities** — What the agent can do. Tools (APIs, functions, MCP servers, plugins), system instructions (the agent's behavioral prompt), and knowledge sources (files, databases, APIs, vector stores the agent can reference). This is where the agent's competency is defined.

**Constraints** — Limits and boundaries on behavior. Allowed domains (topics the agent can operate in), denied actions (things the agent must never do, even if asked), maximum response length, and rate limits (requests per minute/day). Constraints are machine-enforceable guards that prevent out-of-scope behavior.

**Governance** — Enterprise policies and compliance configuration. Named policies with types (safety, compliance, data_handling, access_control, audit), rules (expressed in deterministic policy language), audit logging settings, and an approval chain (the people or roles required to approve deployment).

**Ownership** — Organizational metadata. Business unit, primary owner email, cost center, deployment environment (production, staging, sandbox, internal), and data classification level (public, internal, confidential, regulated). Ownership data is set manually by the designer and used for billing, accountability, and governance scoping.

## Key Principles

1. **Immutable Versions** — Once an ABP version is released and stored in the Agent Registry, it is immutable. Changes require creating a new version (following semantic versioning: major.minor.patch). This ensures that any governance decision, deployment, or audit event can always reference the exact ABP version it applied to. There is no ambiguity about what agent was deployed when.

2. **Schema Evolution (Migrate-on-Read)** — As Intellios evolves, new schema versions are released (v1.0.0 → v1.1.0 → v1.2.0 → etc.). Older ABPs continue to work. When an older ABP is read, a migration layer detects its version and applies forward-compatible transformations. Execution subsystems do not fail when encountering older schemas; they adapt. This enables Intellios to extend the ABP with new fields (like execution observability in v1.1.0 or ownership metadata in v1.2.0) without breaking deployed agents.

3. **Governance-Addressable Fields** — Every field in an ABP can be referenced in a governance policy. Policies use field paths (e.g., `capabilities.denied_actions`, `governance.audit.log_interactions`, `metadata.status`) to specify what must or must not be true. This means governance is precise and auditable: a policy violation points to a specific field with a specific reason.

4. **Runtime Agnostic** — The ABP is a platform-neutral artifact. It does not reference AWS Lambda, Azure Functions, or any specific runtime. Runtime adapters translate ABPs into runtime-specific configurations. An ABP can be deployed to AWS AgentCore today and to Azure AI Foundry tomorrow without changing the ABP itself. This decoupling allows enterprises to multi-cloud and hybrid-cloud deployments without governance complexity.

5. **Structural Auditability** — Because the ABP is a structured artifact (not prose, not ad-hoc JSON), compliance and audit systems can reliably inspect it. There is no ambiguity about whether an agent has audit logging enabled—you check the specific field. There is no debate about what data sources the agent can access—they are listed in a defined array. Structural clarity enables deterministic, auditable governance decisions.

## Relationship to Other Concepts

The ABP is the central hub of the Intellios system. Many other concepts depend on or contribute to it:

- **[Governance-as-Code](./governance-as-code.md)** — Governance policies are deterministic rules that evaluate ABP fields. Every policy is a structured rule expression (using operators like `equals`, `contains`, `count_gte`) that checks an ABP field or combination of fields. The ABP is the input; the policy is the validator.

- **[Agent Lifecycle](./agent-lifecycle-states.md)** — The ABP's `metadata.status` field tracks the agent through its lifecycle: draft, in_review, approved, rejected, deprecated, deployed. Governance policies can constrain state transitions (e.g., "an agent cannot leave draft status if error-severity violations exist").

- **[Governance Validator](../03-core-concepts/policy-engine.md)** — This subsystem reads an ABP and evaluates it against all governance policies. The output is a Validation Report: a list of violations (if any), their severity, and remediation suggestions.

- **[Agent Registry](../03-core-concepts/agent-blueprint-package.md)** — The persistent store for all ABPs in your enterprise. Every version of every agent is stored as a separate row in the registry. Deployments pull ABPs from the registry by ID and version.

- **[Blueprint Review UI](../03-core-concepts/agent-lifecycle-states.md)** — The human interface for reviewing and approving ABPs. Reviewers see the full ABP in a structured form and can approve, request changes, or reject it.

- **[Generation Engine](../03-core-concepts/agent-blueprint-package.md)** — Produces ABPs from intake data. The Engine consumes structured intake requirements and generates a valid ABP schema as output.

- **[Runtime Adapters](../04-architecture-integration/runtime-adapter-pattern.md)** — Translate ABPs into runtime-specific configurations. The AWS adapter reads an ABP and generates CloudFormation templates, Lambda configurations, and IAM policies. The Azure adapter generates ARM templates and Azure AI Foundry configurations.

## Examples

### Example: Financial Services Customer-Facing Agent

A regional bank has completed intake and generation of a mortgage assistant agent. The Governance Validator has approved it. The ABP (shown above) specifies:

- **Identity**: "Mortgage Assistant," branded as "Our Bank's Mortgage Assistant" with the bank's colors and logo.
- **Capabilities**: Can call the core banking API to retrieve customer accounts, call an external rate feed API, and search internal mortgage documentation. The system prompt instructs the agent to verify customer identity, explain terms clearly, and escalate disputes immediately.
- **Constraints**: Allowed only in mortgage-related conversations. Denied actions include modifying account data, initiating transfers, approving loans, and sending unsolicited messages. Rate-limited to 60 requests per minute per customer, max 500 tokens per response.
- **Governance**: Mandates audit logging with PII redaction and 90-day retention (SOX requirement), data handling compliance per GLBA, and access control to approved integrations only. Requires sign-off from compliance and security.
- **Ownership**: Assigned to Retail Banking, owned by Alice, cost center CC-2024-001, production deployment, regulated data classification.

**Deployment**: The DevOps team retrieves this ABP from the Agent Registry and uses the AWS Runtime Adapter to deploy it. The adapter reads the ABP's tools, constraints, and governance policies and generates:
- Lambda functions for each tool endpoint with IAM roles and access limits
- CloudWatch logging with PII redaction (per the audit block)
- API Gateway throttling rules (per rate limits)
- Secrets Manager bindings for API keys
- CloudFormation stack with all of the above

The agent launches in production. Every customer interaction is logged (to satisfy SOX), customer PII is redacted (to satisfy GLBA), and access is restricted to approved integrations (per the constraints). If the bank wants to add a new capability, they create a new ABP version, re-run governance validation, and deploy the new version alongside the old one. The Agent Registry now has two versions of the same agent, each with its own governance history and deployment footprint.

### Example: Intake-to-Governance Workflow

An enterprise designer navigates to the Design Studio and starts an intake for a data analysis agent. They specify that the agent will:
- Access internal sales databases (moderate sensitivity)
- Query a third-party market research API
- Run analyses in Python notebooks
- Target internal users only (not customer-facing)

The Intake Engine asks probing questions about data handling, access control, and security. The designer answers that:
- Sales data should never be shared externally
- Market research data is purchased per licensing terms and cannot be republished
- Analyses should be logged (for auditability)
- Only sales managers should have access

The Generation Engine produces an ABP with:
- `capabilities.tools`: database API, market research API, Python execution
- `constraints.denied_actions`: ["share_data_externally", "republish_market_research"]
- `constraints.allowed_domains`: ["internal_sales_analysis", "market_research_analysis"]
- `governance.policies`: a data_handling policy with rules for licensing compliance, an access_control policy restricting to sales manager role, an audit policy logging all analysis executions

The Governance Validator checks the ABP against the enterprise's governance policies:
- **Data Minimization Policy**: "Does the agent deny external data sharing?" YES (checked field `constraints.denied_actions`)
- **Licensing Compliance Policy**: "Does the agent have rules about republishing market research?" YES (checked field `governance.policies[type=data_handling].rules`)
- **Access Control Policy**: "Is the agent scoped to authorized users?" YES (checked field `constraints.allowed_domains`)

All checks pass. The ABP status becomes approved. The business owner can now deploy this ABP to production knowing that governance has been automatically verified.

---

## ABP Versioning and Schema Evolution

The ABP schema follows semantic versioning:

- **v1.0.0** — Initial release. Core blocks: metadata, identity, capabilities, constraints, governance.
- **v1.1.0** — Added execution block for observability, runtime constraints, and feedback webhooks. Added explicit `version` field to all ABPs.
- **v1.2.0** — Added ownership block for business unit, cost center, owner email, deployment environment, and data classification.

When a new schema version is released, existing ABPs (stored in the Agent Registry) are not migrated in-place. Instead, when an ABP is read, the system detects its version and applies forward-compatible transformations (migrate-on-read pattern). This ensures:

- Old ABPs continue to work without modification
- New fields have sensible defaults for old ABPs
- No data loss or breaking changes
- Governance policies can reference both old and new fields

---

## Summary

The ABP is not just a data format; it is the foundation of governed agent deployment. By making the ABP the single source of truth, Intellios enables:

- **Deterministic governance** — Policies evaluate specific, addressable fields; violations are precise and remediable.
- **Auditability** — Every deployment, change, and governance decision references an immutable ABP version.
- **Portability** — The same ABP can be deployed to multiple runtimes, enabling multi-cloud and hybrid strategies.
- **Compliance automation** — Governance evidence is generated as a byproduct of normal operations.
- **Scalability** — Enterprises can manage hundreds or thousands of agents with consistent governance and auditability.

---

*See also: [Governance-as-Code](./governance-as-code.md), [Agent Lifecycle](./agent-lifecycle-states.md), [Agent Registry](../03-core-concepts/agent-blueprint-package.md)*

*Next: [Understanding Governance Policies](../03-core-concepts/governance-as-code.md)*
