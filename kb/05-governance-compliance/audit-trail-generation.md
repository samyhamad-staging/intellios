---
id: 05-008
title: Generate and Verify Audit Trails for Compliance Examination
slug: audit-trail-generation
type: task
audiences:
- compliance
status: published
version: 1.0.0
platform_version: 1.0.0
created: '2026-04-05'
updated: '2026-04-05'
author: Intellios
reviewers: []
tags:
- audit-trail
- compliance
- evidence-generation
- regulatory-examination
- sr-11-7
- documentation
prerequisites: []
related:
- 03-007
- 05-001
- 03-001
- 03-005
next_steps:
- 05-008
- 05-008
- 05-008
feedback_url: https://feedback.intellios.ai/kb
tldr: 'This task guide walks compliance teams through generating and exporting audit
  trails from Intellios for regulatory examination readiness. You will learn what
  Intellios captures automatically, how to retrieve audit evidence for specific agents,
  export compliance packages, generate time-filtered reports, configure retention
  policies, and verify audit trail completeness. Complete this task to ensure your
  audit evidence is examination-ready.

  '
---



# Generate and Verify Audit Trails for Compliance Examination

> **TL;DR:** This task guide teaches compliance teams how to generate and export audit trails from Intellios for regulatory examination. You will access audit records for specific agents, export evidence packages, generate compliance reports by date range, configure retention policies, and verify that audit trails are complete and examination-ready. Complete this task to have auditable proof of governance for every agent.

---

## Goal

By completing this task, you will have:

1. **Understood what Intellios captures automatically** — Every lifecycle transition, governance validation, review decision, and operational event
2. **Located audit trails for specific agents** — Navigated to the Agent Registry and accessed complete history for any agent
3. **Exported audit evidence packages** — Generated compliance documentation suitable for regulatory submission
4. **Generated time-filtered compliance reports** — Created evidence covering specific date ranges (quarterly, annual, incident-specific)
5. **Configured audit retention policies** — Set how long audit trails are retained and where archived evidence is stored
6. **Verified audit trail completeness** — Checked that all six components of the evidence chain (intake, generation, validation, review, deployment, monitoring) are present for each agent

---

## Prerequisites

Before starting, ensure you have:

- [ ] **Intellios Instance** — Intellios deployed and running in your compliance environment
- [ ] **Agent Registry Access** — Compliance team role or Administrator role that permits viewing agent records and audit logs
- [ ] **At Least One Approved Agent** — At least one agent with status=approved in your Registry (for testing)
- [ ] **API Access** — If using programmatic audit log retrieval, API credentials with compliance scope
- [ ] **Compliance Tools** — Text editor or spreadsheet tool for reviewing exported evidence

---

## Steps

### Step 1: Understand What Intellios Captures Automatically

**Context:** Every interaction with an agent in Intellios produces a timestamped, actor-attributed record. You don't need to manually log governance actions—the system captures them for you.

**Instruction:** Review the six categories of audit events that Intellios captures automatically.

| Category | Events Captured | Timestamp | Metadata |
|----------|---|---|---|
| **Intake Records** | Stakeholder input, requirements gathering, regulatory context selection | Each interaction | Actor identity, session ID, Phase (1/2/3) |
| **Generation** | ABP creation, schema version used, generator configuration, generation errors | Creation timestamp | Generation session ID, input lineage (from intake) |
| **Governance Validation** | Policy evaluation, violations detected, severity classification, remediation tracking | Validation run timestamp | Policy version, evaluator ID, policy count, violation count |
| **Review & Approval** | Reviewer assignment, review completion, approval/rejection decision, rationale comments | Review submission and decision timestamps | Reviewer ID, decision type, comment text |
| **Deployment** | Deployment command, environment target, deployment timestamp, version lock | Deployment timestamp | Deployed-by identity, target environment, Agent Blueprint Package (ABP) version |
| **Lifecycle Transitions** | Every state change (draft → in_review → approved → deprecated), triggers, guards | Transition timestamp | From-state, to-state, triggering actor, comment |

**Expected result:** You understand that Intellios automatically records all governance actions. No manual logging is required, and nothing can be backdated or deleted—the audit trail is immutable.

### Step 2: Access the Audit Trail for a Specific Agent

**Context:** You need to retrieve the complete governance history for a specific agent to verify compliance or prepare for examination.

**Instruction:** Navigate to the Agent Registry and view the audit trail for a specific agent.

#### Via Admin Dashboard (UI)

