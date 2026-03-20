-- H2-1.2: Runtime violation log for production policy enforcement
-- Written by evaluateRuntimePolicies() when deployed agents breach runtime
-- policy thresholds. Append-only — never UPDATE or DELETE rows except via CASCADE.

CREATE TABLE IF NOT EXISTS runtime_violations (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id             UUID NOT NULL,
  enterprise_id        TEXT,
  policy_id            UUID NOT NULL REFERENCES governance_policies(id) ON DELETE CASCADE,
  policy_name          TEXT NOT NULL,
  rule_id              TEXT NOT NULL,
  severity             TEXT NOT NULL,              -- 'error' | 'warning'
  metric               TEXT NOT NULL,              -- e.g. 'tokens_daily', 'error_rate'
  observed_value       REAL NOT NULL,
  threshold            REAL NOT NULL,
  message              TEXT NOT NULL,
  telemetry_timestamp  TIMESTAMPTZ NOT NULL,        -- the telemetry window used for evaluation
  detected_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_runtime_violations_agent      ON runtime_violations(agent_id, detected_at);
CREATE INDEX IF NOT EXISTS idx_runtime_violations_policy     ON runtime_violations(policy_id);
CREATE INDEX IF NOT EXISTS idx_runtime_violations_enterprise ON runtime_violations(enterprise_id, detected_at);
