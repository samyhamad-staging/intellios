import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { ABPContentSchema, ABPContent, ABP } from "@/lib/types/abp";
import { IntakePayload } from "@/lib/types/intake";
import { GENERATION_SYSTEM_PROMPT } from "./system-prompt";
import { randomUUID } from "crypto";

/**
 * Generate an initial Agent Blueprint Package from a completed intake payload.
 * Claude generates the content sections; system metadata is filled in here.
 */
export async function generateBlueprint(
  intake: IntakePayload,
  sessionId: string
): Promise<ABP> {
  const { object: content } = await generateObject({
    model: anthropic("claude-sonnet-4-20250514"),
    schema: ABPContentSchema,
    system: GENERATION_SYSTEM_PROMPT,
    prompt: `Generate a complete Agent Blueprint Package from this intake data:\n\n${JSON.stringify(intake, null, 2)}`,
  });

  return assembleABP(content, sessionId);
}

/**
 * Regenerate an ABP applying a natural-language change request.
 * The full current blueprint and original intake are provided for context.
 */
export async function refineBlueprint(
  current: ABP,
  changeRequest: string,
  intake: IntakePayload
): Promise<ABP> {
  const { object: content } = await generateObject({
    model: anthropic("claude-sonnet-4-20250514"),
    schema: ABPContentSchema,
    system: GENERATION_SYSTEM_PROMPT,
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
