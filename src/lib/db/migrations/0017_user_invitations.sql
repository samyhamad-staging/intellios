-- Phase 37: User invitation system
-- Admins invite users by email; invitees set their own password.
-- Replaces insecure manual credential sharing.

CREATE TABLE IF NOT EXISTS user_invitations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id TEXT,
  email         TEXT NOT NULL,
  role          TEXT NOT NULL,
  invited_by    UUID NOT NULL REFERENCES users(id),
  token_hash    TEXT NOT NULL,
  expires_at    TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at   TIMESTAMP WITH TIME ZONE,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ui_enterprise_id ON user_invitations(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_ui_token_hash    ON user_invitations(token_hash);
