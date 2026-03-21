-- Migration 0029: Workflow artifact table (H2-4.1)
-- Stores workflow definitions as first-class registry artifacts.

CREATE TABLE IF NOT EXISTS workflows (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id    UUID NOT NULL DEFAULT gen_random_uuid(),
  version        TEXT NOT NULL DEFAULT '1.0.0',
  name           TEXT NOT NULL,
  description    TEXT NOT NULL DEFAULT '',
  definition     JSONB NOT NULL DEFAULT '{}',
  status         TEXT NOT NULL DEFAULT 'draft',
  enterprise_id  TEXT,
  created_by     TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflows_workflow_id  ON workflows (workflow_id, created_at);
CREATE INDEX IF NOT EXISTS idx_workflows_enterprise   ON workflows (enterprise_id, status);
CREATE INDEX IF NOT EXISTS idx_workflows_status       ON workflows (status);
