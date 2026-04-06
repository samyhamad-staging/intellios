---
id: 05-015
title: "How to Prepare for a Regulatory Examination"
slug: prepare-regulatory-exam
type: task
audiences:
  - compliance
  - executive
status: published
version: 1.0.0
platform_version: 1.2.0
created: "2026-04-05"
updated: "2026-04-05"
tags:
  - compliance
  - audit
  - regulatory
  - evidence
  - sr11-7
  - sox
prerequisites:
  - 02-001
  - 05-001
  - 05-014
related:
  - 05-001
  - 05-014
  - 07-013
  - 07-014
next_steps: []
feedback_url: "https://feedback.intellios.ai/kb"
tldr: |
  Assemble the complete evidence package regulators need for AI governance examination. Generate 7 reports in ~30 minutes, compile into evidence bundle, and review with compliance team.
---

## TL;DR

Prepare regulatory evidence in 7 steps: generate model inventory → export governance snapshots → pull validation reports → compile audit logs → generate SR 11-7 mapping → package evidence bundle → review with team.

## Goal

Assemble the complete evidence package regulators need when examining your AI governance framework and agent lifecycle management. Prepare for examinations under SR 11-7, SOX, GDPR, or other regulatory frameworks.

## Prerequisites

- You have Compliance or Executive role in Intellios
- You have access to Agent Registry, Governance Settings, and Audit Logs
- Audit logging is enabled and configured (see [How to Set Up Audit Logging for Compliance](05-014))
- You have governance policies documented in Intellios (see [How to Configure Governance Policies](05-001))
- You have ~2–3 hours to gather all evidence (or can distribute across your compliance team)
- You have a shared folder or document system (Google Drive, SharePoint) to stage evidence

## Steps

### Step 1: Generate Model Inventory Report

Navigate to **Compliance > Reports > Model Inventory**.

Click **Generate Report**. The system produces a comprehensive inventory of all AI agents:

**Report includes:**
- Agent name, ID, version, status
- Creation date, creator, last modified date
- Primary purpose and risk classification
- Governance policies applied
- Deployment environment (staging/production)
- Data sources accessed
- Approval history (who approved, when)

Click **Export as PDF** or **Export as CSV**.

**Expected outcome:** File downloaded: `intellios_model_inventory_2026-04-05.pdf` (or .csv).

**Store in evidence folder:** /Shared Drive/Compliance/Regulatory-Evidence/2026-04-05/Reports/

### Step 2: Export Governance Policy Snapshots

Navigate to **Compliance > Governance Policies**.

For each governance policy active in your organization, click the policy name and then **Export Policy**.

Export each as PDF or JSON. Policies should include:

- Policy name and version
- Effective date
- Risk criteria (which agents trigger this policy)
- Required reviews and approvers
- Constraints and requirements
- Date last updated and by whom

Example policies:

- Standard Internal Tool Policy
- High-Risk Agent Policy
- Customer-Facing Agent Policy
- Data Processing Policy (for GDPR compliance)

**Expected outcome:** Multiple policy files exported (e.g., `StandardInternalToolPolicy_v1.2.pdf`, `HighRiskAgentPolicy_v1.0.pdf`).

**Store in evidence folder:** /Shared Drive/Compliance/Regulatory-Evidence/2026-04-05/Policies/

### Step 3: Pull Validation Reports for All Agents

Navigate to **Agent Registry > All Agents**.

For each approved agent:

1. Click the agent
2. Go to the **Governance** or **Validation** tab
3. Click **Export Validation Report**
4. Download as PDF

Example reports:

- `FAQ-Assistant_validation-report_v2.3.pdf`
- `Document-Processor_validation-report_v1.1.pdf`
- `Customer-Support-Bot_validation-report_v3.0.pdf`

Alternatively, use the bulk export feature (if available):

**Compliance > Reports > Agent Validation Reports > Export All**

This generates a single comprehensive report with validation results for every agent.

**Expected outcome:** Validation reports for all active agents downloaded.

**Store in evidence folder:** /Shared Drive/Compliance/Regulatory-Evidence/2026-04-05/Validation-Reports/

### Step 4: Compile Audit Trail Logs

Navigate to **Admin > Audit Logs** (or **Compliance > Audit Logs** if you have compliance access).

Set filters:

- **Date Range:** From [start of audit period, e.g., 2025-04-05] to Today
- **Event Type:** Leave as "All" or select specific types: Lifecycle, Governance, Approval, Deployment
- **User:** Leave as "All" (unless investigating specific users)

Click **Export Full Audit Trail**.

Options:

- **JSON:** Machine-readable, includes all fields
- **PDF:** Human-readable formatted report

Choose the format your regulators expect. For most regulatory reviews, export both.

**Expected outcome:** Files downloaded:
- `intellios_audit-trail_2025-04-05_to_2026-04-05.json`
- `intellios_audit-trail_2025-04-05_to_2026-04-05.pdf`

**Store in evidence folder:** /Shared Drive/Compliance/Regulatory-Evidence/2026-04-05/Audit-Logs/

### Step 5: Generate SR 11-7 Mapping Evidence (if applicable)

If your organization is regulated under SR 11-7 (Federal Reserve AI guidance), navigate to **Compliance > Regulatory Mappings > SR 11-7**.