1. Open Intellios Admin Dashboard
2. Navigate to **Agent Registry** (left sidebar)
3. Select the agent you want to audit (e.g., "Loan Approval Agent v2.0.0")
4. Click the **History** tab
5. Review the timeline of events:
   - Creation date and creator
   - Governance validation runs (dates, policy versions, violations if any)
   - Review assignments and decisions
   - State transitions (draft → in_review → approved)
   - Deployment records
   - Any refinements or changes

**Expected result:** The History tab displays a complete timeline of all events for the selected agent, with timestamps, actor identities, and details of each action.

#### Via API

**Instruction:** If you have API access, retrieve audit logs programmatically.

```bash
# Get audit log for a specific agent
GET /api/blueprints/{agentId}/audit-log?limit=100

# Response structure:
{
  "agentId": "agent-uuid-123",
  "events": [
    {
      "eventId": "evt-001",
      "eventType": "blueprint_created",
      "timestamp": "2026-04-02T14:30:00Z",
      "actor": "alice@company.com",
      "actorRole": "designer",
      "details": {
        "fromStatus": null,
        "toStatus": "draft",
        "abpVersion": "1.0.0",
        "schemaVersion": "3.2.0"
      }
    },
    {
      "eventId": "evt-002",
      "eventType": "governance_validation",
      "timestamp": "2026-04-02T14:45:00Z",
      "actor": "system",
      "actorRole": "validator",
      "details": {
        "valid": true,
        "policyCount": 4,
        "violations": [],
        "policies": [
          "Safety Baseline",
          "Audit Standards",
          "Access Control Baseline",
          "Governance Coverage"
        ]
      }
    },
    {
      "eventId": "evt-003",
      "eventType": "submitted_for_review",
      "timestamp": "2026-04-02T15:00:00Z",
      "actor": "alice@company.com",
      "actorRole": "designer",
      "details": {
        "fromStatus": "draft",
        "toStatus": "in_review"
      }
    },
    {
      "eventId": "evt-004",
      "eventType": "approval_decision",
      "timestamp": "2026-04-03T10:15:00Z",
      "actor": "jane.smith@company.com",
      "actorRole": "compliance_reviewer",
      "details": {
        "decision": "approved",
        "reviewComment": "Governance controls are robust. Ready for production."
      }
    }
  ],
  "totalEvents": 4,
  "agent": {
    "id": "agent-uuid-123",
    "name": "Loan Approval Agent",
    "status": "approved",
    "version": "2.0.0"
  }
}
```

**Expected result:** Complete audit log in JSON format with all events, timestamps, and metadata for the agent.

### Step 3: Export Audit Evidence for Regulatory Examination

**Context:** Regulators or auditors may request a compliance evidence package for a specific agent or set of agents. You need to export audit trails in a format suitable for submission.

**Instruction:** Export a compliance evidence package.

#### Via Dashboard Export

1. Navigate to **Agent Registry** → **Compliance Reports** (section in left sidebar)
2. Select **Export Audit Evidence**
3. Choose scope:
   - Single agent (specify agent ID or name)
   - Multiple agents (select from list)
   - All approved agents
4. Choose format:
   - **JSON** — Complete structured data, suitable for technical review
   - **Markdown** — Human-readable narrative with evidence embedded
   - **PDF** — Formatted report with signatures and watermarks [PLACEHOLDER]
5. Click **Export**
6. System generates compliance package and initiates download

**Expected result:** A compliance evidence package is generated and downloaded to your computer. The package includes:
- Agent Blueprint Package (ABP) with all sections
- Validation Report with policy coverage
- Approval chain with reviewer metadata
- Audit trail with timestamps and actors
- Governance configuration (policies applied, constraints, monitoring)

#### Via API

```bash
# Export audit evidence for a single agent
POST /api/blueprints/{agentId}/export-compliance-package
Content-Type: application/json

{
  "format": "json",
  "includeVersionHistory": true,
  "includeValidationHistory": true
}

# Response:
{
  "packageId": "pkg-uuid-456",
  "agentId": "agent-uuid-123",
  "format": "json",
  "generatedAt": "2026-04-05T14:32:18Z",
  "downloadUrl": "https://intellios-api.company.com/download/pkg-uuid-456",
  "expiresAt": "2026-04-12T14:32:18Z",
  "contents": {
    "abp": { /* full ABP JSON */ },
    "validationReport": { /* validation results */ },
    "approvalChain": [ /* review decisions */ ],
    "auditLog": [ /* all events */ ],
    "governanceConfig": { /* policies, constraints, monitoring */ }
  }
}
```

