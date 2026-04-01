import { describe, it, expect } from "vitest";
import { getExpectedContributionDomains, getMissingContributionDomains } from "../coverage";
import type { IntakeContext, StakeholderContribution } from "@/lib/types/intake";

// ── Fixtures ────────────────────────────────────────────────────────────────

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

// ── getExpectedContributionDomains ──────────────────────────────────────────

describe("getExpectedContributionDomains", () => {
  it("returns empty array for low risk tier", () => {
    const context = makeContext({
      dataSensitivity: "pii",
      regulatoryScope: ["HIPAA"],
    });
    const result = getExpectedContributionDomains(context, "low");
    expect(result).toHaveLength(0);
  });

  it("adds compliance for FINRA regulatory scope", () => {
    const context = makeContext({ regulatoryScope: ["FINRA"] });
    const result = getExpectedContributionDomains(context, "medium");
    expect(result).toContain("compliance");
  });

  it("adds compliance + legal for GDPR", () => {
    const context = makeContext({ regulatoryScope: ["GDPR"] });
    const result = getExpectedContributionDomains(context, "medium");
    expect(result).toContain("compliance");
    expect(result).toContain("legal");
  });

  it("adds compliance + security for PCI-DSS", () => {
    const context = makeContext({ regulatoryScope: ["PCI-DSS"] });
    const result = getExpectedContributionDomains(context, "medium");
    expect(result).toContain("compliance");
    expect(result).toContain("security");
  });

  it("adds compliance + security + legal for PII data sensitivity", () => {
    const context = makeContext({ dataSensitivity: "pii" });
    const result = getExpectedContributionDomains(context, "medium");
    expect(result).toContain("compliance");
    expect(result).toContain("security");
    expect(result).toContain("legal");
  });

  it("adds security for confidential data", () => {
    const context = makeContext({ dataSensitivity: "confidential" });
    const result = getExpectedContributionDomains(context, "medium");
    expect(result).toContain("security");
  });

  it("adds legal + business for customer-facing deployment", () => {
    const context = makeContext({ deploymentType: "customer-facing" });
    const result = getExpectedContributionDomains(context, "medium");
    expect(result).toContain("legal");
    expect(result).toContain("business");
  });

  it("adds security + it for external APIs", () => {
    const context = makeContext({ integrationTypes: ["external-apis"] });
    const result = getExpectedContributionDomains(context, "medium");
    expect(result).toContain("security");
    expect(result).toContain("it");
  });

  it("adds risk for critical tier", () => {
    const context = makeContext({});
    const result = getExpectedContributionDomains(context, "critical");
    expect(result).toContain("risk");
  });

  it("deduplicates domains when multiple signals point to same domain", () => {
    const context = makeContext({
      dataSensitivity: "pii",
      regulatoryScope: ["HIPAA"], // both add compliance
    });
    const result = getExpectedContributionDomains(context, "high");
    const complianceCount = result.filter((d) => d === "compliance").length;
    expect(complianceCount).toBe(1);
  });

  it("returns empty for internal-only public data with no regulatory scope", () => {
    const context = makeContext(); // all defaults
    const result = getExpectedContributionDomains(context, "medium");
    expect(result).toHaveLength(0);
  });
});

// ── getMissingContributionDomains ───────────────────────────────────────────

describe("getMissingContributionDomains", () => {
  it("returns all expected domains when no contributions exist", () => {
    const context = makeContext({ dataSensitivity: "pii" });
    const result = getMissingContributionDomains(context, [], "medium");
    const expected = getExpectedContributionDomains(context, "medium");
    expect(result).toEqual(expected);
  });

  it("returns empty when all expected domains are covered", () => {
    const context = makeContext({ dataSensitivity: "pii" });
    const expected = getExpectedContributionDomains(context, "medium");
    const contributions: StakeholderContribution[] = expected.map((domain) => ({
      id: domain,
      sessionId: "test",
      domain,
      contributorName: "Test User",
      fields: {},
      createdAt: new Date().toISOString(),
    }));
    const result = getMissingContributionDomains(context, contributions, "medium");
    expect(result).toHaveLength(0);
  });

  it("filters out covered domains", () => {
    const context = makeContext({
      dataSensitivity: "pii",
      deploymentType: "customer-facing",
    });
    const contributions: StakeholderContribution[] = [
      { id: "1", sessionId: "t", domain: "compliance", contributorName: "A", fields: {}, createdAt: "" },
    ];
    const result = getMissingContributionDomains(context, contributions, "medium");
    expect(result).not.toContain("compliance");
    expect(result.length).toBeGreaterThan(0); // other domains still missing
  });
});
