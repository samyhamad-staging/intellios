# Agent Registry — Specification

**Subsystem:** Control Plane
**Status:** Complete

## Purpose

Stores, versions, and manages Agent Blueprint Packages. Provides the canonical catalog of all agents within an enterprise.

## Inputs

- Agent Blueprint Packages (validated)
- Queries (lookup, search, filter)

## Outputs

- Stored ABP with version history
- Query results (list, detail, search)

## Behavior

1. Accept validated ABPs for storage.
2. Assign version numbers to each ABP revision.
3. Maintain full version history per agent.
4. Support lifecycle state transitions (draft, in_review, approved, deprecated).
5. Provide lookup by ID, search by name/tags, and filter by status.
6. Enforce uniqueness of agent IDs.

## Resolved Decisions

- **Storage backend:** PostgreSQL. See ADR-002.
- **Versioning:** Semantic versioning for ABP revisions. See ADR-003.
- **Deletion:** Deprecation only for MVP. No hard or soft delete. See ADR-003.

## Implementation

### Data Model

The `agent_blueprints` table serves as both the blueprint store (Generation Engine) and the Agent Registry version store. Each row is a versioned snapshot of an agent.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Row identifier; also used as the blueprint ID in the generation flow |
| `agent_id` | UUID | Logical agent identifier; all versions of the same agent share this |
| `version` | TEXT | Semver string (default `1.0.0`); MVP: all agents start at `1.0.0` |
| `name` | TEXT | Denormalized from `abp.identity.name` for search |
| `tags` | JSONB | Denormalized from `abp.metadata.tags` for search |
| `session_id` | UUID | FK to the intake session that produced this blueprint |
| `abp` | JSONB | Full ABP document |
| `status` | TEXT | `draft \| in_review \| approved \| rejected \| deprecated` |
| `refinement_count` | TEXT | How many times this row has been refined in-place |

**Design decisions (OQ-005 resolved):**
- `agent_blueprints` IS the Agent Registry — no separate table needed.
- Version history: separate rows per version. MVP: refinements update in place (single row per agent). Future: creating a new version inserts a new row with the same `agent_id` and a bumped `version`.
- Agent uniqueness: enforced by `agent_id` UUID. No name uniqueness constraint for MVP.

### API Routes

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/registry` | List all agents (latest version per `agent_id`, ordered by `updated_at` desc) |
| GET | `/api/registry/[agentId]` | Get agent detail (latest version) + full version history |
| PATCH | `/api/blueprints/[id]/status` | Lifecycle transition for a specific blueprint version (hooks `retireFromAgentCore()` on `deprecated` when `deploymentTarget === "agentcore"`) |
| POST | `/api/blueprints/[id]/clone` | Clone a blueprint into a new logical agent |
| PATCH | `/api/blueprints/[id]/ownership` | Update the ownership metadata block (no AI, direct DB write) |
| POST | `/api/registry/[agentId]/invoke` | **Test Console invocation** (ADR-027) — reviewer/compliance_officer/admin only, streams `InvokeAgent` response for the latest `deployed` blueprint under the agent. 10/min per-actor rate limit. Writes `blueprint.test_invoked` audit with SHA256-16 prompt hash only (no transcript persistence). |

### Clone Operation

`POST /api/blueprints/[id]/clone` forks a blueprint into a new logical agent. The clone is **not** a new version of the same agent — it is an independent agent with its own `agentId`, its own version history, and its own MRM lifecycle.

**Clone behavior:**
- New `agentId` (UUID) + new blueprint `id` (UUID) — both random
- `status: "draft"`, `version: "1.0.0"`, `refinementCount: "0"`
- All review fields cleared (`reviewedBy`, `reviewedAt`, `reviewComment` = null)
- `validationReport` cleared — the clone must be independently validated
- `abp.identity.name` set to `"${source.name} (Clone)"` unless overridden by `name` in request body
- `enterpriseId`, `sessionId`, `tags` preserved from source (sessionId kept for traceability to original intake)
- `blueprint.cloned` audit entry written with `{ sourceBlueprint, sourceName, sourceVersion, newAgentId }` metadata

**Access:** `designer | admin` only.

**Why new logical agent, not new version?** A version increment implies the same agent evolved, and the MRM report should inherit the parent's reviewer/deployer evidence records. A clone is a conceptually different agent derived from a parent — it requires its own review, its own approvals, and its own deployment audit trail. Shared genealogy is captured in the audit metadata (`sourceBlueprint`), not in the lifecycle lineage.

### Lifecycle State Machine

```
draft → in_review → approved → deployed → deprecated → retired
              ↓                    ↺
           rejected → deprecated (invoked* via Test Console)
