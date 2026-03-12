-- Migration 0003: Blueprint Review UI fields
-- Adds reviewer comment and timestamp to agent_blueprints.

ALTER TABLE agent_blueprints
  ADD COLUMN IF NOT EXISTS review_comment TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
