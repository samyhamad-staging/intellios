---
id: 06-002
title: 'Insurance Scenarios: Governance Patterns for Regulated Agents'
slug: insurance-scenarios
type: concept
audiences:
- product
- compliance
status: published
version: 1.0.0
platform_version: 1.0.0
created: '2026-04-05'
updated: '2026-04-05'
author: Intellios
reviewers: []
tags:
- insurance
- use-cases
- governance
- compliance
- regulations
prerequisites:
- 03-001
- 03-002
- 03-005
related:
- 06-003
- 05-010
- 03-007
next_steps:
- 06-002
- 05-010
feedback_url: https://feedback.intellios.ai/kb
tldr: 'Insurance enterprises deploy AI agents for claims processing, underwriting,
  policy recommendations, fraud detection, and customer onboarding. Each agent must
  comply with state insurance regulations, NAIC guidelines, and insurer-specific governance
  policies. Intellios patterns ensure agents capture audit evidence, enforce approval
  workflows, and remain compliant throughout their lifecycle.

  '
---


# Insurance Scenarios: Governance Patterns for Regulated Agents

> **TL;DR:** Insurance enterprises deploy AI agents for claims processing, underwriting, policy recommendations, fraud detection, and customer onboarding. Each agent must comply with state insurance regulations, NAIC guidelines, and insurer-specific governance policies. Intellios patterns ensure agents capture audit evidence, enforce approval workflows, and remain compliant throughout their lifecycle.

## Overview

The insurance industry is highly regulated. State insurance departments, the National Association of Insurance Commissioners (NAIC), and internal audit and compliance teams require documented governance over all decision-making systems—including AI agents. Unlike generic software systems, insurance agents often make or influence decisions that have direct financial or coverage implications for customers.

This article describes five common insurance use cases, the regulatory requirements that govern each, and the Intellios governance patterns that satisfy them. Whether you are deploying a new agent or reviewing an existing one, these scenarios provide reference patterns that encode best practices.

---

## 1. Claims Processing Agent

### Scenario

An insurance carrier deploys an AI agent to automate initial claims intake and routing. The agent:

- Accepts claim submissions from customers (online form, mobile app, API).
- Extracts claim details (coverage type, incident date, loss amount, supporting documents).
- Validates claims against policy terms and conditions.
- Routes claims to appropriate human adjusters based on complexity and loss amount.
- Generates a claims ticket with recommended next steps.

### Governance Requirements

**Regulatory Drivers:**
- **State Insurance Regulations** — Most states require that initial claim handling follow documented procedures. Any automated system must log its decisions and escalation rules.
- **NAIC Insurance Data Security Model Law** — If the agent accesses PII (policyholder names, addresses, social security numbers, medical history), it must enforce data security and access controls.
- **Fair Claims Practices Act** — All states enforce this statute, which requires prompt, fair claim handling. An AI agent cannot introduce unreasonable delays or bias in claim decisions.
- **Americans with Disabilities Act (ADA)** — If the agent is customer-facing, it must be accessible (screen reader compatible, clear language, accommodation for alternative inputs).

**Internal Governance Patterns:**
- **Audit Logging** — Every claim decision must be logged, including what data was evaluated, what rules were applied, and why the claim was routed to a specific adjuster.
- **Approval Thresholds** — Claims above a certain loss threshold may require human approval before routing. The agent must enforce these thresholds.
- **Bias Monitoring** — The insurance regulator expects carriers to monitor whether the agent treats different demographic groups fairly. Agents must track demographic data (if permissible) and flag suspicious patterns.
- **Human Escalation** — Claims with missing information, ambiguous coverage terms, or unusual circumstances must escalate to humans automatically.

### Intellios Implementation

**ABP Structure:**

