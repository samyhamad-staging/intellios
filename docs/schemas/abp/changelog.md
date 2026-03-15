# ABP Schema Changelog

## v1.2.0 — 2026-03-13

**Adds organizational ownership and classification metadata.**

New optional top-level `ownership` block:
- `businessUnit` (string) — business unit or department that owns this agent
- `ownerEmail` (string, email format) — primary accountable owner email
- `costCenter` (string) — cost center code for budget tracking
- `deploymentEnvironment` (enum: production / staging / sandbox / internal) — intended deployment environment
- `dataClassification` (enum: public / internal / confidential / regulated) — highest data classification level

All fields are optional. The block itself is optional — existing blueprints without `ownership` remain valid under this schema. Backwards-compatible minor version bump. Managed by the designer in the Blueprint Workbench; not AI-generated.

---

## v1.0.0 — 2026-03-12

**Initial release.**

Defines the core structure of an Agent Blueprint Package:
- `metadata` — provenance, lifecycle status, enterprise ownership
- `identity` — agent name, description, persona, white-label branding
- `capabilities` — tools, instructions, knowledge sources
- `constraints` — allowed domains, denied actions, rate limits
- `governance` — policies, audit configuration, approval chain
