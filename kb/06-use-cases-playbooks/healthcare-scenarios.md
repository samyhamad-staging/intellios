---
id: 06-003
title: 'Healthcare Scenarios: Governance Patterns for Clinical and Operational Agents'
slug: healthcare-scenarios
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
- healthcare
- use-cases
- governance
- compliance
- hipaa
- clinical-ai
prerequisites:
- 03-001
- 03-002
- 03-005
related:
- 06-002
- 05-010
- 03-007
next_steps:
- 06-003
- 05-010
feedback_url: https://feedback.intellios.ai/kb
tldr: 'Healthcare organizations deploy AI agents for clinical decision support, patient
  scheduling, medical coding, prior authorization, and patient education. Each agent
  must comply with HIPAA, FDA regulations (for clinical decision support), state medical
  practice acts, and internal safety governance. Intellios patterns ensure agents
  maintain patient privacy, support human decision-makers (not replace them), generate
  audit evidence, and remain safe and compliant throughout their lifecycle.

  '
---


# Healthcare Scenarios: Governance Patterns for Clinical and Operational Agents

> **TL;DR:** Healthcare organizations deploy AI agents for clinical decision support, patient scheduling, medical coding, prior authorization, and patient education. Each agent must comply with HIPAA, FDA regulations (for clinical decision support), state medical practice acts, and internal safety governance. Intellios patterns ensure agents maintain patient privacy, support human decision-makers (not replace them), generate audit evidence, and remain safe and compliant throughout their lifecycle.

## Overview

Healthcare is among the most heavily regulated industries in the world. The Health Insurance Portability and Accountability Act (HIPAA), the FDA's emerging AI/ML guidance, state medical boards, and health insurers all govern how AI is used in healthcare settings. Unlike less-regulated industries, healthcare AI agents that influence clinical decisions or touch patient data require rigorous governance, extensive documentation, and demonstrated safety.

This article describes five common healthcare use cases, the regulatory framework that governs each, and the Intellios governance patterns that satisfy them. Whether you are deploying a clinical decision support agent or a patient-facing chatbot, these scenarios provide reference patterns.

---

## 1. Clinical Decision Support Agent

### Scenario

A hospital deploys an AI agent to assist physicians in clinical decision-making. The agent:

- Ingests patient data (history, labs, imaging, medications, vital signs).
- Recommends diagnostic tests or treatment pathways based on clinical guidelines and evidence-based protocols.
- Identifies potential drug interactions or contraindications.
- Suggests specialist referrals based on patient presentation.
- Generates a summary for the physician to review and decide whether to act on.

### Governance Requirements

**Regulatory Drivers:**
- **FDA Guidance on Clinical Decision Support Software** — The FDA regulates software that provides clinical decision support if it:
  - Provides recommendations that would lead to a clinical decision (diagnosis, treatment, monitoring).
  - Is intended to be used by healthcare providers in clinical settings.
  - Has a material impact on patient safety or outcomes.

  Clinical decision support agents must be validated before deployment, with documented evidence of effectiveness, safety, and accuracy. The FDA expects manufacturers to:
  - Define the intended use clearly.
  - Demonstrate that the agent performs as intended across diverse patient populations.
  - Provide clear warnings about limitations and when human override is necessary.
  - Generate audit trails of all recommendations and physician responses.

- **HIPAA Privacy & Security Rules** — Any agent that accesses, stores, or transmits Protected Health Information (PHI) must comply with HIPAA. This means:
  - Access controls: Only authorized users can access PHI through the agent.
  - Encryption: PHI must be encrypted at rest and in transit.
  - Audit logging: All access to PHI must be logged for regulatory audit.
  - Patient authorization: Patients must be informed that their data is used by AI systems.

- **State Medical Practice Acts** — State medical boards regulate the practice of medicine and, increasingly, the use of AI in clinical settings. Some states require that clinical decisions ultimately be made by licensed physicians, not delegated to AI.

