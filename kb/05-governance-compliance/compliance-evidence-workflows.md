---
id: "05-009"
title: "Compliance Evidence Workflows: Preparing for Regulatory Examination"
slug: "compliance-evidence-workflows"
type: "task"
audiences:
  - "compliance"
status: "published"
version: "1.0.0"
platform_version: "1.0.0"
created: "2026-04-05"
updated: "2026-04-05"
author: "Intellios"
reviewers: []
tags:
  - "compliance"
  - "evidence"
  - "regulatory-examination"
  - "sr-11-7"
  - "model-risk-assessment"
  - "documentation"
prerequisites:
  - "Intellios deployed and operational"
  - "At least one approved agent in the Registry"
  - "Access to Intellios API or Admin Dashboard"
  - "Compliance team role or Administrator access"
related:
  - "Audit Trail Generation"
  - "SR 11-7 Compliance Mapping"
  - "Model Inventory Management"
next_steps:
  - "Prepare for Regulatory Examination"
  - "Schedule Automated Compliance Reports"
feedback_url: "[PLACEHOLDER]"
tldr: >
  Regulatory examinations require comprehensive evidence packages demonstrating governance compliance. Intellios generates compliance evidence deterministically from stored artifacts: model inventory, technical documentation (ABP), governance validation reports, approval chains, and audit trails. This task walks compliance teams through assembling evidence packages for specific agents, generating model risk assessment reports, creating executive compliance dashboards, scheduling automated reports, and preparing examination response packages. Complete this task to have examination-ready compliance evidence for any agent.
---

# Compliance Evidence Workflows: Preparing for Regulatory Examination

> **TL;DR:** When regulators examine your AI governance, you must provide comprehensive evidence showing that agents were developed under governance, independently validated, approved by appropriate authority, and monitored post-deployment. Intellios generates all this evidence deterministically from stored artifacts. This task teaches you how to assemble evidence packages for specific agents, generate model risk assessment reports, create compliance dashboards for management reporting, schedule automated compliance reports, and prepare examination responses. By the end, you will have systematic workflows for evidence generation suitable for regulatory submission.

---

## Goal

By completing this task, you will have:

1. **Assembled Evidence Packages for Specific Agents** — Collected all governance artifacts (ABP, validation report, approval chain, audit trail) for any agent in a single downloadable package
2. **Generated Model Risk Assessment Reports** — Created comprehensive reports covering agent specification, governance policies, validation results, risk assessment, and monitoring configuration
3. **Created Management Compliance Dashboards** — Built executive-friendly views showing governance metrics (% agents compliant, policy violations, approval cycle time)
4. **Configured Automated Compliance Reporting** — Set up recurring compliance reports (quarterly, annual) for management and regulatory submission
5. **Prepared Examination Response Packages** — Assembled a complete response package for a regulatory examination request, covering specific examination questions or agent cohorts

---

## Prerequisites

Before starting, ensure you have:

- [ ] **Intellios Instance** — Intellios deployed and running (version 1.0.0+)
- [ ] **Approved Agents** — At least one agent with status=approved in your Agent Registry
- [ ] **Admin Dashboard Access** — User account with compliance or administrator role
- [ ] **Governance Policies Defined** — Governance policies configured for your regulatory environment
- [ ] **Monitoring Configuration** — Drift detection and performance monitoring configured for agents
- [ ] **Compliance Requirements Document** — Document outlining your regulatory obligations (SR 11-7, GDPR, etc.)

---

## Steps

### Step 1: Assemble a Compliance Evidence Package for a Specific Agent

**Context:** An examiner requests evidence for a specific agent (e.g., "Show us documentation and governance evidence for the Loan Approval Agent v2.0.0"). You need to quickly assemble a complete, audit-ready evidence package.

**Instruction:** Generate a compliance evidence package for a single agent.

#### Via Dashboard

1. Navigate to **Agent Registry**
2. Find and click on the agent you want to package (e.g., "Loan Approval Agent")
3. Click the **Compliance** tab at the top
4. Click **Generate Evidence Package**
5. Choose scope:
   - **Current version only** — Evidence for the currently approved version
   - **All versions** — Include version history and validation records for all previous versions
   - **Deployment records** — Include deployment timestamps, environments, and deployment approvals
