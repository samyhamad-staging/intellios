/**
 * Translation layer unit tests — Phase 33 AgentCore Confidence
 *
 * Tests translateAbpToBedrockAgent() and buildAgentCoreExportManifest().
 * Both are pure functions with no I/O or AWS dependency — deterministic
 * and safe to run in any environment.
 */

import { describe, it, expect } from "vitest";
import {
  translateAbpToBedrockAgent,
  buildAgentCoreExportManifest,
} from "@/lib/agentcore/translate";
import type { ABP } from "@/lib/types/abp";

// ─── Test fixtures ────────────────────────────────────────────────────────────

function makeAbp(overrides: Partial<ABP> = {}): ABP {
  return {
    version: "1.0.0",
    metadata: {
      id: "00000000-0000-0000-0000-000000000001",
      created_at: "2026-03-15T00:00:00.000Z",
      created_by: "test@example.com",
      status: "approved",
      enterprise_id: "ent-001",
    },
    identity: {
      name: "Test Agent",
      description: "A test agent for unit testing",
      persona: "You are a professional assistant.",
      ...overrides.identity,
    },
    capabilities: {
      tools: [],
      instructions:
        "You help users with their requests in a clear and concise manner.",
      ...overrides.capabilities,
    },
    constraints: {
      allowed_domains: [],
      denied_actions: [],
      ...overrides.constraints,
    },
    governance: {
      policies: [],
      audit: { log_interactions: false },
      ...overrides.governance,
    },
    ...overrides,
  };
}

// ─── A. Agent name sanitization ───────────────────────────────────────────────

describe("translateAbpToBedrockAgent — agent name", () => {
  it("preserves a clean name unchanged", () => {
    const abp = makeAbp({ identity: { name: "Risk Monitor", description: "desc" } });
    const result = translateAbpToBedrockAgent(abp);
    expect(result.agentName).toBe("Risk Monitor");
  });

  it("strips special characters not in [0-9a-zA-Z-_ ]", () => {
    const abp = makeAbp({ identity: { name: "Risk & Compliance AI (v2)", description: "desc" } });
    const result = translateAbpToBedrockAgent(abp);
    expect(result.agentName).toMatch(/^[0-9a-zA-Z\-_ ]+$/);
    expect(result.agentName).not.toContain("&");
    expect(result.agentName).not.toContain("(");
    expect(result.agentName).not.toContain(")");
  });

  it("does not truncate a name at exactly 100 chars", () => {
    const name = "A".repeat(100);
    const abp = makeAbp({ identity: { name, description: "desc" } });
    const result = translateAbpToBedrockAgent(abp);
    expect(result.agentName.length).toBeLessThanOrEqual(100);
    // Should not end with ellipsis since it fits exactly
    expect(result.agentName.endsWith("…")).toBe(false);
  });

  it("truncates a name exceeding 100 chars", () => {
    const name = "A".repeat(101);
    const abp = makeAbp({ identity: { name, description: "desc" } });
    const result = translateAbpToBedrockAgent(abp);
    expect(result.agentName.length).toBeLessThanOrEqual(100);
  });

  it("uses fallback when name is empty", () => {
    const abp = makeAbp({ identity: { name: "", description: "desc" } });
    const result = translateAbpToBedrockAgent(abp);
    expect(result.agentName).toBeTruthy();
    expect(result.agentName.length).toBeGreaterThan(0);
  });
});

// ─── B. Instruction building ──────────────────────────────────────────────────