- **Joint Commission & CMS Conditions of Participation** — If the hospital receives Medicare/Medicaid funding, it must comply with CMS requirements for clinical decision support systems, including:
  - Documented clinical governance and medical staff oversight.
  - Validation of clinical accuracy.
  - Training for all users.
  - Incident reporting and resolution procedures.

**Internal Governance Patterns:**
- **Physician Oversight** — Clinical decision support agents must support physician decision-making, not replace it. All recommendations must be reviewed and approved by a physician before patient care is modified.
- **Clinical Validation** — Before deployment, the agent must be validated by internal clinical leadership. Validation must demonstrate accuracy across patient populations and conditions.
- **Adverse Event Monitoring** — All adverse events (incorrect recommendations, missed diagnoses, harmful treatments) must be reported and investigated. Patterns must trigger agent updates or removal.
- **Knowledge Base Versioning** — Clinical guidelines, protocols, and evidence change over time. The agent's knowledge base must be versioned and updated regularly. Each update must be validated before deployment.

### Intellios Implementation

**ABP Structure:**

```yaml
agent:
  id: "clinical-decision-support-v1"
  name: "Clinical Decision Support Agent"
  description: "Assists physicians in clinical decision-making for [SPECIFIC_CONDITION]"
  deployment_type: "internal_only"
  data_sensitivity: "highly_regulated"
  fda_status: "regulated"
  intended_use: |
    Assists licensed physicians in evaluating [CONDITION] by recommending
    diagnostic tests and treatment pathways based on clinical guidelines.
    The agent is NOT a substitute for physician judgment.

capabilities:
  tools:
    - name: "analyze_patient_presentation"
      description: "Evaluate patient history, labs, imaging, vital signs"
      access_level: "internal_only"
      allowed_users: ["licensed_physicians", "advanced_practice_providers"]
    - name: "recommend_diagnostic_tests"
      description: "Suggest tests based on clinical presentation"
      access_level: "internal_only"
    - name: "check_drug_interactions"
      description: "Identify contraindications or interactions"
      access_level: "internal_only"
    - name: "recommend_treatment_pathway"
      description: "Suggest evidence-based treatment pathways"
      access_level: "internal_only"
    - name: "identify_specialist_referral"
      description: "Recommend specialist consultation"
      access_level: "internal_only"

constraints:
  denied_actions:
    - "Make or implement clinical decisions without physician approval"
    - "Directly modify patient records"
    - "Prescribe medications or order tests without physician authorization"
    - "Communicate medical recommendations directly to patients"
    - "Access patient records for purposes other than clinical decision support"
  rate_limits:
    - "max 100 concurrent patient analyses"
    - "max 1000 recommendations per day"

governance:
  applicable_regulations:
    - "FDA Clinical Decision Support Guidance"
    - "HIPAA Privacy & Security Rules"
    - "State Medical Practice Acts"
    - "CMS Conditions of Participation (if applicable)"
  clinical_validation:
    required: true
    validation_criteria: ["accuracy_across_populations", "safety", "performance_vs_baseline"]
    governing_body: "Medical Executive Committee"
  knowledge_base:
    evidence_sources: ["clinical_guidelines", "peer_reviewed_research"]
    update_frequency: "quarterly"
    version_tracking: true
  physician_approval_requirement:
    enabled: true
    trigger: "All recommendations require physician review and approval"
  adverse_event_monitoring:
    enabled: true
    escalation_threshold: "any_adverse_event"
    investigation_procedure: "root_cause_analysis"
  audit_logging:
    enabled: true
    fields: ["patient_id", "presentation_analyzed", "recommendations_generated", "physician_id", "physician_action_taken", "outcome", "timestamp"]
    retention_days: 2555  # 7 years (HIPAA minimum)
    phi_redaction: true
```

**Governance Policies:**

