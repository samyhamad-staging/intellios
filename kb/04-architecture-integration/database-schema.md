---
id: "04-012"
title: "Database Schema Reference"
slug: "database-schema"
type: "reference"
audiences:
  - "engineering"
status: "published"
version: "1.0.0"
platform_version: "1.2.0"
created: "2026-04-05"
updated: "2026-04-05"
author: "Intellios Platform Engineering"
reviewers: []
tags:
  - "database"
  - "postgresql"
  - "drizzle-orm"
  - "schema"
  - "jsonb"
  - "data-model"
prerequisites:
  - "04-001"
  - "03-001"
related:
  - "04-001"
  - "04-013"
  - "12-001"
next_steps:
  - "04-013"
feedback_url: "[PLACEHOLDER]"
tldr: >
  Intellios uses PostgreSQL with 16 core tables managed via Drizzle ORM. Primary tables:
  agent_blueprints (Agent Blueprint Packages + versions), intake_sessions (design intake),
  governance_policies (policies + versions), audit_log (append-only audit trail),
  webhooks & webhook_deliveries (event integration). JSONB columns store ABP documents,
  validation reports, policy rules, and intake payloads. Strategic indexes on enterprise_id,
  status, and session_id enable efficient multi-tenant queries. DDL managed via Drizzle migrations.
---

# Database Schema Reference

> **TL;DR:** Intellios uses PostgreSQL with 16 core tables. Primary tables: `agent_blueprints` (ABPs + versions), `intake_sessions` (design intake workflows), `governance_policies` (policies + versions), `audit_log` (append-only compliance trail), `webhooks` & `webhook_deliveries` (event integration). JSONB columns store ABP documents, validation reports, policy rules, intake payloads. Strategic indexes on `enterprise_id`, `status`, `created_at` enable efficient multi-tenant queries. Managed via Drizzle ORM migrations.

---

## Entity Relationship Diagram