```yaml
agent:
  id: "claims-intake-bot-v1"
  name: "Claims Intake Agent"
  description: "Automates initial claim intake, validation, and routing"
  deployment_type: "customer-facing"
  data_sensitivity: "regulated"

capabilities:
  tools:
    - name: "submit_claim"
      description: "Accept claim form submission"
      access_level: "public"
    - name: "validate_coverage"
      description: "Check policy terms against claim details"
      access_level: "internal_only"
    - name: "route_claim"
      description: "Assign claim to appropriate adjuster queue"
      access_level: "internal_only"

constraints:
  denied_actions:
    - "Approve or deny claims without human review"
    - "Modify or delete claim records"
    - "Access policyholder health records"
  rate_limits:
    - "max 1000 claim submissions per hour"
    - "max 10 claims per policyholder per day"

governance:
  applicable_regulations:
    - "NAIC Insurance Data Security Model Law"
    - "Fair Claims Practices Act (state-specific)"
    - "ADA Accessibility Requirements"
  audit_logging:
    enabled: true
    fields: ["claim_id", "decision_path", "coverage_validation_result", "assigned_adjuster", "timestamp"]
    retention_days: 2555  # 7 years per state insurance regulations
  approval_thresholds:
    - "Claims > $50,000 require manager approval before routing"
  escalation_rules:
    - "Missing required documentation → escalate to human"
    - "Policy ambiguity → escalate to coverage specialist"
    - "Claim outside normal parameters → escalate to adjuster"
```

**Governance Policies:**

- **Claims Audit Policy** — Enforces that every claim submission generates an audit log entry with claim_id, decision_path, and assigned adjuster. Violations block deployment.
- **Data Security Policy** — Enforces that the agent does not retain PII beyond the claims processing workflow. Data must be redacted in logs within 24 hours.
- **Fair Handling Policy** — Enforces that escalation decisions are based on claim characteristics (coverage type, loss amount, complexity) and not on demographic data.
- **Human Oversight Policy** — Enforces that claims above $50,000 are routed to human review before final disposition.

---

## 2. Underwriting Assistant

### Scenario

An insurance company deploys an agent to assist underwriters in the application review process. The agent:

- Ingests customer applications (personal auto, homeowner, small business).
- Compares application data against underwriting guidelines.
- Flags risks (inconsistencies, missing information, policy exclusions).
- Recommends rate tiers based on risk factors.
- Prepares an underwriting summary for human underwriter review.

### Governance Requirements

**Regulatory Drivers:**
- **Unfair Discrimination Laws** — State insurance laws prohibit discrimination based on protected characteristics (race, color, religion, national origin, marital status, age, sexual orientation, and disability in many jurisdictions). Any underwriting system must avoid using prohibited proxies.
- **NAIC Model Laws on AI and Bias** — Some states are adopting NAIC guidelines that require insurers to test AI systems for disparate impact and maintain records of testing.
- **Underwriting File Retention** — Regulators expect underwriting files (including notes, recommendations, and decisions) to be retained for a period specified by state law (often 3-5 years).
- **Fair Credit Reporting Act (FCRA)** — If the agent uses credit data or consumer reports, it must comply with FCRA disclosure and dispute procedures.

**Internal Governance Patterns:**
- **Bias Testing & Monitoring** — The agent must be tested for disparate impact on protected classes before deployment. Ongoing monitoring must flag if the agent's recommendation patterns diverge from historical baselines.
- **Transparency & Explainability** — Underwriters need to understand why the agent recommended a particular rate or flagged a risk. The agent must provide clear, human-readable explanations.
- **Override Tracking** — When underwriters disagree with the agent's recommendation, the system must log the override and reason.
- **Regulatory Reporting** — If state law requires reporting on AI usage in underwriting, the agent must generate audit trails that support this reporting.

### Intellios Implementation

**ABP Structure:**

```yaml
agent:
  id: "underwriting-assistant-v1"
  name: "Underwriting Assistant"
  description: "Analyzes applications and recommends underwriting actions"
  deployment_type: "internal_only"
  data_sensitivity: "highly_regulated"

capabilities:
  tools:
    - name: "analyze_application"
      description: "Compare application data against underwriting guidelines"
      access_level: "internal_only"
    - name: "compare_risk_factors"
      description: "Identify deviations from baseline risk profiles"
      access_level: "internal_only"
    - name: "recommend_rate_tier"
      description: "Suggest rate tier based on risk analysis"
      access_level: "internal_only"

constraints:
  excluded_attributes:
    - "race, color, religion, national origin, marital status, age, sexual orientation, disability"
  denied_actions:
    - "Make final underwriting decisions without human review"
    - "Access personal health information without explicit authorization"
    - "Modify application records"
  rate_limits:
    - "max 500 applications analyzed per day"

governance:
  applicable_regulations:
    - "State Unfair Discrimination Laws"
    - "NAIC AI and Bias Guidelines"
    - "Fair Credit Reporting Act (if applicable)"
  bias_monitoring:
    enabled: true
    protected_classes: ["race", "color", "religion", "national_origin", "marital_status", "age", "sexual_orientation", "disability"]
    testing_frequency: "quarterly"
  explainability:
    required: true
    explanation_format: "structured_summary"
  audit_logging:
    enabled: true
    fields: ["application_id", "recommendation", "risk_factors", "underwriter_decision", "override_reason", "timestamp"]
    retention_days: 1825  # 5 years
```