```

Valid transitions:
- `draft` → `in_review`, `deprecated`
- `in_review` → `approved`, `rejected`, `deprecated`
- `approved` → `deployed` (via `POST /api/blueprints/[id]/deploy` — real `BedrockAgentClient` call; see ADR-010)
- `deployed` → `deprecated` (hooks `retireFromAgentCore()` — best-effort `DeleteAgentCommand` + poll-to-404/30s timeout; never blocks status change if AWS is degraded)
- `rejected` → `deprecated`
- `deprecated` → (terminal — retirement evidence recorded in `deploymentMetadata.retirement` with `{ target, agentId, retiredAt, retiredBy, deleted }`)

**Runtime invocation loop (Test Console, ADR-027):** while an agent is in `deployed`, reviewers may invoke it via `POST /api/registry/[agentId]/invoke`. Invocation does **not** transition the lifecycle state — it is a governed test surface, not a runtime. Every invocation writes `blueprint.test_invoked` audit but leaves `status` untouched.

### Test Console Surface (ADR-027)

`/registry/[agentId]/test` renders a reviewer-scoped chat UI for press-testing a deployed agent. Six guardrails preserve the control-plane positioning:

1. **Role gate** — reviewer, compliance_officer, admin only. Designers and architects (who cannot approve a deployment) cannot test one either — same role set.
2. **Rate limit** — 10 invocations per minute per actor via `rateLimit(email, { endpoint: "invoke", ... })`. Hard ceiling on throughput prevents bulk-ingest-through-test-console.
3. **No server-side transcript** — the `sessionId` is client-generated (`crypto.randomUUID()`) and kept in React state only; the page mount owns the session; closing the page ends the conversation.
4. **Audit every invocation** — `blueprint.test_invoked` audit row with `{ agentId, bedrockAgentId, sessionId, promptHash, promptLength }`. Prompt is hashed (SHA256-16), never persisted. Reviewer accountability without transcript retention.
5. **No RETURN_CONTROL execution** — when Bedrock returns a `returnControl` payload, the adapter renders a synthetic `[tool call simulated — invoked: <toolName>]` chunk and stops. Intellios does not execute action groups. Real tool round-trips happen on the enterprise's runtime.
6. **Explicit UI framing** — a permanent `"Test harness — not a production runtime"` badge renders in the page header on every render. Invokability gate refuses to render the prompt input unless `status === "deployed" && deploymentTarget === "agentcore" && deploymentMetadata.agentId` is set.

### Retirement (lifecycle stage 8)

When `PATCH /api/blueprints/[id]/status` transitions to `deprecated` and the blueprint has `deploymentTarget === "agentcore"` with a live `deploymentMetadata.agentId`, the route calls `retireFromAgentCore()`:

- Issues `DeleteAgentCommand` with `skipResourceInUseCheck: true`.
- Polls `GetAgentCommand` until 404 or 30s timeout (60 attempts × 500ms).
- Idempotent: `ResourceNotFoundException` is treated as success (agent already gone).
- Returns `AgentCoreRetirementRecord { target, agentId, retiredAt, retiredBy, deleted, error? }` — merged into `deploymentMetadata.retirement` and written back via the same transaction as the status change.
- Writes `blueprint.agentcore_retired` or `blueprint.agentcore_retire_failed` audit.
- **Best-effort:** a retirement failure logs but does not block the status change. Deprecation authority is the governance event; AWS cleanup is recorded separately and can be retried.

### UI

- **`/registry`** — registry list: all agents as cards (name, status badge, version, tags, created date)
- **`/registry/[agentId]`** — agent detail: Blueprint tab (full ABP view) + Versions tab (version history table) + lifecycle action buttons in header; "Open Test Console" button appears when the latest version is `deployed` and `deploymentTarget === "agentcore"`.
- **`/registry/[agentId]/test`** — Test Console (ADR-027, reviewer+ only)
- **Navigation**: blueprint page links to registry via "View in Registry →"; registry detail links back to blueprint studio via "Open in Studio"

## Known Unknowns

These questions must be resolved before this component can be implemented. See `docs/open-questions.md` for full detail.

| # | Question | Blocks |
|---|---|---|
| OQ-005 | Relationship between `agent_blueprints` table (created for Generation Engine) and the Agent Registry — are they the same, or does the Registry wrap it? | Schema design |
| OQ-005 | Version history model — separate rows per version, or JSONB array? | Schema design, query design |
| OQ-005 | Agent uniqueness definition — what field(s) identify an agent as unique within an enterprise? | Uniqueness enforcement |
| OQ-002 | Authentication and multi-tenancy — how is enterprise isolation enforced for stored ABPs? | All registry operations |
| OQ-007 | ABP schema evolution — how are ABPs stored at an older schema version handled when the schema advances? | Long-term data integrity |
