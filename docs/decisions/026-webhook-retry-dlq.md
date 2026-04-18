# ADR-026: Webhook retry schedule, dead-letter queue, and admin replay

**Status:** proposed
**Date:** 2026-04-18
**Supersedes:** extends ADR-009 (outbound webhook integration)

## Context

ADR-009 shipped outbound webhooks with a retry policy that does not hold up under realistic subscriber failure modes:

```ts
const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [0, 1000, 2000];  // 3 attempts in 3 seconds
```

All three attempts run inside a single `fire-and-forget` async task spawned from the audit-log event handler. If all three fail, the delivery is written to `webhook_deliveries` with `status='failed'` and the platform stops trying. ADR-009's Consequences section explicitly names this:

> *If all 3 attempts fail, the delivery is logged as `failed` but there is no automatic recovery. Admins must re-trigger manually (e.g., using the test delivery or waiting for the next matching event).*

Three concrete failure modes this does not survive:

1. **Subscriber deploy rollouts** — a typical zero-downtime deploy can take 30–120 seconds during which the receiving endpoint returns 502/503 or connection-refused. Every event that fires during that window exhausts its 3-second retry budget and lands in `failed` forever.
2. **Transient infrastructure blips** — API gateway throttles, database lock timeouts, dependent-service outages on the subscriber side. These commonly resolve in 1–15 minutes, which is well past our 3-second horizon.
3. **DLQ without a queue** — `status='failed'` is semantically a dead-letter terminus, but there is no replay endpoint, no UI control to re-queue a failed delivery, and no distinction between "exhausted retries" and "arrived here via an unexpected error during the first attempt." Admins cannot surgically recover; they can only fire a fresh `webhook.test` payload, which is a different event, with a different payload, and which does not re-deliver the missed production event.

The 2026-04-17 Production-Readiness Review flagged this as **H4 — "Webhook delivery has no backoff or dead-letter queue"**. The review recommended BullMQ/SQS-backed retries. We decline the queue, for the same reason we declined it in ADR-024 (H5): the actual requirements are "stop giving up after 3 seconds" and "let admins recover exhausted deliveries." Both are DB-backed problems, not queue-backed problems.

This ADR extends ADR-009 rather than superseding it. The signing scheme, the `webhooks` and `webhook_deliveries` tables, the admin management UI, and the dispatch-handler-on-audit-log pattern all stand. The retry loop and the terminal-failure behavior change.

## Decision

**1. Split "initial attempt" from "retries."** The audit-log event handler continues to dispatch `deliverWebhook` fire-and-forget. That call now runs a **single** delivery attempt rather than three. If the attempt fails retryably, the delivery row is left in `status='pending'` with `next_attempt_at` set into the future. Retries are driven by a new cron route.

**2. Retry schedule — exponential with jitter, 6 scheduled retries after the initial.**

| Attempt | Time after initial failure | Delay since previous |
|---:|---|---|
| 1 (inline) | 0s | — |
| 2 | ~1 min | 60s |
| 3 | ~6 min | 5m |
| 4 | ~36 min | 30m |
| 5 | ~2h 36m | 2h |
| 6 | ~10h 36m | 8h |
| 7 | ~34h 36m | 24h |

Each delay is multiplied by a jitter factor uniform in `[0.8, 1.2]` to avoid thundering-herd synchronization across many subscribers whose shared upstream went down in the same minute. Total delivery window before DLQ terminus: roughly 35 hours after the first failure. A subscriber's multi-hour outage (unplanned AWS region impairment, vendor data-center hiccup, credential rotation gone long) survives the schedule; a permanent misconfiguration exhausts it in a day and a half.

The schedule is a hardcoded array, not an algorithmic expression. Hardcoding is on purpose — operators inspecting why a delivery is at `attempts=4` with `next_attempt_at=<time>` should be able to cross-reference the literal array in source without needing to re-derive the math.

**3. Error classification — retryable vs. terminal.**

