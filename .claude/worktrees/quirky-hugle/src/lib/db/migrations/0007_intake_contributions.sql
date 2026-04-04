-- Migration: 0007_intake_contributions
-- Purpose: Stakeholder Requirement Lanes (Phase 7)
-- Creates intake_contributions table for direct, attributed stakeholder input
-- into the intake record. Contributions are linked to an intake session and
-- carry a domain (compliance, risk, legal, security, it, operations, business)
-- and JSONB fields with domain-specific free-text requirements.

CREATE TABLE IF NOT EXISTS "intake_contributions" (
  "id"                uuid        PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "session_id"        uuid        NOT NULL REFERENCES "intake_sessions"("id") ON DELETE CASCADE,
  "enterprise_id"     text,
  "contributor_email" text        NOT NULL,
  "contributor_role"  text        NOT NULL,
  "domain"            text        NOT NULL,
  "fields"            jsonb       NOT NULL,
  "created_at"        timestamp   DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_contributions_session"
  ON "intake_contributions"("session_id");
