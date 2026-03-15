-- Phase 26: AgentCore Direct Deployment
-- Adds deployment tracking columns to agent_blueprints.
-- deployment_target: which platform the agent was deployed to (e.g. "agentcore")
-- deployment_metadata: target-specific deployment record (AgentCoreDeploymentRecord JSON)
-- Both columns are nullable — null means no direct platform deployment has been made.

ALTER TABLE agent_blueprints
  ADD COLUMN IF NOT EXISTS deployment_target TEXT,
  ADD COLUMN IF NOT EXISTS deployment_metadata JSONB;
