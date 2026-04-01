import { describe, it, expect } from "vitest";
import { detectExpertiseLevel, selectIntakeModel } from "../model-selector";

// ── detectExpertiseLevel ────────────────────────────────────────────────────

describe("detectExpertiseLevel", () => {
  it("returns 'adaptive' for empty messages array", () => {
    expect(detectExpertiseLevel([])).toBe("adaptive");
  });

  it("returns 'expert' with 3+ technical vocabulary hits", () => {
    const messages = [
      "I need an API endpoint with OAuth authentication and JWT tokens for webhook integration",
    ];
    expect(detectExpertiseLevel(messages)).toBe("expert");
  });

  it("returns 'expert' with 1 tech hit and avg length > 100", () => {
    const messages = [
      "I need an API " + "x".repeat(100), // > 100 chars, 1 tech hit (api)
    ];
    expect(detectExpertiseLevel(messages)).toBe("expert");
  });

  it("returns 'guided' when uncertainty phrases detected", () => {
    const messages = ["I'm not sure what kind of agent I need, can you help me figure it out?"];
    expect(detectExpertiseLevel(messages)).toBe("guided");
  });

  it("returns 'guided' for very short messages with no vocabulary", () => {
    const messages = ["yes", "ok", "sure"]; // avg length < 40, no tech/biz
    expect(detectExpertiseLevel(messages)).toBe("guided");
  });

  it("returns 'adaptive' for moderate business vocabulary", () => {
    const messages = [
      "We need a customer workflow automation for our approval process with notifications",
    ];
    const result = detectExpertiseLevel(messages);
    // Business vocab + decent length but no strong tech → adaptive
    expect(result).toBe("adaptive");
  });
});

// ── selectIntakeModel ───────────────────────────────────────────────────────

describe("selectIntakeModel", () => {
  const baseCtx = {
    messageCount: 5,
    lastUserText: "add a search tool",
    context: null,
    payload: {},
    expertiseLevel: null as null,
  };

  it("returns Sonnet for turn 1 (messageCount <= 1)", () => {
    const result = selectIntakeModel({ ...baseCtx, messageCount: 1 });
    expect(result).toContain("sonnet");
  });

  it("returns Sonnet when payload is complete (identity + tools)", () => {
    const result = selectIntakeModel({
      ...baseCtx,
      payload: {
        identity: { name: "Bot" },
        capabilities: { tools: [{ name: "search", type: "api" as const }] },
      },
    });
    expect(result).toContain("sonnet");
  });

  it("returns Sonnet for finalization keywords", () => {
    const keywords = ["finalize", "mark complete", "we're done", "nothing else to add"];
    for (const keyword of keywords) {
      const result = selectIntakeModel({ ...baseCtx, lastUserText: keyword });
      expect(result).toContain("sonnet");
    }
  });

  it("returns Sonnet for governance/regulatory keywords", () => {
    const keywords = ["policy", "compliance", "FINRA", "HIPAA", "audit", "PII"];
    for (const keyword of keywords) {
      const result = selectIntakeModel({ ...baseCtx, lastUserText: keyword });
      expect(result).toContain("sonnet");
    }
  });

  it("returns Sonnet for guided mode early turns", () => {
    const result = selectIntakeModel({
      ...baseCtx,
      messageCount: 4,
      expertiseLevel: "guided" as const,
      lastUserText: "ok",
    });
    expect(result).toContain("sonnet");
  });

  it("returns Haiku for guided mode late turns (> 6)", () => {
    const result = selectIntakeModel({
      ...baseCtx,
      messageCount: 8,
      expertiseLevel: "guided" as const,
      lastUserText: "add a tool called emailer",
    });
    expect(result).toContain("haiku");
  });

  it("returns Haiku for generic messages", () => {
    const result = selectIntakeModel({
      ...baseCtx,
      lastUserText: "it should send emails to customers",
    });
    expect(result).toContain("haiku");
  });

  it("returns Haiku for empty user text", () => {
    const result = selectIntakeModel({ ...baseCtx, lastUserText: "" });
    expect(result).toContain("haiku");
  });
});