6. Choose format:
   - **JSON** — Machine-readable structured format
   - **Markdown** — Human-readable narrative with evidence embedded
   - **PDF** — Formatted report with signatures and watermarks [PLACEHOLDER: if signature capability available]
7. Choose package contents:
   - ✓ **Agent Blueprint Package (ABP)** — Complete technical documentation
   - ✓ **Governance Validation Report** — Policy evaluation results
   - ✓ **Approval Chain** — Reviewer identities, approval dates, rationale
   - ✓ **Audit Trail** — Timestamped record of all actions
   - ✓ **Stakeholder Contributions** — Input from compliance, risk, legal, security, IT, operations
   - ✓ **Risk Assessment** — Risk documentation from ABP governance section
   - ✓ **Monitoring Configuration** — Drift detection thresholds, performance baselines
   - ✓ **Data Lineage** — Data sources and sensitivity classification
8. Click **Generate Package**
9. System assembles package and initiates download

**Expected result:** Compliance evidence package downloaded containing all governance artifacts for the agent.

#### Via API

```bash
# Generate evidence package for a specific agent
POST /api/blueprints/{agentId}/generate-compliance-package
Content-Type: application/json

{
  "format": "json",
  "scope": "current_version",
  "includeVersionHistory": true,
  "includeDeploymentRecords": true,
  "includeMonitoringConfig": true
}

# Response:
{
  "packageId": "pkg-uuid-789",
  "agentId": "agent-uuid-001",
  "agentName": "Loan Approval Agent",
  "version": "2.0.0",
  "status": "approved",
  "generatedAt": "2026-04-05T14:32:18Z",
  "expiresAt": "2026-04-12T14:32:18Z",
  "downloadUrl": "https://intellios-api.company.com/download/pkg-uuid-789",
  "contents": {
    "abp": {
      // Complete ABP JSON object
      "metadata": { /* ... */ },
      "identity": { /* ... */ },
      "capabilities": { /* ... */ },
      "constraints": { /* ... */ },
      "governance": { /* ... */ },
      "execution": { /* ... */ }
    },
    "validationReport": {
      "valid": true,
      "policyCount": 4,
      "violations": [],
      "generatedAt": "2026-04-02T14:45:00Z"
    },
    "approvalChain": [
      {
        "reviewer": "jane.smith@company.com",
        "decision": "approved",
        "timestamp": "2026-04-03T10:15:00Z",
        "comment": "Governance controls are robust. Ready for production."
      }
    ],
    "auditLog": [
      {
        "eventType": "blueprint_created",
        "timestamp": "2026-04-02T14:30:00Z",
        "actor": "alice@company.com"
      }
      // ... additional audit events
    ],
    "monitoringConfig": {
      "driftDetection": {
        "enabled": true,
        "checkInterval": "1h",
        "performanceBaseline": { /* ... */ }
      }
    },
    "versionHistory": [
      {
        "version": "1.0.0",
        "status": "deprecated",
        "createdAt": "2026-01-15T09:00:00Z"
      },
      {
        "version": "2.0.0",
        "status": "approved",
        "createdAt": "2026-02-10T10:00:00Z"
      }
    ]
  }
}
```

**Package Contents Explained:**

| Section | Contains | Why It Matters |
|---|---|---|
| **ABP** | Complete technical documentation (identity, capabilities, constraints, governance, execution) | Proves model is fully documented per regulatory requirements |
| **Validation Report** | Governance policies evaluated, violations found/resolved | Proves independent validation before deployment |
| **Approval Chain** | Reviewer identities, approval dates, rationale | Proves human review and approval authority |
| **Audit Trail** | Timestamped record of all actions from creation through deployment | Proves governance controls over model lifecycle |
| **Stakeholder Contributions** | Attributed input from compliance, risk, legal, security, IT | Proves cross-functional governance |
| **Risk Assessment** | Risk documentation in ABP governance section | Proves risk management system exists |
| **Monitoring Config** | Drift detection thresholds, performance baselines | Proves post-market monitoring is configured |
| **Version History** | All previous versions with dates and status | Proves change control and version management |
| **Data Lineage** | Data sources and sensitivity classification | Proves data governance |

