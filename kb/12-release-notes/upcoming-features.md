---
id: 12-002
title: Upcoming Features
slug: upcoming-features
type: reference
audiences:
- product
- executive
status: published
created: &id001 2026-04-05
updated: *id001
tags:
- roadmap
- features
- multi-tenancy
- authentication
- adapters
- NIST
tldr: Roadmap visibility for planned features and enhancements
---

# Upcoming Features

This document provides visibility into planned features for future Intellios releases. Timelines are subject to change based on customer feedback and engineering capacity.

---

## Q2 2026 (May–June)

### Multi-Tenancy (GA) — In Progress

**Planned release:** June 1, 2026

**What it is:** Enable enterprises to partition Intellios into logical tenants (brands, business units, geographies) within a single deployment.

**Use cases:**
- Multi-brand financial institution (each brand manages own agents under shared governance)
- Global organization (US operations, EU operations, APAC operations each with localized policies)
- Holding company (parent company + acquired subsidiary, each with own policies)

**Key capabilities:**
- Separate governance policies per tenant (while maintaining global baseline policies)
- Isolated agent registries (agents in Tenant A invisible to Tenant B)
- Cross-tenant role-based access control (admin can see all tenants; team members see only their tenant)
- Dedicated ingress per tenant (optional custom domain per tenant)
- Policy inheritance (global policies + tenant-specific overrides)

**Status:** Currently in beta with 2 customers; moving to GA in Q2

**Migration path:** Existing single-tenant deployments upgrade seamlessly (auto-converted to 1 implicit tenant)

---

### Azure AI Foundry Adapter — In Progress

**Planned release:** June 15, 2026