- **FDA Validation Policy** — Enforces that the agent has been clinically validated and evidence of validation is documented. Violations block deployment.
- **Physician Approval Policy** — Enforces that every patient case evaluated by the agent results in a physician review and decision. Recommendations cannot be implemented without explicit physician authorization.
- **HIPAA Compliance Policy** — Enforces that all PHI is accessed only by authorized users, encrypted in transit and at rest, and logged.
- **Adverse Event Policy** — Enforces that any adverse event related to the agent is reported, investigated, and documented.
- **Knowledge Currency Policy** — Enforces that clinical guidelines and evidence are current. Outdated guidelines trigger immediate review and update.

---

## 2. Patient Scheduling Agent

### Scenario

A healthcare provider deploys a patient-facing agent to automate appointment scheduling. The agent:

- Answers patient questions about available appointments.
- Books appointments based on patient needs (appointment type, location preference, time constraints).
- Sends appointment confirmations and reminders.
- Handles rescheduling and cancellations.
- Integrates with the hospital's electronic health record (EHR) system to check availability and block time.

### Governance Requirements

**Regulatory Drivers:**
- **HIPAA Privacy Rule** — While scheduling doesn't directly involve clinical decisions, it involves PHI (patient name, date of birth, appointment time, appointment type reveals some information about the patient's condition). The agent must protect this data.
- **HIPAA Security Rule** — The agent's connection to the EHR must be secure. Authentication must be strong and audit logging must be enabled.
- **State Telehealth Laws** — If the agent schedules telehealth appointments, the agent must comply with state-specific telehealth regulations (licensure, informed consent, data security).
- **ADA Accessibility Requirements** — The scheduling interface must be accessible to patients with disabilities (screen reader compatible, keyboard navigation, alternative input methods).
- **Plain Language Requirements** — Communications about appointments, cancellations, and rescheduling must be in plain language understandable to a general audience.

**Internal Governance Patterns:**
- **EHR Integration Security** — The agent's connection to the EHR must use industry-standard authentication (OAuth 2.0 or SAML) and encryption (TLS 1.2 or higher).
- **Audit Logging** — All scheduling actions (booking, cancellation, rescheduling) must be logged to the EHR audit trail.
- **Patient Communication** — Confirmations and reminders must be sent through secure channels (patient portal, encrypted email, SMS with patient consent).
- **Escalation for Complex Requests** — If a patient has special needs (language translation, mobility assistance, religious accommodations), the agent should escalate to a human scheduler.

### Intellios Implementation

**ABP Structure:**

```yaml
agent:
  id: "patient-scheduling-bot-v1"
  name: "Patient Scheduling Agent"
  description: "Automates appointment scheduling and management"
  deployment_type: "customer-facing"
  data_sensitivity: "regulated"

capabilities:
  tools:
    - name: "check_availability"
      description: "Query EHR for available appointment slots"
      access_level: "internal_only"
      authentication: "oauth2"
    - name: "book_appointment"
      description: "Create appointment in EHR"
      access_level: "internal_only"
    - name: "send_confirmation"
      description: "Send appointment confirmation to patient"
      access_level: "internal_only"
    - name: "handle_cancellation"
      description: "Cancel appointment and notify provider"
      access_level: "public"
    - name: "send_reminder"
      description: "Send pre-appointment reminder to patient"
      access_level: "internal_only"

constraints:
  communication_channels:
    - "Patient portal, encrypted email, SMS (with opt-in consent)"
    - "No unsecured SMS or email"
  denied_actions:
    - "Access patient medical records"
    - "Modify clinical notes or medical history"
    - "Share appointment information with unauthorized third parties"
    - "Make clinical recommendations"
  rate_limits:
    - "max 500 scheduling sessions per hour"

governance:
  applicable_regulations:
    - "HIPAA Privacy & Security Rules"
    - "State Telehealth Laws (if applicable)"
    - "ADA Accessibility Requirements"
  ehr_integration:
    authentication: "oauth2"
    encryption: "tls_1_2_or_higher"
    audit_logging: "enabled"
  patient_communication:
    secure_channels_only: true
    confirmation_required: true
    language_support: "english_spanish_[OTHER]"
  accessibility:
    wcag_level: "aa"
    testing_frequency: "annually"
  escalation_rules:
    - "Special accommodations (language, mobility) → escalate to human"
    - "Coverage or payment questions → escalate to billing"
  audit_logging:
    enabled: true
    fields: ["patient_id", "appointment_type", "appointment_time", "action", "timestamp"]
    retention_days: 1095  # 3 years
    phi_encryption: "aes_256"
```