**Governance Policies:**

- **Bias Prevention Policy** — Enforces that the agent does not use protected attributes (directly or as proxies) in recommendations. Tests disparate impact before deployment.
- **Explainability Policy** — Enforces that every recommendation includes human-readable reasoning about which risk factors influenced the decision.
- **Override Logging Policy** — Enforces that when an underwriter overrides the agent's recommendation, the reason is logged and tracked for trend analysis.
- **Data Access Policy** — Enforces that the agent only accesses application data and underwriting guidelines, not personal health records or credit reports without explicit authorization.

---

## 3. Policy Recommendation Agent

### Scenario

An insurance company deploys a customer-facing agent to help prospective customers find appropriate policy options. The agent:

- Gathers customer information (lifestyle, risk profile, coverage needs).
- Recommends policy types and coverage limits based on the customer's situation.
- Explains key terms, exclusions, and trade-offs between policies.
- Routes qualified leads to sales agents.

### Governance Requirements

**Regulatory Drivers:**
- **Suitability & Recommendations Laws** — Some states (especially those with licensed agent laws) require that policy recommendations be "suitable" for the customer's needs. If the AI agent is held to the same standard as a human agent, it must comply.
- **Disclosure Requirements** — If the agent recommends specific policies, it must disclose material terms (coverage limits, exclusions, rates, renewal terms).
- **Consumer Protection Laws** — The agent cannot make misleading statements about coverage or create unreasonable expectations.
- **Accessibility & Plain Language** — The agent must communicate in clear, accessible language suitable for a broad customer base, not insurance jargon.

**Internal Governance Patterns:**
- **Conflict of Interest Management** — The agent must recommend policies based on customer needs, not on which policies generate the highest commission. Management must document that recommendations are conflict-free.
- **Lead Handoff Tracking** — When the agent routes a prospect to a sales agent, the handoff must be logged (prospect ID, recommended policies, sales agent assigned).
- **Complaint Tracking** — If customers complain that the agent's recommendations were unsuitable or misleading, complaints must be logged and reviewed.
- **Regular Policy Updates** — As policy offerings, rates, and rules change, the agent's knowledge must be updated. The ABP must version these updates.

### Intellios Implementation

**ABP Structure:**

```yaml
agent:
  id: "policy-recommendation-bot-v1"
  name: "Policy Recommendation Agent"
  description: "Helps customers find suitable insurance policies"
  deployment_type: "customer-facing"
  data_sensitivity: "personal_data"

capabilities:
  tools:
    - name: "gather_customer_profile"
      description: "Collect lifestyle and risk profile information"
      access_level: "public"
    - name: "recommend_policies"
      description: "Suggest policy types and coverage limits"
      access_level: "internal_only"
    - name: "explain_coverage"
      description: "Answer questions about policy terms, exclusions, and rates"
      access_level: "public"
    - name: "route_to_sales"
      description: "Transfer qualified prospect to sales agent"
      access_level: "internal_only"

constraints:
  denied_actions:
    - "Guarantee coverage or specific rates"
    - "Modify policy terms"
    - "Access competitor pricing data"
    - "Recommend policies based on commission value"
  rate_limits:
    - "max 100 concurrent conversations"

governance:
  applicable_regulations:
    - "State Suitability & Recommendation Laws (where applicable)"
    - "Consumer Protection Laws"
    - "Accessibility Requirements (WCAG 2.1 AA)"
  recommendation_standards:
    - "Recommendations must be based on customer profile and stated needs"
    - "Agents must explain why each policy is suitable"
    - "Agents must disclose material terms and exclusions"
  audit_logging:
    enabled: true
    fields: ["prospect_id", "profile_data", "recommendations_offered", "customer_questions", "sales_handoff", "timestamp"]
    retention_days: 1095  # 3 years
  complaint_tracking:
    enabled: true
    escalation_threshold: "unsuitable_recommendation"
```

