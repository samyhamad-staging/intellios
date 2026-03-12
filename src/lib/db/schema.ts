import { pgTable, uuid, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";

export const intakeSessions = pgTable("intake_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  enterpriseId: text("enterprise_id"),
  status: text("status").notNull().default("active"), // active | completed | abandoned
  intakePayload: jsonb("intake_payload").notNull().default({}),
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
    // Core fields
    sessionId: uuid("session_id")
      .notNull()
      .references(() => intakeSessions.id, { onDelete: "cascade" }),
    abp: jsonb("abp").notNull(), // full ABP document (JSON)
    status: text("status").notNull().default("draft"), // draft | in_review | approved | rejected | deprecated
    refinementCount: text("refinement_count").notNull().default("0"), // how many times refined
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_agent_blueprints_session").on(table.sessionId),
    index("idx_agent_blueprints_agent_id").on(table.agentId),
    index("idx_agent_blueprints_status").on(table.status),
  ]
);

export const governancePolicies = pgTable("governance_policies", {
  id: uuid("id").primaryKey().defaultRandom(),
  enterpriseId: text("enterprise_id"),
  name: text("name").notNull(),
  type: text("type").notNull(), // safety | compliance | data_handling | access_control | audit
  description: text("description"),
  rules: jsonb("rules").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
