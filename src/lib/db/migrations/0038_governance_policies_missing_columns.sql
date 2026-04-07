-- Migration 0038: Ensure governance_policies has all schema-defined columns
--
-- Same pattern as 0037 — the Drizzle schema defines columns that may not
-- exist in production if migrations 0010 and 0035 were not applied.
-- Using IF NOT EXISTS for idempotent application.

-- Policy versioning (originally in migration 0010)
ALTER TABLE governance_policies
  ADD COLUMN IF NOT EXISTS policy_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS previous_version_id UUID,
  ADD COLUMN IF NOT EXISTS superseded_at TIMESTAMPTZ;

-- Per-agent policy scope (originally in migration 0035)
ALTER TABLE governance_policies
  ADD COLUMN IF NOT EXISTS scoped_agent_ids JSONB DEFAULT NULL;
