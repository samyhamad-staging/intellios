---
id: "06-001"
title: "Financial Services Scenarios"
slug: "financial-services-scenarios"
type: "concept"
audiences:
  - "product"
  - "compliance"
  - "executive"
status: "published"
version: "1.0.0"
platform_version: "1.0.0"
created: "2026-04-05"
updated: "2026-04-05"
author: "Intellios"
reviewers: []
tags:
  - "use-cases"
  - "financial-services"
  - "compliance"
  - "governance"
  - "agent-scenarios"
prerequisites:
  - "What Is Intellios"
  - "Agent Blueprint Package"
related:
  - "Agent Onboarding Playbook"
  - "Governance-as-Code"
  - "Compliance Evidence Chain"
next_steps:
  - "Agent Onboarding Playbook"
  - "SR 11-7 Compliance Mapping"
feedback_url: "[PLACEHOLDER]"
tldr: >
  Financial services enterprises can deploy six categories of AI agents—customer advisory, risk analysis, fraud detection, KYC/AML, customer service, and portfolio management—each with distinct governance requirements. Intellios automates compliance validation for FINRA, SOX, GLBA, and other regulatory frameworks, enabling rapid deployment while maintaining audit evidence.
---

# Financial Services Scenarios

> **TL;DR:** Financial services enterprises can deploy six categories of AI agents—customer advisory, risk analysis, fraud detection, KYC/AML, customer service, and portfolio management—each with distinct governance requirements. Intellios automates compliance validation for FINRA, SOX, GLBA, and other regulatory frameworks, enabling rapid deployment while maintaining audit evidence.

## Overview

Financial services is the most heavily regulated industry for AI deployment. Regulators—the Federal Reserve (SR 11-7), the SEC, the OCC, FINRA, and the Commodity Futures Trading Commission—have all issued guidance on model risk management, algorithmic governance, and compliance evidence. Simultaneously, financial institutions face intense competitive pressure to deploy AI agents that improve customer experience, accelerate internal processes, and reduce costs.

Intellios bridges this tension by making governed agent deployment the fastest path to production. This document describes six concrete use cases that financial institutions are deploying or planning to deploy, the governance requirements each one triggers, and how Intellios manages those requirements deterministically.

---

## 1. Customer-Facing Advisory Agent (Mortgage, Investment)

### The Scenario

A regional bank wants to deploy a customer-facing agent that answers questions about mortgage products: interest rates, terms, prepayment penalties, application requirements. The agent retrieves real-time rates from the bank's core banking system and integrates with the loan origination system to allow customers to check application status.

### Key Characteristics

- **Deployment Type:** Customer-facing (external users)
- **Data Sensitivity:** Regulated (accesses customer account data, PII)
- **Integration Scope:** Core banking API (internal), loan origination system (internal), external mortgage rate feed (third-party)
- **Regulatory Scope:** FINRA (if investment products involved), SOX (audit trail), GLBA (privacy), potentially UDAP (unfair/deceptive acts)
- **Risk Classification:** Medium-to-high (manages financial transactions, handles sensitive customer data)

### Governance Requirements

The agent must satisfy:

1. **Model Risk Management (SR 11-7)** — The Federal Reserve requires documentation of the model's purpose, risk classification, governance structure, approval chain, and ongoing performance monitoring. The ABP must include model identity, risk metrics, and monitoring requirements.

2. **PII Handling (GLBA & Privacy)** — Customer account data is sensitive. The agent must be configured with:
   - Data redaction rules for logged interactions
   - Retention policies (e.g., delete interaction logs after 90 days)
   - Audit logging for all customer data access
   - Denied actions (e.g., no unsolicited communications, no account modifications without human approval)

3. **SOX Compliance** — All interactions with the core banking system must be logged with timestamps, user context, and system responses. These logs must be retained for 7 years and made available to auditors.

4. **Audit Trail & Transparency** — Regulators expect to see a complete chain of custody: who requested the agent, who approved it, what changes were made, when it was deployed, and who has access to modify it.

