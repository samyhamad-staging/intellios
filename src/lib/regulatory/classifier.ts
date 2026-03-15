/**
 * Regulatory classifier — deterministic, stateless, zero AI cost.
 *
 * Classifies an Agent Blueprint Package against:
 *   - EU AI Act (Regulation 2024/1689)
 *   - SR 11-7 (Federal Reserve / OCC Model Risk Management Guidance)
 *   - NIST AI Risk Management Framework (2023)
 *
 * All evidence is derived from the ABP document, the intake context captured in
 * Phase 1, the governance validation report, and the deployment health status.
 *
 * No DB calls, no AI calls, no side effects.
 */

import type { ABP } from "@/lib/types/abp";
import type { IntakeContext } from "@/lib/types/intake";
import type { ValidationReport } from "@/lib/governance/types";
import type {
  EvidenceStatus,
  EUAIActRiskTier,
  FrameworkAssessment,
  RegulatoryRequirement,
  RegulatoryAssessment,
} from "./frameworks";

// ── Helpers ──────────────────────────────────────────────────────────────────

function req(
  id: string,
  code: string,
  title: string,
  description: string,
  evidenceStatus: EvidenceStatus,
  evidence: string | null
): RegulatoryRequirement {
  return { id, code, title, description, evidenceStatus, evidence };
}

function countGaps(requirements: RegulatoryRequirement[]): number {
  return requirements.filter((r) => r.evidenceStatus === "missing").length;
}

function overallStatus(
  requirements: RegulatoryRequirement[]
): "compliant" | "partial" | "gaps_identified" {
  const applicable = requirements.filter((r) => r.evidenceStatus !== "not_applicable");
  if (applicable.every((r) => r.evidenceStatus === "satisfied")) return "compliant";
  if (applicable.some((r) => r.evidenceStatus === "missing")) return "gaps_identified";
  return "partial";
}

// ── EU AI Act Classifier ─────────────────────────────────────────────────────

function euAiActRiskTier(abp: ABP, ctx: IntakeContext | null): EUAIActRiskTier {
  if (!ctx) return "minimal-risk";

  const { deploymentType, dataSensitivity, regulatoryScope } = ctx;

  // Strongest signals first — any of these alone triggers review-required
  if (regulatoryScope.includes("HIPAA")) return "review-required";
  if (dataSensitivity === "regulated" && deploymentType !== "internal-only") return "review-required";
  if (regulatoryScope.includes("FINRA") && deploymentType === "customer-facing") return "review-required";

  // High-risk: customer-facing with sensitive data
  if (
    deploymentType === "customer-facing" &&
    (dataSensitivity === "pii" || dataSensitivity === "confidential")
  ) return "high-risk";

  // Limited-risk: any customer/partner-facing agent → Art. 52 transparency obligations
  if (deploymentType === "customer-facing" || deploymentType === "partner-facing") {
    return "limited-risk";
  }

  return "minimal-risk";
}

