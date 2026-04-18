-- Migration 0040: Webhook retry state + DLQ terminus (ADR-026 / H4)
--
-- Backs the scheduled retry model for outbound webhooks. ADR-009's
-- 3-attempts-in-3-seconds loop gives way to one inline attempt plus up to
-- six scheduled retries driven by /api/cron/webhook-retries (every minute).
--
--   next_attempt_at: when the retry cron should pick this delivery up.
--                    nullable because terminal rows (success/failed/dlq)
--                    don't need a retry time.
--   max_attempts:    per-row retry budget, default 7 (1 inline + 6 scheduled).
--                    kept per-row so ops can raise it for known-flaky
--                    subscribers without a schema change.
--   error_class:     network | timeout | http_5xx | http_4xx | webhook_inactive.
--                    drives retryability decision and admin triage.
--
-- Partial index keeps the cron's scan tight: terminal rows never appear.

ALTER TABLE webhook_deliveries
  ADD COLUMN IF NOT EXISTS next_attempt_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS max_attempts     INTEGER NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS error_class      TEXT;

CREATE INDEX IF NOT EXISTS idx_deliveries_pending_next_attempt
  ON webhook_deliveries (status, next_attempt_at)
  WHERE status = 'pending';
