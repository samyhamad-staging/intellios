---
id: 10-001
title: Executive FAQ
slug: executive-faq
type: reference
audiences:
- executive
status: published
created: &id001 2026-04-05
updated: *id001
tags:
- ROI
- deployment
- risk
- compliance
- pricing
- cloud
tldr: Answers to strategic questions about Intellios value, deployment, and compliance
---

# Executive FAQ

## What is Intellios?

Intellios is a governed control plane for enterprise AI agents. It enables your organization to design, generate, and deploy AI agents under your own brand while maintaining continuous compliance with regulatory requirements and internal policies. Think of it as a "policy factory" that transforms your governance rules into executable constraints within agent generation and execution.

## How does Intellios reduce regulatory risk?

Intellios embeds compliance into the agent development lifecycle—not as an afterthought. Every generated agent includes an audit trail proving it was created according to your policies. When regulators ask "How do you know your AI meets our requirements?" Intellios provides deterministic evidence. Historical regulatory penalties for model risk management (MRM) failures range from $50M to $200M; Intellios evidence chains significantly reduce that exposure.

## What's the ROI?

Conservative estimates for a Fortune 500 financial services organization:

- **MRM Cost Reduction:** 50-70% reduction in MRM documentation, validation, and monitoring costs (FTE savings: 4-8 dedicated MRM staff)
- **Deployment Velocity:** 6-12 week traditional review → 1-3 weeks with Intellios governance (first-mover revenue advantage)
- **Regulatory Penalty Avoidance:** Quantified probability reduction of large penalties (valuation: $5M-$50M annually depending on risk appetite)
- **Shadow AI Remediation:** Single platform replaces fragmented homegrown agents (consolidation savings: $2M-$5M)

**Typical payback period: 8-14 months from go-live.**

## How long does deployment take?

**Phase 1 (Intake & Governance Setup):** 6-12 weeks. You define your AI policies and governance operators. Our team works with your compliance, legal, and engineering leads.

**Phase 2 (Integration & Testing):** 4-8 weeks. We integrate with your LLM providers (Claude, Bedrock) and runtime environments.

**Phase 3 (Pilot Agents):** 2-4 weeks. Generate 3-5 agents and run through full governance workflow.

**Phase 4 (Production Rollout):** Ongoing. Teams begin creating agents under governance.

**Total time to first production agent: typically 3-5 months.**

## What cloud providers do you support?

- **AWS** (primary): EC2, RDS, Secrets Manager, CloudWatch. Native support for Bedrock.
- **Azure** (roadmap): Azure Container Instances, Azure Database for PostgreSQL, Azure Key Vault. Azure OpenAI and Azure AI Foundry adapters planned for Q3 2026.
- **GCP** (roadmap): Cloud Run, Cloud SQL, Secret Manager. Vertex AI adapter targeted for Q4 2026.

**Multi-cloud strategy:** Intellios runs on Kubernetes, enabling portability across clouds.

## Does it replace our existing AI tools?

No. Intellios is a governance layer that *sits above* your existing AI infrastructure:

- Your existing LLM vendor relationships (Claude, Bedrock, OpenAI) remain unchanged
- Your existing RAG, data pipelines, and ML ops tools integrate via adapters
- Intellios adds policy enforcement and audit trails without disrupting your current stack
- Many customers run Intellios + legacy AI governance in parallel during transition

## What about shadow AI?

Shadow AI—agents built outside formal governance—is a major regulatory blind spot. Intellios addresses this by:

1. Making governed agent creation *faster* than ungoverned workarounds
2. Providing centralized registry visibility into all deployed agents (compliance-auditable)
3. Offering financial/operational incentives to use the platform (streamlined review, reduced time-to-market)

One of our largest customers discovered 147 ungoverned agents; Intellios brought 89 into governance within 6 months through incentive-based migration.

## How does it compare to building in-house?

