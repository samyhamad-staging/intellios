# ABP Schema Changelog

## v1.1.0 — 2026-03-19

**Adds execution configuration and explicit version field.**

New required top-level `execution` block (all fields have defaults — fully backwards-compatible):
- `observability.metricsEnabled` (boolean, default: `true`) — enable metrics collection
- `observability.logLevel` (enum: none / errors / info / debug, default: `"errors"`) — log verbosity
- `observability.samplingRate` (number 0–1, default: `1.0`) — telemetry sampling rate
- `observability.telemetryEndpoint` (string | null, default: `null`) — custom telemetry sink
- `runtimeConstraints.maxTokensPerInteraction` (number | null) — per-interaction token cap
- `runtimeConstraints.maxConcurrentSessions` (number | null) — session concurrency limit
- `runtimeConstraints.circuitBreakerThreshold` (number 0–1 | null) — error rate circuit breaker
- `runtimeConstraints.sessionTimeoutMinutes` (number | null) — session idle timeout
- `feedback.alertWebhook` (string | null) — webhook URL for alert notifications
- `feedback.escalationEmail` (string | null) — email for escalations

Added explicit `version` field to ABP root (replaces the previous `z.literal("1.0.0")` constraint with `z.string().default("1.0.0")`). New ABPs are written with `version: "1.1.0"`.

Migration from 1.0.0 → 1.1.0 is registered in `src/lib/abp/migrate.ts`. Existing stored ABPs are migrated on-read via `readABP()`.

---

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
