/**
 * Classification service — derives AgentType + IntakeRiskTier from Phase 1 context.
 *
 * Called fire-and-forget immediately after Phase 1 context is saved.
 * Results are written to intakeSessions.agentType / .riskTier and surfaced to
 * the designer in the classification header above the intake conversation.
 *
 * - riskTier: derived deterministically via EU AI Act mapping (zero LLM cost)
 * - agentType: single Haiku generateObject call using agentPurpose + context signals
 *
 * On any error, returns a safe default (medium / automation) so intake can continue.
 */

import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import type { IntakeContext, AgentType, IntakeRiskTier, IntakeClassification } from "@/lib/types/intake";
import { deriveRiskTierFromContext } from "@/lib/regulatory/classifier";

const AgentTypeSchema = z.enum([
  "automation",
  "decision-support",
  "autonomous",
  "data-access",
]);

const AGENT_TYPE_DESCRIPTIONS: Record<AgentType, string> = {
  "automation": "Executes predefined workflows or process orchestration with no direct human-facing output",
  "decision-support": "Analyzes data and presents recommendations or insights to human decision-makers",
  "autonomous": "Takes consequential actions (sends messages, modifies records, triggers processes) without human approval in the loop",
  "data-access": "Queries, retrieves, or summarizes data in a read-only capacity with no actuation",
};

const CLASSIFICATION_SYSTEM_PROMPT = `You are classifying an AI agent into exactly one of four functional types based on its purpose and context. Choose the type that best describes the agent's primary mode of operation.

Agent types:
- automation: Executes predefined workflows or process orchestration. No direct user-facing output. Examples: ETL pipelines, scheduled report generation, Slack notification bots, CI/CD automation, customer intake triage agents, IVR routing agents, intent classification pipelines.
- decision-support: Analyzes data and presents recommendations or analysis to a human who makes the final decision. Examples: risk scoring dashboards, medical diagnosis assistants, investment research tools.
- autonomous: Takes consequential real-world actions without human approval in the loop. Examples: autonomous trading agents, self-healing infrastructure agents, agents that send emails or modify customer records automatically.
- data-access: Read-only data retrieval and summarization. Queries databases or APIs but never writes, triggers, or modifies anything. Examples: internal search tools, document Q&A bots, analytics query assistants.

Classify based on the agent's primary purpose. If the agent does both analysis and action, prefer "autonomous" if it acts without approval, or "decision-support" if a human approves actions.`;

const SAFE_DEFAULT: IntakeClassification = {
  agentType: "automation",
  riskTier: "medium",
  rationale: "Could not classify — defaulted to medium risk.",
};

export async function classifyIntake(context: IntakeContext): Promise<IntakeClassification> {
  // Step 1: deterministic risk tier — no LLM call
  let riskTier: IntakeRiskTier;
  try {
    riskTier = deriveRiskTierFromContext(context);
  } catch {
    riskTier = "medium";
  }

  // Step 2: Haiku generateObject call for agentType
  let agentType: AgentType;
  let rationale: string;

  try {
    const result = await generateObject({
      model: anthropic("claude-haiku-4-5-20251001"),
      system: CLASSIFICATION_SYSTEM_PROMPT,
      prompt: `Classify this agent:

Purpose: ${context.agentPurpose}
Deployment: ${context.deploymentType}
Integrations: ${context.integrationTypes.join(", ") || "none"}
Data sensitivity: ${context.dataSensitivity}`,
      schema: z.object({
        agentType: AgentTypeSchema,
        rationale: z.string().describe("1–2 sentence explanation of why this type was chosen"),
      }),
    });

    agentType = result.object.agentType;
    rationale = result.object.rationale;
  } catch (err) {
    console.error("[classify] Haiku agentType classification failed:", err);
    return { ...SAFE_DEFAULT, riskTier };
  }

  // Append risk tier context to rationale for display
  const RISK_TIER_LABELS: Record<IntakeRiskTier, string> = {
    low: "low risk (internal, minimal data sensitivity)",
    medium: "medium risk (customer/partner-facing or confidential data)",
    high: "high risk (customer-facing with PII/confidential data)",
    critical: "critical risk (regulated scope or HIPAA/FINRA customer-facing)",
  };

  const fullRationale = `${rationale} Classified as ${RISK_TIER_LABELS[riskTier]} based on deployment type and data sensitivity.`;

  // Validate rationale length — truncate if needed
  const displayRationale = fullRationale.length > 300
    ? fullRationale.slice(0, 297) + "..."
    : fullRationale;

  return { agentType, riskTier, rationale: displayRationale };
}

export { AgentTypeSchema };
export const RiskTierSchema = z.enum(["low", "medium", "high", "critical"]);
