-- Phase 43: Stakeholder Collaboration Workspace
-- AI-generated synthesis, conflict detection, gap analysis, and action suggestions
-- produced by the orchestrator after each stakeholder contribution.

CREATE TABLE IF NOT EXISTS intake_ai_insights (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES intake_sessions(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  metadata   JSONB,
  status     TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_intake_ai_insights_session ON intake_ai_insights(session_id, created_at);