**Expected result:** Single downloadable package containing all evidence for an agent. Suitable for examiner review.

### Step 2: Generate a Model Risk Assessment Report

**Context:** SR 11-7 requires a documented risk assessment for each model. You need to generate a comprehensive Model Risk Assessment (MRA) report that summarizes model specification, identified risks, mitigation controls, and residual risks.

**Instruction:** Generate a Model Risk Assessment report for an agent.

#### Via Dashboard

1. Navigate to **Agent Registry**
2. Select the agent for which you want an MRA report
3. Click **Compliance** → **Generate MRA Report**
4. Configure report scope:
   - **Report Title** — Custom title (e.g., "Model Risk Assessment — Loan Approval Agent v2.0.0")
   - **As of Date** — Report date (defaults to today)
   - **Assessment Period** — Period covered (e.g., past 6 months of monitoring)
5. Choose report sections to include:
   - ✓ **Executive Summary** — High-level overview and risk rating
   - ✓ **Model Specification** — Identity, purpose, capabilities, constraints
   - ✓ **Development Methodology** — Intake process, stakeholder involvement
   - ✓ **Governance Framework** — Policies, roles, approval authority
   - ✓ **Validation Results** — Governance policy evaluation, violations resolved
   - ✓ **Risk Assessment** — Identified risks, severity, mitigation controls
   - ✓ **Data Management** — Data sources, sensitivity, retention policies
   - ✓ **Monitoring and Drift Detection** — Monitoring configuration, drift alerts, remediation history
   - ✓ **Performance Analysis** — Accuracy, fairness, latency trends from monitoring period
   - ✓ **Change History** — Version transitions and modifications
   - ✓ **Approval Chain** — Reviewers and approval decisions
   - ✓ **Audit Trail Summary** — Key lifecycle events
   - ✓ **Conclusion and Sign-Off** — Risk rating and recommendation for continued operation
6. Add optional sections:
   - Testing results (if external testing conducted)
   - Fairness assessment (if bias testing performed)
   - Stress test results (if adversarial testing conducted)
7. Click **Generate Report**
8. System assembles report from stored artifacts

**Expected result:** Comprehensive Model Risk Assessment report generated and ready for download/printing.

#### Report Structure (Auto-Generated)

The MRA report includes:

