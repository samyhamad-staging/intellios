-- Migration: Multi-tenancy enforcement
-- Adds enterprise_id to users (source of truth), agent_blueprints (denormalized),
-- and audit_log (for enterprise-scoped queries).

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "enterprise_id" TEXT;

ALTER TABLE "agent_blueprints" ADD COLUMN IF NOT EXISTS "enterprise_id" TEXT;
CREATE INDEX IF NOT EXISTS "idx_agent_blueprints_enterprise"
  ON "agent_blueprints" ("enterprise_id");

ALTER TABLE "audit_log" ADD COLUMN IF NOT EXISTS "enterprise_id" TEXT;
CREATE INDEX IF NOT EXISTS "idx_audit_log_enterprise"
  ON "audit_log" ("enterprise_id");