### Intellios Solution

When the bank's product team initiates an intake for this agent, Intellios recognizes:
- Deployment type = customer-facing
- Data sensitivity = regulated
- Regulatory scope = FINRA + SOX + GLBA

The Intake Engine automatically probes for:
- How is customer PII logged and redacted?
- What is the audit logging retention policy?
- What denied actions must the agent enforce?
- What is the escalation path for high-risk scenarios (disputes, fraud)?

The Generation Engine produces an ABP with:
- Governance policies for PII redaction and audit logging
- Denied actions embedded in tool constraints
- Risk classification and model metadata
- Approval requirements tied to compliance gates

The Governance Validator checks the ABP against:
- **GLBA Policy:** "All agents accessing customer PII must have audit logging enabled and PII redaction configured." ✓
- **SOX Policy:** "All interactions with regulated systems must be logged with timestamps and retained for 7 years." ✓
- **Fiduciary Policy:** "Customer-facing agents must have explicit escalation paths for sensitive scenarios." ✓

All validation passes. The agent is ready for human review. When approved, Intellios generates:
- **SR 11-7 Model Inventory Entry** — Documenting the agent's identity, risk classification, governance structure, and approval chain
- **SOX Audit Trail** — Complete creation-to-deployment record
- **GLBA Data Processing Record** — PII handling, redaction, and retention policies

### Deployment & Ongoing Compliance

Once deployed, the agent operates under continuous governance:
- Every interaction is logged per SOX requirements
- Customer PII is redacted per GLBA requirements
- An annual review of the agent's performance triggers a governance re-evaluation
- If the bank wants to add capabilities (e.g., mortgage rate quoting with risk scoring), they create a new ABP version and re-run governance validation

---

## 2. Internal Risk Analysis Agent

### The Scenario

A large investment bank wants to automate its market risk analysis workflow. Currently, a team of analysts manually synthesizes data from multiple sources—trade databases, market feeds, internal risk models—to produce daily risk reports. The bank wants an agent that can autonomously pull data, run risk calculations, synthesize findings, and route high-risk positions to human analysts for review.

### Key Characteristics

- **Deployment Type:** Internal-only (bank employees)
- **Data Sensitivity:** Highly sensitive (access to trade data, proprietary risk models, client positions)
- **Integration Scope:** Multiple internal systems (trading database, risk model repository, market data APIs, internal reporting system)
- **Regulatory Scope:** SOX, Basel III (risk reporting), potentially SEC (if risk impacts market-facing disclosures)
- **Risk Classification:** High (operates on critical infrastructure, manages regulatory reporting)

### Governance Requirements

1. **SOX Compliance** — Risk calculations and market data pulls must be logged with complete audit trails. The agent's decision logic must be transparent and reviewable.

2. **Access Control** — The agent must have least-privilege access: it can read trade data and market feeds but cannot modify positions or delete records. Sensitive operations (position modifications) must require human approval.

3. **Restricted Data Handling** — The agent operates on proprietary risk models and client positions. These must be ring-fenced: the agent cannot export, log, or transmit this data to external systems.

4. **Model Transparency** — If the agent uses machine learning (e.g., anomaly detection for unusual positions), the model must be documented, tested, and approved under SR 11-7.

5. **Escalation Protocol** — The agent must detect high-risk scenarios and route them to senior analysts with full context.

### Intellios Solution

The bank's risk team specifies:
- Deployment type = internal-only
- Data sensitivity = highly sensitive
- Regulatory scope = SOX + Basel III
- Integration: 4 internal systems, 2 market data feeds
- Approval required for any position modifications

Intellios recognizes the sensitivity and access control complexity. The Intake Engine probes for:
- Which data sources is the agent allowed to read? Which are forbidden?
- What operations require human approval?
- How should high-risk scenarios be escalated?
- What audit logging is required?