```
MODEL RISK ASSESSMENT REPORT

Agent: [name]
Version: [semantic version]
As of: [date]
Prepared by: Intellios Compliance System
Review Cycle: Annual (next review due [date])

EXECUTIVE SUMMARY
├─ Risk Rating: [Low / Medium / High / Unacceptable]
├─ Approval Status: [Approved / In Review / Rejected]
├─ Compliance Status: [Fully Compliant / Minor Gaps / Major Gaps]
├─ Key Findings: [Summary of main governance and risk findings]
└─ Recommendation: [Continue current operation / Enhanced monitoring / Remediation required / Retire model]

1. MODEL SPECIFICATION
├─ Agent ID: [UUID]
├─ Business Purpose: [description]
├─ Intended Use: [narrative]
├─ Deployment Type: [customer-facing / internal-only / pipeline]
├─ Data Sensitivity: [classification]
├─ Regulatory Scope: [regulations applicable]
├─ Capabilities: [tools, data sources, capabilities]
├─ Constraints: [denied actions, rate limits, allowed domains]
└─ System Instructions: [behavioral guidelines]

2. DEVELOPMENT METHODOLOGY
├─ Development Approach: [Intellios Intake Engine three-phase process]
├─ Stakeholder Involvement: [compliance, risk, legal, security, IT, operations, business]
├─ Governance Probing: [mandatory governance requirements based on intake signals]
├─ Generation: [Intellios Generation Engine; ABP version history]
└─ Development Timeline: [intake dates, generation date, approval date]

3. GOVERNANCE FRAMEWORK
├─ Policies Applied: [list of governance policies evaluated]
├─ Approval Authority: [roles and approval chain]
├─ Business Owner: [contact info]
├─ Technical Owner: [contact info]
├─ Risk Owner: [contact info]
├─ Compliance Owner: [contact info]
└─ RBAC: [role-based access controls for this agent]

4. VALIDATION RESULTS
├─ Governance Validator Output: [policy violations found, severity, resolution]
├─ Policies Passed: [list of policies with pass/fail]
├─ Violations Found: [list of violations with resolution status]
├─ Remediation Actions: [how violations were addressed]
└─ Re-validation History: [validation runs, dates, results]

5. RISK ASSESSMENT
├─ Identified Risks: [risks documented at development]
├─ Risk Severity: [low / medium / high]
├─ Mitigation Controls: [constraints, policies, monitoring]
├─ Residual Risks: [risks remaining after mitigation]
├─ Risk Acceptance: [approved by: [risk officer], date: [date]]
└─ Risk Monitoring: [how residual risks are monitored]

6. DATA MANAGEMENT
├─ Data Sources: [systems and databases accessed]
├─ Data Sensitivity: [PII / regulated / confidential / public]
├─ Data Retention: [retention period and deletion procedures]
├─ PII Handling: [redaction, anonymization, encryption]
└─ Data Quality Monitoring: [baseline metrics, acceptable ranges]

7. MONITORING AND DRIFT DETECTION
├─ Monitoring Configuration: [metrics tracked, thresholds, check intervals]
├─ Performance Baselines: [accuracy, latency, error rate baselines]
├─ Drift Detection: [specification / behavioral / policy drift detection]
├─ Drift Events: [drift detected during assessment period]
├─ Remediation Actions: [remediation steps taken for drift events]
└─ Escalation Procedures: [alert severity levels and escalation paths]

8. PERFORMANCE ANALYSIS
├─ Assessment Period: [date range]
├─ Accuracy: [current accuracy, trend, baseline]
├─ Fairness: [accuracy by demographic group, disparities]
├─ Latency: [p50, p95, p99 latency, trend]
├─ Error Rate: [% errors, trend, root causes]
├─ Constraint Violations: [count of violations, severity, remediation]
└─ User Feedback: [any complaints or issues reported]

9. CHANGE HISTORY
├─ Version History: [all versions with dates and status]
├─ Modifications: [list of changes between versions]
├─ Change Authority: [who approved each change]
└─ Change Impact: [how changes affected governance/risk]

10. APPROVAL CHAIN
├─ Approval Authority: [reviewer identity]
├─ Approval Date: [timestamp]
├─ Review Comments: [rationale for approval]
├─ Conditions/Caveats: [any conditions on approval]
└─ Re-Approval Date: [if re-approved in assessment period]

11. AUDIT TRAIL SUMMARY
├─ Creation: [date and creator]
├─ Governance Validation: [date and results]
├─ Submitted for Review: [date]
├─ Approved: [date and approver]
├─ Deployed: [date and environment]
├─ Drift Detected: [dates and events, if any]
└─ Remediation: [remediation events, if any]

12. CONCLUSION AND SIGN-OFF
├─ Conclusion: [summary of compliance status and key findings]
├─ Risk Rating Justification: [rationale for assigned risk rating]
├─ Recommendation: [continue operation / enhanced monitoring / remediation / retire]
├─ Assessment Performed By: Intellios Compliance System
├─ Report Date: [generated date]
└─ Next Review Date: [recommended date for next MRA]

ATTACHMENTS
├─ Appendix A: Full ABP (technical documentation)
├─ Appendix B: Validation Report (policy violations detail)
├─ Appendix C: Audit Log (complete event history)
└─ Appendix D: Monitoring Dashboard Screenshot (current metrics)
```

**Expected result:** Comprehensive Model Risk Assessment report suitable for management review, compliance audits, and regulatory examination.

### Step 3: Create a Management Compliance Dashboard

**Context:** Senior management and the Board need visibility into AI governance health (% agents compliant, policy violations, approval cycle times, monitoring incidents). You need a dashboard that distills compliance metrics into executive-friendly views.

**Instruction:** Create an executive compliance dashboard.

#### Via Dashboard Builder

1. Navigate to **Dashboards** → **Create Dashboard**
2. Name: "AI Governance Compliance Dashboard" (or similar)
3. Add widget 1: **Governance Health Summary**
   - Metric: Total agents, approved agents, pending review, deprecated
   - Visualization: Cards or percentage completion
   - Target: Shows governance lifecycle distribution

