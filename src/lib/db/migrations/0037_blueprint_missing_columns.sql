-- Migration 0037: Add missing columns to agent_blueprints
--
-- The Drizzle schema defines these columns but no prior migration creates them.
-- This causes "column does not exist" errors when Drizzle generates SELECT *
-- or findFirst() queries that reference all schema columns.
--
-- Using IF NOT EXISTS to be safe if the columns were added manually or via
-- drizzle-kit push on some environments.

-- Columns referenced by review/approval workflows
ALTER TABLE agent_blueprints
  ADD COLUMN IF NOT EXISTS reviewed_by TEXT,
  ADD COLUMN IF NOT EXISTS created_by TEXT;

-- Columns referenced by deployment tracking (Phase 26)
ALTER TABLE agent_blueprints
  ADD COLUMN IF NOT EXISTS deployment_target TEXT,
  ADD COLUMN IF NOT EXISTS deployment_metadata JSONB;

-- Columns referenced by SR 11-7 periodic review (Phase 36-37)
ALTER TABLE agent_blueprints
  ADD COLUMN IF NOT EXISTS next_review_due TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_periodic_review_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMPTZ;

-- Columns referenced by blueprint lineage (Phase 52)
ALTER TABLE agent_blueprints
  ADD COLUMN IF NOT EXISTS previous_blueprint_id UUID,
  ADD COLUMN IF NOT EXISTS governance_diff JSONB;

-- Columns referenced by governance drift detection (H3-3.1)
ALTER TABLE agent_blueprints
  ADD COLUMN IF NOT EXISTS baseline_validation_report JSONB,
  ADD COLUMN IF NOT EXISTS governance_drift JSONB;

-- Enterprise ID on agent_blueprints (migration 0004 may not have run)
ALTER TABLE agent_blueprints
  ADD COLUMN IF NOT EXISTS enterprise_id TEXT;

-- Approval columns (migration 0010 may not have run)
ALTER TABLE agent_blueprints
  ADD COLUMN IF NOT EXISTS current_approval_step INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS approval_progress JSONB NOT NULL DEFAULT '[]';
