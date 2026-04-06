---
id: 05-013
title: "How to Investigate a Governance Violation"
slug: investigate-governance-violation
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
  - governance
  - compliance
  - troubleshooting
  - violations
prerequisites:
  - 01-001
  - 05-001
related:
  - 05-011
  - 05-012
next_steps:
  - 05-011
feedback_url: "https://feedback.intellios.ai/kb"
tldr: "Open validation report, identify violation (policy, rule, field path, severity), check error vs warning, review policy rule definition, decide if ABP needs modification or policy needs update, then take corrective action."
---

## TL;DR

Determine why a blueprint failed governance validation by opening the report, identifying the violation details, reviewing the policy rule, and deciding whether to modify the agent blueprint or update the policy.

## Goal

Determine why a blueprint failed governance validation and decide how to resolve it.

## Prerequisites

- You have Compliance Officer or Engineer role in Intellios.
- A governance validation has failed on a blueprint you are responsible for.
- You have access to the validation report or governance review queue.
- You understand your organization's governance policies (or can access the policy documentation).

## Steps

1. **Open the validation report.** Navigate to one of these locations:
   - **From Registry:** Click an agent, open the **Validation** tab, and look for a "Failed" or "Violations" status.
   - **From Review Queue:** Click **Review** in the sidebar, find the blueprint in the queue, and open its validation report panel.
   - **From Intake:** If validating a blueprint during creation, you will see the report in the **Validation Results** section.
   The report will display a list of violations.

2. **Identify the violation.** Find the specific rule that failed. The report will show:
   - **Policy Name** — e.g., "Data Privacy Policy", "Security Baseline".
   - **Rule Name** — e.g., "All agents must have encryption enabled".
   - **Field Path** — e.g., `blueprint.configuration.encryption.enabled`. This tells you exactly which part of the blueprint failed.
   - **Severity Level** — Critical, High, Medium, Low, or Info.
   - **Message** — A brief explanation of what went wrong (e.g., "Expected 'true', got 'false'").

3. **Check severity level.** Determine if the violation is blocking or advisory:
   - **Critical/High** — The blueprint cannot be approved until this is fixed. You must take corrective action.
   - **Medium/Low/Info** — Warnings. The blueprint can be approved with acknowledgment, but it is recommended to fix these.

4. **Review the policy rule definition.** Click the rule name or a **View Rule** link in the report. A policy rule detail panel will open showing:
   - The exact rule logic and parameters.
   - The rationale (why this rule exists).
   - Remediation guidance (how to fix it).
   - The policy version that defines this rule.
   For example, a rule might say: "All agent models must be from an approved list" and provide the list of approved models.

5. **Decide: Modify the blueprint or update the policy?** Ask yourself:
   - **Should I modify the blueprint?** If the rule is correct and your blueprint violates it for no good reason, modify the blueprint. Example: Change the agent model to an approved one.
   - **Should I update the policy?** If the rule is outdated, too strict, or does not reflect current requirements, request a policy update. Example: Request to add a new model to the approved list.
   - **Should I acknowledge the warning?** If the violation is Low/Info severity and acceptable in your context, some policies allow you to acknowledge it with a comment (e.g., "Encryption disabled for local testing only").

6. **Take corrective action.**
   - **If modifying the blueprint:** Go back to the Blueprint Studio, edit the field in question, and re-validate. The violation should resolve.
   - **If requesting a policy update:** Contact your Compliance Officer or governance team. Reference the policy name, rule, and reason for the change. They can create a new policy version (see "How to Update an Existing Governance Policy").
   - **If acknowledging the warning:** Click **Acknowledge**, add a comment explaining why this is acceptable, and submit.

7. **Validate again.** After making changes, re-run validation by clicking **Validate** or **Re-validate**. The report will update. If the violation still appears, review your changes and the rule definition again.

## Verification

- The validation report shows no Critical or High violations (or only acknowledged ones).
- The blueprint status changes from "Failed Validation" to "Passed Validation" or "Approved".
- If you modified the blueprint, the changed field now matches the rule requirement (check the report details).
- If you requested a policy update, a new policy version is in progress or marked as requested (visible in the Governance > Policies view).
- The blueprint can now proceed to review or deployment.

## Next Steps

- [How to Update an Existing Governance Policy](05-011)
- [How to Export a Compliance Report for an Auditor](05-012)