**Governance Policies:**

- **EHR Security Policy** — Enforces that all EHR connections use OAuth 2.0 or SAML authentication and TLS 1.2+ encryption.
- **Patient Communication Policy** — Enforces that all patient communications use secure channels (patient portal, encrypted email) and that appointment confirmations are sent promptly.
- **Accessibility Policy** — Enforces that the agent meets WCAG 2.1 AA accessibility standards.
- **Escalation Policy** — Enforces that complex requests (special accommodations, coverage questions) are escalated to humans.

---

## 3. Medical Coding Agent

### Scenario

A healthcare provider deploys an agent to assist medical coders in assigning diagnosis and procedure codes (ICD-10, CPT) from clinical notes. The agent:

- Ingests clinical notes from encounters.
- Extracts relevant clinical concepts (diagnoses, procedures, severity, complications).
- Recommends ICD-10 diagnosis codes and CPT procedure codes.
- Flags potential coding errors or missing codes.
- Prepares a coding summary for human coder review.

### Governance Requirements

**Regulatory Drivers:**
- **OIG Compliance Guidelines** — The HHS Office of Inspector General (OIG) has issued guidance on compliance in healthcare, including requirements for:
  - Accurate coding (to support correct billing and reporting).
  - Training and certification for coders.
  - Audit procedures to detect coding errors.
  - Documentation of the coding process.

  An AI coding agent must be designed to support compliance, not to facilitate fraud.

- **Medicare/Medicaid Billing Requirements** — If the provider bills Medicare or Medicaid, coding must be accurate and defensible. Systematic coding errors can trigger audits and penalties. The agent must not introduce systemic bias or errors.

- **State Health Records Laws** — Clinical documentation must be complete, accurate, and retain the treating provider's clinical judgment. AI recommendations must not override documented clinical judgment.

- **Compliance Risk Management** — The American Health Information Management Association (AHIMA) expects healthcare organizations to have policies governing AI-assisted coding, including:
  - Validation of coding accuracy.
  - Monitoring for systemic errors.
  - Clear delineation of human vs. AI responsibility.

**Internal Governance Patterns:**
- **Coder Responsibility** — Final coding decisions rest with human coders, who are typically certified (RHIA, RHIT) and liable for coding accuracy. The agent is a tool to support coders, not a replacement.
- **Accuracy Monitoring** — The agent's recommendations must be monitored for accuracy. Any systematic errors (e.g., consistently missing secondary diagnoses for certain conditions) must trigger retraining or removal.
- **Audit Compliance** — All coding decisions, including agent recommendations and coder overrides, must be logged for compliance audits.
- **Code Updates** — ICD-10 and CPT codes change annually. The agent's codeset must be updated before each coding year.

### Intellios Implementation

**ABP Structure:**

