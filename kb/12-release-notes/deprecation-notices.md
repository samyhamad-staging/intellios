---
id: 12-003
title: Deprecation Notices
slug: deprecation-notices
type: reference
audiences:
- engineering
status: published
created: &id001 2026-04-05
updated: *id001
tags:
- deprecation
- migration
- breaking changes
- backwards compatibility
tldr: API, schema, and feature deprecations with migration guidance
---

# Deprecation Notices

This document tracks deprecated features, APIs, and schemas with migration timelines and guidance.

---

## Deprecation Policy

Intellios follows this deprecation policy to ensure stability:

1. **Announcement:** Deprecation announced in release notes and changelog (minimum 6 months notice)
2. **Continued support:** Deprecated feature remains fully functional during support window
3. **Migration guide:** Step-by-step instructions for migrating to replacement feature
4. **Removal:** Feature removed in major version release (v2.0, v3.0) after 6-month deprecation window

**Example timeline:**
- v1.1.0 (Feb 2026): Feature X deprecated; announced with migration guide
- v1.1.0 – Sept 2026: Feature X still works; customers migrate
- v2.0.0 (Oct 2026): Feature X removed

---

## Currently Deprecated

### 1. Intake Form Schema v1.0 (Flat Structure)

**Deprecated in:** v1.1.0 (Feb 2026)

**Removal planned:** v2.0.0 (Q4 2026)

**What's deprecated:** Original intake form structure used flat stakeholder input fields (all stakeholder inputs in single form).

```json
// v1.0 (deprecated)
{
  "intake": {
    "compliance_input": "...",
    "risk_input": "...",
    "legal_input": "..."
  }
}
```

**Why:** New Express-Lane template system provides better structure (7-lane stakeholder model) and faster intake process.

**Migration path:**

```json
// v1.1+ (new structure)
{
  "intake": {
    "lanes": {
      "compliance": { "inputs": [...] },
      "risk": { "inputs": [...] },
      "legal": { "inputs": [...] },
      "security": { "inputs": [...] },
      "it": { "inputs": [...] },
      "operations": { "inputs": [...] },
      "business": { "inputs": [...] }
    }
  }
}
```

**Auto-migration:** Intellios automatically converts v1.0 intake data to v1.1 structure on first read (transparent to users).

**Action required:** None for users. If you have custom integrations reading intake JSON directly, update to expect new structure.

**API endpoint affected:** `GET /api/intake/:id` returns both old and new structures (via `_legacyFormat` flag) until v2.0.0.

---

### 2. Governance Policy Schema v1.0.0

**Deprecated in:** v1.1.0 (Feb 2026)

**Removal planned:** v2.0.0 (Q4 2026)

**What's deprecated:** Original governance policy schema with unversioned operators.

```yaml
# v1.0.0 (deprecated)
operators:
  - name: max_tools_policy
    constraint: 5
  - name: risk_classification
    categories: [low, medium, high]
```

**Why:** New schema (v1.1.0) adds individual operator versioning, allowing targeted updates without full policy release.

**Migration path:**

```yaml
# v1.1.0+ (new structure)
operators:
  - name: max_tools_policy
    version: 1.0.0
    constraint: 5
  - name: risk_classification
    version: 1.0.0
    categories: [low, medium, high, critical]
```

**Auto-migration:** Existing governance policies auto-converted to v1.1.0 structure on upgrade.

**Action required:** If using governance policy CLI commands (e.g., `intellios policy create`), update scripts to include `version` field.

**API endpoint affected:** `POST /api/governance/policies` accepts both v1.0.0 and v1.1.0 schemas; v1.0.0 support ends in v2.0.0.

---

### 3. ABP Schema v1.0.0

**Deprecated in:** v1.0.0 release (Nov 2025)

**Removal planned:** v2.0.0 (Q4 2026)

**Status:** Deprecated from initial release; migrate-on-read enabled.

**What's deprecated:** Original Agent Blueprint Package schema lacked safety fields and execution constraints.

```json
// v1.0.0 (deprecated)
{
  "agent": {
    "name": "credit-agent",
    "prompt": "...",
    "tools": [...]
  }
}
```

**Why:** v1.0.1 added safety fields (execution timeout, API call limits, data residency policy) for compliance.

**Migration path:**

```json
// v1.0.1+ (current)
{
  "agent": {
    "name": "credit-agent",
    "prompt": "...",
    "tools": [...],
    "safety": {
      "execution_timeout_seconds": 30,
      "max_api_calls": 10,
      "data_residency": "us-east-1"
    }
  }
}
```