**What it is:** Deploy agents to Azure AI Foundry (Microsoft's managed AI orchestration service).

**Supported integrations:**
- Azure OpenAI for LLM inference
- Azure AI Search for vector retrieval
- Azure Cognitive Services (vision, speech)
- Azure Key Vault for secrets management

**Use cases:**
- Organizations with Azure-committed environments
- Microsoft Dynamics 365 integration (CRM agents)
- Copilot for Microsoft 365 ecosystem

**Status:** Currently in development; partner engineering with Microsoft underway

**Timeline:** Q2 2026 (subject to Azure API availability)

---

### SOC 2 Type II Audit — In Progress

**Planned release:** May 30, 2026

**What it is:** Third-party audit certifying Intellios meets Trust Service Criteria (security, availability, processing integrity, confidentiality, privacy).

**Expected outcome:** SOC 2 Type II certificate (12-month attestation period)

**Controls verified:**
- Security: Access controls, encryption, key management
- Availability: Uptime tracking, incident response, disaster recovery
- Processing integrity: Data validation, audit logging, error handling
- Confidentiality: Data segmentation, multi-tenancy isolation
- Privacy: GDPR compliance, data residency, retention policies

**Audit status:** Currently in process (3/4 control domains completed; final attestation June 2026)

**Impact:** Required for many Fortune 500 contracts; enables rapid security reviews during sales process

---

## Q3 2026 (July–September)

### Advanced Policy Composition — Planned

**What it is:** Enable conditional/compound governance policies (if-then logic for operator chaining).

**Current limitation:** Operators evaluated independently. New feature: Operators can depend on each other.

**Example use case:**
```
IF risk_classification = "high"
THEN require(stakeholder_approval_gates = "compliance AND risk")
AND require(execution_timeout_policy = 30 seconds)
```

**Status:** Design phase (gathering customer requirements)

**Timeline:** Q3 2026 (estimated)

---

### NIST AI RMF Mapping — Planned

**What it is:** Map Intellios governance operators to NIST AI Risk Management Framework functions and core practices.

**NIST RMF functions covered:**
- Govern: Policy design, ownership, responsibility
- Map: System design, intended use, risk assessment
- Measure: Monitoring, performance metrics, drift detection
- Manage: Risk mitigation, incident response, audit trails

**Expected output:**
- Mapping document (operator ↔ NIST practice)
- Dashboard showing NIST RMF coverage per agent
- Report generator for risk assessments citing NIST practices

**Status:** Planned; awaiting NIST AI RMF v2.0 publication (expected Q2 2026)

**Timeline:** Q3 2026 (post-NIST RMF v2.0 release)

---

### Observability Dashboard Enhancements — Planned

**What it is:** Real-time agent behavior monitoring and drift detection.

**New capabilities:**
- Agent decision distribution (what % of decisions are approve/deny/escalate)
- Concept drift detection (statistical tests for performance degradation)
- Anomaly alerts (unusual decision patterns, rate changes)
- Comparative metrics (this week vs. last week, this month vs. last month)

**Status:** Requirements gathering with compliance teams

**Timeline:** Q3 2026

---

### Custom Reporting — Planned

**What it is:** Self-serve dashboards and exportable reports for governance oversight.

**Examples:**
- Agent inventory by risk level, domain, team (CSV export)
- Compliance coverage report (which policies applied to which agents)
- Deployment timeline (agents deployed per team, per month)
- Review queue metrics (approval time by risk level, reviewer SLA performance)

**Status:** Planned; UI/UX design starting in Q2 2026

**Timeline:** Q3 2026

---

## Q4 2026 (October–December)

### NVIDIA Nemo Adapter — Planned

**What it is:** Deploy agents to NVIDIA Nemo (enterprise LLM orchestration framework).

**Integration capabilities:**
- NVIDIA Nemo LLM inference
- GPU acceleration (A100, H100)
- Distributed inference (multi-GPU, multi-node)

**Use cases:**
- Organizations with on-premises GPU infrastructure
- High-performance inference requirements (low latency, high throughput)
- Custom LLM fine-tuning workflows

**Status:** Planned; scoping underway with NVIDIA engineering

**Timeline:** Q4 2026 (estimated)

---

### API Rate Limiting Dashboard — Planned

**What it is:** Visual management of API quotas and rate limits per team.

**Current state:** Rate limits configured via YAML; no visibility into usage

**Planned improvements:**
- Dashboard showing per-team API usage (real-time graphs)
- Alert on quota approaching limits
- Self-serve quota increase requests (with approval workflow)
- Granular rate limits by endpoint (generation, validation, registry, review)

**Status:** Planned

**Timeline:** Q4 2026

---

### Webhook Management UI — Planned

**What it is:** Web-based UI for creating, testing, and monitoring webhooks (currently CLI-only).

**Features:**
- Visual webhook builder (event type, URL, auth method)
- Test webhook button (send sample payload to verify integration)
- Webhook delivery logs (success/failure, response codes, retry history)
- Bulk retry failed webhooks

**Status:** Planned

**Timeline:** Q4 2026

---

## 2027 and Beyond

### FedRAMP Authorization — Planned

**What it is:** Achieve FedRAMP moderate baseline for AWS government deployments.

**Current status:** Moderate assurance (informal assessment)

**FedRAMP authorization:** Full ATO (Authority to Operate) with GSA listing

**Use cases:** US federal agencies, state/local government, contractors supporting government

**Estimated effort:** 18–24 months (includes continuous compliance monitoring)

**Timeline:** 2027 H1 (provisional)

---

### GCP Vertex AI Adapter — Planned

**What it is:** Deploy agents to Google Cloud's Vertex AI (managed ML platform).

**Integration capabilities:**
- Vertex AI Generative AI API (Claude, Gemini)
- Vertex AI Search (vector retrieval)
- Dataflow for batch processing
- Cloud Monitoring for observability

**Use cases:** Google Cloud-committed organizations

**Status:** Planned; GCP partnership discussion started

**Timeline:** 2027 (estimated)

---

### Advanced ML Observability — Planned

**What it is:** Deep learning observability for model drift, fairness, and explainability.

**Capabilities:**
- Statistical drift detection (Kolmogorov-Smirnov test for input distributions)
- Fairness metrics (disparate impact analysis by demographic groups)
- Feature importance (SHAP values for agent decision explanations)
- Retraining recommendations (trigger redeployment if drift exceeds threshold)

**Status:** Research phase

**Timeline:** 2027–2028 (requires research partnership, possibly with university)

---

### Synthetic Dataset Generation — Planned

**What it is:** Auto-generate test datasets for agent validation.

**Use cases:**
- Test agent with edge cases before production deployment
- Validate fairness (test with demographically diverse synthetic customers)
- Load test (synthetic high-volume scenarios)

**Status:** Planned

**Timeline:** 2027 (estimated)

---

## How to Request Features

Have a feature request? Submit it on GitHub or contact your CSM:

**GitHub:** [PLACEHOLDER: github.com/intellios/intellios/discussions/feature-requests]

**Email:** [PLACEHOLDER: product@intellios.com]

**Slack (Enterprise):** #intellios-product-feedback

Include:
- Use case (why you need it)
- Proposed solution (what would help)
- Timing urgency (nice-to-have vs. blocker)

---

## Feature Voting & Prioritization

Enterprise customers can vote on feature priority. Votes weighted by:
- **Customer tier** (Enterprise vote = 5 points, Growth = 2 points, Starter = 1 point)
- **Use case impact** (affects portfolio, business-critical vs. nice-to-have)
- **Regulatory alignment** (required for compliance vs. optional)

Vote on the roadmap board: [PLACEHOLDER: canny.io/intellios/roadmap]

Roadmap updated quarterly based on voting + strategic priorities.

---

## Backwards Compatibility

All upcoming features are designed to be **backwards compatible** with v1.2.0 and later. Existing deployments will not be forced to adopt new features.

**Exception:** Major version releases (v2.0, v3.0) may introduce breaking changes, with 6-month deprecation notice.