export function classifyEUAIAct(abp: ABP, intakeContext: IntakeContext | null): FrameworkAssessment {
  const tier = euAiActRiskTier(abp, intakeContext);
  const policies = abp.governance?.policies ?? [];
  const audit = abp.governance?.audit;
  const isHighOrReview = tier === "high-risk" || tier === "review-required";
  const isLimitedOrAbove = isHighOrReview || tier === "limited-risk";

  // ── Risk tier requirement ─────────────────────────────────────────────────
  const tierLabels: Record<EUAIActRiskTier, string> = {
    "review-required": "Requires human review — signals consistent with Annex III high-risk AI",
    "high-risk": "High-Risk AI — Annex III requirements apply (Arts. 9–15)",
    "limited-risk": "Limited-Risk AI — Transparency obligations apply (Art. 52)",
    "minimal-risk": "Minimal-Risk AI — No specific EU AI Act requirements",
  };

  const tierReq = req(
    "eu-ai-act-risk-tier",
    "Risk Tier",
    "Risk Classification",
    "Classification of the AI system under the EU AI Act risk framework",
    tier === "minimal-risk" ? "satisfied" : tier === "limited-risk" ? "satisfied" : "partial",
    tierLabels[tier]
  );

  // ── Art. 9 — Risk Management ──────────────────────────────────────────────
  const art9 = req(
    "eu-ai-act-art-9",
    "Art. 9",
    "Risk Management System",
    "Establishment and maintenance of a risk management system throughout the lifecycle",
    !isHighOrReview
      ? "not_applicable"
      : policies.length >= 1
      ? "satisfied"
      : "missing",
    !isHighOrReview
      ? null
      : policies.length >= 1
      ? `${policies.length} governance polic${policies.length === 1 ? "y" : "ies"} documented`
      : "No governance policies found — risk management system not established"
  );

  // ── Art. 10 — Data Governance ─────────────────────────────────────────────
  const hasDataHandling = policies.some((p) => p.type === "data_handling");
  const art10 = req(
    "eu-ai-act-art-10",
    "Art. 10",
    "Data Governance",
    "Training, validation and testing data must meet quality and governance criteria",
    !isHighOrReview
      ? "not_applicable"
      : hasDataHandling
      ? "satisfied"
      : "missing",
    !isHighOrReview
      ? null
      : hasDataHandling
      ? "Data handling policy present"
      : "No data_handling policy found — data governance not documented"
  );

  // ── Art. 11 — Technical Documentation ────────────────────────────────────
  const desc = abp.identity?.description ?? "";
  const descLen = desc.length;
  const art11Status: EvidenceStatus = !isHighOrReview
    ? "not_applicable"
    : descLen >= 100
    ? "satisfied"
    : descLen > 0
    ? "partial"
    : "missing";
  const art11 = req(
    "eu-ai-act-art-11",
    "Art. 11",
    "Technical Documentation",
    "Technical documentation must be drawn up before the system is placed on the market",
    art11Status,
    !isHighOrReview
      ? null
      : descLen >= 100
      ? `Description present (${descLen} chars)`
      : descLen > 0
      ? `Description present but short (${descLen} chars — minimum 100 recommended)`
      : "No agent description found — technical documentation absent"
  );

  // ── Art. 12 — Record-Keeping & Logging ────────────────────────────────────
  const logsEnabled = audit?.log_interactions === true;
  const art12 = req(
    "eu-ai-act-art-12",
    "Art. 12",
    "Record-Keeping & Logging",
    "High-risk AI systems must be designed to automatically record events (logging)",
    !isHighOrReview
      ? "not_applicable"
      : logsEnabled
      ? "satisfied"
      : "missing",
    !isHighOrReview
      ? null
      : logsEnabled
      ? "Interaction logging enabled"
      : "governance.audit.log_interactions is not set to true — logging required"
  );

  // ── Art. 13 — Transparency ────────────────────────────────────────────────
  const hasDesc = desc.length > 0;
  const hasPersona = (abp.identity?.persona ?? "").length > 0;
  const art13Status: EvidenceStatus = !isHighOrReview
    ? "not_applicable"
    : hasDesc && hasPersona
    ? "satisfied"
    : hasDesc
    ? "partial"
    : "missing";
  const art13 = req(
    "eu-ai-act-art-13",
    "Art. 13",
    "Transparency & Provision of Information",
    "High-risk AI systems must be transparent enough to allow users to interpret output",
    art13Status,
    !isHighOrReview
      ? null
      : hasDesc && hasPersona
      ? "Agent description and persona documented"
      : hasDesc
      ? "Description present but no persona documented"
      : "No description or persona — transparency information absent"
  );

  // ── Art. 14 — Human Oversight ─────────────────────────────────────────────
  const deniedActions = abp.constraints?.denied_actions ?? [];
  const art14Status: EvidenceStatus = !isHighOrReview
    ? "not_applicable"
    : deniedActions.length > 0
    ? "satisfied"
    : "missing";
  const art14 = req(
    "eu-ai-act-art-14",
    "Art. 14",
    "Human Oversight",
    "High-risk AI systems must allow effective human oversight",
    art14Status,
    !isHighOrReview
      ? null
      : deniedActions.length > 0
      ? `${deniedActions.length} denied action${deniedActions.length === 1 ? "" : "s"} defined — behavioral bounds established`
      : "No denied_actions defined — human oversight bounds not documented"
  );

  // ── Art. 15 — Accuracy, Robustness & Cybersecurity ───────────────────────
  const art15 = req(
    "eu-ai-act-art-15",
    "Art. 15",
    "Accuracy, Robustness & Cybersecurity",
    "High-risk AI systems must achieve appropriate levels of accuracy and robustness",
    !isHighOrReview
      ? "not_applicable"
      : "missing", // Will be updated if validationReport is passed — handled in assessAllFrameworks
    !isHighOrReview ? null : "Governance validation data not available at this stage"
  );

  // ── Art. 52 — Transparency Obligations (limited risk) ────────────────────
  const art52Status: EvidenceStatus = !isLimitedOrAbove
    ? "not_applicable"
    : hasDesc
    ? "satisfied"
    : "missing";
  const art52 = req(
    "eu-ai-act-art-52",
    "Art. 52",
    "Transparency Obligations",
    "AI systems interacting with humans must disclose they are AI systems",
    art52Status,
    !isLimitedOrAbove
      ? null
      : hasDesc
      ? "Agent description present — identity disclosed"
      : "No description — transparency obligation not met"
  );

  const requirements = [tierReq, art9, art10, art11, art12, art13, art14, art15, art52];
  const gapCount = countGaps(requirements);
  const status = overallStatus(requirements);

  const summaryMap: Record<EUAIActRiskTier, string> = {
    "review-required":
      `This agent shows signals consistent with EU AI Act Annex III high-risk AI. Human review of risk classification is required. ${gapCount > 0 ? `${gapCount} requirement${gapCount === 1 ? "" : "s"} need attention.` : "All assessed requirements are met."}`,
    "high-risk":
      `This agent is classified as High-Risk AI under EU AI Act Annex III. ${gapCount > 0 ? `${gapCount} of the 7 high-risk requirements have gaps.` : "All high-risk requirements are satisfied."}`,
    "limited-risk":
      `This agent is classified as Limited-Risk AI. Art. 52 transparency obligations apply. ${gapCount > 0 ? "Transparency requirement not yet met." : "Transparency obligation satisfied."}`,
    "minimal-risk":
      "This agent is classified as Minimal-Risk AI. No specific EU AI Act requirements apply based on current intake context.",
  };

  return {
    frameworkId: "eu-ai-act",
    frameworkName: "EU AI Act",
    version: "2024/1689",
    overallStatus: status,
    euAiActRiskTier: tier,
    requirements,
    summary: summaryMap[tier],
  };
}

