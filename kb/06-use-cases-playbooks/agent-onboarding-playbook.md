---
id: "06-005"
title: "Agent Onboarding Playbook"
slug: "agent-onboarding-playbook"
type: "task"
audiences:
  - "product"
  - "engineering"
status: "published"
version: "1.0.0"
platform_version: "1.0.0"
created: "2026-04-05"
updated: "2026-04-05"
author: "Intellios"
reviewers: []
tags:
  - "getting-started"
  - "how-to"
  - "agent-deployment"
  - "governance"
  - "workflow"
prerequisites:
  - "What Is Intellios"
  - "Agent Blueprint Package"
  - "Agent Lifecycle"
related:
  - "Financial Services Scenarios"
  - "Governance-as-Code"
  - "Blueprint Review UI"
next_steps:
  - "Financial Services Scenarios"
  - "Runtime Adapter Reference"
feedback_url: "[PLACEHOLDER]"
tldr: >
  Deploy your first AI agent through Intellios in 5 steps: (1) Define agent concept and identify stakeholders, (2) Choose intake path (conversational 3-phase or express-lane template), (3) Complete intake to capture requirements, (4) Review generated Agent Blueprint Package and run governance validation, (5) Iterate on any violations, submit for human review, and approve for deployment. Typical timeline: 1-3 weeks from concept to approved production agent.
---

# Agent Onboarding Playbook

> **TL;DR:** Deploy your first AI agent through Intellios in 5 steps: (1) Define agent concept and identify stakeholders, (2) Choose intake path (conversational 3-phase or express-lane template), (3) Complete intake to capture requirements, (4) Review generated Agent Blueprint Package and run governance validation, (5) Iterate on any violations, submit for human review, and approve for deployment. Typical timeline: 1-3 weeks from concept to approved production agent.

## Overview

This playbook is a step-by-step guide for bringing a new AI agent into Intellios governance—from initial concept through production deployment. Whether you're deploying your first agent or scaling to 50+ agents per year, this playbook provides the process, decision points, and best practices.

The playbook covers:

1. **Agent Concept Definition** — Clarifying purpose, audience, capabilities, and constraints
2. **Stakeholder Identification** — Understanding who needs to be involved
3. **Intake Path Selection** — Choosing between conversational intake and express-lane templates
4. **Intake Completion** — Walking through the 3-phase conversational intake or template-based intake
5. **ABP Review** — Reviewing the generated Agent Blueprint Package
6. **Governance Validation** — Running policy validation and interpreting violations
7. **Remediation & Iteration** — Addressing violations and iterating the agent design
8. **Human Review & Approval** — Submitting for stakeholder review and obtaining approval
9. **Deployment & Go-Live** — Deploying to runtime and setting up observability

---

## Step 1: Define the Agent Concept

Before starting intake, clarify what you're building. Work with business stakeholders to document:

### Agent Purpose
- **What is the agent's core job?** (e.g., "Answer customer FAQs about mortgage products," "Analyze credit risk scores," "Detect fraudulent transactions")
- **What business problem does it solve?** (e.g., "Reduce customer service costs," "Accelerate credit decisions," "Prevent fraud losses")
- **Who requested it?** (product team, business unit, compliance, executive leadership)

### Agent Audience
- **Who uses the agent?** (customers, internal staff, partners, automated systems)
- **How do they interact with it?** (web chat, API call, scheduled batch job, real-time streaming)
- **What is the volume?** (peak requests/sec, daily interactions, etc.)

### Agent Capabilities
- **What can the agent do?** (List specific capabilities: "retrieve account balances," "provide product recommendations," "approve transactions up to $10K," "route escalations to humans")
- **What data does it access?** (customer data, transaction history, internal databases, external APIs)
- **What systems does it integrate with?** (CRM, core banking system, risk model API, external vendor APIs)
- **What are the output constraints?** (maximum response length, formatting requirements, decimal precision for financial data)

### Agent Constraints
- **What can't the agent do?** (explicitly list denied actions: "cannot modify account data," "cannot initiate refunds," "cannot access employee personal data")
- **What are the latency requirements?** (must respond within 100ms, within 5 seconds, etc.)
- **What are rate limits?** (max calls per customer per day, max concurrent sessions, etc.)
- **What escalation triggers exist?** (escalate if confidence <70%, escalate if amount >$50K, escalate if customer complains, etc.)

### Agent Lifecycle Context
- **How long will the agent operate?** (permanent, 6-month pilot, experimental)
- **Who owns it?** (business unit, product team, shared service team)
- **How will it evolve?** (static, planned improvements, experimental/iterative)

### Example: Customer Advisory Agent

```
Purpose: Answer customer questions about mortgage products
          (rates, terms, application requirements, status)

Audience: Bank customers (external, via web chat)

Capabilities:
- Retrieve real-time mortgage rates from core banking system
- Provide mortgage product information from knowledge base
- Look up application status (if customer authenticated)
- Escalate to human agent for account modifications or disputes

Constraints:
- Cannot approve loan applications
- Cannot modify customer account data
- Cannot transfer funds
- Response time: <5 seconds
- Rate limits: max 50 requests per customer per day
- Escalation triggers: account modification requests, complaints,
  disputed information, unusual scenarios

Lifecycle: Permanent service; planned improvements
           (investment product advisory Q3 2026)
```

