-- Phase 43: Stakeholder Collaboration Workspace
-- Per-domain invitations sent to external stakeholders.
-- Token-based access: no Intellios account required.

CREATE TABLE IF NOT EXISTS intake_invitations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES intake_sessions(id) ON DELETE CASCADE,
  domain          TEXT NOT NULL,
  invitee_email   TEXT NOT NULL,
  invitee_name    TEXT,
  role_title      TEXT,
  raci_role       TEXT NOT NULL DEFAULT 'consulted',
  token           TEXT NOT NULL UNIQUE,
  status          TEXT NOT NULL DEFAULT 'pending',
  expires_at      TIMESTAMP WITH TIME ZONE NOT NULL,
  contribution_id UUID REFERENCES intake_contributions(id),
  sent_at         TIMESTAMP WITH TIME ZONE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_intake_invitations_token   ON intake_invitations(token);
CREATE INDEX        IF NOT EXISTS idx_intake_invitations_session ON intake_invitations(session_id);
