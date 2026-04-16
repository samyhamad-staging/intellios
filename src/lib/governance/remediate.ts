/**
 * Claude-powered remediation suggestions for governance violations.
 * Batches all violations into a single generateObject call to minimize API cost.
 */

import { resilientGenerateObject } from "@/lib/ai/resilient-generate";
import { models } from "@/lib/ai/config";
import { z } from "zod";
import { ABP } from "@/lib/types/abp";
import { Violation } from "./types";
import { logger, serializeError } from "@/lib/logger";

const RemediationSchema = z.object({
  suggestions: z.array(
    z.object({
      index: z.number().describe("Zero-based index of the violation in the input array"),
      suggestion: z.string().describe("Specific, actionable fix for this violation"),
    })
  ),
});

/**
 * Enriches violations with Claude-generated remediation suggestions.
 * Returns the same violations array with `suggestion` populated.
 * If the call fails, violations are returned with suggestion = null.
 */
export async function addRemediationSuggestions(
  abp: ABP,
  violations: Violation[]
): Promise<Violation[]> {
  if (violations.length === 0) return violations;

  const violationDescriptions = violations.map((v, i) => ({
    index: i,
    policy: v.policyName,
    rule: v.ruleId,
    field: v.field,
    operator: v.operator,
    severity: v.severity,
    message: v.message,
  }));

  const abpSummary = {
    identity: abp.identity,
    capabilities: {
      tools: abp.capabilities.tools,
      hasInstructions: !!abp.capabilities.instructions,
      instructionLength: abp.capabilities.instructions?.length ?? 0,
      knowledgeSourceCount: abp.capabilities.knowledge_sources?.length ?? 0,
    },
    constraints: abp.constraints,
    governance: abp.governance,
  };

  try {
    const { object } = await resilientGenerateObject({
      model: models.haiku,
      schema: RemediationSchema,
      system: `You are a governance advisor for enterprise AI agents.
Given an Agent Blueprint Package and a list of governance violations, provide specific, actionable remediation suggestions.
Each suggestion should tell the agent designer exactly what to add or change to fix the violation.
Be concrete and specific — reference the actual field names and values that need to change.`,
      prompt: `Agent Blueprint Summary:
${JSON.stringify(abpSummary, null, 2)}

Governance violations to remediate:
${JSON.stringify(violationDescriptions, null, 2)}

For each violation, provide a specific suggestion for how to fix it.`,
    });

    const enriched = violations.map((v, i) => {
      const match = object.suggestions.find((s) => s.index === i);
      return { ...v, suggestion: match?.suggestion ?? null };
    });

    return enriched;
  } catch (error) {
    logger.error("governance.remediation.failed", { err: serializeError(error) });
    // Return violations without suggestions rather than failing the whole validation
    return violations;
  }
}
