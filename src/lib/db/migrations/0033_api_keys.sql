-- H3-4.3 API Key Management
CREATE TABLE IF NOT EXISTS api_keys (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id TEXT,
  name          TEXT NOT NULL,
  key_hash      TEXT NOT NULL,       -- bcrypt hash
  key_prefix    TEXT NOT NULL,       -- display prefix e.g. "ik_live_xxxx"
  scopes        JSONB NOT NULL DEFAULT '[]',
  created_by    TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at  TIMESTAMPTZ,
  revoked_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_api_keys_enterprise ON api_keys(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);
