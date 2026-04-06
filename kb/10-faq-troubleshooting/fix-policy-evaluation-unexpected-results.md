---
id: "10-013"
title: "Policy Evaluates Differently Than Expected"
slug: "policy-evaluation-unexpected-results"
type: "troubleshooting"
audiences: ["compliance", "engineering"]
status: "published"
version: "1.0.0"
platform_version: "1.2.0"
created: "2026-04-05"
updated: "2026-04-05"
tags: ["governance", "policies", "evaluation", "rules", "compliance-logic"]
tldr: "Governance policy passes when it should fail or vice versa. Check: field path references (must match blueprint schema exactly), operator logic (contains vs equals), severity vs error semantics, policy version mismatch."
feedback_url: "https://feedback.intellios.ai/kb"
---

## TL;DR

Policy evaluation produces unexpected result (should pass but fails, or vice versa). Causes: field path mismatch with blueprint schema, operator logic error (e.g., "contains" vs "equals"), confusion between severity levels and hard errors, or stale policy version. Validate field paths against blueprint schema and test policy logic.

---

## Symptom

- Policy rule evaluates True but should evaluate False (or vice versa)
- Blueprint passes governance check despite violating policy intent
- Same blueprint passes validation in staging but fails in production
- Policy edit does not take effect; old rule behavior persists
- Policy conditions are evaluated in wrong order or skipped unexpectedly

---

## Possible Causes (by likelihood)

1. **Field path mismatch** — Policy references wrong field path; path doesn't exist in blueprint
2. **Operator logic error** — Policy uses wrong operator ("contains" vs "equals" vs "regex")
3. **Severity vs error confusion** — Policy configured as "warning" (non-blocking) instead of "error"
4. **Policy version stale** — Using outdated policy version; changes not in effect
5. **Logical operator precedence** — Complex AND/OR conditions evaluated in unexpected order

---

## Diagnosis Steps

### Step 1: Identify which policy rule misbehaves
Log into platform → Compliance → Policies. Find the policy. Click "View Details". Note the specific rule ID (e.g., "rule_check_tool_count").

### Step 2: Check field path validity
```bash
# Obtain the blueprint schema to see available fields
curl -H "Authorization: Bearer $TOKEN" \
  https://api.intellios.ai/v1/blueprints/{blueprint_id} | jq '.blueprint' > blueprint.json

# The policy rule references a field path. Look at the policy rule:
# Example: "tools[*].risk_level" should match actual blueprint structure

# Verify the path exists in blueprint:
jq '.tools | map(.risk_level)' blueprint.json

# If empty or error, field path is wrong
```

### Step 3: Test policy rule in isolation
API call to test a single rule against a blueprint:
```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  https://api.intellios.ai/v1/governance/policies/{policy_id}/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "blueprint": '"$(cat blueprint.json)"',
    "rule_id": "rule_check_tool_count"
  }'

# Response shows rule evaluation result:
# {
#   "rule_id": "rule_check_tool_count",
#   "result": true,
#   "matched_values": ["value1", "value2"],
#   "operator_used": "<=",
#   "threshold": 20
# }
```

### Step 4: Verify policy version
Log into platform → Compliance → Policies. Check:
- Policy shows version (e.g., "1.2.0")
- When was it last edited? (timestamp should reflect your recent changes)
- Is policy "Active" or "Archived"?

Alternatively, via API:
```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://api.intellios.ai/v1/governance/policies/{policy_id} | jq '.version, .status, .updated_at'
```

### Step 5: Review operator logic
Access the policy rule definition. Look at the operator (e.g., `<=`, `contains`, `regex_matches`):

| Operator | Behavior | Example |
|----------|----------|---------|
| `equals` | Exact match only | `risk_level = "high"` |
| `contains` | Substring match | `tool_name contains "api"` |
| `regex_matches` | Regex pattern | `tool_name regex "^internal-.*"` |
| `<=`, `>=`, `<`, `>` | Numeric comparison | `tool_count <= 20` |
| `in_list` | Value in enumerated list | `region in ["us-east-1", "eu-west-1"]` |

