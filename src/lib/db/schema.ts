import { pgTable, uuid, text, jsonb, timestamp, boolean, integer, index, numeric, date, real, uniqueIndex, unique } from "drizzle-orm/pg-core";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

// ─── Users ───────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull(), // architect | reviewer | compliance_officer | admin | viewer
  enterpriseId: text("enterprise_id"),  // tenant identifier — null for platform admins
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Intake ───────────────────────────────────────────────────────────────────

export const intakeSessions = pgTable("intake_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  enterpriseId: text("enterprise_id"),
  createdBy: text("created_by"), // user email — nullable for rows created before auth
  status: text("status").notNull().default("active"), // active | completed | abandoned
  intakePayload: jsonb("intake_payload").notNull().default({}),
  intakeContext: jsonb("intake_context"), // Phase 1 structured context — null until Phase 1 is submitted
  agentType: text("agent_type"),      // "automation" | "decision-support" | "autonomous" | "data-access" | null
  riskTier:  text("risk_tier"),       // "low" | "medium" | "high" | "critical" | null
  // Phase 49: Intake Confidence Engine
  expertiseLevel: text("expertise_level"), // "guided" | "adaptive" | "expert" | null (set after turn 2)
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const intakeMessages = pgTable(
  "intake_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => intakeSessions.id, { onDelete: "cascade" }),
    role: text("role").notNull(), // user | assistant
    content: text("content").notNull(),
    toolName: text("tool_name"),
    toolInput: jsonb("tool_input"),
    toolOutput: jsonb("tool_output"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_intake_messages_session").on(table.sessionId, table.createdAt)]
);

export const intakeContributions = pgTable(
  "intake_contributions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => intakeSessions.id, { onDelete: "cascade" }),
    enterpriseId: text("enterprise_id"),
    contributorEmail: text("contributor_email").notNull(),
    contributorRole: text("contributor_role").notNull(),
    domain: text("domain").notNull(), // compliance | risk | legal | security | it | operations | business
    fields: jsonb("fields").notNull(), // domain-specific key → free-text requirement
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_contributions_session").on(table.sessionId)]
);

export const agentBlueprints = pgTable(
  "agent_blueprints",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Agent Registry fields
    agentId: uuid("agent_id").notNull().defaultRandom(), // logical agent; all versions of same agent share this
    version: text("version").notNull().default("1.0.0"),  // semver
    name: text("name"),                                    // denormalized from abp.identity.name for search
    tags: jsonb("tags").notNull().default([]),             // denormalized from abp.tags for search
    enterpriseId: text("enterprise_id"),                   // denormalized from intake session for efficient filtering
    // Core fields
    sessionId: uuid("session_id")
      .notNull()
      .references(() => intakeSessions.id, { onDelete: "cascade" }),
    abp: jsonb("abp").notNull(), // full ABP document (JSON)
    status: text("status").notNull().default("draft"), // draft | in_review | approved | rejected | deprecated
    refinementCount: text("refinement_count").notNull().default("0"), // how many times refined
    validationReport: jsonb("validation_report"),    // ValidationReport — null until first validation runs
    reviewComment: text("review_comment"),            // last reviewer comment (request changes, approve, reject)
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }), // when last review action was taken
    reviewedBy: text("reviewed_by"),                  // reviewer email — nullable for rows created before auth
    createdBy: text("created_by"),                    // designer email — nullable for rows created before auth
    // Phase 22: multi-step approval workflow
    currentApprovalStep: integer("current_approval_step").notNull().default(0),
    approvalProgress: jsonb("approval_progress").notNull().default([]), // ApprovalStepRecord[]
    // Phase 26: deployment target tracking
    deploymentTarget:   text("deployment_target"),   // "agentcore" | null — which platform the agent was deployed to
    deploymentMetadata: jsonb("deployment_metadata"), // AgentCoreDeploymentRecord | null
    // Phase 36: SR 11-7 periodic review scheduling
    nextReviewDue:          timestamp("next_review_due", { withTimezone: true }),
    lastPeriodicReviewAt:   timestamp("last_periodic_review_at", { withTimezone: true }),
    // Phase 37: Reminder tracking — prevents duplicate reminders within the same cycle
    lastReminderSentAt:     timestamp("last_reminder_sent_at", { withTimezone: true }),
    // Phase 52: Blueprint lineage — records predecessor + governance diff computed at version creation
    previousBlueprintId:   uuid("previous_blueprint_id"),  // which blueprint this was forked from (null for v1)
    governanceDiff:        jsonb("governance_diff"),         // ABPDiff stored at creation time; null for v1
    // H3-3.1: Governance drift detection
    baselineValidationReport: jsonb("baseline_validation_report"), // ValidationReport snapshot taken at approval time
    governanceDrift:           jsonb("governance_drift"),            // { status: 'clean'|'drifted', newViolations: [], checkedAt: string } | null
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_agent_blueprints_session").on(table.sessionId),
    index("idx_agent_blueprints_agent_id").on(table.agentId),
    index("idx_agent_blueprints_status").on(table.status),
    index("idx_agent_blueprints_enterprise").on(table.enterpriseId),
    // P3-CONSTRAINT-001 FIX: Prevent duplicate (agentId, version) pairs
    unique("uq_agent_blueprints_agent_version").on(table.agentId, table.version),
  ]
);

