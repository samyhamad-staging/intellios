-- Phase 25: Outbound Webhook Integration
-- Creates webhooks (registered endpoints) and webhook_deliveries (delivery log) tables.

CREATE TABLE IF NOT EXISTS webhooks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id TEXT,
  name          TEXT NOT NULL,
  url           TEXT NOT NULL,
  secret        TEXT NOT NULL,
  events        TEXT[] NOT NULL DEFAULT '{}',
  active        BOOLEAN NOT NULL DEFAULT true,
  created_by    TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_enterprise ON webhooks(enterprise_id);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id         UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  enterprise_id      TEXT,
  event_type         TEXT NOT NULL,
  payload            JSONB NOT NULL,
  status             TEXT NOT NULL DEFAULT 'pending',
  response_status    INTEGER,
  response_body      TEXT,
  attempts           INTEGER NOT NULL DEFAULT 0,
  last_attempted_at  TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deliveries_webhook ON webhook_deliveries(webhook_id, created_at DESC);