**Governance Policies:**

- **Suitability Policy** — Enforces that recommendations are based on the customer's stated needs and situation, not on policy margins or commissions.
- **Disclosure Policy** — Enforces that every recommendation includes explanation of coverage limits, exclusions, and rates.
- **Accessibility Policy** — Enforces that the agent communicates in clear, plain language suitable for a general audience.
- **Complaint Escalation Policy** — Enforces that customer complaints about unsuitable recommendations are logged and escalated to management.

---

## 4. Fraud Investigation Agent

### Scenario

An insurance company deploys an agent to assist claims investigators in detecting and analyzing potentially fraudulent claims. The agent:

- Ingests claim data, policyholder history, and third-party data (public records, social media signals, previous claims).
- Identifies patterns consistent with fraud (policy timing, claim frequency, organized fraud rings).
- Generates investigation leads and recommends priority cases.
- Summarizes evidence for investigators to review and act on.

### Governance Requirements

**Regulatory Drivers:**
- **Privacy Laws** — If the agent accesses social media data or public records, it must comply with privacy laws and fair information practices. Some states restrict the use of social media in insurance decisions.
- **Fair Claims Practices Act** — Claims cannot be denied based solely on automated fraud scoring. Customers have a right to challenge fraud determinations.
- **Anti-Discrimination Laws** — Fraud detection models can inadvertently discriminate if they rely on proxies for protected characteristics. The agent must avoid these proxies.
- **Insurance Fraud Statutes** — Most states define insurance fraud and set criminal penalties. The agent's evidence must be collected in ways that support prosecution or civil enforcement.

**Internal Governance Patterns:**
- **Human Review** — No claim can be denied for fraud without human investigator review and approval. The agent is a tool for investigators, not a decision-maker.
- **Evidence Standards** — Evidence collected by the agent must be admissible in legal proceedings (proper chain of custody, legal data sources).
- **Suspect Notification** — If a claim is declined or delayed due to fraud suspicion, the customer must be notified and given opportunity to respond.
- **Bias Monitoring** — The agent's fraud scoring must be tested to ensure it does not disproportionately flag claims from protected groups.

### Intellios Implementation

**ABP Structure:**

```yaml
agent:
  id: "fraud-investigation-agent-v1"
  name: "Fraud Investigation Assistant"
  description: "Analyzes claims for fraud risk indicators and generates investigation leads"
  deployment_type: "internal_only"
  data_sensitivity: "highly_regulated"

capabilities:
  tools:
    - name: "analyze_claim_patterns"
      description: "Identify unusual claim frequency or timing"
      access_level: "internal_only"
    - name: "cross_reference_claims"
      description: "Find related claims or policyholder connections"
      access_level: "internal_only"
    - name: "generate_risk_score"
      description: "Score claim for fraud risk based on patterns"
      access_level: "internal_only"
    - name: "summarize_evidence"
      description: "Prepare investigation summary for investigator review"
      access_level: "internal_only"

constraints:
  data_sources:
    - "Only claims data, policyholder history, and legally obtained third-party data"
    - "No unauthorized access to social media or private records"
  denied_actions:
    - "Deny or delay claims without investigator approval"
    - "Publicly disclose fraud investigations"
    - "Make assumptions about identity or criminal intent"
  rate_limits:
    - "max 1000 claims analyzed per day"

governance:
  applicable_regulations:
    - "State Insurance Fraud Statutes"
    - "Fair Claims Practices Act"
    - "Anti-Discrimination Laws"
    - "Privacy Laws (state-specific)"
  human_review_requirement:
    enabled: true
    trigger: "All fraud determinations require investigator approval"
  evidence_standards:
    - "All data sources must be documented for legal admissibility"
    - "Chain of custody must be maintained"
  bias_monitoring:
    enabled: true
    protected_classes: ["race", "color", "religion", "national_origin", "age", "disability"]
    testing_frequency: "quarterly"
  audit_logging:
    enabled: true
    fields: ["claim_id", "risk_score", "evidence_summary", "investigator_id", "disposition", "timestamp"]
    retention_days: 2555  # 7 years
```

