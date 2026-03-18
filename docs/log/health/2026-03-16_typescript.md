# TypeScript Health — 2026-03-16

## Result: FAIL
Errors: 12 | Warnings: 0 | vs prior: (first run)

## Trend
First run — baseline established; 12 errors in test files only, no production source affected.

## Actionable Task Queue

### TS-20260316-001: Remove unknown `enabled` property from `validConfig` in deploy-route test
Priority: P1
Effort: XS
File: `src/__tests__/agentcore/deploy-route.test.ts:61`
Problem: `error TS2353: Object literal may only specify known properties, and 'enabled' does not exist in type 'AgentCoreConfig'.` — `AgentCoreConfig` (defined in `src/lib/settings/types.ts:166`) only has `region`, `agentResourceRoleArn`, `foundationModel`, `guardrailId?`, `guardrailVersion?`. The `enabled` key was never part of the interface.
Fix:
```typescript
// Replace lines 60-65:
// OLD:
const validConfig: AgentCoreConfig = {
  enabled: true,
  region: "us-east-1",
  agentResourceRoleArn: "arn:aws:iam::123456789012:role/BedrockAgentRole",
  foundationModel: "anthropic.claude-3-5-sonnet-20241022-v2:0",
};

// NEW:
const validConfig: AgentCoreConfig = {
  region: "us-east-1",
  agentResourceRoleArn: "arn:aws:iam::123456789012:role/BedrockAgentRole",
  foundationModel: "anthropic.claude-3-5-sonnet-20241022-v2:0",
};
```
Verify: `npx tsc --noEmit` produces 0 errors for this file

---

### TS-20260316-002: Guard against possibly-undefined `tags` in translate tests
Priority: P1
Effort: S
File: `src/__tests__/agentcore/translate.test.ts:283–315`
Problem: `error TS18048: 'result.tags' is possibly 'undefined'.` — `BedrockAgentDefinition.tags` is typed as `tags?: Record<string, string>` (optional). All 11 errors are test assertions that access `result.tags.someKey` without first asserting that `tags` is defined.
Fix:
```typescript
// In each affected test block, add an assertion before accessing tag keys.

// Test: "always includes managed-by, abpId, and abpVersion tags" (lines 283-285)
// OLD:
expect(result.tags["managed-by"]).toBe("intellios");
expect(result.tags.abpId).toBeTruthy();
expect(result.tags.abpVersion).toBeTruthy();
// NEW:
expect(result.tags).toBeDefined();
expect(result.tags!["managed-by"]).toBe("intellios");
expect(result.tags!.abpId).toBeTruthy();
expect(result.tags!.abpVersion).toBeTruthy();

// Test: "includes all ownership fields when present" (lines 298-301)
// OLD:
expect(result.tags.businessUnit).toBe("Risk");
expect(result.tags.costCenter).toBe("CC-001");
expect(result.tags.environment).toBe("production");
expect(result.tags.dataClassification).toBe("confidential");
// NEW:
expect(result.tags).toBeDefined();
expect(result.tags!.businessUnit).toBe("Risk");
expect(result.tags!.costCenter).toBe("CC-001");
expect(result.tags!.environment).toBe("production");
expect(result.tags!.dataClassification).toBe("confidential");

// Test: "omits ownership tags when ownership block is absent" (lines 307-309)
// OLD:
expect(result.tags.businessUnit).toBeUndefined();
expect(result.tags.costCenter).toBeUndefined();
expect(result.tags.environment).toBeUndefined();
// NEW:
expect(result.tags).toBeDefined();
expect(result.tags!.businessUnit).toBeUndefined();
expect(result.tags!.costCenter).toBeUndefined();
expect(result.tags!.environment).toBeUndefined();

// Test: "includes enterpriseId tag when metadata.enterprise_id is present" (line 315)
// OLD:
expect(result.tags.enterpriseId).toBe("ent-001");
// NEW:
expect(result.tags).toBeDefined();
expect(result.tags!.enterpriseId).toBe("ent-001");
```
Verify: `npx tsc --noEmit` produces 0 errors
