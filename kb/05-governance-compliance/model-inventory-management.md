---
id: 05-005
title: How to Manage Your Model Inventory
slug: model-inventory-management
type: task
audiences:
- compliance
- engineering
status: published
version: 1.0.0
platform_version: 1.0.0
created: '2026-04-05'
updated: '2026-04-05'
author: Intellios
reviewers: []
tags:
- model-inventory
- sr-11-7
- registry
- compliance
- documentation
- audit
prerequisites: []
related:
- 03-001
- 05-001
- 03-005
next_steps:
- 03-007
- 05-006
feedback_url: https://feedback.intellios.ai/kb
tldr: 'SR 11-7 requires banks to maintain a complete model inventory with unique identification,
  documentation, and lifecycle tracking. The Intellios Agent Registry serves as the
  authoritative model inventory, capturing all required fields (agent ID, version,
  status, owner, data classification, regulatory scope, validation results) automatically.
  This task walks compliance teams through populating the registry, searching and
  filtering for audit purposes, generating inventory reports, performing bulk operations,
  and verifying inventory completeness. Complete this task to have a compliant, audit-ready
  model inventory.

  '
---



# How to Manage Your Model Inventory

> **TL;DR:** The Intellios Agent Registry is your authoritative SR 11-7 model inventory, capturing all agents with unique IDs, versioning, status, ownership, data classification, and approval records automatically. This task teaches you how to maintain the registry, query it for compliance reporting, generate inventory exports, perform bulk operations, and verify completeness. By the end, you will have a compliant model inventory suitable for regulatory examination.

---

## Goal

By completing this task, you will have:

1. **Populated the Agent Registry** — Ensured all deployed agents are registered with complete metadata
2. **Understood Required Fields** — Mastered the fields Intellios captures for SR 11-7 compliance
3. **Queried the Registry** — Used filters and search to find agents by status, owner, data classification, regulatory scope, and deployment date
4. **Generated Inventory Reports** — Exported compliance-ready model inventory reports in multiple formats
5. **Performed Bulk Operations** — Used batch operations to update ownership, assign compliance policies, or deprecate agents at scale
6. **Verified Completeness** — Audited the registry to confirm all deployed agents are registered and have required metadata

---

## Prerequisites

Before starting, ensure you have:

- [ ] **Intellios Instance** — Intellios deployed and running (version 1.0.0+)
- [ ] **Admin Dashboard or API Access** — User account with compliance or administrator role
- [ ] **At Least 3 Test Agents** — Agents in different states (draft, in_review, approved, deprecated) for testing
- [ ] **Compliance Documentation** — List of all agents currently deployed or in development
- [ ] **Spreadsheet Tool** — Excel, Sheets, or equivalent for reviewing exported inventory

---

## Steps

### Step 1: Understand Required Fields for SR 11-7 Inventory

**Context:** SR 11-7 specifies what information a model inventory must contain. The Intellios Agent Registry captures all required fields automatically. Understanding these fields is essential for auditing and reporting.

**Instruction:** Review the field requirements and map them to ABP metadata.

The Federal Reserve's SR 11-7 guidance requires model inventories to include:

