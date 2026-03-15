-- Phase 19: Deployment Health & Governance Drift Detection
-- One row per logical agent (keyed on agent_id); upserted on every health check.
-- Tracks whether a deployed agent is still compliant with the current enterprise
-- policy set, enabling detection of governance drift after policy updates.

CREATE TABLE IF NOT EXISTS deployment_health (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id          UUID        NOT NULL UNIQUE,
  blueprint_id      UUID        NOT NULL,
  enterprise_id     TEXT,
  health_status     TEXT        NOT NULL DEFAULT 'unknown',  -- clean | critical | unknown
  error_count       INTEGER     NOT NULL DEFAULT 0,
  warning_count     INTEGER     NOT NULL DEFAULT 0,
  validation_report JSONB,
  last_checked_at   TIMESTAMPTZ DEFAULT NOW(),
  deployed_at       TIMESTAMPTZ NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deployment_health_enterprise
  ON deployment_health (enterprise_id);
