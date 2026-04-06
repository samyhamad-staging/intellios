---
id: 07-009
title: "How to Add a Team Member and Assign Roles"
slug: add-team-member-assign-roles
type: task
audiences:
  - engineering
  - compliance
status: published
version: 1.0.0
platform_version: 1.2.0
created: "2026-04-05"
updated: "2026-04-05"
tags:
  - administration
  - user-management
  - rbac
  - access-control
prerequisites:
  - 01-001
related:
  - 07-011
  - 07-008
next_steps:
  - 07-011
feedback_url: "https://feedback.intellios.ai/kb"
tldr: "Navigate Admin > Users, click Invite, enter email, select role (Admin/Compliance Officer/Engineer/Viewer), send invite, then verify the user activates their account."
---

## TL;DR

Invite a new user to the Intellios platform and assign appropriate RBAC roles in 5 steps: navigate to Users, click Invite, enter email, select role, and send.

## Goal

Invite a new user to the Intellios platform and assign appropriate RBAC roles.

## Prerequisites

- You have Admin role in Intellios.
- You know the user's email address.
- You understand which role (Admin, Compliance Officer, Engineer, or Viewer) the user needs.
- The user's email is unique and not already registered in Intellios.

## Steps

1. **Log in and navigate to Admin.** Open Intellios, click **Admin** in the sidebar.

2. **Open Users section.** Click **Users** to see the team member list and invitation interface.

3. **Click Invite.** Click the **Invite User** or **+ Add Member** button. An invite form will appear.

4. **Enter email and select role.** Type the user's email address in the **Email** field. Then select their role from the **Role** dropdown:
   - **Admin** — Full platform access, can manage policies, users, deployments, and all features.
   - **Compliance Officer** — Can view and update governance policies, create compliance reports, review violations.
   - **Engineer** — Can create, edit, test, and deploy agents. Cannot modify governance policies or user access.
   - **Viewer** — Read-only access. Can view agents, policies, and registry but cannot make changes.

5. **Send invite.** Click **Send Invite** or **Invite**. A confirmation message will appear: "Invitation sent to [email]."

6. **Verify user activation.** The user will receive an email with a link to activate their account. They must click the link and set their password within 7 days. You can view the invitation status in the Users list (look for a "Pending" or "Invitation Sent" label next to their name).

7. **Confirm activation (optional).** Once the user activates, their status will change from "Pending" to "Active" in the Users list, and their role badge will appear next to their name.

## Verification

- The new user appears in the Users list with status "Active" (after they accept the invite).
- The user can log in with their email and password.
- The user's role badge matches what you assigned (Admin, Compliance Officer, Engineer, or Viewer).
- The user can access features appropriate to their role (e.g., only Compliance Officers can edit policies).
- Activity logs show the user's first login time.

## Next Steps

- [How to Create and Manage API Keys](07-011)
- [How to Promote an Agent from Staging to Production](07-008)
