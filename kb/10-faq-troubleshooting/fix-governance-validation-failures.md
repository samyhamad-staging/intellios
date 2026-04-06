---
id: "10-007"
title: "Blueprint Fails Governance Validation"
slug: "governance-validation-failures"
type: "troubleshooting"
audiences: ["engineering", "compliance"]
status: "published"
version: "1.0.0"
platform_version: "1.2.0"
created: "2026-04-05"
updated: "2026-04-05"
tags: ["governance", "validation", "blueprints", "policies", "compliance"]
tldr: "Blueprint validation fails with GOVERNANCE_VALIDATION_FAILED error when required fields are missing, tool count exceeds policy limits, or risk classifications mismatch. Check policy settings, audit logging configuration, and required field mappings."
feedback_url: "https://feedback.intellios.ai/kb"
---

## TL;DR

Blueprint validation fails with **GOVERNANCE_VALIDATION_FAILED** error. Common causes: missing required fields, tool count exceeds enterprise policy limit, risk classification mismatch, or missing audit logging configuration. Verify policy settings and audit configuration in governance rules.

---

## Symptom

- Blueprint generation completes but returns error: `GOVERNANCE_VALIDATION_FAILED`
- Review UI displays red validation banner with policy violation details
- API response includes status code `422 Unprocessable Entity` with governance violation list
- Blueprint cannot advance to registry or deployment stage

---

## Possible Causes (by likelihood)

1. **Missing required fields** — Governance policy requires fields that intake form did not capture
2. **Tool count exceeds policy limit** — Blueprint contains more tools than enterprise policy allows
3. **Risk classification mismatch** — Inferred risk level conflicts with allowed classification
4. **Missing audit logging configuration** — Blueprint lacks required audit trail fields for compliance
5. **Scope permissions violation** — Agent scope (e.g., data access level) exceeds RBAC policy rules

---

## Diagnosis Steps

### Step 1: Check the governance validation report
```bash
# Fetch the blueprint with validation details
curl -H "Authorization: Bearer $TOKEN" \
  https://api.intellios.ai/v1/blueprints/{blueprint_id}

# Look for governance_violations array in response
# Example response snippet:
# {
#   "governance_violations": [
#     {
#       "policy_id": "pol_required_fields",
#       "message": "Missing required field: audit_logging",
#       "severity": "error"
#     }
#   ]
# }
```

### Step 2: Review current governance policies
Log into the platform → Administration → Governance Policies. Identify which policies are active for your enterprise.

### Step 3: Inspect blueprint source
Navigate to Blueprints → Review stage. Expand the "Governance Details" panel to see which specific fields or rules triggered the violation.

### Step 4: Check tool inventory
Count the number of tools in the blueprint. Compare to policy limit:
```bash
# API call to list blueprint tools
curl -H "Authorization: Bearer $TOKEN" \
  https://api.intellios.ai/v1/blueprints/{blueprint_id}/tools | jq '.tools | length'
```

---

## Resolution

### If missing required fields:
1. Open the blueprint in the Refine UI
2. Click "Governance" tab
3. Note which fields are marked as required
4. Add missing fields to the intake form and re-generate blueprint
5. **Verify:** Validation report shows no "missing field" violations

### If tool count exceeds limit:
1. Check your policy limit (Admin → Governance → Policy Details)
2. In Refine UI, remove non-essential tools
3. Re-run validation without regenerating
4. **Verify:** Tool count now within policy (e.g., ≤20 tools)

### If risk classification mismatch:
1. Check the inferred risk level in Blueprint > Governance Details
2. Compare to policy allowlist (e.g., policy allows only "low" and "medium")
3. Adjust intake answers to lower inferred risk (e.g., reduce API access scope)
4. Re-generate blueprint
5. **Verify:** Risk classification now matches allowed values

### If audit logging missing:
1. Open blueprint in Refine UI
2. Go to Governance tab → "Audit Logging"
3. Enable audit logging and configure log retention (required: ≥90 days)
4. **Verify:** Policy validation passes

### If scope permissions violation:
1. In Refine UI, check Tool Scope Settings
2. Reduce data access level or API permissions
3. Re-validate
4. **Verify:** Policy report shows no permission violations

---

## Prevention

- **Enterprise-wide:** Review all governance policies quarterly. Document required fields and tool limits in team runbook.
- **Before intake:** Ensure intake form captures all fields marked as required in your active policies.
- **During design:** Count tools early; if approaching limit, prioritize by risk and impact.
- **Template use:** Create blueprint templates with pre-filled governance fields (audit logging enabled, safe risk classification).

---

## Escalation

For unresolved governance validation conflicts or policy interpretation issues, see [escalation-paths.md](../escalation-paths.md).

---

## Related Articles

- [Understanding Governance Policies](../05-governance-compliance/governance-policies.md)
- [Blueprint Refinement Guide](../03-core-concepts/blueprint-refinement.md)
- [Compliance Evidence Collection](../05-governance-compliance/compliance-evidence.md)
- [Risk Classification Reference](../05-governance-compliance/risk-classification.md)