describe("translateAbpToBedrockAgent — instruction building", () => {
  it("concatenates persona and instructions when both are ≥40 chars combined", () => {
    const persona = "You are a professional compliance assistant.";
    const instructions =
      "Review all submitted documents carefully and flag any policy violations.";
    const abp = makeAbp({
      identity: { name: "Agent", description: "desc", persona },
      capabilities: { tools: [], instructions },
    });
    const result = translateAbpToBedrockAgent(abp);
    // Combined content should be present (persona + instructions)
    expect(result.instruction).toContain("compliance assistant");
    expect(result.instruction).toContain("policy violations");
    // Should not use fallback text when real content is present
    expect(result.instruction).not.toBe(
      "You are a helpful AI agent. Follow the organization's policies and guidelines. " +
        "Be accurate, concise, and professional in all interactions."
    );
  });

  it("pads a short instruction rather than replacing it entirely", () => {
    // persona 18 chars + instructions 10 chars = 28 total (under 40-char minimum)
    const persona = "Short persona.";   // 14 chars
    const instructions = "Help users.";  // 11 chars
    const abp = makeAbp({
      identity: { name: "Agent", description: "desc", persona },
      capabilities: { tools: [], instructions },
    });
    const result = translateAbpToBedrockAgent(abp);
    // Original content must be preserved (not replaced by fallback)
    expect(result.instruction).toContain("Short persona");
    expect(result.instruction).toContain("Help users");
    // Must meet the 40-char minimum
    expect(result.instruction.length).toBeGreaterThanOrEqual(40);
  });

  it("uses FALLBACK_INSTRUCTION when both persona and instructions are empty", () => {
    const abp = makeAbp({
      identity: { name: "Agent", description: "desc", persona: "" },
      capabilities: { tools: [], instructions: "" },
    });
    const result = translateAbpToBedrockAgent(abp);
    expect(result.instruction.length).toBeGreaterThanOrEqual(40);
    // Must contain fallback text
    expect(result.instruction).toContain("helpful AI agent");
  });

  it("uses FALLBACK_INSTRUCTION when persona and instructions are absent", () => {
    const abp: ABP = {
      ...makeAbp(),
      identity: { name: "Agent", description: "desc" }, // no persona
      capabilities: { tools: [] }, // no instructions
    };
    const result = translateAbpToBedrockAgent(abp);
    expect(result.instruction.length).toBeGreaterThanOrEqual(40);
    expect(result.instruction).toContain("helpful AI agent");
  });

  it("does not truncate instructions at exactly 4000 chars", () => {
    const instructions = "A".repeat(4000);
    const abp = makeAbp({
      identity: { name: "Agent", description: "desc", persona: undefined },
      capabilities: { tools: [], instructions },
    });
    const result = translateAbpToBedrockAgent(abp);
    expect(result.instruction.length).toBe(4000);
  });

  it("truncates instructions exceeding 4000 chars", () => {
    const instructions = "A".repeat(4001);
    const abp = makeAbp({
      identity: { name: "Agent", description: "desc", persona: undefined },
      capabilities: { tools: [], instructions },
    });
    const result = translateAbpToBedrockAgent(abp);
    expect(result.instruction.length).toBe(4000);
  });

  it("includes both persona and instructions when instructions alone meet minimum", () => {
    const persona = "You are a specialist."; // 21 chars
    const instructions = "Answer all questions related to compliance thoroughly."; // 53 chars
    const abp = makeAbp({
      identity: { name: "Agent", description: "desc", persona },
      capabilities: { tools: [], instructions },
    });
    const result = translateAbpToBedrockAgent(abp);
    expect(result.instruction).toContain("specialist");
    expect(result.instruction).toContain("compliance");
  });
});

// ─── C. Action groups ─────────────────────────────────────────────────────────

describe("translateAbpToBedrockAgent — action groups", () => {
  it("produces an empty actionGroups array when ABP has no tools", () => {
    const abp = makeAbp({ capabilities: { tools: [], instructions: "Instructions for the agent to follow carefully." } });
    const result = translateAbpToBedrockAgent(abp);
    expect(result.actionGroups).toHaveLength(0);
  });

  it("produces one RETURN_CONTROL action group per tool", () => {
    const abp = makeAbp({
      capabilities: {
        tools: [
          { name: "search_web", type: "api", description: "Search the web" },
          { name: "send_email", type: "api", description: "Send an email" },
          { name: "create_ticket", type: "api", description: "Create a support ticket" },
        ],
        instructions: "Use the tools as needed.",
      },
    });
    const result = translateAbpToBedrockAgent(abp);
    expect(result.actionGroups).toHaveLength(3);
    for (const ag of result.actionGroups) {
      expect(ag.actionGroupExecutor.customControl).toBe("RETURN_CONTROL");
    }
  });

  it("converts tool name spaces to underscores in action group name", () => {
    const abp = makeAbp({
      capabilities: {
        tools: [{ name: "search web content", type: "api", description: "Search" }],
        instructions: "Use tools as needed to help users.",
      },
    });
    const result = translateAbpToBedrockAgent(abp);
    expect(result.actionGroups[0].actionGroupName).toMatch(/^[a-zA-Z0-9_-]+$/);
    expect(result.actionGroups[0].actionGroupName).not.toContain(" ");
  });

  it("generates a default description for tools with no description", () => {
    const abp = makeAbp({
      capabilities: {
        tools: [{ name: "my_tool", type: "function" }], // no description
        instructions: "Use the tool when appropriate for the user request.",
      },
    });
    const result = translateAbpToBedrockAgent(abp);
    expect(result.actionGroups[0].description).toBeTruthy();
    expect(result.actionGroups[0].description!.length).toBeGreaterThan(0);
  });
});

