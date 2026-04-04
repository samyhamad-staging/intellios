-- Migration 0005: Notifications table
-- Supports the in-app event-driven notification system.
-- Records are written by lifecycle event handlers; never updated except to
-- flip read = true.

CREATE TABLE IF NOT EXISTS "notifications" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "recipient_email" TEXT NOT NULL,
  "enterprise_id"   TEXT,
  "type"            TEXT NOT NULL,
  "title"           TEXT NOT NULL,
  "message"         TEXT NOT NULL,
  "entity_type"     TEXT NOT NULL,
  "entity_id"       TEXT NOT NULL,
  "link"            TEXT,
  "read"            BOOLEAN NOT NULL DEFAULT false,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_notifications_recipient"
  ON "notifications" ("recipient_email", "read", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_notifications_enterprise"
  ON "notifications" ("enterprise_id", "created_at" DESC);
