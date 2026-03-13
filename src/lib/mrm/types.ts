/**
 * MRM Compliance Report — typed structure.
 *
 * Assembled on demand by assembleMRMReport() and returned by
 * GET /api/blueprints/[id]/report.
 *
 * Sections align with SR 11-7 model risk management documentation expectations:
 *   - Risk Classification  → accountability, tier, intended use
 *   - Governance Validation → policy coverage, violation evidence
 *   - Review Decision       → independent challenge documentation
 *   - SOD Evidence          → separation of duties across the lifecycle
 *   - Deployment Record     → change management traceability
 *   - Model Lineage         → version and deployment history
 *   - Audit Chain           → immutable event trail for the current version
 */

export interface MRMReport {
  /** ISO timestamp when this report was generated. */
  generatedAt: string;
  /** Email of the user who requested the report. Written to audit log. */
  generatedBy: string;
  /** Blueprint version ID this report describes. */
  blueprintId: string;
  /** Logical agent ID (all versions share this). */
  agentId: string;

  // ── Section 1: Cover ─────────────────────────────────────────────────────
  cover: {
    agentName: string;
    currentStatus: string;
    currentVersion: string;
    enterpriseId: string | null;
  };

  // ── Section 2: Risk Classification ───────────────────────────────────────
  // Derived from governance policy coverage and Phase 1 intake context.
  // Requires human validation against the enterprise model risk taxonomy.
  riskClassification: {
    /** "High" | "Medium" | "Low" — derived from governance policy types. */
    riskTier: string;
    /** Human-readable explanation of how riskTier was derived. */
    riskTierBasis: string;
    /** Sourced from abp.identity.description — the agent's intended purpose. */
    intendedUse: string;
    /**
     * Closest proxy available: enterpriseId. Enterprises should replace this
     * with a dedicated business owner field when onboarding production agents.
     */
    businessOwner: string | null;
    /**
     * The designer who created and submitted the blueprint is treated as the
     * model owner accountable for its specification and maintenance.
     */
    modelOwner: string | null;
    /**
     * Deployment surface captured during Phase 1 intake context.
     * null if intake was conducted before Phase 1 context was introduced.
     */
    deploymentType: string | null;
    /**
     * Highest data sensitivity level identified in Phase 1 intake context.
     * null if intake was conducted before Phase 1 context was introduced.
     */
    dataSensitivity: string | null;
    /**
     * Regulatory frameworks identified as applicable during Phase 1.
     * Empty array if none selected or context unavailable.
     */
    regulatoryScope: string[];
    /**
     * Stakeholders who were consulted before initiating the intake.
     * Recorded here as evidence of pre-design governance engagement.
     */
    stakeholdersConsulted: string[];
  };

  // ── Section 3: Agent Identity ─────────────────────────────────────────────
  identity: {
    name: string;
    description: string;
    persona: string | null;
    tags: string[];
  };

  // ── Section 4: Capabilities ───────────────────────────────────────────────
  capabilities: {
    toolCount: number;
    tools: Array<{ name: string; type: string; description?: string }>;
    knowledgeSourceCount: number;
    knowledgeSources: Array<{ name: string; type: string }>;
    instructionsConfigured: boolean;
  };

  // ── Section 5: Governance Validation ─────────────────────────────────────
  governanceValidation: {
    /** false if no validation has been run yet. */
    validated: boolean;
    valid: boolean | null;
    violationCount: number;
    errorCount: number;
    warningCount: number;
    policyCount: number;
    violations: Array<{
      policyName: string;
      severity: string;
      message: string;
      suggestion: string | null;
    }>;
    /** ISO timestamp of when the validation was run. */
    generatedAt: string | null;
  };

  // ── Section 6: Review Decision ────────────────────────────────────────────
  reviewDecision: {
    outcome: "approved" | "rejected" | "changes_requested" | "pending" | null;
    reviewedBy: string | null;
    reviewedAt: string | null;
    comment: string | null;
  };

  // ── Section 7: SOD Evidence ───────────────────────────────────────────────
  sodEvidence: {
    /** Email of the user who submitted the blueprint for review. */
    designer: string | null;
    /** Email of the reviewer who made the approval/rejection decision. */
    reviewer: string | null;
    /** Email of the user who executed the production deployment. */
    deployer: string | null;
    /**
     * true if all populated roles are held by distinct individuals.
     * Satisfying SOD requires designer ≠ reviewer ≠ deployer.
     */
    sodSatisfied: boolean;
  };

  // ── Section 8: Deployment Change Record ──────────────────────────────────
  deploymentRecord: {
    deployed: boolean;
    deployedAt: string | null;
    deployedBy: string | null;
    /** Change ticket reference from the enterprise change management system. */
    changeRef: string | null;
    deploymentNotes: string | null;
  };

  // ── Section 9: Model Lineage ──────────────────────────────────────────────
  modelLineage: {
    /** All blueprint versions for this logical agent, ordered oldest-first. */
    versionHistory: Array<{
      version: string;
      status: string;
      createdBy: string | null;
      createdAt: string;
      refinementCount: string;
    }>;
    /**
     * Every production deployment event recorded across all versions of
     * this agent, ordered chronologically.
     */
    deploymentLineage: Array<{
      version: string;
      deployedAt: string;
      deployedBy: string;
      changeRef: string | null;
    }>;
  };

  // ── Section 10: Audit Chain ───────────────────────────────────────────────
  /** All lifecycle audit events for this blueprint version, oldest-first. */
  auditChain: Array<{
    timestamp: string;
    action: string;
    actor: string;
    actorRole: string;
    fromStatus: string | null;
    toStatus: string | null;
    metadata: Record<string, unknown> | null;
  }>;
}
