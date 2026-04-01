import { describe, it, expect } from "vitest";
import { computeDomainProgress, inferActiveDomain } from "../domains";
import type { IntakePayload, IntakeContext, IntakeRiskTier } from "@/lib/types/intake";
import type { ProbingTopic, DomainProgress } from "@/lib/types/intake-transparency";

// ── Fixtures ────────────────────────────────────────────────────────────────

function makePayload(overrides: Partial<IntakePayload> = {}): IntakePayload {
  return { ...overrides };
}

function makeContext(overrides: Partial<IntakeContext> = {}): IntakeContext {
  return {
    agentPurpose: "Test agent",
    deploymentType: "internal-only",
    dataSensitivity: "public",
    regulatoryScope: [],
    integrationTypes: [],
    stakeholders: [],
    ...overrides,
  };
}

function makeDomain(key: string, fillLevel: 0 | 1 | 2 | 3 | 4, required = false): DomainProgress {
  return {
    key,
    label: key,
    icon: "",
    fillLevel,
    status: fillLevel === 0 ? "empty" : fillLevel === 4 ? "rich" : "developing",
    itemCount: fillLevel,
    required,
  };
}

// ── computeDomainProgress ───────────────────────────────────────────────────

describe("computeDomainProgress", () => {
  it("returns 7 domains for empty payload", () => {
    const result = computeDomainProgress({}, null, null);
    expect(result).toHaveLength(7);
    expect(result.every((d) => d.fillLevel === 0)).toBe(true);
    expect(result.every((d) => d.status === "empty")).toBe(true);
  });

  it("marks identity and tools as always required", () => {
    const result = computeDomainProgress({}, null, null);
    const identity = result.find((d) => d.key === "identity")!;
    const tools = result.find((d) => d.key === "tools")!;
    expect(identity.required).toBe(true);
    expect(tools.required).toBe(true);
  });

  it("counts identity items correctly (name + description + persona + branding)", () => {
    const payload = makePayload({
      identity: { name: "Bot", description: "A bot", persona: "Friendly" },
    });
    const result = computeDomainProgress(payload, null, null);
    const identity = result.find((d) => d.key === "identity")!;
    expect(identity.itemCount).toBe(3);
    expect(identity.fillLevel).toBeGreaterThan(0);
  });

  it("counts tools from array length", () => {
    const payload = makePayload({
      capabilities: {
        tools: [
          { name: "search", type: "api" as const },
          { name: "email", type: "api" as const },
          { name: "db", type: "api" as const },
        ],
      },
    });
    const result = computeDomainProgress(payload, null, null);
    const tools = result.find((d) => d.key === "tools")!;
    expect(tools.itemCount).toBe(3);
  });

  it("buckets instructions by length", () => {
    // < 50 chars → 1 item
    const short = computeDomainProgress(
      makePayload({ capabilities: { instructions: "Be helpful." } }),
      null, null
    );
    expect(short.find((d) => d.key === "instructions")!.itemCount).toBe(1);

    // 200-499 chars → 3 items
    const medium = computeDomainProgress(
      makePayload({ capabilities: { instructions: "x".repeat(250) } }),
      null, null
    );
    expect(medium.find((d) => d.key === "instructions")!.itemCount).toBe(3);

    // 500+ chars → 4 items
    const long = computeDomainProgress(
      makePayload({ capabilities: { instructions: "x".repeat(500) } }),
      null, null
    );
    expect(long.find((d) => d.key === "instructions")!.itemCount).toBe(4);
  });

  it("counts distinct governance policy types, not raw count", () => {
    const payload = makePayload({
      governance: {
        policies: [
          { name: "P1", type: "safety" as const, rules: [] },
          { name: "P2", type: "safety" as const, rules: [] },
          { name: "P3", type: "compliance" as const, rules: [] },
        ],
      },
    });
    const result = computeDomainProgress(payload, null, null);
    const gov = result.find((d) => d.key === "governance")!;
    expect(gov.itemCount).toBe(2); // 2 distinct types, not 3 policies
  });

  it("counts audit config fields individually", () => {
    const payload = makePayload({
      governance: {
        audit: { log_interactions: true, retention_days: 90, pii_redaction: true },
      },
    });
    const result = computeDomainProgress(payload, null, null);
    const audit = result.find((d) => d.key === "audit")!;
    expect(audit.itemCount).toBe(3);
  });

  it("marks governance as required for medium+ risk with PII data", () => {
    const context = makeContext({ dataSensitivity: "pii" });
    const result = computeDomainProgress({}, context, "high");
    const gov = result.find((d) => d.key === "governance")!;
    expect(gov.required).toBe(true);
  });

  it("does not mark governance required for low risk", () => {
    const context = makeContext({ dataSensitivity: "pii" });
    const result = computeDomainProgress({}, context, "low");
    const gov = result.find((d) => d.key === "governance")!;
    expect(gov.required).toBe(false);
  });

  it("marks audit required when data sensitivity is regulated", () => {
    const context = makeContext({ dataSensitivity: "regulated" });
    const result = computeDomainProgress({}, context, "medium");
    const audit = result.find((d) => d.key === "audit")!;
    expect(audit.required).toBe(true);
  });

  it("marks instructions required for customer-facing deployment", () => {
    const context = makeContext({ deploymentType: "customer-facing" });
    const result = computeDomainProgress({}, context, "medium");
    const instructions = result.find((d) => d.key === "instructions")!;
    expect(instructions.required).toBe(true);
  });

  it("uses risk-tier-aware adequacy thresholds", () => {
    // Low risk: tools threshold is 1 → 1 tool = adequate (fillLevel 3)
    const lowResult = computeDomainProgress(
      makePayload({ capabilities: { tools: [{ name: "t", type: "api" as const }] } }),
      null, "low"
    );
    expect(lowResult.find((d) => d.key === "tools")!.fillLevel).toBeGreaterThanOrEqual(3);

    // Critical risk: tools threshold is 3 → 1 tool = started (fillLevel 1)
    const critResult = computeDomainProgress(
      makePayload({ capabilities: { tools: [{ name: "t", type: "api" as const }] } }),
      null, "critical"
    );
    expect(critResult.find((d) => d.key === "tools")!.fillLevel).toBeLessThanOrEqual(2);
  });

  it("defaults to medium risk tier when null", () => {
    const withNull = computeDomainProgress(makePayload(), null, null);
    const withMedium = computeDomainProgress(makePayload(), null, "medium");
    // Fill levels should be identical since null defaults to medium
    expect(withNull.map((d) => d.fillLevel)).toEqual(withMedium.map((d) => d.fillLevel));
  });
});

