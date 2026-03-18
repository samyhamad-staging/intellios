-- Phase 38: Classification-First Adaptive Intake
-- Add agentType and riskTier columns to intake_sessions.
-- These are populated async after Phase 1 context form submit via classifyIntake().
-- NULL = not yet classified (e.g., sessions created before this migration).

ALTER TABLE intake_sessions
  ADD COLUMN IF NOT EXISTS agent_type TEXT,
  ADD COLUMN IF NOT EXISTS risk_tier  TEXT;
