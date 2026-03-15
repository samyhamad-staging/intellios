/**
 * Phase 28: Quality Evaluator — side-effect module.
 *
 * Registers with the event bus on import (same pattern as notifications/handler
 * and monitoring/policy-impact-handler). Imported by src/lib/audit/log.ts so
 * it fires on every writeAuditLog call.
 *
 * Triggers:
 *   blueprint.status_changed → in_review  → AI scores the blueprint (5 dimensions)
 *   intake.finalized                       → AI scores the intake session (4 dimensions)
 *
 * All AI calls are fire-and-forget and wrapped in try/catch — evaluation
 * failures never interrupt or surface to the triggering operation.
 */

import { registerHandler } from "@/lib/events/bus";
import type { LifecycleEvent } from "@/lib/events/types";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { db } from "@/lib/db";
import {
  agentBlueprints,
  blueprintQualityScores,
  intakeContributions,
  intakeSessions,
  intakeQualityScores,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// ── Blueprint scoring ─────────────────────────────────────────────────────────

/**
 * Score a single blueprint by ID. Called both from the event handler (on
 * status_changed → in_review) and from the backfill route for existing blueprints.
 * All errors are caught — never throws.
 */
export async function runBlueprintQualityScoreForId(
  blueprintId: string,
  enterpriseId: string | null
): Promise<void> {
  try {
    const blueprint = await db.query.agentBlueprints.findFirst({
      where: eq(agentBlueprints.id, blueprintId),
    });
    if (!blueprint) return;

    const session = blueprint.sessionId
      ? await db.query.intakeSessions.findFirst({
          where: eq(intakeSessions.id, blueprint.sessionId),
        })
      : null;

    const abp = blueprint.abp as Record<string, unknown> | null;
    const abpSummary = abp
      ? {
          identity: (abp.identity as Record<string, unknown> | null) ?? null,
          capabilities: {
            toolCount: ((abp.capabilities as Record<string, unknown>)?.tools as unknown[])?.length ?? 0,
            knowledgeSourceCount: ((abp.capabilities as Record<string, unknown>)?.knowledge_sources as unknown[])?.length ?? 0,
            hasInstructions: !!((abp.capabilities as Record<string, unknown>)?.instructions),
          },
          governance: (abp.governance as Record<string, unknown> | null) ?? null,
          ownership: (abp.ownership as Record<string, unknown> | null) ?? null,
        }
      : null;

    const intakeContext = session?.intakeContext as Record<string, unknown> | null;

    const prompt = `You are evaluating the quality of an Agent Blueprint Package (ABP).

ABP summary:
${JSON.stringify(abpSummary, null, 2)}

Intake context (what was requested):
${JSON.stringify(intakeContext ?? { note: "No intake context available" }, null, 2)}

Score the following dimensions on a scale of 1–5 (1=poor, 5=excellent).
Respond with ONLY valid JSON matching this exact structure, no markdown:
{
  "intent_alignment": <1-5>,
  "tool_appropriateness": <1-5>,
  "instruction_specificity": <1-5>,
  "governance_adequacy": <1-5>,
  "ownership_completeness": <1-5>,
  "flags": ["<concern1>", "<concern2>"]
}

Scoring guide:
- intent_alignment: Does the agent identity and purpose match what the intake requested?
- tool_appropriateness: Are the selected tools necessary and sufficient for the stated purpose?
- instruction_specificity: Are instructions specific enough to produce consistent, predictable behavior?
- governance_adequacy: Does the governance configuration address the risk indicators stated in the intake?
- ownership_completeness: Is the ownership block complete (businessUnit, ownerEmail, costCenter, etc.)?
- flags: List up to 3 specific quality concerns as short strings (empty array if none).`;

    const { text } = await generateText({
      model: anthropic("claude-haiku-4-5-20251001"),
      prompt,
      temperature: 0,
    });

    let scores: {
      intent_alignment: number;
      tool_appropriateness: number;
      instruction_specificity: number;
      governance_adequacy: number;
      ownership_completeness: number;
      flags: string[];
    } | null = null;

    try {
      const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/```\s*$/i, "");
      scores = JSON.parse(cleaned);
    } catch {
      console.warn("[quality-evaluator] Could not parse blueprint score response:", text.slice(0, 200));
      return;
    }

    if (!scores) return;

    const dims = [
      scores.intent_alignment,
      scores.tool_appropriateness,
      scores.instruction_specificity,
      scores.governance_adequacy,
      scores.ownership_completeness,
    ];
    const mean = dims.reduce((a, b) => a + b, 0) / dims.length;
    const overallScore = (mean * 20).toFixed(2);

    await db.insert(blueprintQualityScores).values({
      blueprintId,
      enterpriseId,
      overallScore,
      intentAlignment: scores.intent_alignment.toFixed(2),
      toolAppropriateness: scores.tool_appropriateness.toFixed(2),
      instructionSpecificity: scores.instruction_specificity.toFixed(2),
      governanceAdequacy: scores.governance_adequacy.toFixed(2),
      ownershipCompleteness: scores.ownership_completeness.toFixed(2),
      flags: Array.isArray(scores.flags) ? scores.flags : [],
      evaluatorModel: "claude-haiku-4-5-20251001",
    });
  } catch (err) {
    console.error("[quality-evaluator] Blueprint scoring failed (non-fatal):", err);
  }
}

async function scoreBlueprintQuality(event: LifecycleEvent): Promise<void> {
  if (event.type !== "blueprint.status_changed") return;
  const toStatus = (event.toState as { status?: string } | null)?.status;
  if (toStatus !== "in_review") return;
  await runBlueprintQualityScoreForId(event.entityId, event.enterpriseId ?? null);
}

// ── Intake scoring ────────────────────────────────────────────────────────────

async function scoreIntakeQuality(event: LifecycleEvent): Promise<void> {
  if (event.type !== "intake.finalized") return;

  try {
    const session = await db.query.intakeSessions.findFirst({
      where: eq(intakeSessions.id, event.entityId),
    });
    if (!session) return;

    const contributions = await db
      .select()
      .from(intakeContributions)
      .where(eq(intakeContributions.sessionId, event.entityId));

    const intakeContext = session.intakeContext as Record<string, unknown> | null;
    const intakePayload = session.intakePayload as Record<string, unknown> | null;

    const prompt = `You are evaluating the quality of a completed AI agent intake session.

Intake context captured:
${JSON.stringify(intakeContext ?? {}, null, 2)}

Stakeholder contributions received (${contributions.length} total):
${JSON.stringify(contributions.map((c) => ({ domain: c.domain, fields: c.fields })), null, 2)}

Intake payload:
${JSON.stringify(intakePayload ?? {}, null, 2)}

Score the following dimensions on a scale of 1–5 (1=poor, 5=excellent).
Respond with ONLY valid JSON, no markdown:
{
  "breadth_score": <1-5>,
  "ambiguity_score": <1-5>,
  "risk_id_score": <1-5>,
  "stakeholder_score": <1-5>
}

Scoring guide:
- breadth_score: Were all key governance domains addressed (data, security, compliance, risk)?
- ambiguity_score: Were vague requirements clarified into concrete, actionable specifications?
- risk_id_score: Were relevant risks identified and documented with appropriate specificity?
- stakeholder_score: Did relevant stakeholders contribute and is alignment evident in the context?`;

    const { text } = await generateText({
      model: anthropic("claude-haiku-4-5-20251001"),
      prompt,
      temperature: 0,
    });

    let scores: {
      breadth_score: number;
      ambiguity_score: number;
      risk_id_score: number;
      stakeholder_score: number;
    } | null = null;

    try {
      const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/```\s*$/i, "");
      scores = JSON.parse(cleaned);
    } catch {
      console.warn("[quality-evaluator] Could not parse intake score response:", text.slice(0, 200));
      return;
    }

    if (!scores) return;

    const dims = [
      scores.breadth_score,
      scores.ambiguity_score,
      scores.risk_id_score,
      scores.stakeholder_score,
    ];
    const mean = dims.reduce((a, b) => a + b, 0) / dims.length;
    const overallScore = (mean * 20).toFixed(2);

    await db.insert(intakeQualityScores).values({
      sessionId: event.entityId,
      enterpriseId: event.enterpriseId,
      overallScore,
      breadthScore: scores.breadth_score.toFixed(2),
      ambiguityScore: scores.ambiguity_score.toFixed(2),
      riskIdScore: scores.risk_id_score.toFixed(2),
      stakeholderScore: scores.stakeholder_score.toFixed(2),
      evaluatorModel: "claude-haiku-4-5-20251001",
    });
  } catch (err) {
    console.error("[quality-evaluator] Intake scoring failed (non-fatal):", err);
  }
}

// ── Register handlers ─────────────────────────────────────────────────────────

registerHandler(async (event: LifecycleEvent) => {
  // Fire-and-forget; errors caught inside each function
  if (event.type === "blueprint.status_changed") {
    void scoreBlueprintQuality(event);
  } else if (event.type === "intake.finalized") {
    void scoreIntakeQuality(event);
  }
});