// ─── Audit Log ───────────────────────────────────────────────────────────────
// Append-only. Never UPDATE or DELETE rows from this table.

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityType: text("entity_type").notNull(), // blueprint | intake_session | policy
    entityId: uuid("entity_id").notNull(),
    action: text("action").notNull(),          // blueprint.created | blueprint.refined | blueprint.status_changed | blueprint.reviewed | intake.finalized | policy.created
    actorEmail: text("actor_email").notNull(),
    actorRole: text("actor_role").notNull(),
    enterpriseId: text("enterprise_id"),       // tenant scope — null for platform-level actions
    fromState: jsonb("from_state"),            // state snapshot before the action (nullable for creation events)
    toState: jsonb("to_state"),                // state snapshot after the action
    metadata: jsonb("metadata"),               // extra context (comment, refinement count, etc.)
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_audit_log_entity").on(table.entityType, table.entityId, table.createdAt),
    index("idx_audit_log_actor").on(table.actorEmail, table.createdAt),
    index("idx_audit_log_enterprise").on(table.enterpriseId, table.createdAt),
  ]
);

// ─── Notifications ───────────────────────────────────────────────────────────
// In-app notifications driven by lifecycle events. Written by the event bus
// notification handler; never mutated after creation except to set read=true.

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recipientEmail: text("recipient_email").notNull(),
    enterpriseId: text("enterprise_id"),
    type: text("type").notNull(),         // blueprint.submitted | blueprint.approved | etc.
    title: text("title").notNull(),
    message: text("message").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(), // blueprint version id
    link: text("link"),                    // /registry/[agentId] — direct navigation target
    read: boolean("read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_notifications_recipient").on(table.recipientEmail, table.read, table.createdAt),
    index("idx_notifications_enterprise").on(table.enterpriseId, table.createdAt),
  ]
);

// ─── Deployment Health ────────────────────────────────────────────────────────
// One row per logical agent (keyed on agentId). Upserted on every health check.
// Tracks governance posture of deployed agents against the current policy set.

