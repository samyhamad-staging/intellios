---
id: 07-007
title: Backup & Recovery
slug: backup-recovery
type: task
audiences:
- engineering
status: published
created: &id001 2026-04-05
updated: *id001
tags:
- backup
- disaster recovery
- RTO
- RPO
- recovery
- PostgreSQL
- PITR
tldr: Backup strategy, RTO/RPO targets, and disaster recovery procedures
---

# Backup & Recovery

This guide documents Intellios backup strategy, recovery procedures, and disaster recovery planning for financial services environments.

---

## Backup Strategy Overview

Intellios uses **layered backup approach** to balance safety, cost, and recovery speed:

1. **Automated PostgreSQL backups** (RDS): Continuous snapshots for point-in-time recovery
2. **ABP version history:** Agent blueprints versioned in database (inherent backup mechanism)
3. **Audit log immutability:** Logs cryptographically chained (tamper-proof history)
4. **Export snapshots:** Optional periodic exports to S3 for long-term retention

---

## PostgreSQL Backup (Primary)

### Configuration

**RDS Automated Backups** (recommended for all environments):

```bash
# AWS RDS PostgreSQL configuration
Parameter: backup-retention-period = 35 days
Parameter: backup-window = 02:00-03:00 (UTC) — low-traffic window
Parameter: multi-az = true  # Automatic failover to standby
Parameter: storage-encryption = true  # AES-256 at rest
Parameter: enable-iam-database-authentication = true
```

**Why RDS automated backups:**
- Fully managed (no operational overhead)
- Point-in-time recovery (restore to any second in 35-day window)
- Automatic replication across AZs
- Encryption at rest

### Backup Frequency

**Incremental backups:** Occur continuously throughout the day

**Full backups:** Once daily (scheduled during low-traffic window: 2–3 AM UTC)

**Retention:** 35 days (tunable per organization)

---

## Point-in-Time Recovery (PITR)

### How It Works

RDS maintains transaction logs that enable recovery to **any second** within the 35-day retention window.

**Example scenario:**

```
2026-04-05 10:30:00 UTC — Agent corrupted (bad governance policy deployed)
           10:45:00 UTC — Issue discovered
           10:50:00 UTC — Initiate recovery to 10:29:59 UTC (1 second before corruption)

Result: Database restored with agent in clean state; 1 minute of transactions lost
```

### Recovery Procedure

**Step 1: Assess the incident**

```bash
# Determine point-in-time to recover to
# Check CloudWatch logs for when corruption occurred
# Consult audit log: SELECT * FROM audit_logs WHERE resource_id = 'agent-xyz' ORDER BY timestamp DESC;
```

**Step 2: Create recovery database (non-destructive)**

```bash
# Use AWS CLI to restore to specific point in time
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier intellios-prod \
  --target-db-instance-identifier intellios-recovery-temp \
  --restore-time 2026-04-05T10:29:59Z

# Wait ~10 minutes for recovery database to become available
aws rds describe-db-instances \
  --db-instance-identifier intellios-recovery-temp \
  --query 'DBInstances[0].DBInstanceStatus'
# Output: "creating" ... "available"
```

**Step 3: Validate recovery database**

```bash
# Connect to recovery database
psql -h intellios-recovery-temp.xxxxx.rds.amazonaws.com -U postgres -d intellios

# Verify data integrity
SELECT COUNT(*) FROM agents;  # Should match expected count
SELECT COUNT(*) FROM audit_logs;
SELECT MAX(timestamp) FROM audit_logs;  # Should be ~10:29:59 UTC
```

**Step 4: Promote recovery database (if validation successful)**

```bash
# Option A: Promote recovery DB as new production
aws rds promote-read-replica --db-instance-identifier intellios-recovery-temp

# Option B: Selective restore (export data from recovery DB, import to production)
# Use this if recovery DB is ahead/behind by too much
pg_dump -h intellios-recovery-temp.xxxxx.rds.amazonaws.com -U postgres intellios > dump.sql
psql -h intellios-prod.xxxxx.rds.amazonaws.com -U postgres intellios < dump.sql
```

**Step 5: Failover & cleanup**

```bash
# Update application DNS to point to restored database
# Update CI/CD environment variables with new RDS endpoint

# Delete temporary recovery database
aws rds delete-db-instance \
  --db-instance-identifier intellios-recovery-temp \
  --skip-final-snapshot
```

---

## ABP Version History

### Built-in Backup via Versioning

Every agent blueprint change is automatically versioned:

```sql
-- ABP version history in database
SELECT id, agent_id, version, blueprint, created_at FROM agent_versions
WHERE agent_id = 'credit-agent'
ORDER BY created_at DESC;

-- Output:
-- v1.5.0 (created 2026-04-05 10:45:00) — current
-- v1.4.0 (created 2026-04-04 14:32:00)
-- v1.3.0 (created 2026-04-03 09:15:00)
-- ...
```

### Recovery from ABP Corruption