**Governance Policies:**

- **Human Approval Policy** — Enforces that no claim is declined or delayed for fraud without human investigator review and explicit approval.
- **Evidence Quality Policy** — Enforces that all data used in fraud scoring comes from documented, legally obtained sources.
- **Bias Prevention Policy** — Enforces that fraud scoring does not disproportionately flag claims from protected groups.
- **Transparency Policy** — Enforces that customers are notified if their claim is questioned for fraud and given opportunity to respond.

---

## 5. Customer Onboarding Agent

### Scenario

An insurance company deploys an agent to automate customer onboarding and KYC (Know Your Customer) compliance. The agent:

- Collects customer information (name, address, date of birth, tax ID, beneficial ownership for business customers).
- Performs AML/KYC screening against regulatory databases.
- Validates identity through document verification (license, passport).
- Creates customer profile and triggers underwriting if needed.

### Governance Requirements

**Regulatory Drivers:**
- **FinCEN AML/KYC Rules** — All insurance companies are subject to Bank Secrecy Act (BSA) / AML rules. They must verify customer identity, perform suspicious activity monitoring, and report currency transactions above $10,000.
- **NIST Cybersecurity Framework** — KYC data is highly sensitive. Systems must protect customer PII with strong access controls and encryption.
- **Know Your Customer (KYC) Best Practices** — Industry standards require that customer identity be verified before coverage is issued.
- **State Insurance Regulations** — Some states have specific requirements for customer data retention and privacy.

**Internal Governance Patterns:**
- **Verified Identity Requirement** — The agent cannot issue a policy or accept premium without verified customer identity.
- **AML Screening** — Every customer must be screened against OFAC and other regulatory databases. If a match is found, the case must escalate to compliance.
- **Document Verification** — Identity documents must be verified through a third-party document verification service.
- **Data Minimization** — The agent should only collect data necessary for underwriting and AML compliance, not additional PII.
- **Audit Trail** — Complete audit trail of KYC activities must be maintained for regulatory inspection.

### Intellios Implementation

**ABP Structure:**

```yaml
agent:
  id: "customer-onboarding-agent-v1"
  name: "Customer Onboarding Agent"
  description: "Automates KYC verification and customer profile creation"
  deployment_type: "customer-facing"
  data_sensitivity: "highly_regulated"

capabilities:
  tools:
    - name: "collect_customer_info"
      description: "Gather customer identity and contact information"
      access_level: "public"
    - name: "verify_identity_document"
      description: "Verify driver's license, passport, or other ID"
      access_level: "internal_only"
    - name: "perform_aml_screening"
      description: "Screen customer against OFAC and AML databases"
      access_level: "internal_only"
    - name: "create_customer_profile"
      description: "Create customer record in core system"
      access_level: "internal_only"
    - name: "initiate_underwriting"
      description: "Route customer to underwriting if needed"
      access_level: "internal_only"

constraints:
  data_collection:
    - "Collect only: name, address, DOB, SSN/tax ID, beneficial ownership info (if applicable)"
    - "Do not collect: health info, financial account details, beyond what is necessary for KYC"
  denied_actions:
    - "Issue policy without verified identity"
    - "Skip AML screening"
    - "Modify customer profile without audit trail"
    - "Disclose customer PII to third parties"
  rate_limits:
    - "max 500 onboarding sessions per hour"

governance:
  applicable_regulations:
    - "Bank Secrecy Act / AML / KYC Rules (FinCEN)"
    - "OFAC Sanctions Screening"
    - "NIST Cybersecurity Framework (if applicable)"
    - "State Insurance Regulations"
  aml_screening:
    enabled: true
    databases: ["OFAC SDN", "FinCEN sanctions", "State watchlists"]
    escalation_threshold: "potential_match"
  identity_verification:
    required: true
    methods: ["document_verification", "knowledge_based_verification"]
  data_retention:
    kyc_records_retention_days: 1095  # 3 years
    pii_encryption: "AES-256"
  audit_logging:
    enabled: true
    fields: ["customer_id", "identity_verification_result", "aml_screening_result", "profile_created", "timestamp"]
    retention_days: 2555  # 7 years
```

