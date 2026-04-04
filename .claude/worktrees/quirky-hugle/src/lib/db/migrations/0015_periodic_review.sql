-- Phase 36: SR 11-7 Periodic Review Scheduling
-- Adds next_review_due and last_periodic_review_at columns to agent_blueprints.
-- next_review_due is set when an agent transitions to "deployed" status (based on
-- enterprise periodicReview.defaultCadenceMonths setting).
-- last_periodic_review_at is updated when a periodic review cycle closes.

ALTER TABLE agent_blueprints
  ADD COLUMN IF NOT EXISTS next_review_due TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS last_periodic_review_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_agent_blueprints_next_review
  ON agent_blueprints (next_review_due)
  WHERE next_review_due IS NOT NULL;