```mermaid
erDiagram
    USERS ||--o{ INTAKE_SESSIONS : "created_by"
    USERS ||--o{ AGENT_BLUEPRINTS : "created_by"
    USERS ||--o{ GOVERNANCE_POLICIES : "created_by"
    INTAKE_SESSIONS ||--o{ AGENT_BLUEPRINTS : "sessionId"
    INTAKE_SESSIONS ||--o{ INTAKE_MESSAGES : "contains"
    INTAKE_SESSIONS ||--o{ INTAKE_CONTRIBUTIONS : "has"
    AGENT_BLUEPRINTS ||--o{ AUDIT_LOG : "tracks"
    AGENT_BLUEPRINTS ||--o{ BLUEPRINT_TEST_CASES : "agentId"
    AGENT_BLUEPRINTS ||--o{ BLUEPRINT_TEST_RUNS : "blueprintId"
    AGENT_BLUEPRINTS ||--o{ BLUEPRINT_QUALITY_SCORES : "blueprintId"
    AGENT_BLUEPRINTS ||--o{ DEPLOYMENT_HEALTH : "blueprintId"
    GOVERNANCE_POLICIES ||--o{ AUDIT_LOG : "tracks"
    INTAKE_SESSIONS ||--o{ INTAKE_QUALITY_SCORES : "sessionId"
    WEBHOOKS ||--o{ WEBHOOK_DELIVERIES : "contains"
    AUDIT_LOG ||--o{ NOTIFICATIONS : "triggers"

    USERS {
        uuid id PK
        text email UK
        text name
        text password_hash
        text role
        text enterprise_id FK
        timestamp created_at
    }

    INTAKE_SESSIONS {
        uuid id PK
        text enterprise_id FK
        text created_by FK
        text status
        jsonb intake_payload
        jsonb intake_context
        text agent_type
        text risk_tier
        text expertise_level
        timestamp created_at
        timestamp updated_at
    }

    AGENT_BLUEPRINTS {
        uuid id PK
        uuid agent_id
        text version
        text name
        jsonb tags
        text enterprise_id FK
        uuid session_id FK
        jsonb abp
        text status
        text refinement_count
        jsonb validation_report
        text review_comment
        timestamp reviewed_at
        text reviewed_by FK
        text created_by FK
        integer current_approval_step
        jsonb approval_progress
        text deployment_target
        jsonb deployment_metadata
        timestamp next_review_due
        timestamp last_periodic_review_at
        timestamp last_reminder_sent_at
        uuid previous_blueprint_id FK
        jsonb governance_diff
        jsonb baseline_validation_report
        jsonb governance_drift
        timestamp created_at
        timestamp updated_at
    }

    GOVERNANCE_POLICIES {
        uuid id PK
        text enterprise_id FK
        text name
        text type
        text description
        jsonb rules
        integer policy_version
        uuid previous_version_id FK
        timestamp superseded_at
        timestamp created_at
    }

    AUDIT_LOG {
        uuid id PK
        text entity_type
        uuid entity_id
        text action
        text actor_email
        text actor_role
        text enterprise_id FK
        jsonb from_state
        jsonb to_state
        jsonb metadata
        timestamp created_at
    }

    WEBHOOKS {
        uuid id PK
        text enterprise_id FK
        text name
        text url
        text secret
        text[] events
        boolean active
        text created_by
        timestamp created_at
        timestamp updated_at
    }

    WEBHOOK_DELIVERIES {
        uuid id PK
        uuid webhook_id FK
        text enterprise_id FK
        text event_type
        jsonb payload
        text status
        integer response_status
        text response_body
        integer attempts
        timestamp last_attempted_at
        timestamp created_at
    }

    NOTIFICATIONS {
        uuid id PK
        text recipient_email
        text enterprise_id FK
        text type
        text title
        text message
        text entity_type
        text entity_id
        text link
        boolean read
        timestamp created_at
    }

    BLUEPRINT_TEST_CASES {
        uuid id PK
        uuid agent_id FK
        text enterprise_id FK
        text name
        text description
        text input_prompt
        text expected_behavior
        text severity
        text created_by
        timestamp created_at
        timestamp updated_at
    }

    BLUEPRINT_TEST_RUNS {
        uuid id PK
        uuid blueprint_id FK
        uuid agent_id FK
        text enterprise_id FK
        text status
        jsonb test_results
        integer total_cases
        integer passed_cases
        integer failed_cases
        text run_by
        timestamp started_at
        timestamp completed_at
    }

    BLUEPRINT_QUALITY_SCORES {
        uuid id PK
        uuid blueprint_id FK
        text enterprise_id FK
        numeric overall_score
        numeric intent_alignment
        numeric tool_appropriateness
        numeric instruction_specificity
        numeric governance_adequacy
        numeric ownership_completeness
        jsonb flags
        text evaluator_model
        timestamp evaluated_at
    }

    INTAKE_QUALITY_SCORES {
        uuid id PK
        uuid session_id FK
        text enterprise_id FK
        numeric overall_score
        numeric breadth_score
        numeric ambiguity_score
        numeric risk_id_score
        numeric stakeholder_score
        text evaluator_model
        timestamp evaluated_at
    }

    DEPLOYMENT_HEALTH {
        uuid id PK
        uuid agent_id FK UK
        uuid blueprint_id FK
        text enterprise_id FK
        text health_status
        integer error_count
        integer warning_count
        jsonb validation_report
        timestamp last_checked_at
        timestamp deployed_at
        real production_error_rate
        integer production_latency_p99
        timestamp last_telemetry_at
        timestamp created_at
    }

    SYSTEM_HEALTH_SNAPSHOTS {
        uuid id PK
        text enterprise_id FK
        timestamp snapshot_at
        numeric quality_index
        numeric blueprint_validity_rate
        numeric avg_refinements
        integer review_queue_depth
        numeric sla_compliance_rate
        numeric webhook_success_rate
        integer active_policy_count
        integer blueprints_generated_24h
        integer violations_24h
        jsonb raw_metrics
    }

    INTELLIGENCE_BRIEFINGS {
        uuid id PK
        text enterprise_id FK
        date briefing_date
        text content
        text health_status
        timestamp generated_at
        jsonb metrics_snapshot
    }
```

---

## Core Tables

### users

User accounts and authentication. Supports role-based access control (RBAC).

| Column | Type | Constraints | Description |
|--------|------|---|---|
| `id` | UUID | PRIMARY KEY, DEFAULT random() | Unique user identifier |
| `email` | text | NOT NULL, UNIQUE | User email address; used for login and notifications |
| `name` | text | NOT NULL | Display name |
| `passwordHash` | text | NOT NULL | Bcrypt-hashed password (minimum 12 rounds) |
| `role` | text | NOT NULL | One of: `architect`, `reviewer`, `compliance_officer`, `admin`, `viewer` |
| `enterpriseId` | text | NULLABLE FK → enterprise identifier | Tenant scope; NULL for platform admins |
| `createdAt` | timestamp | NOT NULL, DEFAULT NOW() | Account creation timestamp |

**Indexes:**
```sql
CREATE UNIQUE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_enterprise ON users(enterprise_id);
```

---

### intake_sessions

Design intake workflows: captures enterprise requirements through multi-turn conversations.