Four error classes, stored in `webhook_deliveries.error_class` on every failed attempt:

| Class | Trigger | Retryable? |
|---|---|---|
| `network` | TCP/DNS/TLS failure, no HTTP response | yes |
| `timeout` | `AbortSignal.timeout(10_000)` fired | yes |
| `http_5xx` | Response 500–599 | yes |
| `http_4xx` | Response 400–499 **except** 408, 429 | **no — straight to DLQ** |

408 (Request Timeout) and 429 (Too Many Requests) are special-cased as retryable, matching industry convention — both are subscriber-side signals that the request was valid but temporarily not servable. A 400/401/403/404/410/etc. is a configuration error on the subscriber's side; retrying buries real signal under silent reattempts. A permanent 4xx should reach the admin within minutes, not 35 hours.

`http_4xx` terminal failures set `status='dlq'` on the first attempt. Retryable failures set `status='pending'` with `next_attempt_at=now + backoff(attempts)`; only when `attempts >= max_attempts` does the final retry push the row to `status='dlq'`.

**4. Dead-letter state — `status='dlq'`, no new table.**

`webhook_deliveries.status` already has room for a new terminal value. `failed` stays valid for the historical (pre-migration) rows. New rows that exhaust retries get `dlq`. The existing admin-webhooks UI gains a DLQ filter; no new schema is needed.

Why no dedicated `webhook_dlq` table: the `webhook_deliveries` row already has the full payload, the full error trace (`response_status` + `response_body` + `error_class`), and the timeline (`attempts`, `created_at`, `last_attempted_at`). Duplicating into a sibling table would be schema churn for zero extra semantics.

**5. New `/api/cron/webhook-retries` route — every minute, batch-runner driven.**

A new Vercel cron (`* * * * *`) scans pending deliveries whose `next_attempt_at <= now()` and attempts them. The route uses the ADR-024 batch-runner from session 153 to bound wall-clock time (50s budget under the 60s function cap) and isolate per-delivery failures.

SQL shape:

```sql
SELECT id, webhook_id, payload, attempts, max_attempts
FROM webhook_deliveries
WHERE status = 'pending'
  AND next_attempt_at <= now()
  AND attempts < max_attempts
ORDER BY next_attempt_at ASC
LIMIT 200;
```

The `LIMIT` caps per-run work; any overflow is picked up on the next minute's tick. An index on `(status, next_attempt_at)` makes this scan cheap regardless of table size.

Per-delivery work:
1. Load the parent webhook (url, secret, active).
2. If the webhook has been deleted or is inactive → mark delivery `dlq` with `error_class='webhook_inactive'`.
3. Attempt delivery.
4. On success → `status='success'`, `last_attempted_at=now()`.
5. On retryable failure with `attempts+1 < max_attempts` → keep `status='pending'`, increment `attempts`, set `next_attempt_at = now + backoff(attempts+1)`, update `error_class` + `response_status` + `response_body`.
6. On terminal failure (non-retryable class, or `attempts+1 >= max_attempts`) → `status='dlq'`.

**6. Admin replay — `POST /api/admin/webhooks/deliveries/[id]/replay`.**

A new admin-gated route that resets a delivery back to the retry pipeline:

- Requires `admin` role.
- Enterprise-scoped — admin can only replay deliveries for webhooks their enterprise owns.
- Accepts deliveries in any terminal state (`success`, `failed`, `dlq`) — operators sometimes want to re-fire a successful delivery because downstream ate the event.
- Resets `status='pending'`, `attempts=0`, `next_attempt_at=now()`.
- Writes an audit event `webhook.delivery.replayed` with actor, delivery ID, and prior status.
- Returns the updated row.

The next cron tick picks up the replayed row in `< 60 seconds` and fires a fresh attempt with the preserved original payload. The retry schedule applies from that moment — 6 more scheduled retries if this one also fails.

**7. Migration 0040 — schema delta.**

