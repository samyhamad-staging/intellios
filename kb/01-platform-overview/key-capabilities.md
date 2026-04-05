---
id: "01-004"
title: "Key Capabilities"
slug: "key-capabilities"
type: "reference"
audiences:
  - "executive"
  - "product"
  - "compliance"
status: "published"
version: "1.0.0"
platform_version: "1.0.0"
created: "2026-04-05"
updated: "2026-04-05"
author: "Intellios"
reviewers: []
tags:
  - "capabilities"
  - "features"
  - "platform"
  - "overview"
prerequisites: []
related:
  - "What Is Intellios"
  - "Architecture Overview"
next_steps:
  - "Getting Started with Design Studio"
  - "Understanding Governance Policies"
feedback_url: "[PLACEHOLDER]"
tldr: >
  A reference of all Intellios platform capabilities organized by category: agent design,
  governance and compliance, lifecycle management, registry and inventory, runtime and
  deployment, and security and operations. Each capability lists availability (GA/Preview/Planned)
  and target audiences.
---

# Key Capabilities

> **TL;DR:** Intellios provides a complete suite of capabilities for designing, governing, managing, and deploying enterprise AI agents. This reference organizes all platform features by category with availability status and audience relevance.

---

## Agent Design

The Design Studio captures enterprise requirements and generates Agent Blueprint Packages through a human-centered, multi-phase process.

| Capability | Description | Availability | Audiences |
|---|---|---|---|
| **Conversational Intake** | Three-phase intake process: structured context form → adaptive AI conversation → pre-generation review. Enterprises describe agent requirements in natural language; the Intake Engine probes for governance context and synthesizes requirements into a structured payload. | GA | Product, Compliance, Business |
| **Seven Stakeholder Input Lanes** | Intake engine supports parallel input from compliance, risk, legal, security, IT, operations, and business teams. Stakeholders contribute directly; engine synthesizes input into coherent requirements. | GA | Compliance, Product, Executive |
| **Express-Lane Templates** | Pre-built agent templates for common patterns (e.g., "Customer Service Bot," "Internal Research Assistant," "Document Analyzer"). Templates accelerate intake for standard use cases, reducing time to ABP generation. | GA | Product, Business |
| **Iterative Refinement via Natural Language** | After ABP generation, enterprises can request changes in natural language ("Make the agent more cautious about data modification"). Generation Engine re-runs with updated constraints; no manual code editing required. | GA | Product, Business |
| **Adaptive Model Selection** | Intake Engine intelligently selects Claude Sonnet for complex, multi-turn reasoning (e.g., synthesizing compliance context from legal input) and Claude Haiku for simple clarifications. Optimizes latency and cost without sacrificing quality. | GA | Engineering, Product |
| **Blueprint Studio Preview & Refinement** | Interactive web interface at `/blueprints/[id]` where designers preview generated ABPs before submission. Supports direct field editing (identity, capabilities, constraints, governance). Real-time re-validation shows updated Validation Reports. | GA | Product, Compliance |

---

## Governance & Compliance

Deterministic, policy-driven validation ensures every agent conforms to enterprise standards before approval.

| Capability | Description | Availability | Audiences |
|---|---|---|---|
| **Governance-as-Code Policy Engine** | Deterministic rule expression language with 11 operators: `exists`, `not_exists`, `equals`, `not_equals`, `contains`, `not_contains`, `matches`, `count_gte`, `count_lte`, `includes_type`, `not_includes_type`. Policies are structured, executable, and auditable—no LLM in the evaluation loop. | GA | Compliance, Engineering, Security |
| **Deterministic Evaluation (No LLM in Loop)** | Policy violations are computed using structured logic, not machine learning. Every policy decision is reproducible and explainable. Essential for regulated industries where auditors require traceable governance logic. | GA | Compliance, Executive |
| **Four Seeded Baseline Policies** | Platform includes four pre-configured governance policies: Safety Baseline (constraints and instructions present), Audit Standards (logging configured), Data Handling (PII redaction rules), Access Control (denied actions and rate limits specified). Enterprises inherit these immediately. | GA | Compliance, Executive |
| **Custom Policy Authoring** | Enterprises define governance rules tailored to their domain (financial services, healthcare, life sciences). Policy framework supports domain-specific constraints without code. Policy registry version-controls policies alongside agents. | GA | Compliance, Executive |
| **Severity-Gated Lifecycle Transitions** | Error-severity policy violations block ABP progression from draft to in_review. Warning-severity violations inform reviewers but do not block. This gating ensures non-compliant agents never reach approval. | GA | Compliance, Product |
| **AI-Powered Remediation Suggestions** | When violations occur, Claude generates context-aware remediation suggestions (e.g., "Add field masking for customer email addresses in data handling block"). Speeds resolution during governance review cycles. | GA | Product, Compliance |
| **SR 11-7 Compliance Mapping** | Intellios provides explicit mappings between Agent Blueprint Package structure and Federal Reserve SR 11-7 Model Risk Management guidance. Demonstrates model governance, testing, validation, monitoring, and documentation requirements. | GA | Compliance, Executive |
| **MRM Documentation Automation** | Platform automatically generates Model Risk Management documentation (model inventory, risk assessment, approval record, testing summary, monitoring plan) from ABP metadata. Satisfies SR 11-7 documentation burden without manual effort. | GA | Compliance, Executive |
| **Compliance Evidence Chain** | Every agent generation, validation, approval, deployment, and change is recorded with immutable timestamps, actor identity, and policy evaluation results. Creates unbroken audit trail for regulators and internal auditors. | GA | Compliance, Executive |
| **Audit Trail Generation** | Machine-readable audit logs capture all state transitions, policy evaluations, approval decisions, and deployments. Supports regulatory queries (e.g., "Show all agents approved by Carol between Jan 1 and Mar 31"). | GA | Compliance, Executive |

