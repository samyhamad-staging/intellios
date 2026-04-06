---
id: 07-013
title: "How to View an Agent's Complete Audit History"
slug: view-agent-audit-history
type: task
audiences:
  - compliance
  - engineering
status: published
version: 1.0.0
platform_version: 1.2.0
created: "2026-04-05"
updated: "2026-04-05"
tags:
  - audit
  - compliance
  - agent
  - history
  - investigation
prerequisites:
  - 02-001
  - 05-014
related:
  - 05-014
  - 05-015
  - 07-001
next_steps:
  - 05-015
feedback_url: "https://feedback.intellios.ai/kb"
tldr: |
  Retrieve the full lifecycle history of a specific agent for compliance review or incident investigation. View timeline, filter by date/event type, and export as JSON/PDF in ~5 minutes.
---

## TL;DR

View agent audit history in 4 steps: Agent Registry → find agent → click History tab → review timeline, filter, and export.

## Goal

Retrieve the complete lifecycle history of a specific agent for compliance review, incident investigation, or audit preparation. Includes creation, validation, approval, deployment, and all modifications.

## Prerequisites

- You have Compliance, Engineering, or Admin role in Intellios
- You have access to the Agent Registry
- The agent you want to audit exists and has an audit trail (created more than 1 minute ago)
- You have ~5 minutes to retrieve and review the history
- Audit logging is enabled (see [How to Set Up Audit Logging for Compliance](05-014))

## Steps

### Step 1: Navigate to Agent Registry

Log into Intellios. Click **Agent Registry** in the main navigation, or go directly to `/app/registry`.

**Expected outcome:** Registry dashboard appears with a list of all agents.

### Step 2: Find the Target Agent

Search for or locate the agent you want to audit. Use the search bar to filter by:

- **Agent Name:** Type the agent name (e.g., "FAQ Assistant")
- **Status:** Filter by status (Approved, Draft, Deployed, etc.)
- **Created By:** Filter by the user who created it
- **Date Range:** Filter by creation date

Example: Search for "FAQ Assistant" to find all agents with that name.

Click on the agent card or name to open its detail page.

**Expected outcome:** Agent detail page appears with tabs: Overview, Design, Governance, History.

### Step 3: Click the History Tab

On the agent detail page, click the **History** tab (usually the fourth tab after Overview, Design, and Governance).

The History panel appears showing a timeline of events for this agent.

**Expected outcome:** You see a chronological timeline of events. Each event shows:
- Timestamp (exact time of action)
- Event type (e.g., "created", "validated", "approved", "deployed", "modified")
- User who performed the action
- Brief description of what changed

Example timeline:
```
2026-04-05 14:32:15 | alice@company.com | Agent Created | "FAQ Assistant" created as draft
2026-04-05 14:35:42 | alice@company.com | Blueprint Generated | New blueprint generated from intake
2026-04-05 14:36:08 | system | Validation Passed | All governance policies satisfied
2026-04-05 14:45:30 | bob@company.com | Review Submitted | Sent to review queue (REV-2026-0045)
2026-04-05 15:22:11 | carol@company.com | Approved | Approved by Compliance reviewer
2026-04-05 16:00:00 | alice@company.com | Deployed | Deployed to production
2026-04-05 16:05:15 | alice@company.com | Configuration Updated | Rate limit changed from 100 to 200 req/min
```

### Step 4: Review Timeline and Filter Events

Examine the timeline to understand the agent's lifecycle. Each entry shows:

- **When:** Exact timestamp
- **Who:** User who took the action (or "system" for automated events)
- **What:** Event type and description
- **Details:** Click "View Details" on any entry to see the full event record

**Filter by Date Range:**

Near the top of the History panel, select a date range:

- **Date From:** Start date for filtering (e.g., "2026-03-01")
- **Date To:** End date for filtering (e.g., "2026-04-05")

Click **Apply Filter**. The timeline updates to show only events in that range.

**Filter by Event Type:**

Use the "Event Type" dropdown to filter by specific actions:

- **Lifecycle:** Created, modified, deleted, deployed, undeployed
- **Validation:** Validation passed, validation failed
- **Governance:** Policy applied, policy violation, rule triggered
- **Approval:** Submitted, approved, rejected, recalled
- **Access:** Viewed by user, accessed by API, exported

Example: Select "Approval" to see only review and approval events.

**Expected outcome:** Timeline filtered to show only events matching your criteria.

### Step 5: Export History as JSON or PDF (Optional)

If you need to share the audit history or include it in a compliance report, click **Export** (usually near the top-right of the History panel).

Choose your format:

- **JSON:** Complete, machine-readable record of all events. Useful for further analysis or audit system integration.
- **PDF:** Human-readable report suitable for regulatory submission. Includes formatted timeline, summary statistics, and governance compliance notes.

The file downloads immediately. Example filenames:

- `FAQ-Assistant_audit-history_2026-04-05.json`
- `FAQ-Assistant_audit-history_2026-04-05.pdf`

**Expected outcome:** Export file downloaded to your computer.

## Verification

You've successfully retrieved an agent's audit history when:

1. **History Tab Visible:** The History tab is accessible on the agent detail page
2. **Timeline Complete:** You can see all major lifecycle events (created, validated, approved, deployed)
3. **Events Accurate:** Timestamps, users, and event descriptions match your expectations
4. **Filtering Works:** You can filter by date range and event type
5. **Export Successful:** You can export the history as JSON or PDF

To verify accuracy, cross-reference the audit history with:

- The agent's current status (should match the latest event)
- The agent's creation date (should match the "created" event)
- Recent changes you know were made (should appear in the timeline)

## Example Audit History Scenario

**Incident Investigation:**

A compliance officer suspects an agent's governance settings were changed without approval. Steps:

1. Navigate to the agent in the Registry
2. Click History tab
3. Filter by Event Type = "Governance" and Date From = [suspected date range]
4. Review the timeline for unauthorized policy changes
5. If found, click an event to see full details (who, when, before/after values)
6. Export the filtered history as a PDF for the incident report

**Regulatory Exam Preparation:**

A regulator asks, "Show me the complete history of how this agent was created and approved."

1. Open the agent
2. Click History tab
3. Filter by Date range covering creation through deployment
4. Click "Export as PDF"
5. Include the exported document in your regulatory evidence package (see [How to Prepare for a Regulatory Examination](05-015))

## Next Steps

- [Prepare for a regulatory examination](05-015) using audit histories as evidence
- [Set up audit logging](05-014) to ensure complete audit trail capture
- [Configure governance policies](05-001) to understand what rules governed this agent