| SR 11-7 Requirement | Intellios Field | Captured By | Notes |
|---|---|---|---|
| **Unique Model Identifier** | `agent_id` (UUID) | Agent creation | Immutable, globally unique across Intellios instance |
| **Model Name** | `identity.name` in ABP | Intake/Generation | Human-readable agent name |
| **Model Type/Category** | `tags` in ABP metadata | Intake/Generation | Classification (e.g., "credit-decisioning", "compliance-monitoring") |
| **Intended Use** | `identity.description` in ABP | Intake/Generation | Narrative description of business purpose |
| **Development Date** | `created_at` | Database timestamp | ISO 8601 timestamp of ABP creation |
| **Implementation Date** | `deployment_timestamps` | Deployment system | ISO 8601 timestamps of each deployment |
| **Business Owner** | `ownership.businessOwner` in ABP | Intake/Generation | Email or identifier of responsible business owner |
| **Technical Owner** | `ownership.technicalOwner` in ABP | Intake/Generation | Email or identifier of technical owner |
| **Data Classification** | `dataSensitivity` in IntakeContext | Intake | Classification (public, confidential, PII, regulated) |
| **Regulatory Scope** | `regulatoryScope` in IntakeContext | Intake | Multi-select list (SR 11-7, FINRA, SOX, GDPR, HIPAA, PCI-DSS, etc.) |
| **Governance Policies Applied** | `governance.policies` in ABP | Intake/Generation | Policies evaluated by Governance Validator |
| **Validation Results** | `validation_report` | Governance Validator | Policy violations, severity, resolution status |
| **Approval Authority** | `ownership.reviewedBy` | Review Workflow | Identity of human approver |
| **Approval Date** | `ownership.reviewedAt` | Review Workflow | ISO 8601 timestamp of approval |
| **Current Status** | `status` | Lifecycle State Machine | draft / in_review / approved / deprecated |
| **Version Number** | `version` (semantic versioning) | Registry | 1.0.0, 1.1.0, 2.0.0, etc. |
| **Version History** | `version_history` | Registry | Complete history of all versions |
| **Monitoring Configuration** | `governance.monitoring` in ABP | Intake/Generation | Drift detection thresholds, alert procedures |

**Expected result:** You understand that Intellios captures all SR 11-7 required inventory fields automatically. No manual data entry is required—the registry is automatically populated by the intake, generation, validation, and approval processes.

### Step 2: Access the Agent Registry and Review Agent Metadata

**Context:** You need to explore the Agent Registry and verify that agents are properly registered with complete metadata.

**Instruction:** Navigate to the Agent Registry and inspect a specific agent's metadata.

#### Via Admin Dashboard (UI)

1. Open Intellios Admin Dashboard
2. Navigate to **Agent Registry** (left sidebar under "Governance")
3. You will see a table of all agents with columns:
   - **Name** — Agent name (from `identity.name`)
   - **Status** — Current status (draft, in_review, approved, deprecated)
   - **Version** — Semantic version (e.g., 2.0.0)
   - **Business Owner** — From `ownership.businessOwner`
   - **Data Sensitivity** — Classification level
   - **Regulatory Scope** — Applicable regulations
   - **Created** — Timestamp of first creation
   - **Last Modified** — Timestamp of most recent change
4. Click on an agent to open its detail view
5. Review the following sections:
   - **Metadata** — ID, name, description, tags, creation/modification dates
   - **Ownership** — Business owner, technical owner, risk owner, compliance owner, approvers
   - **Classification** — Data sensitivity, regulatory scope, deployment type
   - **Governance** — Policies applied, validation results, approval history
   - **Versioning** — Version history showing all previous versions with dates and status
   - **Deployment** — Current deployment status, environment, deployment date

**Expected result:** You can navigate to the Agent Registry, view agents, and access detailed metadata for each agent. All SR 11-7 required fields are present and visible.

#### Via API

```bash
# List all agents in the registry
GET /api/registry

# Response structure:
{
  "agents": [
    {
      "agentId": "agent-uuid-001",
      "name": "Loan Approval Agent",
      "version": "2.0.0",
      "status": "approved",
      "createdAt": "2026-02-10T10:00:00Z",
      "lastModifiedAt": "2026-04-02T14:30:00Z",
      "identity": {
        "name": "Loan Approval Agent",
        "description": "Evaluates mortgage applications for approval eligibility."
      },
      "ownership": {
        "businessOwner": "lending-team@company.com",
        "technicalOwner": "ai-ops@company.com",
        "riskOwner": "risk-team@company.com",
        "complianceOwner": "compliance@company.com",
        "reviewedBy": "jane.smith@company.com",
        "reviewedAt": "2026-02-15T10:00:00Z"
      },
      "classification": {
        "dataSensitivity": "regulated",
        "regulatoryScope": ["SR-11-7", "GLBA", "ECOA"],
        "deploymentType": "customer-facing"
      },
      "governance": {
        "policies": [
          {
            "name": "Safety Baseline",
            "id": "policy-001",
            "status": "passed"
          },
          {
            "name": "Audit Standards",
            "id": "policy-002",
            "status": "passed"
          }
        ],
        "validationReport": {
          "valid": true,
          "policyCount": 4,
          "violations": []
        }
      },
      "versionHistory": [
        {
          "version": "1.0.0",
          "status": "deprecated",
          "createdAt": "2026-01-15T09:00:00Z"
        },
        {
          "version": "2.0.0",
          "status": "approved",
          "createdAt": "2026-02-10T10:00:00Z"
        }
      ],
      "deployment": {
        "status": "production",
        "environment": "us-east-1",
        "deployedAt": "2026-02-20T14:00:00Z"
      }
    }
    // ... additional agents
  ],
  "totalCount": 42,
  "pageInfo": {
    "page": 1,
    "pageSize": 50,
    "totalPages": 1
  }
}
```