---

## Lifecycle Management

Five-state lifecycle ensures agents progress through mandatory review, governance gates, and approval chains.

| Capability | Description | Availability | Audiences |
|---|---|---|---|
| **Five-State Lifecycle** | Agents flow through states: `draft` (created, not validated) → `in_review` (passed governance, awaiting human approval) → `approved` (ready for deployment) or `rejected` (not approved) or `deprecated` (end-of-life). Request-changes workflows return agents to draft. | GA | Product, Compliance |
| **Mandatory Human Review** | All ABPs transition through Blueprint Review UI before approval. Designated reviewers (compliance officers, architects, security leads) evaluate agents against governance policies and domain expertise. Reviewers approve, reject, or request changes. | GA | Compliance, Product |
| **Governance-Gated Transitions** | Status transitions are enforced by governance policy engine. Error-severity violations prevent progression from draft to in_review. Transitions are not manual overrides; they are policy-validated state changes. | GA | Compliance, Product, Engineering |
| **Immutable Version History** | Every ABP version is immutable once released. All changes require new versions. Version history is complete and never pruned. Enterprises can trace agent lineage and compare versions side-by-side. | GA | Product, Compliance, Engineering |
| **No-Deletion Policy** | ABPs are never deleted; they are deprecated. Deprecation marks an agent as end-of-life while preserving complete audit history. Ensures regulators can always inspect agent genealogy. | GA | Compliance, Executive |
| **Clone Operations for Agent Forking** | Enterprises can clone approved agents to create variants (e.g., extending a customer service bot to handle a new product line). Cloning preserves governance context and minimizes re-intake. | Preview | Product, Business |

---

## Registry & Inventory

Centralized, searchable repository of all agents with version history, status tracking, and compliance metadata.

| Capability | Description | Availability | Audiences |
|---|---|---|---|
| **Centralized Agent Registry** | PostgreSQL-backed repository storing all Agent Blueprint Packages generated within the enterprise. Single source of truth for agent inventory, versions, and deployment records. Accessible at `/registry`. | GA | Product, Compliance, Executive |
| **Semantic Versioning** | ABPs use semantic versioning (major.minor.patch). Each version is stored as a separate row with independent status tracking. Patch versions for bug fixes, minor for non-breaking additions, major for breaking changes. | GA | Product, Engineering |
| **Searchable, Filterable Agent Inventory** | Registry supports full-text search by agent name, description, and tags. Filterable by lifecycle status, creation date, creator, owner, applicable regulations, and deployment target. Enables compliance teams to answer "Show all customer-facing agents in production." | GA | Compliance, Product, Executive |
| **Model Inventory for Regulatory Compliance** | Registry automatically compiles a machine-readable model inventory listing all agents in production, their deployment date, owner, governance policies, model versions, and approval chain. Satisfies SR 11-7, NIST AI RMF, and FCA guidance. | GA | Compliance, Executive |
| **Lifecycle State Tracking** | Every agent tracks its status (draft, in_review, approved, deployed, deprecated) with timestamps and actor identity. Registry queries enable compliance audits (e.g., "All agents deployed in Q1 2026 by the risk team"). | GA | Compliance, Product |

---

## Runtime & Deployment

Multi-cloud adapters translate Agent Blueprint Packages into platform-specific configurations for execution.

| Capability | Description | Availability | Audiences |
|---|---|---|---|
| **Runtime Adapter Pattern** | Platform-neutral design where ABPs are translated into runtime-specific configurations by pluggable adapters. Enables deployment to multiple cloud platforms without governance complexity. Governance and execution are decoupled. | GA | Engineering, Executive |
| **AWS AgentCore Integration** | AWS AgentCore adapter translates ABP into CloudFormation templates, Lambda configurations, IAM policies, API Gateway endpoints, and CloudWatch logging rules. Agents deploy to AWS with full ABP compliance. | GA | Engineering, Product |
| **Azure AI Foundry Integration** | Azure AI Foundry adapter translates ABP into ARM templates and Azure AI Foundry project configurations. Agents deploy to Azure with full ABP compliance. | GA | Engineering, Product |
| **NVIDIA Dynamo Integration** | NVIDIA Dynamo adapter enables deployment of agents to NVIDIA's orchestration platform for edge and on-premise inference. | Planned | Engineering, Executive |
| **Observability Bridge** | Deployed agents emit metrics, logs, and traces that flow back to Intellios control plane and upstream observability systems (CloudWatch, Azure Monitor, Datadog). Agents remain observable throughout lifecycle. | GA | Engineering, Operations |
| **Lifecycle Webhooks** | Deployed agents trigger webhooks on status transitions (approved, deprecated, updated). Enables integration with CI/CD pipelines, notification systems, and audit logging platforms. | Preview | Engineering, Operations |

