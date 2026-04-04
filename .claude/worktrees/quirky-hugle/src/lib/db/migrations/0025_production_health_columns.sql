-- H1-1.4: Production telemetry columns on deployment_health
-- Stores latest production metrics alongside governance health status.
-- All columns nullable — absent until telemetry data arrives for the agent.

ALTER TABLE deployment_health
  ADD COLUMN IF NOT EXISTS production_error_rate   REAL,
  ADD COLUMN IF NOT EXISTS production_latency_p99  INTEGER,
  ADD COLUMN IF NOT EXISTS last_telemetry_at       TIMESTAMPTZ;
