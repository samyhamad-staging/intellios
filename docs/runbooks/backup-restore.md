# Backup & Restore Runbook

**Last updated:** 2026-04-05
**Owner:** Engineering Lead
**Status:** REQUIRES VERIFICATION — This runbook must be tested with a real restore drill before relying on it.

## Database Backup

### RDS Automated Backups (if using AWS RDS)

RDS automated backups are enabled by default with:
- **Retention:** 7 days (verify in AWS Console → RDS → DB instance → Maintenance & backups)
- **Backup window:** Configurable (recommend: 3:00–4:00 AM UTC, outside business hours)
- **Type:** Full daily snapshot + continuous transaction logs for point-in-time recovery

### Verify Backups Exist

```bash
# List available snapshots
aws rds describe-db-snapshots \
  --db-instance-identifier intellios-prod \
  --query 'DBSnapshots[*].[DBSnapshotIdentifier,SnapshotCreateTime,Status]' \
  --output table

# Check automated backup status
aws rds describe-db-instances \
  --db-instance-identifier intellios-prod \
  --query 'DBInstances[0].[BackupRetentionPeriod,LatestRestorableTime]' \
  --output table
```

## Restore Procedure

### Point-in-Time Recovery (preferred)

Use this when you know the exact time before the problem occurred:

```bash
# 1. Restore to a new instance (does NOT overwrite production)
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier intellios-prod \
  --target-db-instance-identifier intellios-restore-$(date +%Y%m%d) \
  --restore-time "2026-04-05T12:00:00Z" \
  --db-instance-class db.t3.medium

# 2. Wait for the restore instance to become available (~10-20 minutes)
aws rds wait db-instance-available \
  --db-instance-identifier intellios-restore-$(date +%Y%m%d)

# 3. Verify the restored data
# Connect to the restore instance and spot-check critical tables:
#   - SELECT count(*) FROM users;
#   - SELECT count(*) FROM agent_blueprints;
#   - SELECT max(created_at) FROM audit_log;

# 4. If verified, update the application to point to the restored instance:
#   - Update DATABASE_URL in Vercel environment variables
#   - Redeploy

# 5. Clean up the old instance after confirming production is stable
```

### Snapshot Restore

Use this when point-in-time recovery is not available:

```bash
# 1. List available snapshots
aws rds describe-db-snapshots \
  --db-instance-identifier intellios-prod \
  --output table

# 2. Restore from the most recent good snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier intellios-restore-$(date +%Y%m%d) \
  --db-snapshot-identifier [snapshot-id-from-step-1]

# 3-5. Same as point-in-time recovery above
```

## Recovery Drill Checklist

**Run this drill quarterly to verify backup/restore works:**

- [ ] Identify the most recent automated snapshot
- [ ] Restore to a temporary instance
- [ ] Connect and verify data integrity (row counts, latest timestamps)
- [ ] Run the application against the restored database (read-only test)
- [ ] Document recovery time (RTO) and any data gap (RPO)
- [ ] Delete the temporary instance
- [ ] Record results in `docs/log/health/`

## RPO/RTO Targets

| Metric | Target | Current Status |
|--------|--------|---------------|
| **RPO** (max data loss) | < 1 hour | Unverified — depends on RDS continuous backup |
| **RTO** (max downtime) | < 30 minutes | Unverified — estimated 15-20 min for RDS restore |

**These targets are aspirational until verified by a recovery drill.**

## S3 Artifact Backup

Blueprints, audit logs, and compliance evidence exported to S3 are durably stored with:
- S3 Standard storage class (99.999999999% durability)
- Versioning: Enable on the bucket for accidental deletion protection

```bash
# Verify S3 versioning is enabled
aws s3api get-bucket-versioning --bucket intellios-artifacts-prod
```
