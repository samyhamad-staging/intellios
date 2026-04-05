---
id: 10-004
title: Product FAQ
slug: product-faq
type: reference
audiences:
- product
status: published
created: &id001 2026-04-05
updated: *id001
tags:
- features
- roadmap
- user experience
- approval
- teams
- integration
tldr: Questions about Intellios capabilities, roadmap, and user experience
---

# Product FAQ

## What can Intellios do today?

**Core capabilities (v1.2.0):**

1. **Intake Engine:** Multi-stakeholder form-driven requirements capture
   - 7 input lanes (compliance, risk, legal, security, IT, operations, business)
   - Template library with 20+ pre-built forms (financial services, healthcare, insurance)
   - Real-time conflict detection (contradictory stakeholder requirements flagged)

2. **Blueprint Generation:** LLM-powered agent definition
   - Generate agent blueprint from intake data in 30 seconds
   - Refinement UI: adjust prompt, tools, token budget, risk classification
   - Auto-generate model cards (transparency documents)

3. **Governance Validation:** Deterministic policy enforcement
   - 11 governance operators (token constraints, tool safety, risk classification, stakeholder approval gates, etc.)
   - Real-time validation feedback during refinement
   - Conditional approval workflows

4. **Agent Registry:** Versioned repository with lifecycle management
   - Store blueprints (versions, tags, metadata)
   - Deployment status tracking (staging, production, deprecated)
   - One-click deployment to AWS Lambda or Kubernetes

5. **Blueprint Review UI:** Human review interface for governance compliance
   - Streamlined approval workflow for high-risk agents
   - Comparison view (blueprint vs. governance policy)
   - Audit trail (who approved, when, feedback)

6. **Governance Dashboard:** Centralized visibility
   - Agent portfolio view (count by status, risk level, domain)
   - Policy compliance metrics (validation pass rate, exception trends)
   - Deployment timeline and SLA tracking

## What's on the roadmap?

**Q2 2026 (May-June):**
- **Multi-tenancy (GA):** Enterprise customers can isolate teams/brands within one Intellios instance
- **SOC 2 Type II:** Security audit completion
- **Azure AI Foundry adapter:** Deploy agents to Azure environments

**Q3 2026 (July-Sept):**
- **Advanced policy composition:** Write conditional policies (if-then logic for operator chaining)
- **NIST AI RMF mapping:** Governance operators mapped to NIST RMF functions/core practices
- **Observability dashboard enhancements:** Real-time agent decision tracking, drift detection
- **Custom reporting:** Export agent portfolios with custom columns/filters

**Q4 2026 (Oct-Dec):**
- **NVIDIA Nemo adapter:** Deploy agents to NVIDIA Nemo systems
- **API rate limiting dashboard:** Visual management of API quotas per team
- **Webhook management UI:** Create/edit/test webhooks in dashboard (currently CLI-only)

**2027 (Planned):**
- **FedRAMP authorization:** Complete ATO process
- **GCP Vertex AI adapter:** Full Google Cloud integration
- **Advanced ML observability:** Model drift detection, concept drift alerting
- **Synthetic dataset generation:** Auto-generate test datasets for agent validation

## How do users create agents?

**4-step workflow:**

### Step 1: Intake (Stakeholder Inputs)
- User selects a template (e.g., "Credit Decisioning Agent")
- Form presents 7 lanes of inputs (compliance, risk, etc.)
- Real-time validation: form highlights conflicts ("Compliance requires human review, but ops wants fully autonomous")
- User resolves conflicts and submits

### Step 2: Generation
- System calls Claude/Bedrock to generate initial blueprint
- Progress indicator shows LLM generation status
- ~30 seconds to completion

### Step 3: Refinement
- User sees generated blueprint (prompt, tools, token budget, model selection)
- Real-time feedback: if user changes token budget too low, governance validator flags it
- User can click "Quick Fix" to auto-adjust, or override manually
- Tools can be added/removed from approved library

### Step 4: Review & Approval
- High-risk agents (flagged by governance validator) go to Review Queue
- Reviewers (compliance, risk) see full context: intake data, blueprint, governance policy, model card
- Reviewers can approve, request changes, or reject
- Once approved, agent is added to Registry and can be deployed

**Timeline:** Intake to approval typically 15 minutes (low-risk) to 48 hours (high-risk, requiring multiple stakeholder approvals).

## What's the approval flow?

**Automatic approval (low-risk agents):**
- All governance operators pass
- Risk classification = "low" or "medium"
- Stakeholder consensus achieved
- Agent directly added to Registry (no human review)

**Manual review (high-risk agents):**
1. Governance validator flags: "Requires compliance review"
2. Agent added to Review Queue
3. Compliance reviewer notified (email, dashboard)
4. Reviewer examines: blueprint, model card, governance policy, audit trail
5. Reviewer decision: approve, request changes, or reject
6. If approve: agent added to Registry; if reject: feedback sent to creator with remediation steps

**Multi-stakeholder approval gates (custom policies):**
- Policy defines: "Financial product agents require both compliance AND risk sign-off"
- Governance validator detects this rule
- Agent waits for both stakeholders to review
- Either can block; both must approve