### Step 6: Check severity configuration
Policy rule shows two severity levels:
- **Severity: warning** — Non-blocking; logged but doesn't fail validation
- **Severity: error** — Blocking; must be fixed to pass validation

Check if your rule is accidentally set to "warning" when it should be "error".

---

## Resolution

### If field path mismatch:
1. Obtain the correct field path from blueprint schema:
   ```bash
   curl -H "Authorization: Bearer $TOKEN" \
     https://api.intellios.ai/v1/blueprints/{blueprint_id} | jq 'keys'
   ```
   Look for the correct field. Example: if you want to check tools, the path should start with `tools`.

2. Edit the policy rule:
   - Compliance → Policies → [Policy Name] → Edit Rule
   - Update field path: `tools[*].risk_level` (instead of e.g., `tool_risks[0].level`)
3. Save and re-evaluate the blueprint
4. **Verify:** Policy rule now finds the correct field; evaluation result matches expectation

### If operator logic error:
1. Review the policy rule and the intended behavior:
   - Intent: "Tool name must NOT contain 'deprecated'" → operator should be `!contains`
   - Intent: "Risk level must equal 'low'" → operator should be `equals`
2. Edit the rule and fix the operator
3. Test with API call:
   ```bash
   curl -X POST -H "Authorization: Bearer $TOKEN" \
     https://api.intellios.ai/v1/governance/policies/{policy_id}/evaluate \
     -H "Content-Type: application/json" \
     -d '{
       "blueprint": {...},
       "rule_id": "rule_xyz"
     }'
   ```
4. **Verify:** Evaluation result now matches expectation

### If severity/error confusion:
1. Review policy rule:
   - Is it marked "Severity: warning" when it should block validation?
   - Change to "Severity: error" to make it blocking
2. Save the policy
3. Re-validate the blueprint
4. **Verify:** Blueprint now fails validation as expected

### If policy version stale:
1. Check which version is active:
   ```bash
   curl -H "Authorization: Bearer $TOKEN" \
     https://api.intellios.ai/v1/governance/policies/{policy_id}/versions | jq '.versions[-1]'
   ```
2. If old version is active, switch to latest version:
   - Compliance → Policies → [Policy Name] → Versions → Select Latest → Activate
3. **Verify:** Latest version is now active; re-evaluation uses new rules

### If operator precedence issue:
1. Review complex rule: `(tool_count <= 20) AND (risk_level = "low" OR risk_level = "medium")`
2. Check the intended logic:
   - Current: Tools must be <=20 AND (risk is low OR medium)
   - Intended: Maybe different grouping?
3. Rewrite rule with explicit parentheses to clarify:
   ```
   (tool_count <= 20) AND ((risk_level = "low") OR (risk_level = "medium"))
   ```
4. Save and test
5. **Verify:** Evaluation matches intended logic

---

## Prevention

- **Policy testing:** Create a "policy playground" with test blueprints before deploying new rules
- **Field path documentation:** Maintain a mapping of blueprint fields to policy reference paths
- **Review before activation:** Have compliance and engineering review all new/modified policies before activating
- **Version pinning:** Document which policy version is active in production; don't auto-upgrade without testing
- **Operator reference card:** Keep operator definitions visible to policy authors to avoid confusion

---

## Escalation

For policy logic disputes between engineering and compliance, or for complex multi-rule scenarios, see [escalation-paths.md](../escalation-paths.md).

---

## Related Articles

- [Governance Policy Reference](../05-governance-compliance/policy-reference.md)
- [Policy Authoring Best Practices](../05-governance-compliance/policy-authoring.md)
- [Blueprint Schema Reference](../03-core-concepts/blueprint-schema.md)
- [Compliance Testing Guide](../05-governance-compliance/compliance-testing.md)
