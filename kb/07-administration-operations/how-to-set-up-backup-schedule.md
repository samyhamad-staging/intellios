---
id: 07-014
title: "How to Set Up Automated Backups"
slug: set-up-backup-schedule
type: task
audiences:
  - engineering
status: published
version: 1.0.0
platform_version: 1.2.0
created: "2026-04-05"
updated: "2026-04-05"
tags:
  - backup
  - disaster-recovery
  - infrastructure
  - admin
  - rto
  - rpo
prerequisites:
  - 02-001
related:
  - 07-001
  - 07-003
next_steps: []
feedback_url: "https://feedback.intellios.ai/kb"
tldr: |
  Configure automated database backups with cloud storage (S3/Azure), set retention policy, test restore, and document recovery objectives in ~15 minutes.
---

## TL;DR

Set up automated backups in 6 steps: Infrastructure Settings → configure schedule (daily) → set retention → choose storage (S3/Azure) → test restore → document RTO/RPO.

## Goal

Configure automated database backups to ensure disaster recovery capability, minimize data loss (RPO), and meet recovery time objectives (RTO).

## Prerequisites

- You have Admin or Engineering role in Intellios
- You have infrastructure/DevOps access to Intellios deployment settings
- You have AWS S3 or Azure Blob Storage available for backup storage
- You have credentials (IAM keys or storage account keys) ready
- You understand your organization's backup requirements (e.g., daily backups, 30-day retention)
- You have ~15 minutes to complete setup and testing

## Steps

### Step 1: Access Infrastructure Settings

Log in as Admin. Click **Admin** in the top navigation, then select **Infrastructure > Backup Configuration**.

Alternatively, if using the Intellios command-line admin tool:

```bash
intellios-cli admin backup config
```

**Expected outcome:** Backup Configuration page appears with current backup status and schedule options.

### Step 2: Configure Backup Schedule

Under "Backup Schedule", select your backup frequency:

**Recommended:** **Daily** at 02:00 UTC (configurable to your timezone)

Options:

- **Every Hour:** Most protection; consumes most storage
- **Every 6 Hours:** Good balance; RPO = 6 hours
- **Daily (recommended):** Standard practice; RPO = 24 hours
- **Weekly:** Minimal storage; RPO = 7 days (acceptable only for low-risk systems)

Select **Daily** and set the preferred time. Example: 02:00 UTC (2 AM, low traffic time).

**Expected outcome:** Backup schedule selected and configured.

### Step 3: Set Retention Policy

Under "Retention Policy", configure how long backups are kept:

**Recommended:** **30 days minimum** (typical for compliance)

| Retention | Use Case |
|-----------|----------|
| 7 days | Development/staging only; not recommended for production |
| 30 days | Standard production; meets most compliance requirements |
| 90 days | Enhanced protection; recommended for high-value systems |
| 1 year | Long-term archive; for compliance/regulatory requirements |

Select your retention period. Example: **30 days**.

Intellios will automatically delete backups older than this period. Backups are verified before deletion.

**Expected outcome:** Retention policy set. You see: "Backups will be retained for 30 days. Automated cleanup on [date]."

### Step 4: Configure Backup Storage Target

Under "Storage Configuration", choose your cloud storage provider and enter credentials.

**Option A: AWS S3**

Fill in:

- **Bucket Name:** `intellios-backups-prod` (or your chosen name; must be unique globally)
- **Region:** `us-east-1` (or your AWS region)
- **IAM Access Key ID:** Your AWS IAM user's access key
- **IAM Secret Access Key:** Your AWS IAM user's secret key
- **Encryption:** Enable "Server-Side Encryption (SSE-S3)" (recommended)
- **Versioning:** Enable (optional; protects against accidental deletion)

**Prerequisites for S3:**