4. Add widget 2: **Policy Compliance**
   - Metric: Agents passing all policies, agents with violations, agents with error-severity violations
   - Visualization: Stacked bar chart by severity (error / warning / pass)
   - Target: Shows % of agents compliant with governance policies

5. Add widget 3: **Approval Cycle Time**
   - Metric: Average days from draft → approved for agents approved in past 90 days
   - Visualization: Trend line showing cycle time over time
   - Target: Shows governance efficiency

6. Add widget 4: **Governance Violations Trend**
   - Metric: Count of governance violations over time (last 12 months)
   - Visualization: Line chart showing violations by month
   - Target: Shows whether governance posture is improving or degrading

7. Add widget 5: **Data Sensitivity Distribution**
   - Metric: Count of agents by data sensitivity (public / confidential / PII / regulated)
   - Visualization: Pie chart
   - Target: Shows regulatory scope concentration

8. Add widget 6: **Drift Detection Summary**
   - Metric: Agents with drift detected, drift alerts in past 30 days, remediation status
   - Visualization: Cards showing active drift incidents
   - Target: Shows post-market monitoring health

9. Add widget 7: **Audit Trail Health**
   - Metric: % agents with complete evidence chains (intake + generation + validation + review + deployment + monitoring)
   - Visualization: Progress bar or percentage card
   - Target: Shows examination readiness

10. Add widget 8: **Upcoming Compliance Events**
    - Metric: Agents approaching re-certification date, policies expiring soon, monitoring issues requiring attention
    - Visualization: List view with due dates
    - Target: Shows compliance team bandwidth and upcoming work

11. Configure auto-refresh: Daily at 6 AM
12. Set permissions: Viewable by compliance, risk, and executive team
13. Publish dashboard

**Expected result:** Executive dashboard automatically updated daily, showing governance health metrics.

#### Sample Dashboard Metrics

```
AI GOVERNANCE COMPLIANCE DASHBOARD
As of 2026-04-05

┌─ GOVERNANCE HEALTH
│  Total Agents: 42
│  ├─ Approved: 38 (90%)
│  ├─ In Review: 2 (5%)
│  ├─ Draft: 1 (2%)
│  └─ Deprecated: 1 (2%)
│
├─ POLICY COMPLIANCE
│  Agents Passing All Policies: 36 (86%)
│  ├─ Error Violations: 2 agents (4%)
│  └─ Warning Violations: 4 agents (10%)
│
├─ APPROVAL CYCLE TIME (90-day avg)
│  Average Days Draft → Approved: 4.2 days
│  ├─ Min: 1 day
│  ├─ Max: 14 days
│  └─ Median: 3 days
│
├─ DRIFT DETECTION (30-day summary)
│  Specification Drift Events: 0
│  Behavioral Drift Events: 1 (resolved)
│  Policy Drift Events: 0
│
├─ DATA SENSITIVITY
│  Regulated: 28 agents (67%)
│  PII: 8 agents (19%)
│  Confidential: 4 agents (10%)
│  Public: 2 agents (5%)
│
├─ AUDIT TRAIL HEALTH
│  Complete Evidence Chains: 40 agents (95%)
│  Incomplete: 2 agents (5%)
│
└─ UPCOMING COMPLIANCE EVENTS
   Agents Approaching Re-Cert: 3 (in next 30 days)
   Active Monitoring Issues: 1 (drift remediation in progress)
```

**Expected result:** Executive dashboard created and accessible to governance team and Board oversight.

### Step 4: Schedule Automated Compliance Reports

**Context:** Instead of manually generating compliance reports for each examination request, you can schedule recurring automated reports (quarterly, annual) that are generated automatically and delivered to appropriate stakeholders.

**Instruction:** Configure automated compliance report generation.

#### Via Dashboard Report Scheduler

1. Navigate to **Admin** → **Governance Settings** → **Automated Reports**
2. Click **Create Scheduled Report**
3. Configure report 1: **Quarterly Governance Review**
   - **Name:** Quarterly Governance Review
   - **Schedule:** Last business day of each quarter (Mar 31, Jun 30, Sep 30, Dec 31)
   - **Report Type:** Governance Summary
   - **Contents:**
     - Agent inventory (status breakdown, data sensitivity, regulatory scope)
     - Policy compliance metrics (agents passing all policies, violations by severity)
     - Approval cycle time trends
     - Drift detection summary
     - Audit trail health
   - **Scope:** All agents
   - **Filters:** None (include all agents)
   - **Format:** PDF or email HTML
   - **Recipients:** compliance-team@company.com, cro@company.com
   - **Retention:** Keep copies for 7 years for audit trail

