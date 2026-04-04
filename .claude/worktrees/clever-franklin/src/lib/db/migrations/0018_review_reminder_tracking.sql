-- Phase 37: Periodic review reminder tracking
-- Tracks when the last reminder email was sent for a blueprint's current review cycle.
-- Prevents duplicate reminders within the same cycle.

ALTER TABLE agent_blueprints
  ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMP WITH TIME ZONE;
