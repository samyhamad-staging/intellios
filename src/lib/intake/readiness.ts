/**
 * Intake Readiness Score — Phase 49: Intake Confidence Engine.
 *
 * Computes a 0-100 score reflecting how complete and high-quality the current
 * intake session is, given the accumulated payload and the agent's risk tier.
 *
 * Three dimensions:
 *   1. Section Coverage (0–50): which payload sections have been captured
 *   2. Governance Depth (0–35): which policy types are present (weighted by tier)
 *   3. Specificity (0–15): starts full, penalized per unresolved ambiguity flag
 *
 * Score thresholds:
 *   < 15  → "not-started"
 *   < 50  → "building"
 *   < 80  → "near-complete"
 *   ≥ 80  → "ready"
 */

import { IntakePayload, IntakeRiskTier } from "@/lib/types/intake";

export interface ReadinessBreakdown {
  /** Sections filled vs. expected (0-50). Required sections weighted higher. */
  sectionCoverage: number;
  /** Governance policy depth: how many of the 5 policy types are present (0-35). */
  governanceDepth: number;
  /** Specificity: starts at 15, -5 per unresolved ambiguity flag. */
  specificity: number;
}

export interface ReadinessResult {
  /** 0-100 composite score. */
  score: number;
  /** Human-readable label corresponding to the score range. */
  label: "not-started" | "building" | "near-complete" | "ready";
  breakdown: ReadinessBreakdown;
}

/**
 * Computes the readiness score for an active intake session.
 * Pure function — no DB access, no side effects.
 */
export function computeReadinessScore(
  payload: IntakePayload,
  riskTier: IntakeRiskTier | null
): ReadinessResult {
  const tier = riskTier ?? "medium";

  // ─── Section Coverage (0-50) ──────────────────────────────────────────────
  // Required sections (identity + tools) are weighted 14 pts each.
  // Optional sections contribute smaller amounts.
  const identityFilled = !!(payload.identity?.name && payload.identity?.description);
  const toolsFilled = (payload.capabilities?.tools?.length ?? 0) > 0;
  const instructionsFilled = !!payload.capabilities?.instructions;
  const knowledgeFilled = (payload.capabilities?.knowledge_sources?.length ?? 0) > 0;
  const constraintsFilled =
    (payload.constraints?.allowed_domains?.length ?? 0) > 0 ||
    (payload.constraints?.denied_actions?.length ?? 0) > 0;
  const governanceFilled = (payload.governance?.policies?.length ?? 0) > 0;
  const auditFilled = payload.governance?.audit !== undefined;

  const sectionCoverage =
    (identityFilled ? 14 : 0) +
    (toolsFilled ? 14 : 0) +
    (instructionsFilled ? 6 : 0) +
    (knowledgeFilled ? 5 : 0) +
    (constraintsFilled ? 5 : 0) +
    (governanceFilled ? 4 : 0) +
    (auditFilled ? 2 : 0);

  // ─── Governance Depth (0-35) ──────────────────────────────────────────────
  // Low-risk agents get full governance points automatically (governance optional).
  // Medium+ agents earn 7 pts per distinct policy type captured (max 5 types = 35 pts).
  // Audit config via set_audit_config counts as the "audit" policy type.
  let governanceDepth: number;
  if (tier === "low") {
    governanceDepth = 35;
  } else {
    const POLICY_TYPES = ["safety", "compliance", "data_handling", "access_control", "audit"] as const;
    const presentTypes = new Set((payload.governance?.policies ?? []).map((p) => p.type));
    // audit config (set_audit_config) satisfies the audit policy type
    const hasAuditConfig = auditFilled;

    let pts = 0;
    for (const type of POLICY_TYPES) {
      if (type === "audit") {
        if (presentTypes.has("audit") || hasAuditConfig) pts += 7;
      } else {
        if (presentTypes.has(type)) pts += 7;
      }
    }
    governanceDepth = Math.min(35, pts);
  }

  // ─── Specificity (0-15) ───────────────────────────────────────────────────
  // Starts at 15. Each unresolved ambiguity flag deducts 5 pts (min 0).
  // This penalizes sessions where requirements are vague or contradictory.
  const unresolvedFlags = (payload._flags ?? []).filter((f) => !f.resolved).length;
  const specificity = Math.max(0, 15 - unresolvedFlags * 5);

  // ─── Composite score ──────────────────────────────────────────────────────
  const score = Math.min(100, sectionCoverage + governanceDepth + specificity);

  const label: ReadinessResult["label"] =
    score < 15 ? "not-started"
    : score < 50 ? "building"
    : score < 80 ? "near-complete"
    : "ready";

  return {
    score,
    label,
    breakdown: { sectionCoverage, governanceDepth, specificity },
  };
}