```yaml
agent:
  id: "medical-coding-assistant-v1"
  name: "Medical Coding Assistant"
  description: "Assists certified coders in assigning ICD-10 and CPT codes"
  deployment_type: "internal_only"
  data_sensitivity: "regulated"

capabilities:
  tools:
    - name: "extract_clinical_concepts"
      description: "Identify diagnoses, procedures, severity, complications from notes"
      access_level: "internal_only"
    - name: "recommend_icd10_codes"
      description: "Suggest ICD-10 diagnosis codes"
      access_level: "internal_only"
    - name: "recommend_cpt_codes"
      description: "Suggest CPT procedure codes"
      access_level: "internal_only"
    - name: "flag_coding_issues"
      description: "Identify missing codes, inconsistencies, or errors"
      access_level: "internal_only"
    - name: "generate_coding_summary"
      description: "Prepare summary for coder review"
      access_level: "internal_only"

constraints:
  user_requirements:
    - "Only certified coders (RHIA, RHIT) may use this agent"
  denied_actions:
    - "Automatically submit codes without human coder review"
    - "Modify clinical notes"
    - "Override coder decisions"
    - "Access patient demographic data beyond what is necessary for coding"
  rate_limits:
    - "max 100 records coded per day per coder (to ensure review quality)"

governance:
  applicable_regulations:
    - "OIG Compliance Guidelines"
    - "Medicare/Medicaid Billing Requirements"
    - "State Health Records Laws"
    - "AHIMA Coding Compliance Standards"
  code_currency:
    annual_update_required: true
    update_deadline: "October 1 before coding year"
  accuracy_monitoring:
    enabled: true
    metrics: ["code_recommendation_accuracy", "missing_code_detection", "override_rate"]
    target_accuracy: "95%"
    monitoring_frequency: "monthly"
  coder_responsibility:
    final_codes_approved_by: "certified_coder"
  audit_logging:
    enabled: true
    fields: ["claim_id", "recommended_codes", "coder_selected_codes", "override_reason", "coder_id", "timestamp"]
    retention_days: 2555  # 7 years (billing records)
  compliance_audit:
    enabled: true
    audit_frequency: "quarterly"
    escalation_threshold: "systemic_coding_errors"
```

**Governance Policies:**

- **Coder Certification Policy** — Enforces that only certified coders use the agent.
- **Code Currency Policy** — Enforces that the agent uses current ICD-10 and CPT codes. Updates are required annually.
- **Accuracy Monitoring Policy** — Enforces that the agent's recommendations are monitored for accuracy. Systemic errors trigger investigation and remediation.
- **Override Tracking Policy** — Enforces that when coders override the agent's recommendations, the reason is logged for trend analysis.

---

## 4. Prior Authorization Agent

### Scenario

A healthcare payer (insurance company) deploys an agent to process prior authorization (PA) requests from providers. The agent:

- Receives PA requests from providers (clinical data, procedure code, medical necessity documentation).
- Compares the request against clinical guidelines and coverage policies.
- Automatically approves straightforward requests (common procedures, clear medical necessity).
- Flags complex or borderline cases for human review.
- Generates approval/denial notices and communicates outcomes to the provider and patient.

### Governance Requirements

**Regulatory Drivers:**
- **Patient Protection and Affordable Care Act (ACA)** — The ACA requires that:
  - Prior authorization processes not unreasonably delay care.
  - Denials must be based on clinical evidence and coverage policy, not cost alone.
  - Providers have the right to appeal denials.
  - Patients have the right to request external review.

- **State Insurance Laws** — Many states have enacted prior authorization reform laws requiring:
  - Clear, published PA criteria.
  - Timely decisions (often 24-72 hours for urgent cases).
  - Streamlined appeals.
  - Transparency about the criteria used in denials.

- **Medical Necessity Standards** — Denials must be based on medical necessity, not on financial incentives. The insurer cannot impose policies that deny care based solely on cost.

- **Network Adequacy & Accessibility** — Some states require insurers to maintain PA processes that do not create unreasonable barriers to accessing care.

**Internal Governance Patterns:**
- **Medical Necessity Criteria** — PA decisions must be based on published, evidence-based clinical criteria, not on proprietary algorithms or cost metrics.
- **Human Review for Denials** — Any PA denial should be reviewed by a physician reviewer (or licensed clinician) before it is communicated to the patient.
- **Transparent Appeals Process** — If a PA is denied, the notice must clearly explain the reason and the provider's right to appeal.
- **Timeliness** — PA decisions should be made promptly. Routine requests typically have a 24-hour SLA; urgent requests may have 1-hour SLA. The system must track and report on timeliness.

### Intellios Implementation

**ABP Structure:**