export const deploymentHealth = pgTable(
  "deployment_health",
  {
    id:               uuid("id").primaryKey().defaultRandom(),
    agentId:          uuid("agent_id").notNull().unique(),
    blueprintId:      uuid("blueprint_id").notNull(),
    enterpriseId:     text("enterprise_id"),
    healthStatus:          text("health_status").notNull().default("unknown"), // clean | degraded | critical | unknown
    errorCount:            integer("error_count").notNull().default(0),
    warningCount:          integer("warning_count").notNull().default(0),
    validationReport:      jsonb("validation_report"),
    lastCheckedAt:         timestamp("last_checked_at", { withTimezone: true }).defaultNow(),
    deployedAt:            timestamp("deployed_at", { withTimezone: true }).notNull(),
    // H1-1.4: production telemetry metrics (updated by checkDeploymentHealth when telemetry available)
    productionErrorRate:   real("production_error_rate"),          // 0.0–1.0; null = no telemetry
    productionLatencyP99:  integer("production_latency_p99"),      // ms; null = no telemetry
    lastTelemetryAt:       timestamp("last_telemetry_at", { withTimezone: true }),
    createdAt:             timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [index("idx_deployment_health_enterprise").on(table.enterpriseId)]
);

// ─── Governance Policies ─────────────────────────────────────────────────────

export const governancePolicies = pgTable("governance_policies", {
  id: uuid("id").primaryKey().defaultRandom(),
  enterpriseId: text("enterprise_id"),
  name: text("name").notNull(),
  type: text("type").notNull(), // safety | compliance | data_handling | access_control | audit
  description: text("description"),
  rules: jsonb("rules").notNull().default([]),
  // Phase 22: policy versioning
  policyVersion: integer("policy_version").notNull().default(1),
  previousVersionId: uuid("previous_version_id").references((): AnyPgColumn => governancePolicies.id),
  supersededAt: timestamp("superseded_at", { withTimezone: true }),
  // W3-03: per-agent policy scope. null = applies to all agents; string[] = specific logical agentIds only.
  scopedAgentIds: jsonb("scoped_agent_ids").default(null),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Enterprise Settings ──────────────────────────────────────────────────────
// One row per enterprise. Upserted via the admin settings API.
// Missing keys fall back to DEFAULT_ENTERPRISE_SETTINGS in lib/settings/types.ts.

export const enterpriseSettings = pgTable("enterprise_settings", {
  enterpriseId:  text("enterprise_id").primaryKey(),
  settings:      jsonb("settings").notNull().default({}),
  updatedAt:     timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy:     text("updated_by"),
});

// ─── Blueprint Test Cases ─────────────────────────────────────────────────────
// Phase 23: Test Harness — one row per test case, keyed on agentId (logical agent).
// Test cases are shared across blueprint versions; re-run them as the blueprint evolves.
// Append-only for evidence purposes (DELETE is allowed only by designer/admin).

export const blueprintTestCases = pgTable(
  "blueprint_test_cases",
  {
    id:               uuid("id").primaryKey().defaultRandom(),
    agentId:          uuid("agent_id").notNull(),
    enterpriseId:     text("enterprise_id"),
    name:             text("name").notNull(),
    description:      text("description"),
    inputPrompt:      text("input_prompt").notNull(),
    expectedBehavior: text("expected_behavior").notNull(),
    severity:         text("severity").notNull().default("required"), // required | informational
    createdBy:        text("created_by").notNull(),
    createdAt:        timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt:        timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_test_cases_agent").on(t.agentId),
    index("idx_test_cases_enterprise").on(t.enterpriseId),
  ]
);

// ─── Blueprint Test Runs ──────────────────────────────────────────────────────
// Phase 23: Test Harness — one row per test execution, keyed on blueprintId.
// Append-only evidence: never updated after completion. Multiple runs per version allowed.

export const blueprintTestRuns = pgTable(
  "blueprint_test_runs",
  {
    id:           uuid("id").primaryKey().defaultRandom(),
    blueprintId:  uuid("blueprint_id").notNull().references(() => agentBlueprints.id),
    agentId:      uuid("agent_id").notNull(),
    enterpriseId: text("enterprise_id"),
    status:       text("status").notNull().default("running"), // running | passed | failed | error
    testResults:  jsonb("test_results").notNull().default([]),  // TestCaseResult[]
    totalCases:   integer("total_cases").notNull().default(0),
    passedCases:  integer("passed_cases").notNull().default(0),
    failedCases:  integer("failed_cases").notNull().default(0),
    runBy:        text("run_by").notNull(),
    startedAt:    timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt:  timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    index("idx_test_runs_blueprint").on(t.blueprintId),
    index("idx_test_runs_agent").on(t.agentId),
  ]
);

// ─── Webhooks ─────────────────────────────────────────────────────────────────
// Phase 25: Outbound Webhook Integration — admin-registered HTTPS endpoints that
// receive HMAC-signed lifecycle events. Enterprise-scoped: each webhook only
// receives events for its own enterprise. Active column enables pause/resume
// without deletion.

export const webhooks = pgTable(
  "webhooks",
  {
    id:           uuid("id").primaryKey().defaultRandom(),
    enterpriseId: text("enterprise_id"),
    name:         text("name").notNull(),
    url:          text("url").notNull(),
    secret:       text("secret").notNull(), // HMAC-SHA256 signing secret (32-byte hex)
    events:       text("events").array().notNull().default([]), // empty = all EventType values
    active:       boolean("active").notNull().default(true),
    createdBy:    text("created_by").notNull(),
    createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt:    timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_webhooks_enterprise").on(t.enterpriseId)]
);

// ─── Webhook Deliveries ───────────────────────────────────────────────────────
// Phase 25: Delivery log for each webhook dispatch attempt. Cascade-deletes with
// the parent webhook. Records the full payload sent, response received, and retry
// history. Append-only (no updates after final status is set).

export const webhookDeliveries = pgTable(
  "webhook_deliveries",
  {
    id:              uuid("id").primaryKey().defaultRandom(),
    webhookId:       uuid("webhook_id").notNull().references(() => webhooks.id, { onDelete: "cascade" }),
    enterpriseId:    text("enterprise_id"),
    eventType:       text("event_type").notNull(),
    payload:         jsonb("payload").notNull(),
    status:          text("status").notNull().default("pending"), // pending | success | failed
    responseStatus:  integer("response_status"),
    responseBody:    text("response_body"),  // first 500 chars of last response body
    attempts:        integer("attempts").notNull().default(0),
    lastAttemptedAt: timestamp("last_attempted_at", { withTimezone: true }),
    createdAt:       timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_deliveries_webhook").on(t.webhookId, t.createdAt)]
);

// ─── Phase 28: Awareness and Measurement System ───────────────────────────────

// Blueprint quality scores — AI evaluation of each blueprint version at submission
export const blueprintQualityScores = pgTable(
  "blueprint_quality_scores",
  {
    id:                    uuid("id").primaryKey().defaultRandom(),
    blueprintId:           uuid("blueprint_id").notNull().references(() => agentBlueprints.id, { onDelete: "cascade" }),
    enterpriseId:          text("enterprise_id"),
    overallScore:          numeric("overall_score", { precision: 4, scale: 2 }),    // 0–100
    intentAlignment:       numeric("intent_alignment", { precision: 3, scale: 2 }),  // 1–5
    toolAppropriateness:   numeric("tool_appropriateness", { precision: 3, scale: 2 }),
    instructionSpecificity: numeric("instruction_specificity", { precision: 3, scale: 2 }),
    governanceAdequacy:    numeric("governance_adequacy", { precision: 3, scale: 2 }),
    ownershipCompleteness: numeric("ownership_completeness", { precision: 3, scale: 2 }),
    flags:                 jsonb("flags").notNull().default([]),  // string[]
    evaluatorModel:        text("evaluator_model"),
    evaluatedAt:           timestamp("evaluated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("bqs_blueprint_idx").on(t.blueprintId),
    index("bqs_enterprise_idx").on(t.enterpriseId, t.evaluatedAt),
  ]
);

// Intake session quality scores — AI evaluation of each finalized intake session
export const intakeQualityScores = pgTable(
  "intake_quality_scores",
  {
    id:               uuid("id").primaryKey().defaultRandom(),
    sessionId:        uuid("session_id").notNull().references(() => intakeSessions.id, { onDelete: "cascade" }),
    enterpriseId:     text("enterprise_id"),
    overallScore:     numeric("overall_score", { precision: 4, scale: 2 }),
    breadthScore:     numeric("breadth_score", { precision: 3, scale: 2 }),    // governance domain coverage
    ambiguityScore:   numeric("ambiguity_score", { precision: 3, scale: 2 }),  // requirement clarification
    riskIdScore:      numeric("risk_id_score", { precision: 3, scale: 2 }),    // risk identification
    stakeholderScore: numeric("stakeholder_score", { precision: 3, scale: 2 }), // stakeholder alignment
    evaluatorModel:   text("evaluator_model"),
    evaluatedAt:      timestamp("evaluated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("iqs_session_idx").on(t.sessionId),
    index("iqs_enterprise_idx").on(t.enterpriseId, t.evaluatedAt),
  ]
);

// System health snapshots — periodic SQL aggregation, no AI
export const systemHealthSnapshots = pgTable(
  "system_health_snapshots",
  {
    id:                    uuid("id").primaryKey().defaultRandom(),
    enterpriseId:          text("enterprise_id"),
    snapshotAt:            timestamp("snapshot_at", { withTimezone: true }).notNull().defaultNow(),
    qualityIndex:          numeric("quality_index", { precision: 5, scale: 2 }),           // 0–100
    blueprintValidityRate: numeric("blueprint_validity_rate", { precision: 5, scale: 4 }), // 0.0000–1.0000
    avgRefinements:        numeric("avg_refinements", { precision: 5, scale: 2 }),
    reviewQueueDepth:      integer("review_queue_depth"),
    slaComplianceRate:     numeric("sla_compliance_rate", { precision: 5, scale: 4 }),
    webhookSuccessRate:    numeric("webhook_success_rate", { precision: 5, scale: 4 }),
    activePolicyCount:     integer("active_policy_count"),
    blueprintsGenerated24h: integer("blueprints_generated_24h"),
    violations24h:         integer("violations_24h"),
    rawMetrics:            jsonb("raw_metrics").notNull().default({}),
  },
  (t) => [index("shs_enterprise_idx").on(t.enterpriseId, t.snapshotAt)]
);

// Daily intelligence briefings — AI-synthesized narrative, one per enterprise per day
export const intelligenceBriefings = pgTable(
  "intelligence_briefings",
  {
    id:              uuid("id").primaryKey().defaultRandom(),
    enterpriseId:    text("enterprise_id"),
    briefingDate:    date("briefing_date").notNull(),
    content:         text("content").notNull(),       // full briefing text
    healthStatus:    text("health_status").notNull().default("nominal"), // nominal | attention | critical
    generatedAt:     timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
    metricsSnapshot: jsonb("metrics_snapshot").notNull().default({}),
  },
  (t) => [index("ib_generated_idx").on(t.enterpriseId, t.generatedAt)]
);

// ─── Password Reset Tokens ────────────────────────────────────────────────────
// Phase 37: Time-limited, single-use tokens for password recovery.
// Raw token sent only via email; SHA-256 hash stored here.

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id:        uuid("id").primaryKey().defaultRandom(),
    userId:    uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt:    timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_prt_user_id").on(t.userId),
    index("idx_prt_token_hash").on(t.tokenHash),
  ]
);

// ─── Intake Invitations ───────────────────────────────────────────────────────
// Phase 43: Stakeholder Collaboration Workspace.
// Per-domain invitations to external stakeholders. Token-based; no Intellios
// account required. raciRole reflects the stakeholder's decision authority.

export const intakeInvitations = pgTable(
  "intake_invitations",
  {
    id:             uuid("id").primaryKey().defaultRandom(),
    sessionId:      uuid("session_id").notNull().references(() => intakeSessions.id, { onDelete: "cascade" }),
    domain:         text("domain").notNull(),
    inviteeEmail:   text("invitee_email").notNull(),
    inviteeName:    text("invitee_name"),
    roleTitle:      text("role_title"),
    raciRole:       text("raci_role").notNull().default("consulted"), // responsible|accountable|consulted|informed
    token:          text("token").notNull().unique(),
    status:         text("status").notNull().default("pending"), // pending|completed|expired
    expiresAt:      timestamp("expires_at", { withTimezone: true }).notNull(),
    contributionId: uuid("contribution_id").references(() => intakeContributions.id),
    sentAt:         timestamp("sent_at", { withTimezone: true }),
    createdAt:      timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_intake_invitations_token").on(t.token),
    index("idx_intake_invitations_session").on(t.sessionId),
  ]
);

// ─── Intake AI Insights ───────────────────────────────────────────────────────
// Phase 43: AI-generated synthesis, conflict detection, gap analysis, and
// suggested next actions. Produced by the orchestrator after each contribution.

export const intakeAIInsights = pgTable(
  "intake_ai_insights",
  {
    id:        uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id").notNull().references(() => intakeSessions.id, { onDelete: "cascade" }),
    type:      text("type").notNull(), // synthesis|conflict|gap|suggestion
    title:     text("title").notNull(),
    body:      text("body").notNull(),
    metadata:  jsonb("metadata"), // { action?, domain?, suggestedEmail?, suggestedRoleTitle? }
    status:    text("status").notNull().default("pending"), // pending|approved|dismissed
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_intake_ai_insights_session").on(t.sessionId, t.createdAt)]
);

// ─── User Invitations ─────────────────────────────────────────────────────────
// Phase 37: Admin-initiated invitations. Invitees set their own password.
// Replaces insecure manual credential sharing.

export const userInvitations = pgTable(
  "user_invitations",
  {
    id:           uuid("id").primaryKey().defaultRandom(),
    enterpriseId: text("enterprise_id"),
    email:        text("email").notNull(),
    role:         text("role").notNull(), // architect | reviewer | compliance_officer | admin | viewer
    invitedBy:    uuid("invited_by").notNull().references(() => users.id),
    tokenHash:    text("token_hash").notNull(),
    expiresAt:    timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt:   timestamp("accepted_at", { withTimezone: true }),
    createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_ui_enterprise_id").on(t.enterpriseId),
    index("idx_ui_token_hash").on(t.tokenHash),
  ]
);

// ─── Agent Telemetry ──────────────────────────────────────────────────────────
// H1-1.1: Production Observability Pipeline.
// Time-series metrics pushed by deployed agents (source="push") or pulled from
// ─── Alert Thresholds (H1-1.5) ────────────────────────────────────────────────
// Per-agent threshold rules for production health alerts. When a threshold is
// breached during a cron check, a notification + event is fired.

export const alertThresholds = pgTable(
  "alert_thresholds",
  {
    id:            uuid("id").primaryKey().defaultRandom(),
    agentId:       uuid("agent_id").notNull(),
    enterpriseId:  text("enterprise_id"),
    // metric: "error_rate" | "latency_p99" | "zero_invocations" | "policy_violations"
    metric:        text("metric").notNull(),
    // operator: "gt" | "lt" | "eq"
    operator:      text("operator").notNull(),
    value:         real("value").notNull(),
    windowMinutes: integer("window_minutes").notNull().default(60),
    enabled:       boolean("enabled").notNull().default(true),
    createdBy:     text("created_by").notNull(),
    createdAt:     timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt:     timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_alert_thresholds_agent").on(t.agentId),
    index("idx_alert_thresholds_enterprise").on(t.enterpriseId),
  ]
);

// CloudWatch (source="cloudwatch"). Indexed for time-range queries per agent.
// Append-only — never UPDATE or DELETE rows from this table.

export const agentTelemetry = pgTable(
  "agent_telemetry",
  {
    id:               uuid("id").primaryKey().defaultRandom(),
    agentId:          uuid("agent_id").notNull(),  // FK → agentBlueprints.agentId (logical agent)
    enterpriseId:     text("enterprise_id"),
    timestamp:        timestamp("timestamp", { withTimezone: true }).notNull(),
    invocations:      integer("invocations").notNull().default(0),
    errors:           integer("errors").notNull().default(0),
    latencyP50Ms:     integer("latency_p50_ms"),
    latencyP99Ms:     integer("latency_p99_ms"),
    tokensIn:         integer("tokens_in").notNull().default(0),
    tokensOut:        integer("tokens_out").notNull().default(0),
    policyViolations: integer("policy_violations").notNull().default(0),
    customMetrics:    jsonb("custom_metrics"),  // arbitrary key→number pairs
    source:           text("source").notNull().default("push"), // "push" | "cloudwatch"
    createdAt:        timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_telemetry_agent_time").on(t.agentId, t.timestamp),
    index("idx_telemetry_enterprise").on(t.enterpriseId),
  ]
);

// ─── Runtime Violations (H2-1.2) ─────────────────────────────────────────────
// Written by `evaluateRuntimePolicies()` when deployed agents breach runtime
// policy thresholds. Append-only — never UPDATE or DELETE rows.
// CASCADE on policyId: deleting a policy removes its historical violations.

export const runtimeViolations = pgTable(
  "runtime_violations",
  {
    id:                  uuid("id").primaryKey().defaultRandom(),
    agentId:             uuid("agent_id").notNull(),
    enterpriseId:        text("enterprise_id"),
    policyId:            uuid("policy_id").notNull().references(() => governancePolicies.id, { onDelete: "cascade" }),
    policyName:          text("policy_name").notNull(),
    ruleId:              text("rule_id").notNull(),
    severity:            text("severity").notNull(),            // "error" | "warning"
    metric:              text("metric").notNull(),              // e.g. "tokens_daily", "error_rate"
    observedValue:       real("observed_value").notNull(),
    threshold:           real("threshold").notNull(),
    message:             text("message").notNull(),
    telemetryTimestamp:  timestamp("telemetry_timestamp", { withTimezone: true }).notNull(),
    detectedAt:          timestamp("detected_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_runtime_violations_agent").on(t.agentId, t.detectedAt),
    index("idx_runtime_violations_policy").on(t.policyId),
    index("idx_runtime_violations_enterprise").on(t.enterpriseId, t.detectedAt),
  ]
);

// ─── Quality Trends (H2-2.2) ──────────────────────────────────────────────────
// Weekly quality snapshots per agent — one row per (agentId, weekStart).
// Written by the /api/cron/quality-trends job every Sunday at 00:00 UTC.

export const qualityTrends = pgTable(
  "quality_trends",
  {
    id:                   uuid("id").primaryKey().defaultRandom(),
    agentId:              uuid("agent_id").notNull(),
    enterpriseId:         text("enterprise_id"),
    weekStart:            date("week_start").notNull(),    // ISO date of Monday for this week
    designScore:          real("design_score"),            // overall quality score 0-100 (null if never evaluated)
    productionScore:      real("production_score"),        // production composite 0-100 (null if not deployed)
    policyAdherenceRate:  real("policy_adherence_rate"),  // 0-1, null if not deployed
    createdAt:            timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("idx_quality_trends_agent_week").on(t.agentId, t.weekStart),
    index("idx_quality_trends_enterprise").on(t.enterpriseId, t.weekStart),
  ]
);

// ─── Portfolio Snapshots (H2-5.1) ────────────────────────────────────────────
// Weekly fleet-level metrics per enterprise — written by the portfolio-snapshot
// cron and read by the trends API and executive dashboard.

export const portfolioSnapshots = pgTable(
  "portfolio_snapshots",
  {
    id:               uuid("id").primaryKey().defaultRandom(),
    enterpriseId:     text("enterprise_id"),
    weekStart:        date("week_start").notNull(),         // ISO date of Monday for this week
    totalAgents:      integer("total_agents").notNull().default(0),
    deployedAgents:   integer("deployed_agents").notNull().default(0),
    complianceRate:   real("compliance_rate"),              // 0-100, null if no prod agents
    avgQualityScore:  real("avg_quality_score"),            // 0-100, null if no quality scores
    totalViolations:  integer("total_violations").notNull().default(0),
    violationsByType: jsonb("violations_by_type"),          // { error: N, warning: N }
    agentsByRiskTier: jsonb("agents_by_risk_tier"),         // { low: N, medium: N, high: N, critical: N }
    createdAt:        timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_portfolio_snapshots_enterprise_week").on(t.enterpriseId, t.weekStart),
    index("idx_portfolio_snapshots_week").on(t.weekStart),
  ]
);

// ─── Workflows (H2-4.1) ───────────────────────────────────────────────────────
// An orchestration artifact that composes multiple AI agents into a pipeline.
// Multiple versions of the same logical workflow share the same workflowId.
// The definition column is validated against WorkflowSchema at write time.

export const workflows = pgTable(
  "workflows",
  {
    id:           uuid("id").primaryKey().defaultRandom(),
    /** Logical workflow identifier — shared across all versions of this workflow. */
    workflowId:   uuid("workflow_id").notNull().defaultRandom(),
    version:      text("version").notNull().default("1.0.0"),
    name:         text("name").notNull(),
    description:  text("description").notNull().default(""),
    /** Serialised WorkflowDefinition — validated against WorkflowSchema. */
    definition:   jsonb("definition").notNull().default({}),
    /** draft | in_review | approved | rejected | deprecated */
    status:       text("status").notNull().default("draft"),
    enterpriseId: text("enterprise_id"),
    createdBy:    text("created_by").notNull(),             // user email
    createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt:    timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_workflows_workflow_id").on(t.workflowId, t.createdAt),
    index("idx_workflows_enterprise").on(t.enterpriseId, t.status),
    index("idx_workflows_status").on(t.status),
  ]
);

// ─── Templates (H3-4.1 Template Marketplace) ─────────────────────────────────

export const templates = pgTable(
  "templates",
  {
    id:           uuid("id").primaryKey().defaultRandom(),
    enterpriseId: text("enterprise_id"),
    name:         text("name").notNull(),
    description:  text("description"),
    category:     text("category"),
    riskTier:     text("risk_tier"),
    abpTemplate:  jsonb("abp_template").notNull(),
    tags:         jsonb("tags").notNull().default([]),
    // H3-4.1 marketplace metadata
    source:       text("source").notNull().default("built-in"), // 'built-in' | 'community'
    rating:       real("rating"),
    usageCount:   integer("usage_count").notNull().default(0),
    author:       text("author"),
    publishedAt:  timestamp("published_at", { withTimezone: true }),
    createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt:    timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_templates_enterprise").on(table.enterpriseId),
    index("idx_templates_source").on(table.source),
  ]
);

export const templateRatings = pgTable(
  "template_ratings",
  {
    id:         uuid("id").primaryKey().defaultRandom(),
    templateId: uuid("template_id").notNull(),
    userEmail:  text("user_email").notNull(),
    rating:     integer("rating").notNull(),
    createdAt:  timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_template_ratings_template").on(table.templateId),
  ]
);

// ─── API Keys (H3-4.3 API-First + SDK) ───────────────────────────────────────

export const apiKeys = pgTable(
  "api_keys",
  {
    id:           uuid("id").primaryKey().defaultRandom(),
    enterpriseId: text("enterprise_id"),
    name:         text("name").notNull(),
    keyHash:      text("key_hash").notNull(),      // bcrypt hash of the actual key
    keyPrefix:    text("key_prefix").notNull(),    // first 12 chars for display (e.g. "ik_live_xxxx")
    scopes:       jsonb("scopes").notNull().default([]), // ["blueprints:read", "policies:read", etc.]
    createdBy:    text("created_by").notNull(),
    createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastUsedAt:   timestamp("last_used_at", { withTimezone: true }),
    revokedAt:    timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_api_keys_enterprise").on(table.enterpriseId),
    index("idx_api_keys_prefix").on(table.keyPrefix),
  ]
);

// ─── Workflow Executions (Phase 3 — Execution Engine) ────────────────────────
// Tracks each run of a workflow orchestration.

export const workflowExecutions = pgTable(
  "workflow_executions",
  {
    id:            uuid("id").primaryKey().defaultRandom(),
    workflowId:    uuid("workflow_id").notNull(),
    /** Reference to the specific workflow record (version) used */
    workflowRecordId: uuid("workflow_record_id").notNull(),
    /** running | completed | failed | cancelled | paused (human-in-the-loop) */
    status:        text("status").notNull().default("running"),
    /** Shared context state — accumulated across steps */
    context:       jsonb("context").notNull().default({}),
    /** Initial input provided to start the orchestration */
    input:         jsonb("input").notNull().default({}),
    /** Final output after completion */
    output:        jsonb("output"),
    /** Error details if status=failed */
    error:         jsonb("error"),
    /** Total token usage across all agent invocations */
    totalTokens:   integer("total_tokens").notNull().default(0),
    /** Total cost in USD across all agent invocations */
    totalCostUsd:  real("total_cost_usd").notNull().default(0),
    /** Number of steps executed */
    stepCount:     integer("step_count").notNull().default(0),
    enterpriseId:  text("enterprise_id"),
    triggeredBy:   text("triggered_by").notNull(),     // user email or "api"
    startedAt:     timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt:   timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    index("idx_wf_exec_workflow").on(t.workflowId, t.startedAt),
    index("idx_wf_exec_enterprise").on(t.enterpriseId, t.status),
    index("idx_wf_exec_status").on(t.status),
  ]
);

// ─── Workflow Execution Steps ────────────────────────────────────────────────
// Individual agent invocations within a workflow execution.

export const workflowExecutionSteps = pgTable(
  "workflow_execution_steps",
  {
    id:            uuid("id").primaryKey().defaultRandom(),
    executionId:   uuid("execution_id").notNull(),
    /** Step sequence number within the execution */
    stepNumber:    integer("step_number").notNull(),
    /** Agent ID that was invoked at this step */
    agentId:       text("agent_id").notNull(),
    /** Role of the agent as defined in the workflow definition */
    agentRole:     text("agent_role").notNull(),
    /** running | completed | failed | skipped */
    status:        text("status").notNull().default("running"),
    /** Input provided to this agent */
    input:         jsonb("input").notNull().default({}),
    /** Output produced by this agent */
    output:        jsonb("output"),
    /** Error details if step failed */
    error:         jsonb("error"),
    /** Handoff rule that triggered this step */
    handoffRule:   jsonb("handoff_rule"),
    /** Token usage for this agent invocation */
    inputTokens:   integer("input_tokens").notNull().default(0),
    outputTokens:  integer("output_tokens").notNull().default(0),
    /** Cost in USD for this invocation */
    costUsd:       real("cost_usd").notNull().default(0),
    /** Duration in milliseconds */
    durationMs:    integer("duration_ms"),
    startedAt:     timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt:   timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    index("idx_wf_exec_steps_execution").on(t.executionId, t.stepNumber),
    index("idx_wf_exec_steps_agent").on(t.agentId),
  ]
);

// ─── Workflow Templates (Phase 3 — Template Marketplace) ─────────────────────
// Saved workflow patterns that can be instantiated as new workflows.

export const workflowTemplates = pgTable(
  "workflow_templates",
  {
    id:            uuid("id").primaryKey().defaultRandom(),
    name:          text("name").notNull(),
    description:   text("description").notNull().default(""),
    category:      text("category").notNull(),
    pattern:       text("pattern").notNull(),
    tags:          jsonb("tags").notNull().default([]),
    /** WorkflowDefinition skeleton with placeholder agent IDs */
    definition:    jsonb("definition").notNull(),
    /** Number of agents in the template */
    agentCount:    integer("agent_count").notNull().default(0),
    enterpriseId:  text("enterprise_id"),
    /** built-in | community | enterprise */
    source:        text("source").notNull().default("built-in"),
    usageCount:    integer("usage_count").notNull().default(0),
    createdBy:     text("created_by"),
    createdAt:     timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt:     timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_wf_templates_category").on(t.category),
    index("idx_wf_templates_enterprise").on(t.enterpriseId),
  ]
);

// ─── Cron runs ───────────────────────────────────────────────────────────────
// ADR-024 / H5: per-run + per-failure tracking for the cron batch runner.

export const cronRuns = pgTable(
  "cron_runs",
  {
    id:              uuid("id").primaryKey().defaultRandom(),
    jobName:         text("job_name").notNull(),
    startedAt:       timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt:      timestamp("finished_at", { withTimezone: true }),
    totalItems:      integer("total_items").notNull().default(0),
    succeeded:       integer("succeeded").notNull().default(0),
    failed:          integer("failed").notNull().default(0),
    skipped:         integer("skipped").notNull().default(0),
    budgetExhausted: boolean("budget_exhausted").notNull().default(false),
    errorSummary:    jsonb("error_summary"),
  },
  (t) => [
    index("cron_runs_job_name_started_at_idx").on(t.jobName, t.startedAt),
  ]
);

export const cronItemFailures = pgTable(
  "cron_item_failures",
  {
    id:           uuid("id").primaryKey().defaultRandom(),
    runId:        uuid("run_id").notNull().references(() => cronRuns.id, { onDelete: "cascade" }),
    jobName:      text("job_name").notNull(),
    itemId:       text("item_id").notNull(),
    errorMessage: text("error_message").notNull(),
    errorStack:   text("error_stack"),
    failedAt:     timestamp("failed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("cron_item_failures_job_item_failed_at_idx")
      .on(t.jobName, t.itemId, t.failedAt),
    index("cron_item_failures_run_id_idx").on(t.runId),
  ]
);