| Column | Type | Constraints | Description |
|--------|------|---|---|
| `id` | UUID | PRIMARY KEY, DEFAULT random() | Unique session identifier |
| `enterpriseId` | text | NULLABLE FK | Tenant scope |
| `createdBy` | text | NULLABLE | User email (nullable for pre-auth rows) |
| `status` | text | NOT NULL, DEFAULT 'active' | One of: `active`, `completed`, `abandoned` |
| `intakePayload` | JSONB | NOT NULL, DEFAULT {} | Multi-phase structured intake data (see IntakePayload schema) |
| `intakeContext` | JSONB | NULLABLE | Phase 1 context extracted by LLM (null until submitted) |
| `agentType` | text | NULLABLE | One of: `automation`, `decision-support`, `autonomous`, `data-access` |
| `riskTier` | text | NULLABLE | Risk classification: `low`, `medium`, `high`, `critical` |
| `expertiseLevel` | text | NULLABLE | Expertise routing (Phase 49): `guided`, `adaptive`, `expert` (set after turn 2) |
| `createdAt` | timestamp | NOT NULL, DEFAULT NOW() | Session start time |
| `updatedAt` | timestamp | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Indexes:**
```sql
CREATE INDEX idx_intake_sessions_enterprise ON intake_sessions(enterprise_id);
CREATE INDEX idx_intake_sessions_status ON intake_sessions(status, created_at DESC);
```

---

### agent_blueprints

Agent Blueprint Packages (ABPs): complete agent specifications including identity, instructions, tools, governance constraints, and deployment metadata.

| Column | Type | Constraints | Description |
|--------|------|---|---|
| `id` | UUID | PRIMARY KEY, DEFAULT random() | Unique blueprint version ID |
| `agentId` | UUID | NOT NULL, DEFAULT random() | Logical agent ID (all versions share same agentId) |
| `version` | text | NOT NULL, DEFAULT '1.0.0' | Semantic version (e.g., 1.2.3) |
| `name` | text | NULLABLE | Agent name (denormalized from ABP.identity.name for search) |
| `tags` | JSONB | NOT NULL, DEFAULT [] | String array (denormalized from ABP.tags for search) |
| `enterpriseId` | text | NULLABLE FK | Tenant scope (denormalized for filtering) |
| `sessionId` | UUID | NOT NULL FK → intake_sessions.id | Parent intake session |
| `abp` | JSONB | NOT NULL | Full Agent Blueprint Package document (see ABP Schema reference) |
| `status` | text | NOT NULL, DEFAULT 'draft' | Blueprint lifecycle: `draft`, `in_review`, `approved`, `rejected`, `deprecated` |
| `refinementCount` | text | NOT NULL, DEFAULT '0' | Number of times refined by designer |
| `validationReport` | JSONB | NULLABLE | Governance validation result (see ValidationReport schema) |
| `reviewComment` | text | NULLABLE | Last reviewer comment (approval, rejection, or change request) |
| `reviewedAt` | timestamp | NULLABLE | When last review action occurred |
| `reviewedBy` | text | NULLABLE | Reviewer email |
| `createdBy` | text | NULLABLE | Designer email |
| `currentApprovalStep` | integer | NOT NULL, DEFAULT 0 | Current step in multi-step approval workflow (Phase 22) |
| `approvalProgress` | JSONB | NOT NULL, DEFAULT [] | Array of ApprovalStepRecord (see schema below) |
| `deploymentTarget` | text | NULLABLE | Runtime platform: `agentcore`, `ai_foundry`, etc. |
| `deploymentMetadata` | JSONB | NULLABLE | Runtime-specific deployment details (see AgentCoreDeploymentRecord) |
| `nextReviewDue` | timestamp | NULLABLE | Scheduled periodic review deadline (SR 11-7) |
| `lastPeriodicReviewAt` | timestamp | NULLABLE | Last periodic review execution timestamp |
| `lastReminderSentAt` | timestamp | NULLABLE | Last reminder notification (prevent duplicates) |
| `previousBlueprintId` | UUID | NULLABLE FK → agent_blueprints.id | Predecessor blueprint for lineage tracking |
| `governanceDiff` | JSONB | NULLABLE | ABPDiff comparing to predecessor (null for v1) |
| `baselineValidationReport` | JSONB | NULLABLE | Validation report snapshot at approval time |
| `governanceDrift` | JSONB | NULLABLE | Governance drift status: `{ status: 'clean'\|'drifted', newViolations: [], checkedAt: string }` |
| `createdAt` | timestamp | NOT NULL, DEFAULT NOW() | Blueprint creation timestamp |
| `updatedAt` | timestamp | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Indexes:**
```sql
CREATE INDEX idx_agent_blueprints_session ON agent_blueprints(session_id);
CREATE INDEX idx_agent_blueprints_agent_id ON agent_blueprints(agent_id);
CREATE INDEX idx_agent_blueprints_status ON agent_blueprints(status);
CREATE INDEX idx_agent_blueprints_enterprise ON agent_blueprints(enterprise_id, created_at DESC);
```

