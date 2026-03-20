-- H1-1.5: Alert threshold rules for production health monitoring
CREATE TABLE IF NOT EXISTS alert_thresholds (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id        UUID NOT NULL,
  enterprise_id   TEXT,
  metric          TEXT NOT NULL,     -- "error_rate" | "latency_p99" | "zero_invocations" | "policy_violations"
  operator        TEXT NOT NULL,     -- "gt" | "lt" | "eq"
  value           REAL NOT NULL,
  window_minutes  INTEGER NOT NULL DEFAULT 60,
  enabled         BOOLEAN NOT NULL DEFAULT TRUE,
  created_by      TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alert_thresholds_agent      ON alert_thresholds(agent_id);
CREATE INDEX IF NOT EXISTS idx_alert_thresholds_enterprise ON alert_thresholds(enterprise_id);
