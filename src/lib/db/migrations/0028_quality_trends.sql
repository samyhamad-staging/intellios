-- H2-2.2: Quality Trends — weekly quality snapshots per agent.
-- One row per (agent_id, week_start). Upserted by the quality-trends cron job.

CREATE TABLE IF NOT EXISTS quality_trends (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id              UUID          NOT NULL,
  enterprise_id         TEXT,
  week_start            DATE          NOT NULL,
  design_score          REAL,
  production_score      REAL,
  policy_adherence_rate REAL,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (agent_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_quality_trends_enterprise ON quality_trends(enterprise_id, week_start);