**Expected result:** Complete registry data including all agents, metadata, ownership, classification, governance validation, and version history.

### Step 3: Query the Registry Using Filters and Search

**Context:** To support compliance audits and regulatory reporting, you need to quickly find agents matching specific criteria (data classification, regulatory scope, approval status, owner, etc.).

**Instruction:** Use filters to query the Agent Registry for specific agent cohorts.

#### Via Dashboard Filters

1. Navigate to **Agent Registry**
2. Use filter controls (left sidebar or filter bar):
   - **Status** — Filter by status: draft / in_review / approved / deprecated
   - **Data Sensitivity** — Filter by classification: public / confidential / PII / regulated
   - **Regulatory Scope** — Multi-select: SR-11-7, FINRA, SOX, GDPR, HIPAA, PCI-DSS, etc.
   - **Business Owner** — Dropdown to select specific owner email
   - **Created After/Before** — Date range filter for agents created in specific period
   - **Deployment Status** — Filter by environment: development / staging / production

**Example Queries:**

| Objective | Filters | Result |
|---|---|---|
| All production agents handling regulated data | Status=approved, Sensitivity=regulated, Deployment=production | List of all live agents in scope for SR 11-7 |
| All agents under SOX compliance | Regulatory Scope includes SOX | List of SOX-covered agents |
| All agents created in Q1 2026 | Created After=2026-01-01, Created Before=2026-03-31 | New agents deployed this quarter |
| All agents requiring re-validation | Status=in_review or contains policy violations | Agents needing governance remediation |
| All deprecated agents | Status=deprecated | Historical record of retired models |

#### Via API with Query Parameters

```bash
# Find all approved agents handling regulated data
GET /api/registry?status=approved&dataSensitivity=regulated

# Find agents in production for FINRA-regulated business
GET /api/registry?deployment.status=production&regulatoryScope=FINRA

# Find agents created in Q1 2026 that have governance violations
GET /api/registry?createdAfter=2026-01-01&createdBefore=2026-03-31&validation.valid=false

# Find all agents owned by lending team
GET /api/registry?businessOwner=lending-team@company.com

# Find agents with policy violations that need remediation
GET /api/registry?status=draft&validation.violations.count=gte:1
```

**Expected result:** You can efficiently filter the registry to find agents matching specific compliance criteria. Queries support audit preparation and regulatory reporting.

### Step 4: Generate Inventory Reports for Compliance Submission

**Context:** Regulators may request a model inventory in a specific format (spreadsheet, JSON, formatted report). You need to export the inventory in multiple formats suitable for submission.

**Instruction:** Generate and export a compliance-ready inventory report.

#### Via Dashboard Export

1. Navigate to **Agent Registry** → **Reports** (section in top navigation or sidebar)
2. Select **Export Inventory**
3. Choose export scope:
   - **All agents** — Complete inventory including draft agents (internal audit)
   - **Approved agents only** — Only approved agents (for regulatory submission)
   - **Approved + deployed agents** — Only agents in production (for examinations)
   - **Custom filter** — Use the filter controls to select specific cohort
4. Choose export format:
   - **CSV** — Spreadsheet format; includes all required fields as columns
   - **JSON** — Structured data format; suitable for automated processing
   - **Markdown** — Human-readable narrative format; suitable for presentations
   - **Excel** — Rich spreadsheet with multiple tabs (summary, detailed inventory, version history)
5. Optional settings:
   - **Include version history** — Add sheet showing all previous versions for each agent
   - **Include governance details** — Add columns showing policies applied and validation results
   - **Include contact info** — Add contact information for business/technical/risk owners