**Expected result:** Compliance package generated in specified format. Package is timestamped and includes all governance evidence for the agent.

### Step 4: Generate a Compliance Report Covering a Time Period

**Context:** You may need to provide regulators with a report covering a specific time period (quarterly review, annual audit, incident investigation).

**Instruction:** Generate a time-filtered compliance report.

#### Via Dashboard

1. Navigate to **Compliance Reports** → **Generate Report**
2. Choose report type:
   - **Quarterly Governance Review** — All agents approved in Q1/Q2/Q3/Q4
   - **Annual Model Risk Management** — All agents approved in the past 12 months
   - **Incident Investigation** — Agents created/modified during specific dates
   - **Policy Compliance Audit** — Agents evaluated against specific policy
3. Select date range:
   - Start date: YYYY-MM-DD
   - End date: YYYY-MM-DD
4. Optional filters:
   - Data sensitivity (public / confidential / PII / regulated)
   - Regulatory scope (FINRA / SOX / GDPR / HIPAA / PCI-DSS)
   - Business owner or department
   - Status (draft / in_review / approved / deprecated)
5. Click **Generate Report**
6. System produces report with:
   - Executive summary (agent count, governance metrics)
   - Per-agent breakdown (name, status, approval date, reviewer)
   - Policy compliance summary (policies applied, violation count)
   - Validation coverage (% of agents passing policies on first submission)
   - Approval chain details (reviewers, decision dates, rationale)
   - Audit trail events in period

**Expected result:** Compliance report generated, timestamped, and ready for regulatory submission.

#### Via API

```bash
# Generate compliance report for a time period
POST /api/reports/compliance
Content-Type: application/json

{
  "reportType": "quarterly_governance_review",
  "startDate": "2026-01-01",
  "endDate": "2026-03-31",
  "filters": {
    "dataSensitivity": "regulated",
    "status": "approved"
  },
  "format": "json"
}

# Response:
{
  "reportId": "rpt-uuid-789",
  "generatedAt": "2026-04-05T14:32:18Z",
  "period": {
    "start": "2026-01-01",
    "end": "2026-03-31"
  },
  "summary": {
    "totalAgents": 18,
    "approvedAgents": 18,
    "policyViolations": 2,
    "avgReviewCycleDays": 3.2
  },
  "agents": [
    {
      "agentId": "agent-uuid-001",
      "name": "Loan Approval Agent v2",
      "status": "approved",
      "approvedAt": "2026-03-15T10:00:00Z",
      "approvedBy": "jane.smith@company.com",
      "policies": [
        { "name": "Safety Baseline", "passed": true },
        { "name": "Audit Standards", "passed": true },
        { "name": "Access Control Baseline", "passed": true },
        { "name": "Governance Coverage", "passed": true }
      ]
    },
    // ... additional agents
  ],
  "downloadUrl": "https://intellios-api.company.com/download/rpt-uuid-789"
}
```

**Expected result:** Time-filtered compliance report generated with all agents, governance decisions, and policy evaluation results for the specified period.

### Step 5: Configure Audit Trail Retention Policies

**Context:** Compliance and data protection regulations require different retention periods for audit trails. You need to define how long audit evidence is kept and where archived records are stored.

**Instruction:** Configure audit trail retention and archival.

#### Via Dashboard

1. Navigate to **Admin** → **Governance Settings** → **Audit Trail Configuration**
2. Configure retention:
   - **Active retention period:** How long audit logs remain in the live database (default: 7 years, recommend: 7+ years for regulated industries)
   - **Archival strategy:** Where old audit logs are moved (options: cold storage, external archive, compliance vault)
   - **Deletion policy:** Whether logs are deleted after retention period ends (recommend: never delete; move to archive)
3. Set archival destination:
   - **On-premises:** Encrypted archive storage on internal infrastructure
   - **Cloud archive:** AWS Glacier, Azure Archive Storage, or equivalent
   - **Compliance vault:** Third-party compliance archival service (e.g., Iron Mountain, Datto)
4. Configure encryption:
   - Archive data encryption: enabled (default)
   - Key management: HSM or AWS KMS (Cloud)
5. Set backup frequency:
   - Daily backup of audit log (default)
   - Weekly archive copy to secondary location
6. Click **Save Configuration**

**Expected result:** Audit trail retention and archival policies are configured. Old logs are automatically moved to archive after the retention period; never deleted.

#### Via API