The system displays your Intellios governance framework mapped to SR 11-7 principles:

| SR 11-7 Principle | Intellios Evidence | Policy/Process |
|---|---|---|
| Effective Oversight and Governance | Governance framework in place, policies configured | See: StandardInternalToolPolicy_v1.2.pdf |
| Design and Development | Blueprint generation process documented | See: Generation-Engine-Specification.pdf |
| Ongoing Performance Monitoring | Agent monitoring and alerting configured | See: Monitoring-Setup-Guide.pdf |
| Risk Management | Risk assessment in blueprints, governance validation | See: Validation-Reports/[all] |
| Audit and Accountability | Complete audit trail maintained | See: Audit-Logs/[full trail] |

Click **Export SR 11-7 Mapping Report**.

**Expected outcome:** File downloaded: `intellios_sr11-7_mapping_2026-04-05.pdf`

**Store in evidence folder:** /Shared Drive/Compliance/Regulatory-Evidence/2026-04-05/Regulatory-Mappings/

### Step 6: Package Compliance Evidence Bundle

Organize all collected evidence into a structured bundle for regulators:

```
intellios_regulatory-evidence_2026-04-05/
├── README.md  [Cover letter explaining contents and contact info]
├── Reports/
│   ├── model-inventory_2026-04-05.pdf
│   └── summary-statistics.pdf  [Total agents, approval rate, risk distribution]
├── Policies/
│   ├── StandardInternalToolPolicy_v1.2.pdf
│   ├── HighRiskAgentPolicy_v1.0.pdf
│   ├── DataProcessingPolicy_v1.0.pdf  [for GDPR]
│   └── governance-policy-index.md  [List all policies with dates]
├── Validation-Reports/
│   ├── FAQ-Assistant_validation-report_v2.3.pdf
│   ├── Document-Processor_validation-report_v1.1.pdf
│   └── ...  [All active agents]
├── Agent-Histories/
│   ├── FAQ-Assistant_audit-history_2026-04-05.pdf
│   └── ...  [Key agent lifecycle timelines]
├── Audit-Logs/
│   ├── intellios_audit-trail_2025-04-05_to_2026-04-05.json
│   ├── intellios_audit-trail_2025-04-05_to_2026-04-05.pdf
│   └── audit-summary-statistics.md  [Total events, event types, top users]
├── Regulatory-Mappings/
│   ├── intellios_sr11-7_mapping_2026-04-05.pdf  [if applicable]
│   ├── intellios_sox_mapping_2026-04-05.pdf  [if applicable]
│   └── intellios_gdpr_mapping_2026-04-05.pdf  [if applicable]
└── supporting-documents/
    ├── system-architecture.pdf
    ├── data-flow-diagram.pdf
    └── governance-framework-overview.pdf
```

In the README, include:

- Statement: "This evidence package documents Intellios AI governance for [org name] as of [date]."
- Contact: Compliance officer name, email, phone
- Quick summary: "X agents approved, Y validation failures remediated, 100% audit coverage"
- Instructions: "See policy index for governance documents. See audit-trail for complete system activity."

**Expected outcome:** Organized folder with all evidence ready for regulatory review.

### Step 7: Review Evidence Package with Compliance Team

Schedule a 30–60 minute meeting with your compliance team:

1. **Walk through the bundle:** Confirm all required documents are present
2. **Verify accuracy:** Check that agent counts, approval dates, and policy versions match your records
3. **Identify gaps:** If regulators ask questions you can't answer from the evidence, note gaps and fill them
4. **Test retrieval:** Confirm you can quickly pull any single agent's history or a specific audit log entry if asked
5. **Sign-off:** Get written confirmation from your Compliance Officer that the evidence is complete and accurate

Create a sign-off document:

```
REGULATORY EVIDENCE PACKAGE SIGN-OFF
Organization: [Your Org]
Prepared By: [Compliance Officer Name]
Date: 2026-04-05
Scope: AI agents under governance as of 2026-04-05

I confirm that this evidence package accurately represents our AI governance framework,
agent lifecycle management, and audit trail as implemented in Intellios.

Signature: ________________________
```

**Expected outcome:** Evidence package reviewed and approved by compliance team. Ready for regulator request.

## Verification

Your regulatory evidence package is complete when:

1. **All Reports Present:** Model inventory, governance policies, validation reports, audit logs
2. **Date Coverage:** Audit logs span at least 12 months (or required period)
3. **Regulatory Mappings:** If applicable (SR 11-7, SOX, GDPR), mappings documents generated
4. **Agent Histories:** Key agents have complete lifecycle audit trails exported
5. **Accuracy Verified:** Compliance team has reviewed and signed off
6. **Retrievability Tested:** You can quickly pull any single report or audit entry if regulators ask

Sample verification steps:

- Count agents in model inventory report; confirm matches Agent Registry count
- Pick a random agent from the inventory; verify its validation report is present
- Pick a random date from the audit trail; verify you can retrieve detailed event information for that date
- Confirm all governance policies in the bundle are currently active in your organization

## Next Steps

- Submit evidence package when regulators request examination materials
- Set up quarterly review cycles to keep evidence package current (see [How to Set Up Audit Logging for Compliance](05-014))
- Document any regulatory feedback and update governance policies accordingly
- After examination completes, update this evidence package with regulator feedback and compliance remediation actions