**Governance Policies:**

- **Verified Identity Policy** — Enforces that no policy or premium can be accepted without verified customer identity.
- **AML Screening Policy** — Enforces that every customer is screened against OFAC and other regulatory databases before profile creation.
- **Data Minimization Policy** — Enforces that the agent collects only necessary KYC data, not additional PII.
- **Encryption Policy** — Enforces that all customer PII is encrypted at rest and in transit.
- **Audit Trail Policy** — Enforces that all KYC activities are logged with timestamp, result, and triggering event for regulatory inspection.

---

## Common Governance Patterns Across Insurance Agents

### 1. Audit Logging & Data Retention

All insurance agents must generate comprehensive audit logs. Key fields include:

- **Decision/Action** — What did the agent do or recommend?
- **Data Evaluated** — What inputs influenced the decision?
- **Decision Path** — What rules or logic led to this outcome?
- **Timestamp** — When did this occur?
- **Operator/Escalation** — If human review occurred, who was involved?
- **Reason for Override** — If a human overrode the agent, why?

Retention periods vary by regulation, but typically 3-7 years. Intellios ABPs specify retention periods in the governance section.

### 2. Human Approval Workflows

Insurance agents should never make final decisions alone. Governance patterns include:

- **Automatic Escalation** — Claims above a threshold, ambiguous cases, or high-risk determinations automatically escalate to a human.
- **Override Tracking** — When humans disagree with the agent, the reason is logged for trend analysis.
- **Approval Requirements** — For sensitive actions (issuing a new agent, changing governance rules, deploying to production), explicit approval from designated roles (compliance officer, chief risk officer) is required.

### 3. Bias Monitoring & Fairness Testing

Insurance regulators increasingly expect carriers to monitor AI systems for bias. Governance patterns include:

- **Pre-Deployment Testing** — Before launch, test the agent's recommendations or decisions across protected classes (race, gender, age, disability). Flag disparate impact.
- **Ongoing Monitoring** — After deployment, continuously monitor whether the agent's outcomes diverge by protected class. Alert if drift is detected.
- **Bias Remediation** — If bias is detected, pause the agent and investigate. Update the model or rules, re-test, and re-deploy.

### 4. Explainability & Transparency

Customers and regulators expect to understand why the agent made a decision. Governance patterns include:

- **Human-Readable Explanations** — The agent must explain its recommendations in plain language, not just a score or binary decision.
- **Reason Codes** — Decisions are tagged with reason codes (e.g., "high_loss_amount," "policy_exclusion," "missing_documentation") that humans can understand and act on.
- **Appeal Mechanisms** — Customers can challenge decisions. The appeal process must be documented in the ABP.

---

## Next Steps

Now that you understand how Intellios governance patterns apply to insurance, you can:

1. **Map Your Agents** — Identify existing or planned agents and categorize them by type (claims, underwriting, recommendations, fraud, onboarding).
2. **Identify Regulatory Drivers** — For each agent, list applicable regulations (state laws, NAIC guidelines, internal policies).
3. **Build Governance Policies** — Using the patterns above, create governance-as-code policies that your agents must satisfy.
4. **Plan Intake Sessions** — Use the Intellios Design Studio to launch intake sessions for your agents, specifying their regulatory scope and governance requirements.
5. **Deploy & Monitor** — Deploy agents through the Intellios control plane. Monitor bias, audit logs, and human overrides. Update agents as regulations or business needs change.

For detailed guidance, see:

- **[Governance Policy Guide](../05-governance-compliance/policy-authoring-guide.md)** — Learn how to express governance rules in Intellios policy language.
- **[Compliance Evidence Chain](../03-core-concepts/compliance-evidence-chain.md)** — Understand how Intellios generates audit trails and compliance documentation.
- **[Agent Lifecycle](../03-core-concepts/agent-lifecycle-states.md)** — Understand state transitions and governance gates.

---

*See also: [Healthcare Scenarios](healthcare-scenarios.md), [Governance-as-Code](../03-core-concepts/governance-as-code.md), [Agent Blueprint Package](../03-core-concepts/agent-blueprint-package.md)*

*Next: [Healthcare Scenarios](healthcare-scenarios.md)*
