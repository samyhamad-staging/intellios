# Intellios — Agent Lifecycle Architecture

**Subsystem scope:** all eight lifecycle stages from Inception through Retirement, the transitions between them, the artifacts each stage produces, and the AWS AgentCore integration points.

**Status:** code-complete end-to-end as of session 157. One-time live AWS smoke deploy pending in session 158.

## Lifecycle Overview

Intellios models the life of an enterprise AI agent as an eight-stage state machine. Each stage has a canonical artifact, a role gate, an audit event, and — where applicable — a real side-effect against AWS AgentCore.

```
┌────────────┐   ┌────────┐   ┌──────────────┐   ┌─────────┐   ┌──────────┐   ┌────────────┐   ┌───────────┐   ┌──────────┐
│ Inception  │ → │ Design │ → │  Governance  │ → │ Approval│ → │ Deployment│ → │  Runtime   │ → │ Monitoring│ → │ Retirement│
│  (intake)  │   │ (ABP)  │   │ (validation) │   │ (review)│   │ (Bedrock) │   │ (invoke)  │   │(CloudWatch│   │(DeleteAgent│
└────────────┘   └────────┘   └──────────────┘   └─────────┘   └──────────┘   └────────────┘   └───────────┘   └──────────┘
                                                                                    │                 │
                                                                                    └─ iteration loop ┘
                                                                                       (new-version)
```

## Stage-by-Stage

### 1. Inception — Intake Engine

- **Canonical artifact:** `intake_sessions` row + `intake_payload` JSON (conversational LLM-driven capture).
- **Primary surface:** `/intake` chat UI, `POST /api/intake/chat` (streamText with tool use), `POST /api/intake/finalize`.
- **Role gate:** architect (enterprise-scoped).
- **Audit:** `intake.started`, `intake.finalized`.
- **AWS side-effect:** none.
- **Transition:** finalizing the intake produces the input to Generation (stage 2).

### 2. Design — Generation Engine (Agent Blueprint Package)

- **Canonical artifact:** `agent_blueprints` row with `status='draft'` and `abp` JSONB holding the full ABP v1.3.0 document.
- **Primary surface:** `POST /api/blueprints/generate` (Claude `generateObject` with the ABP schema), `GET /api/blueprints/[id]`, `PATCH /api/blueprints/[id]/refine`.
- **Role gate:** designer (can generate/refine), architect (read-only).
- **Audit:** `blueprint.generated`, `blueprint.refined`.
- **AWS side-effect:** none.
- **Transition:** `draft → in_review` via `PATCH /api/blueprints/[id]/status` — blocked by governance-error-severity violations (ADR-019).

### 3. Governance — Validation

- **Canonical artifact:** `validationReport` JSONB on the blueprint row (policy violations + severity + remediation hints).
- **Primary surface:** `POST /api/blueprints/[id]/validate` runs policy evaluator over ABP + enterprise policies; `/review` UI surfaces the report.
- **Role gate:** compliance_officer writes policies; validator runs on any status change to `in_review`.
- **Audit:** `blueprint.validated`, `governance.policy.*` for policy mutations.
- **AWS side-effect:** none.
- **Transition gate:** governance with `error`-severity blockers blocks `in_review → approved` (ADR-019). Admin can override with audited reason (ADR-019).

### 4. Approval — Review

- **Canonical artifact:** `approvalChain` JSONB on the blueprint row + `audit_log` entries for each step; single-step path sets `reviewedBy`/`reviewedAt`/`reviewComment`.
- **Primary surface:** `/review` queue, `PATCH /api/blueprints/[id]/status` (transitions `in_review → approved | rejected`).
- **Role gate:** reviewer, compliance_officer, admin. SOD enforced: creator ≠ approver (ADR-013).
- **Audit:** `blueprint.reviewed`, `blueprint.approved`, `blueprint.approved.override` (governance override), `blueprint.rejected`.
- **AWS side-effect:** none.
- **Transition:** `in_review → approved` or `in_review → rejected`.

### 5. Deployment — AgentCore

- **Canonical artifact:** `deploymentMetadata` JSONB on the blueprint row `{ target, agentId, region, foundationModel, deployedAt, ... }`, `status='deployed'`.
- **Primary surface:** `POST /api/blueprints/[id]/deploy` calls `src/lib/agentcore/deploy.ts` which translates ABP → Bedrock agent/alias/action-groups (ADR-010) and issues real `CreateAgentCommand`/`PrepareAgentCommand` calls with circuit-breaker protection (ADR-023).
- **Role gate:** admin; requires `status='approved'` and a valid deployment target.
- **Audit:** `blueprint.deployed`, `blueprint.deploy_failed`.
- **AWS side-effect:** **real.** Creates Bedrock agent + alias + action groups; writes `deploymentMetadata` with the returned `agentId`.
- **Transition:** `approved → deployed`.

### 6. Runtime Execution — Test Console (ADR-027)

- **Canonical artifact:** `audit_log` entries with `action='blueprint.test_invoked'` and metadata `{ agentId, bedrockAgentId, sessionId, promptHash, promptLength }`. **No transcript persisted.**
- **Primary surface:** `/registry/[agentId]/test` (client-only React page with `crypto.randomUUID()` session), `POST /api/registry/[agentId]/invoke` (streams Bedrock `InvokeAgent` response) via `src/lib/agentcore/invoke.ts`.
- **Role gate:** reviewer, compliance_officer, admin. **NOT designer or architect.**
- **Rate limit:** 10 invocations/minute per actor.
- **Audit:** `blueprint.test_invoked` on every call (best-effort — never blocks the stream).
- **AWS side-effect:** **real.** Streams `InvokeAgentCommand` response. RETURN_CONTROL responses rendered as synthetic `[tool call simulated]` markers — Intellios does **not** execute action groups (preserves control-plane positioning).
- **Does not transition lifecycle state.** Invocation is a governed test surface, not a runtime. See ADR-027 for the six guardrails.