```yaml
agent:
  id: "prior-authorization-processor-v1"
  name: "Prior Authorization Agent"
  description: "Processes prior authorization requests and makes coverage determinations"
  deployment_type: "internal_only"
  data_sensitivity: "highly_regulated"

capabilities:
  tools:
    - name: "extract_pa_request_data"
      description: "Parse PA request for clinical data, procedure code, medical necessity documentation"
      access_level: "internal_only"
    - name: "evaluate_clinical_criteria"
      description: "Compare request against coverage criteria and clinical guidelines"
      access_level: "internal_only"
    - name: "check_member_coverage"
      description: "Verify member eligibility and coverage for requested procedure"
      access_level: "internal_only"
    - name: "generate_approval_notice"
      description: "Create PA approval notice"
      access_level: "internal_only"
    - name: "queue_for_physician_review"
      description: "Route complex or borderline cases to physician reviewer"
      access_level: "internal_only"

constraints:
  approval_authority:
    - "Agent can auto-approve: low-risk procedures, clear medical necessity, routine cases"
    - "Agent CANNOT auto-deny: all denials require physician reviewer approval"
  denied_actions:
    - "Deny PA requests without physician reviewer approval"
    - "Use cost-based criteria in approval decisions"
    - "Communicate PA denial directly to patient (must go through provider)"
  rate_limits:
    - "max 1000 PA requests per hour"

governance:
  applicable_regulations:
    - "Patient Protection and Affordable Care Act (ACA)"
    - "State Prior Authorization Reform Laws"
    - "Medical Necessity Standards"
  coverage_criteria:
    evidence_basis: "evidence_based_clinical_guidelines"
    criteria_publication: "transparent_to_providers"
    criteria_version: "tracked_and_dated"
  auto_approval_rules:
    - "Routine procedures with clear medical necessity"
    - "Procedures that meet guideline criteria without exception"
    - "Emergency/urgent procedures"
  physician_review_requirement:
    enabled: true
    trigger: "All denials, all borderline or complex cases"
    reviewer_qualifications: "licensed_physician"
  timeliness_sla:
    routine_requests: "24_hours"
    urgent_requests: "1_hour"
    monitoring: "enabled"
  appeals_process:
    documented: true
    external_review: "available"
  audit_logging:
    enabled: true
    fields: ["pa_id", "member_id", "procedure_code", "decision", "decision_reason", "physician_reviewer_id", "approval_notice_sent", "timestamp"]
    retention_days: 1825  # 5 years
```

**Governance Policies:**

- **Denial Approval Policy** — Enforces that all PA denials are reviewed and approved by a physician reviewer before notification.
- **Medical Necessity Policy** — Enforces that coverage decisions are based on medical necessity and evidence-based clinical criteria, not cost.
- **Timeliness Policy** — Enforces that PA decisions meet SLA targets (24 hours routine, 1 hour urgent).
- **Transparency Policy** — Enforces that PA criteria are published to providers and that denials clearly explain the reason and appeal rights.

---

## 5. Patient Education Agent

### Scenario

A healthcare provider deploys a patient-facing agent to answer common health questions and provide education. The agent:

- Answers patient questions about conditions, treatments, medications, preventive care.
- Provides educational content in plain language.
- Directs patients to appropriate care resources (scheduling with a physician, emergency department, etc.).
- Gathers patient information to support personalized recommendations.
- Escalates urgent or complex questions to a nurse line or physician.

### Governance Requirements

**Regulatory Drivers:**
- **HIPAA Privacy Rule** — The agent may collect patient information (symptoms, medical history) to personalize responses. This information is PHI and must be protected.
- **State Medical Board Rules** — The agent cannot practice medicine or provide medical advice on behalf of a physician. It can provide general health education, but not diagnosis or treatment recommendations specific to the patient's situation.
- **FDA Guidance** — If the agent recommends specific treatments or diagnoses, it may be considered clinical decision support and subject to FDA regulation.
- **ADA Accessibility Requirements** — The agent must be accessible to patients with disabilities.
- **Plain Language Requirements** — Health education must be in plain language understandable to a general audience, not medical jargon.

