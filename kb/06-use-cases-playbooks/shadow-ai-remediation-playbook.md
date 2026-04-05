---
id: "06-004"
title: "Shadow AI Remediation Playbook"
slug: "shadow-ai-remediation-playbook"
type: "task"
audiences:
  - "compliance"
  - "engineering"
  - "executive"
status: "published"
version: "1.0.0"
platform_version: "1.0.0"
created: "2026-04-05"
updated: "2026-04-05"
author: "Intellios"
reviewers: []
tags:
  - "shadow-ai"
  - "governance"
  - "compliance"
  - "risk-management"
  - "remediation"
  - "enterprise-ai"
prerequisites:
  - "Intellios deployed and operational"
  - "Governance policies defined and active"
  - "Executive sponsorship secured"
related:
  - "Agent Blueprint Package"
  - "Governance Validator"
  - "Agent Registry"
  - "Understanding Policy Expression Language"
next_steps:
  - "Configure ongoing shadow AI discovery automation"
  - "Build custom governance policies for regulated domains"
  - "Establish agent lifecycle management workflows"
feedback_url: "[PLACEHOLDER]"
tldr: >
  Bring all ungoverned AI agents operating within your enterprise under Intellios
  governance within 12-16 weeks. This playbook provides a six-phase methodology for
  discovering shadow AI, assessing risk, triaging agents, onboarding to Intellios,
  enforcing governance, and preventing recurrence. Designed for cross-functional
  execution by compliance, engineering, and executive leadership.
---

# Shadow AI Remediation Playbook

> **TL;DR:** Bring all ungoverned AI agents operating within your enterprise under Intellios governance within 12-16 weeks. This playbook provides a six-phase methodology for discovering shadow AI, assessing risk, triaging agents, onboarding to Intellios, enforcing governance, and preventing recurrence. Designed for cross-functional execution by compliance, engineering, and executive leadership.

---

## Executive Summary

Shadow AI represents one of the most pressing governance challenges in modern enterprises. Gartner estimates that by 2027, 75% of enterprise AI deployments will lack adequate governance frameworks. Shadow AI agents—unauthorized, undocumented AI systems operating without centralized oversight—create cascading risks: uncontrolled data access, regulatory violations (particularly under SR 11-7 for financial institutions), unauditable decision-making, brand damage, and operational fragility.

Yet discovering and remediating shadow AI has historically been fragmented, manual, and slow. Teams across your organization are experimenting with cloud AI services, custom LLM wrappers, and ChatGPT integrations without IT or compliance knowledge. Each discovery attempt is ad-hoc: network scans, cloud account audits, employee surveys. Each remediation is one-off: negotiating with business units, evaluating agents individually, creating custom governance rules.

This playbook turns shadow AI remediation from a compliance firefighting exercise into a structured, repeatable, enterprise-scale governance initiative. It leverages Intellios—the white-label enterprise agent factory—to transform discovered agents from ungoverned liabilities into auditable, policy-compliant assets within a predictable timeline.

**Business Outcome:** A Fortune 500 enterprise executing this playbook can achieve 100% shadow AI visibility and bring 95%+ of discovered agents into governance within 12-16 weeks, generating continuous compliance evidence for regulators and risk teams.

---

## Goal

By completing this playbook, you will have:

1. **Discovered** all shadow AI agents operating across your enterprise
2. **Assessed** each agent's risk tier and regulatory exposure
3. **Triaged** agents into three categories: onboard to Intellios, retire, or consolidate
4. **Onboarded** compliant agents into Intellios with full governance enforcement
5. **Configured** ongoing discovery mechanisms to prevent shadow AI recurrence
6. **Established** baseline metrics for shadow AI risk and governance coverage

---

## Prerequisites

Before starting shadow AI remediation, ensure you have:

- [ ] **Intellios Platform** — Intellios deployed and operational in your enterprise environment
- [ ] **Governance Policies Defined** — Your compliance and security teams have authored at least the four seeded policies (Safety Baseline, Audit Standards, Access Control Baseline, Governance Coverage) and validated them in a test environment
- [ ] **Executive Sponsorship** — C-suite executive (CIO, CRO, CAO, or General Counsel) publicly commits to shadow AI remediation as a strategic priority and allocates cross-functional resources
- [ ] **Cross-Functional Leadership Team** — Designated leads from compliance, engineering, business units, and information security
- [ ] **Baseline Shadow AI Inventory** — Initial discovery of potential shadow AI systems (even if incomplete) to establish scope
- [ ] **Regulatory Mapping** — For regulated enterprises, completed mapping of shadow AI risks to applicable regulations (SR 11-7, GDPR, HIPAA, SOX, PCI-DSS, FINRA)

---

## Six-Phase Remediation Process

### Phase 1: Discovery — Identify All Shadow AI Agents

**Business Context:** You cannot remediate what you cannot see. Shadow AI hides in three places: cloud service subscriptions (SaaS AI tools, ChatGPT Plus, Claude API), engineering infrastructure (custom Python scripts, local LLM deployments), and business unit workflows (spreadsheet macros, no-code AI platforms). Your first task is systematic visibility across all three domains.

#### Step 1.1: Establish Discovery Command Center

Designate a cross-functional discovery team with representatives from:
- **Compliance/Risk:** Understands regulatory scope and escalation thresholds
- **IT/Security:** Owns infrastructure scanning, cloud account auditing, network monitoring
- **Engineering:** Interprets technical signals; knows common shadow AI deployment patterns
- **Business Unit Liaisons:** Can identify agents in use locally without IT knowledge

Create a **centralized discovery tracker** (spreadsheet, Jira, or dedicated tool) where all discovered agents are logged with: agent name, business unit, discovery method, data classification, tool/platform used, deployment status (active/inactive), and estimated risk tier (pending detailed assessment).

**Expected result:** A formal discovery team with weekly sync cadence and a shared tracking system. All discovered agents logged in a single system of record.

#### Step 1.2: Network and API Gateway Analysis

Scan your network infrastructure and cloud API gateways for patterns indicating shadow AI:

- **Traffic signatures:** Identify DNS requests and API calls to known AI service endpoints (OpenAI, Anthropic Claude, Google Vertex AI, Azure OpenAI, Hugging Face, LangChain platforms, LlamaIndex services).
- **Cloud API logs:** Query cloud cost management tools (AWS Cost Explorer, Azure Cost Management, GCP Billing) for charges attributed to ML/AI services in unexpected accounts or departments.
- **API gateway rules:** Extract API keys, Webhooks, and AI service integrations from API gateway configuration and access logs.

```bash
# Example: Query AWS CloudTrail for OpenAI API usage patterns
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=AssumeRole \
  --start-time 2025-06-01T00:00:00Z \
  | grep -i "openai\|anthropic\|vertex"
```

**Expected result:** A list of 10-50+ candidate shadow AI systems with service names, account owners, and estimated usage frequency. Not all will be active agents; many will be experiments or one-off POCs.

#### Step 1.3: Cloud Account and SaaS Audit

Inventory all cloud service subscriptions and SaaS tools in use across your enterprise:

- **SaaS audit:** Review identity provider (Okta, Azure AD, Google Workspace) to identify which employees have active subscriptions to ChatGPT Plus, Claude.ai, Perplexity, or other AI services. Flag corporate credit card charges for AI service subscriptions.
- **Cloud account enumeration:** For each major cloud provider (AWS, Azure, GCP), audit all active accounts and sub-accounts. Within each, query for AI/ML service instances: SageMaker endpoints, Azure AI Studio deployments, Vertex AI model endpoints, managed databases hosting vector embeddings (indicating RAG-style agents).
- **Third-party no-code platforms:** Check for active projects in Make.com, Zapier, n8n, or other orchestration platforms that integrate with AI services.

**Expected result:** A comprehensive cloud inventory with 20-100+ potential shadow AI footprints, categorized by cloud provider and business unit ownership.

#### Step 1.4: Employee Survey and Business Unit Interviews

Conduct a **structured survey and interview campaign** to surface shadow AI systems that evade infrastructure scanning:

- **Employee survey:** Distribute an enterprise-wide, confidential survey asking: "In the last 12 months, have you used, built, or deployed an AI agent or chatbot (including ChatGPT, Claude, or custom models) to automate work? If yes, describe: what it does, what data it accesses, who else uses it."
- **Department interviews:** Conduct 30-minute interviews with business unit leaders in high-risk domains (finance, customer service, sales, HR, legal, risk, compliance) asking about AI tooling, automation experiments, and vendor relationships.
- **Development team interviews:** Interview engineering leads about custom AI integrations, internal LLM deployments, and experimental agent projects in development.

