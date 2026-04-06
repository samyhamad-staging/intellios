---
id: 03-011
title: "How to Create Your First Agent (End-to-End Tutorial)"
slug: create-first-agent
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
  - getting-started
  - intake
  - blueprint
  - end-to-end
  - tutorial
prerequisites: []
related:
  - 02-001
  - 03-002
  - 04-001
next_steps:
  - 04-002
  - 05-001
feedback_url: "https://feedback.intellios.ai/kb"
tldr: |
  Walk through the complete end-to-end workflow: start an intake session, capture enterprise requirements for an internal FAQ assistant, generate a blueprint, validate it, and submit for approval.
---

## TL;DR

Create an end-to-end agent in 8 steps: start intake → complete context form → have intake conversation → review payload → generate blueprint → check validation → submit review → approve.

## Goal

Walk through creating, validating, and reviewing an agent blueprint from scratch using a real-world example (internal FAQ assistant).

## Prerequisites

- You have an Intellios account with Engineering or Product role
- You understand the Agent Blueprint Package (ABP) concept ([02-001](../02-foundations/glossary.md))
- You have access to the Intake Engine UI
- You have ~15 minutes to complete the workflow

## Steps

### Step 1: Access the Intake Engine

Navigate to **Home > Intake** or directly to `/app/intake`. You should see a "New Intake Session" button.

**Expected outcome:** Intake Engine dashboard visible with existing sessions (if any) and New Session button prominent.

### Step 2: Start a New Intake Session

Click **New Intake Session**. You'll be prompted to select a project or create one. Select **Create New Project**. Name it "Internal FAQ Assistant" and set scope to "Internal Tool - Low Risk".

**Expected outcome:** You're now in the intake form with 5 sections visible: Context, Capabilities, Constraints, Governance, and Deployment.

### Step 3: Complete the Context Section

Fill in the context form with this example data:

- **Enterprise Name:** Example Corp (or your org name)
- **Agent Name:** FAQ Assistant
- **Purpose:** Answer internal HR, IT, and finance FAQs 24/7
- **Primary Users:** All employees (500 total)
- **Data Sources:** Internal wiki (read-only), knowledge base, past tickets
- **Risk Level:** Low (no financial transactions, no external data)
- **Compliance Requirements:** None (internal-only tool)

Click **Next** to proceed to Capabilities.

**Expected outcome:** Context data saved; Capabilities form appears.

### Step 4: Define Capabilities

In the Capabilities section, specify what the agent can do:

- **Retrieve Knowledge:** Can search internal wiki and FAQ database
- **Answer Questions:** Can synthesize FAQ content to answer employee questions
- **Escalate:** Can route complex questions to human support
- **Constraint:** Cannot provide legal or medical advice; must include disclaimers

Click **Next** to Constraints.

**Expected outcome:** Capabilities section completed; Constraints form visible.

### Step 5: Set Constraints and Governance

In Constraints, specify limits:

- **Rate Limit:** 100 requests/minute per user
- **Data Access:** Read-only to wiki; no write permissions
- **PII Handling:** Must redact employee IDs and email addresses in responses
- **Data Retention:** Conversation logs kept for 30 days for audit

In Governance, select:

- **Policy Template:** Standard Internal Tool Policy
- **Approval Required:** Yes (submit for human review)

Click **Next** to Deployment.

**Expected outcome:** Constraints and governance configured; Deployment form visible.

### Step 6: Configure Deployment

Set deployment preferences:

- **Environment:** Staging (for initial testing)
- **Access:** Internal (only Example Corp employees)
- **Authentication:** Use existing SSO (if configured)
- **Monitoring:** Enable basic monitoring

Click **Review Intake Payload**.

**Expected outcome:** System displays the complete intake payload (JSON) for review.

### Step 7: Review and Generate Blueprint

Review the intake payload. It should contain all sections you filled in. If correct, click **Generate Blueprint**.

The system will:
1. Validate the intake payload against schema
2. Invoke the Generation Engine
3. Produce an Agent Blueprint Package (ABP)

This takes 30–60 seconds.

**Expected outcome:** Generation complete; Blueprint Studio appears with the generated blueprint, design diagram, and validation report.

### Step 8: Review Validation and Submit for Approval

In Blueprint Studio, review the Validation Results panel. You should see:

- **Status:** Passed (green checkmark)
- **Policy Adherence:** All policies met
- **Risk Assessment:** Low risk confirmed
- **Recommendations:** Any optional improvements

Click **Submit for Review** to send the blueprint to the governance review queue.

**Expected outcome:** Blueprint submitted; you receive a confirmation message with review queue reference number (e.g., "REV-2026-0045").

### Step 9: Approve (if authorized)

If you have Compliance or Admin role, navigate to **Review Queue** (`/app/review`). Find your submission. Click **Approve** if you agree governance is sound.

If you don't have approval authority, your blueprint will be in the review queue for an authorized reviewer.

**Expected outcome:** Blueprint marked as approved and ready for deployment.

## Verification

Your first agent is successfully created when:

1. You see the blueprint in **Agent Registry** with status **Approved**
2. The audit trail shows: Intake → Generation → Validation → Review → Approval
3. You can view the blueprint details and generated design diagram
4. The governance report shows zero policy violations

Navigate to **Registry > All Agents** and search for "FAQ Assistant". You should see it listed with a green "Approved" badge.

## Next Steps

- [Deploy your agent to production](04-002)
- [Set up monitoring and alerts](04-005)
- [Clone this agent for another use case](06-009)
