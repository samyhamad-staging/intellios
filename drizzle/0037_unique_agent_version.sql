-- P3-CONSTRAINT-001: Prevent duplicate (agentId, version) pairs in agent_blueprints.
-- This ensures that each version string is unique per logical agent, preventing
-- data corruption from concurrent version creation.
--
-- Note: If duplicates already exist, they must be resolved before this migration
-- can be applied. Run the following to identify duplicates:
--   SELECT agent_id, version, COUNT(*) FROM agent_blueprints GROUP BY agent_id, version HAVING COUNT(*) > 1;

ALTER TABLE agent_blueprints
  ADD CONSTRAINT uq_agent_blueprints_agent_version UNIQUE (agent_id, version);