---

### governance_policies

Governance policies: compliance rules, safety constraints, and audit requirements applied to all agent blueprints in an enterprise.

| Column | Type | Constraints | Description |
|--------|------|---|---|
| `id` | UUID | PRIMARY KEY, DEFAULT random() | Unique policy version ID |
| `enterpriseId` | text | NULLABLE FK | Tenant scope |
| `name` | text | NOT NULL | Human-readable policy name |
| `type` | text | NOT NULL | Policy category: `safety`, `compliance`, `data_handling`, `access_control`, `audit` |
| `description` | text | NULLABLE | Policy explanation and rationale |
| `rules` | JSONB | NOT NULL, DEFAULT [] | Array of Rule objects (see Rule schema) |
| `policyVersion` | integer | NOT NULL, DEFAULT 1 | Version counter (incremented on update) |
| `previousVersionId` | UUID | NULLABLE FK → governance_policies.id | Link to prior version |
| `supersededAt` | timestamp | NULLABLE | When this version was superseded by a new version |
| `createdAt` | timestamp | NOT NULL, DEFAULT NOW() | Policy creation timestamp |

**Indexes:**
```sql
CREATE INDEX idx_governance_policies_enterprise ON governance_policies(enterprise_id);
CREATE INDEX idx_governance_policies_type ON governance_policies(type);
```

---

### audit_log

Append-only compliance audit trail. Never UPDATE or DELETE rows after creation.

| Column | Type | Constraints | Description |
|--------|------|---|---|
| `id` | UUID | PRIMARY KEY, DEFAULT random() | Unique audit event ID |
| `entityType` | text | NOT NULL | Type of entity: `blueprint`, `intake_session`, `policy` |
| `entityId` | UUID | NOT NULL | ID of the affected entity (blueprintId, sessionId, or policyId) |
| `action` | text | NOT NULL | Action type: `blueprint.created`, `blueprint.refined`, `blueprint.status_changed`, `blueprint.reviewed`, `intake.finalized`, `policy.created`, `policy.updated` |
| `actorEmail` | text | NOT NULL | User email who performed the action |
| `actorRole` | text | NOT NULL | Actor's role at time of action |
| `enterpriseId` | text | NULLABLE FK | Tenant scope |
| `fromState` | JSONB | NULLABLE | Entity state before action (null for creation events) |
| `toState` | JSONB | NOT NULL | Entity state after action |
| `metadata` | JSONB | NULLABLE | Additional context (e.g., { "comment": "...", "refinement_count": 5 }) |
| `createdAt` | timestamp | NOT NULL, DEFAULT NOW() | Event timestamp |

**Indexes:**
```sql
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_audit_log_actor ON audit_log(actor_email, created_at DESC);
CREATE INDEX idx_audit_log_enterprise ON audit_log(enterprise_id, created_at DESC);
```

---

### webhooks

Outbound webhook endpoints registered by admins to receive lifecycle events.

| Column | Type | Constraints | Description |
|--------|------|---|---|
| `id` | UUID | PRIMARY KEY, DEFAULT random() | Unique webhook ID |
| `enterpriseId` | text | NULLABLE FK | Tenant scope |
| `name` | text | NOT NULL | Display name (e.g., "CI/CD Pipeline") |
| `url` | text | NOT NULL | HTTPS endpoint (HTTP rejected at registration) |
| `secret` | text | NOT NULL | 32-byte hex HMAC-SHA256 signing key |
| `events` | text[] | NOT NULL, DEFAULT [] | Event subscriptions; empty = all events |
| `active` | boolean | NOT NULL, DEFAULT true | Pause/resume toggle |
| `createdBy` | text | NOT NULL | Admin email who registered the webhook |
| `createdAt` | timestamp | NOT NULL, DEFAULT NOW() | Registration timestamp |
| `updatedAt` | timestamp | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Indexes:**
```sql
CREATE INDEX idx_webhooks_enterprise ON webhooks(enterprise_id, active);
```

---

### webhook_deliveries

Delivery log for each webhook dispatch attempt. Cascade-deletes with parent webhook.

| Column | Type | Constraints | Description |
|--------|------|---|---|
| `id` | UUID | PRIMARY KEY, DEFAULT random() | Unique delivery attempt ID |
| `webhookId` | UUID | NOT NULL FK → webhooks.id ON DELETE CASCADE | Parent webhook |
| `enterpriseId` | text | NULLABLE FK | Tenant scope |
| `eventType` | text | NOT NULL | Event type (e.g., `agent.approved`, `policy.updated`) |
| `payload` | JSONB | NOT NULL | Full webhook payload sent |
| `status` | text | NOT NULL, DEFAULT 'pending' | Delivery status: `pending`, `success`, `failed` |
| `responseStatus` | integer | NULLABLE | HTTP response status code (e.g., 200, 500) |
| `responseBody` | text | NULLABLE | First 500 characters of response body |
| `attempts` | integer | NOT NULL, DEFAULT 0 | Number of retry attempts consumed |
| `lastAttemptedAt` | timestamp | NULLABLE | When the most recent attempt occurred |
| `createdAt` | timestamp | NOT NULL, DEFAULT NOW() | When delivery was first queued |

