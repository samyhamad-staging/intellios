-- Migration: Add validation_report to agent_blueprints + seed global governance policies

-- Add validation report column
ALTER TABLE "agent_blueprints"
  ADD COLUMN IF NOT EXISTS "validation_report" JSONB;

-- ─── Seed global governance policies (enterprise_id = NULL → apply to all) ─────

-- Policy 1: Safety baseline — agent must be named and have instructions
INSERT INTO "governance_policies" ("id", "enterprise_id", "name", "type", "description", "rules")
VALUES (
  gen_random_uuid(),
  NULL,
  'Safety Baseline',
  'safety',
  'Ensures every agent has a name and behavioral instructions before it can be reviewed.',
  '[
    {
      "id": "require-name",
      "field": "identity.name",
      "operator": "exists",
      "severity": "error",
      "message": "Agent must have a name. Set identity.name during intake."
    },
    {
      "id": "require-instructions",
      "field": "capabilities.instructions",
      "operator": "exists",
      "severity": "error",
      "message": "Agent must have behavioral instructions. The generation engine should populate capabilities.instructions."
    },
    {
      "id": "require-description",
      "field": "identity.description",
      "operator": "exists",
      "severity": "warning",
      "message": "Agent should have a description explaining its purpose."
    }
  ]'::jsonb
)
ON CONFLICT DO NOTHING;

-- Policy 2: Audit standards — audit logging should be configured
INSERT INTO "governance_policies" ("id", "enterprise_id", "name", "type", "description", "rules")
VALUES (
  gen_random_uuid(),
  NULL,
  'Audit Standards',
  'audit',
  'Recommends audit logging configuration for enterprise accountability.',
  '[
    {
      "id": "recommend-audit-logging",
      "field": "governance.audit.log_interactions",
      "operator": "exists",
      "severity": "warning",
      "message": "Audit logging configuration is recommended. Set governance.audit.log_interactions to enable interaction logging."
    }
  ]'::jsonb
)
ON CONFLICT DO NOTHING;

-- Policy 3: Access control — denied actions should be specified
INSERT INTO "governance_policies" ("id", "enterprise_id", "name", "type", "description", "rules")
VALUES (
  gen_random_uuid(),
  NULL,
  'Access Control Baseline',
  'access_control',
  'Recommends defining denied actions to limit agent scope.',
  '[
    {
      "id": "recommend-denied-actions",
      "field": "constraints.denied_actions",
      "operator": "exists",
      "severity": "warning",
      "message": "Denied actions should be specified to limit agent scope. Add constraints.denied_actions during intake."
    }
  ]'::jsonb
)
ON CONFLICT DO NOTHING;

-- Policy 4: Compliance — agent should have at least one governance policy attached
INSERT INTO "governance_policies" ("id", "enterprise_id", "name", "type", "description", "rules")
VALUES (
  gen_random_uuid(),
  NULL,
  'Governance Coverage',
  'compliance',
  'Ensures agents declare their applicable governance policies.',
  '[
    {
      "id": "require-governance-policies",
      "field": "governance.policies",
      "operator": "count_gte",
      "value": 1,
      "severity": "warning",
      "message": "Agent should declare at least one governance policy in the governance.policies section."
    }
  ]'::jsonb
)
ON CONFLICT DO NOTHING;