Create an S3 bucket in your AWS account. Create an IAM user with these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::intellios-backups-prod",
        "arn:aws:s3:::intellios-backups-prod/*"
      ]
    }
  ]
}
```

**Option B: Azure Blob Storage**

Fill in:

- **Storage Account Name:** `intelliosbackupsprod` (or your chosen name)
- **Container Name:** `intellios-backups`
- **Storage Account Key:** Your Azure storage account primary key
- **Encryption:** Enable "Storage Service Encryption" (recommended)

**Prerequisites for Azure:**

Create a storage account and container in your Azure subscription. Copy the access key from **Storage Account > Access keys > Key 1**.

**After entering credentials:**

Click **Test Storage Connection**. You should see: "Connection successful. Ready for backups."

**Expected outcome:** Storage configured and tested. Status shows "Connected to [S3/Azure]".

### Step 5: Test Restore Procedure

Before relying on backups, test that restore works. Click **Test Restore**.

The system will:

1. Trigger a manual backup (takes 5–10 minutes)
2. Restore to a test database
3. Verify data integrity
4. Report success or issues

Monitor the test progress. It should complete in 10–15 minutes.

**Expected outcome:** Test restore succeeds. You see: "Restore test completed successfully. All data verified."

If the test fails, troubleshoot:

- Confirm storage credentials are correct
- Verify the storage account/bucket has sufficient permissions
- Check that the storage is accessible from your Intellios deployment

### Step 6: Document Recovery Objectives

Create a backup disaster recovery plan documenting:

**Recovery Time Objective (RTO):**

- Definition: Maximum acceptable time to restore from backup
- Intellios RTO: ~30 minutes (full database restore from S3/Azure)
- Your organization's RTO: [determine based on business needs]

Example: "If production database is lost, we can restore within 30 minutes."

**Recovery Point Objective (RPO):**

- Definition: Maximum acceptable data loss (time since last backup)
- Intellios RPO with daily backups: 24 hours (all data from last 24 hours could be lost)
- Your organization's RPO: [determine based on business needs]

Example: "We accept loss of up to 24 hours of agent creation data."

**Document your plan:**

```markdown
# Intellios Backup & Disaster Recovery Plan

## Configuration
- **Backup Frequency:** Daily at 02:00 UTC
- **Storage Location:** AWS S3 (intellios-backups-prod)
- **Retention Period:** 30 days
- **Last Test:** 2026-04-05 (SUCCESS)

## Recovery Objectives
- **RTO (Recovery Time Objective):** 30 minutes
- **RPO (Recovery Point Objective):** 24 hours
- **Acceptable Data Loss:** Up to 24 hours of agent creation/modification data

## Restore Procedure
1. Navigate to Admin > Infrastructure > Restore from Backup
2. Select the desired backup from the list
3. Confirm target environment (staging recommended for first test)
4. Click "Restore"
5. Wait 10–15 minutes for restore to complete
6. Verify data integrity by checking key agents and audit logs
7. If test successful, restore to production if needed

## Contact
- **Primary:** DevOps Engineer (devops@company.com)
- **Secondary:** CTO (cto@company.com)

## Testing Schedule
- Test restore procedure monthly
- Review backup logs weekly
- Update this plan annually
```

Store this plan in your shared compliance/infrastructure folder.

**Expected outcome:** RTO/RPO documented and communicated to your organization.

## Verification

Your backup system is properly configured when:

1. **Backup Schedule Active:** Backup Configuration page shows "Status: Enabled" and next scheduled backup time
2. **Storage Configured:** Test connection succeeds; status shows "Connected to [S3/Azure]"
3. **Retention Policy Set:** Shows "Retaining backups for [X days]"
4. **Test Restore Passed:** Latest test restore succeeded with no errors
5. **RTO/RPO Documented:** Your organization has a documented disaster recovery plan

To verify ongoing:

- Check backup logs weekly: Admin > Infrastructure > Backup Logs
- Review backup sizes and growth: Confirm they're reasonable and within storage budget
- Monthly restore test: Restore a random backup to a staging environment and verify data integrity
- Quarterly plan review: Update RTO/RPO and contact information as needed

## Example Verification Checklist

```
Backup System Health Check
Date: 2026-04-05

[ ] Backup schedule is enabled (daily at 02:00 UTC)
[ ] Latest backup completed successfully (check logs)
[ ] Backup size is reasonable (~[X] GB)
[ ] Storage connection is active and tested
[ ] Retention policy is set to 30 days
[ ] Last restore test succeeded (within last 30 days)
[ ] RTO/RPO documented and communicated
[ ] Team knows how to restore (test monthly)

Verified by: ________________  Date: ________
```

## Next Steps

- Set up monitoring alerts for backup failures (Admin > Infrastructure > Monitoring)
- Configure backup notifications (get email when daily backup completes or fails)
- Schedule monthly restore tests with your DevOps team
- Review disaster recovery plan quarterly and update as needed
