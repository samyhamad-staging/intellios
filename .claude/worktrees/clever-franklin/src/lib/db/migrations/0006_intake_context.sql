-- Migration 0006: Intake context column
-- Stores structured context captured in Phase 1 (before the AI conversation).
-- Null means the session was created before this feature or Phase 1 is not yet complete.

ALTER TABLE "intake_sessions" ADD COLUMN IF NOT EXISTS "intake_context" JSONB;