**Indexes:**
```sql
CREATE INDEX idx_deliveries_webhook ON webhook_deliveries(webhook_id, created_at DESC);
```

---

## JSONB Field Schemas

### ABP (agent_blueprints.abp)

Complete Agent Blueprint Package document. Comprehensive schema at `docs/schemas/abp/`.

**Top-level structure:**
```json
{
  "identity": {
    "agentId": "uuid",
    "name": "Agent Name",
    "description": "...",
    "version": "1.0.0",
    "owner": "owner@enterprise.com",
    "tags": ["tag1", "tag2"]
  },
  "purpose": { ... },
  "instructions": { ... },
  "tools": { ... },
  "guardrails": { ... },
  "governance": { ... },
  "monitoring": { ... }
}
```

---

### ValidationReport (agent_blueprints.validation_report)

Governance validation result from policy evaluator.

```json
{
  "status": "pass" | "fail" | "warning",
  "checkedAt": "2026-04-05T14:32:10Z",
  "violations": [
    {
      "severity": "error" | "warning",
      "policyId": "uuid",
      "policyName": "string",
      "message": "string",
      "remediationSteps": ["step1", "step2"]
    }
  ],
  "passedChecks": [
    {
      "policyId": "uuid",
      "policyName": "string",
      "message": "string"
    }
  ]
}
```

---

### IntakePayload (intake_sessions.intake_payload)

Multi-phase structured intake data collected during design workflow.

```json
{
  "phase1": {
    "agentType": "automation" | "decision-support" | "autonomous" | "data-access",
    "riskTier": "low" | "medium" | "high" | "critical",
    "summary": "string",
    "intent": "string",
    "successCriteria": ["criterion1", "criterion2"]
  },
  "phase2": {
    "stakeholders": [
      {
        "domain": "compliance" | "risk" | "legal" | "security" | "it" | "operations" | "business",
        "contributors": ["email1@enterprise.com"],
        "requirements": { "key": "value" }
      }
    ]
  },
  "phase3": {
    "toolRequirements": [
      {
        "category": "string",
        "description": "string",
        "priority": "critical" | "high" | "medium" | "low"
      }
    ]
  },
  "phase4": {
    "governanceRequirements": [
      {
        "domain": "string",
        "requirement": "string"
      }
    ]
  }
}
```

---

### Rule (governance_policies.rules[])

Individual policy rule with expression logic.

```json
{
  "id": "rule-uuid",
  "description": "string",
  "expression": "string (policy expression language)",
  "severity": "error" | "warning",
  "remediationSteps": ["step1", "step2"],
  "appliesTo": ["all" | "specific agent types"],
  "exceptions": [
    {
      "agentId": "uuid",
      "reason": "string"
    }
  ]
}
```

---

### ApprovalStepRecord (agent_blueprints.approval_progress[])

Multi-step approval workflow tracking (Phase 22).

```json
{
  "step": 1,
  "name": "Compliance Review",
  "status": "pending" | "passed" | "rejected" | "changes_requested",
  "reviewer": "reviewer@enterprise.com",
  "reviewedAt": "2026-04-05T14:30:00Z",
  "comment": "string",
  "requiredApprovals": 1,
  "approvalsReceived": 1
}
```

---

### AgentCoreDeploymentRecord (agent_blueprints.deployment_metadata)

Runtime deployment details (AgentCore integration).

```json
{
  "runtimeId": "string (AWS Bedrock agent ID)",
  "deploymentArn": "arn:aws:bedrock:...",
  "modelId": "anthropic.claude-3-5-sonnet-...",
  "deployedAt": "2026-04-05T14:32:10Z",
  "deployedBy": "deployer@enterprise.com",
  "region": "us-east-1",
  "version": "string",
  "status": "active" | "inactive" | "error",
  "rollbackTo": "string (previous deployment version, optional)"
}
```

---

## Supporting Tables

### intake_messages

Message history for a single intake session (multi-turn conversation).

