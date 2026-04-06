---
id: 05-014
title: "How to Set Up Audit Logging for Compliance"
slug: set-up-audit-logging
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
  - logging
  - gdpr
  - sox
  - sr11-7
prerequisites:
  - 02-001
  - 05-001
related:
  - 05-001
  - 05-002
  - 07-013
next_steps:
  - 05-015
feedback_url: "https://feedback.intellios.ai/kb"
tldr: |
  Configure comprehensive audit logging for regulatory compliance (SR 11-7 — Guidance on Model Risk Management, SOX, GDPR). Set up logging, PII redaction, retention policy, and export targets (S3/Azure) in ~10 minutes.
---

## TL;DR

Enable audit logging in 6 steps: Admin > Audit Settings → enable comprehensive logging → set retention period → configure Personally Identifiable Information (PII) redaction → set up export targets → verify capture.

## Goal

Configure audit trail capture to meet regulatory requirements (SR 11-7 — Guidance on Model Risk Management, SOX, GDPR) and maintain a searchable, tamper-evident record of all system actions for compliance review.

## Prerequisites

- You have Admin or Compliance role in Intellios
- You understand audit requirements for your industry (SR 11-7 — Guidance on Model Risk Management, SOX, GDPR, etc.)
- You have access to cloud storage (AWS S3 or Azure Blob Storage) for audit log export
- You have ~10 minutes to complete setup
- Your Intellios instance is on platform version 1.2.0 or later

## Steps

### Step 1: Navigate to Audit Settings

Log in as Admin. Click **Admin** in the top navigation, then select **Security > Audit Settings**.

**Expected outcome:** Audit Settings page appears with toggle options for logging scopes and a configuration panel for export targets.

### Step 2: Enable Comprehensive Logging

Under "Logging Scope", ensure all audit event types are enabled:

- **User Actions:** Login, logout, permission changes, role assignments
- **Agent Lifecycle:** Creation, modification, validation, approval, deployment, deletion
- **Governance Events:** Policy creation, policy modification, policy application, governance rule triggers
- **Intake Events:** Session creation, payload submission, generation requests
- **Blueprint Events:** Blueprint generation, validation results, review submissions
- **Deployment Events:** Environment changes, configuration updates, rollbacks
- **Access Events:** API token creation, credential rotation, access denials
- **Data Events:** Data export, data deletion requests, PII access logs

Toggle **ON** for each category. If a "Comprehensive Logging" master toggle exists, click it to enable all at once.

**Expected outcome:** All logging categories enabled (green checkmarks visible).

### Step 3: Set Retention Period

Scroll to "Retention Policy". Set the retention period based on your compliance requirements:

- **Minimum:** 1 year (typical for SOX, SR 11-7)
- **GDPR:** 3 years recommended for data processing records
- **Industry-Specific:** Follow your regulator's guidance (check your audit scope document)

Select the retention period from the dropdown. For example, select **3 years** for GDPR-regulated organizations.

Intellios will automatically purge logs older than this period. Logs are backed up before deletion.

**Expected outcome:** Retention period set. You see confirmation: "Logs will be retained for [X years]. Automated cleanup scheduled for [date]."

### Step 4: Configure PII Redaction Rules

Under "PII Redaction", enable automatic redaction of sensitive data in logs:

- **Toggle:** Enable "Automatic PII Redaction"
- **Patterns to Redact:**
  - Email addresses: `***@company.com`
  - Employee IDs: `EMP-****`
  - Personally Identifiable Information (names, SSNs, etc.): `[REDACTED]`
  - Credit card numbers (if applicable): `****-****-****-****`
  - API keys and secrets: `[SECRET]`

Check all applicable redaction rules for your use case. You can also define custom regex patterns if needed.

**Expected outcome:** PII redaction enabled. Example: An audit entry that originally read "user@company.com created agent" will now read "***@company.com created agent".

### Step 5: Configure Export Targets

Under "Export Configuration", set up at least one backup target for audit logs:

**Option A: AWS S3**
- **Bucket Name:** `intellios-audit-logs-prod` (or your chosen name)
- **Region:** `us-east-1` (or your region)
- **Access Key ID:** Paste your AWS IAM user's access key
- **Secret Access Key:** Paste your AWS IAM user's secret key
- **Encryption:** Enable S3 server-side encryption (recommended)

Click **Test S3 Connection**. You should see: "Connection successful. Ready to export."

**Option B: Azure Blob Storage**
- **Account Name:** `yourcompanyauditlogs`
- **Container Name:** `intellios-audit-logs`
- **Access Key:** Paste your Azure storage account access key
- **Encryption:** Enable Azure encryption (recommended)

Click **Test Azure Connection**. You should see: "Connection successful. Ready to export."

**Export Frequency:** Select **Daily** (recommended for compliance) or **Hourly** if required.

**Expected outcome:** Export target configured and tested. Status shows "Connected and ready to export."

### Step 6: Verify Audit Events Are Captured

Perform a test action to verify logging is working:

1. Create a new agent blueprint (or modify an existing one)
2. Navigate to **Admin > Audit Logs**
3. Look for your action in the log (within 1–2 seconds)

Example entry you should see:
```
2026-04-05 14:32:15 | User: alice@company.com | Action: blueprint_created | Resource: "FAQ Assistant" | Details: "Blueprint ID: BPR-2026-0042" | Status: SUCCESS
```

Click on an entry to view its full details, including:
- Timestamp
- User who performed the action
- Action type
- Resource affected
- Outcome (success/failure)
- IP address and session ID (for forensics)

**Expected outcome:** Test action appears in audit log within 2 seconds. Log entry is complete and accurate.

## Verification

Audit logging is properly configured when:

1. **Logging Status:** Admin > Audit Settings shows all logging categories enabled
2. **Retention Policy:** Status shows "Retaining logs for [X years]"
3. **PII Redaction:** Test log entries show redacted values (***@company.com instead of actual email)
4. **Export Target:** Status shows "Connected to [S3/Azure]" and "Export scheduled for [frequency]"
5. **Log Capture:** Test action appears in audit log within 2 seconds
6. **Export Verification:** Check your S3/Azure container; you should see audit log files with today's date

Run this verification query in Admin > Audit Logs:
- Filter: Date = Today, Status = SUCCESS
- Expected result: Multiple entries including your test action

## Next Steps

- [Prepare for a regulatory examination](05-015) using audit logs as evidence
- [View an agent's complete audit history](07-013) for specific agent compliance review
- [Review governance compliance requirements](05-002) to understand what triggers audits
