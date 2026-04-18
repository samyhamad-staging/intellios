/**
 * Cron batch runner (ADR-024 / H5).
 *
 * Wraps a per-item cron loop so that:
 *   1. A single slow/broken item cannot blow past Vercel's 60s function cap.
 *      A `budgetMs` guard (default env CRON_BUDGET_MS = 50_000) stops starting
 *      new items once the wall-clock budget has been crossed. Remaining items
 *      are recorded as `skipped`, and the run resolves normally — a budget-
 *      exhausted run is a successful 200, not a 500.
 *
 *   2. A single failing item cannot derail the rest. Every `handler` throw is
 *      caught, persisted to `cron_item_failures`, and the loop continues.
 *
 *   3. Partial completion is observable. Every invocation writes a row to
 *      `cron_runs` (start + finish) so SRE can query "which crons are running
 *      out of budget?" and "which items fail chronically?".
 *
 *   4. Next-run priority reorder is cheap. `recentFailedItemIds(jobName, h)`
 *      returns the set of items that failed within the given window so the
 *      caller can sort them to the front of its `items` list, giving broken
 *      tenants a fresh attempt rather than being buried by ordering luck.
 *
 * The runner does NOT retry within a run — within-run retries double-charge
 * the budget for the same item. Transient failures are expected to clear on
 * the next scheduled invocation; persistent failures surface as repeat
 * `cron_item_failures` rows that can be alerted on.
 *
 * The runner does NOT distinguish transient vs. permanent failures — that's
 * the handler's job. Handlers using AI calls already get ADR-016 retry +
 * ADR-023 circuit-breaker semantics for free.
 */

import { db } from "@/lib/db";
import { cronRuns, cronItemFailures } from "@/lib/db/schema";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { env } from "@/lib/env";
import { logger, serializeError } from "@/lib/logger";

export interface CronBatchResult {
  runId: string;
  total: number;
  succeeded: number;
  failed: number;
  /** Items not attempted because the time budget was exhausted before reaching them. */
  skipped: number;
  durationMs: number;
  budgetExhausted: boolean;
}

export interface CronBatchOptions<T> {
  /** Stable identifier for the job (also the value written to cron_runs.job_name). */
  jobName: string;
  /** Items to process. Caller is expected to have pre-sorted for priority (see recentFailedItemIds). */
  items: T[];
  /** Extract a stable, human-meaningful ID from an item — used for failure tracking. */
  itemId: (item: T) => string;
  /** Per-item work. Throwing counts as a failure; returning normally counts as a success. */
  handler: (item: T) => Promise<void>;
  /** Override the default wall-clock budget (ms). Defaults to CRON_BUDGET_MS env (50s). */
  budgetMs?: number;
}

/** Insert the cron_runs row at start. Returns the generated run ID. */
async function openRun(jobName: string, total: number): Promise<string> {
  const [row] = await db
    .insert(cronRuns)
    .values({
      jobName,
      totalItems: total,
    })
    .returning({ id: cronRuns.id });
  if (!row) {
    throw new Error(`[cron/${jobName}] failed to open cron_runs row`);
  }
  return row.id;
}

/** Update the cron_runs row at end with final tallies. Best-effort: logs but does not throw. */
async function closeRun(runId: string, result: Omit<CronBatchResult, "runId">): Promise<void> {
  try {
    await db
      .update(cronRuns)
      .set({
        finishedAt: new Date(),
        succeeded: result.succeeded,
        failed: result.failed,
        skipped: result.skipped,
        budgetExhausted: result.budgetExhausted,
      })
      .where(eq(cronRuns.id, runId));
  } catch (err) {
    logger.error("cron.run.close_failed", {
      runId,
      err: serializeError(err),
    });
  }
}

/** Record a per-item failure. Best-effort: logs but does not throw. */
async function recordFailure(
  runId: string,
  jobName: string,
  itemId: string,
  err: unknown
): Promise<void> {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack ?? null : null;
  try {
    await db.insert(cronItemFailures).values({
      runId,
      jobName,
      itemId,
      errorMessage: message.slice(0, 4000),
      errorStack: stack ? stack.slice(0, 8000) : null,
    });
  } catch (writeErr) {
    logger.error("cron.failure.record_failed", {
      runId,
      jobName,
      itemId,
      originalErr: message,
      writeErr: serializeError(writeErr),
    });
  }
}

/**
 * Run a per-item cron loop with time-budget + failure isolation + persistence.
 * See the file docstring for the full contract.
 */
export async function runCronBatch<T>(opts: CronBatchOptions<T>): Promise<CronBatchResult> {
  const budget = opts.budgetMs ?? env.CRON_BUDGET_MS;
  const startedAt = Date.now();
  const total = opts.items.length;

  const runId = await openRun(opts.jobName, total);
  logger.info("cron.run.start", {
    runId,
    jobName: opts.jobName,
    total,
    budgetMs: budget,
  });

  let succeeded = 0;
  let failed = 0;
  let skipped = 0;
  let budgetExhausted = false;

  for (let i = 0; i < opts.items.length; i++) {
    const elapsed = Date.now() - startedAt;
    if (elapsed >= budget) {
      budgetExhausted = true;
      skipped = opts.items.length - i;
      logger.warn("cron.run.budget_exhausted", {
        runId,
        jobName: opts.jobName,
        processed: i,
        remaining: skipped,
        elapsedMs: elapsed,
        budgetMs: budget,
      });
      break;
    }

    const item = opts.items[i];
    const id = opts.itemId(item);
    try {
      await opts.handler(item);
      succeeded++;
    } catch (err) {
      failed++;
      logger.error("cron.item.failed", {
        runId,
        jobName: opts.jobName,
        itemId: id,
        err: serializeError(err),
      });
      // Persist failure inline so it survives a mid-run process kill.
      await recordFailure(runId, opts.jobName, id, err);
    }
  }

  const durationMs = Date.now() - startedAt;
  const result: CronBatchResult = {
    runId,
    total,
    succeeded,
    failed,
    skipped,
    durationMs,
    budgetExhausted,
  };

  await closeRun(runId, result);

  logger.info("cron.run.finish", {
    ...result,
    jobName: opts.jobName,
  });

  return result;
}

/**
 * Return the set of `item_id`s that failed for `jobName` within the last
 * `sinceHours` hours (default: 48). Callers use this to sort previously-failed
 * items to the front of their `items` list before calling runCronBatch, giving
 * chronically-broken tenants another attempt rather than relying on natural
 * ordering luck.
 *
 * Returns a Set for O(1) membership checks in a sort comparator.
 */
export async function recentFailedItemIds(
  jobName: string,
  sinceHours = 48
): Promise<Set<string>> {
  const since = new Date(Date.now() - sinceHours * 3_600_000);
  const rows = await db
    .selectDistinct({ itemId: cronItemFailures.itemId })
    .from(cronItemFailures)
    .where(
      and(
        eq(cronItemFailures.jobName, jobName),
        gte(cronItemFailures.failedAt, since)
      )
    );
  return new Set(rows.map((r) => r.itemId));
}

/**
 * Reorder `items` in place so any item whose ID appears in `failedIds` comes
 * first (preserving relative order within each partition). Convenience helper
 * for the common "sort recent failures to the front" pattern.
 */
export function prioritizeFailed<T>(
  items: T[],
  itemId: (item: T) => string,
  failedIds: Set<string>
): T[] {
  if (failedIds.size === 0) return items;
  const failed: T[] = [];
  const rest: T[] = [];
  for (const item of items) {
    if (failedIds.has(itemId(item))) failed.push(item);
    else rest.push(item);
  }
  return [...failed, ...rest];
}
