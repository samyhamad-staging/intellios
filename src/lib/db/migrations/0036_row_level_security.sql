-- Row-Level Security (RLS) for Multi-Tenant Isolation
--
-- This migration adds PostgreSQL Row-Level Security policies to all
-- tenant-bearing tables. RLS provides structural enforcement of tenant
-- isolation — even if application code misses a WHERE clause, the
-- database itself prevents cross-tenant data access.
--
-- Design:
--   - Each request sets `app.current_enterprise_id` via SET LOCAL
--   - Rows with enterprise_id matching the session variable are visible
--   - Rows with enterprise_id IS NULL (platform-level) are visible to all
--   - Admin bypass is handled by setting the session variable to '__admin__'
--   - The migration owner role bypasses RLS (FORCE ROW LEVEL SECURITY is NOT set)
--
-- Rollback: DROP POLICY ... ; ALTER TABLE ... DISABLE ROW LEVEL SECURITY;

-- ─── Helper function ────────────────────────────────────────────────────────
-- Returns the current tenant ID set by the application layer.
-- Returns NULL if not set (which means "show nothing" — fail-closed).

CREATE OR REPLACE FUNCTION current_enterprise_id() RETURNS text AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_enterprise_id', true), '');
EXCEPTION
  WHEN OTHERS THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- ─── RLS policies ───────────────────────────────────────────────────────────
-- Pattern: tenant rows visible when enterprise_id matches OR is NULL (platform-level)
-- Admin bypass: when session var = '__admin__', all rows visible.

-- Helper: Returns true if current session is admin (bypasses tenant filter)
CREATE OR REPLACE FUNCTION is_admin_session() RETURNS boolean AS $$
BEGIN
  RETURN current_setting('app.current_enterprise_id', true) = '__admin__';
EXCEPTION
  WHEN OTHERS THEN RETURN false;
END;
$$ LANGUAGE plpgsql STABLE;

-- ── users ───────────────────────────────────────────────────────────────────
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_users ON users
  USING (
    is_admin_session()
    OR enterprise_id IS NULL
    OR enterprise_id = current_enterprise_id()
  );

-- ── intake_sessions ─────────────────────────────────────────────────────────
ALTER TABLE intake_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_intake_sessions ON intake_sessions
  USING (
    is_admin_session()
    OR enterprise_id IS NULL
    OR enterprise_id = current_enterprise_id()
  );

-- ── intake_messages ─────────────────────────────────────────────────────────
ALTER TABLE intake_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_intake_messages ON intake_messages
  USING (
    is_admin_session()
    OR session_id IN (
      SELECT id FROM intake_sessions
      WHERE enterprise_id IS NULL
         OR enterprise_id = current_enterprise_id()
    )
  );

-- ── intake_contributions ────────────────────────────────────────────────────
ALTER TABLE intake_contributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_intake_contributions ON intake_contributions
  USING (
    is_admin_session()
    OR session_id IN (
      SELECT id FROM intake_sessions
      WHERE enterprise_id IS NULL
         OR enterprise_id = current_enterprise_id()
    )
  );

-- ── agent_blueprints ────────────────────────────────────────────────────────
ALTER TABLE agent_blueprints ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_agent_blueprints ON agent_blueprints
  USING (
    is_admin_session()
    OR enterprise_id IS NULL
    OR enterprise_id = current_enterprise_id()
  );

-- ── audit_log ───────────────────────────────────────────────────────────────
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_audit_log ON audit_log
  USING (
    is_admin_session()
    OR enterprise_id IS NULL
    OR enterprise_id = current_enterprise_id()
  );

-- ── notifications ───────────────────────────────────────────────────────────
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_notifications ON notifications
  USING (
    is_admin_session()
    OR enterprise_id IS NULL
    OR enterprise_id = current_enterprise_id()
  );

-- ── deployment_health ───────────────────────────────────────────────────────
ALTER TABLE deployment_health ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_deployment_health ON deployment_health
  USING (
    is_admin_session()
    OR enterprise_id IS NULL
    OR enterprise_id = current_enterprise_id()
  );

-- ── governance_policies ─────────────────────────────────────────────────────
ALTER TABLE governance_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_governance_policies ON governance_policies
  USING (
    is_admin_session()
    OR enterprise_id IS NULL
    OR enterprise_id = current_enterprise_id()
  );

-- ── webhooks ────────────────────────────────────────────────────────────────
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_webhooks ON webhooks
  USING (
    is_admin_session()
    OR enterprise_id IS NULL
    OR enterprise_id = current_enterprise_id()
  );

