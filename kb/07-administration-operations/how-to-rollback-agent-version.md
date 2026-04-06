---
id: 07-010
title: "How to Roll Back an Agent to a Previous Version"
slug: rollback-agent-version
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
  - rollback
  - agent-lifecycle
  - incident-response
prerequisites:
  - 01-001
  - 03-005
related:
  - 07-008
  - 07-009
next_steps:
  - 07-008
feedback_url: "https://feedback.intellios.ai/kb"
tldr: "Navigate Agent Registry, find agent, click Versions, select target version, click Deploy This Version, confirm rollback, and verify deployment health."
---

## TL;DR

Revert a deployed agent to a known-good previous version by navigating to Versions, selecting the target version, deploying it, and confirming health checks.

## Goal

Revert a deployed agent to a known-good previous version.

## Prerequisites

- You have Engineering or Admin role in Intellios.
- The agent has at least 2 versions in the Registry.
- You know which previous version is stable (or you have the version number).
- The agent is currently deployed (in staging or production).
- You understand why you are rolling back (e.g., new version has a bug or performance issue).

## Steps

1. **Log in and navigate to Registry.** Open Intellios, click **Registry** in the sidebar.

2. **Find and open the agent.** Search for or click the agent name you want to roll back. The detail view will open.

3. **Click Versions.** In the agent detail view, click the **Versions** tab or button. You will see a list of all historical versions with metadata (creation date, deployment status, creator, validation status).

4. **Select target version.** Find the version you want to roll back to. Look for:
   - A previous version marked "Production" or "Stable".
   - The most recent version before the problematic change was made.
   - A version with a note or tag indicating it was known-good (if your team uses version tags).
   Click the version row to select it. You will see a detail pane showing the version's blueprint, governance validation status, and deployment history.

5. **Click Deploy This Version.** A **Deploy** button or **Roll Back to This Version** button will appear. Click it. A confirmation dialog will appear asking: "Deploy version X.X.X to production?" or "This will overwrite the current deployment. Continue?"

6. **Confirm rollback.** Click **Confirm** or **Deploy**. The system will:
   - Create a new deployment record (tracked as a rollback event).
   - Push the previous blueprint version to the runtime.
   - Restart the agent service with the old configuration.
   A progress bar will show. Rollback typically takes 1–3 minutes.

7. **Verify deployment health.** After rollback completes, the system will run automated health checks:
   - Service restart check (agent process running).
   - Runtime connectivity check.
   - Sample inference test.
   If all checks pass, the agent status returns to "Production" and you will see a success message: "Rollback successful. Agent is running version X.X.X." If health checks fail, contact support.

## Verification

- The agent detail view shows the rolled-back version number.
- The Versions tab shows the current deployed version (often marked with a "Currently Deployed" badge).
- The activity log shows a "Rollback" event with timestamp.
- Recent test queries to the agent succeed (if API endpoint is exposed).
- The agent health dashboard shows green status.
- Users or downstream systems report that the agent is working correctly again.

## Next Steps

- [How to Promote an Agent from Staging to Production](07-008)
- [How to Add a Team Member and Assign Roles](07-009)
