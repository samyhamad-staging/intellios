-- Migration 0035: Add scoped_agent_ids to governance_policies
-- Enables per-agent policy binding. NULL = applies to all agents in the enterprise.
-- A non-null JSON array of agentId UUIDs limits the policy to those specific agents.

ALTER TABLE governance_policies
  ADD COLUMN IF NOT EXISTS scoped_agent_ids JSONB DEFAULT NULL;
