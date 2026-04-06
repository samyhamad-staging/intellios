---
id: 07-008
title: "How to Promote an Agent from Staging to Production"
slug: promote-agent-to-production
type: task
audiences:
  - engineering
status: published
version: 1.0.0
platform_version: 1.2.0
created: "2026-04-05"
updated: "2026-04-05"
tags:
  - deployment
  - production
  - agent-lifecycle
  - operations
prerequisites:
  - 01-001
  - 03-005
related:
  - 07-010
  - 07-009
next_steps:
  - 07-010
feedback_url: "https://feedback.intellios.ai/kb"
tldr: "Verify agent is approved, select production deployment target, configure runtime adapters, run pre-deployment validation, deploy, then verify health checks pass."
---

## TL;DR

Move an approved agent blueprint from staging deployment to production by verifying approval status, configuring production adapters, running validation, and deploying with health checks.

## Goal

Move an approved agent blueprint from staging deployment to production.

## Prerequisites

- You have Engineering or Admin role in Intellios.
- The agent blueprint status is "Approved" (passed governance validation and human review).
- The agent has been tested and validated in staging for at least 48 hours.
- You know the production environment name and target cluster.
- A production runtime adapter is configured (or you have access to create one).

## Steps

1. **Open the Agent Registry.** Log in to Intellios and click **Registry** in the sidebar. Search for or navigate to the agent you want to promote.

2. **Verify approval status.** Click the agent name to open its detail view. Confirm the status badge shows "Approved". If status is "In Review" or "Draft", the agent is not ready for production promotion.

3. **Click Promote to Production.** In the top action bar, click **Promote to Production**. A promotion dialog will open.

4. **Select deployment target.** Choose your production environment from the **Deployment Target** dropdown (e.g., "Production / US-East"). You will see the target cluster name and region.

5. **Configure production runtime adapter.** A **Runtime Configuration** section will appear. Review or select the production runtime adapter (e.g., OpenAI GPT-4, Anthropic Claude, custom inference endpoint). Verify the endpoint URL and API credentials are set.

6. **Run pre-deployment validation.** Click **Validate for Production**. The system will check:
   - Blueprint syntax and schema compliance.
   - Governance policy compliance for the production environment.
   - Resource requirements (memory, compute, timeout settings).
   - Integration endpoints are reachable.
   A validation report will appear in seconds. If all checks pass, you will see a green checkmark. If any fail, address the issues before proceeding.

7. **Deploy.** Once validation passes, click **Deploy to Production**. The system will:
   - Create a deployment record.
   - Push the blueprint to the production cluster.
   - Start the agent service and runtime.
   You will see a progress bar. Deployment typically takes 2–5 minutes.

8. **Verify health check.** After deployment, the system will run automated health checks:
   - Service startup check (agent process running).
   - Connectivity check (runtime adapter reachable).
   - Sample inference test (a test query to verify the agent responds).
   If all checks pass, the agent status changes to "Production". You will see a success message: "Agent promoted to production successfully."

## Verification

- The agent status badge shows "Production" in the Registry list and detail view.
- The agent appears in the **Production Agents** filter (if available in your UI).
- Recent activity log shows a "Promoted to Production" event with timestamp.
- Health dashboard shows the agent with green status.
- Test queries to the production agent return responses (if API endpoint is exposed).

## Next Steps

- [How to Roll Back an Agent to a Previous Version](07-010)
- [How to Add a Team Member and Assign Roles](07-009)