// ── SR 11-7 Classifier ───────────────────────────────────────────────────────

export function classifySR117(
  abp: ABP,
  intakeContext: IntakeContext | null,
  validationReport: ValidationReport | null
): FrameworkAssessment {
  const policies = abp.governance?.policies ?? [];
  const audit = abp.governance?.audit;
  const desc = abp.identity?.description ?? "";
  const instructions = abp.capabilities?.instructions ?? "";
  const deniedActions = abp.constraints?.denied_actions ?? [];

  // III.A — Conceptual Soundness (purpose documentation)
  const descLen = desc.length;
  const iiiaSound: EvidenceStatus = descLen >= 100 ? "satisfied" : descLen > 0 ? "partial" : "missing";
  const r1 = req(
    "sr117-iii-a-soundness",
    "SR 11-7 §III.A",
    "Conceptual Soundness — Purpose",
    "The model's purpose and theoretical foundation must be clearly documented",
    iiiaSound,
    descLen >= 100
      ? `Description present and substantive (${descLen} chars)`
      : descLen > 0
      ? `Description present but brief (${descLen} chars — 100+ recommended for SR 11-7)`
      : "No agent description — conceptual soundness not documented"
  );

  // III.A — Documentation (instructions/system prompt)
  const r2 = req(
    "sr117-iii-a-documentation",
    "SR 11-7 §III.A",
    "Conceptual Soundness — Documentation",
    "Model logic and behavioral instructions must be documented",
    instructions.length > 0 ? "satisfied" : "missing",
    instructions.length > 0
      ? "System instructions (behavioral logic) are configured"
      : "No system instructions — behavioral logic not documented"
  );

  // III.B — Data Quality
  const hasDataHandling = policies.some((p) => p.type === "data_handling");
  const r3 = req(
    "sr117-iii-b-data-quality",
    "SR 11-7 §III.B",
    "Data Quality & Governance",
    "Data quality controls and governance must be documented",
    hasDataHandling ? "satisfied" : "missing",
    hasDataHandling
      ? "Data handling policy present"
      : "No data_handling policy — data quality governance not documented"
  );

  // III.C — Model Limitations
  const limitStatus: EvidenceStatus =
    deniedActions.length > 0 ? "satisfied" : deniedActions !== null ? "partial" : "missing";
  const r4 = req(
    "sr117-iii-c-limitations",
    "SR 11-7 §III.C",
    "Model Limitations",
    "Limitations, assumptions, and boundaries of the model must be documented",
    limitStatus,
    deniedActions.length > 0
      ? `${deniedActions.length} denied action${deniedActions.length === 1 ? "" : "s"} — model limitations defined`
      : "No denied_actions — model limitations not explicitly documented"
  );

  // III.D — Ongoing Monitoring (logging enabled)
  const logsEnabled = audit?.log_interactions === true;
  const r5 = req(
    "sr117-iii-d-monitoring-logging",
    "SR 11-7 §III.D",
    "Ongoing Monitoring — Logging",
    "Ongoing performance monitoring must be established; interaction logging is required",
    logsEnabled ? "satisfied" : "missing",
    logsEnabled
      ? "Interaction logging enabled — ongoing monitoring infrastructure present"
      : "governance.audit.log_interactions not enabled — logging required for ongoing monitoring"
  );

  // III.D — Ongoing Monitoring (monitoring policy)
  const hasAuditPolicy = policies.some((p) => p.type === "audit");
  const r6 = req(
    "sr117-iii-d-monitoring-policy",
    "SR 11-7 §III.D",
    "Ongoing Monitoring — Policy",
    "A formal monitoring policy must be defined",
    hasAuditPolicy ? "satisfied" : "missing",
    hasAuditPolicy
      ? "Audit policy present"
      : "No audit-type policy — formal monitoring policy not defined"
  );

  // IV — Validation Evidence
  const r7 = req(
    "sr117-iv-validation",
    "SR 11-7 §IV",
    "Validation Evidence",
    "Independent validation of the model must be conducted and documented",
    validationReport === null
      ? "missing"
      : validationReport.valid === true
      ? "satisfied"
      : "partial",
    validationReport === null
      ? "No governance validation report — model has not been validated"
      : validationReport.valid === true
      ? `Governance validation passed — ${validationReport.policyCount} polic${validationReport.policyCount === 1 ? "y" : "ies"} evaluated`
      : `Validation report exists but ${validationReport.violations.filter((v) => v.severity === "error").length} error violation${validationReport.violations.filter((v) => v.severity === "error").length === 1 ? "" : "s"} remain`
  );

  // V.A — Governance Policies
  const polCount = policies.length;
  const r8 = req(
    "sr117-v-a-policies",
    "SR 11-7 §V.A",
    "Governance Policies",
    "Policies and procedures governing model use must be established",
    polCount >= 2 ? "satisfied" : polCount === 1 ? "partial" : "missing",
    polCount >= 2
      ? `${polCount} governance policies defined`
      : polCount === 1
      ? "1 governance policy defined — minimum 2 recommended"
      : "No governance policies — model governance framework absent"
  );

  // V.C — Audit Framework
  const hasAuditFramework = logsEnabled && hasAuditPolicy;
  const r9Status: EvidenceStatus = hasAuditFramework
    ? "satisfied"
    : logsEnabled || hasAuditPolicy
    ? "partial"
    : "missing";
  const r9 = req(
    "sr117-v-c-audit",
    "SR 11-7 §V.C",
    "Audit Framework",
    "An audit framework must be in place to support independent oversight",
    r9Status,
    hasAuditFramework
      ? "Audit policy present and interaction logging enabled"
      : logsEnabled
      ? "Logging enabled but no audit policy defined"
      : hasAuditPolicy
      ? "Audit policy present but logging not enabled"
      : "No audit policy and logging not enabled — audit framework absent"
  );

  const requirements = [r1, r2, r3, r4, r5, r6, r7, r8, r9];
  const satisfied = requirements.filter((r) => r.evidenceStatus === "satisfied").length;
  const status = overallStatus(requirements);
  const gapCount = countGaps(requirements);

  return {
    frameworkId: "sr-11-7",
    frameworkName: "SR 11-7 Model Risk Management",
    version: "2011 (current)",
    overallStatus: status,
    requirements,
    summary:
      gapCount === 0
        ? `All ${satisfied} SR 11-7 requirements are satisfied. The model risk management framework is complete.`
        : `${satisfied} of ${requirements.length} SR 11-7 requirements are satisfied. ${gapCount} gap${gapCount === 1 ? "" : "s"} require attention before this agent meets full model risk management standards.`,
  };
}