Make surveys and interviews **explicitly confidential** and frame them as a governance initiative, not a punishment exercise. Assure participants that the goal is to bring AI into governance, not to shut down useful tools.

**Expected result:** 20-40% of total discovered agents surface through this channel. Employees often reveal agents that leave no infrastructure footprint because they run on personal devices or external SaaS platforms (e.g., ChatGPT conversations, Claude.ai notebooks).

#### Step 1.5: Consolidate Discovery Inventory

Merge findings from all four discovery methods (API logs, cloud audit, SaaS subscriptions, employee survey) into a single **master shadow AI inventory**:

| Agent Name | Discovery Method | Business Unit | Tool/Platform | Data Classification | Active | Risk Tier (Pending) |
|---|---|---|---|---|---|---|
| Customer Escalation Bot | Network scanning | Customer Service | ChatGPT API | PII (customer names, emails) | Yes | TBD |
| Financial Forecast Agent | Cloud audit | Finance | Azure OpenAI | Confidential (revenue data) | Active | TBD |
| HR Resume Screener | Employee survey | HR | Anthropic API (custom) | PII (candidate data) | Active | TBD |
| Legal Research Tool | SaaS audit | Legal | Perplexity API | Client confidential | Inactive | TBD |
| Backlog Grooming Bot | Development interview | Engineering | LlamaIndex + Claude | Internal (code snippets) | Active | TBD |

**Expected result:** A consolidated inventory of 30-150+ shadow AI systems (depending on enterprise size and maturity). Expect 40-60% to be active and operational; 25-35% to be experiments; 15-25% to be inactive or abandoned.

---

### Phase 2: Risk Assessment — Classify Agents by Governance Exposure

**Business Context:** Not all shadow AI is equally risky. A customer service chatbot handling customer inquiry summaries carries different regulatory exposure than a financial forecasting agent accessing revenue data under SOX/FINRA oversight. Phase 2 classifies discovered agents into risk tiers to prioritize remediation and allocate governance resources efficiently.

#### Step 2.1: Define Risk Tier Classification Framework

Establish a **structured risk classification matrix** with four tiers:

**Tier 1 — Critical (Immediate Remediation Required)**
- Handles regulated data (PII under GDPR, healthcare data under HIPAA, financial data under SOX/FINRA, payment data under PCI-DSS)
- Customer-facing (external users, regulatory exposure, brand risk)
- Makes autonomous decisions affecting customers or employees (automated approval, denial, adjustment)
- Integrates with critical systems (payment, authorization, customer database)
- **Remediation timeline:** Week 1-2

**Tier 2 — High (Urgent Remediation Required)**
- Handles sensitive internal data (employee data, strategic data, pricing, product roadmap)
- Internal-facing but affecting multiple departments (cross-functional data access)
- Makes advisory decisions that influence human decisions (risk scoring, recommendations, prioritization)
- Integrates with important business systems (CRM, ERP, analytics)
- **Remediation timeline:** Week 3-6

**Tier 3 — Medium (Scheduled Remediation Required)**
- Handles internal, non-sensitive data (general knowledge, public information, low-risk internal context)
- Limited user base (single department, specific team)
- Provides information only; humans make all decisions
- Integrates with non-critical systems or operates in isolation
- **Remediation timeline:** Week 7-12

**Tier 4 — Low (Documentation, No Urgent Action)**
- Experimental or POC status (actively being evaluated, not production)
- No data access or only test/dummy data
- Single user or very limited audience
- No integration with production systems
- **Action:** Document and monitor; prioritize for consolidation or retirement

#### Step 2.2: Interview Agent Owners and Stakeholders

For each agent in your discovery inventory, conduct a **structured intake interview** with the owner, creator, or primary user:

**Required Information:**
- Agent purpose and business value delivered
- Data sources accessed (databases, APIs, files, user inputs)
- User base (internal, external customers, partners)
- Decision authority (informational, advisory, autonomous)
- Compliance requirements (applicable regulations, audit obligations)
- Criticality to business operations (nice-to-have, important, business-critical)
- Current monitoring/alerting (logs generated, issues tracked, incidents escalated)
- Vendor/dependency risk (if built on ChatGPT Plus or another external service, assess availability risk)

Template:
```
Agent Name: ________________
Owner/Creator: ________________
Primary Use Case: ________________

Data Inputs:
  - [ ] Customer PII (names, emails, IDs, addresses, phone)
  - [ ] Employee PII (names, emails, SSN, performance data)
  - [ ] Financial data (revenue, costs, forecasts, pricing)
  - [ ] Payment data (credit cards, transaction history)
  - [ ] Healthcare data (diagnoses, treatments, patient history)
  - [ ] Other sensitive data: ________________

Users:
  - [ ] Internal only (describe: ______)
  - [ ] External customers (number: ______)
  - [ ] Partners (which partners: ______)

Decisions Made:
  - [ ] Informational only (agent provides context/suggestions)
  - [ ] Advisory (human makes final decision based on agent input)
  - [ ] Autonomous (agent makes/implements decisions without human approval)

Criticality:
  - [ ] Experimental (POC, evaluation phase)
  - [ ] Departmental (used by one business unit, not critical to overall business)
  - [ ] Company-wide (used across multiple departments, would impact multiple teams if unavailable)
  - [ ] Business-critical (company cannot operate effectively without this agent)

Compliance Requirements:
  - [ ] GDPR (operates on EU resident data)
  - [ ] HIPAA (operates on healthcare data)
  - [ ] SOX (operates on financial/accounting data)
  - [ ] FINRA (operates on investment/trading data)
  - [ ] PCI-DSS (handles payment card data)
  - [ ] Other: ________________
```

**Expected result:** Detailed intake data for 80%+ of agents, enabling classification. For agents whose owners cannot be identified, classify as Tier 2 or 3 by default (orphaned shadow AI carries high risk due to lack of stewardship).

#### Step 2.3: Assign Risk Tier and Identify Regulatory Drivers

Using the intake data from Step 2.2, assign each agent a risk tier:

| Agent Name | Data Classification | User Base | Decision Authority | Applicable Regulations | Risk Tier | Rationale |
|---|---|---|---|---|---|---|
| Customer Escalation Bot | PII (names, emails) | External (customers) | Advisory | GDPR | **Critical** | Handles customer PII, external exposure, GDPR regulated |
| Financial Forecast Agent | Financial (revenue, forecasts) | Internal | Advisory | SOX, FINRA | **Critical** | Handles financial data; SOX/FINRA compliance required |
| HR Resume Screener | PII (candidate data) | Internal | Autonomous | GDPR, Local labor law | **Critical** | Autonomous decisions affecting employment; PII; regulatory exposure |
| Legal Research Tool | Client confidential | Internal | Informational | Privilege (attorney-client) | **High** | Sensitive data; privilege risk; inactive status reduces urgency |
| Backlog Grooming Bot | Internal code/tickets | Internal (1 team) | Informational | None | **Medium** | Limited scope, low sensitivity, informational only |

Document **regulatory drivers** for each Tier 1 and Tier 2 agent. This will guide policy authoring and governance configuration later.

**Expected result:** All discovered agents classified into risk tiers with documented justification. Expect 10-25% to be Tier 1 (Critical), 20-35% Tier 2 (High), 30-40% Tier 3 (Medium), and 20-30% Tier 4 (Low).

---

### Phase 3: Triage — Decide Per-Agent: Onboard, Retire, or Consolidate

**Business Context:** Not every shadow AI agent should be brought into Intellios governance. Some are low-value experiments; others are redundant with existing systems. Phase 3 makes explicit per-agent decisions to maximize remediation impact and minimize wasted governance overhead.

#### Step 3.1: Establish Triage Decision Criteria

Develop a **triage decision matrix** that answers three questions for each agent:

**Question 1: Business Value — Is this agent delivering material business value?**
- **High:** Reduces manual work by 10+ hours/week; enables new capability; generates measurable revenue/savings
- **Medium:** Reduces manual work by 2-10 hours/week; useful but replaceable
- **Low:** Minimal impact; experimental or POC; abandoned