### 7. Monitoring — Telemetry

- **Canonical artifact:** `telemetry_events` rows + `health_status` on the blueprint row (derived from CloudWatch poll + ingest events).
- **Primary surface:** `/monitor` dashboard, `GET /api/cron/telemetry-poll` (CloudWatch poller), `POST /api/telemetry/ingest` (webhook sink), `syncAllAgentCoreTelemetry` helper.
- **Role gate:** read-only for reviewer/admin; cron writes unattended.
- **Audit:** none per-event (too high-volume); aggregate metrics persisted instead.
- **AWS side-effect:** **real.** Reads CloudWatch metrics + logs for the deployed Bedrock agent.
- **Does not transition lifecycle state.** Observable from stage 5 onward.

### 8. Iteration — New Version

- **Canonical artifact:** new `agent_blueprints` row sharing the same `agentId` with a bumped `version` (semver) and `status='draft'`.
- **Primary surface:** `POST /api/blueprints/[id]/new-version` clones the current blueprint into a new version-row.
- **Role gate:** designer, admin.
- **Audit:** `blueprint.version_created` with `{ sourceVersion, newVersion }`.
- **AWS side-effect:** none at this stage — the new version goes through stages 3-5 on its own to deploy.
- **Transition:** not a lifecycle-state transition on the parent; spawns a sibling in `draft`.

### 9. Retirement — DeleteAgent (session 157)

- **Canonical artifact:** `deploymentMetadata.retirement` JSONB `{ target, agentId, retiredAt, retiredBy, deleted, error? }` + `status='deprecated'`.
- **Primary surface:** `PATCH /api/blueprints/[id]/status` with `newStatus='deprecated'` — hooks `retireFromAgentCore()` in `src/lib/agentcore/deploy.ts`.
- **Role gate:** admin.
- **Audit:** `blueprint.deprecated`, `blueprint.agentcore_retired` (success) or `blueprint.agentcore_retire_failed` (failure — logged but does not block the status change).
- **AWS side-effect:** **real.** `DeleteAgentCommand` with `skipResourceInUseCheck: true` + poll `GetAgentCommand` until 404 or 30s timeout. Idempotent on `ResourceNotFoundException`.
- **Transition:** `{deployed | approved | rejected | draft} → deprecated`. Terminal. The retirement evidence is merged into `deploymentMetadata.retirement` and persisted back.
- **Best-effort guarantee:** retirement failure logs but does **not** block the status change. Governance authority is the deprecation event; AWS cleanup is recorded separately and can be retried manually.

## State Machine Summary

```
draft ──────→ in_review ──→ approved ──→ deployed ──→ deprecated (retired via DeleteAgent)
   │              │             │           │ ↺
   │              ↓             │           │ (invoke* via Test Console — no state change)
   │           rejected ────────┴───────────┴──→ deprecated
   │
   └────────────────────────────────────────────→ deprecated
```

Valid transitions (enforced in `PATCH /api/blueprints/[id]/status`):

| From | To | Gate |
|---|---|---|
| `draft` | `in_review` | designer; governance evaluator runs |
| `draft` | `deprecated` | admin |
| `in_review` | `approved` | reviewer + SOD + governance-clean OR admin-override |
| `in_review` | `rejected` | reviewer + SOD |
| `in_review` | `deprecated` | admin |
| `approved` | `deployed` | admin, via `/deploy` endpoint (real Bedrock call) |
| `approved` | `deprecated` | admin |
| `rejected` | `deprecated` | admin |
| `deployed` | `deprecated` | admin; triggers `retireFromAgentCore()` best-effort |
| `deprecated` | — | terminal |

## AgentCore Integration Points

| Stage | AWS Call | Code Path | ADR |
|---|---|---|---|
| Deployment | `CreateAgent` + `PrepareAgent` + action groups | `src/lib/agentcore/deploy.ts::deployToAgentCore()` | ADR-010 |
| Runtime | `InvokeAgent` (streaming) | `src/lib/agentcore/invoke.ts::invokeAgent()` | ADR-027 |
| Monitoring | CloudWatch `GetMetricData` + `GetLogEvents` | `src/lib/telemetry/agentcore-sync.ts` | ADR-010 |
| Retirement | `DeleteAgent` + `GetAgent` poll | `src/lib/agentcore/deploy.ts::retireFromAgentCore()` | session 157 (no dedicated ADR — extension of ADR-010) |

All AgentCore calls are wrapped by:

- **Circuit breaker** (ADR-023) — per-model sliding-window failure threshold + exponential cooldown.
- **Structured logging** via `logger.error(..., { err: serializeError(err) })` (ADR-022).
- **Audit writes** — every mutation records an `audit_log` row, most via the atomic `db.transaction` envelope (ADR-021).

## Positioning Invariant

Intellios is the *governed control plane*, not the runtime. The Test Console (stage 6) is the one place this could collapse. ADR-027 lists the six guardrails that keep it from collapsing. Any future change to the invocation surface must explicitly re-affirm or re-argue those guardrails in a new ADR — they are load-bearing to the product's positioning.

## Session 158+ Open Items

- One-time live AWS smoke deploy (validates `deploy.ts` + `translate.ts` + `invoke.ts` + `retireFromAgentCore()` end-to-end against the real Bedrock API contract).
- `scripts/seed-demo.ts` — Retail Bank Customer-FAQ demo enterprise + ABP fixture.
- Demo rehearsal + screen recording (`docs/demo/lifecycle-demo.md` is the runbook).
- OQ-010 resolution — RETURN_CONTROL tool-mock service.