// ── NIST AI RMF Classifier ───────────────────────────────────────────────────

type NISTStrength = "strong" | "partial" | "weak";

function nistStrength(strength: NISTStrength): EvidenceStatus {
  if (strength === "strong") return "satisfied";
  if (strength === "partial") return "partial";
  return "missing";
}

export function classifyNISTRMF(
  abp: ABP,
  intakeContext: IntakeContext | null,
  validationReport: ValidationReport | null,
  deploymentHealthStatus: string | null
): FrameworkAssessment {
  const policies = abp.governance?.policies ?? [];

  // GOVERN 1 — Risk governance culture (policies with descriptions)
  const policiesWithDesc = policies.filter((p) => p.description && p.description.trim().length > 0);
  const govern1Strength: NISTStrength =
    policiesWithDesc.length >= 2 ? "strong" : policiesWithDesc.length >= 1 ? "partial" : "weak";
  const g1 = req(
    "nist-govern-1",
    "GOVERN 1",
    "AI Risk Governance",
    "Policies, processes, and culture for AI risk governance are established",
    nistStrength(govern1Strength),
    policiesWithDesc.length >= 2
      ? `${policiesWithDesc.length} documented policies establish governance culture`
      : policiesWithDesc.length === 1
      ? "1 policy with description — broader policy coverage recommended"
      : "No documented policies — AI risk governance not established"
  );

  // GOVERN 2 — Accountability (policies + audit trail signals)
  const hasAuditLog = abp.governance?.audit?.log_interactions === true;
  const govern2Strength: NISTStrength =
    policies.length >= 1 && hasAuditLog ? "strong" : policies.length >= 1 ? "partial" : "weak";
  const g2 = req(
    "nist-govern-2",
    "GOVERN 2",
    "Accountability",
    "Accountability and responsibility for AI risks are clearly assigned",
    nistStrength(govern2Strength),
    policies.length >= 1 && hasAuditLog
      ? "Governance policies defined and interaction logging enabled"
      : policies.length >= 1
      ? "Policies defined but logging not enabled"
      : "No policies or logging — accountability mechanisms absent"
  );

  // MAP 1 — Context (intake context completeness)
  const ctxFieldCount = intakeContext
    ? [
        intakeContext.agentPurpose,
        intakeContext.deploymentType,
        intakeContext.dataSensitivity,
        intakeContext.regulatoryScope.length > 0,
        intakeContext.integrationTypes.length > 0,
        intakeContext.stakeholdersConsulted.length > 0,
      ].filter(Boolean).length
    : 0;
  const map1Strength: NISTStrength =
    ctxFieldCount >= 6 ? "strong" : ctxFieldCount >= 3 ? "partial" : "weak";
  const m1 = req(
    "nist-map-1",
    "MAP 1",
    "Categorize AI Context",
    "The AI system's context of use, purpose, and affected stakeholders are documented",
    nistStrength(map1Strength),
    intakeContext === null
      ? "No intake context captured — AI context not categorized"
      : ctxFieldCount >= 6
      ? `All ${ctxFieldCount} context fields populated (deployment type, data sensitivity, regulatory scope, stakeholders)`
      : `${ctxFieldCount} of 6 context fields populated`
  );

  // MAP 2 — Risk Identification (data sensitivity + regulatory scope)
  const hasRiskSignals =
    intakeContext !== null &&
    intakeContext.dataSensitivity !== "public" &&
    intakeContext.regulatoryScope.some((r) => r !== "none");
  const hasBasicContext = intakeContext !== null;
  const map2Strength: NISTStrength = hasRiskSignals ? "strong" : hasBasicContext ? "partial" : "weak";
  const m2 = req(
    "nist-map-2",
    "MAP 2",
    "Risk Identification",
    "AI risks in context are identified and prioritized",
    nistStrength(map2Strength),
    hasRiskSignals
      ? `Data sensitivity (${intakeContext!.dataSensitivity}) and regulatory scope identified`
      : hasBasicContext
      ? "Basic context present but no regulatory risk signals identified"
      : "No context available — risk identification not performed"
  );

  // MEASURE 1 — Risk Evaluation (validation report)
  const measure1Strength: NISTStrength =
    validationReport !== null && validationReport.valid === true
      ? "strong"
      : validationReport !== null
      ? "partial"
      : "weak";
  const ms1 = req(
    "nist-measure-1",
    "MEASURE 1",
    "Risk Evaluation",
    "AI risks are analyzed, assessed, and quantified",
    nistStrength(measure1Strength),
    validationReport === null
      ? "No governance validation run — risks not evaluated"
      : validationReport.valid === true
      ? `Governance validation passed — ${validationReport.policyCount} policies evaluated`
      : `Validation complete — ${validationReport.violations.filter((v) => v.severity === "error").length} error violation(s) identified`
  );

  // MEASURE 2 — Risk Tolerance (policies + violation tracking)
  const hasSafetyOrCompliance = policies.some(
    (p) => p.type === "safety" || p.type === "compliance"
  );
  const measure2Strength: NISTStrength =
    hasSafetyOrCompliance && validationReport !== null
      ? "strong"
      : hasSafetyOrCompliance
      ? "partial"
      : "weak";
  const ms2 = req(
    "nist-measure-2",
    "MEASURE 2",
    "Risk Tolerance",
    "Risk tolerance is established and tracked against governance policies",
    nistStrength(measure2Strength),
    hasSafetyOrCompliance && validationReport !== null
      ? "Safety/compliance policies defined and validated"
      : hasSafetyOrCompliance
      ? "Safety/compliance policies defined but not yet validated"
      : "No safety or compliance policies — risk tolerance not established"
  );

  // MANAGE 1 — Risk Response (violations addressed before deployment)
  const deployedClean =
    validationReport !== null &&
    validationReport.valid === true;
  const manage1Strength: NISTStrength = deployedClean ? "strong" : validationReport !== null ? "partial" : "weak";
  const mn1 = req(
    "nist-manage-1",
    "MANAGE 1",
    "Risk Response",
    "Risks are prioritized and responded to based on identified impacts",
    nistStrength(manage1Strength),
    deployedClean
      ? "All governance violations resolved — risk response complete"
      : validationReport !== null
      ? "Validation exists but violations remain unresolved"
      : "No validation performed — risk response not demonstrated"
  );

  // MANAGE 2 — Monitoring (deployment health monitoring)
  const isMonitored = deploymentHealthStatus !== null && deploymentHealthStatus !== "unknown";
  const manage2Strength: NISTStrength = isMonitored
    ? "strong"
    : deploymentHealthStatus === "unknown"
    ? "partial"
    : "weak";
  const mn2 = req(
    "nist-manage-2",
    "MANAGE 2",
    "Monitoring",
    "AI systems are monitored for performance and risk on an ongoing basis",
    nistStrength(manage2Strength),
    isMonitored
      ? `Deployment health monitoring active (status: ${deploymentHealthStatus})`
      : deploymentHealthStatus === "unknown"
      ? "Deployment health record exists but first check not yet run"
      : "No deployment health monitoring — agent not deployed or monitoring not initiated"
  );

  const requirements = [g1, g2, m1, m2, ms1, ms2, mn1, mn2];
  const satisfied = requirements.filter((r) => r.evidenceStatus === "satisfied").length;
  const partial = requirements.filter((r) => r.evidenceStatus === "partial").length;
  const status = overallStatus(requirements);

  const strengths = [
    `GOVERN: ${govern1Strength}`,
    `MAP: ${map1Strength}`,
    `MEASURE: ${measure1Strength}`,
    `MANAGE: ${manage2Strength}`,
  ].join(", ");

  return {
    frameworkId: "nist-rmf",
    frameworkName: "NIST AI Risk Management Framework",
    version: "1.0 (2023)",
    overallStatus: status,
    requirements,
    summary:
      status === "compliant"
        ? `All four NIST AI RMF functions are strong. The agent demonstrates comprehensive AI risk management practices.`
        : `${satisfied} of 8 NIST AI RMF requirements satisfied, ${partial} partial. Function strengths — ${strengths}.`,
  };
}

