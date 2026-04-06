---
id: 05-012
title: "How to Export a Compliance Report for an Auditor"
slug: export-compliance-report
type: task
audiences:
  - compliance
status: published
version: 1.0.0
platform_version: 1.2.0
created: "2026-04-05"
updated: "2026-04-05"
tags:
  - compliance
  - audit
  - reporting
  - evidence
prerequisites:
  - 01-001
  - 05-001
related:
  - 05-011
  - 05-013
next_steps:
  - 05-013
feedback_url: "https://feedback.intellios.ai/kb"
tldr: "Open an agent in Registry, click Evidence Package, select report scope (single agent or fleet), choose format (PDF/JSON), include validation + audit trail + policy snapshots, generate, and download."
---

## TL;DR

Generate and export a complete compliance evidence package for regulatory examination by navigating to an agent's Evidence Package, selecting scope and format, and downloading the report.

## Goal

Generate and export a complete compliance evidence package for regulatory examination.

## Prerequisites

- You have Compliance Officer or Admin role in Intellios.
- At least one agent blueprint exists in the Registry.
- You know whether the auditor needs a single-agent report or a fleet-wide compliance snapshot.
- You understand your regulatory requirements (HIPAA, SOC 2, ISO 27001, etc.) to know what scope to select.

## Steps

1. **Log in and navigate to Registry.** Open Intellios, click **Registry** in the sidebar.

2. **Select the agent (or fleet).**
   - **For a single agent:** Click the agent name to open its detail view.
   - **For multiple agents:** Use the **Report Scope** selector (if available) to filter agents by team, environment, or tag.

3. **Click Evidence Package.** On the agent detail page, click the **Evidence Package** button or tab (typically in the top action bar or a secondary menu). A report generation dialog will open.

4. **Select report scope.** Choose how much of your agent portfolio to include:
   - **Single Agent** — Only the current agent's compliance history.
   - **Team Fleet** — All agents owned by a specific team.
   - **Environment** — All agents in staging, production, or another environment.
   - **All Agents** — Complete portfolio (used for annual audits).

5. **Choose output format.** Select your preferred format:
   - **PDF** — Human-readable document with tables, charts, and summaries. Best for auditors and regulators.
   - **JSON** — Machine-readable structured data. Best for integrating into audit management systems.

6. **Configure report contents.** The dialog will show checkboxes for what to include (usually all are checked by default):
   - **Validation Reports** — All governance validation results for each agent.
   - **Audit Trail** — Complete log of all changes, deployments, and policy violations.
   - **Policy Snapshots** — The exact governance policies that were active at each validation time.
   - **Deployment Records** — When and where each agent was deployed.
   - **Access Logs** — Who accessed or modified each agent (optional, may be in a separate security report).

7. **Click Generate.** Click **Generate Report** or **Create Package**. The system will compile the evidence. You will see a progress indicator. Report generation typically takes 30–120 seconds depending on the volume of data.

8. **Download the report.** Once complete, you will see a download link or button labeled **Download [PDF/JSON]**. Click it to save the file to your computer. The filename will include a timestamp (e.g., `compliance-report-2026-04-05.pdf`).

## Verification

- The downloaded file is not empty and opens correctly (PDF readers, JSON editors, or audit tools).
- The report includes timestamps, agent names, policy versions, and validation details.
- If you opened it in PDF, you can see charts and summaries of compliance status.
- If you opened it in JSON, you can parse it with standard tools.
- The report covers the date range and agents you selected.

## Next Steps

- [How to Investigate a Governance Violation](05-013)
- [How to Update an Existing Governance Policy](05-011)
