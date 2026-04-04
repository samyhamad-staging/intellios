-- Phase 22: Multi-Step Approval Workflow + Policy Versioning
-- Migration 0010

-- Multi-step approval columns on agent_blueprints
ALTER TABLE agent_blueprints
  ADD COLUMN IF NOT EXISTS current_approval_step INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS approval_progress JSONB NOT NULL DEFAULT '[]';

-- Policy versioning columns on governance_policies
ALTER TABLE governance_policies
  ADD COLUMN IF NOT EXISTS policy_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS previous_version_id UUID REFERENCES governance_policies(id),
  ADD COLUMN IF NOT EXISTS superseded_at TIMESTAMPTZ;