| Column | Type | Constraints | Description |
|--------|------|---|---|
| `id` | UUID | PRIMARY KEY, DEFAULT random() | Message ID |
| `sessionId` | UUID | NOT NULL FK → intake_sessions.id ON DELETE CASCADE | Parent session |
| `role` | text | NOT NULL | `user` or `assistant` |
| `content` | text | NOT NULL | Message text |
| `toolName` | text | NULLABLE | Tool invoked (if any) |
| `toolInput` | JSONB | NULLABLE | Tool input parameters |
| `toolOutput` | JSONB | NULLABLE | Tool output result |
| `createdAt` | timestamp | NOT NULL, DEFAULT NOW() | Message timestamp |

**Indexes:**
```sql
CREATE INDEX idx_intake_messages_session ON intake_messages(session_id, created_at);
```

---

### intake_contributions

Cross-functional requirements from domain experts during intake.

| Column | Type | Constraints | Description |
|--------|------|---|---|
| `id` | UUID | PRIMARY KEY, DEFAULT random() | Contribution ID |
| `sessionId` | UUID | NOT NULL FK → intake_sessions.id ON DELETE CASCADE | Parent session |
| `enterpriseId` | text | NULLABLE FK | Tenant scope |
| `contributorEmail` | text | NOT NULL | Domain expert email |
| `contributorRole` | text | NOT NULL | Expert's role/domain |
| `domain` | text | NOT NULL | Domain category: `compliance`, `risk`, `legal`, `security`, `it`, `operations`, `business` |
| `fields` | JSONB | NOT NULL | Domain-specific key-value requirements |
| `createdAt` | timestamp | NOT NULL, DEFAULT NOW() | Contribution timestamp |

**Indexes:**
```sql
CREATE INDEX idx_contributions_session ON intake_contributions(session_id);
```

---

### notifications

In-app notifications triggered by lifecycle events.

| Column | Type | Constraints | Description |
|--------|------|---|---|
| `id` | UUID | PRIMARY KEY, DEFAULT random() | Notification ID |
| `recipientEmail` | text | NOT NULL | Target user email |
| `enterpriseId` | text | NULLABLE FK | Tenant scope |
| `type` | text | NOT NULL | Event type (e.g., `blueprint.submitted`, `blueprint.approved`) |
| `title` | text | NOT NULL | Notification title |
| `message` | text | NOT NULL | Notification message |
| `entityType` | text | NOT NULL | `blueprint`, `policy`, `intake_session` |
| `entityId` | text | NOT NULL | ID of affected entity |
| `link` | text | NULLABLE | Navigation target (e.g., `/registry/[agentId]`) |
| `read` | boolean | NOT NULL, DEFAULT false | Read/unread status |
| `createdAt` | timestamp | NOT NULL, DEFAULT NOW() | Notification timestamp |

**Indexes:**
```sql
CREATE INDEX idx_notifications_recipient ON notifications(recipient_email, read, created_at DESC);
CREATE INDEX idx_notifications_enterprise ON notifications(enterprise_id, created_at DESC);
```

---

### blueprint_test_cases & blueprint_test_runs

Test harness for validating blueprints (Phase 23).

**blueprint_test_cases:**

| Column | Type | Constraints | Description |
|--------|------|---|---|
| `id` | UUID | PRIMARY KEY, DEFAULT random() | Test case ID |
| `agentId` | UUID | NOT NULL | Logical agent (shared across versions) |
| `enterpriseId` | text | NULLABLE FK | Tenant scope |
| `name` | text | NOT NULL | Test case name |
| `description` | text | NULLABLE | Test explanation |
| `inputPrompt` | text | NOT NULL | Input to agent being tested |
| `expectedBehavior` | text | NOT NULL | Expected output description |
| `severity` | text | NOT NULL, DEFAULT 'required' | `required` or `informational` |
| `createdBy` | text | NOT NULL | Author email |
| `createdAt` | timestamp | NOT NULL, DEFAULT NOW() | Creation timestamp |
| `updatedAt` | timestamp | NOT NULL, DEFAULT NOW() | Last update timestamp |

**blueprint_test_runs:**

| Column | Type | Constraints | Description |
|--------|------|---|---|
| `id` | UUID | PRIMARY KEY, DEFAULT random() | Test run ID |
| `blueprintId` | UUID | NOT NULL FK → agent_blueprints.id | Blueprint being tested |
| `agentId` | UUID | NOT NULL | Logical agent |
| `enterpriseId` | text | NULLABLE FK | Tenant scope |
| `status` | text | NOT NULL, DEFAULT 'running' | `running`, `passed`, `failed`, `error` |
| `testResults` | JSONB | NOT NULL, DEFAULT [] | Array of TestCaseResult (see schema) |
| `totalCases` | integer | NOT NULL, DEFAULT 0 | Total test cases run |
| `passedCases` | integer | NOT NULL, DEFAULT 0 | Passed count |
| `failedCases` | integer | NOT NULL, DEFAULT 0 | Failed count |
| `runBy` | text | NOT NULL | User email who triggered the run |
| `startedAt` | timestamp | NOT NULL, DEFAULT NOW() | Run start timestamp |
| `completedAt` | timestamp | NULLABLE | Run completion timestamp |