// ── inferActiveDomain ───────────────────────────────────────────────────────

describe("inferActiveDomain", () => {
  const allEmptyDomains: DomainProgress[] = [
    makeDomain("identity", 0, true),
    makeDomain("tools", 0, true),
    makeDomain("instructions", 0),
    makeDomain("knowledge", 0),
    makeDomain("constraints", 0),
    makeDomain("governance", 0),
    makeDomain("audit", 0),
  ];

  it("returns domain from most recent tool call", () => {
    const result = inferActiveDomain(
      ["set_agent_identity", "add_governance_policy"],
      [],
      allEmptyDomains
    );
    expect(result).toBe("governance"); // Last tool wins
  });

  it("skips unmapped tool names", () => {
    const result = inferActiveDomain(
      ["get_intake_summary", "mark_intake_complete"],
      [],
      allEmptyDomains
    );
    // Falls through to probing topics or lowest fill
    expect(result).not.toBeNull(); // Should hit lowest-fill fallback
  });

  it("returns domain from first uncovered mandatory topic", () => {
    const topics: ProbingTopic[] = [
      { topic: "Human oversight checkpoints", level: "mandatory", reason: "test", covered: false },
      { topic: "Rate limiting", level: "recommended", reason: "test", covered: false },
    ];
    const result = inferActiveDomain([], topics, allEmptyDomains);
    expect(result).toBe("governance"); // Human oversight → governance
  });

  it("skips covered probing topics", () => {
    const topics: ProbingTopic[] = [
      { topic: "Human oversight checkpoints", level: "mandatory", reason: "test", covered: true },
      { topic: "Rate limiting", level: "recommended", reason: "test", covered: false },
    ];
    const result = inferActiveDomain([], topics, allEmptyDomains);
    expect(result).toBe("constraints"); // Rate limiting → constraints
  });

  it("falls back to lowest-fill required domain", () => {
    const domains: DomainProgress[] = [
      makeDomain("identity", 3, true),
      makeDomain("tools", 1, true), // lowest fill, required
      makeDomain("instructions", 2),
      makeDomain("knowledge", 0),
      makeDomain("constraints", 0),
      makeDomain("governance", 0),
      makeDomain("audit", 0),
    ];
    const result = inferActiveDomain([], [], domains);
    expect(result).toBe("tools"); // lowest-fill required
  });

  it("returns null when all domains are rich", () => {
    const richDomains = allEmptyDomains.map((d) => ({ ...d, fillLevel: 4 as const }));
    const result = inferActiveDomain([], [], richDomains);
    expect(result).toBeNull();
  });

  it("prioritizes tool calls over probing topics", () => {
    const topics: ProbingTopic[] = [
      { topic: "PII masking scope", level: "mandatory", reason: "test", covered: false },
    ];
    const result = inferActiveDomain(["add_tool"], topics, allEmptyDomains);
    expect(result).toBe("tools"); // Tool call wins over probing topic
  });

  it("handles empty tool call names gracefully", () => {
    const result = inferActiveDomain([], [], allEmptyDomains);
    // Falls through to lowest-fill domain
    expect(result).not.toBeNull();
  });
});
