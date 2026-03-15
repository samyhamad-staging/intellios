import { pgTable, uuid, text, jsonb, timestamp, boolean, integer, index, numeric, date } from "drizzle-orm/pg-core";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

// ─── Users ───────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull(), // designer | reviewer | compliance_officer | admin
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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_agent_blueprints_session").on(table.sessionId),
    index("idx_agent_blueprints_agent_id").on(table.agentId),
    index("idx_agent_blueprints_status").on(table.status),
    index("idx_agent_blueprints_enterprise").on(table.enterpriseId),
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
    healthStatus:     text("health_status").notNull().default("unknown"), // clean | critical | unknown
    errorCount:       integer("error_count").notNull().default(0),
    warningCount:     integer("warning_count").notNull().default(0),
    validationReport: jsonb("validation_report"),
    lastCheckedAt:    timestamp("last_checked_at", { withTimezone: true }).defaultNow(),
    deployedAt:       timestamp("deployed_at", { withTimezone: true }).notNull(),
    createdAt:        timestamp("created_at", { withTimezone: true }).defaultNow(),
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