**Indexes:**
```sql
CREATE INDEX idx_test_cases_agent ON blueprint_test_cases(agent_id);
CREATE INDEX idx_test_runs_blueprint ON blueprint_test_runs(blueprint_id);
CREATE INDEX idx_test_runs_agent ON blueprint_test_runs(agent_id);
```

---

### Quality Score Tables

#### blueprint_quality_scores

AI evaluation of blueprint quality at submission (Phase 28).

| Column | Type | Constraints | Description |
|--------|------|---|---|
| `id` | UUID | PRIMARY KEY, DEFAULT random() | Score ID |
| `blueprintId` | UUID | NOT NULL FK → agent_blueprints.id ON DELETE CASCADE | Blueprint scored |
| `enterpriseId` | text | NULLABLE FK | Tenant scope |
| `overallScore` | numeric(4,2) | NULLABLE | 0–100 overall quality score |
| `intentAlignment` | numeric(3,2) | NULLABLE | 1–5 score |
| `toolAppropriateness` | numeric(3,2) | NULLABLE | 1–5 score |
| `instructionSpecificity` | numeric(3,2) | NULLABLE | 1–5 score |
| `governanceAdequacy` | numeric(3,2) | NULLABLE | 1–5 score |
| `ownershipCompleteness` | numeric(3,2) | NULLABLE | 1–5 score |
| `flags` | JSONB | NOT NULL, DEFAULT [] | Array of flag strings (e.g., ["missing_error_handler", "vague_instructions"]) |
| `evaluatorModel` | text | NULLABLE | LLM model used for evaluation |
| `evaluatedAt` | timestamp | NOT NULL, DEFAULT NOW() | Evaluation timestamp |

#### intake_quality_scores

AI evaluation of intake session quality (Phase 28).

| Column | Type | Constraints | Description |
|--------|------|---|---|
| `id` | UUID | PRIMARY KEY, DEFAULT random() | Score ID |
| `sessionId` | UUID | NOT NULL FK → intake_sessions.id ON DELETE CASCADE | Session scored |
| `enterpriseId` | text | NULLABLE FK | Tenant scope |
| `overallScore` | numeric(4,2) | NULLABLE | 0–100 overall quality score |
| `breadthScore` | numeric(3,2) | NULLABLE | 1–5 governance domain coverage |
| `ambiguityScore` | numeric(3,2) | NULLABLE | 1–5 requirement clarification |
| `riskIdScore` | numeric(3,2) | NULLABLE | 1–5 risk identification |
| `stakeholderScore` | numeric(3,2) | NULLABLE | 1–5 stakeholder alignment |
| `evaluatorModel` | text | NULLABLE | LLM model used for evaluation |
| `evaluatedAt` | timestamp | NOT NULL, DEFAULT NOW() | Evaluation timestamp |

---

### deployment_health & system_health_snapshots

Monitoring and observability tables.

**deployment_health:** One row per logical agent (upserted on health checks).

| Column | Type | Constraints | Description |
|--------|------|---|---|
| `id` | UUID | PRIMARY KEY, DEFAULT random() | Health record ID |
| `agentId` | UUID | NOT NULL UNIQUE | Logical agent (one per agent) |
| `blueprintId` | UUID | NOT NULL | Current deployed blueprint |
| `enterpriseId` | text | NULLABLE FK | Tenant scope |
| `healthStatus` | text | NOT NULL, DEFAULT 'unknown' | `clean`, `degraded`, `critical`, `unknown` |
| `errorCount` | integer | NOT NULL, DEFAULT 0 | Recent error count |
| `warningCount` | integer | NOT NULL, DEFAULT 0 | Recent warning count |
| `validationReport` | JSONB | NULLABLE | Latest validation result |
| `lastCheckedAt` | timestamp | NULLABLE | Last health check timestamp |
| `deployedAt` | timestamp | NOT NULL | Deployment timestamp |
| `productionErrorRate` | real | NULLABLE | 0.0–1.0 error rate from telemetry |
| `productionLatencyP99` | integer | NULLABLE | 99th percentile latency (ms) |
| `lastTelemetryAt` | timestamp | NULLABLE | Last telemetry update timestamp |
| `createdAt` | timestamp | NOT NULL, DEFAULT NOW() | Record creation timestamp |

**system_health_snapshots:** Periodic SQL aggregation (no AI).