The Generation Engine produces an ABP with:
- Explicit allowed operations (read from trading DB, pull market data, run risk calculations)
- Denied operations (no position modifications without human approval, no data export)
- Audit logging on all data access
- Escalation rules for positions exceeding risk thresholds

The Governance Validator checks:
- **Access Control Policy:** "All agents accessing restricted data must have deny-by-default access control." ✓
- **SOX Policy:** "All operations on regulated systems must be logged with full context." ✓
- **Escalation Policy:** "Internal agents operating on sensitive data must have human escalation paths." ✓

The agent is approved and deployed. Intellios generates:
- **SOX Audit Trail** — Complete record of every data access and calculation
- **Access Control Documentation** — Mapping of agent identity to system permissions
- **Risk Model Documentation** — If the agent uses ML models, documentation of training data, validation, and approval

---

## 3. Fraud Detection Agent

### The Scenario

A payment processor wants to deploy an agent that monitors real-time transaction streams for fraudulent patterns. The agent consumes transaction data, runs scoring models, flags suspicious transactions, and initiates reviews by fraud analysts. It must operate under strict latency constraints (decisions in milliseconds) and regulatory reporting requirements.

### Key Characteristics

- **Deployment Type:** Automated (no human in the loop, operates on streaming data)
- **Data Sensitivity:** Highly sensitive (transaction data, customer identities)
- **Integration Scope:** Transaction stream (real-time), fraud models (ML-based), case management system, regulatory reporting (to FinCEN/FINCEN)
- **Regulatory Scope:** FINRA, BSA/AML (Bank Secrecy Act / Anti-Money Laundering), Dodd-Frank (derivatives reporting)
- **Risk Classification:** Critical (operates at the core of financial infrastructure, directly impacts regulatory reporting)

### Governance Requirements

1. **Real-Time Constraints** — The agent must make decisions in low-latency windows (milliseconds). This constrains what governance checks can run inline; some validation may need to happen offline.

2. **BSA/AML Compliance** — Suspicious Activity Reports (SARs) must be filed with FinCEN for detected fraud. The agent's decision logic and supporting evidence must be auditable and defensible.

3. **Model Explainability** — Regulators increasingly expect fraud models to be explainable. If the agent flags a transaction, there must be documented reasons (e.g., "amount exceeds historical customer average," "destination country on high-risk list").

4. **Escalation Protocols** — Ambiguous cases must be escalated to human analysts. The agent cannot make final determinations on SAR filing—that requires human review.

5. **Data Retention** — Transaction records and fraud model inputs must be retained for regulatory audits (typically 5-7 years).

### Intellios Solution

The payment processor specifies:
- Deployment type = automated, real-time
- Data sensitivity = highly sensitive
- Regulatory scope = FINRA + BSA/AML + Dodd-Frank
- Latency requirement: <100ms
- Integration: real-time transaction stream, 2 fraud models, case management

Intellios recognizes the operational constraints. The Intake Engine probes for:
- What are the decision criteria for flagging a transaction?
- How are ambiguous cases escalated?
- What evidence must be retained for SAR filing?
- What audit logging can run without violating latency constraints?

The Generation Engine produces an ABP with:
- Synchronous decision logic (flagged/not-flagged, no heavy computation)
- Escalation thresholds for ambiguous cases
- Evidence logging that runs asynchronously to avoid latency impact
- Explicit model references (which fraud models are used, versions, approval dates)
- Denied actions (agent cannot file SARs directly; must escalate to humans)

The Governance Validator checks:
- **Model Policy:** "All fraud models must be documented with approval dates and validation results." ✓
- **Explainability Policy:** "All fraud decisions must include documented reasoning." ✓
- **SAR Filing Policy:** "SAR filing requires human review and approval; agents cannot file directly." ✓
- **Audit Policy:** "All fraud decisions must be logged asynchronously without impacting latency." ✓

The agent is approved. Intellios generates:
- **Model Documentation** — Fraud model inventory, validation results, approval chain
- **SAR Decision Log** — Complete record of fraud detections, escalations, and human approvals
- **Audit Trail** — Latency-compliant asynchronous logging of all transactions evaluated

