/**
 * Regulatory framework type definitions and requirement templates.
 *
 * This module defines the structure for three regulatory frameworks:
 *   - EU AI Act (Regulation 2024/1689)
 *   - SR 11-7 (Federal Reserve / OCC Model Risk Management Guidance)
 *   - NIST AI Risk Management Framework (2023)
 *
 * No logic lives here — pure data structures imported by classifier.ts.
 */

export type EvidenceStatus = "satisfied" | "partial" | "missing" | "not_applicable";

export type EUAIActRiskTier =
  | "review-required" // signals consistent with Annex III high-risk, warrants human review
  | "high-risk"       // confirmed Annex III indicators
  | "limited-risk"    // Art. 52 transparency obligations apply
  | "minimal-risk";   // no specific EU AI Act requirements

export interface RegulatoryRequirement {
  /** Unique identifier within the framework, e.g. "eu-ai-act-art-9" */
  id: string;
  /** Regulatory code, e.g. "Art. 9" or "SR11-7-III.A" */
  code: string;
  /** Short title, e.g. "Risk Management System" */
  title: string;
  /** What the requirement demands — human-readable */
  description: string;
  /** Evidence status populated by the classifier */
  evidenceStatus: EvidenceStatus;
  /** What evidence was found (or why it is missing) — populated by classifier */
  evidence: string | null;
}

export interface FrameworkAssessment {
  frameworkId: "eu-ai-act" | "sr-11-7" | "nist-rmf";
  frameworkName: string;
  /** Regulatory version/year, e.g. "2024/1689" for EU AI Act */
  version: string;
  /** Overall compliance posture across all requirements */
  overallStatus: "compliant" | "partial" | "gaps_identified";
  /** EU AI Act only: risk tier classification */
  euAiActRiskTier?: EUAIActRiskTier;
  requirements: RegulatoryRequirement[];
  /** 1–2 sentence plain-language summary for human consumption */
  summary: string;
}

export interface RegulatoryAssessment {
  blueprintId: string;
  /** ISO 8601 timestamp of when assessment was computed */
  assessedAt: string;
  frameworks: FrameworkAssessment[];
}

// ── Requirement ID constants ─────────────────────────────────────────────────
// Used by the classifier to build requirement objects with the correct ids.

export const EU_AI_ACT_REQUIREMENTS = [
  "eu-ai-act-risk-tier",
  "eu-ai-act-art-9",
  "eu-ai-act-art-10",
  "eu-ai-act-art-11",
  "eu-ai-act-art-12",
  "eu-ai-act-art-13",
  "eu-ai-act-art-14",
  "eu-ai-act-art-15",
  "eu-ai-act-art-52",
] as const;

export const SR_11_7_REQUIREMENTS = [
  "sr117-iii-a-soundness",
  "sr117-iii-a-documentation",
  "sr117-iii-b-data-quality",
  "sr117-iii-c-limitations",
  "sr117-iii-d-monitoring-logging",
  "sr117-iii-d-monitoring-policy",
  "sr117-iv-validation",
  "sr117-v-a-policies",
  "sr117-v-c-audit",
] as const;

export const NIST_RMF_REQUIREMENTS = [
  "nist-govern-1",
  "nist-govern-2",
  "nist-map-1",
  "nist-map-2",
  "nist-measure-1",
  "nist-measure-2",
  "nist-manage-1",
  "nist-manage-2",
] as const;