6. Click **Generate Export**
7. System generates report and initiates download

**Expected result:** Inventory export is downloaded in selected format with all required SR 11-7 fields.

**Export File Contents:**

The exported inventory includes:

| Column/Field | Content | Source |
|---|---|---|
| Agent ID | Unique identifier (UUID) | agent_id |
| Agent Name | Human-readable name | identity.name |
| Version | Semantic version | version |
| Status | Current status (approved, deprecated, etc.) | status |
| Created Date | ISO 8601 timestamp | created_at |
| Business Owner | Email or ID | ownership.businessOwner |
| Technical Owner | Email or ID | ownership.technicalOwner |
| Risk Owner | Email or ID | ownership.riskOwner |
| Compliance Owner | Email or ID | ownership.complianceOwner |
| Data Sensitivity | Classification level | dataSensitivity |
| Regulatory Scope | Applicable regulations (comma-separated) | regulatoryScope |
| Reviewed By | Approver identity | ownership.reviewedBy |
| Reviewed Date | Approval timestamp | ownership.reviewedAt |
| Policies Applied | Governance policies evaluated (comma-separated) | governance.policies |
| Validation Status | Pass/fail | validation_report.valid |
| Deployment Environment | Production, staging, development | deployment.environment |
| Deployment Date | ISO 8601 timestamp | deployment.deployedAt |
| Description | Intended use narrative | identity.description |

#### Via API

```bash
# Export inventory as JSON
GET /api/registry/export?format=json&scope=approved

# Export inventory as CSV with version history
GET /api/registry/export?format=csv&scope=approved&includeVersionHistory=true

# Export filtered inventory (regulated data, approved agents)
GET /api/registry/export?format=json&dataSensitivity=regulated&status=approved

# Response (CSV):
Agent ID,Agent Name,Version,Status,Created Date,Business Owner,Data Sensitivity,Regulatory Scope,Reviewed Date
agent-001,Loan Approval Agent,2.0.0,approved,2026-02-10T10:00:00Z,lending@company.com,regulated,SR-11-7 GLBA ECOA,2026-02-15T10:00:00Z
agent-002,Fraud Detection,1.1.0,approved,2026-01-20T14:30:00Z,risk@company.com,regulated,SR-11-7 FINRA,2026-02-01T09:00:00Z
```

**Expected result:** Inventory exported in selected format, ready for regulatory submission or internal audit.

### Step 5: Perform Bulk Operations on Registry Agents

**Context:** You may need to update metadata across multiple agents at scale (e.g., assign a new compliance owner, apply a new governance policy, deprecate agents). Bulk operations allow you to make these changes efficiently.

**Instruction:** Execute a bulk operation to update agent metadata across a cohort.

#### Via Dashboard Bulk Operations

1. Navigate to **Agent Registry**
2. Use filters to select the agents you want to update (e.g., all agents owned by "old-owner@company.com")
3. Click **Select All** to select all visible agents, or manually check boxes for specific agents
4. Click **Bulk Actions** menu (top right of table)
5. Choose operation:
   - **Update Compliance Owner** — Reassign compliance oversight
   - **Update Business Owner** — Reassign business responsibility
   - **Assign Governance Policy** — Add a new governance policy to all selected agents
   - **Update Data Sensitivity** — Re-classify data sensitivity level
   - **Add Regulatory Scope** — Add a regulatory framework to selected agents
   - **Deprecate Agents** — Mark agents as deprecated (retirement)
   - **Re-validate Against Policies** — Force re-validation of all selected agents
6. Confirm operation and specify changes:
   - For "Update Compliance Owner" — Select new owner from dropdown
   - For "Assign Governance Policy" — Select policy from list
   - For "Deprecate Agents" — Enter deprecation reason and date
7. Review preview of changes (shows before/after for sample agents)
8. Click **Execute** to apply changes

**Expected result:** Metadata updated for all selected agents. Change is timestamped and audited.

#### Via API Bulk Operations