---

## 4. KYC/AML Compliance Agent

### The Scenario

A global bank wants to automate Know Your Customer (KYC) and Anti-Money Laundering (AML) compliance processes. Currently, compliance teams manually collect customer documentation, verify identities, run sanctions checks, and document findings. The bank wants an agent that can orchestrate these processes, flag compliance gaps, and escalate exceptions to human reviewers.

### Key Characteristics

- **Deployment Type:** Internal (compliance team interaction)
- **Data Sensitivity:** Extremely sensitive (customer identities, government IDs, beneficial ownership data, sanctions list matching)
- **Integration Scope:** Customer master database, identity verification vendor, sanctions screening vendors (OFAC, EU, UN lists), document management system, compliance case management
- **Regulatory Scope:** BSA/AML, FinCEN, OFAC, FINRA, SOX, potentially international (FATF, EU AML Directive)
- **Risk Classification:** Critical (core anti-money laundering infrastructure, direct regulatory reporting obligation)

### Governance Requirements

1. **Identity Verification Standards** — KYC regulations specify what constitutes acceptable identity verification (government-issued ID, utility bills, credit reports). The agent must enforce these standards and document how each customer's identity was verified.

2. **Sanctions Screening** — The agent must screen customers against OFAC, EU, UN sanctions lists. Results must be logged, and any positive hits must escalate immediately for human review.

3. **Beneficial Ownership Documentation** — For corporate customers, the agent must collect and verify ultimate beneficial ownership (UBO) information. Compliance requirements vary by jurisdiction.

4. **Audit Trail & Remediation** — Every KYC/AML decision must be documented with full audit trail. If a customer is rejected or flagged, the reason must be clear and defensible.

5. **Data Minimization** — Government IDs and PII are high-risk. The agent should collect and retain only what is legally required.

### Intellios Solution

The bank's compliance team specifies:
- Deployment type = internal (compliance staff)
- Data sensitivity = extremely sensitive
- Regulatory scope = BSA/AML + OFAC + FinCEN + FINRA
- Integration: customer DB, 3 identity verification vendors, 2 sanctions screening vendors, document management
- Escalation: all sanctions hits, all identity verification failures, high-risk jurisdictions

Intellios recognizes the high-risk nature. The Intake Engine probes for:
- Which identity verification methods are acceptable?
- Which sanctions lists must be screened?
- What beneficial ownership documentation is required by jurisdiction?
- How are verification failures escalated?
- What retention policies apply?

The Generation Engine produces an ABP with:
- Integrated workflows for identity verification, sanctions screening, and beneficial ownership collection
- Rules for acceptable verification methods (government ID, utility bill, credit report)
- Automatic screening against OFAC, EU, UN lists
- Escalation rules: all positive hits, all verification failures, high-risk jurisdictions (e.g., FATF gray-list)
- Retention policies per jurisdiction (3-7 years depending on location)
- Audit logging of all identity decisions

The Governance Validator checks:
- **KYC Standards Policy:** "All customers must pass identity verification using acceptable methods." ✓
- **Sanctions Screening Policy:** "All customers must be screened against OFAC, EU, and UN lists." ✓
- **AML Policy:** "All positive sanctions hits must escalate immediately to compliance officers." ✓
- **Data Minimization Policy:** "Government IDs and PII must be retained only for required duration." ✓
- **Audit Policy:** "All KYC/AML decisions must be logged with full context." ✓

The agent is approved. Intellios generates:
- **Compliance Decision Log** — Complete record of KYC/AML determinations
- **Sanctions Screening Report** — Positive hits, false positives, high-risk jurisdictions
- **Data Retention Schedule** — Documenting which data is retained, for how long, and per which regulations

---

## 5. Customer Service Chatbot

### The Scenario

