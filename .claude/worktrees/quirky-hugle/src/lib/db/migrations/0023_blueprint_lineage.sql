-- Phase 52: Blueprint Lineage with Governance Diff
-- Records which blueprint a new version was derived from and stores the
-- governance diff computed at version-creation time.
--
-- previous_blueprint_id: the blueprint this was created from via "Create New Version".
--   null for v1 blueprints (first version of any agent) and cloned blueprints.
-- governance_diff: the full ABPDiff JSON computed at creation time.
--   null when previous_blueprint_id is null (first version has no predecessor to diff against).

ALTER TABLE agent_blueprints
  ADD COLUMN IF NOT EXISTS previous_blueprint_id UUID REFERENCES agent_blueprints(id) ON DELETE SET NULL;

ALTER TABLE agent_blueprints
  ADD COLUMN IF NOT EXISTS governance_diff JSONB;

CREATE INDEX IF NOT EXISTS idx_agent_blueprints_previous ON agent_blueprints(previous_blueprint_id)
  WHERE previous_blueprint_id IS NOT NULL;
