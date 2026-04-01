import { describe, it, expect } from "vitest";
import { computeReadinessScore } from "../readiness";
import type { IntakePayload } from "@/lib/types/intake";

// ── Fixtures ────────────────────────────────────────────────────────────────

function makePayload(overrides: Partial<IntakePayload> = {}): IntakePayload {
  return { ...overrides };
}

const FULL_PAYLOAD: IntakePayload = {
  identity: { name: "TestBot", description: "A test agent" },
  capabilities: {
    tools: [{ name: "search", type: "api" as const }],
    instructions: "Be helpful and accurate.",
    knowledge_sources: [{ name: "docs", type: "file" as const }],
  },
  constraints: {
    allowed_domains: ["example.com"],
    denied_actions: ["delete_data"],
  },
  governance: {
    policies: [
      { name: "Safety", type: "safety" as const, rules: [] },
      { name: "Compliance", type: "compliance" as const, rules: [] },
      { name: "Data Handling", type: "data_handling" as const, rules: [] },
      { name: "Access Control", type: "access_control" as const, rules: [] },
    ],
    audit: { log_interactions: true, retention_days: 90, pii_redaction: true },
  },
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe("computeReadinessScore", () => {
  it("returns 15 for empty payload (specificity starts at 15)", () => {
    const result = computeReadinessScore({}, null);
    expect(result.score).toBe(15); // 0 section + 0 governance + 15 specificity
    expect(result.label).toBe("building"); // 15 >= 15 threshold
    expect(result.breakdown.sectionCoverage).toBe(0);
    expect(result.breakdown.specificity).toBe(15);
  });

  it("scores identity at 14 points when name + description present", () => {
    const payload = makePayload({
      identity: { name: "Bot", description: "A bot" },
    });
    const result = computeReadinessScore(payload, null);
    expect(result.breakdown.sectionCoverage).toBe(14);
  });

  it("scores tools at 14 points when at least one tool present", () => {
    const payload = makePayload({
      capabilities: { tools: [{ name: "search", type: "api" as const }] },
    });
    const result = computeReadinessScore(payload, null);
    expect(result.breakdown.sectionCoverage).toBe(14);
  });

  it("caps section coverage at 50", () => {
    const result = computeReadinessScore(FULL_PAYLOAD, null);
    expect(result.breakdown.sectionCoverage).toBeLessThanOrEqual(50);
  });

  it("gives low-risk tier automatic 35 points for governance depth", () => {
    const result = computeReadinessScore({}, "low");
    expect(result.breakdown.governanceDepth).toBe(35);
  });

  it("gives 7 points per distinct policy type for medium+ risk", () => {
    const payload = makePayload({
      governance: {
        policies: [
          { name: "P1", type: "safety" as const, rules: [] },
          { name: "P2", type: "compliance" as const, rules: [] },
        ],
      },
    });
    const result = computeReadinessScore(payload, "medium");
    expect(result.breakdown.governanceDepth).toBe(14); // 2 types × 7
  });

  it("counts audit config as audit policy type", () => {
    const payload = makePayload({
      governance: {
        audit: { log_interactions: true, retention_days: 30 },
      },
    });
    const result = computeReadinessScore(payload, "medium");
    expect(result.breakdown.governanceDepth).toBe(7); // 1 type (audit)
  });

  it("caps governance depth at 35", () => {
    const result = computeReadinessScore(FULL_PAYLOAD, "medium");
    expect(result.breakdown.governanceDepth).toBeLessThanOrEqual(35);
  });

  it("starts specificity at 15 with no flags", () => {
    const result = computeReadinessScore({}, null);
    expect(result.breakdown.specificity).toBe(15);
  });

  it("deducts 5 per unresolved ambiguity flag", () => {
    const payload = makePayload({
      _flags: [
        { id: "f1", field: "tools", description: "Unclear scope", userStatement: "maybe search", flaggedAt: new Date().toISOString(), resolved: false },
        { id: "f2", field: "constraints", description: "Contradictory", userStatement: "both allow and deny", flaggedAt: new Date().toISOString(), resolved: false },
      ],
    });
    const result = computeReadinessScore(payload, null);
    expect(result.breakdown.specificity).toBe(5); // 15 - 2×5
  });

  it("floors specificity at 0", () => {
    const payload = makePayload({
      _flags: [
        { id: "f1", field: "a", description: "x", userStatement: "u1", flaggedAt: "", resolved: false },
        { id: "f2", field: "b", description: "y", userStatement: "u2", flaggedAt: "", resolved: false },
        { id: "f3", field: "c", description: "z", userStatement: "u3", flaggedAt: "", resolved: false },
        { id: "f4", field: "d", description: "w", userStatement: "u4", flaggedAt: "", resolved: false },
      ],
    });
    const result = computeReadinessScore(payload, null);
    expect(result.breakdown.specificity).toBe(0); // 15 - 4×5 = -5 → clamped to 0
  });

  it("returns 'building' label for score 15-49", () => {
    const payload = makePayload({
      identity: { name: "Bot", description: "A bot" },
    });
    const result = computeReadinessScore(payload, null);
    // 14 (identity) + 0 (govDepth medium, no policies) + 15 (specificity) = 29
    expect(result.label).toBe("building");
  });

  it("returns 'ready' label for score >= 80", () => {
    const result = computeReadinessScore(FULL_PAYLOAD, "low");
    // Should score high: all sections + auto 35 governance + 15 specificity
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.label).toBe("ready");
  });

  it("caps total score at 100", () => {
    const result = computeReadinessScore(FULL_PAYLOAD, "low");
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("defaults null riskTier to medium behavior", () => {
    const withNull = computeReadinessScore(FULL_PAYLOAD, null);
    const withMedium = computeReadinessScore(FULL_PAYLOAD, "medium");
    expect(withNull.breakdown.governanceDepth).toBe(withMedium.breakdown.governanceDepth);
  });
});