**Question 2: Regulatory/Compliance Exposure — Does this agent pose governance risk?**
- **Yes:** Handles regulated data, customer-facing, autonomous decisions, critical systems integration
- **No:** Low-sensitivity data, internal informational only, isolated, non-critical

**Question 3: Consolidation Opportunity — Does this agent duplicate an existing Intellios agent or approved tool?**
- **Yes, consolidate:** Another approved agent already handles this use case
- **No, unique:** No existing agent covers this function

#### Step 3.2: Apply Triage Logic

For each agent, apply the triage decision tree:

```
Start: Does this agent pose regulatory/compliance risk?
│
├─ YES (Question 2: Regulatory/Compliance Exposure = Yes)
│  │
│  ├─ Is there an existing approved Intellios agent or tool covering this use case?
│  │  │
│  │  ├─ YES → CONSOLIDATE (retire this agent, migrate users to approved agent)
│  │  │
│  │  └─ NO → ONBOARD (bring into Intellios governance via Phase 4)
│  │
│
├─ NO (Question 2 = No)
│  │
│  ├─ Is this agent delivering material business value? (Question 1)
│  │  │
│  │  ├─ YES (High or Medium) → ONBOARD (bring into Intellios to establish governance baseline)
│  │  │
│  │  └─ NO (Low) or Experimental → RETIRE (discontinue, no governance value in maintaining)
```

Apply triage decisions across your inventory:

| Agent Name | Regulatory Risk | Business Value | Existing Alternative | Triage Decision | Justification |
|---|---|---|---|---|---|
| Customer Escalation Bot | Yes | High | No | **ONBOARD** | Regulatory exposure + high value = immediate governance |
| Financial Forecast Agent | Yes | High | No | **ONBOARD** | SOX/FINRA + high value = critical remediation |
| HR Resume Screener | Yes | Medium | No | **ONBOARD** | Autonomous decisions affecting employment + PII |
| Legal Research Tool | Yes | Low | Legal research tool exists in approved SaaS | **CONSOLIDATE** | Low value; retire; migrate to approved tool |
| Backlog Grooming Bot | No | Medium | No | **ONBOARD** | Valuable workflow; establish governance baseline |
| Old ChatGPT Experiment (2024) | No | Low | N/A | **RETIRE** | Abandoned; no governance benefit |

**Expected result:** All agents assigned to one of three buckets: Onboard (40-60%), Consolidate (10-20%), Retire (20-35%). Focus Phase 4 remediation on Onboard bucket.

#### Step 3.3: Consolidation Plan — Establish Agent Retirement and Migration

For agents marked **CONSOLIDATE**, establish a plan to:

1. **Identify the approved replacement** — Document the approved Intellios agent or supported tool that covers the same use case.
2. **Notify agent owner and users** — Communicate that the shadow agent will be retired by a target date; provide migration support to the approved replacement.
3. **Migrate users and workflows** — Transfer configurations, data, and workflows from the retiring agent to the approved replacement. Provide training and support.
4. **Deactivate and retire the agent** — At the target retirement date, deactivate and formally retire the shadow agent. Document retirement in your shadow AI inventory.

Example:
```
Shadow Agent: Legal Research Tool
Owner: General Counsel
Approved Replacement: [Intellios Agent] Legal Knowledge Base Agent (in Agent Registry)

Migration Plan:
  - Week 1: Notify owner; review approved agent capabilities
  - Week 2-3: Migrate saved searches, templates, custom prompts to approved agent
  - Week 4: Training; pilot with small user group
  - Week 5: Full user migration; communication to all users
  - Week 6: Deactivate shadow agent; close support tickets

Owner responsible for: Coordinating migration, user communication
Intellios team responsible for: Providing approved agent access, training materials
```

**Expected result:** A documented consolidation plan for 10-20% of discovered agents. Consolidation typically completes in 2-4 weeks per agent, running in parallel with onboarding work (Phase 4).

---

### Phase 4: Onboarding — Create Agent Blueprint Packages and Establish Governance

**Business Context:** Phase 4 is where shadow AI agents become governed. Using the Intellios Intake Engine and Blueprint generation, you'll systematically convert discovered agents into Agent Blueprint Packages (ABPs) with full governance enforcement, policy validation, and compliance evidence generation.

#### Step 4.1: Intake Engine Orientation — Prepare Governance Data

Before onboarding agents, prepare your **governance data dictionary** in Intellios:

1. **Define governance context:** Answer for your enterprise:
   - What are your data classification levels (public, internal, confidential, restricted)?
   - What regulatory frameworks apply (GDPR, HIPAA, SOX, FINRA, PCI-DSS, CCPA, custom)?
   - What are your required audit/logging standards (CloudTrail, app logs, Sentry, DataDog)?
   - What approval authority structures do you require (single approver, multi-stage review, CRO sign-off)?

2. **Configure stakeholder input lanes:** Intellios supports seven stakeholder input types:
   - **Enterprise Architect** — Defines system integration, scalability, dependency management
   - **Compliance Officer** — Specifies regulatory requirements, audit obligations, policy constraints
   - **Security Lead** — Defines access control, data handling, threat model
   - **Data Steward** — Documents data sources, classification, residency, retention
   - **Business Owner** — Articulates business value, success metrics, SLA requirements
   - **Operations Lead** — Specifies deployment model, monitoring, incident response
   - **Legal Counsel** — Reviews terms, liability, third-party dependencies (if applicable)

   Not all agents require all input lanes. For Tier 1 agents, activate all seven. For Tier 2, activate five (skip Legal/Data Steward if low risk). For Tier 3, activate three (Enterprise Architect, Compliance, Business Owner).

3. **Stage your express-lane templates:** Intellios includes pre-built templates for common agent patterns. Identify which apply to your onboarding cohort:
   - **Customer Service Agent Template** — For agents handling customer inquiries, escalations, or support
   - **Data Analysis Agent Template** — For agents analyzing business data, generating reports, forecasting
   - **Knowledge Base Agent Template** — For agents providing information retrieval (legal, product, technical)
   - **Workflow Automation Agent Template** — For agents automating internal processes, approvals, notifications
   - **Content Generation Agent Template** — For agents producing marketing, documentation, or communication content

**Expected result:** Intellios configured with your governance model; express-lane templates identified and ready.

#### Step 4.2: Rapid Intake — Use Express-Lane Templates for Common Agents

For agents matching **express-lane patterns**, use the fast-path intake process:

**For each agent marked "Onboard":**

1. **Select the best-fit express-lane template** — E.g., "Customer Escalation Bot" → **Customer Service Agent Template**

2. **Complete the three-phase intake** (Intellios Intake Engine):

   **Phase 1: Structured Context Form** (5-10 min)
   - Deployment type: Customer-facing / Internal-only / Partner-facing / Automated
   - Data classification: Public / Internal / Confidential / Restricted
   - Applicable regulations: None / GDPR / HIPAA / SOX / FINRA / PCI-DSS (select all that apply)
   - Business owner email; primary use case (brief description); number of users
   - Key integrations: CRM, ERP, database, API, custom system names

   **Phase 2: Conversational AI Interview** (15-30 min)
   - Claude (the Intake Engine) conducts guided questions based on Phase 1 context
   - E.g., if you flagged PCI-DSS, Claude probes: "Does this agent access credit card data directly or only masked references? How is card data transmitted? Who has access?"
   - E.g., if you flagged Customer-facing, Claude asks: "What is your SLA for agent responses? How are customer disputes handled? Do customers see the agent as a single point of contact?"
   - The interview progressively builds governance context; users can decline any question and provide custom answers

   **Phase 3: Pre-Generation Review** (5 min)
   - User reviews the captured intake payload; confirms accuracy and completeness
   - Signs off that the data is correct before generation proceeds

   **Total time per agent using express-lane:** 30-50 minutes, including all three phases.

3. **Preserve agent provenance:** In the ABP generation, document:
   - Original agent name and platform (e.g., "ChatGPT API custom wrapper")
   - Original owner/creator name and contact
   - Migration date
   - Any customizations or configurations unique to the shadow agent

