import { describe, it, expect } from "vitest";
import { evaluatePolicies } from "../evaluate";
import type { GovernancePolicy, PolicyRule, Severity, RuleOperator } from "../types";

// ── Fixtures ────────────────────────────────────────────────────────────────

function makeRule(overrides: Partial<PolicyRule> = {}): PolicyRule {
  return {
    id: "rule-1",
    field: "identity.name",
    operator: "exists" as RuleOperator,
    severity: "error" as Severity,
    message: "Test rule failed",
    ...overrides,
  };
}

function makePolicy(rules: PolicyRule[], name = "Test Policy"): GovernancePolicy {
  return {
    id: "policy-1",
    name,
    type: "safety",
    enterpriseId: "ent-1",
    description: "Test",
    rules,
    enabled: true,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as unknown as GovernancePolicy;
}

// Minimal ABP for testing
function makeAbp(content: Record<string, unknown> = {}) {
  return {
    version: "1.0.0",
    metadata: { id: "test", agentId: "agent-1", version: 1, status: "draft", createdAt: "", createdBy: "" },
    identity: { name: "TestBot", description: "A test bot" },
    capabilities: {
      tools: [{ name: "search", type: "api" }, { name: "email", type: "api" }],
      instructions: "Be helpful",
      knowledge_sources: [],
    },
    constraints: { allowed_domains: ["example.com"], denied_actions: ["delete"] },
    governance: { policies: [], audit: { log_interactions: true } },
    ...content,
  } as never; // Trust ABP structure for tests
}

// ── Operator tests ──────────────────────────────────────────────────────────

describe("evaluatePolicies — operators", () => {
  it("exists: passes when field has value", () => {
    const violations = evaluatePolicies(makeAbp(), [
      makePolicy([makeRule({ field: "identity.name", operator: "exists" as RuleOperator })]),
    ]);
    expect(violations).toHaveLength(0);
  });

  it("exists: fails when field is missing", () => {
    const abp = makeAbp({ identity: { description: "no name" } });
    const violations = evaluatePolicies(abp, [
      makePolicy([makeRule({ field: "identity.name", operator: "exists" as RuleOperator })]),
    ]);
    expect(violations).toHaveLength(1);
    expect(violations[0].operator).toBe("exists");
  });

  it("not_exists: passes when field is empty", () => {
    const abp = makeAbp({ identity: { name: "", description: "Bot" } });
    const violations = evaluatePolicies(abp, [
      makePolicy([makeRule({ field: "identity.name", operator: "not_exists" as RuleOperator })]),
    ]);
    expect(violations).toHaveLength(0);
  });

  it("equals: passes on exact match", () => {
    const violations = evaluatePolicies(makeAbp(), [
      makePolicy([makeRule({ field: "identity.name", operator: "equals" as RuleOperator, value: "TestBot" })]),
    ]);
    expect(violations).toHaveLength(0);
  });

  it("equals: fails on mismatch", () => {
    const violations = evaluatePolicies(makeAbp(), [
      makePolicy([makeRule({ field: "identity.name", operator: "equals" as RuleOperator, value: "OtherBot" })]),
    ]);
    expect(violations).toHaveLength(1);
  });

  it("contains: passes when string includes value", () => {
    const violations = evaluatePolicies(makeAbp(), [
      makePolicy([makeRule({ field: "capabilities.instructions", operator: "contains" as RuleOperator, value: "helpful" })]),
    ]);
    expect(violations).toHaveLength(0);
  });

  it("contains: passes when array includes value", () => {
    const violations = evaluatePolicies(makeAbp(), [
      makePolicy([makeRule({ field: "constraints.denied_actions", operator: "contains" as RuleOperator, value: "delete" })]),
    ]);
    expect(violations).toHaveLength(0);
  });

  it("contains: fails on non-match", () => {
    const violations = evaluatePolicies(makeAbp(), [
      makePolicy([makeRule({ field: "capabilities.instructions", operator: "contains" as RuleOperator, value: "xyz" })]),
    ]);
    expect(violations).toHaveLength(1);
  });

  it("not_contains: passes on non-string non-array", () => {
    const violations = evaluatePolicies(makeAbp(), [
      makePolicy([makeRule({ field: "identity.name", operator: "not_contains" as RuleOperator, value: "xyz" })]),
    ]);
    expect(violations).toHaveLength(0); // name is "TestBot", doesn't contain "xyz"
  });

  it("matches: passes when regex matches", () => {
    const violations = evaluatePolicies(makeAbp(), [
      makePolicy([makeRule({ field: "identity.name", operator: "matches" as RuleOperator, value: "^Test" })]),
    ]);
    expect(violations).toHaveLength(0);
  });

  it("matches: fails on invalid regex (returns false = violation)", () => {
    const violations = evaluatePolicies(makeAbp(), [
      makePolicy([makeRule({ field: "identity.name", operator: "matches" as RuleOperator, value: "[invalid" })]),
    ]);
    expect(violations).toHaveLength(1);
  });

  it("count_gte: passes when array length >= value", () => {
    const violations = evaluatePolicies(makeAbp(), [
      makePolicy([makeRule({ field: "capabilities.tools", operator: "count_gte" as RuleOperator, value: 2 })]),
    ]);
    expect(violations).toHaveLength(0);
  });

  it("count_gte: fails when array length < value", () => {
    const violations = evaluatePolicies(makeAbp(), [
      makePolicy([makeRule({ field: "capabilities.tools", operator: "count_gte" as RuleOperator, value: 5 })]),
    ]);
    expect(violations).toHaveLength(1);
  });

  it("count_gte: fails on non-array field", () => {
    const violations = evaluatePolicies(makeAbp(), [
      makePolicy([makeRule({ field: "identity.name", operator: "count_gte" as RuleOperator, value: 1 })]),
    ]);
    expect(violations).toHaveLength(1); // string, not array
  });

  it("includes_type: passes when array contains item with matching type", () => {
    const violations = evaluatePolicies(makeAbp(), [
      makePolicy([makeRule({ field: "capabilities.tools", operator: "includes_type" as RuleOperator, value: "api" })]),
    ]);
    expect(violations).toHaveLength(0);
  });

  it("includes_type: fails when no item has matching type", () => {
    const violations = evaluatePolicies(makeAbp(), [
      makePolicy([makeRule({ field: "capabilities.tools", operator: "includes_type" as RuleOperator, value: "mcp_server" })]),
    ]);
    expect(violations).toHaveLength(1);
  });

  it("not_includes_type: passes on non-array field", () => {
    const violations = evaluatePolicies(makeAbp(), [
      makePolicy([makeRule({ field: "identity.name", operator: "not_includes_type" as RuleOperator, value: "api" })]),
    ]);
    expect(violations).toHaveLength(0); // non-array → passes
  });

  it("unknown operator: passes (fail-open)", () => {
    const violations = evaluatePolicies(makeAbp(), [
      makePolicy([makeRule({ operator: "some_future_op" as RuleOperator })]),
    ]);
    expect(violations).toHaveLength(0);
  });
});

// ── Integration tests ───────────────────────────────────────────────────────

describe("evaluatePolicies — integration", () => {
  it("returns empty violations for empty policies", () => {
    expect(evaluatePolicies(makeAbp(), [])).toHaveLength(0);
  });

  it("evaluates all rules across multiple policies", () => {
    const policies = [
      makePolicy([
        makeRule({ id: "r1", field: "identity.name", operator: "exists" as RuleOperator }),
        makeRule({ id: "r2", field: "identity.persona", operator: "exists" as RuleOperator }), // will fail
      ]),
      makePolicy([
        makeRule({ id: "r3", field: "capabilities.tools", operator: "count_gte" as RuleOperator, value: 10 }), // will fail
      ]),
    ];
    const violations = evaluatePolicies(makeAbp(), policies);
    expect(violations).toHaveLength(2);
    expect(violations.map((v) => v.ruleId)).toContain("r2");
    expect(violations.map((v) => v.ruleId)).toContain("r3");
  });

  it("populates violation fields correctly", () => {
    const violations = evaluatePolicies(makeAbp(), [
      makePolicy(
        [makeRule({ id: "r1", field: "nonexistent.field", operator: "exists" as RuleOperator, severity: "warning" as Severity, message: "Must exist" })],
        "My Policy"
      ),
    ]);
    expect(violations).toHaveLength(1);
    expect(violations[0].policyName).toBe("My Policy");
    expect(violations[0].severity).toBe("warning");
    expect(violations[0].message).toBe("Must exist");
    expect(violations[0].suggestion).toBeNull();
  });

  it("resolves nested field paths correctly", () => {
    const violations = evaluatePolicies(makeAbp(), [
      makePolicy([makeRule({ field: "governance.audit.log_interactions", operator: "equals" as RuleOperator, value: true })]),
    ]);
    expect(violations).toHaveLength(0); // deep path resolution works
  });
});
