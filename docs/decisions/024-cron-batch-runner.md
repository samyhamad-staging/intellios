# ADR-024: Cron batch runner — per-item isolation, time-budget, partial-completion via run + failure log tables

**Status:** accepted
**Date:** 2026-04-18
**Supersedes:** none

## Context

The Intellios platform runs six Vercel crons (`review-reminders`, `alert-check`, `telemetry-sync`, `quality-trends`, `portfolio-snapshot`, `governance-drift`). Each iterates over a list of enterprises, agents, or deployed blueprints and performs per-item work (compute a snapshot, re-validate a blueprint, check alert thresholds, send reminders, sync CloudWatch metrics).

The 2026-04-17 Production-Readiness Review identified this arrangement as High-severity finding **H5 — "Cron jobs are inline, single-threaded, no partial-completion"**:

> *One slow enterprise in a nightly loop timeouts the whole cron → affected enterprise never recovers until next run.*

Concretely, today's shape has three defects:

1. **No time-budget guard.** The four fat crons (`portfolio-snapshot`, `quality-trends`, `governance-drift`, `review-reminders`) are 130–230 LOC each and iterate over entire tenant sets. Vercel caps function execution at 60 seconds. A slow tenant deep in the loop can push wall time past the cap; when the function is killed mid-iteration, all later items are silently skipped, with no record of how far the run got or what was missed.

2. **Inconsistent per-item error isolation.** `portfolio-snapshot`, `quality-trends`, and `governance-drift` wrap each iteration in `try { … } catch { console.error(…) }`, which at least prevents one failure from halting the loop. `review-reminders` does not — an unhandled rejection on any blueprint propagates to the outer `500` and kills the remaining work. The two delegating routes (`alert-check` → `checkAndFireAlerts`, `telemetry-sync` → `syncAllAgentCoreTelemetry`) push the loop into library code that likewise lacks consistent isolation.

3. **No partial-completion memory.** Even where per-item failures are caught, they are logged to stderr and forgotten. The next cron run starts from item #1 with the same ordering. If a tenant's data is consistently broken (malformed JSON in `validationReport`, NULL `abp.instructions`, etc.) it fails every run, silently, with no alerting and no escalation. If the previous run was time-killed at item #37 of 80, there's no way for the next run to prioritize items 38-80 on its next pass.

The PRR's Week-1 recommendation calls H5 a "cron job queue" (BullMQ / SQS). That framing is too heavy for what's actually broken. The crons are already running on a schedule via Vercel Cron — we don't need a different scheduler. We need the existing cron to (a) not blow through the 60s cap, (b) not lose track of what it processed, and (c) give the next run useful ordering information.

## Decision

Build a small **cron batch runner** that wraps the per-item loop and makes partial completion a first-class, observable outcome. No new infrastructure; DB-backed state only.

### API

```ts
// src/lib/cron/batch-runner.ts

runCronBatch<T>(opts: {
  jobName: string;                       // e.g., "portfolio-snapshot"
  items: T[];                            // the work to do, in desired order
  itemId: (item: T) => string;           // stable ID per item for failure tracking
  handler: (item: T) => Promise<void>;   // per-item work; throws on failure
  budgetMs?: number;                     // default env CRON_BUDGET_MS (50_000)
}): Promise<{
  runId: string;
  total: number;
  succeeded: number;
  failed: number;
  skipped: number;          // items not attempted because budget exhausted
  durationMs: number;
  budgetExhausted: boolean;
}>
```

Companion helper for priority reordering:

```ts
recentFailedItemIds(jobName: string, sinceHours?: number): Promise<Set<string>>
```

Routes can use this to sort previously-failed items to the front of `items` before calling `runCronBatch`, so unresolved failures get another attempt (and surface into observability) rather than being buried by ordering luck.

### State tables (migration `0039_cron_runs.sql`)

| Table | Purpose |
|---|---|
| `cron_runs` | One row per cron invocation. Records `job_name`, `started_at`, `finished_at`, counts (`total`, `succeeded`, `failed`, `skipped`), `budget_exhausted` boolean, and optional `error_summary` JSON. Index on `(job_name, started_at DESC)` for cheap "latest N runs" lookups. |
| `cron_item_failures` | One row per failed item within a run. Columns: `run_id` (FK to `cron_runs`), `job_name`, `item_id`, `error_message`, `error_stack`, `failed_at`. Index on `(job_name, item_id, failed_at DESC)` to answer "did this item fail in any of the last N runs?". |

The runner writes a `cron_runs` row at start (counts zero) and updates it at the end. `cron_item_failures` rows are inserted inside the per-item catch as they happen so that even if the whole process is killed, completed failures are durable.

### Time-budget semantics