A large bank wants to deploy a customer service chatbot that answers routine inquiries (account balances, transaction history, password resets, product information) and escalates complex issues to human agents. The chatbot must maintain brand consistency, handle sensitive data securely, and comply with consumer protection regulations.

### Key Characteristics

- **Deployment Type:** Customer-facing (public website, mobile app)
- **Data Sensitivity:** Regulated (access to account data, transaction history)
- **Integration Scope:** Core banking system (account lookup), authentication system, knowledge base, human agent queue
- **Regulatory Scope:** GLBA (privacy), UDAP (Unfair or Deceptive Acts or Practices), FCRA (Fair Credit Reporting Act if credit-related), SOX (audit trail)
- **Risk Classification:** Medium (high volume, manages PII, but limited financial decision-making)

### Governance Requirements

1. **Brand Consistency & Truthfulness** — Customer communications must be brand-compliant and accurate. The chatbot must not make promises it cannot keep or provide misleading information.

2. **PII Protection (GLBA)** — The chatbot accesses sensitive account data. It must implement:
   - Customer authentication (verify identity before returning account data)
   - Redaction of sensitive data in logs
   - Audit logging of all account access
   - Retention policies for interaction logs

3. **Consumer Protection (UDAP)** — The chatbot must not engage in unfair or deceptive practices:
   - No hidden fees or unclear terms
   - Clear escalation path when human assistance is needed
   - No pressure or aggressive upselling
   - Truthful representations of products and services

4. **Complaint Escalation** — If a customer complains, the chatbot must route the complaint to a complaint management system and trigger human review.

5. **Audit Trail** — All interactions must be logged for compliance review and customer dispute resolution.

### Intellios Solution

The bank's customer experience team specifies:
- Deployment type = customer-facing, high volume
- Data sensitivity = regulated
- Regulatory scope = GLBA + UDAP + SOX
- Integration: core banking, authentication, knowledge base, agent queue
- Brand compliance: financial guidance must reference official bank policies
- Escalation: account modification requests, complaints, high-risk inquiries

Intellios recognizes the balance between automation and safety. The Intake Engine probes for:
- What capabilities can the chatbot perform autonomously? (FAQ answers, account lookup, password reset)
- What requires escalation to humans? (account modifications, complaints, complex financial advice)
- What brand guidelines must be enforced?
- How is customer authentication handled?
- What PII redaction rules apply?

The Generation Engine produces an ABP with:
- Allowed capabilities: FAQ, account lookup, password reset, basic product information
- Denied actions: account modifications without human approval, investment advice, unsolicited cross-selling
- Escalation rules: customer complains, requests account modifications, asks for financial advice
- Brand compliance rules: responses must match approved knowledge base, avoid jargon, use consistent tone
- PII redaction: sensitive account numbers and transaction details redacted in logs
- Audit logging: all interactions logged with customer identity and intent

The Governance Validator checks:
- **Brand Compliance Policy:** "All customer communications must reference approved knowledge base." ✓
- **GLBA Policy:** "All account lookups must be authenticated and logged." ✓
- **UDAP Policy:** "Chatbot must not make deceptive claims or engage in unfair practices." ✓
- **Escalation Policy:** "Complaints and account modification requests must escalate to human agents." ✓
- **Audit Policy:** "All interactions must be logged for dispute resolution." ✓

The agent is approved. Intellios generates:
- **GLBA Compliance Record** — PII handling, audit logging, customer authentication
- **UDAP Compliance Record** — Brand compliance, truthfulness verification, escalation paths
- **Interaction Audit Log** — All customer conversations (with PII redacted) for dispute resolution

---

## 6. Portfolio Rebalancing Agent

### The Scenario

A wealth management firm wants to deploy an agent that autonomously rebalances client portfolios to maintain target asset allocations. The agent receives market data, calculates drift from target allocations, and proposes or executes rebalancing trades. It must operate under fiduciary duty constraints and transaction limits.

### Key Characteristics

