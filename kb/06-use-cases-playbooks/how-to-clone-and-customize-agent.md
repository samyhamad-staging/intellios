---
id: 06-009
title: "How to Clone and Customize an Existing Agent"
slug: clone-customize-agent
type: task
audiences:
  - engineering
  - product
status: published
version: 1.0.0
platform_version: 1.2.0
created: "2026-04-05"
updated: "2026-04-05"
tags:
  - agent
  - registry
  - blueprint
  - clone
  - reuse
  - customization
prerequisites:
  - 03-011
related:
  - 03-002
  - 04-001
  - 06-001
next_steps:
  - 04-002
  - 05-001
feedback_url: "https://feedback.intellios.ai/kb"
tldr: |
  Quickly create a new agent by cloning an approved blueprint from the registry, then customize it for a different use case. Takes 5–10 minutes for clone + customization + validation.
---

## TL;DR

Clone and customize an agent in 5 steps: find source agent in Registry → clone it → customize name/description → modify capabilities/constraints → regenerate blueprint → validate.

## Goal

Create a new agent based on an approved existing blueprint, adapting it for a different use case without starting from scratch.

## Prerequisites

- You have Engineering or Product role in Intellios
- You have access to the Agent Registry
- There is at least one approved agent blueprint in your registry (status: Approved)
- You understand the use case for your new agent
- You have ~10 minutes to complete the task

## Steps

### Step 1: Find Source Agent in Registry

Navigate to **Agent Registry** (`/app/registry`). You'll see a list of all agents in your organization.

Search or filter for an agent suitable as your template. For example:

- If you want to build a customer support agent, find an existing **FAQ Assistant** or **Ticket Classifier**
- If you want to build a document processor, find an existing **Document Summarizer** or **Form Parser**
- Look for agents with status **Approved** (green badge) — these have passed governance review

Click on the agent card to view its details: name, description, capabilities, constraints, and governance status.

**Expected outcome:** You've selected a source agent and can see its full blueprint details.

### Step 2: Click Clone

On the agent detail page, click the **Clone** button (usually in the top-right corner next to Actions).

A dialog appears:

> "Clone Agent"
> This will create a copy of [Source Agent Name] with all its settings. You can customize it in the next step.

Click **Confirm Clone**.

**Expected outcome:** System creates a clone. You're redirected to the Blueprint Studio with the cloned blueprint open.

### Step 3: Customize Name and Description

In the Blueprint Studio, update the agent metadata:

- **Agent Name:** Change to reflect the new use case. Example: If cloning "FAQ Assistant" for IT purposes, name it "IT FAQ Assistant"
- **Agent Description:** Update to describe the new purpose. Example: "Answers IT helpdesk questions for [your org]. Provides troubleshooting steps and escalates complex issues."
- **Project Name:** If different from source, update it. Example: "IT Support Agent"

Click **Save Metadata**.

**Expected outcome:** New name and description saved in the blueprint.

### Step 4: Modify Capabilities, Constraints, and Governance

Switch to the **Design** tab in Blueprint Studio. Update:

**Capabilities:**
- Which knowledge sources or integrations does this agent need? Add/remove from the source agent's list.
- Example: IT FAQ assistant might add integration with "IT Ticket System" that the HR FAQ assistant doesn't need.

**Constraints:**
- Rate limits: Adjust if the new use case has different traffic expectations.
- Data access: Remove unneeded data sources; add new ones specific to the new use case.
- PII handling: Update PII redaction rules if the new agent will handle different data types.
- Example: IT FAQ agent might need to access employee device IDs (but redact usernames).

**Governance:**
- Review the governance template. For low-risk use cases, the cloned governance may be sufficient.
- If the new agent has different risk characteristics, update the policy template.
- Click **Review Policy** to see which governance rules will apply to this clone.

Update each section. Click **Save Design** when done.

**Expected outcome:** Customizations saved. Blueprint reflects your new agent's needs.

### Step 5: Regenerate Blueprint

Click the **Regenerate** button in Blueprint Studio.

The Generation Engine will:
1. Process your customized specifications
2. Produce a new Agent Blueprint Package (ABP)
3. Run validation against governance policies
4. Update the design diagram

This takes 30–60 seconds.

**Expected outcome:** Regeneration complete. The Validation panel appears.

### Step 6: Validate Against Policies

Review the Validation Results:

- **Status:** Should show "Passed" (green checkmark)
- **Policy Adherence:** Check that all governance rules are satisfied
- **Risk Assessment:** Verify the new agent's risk profile
- **Warnings:** If any warnings appear, review them and adjust constraints as needed

If validation fails, review the error message, adjust your design (Step 4), and regenerate.

Once validation passes, click **Submit for Review** to send the blueprint to the governance review queue.

**Expected outcome:** Blueprint submitted for approval. You receive a confirmation with review queue reference number.

## Verification

Your cloned and customized agent is ready when:

1. **Cloning Succeeded:** The new agent appears in the Registry with status "Draft" or "In Review"
2. **Customizations Applied:** Name, description, and design reflect your new use case
3. **Validation Passed:** Validation report shows zero errors
4. **Governance Met:** All policies applicable to the new agent are satisfied
5. **Review Submitted:** Blueprint is in the review queue awaiting approval

Navigate to **Agent Registry > Draft/In Review** and verify your new agent is listed. Click on it to confirm all customizations were saved correctly.

## Next Steps

- [Create a new agent from scratch](03-011) if you need to build something very different from existing templates
- [Deploy your agent to production](04-002) once approved
- [Set up monitoring](04-005) to track the new agent's performance
- [Clone this agent again](06-009) if you need more variants of the same design