**Internal Governance Patterns:**
- **Scope of Practice** — The agent is limited to health education and general information. It cannot:
  - Diagnose conditions.
  - Recommend specific treatments for the patient's situation.
  - Provide medical advice that would replace a physician's judgment.
- **Escalation to Licensed Providers** — If a patient describes symptoms that require clinical evaluation, the agent must escalate to a nurse or physician.
- **Accurate, Evidence-Based Content** — Educational content must be accurate, current, and based on evidence-based guidelines. Content must be reviewed and approved by clinical leadership.
- **Patient Privacy** — Any patient information collected by the agent (symptoms, medical history) must be treated as PHI and protected accordingly.

### Intellios Implementation

**ABP Structure:**

```yaml
agent:
  id: "patient-education-bot-v1"
  name: "Patient Education Agent"
  description: "Provides health education and directs patients to care resources"
  deployment_type: "customer-facing"
  data_sensitivity: "personal_data_and_phi"

capabilities:
  tools:
    - name: "answer_health_questions"
      description: "Provide general health education information"
      access_level: "public"
    - name: "gather_symptoms"
      description: "Collect symptom information (for triage to appropriate care)"
      access_level: "public"
    - name: "recommend_care_option"
      description: "Direct patient to appropriate care level (PCP, urgent care, ED)"
      access_level: "public"
    - name: "send_educational_content"
      description: "Deliver educational materials to patient"
      access_level: "public"
    - name: "escalate_to_nurse_line"
      description: "Route complex or urgent cases to nurse advice line"
      access_level: "internal_only"

constraints:
  scope_of_practice:
    allowed: ["general_health_education", "wellness_information", "care_navigation", "symptom_triage"]
    denied: ["diagnosis", "treatment_recommendation_for_patient_condition", "medical_advice"]
  communication:
    - "Use plain language, not medical jargon"
    - "Include disclaimers: agent is not a substitute for physician consultation"
    - "Provide links to evidence-based resources"
  denied_actions:
    - "Diagnose patient conditions"
    - "Recommend specific medications or treatments"
    - "Replace physician consultation"
    - "Share patient health information with third parties"
  rate_limits:
    - "max 500 concurrent conversations"

governance:
  applicable_regulations:
    - "HIPAA Privacy & Security Rules (if PHI is collected)"
    - "State Medical Board Practice Laws"
    - "ADA Accessibility Requirements"
    - "Plain Language Requirements"
  content_governance:
    evidence_base: "evidence_based_guidelines"
    clinical_review_required: true
    update_frequency: "semi-annually"
    version_tracking: true
  scope_enforcement:
    escalation_triggers:
      - "Patient describes acute symptoms (chest pain, shortness of breath, etc.)"
      - "Patient reports medication side effects"
      - "Patient asks for diagnosis of their condition"
      - "Patient asks for treatment recommendation"
  escalation_process:
    destination: "nurse_advice_line"
    sla: "15_minutes"
  accessibility:
    wcag_level: "aa"
    language_support: "english_spanish_[OTHER]"
    testing_frequency: "annually"
  audit_logging:
    enabled: true
    fields: ["user_id", "question_asked", "escalation_triggered", "care_recommendation", "timestamp"]
    retention_days: 1095  # 3 years
    phi_encryption: "aes_256"
```

**Governance Policies:**

- **Scope Enforcement Policy** — Enforces that the agent stays within health education and does not provide medical advice or diagnoses.
- **Escalation Policy** — Enforces that urgent symptoms or clinical questions are escalated to licensed providers.
- **Content Currency Policy** — Enforces that educational content is evidence-based, clinically reviewed, and updated regularly.
- **HIPAA Compliance Policy** — Enforces that any patient health information collected is treated as PHI and protected accordingly.
- **Accessibility Policy** — Enforces that the agent meets WCAG 2.1 AA accessibility standards.

---

## Common Governance Patterns Across Healthcare Agents

### 1. Physician/Clinician Oversight

