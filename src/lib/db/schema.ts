import { pgTable, uuid, text, jsonb, timestamp, boolean, index } from "drizzle-orm/pg-core";

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

// ─── Governance Policies ─────────────────────────────────────────────────────

export const governancePolicies = pgTable("governance_policies", {
  id: uuid("id").primaryKey().defaultRandom(),
  enterpriseId: text("enterprise_id"),
  name: text("name").notNull(),
  type: text("type").notNull(), // safety | compliance | data_handling | access_control | audit
  description: text("description"),
  rules: jsonb("rules").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