4. Configure report 2: **Annual Model Risk Management Report**
   - **Name:** Annual MRM Report
   - **Schedule:** January 15 each year
   - **Report Type:** Comprehensive Model Risk Management
   - **Contents:**
     - Executive summary and risk rating for each agent
     - Full MRA reports for all approved agents
     - Changes and modifications in past year
     - Policy compliance and remediation summary
     - Post-market monitoring results
     - Examination findings and remediation status
   - **Scope:** All approved agents
   - **Format:** PDF (professional formatting for Board submission)
   - **Recipients:** compliance-team@company.com, cro@company.com, board-governance@company.com
   - **Retention:** Keep copies indefinitely (regulatory requirement)

5. Configure report 3: **Monthly Drift Summary**
   - **Name:** Drift Detection and Remediation Report
   - **Schedule:** 1st business day of each month
   - **Report Type:** Drift Summary
   - **Contents:**
     - Drift events detected in past month
     - Remediation actions executed
     - Outstanding drift incidents
     - Performance metric trends
   - **Scope:** All agents with active monitoring
   - **Format:** Email HTML + CSV attachment
   - **Recipients:** data-science-team@company.com, operations@company.com
   - **Retention:** Keep for 3 years

6. Test reports:
   - Click **Test Report Generation** for each scheduled report
   - Verify contents are accurate and formatting is correct
   - Confirm recipients are correct

7. Enable reports:
   - Click **Enable** for each report to activate the schedule

**Expected result:** Automated reports configured and generated on schedule. Reports automatically sent to appropriate stakeholders.

#### Via API Report Scheduling

```bash
# Create a scheduled quarterly governance report
POST /api/admin/scheduled-reports
Content-Type: application/json

{
  "name": "Quarterly Governance Review",
  "reportType": "governance_summary",
  "schedule": "0 0 31 3,6,9,12 *",  // Last day of each quarter, midnight
  "enabled": true,
  "scope": "all_agents",
  "format": "pdf",
  "contents": [
    "agent_inventory",
    "policy_compliance_metrics",
    "approval_cycle_time_trends",
    "drift_summary",
    "audit_trail_health"
  ],
  "recipients": [
    "compliance-team@company.com",
    "cro@company.com"
  ],
  "retention": {
    "keepForYears": 7,
    "deleteAfterRetention": false  // Never delete; archive instead
  }
}

# Response:
{
  "reportId": "rpt-quarterly-001",
  "name": "Quarterly Governance Review",
  "schedule": "0 0 31 3,6,9,12 *",
  "nextRunAt": "2026-06-30T00:00:00Z",
  "status": "enabled",
  "created": "2026-04-05T14:32:18Z"
}
```

**Expected result:** Automated reports scheduled and enabled. Reports will generate automatically on defined schedule.

### Step 5: Prepare an Examination Response Package

**Context:** A regulator (Federal Reserve, OCC, etc.) has requested examination materials on specific agents or AI governance. You need to quickly assemble a comprehensive response package that addresses the examination request.

**Instruction:** Prepare an examination response package.

#### Step 5a: Understand the Examination Request

1. Obtain the examination request from the regulator
2. Identify scope:
   - Are they asking about specific agents or all agents?
   - What time period do they want to examine?
   - What topics are they focused on (development, validation, governance, monitoring, etc.)?
3. Example request: "Provide documentation and governance evidence for all Loan Approval agents deployed in production as of March 31, 2026."

#### Step 5b: Assemble the Response Package

Via Dashboard:

1. Navigate to **Agent Registry** → **Compliance** → **Examination Response**
2. Click **Create Response Package**
3. Name the package: "Examination Response — Loan Approval Agents (March 2026)"
4. Define scope:
   - **Agent Selection:** Search for agents matching request (e.g., agents with name containing "Loan", status=approved, deployment=production)
   - **Date Range:** Scope covered by response (e.g., agents deployed before March 31, 2026)
   - **Agent Count:** System shows how many agents match criteria
