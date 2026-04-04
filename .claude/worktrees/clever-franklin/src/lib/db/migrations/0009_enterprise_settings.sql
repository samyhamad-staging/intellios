-- Phase 21: Enterprise Settings
-- One row per enterprise; upserted via the admin settings API.
-- Stores configurable governance thresholds, SLA values, and notification
-- preferences as JSONB. Missing keys fall back to application defaults.

CREATE TABLE IF NOT EXISTS enterprise_settings (
  enterprise_id  TEXT        PRIMARY KEY,
  settings       JSONB       NOT NULL DEFAULT '{}',
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by     TEXT
);