```bash
# Update compliance owner for all agents in a cohort
POST /api/registry/bulk-update
Content-Type: application/json

{
  "filter": {
    "dataSensitivity": "regulated",
    "status": "approved"
  },
  "updates": {
    "ownership.complianceOwner": "new-compliance-owner@company.com"
  }
}

# Response:
{
  "operationId": "bulk-op-uuid-123",
  "status": "completed",
  "affectedAgents": 18,
  "changes": [
    {
      "agentId": "agent-001",
      "field": "ownership.complianceOwner",
      "oldValue": "old-owner@company.com",
      "newValue": "new-compliance-owner@company.com"
    }
    // ... additional agents
  ],
  "timestamp": "2026-04-05T14:32:18Z"
}
```

**Common Bulk Operations:**

| Operation | Use Case | Example |
|---|---|---|
| **Update Compliance Owner** | Reorganization; new compliance team | Reassign all regulated agents to new risk officer |
| **Assign Governance Policy** | New policy published; apply retroactively | Add new SOX compliance policy to all SOX-scoped agents |
| **Update Data Sensitivity** | Classification change after audit | Re-classify PII agents as "regulated" |
| **Add Regulatory Scope** | Expansion to new market/regulation | Add GDPR scope to all agents processing EU customer data |
| **Re-validate All** | New or updated policies | Force re-validation to check compliance with latest policy versions |
| **Deprecate Cohort** | Retiring old versions or sunsetting agents | Mark all v1.x agents as deprecated when v2.0 approved |

**Expected result:** Bulk operations execute successfully, affecting all selected agents. Changes are audited and timestamped.

### Step 6: Verify Inventory Completeness and Audit Readiness

**Context:** Before submitting inventory to regulators, you must verify that the inventory is complete (all deployed agents are registered), accurate (metadata is current), and audit-ready (supporting documentation is available).

**Instruction:** Run inventory completeness verification.

#### Via Dashboard Verification

1. Navigate to **Agent Registry** → **Compliance** → **Inventory Verification**
2. Click **Run Verification**
3. System checks:
   - **Registration Coverage** — Are all known agents registered in the registry?
   - **Metadata Completeness** — Does each agent have all required SR 11-7 fields?
   - **Version Consistency** — Does the registry version match the deployed version?
   - **Ownership Assignment** — Is every agent assigned to appropriate owners?
   - **Governance Documentation** — Has every agent passed governance validation?
   - **Approval Evidence** — Is there evidence of human review and approval for all approved agents?

4. System generates verification report:

| Agent | Registered | Metadata Complete | Version Match | Owners Assigned | Governance Passed | Approval Evidence | Ready? |
|---|---|---|---|---|---|---|---|
| Loan Approval v2 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | YES |
| Fraud Detection v1 | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | NO |
| Risk Calc v3 | ✓ | ✗ | ✓ | ✓ | ✓ | ✓ | NO |
| Customer Service v1 | ✗ | — | — | — | — | — | NO |

5. For agents marked "NO", click to see details on missing components
6. Remediate:
   - **Not registered** — Create registry entry via API or UI; link to ABP
   - **Metadata missing** — Complete missing fields in ownership block or ABP
   - **Version mismatch** — Update registry to match deployed version
   - **Governance not passed** — Run validation; address violations; re-validate
   - **Approval evidence missing** — Retroactively document review decision

#### Via API Verification

```bash
# Verify inventory completeness
POST /api/registry/verify-completeness

{
  "includeDetails": true
}

# Response:
{
  "verificationId": "verify-uuid-456",
  "timestamp": "2026-04-05T14:32:18Z",
  "summary": {
    "totalAgents": 42,
    "registered": 42,
    "metadataComplete": 40,
    "versionMatch": 42,
    "ownersAssigned": 41,
    "governancePassed": 38,
    "approvalEvidence": 40,
    "readyForAudit": 37
  },
  "completionRate": 0.881,  // 88.1%
  "agents": [
    {
      "agentId": "agent-uuid-001",
      "name": "Loan Approval v2",
      "registered": true,
      "metadataComplete": true,
      "versionMatch": true,
      "ownersAssigned": true,
      "governancePassed": true,
      "approvalEvidence": true,
      "ready": true
    },
    {
      "agentId": "agent-uuid-002",
      "name": "Fraud Detection v1",
      "registered": true,
      "metadataComplete": false,
      "missingFields": ["ownership.riskOwner"],
      "ready": false
    }
    // ... additional agents
  ]
}
```