5. Choose package contents:
   - ✓ **Model Inventory** — Complete list of agents matching scope with all SR 11-7 required fields
   - ✓ **Technical Files** — ABP for each agent
   - ✓ **Governance Documentation** — Policies applied, validation results, governance framework
   - ✓ **Approval Chain** — Approval authority and decisions
   - ✓ **Audit Trails** — Complete timestamped record of actions for each agent
   - ✓ **Version History** — All versions of each agent with status and dates
   - ✓ **Monitoring Configuration** — Drift detection and post-market monitoring setup
   - ✓ **Incident Reports** — Any drift events or governance issues detected post-deployment
   - ✓ **Remediation Records** — Actions taken to address any issues found
6. Add optional responses:
   - **Examination Question Responses** — If regulator posed specific questions, add direct responses here
   - **Supporting Documentation** — Additional context (risk assessments, fairness testing results if conducted, policy documents)
7. Review package:
   - System generates a manifest of all documents in package
   - Review and confirm completeness
8. Generate package:
   - Click **Generate Package**
   - System assembles all documents
   - Option to download as ZIP archive or generate in Intellios portal for download

#### Via API

```bash
# Prepare examination response package
POST /api/compliance/examination-response
Content-Type: application/json

{
  "packageName": "Examination Response — Loan Approval Agents (March 2026)",
  "scope": {
    "agentNames": ["Loan Approval Agent"],
    "status": "approved",
    "deploymentStatus": "production",
    "deployedBefore": "2026-03-31"
  },
  "contents": [
    "model_inventory",
    "technical_files",
    "governance_documentation",
    "approval_chain",
    "audit_trails",
    "version_history",
    "monitoring_configuration",
    "incident_reports",
    "remediation_records"
  ],
  "examinationQuestions": [
    {
      "question": "What are all AI agents currently deployed in production?",
      "response": "See Model Inventory section. As of March 31, 2026, [X] agents are deployed in production."
    },
    {
      "question": "What governance policies apply to these agents?",
      "response": "See Governance Documentation section. All production agents are evaluated against [list of policies]."
    }
  ]
}

# Response:
{
  "packageId": "exam-resp-uuid-123",
  "packageName": "Examination Response — Loan Approval Agents (March 2026)",
  "status": "ready",
  "createdAt": "2026-04-05T14:32:18Z",
  "agentCount": 3,
  "documentCount": 47,
  "totalSizeBytes": 8192000,
  "downloadUrl": "https://intellios-api.company.com/download/exam-resp-uuid-123"
}
```

#### Step 5c: Review Before Submission

1. Open the generated package
2. Verify:
   - All requested agents are included
   - All requested documents are present
   - No sensitive information is exposed that shouldn't be (internal-only notes, etc.)
   - Document dates and timestamps are accurate
   - Governance evidence is complete and coherent
3. Add a cover letter:
   - Short letter from Chief Risk Officer or Compliance Officer
   - Overview of AI governance framework
   - Key findings (e.g., "All agents in scope have been validated against governance policies and approved by appropriate authority")
   - Contact information for follow-up questions
4. Prepare for submission:
   - Download package in requested format (ZIP, PDF, etc.)
   - Verify file integrity
   - Prepare for delivery to examiner (email, secure portal, etc.)

**Expected result:** Examination response package prepared and ready for submission to regulator.

---

## Verification

**How to confirm this task succeeded end-to-end:**

1. **Evidence Package Generated** — You generated a compliance evidence package for a test agent and opened it to verify it contains ABP, validation report, approval chain, and audit trail
2. **MRA Report Created** — You generated a Model Risk Assessment report and reviewed its contents (executive summary, model specification, governance framework, validation results, monitoring configuration)
3. **Dashboard Created** — You created an executive compliance dashboard and verified it displays governance metrics (% agents compliant, policy violations, drift alerts)
4. **Automated Reports Configured** — You created a scheduled report and verified it is enabled to run on the configured schedule
5. **Examination Response Assembled** — You prepared an examination response package for a specific agent or cohort and verified all requested documents are included

**Success criteria:**

