-- H1-1.1: Production Observability Pipeline — Agent Telemetry Table
-- Append-only time-series metrics pushed by deployed agents (source="push")
-- or pulled from CloudWatch (source="cloudwatch").

CREATE TABLE "agent_telemetry" (
  "id"                uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "agent_id"          uuid NOT NULL,
  "enterprise_id"     text,
  "timestamp"         timestamp with time zone NOT NULL,
  "invocations"       integer DEFAULT 0 NOT NULL,
  "errors"            integer DEFAULT 0 NOT NULL,
  "latency_p50_ms"    integer,
  "latency_p99_ms"    integer,
  "tokens_in"         integer DEFAULT 0 NOT NULL,
  "tokens_out"        integer DEFAULT 0 NOT NULL,
  "policy_violations" integer DEFAULT 0 NOT NULL,
  "custom_metrics"    jsonb,
  "source"            text DEFAULT 'push' NOT NULL,
  "created_at"        timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX "idx_telemetry_agent_time" ON "agent_telemetry" USING btree ("agent_id", "timestamp");
CREATE INDEX "idx_telemetry_enterprise"  ON "agent_telemetry" USING btree ("enterprise_id");