All healthcare agents, especially clinical decision support and prior authorization agents, require human clinician review. Governance patterns include:

- **Approval by Licensed Clinicians** — Agents can recommend, but licensed physicians or other qualified clinicians must make final clinical decisions.
- **Escalation Rules** — Complex, urgent, or borderline cases automatically escalate to clinicians.
- **Override Tracking** — When clinicians disagree with the agent, the reason is logged and analyzed for trends.

### 2. HIPAA Compliance

All healthcare agents must protect Protected Health Information. Governance patterns include:

- **Access Controls** — Only authorized users can access PHI through the agent. Strong authentication (MFA) is required.
- **Encryption** — PHI must be encrypted at rest (AES-256) and in transit (TLS 1.2+).
- **Audit Logging** — All access to PHI must be logged and auditable for regulatory inspection.
- **Data Retention** — PHI must not be retained longer than necessary. Redaction or deletion schedules must be defined.

### 3. Clinical Validation & Knowledge Currency

Healthcare agents that provide clinical information must be based on current evidence. Governance patterns include:

- **Clinical Validation** — Before deployment, clinical leaders must validate that the agent's recommendations are clinically sound.
- **Knowledge Base Updates** — Clinical guidelines and evidence change. The agent's knowledge base must be updated regularly (at least annually for most clinical domains).
- **Version Tracking** — All versions of clinical content must be tracked and dated. Outdated content must be retired.

### 4. Adverse Event Monitoring

Healthcare regulators and the healthcare industry expect serious adverse events to be reported and investigated. Governance patterns include:

- **Adverse Event Reporting** — Any adverse event related to the agent (incorrect recommendation, harm to patient) must be reported to internal quality and safety teams.
- **Root Cause Analysis** — Adverse events must be investigated to understand what happened and why.
- **Agent Updates & Removal** — If the agent contributed to an adverse event, it must be updated (retraining, policy changes) or removed from service until the issue is resolved.
- **Regulatory Reporting** — Depending on the severity and type of adverse event, it may need to be reported to external regulators (FDA, state medical board).

### 5. Timeliness & Accessibility

Healthcare decisions often have time-sensitive implications. Governance patterns include:

- **SLA Monitoring** — Agents that affect care (prior authorization, appointment scheduling) should have defined SLAs (e.g., PA decisions within 24 hours).
- **Accessibility** — Agents serving patients must be accessible to patients with disabilities (WCAG 2.1 AA).
- **Language Support** — If serving a diverse population, agents should support multiple languages.

---

## Next Steps

Now that you understand how Intellios governance patterns apply to healthcare, you can:

1. **Identify Your Agents** — List existing or planned healthcare agents and categorize them by type (clinical decision support, scheduling, coding, prior authorization, education).
2. **Map Regulatory Requirements** — For each agent, identify applicable regulations (HIPAA, FDA, state medical boards, insurer rules).
3. **Create Governance Policies** — Using the patterns above, define governance-as-code policies that your agents must satisfy.
4. **Plan Intake & Validation** — Use Intellios Design Studio to capture agent requirements. Plan clinical validation for agents that provide clinical recommendations.
5. **Deploy & Monitor** — Deploy agents through Intellios. Monitor for adverse events, clinical accuracy, and regulatory compliance.

For detailed guidance, see:

- **[Governance Policy Guide](../05-governance-compliance/policy-authoring-guide.md)** — Learn how to express governance rules.
- **[Compliance Evidence Chain](../03-core-concepts/compliance-evidence-chain.md)** — Understand how Intellios generates audit trails and compliance documentation for healthcare.
- **[Agent Lifecycle](../03-core-concepts/agent-lifecycle-states.md)** — Understand state transitions and governance gates.

---

*See also: [Insurance Scenarios](insurance-scenarios.md), [Governance-as-Code](../03-core-concepts/governance-as-code.md), [Agent Blueprint Package](../03-core-concepts/agent-blueprint-package.md)*

*Next: [Healthcare Scenarios](healthcare-scenarios.md)*