| Column | Type | Constraints | Description |
|--------|------|---|---|
| `id` | UUID | PRIMARY KEY, DEFAULT random() | Snapshot ID |
| `enterpriseId` | text | NULLABLE FK | Tenant scope |
| `snapshotAt` | timestamp | NOT NULL, DEFAULT NOW() | Snapshot timestamp |
| `qualityIndex` | numeric(5,2) | NULLABLE | 0–100 aggregate quality |
| `blueprintValidityRate` | numeric(5,4) | NULLABLE | 0.0000–1.0000 |
| `avgRefinements` | numeric(5,2) | NULLABLE | Average refinements per blueprint |
| `reviewQueueDepth` | integer | NULLABLE | Count of blueprints awaiting review |
| `slaComplianceRate` | numeric(5,4) | NULLABLE | SLA compliance ratio |
| `webhookSuccessRate` | numeric(5,4) | NULLABLE | Webhook delivery success rate |
| `activePolicyCount` | integer | NULLABLE | Active policies count |
| `blueprintsGenerated24h` | integer | NULLABLE | Blueprints generated in last 24h |
| `violations24h` | integer | NULLABLE | Governance violations in last 24h |
| `rawMetrics` | JSONB | NOT NULL, DEFAULT {} | Additional metrics (unstructured) |

---

## Drizzle ORM Configuration

**drizzle.config.ts:**
```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./src/lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgresql://localhost/intellios",
  },
});
```

**Database connection (src/lib/db/index.ts):**
```typescript
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });
```

---

## Common Query Patterns

### Get all blueprints for an enterprise by status

```typescript
const blueprints = await db
  .select()
  .from(agentBlueprints)
  .where(
    and(
      eq(agentBlueprints.enterpriseId, enterpriseId),
      eq(agentBlueprints.status, "approved")
    )
  )
  .orderBy(desc(agentBlueprints.createdAt));
```

### Get audit trail for a blueprint

```typescript
const auditEvents = await db
  .select()
  .from(auditLog)
  .where(
    and(
      eq(auditLog.entityType, "blueprint"),
      eq(auditLog.entityId, blueprintId)
    )
  )
  .orderBy(asc(auditLog.createdAt));
```

### Find governance violations for a policy update

```typescript
const violations = await db
  .select()
  .from(auditLog)
  .where(
    and(
      eq(auditLog.entityType, "blueprint"),
      eq(auditLog.action, "blueprint.status_changed"),
      sql`${auditLog.toState}->'validationReport'->>'status' = 'fail'`
    )
  );
```

### Get active webhooks for an enterprise

```typescript
const activeWebhooks = await db
  .select()
  .from(webhooks)
  .where(
    and(
      eq(webhooks.enterpriseId, enterpriseId),
      eq(webhooks.active, true)
    )
  );
```

---

## Performance Considerations

1. **JSONB Indexing:** For frequently queried JSONB paths (e.g., `abp->>'identity'->>'name'`), consider GIN indexes:
   ```sql
   CREATE INDEX idx_abp_identity_name
   ON agent_blueprints USING GIN ((abp->'identity'));
   ```

2. **Partition Strategy:** For very large enterprises (>100k blueprints), consider partitioning `agent_blueprints` and `audit_log` by `enterpriseId` to improve query performance.

3. **Archive Old Audit Logs:** Implement a retention policy to archive or delete audit logs older than compliance retention periods (e.g., 7 years). Use a scheduled job:
   ```sql
   DELETE FROM audit_log
   WHERE created_at < now() - interval '7 years'
     AND enterprise_id IS NOT NULL;
   ```

4. **Connection Pooling:** Use connection pooling (pgBouncer or PgPool) in production to manage concurrent connections efficiently.

5. **Regular VACUUM:** PostgreSQL maintenance (`VACUUM ANALYZE`) should run nightly to reclaim disk space and update statistics.

---

## Migration Strategy

All schema changes are managed via Drizzle migrations:

```bash
# Generate new migration after modifying schema.ts
npx drizzle-kit generate:pg

# Inspect pending migrations
npx drizzle-kit up:pg

# Apply migrations to database
npm run db:migrate
```

Never hand-edit migration files; always regenerate from schema.ts changes.

---

## Summary

Intellios' PostgreSQL schema is organized around:
- **Agent Design:** `intake_sessions`, `agent_blueprints`, `audit_log`
- **Governance:** `governance_policies`, `validationReport` (JSONB)
- **Deployment:** `deployment_health`, `deploymentMetadata` (JSONB)
- **Integration:** `webhooks`, `webhook_deliveries`
- **Monitoring:** `blueprint_quality_scores`, `system_health_snapshots`

All tables use enterprise_id for multi-tenant isolation; JSONB columns store complex nested structures. Strategic indexes enable efficient queries for common operations (filter by status, enterprise, created_at).
