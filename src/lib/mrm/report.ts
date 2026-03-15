import { db } from "@/lib/db";
import { agentBlueprints, auditLog, intakeSessions, intakeContributions } from "@/lib/db/schema";
import { eq, and, asc, inArray } from "drizzle-orm";
import { ABP } from "@/lib/types/abp";
import { ValidationReport } from "@/lib/governance/types";
import { IntakeContext, StakeholderContribution } from "@/lib/types/intake";
import { getMissingContributionDomains } from "@/lib/intake/coverage";
import { assessAllFrameworks } from "@/lib/regulatory/classifier";
import { getEnterpriseSettings } from "@/lib/settings/get-settings";
import { MRMReport } from "./types";

/**
 * Assemble a full MRM Compliance Report for a specific blueprint version.
 *
 * Queries:
 *   1. The blueprint record (by blueprintId)
 *   2. All versions of the logical agent (by agentId)
 *   3. All audit log entries for this blueprint version (for audit chain)
 *   4. All audit log entries across all versions (for deployment lineage)
 *
 * Returns null if the blueprint does not exist.
 */
export async function assembleMRMReport(
  blueprintId: string,
  requestedBy: string
): Promise<MRMReport | null> {
  // ── 1. Fetch the blueprint ───────────────────────────────────────────────
  const blueprint = await db.query.agentBlueprints.findFirst({
    where: eq(agentBlueprints.id, blueprintId),
  });
  if (!blueprint) return null;

  // ── 2. Fetch all versions of this logical agent ──────────────────────────
  const versions = await db
    .select()
    .from(agentBlueprints)
    .where(eq(agentBlueprints.agentId, blueprint.agentId))
    .orderBy(asc(agentBlueprints.createdAt));

  // ── 3. Audit entries for this version (audit chain) ──────────────────────
  const blueprintAuditEntries = await db
    .select()
    .from(auditLog)
    .where(and(eq(auditLog.entityType, "blueprint"), eq(auditLog.entityId, blueprintId)))
    .orderBy(asc(auditLog.createdAt));

  // ── 4. Audit entries across all versions (deployment lineage) ────────────
  const versionIds = versions.map((v) => v.id);
  const allVersionAuditEntries =
    versionIds.length > 0
      ? await db
          .select()
          .from(auditLog)
          .where(and(eq(auditLog.entityType, "blueprint"), inArray(auditLog.entityId, versionIds)))
          .orderBy(asc(auditLog.createdAt))
      : [];

  // ── 5. Fetch the intake session for Phase 1 context ─────────────────────
  const intakeSession = await db.query.intakeSessions.findFirst({
    where: eq(intakeSessions.id, blueprint.sessionId),
  });
  const intakeContext = (intakeSession?.intakeContext as IntakeContext | null) ?? null;

  // ── 6. Fetch stakeholder contributions for this session ──────────────────
  const contributionRows = await db
    .select()
    .from(intakeContributions)
    .where(eq(intakeContributions.sessionId, blueprint.sessionId))
    .orderBy(asc(intakeContributions.createdAt));

  const abp = blueprint.abp as ABP;
  const validationReport = blueprint.validationReport as ValidationReport | null;

  // ── Risk Classification ───────────────────────────────────────────────────
  // Derive risk tier from governance policy types as the best available proxy.
  // High: safety + compliance policies both present → highest regulatory exposure.
  // Medium: one of safety or compliance present.
  // Low: neither present — lower regulatory footprint.
  const policies = abp.governance?.policies ?? [];
  const policyTypes = policies.map((p) => p.type);
  const riskTier = (() => {
    const hasSafety = policyTypes.includes("safety");
    const hasCompliance = policyTypes.includes("compliance");
    if (hasSafety && hasCompliance) return "High";
    if (hasSafety || hasCompliance) return "Medium";
    return "Low";
  })();
  const riskTierBasis =
    policyTypes.length > 0
      ? `Derived from governance policy types applied at validation: [${policyTypes.join(", ")}]. Validate against enterprise model risk taxonomy before regulatory submission.`
      : "No governance policies recorded. Risk tier requires manual classification.";

  // ── Deployment change record for this version ─────────────────────────────
  const deployEvent = blueprintAuditEntries.find(
    (e) =>
      e.action === "blueprint.status_changed" &&
      (e.toState as Record<string, unknown> | null)?.status === "deployed"
  );
  const deployMeta = deployEvent?.metadata as Record<string, unknown> | null;

  // ── SOD Evidence ──────────────────────────────────────────────────────────
  // designer: actor who submitted for review (first in_review transition)
  const submitEvent = blueprintAuditEntries.find(
    (e) =>
      e.action === "blueprint.status_changed" &&
      (e.toState as Record<string, unknown> | null)?.status === "in_review"
  );
  const designer = submitEvent?.actorEmail ?? blueprint.createdBy ?? null;
  const reviewer = blueprint.reviewedBy ?? null;
  const deployer = deployEvent?.actorEmail ?? null;

  const sodSatisfied = (() => {
    const actors = [designer, reviewer, deployer].filter((a): a is string => a !== null);
    return new Set(actors).size === actors.length; // all distinct — no dual roles
  })();

  // ── Deployment lineage across all versions ────────────────────────────────
  const deploymentLineage = allVersionAuditEntries
    .filter(
      (e) =>
        e.action === "blueprint.status_changed" &&
        (e.toState as Record<string, unknown> | null)?.status === "deployed"
    )
    .map((e) => {
      const versionRecord = versions.find((v) => v.id === e.entityId);
      const meta = e.metadata as Record<string, unknown> | null;
      return {
        version: versionRecord?.version ?? "unknown",
        deployedAt: e.createdAt.toISOString(),
        deployedBy: e.actorEmail,
        changeRef: (meta?.changeRef as string) ?? null,
      };
    });

  // ── Audit chain for this version ─────────────────────────────────────────
  const auditChain = blueprintAuditEntries.map((e) => ({
    timestamp: e.createdAt.toISOString(),
    action: e.action,
    actor: e.actorEmail,
    actorRole: e.actorRole,
    fromStatus:
      ((e.fromState as Record<string, unknown> | null)?.status as string) ?? null,
    toStatus:
      ((e.toState as Record<string, unknown> | null)?.status as string) ?? null,
    metadata: (e.metadata as Record<string, unknown>) ?? null,
  }));

  // ── Review outcome ────────────────────────────────────────────────────────
  const reviewOutcome = ((): MRMReport["reviewDecision"]["outcome"] => {
    if (!blueprint.reviewedBy) {
      return blueprint.status === "in_review" ? "pending" : null;
    }
    if (blueprint.status === "approved" || blueprint.status === "deployed") return "approved";
    if (blueprint.status === "rejected") return "rejected";
    if (blueprint.status === "draft") return "changes_requested";
    return "approved";
  })();

  // ── Section 14: Periodic Review Schedule ─────────────────────────────────
  const enterpriseSettings = await getEnterpriseSettings(blueprint.enterpriseId ?? null);
  const periodicReviewSettings = enterpriseSettings.periodicReview;
  const nextReviewDueAt = blueprint.nextReviewDue?.toISOString() ?? null;
  const lastPeriodicReviewAt = blueprint.lastPeriodicReviewAt?.toISOString() ?? null;
  const isOverdue = nextReviewDueAt != null && new Date(nextReviewDueAt) < new Date();

  // ── Section 12: Regulatory Framework Assessment ──────────────────────────
  const regulatoryAssessment = assessAllFrameworks({
    blueprintId,
    abp,
    intakeContext,
    validationReport,
    deploymentHealthStatus: blueprint.status === "deployed" ? "deployed" : null,
  });
  const regulatoryFrameworks: MRMReport["regulatoryFrameworks"] = {
    assessedAt: regulatoryAssessment.assessedAt,
    frameworks: regulatoryAssessment.frameworks.map((fw) => {
      const applicable = fw.requirements.filter((r) => r.evidenceStatus !== "not_applicable");
      const satisfied = applicable.filter((r) => r.evidenceStatus === "satisfied").length;
      const gaps = applicable
        .filter((r) => r.evidenceStatus === "missing")
        .map((r) => r.title);
      return {
        frameworkId: fw.frameworkId,
        frameworkName: fw.frameworkName,
        overallStatus: fw.overallStatus,
        ...(fw.euAiActRiskTier ? { euAiActRiskTier: fw.euAiActRiskTier } : {}),
        requirementsSatisfied: satisfied,
        requirementsTotal: applicable.length,
        gaps,
      };
    }),
  };

  // ── Assemble ──────────────────────────────────────────────────────────────
  return {
    generatedAt: new Date().toISOString(),
    generatedBy: requestedBy,
    blueprintId,
    agentId: blueprint.agentId,

    cover: {
      agentName: blueprint.name ?? "Unnamed Agent",
      currentStatus: blueprint.status,
      currentVersion: blueprint.version,
      enterpriseId: blueprint.enterpriseId ?? null,
    },

    riskClassification: {
      riskTier,
      riskTierBasis,
      intendedUse: abp.identity?.description ?? "Not specified",
      businessOwner: blueprint.enterpriseId ?? null,
      modelOwner: blueprint.createdBy ?? null,
      deploymentType: intakeContext?.deploymentType ?? null,
      dataSensitivity: intakeContext?.dataSensitivity ?? null,
      regulatoryScope: intakeContext?.regulatoryScope ?? [],
      stakeholdersConsulted: intakeContext?.stakeholdersConsulted ?? [],
    },

    identity: {
      name: abp.identity?.name ?? "Unnamed Agent",
      description: abp.identity?.description ?? "",
      persona: abp.identity?.persona ?? null,
      tags: abp.metadata?.tags ?? [],
    },

    capabilities: {
      toolCount: abp.capabilities?.tools?.length ?? 0,
      tools: (abp.capabilities?.tools ?? []).map((t) => ({
        name: t.name,
        type: t.type,
        description: t.description,
      })),
      knowledgeSourceCount: abp.capabilities?.knowledge_sources?.length ?? 0,
      knowledgeSources: (abp.capabilities?.knowledge_sources ?? []).map((k) => ({
        name: k.name,
        type: k.type,
      })),
      instructionsConfigured: !!(abp.capabilities?.instructions),
    },

    governanceValidation: {
      validated: !!validationReport,
      valid: validationReport?.valid ?? null,
      violationCount: validationReport?.violations?.length ?? 0,
      errorCount:
        validationReport?.violations?.filter((v) => v.severity === "error").length ?? 0,
      warningCount:
        validationReport?.violations?.filter((v) => v.severity === "warning").length ?? 0,
      policyCount: validationReport?.policyCount ?? 0,
      violations: (validationReport?.violations ?? []).map((v) => ({
        policyName: v.policyName,
        severity: v.severity,
        message: v.message,
        suggestion: v.suggestion,
      })),
      generatedAt: validationReport?.generatedAt ?? null,
    },

    reviewDecision: {
      outcome: reviewOutcome,
      reviewedBy: blueprint.reviewedBy ?? null,
      reviewedAt: blueprint.reviewedAt?.toISOString() ?? null,
      comment: blueprint.reviewComment ?? null,
    },

    sodEvidence: {
      designer,
      reviewer,
      deployer,
      sodSatisfied,
    },

    deploymentRecord: {
      deployed: blueprint.status === "deployed",
      deployedAt: deployEvent?.createdAt.toISOString() ?? null,
      deployedBy: deployEvent?.actorEmail ?? null,
      changeRef: (deployMeta?.changeRef as string) ?? null,
      deploymentNotes: (deployMeta?.deploymentNotes as string) ?? null,
      deploymentTarget: blueprint.deploymentTarget ?? null,
      agentcoreRecord: (() => {
        if (blueprint.deploymentTarget !== "agentcore" || !blueprint.deploymentMetadata) return null;
        const m = blueprint.deploymentMetadata as Record<string, unknown>;
        if (
          typeof m.agentId !== "string" ||
          typeof m.agentArn !== "string" ||
          typeof m.region !== "string" ||
          typeof m.foundationModel !== "string" ||
          typeof m.deployedAt !== "string" ||
          typeof m.deployedBy !== "string"
        ) return null;
        return {
          agentId: m.agentId,
          agentArn: m.agentArn,
          region: m.region,
          foundationModel: m.foundationModel,
          deployedAt: m.deployedAt,
          deployedBy: m.deployedBy,
        };
      })(),
    },

    modelLineage: {
      versionHistory: versions.map((v) => ({
        version: v.version,
        status: v.status,
        createdBy: v.createdBy ?? null,
        createdAt: v.createdAt.toISOString(),
        refinementCount: v.refinementCount,
      })),
      deploymentLineage,
    },

    auditChain,

    stakeholderContributions: contributionRows.map((row) => ({
      contributorEmail: row.contributorEmail,
      contributorRole: row.contributorRole,
      domain: row.domain,
      fields: row.fields as Record<string, string>,
      submittedAt: row.createdAt.toISOString(),
    })),

    stakeholderCoverageGaps: intakeContext
      ? getMissingContributionDomains(
          intakeContext,
          contributionRows.map((row) => ({
            id: row.id,
            sessionId: row.sessionId,
            enterpriseId: row.enterpriseId,
            contributorEmail: row.contributorEmail,
            contributorRole: row.contributorRole,
            domain: row.domain as StakeholderContribution["domain"],
            fields: row.fields as Record<string, string>,
            createdAt: row.createdAt.toISOString(),
          }))
        )
      : null,

    regulatoryFrameworks,

    periodicReviewSchedule: {
      enabled: periodicReviewSettings.enabled,
      cadenceMonths: periodicReviewSettings.defaultCadenceMonths,
      lastPeriodicReviewAt,
      nextReviewDueAt,
      isOverdue,
    },
  };
}