// ─── D. Memory configuration ──────────────────────────────────────────────────

describe("translateAbpToBedrockAgent — memory configuration", () => {
  it("enables SESSION_SUMMARY memory when log_interactions is true", () => {
    const abp = makeAbp({
      governance: {
        policies: [],
        audit: { log_interactions: true },
      },
    });
    const result = translateAbpToBedrockAgent(abp);
    expect(result.memoryConfiguration).toBeDefined();
    expect(result.memoryConfiguration!.enabledMemoryTypes).toContain("SESSION_SUMMARY");
  });

  it("omits memoryConfiguration when log_interactions is false", () => {
    const abp = makeAbp({
      governance: {
        policies: [],
        audit: { log_interactions: false },
      },
    });
    const result = translateAbpToBedrockAgent(abp);
    expect(result.memoryConfiguration).toBeUndefined();
  });

  it("omits memoryConfiguration when audit block is absent", () => {
    const abp: ABP = {
      ...makeAbp(),
      governance: { policies: [] }, // no audit block
    };
    const result = translateAbpToBedrockAgent(abp);
    expect(result.memoryConfiguration).toBeUndefined();
  });
});

// ─── E. Tags ──────────────────────────────────────────────────────────────────

describe("translateAbpToBedrockAgent — tags", () => {
  it("always includes managed-by, abpId, and abpVersion tags", () => {
    const abp = makeAbp();
    const result = translateAbpToBedrockAgent(abp);
    expect(result.tags!["managed-by"]).toBe("intellios");
    expect(result.tags!.abpId).toBeTruthy();
    expect(result.tags!.abpVersion).toBeTruthy();
  });

  it("includes all ownership fields when present", () => {
    const abp = makeAbp({
      ownership: {
        businessUnit: "Risk",
        costCenter: "CC-001",
        deploymentEnvironment: "production",
        dataClassification: "confidential",
      },
    });
    const result = translateAbpToBedrockAgent(abp);
    expect(result.tags!.businessUnit).toBe("Risk");
    expect(result.tags!.costCenter).toBe("CC-001");
    expect(result.tags!.environment).toBe("production");
    expect(result.tags!.dataClassification).toBe("confidential");
  });

  it("omits ownership tags when ownership block is absent", () => {
    const abp: ABP = { ...makeAbp(), ownership: undefined };
    const result = translateAbpToBedrockAgent(abp);
    expect(result.tags!.businessUnit).toBeUndefined();
    expect(result.tags!.costCenter).toBeUndefined();
    expect(result.tags!.environment).toBeUndefined();
  });

  it("includes enterpriseId tag when metadata.enterprise_id is present", () => {
    const abp = makeAbp();
    const result = translateAbpToBedrockAgent(abp);
    expect(result.tags!.enterpriseId).toBe("ent-001");
  });
});

// ─── F. Options — guardrail + foundation model ───────────────────────────────

describe("translateAbpToBedrockAgent — options", () => {
  it("sets guardrailConfiguration when guardrailId and guardrailVersion are provided", () => {
    const abp = makeAbp();
    const result = translateAbpToBedrockAgent(abp, {
      guardrailId: "gr-abc123",
      guardrailVersion: "1",
    });
    expect(result.guardrailConfiguration).toBeDefined();
    expect(result.guardrailConfiguration!.guardrailIdentifier).toBe("gr-abc123");
    expect(result.guardrailConfiguration!.guardrailVersion).toBe("1");
  });

  it("omits guardrailConfiguration when neither guardrailId nor guardrailVersion are provided", () => {
    const abp = makeAbp();
    const result = translateAbpToBedrockAgent(abp);
    expect(result.guardrailConfiguration).toBeUndefined();
  });

  it("omits guardrailConfiguration when only guardrailId is provided (no version)", () => {
    const abp = makeAbp();
    const result = translateAbpToBedrockAgent(abp, { guardrailId: "gr-abc123" });
    expect(result.guardrailConfiguration).toBeUndefined();
  });

  it("uses the default foundation model when none is provided", () => {
    const abp = makeAbp();
    const result = translateAbpToBedrockAgent(abp);
    expect(result.foundationModel).toBe("anthropic.claude-3-5-sonnet-20241022-v2:0");
  });

  it("overrides the foundation model when provided in options", () => {
    const abp = makeAbp();
    const result = translateAbpToBedrockAgent(abp, {
      foundationModel: "anthropic.claude-3-haiku-20240307-v1:0",
    });
    expect(result.foundationModel).toBe("anthropic.claude-3-haiku-20240307-v1:0");
  });

  it("uses the provided agentResourceRoleArn", () => {
    const arn = "arn:aws:iam::123456789012:role/MyBedrockRole";
    const abp = makeAbp();
    const result = translateAbpToBedrockAgent(abp, { agentResourceRoleArn: arn });
    expect(result.agentResourceRoleArn).toBe(arn);
  });

  it("uses placeholder ARN when agentResourceRoleArn is not provided", () => {
    const abp = makeAbp();
    const result = translateAbpToBedrockAgent(abp);
    expect(result.agentResourceRoleArn).toContain("ACCOUNT_ID");
  });
});