Before each iteration, the runner checks elapsed time against `budgetMs`. If the budget has been crossed, remaining items are counted as `skipped` (not attempted, not counted as failures), the run is marked `budget_exhausted=true`, and the function returns normally with the summary. Crucially, a budget-exhausted run is **a successful 200**, not a 500 — the cron made forward progress within its guaranteed envelope, and the next run will pick up the tail.

Default budget is 50 seconds (10 s headroom under Vercel's 60 s cap). Overridable per-call and globally via `CRON_BUDGET_MS`.

### Failure classification

The runner treats any throw from `handler` as a counted failure. It does **not** distinguish transient vs. permanent — that's the handler's job. (Handlers using AI calls already get ADR-016 retry and ADR-023 circuit-breaker semantics for free.) Every throw is persisted to `cron_item_failures` so it is observable; from there, the route can choose to re-prioritize recent failures, emit an alert at a threshold, or schedule remediation.

### Rejected alternatives

**A real queue (BullMQ / SQS / similar).** This is the PRR's long-form recommendation, and it's the right answer eventually. But today:

- Vercel Cron already schedules the runs — a queue would be additive, not replacement.
- Adding Redis/BullMQ for this specific problem means standing up another stateful dependency on the failure path we're hardening. ADR-023 explicitly declined Redis for the circuit-breaker for the same reason, and the logic applies here.
- A queue shines when you have thousands of items per run, need multi-worker fan-out, or need scheduled retries. At current tenant-count, the per-item cost dominates fan-out overhead; the batch runner plus time-budget gives us the 95% outcome with near-zero infra.

**Revisit when:** tenant count exceeds ~200, per-item cost drops below ~100 ms (making single-threaded the bottleneck), or we need cross-run retry scheduling more sophisticated than "prioritize recent failures."

**Per-job bespoke resume cursors.** An alternative would be giving each cron its own checkpoint column (`last_processed_enterprise_id`, etc.) and resuming mid-list. Rejected: four crons × custom resume logic = four places to get it wrong; the partial-completion record + priority reorder delivers the same property generically, with cross-cron observability for free.

**In-memory state only.** Keep tallies in a per-process variable and log a summary. Rejected: loses durability (SIGKILL on timeout = lost state), no way to answer "which tenants have been failing repeatedly?" at the SQL level, and `cron_runs` + `cron_item_failures` are extremely cheap.

## Consequences

### Good

- **Bounded blast radius.** A slow or broken tenant can no longer starve the rest. Each run caps at `CRON_BUDGET_MS`, and the next run picks up where the last left off (via priority reorder of recently-failed items).
- **Observable.** `SELECT * FROM cron_runs WHERE budget_exhausted=true ORDER BY started_at DESC` answers "are our crons keeping up?". `SELECT item_id, COUNT(*) FROM cron_item_failures WHERE job_name=? AND failed_at > now() - interval '7 days' GROUP BY item_id HAVING COUNT(*) > 3` answers "which tenants are chronically failing?".
- **Uniform shape.** Six cron routes collapse onto one pattern. Easier to audit, easier to wire new crons, easier to reason about timeout behaviour.
- **No new infrastructure.** Two DB tables, one utility file. Fits the existing ops surface.

### Neutral

- Per-item work is still serial within a run. If a single item's handler takes 45 seconds, it consumes nearly the whole budget. This is fine for the current per-item cost profile (snapshots are ~100 ms, governance-drift validation is ~200 ms, review-reminders is DB-only). If any handler ever grew beyond 5–10 s, we'd want to split it into its own cron or chunk its inputs — not a batch-runner concern.
- The runner does not implement per-item retries within a run. A transient failure counts as a failure, gets recorded, and is re-prioritized on the next scheduled run. This is intentional — within-run retries double-charge the time budget for the same item.

### Risks

- `cron_item_failures` is append-only and could grow unbounded. Mitigated by pruning: a subsequent ADR (or operational job) can truncate rows older than 30 days, since priority-reorder only cares about the last 24–48 hours of failures. Not blocking for this ADR.
- The runner adds two DB writes per run (start + finish of `cron_runs`) and one DB write per failure. At current cron volumes, negligible.
- Concurrent runs of the same cron would produce two `cron_runs` rows pointing at the same tenant set. Vercel Cron is single-invocation per schedule, so this isn't an issue in practice; if we ever manually trigger a second run while one is in flight, the two simply race on `upsert`/`insert` targets — handlers already handle that (`ON CONFLICT`, `delete+insert`). Not worth a lock.

Refs: ADR-016 (AI retry layer — complementary; the batch runner delegates transient-error handling to it), ADR-023 (Bedrock circuit breaker — same "no new infrastructure on the failure path" principle).
