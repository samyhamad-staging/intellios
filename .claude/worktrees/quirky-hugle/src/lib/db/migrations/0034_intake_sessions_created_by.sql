-- Migration 0025: Add created_by to intake_sessions
-- This column was present in the Drizzle schema but never added via migration.
-- Required for the POST /api/intake/sessions handler to succeed.

ALTER TABLE intake_sessions
  ADD COLUMN IF NOT EXISTS created_by TEXT;