```sql
ALTER TABLE webhook_deliveries
  ADD COLUMN next_attempt_at  TIMESTAMPTZ,
  ADD COLUMN max_attempts     INTEGER NOT NULL DEFAULT 7,
  ADD COLUMN error_class      TEXT;

CREATE INDEX idx_deliveries_pending_next_attempt
  ON webhook_deliveries (status, next_attempt_at)
  WHERE status = 'pending';
```

Partial index (`WHERE status = 'pending'`) keeps the index tight — terminal states (`success`, `failed`, `dlq`) don't appear in the cron's scan and don't need index rows. The table is append-heavy with bounded hot-set, so a partial index is the right shape.

`next_attempt_at` is nullable because historical rows and `success` rows don't need it. The cron only selects rows where it is both set and overdue.

`max_attempts` defaults to 7 (1 initial + 6 scheduled) matching the schedule. Kept as a per-row column so operations can raise it for specific deliveries post-hoc if needed (e.g., "this subscriber is known-flaky, give this one 12 attempts").

## Consequences

**What we get:**

- **~35-hour delivery window for transient failures.** A subscriber with an 8-hour outage gets the event delivered rather than silently dropped. That is the load-bearing behavior change.
- **Clear DLQ state.** `status='dlq'` with `error_class` tells the admin whether to fix their URL (`http_4xx`), contact the subscriber (`http_5xx` exhausted), or investigate infra (`network`/`timeout` exhausted). Prior behavior collapsed every failure into `failed` with no class signal.
- **Admin replay without re-firing a fresh event.** Preserves the original event ID, timestamp, and payload — the subscriber's idempotency key stays valid.
- **No new infrastructure.** Existing DB, existing cron platform, existing admin UI skeleton. One new route, one new library module, one migration.
- **Jitter protects shared upstreams.** A thundering-herd retry after a shared-subscriber outage would push the subscriber back into overload at the exact moment it recovers; jitter spreads the replay over a window.
- **Per-minute visibility.** The new cron runs once a minute, so an operator watching `cron_runs` sees webhook retry activity at sub-minute resolution — much tighter than the daily crons we already run.

**What we give up:**

- **Per-minute cron frequency.** All six existing crons run daily or weekly. Adding a per-minute cron increases function-invocation count by ~1,440/day. Vercel pricing absorbs this on the plan we're already on; flagged here so it's not a surprise when the bill renews.
- **No at-most-once semantics.** If the platform crashes after a successful POST but before the DB update, the next cron tick will re-send. Subscribers should idempotency-check on `X-Intellios-Delivery` as ADR-009 already documents. This ADR doesn't weaken that guarantee — the retry cron inherits it.
- **Eventual, not exactly-once, recovery.** A misconfigured 404 endpoint sits in DLQ forever until an admin replays or deletes it. That's correct behavior — silent retry-forever would be worse — but operators need a DLQ review habit. Admin UI surfacing counts is a follow-up (noted below).
- **Hardcoded schedule.** Tuning requires a code change + deploy, not a config flip. This is deliberate — operator fatigue is a real risk with configurable retry policies, and every retry schedule we've ever seen drift to "too aggressive" under pressure. Code review is the right gate.
- **Initial attempt latency unchanged.** The inline attempt is still synchronous within the fire-and-forget task. If the subscriber hangs at the TCP layer for 10s, the task blocks 10s. That was ADR-009's existing behavior and is not in scope for H4.

**Follow-ups (not this ADR):**

- Admin UI: "DLQ count by webhook" badge on the webhook-list page, plus a "Replay" button on the per-delivery row in the deliveries pane.
- Alerting on DLQ growth: a daily check that emails admins when `dlq` count exceeds a threshold per webhook.
- Per-subscriber circuit breaker: if a specific webhook's last N deliveries all went to DLQ, auto-deactivate it and notify the owner. Heavier-weight and cross-cuts session 152's circuit-breaker pattern; worth its own ADR.
- Response body capture for retry rounds: currently `response_body` is overwritten on every attempt; consider capturing the last 2 for comparison.
