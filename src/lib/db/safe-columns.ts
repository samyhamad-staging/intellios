/**
 * Safe column selections for Drizzle queries.
 *
 * Problem: The Drizzle schema defines columns that may not yet exist in
 * production (migrations 0037/0038 haven't been applied). When Drizzle's
 * `findFirst()` / `findMany()` generate SELECT *, PostgreSQL throws
 * "column does not exist" errors.
 *
 * Solution: Use explicit `.select(SAFE_BLUEPRINT_COLUMNS)` instead of
 * `db.query.agentBlueprints.findFirst()`.
 *
 * Once migrations 0037 and 0038 are applied to all environments, these
 * helpers can be removed and replaced with `db.query.*.findFirst()` again.
 */

import { agentBlueprints, governancePolicies } from "./schema";

/**
 * Core columns guaranteed to exist on agent_blueprints across all environments.
 * Covers migrations 0000–0010 (original + multi-tenancy + approval workflow).
 */
export const SAFE_BLUEPRINT_COLUMNS = {
  id: agentBlueprints.id,
  agentId: agentBlueprints.agentId,
  version: agentBlueprints.version,
  name: agentBlueprints.name,
  tags: agentBlueprints.tags,
  enterpriseId: agentBlueprints.enterpriseId,
  sessionId: agentBlueprints.sessionId,
  abp: agentBlueprints.abp,
  status: agentBlueprints.status,
  refinementCount: agentBlueprints.refinementCount,
  validationReport: agentBlueprints.validationReport,
  reviewComment: agentBlueprints.reviewComment,
  reviewedAt: agentBlueprints.reviewedAt,
  currentApprovalStep: agentBlueprints.currentApprovalStep,
  approvalProgress: agentBlueprints.approvalProgress,
  createdAt: agentBlueprints.createdAt,
  updatedAt: agentBlueprints.updatedAt,
} as const;

/**
 * Extended columns on agent_blueprints — require migration 0037.
 * Routes that need these columns should use ALL_BLUEPRINT_COLUMNS and
 * accept that they will fail if migration 0037 has not been applied.
 */
export const ALL_BLUEPRINT_COLUMNS = {
  ...SAFE_BLUEPRINT_COLUMNS,
  reviewedBy: agentBlueprints.reviewedBy,
  createdBy: agentBlueprints.createdBy,
  deploymentTarget: agentBlueprints.deploymentTarget,
  deploymentMetadata: agentBlueprints.deploymentMetadata,
  nextReviewDue: agentBlueprints.nextReviewDue,
  lastPeriodicReviewAt: agentBlueprints.lastPeriodicReviewAt,
  lastReminderSentAt: agentBlueprints.lastReminderSentAt,
  previousBlueprintId: agentBlueprints.previousBlueprintId,
  governanceDiff: agentBlueprints.governanceDiff,
  baselineValidationReport: agentBlueprints.baselineValidationReport,
  governanceDrift: agentBlueprints.governanceDrift,
} as const;

/**
 * Core columns guaranteed to exist on governance_policies across all environments.
 * Covers migration 0002 (original governance schema).
 * NOTE: governance_policies has no updatedAt column.
 */
export const SAFE_POLICY_COLUMNS = {
  id: governancePolicies.id,
  enterpriseId: governancePolicies.enterpriseId,
  name: governancePolicies.name,
  type: governancePolicies.type,
  description: governancePolicies.description,
  rules: governancePolicies.rules,
  createdAt: governancePolicies.createdAt,
} as const;

/**
 * Extended columns on governance_policies — require migration 0038.
 * Routes that need these columns should use ALL_POLICY_COLUMNS.
 */
export const ALL_POLICY_COLUMNS = {
  ...SAFE_POLICY_COLUMNS,
  policyVersion: governancePolicies.policyVersion,
  previousVersionId: governancePolicies.previousVersionId,
  supersededAt: governancePolicies.supersededAt,
  scopedAgentIds: governancePolicies.scopedAgentIds,
} as const;