**Auto-migration:** When retrieving v1.0.0 ABPs, Intellios injects default safety constraints via "migrate-on-read" pattern. No schema change in database.

**Action required:** None immediate, but recommend updating all v1.0.0 ABPs to v1.0.1 schema explicitly before v2.0.0 release. Use CLI command:

```bash
intellios abp migrate-schema --from=v1.0.0 --to=v1.0.1 --agent-tag=legacy
```

**API endpoint affected:** `GET /api/blueprints/:id` returns v1.0.1 schema with injected safety defaults (transparent).

---

### 4. Webhook Format v1.0 (Flat Payload)

**Deprecated in:** v1.2.0 (Mar 2026)

**Removal planned:** v2.0.0 (Q4 2026)

**What's deprecated:** Original webhook payload structure (flat JSON object).

```json
// v1.0 (deprecated)
{
  "event": "agent.deployed",
  "agent_id": "abc123",
  "status": "deployed",
  "timestamp": "2026-03-15T14:32:00Z"
}
```

**Why:** v1.2.0 adds nested `metadata` object for richer context and extensibility.

**Migration path:**

```json
// v1.2.0+ (new structure)
{
  "event": "agent.deployed",
  "agent_id": "abc123",
  "metadata": {
    "status": "deployed",
    "environment": "production",
    "deployed_by": "alice@bank.com",
    "deployment_duration_ms": 5234
  },
  "timestamp": "2026-03-15T14:32:00Z"
}
```

**Backwards compatibility:** Intellios sends both formats during deprecation window (dual payload):

```json
{
  "event": "agent.deployed",
  "agent_id": "abc123",
  "status": "deployed",  // v1.0 field (deprecated)
  "metadata": { ... },    // v1.2.0 field (new)
  "timestamp": "..."
}
```

**Action required:** Update webhook consumers to read from `metadata` object. Remove reliance on flat fields (which disappear in v2.0.0).

**Migration check:**
```bash
# Validate webhook integration is compatible with v1.2.0
intellios webhooks validate --webhook-id=xyz
```

---

## Deprecation Timeline Summary

| Item | Deprecated | Removal | Migration Effort |
|------|---|---|---|
| Intake Form Schema v1.0 | v1.1.0 (Feb 2026) | v2.0.0 (Q4 2026) | Low (auto-migrated) |
| Governance Policy Schema v1.0.0 | v1.1.0 (Feb 2026) | v2.0.0 (Q4 2026) | Low (auto-converted) |
| ABP Schema v1.0.0 | v1.0.0 (Nov 2025) | v2.0.0 (Q4 2026) | Medium (recommend explicit migration) |
| Webhook Format v1.0 | v1.2.0 (Mar 2026) | v2.0.0 (Q4 2026) | Medium (webhook consumers must update) |

---

## How to Check Deprecation Status

Use the CLI to audit your deployment for deprecated features:

```bash
# Scan for deprecated ABPs
intellios audit --check=deprecated-schemas

# Output:
# Found 23 agents using deprecated ABP v1.0.0
# Recommend upgrading before v2.0.0 release (Q4 2026)
```

---

## Getting Help with Migration

- **Documentation:** See specific migration guides above
- **CLI support:** `intellios help migrate` for migration commands
- **Consulting:** Contact Intellios Professional Services for assistance: [PLACEHOLDER: consulting@intellios.com]
- **Support:** Open ticket with support team: [PLACEHOLDER: support@intellios.com]

---

## Future Deprecations (Planned)

The following features are planned for future deprecation (6+ months in advance):

- **Risk classification categories v1.0** (planned deprecation Q3 2026): Moving from 3-tier (low, medium, high) to 5-tier (low, medium, high, critical, extreme) system. Existing v1.0 policies will auto-map to v2.0 during upgrade.

- **Review queue manual reassignment** (planned deprecation Q4 2026): Moving to automatic routing based on stakeholder roles. Manual reassignment will still be possible but discouraged.

---

## Feedback on Deprecations

If you have concerns about a deprecation timeline, API breaking change, or migration burden, please contact us:

- **Product:** [PLACEHOLDER: product@intellios.com]
- **Engineering:** [PLACEHOLDER: engineering@intellios.com]
- **Customer success:** Your CSM (Enterprise customers)

We take backwards compatibility seriously and are open to extending deprecation windows if needed.

