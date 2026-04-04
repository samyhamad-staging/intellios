-- H3-3.1 Governance Drift Detection
-- Adds drift tracking columns to agent_blueprints:
--   baseline_validation_report: snapshot of validationReport taken at approval time
--   governance_drift: {status, newViolations, checkedAt} — updated by drift cron

ALTER TABLE agent_blueprints
  ADD COLUMN IF NOT EXISTS baseline_validation_report JSONB,
  ADD COLUMN IF NOT EXISTS governance_drift JSONB;