- Evidence packages are generated deterministically from Intellios artifacts and are complete
- MRA reports are executive-ready and suitable for Board/management review
- Dashboard shows accurate governance metrics updated regularly
- Automated reports are scheduled and enabled
- Examination response packages address examiner requests and are submission-ready
- All generated documents are timestamped and auditable

---

## Troubleshooting

If you encounter issues during this task:

| Symptom | Likely Cause | Resolution |
|---|---|---|
| **Evidence package missing sections** | Some artifacts not linked to agent in registry | Verify agent record is complete (ABP linked, validation report stored, approval recorded); regenerate package |
| **MRA report shows "TBD" or placeholder text** | Risk assessment not documented in ABP or monitoring not configured | Complete ABP governance section with risk assessment; configure monitoring and re-generate report |
| **Dashboard shows zero agents** | Agents exist but not in approved status | Verify agents are in approved status; filters may be too restrictive |
| **Automated report fails to generate** | Recipient email invalid, or report contents missing data | Verify recipient email address; check that agents exist matching filter criteria; check for errors in report configuration |
| **Examination response package incomplete** | Filter criteria too restrictive and missed agents | Loosen filter criteria; verify agent names match search; manually add missing agents |

For additional help, see [SR 11-7 Compliance Mapping](sr-11-7-mapping.md) or contact your Intellios support team.

---

## Next Steps

Now that you can generate compliance evidence systematically:

- **Prepare for Your Next Examination** — Use evidence package and examination response workflows to prepare a comprehensive response for an upcoming regulatory examination
- **Share with Board** — Use executive compliance dashboard and annual MRM report for Board governance reporting
- **Integrate with GRC System** — Export compliance artifacts to your governance, risk, and compliance system (if applicable)
- **Document SOP** — Create a Standard Operating Procedure for compliance evidence generation and examination response
- **Schedule Annual Compliance Review** — Use automated reports and MRA reports for annual governance review and re-certification

---

## Appendix: Evidence Package Checklist

When submitting evidence to regulators, ensure your package includes:

### Model Inventory
- [ ] Complete list of all agents in scope
- [ ] Unique agent IDs
- [ ] Agent names and descriptions
- [ ] Current version numbers
- [ ] Status (approved, deprecated, etc.)
- [ ] Business owner and technical owner
- [ ] Data classification and regulatory scope
- [ ] Creation and approval dates

### Technical Documentation
- [ ] Agent Blueprint Package (ABP) for each agent
- [ ] System instructions and behavioral guidelines
- [ ] Capabilities and tools
- [ ] Constraints and denied actions
- [ ] Integration points and data sources
- [ ] Version history

### Governance Documentation
- [ ] Governance policies applied
- [ ] Policy evaluation results
- [ ] Any violations found and how they were resolved
- [ ] Governance framework (roles, approval authority, oversight)
- [ ] Risk assessment and risk mitigation

### Validation Evidence
- [ ] Governance Validator reports
- [ ] Policy compliance results
- [ ] Independent validation approach
- [ ] Re-validation history

### Approval Chain
- [ ] Approval authority and reviewer identities
- [ ] Approval dates and timestamps
- [ ] Review comments and rationale
- [ ] Any conditions or caveats on approval

### Audit Trail
- [ ] Complete timestamped record of all actions
- [ ] Creation through deployment
- [ ] Any modifications or changes
- [ ] Drift detection and remediation events
- [ ] Actor identities and role information

### Monitoring Configuration
- [ ] Post-market monitoring approach
- [ ] Performance baselines and metrics tracked
- [ ] Drift detection configuration
- [ ] Alert thresholds and escalation procedures
- [ ] Monitoring results from assessment period

### Incident Reports
- [ ] Any drift or governance issues detected
- [ ] Investigation and root cause analysis
- [ ] Remediation actions executed
- [ ] Current status (resolved / open / escalated)

---

*See also: [Audit Trail Generation](audit-trail-generation.md), [SR 11-7 Compliance Mapping](sr-11-7-mapping.md), [Model Inventory Management](model-inventory-management.md)*

---

**Document Classification:** Internal Use — Compliance Teams
**Last Updated:** 2026-04-05
**Next Review Date:** 2026-10-05 (6-month review cycle)