**SLA:** 24 hours for first review, 4 hours for follow-up review (configurable per organization).

## How does it handle multiple teams?

**Team structure:**

- **Business units:** Credit, Deposits, Wealth, Cards, etc.
- **Governance scope:** Global policies (CEO/CRO-defined) + per-team policies (BU head-approved)
- **Visibility:** Teams see their agents by default; visibility expanded via role-based access

**Multi-team workflows:**

1. **Agent ownership:** Each agent assigned to owning team (credit team owns credit agents)
2. **Review routing:** Governance rules route high-risk agents to appropriate reviewers (credit risk team for credit agents)
3. **Policy inheritance:** Teams inherit global policies; can add team-specific policies
4. **Shared templates:** All teams use shared Intake templates; customizable per team
5. **Consolidated dashboards:** Execs see org-wide agent portfolio; BU heads see BU-scoped view

**Example:** Deposits team creates a deposit recommendation agent → automatically assigned to Deposits team → routed to Deposits risk reviewer → adds to Deposits agent registry. Credit team cannot see this agent in their view (unless given explicit read permission).

**Access control:** Role-based: Team Lead, Reviewer, Agent Owner, Viewer (configurable per organization).

## Industry-specific features?

**Pre-built templates (Q1 2026 release):**

| Industry | Agent Template | Intake Lanes |
|---|---|---|
| **Banking** | Credit decisioning, Fraud detection, Customer service | Compliance (SR 11-7), Risk (credit risk), Legal (truth in lending), Security, IT |
| **Insurance** | Claims automation, Underwriting, Premium calculation | Compliance (NAIC), Risk (actuarial), Legal (policy language), Security, Operations |
| **Healthcare** | Clinical decision support, Prior auth, Billing | Compliance (HIPAA), Risk (clinical risk), Legal (liability), Privacy, IT |
| **Fintech** | Lending decisioning, KYC/AML, Portfolio analysis | Compliance (FinCEN), Risk (credit, AML), Legal (securities), Security, Ops |

**Customization:** Templates are starting points; stakeholders can modify intake lanes and constraints.

## Integration with existing tools?

**Data sources (agents read from):**
- Snowflake, BigQuery, Redshift (data warehouses)
- Enterprise systems via APIs (Salesforce, SAP, Workday)
- Internal microservices (RESTful APIs, gRPC)
- Message queues (Kafka, SQS)

**Integration method:** Define tools in agent blueprint; Intellios validates tool safety against governance policy.

**Deployment targets (agents write to):**
- Lambda, API Gateway (AWS)
- Kubernetes, Cloud Run (multi-cloud)
- Custom runtime adapters (third-party systems)

**External integrations:**
- **Webhooks:** Notify incident management, config management, audit systems on agent deployment/updates
- **CI/CD:** GitHub Actions, GitLab CI, Jenkins can trigger Intellios validation and deployment
- **Monitoring:** CloudWatch, Datadog, Prometheus dashboards ingest Intellios metrics
- **Chat platforms:** Slack notifications for Review Queue updates, approval decisions [PLACEHOLDER: integration planned]

## Customization options?

**High-customization:**

1. **Governance policies:** Write custom operators; adjust constraints
2. **Intake templates:** Create industry-specific or company-specific forms
3. **UI branding:** White-label dashboard (logo, colors, domain)
4. **Review workflows:** Define custom SLAs, escalation paths, stakeholder routing
5. **Reporting:** Export data via API; create custom dashboards

**Lower-customization (provided by Intellios):**

- Core governance engine logic (11 operators, deterministic evaluation)
- Database schema (not customer-modified)
- API contract (stable)

**Customization timeline:**

| Customization | Timeline |
|---|---|
| White-label branding | 1-2 weeks |
| Custom intake template | 2-4 weeks |
| Custom governance operator | 4-6 weeks |
| Custom runtime adapter | 4-8 weeks |
| Full system white-label + all of above | 12-16 weeks |

## User training needed?

**For different roles:**

| Role | Training | Duration |
|---|---|---|
| **Executive** | Strategic overview (what is Intellios, why it matters to the org) | 1 hour |
| **Compliance/Risk** | Governance policy deep-dive, Review UI walkthrough, examination workflows | 4 hours |
| **Agent creator (engineers)** | Intake process, blueprint generation, refinement, Registry, deployment | 3 hours |
| **PM** | Intake strategy, portfolio management, roadmap context | 2 hours |
| **Admin** | Deployment, multi-team setup, policy versioning, troubleshooting | 6 hours |

**Training materials provided:**

- Video walkthrough (10 minutes)
- Interactive demo environment (sample agents, dummy workflows)
- Hands-on lab (create a test agent start-to-finish)
- Admin playbook (operations, SLA management, escalation)

**Optional:** Intellios Professional Services can deliver on-site training (1-2 days).

## Who can help with product questions?

Contact your CSM or product team: [PLACEHOLDER: product@intellios.com]. Schedule a product consultation for use case planning.