Example intake:
```
Agent Name: Customer Escalation Bot (now: [PLACEHOLDER]_customer_escalation_v1)
Express-Lane Template: Customer Service Agent

Phase 1 Submission:
  Deployment Type: Customer-facing
  Data Classification: Confidential (customer names, email, issue summaries)
  Applicable Regulations: GDPR (operates on EU customer data)
  Business Owner: customer-service-director@company.com
  Use Case: Escalate complex customer issues to human agents; provide status updates
  Integrations: Zendesk CRM, internal ticketing system
  Users: 2,000 (customer-facing web widget)

Phase 2 Interview Highlights:
  Q: How are customer names and PII stored and transmitted?
  A: PII encrypted in transit (TLS); stored in Zendesk only; agent accesses Zendesk API

  Q: Are escalation decisions made autonomously or with human review?
  A: Agent classifies issue severity; human agent reviews and decides escalation

  Q: What is your SLA for agent response and escalation to human agent?
  A: Response within 2 minutes; escalation to human within 5 minutes for Tier 1 issues

  Q: How is service continuity maintained if the agent fails?
  A: Fallback to standard support email; manual human escalation

Phase 3 Approved: Yes (2025-06-10)
```

**Expected result:** Full intake data captured for 40-60 agents within 2-3 weeks, using express-lane templates. ABP generation queued for all agents.

#### Step 4.3: Blueprint Generation and Governance Validation

Once intake is complete, the **Generation Engine** produces an Agent Blueprint Package (ABP) for each agent:

The ABP contains:
- **Agent identity** — Name, description, version, creator, owner contact
- **Capabilities specification** — What the agent can do; tools and integrations available; decision authority
- **Data specification** — What data it accesses; data classification; retention policies; user access rules
- **Governance specification** — Applicable policies; compliance evidence requirements; audit logging rules
- **Deployment specification** — Target runtime environment; scalability requirements; monitoring and alerting
- **Compliance evidence chain** — Generated automatically; includes agent creation metadata, policy validation results, approval history, deployment logs

The **Governance Validator** immediately evaluates the generated ABP against your enterprise governance policies:

- **Safety Baseline Policy** — Ensures basic safety rules: agent respects user privacy, does not exfiltrate data, respects usage limits
- **Audit Standards Policy** — Ensures comprehensive audit logging for compliance and operational support
- **Access Control Baseline Policy** — Ensures proper authorization; agent only accesses data it needs; human-in-the-loop for critical decisions
- **Governance Coverage Policy** — Ensures the ABP itself is complete; all required fields present; governance context captured

```
Governance Validator Output Example:

Agent: customer_escalation_v1
Validation Date: 2025-06-15

Policies Evaluated: 4 (Safety Baseline, Audit Standards, Access Control Baseline, Governance Coverage)

VIOLATIONS FOUND: 2

  Violation 1 [ERROR]:
  Policy: Access Control Baseline
  Rule: REQUIRES_HUMAN_REVIEW_FOR_CRITICAL_ACTIONS
  Field Path: capabilities.escalation_decision
  Message: Agent is configured to escalate issues autonomously without human approval.
           For customer-facing agents handling sensitive data, escalation decisions
           require human review and approval.
  Severity: ERROR (blocks approval)
  Remediation Suggestion: Add a human review step between issue classification and
                          escalation. Modify capabilities.escalation_decision to
                          require_human_approval: true

  Violation 2 [WARNING]:
  Policy: Audit Standards
  Rule: REQUIRES_DETAILED_LOGGING
  Field Path: governance.audit_logging
  Message: Agent has basic logging configured but does not log user queries and
           responses. For a customer-facing agent, full conversation logging
           is recommended for compliance and customer support.
  Severity: WARNING (advisory; does not block approval)
  Remediation Suggestion: Enable query_response_logging in the audit specification.
                          Ensure logs are sent to your enterprise audit sink
                          ([PLACEHOLDER]_audit_elasticsearch).

Validation Result: FAILED (1 error, 1 warning)
Next Step: Remediate the error violation and resubmit for validation.
```

**Expected result:** ABPs generated for all onboarded agents. ~60-80% pass validation on first attempt (express-lane templates reduce violations). ~20-40% require remediation (typical: missing audit logging, missing human-in-the-loop for critical decisions, excessive data access).

#### Step 4.4: Remediation of Policy Violations

For agents with validation errors, remediate using the Governance Validator's suggestions:

```
Remediation for customer_escalation_v1:

ERROR Violation: Missing human review for escalation decisions
  Current ABP Field: capabilities.escalation_decision = "autonomous"
  Remediated Field: capabilities.escalation_decision = "human_review_required"

  Change: Update agent logic to defer escalation decisions to human agents
  instead of escalating autonomously. Modify the agent's decision logic to:
  1. Classify issue severity and suggested escalation category
  2. Surface recommendation to human agent in agent UI
  3. Human agent approves or modifies escalation
  4. Agent executes escalation per human approval

  Effort: 2 hours (engineering + business owner validation)
  Timeline: Complete within 1 week of violation detection

WARNING Violation: Missing detailed query/response logging
  Current ABP Field: governance.audit_logging.query_response_logging = false
  Remediated Field: governance.audit_logging.query_response_logging = true

  Change: Enable comprehensive conversation logging; send logs to enterprise
  audit sink. This is advisory (does not block approval) but strongly
  recommended for regulatory compliance and customer support.

  Effort: 1 hour (ops team to enable log export)
  Timeline: Complete within 2 weeks of remediation
```

The remediation process involves three actors:

1. **Engineering** — Modifies agent behavior to comply with governance rules
2. **Business Owner** — Validates that remediated behavior still meets business requirements
3. **Compliance** — Confirms remediated ABP meets policy requirements

Remediation is iterative: resubmit the modified ABP to the Governance Validator; validate again; repeat until all errors are resolved. Warnings can be accepted as-is (documented acceptance) or remediated (preferred).

**Expected result:** All error violations remediated within 1-2 weeks per agent. ABPs move from FAILED validation to PASSED validation. Warnings documented and tracked.

---

### Phase 5: Governance Enforcement — Blueprint Review and Approval

**Business Context:** Once ABPs pass governance validation, they move to **human review**. The Blueprint Review UI presents ABPs to designated reviewers (architects, compliance officers, security leads) who assess whether the agent meets enterprise governance standards and approves it for deployment.

#### Step 5.1: Configure Review Queue and Approval Authority

In Intellios, configure your **Blueprint Review Queue** with:

1. **Approval tiers** — Define who must approve agents based on risk level:
   - **Tier 1 agents** — Multi-stage approval: Security Lead → Compliance Officer → CRO
   - **Tier 2 agents** — Two-stage approval: Engineering Lead → Compliance Officer
   - **Tier 3 agents** — Single-stage approval: Engineering Lead only

2. **Approval SLAs** — Define how quickly reviewers must act:
   - Tier 1: 3 business days per approval stage (9 days total)
   - Tier 2: 5 business days per approval stage
   - Tier 3: 7 business days per approval stage

3. **Reviewer assignments** — Assign specific individuals as primary and backup reviewers:
   ```
   Security Lead: John Chen (john.chen@company.com)
   Backup: Sarah Williams (sarah.williams@company.com)

   Compliance Officer: Dr. Maria Garcia (maria.garcia@company.com)
   Backup: Kumar Patel (kumar.patel@company.com)

   CRO: Chief Risk Officer (cro@company.com)
   Backup: VP Risk (vp-risk@company.com)
   ```

**Expected result:** Review queue configured; reviewers notified and trained on reviewing ABPs (30-min orientation covering what to look for, common rejection reasons, remediation process).

#### Step 5.2: Batch Submit ABPs for Review

Submit ABPs to the Blueprint Review Queue in **waves**:

- **Wave 1 (Week 1):** Submit 3-5 Tier 1 (Critical) agents — allows review process to stabilize with highest-priority agents
- **Wave 2 (Week 3):** Submit 10-15 Tier 2 (High) agents — now that tier 1 is moving through approval
- **Wave 3 (Week 6):** Submit 15-25 Tier 3 (Medium) agents — spread across remaining timeline

This **staggered submission approach** prevents review bottlenecks and gives reviewers time to learn the ABP review process.

Navigate to the Review Queue in Intellios:
```
/review

Agents Pending Review: 5

[AGENT] customer_escalation_v1
  Status: In Review
  Tier: Critical
  Submitted: 2025-06-15
  Days in Review: 3
  Next Reviewer: Security Lead (John Chen)
  SLA Due: 2025-06-18

[AGENT] financial_forecast_v1
  Status: In Review
  Tier: Critical
  Submitted: 2025-06-15
  Days in Review: 3
  Next Reviewer: Security Lead (John Chen)
  SLA Due: 2025-06-18

[AGENT] hr_resume_screener_v2
  Status: In Review
  Tier: Critical
  Submitted: 2025-06-16
  Days in Review: 2
  Next Reviewer: Security Lead (John Chen)
  SLA Due: 2025-06-19
```

