-- Migration: Initial schema
-- Creates all base tables for the Intellios MVP

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS "intake_sessions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "enterprise_id" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "intake_payload" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "intake_messages" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "session_id" UUID NOT NULL REFERENCES "intake_sessions"("id") ON DELETE CASCADE,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "tool_name" TEXT,
  "tool_input" JSONB,
  "tool_output" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_intake_messages_session"
  ON "intake_messages" ("session_id", "created_at");

CREATE TABLE IF NOT EXISTS "governance_policies" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "enterprise_id" TEXT,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "description" TEXT,
  "rules" JSONB NOT NULL DEFAULT '[]',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "agent_blueprints" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "agent_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "version" TEXT NOT NULL DEFAULT '1.0.0',
  "name" TEXT,
  "tags" JSONB NOT NULL DEFAULT '[]',
  "session_id" UUID NOT NULL REFERENCES "intake_sessions"("id") ON DELETE CASCADE,
  "abp" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "refinement_count" TEXT NOT NULL DEFAULT '0',
  "validation_report" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_agent_blueprints_session"
  ON "agent_blueprints" ("session_id");

CREATE INDEX IF NOT EXISTS "idx_agent_blueprints_agent_id"
  ON "agent_blueprints" ("agent_id");

CREATE INDEX IF NOT EXISTS "idx_agent_blueprints_status"
  ON "agent_blueprints" ("status");