- **Deployment Type:** Automated (autonomously executes trades)
- **Data Sensitivity:** Highly sensitive (client account balances, investment positions, performance data)
- **Integration Scope:** Portfolio management system (read positions, execute trades), market data feeds (real-time pricing), client master database, trading execution system
- **Regulatory Scope:** SEC (fiduciary duty, suitability), FINRA (best execution, suitability), SOX (audit trail), GLBA (privacy)
- **Risk Classification:** Critical (manages client assets, executes financial transactions, direct fiduciary impact)

### Governance Requirements

1. **Fiduciary Duty Constraints** — The agent must act in the client's best interest:
   - Rebalancing must be aligned with the client's stated risk tolerance and investment objectives
   - Trading costs (commissions, market impact) must be justified by the benefit of rebalancing
   - The agent cannot trade for its own benefit or the firm's benefit at the client's expense

2. **Transaction Limits** — The agent must operate within defined limits:
   - Maximum portfolio drift before rebalancing is triggered
   - Maximum transaction size (to avoid market impact)
   - Maximum frequency of rebalancing (to avoid excessive trading)
   - Excluded securities (no trading in certain securities)

3. **Best Execution** — The agent must achieve best execution:
   - Orders must be placed with the best-available prices
   - Execution venues must be competitively selected
   - No trading ahead of client orders

4. **Audit Trail & Transparency** — Every trade must be logged with reasoning:
   - Portfolio allocation before and after rebalancing
   - Why rebalancing was triggered
   - What trades were executed
   - What alternative strategies were considered and rejected

5. **Client Approval & Consent** — Depending on the engagement model, the agent may need to:
   - Propose rebalancing and wait for client approval
   - Execute rebalancing and notify the client post-execution
   - Operate fully autonomously with pre-approved parameters

### Intellios Solution

The wealth management firm specifies:
- Deployment type = automated, executes trades
- Data sensitivity = highly sensitive
- Regulatory scope = SEC + FINRA + SOX + GLBA
- Integration: portfolio management, market data, trading execution
- Fiduciary constraints: rebalance only when drift exceeds 5%, no individual position drift >10%
- Transaction limits: max $5M per order, max 2x rebalancing per year per portfolio, excluded securities list
- Client approval model: pre-approved parameters with post-execution notification

Intellios recognizes the fiduciary responsibility. The Intake Engine probes for:
- What is the client's target asset allocation and risk tolerance?
- What are the maximum drift thresholds before rebalancing is triggered?
- What are the maximum transaction sizes?
- Which securities are excluded from trading?
- How frequently can the agent rebalance?
- What happens if the agent encounters an unusual market condition?

The Generation Engine produces an ABP with:
- Fiduciary duty constraints embedded in the decision logic
- Target allocation and drift thresholds
- Transaction size limits and frequency caps
- Excluded securities list
- Best execution rules (price checking, venue selection)
- Escalation rules: unusual market conditions, large positions, regulatory events
- Audit logging: all rebalancing decisions, trades executed, and reasoning

The Governance Validator checks:
- **Fiduciary Policy:** "Rebalancing logic must align with client investment objectives." ✓
- **Transaction Limits Policy:** "Rebalancing must respect maximum drift, transaction size, and frequency limits." ✓
- **Best Execution Policy:** "All orders must be executed at best-available prices." ✓
- **Audit Policy:** "All trades must be logged with reasoning and approval chain." ✓
- **Client Notification Policy:** "Client must be notified of rebalancing actions post-execution." ✓

The agent is approved. Intellios generates:
- **Fiduciary Compliance Record** — Documentation of fiduciary duty constraints and client objective alignment
- **Trade Audit Log** — Complete record of all rebalancing trades with reasoning and execution details
- **Best Execution Report** — Verification that execution prices met best-execution standards
- **Client Notification Schedule** — Log of client notifications for all rebalancing actions

---

## Comparison Matrix