-- ── webhook_deliveries ──────────────────────────────────────────────────────
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_webhook_deliveries ON webhook_deliveries
  USING (
    is_admin_session()
    OR enterprise_id IS NULL
    OR enterprise_id = current_enterprise_id()
  );

-- ── blueprint_quality_scores ────────────────────────────────────────────────
ALTER TABLE blueprint_quality_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_bqs ON blueprint_quality_scores
  USING (
    is_admin_session()
    OR enterprise_id IS NULL
    OR enterprise_id = current_enterprise_id()
  );

-- ── intake_quality_scores ───────────────────────────────────────────────────
ALTER TABLE intake_quality_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_iqs ON intake_quality_scores
  USING (
    is_admin_session()
    OR enterprise_id IS NULL
    OR enterprise_id = current_enterprise_id()
  );

-- ── system_health_snapshots ─────────────────────────────────────────────────
ALTER TABLE system_health_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_shs ON system_health_snapshots
  USING (
    is_admin_session()
    OR enterprise_id IS NULL
    OR enterprise_id = current_enterprise_id()
  );

-- ── intelligence_briefings ──────────────────────────────────────────────────
ALTER TABLE intelligence_briefings ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_ib ON intelligence_briefings
  USING (
    is_admin_session()
    OR enterprise_id IS NULL
    OR enterprise_id = current_enterprise_id()
  );

-- ── blueprint_test_cases ────────────────────────────────────────────────────
ALTER TABLE blueprint_test_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_test_cases ON blueprint_test_cases
  USING (
    is_admin_session()
    OR enterprise_id IS NULL
    OR enterprise_id = current_enterprise_id()
  );

-- ── blueprint_test_runs ─────────────────────────────────────────────────────
ALTER TABLE blueprint_test_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_test_runs ON blueprint_test_runs
  USING (
    is_admin_session()
    OR enterprise_id IS NULL
    OR enterprise_id = current_enterprise_id()
  );

-- ── alert_thresholds ────────────────────────────────────────────────────────
ALTER TABLE alert_thresholds ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_alert_thresholds ON alert_thresholds
  USING (
    is_admin_session()
    OR enterprise_id IS NULL
    OR enterprise_id = current_enterprise_id()
  );

-- ── agent_telemetry ─────────────────────────────────────────────────────────
ALTER TABLE agent_telemetry ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_agent_telemetry ON agent_telemetry
  USING (
    is_admin_session()
    OR enterprise_id IS NULL
    OR enterprise_id = current_enterprise_id()
  );

-- ── runtime_violations ──────────────────────────────────────────────────────
ALTER TABLE runtime_violations ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_runtime_violations ON runtime_violations
  USING (
    is_admin_session()
    OR enterprise_id IS NULL
    OR enterprise_id = current_enterprise_id()
  );

-- ── quality_trends ──────────────────────────────────────────────────────────
ALTER TABLE quality_trends ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_quality_trends ON quality_trends
  USING (
    is_admin_session()
    OR enterprise_id IS NULL
    OR enterprise_id = current_enterprise_id()
  );

-- ── portfolio_snapshots ─────────────────────────────────────────────────────
ALTER TABLE portfolio_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_portfolio_snapshots ON portfolio_snapshots
  USING (
    is_admin_session()
    OR enterprise_id IS NULL
    OR enterprise_id = current_enterprise_id()
  );

-- ── workflows ───────────────────────────────────────────────────────────────
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_workflows ON workflows
  USING (
    is_admin_session()
    OR enterprise_id IS NULL
    OR enterprise_id = current_enterprise_id()
  );

-- ── workflow_templates ──────────────────────────────────────────────────────
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_workflow_templates ON workflow_templates
  USING (
    is_admin_session()
    OR enterprise_id IS NULL
    OR enterprise_id = current_enterprise_id()
  );

-- ── workflow_executions ─────────────────────────────────────────────────────
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_workflow_executions ON workflow_executions
  USING (
    is_admin_session()
    OR enterprise_id IS NULL
    OR enterprise_id = current_enterprise_id()
  );

-- ── api_keys ────────────────────────────────────────────────────────────────
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_api_keys ON api_keys
  USING (
    is_admin_session()
    OR enterprise_id IS NULL
    OR enterprise_id = current_enterprise_id()
  );

-- ── governance_drift_notifications ──────────────────────────────────────────
-- This table may not have enterprise_id directly; check before applying.
-- If it joins through blueprints, skip direct RLS here.