If agent blueprint is corrupted:

```bash
# Restore to previous version via UI:
Agent Registry → [agent name] → Version History → [v1.4.0] → "Restore to this version"

# Or via CLI:
intellios abp restore --agent=credit-agent --version=v1.4.0
```

**Benefits:**
- No database recovery needed
- Minimal downtime (seconds)
- Full audit trail (who restored, when, why)

---

## Audit Log Immutability

### Cryptographic Chaining

Audit logs are linked via cryptographic hash to prevent tampering:

```
Log entry 1: hash1 = SHA256(timestamp + action + resource_id)
Log entry 2: hash2 = SHA256(hash1 + new_timestamp + new_action + new_resource_id)
Log entry 3: hash3 = SHA256(hash2 + ...)
```

If anyone modifies log entry 2, hash3 becomes invalid (breach detected).

### Recovery Strategy

Audit logs serve as **evidence** for recovery, not the recovery mechanism:

```bash
# Export audit logs for compliance/legal hold
intellios audit-log export --start-date=2026-03-01 --end-date=2026-04-05 --format=json > audit-log-q1-2026.json

# Verify integrity
intellios audit-log verify --file=audit-log-q1-2026.json
# Output: "Audit log integrity verified (2,847 entries, no tampering detected)"
```

---

## RTO & RPO Targets

**RTO (Recovery Time Objective):** Maximum acceptable downtime

**RPO (Recovery Point Objective):** Maximum acceptable data loss

### Intellios Service Levels

For **financial services deployments:**

| Scenario | RTO | RPO | Procedure | Est. Time |
|---|---|---|---|---|
| **Single row corruption** | 15 min | 0 seconds | PITR to 1 sec before event | 10-15 min |
| **Agent blueprint loss** | 5 min | 0 seconds | Restore from version history | 2-5 min |
| **Database outage** | 30 min | < 5 min | RDS failover to standby (multi-AZ) | 5-10 min |
| **Region failure** | 4 hours | < 1 hour | Restore to different region | 2-4 hours |
| **Complete data loss** | 24 hours | < 1 hour | Restore from S3 daily export | 12-24 hours |

### Achieving Targets

**RTO 30 min / RPO < 5 min:**
- Multi-AZ RDS deployment (automatic failover: 5-10 min)
- Continuous backup (RPO < 5 min)

**RTO 4 hours / RPO < 1 hour (cross-region):**
- S3 export snapshots every 1 hour
- Restore to secondary region on demand

**RTO 24 hours / RPO < 1 hour (complete loss):**
- Daily export to S3 with 30-day retention
- Off-region replication

---

## Disaster Recovery Plan

### Failure Scenarios & Response

#### Scenario 1: Database Connection Failure

**Symptoms:**
- API returns 500 errors (cannot connect to database)
- Dashboard displays "Service unavailable"
- Deployment blocked

**Response:**
1. **Check database status:** `aws rds describe-db-instances --db-instance-identifier intellios-prod`
2. **If database is down:** Wait for RDS to auto-failover (5-10 min) OR manually reboot
3. **If database is up, network issue:** Check security groups, VPC routing, NAT gateway
4. **Contact AWS support** if unresolved after 15 min

**RTO:** 5-15 min (auto-failover) or 30 min (manual intervention)

---

#### Scenario 2: Accidental Data Deletion

**Symptoms:**
- Critical agent missing from Registry
- Audit log shows DELETE event
- Users report "My agent disappeared"

**Response:**
1. **Assess scope:** `SELECT COUNT(*) FROM agents WHERE deleted = true` (how many agents deleted?)
2. **Create recovery database:** PITR to timestamp before deletion (see PITR procedure above)
3. **Validate recovery:** Confirm deleted agent exists in recovery database
4. **Selective restore:** Export deleted agent from recovery DB, import to production
5. **Inform users:** Notify that agent has been restored to version [vX.Y.Z]

**RTO:** 30-60 min (PITR + validation + import)

**RPO:** < 5 min (depends on backup frequency)

---

#### Scenario 3: Ransomware/Breach

**Symptoms:**
- All governance policies encrypted with ransom note
- Audit logs showing suspicious activity
- Alerts from intrusion detection system

**Response (Incident Response Plan):**
1. **Immediately isolate:** Take Intellios instance offline (kill containers, disable API)
2. **Preserve evidence:** Collect logs, snapshots of corrupted data
3. **Escalate to security team:** Activate incident response protocol
4. **Restore from backup:** PITR to point before compromise detected
5. **Update credentials:** Rotate all database passwords, API keys, SSL certs
6. **Security hardening:** Add WAF rules, enable VPC Flow Logs, increase monitoring

**RTO:** 4 hours (assessment + forensics + restoration + hardening)

**RPO:** < 1 hour (restore from backup)

---

#### Scenario 4: Region Failure (AWS Outage)