| Scenario | Deployment Type | Data Sensitivity | Risk Class | Key Regulatory Driver | Automation Scope |
|---|---|---|---|---|---|
| Customer Advisory | Customer-facing | Regulated | Medium-High | SR 11-7, GLBA | FAQ + Application Status |
| Risk Analysis | Internal | Highly Sensitive | High | SOX, Basel III | Data Pull + Calculation + Escalation |
| Fraud Detection | Automated | Highly Sensitive | Critical | BSA/AML, FinCEN | Real-time Scoring + Escalation |
| KYC/AML | Internal | Extremely Sensitive | Critical | BSA/AML, OFAC | Identity Verification + Sanctions Screening |
| Customer Service | Customer-facing | Regulated | Medium | GLBA, UDAP | FAQ + Account Lookup + Escalation |
| Portfolio Rebalancing | Automated | Highly Sensitive | Critical | SEC, FINRA | Autonomous Trade Execution + Audit |

---

## Cross-Cutting Governance Patterns

Across all six scenarios, several governance patterns emerge:

### 1. **Escalation is a First-Class Control**
Every agent, regardless of scenario, must have explicit escalation paths for:
- Decisions outside the agent's authority (customer modifications, complaints, unusual market conditions)
- Regulatory thresholds (high-risk transactions, policy violations)
- Uncertainty (ambiguous cases where the agent confidence is low)

Intellios enforces escalation rules deterministically. If the agent detects a scenario that requires escalation, the ABP explicitly specifies where it routes and who reviews it.

### 2. **Audit Logging is Mandatory**
All six scenarios require comprehensive audit logging for regulatory review. Intellios bakes audit logging into the ABP: every interaction, decision, and data access is logged with timestamp, user context, and justification. Logging rules are enforced by the Governance Validator, not left to ad-hoc implementation.

### 3. **PII Handling is Contextual**
The level of PII protection varies:
- Customer Advisory and Service agents must redact sensitive data in logs (GLBA)
- Risk Analysis agents must ring-fence proprietary data (Basel III)
- KYC/AML agents must minimize retention (data minimization principle)
- Portfolio agents must audit all client asset access (fiduciary duty)

Intellios captures these contextual requirements in the ABP and validates them against enterprise policies.

### 4. **Regulatory Framework References are Explicit**
Each agent ABP explicitly references the regulations it must comply with (SR 11-7, BSA/AML, GLBA, SOX, FINRA, SEC, etc.). This serves multiple purposes:
- Governance policies can reference specific regulations
- Compliance reports can map evidence to regulatory requirements
- Auditors and regulators can see exactly what framework the agent was designed to satisfy

---

## Getting Started

To deploy any of these agents in your financial institution:

1. **Identify Your Use Case** — Which of the six scenarios matches your business need?
2. **Run Intake** — Start an Intellios intake session and describe your requirements. The system will probe for regulatory scope, data sensitivity, and integration needs automatically.
3. **Review the Generated ABP** — The Generation Engine produces a comprehensive blueprint with governance policies, audit logging, and escalation rules already configured.
4. **Run Governance Validation** — The Governance Validator checks your ABP against your enterprise policies. If violations exist, remediation suggestions appear.
5. **Human Review & Approval** — Compliance, risk, and business stakeholders review the ABP and approve deployment.
6. **Deploy & Monitor** — The agent is deployed to your runtime (AWS AgentCore, Azure AI Foundry, or on-premise). Intellios generates compliance evidence automatically.

---

## See Also

- [Agent Onboarding Playbook](./agent-onboarding-playbook.md) — Step-by-step guide for deploying agents
- [SR 11-7 Compliance Mapping](../05-governance-compliance/sr-11-7-mapping.md) — How Intellios satisfies Federal Reserve Model Risk Management guidance
- [Governance-as-Code](../03-core-concepts/governance-as-code.md) — Policy expression language for compliance rules
- [Three-Pillar ROI Framework](../09-roi-business-case/three-pillar-roi-framework.md) — Financial case for Intellios in financial services

---

*Next: [Agent Onboarding Playbook](./agent-onboarding-playbook.md)*
