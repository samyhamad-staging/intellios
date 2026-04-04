-- Phase 28: Awareness and Measurement System
-- Adds 4 tables to support quality scoring, metrics snapshots, and daily briefings.

-- Blueprint quality scores (AI evaluator, per blueprint version submitted for review)
CREATE TABLE IF NOT EXISTS "blueprint_quality_scores" (
  "id"                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "blueprint_id"           uuid        NOT NULL REFERENCES "agent_blueprints"("id") ON DELETE CASCADE,
  "enterprise_id"          text,
  "overall_score"          numeric(4,2),          -- 0–100 composite score
  "intent_alignment"       numeric(3,2),           -- 1–5: does ABP match intake purpose?
  "tool_appropriateness"   numeric(3,2),           -- 1–5: tools necessary and sufficient?
  "instruction_specificity" numeric(3,2),          -- 1–5: instructions concrete enough?
  "governance_adequacy"    numeric(3,2),           -- 1–5: governance addresses stated risks?
  "ownership_completeness" numeric(3,2),           -- 1–5: ownership block fully populated?
  "flags"                  jsonb        DEFAULT '[]', -- string[] of free-text quality concerns
  "evaluator_model"        text,
  "evaluated_at"           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "bqs_blueprint_idx"    ON "blueprint_quality_scores"("blueprint_id");
CREATE INDEX IF NOT EXISTS "bqs_enterprise_idx"   ON "blueprint_quality_scores"("enterprise_id", "evaluated_at");

-- Intake session quality scores (AI evaluator, per finalized session)
CREATE TABLE IF NOT EXISTS "intake_quality_scores" (
  "id"                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "session_id"        uuid        NOT NULL REFERENCES "intake_sessions"("id") ON DELETE CASCADE,
  "enterprise_id"     text,
  "overall_score"     numeric(4,2),
  "breadth_score"     numeric(3,2),  -- 1–5: governance domain coverage
  "ambiguity_score"   numeric(3,2),  -- 1–5: vague requirements clarified
  "risk_id_score"     numeric(3,2),  -- 1–5: risks identified
  "stakeholder_score" numeric(3,2),  -- 1–5: stakeholder alignment
  "evaluator_model"   text,
  "evaluated_at"      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "iqs_session_idx"    ON "intake_quality_scores"("session_id");
CREATE INDEX IF NOT EXISTS "iqs_enterprise_idx" ON "intake_quality_scores"("enterprise_id", "evaluated_at");

-- System health snapshots (SQL aggregation worker, no AI — periodic writes)
CREATE TABLE IF NOT EXISTS "system_health_snapshots" (
  "id"                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "enterprise_id"           text,
  "snapshot_at"             timestamptz NOT NULL DEFAULT now(),
  "quality_index"           numeric(5,2),           -- 0–100 composite
  "blueprint_validity_rate" numeric(5,4),            -- 0.0000–1.0000 rolling 7d
  "avg_refinements"         numeric(5,2),
  "review_queue_depth"      integer,
  "sla_compliance_rate"     numeric(5,4),
  "webhook_success_rate"    numeric(5,4),
  "active_policy_count"     integer,
  "blueprints_generated_24h" integer,
  "violations_24h"          integer,
  "raw_metrics"             jsonb DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS "shs_enterprise_idx" ON "system_health_snapshots"("enterprise_id", "snapshot_at");

-- Daily intelligence briefings (AI-synthesized narrative, one per enterprise per day)
CREATE TABLE IF NOT EXISTS "intelligence_briefings" (
  "id"               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "enterprise_id"    text,
  "briefing_date"    date        NOT NULL,
  "content"          text        NOT NULL,           -- full structured briefing text
  "health_status"    text        NOT NULL DEFAULT 'nominal', -- nominal | attention | critical
  "generated_at"     timestamptz NOT NULL DEFAULT now(),
  "metrics_snapshot" jsonb       DEFAULT '{}'        -- raw metrics snapshot used for generation
);
CREATE UNIQUE INDEX IF NOT EXISTS "ib_enterprise_date_idx"
  ON "intelligence_briefings"("enterprise_id", "briefing_date") NULLS NOT DISTINCT;
CREATE INDEX IF NOT EXISTS "ib_generated_idx"
  ON "intelligence_briefings"("enterprise_id", "generated_at");
