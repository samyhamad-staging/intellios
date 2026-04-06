---
id: "10-016"
title: "Compliance Evidence Export or Audit Report Fails to Generate"
slug: "compliance-report-generation-errors"
type: "troubleshooting"
audiences: ["compliance", "engineering"]
status: "published"
version: "1.0.0"
platform_version: "1.2.0"
created: "2026-04-05"
updated: "2026-04-05"
tags: ["compliance", "reporting", "audit", "export", "evidence"]
tldr: "Compliance report or evidence export fails to generate. Causes: missing validation reports, incomplete blueprint lifecycle (not approved), database query timeout on large datasets. Verify blueprint compliance status and check data volume."
feedback_url: "https://feedback.intellios.ai/kb"
---

## TL;DR

Compliance report export or audit evidence generation fails. Causes: blueprint missing validation reports (not run against governance policies), incomplete lifecycle (blueprint not approved), database query timeout on large datasets. Run governance validation and verify blueprint approval status.

---

## Symptom

- Report generation returns error: `REPORT_GENERATION_FAILED`
- Export button returns HTTP status code **400 Bad Request** or **500 Internal Server Error**
- Audit report shows: "Cannot generate report: incomplete data"
- Compliance evidence export times out after 5 minutes
- Report generation attempts repeatedly fail with same error

---

## Possible Causes (by likelihood)

1. **Missing validation reports** — Blueprint has no governance validation results attached
2. **Incomplete lifecycle transitions** — Blueprint not yet approved or not fully deployed
3. **Database query timeout** — Dataset too large (>100K records); query exceeds 30-second limit
4. **Missing audit logging data** — Blueprint lacks required audit trail entries
5. **Insufficient permissions** — User cannot access all data required to generate report

---

## Diagnosis Steps

### Step 1: Check blueprint compliance status
Log into platform → Blueprints → [Blueprint] → Compliance. Look for:
- **Validation Status:** "Passed" or "Failed" (not "Not Run" or "Pending")
- **Approved:** Boolean flag should be True
- **Lifecycle Status:** Should be "Approved" or "Deployed" (not "Draft")

If status is "Draft" or validation is "Not Run", blueprint cannot be included in compliance reports.

### Step 2: Verify governance validation exists
```bash
# Check if validation report is attached to blueprint
curl -H "Authorization: Bearer $TOKEN" \
  https://api.intellios.ai/v1/blueprints/{blueprint_id}/governance | jq '.validation_report'

# Expected response:
# {
#   "validation_id": "val_xyz",
#   "passed": true,
#   "violations": [],
#   "generated_at": "2026-04-05T09:30:00Z"
# }

# If validation_report is null or empty, no validation exists
```

### Step 3: Check blueprint approval status
```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://api.intellios.ai/v1/blueprints/{blueprint_id} | jq '.approved, .approval_date, .lifecycle_status'

# Expected:
# "approved": true
# "approval_date": "2026-04-04T15:22:00Z"
# "lifecycle_status": "approved"

# If any are missing or false, blueprint not fully approved
```

### Step 4: Test report generation with reduced scope
```bash
# Try generating report for a single blueprint (not batch)
curl -X POST -H "Authorization: Bearer $TOKEN" \
  https://api.intellios.ai/v1/compliance/reports \
  -H "Content-Type: application/json" \
  -d '{
    "report_type": "evidence_export",
    "blueprint_ids": ["blueprint_single_id"],
    "format": "pdf"
  }'

# If single blueprint works, issue is related to data volume
# If single blueprint fails, issue is with that blueprint
```

### Step 5: Check data volume
```bash
# Query the number of blueprints with approved status
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.intellios.ai/v1/blueprints?status=approved" | jq '.blueprints | length'

# Query audit log size for a blueprint
curl -H "Authorization: Bearer $TOKEN" \
  https://api.intellios.ai/v1/blueprints/{blueprint_id}/audit-log | jq '.entries | length'

# If blueprint has >10K audit entries or >1000 blueprints, consider data volume issue
```