**Expected result:** Agents successfully submitted to review queue; SLAs tracked; reviewers notified via [PLACEHOLDER] workflow.

#### Step 5.3: Review Process — Governance Review and Decision

Each reviewer examines the ABP and governance validation report and makes a decision:

**Review Checklist (Example for Security Lead reviewing customer_escalation_v1):**

- [ ] **Data Handling:** Agent accesses customer names/emails. Are PII protections adequate (encryption, access control, retention)?
- [ ] **Integration Security:** Agent integrates with Zendesk API. Is the API key properly secured and rotated? Is API usage logged?
- [ ] **Decision Authority:** Agent escalates customer issues. Is human review required for all escalations? Are there edge cases?
- [ ] **Monitoring & Alerting:** Are we alerted if the agent fails? Is there an incident response plan?
- [ ] **Third-Party Dependency:** Agent depends on Zendesk availability. What is our fallback if Zendesk is down?
- [ ] **Compliance Evidence:** Are audit logs being collected? Can we produce evidence to regulators that the agent is properly governed?

**Review Outcomes:**

1. **Approved** — Agent meets all governance requirements; move to next approval stage (or deployment if final stage)
2. **Approved with Conditions** — Agent approved; some non-blocking issues noted for future versions
3. **Request Changes** — Agent does not meet governance requirements; return to engineering for remediation; resubmit when complete
4. **Rejected** — Agent does not meet governance standards; recommend retirement or substantial redesign

Example review decision:

```
Reviewer: John Chen (Security Lead)
Review Date: 2025-06-17
Agent: customer_escalation_v1
Decision: APPROVED WITH CONDITIONS

Comments:
  ✓ PII handling is appropriate; TLS encryption and Zendesk isolation good
  ✓ API key rotation is configured; API usage logged
  ✓ Escalation decisions require human approval (good)
  ✓ Monitoring is in place; incident response plan exists
  ⚠ Condition: Backup Zendesk API key should be documented (operationally important)
  ⚠ Condition: Escalation decision audit logs should include reasoning (for dispute resolution)

Approval: Yes (moves to Compliance Officer for next stage)
Next Steps: Address conditions in next agent version (V1.1)
```

All review decisions and comments are **documented in the Compliance Evidence Chain** — part of the permanent audit trail for regulators and risk teams.

**Expected result:** Tier 1 agents move through 2-3 review stages over 1-2 weeks; Tier 2 agents follow 1-2 weeks later; most agents approved (60-75%) on first attempt; some request changes and are resubmitted; few are rejected.

#### Step 5.4: Track and Escalate SLA Misses

Monitor the review queue for **SLA breaches**:

