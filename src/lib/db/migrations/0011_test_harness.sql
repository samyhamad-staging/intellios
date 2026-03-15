-- Phase 23: Blueprint Test Harness
-- Two new tables: blueprint_test_cases (per logical agent) and blueprint_test_runs (per blueprint version)

-- Test cases (per logical agent, shared across blueprint versions)
-- Test cases are attached to agentId so the same suite can be re-run
-- whenever the blueprint is refined or a new version is submitted.
CREATE TABLE IF NOT EXISTS blueprint_test_cases (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id          UUID NOT NULL,
  enterprise_id     TEXT,
  name              TEXT NOT NULL,
  description       TEXT,
  input_prompt      TEXT NOT NULL,       -- what to send to the agent under test
  expected_behavior TEXT NOT NULL,       -- natural-language description of expected output
  severity          TEXT NOT NULL DEFAULT 'required', -- required | informational
  created_by        TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_test_cases_agent      ON blueprint_test_cases (agent_id);
CREATE INDEX IF NOT EXISTS idx_test_cases_enterprise ON blueprint_test_cases (enterprise_id);

-- Test runs (per blueprint version, append-only evidence)
-- Each execution run is permanently recorded. Multiple runs per blueprint version allowed.
CREATE TABLE IF NOT EXISTS blueprint_test_runs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_id  UUID NOT NULL REFERENCES agent_blueprints(id),
  agent_id      UUID NOT NULL,
  enterprise_id TEXT,
  status        TEXT NOT NULL DEFAULT 'running', -- running | passed | failed | error
  test_results  JSONB NOT NULL DEFAULT '[]',     -- TestCaseResult[]
  total_cases   INTEGER NOT NULL DEFAULT 0,
  passed_cases  INTEGER NOT NULL DEFAULT 0,
  failed_cases  INTEGER NOT NULL DEFAULT 0,
  run_by        TEXT NOT NULL,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_test_runs_blueprint ON blueprint_test_runs (blueprint_id);
CREATE INDEX IF NOT EXISTS idx_test_runs_agent     ON blueprint_test_runs (agent_id);
