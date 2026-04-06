---
id: 05-011
title: "How to Update an Existing Governance Policy"
slug: update-governance-policy
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
  - policies
  - compliance
  - versioning
prerequisites:
  - 01-001
  - 05-001
related:
  - 05-012
  - 05-013
next_steps:
  - 05-013
feedback_url: "https://feedback.intellios.ai/kb"
tldr: "Navigate Governance > Policies, select a policy, edit rules or severity levels, save as a new version, test against a sample blueprint, then activate to take effect."
---

## TL;DR

Update a governance policy's rules, severity levels, or scope without disrupting active validations by creating a new policy version, testing it, then activating it in production.

## Goal

Update a governance policy's rules, severity levels, or scope without disrupting active validations.

## Prerequisites

- You have Compliance Officer or Admin role in Intellios.
- You know the policy name and which rules need to change.
- You understand the current policy scope and target audience.
- At least one sample blueprint exists in the Registry for testing.

## Steps

1. **Log in and navigate to Governance.** Open Intellios, click **Admin** in the sidebar, then select **Governance > Policies**. You will see a list of all active policies.

2. **Select the policy to update.** Click the policy name to open its detail view. You will see the current rule set, severity levels, and scope.

3. **Click Edit.** Click the **Edit** button in the top right. The policy editor will open in edit mode.

4. **Modify rules, severity levels, or scope.** Make your changes:
   - Add or remove rules by clicking **+ Add Rule** or the **delete** icon.
   - Change severity levels (critical, high, medium, low, info) by clicking the dropdown next to each rule.
   - Update the policy scope (which agent types or blueprints it applies to) in the **Scope** section.
   - Add or update rule descriptions and remediation guidance.

5. **Save as a new version.** Click **Save**. The system will prompt you to confirm. A new version will be created (e.g., v1.1.0 if the previous was v1.0.0). You will see a confirmation message: "Policy updated to version X.X.X. Not yet active."

6. **Test against a sample blueprint.** Click **Test Policy**. Select a sample blueprint from the Registry. The policy will validate against it. You will see a report showing which rules pass and which fail.

7. **Review test results.** If violations are unexpected, click **Edit** again to refine the rules. Repeat the test until you are satisfied.

8. **Activate the new version.** Once testing is complete, click **Activate**. The new version will become the active policy. A success message will appear: "Policy X version X.X.X is now active."

## Verification

- The policy detail view shows the new version number and status as "Active".
- Newly validated blueprints use the updated rules (check a newly submitted blueprint's validation report).
- Previous policy versions remain available in the **Version History** tab for rollback if needed.
- The timestamp in the policy list shows the recent update time.

## Next Steps

- [How to Investigate a Governance Violation](05-013)
- [How to Export a Compliance Report for an Auditor](05-012)
