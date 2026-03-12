-- Migration: Add Agent Registry fields to agent_blueprints
-- Run after: initial schema (tables: intake_sessions, intake_messages, governance_policies, agent_blueprints)

ALTER TABLE "agent_blueprints"
  ADD COLUMN IF NOT EXISTS "agent_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS "version" TEXT NOT NULL DEFAULT '1.0.0',
  ADD COLUMN IF NOT EXISTS "name" TEXT,
  ADD COLUMN IF NOT EXISTS "tags" JSONB NOT NULL DEFAULT '[]';

CREATE INDEX IF NOT EXISTS "idx_agent_blueprints_agent_id" ON "agent_blueprints" ("agent_id");
CREATE INDEX IF NOT EXISTS "idx_agent_blueprints_status" ON "agent_blueprints" ("status");
