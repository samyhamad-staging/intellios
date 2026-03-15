-- Phase 37: Password reset tokens
-- Stores time-limited, single-use tokens for password recovery.
-- Tokens are stored as SHA-256 hashes; the raw token is only sent via email.

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL,
  expires_at  TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at     TIMESTAMP WITH TIME ZONE,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_prt_user_id    ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_prt_token_hash ON password_reset_tokens(token_hash);
