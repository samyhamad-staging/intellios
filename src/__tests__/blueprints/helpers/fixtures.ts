/**
 * Test fixtures for blueprint lifecycle tests.
 *
 * Factory functions that produce realistic DB row shapes matching the
 * agentBlueprints table and EnterpriseSettings.
 */

import type { ApprovalChainStep, EnterpriseSettings } from "@/lib/settings/types";
import { DEFAULT_ENTERPRISE_SETTINGS } from "@/lib/settings/types";

// ─── Blueprint fixture ──────────────────────────────────────────────────────

export interface BlueprintFixture {
  id: string;
  agentId: string;
  version: number;
  name: string;
  tags: string[];
  enterpriseId: string | null;
  sessionId: string;
  abp: Record<string, unknown>;
  status: string;
  refinementCount: number;
  validationReport: Record<string, unknown> | null;
  reviewComment: string | null;
  reviewedAt: Date | null;
  reviewedBy: string | null;
  createdBy: string | null;
  currentApprovalStep: number;
  approvalProgress: unknown[];
  deploymentTarget: string | null;
  deploymentMetadata: Record<string, unknown> | null;
  nextReviewDue: Date | null;
  previousBlueprintId: string | null;
  governanceDiff: unknown | null;
  baselineValidationReport: unknown | null;
  governanceDrift: unknown | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create a blueprint row with sensible defaults. Override any field.
 */
export function makeBlueprint(overrides: Partial<BlueprintFixture> = {}): BlueprintFixture {
  return {
    id: "bp-001",
    agentId: "agent-001",
    version: 1,
    name: "Test Agent",
    tags: ["test"],
    enterpriseId: "ent-001",
    sessionId: "session-001",
    abp: {
      identity: { name: "Test Agent" },
      metadata: { tags: ["test"], name: "Test Agent" },
      capabilities: {},
      guardrails: {},
    },
    status: "draft",
    refinementCount: 0,
    validationReport: null,
    reviewComment: null,
    reviewedAt: null,
    reviewedBy: null,
    createdBy: "designer@acme.com",
    currentApprovalStep: 0,
    approvalProgress: [],
    deploymentTarget: null,
    deploymentMetadata: null,
    nextReviewDue: null,
    previousBlueprintId: null,
    governanceDiff: null,
    baselineValidationReport: null,
    governanceDrift: null,
    createdAt: new Date("2026-01-15"),
    updatedAt: new Date("2026-01-15"),
    ...overrides,
  };
}

// ─── Validation report fixture ──────────────────────────────────────────────

export function makeValidationReport(overrides: {
  violations?: Array<{ policyId: string; severity: string; message: string }>;
  policyCount?: number;
} = {}) {
  const violations = overrides.violations ?? [];
  return {
    policyCount: overrides.policyCount ?? 5,
    violations,
    validatedAt: new Date().toISOString(),
  };
}

// ─── Enterprise settings fixture ────────────────────────────────────────────

/**
 * Create enterprise settings with deep-merge overrides.
 */
export function makeSettings(overrides: {
  approvalChain?: ApprovalChainStep[];
  allowSelfApproval?: boolean;
  requireTestsBeforeApproval?: boolean;
  requireValidationBeforeReview?: boolean;
  periodicReviewEnabled?: boolean;
  periodicReviewCadenceMonths?: number;
  agentcoreEnabled?: boolean;
  agentcoreRegion?: string;
  agentcoreRoleArn?: string;
} = {}): EnterpriseSettings {
  return {
    ...DEFAULT_ENTERPRISE_SETTINGS,
    governance: {
      ...DEFAULT_ENTERPRISE_SETTINGS.governance,
      ...(overrides.allowSelfApproval !== undefined ? { allowSelfApproval: overrides.allowSelfApproval } : {}),
      ...(overrides.requireTestsBeforeApproval !== undefined ? { requireTestsBeforeApproval: overrides.requireTestsBeforeApproval } : {}),
      ...(overrides.requireValidationBeforeReview !== undefined ? { requireValidationBeforeReview: overrides.requireValidationBeforeReview } : {}),
    },
    approvalChain: overrides.approvalChain ?? DEFAULT_ENTERPRISE_SETTINGS.approvalChain,
    periodicReview: {
      ...DEFAULT_ENTERPRISE_SETTINGS.periodicReview,
      ...(overrides.periodicReviewEnabled !== undefined ? { enabled: overrides.periodicReviewEnabled } : {}),
      ...(overrides.periodicReviewCadenceMonths !== undefined ? { defaultCadenceMonths: overrides.periodicReviewCadenceMonths } : {}),
    },
    deploymentTargets: {
      agentcore: overrides.agentcoreEnabled
        ? {
            enabled: true,
            region: overrides.agentcoreRegion ?? "us-east-1",
            agentResourceRoleArn: overrides.agentcoreRoleArn ?? "arn:aws:iam::123456:role/bedrock",
            foundationModel: "anthropic.claude-3-5-sonnet-20241022-v2:0",
          }
        : DEFAULT_ENTERPRISE_SETTINGS.deploymentTargets.agentcore,
    },
  };
}

// ─── Intake session fixture ─────────────────────────────────────────────────

export function makeIntakeSession(overrides: Partial<{
  id: string;
  enterpriseId: string | null;
  status: string;
  intakePayload: Record<string, unknown>;
  intakeContext: Record<string, unknown> | null;
  agentType: string | null;
  riskTier: string | null;
}> = {}) {
  return {
    id: overrides.id ?? "session-001",
    enterpriseId: overrides.enterpriseId ?? "ent-001",
    status: overrides.status ?? "completed",
    intakePayload: overrides.intakePayload ?? { requirements: "Test requirements" },
    intakeContext: overrides.intakeContext ?? null,
    agentType: overrides.agentType ?? "conversational",
    riskTier: overrides.riskTier ?? "medium",
    createdAt: new Date("2026-01-15"),
    updatedAt: new Date("2026-01-15"),
  };
}
