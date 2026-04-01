-- H2-5.1 Portfolio Snapshots
-- Weekly fleet-level metrics per enterprise — written by the portfolio-snapshot
-- cron job. Used by the trends API and executive dashboard.

CREATE TABLE IF NOT EXISTS portfolio_snapshots (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id    TEXT,
  week_start       DATE NOT NULL,
  total_agents     INTEGER NOT NULL DEFAULT 0,
  deployed_agents  INTEGER NOT NULL DEFAULT 0,
  compliance_rate  REAL,           -- 0-100, NULL if no prod agents
  avg_quality_score REAL,          -- 0-100, NULL if no quality scores
  total_violations INTEGER NOT NULL DEFAULT 0,
  violations_by_type JSONB,        -- { "error": N, "warning": N }
  agents_by_risk_tier JSONB,       -- { "low": N, "medium": N, "high": N, "critical": N }
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_enterprise_week
  ON portfolio_snapshots (enterprise_id, week_start);

CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_week
  ON portfolio_snapshots (week_start);
