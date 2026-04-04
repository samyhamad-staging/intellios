# TypeScript Health — 2026-03-19

## Result: FAIL
Errors: 13 | Warnings: 0 | vs prior (2026-03-16): +1 regression

## Trend
Degrading — one new regression introduced since last audit; the two pre-existing test-file errors remain unresolved.

## Actionable Task Queue

### TS-20260319-001: Remove unknown `enabled` property from `validConfig` in deploy-route test
Priority: P1
Effort: XS
File: `src/__tests__/agentcore/deploy-route.test.ts:61`
Problem: `error TS2353: Object literal may only specify known properties, and 'enabled' does not exist in type 'AgentCoreConfig'.` — `AgentCoreConfig` only has `region`, `agentResourceRoleArn`, `foundationModel`, `guardrailId?`, `guardrailVersion?`. The `enabled` key was never part of the interface.
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

### TS-20260319-002: Guard against possibly-undefined `tags` in translate tests
Priority: P1
Effort: S
File: `src/__tests__/agentcore/translate.test.ts:283–315`
Problem: `error TS18048: 'result.tags' is possibly 'undefined'.` — `BedrockAgentDefinition.tags` is typed as `tags?: Record<string, string>` (optional). All 11 errors are test assertions that access `result.tags.someKey` without first asserting that `tags` is defined.
Fix:
```typescript
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

---

### TS-20260319-003: Add `"blueprint.evidence_package_exported"` to `EventType` ⚠️ REGRESSION
Priority: P0
Effort: XS
File: `src/lib/events/types.ts:36`
Problem: `error TS2322: Type 'AuditAction' is not assignable to type 'EventType'. Type '"blueprint.evidence_package_exported"' is not assignable to type 'EventType'.` — `AuditAction` in `src/lib/audit/log.ts` has `"blueprint.evidence_package_exported"` (line 41) but `EventType` in `src/lib/events/types.ts` does not include it. The comment in `events/types.ts` says these two types must map 1:1, but they have drifted. The `writeAuditLog` function passes `entry.action` directly as `type` to `dispatch()`, which requires `EventType`.
Fix:
```typescript
// In src/lib/events/types.ts, add the missing value at the end of the EventType union (after line 36):
// OLD:
  | "blueprint.periodic_review_reminder";
// NEW:
  | "blueprint.periodic_review_reminder"
  | "blueprint.evidence_package_exported";
```
Verify: `npx tsc --noEmit` produces 0 errors