---

## Security & Operations

Access control, isolation, and responsive UI for secure, manageable deployments.

| Capability | Description | Availability | Audiences |
|---|---|---|---|
| **Role-Based Access Control (RBAC)** | Intellios supports granular role definitions: Designer (intake and generation), Reviewer (approve/reject), Policy Admin (define and manage policies), Registry Admin (inventory management). Roles constrain feature access and data visibility. | GA | Operations, Executive |
| **Multi-Tenancy** | Platform architecture supports true multi-tenancy: separate agent registries, policy repositories, and audit trails per enterprise tenant. Tenant isolation is enforced at database and application layers. | GA | Operations, Executive |
| **Tenant Isolation** | Tenant data (ABPs, policies, audit logs, intake sessions) is logically and physically isolated. Enterprises cannot query or access other tenants' agents or compliance records. | GA | Operations, Executive |
| **Dark Mode UI** | All Intellios interfaces (Intake, Blueprint Studio, Review Queue, Registry, Policy Editor) support dark mode for accessibility and user preference. Theme persists in user session settings. | GA | Product |
| **Responsive Catalyst UI Kit** | Intellios frontend uses Catalyst, a Tailwind Labs-designed component library with 27 polished components. Responsive design supports desktop, tablet, and mobile browsers. Accessible (WCAG 2.1 AA). | GA | Product, Engineering |

---

## Summary by Maturity

### Generally Available (GA)

**Agent Design:** Conversational intake, seven stakeholder lanes, express-lane templates, iterative refinement, adaptive model selection, Blueprint Studio.

**Governance & Compliance:** Governance-as-code engine (11 operators), deterministic evaluation, four baseline policies, custom policy authoring, severity-gated transitions, AI remediation suggestions, SR 11-7 mapping, MRM documentation, compliance evidence chain, audit trail generation.

**Lifecycle Management:** Five-state lifecycle, mandatory human review, governance-gated transitions, immutable version history, no-deletion policy.

**Registry & Inventory:** Centralized Agent Registry, semantic versioning, searchable/filterable inventory, model inventory, lifecycle state tracking.

**Runtime & Deployment:** Runtime adapter pattern, AWS AgentCore, Azure AI Foundry, observability bridge.

**Security & Operations:** RBAC, multi-tenancy, tenant isolation, dark mode UI, responsive Catalyst UI Kit.

### Preview

**Lifecycle Management:** Clone operations for agent forking.

**Runtime & Deployment:** Lifecycle webhooks.

### Planned

**Runtime & Deployment:** NVIDIA Dynamo integration.

---

## Mapping to Enterprise Use Cases

| Use Case | Key Capabilities | Audience |
|---|---|---|
| **Deploying a customer-facing agent under SR 11-7** | Conversational intake, governance-as-code, SR 11-7 mapping, MRM documentation, compliance evidence chain, human review, registry, AWS/Azure adapters | Bank, Compliance |
| **Managing shadow AI through policy** | Governance-as-code, custom policies, severity gating, remediation suggestions, audit trail, RBAC | Executive, Compliance, Security |
| **Rapid agent iteration with governance enforcement** | Blueprint Studio, iterative refinement, re-validation, express-lane templates, clone operations | Product, Engineering |
| **Demonstrating compliance to regulators** | SR 11-7 mapping, MRM documentation, audit trails, model inventory, immutable version history | Compliance, Executive |
| **Multi-cloud agent deployment** | Runtime adapters, ABP as platform-neutral artifact, multi-tenancy | Engineering, Operations |
| **Building a governed agent factory** | Intake engine, generation engine, governance validation, registry, lifecycle management, RBAC | Product, Engineering, Compliance |

---

## Next Steps

- **[Getting Started with Design Studio](../02-getting-started/engineer-setup-guide.md)** — Launch your first agent intake and generation.
- **[Understanding Governance Policies](../03-core-concepts/governance-as-code.md)** — Learn how to define and author policies.
- **[Architecture Overview](./architecture-overview.md)** — Understand how these capabilities work together as a system.
- **[Agent Lifecycle States](../03-core-concepts/agent-lifecycle-states.md)** — Deep dive into the five-state workflow.

---

*See also: [Architecture Overview](./architecture-overview.md), [What Is Intellios](./what-is-intellios.md), [Governance-as-Code](../03-core-concepts/governance-as-code.md)*

*Next: [Getting Started with Design Studio](../02-getting-started/engineer-setup-guide.md)*