**Symptoms:**
- All requests timeout (AWS region is down)
- RDS multi-AZ failover has occurred within region, but region-level failure is ongoing
- Alternative region available but not pre-configured

**Response:**
1. **Assess:** Is AWS region completely down? Check AWS Health Dashboard
2. **If outage > 30 min:** Initiate cross-region failover
3. **Restore in secondary region:**
   ```bash
   # Create new RDS instance in secondary region from latest S3 backup
   aws rds restore-db-instance-from-s3 \
     --db-instance-identifier intellios-recovery-region-2 \
     --s3-bucket-name intellios-backups \
     --s3-prefix daily-exports/2026-04-05
   ```
4. **Re-deploy Intellios:** Spin up containers in secondary region; update DNS
5. **Verify:** Test agent creation, governance validation, approval workflows

**RTO:** 2-4 hours (cross-region restore is slow)

**RPO:** 1 hour (daily S3 exports)

---

## Backup Testing & Validation

### Monthly Backup Test

**Procedure:** Every first Wednesday of month, run full recovery test.

```bash
#!/bin/bash
# monthly-backup-test.sh

# 1. Create recovery database from backup
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier intellios-prod \
  --target-db-instance-identifier intellios-test-$(date +%Y%m%d) \
  --restore-time $(date -d "24 hours ago" -Iseconds)

# 2. Wait for recovery
sleep 600  # 10 minutes

# 3. Validate data integrity
psql -h intellios-test-$DATE.rds.amazonaws.com -c "SELECT COUNT(*) FROM agents" > /tmp/agent-count.txt
psql -h intellios-test-$DATE.rds.amazonaws.com -c "SELECT COUNT(*) FROM audit_logs" > /tmp/audit-count.txt

# 4. Verify counts match production
PROD_AGENTS=$(aws rds describe-db-instances... | jq '..')
TEST_AGENTS=$(cat /tmp/agent-count.txt)
if [ "$PROD_AGENTS" != "$TEST_AGENTS" ]; then
  echo "FAIL: Agent count mismatch"
  exit 1
fi

# 5. Delete recovery database
aws rds delete-db-instance --db-instance-identifier intellios-test-$(date +%Y%m%d) --skip-final-snapshot

echo "PASS: Backup test successful"
```

**Success criteria:**
- Recovery database available within 10 min
- Data integrity verified (row counts match)
- Audit log hashes valid (no tampering detected)

**Failure action:** Alert engineering team; review backup configuration; repeat test after fix.

---

## Compliance & Retention

### Data Retention Policy

| Data Type | Retention Period | Storage Location |
|---|---|---|
| **Production data** | Indefinite | RDS PostgreSQL |
| **Automated backups** | 35 days | RDS snapshots |
| **Manual exports** | 7 years | S3 (Glacier for older) |
| **Audit logs** | 7 years | RDS + S3 export |

**Regulatory requirements:**
- **SR 11-7 (Federal Reserve):** Audit logs retained 7 years
- **OCC guidance:** Model governance records retained 7 years
- **GDPR:** PII deleted on request (special procedures for audit logs)

### Legal Hold

If litigation anticipated:

```bash
# Freeze all deletions and backups
intellios backup hold --reason="litigation-case-123" --duration=indefinite

# Backup rotation pauses; all old backups retained
# Audit logs marked as legal hold (cannot delete)
```

**Unfreeze:**
```bash
intellios backup unhold --reason="litigation-resolved" --case-id=123
```

---

## Backup Monitoring

### Automated Alerts

CloudWatch alarms notify if backups fail:

```
Alert: "RDS Automated Backup Failed"
Severity: CRITICAL
Trigger: backup-window completed without successful snapshot
Action: Page on-call engineer

Alert: "Backup Retention Approaching Limit"
Severity: WARNING
Trigger: 30-day backups aging to 35-day limit
Action: Consider extending retention or exporting to S3
```

### Dashboard

Backup health dashboard shows:

- Last successful backup: `2026-04-05 03:12:00 UTC`
- Next backup scheduled: `2026-04-06 02:00:00 UTC`
- Retention: `35 days` (removes backups older than 35 days)
- S3 exports: Latest export `2026-04-05 01:00:00 UTC`
- Recovery test: Last successful `2026-04-01`

---

## Documentation & Runbooks

Store runbooks in version control:

```
/docs/runbooks/
├── backup-pitr-recovery.md
├── cross-region-failover.md
├── ransomware-response.md
└── data-corruption-recovery.md
```

Update after every recovery test or incident (lessons learned).

---

## Support & Escalation

**For backup/recovery questions:**
- Engineering team: [PLACEHOLDER: engineering@intellios.com]
- On-call engineer (P1 incidents): [PLACEHOLDER: on-call rotation]
- AWS support (account-level): [PLACEHOLDER: AWS Enterprise Support]

---

## Related Documentation

- [Escalation Paths](./escalation-paths.md) — Support procedures for backup/recovery issues
- [Architecture docs](../../docs/architecture/) — System design and data flow
