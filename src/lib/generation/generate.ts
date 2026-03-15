import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { ABPContentSchema, ABPContent, ABP } from "@/lib/types/abp";
import { IntakePayload, IntakeContext, IntakeClassification } from "@/lib/types/intake";
import { GovernancePolicy } from "@/lib/governance/types";
import { buildGenerationSystemPrompt } from "./system-prompt";
import { randomUUID } from "crypto";

/**
 * Generate an initial Agent Blueprint Package from a completed intake payload.
 * Claude generates the content sections; system metadata is filled in here.
 *
 * When enterprise governance policies are provided, the generation system prompt
 * includes a policy block so Claude can design the blueprint to satisfy them
 * proactively — reducing post-generation violation loops.
 */
export async function generateBlueprint(
  intake: IntakePayload,
  intakeContext: IntakeContext | null | undefined,
  classification: IntakeClassification | null | undefined,
  sessionId: string,
  policies?: GovernancePolicy[]
): Promise<ABP> {
  const { object: content } = await generateObject({
    model: anthropic("claude-sonnet-4-20250514"),
    schema: ABPContentSchema,
    system: buildGenerationSystemPrompt(policies, intakeContext ?? null, classification ?? null),
    prompt: `Generate a complete Agent Blueprint Package from this intake data:\n\n${JSON.stringify(intake, null, 2)}`,
  });

  return assembleABP(content, sessionId);
}

/**
 * Regenerate an ABP applying a natural-language change request.
 * The full current blueprint and original intake are provided for context.
 *
 * Policies are injected so Claude preserves governance compliance during
 * refinement and does not inadvertently drop required policy sections.
 */
export async function refineBlueprint(
  current: ABP,
  changeRequest: string,
  intake: IntakePayload,
  policies?: GovernancePolicy[]
): Promise<ABP> {
  const { object: content } = await generateObject({
    model: anthropic("claude-sonnet-4-20250514"),
    schema: ABPContentSchema,
    system: buildGenerationSystemPrompt(policies),
    prompt: `You are refining an existing Agent Blueprint Package.

Current blueprint:
${JSON.stringify({ identity: current.identity, capabilities: current.capabilities, constraints: current.constraints, governance: current.governance }, null, 2)}

Original intake data (for reference):
${JSON.stringify(intake, null, 2)}

Requested change:
${changeRequest}

Apply the requested change precisely. Keep all other sections unchanged unless the change logically affects them.`,
  });

  // Preserve original metadata id and created_at, update status if needed
  return {
    ...assembleABP(content, current.metadata.enterprise_id ?? "system"),
    metadata: {
      ...current.metadata,
      status: "draft",
    },
  };
}

// ─── Internal ────────────────────────────────────────────────────────────────

function assembleABP(content: ABPContent, createdBy: string): ABP {
  return {
    version: "1.0.0",
    metadata: {
      id: randomUUID(),
      created_at: new Date().toISOString(),
      created_by: createdBy,
      status: "draft",
      tags: content.tags,
    },
    identity: content.identity,
    capabilities: content.capabilities,
    constraints: content.constraints,
    governance: content.governance,
  };
}
