-- Migration 0039: Cron run + per-item failure tracking (ADR-024 / H5)
--
-- Backs the cron batch runner (src/lib/cron/batch-runner.ts) with durable
-- per-run and per-failure state so cron partial completion is observable
-- and next-run priority reordering has something to read.
--
-- cron_runs:          one row per cron invocation; updated at start + finish.
-- cron_item_failures: one row per failed item; inserted inline during the run
--                     so failures survive a mid-run SIGKILL.

CREATE TABLE IF NOT EXISTS cron_runs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name          TEXT NOT NULL,
  started_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at       TIMESTAMPTZ,
  total_items       INTEGER NOT NULL DEFAULT 0,
  succeeded         INTEGER NOT NULL DEFAULT 0,
  failed            INTEGER NOT NULL DEFAULT 0,
  skipped           INTEGER NOT NULL DEFAULT 0,
  budget_exhausted  BOOLEAN NOT NULL DEFAULT FALSE,
  error_summary     JSONB
);

CREATE INDEX IF NOT EXISTS cron_runs_job_name_started_at_idx
  ON cron_runs (job_name, started_at DESC);

CREATE TABLE IF NOT EXISTS cron_item_failures (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id          UUID NOT NULL REFERENCES cron_runs(id) ON DELETE CASCADE,
  job_name        TEXT NOT NULL,
  item_id         TEXT NOT NULL,
  error_message   TEXT NOT NULL,
  error_stack     TEXT,
  failed_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Hot lookup: "did this (job_name, item_id) fail recently?"
CREATE INDEX IF NOT EXISTS cron_item_failures_job_item_failed_at_idx
  ON cron_item_failures (job_name, item_id, failed_at DESC);

-- Run-scoped lookup: "what failed in this run?"
CREATE INDEX IF NOT EXISTS cron_item_failures_run_id_idx
  ON cron_item_failures (run_id);