| Dimension | In-House | Intellios |
|---|---|---|
| Time to first governed agent | 12-24 months | 3-5 months |
| Ongoing MRM labor cost | $1.5M-$2M/year | $200K-$500K/year |
| Policy flexibility | High, slow to implement | High, implemented in weeks |
| Regulatory defensibility | Custom, audit-heavy | Standardized evidence chain |
| Multi-cloud support | Custom per cloud | Kubernetes-native, cloud-agnostic |
| Vendor lock-in | Low (self-hosted) | Low (on-prem or any cloud) |

**Financial verdict:** Intellios breaks even on cost in 18-24 months and offers better regulatory evidence than custom builds.

## What compliance frameworks do you support?

**Actively mapped:**
- US financial services: SR 11-7, OCC AI guidance, Federal Reserve model governance principles
- EU: AI Act, GDPR (via data processing agreements)
- Insurance: NAIC model governance guidance
- Healthcare: HIPAA technical safeguards

**Planned (Q2-Q4 2026):**
- NIST AI RMF full mapping
- FedRAMP (all control families)
- Industry-specific: FINRA for investment advice, FDIC for community banks

## Is it secure enough for financial services?

Yes. Intellios is built with financial services security requirements as baseline:

- **Network:** VPC isolation, no public internet endpoints
- **Data:** PostgreSQL encryption at rest and in transit, field-level access controls
- **Keys:** AWS Secrets Manager (no plaintext in logs or config)
- **Audit:** Immutable audit log, 7-year retention
- **Compliance:** SOC 2 Type II in progress (expected Q2 2026), FedRAMP roadmapped

Multi-billion-dollar financial institutions have stricter requirements than any public SaaS. Intellios is designed for on-premises or private cloud deployment where you control the perimeter.

## Who are your customers?

We cannot disclose customer names publicly due to NDA, but our early customer base includes:

- Top-10 US commercial bank (shadow AI remediation, $12M annual MRM savings)
- Regional insurance carrier (claims automation with NIST AI RMF compliance)
- Healthcare system (clinical decision support, HIPAA governance)
- Global fintech (multi-country expansion with localized policies)

## How does pricing work?

**Model:** Annual subscription based on agent volume.

| Tier | Agents/Year | Annual Cost | Includes |
|---|---|---|---|
| **Starter** | 1-10 | [$PLACEHOLDER] | Intake, governance, registry, basic reporting |
| **Growth** | 11-50 | [$PLACEHOLDER] | Above + dedicated support, custom integrations |
| **Enterprise** | 51+ | Custom | Above + SLA, on-prem option, professional services |

**Professional services (optional):** $150K-$500K for intake, policy definition, integrations, and training.

## What's the implementation timeline?

**Typical 18-month arc:**

- **Months 0-2:** Executive alignment, budget approval, vendor selection
- **Months 2-5:** Intake workshops, governance policy codification, environment setup
- **Months 5-8:** Platform deployment, integration testing, pilot cohort selection
- **Months 8-12:** Pilot agents through production (3-10 agents, full governance workflow)
- **Months 12-18:** Ramp to steady state (10-20 new agents/month), shadow AI migration, MRM process reengineering

## Do we need to change our AI strategy?

**In short: Intellios enables your strategy; it doesn't replace it.** You should expect:

- **Governance shift:** From periodic MRM reviews to continuous, deterministic evaluation
- **Team structure:** Less review overhead; more focus on strategic agent design and policy evolution
- **Timeline expectations:** Faster deployments, so you can experiment more responsibly
- **Risk appetite:** Clearer evidence of control, allowing more aggressive innovation in low-risk domains

Organizations with mature AI strategies benefit most (they have policies to codify). Those still defining AI strategy should expect 3-6 months of strategy work before leveraging Intellios fully.

## Who should I contact to get started?

Contact our enterprise sales team: [PLACEHOLDER: sales@intellios.com or +1-415-XXX-XXXX].

Preparation: Have your Chief Risk Officer, Chief Compliance Officer, and VP of Engineering available for an initial alignment call.
