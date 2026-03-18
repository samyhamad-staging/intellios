-- Phase 49: Intake Confidence Engine
-- Adds expertise_level to intake_sessions for adaptive conversation mode.
-- Detected from early user messages (after turn 2); null until set.
-- Values: "guided" | "adaptive" | "expert"

ALTER TABLE intake_sessions
  ADD COLUMN IF NOT EXISTS expertise_level TEXT;