- If an agent is pending review beyond its SLA deadline, send escalation:
  1. **Email reminder** to assigned reviewer (cc: reviewer's manager)
  2. **Weekly escalation report** to [PLACEHOLDER]_governance_leadership
  3. **Executive reporting** — If SLA misses persist, include in CRO/CIO dashboard

```
REVIEW SLA EXCEPTION REPORT
Date: 2025-06-21

Overdue Agents:
  • customer_escalation_v1 (SLA due 2025-06-18, now 3 days overdue)
    Assigned to: Security Lead John Chen
    Submitted by: Enterprise Architecture
    Action: Automated reminder sent; escalation to John's manager (VP Security)

  • financial_forecast_v1 (SLA due 2025-06-18, now 3 days overdue)
    Assigned to: Security Lead John Chen
    Submitted by: Finance
    Action: Automated reminder sent

Trend: Security Lead queue is saturated. Recommend activating backup reviewer.
```

**Expected result:** <5% of agents experience SLA misses; when they do, clear escalation path ensures timely resolution.

---

### Phase 6: Monitoring & Prevention — Continuous Governance and Recurrence Prevention

**Business Context:** Remediation doesn't end with approval. Phase 6 ensures:
1. Approved agents remain in governance (versioning, monitoring, incident response)
2. New agents automatically originate in Intellios (no new shadow AI)
3. Continuous discovery scans detect recurrence of shadow AI

#### Step 6.1: Establish Agent Lifecycle Management

Once agents are approved and deployed, manage their entire lifecycle:

**Deployment** — Deploy approved ABPs to cloud runtimes (AWS AgentCore, Azure AI Foundry, or on-premise orchestrators) via runtime adapter interfaces:

```bash
# Deploy approved agent to AWS AgentCore
intellios-cli deploy \
  --agent-id customer_escalation_v1 \
  --target aws-agentcore \
  --region us-east-1 \
  --cluster production
```

**Monitoring** — Collect runtime observability:
- Agent execution traces (latency, errors, token usage)
- Audit logs (queries, responses, decisions)
- User feedback (satisfaction, issues, escalations)
- Business metrics (volume, conversion, cost)

```
Agent Status Dashboard (Runtime Observability):

Customer Escalation Agent v1
  Status: Healthy
  Uptime: 99.8% (last 7 days)
  Queries Processed: 42,000 (last 24h)
  Avg Response Latency: 850ms
  Error Rate: 0.2% (6 errors in 3000 queries)
  Top Error: "Zendesk API timeout" (4 occurrences)
  User Satisfaction: 4.2/5.0 (n=1200 ratings)
```

**Versioning** — As requirements or regulations change, create new agent versions:

- Minor updates (patches, bugfixes) — Governance Validator may not require re-review if changes are low-risk
- Major updates (capability changes, new data access) — Submit new version to Governance Validator and review queue
- Track all versions in Agent Registry with full lineage and change history

**Incident Response** — Establish runbook for agent incidents:

```
Agent Incident Response Runbook

1. DETECTION: Alert fires (e.g., agent error rate > 5%)
2. IMMEDIATE: Disable agent if necessary; notify business owner and on-call engineer
3. ASSESSMENT: Identify root cause (integration failure, rate limit, input validation, model failure)
4. MITIGATION: Temporary fix (rollback to previous version, disable specific feature, manual workaround)
5. ROOT CAUSE: After system is stable, investigate root cause and fix
6. RETEST: Validate fix; revalidate against governance policies if behavior changed
7. DEPLOYMENT: Deploy fixed agent; monitor for recurrence
8. POSTMORTEM: Document incident, impact, fix, and prevention measures
```

**Expected result:** Approved agents transitioned to runtime environment; monitoring dashboards active; incident response process in place.

#### Step 6.2: Establish "All New Agents via Intellios" Policy

Prevent new shadow AI by establishing an **enterprise policy** that all new AI agents must:

1. Originate in the Intellios Intake Engine (not external platforms like ChatGPT)
2. Pass Governance Validator evaluation
3. Obtain Blueprint Review approval
4. Be registered in the Agent Registry before deployment

**Policy Communication:**

Distribute a **"AI Agent Development Governance Policy"** to all engineering and business leaders:

```
INTELLIOS AGENT GOVERNANCE POLICY (Effective 2026-01-01)

SCOPE:
All AI agents deployed or operated within the company, including:
- ChatGPT-based workflows
- Custom LLM integrations
- Agents built with Claude, Vertex AI, Azure OpenAI, or other LLM services
- Agent-like automation built with orchestration platforms (Zapier, n8n, Make)

REQUIREMENT:
All new AI agents must:
1. Originate in Intellios Intake Engine
2. Generate an Agent Blueprint Package
3. Pass Governance Validator evaluation (zero errors)
4. Obtain Blueprint Review approval
5. Be registered in Agent Registry before deployment

POLICY EXCEPTIONS:
The following are exempt from this policy and do not require Intellios governance:
- ChatGPT Plus/Claude.ai used for personal research/drafting (not integrated with business systems)
- Single-query AI usage for one-off tasks (not agents; not persistent)
- AI functionality embedded in approved SaaS tools (Slack, Salesforce, Zendesk AI features)

ENFORCEMENT:
- Engineering teams cannot deploy AI agents without Intellios governance
- Finance cannot approve cloud infrastructure for AI services outside Intellios
- Procurement cannot purchase AI service subscriptions for agent-building

EXCEPTIONS:
Requests to circumvent this policy require [PLACEHOLDER] approval and must be documented
in the exception registry (for audit).

EFFECTIVE DATE: January 1, 2026
CONTACT: [PLACEHOLDER]_ai_governance
```

Communicate this policy through:
- Email to all engineering teams and department heads
- Engineering handbook / intranet
- Onboarding materials for new engineers
- Annual compliance training

**Expected result:** Clear, enforced policy that new agents must come through Intellios. Reduces new shadow AI creation to <5% of discovery rate.

#### Step 6.3: Continuous Discovery Scanning

Implement **ongoing automated discovery** to detect new or missed shadow AI:

**Monthly Network Scanning:**
- Automatically scan network for new AI service API calls (weekly)
- Query cloud cost management tools for new AI service charges (monthly)
- Extract new API keys from API gateway logs (monthly)

```bash
# Automated weekly network discovery scan
*/0 0 * * 1 /opt/intellios/discovery/network_scan.sh \
  --ai-services openai,anthropic,google,azure \
  --output /mnt/discovery_reports/$(date +%Y-%m-%d).json \
  --alert-on-new-traffic true
```

**Quarterly Cloud Audit:**
- Audit cloud accounts and SaaS subscriptions for new AI service instances
- Cross-reference with Intellios Agent Registry to identify unregistered agents
- Flag discrepancies for investigation

**Annual Employee Survey:**
- Resurvey workforce annually to surface new shadow AI
- Update the survey based on findings from previous year

**Discovery Intake:**
- Maintain a [PLACEHOLDER] intake channel for employees to self-report shadow AI they discover

**Monthly Compliance Report:**
```
SHADOW AI DISCOVERY SUMMARY (Monthly Report)

Reporting Period: June 2025

New Agents Discovered:
  • 3 new agents detected via network scanning
  • 2 new agents reported via employee survey
  • 1 new agent found in cloud audit
  Total New: 6

Agent Status:
  • New agents routed to Phase 2 (Risk Assessment)
  • All new agents being triaged this month
  • No new agents are Tier 1 (critical)

Remediation Progress:
  • 87 agents brought into governance (Phase 4 & 5 complete)
  • 3 agents consolidated and retired
  • 12 agents remaining in Phase 3 triage
  • Compliance coverage: 87 / (87 + 12 + new6) = 84%

Recurrence Rate:
  • New shadow AI discovery rate: 6 agents/month (down from 15 agents/month in April)
  • Trend: Declining; indicates policy enforcement is effective

Next Steps:
  • Triage the 6 newly discovered agents
  • Continue onboarding Phase 3 agents
  • Monitor for further recurrence; escalate if rate increases
```

**Expected result:** Ongoing discovery scans identify new shadow AI monthly; recurrence rate stays <10 new agents/month (down from baseline of 15-25/month). New agents triaged and onboarded within 30 days of discovery.

---

## RACI Matrix — Roles and Responsibilities

| Activity | Compliance | Engineering | Executive | Business Unit | Intellios Team |
|---|---|---|---|---|---|
| **Discovery** |
| Network & API scanning | Support (monitoring) | Owner (execute) | Sponsor | Participant (identify agents) | Advisor (tooling) |
| Cloud account audit | Owner (execute) | Participant (access) | Sponsor | Participant (feedback) | Advisor |
| Employee survey | Owner (design, execute) | Participant (response) | Sponsor | Owner (drive response) | Advisor |
| Consolidate discovery data | Owner (execute) | Participant | Participant | Participant | Advisor |
| **Risk Assessment** |
| Define risk tiers | Owner (define criteria) | Participant (input) | Sponsor | Participant (feedback) | Advisor |
| Agent owner interviews | Participant (lead) | Owner (coordinate with owners) | Sponsor | Owner (participate in interview) | Advisor |
| Classify agents by tier | Owner (assign) | Participant (data) | Sponsor | Participant (feedback) | Advisor |
| **Triage** |
| Establish triage criteria | Owner (define) | Participant | Sponsor | Participant | Advisor |
| Apply triage logic | Participant | Owner (execute) | Sponsor | Owner (decide fate of own agents) | Advisor |
| Create consolidation plans | Owner (lead) | Participant | Sponsor | Owner (implement) | Advisor |
| **Onboarding** |
| Configure Intellios intake | Participant | Owner (execute) | Sponsor | Participant | Advisor |
| Complete agent intakes | Participant (compliance context) | Owner (coordinate) | Sponsor | Owner (provide details) | Advisor |
| Generate ABPs & validate | Participant (review violations) | Participant (remediation) | Sponsor | Participant | Owner (execute) |
| Remediate policy violations | Owner (approve) | Owner (implement) | Sponsor | Participant (validate business impact) | Advisor |
| **Review & Approval** |
| Configure review queue | Owner (lead) | Participant | Sponsor | Participant | Advisor |
| Review ABPs | Owner (security/compliance review) | Participant | Owner (CRO final approval for critical agents) | Observer | Advisor |
| Approve agents | Owner (sign-off) | Participant | Owner (escalation) | Participant (feedback) | Advisor |
| **Monitoring & Prevention** |
| Deploy to runtime | Participant (monitoring) | Owner (execute) | Sponsor | Participant (operations) | Advisor |
| Monitor agents | Participant (policy) | Owner (execute) | Consumer (dashboards) | Owner (day-to-day) | Advisor |
| Update governance policy | Owner (author) | Participant | Sponsor | Participant (feedback) | Advisor |
| Continuous discovery | Owner (operate scans) | Participant (access) | Sponsor | Participant (report suspected agents) | Advisor |

**Legend:**
- **Owner** — Primary responsibility; makes decisions; accountable for completion
- **Participant** — Actively involved; provides input, data, or execution support
- **Advisor** — Provides guidance, tooling, or expertise; does not own the activity
- **Sponsor** — Executive who approves decisions and unblocks resource conflicts
- **Consumer** — Receives output; may provide feedback

**Key Stakeholders:**
- **Compliance Officer** — RACI Owner for governance policy definition, risk assessment, violation remediation, and approval
- **CIO/VP Engineering** — RACI Owner for intake engine configuration, ABP generation, deployment, and monitoring
- **Chief Risk Officer** — RACI Owner for Tier 1 agent final approval; escalation for SLA breaches
- **Business Unit Leads** — RACI Owner for their agents' triage decisions, intake interviews, and deployment coordination
- **Intellios Team** — Operates platform; advises on governance policy, intake process, and governance validation

---

## Remediation Timeline — 12-16 Week Plan for Fortune 500 Enterprise

Assume: **500 discovered agents**, 40% Tier 1 or 2 (remediate immediately), 60% Tier 3 or 4 (stagger over time).

| Phase | Week | Activities | Expected Output | Resource Load |
|---|---|---|---|---|
| **Phase 1: Discovery** | 1-2 | Network scanning, cloud audit, employee survey, consolidate inventory | 450-550 agents in inventory | 4 FTE (IT, compliance, business units) |
| **Phase 2: Risk Assessment** | 2-4 | Agent interviews, risk tier classification | 200 Tier 1-2 agents (high priority); 300 Tier 3-4 agents (lower priority) | 3 FTE (compliance, engineering leads) |
| **Phase 3: Triage** | 4-6 | Apply triage logic; establish consolidation plans | 200 agents → Onboard; 50 agents → Consolidate; 100 agents → Retire; 150 agents → Monitor | 2 FTE (engineering, business units) |
| **Phase 4: Onboarding** | 6-12 | Intake, ABP generation, violation remediation (waves 1-3) | 200 agents with generated, validated ABPs | 6-8 FTE (intake team, engineering, compliance review) |
| **Phase 5: Review & Approval** | 8-14 | Blueprint Review Queue review and approval (staggered waves) | 150-180 agents approved; 20-30 request changes (rework); <10 rejected | 2-3 FTE (approvers: security, compliance, CRO) |
| **Phase 6: Monitoring & Prevention** | 12-16 | Deploy to runtime; establish continuous discovery; implement "all agents via Intellios" policy | Agents in production with monitoring; discovery scans live; policy established | 3-4 FTE (ops, governance, security) |

**Cumulative Effort by Role:**

| Role | Weeks 1-4 | Weeks 5-8 | Weeks 9-12 | Weeks 13-16 | Total FTE |
|---|---|---|---|---|---|
| Compliance | 1 FTE | 2 FTE | 1 FTE | 0.5 FTE | 4.5 FTE |
| Engineering | 1 FTE | 3 FTE | 2 FTE | 1 FTE | 7 FTE |
| Business Unit Leads | 1.5 FTE | 1 FTE | 0.5 FTE | 0.5 FTE | 3.5 FTE |
| IT/Security | 1.5 FTE | 0.5 FTE | 0.5 FTE | 0.5 FTE | 3 FTE |
| Intellios Team | 0.5 FTE | 2 FTE | 1 FTE | 0.5 FTE | 4 FTE |
| **Total** | **5.5 FTE** | **8.5 FTE** | **5 FTE** | **3 FTE** | **22 FTE-weeks** |

**Peak Load:** Weeks 5-8 (onboarding ramp); requires 8-9 FTE dedicated to shadow AI remediation.

**Timeline Flexibility:**
- **Accelerated (10 weeks):** Increase peak load to 12-15 FTE; overlap phases; reduce testing time; acceptable risk for Tier 1 agents but not recommended
- **Relaxed (20 weeks):** Extend phases; 4-6 FTE steady-state; lower organizational disruption; extended shadow AI exposure
- **Recommended: 12-16 weeks** — Balances remediation urgency, resource constraints, and execution quality

---

## Verification — How to Measure Success

Track six KPIs throughout the remediation to measure progress and impact:

### KPI 1: Governance Coverage %
**Definition:** Percentage of discovered agents brought under Intellios governance (completed Phase 4-5 and deployed).

**Target:** 85-95% of agents discovered in Phase 1 should reach deployment by Week 16.

```
Week 4: 0% (discovery in progress)
Week 8: 25% (Tier 1 agents onboarded)
Week 12: 60% (Tier 1-2 agents approved; Tier 3 onboarding)
Week 16: 90% (all priority agents approved; remaining stragglers)
```

### KPI 2: Policy Violation Remediation Rate
**Definition:** Percentage of generated ABPs that pass Governance Validator on first attempt (zero error violations).

**Target:** 60-70% pass on first attempt; 30-40% require remediation; <5% require escalation.

```
Week 6: 55% pass (express-lane templates reduce violations, but some edge cases)
Week 10: 70% pass (engineering team learning governance rules; remediation accelerates)
Week 14: 75% pass (mature governance pattern; violations decrease)
```

### KPI 3: Tier 1 (Critical) Agent Mean Time to Compliance
**Definition:** Average time from discovery to governance approval for Tier 1 agents.

**Target:** <4 weeks (28 days) from discovery to approval. Shorter means faster risk mitigation.

```
Discovery Date → Intake Completion (2-3 days)
↓
ABP Generation & Validation (2-3 days)
↓
Remediation (if needed) (3-5 days)
↓
Security Review (3-5 days)
↓
Compliance Review (3-5 days)
↓
CRO Approval (2-3 days)
↓
Total: ~20-28 days
```

If Tier 1 MTCC exceeds 4 weeks, escalate to CRO for resource allocation.

### KPI 4: Shadow AI Recurrence Rate
**Definition:** Number of new agents discovered per month via continuous discovery scans.

**Target:** <10 agents/month by Week 12; <5 agents/month by Week 16.

```
Baseline (April 2025): 20 agents/month (pre-remediation)
Week 4: 18 agents/month (discovery ongoing; new agents still being created)
Week 8: 12 agents/month (policy announced; some behavior change)
Week 12: 8 agents/month (policy enforcement in place; trend declining)
Week 16: 4 agents/month (steady-state; continuous discovery only)
```

Declining recurrence rate indicates "all agents via Intellios" policy is effective.

### KPI 5: Review Queue SLA Compliance
**Definition:** Percentage of ABPs reviewed within SLA deadline.

**Target:** >95% of ABPs reviewed on-time.

```
Week 6: 80% on-time (reviewers unfamiliar with process; learning curve)
Week 10: 92% on-time (process stabilizing)
Week 14: 96% on-time (steady-state; SLA breaches < 5%)
```

If SLA compliance drops below 90%, activate backup reviewers or escalate for resource allocation.

### KPI 6: Compliance Evidence Generation
**Definition:** Completeness of compliance evidence chain for approved agents (audit trail, validation reports, approval history, deployment logs).

**Target:** 100% of deployed agents have complete evidence chain; compliance teams can generate regulatory reports on demand.

```
Deployed Agent: customer_escalation_v1
Evidence Collected:
  ✓ ABP generation metadata (creator, timestamp, input data)
  ✓ Governance Validator report (policies evaluated, violations, remediation)
  ✓ Human review decisions and comments (all reviewers)
  ✓ Approval chain (who approved at each stage, timestamp)
  ✓ Deployment manifest (runtime, timestamp, version)
  ✓ Runtime audit logs (execution traces, API calls, data access)
  ✓ Incident logs (if any incidents occurred post-deployment)

Regulatory Report Generated:
  "Intellios Agent Governance Report — Q2 2025"
  - Agents discovered: 500
  - Agents brought into governance: 450 (90%)
  - Policy violations remediated: 180
  - Agents approved by CRO: 180
  - Incident rate: 0.2% (3 incidents in 1500+ deployed agents)
  - Compliance coverage: 90% agents; 0 unresolved violations
```

---

## Troubleshooting — Common Blockers and Resolutions

| Blocker | Likely Cause | Resolution |
|---|---|---|
| **Executive resistance to remediation program** | Perceived cost/effort; concern about disruption to development velocity; skepticism about risk narrative | Executive alignment meeting: Present Gartner 2027 forecast (75% of enterprise AI will lack governance); highlight regulatory risk (SR 11-7 penalties: $1M-5M per violation); show timeline (12-16 weeks, not indefinite); demonstrate Intellios accelerates time-to-market (governance built-in, not post-facto) |
| **Business units refusing to provide intake interviews** | Perceived governance as bureaucratic overhead; agents seen as "quick solutions" not worth formal process; lack of awareness of compliance risk | Reframe: Intake is fast (30-50 min using express-lane); results are approval to deploy (not blocking); messaging: "Intellios makes your agent compliant faster, not slower"; tie intake to SLAs/goals (e.g., "Your agent can go live in 2 weeks with governance, not 6 weeks without") |
| **Incomplete discovery — hidden shadow AI remains undiscovered** | Discovery methods miss agents deployed on personal devices, external SaaS platforms (ChatGPT), or using minimal infrastructure footprint; "dark AI" (agents running entirely on user laptops) | Discovery is iterative; combine multiple methods (network scans, cloud audit, employee survey); expect discovery to surface 70-80% of agents in Phase 1 and 10-20% more via Phase 6 continuous scanning; remaining "dark AI" is acceptable risk if it poses low regulatory exposure |
| **Governance policy violations require extensive agent redesign** | Policy is too strict (e.g., "no autonomous agent decisions" blocks legitimate use cases); or agent was designed without governance awareness | Policy refinement: Review violations with policy author; consider if policy should be updated (e.g., "human-in-the-loop required for payments, but advisory decisions okay") vs. agent redesign; escalate to CRO if policy change is requested; document policy exceptions in exception registry |
| **Tier 1 agents are approved but cannot be deployed to runtime** | Runtime environment (AWS AgentCore, Azure, on-prem) not configured; networking issues; insufficient capacity; runtime adapter not implemented for specific agent type | Deployment readiness check in parallel with onboarding; ensure runtime is configured before ABP reaches review queue; validate runtime adapter exists for agent type (e.g., if building custom LLM agent, ensure runtime supports the model); coordinate with ops team on capacity planning |
| **Review queue is bottlenecked; agents wait >SLA** | Too few reviewers; reviewers are also doing other critical work (part-time commitment); lack of clarity on approval criteria | Activate backup reviewers immediately (documented in RACI); create written approval checklist for each reviewer role; consider splitting Tier 2 and Tier 3 review to dedicated junior reviewers (not requiring CRO) to free senior reviewers; escalate SLA misses to CRO for resource reallocation |
| **Agents pass governance validation but fail in production** | Validation rules are insufficient (gaps between policy and real-world behavior); runtime environment behaves differently than test; agent integrations not properly tested | Add runtime integration testing to review process (not just ABP review); add deployment "validation" step that exercises agent in staging environment before production; instrument agents with comprehensive monitoring to catch behavioral drift early |
| **Business units continue creating shadow AI despite policy** | Policy lacks enforcement mechanism; no IT/procurement controls to prevent unauthorized AI service purchases; lack of awareness | Implement IT controls: require Intellios intake before engineering can provision AI service subscriptions; require finance approval before cloud charges for AI services; block unapproved AI services at API gateway; make compliance mandatory training for engineers; tie agent governance to performance reviews |
| **Consolidation plans stall; business units resist retiring shadow agents** | Users rely on specific shadow agent behavior; replacement approved agent has different UX/capabilities; business unit sees retirement as loss of "their tool" | Transition period: Run shadow agent and approved replacement in parallel for 2-4 weeks; gather user feedback on approved replacement; customize approved agent to match shadow agent UX if needed; executive mandate if business case is clear (e.g., "compliance requires retirement; cost savings justify replacement") |

---

## Key Success Factors

**1. Executive Sponsorship** — CIO, CRO, or equivalent publicly commits to shadow AI remediation and allocates resources. Without this, the program will deprioritize under competing pressures.

**2. Cross-Functional Alignment** — Compliance, engineering, business units, and IT share ownership of remediation. Siloed efforts fail. Weekly sync cadence required.

**3. Risk Narrative** — Frame shadow AI as a material regulatory and operational risk (not just compliance overhead). Connect to your enterprise's specific risk exposure: SR 11-7 for banks, GDPR fines for EU-exposed companies, SOX for public companies, HIPAA for healthcare. This sustains business unit buy-in through the 12-16 week timeline.

**4. Governance-First Design** — Use Intellios express-lane templates and intake process to make governance intrinsic to agent design, not bolted-on. Agents that pass governance validation on first attempt are those designed with governance in mind from the start.

**5. Continuous Discovery** — Shadow AI is not a one-time remediation. Implement automated discovery scans and continuous monitoring to prevent recurrence. "All agents via Intellios" policy + enforcement mechanisms are essential.

**6. Evidence Chain** — The compliance evidence generated by Intellios is the core value. Document it, use it in regulatory reporting, and showcase it to auditors. This demonstrates that remediation is not busywork but concrete governance infrastructure.

---

## Next Steps

Upon completing this playbook:

1. **Configure ongoing discovery automation** — See [PLACEHOLDER] for continuous discovery scanner configuration
2. **Build custom governance policies** — Your seeded policies address baseline requirements; customize for your industry (financial, healthcare, government)
3. **Establish agent lifecycle management** — See [PLACEHOLDER] for runbooks, monitoring, incident response
4. **Integrate with compliance reporting** — Connect Intellios evidence chain to your regulatory reporting cadence (quarterly, annual)
5. **Expand agent development to other teams** — With governance infrastructure in place, accelerate agent development across the enterprise; governance is no longer a constraint but an enabler

---

## Appendix: Intake Template for Shadow AI Remediation

Use this template to structure interviews with shadow agent owners (Step 2.2):

```
SHADOW AI AGENT INTAKE — REMEDIATION PROGRAM
Date: ____________________
Interviewer: ____________________

AGENT IDENTITY
Agent Name (current): ____________________
Agent Owner/Creator: ____________________
Business Unit: ____________________
Primary Use Case: ____________________

TECHNOLOGY
Tool/Platform Used: [ ] ChatGPT Plus / [ ] Claude API / [ ] Azure OpenAI /
  [ ] Custom LLM / [ ] Zapier/Make / [ ] LlamaIndex / [ ] LangChain / [ ] Other: ____
Hosting Location: [ ] Personal device / [ ] Company cloud (AWS/Azure/GCP) / [ ] SaaS platform / [ ] Unknown
Deployment Status: [ ] Active & in use / [ ] Testing / [ ] Archived / [ ] Unknown

DATA & SYSTEMS
Data Sources (accessed by the agent):
  [ ] Customer data (names, emails, IDs, addresses): Y/N - describe ___
  [ ] Employee data (names, SSNs, performance): Y/N - describe ___
  [ ] Financial data (revenue, costs, forecasts, pricing): Y/N - describe ___
  [ ] Payment data (credit cards, transaction history): Y/N - describe ___
  [ ] Healthcare data (patient info, diagnoses): Y/N - describe ___
  [ ] Confidential business data (strategy, roadmap, client info): Y/N - describe ___
  [ ] Public/internal reference data: Y/N - describe ___

System Integrations:
  CRM (Salesforce, HubSpot): [ ] Y / [ ] N - if yes: read/write data? ___
  ERP (SAP, NetSuite): [ ] Y / [ ] N - if yes: which modules? ___
  Database (which?): [ ] Y / [ ] N - if yes: read/write? ___
  Payment system (Stripe, Adyen): [ ] Y / [ ] N
  API (which?): [ ] Y / [ ] N - if yes: which APIs? ___

USER BASE & EXPOSURE
Users:
  [ ] Single user (just me)
  [ ] Department (how many users?) ___
  [ ] Company-wide (how many users?) ___
  [ ] External customers (how many?) ___
  [ ] Partners (which partners?) ___

Customer Impact:
  [ ] Not customer-facing (internal only)
  [ ] Indirect customer impact (affects business internal to company, impacts customers downstream)
  [ ] Direct customer-facing (customers interact with this agent)

DECISION AUTHORITY
Agent's Role in Decisions:
  [ ] Informational (provides data/summaries; humans decide)
  [ ] Advisory (recommends actions; humans decide)
  [ ] Autonomous (makes and implements decisions without human approval)

If autonomous, what decisions?
  [ ] Approvals/denials (e.g., loan approval, access grant)
  [ ] Financial transactions (e.g., purchase, payment)
  [ ] Customer communication (e.g., refund, policy change)
  [ ] Resource allocation (e.g., task assignment, priority)
  [ ] Other: ___

COMPLIANCE & RISK
Applicable Regulations:
  [ ] GDPR (processes EU resident data)
  [ ] HIPAA (processes healthcare data)
  [ ] SOX (processes financial/accounting data)
  [ ] FINRA (processes investment/trading data)
  [ ] PCI-DSS (processes payment card data)
  [ ] CCPA (processes California resident data)
  [ ] Industry-specific: ___
  [ ] None known

Audit & Logging:
  [ ] Agent logs queries/responses: Y/N
  [ ] Logs stored securely: Y/N - where? ___
  [ ] Audit trail available: Y/N
  [ ] Incident response plan exists: Y/N

Criticality to Business:
  [ ] Nice-to-have (would be good if it worked, but not essential)
  [ ] Important (used regularly; business unit would notice if unavailable)
  [ ] Business-critical (company cannot operate without this agent)

BUSINESS VALUE & METRICS
Value Delivered:
  [ ] Reduces manual work (estimate hours/week saved): ___
  [ ] Enables new capability (describe): ___
  [ ] Generates revenue (estimate $): ___
  [ ] Improves customer satisfaction (describe): ___
  [ ] Reduces cost (estimate $): ___

Current Metrics (if known):
  Queries/month: ___
  Users: ___
  Error rate: ___
  Cost (cloud/SaaS): ___ /month

RISK ASSESSMENT (Self-Assessment by Owner)
How critical is this agent to your operations?
  [ ] Tier 1 (Critical - immediate compliance risk)
  [ ] Tier 2 (High - important business function with compliance exposure)
  [ ] Tier 3 (Medium - useful but non-critical; low compliance risk)
  [ ] Tier 4 (Low - experimental or POC; retire if low value)

What would happen if this agent failed?
  [ ] Work would stop completely
  [ ] Some work would stall; workaround possible
  [ ] Minor inconvenience; workarounds available
  [ ] No significant impact

NEXT STEPS
This agent is recommended for (to be determined in Phase 3 Triage):
  [ ] Onboard to Intellios Governance (full intake, ABP generation, approval)
  [ ] Consolidate with existing approved agent (retire this one)
  [ ] Retire (discontinue, no governance value)
  [ ] Monitor (keep as-is; document; evaluate in future cycles)

Owner's Preference:
  [ ] I want to bring this into governance and keep it
  [ ] I want to retire this and migrate to an approved tool
  [ ] I'm open to either; please advise

Follow-up Owner Contact for Intake Phase (if Onboard is selected):
  Name: ____________________
  Email: ____________________
  Phone: ____________________
```

---

*See also:*
- [Agent Blueprint Package](../03-core-concepts/agent-blueprint-package.md)
- [Governance Validator](../03-core-concepts/policy-engine.md)
- [Agent Registry](../03-core-concepts/agent-blueprint-package.md)
- [Policy Expression Language Reference](../03-core-concepts/policy-expression-language.md)
- [Blueprint Review UI](../03-core-concepts/agent-lifecycle-states.md)