```bash
# Configure audit trail retention
POST /api/admin/audit-retention
Content-Type: application/json

{
  "activeRetentionDays": 2555,  // 7 years
  "archiveAfterDays": 2555,
  "archivalDestination": {
    "type": "cloud",
    "provider": "aws",
    "bucket": "company-audit-archive",
    "region": "us-east-1",
    "encryption": {
      "enabled": true,
      "algorithm": "AES-256",
      "keyManagement": "kms"
    }
  },
  "deletionPolicy": "never_delete",
  "backupFrequency": "daily",
  "secondaryArchive": {
    "enabled": true,
    "type": "cold_storage",
    "syncFrequency": "weekly"
  }
}

# Response:
{
  "configId": "cfg-retention-001",
  "status": "configured",
  "effectiveDate": "2026-04-05T14:32:18Z"
}
```

**Expected result:** Audit trail retention and archival policies configured. System will automatically archive logs after retention period and maintain backup copies.

### Step 6: Verify Audit Trail Completeness — Evidence Chain Checklist

**Context:** Before submitting evidence to regulators, you must verify that all six components of the compliance evidence chain are present for each agent.

**Instruction:** Run completeness verification for all approved agents.

#### Via Dashboard

1. Navigate to **Compliance Reports** → **Evidence Chain Verification**
2. Select scope:
   - All approved agents
   - Specific agent
   - Agents by status or date range
3. Click **Run Verification**
4. System checks each agent for presence of:
   - [ ] **Intake Record** — Intake session ID present, Phase 1/2/3 complete
   - [ ] **Generation Artifact** — ABP version exists, generated-from intake lineage exists
   - [ ] **Governance Validation** — Validation Report exists, policies evaluated, violations tracked
   - [ ] **Review Decision** — Review assignment exists, decision recorded, reviewer identity present, timestamp present
   - [ ] **Deployment Record** — Deployment metadata present (environment, timestamp, deployer identity)
   - [ ] **Audit Log** — Complete event log with all transitions and actions

5. System generates verification report:

| Agent | Intake | Generation | Validation | Review | Deployment | Audit Log | Complete? |
|---|---|---|---|---|---|---|---|
| Loan Approval v2 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | YES |
| Fraud Detection v1 | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | NO |
| Risk Calc v3 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | YES |
| Customer Review v1 | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ | NO |

6. For agents marked "NO" (incomplete), click to see which components are missing
7. Remediate missing components:
   - **Missing Intake:** Retroactively document intake context via API (if possible) or note in audit trail
   - **Missing Generation Artifact:** Regenerate ABP from current state; document in audit trail
   - **Missing Validation:** Run re-validation via API; record in audit trail
   - **Missing Review:** Retroactively assign review and document decision (rare; should not occur)
   - **Missing Deployment:** Document deployment record via API or manual entry
   - **Missing Audit Log:** Verify database integrity; escalate to infrastructure team if logs are corrupt

**Expected result:** Verification report showing which agents have complete evidence chains. Incomplete agents are identified and remediation steps documented.

#### Via API

```bash
# Verify audit trail completeness for all agents
POST /api/compliance/verify-evidence-chains
Content-Type: application/json

{
  "scope": "all_approved",
  "includeDetails": true
}

# Response:
{
  "verificationId": "verify-uuid-111",
  "timestamp": "2026-04-05T14:32:18Z",
  "results": {
    "totalAgents": 42,
    "completeChains": 40,
    "incompleteChains": 2,
    "completionRate": 0.952,  // 95.2%
    "agents": [
      {
        "agentId": "agent-uuid-123",
        "name": "Loan Approval v2",
        "status": "approved",
        "evidenceChain": {
          "intake": { "present": true, "id": "intake-uuid-456" },
          "generation": { "present": true, "id": "abp-uuid-789", "version": "2.0.0" },
          "validation": { "present": true, "id": "val-uuid-012", "policiesPassed": 4 },
          "review": { "present": true, "id": "rev-uuid-345", "approvedBy": "jane.smith@company.com" },
          "deployment": { "present": true, "id": "dep-uuid-678", "environment": "production" },
          "auditLog": { "present": true, "eventCount": 8 }
        },
        "complete": true
      },
      {
        "agentId": "agent-uuid-234",
        "name": "Fraud Detection v1",
        "status": "approved",
        "evidenceChain": {
          "intake": { "present": true },
          "generation": { "present": true },
          "validation": { "present": true },
          "review": { "present": true },
          "deployment": { "present": false, "reason": "Agent not yet deployed" },
          "auditLog": { "present": true }
        },
        "complete": false,
        "gaps": ["deployment"]
      }
    ]
  }
}
```