### Step 6: Review report generation logs
Log into platform → Administration → Logs. Filter by "compliance-reports" or "report-generation". Look for:
- `VALIDATION_REPORT_MISSING` — Blueprint has no validation
- `BLUEPRINT_NOT_APPROVED` — Blueprint lifecycle incomplete
- `QUERY_TIMEOUT` — Database query exceeded time limit
- `MISSING_AUDIT_DATA` — Audit trail not fully logged

---

## Resolution

### If missing validation reports:
1. Open blueprint in Review UI: Blueprints → [Blueprint] → Review
2. Click "Run Governance Check" button
3. Wait for validation to complete (typically 1-2 minutes)
4. Verify result: "✓ Passed" or "✗ Failed" with details
5. If failed, fix violations (see governance validation troubleshooting)
6. Once passed, try exporting report again
7. **Verify:** Validation report shows timestamp; export succeeds

### If blueprint not approved:
1. Check blueprint lifecycle status:
   - Blueprints → [Blueprint] → Lifecycle tab
   - Status should be "Approved" or "Deployed"
2. If status is "Draft" or "Under Review":
   - Submit blueprint to review: click "Submit for Review"
   - Wait for compliance/engineering approval (may take 24-48 hours)
   - Once approved, status will change
3. Alternatively, if you have compliance-admin role, approve immediately:
   - Click "Approve Blueprint"
4. **Verify:** Lifecycle status is now "Approved"; export works

### If database query timeout:
1. Reduce scope of report:
   - Instead of exporting all blueprints, select a date range (last 30 days)
   - Or select specific blueprints (e.g., high-risk only)
2. Use batch processing:
   ```bash
   # Instead of exporting 1000 blueprints at once, batch them in groups of 100
   curl -X POST -H "Authorization: Bearer $TOKEN" \
     https://api.intellios.ai/v1/compliance/reports \
     -d '{
       "report_type": "evidence_export",
       "blueprint_ids": ["bp_1", "bp_2", ..., "bp_100"],
       "async": true
     }'
   ```
3. Enable async report generation (returns job ID; results sent when ready)
4. **Verify:** Report completes successfully; can be downloaded from report dashboard

### If missing audit logging data:
1. Check blueprint audit logging configuration:
   - Blueprints → [Blueprint] → Governance → Audit Logging
   - Should show "Enabled" with retention period >=90 days
2. If disabled, enable it:
   - Click "Enable Audit Logging"
   - Set retention: 365 days (1 year recommended for compliance)
3. Wait 5 minutes for configuration to apply
4. Blueprint will start logging future actions immediately
5. For past data, it may be unrecoverable; note this in report
6. **Verify:** Audit logging enabled; future actions logged

### If insufficient permissions:
1. Check your user role:
   - Admin → Users → [Your Name]
   - Note your role (should be "compliance-admin" or "admin" to generate reports)
2. If role is "compliance-auditor" or lower, request role upgrade:
   - Contact your admin; request "compliance-admin" role
3. Admin grants role upgrade
4. Log out and log back in for role change to take effect
5. **Verify:** Role is now compliance-admin; can generate reports

---

## Prevention

- **Pre-approval checklist:** Before approving blueprints, ensure governance validation is run and passed
- **Lifecycle enforcement:** Require blueprints to pass validation before allowing approval (set in policy)
- **Audit trail completeness:** Enable audit logging on all blueprints at creation time
- **Report scheduling:** Schedule periodic compliance reports (monthly/quarterly); don't wait for last-minute urgent exports
- **Data archival:** Archive old approved blueprints; keeps active dataset smaller and queries faster
- **Monitoring:** Alert if report generation exceeds 5 minutes; investigate query performance

---

## Escalation

For recurring timeout issues or large-scale compliance reporting needs, see [escalation-paths.md](../escalation-paths.md). Consider database scaling or query optimization.

---

## Related Articles

- [Compliance Reporting Guide](../05-governance-compliance/compliance-reporting.md)
- [Audit Trail and Evidence Collection](../05-governance-compliance/audit-trails.md)
- [Blueprint Approval Workflow](../03-core-concepts/blueprint-approval.md)
- [Governance Validation Guide](../05-governance-compliance/governance-validation.md)
- [Performance Optimization for Large Datasets](../07-administration-operations/performance-tuning.md)