// ─── G. Export manifest ───────────────────────────────────────────────────────

describe("buildAgentCoreExportManifest", () => {
  it("returns manifestVersion 1.0", () => {
    const abp = makeAbp();
    const manifest = buildAgentCoreExportManifest(abp, {
      blueprintId: "bp-001",
      blueprintVersion: "1",
      exportedBy: "admin@example.com",
    });
    expect(manifest.manifestVersion).toBe("1.0");
  });

  it("returns a valid ISO timestamp in exportedAt", () => {
    const abp = makeAbp();
    const before = new Date();
    const manifest = buildAgentCoreExportManifest(abp, {
      blueprintId: "bp-001",
      blueprintVersion: "1",
      exportedBy: "admin@example.com",
    });
    const after = new Date();
    const exportedAt = new Date(manifest.exportedAt);
    expect(exportedAt.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
    expect(exportedAt.getTime()).toBeLessThanOrEqual(after.getTime() + 1000);
  });

  it("populates source fields correctly", () => {
    const abp = makeAbp();
    const manifest = buildAgentCoreExportManifest(abp, {
      blueprintId: "bp-001",
      blueprintVersion: "3",
      exportedBy: "samy@example.com",
    });
    expect(manifest.source.blueprintId).toBe("bp-001");
    expect(manifest.source.blueprintVersion).toBe("3");
    expect(manifest.source.exportedBy).toBe("samy@example.com");
    expect(manifest.source.abpVersion).toBe("1.0.0");
  });

  it("includes 6 deployment instruction steps", () => {
    const abp = makeAbp();
    const manifest = buildAgentCoreExportManifest(abp, {
      blueprintId: "bp-001",
      blueprintVersion: "1",
      exportedBy: "admin@example.com",
    });
    expect(manifest.deploymentInstructions).toHaveLength(6);
  });

  it("includes a placeholder ARN in createAgentRequest when none is supplied", () => {
    const abp = makeAbp();
    const manifest = buildAgentCoreExportManifest(abp, {
      blueprintId: "bp-001",
      blueprintVersion: "1",
      exportedBy: "admin@example.com",
    });
    expect(manifest.createAgentRequest.agentResourceRoleArn).toContain("ACCOUNT_ID");
  });

  it("uses the provided agentResourceRoleArn in createAgentRequest", () => {
    const abp = makeAbp();
    const arn = "arn:aws:iam::999999999999:role/TestRole";
    const manifest = buildAgentCoreExportManifest(abp, {
      blueprintId: "bp-001",
      blueprintVersion: "1",
      exportedBy: "admin@example.com",
      agentResourceRoleArn: arn,
    });
    expect(manifest.createAgentRequest.agentResourceRoleArn).toBe(arn);
  });

  it("embeds the correct tool count in deployment instructions", () => {
    const abp = makeAbp({
      capabilities: {
        tools: [
          { name: "tool_a", type: "api", description: "Tool A" },
          { name: "tool_b", type: "api", description: "Tool B" },
        ],
        instructions: "Use the tools to help users with their requests.",
      },
    });
    const manifest = buildAgentCoreExportManifest(abp, {
      blueprintId: "bp-001",
      blueprintVersion: "1",
      exportedBy: "admin@example.com",
    });
    const toolInstruction = manifest.deploymentInstructions.find((i) =>
      i.includes("action group")
    );
    expect(toolInstruction).toContain("2");
  });
});