**Expected result:** Verification report showing evidence chain completeness for each agent. Target: 100% complete chains. Agents with incomplete chains require remediation.

---

## Verification

**How to confirm this task succeeded end-to-end:**

1. **Audit Trail Accessible** — You successfully retrieved the History tab for a test agent and saw all events with timestamps and actors
2. **Compliance Evidence Exported** — You exported a compliance evidence package and opened it to verify it contains ABP, validation report, approval chain, and audit log
3. **Time-Filtered Report Generated** — You generated a compliance report for a specific date range and received a report with agent count, policy evaluation results, and approval chain
4. **Retention Policy Configured** — You set audit trail retention to 7+ years and configured archival to cloud or on-premises storage
5. **Evidence Chain Verified** — You ran evidence chain verification and confirmed that 100% of approved agents have complete compliance chains (intake + generation + validation + review + deployment + audit log)

**Success criteria:**

- Audit trails are accessible and human-readable for any agent
- Compliance evidence packages can be exported in JSON, Markdown, or PDF format
- Time-filtered reports can be generated on demand with configurable date ranges and filters
- Audit trail retention is configured for your regulatory environment (7+ years recommended)
- Evidence chain completeness is ≥95% (target: 100%; <95% indicates operational gaps)
- All exports are timestamped and can be traced back to Intellios source records

---

## Troubleshooting

If you encounter issues during this task:

| Symptom | Likely Cause | Resolution |
|---------|---|---|
| **History tab shows no events** | Agent is very new and no events have occurred yet, or audit log is not configured | Create a test event (e.g., submit agent for review) to generate an event; verify audit logging is enabled in settings |
| **Export fails with "Permission denied"** | Your user role does not have compliance export permission | Contact administrator to grant "compliance_reporter" or "administrator" role |
| **Compliance report generates but is empty** | Date range has no agents, or filters are too restrictive | Expand date range or loosen filters; verify agents exist in Registry with your selected filters |
| **Retention policy configuration not saved** | Changes not persisted to database | Verify you clicked "Save Configuration"; check for error messages in the form; retry with shorter retention period first to confirm functionality |
| **Evidence chain verification shows incomplete chains** | Required components missing or not linked to agent | Review which components are missing (intake, generation, validation, review, deployment, audit log); remediate via API or manual documentation |

For additional help, see [Compliance Evidence Chain](../03-core-concepts/compliance-evidence-chain.md) or contact your Intellios support team.

---

## Next Steps

Now that you have completed this task:

- **Configure Automated Compliance Reports** — Set up monthly or quarterly compliance report generation to provide regulators with ongoing governance evidence
- **Integrate Audit Trails with Your SIEM** — Export audit logs to your Security Information and Event Management (SIEM) system for centralized logging
- **Prepare for Your Next Examination** — Use the compliance evidence export feature to prepare a comprehensive examination response package for your regulator
- **Monitor Evidence Chain Completeness** — Run quarterly evidence chain verification to ensure all agents maintain complete audit trails

---

## Appendix: API Reference

### Audit Log Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/blueprints/{agentId}/audit-log` | GET | Retrieve audit events for a specific agent |
| `/api/blueprints/{agentId}/audit-log?limit=100&offset=0` | GET | Paginated audit log retrieval |
| `/api/blueprints/{agentId}/export-compliance-package` | POST | Export compliance evidence package for an agent |
| `/api/reports/compliance` | POST | Generate time-filtered compliance report |
| `/api/admin/audit-retention` | POST | Configure audit trail retention policies |
| `/api/compliance/verify-evidence-chains` | POST | Verify evidence chain completeness |

### Query Filters

```bash
# Filter audit logs by event type
GET /api/blueprints/{agentId}/audit-log?eventType=approval_decision

# Filter by actor
GET /api/blueprints/{agentId}/audit-log?actor=jane.smith@company.com

# Filter by date range
GET /api/blueprints/{agentId}/audit-log?startDate=2026-01-01&endDate=2026-03-31
```

---

*See also: [Compliance Evidence Chain](../03-core-concepts/compliance-evidence-chain.md), [SR 11-7 Compliance Mapping](sr-11-7-mapping.md), [Agent Registry](../03-core-concepts/agent-lifecycle-states.md)*

---

**Document Classification:** Internal Use — Compliance Teams
**Last Updated:** 2026-04-05
**Next Review Date:** 2026-10-05 (6-month review cycle)