### Checklist for Step 1

- [ ] Agent purpose is clearly stated and documented
- [ ] Primary audience identified
- [ ] Major capabilities listed (5-10 key capabilities)
- [ ] Key constraints and denied actions documented
- [ ] Integration scope identified (which systems does it touch?)
- [ ] Latency and rate limit requirements documented
- [ ] Data sensitivity level identified (public, internal, regulated, highly sensitive)
- [ ] Business owner identified

Once complete, you're ready to choose your intake path.

---

## Step 2: Identify Stakeholders

Different agents require different stakeholders in the review and approval process. Understanding stakeholder roles early prevents delays later.

### The Seven Stakeholder Lanes

Intellios uses a stakeholder model with 7 lanes:

1. **Business Owner** — The product/business unit leader who requested the agent
   - Role: Confirms agent capabilities match business requirements
   - Review focus: Does the agent do what we asked? Is the scope right?
   - Approval: Yes/No

2. **Security & Data Protection** — Information security, privacy, data governance
   - Role: Evaluates data access, PII handling, and security controls
   - Review focus: Is data access least-privilege? Is PII protected? Are sensitive operations restricted?
   - Approval: Yes/No/Conditional (e.g., "approve if PII redaction is configured")

3. **Compliance & Legal** — Regulatory compliance, legal risk management
   - Role: Evaluates regulatory alignment and legal exposure
   - Review focus: Does the agent meet applicable regulations? Are risks documented?
   - Approval: Yes/No/Escalate (e.g., "escalate to legal counsel if agent handles covered data")

4. **Risk Management** — Credit risk, operational risk, model risk
   - Role: Assesses risk classification, monitoring requirements, and remediation procedures
   - Review focus: Is the risk classification appropriate? Are monitoring and escalation procedures in place?
   - Approval: Yes/No/Escalate

5. **Governance & Policy** — Central governance authority, policy engine, audit
   - Role: Ensures the agent conforms to enterprise governance policies
   - Review focus: Does the agent follow governance rules? Are audit requirements met?
   - Approval: Yes/No (deterministic, based on policy validation)

6. **Architecture & Engineering** — Technical architecture, integration, deployment
   - Role: Evaluates technical design, integration complexity, and operational feasibility
   - Review focus: Is the technical design sound? Are integrations feasible? Is the deployment plan realistic?
   - Approval: Yes/No/Escalate

7. **Customer/User Advocate** — Customer service, user experience, brand consistency
   - Role: Evaluates user experience, brand alignment, and escalation procedures
   - Review focus: Is the agent brand-compliant? Does it provide good user experience? Are escalations clear?
   - Approval: Yes/No/Request changes

### Stakeholder Selection Decision Tree

```
                        ┌─── Agent Type ───┐
                        │                   │
          Customer-Facing    Internal-Only    Automated
                │               │               │
                │               │               │
          ┌─────┴────────┬──────┴──────┬───────┴────────┐
          │              │             │                │
       All 7          1, 2, 3, 4,    2, 3, 4,        2, 3, 4,
       Stakeholders    5, 6, 7       5, 6             5, 6
          │            │             │                │
       Business    Compliance   Governance      Risk Management
       Owner       Officer      Manager          (primary)
       Security    Security     Engineer         Security (if data
       Compliance  Engineer     Architect        access)
       Risk                                      Compliance (if
       Arch                                      regulatory)
       Engineer                                  Architect
       UX Lead
```

### Example: Customer Advisory Agent Stakeholders

Since this is customer-facing, **all 7 stakeholder lanes are relevant**:

1. **Business Owner** — Mortgage product manager
2. **Security & Data Protection** — Chief Information Security Officer (CISO) or information security analyst
3. **Compliance & Legal** — Compliance officer (FINRA, GLBA, UDAP)
4. **Risk Management** — Model risk manager or credit risk officer
5. **Governance & Policy** — Governance manager (owns SR 11-7 compliance)
6. **Architecture & Engineering** — Principal engineer or platform architect
7. **Customer Advocate** — Customer service director or head of user experience

**Review Path:** All 7 stakeholders must approve before the agent reaches production.

### Checklist for Step 2