// ── Unified Assessment ───────────────────────────────────────────────────────

export function assessAllFrameworks(params: {
  blueprintId: string;
  abp: ABP;
  intakeContext: IntakeContext | null;
  validationReport: ValidationReport | null;
  deploymentHealthStatus?: string | null;
}): RegulatoryAssessment {
  const { blueprintId, abp, intakeContext, validationReport, deploymentHealthStatus = null } = params;

  // Run EU AI Act first to get tier, then patch Art. 15 with validation data
  const euAiAct = classifyEUAIAct(abp, intakeContext);
  const art15 = euAiAct.requirements.find((r) => r.id === "eu-ai-act-art-15");
  if (art15 && euAiAct.euAiActRiskTier && (euAiAct.euAiActRiskTier === "high-risk" || euAiAct.euAiActRiskTier === "review-required")) {
    if (validationReport !== null && validationReport.valid === true) {
      art15.evidenceStatus = "satisfied";
      art15.evidence = `Governance validation passed — ${validationReport.policyCount} policies evaluated`;
    } else if (validationReport !== null) {
      art15.evidenceStatus = "partial";
      art15.evidence = `Validation report exists but ${validationReport.violations.filter((v) => v.severity === "error").length} error violation(s) remain`;
    }
    // Recompute overall status after patching
    (euAiAct as { overallStatus: string }).overallStatus = overallStatus(euAiAct.requirements);
  }

  return {
    blueprintId,
    assessedAt: new Date().toISOString(),
    frameworks: [
      euAiAct,
      classifySR117(abp, intakeContext, validationReport),
      classifyNISTRMF(abp, intakeContext, validationReport, deploymentHealthStatus),
    ],
  };
}