**Expected result:** Verification report showing which agents are audit-ready and which require remediation. Target: 100% completeness.

---

## Verification

**How to confirm this task succeeded end-to-end:**

1. **Registry Populated** — All deployed agents appear in the Agent Registry with correct metadata
2. **Metadata Complete** — You can click any agent and see all SR 11-7 required fields (owner, sensitivity, scope, approval)
3. **Filters Working** — You can filter by status, sensitivity, regulatory scope, and owner; results are accurate
4. **Export Successful** — You exported inventory in CSV/JSON format and opened the file to verify contents
5. **Bulk Operations Executed** — You successfully updated a metadata field across multiple agents; changes appear in registry
6. **Verification Passed** — Inventory completeness verification shows ≥95% ready-for-audit (target: 100%)

**Success criteria:**

- All production agents are registered in the Agent Registry
- Each agent has complete metadata (business owner, technical owner, data sensitivity, regulatory scope, approval dates)
- Queries return accurate filtered results
- Exports are timestamped and include all required fields
- Bulk operations execute without errors
- Inventory completeness verification is ≥95%
- Verification report is suitable for regulatory submission

---

## Troubleshooting

If you encounter issues during this task:

| Symptom | Likely Cause | Resolution |
|---|---|---|
| **Agent not appearing in registry** | Agent is in draft status (not yet created/approved), or not indexed | Verify agent exists via Blueprint API; if recently created, index may lag 1-2 minutes; refresh after 2 minutes |
| **Metadata fields are empty** | ABP is incomplete or not linked to registry entry | Complete missing ABP fields in intake/generation; re-validate and verify linkage |
| **Filter returns no results** | Filter criteria too restrictive, or no agents match | Loosen filters; verify agent counts before and after filter |
| **Export fails with permission error** | User role does not have export permission | Contact administrator; request "compliance_reporter" or "administrator" role |
| **Bulk operation affects wrong agents** | Filter logic misunderstood | Review filter preview before executing; start with small subset (5-10 agents) to test |
| **Completeness verification shows gaps** | Metadata fields missing or governance validation failed | Review detailed remediation suggestions in verification report; address one agent type at a time |

For additional help, see [SR 11-7 Compliance Mapping](sr-11-7-mapping.md) or contact your Intellios support team.

---

## Next Steps

Now that you have a compliant model inventory:

- **Generate Compliance Reports** — Use the inventory as the foundation for quarterly or annual model risk management reports
- **Set Up Monitoring Dashboards** — Track agent deployment, policy compliance, and drift detection using the registry
- **Prepare for Examination** — Use inventory exports and verification reports as part of your examination response package
- **Automate Inventory Updates** — Configure webhooks to automatically update the registry when agents are deployed or updated
- **Monitor Inventory Health** — Schedule quarterly completeness verification to catch gaps early

---

## Appendix: Registry API Reference

### Core Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/registry` | GET | List all agents with optional filters |
| `/api/registry/{agentId}` | GET | Retrieve complete metadata for a specific agent |
| `/api/registry/{agentId}` | PATCH | Update metadata for an agent |
| `/api/registry/bulk-update` | POST | Perform bulk update across multiple agents |
| `/api/registry/export` | GET | Export inventory in specified format |
| `/api/registry/verify-completeness` | POST | Verify inventory completeness |

### Query Parameters

```bash
# Filter by status
GET /api/registry?status=approved

# Filter by multiple criteria
GET /api/registry?status=approved&dataSensitivity=regulated&regulatoryScope=SR-11-7

# Pagination
GET /api/registry?page=2&pageSize=50

# Sort by creation date
GET /api/registry?sortBy=createdAt&sortOrder=desc
```

---

*See also: [Agent Registry](../03-core-concepts/agent-lifecycle-states.md), [SR 11-7 Compliance Mapping](sr-11-7-mapping.md), [Compliance Evidence Chain](../03-core-concepts/compliance-evidence-chain.md)*

---

**Document Classification:** Internal Use — Compliance Teams
**Last Updated:** 2026-04-05
**Next Review Date:** 2026-10-05 (6-month review cycle)