- [ ] Stakeholder lanes identified (1-7, depending on agent type)
- [ ] Individual owners assigned for each stakeholder lane
- [ ] Review criteria documented for each stakeholder
- [ ] Escalation paths defined (who escalates to whom if there's a concern?)
- [ ] SLA for review defined (e.g., "each stakeholder must review within 3 business days")

Once stakeholders are identified, you're ready to choose your intake path.

---

## Step 3: Choose Intake Path

Intellios offers two intake paths: **Conversational Intake (3-phase)** and **Express-Lane Template**.

### Decision Tree: Which Path?

```
                      New Agent Request
                            │
                            ▼
                   Is this a simple agent?
                   (FAQ chatbot, standard workflow)
                       /                    \
                     YES                      NO
                     /                         \
                    ▼                           ▼
            Is there an existing         Are you deploying
            template that matches?       a high-complexity agent?
                /        \               (custom integrations,
              YES          NO            novel governance requirements,
              /             \            multi-system orchestration)
             ▼               ▼                    /          \
        Use Express-    Use Conversational   YES              NO
        Lane Template   Intake (3-phase)      /                \
                                            ▼                  ▼
        Timeline: 2-3 days              Use Custom      Use Conversational
        Best for: Standard patterns     Path or         Intake (3-phase)
                  (FAQ, routing,        Escalate
                  approval workflows)   to Architecture  Timeline: 3-5 days
                                        Team
```

### Path A: Express-Lane Template

**Best for:** Standard agents with known patterns (FAQ chatbots, approval workflows, routing agents)

**Templates Available:**
- Customer Service Chatbot (FAQ + escalation)
- Internal Approval Workflow (multi-stage approval, audit trail)
- Data Lookup Agent (query database, return formatted results)
- Alert & Escalation Agent (monitor threshold, escalate when triggered)
- Content Routing Agent (classify content, route to appropriate system/team)

**Intake Process:**
1. **Select Template** — Choose the template that best matches your use case
2. **Fill Template Form** — Provide agent name, description, core parameters (data sources, escalation rules, rate limits)
3. **Map Integrations** — Specify which systems the agent connects to
4. **Review & Generate** — System auto-generates ABP

**Timeline:** 2-3 days (1 day to fill form, 1 day for governance validation)

**Example:**

A bank wants to build a customer service chatbot that answers FAQs and routes complex questions to humans.

1. Select: "Customer Service Chatbot" template
2. Fill form:
   - Agent name: "Mortgage FAQ Bot"
   - Knowledge base: "Mortgage Products" wiki
   - Escalation trigger: customer says "speak to representative"
   - Rate limit: 50 requests/customer/day
   - Audit logging: enabled
3. System generates ABP with:
   - Capabilities: FAQ lookup, escalation
   - Constraints: no account modifications, no financial advice
   - Audit logging configured
   - PII redaction enabled (for logged interactions)
4. Run governance validation → passes
5. Submit for human review

**Pros:**
- Fast (2-3 days to approval)
- Lower risk (templates are pre-validated)
- Minimal back-and-forth with governance

**Cons:**
- Limited customization
- Not suitable for novel use cases
- Cannot capture nuanced requirements

### Path B: Conversational Intake (3-Phase)

**Best for:** Complex agents, novel use cases, agents with specialized governance requirements

**Phase 1: Structured Context Form** (30 minutes)

The user fills a form with:
- Agent name and description
- Deployment type (customer-facing, internal, automated)
- Data sensitivity (public, internal, regulated, highly sensitive)
- Applicable regulations (FINRA, SOX, GLBA, HIPAA, GDPR, etc.)
- Integration scope (which systems?)
- Intended agents/workflows (how many, what types)

**Example Response:**

```
Agent Name: Customer Advisory Agent
Description: Answers customer questions about mortgage products
Deployment Type: customer-facing
Data Sensitivity: regulated (accesses customer account data)
Applicable Regulations: FINRA, SOX, GLBA
Integrations: Core banking API, mortgage rate feed, loan origination system
Intended Agents: 1 (this agent)
```

**Phase 2: Conversational AI Interview** (1-2 days)

Claude (or another LLM) engages the user in guided conversation to elaborate on:

- **Capabilities** — "What specific questions should the agent answer?" / "What data should it access?" / "What should it never do?"
- **Data Handling** — "How is customer PII used?" / "Should it be logged?" / "If logged, how long should it be retained?" / "Should it be redacted?"
- **Audit Requirements** — "What interactions must be logged?" / "For how long?" / "Who has access to the logs?"
- **Escalation Paths** — "What scenarios require human escalation?" / "Who should be notified?" / "What information should be passed?"
- **Governance Context** — "Are there specific governance policies this agent must follow?" / "Are there industry best practices?" / "Any prior examples from your org?"

The system auto-probes based on Phase 1 signals. For example:

- If deployment type = customer-facing, the system probes for brand consistency, user experience, and escalation
- If data sensitivity = regulated and applicable regulations = FINRA, the system probes for fiduciary duty constraints and suitability rules
- If applicable regulations = GLBA, the system probes for PII handling and data retention

**Example Questions:**

```
Q: You indicated the agent accesses customer account data (regulated).
   What specific account data does it need?

A: Account number, account type, balance, recent transactions.

Q: How should this data be handled in agent logs?

A: Redact the account number and balance. Full transaction data
   should not be logged (too sensitive).

Q: What audit logging is required?

A: SOX requires complete audit trails. We need to log:
   - What the customer asked
   - What account was accessed
   - Whether the agent answered or escalated
   - When the interaction occurred
   Retain for 7 years.

Q: Are there escalation scenarios?

A: Yes. If a customer asks for account modifications, the agent
   should decline and offer to route to a human. Also escalate if
   the customer seems confused or frustrated.
```

**Phase 3: Pre-Generation Review** (30 minutes)

The user reviews a summary of captured information:

```
Agent Summary
─────────────
Name: Customer Advisory Agent
Purpose: Answer customer questions about mortgage products
Deployment: Customer-facing (via web chat)
Data Sensitivity: Regulated

Capabilities:
- Retrieve mortgage rates (real-time)
- Provide mortgage product information (FAQs)
- Look up application status (if customer authenticated)
- Escalate to human for account modifications

Constraints:
- Cannot approve loans
- Cannot modify account data
- Cannot provide investment advice
- Response time: <5 seconds
- Rate limit: 50 requests/customer/day

Data Handling:
- Access: customer account number, account type, balance, recent transactions
- Redaction: account number, balance redacted in logs
- Retention: 7 years (SOX requirement)

Audit Logging:
- Log: customer question, account accessed, escalation status, timestamp
- Retention: 7 years
- Access: compliance team, auditors (on request)

Escalation:
- Account modifications → route to human
- Customer confusion/frustration → route to human
- Unusual scenarios → route to human

Governance Context:
- Regulations: FINRA, SOX, GLBA
- Brand compliance: responses must match approved mortgage knowledge base
- Fiduciary considerations: cannot recommend products unsuitable for customer
```

The user confirms: "This looks right" or "I need to adjust X."

If adjustments are needed, the conversation continues. Once confirmed, Phase 2 proceeds.

**Timeline:** 1-2 days of back-and-forth (typically 3-5 conversation turns)

**Pros:**
- Captures nuanced requirements
- Handles complex agents and edge cases
- Probes automatically based on agent context
- Better governance outcome (fewer surprises during validation)

**Cons:**
- Slightly longer timeline (1-2 days vs. 1 day)
- Requires more engagement from the user
- More detailed documentation (not always a con)

### Choosing Your Path: Quick Guide

| Factor | Express-Lane | Conversational |
|--------|---|---|
| **Timeline** | 2-3 days | 3-5 days |
| **Customization** | Limited (template-based) | Full (conversation-driven) |
| **Complexity** | Low (standard patterns) | Any (simple to complex) |
| **User Engagement** | 1 day form-filling | 1-2 days back-and-forth |
| **Governance Risk** | Low (pre-validated) | Low (context-aware) |
| **Data Sensitivity** | Low-to-medium | Any |
| **Novel Requirements** | Not suitable | Good fit |
| **Scalability** | Good (for 100+ similar agents) | Good (for 50+ diverse agents) |

**Recommendation:**
- **First-time agents:** Use Conversational Intake (more thorough, better outcomes)
- **Scaling known patterns:** Use Express-Lane (faster, less overhead)
- **Novel/complex agents:** Always use Conversational Intake

---

## Step 4: Complete Intake

### Express-Lane Intake

1. **Navigate to Design Studio** — Log in to Intellios and select "Create New Agent"
2. **Choose Template** — Browse available templates and select the one that best matches your use case
3. **Fill Template Form** — Enter:
   - Agent name (required)
   - Agent description (required)
   - Core parameters (depends on template; e.g., for FAQ template: knowledge base source, escalation trigger)
   - Integration mappings (which systems does it connect to?)
   - Rate limits and constraints
   - Audit requirements
4. **Validate Form** — System checks for required fields and basic consistency
5. **Generate ABP** — Click "Generate" to create the Agent Blueprint Package

**Expected Output:** An ABP that specifies capabilities, constraints, audit logging, and governance policies (auto-filled based on template)

### Conversational Intake

1. **Navigate to Design Studio** — Log in and select "Create New Agent" → "Conversational Intake"

2. **Phase 1: Structured Context Form** — Fill form (30 min)

3. **Phase 2: AI Interview** — Engage in conversation with Claude
   - Answer 5-8 probing questions
   - Clarify governance context, data handling, escalation rules
   - Takes 1-2 days (you can pause and resume)

4. **Phase 3: Pre-Generation Review** — Review the summary
   - Confirm captured information is accurate
   - Request adjustments if needed (returns to Phase 2)
   - Takes 30 min

5. **Generate ABP** — Once confirmed, the Generation Engine produces the ABP (takes a few seconds)

**Expected Output:** A comprehensive ABP with all captured context baked in

---

## Step 5: Review Generated ABP

Once intake is complete, the system generates an **Agent Blueprint Package (ABP)** — a structured JSON document that fully specifies your agent.

### What's in the ABP?

```json
{
  "metadata": {
    "id": "agent-mortgage-faq",
    "name": "Customer Advisory Agent",
    "description": "Answer customer FAQs about mortgage products",
    "version": "1.0.0",
    "owner": "product-team",
    "deployment_type": "customer-facing",
    "created_at": "2026-04-05T10:00:00Z"
  },
  "governance": {
    "risk_classification": "medium",
    "applicable_regulations": ["FINRA", "SOX", "GLBA"],
    "audit_logging": {
      "enabled": true,
      "log_level": "full",
      "retention_days": 2555,
      "pii_redaction": true
    },
    "escalation_rules": [
      {
        "trigger": "account_modification_request",
        "action": "escalate_to_human",
        "queue": "customer-service"
      },
      {
        "trigger": "customer_complaint",
        "action": "escalate_to_human",
        "queue": "customer-service"
      }
    ]
  },
  "capabilities": [
    {
      "name": "retrieve_mortgage_rates",
      "description": "Get current mortgage rates",
      "inputs": [],
      "outputs": ["rate_30yr", "rate_15yr", "rate_5arm"],
      "constraints": {
        "latency_ms": 500,
        "rate_limit_per_customer_per_day": 50
      }
    },
    {
      "name": "lookup_application_status",
      "description": "Check customer loan application status",
      "inputs": ["application_id"],
      "outputs": ["status", "expected_decision_date"],
      "constraints": {
        "requires_authentication": true,
        "latency_ms": 1000
      }
    }
  ],
  "constraints": {
    "denied_actions": [
      "approve_loan",
      "modify_account",
      "initiate_transfer",
      "provide_investment_advice"
    ]
  }
}
```

### How to Review

Use the **Blueprint Studio UI** to review the ABP:

1. **Metadata Section** — Verify agent name, description, owner, version
   - ✓ Does it match your concept?
   - ✓ Is the owner correct?

2. **Governance Section** — Review risk classification, regulations, audit logging
   - ✓ Is risk classification appropriate?
   - ✓ Are all applicable regulations listed?
   - ✓ Is audit logging enabled at the right level?
   - ✓ Are PII redaction rules correct?
   - ✓ Are escalation rules complete?

3. **Capabilities Section** — Check each capability
   - ✓ Is the capability described correctly?
   - ✓ Are the inputs/outputs correct?
   - ✓ Are latency/rate limits appropriate?

4. **Constraints Section** — Verify denied actions
   - ✓ Are all "can't do" actions listed?
   - ✓ Are any missing?

### Making Adjustments

If the generated ABP is not quite right, you have two options:

**Option A: Minor Adjustments** — Edit the ABP directly in the Blueprint Studio UI
- Click "Edit ABP"
- Update fields (e.g., change rate limit from 50 to 100 requests/day)
- Save and re-generate

**Option B: Re-Intake** — If changes are substantial, return to intake
- In Conversational Intake: Return to Phase 2 and clarify with Claude
- In Express-Lane: Go back to template form and re-fill

**Recommendation:** For minor tweaks, edit directly. For substantive changes, re-intake (ensures governance context is updated).

### Checklist for Step 5

- [ ] ABP metadata is correct (name, owner, version)
- [ ] Risk classification is appropriate
- [ ] Applicable regulations are listed
- [ ] Audit logging is enabled at the right level
- [ ] PII redaction rules are correct
- [ ] All capabilities are captured
- [ ] All constraints and denied actions are listed
- [ ] Latency and rate limit requirements are documented
- [ ] Escalation rules are complete and correct

Once the ABP looks good, you're ready to run governance validation.

---

## Step 6: Run Governance Validation

Governance validation checks your ABP against your enterprise's governance policies.

### Understanding Policies

Your enterprise defines governance policies that all agents must follow. Examples:

- **Safety Baseline** — "All agents must have a description, applicable regulations, and constraints documented"
- **Audit Standard** — "All agents accessing regulated data must have audit logging enabled with PII redaction"
- **Data Protection** — "All agents handling customer PII must redact sensitive fields in logs and retain logs for 7 years"
- **Access Control** — "All agents must have explicit allowed and denied actions"
- **Compliance Standard** — "All customer-facing agents must reference applicable regulations (FINRA, SOX, GLBA, etc.)"

### Running Validation

In the Blueprint Studio:

1. Click **"Validate ABP Against Policies"**
2. System runs all policies against your ABP (takes 2-5 seconds)
3. Results displayed: ✓ Pass, ⚠️ Warning, ✗ Error

### Interpreting Results

**Passing Policies (✓)**

```
✓ Safety Baseline Policy
  ✓ Agent has description
  ✓ Agent has applicable regulations
  ✓ Agent has constraints defined
  Status: PASS
```

**Warning (⚠️)** — Policy passes but flagged for review

```
⚠️ Data Retention Policy
  ⚠️ Audit logs retained for 2555 days (7 years) - above standard
     Recommendation: Document why extended retention is needed
  Status: PASS (warning issued)
```

**Error (✗)** — Policy fails; must be remediated before approval

```
✗ Audit Standard Policy
  ✗ Audit logging is not enabled
     Error: Agent accesses regulated data but audit logging is disabled
     Remediation: Enable audit logging with retention >= 7 years
  Status: FAIL

  ✗ PII Redaction Policy
  ✗ PII redaction is not configured
     Error: Agent logs customer data but PII redaction is disabled
     Remediation: Enable PII redaction for sensitive fields
                 (account_number, ssn, etc.)
  Status: FAIL
```

### Remediation Suggestions

If an error exists, Intellios provides Claude-generated remediation suggestions:

```
Violations Found: 2 errors

Error 1: Audit Logging Disabled
─────────────────────────────
Policy: Audit Standard Policy (error-severity)
Rule: agents_accessing_regulated_data must have audit_logging.enabled = true
Current: audit_logging.enabled = false

Why it failed:
  You specified data_sensitivity = "regulated" and applicable_regulations
  includes "SOX". SOX requires audit trails for all regulated data access.
  But your ABP has audit_logging.enabled = false.

Remediation:
  1. Edit ABP and set audit_logging.enabled = true
  2. Set audit_logging.retention_days = 2555 (7 years, required for SOX)
  3. Set audit_logging.pii_redaction = true
  4. Re-validate

Suggested fix:
  {
    "governance": {
      "audit_logging": {
        "enabled": true,
        "retention_days": 2555,
        "pii_redaction": true
      }
    }
  }
```

### Remediation Workflow

1. **Review Violations** — Understand why each violation occurred
2. **Evaluate Remediation Suggestions** — Do they make sense for your use case?
3. **Edit ABP** — Click "Edit ABP", apply the suggested fix (or your own fix)
4. **Re-Validate** — Click "Validate" again
5. **Iterate** — Repeat until all error-severity violations are resolved

### What Violations Block Approval?

- **Error-severity violations** — Block approval. Agent cannot progress to human review until all errors are resolved.
- **Warning-severity violations** — Do not block approval. Warnings are advisory; you can proceed to review with warnings.

### Typical Validation Timeline

- **First validation:** 1-2 hours (review violations, evaluate remediation suggestions)
- **Iteration:** 30 min per iteration (edit ABP, re-validate)
- **Total:** Usually 1-3 hours for 2-3 violations

### Checklist for Step 6

- [ ] Ran governance validation
- [ ] Reviewed all violations and remediation suggestions
- [ ] Edited ABP to address error-severity violations
- [ ] Re-validated and confirmed all errors resolved
- [ ] Documented any warning-severity violations and why they're acceptable
- [ ] Stakeholders aware of remaining warnings (if any)

Once all error-severity violations are resolved, you're ready for human review.

---

## Step 7: Submit for Human Review

### Preparing for Review

Before submitting, ensure:

1. **Governance validation passed** (all error-severity violations resolved)
2. **Stakeholders identified** (from Step 2)
3. **Review criteria documented** (what will each stakeholder look for?)
4. **ABP is polished** (metadata complete, descriptions clear, constraints explicit)

### Submitting for Review

In the Blueprint Studio:

1. Click **"Submit for Review"**
2. System routes ABP to designated reviewers based on stakeholder lanes
3. Reviewers receive notification and access to ABP in Review Queue

### What Reviewers See

Reviewers access the **Blueprint Review UI**, which displays:

- **Agent Summary** — Name, description, owner, risk classification
- **Capabilities & Constraints** — What can it do? What can't it do?
- **Data & Integration** — What systems does it access? What data?
- **Governance Policies** — Which regulations apply? What audit logging is configured?
- **Escalation Rules** — When does it escalate to humans?
- **Validation Results** — Did it pass governance validation?

### Review Criteria by Stakeholder Lane

**Business Owner:**
- Does the agent match the approved business case?
- Are capabilities in scope?
- Is risk classification appropriate?
- Approval: Yes/No/Request Changes

**Security & Data Protection:**
- Is data access least-privilege?
- Is PII handling correct?
- Are integration points secure?
- Approval: Yes/No/Conditional

**Compliance & Legal:**
- Does the agent comply with applicable regulations?
- Are risks documented and mitigated?
- Are escalation procedures correct?
- Approval: Yes/No/Escalate to legal

**Risk Management:**
- Is risk classification appropriate?
- Are monitoring and remediation procedures in place?
- Is performance acceptable (latency, accuracy, etc.)?
- Approval: Yes/No/Escalate to risk committee

**Governance & Policy:**
- Did the agent pass governance validation?
- Are all policies satisfied?
- Is audit trail configured correctly?
- Approval: Yes/No (deterministic, based on validation)

**Architecture & Engineering:**
- Is the technical design sound?
- Are integrations feasible?
- Is deployment plan realistic?
- Approval: Yes/No/Request technical changes

**Customer/User Advocate:**
- Is the agent brand-compliant?
- Is user experience good?
- Are escalations clear to users?
- Approval: Yes/No/Request changes

### The Review Timeline

- **Review period:** 3-5 business days (standard SLA)
- **Reviewer feedback:** Comments, questions, conditional approvals
- **Your response:** Address feedback, iterate ABP if needed, re-submit
- **Approval:** When all stakeholders approve

### Handling Review Feedback

**Scenario 1: Minor Feedback**
- Reviewer: "Change rate limit from 50 to 100 requests/day"
- Response: Edit ABP, update rate limit, re-submit
- Timeline: 1 day

**Scenario 2: Governance Feedback**
- Reviewer: "Escalation rules incomplete. Add escalation for suspicious transactions."
- Response: Edit ABP, add escalation rule, re-validate (governance may fail), remediate, re-submit
- Timeline: 1-2 days

**Scenario 3: Conditional Approval**
- Reviewer: "Approve if PII redaction is enhanced for credit scores"
- Response: Update PII redaction rules, re-validate, re-submit
- Timeline: 1-2 days

**Scenario 4: Rejection**
- Reviewer: "Risk classification too low. This agent makes financial decisions affecting customers; must be high-risk."
- Response: Update risk classification, re-run governance validation (may trigger new policy checks), address new violations, re-submit
- Timeline: 2-3 days

### Consensus Approval

An agent is approved when:
- All **stakeholder lanes required for this agent type** have approved
- No reviewer has an active objection
- Governance validation passed (error-severity violations resolved)

For a customer-facing agent (all 7 stakeholder lanes required):
- Business Owner: ✓ Approved
- Security & Data Protection: ✓ Approved
- Compliance & Legal: ✓ Approved
- Risk Management: ✓ Approved
- Governance & Policy: ✓ Approved (deterministic)
- Architecture & Engineering: ✓ Approved
- Customer Advocate: ✓ Approved

**Agent Status:** Approved → Ready for Deployment

### Checklist for Step 7

- [ ] Governance validation passed (all error-severity violations resolved)
- [ ] All stakeholders identified and notified
- [ ] ABP submitted for review
- [ ] Reviewers completed their reviews within SLA
- [ ] All feedback incorporated or resolved
- [ ] All stakeholders approved (or approved with conditions)
- [ ] Agent status changed to "Approved"

---

## Step 8: Deploy & Go-Live

### Pre-Deployment Checklist

Before deploying, verify:

1. **ABP is Approved** — Status = "approved" in Agent Registry
2. **Runtime Target Identified** — AWS AgentCore, Azure AI Foundry, or on-premise?
3. **Runtime Environment Ready** — Target environment is configured and accessible
4. **Observability Setup** — Logging, monitoring, alerting configured
5. **Rollback Plan** — If needed, can the agent be rolled back?
6. **Support Team Ready** — Team on standby to support go-live

### Deployment Process

1. **Retrieve Approved ABP** — From the Agent Registry
2. **Translate to Runtime Format** — Use the appropriate runtime adapter (AWS, Azure, on-premise)
3. **Deploy to Staging** — Test in staging environment (optional, recommended)
4. **Run Smoke Tests** — Verify basic functionality
5. **Deploy to Production** — Gradually ramp up traffic (canary deployment recommended)
6. **Monitor** — Watch for errors, performance issues, unexpected behavior

### Example: AWS Deployment

```bash
# 1. Retrieve approved ABP from registry
ABP=$(intellios-cli registry get agent-mortgage-faq --version 1.0.0)

# 2. Translate to AWS format using AWS adapter
aws_config=$(intellios-cli adapters aws translate $ABP)

# 3. Deploy to staging
aws s3 cp aws_config s3://my-agent-staging/agent-mortgage-faq/config.json
aws agentcore deploy \
  --config-s3-path s3://my-agent-staging/agent-mortgage-faq/config.json \
  --environment staging

# 4. Run smoke tests
curl http://staging-agent.example.com/health
curl -X POST http://staging-agent.example.com/chat \
  -d '{"message": "What are current mortgage rates?"}'

# 5. Deploy to production (canary: 10% traffic)
aws agentcore deploy \
  --config-s3-path s3://my-agent-staging/agent-mortgage-faq/config.json \
  --environment production \
  --canary-percent 10

# 6. Ramp up over 1 hour: 10% → 25% → 50% → 100%
```

### Post-Deployment Monitoring

Once deployed, monitor:

- **Uptime** — Is the agent available?
- **Error Rate** — Unexpected failures?
- **Latency** — Response times acceptable?
- **Audit Trail** — Is logging working correctly?
- **Escalations** — Are escalations triggering and routing correctly?
- **User Feedback** — Customer complaints or issues?

### Compliance & Governance Post-Deployment

Intellios continues to monitor the agent:

1. **Audit Trail** — All interactions logged per governance policy
2. **Performance Monitoring** — Accuracy, latency, error rates tracked
3. **Compliance Reporting** — SR 11-7 model inventory, SOX audit logs, GLBA records updated automatically
4. **Governance Audit** — Periodic checks to ensure agent continues to comply with policies
5. **Model Remediation** — If agent performance degrades or policy violations are detected, remediation procedures are triggered

### Checklist for Step 8

- [ ] Pre-deployment checklist completed
- [ ] ABP deployed to target runtime (AWS/Azure/on-premise)
- [ ] Smoke tests passed
- [ ] Traffic ramped up gradually (canary deployment)
- [ ] Monitoring dashboard active
- [ ] Support team on standby for first 24-48 hours
- [ ] Escalation contacts published to relevant teams
- [ ] Customer communication (if applicable) sent
- [ ] Agent marked as "live" in registry

---

## Decision Tree Summary

Use this tree to navigate the playbook:

```
                    Start: New Agent Request
                             │
                             ▼
              ┌─────── Step 1: Define Concept ──────┐
              │ (purpose, audience, capabilities,    │
              │  constraints, lifecycle)             │
              └─────────────────┬────────────────────┘
                                │
                                ▼
              ┌─────── Step 2: Identify Stakeholders ─────┐
              │ (who needs to review and approve?)        │
              └─────────────────┬────────────────────────┘
                                │
                  ┌─────────────┬──────────────┐
                  │             │              │
         Simple   │   Complex   │   Known      │
        Pattern   │   Use Case  │   Pattern    │
         /        │    /        │    /         │
        ▼         ▼              ▼              ▼
  Express-Lane   Conversational  Express-Lane   Custom
  Template       Intake          Template       Intake
        │         │              │              │
        └─────────┴──────┬───────┴──────────────┘
                         │
                    Step 3: Choose Path
                         │
              ┌──────────┴──────────┐
              │                     │
         Express-Lane      Conversational
              │                     │
              ▼                     ▼
         Step 4A:           Step 4B:
         Fill Form,         Interview,
         Generate ABP       Generate ABP
              │                     │
              └──────────┬──────────┘
                         │
              ┌──────────▼──────────┐
              │                     │
          Step 5: Review ABP
          (Is it correct?)
              │         │
             YES        NO
              │         │
              │         └─→ Edit & Re-generate
              │
              ▼
   Step 6: Run Governance Validation
   (Does it comply with policies?)
      │              │
     PASS           FAIL
      │              │
      │              └─→ Remediate & Re-validate
      │
      ▼
   Step 7: Submit for Review
   (Do stakeholders approve?)
      │              │
     APPROVED        FEEDBACK
      │              │
      │              └─→ Iterate & Re-submit
      │
      ▼
   Step 8: Deploy & Go-Live
   (Agent in production)
      │
      ▼
   Step 9: Monitor & Manage
   (Continuous governance)
```

---

## Best Practices & Tips

### General Best Practices

1. **Start Simple** — Your first agent should be low-risk (FAQ chatbot, simple routing). Build confidence and expertise before deploying complex agents.

2. **Document Everything** — Descriptions, constraints, escalation rules should be clear. This helps reviewers understand your intent.

3. **Leverage Templates** — If a template fits your use case, use it. Faster and lower risk.

4. **Engage Reviewers Early** — Don't wait until the end to get stakeholder feedback. Start conversations early.

5. **Plan for Iteration** — Governance validation and human review often surface needed changes. Budget 2-3 days for iteration.

6. **Version Your ABPs** — Use semantic versioning (1.0.0 → 1.1.0 for minor updates, 2.0.0 for major changes). Makes tracking changes easy.

### Intake Best Practices

1. **Be Specific** — Vague descriptions ("help customers") lead to vague ABPs. Be concrete ("answer questions about mortgage rates, terms, and application status").

2. **List Denied Actions Explicitly** — Don't rely on implicit constraints. Spell out exactly what the agent cannot do.

3. **Plan for Escalation** — Think through what scenarios require human escalation. Build this in from the start.

4. **Consider Data Sensitivity** — If the agent touches customer data, PII, financial information, or proprietary data, spend time on data handling policies.

5. **Anticipate Regulatory Scope** — If your organization is regulated (financial, healthcare, etc.), think about what regulations apply.

### Governance & Validation Best Practices

1. **Understand Your Policies** — Read through your enterprise's governance policies. Understanding them helps you design agents that pass validation on the first try.

2. **Use Remediation Suggestions** — Intellios-generated remediation suggestions are good starting points. Don't ignore them.

3. **Document Deviations** — If you deviate from a remediation suggestion, document why. This helps reviewers understand your reasoning.

4. **Proactive Validation** — Validate early and often. Don't wait until the end to discover violations.

### Review Best Practices

1. **Stakeholder Engagement** — Get stakeholders invested early. A 10-minute conversation during intake prevents back-and-forth during review.

2. **Clear Feedback** — Provide clear, actionable feedback. Not "this doesn't look right" but "escalation rules incomplete; add escalation for account modification requests."

3. **Decision Criteria** — Make sure reviewers understand your approval criteria. Ambiguity leads to delays.

4. **SLAs** — Set clear review SLAs (e.g., "each stakeholder must review within 3 business days"). Track compliance.

### Deployment Best Practices

1. **Staging First** — Always deploy to staging first. Test in a non-production environment.

2. **Canary Deployment** — Ramp up traffic gradually (10% → 25% → 50% → 100%). Catch issues early.

3. **Monitoring Dashboard** — Set up monitoring dashboards before go-live. Monitor uptime, error rate, latency, escalations.

4. **Runbook** — Document how to respond to common issues (agent down, escalation queue full, data access issues).

5. **Rollback Plan** — Have a rollback plan if something goes wrong. Should take <30 minutes to roll back to previous version.

---

## Troubleshooting

### Problem: Governance validation fails; can't understand the error

**Solution:**
1. Read the remediation suggestion carefully
2. If still unclear, ask your governance team (they wrote the policy)
3. Contact Intellios support for policy clarification

### Problem: Reviewer requests a change that conflicts with another reviewer's requirement

**Solution:**
1. Facilitate a discussion between the two reviewers
2. Document the resolution (which requirement takes precedence, why)
3. Update ABP to satisfy both
4. Resubmit with a note explaining the resolution

### Problem: Intake takes longer than expected; stakeholders are waiting

**Solution:**
1. If using Conversational Intake, you can pause after Phase 1 and come back later
2. If using Express-Lane, the form is quick; fill it out and iterate later if needed
3. Governance validation and review are the most time-consuming steps; plan accordingly

### Problem: Agent deployed but compliance team is reporting missing audit logs

**Solution:**
1. Verify ABP has audit_logging.enabled = true
2. Verify deployment process translated audit logging settings correctly
3. Check logs to see if they're being written and retained
4. If logs are missing, remediate (re-deploy with correct settings)
5. Review the chain: ABP → deployment config → runtime log collection

---

## See Also

- [Financial Services Scenarios](./financial-services-scenarios.md) — Six concrete agent deployment scenarios
- [Agent Blueprint Package](../03-core-concepts/agent-blueprint-package.md) — Deep dive into ABP schema and structure
- [Governance-as-Code](../03-core-concepts/governance-as-code.md) — Understanding governance policies
- [Runtime Adapter Reference](../04-architecture-integration/runtime-adapter-pattern.md) — Deployment to specific cloud platforms

---

*Next: [Financial Services Scenarios](./financial-services-scenarios.md)*
