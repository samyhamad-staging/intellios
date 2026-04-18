/**
 * Cron batch runner tests (ADR-024 / H5).
 *
 * Exercises the time-budget guard, per-item failure isolation, failure
 * persistence, priority reordering, and the lifecycle of cron_runs rows.
 *
 * The DB is mocked — we only care that the right shape of calls is made;
 * the actual SQL is covered by the schema + migration.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────────────────
// Declared BEFORE the import-under-test so vi.mock hoists correctly.

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn:  vi.fn(),
    info:  vi.fn(),
    debug: vi.fn(),
  },
  serializeError: vi.fn((err: unknown) => err),
  logAICall: vi.fn(),
}));

// Track what the runner writes.
const recordedRuns: Array<{ id: string; jobName: string; totalItems: number }> = [];
const recordedFailures: Array<{ runId: string; jobName: string; itemId: string; errorMessage: string }> = [];
const recordedUpdates: Array<{ runId: string; succeeded: number; failed: number; skipped: number; budgetExhausted: boolean }> = [];
let mockRecentFailures: string[] = []; // ids returned by recentFailedItemIds lookup

// Sentinel identity objects for table reference comparison. Drizzle stores the
// SQL table name under a Symbol, so the test substitutes simple sentinels via
// the @/lib/db/schema mock below and compares by reference. `vi.hoisted`
// ensures the sentinels exist when the hoisted `vi.mock` factories execute.
const { CRON_RUNS_TABLE, CRON_ITEM_FAILURES_TABLE } = vi.hoisted(() => ({
  CRON_RUNS_TABLE:          { __tag: "cron_runs" },
  CRON_ITEM_FAILURES_TABLE: { __tag: "cron_item_failures" },
}));

vi.mock("@/lib/db/schema", () => ({
  cronRuns:         CRON_RUNS_TABLE,
  cronItemFailures: CRON_ITEM_FAILURES_TABLE,
}));

// drizzle-orm helpers (and/eq/lt/sql/etc.) are called by the runner but the
// result is only fed back into our mock, so returning opaque placeholders is
// enough.
vi.mock("drizzle-orm", () => ({
  and: (...args: unknown[]) => ({ __op: "and", args }),
  eq:  (a: unknown, b: unknown) => ({ __op: "eq", a, b }),
  gte: (a: unknown, b: unknown) => ({ __op: "gte", a, b }),
  lt:  (a: unknown, b: unknown) => ({ __op: "lt",  a, b }),
  sql: Object.assign((...args: unknown[]) => ({ __op: "sql", args }), {
    raw: (s: string) => ({ __op: "sql.raw", s }),
  }),
}));

vi.mock("@/lib/db", () => {
  let runCounter = 0;
  return {
    db: {
      insert: vi.fn((table: unknown) => ({
        values: vi.fn((vals: Record<string, unknown>) => {
          if (table === CRON_RUNS_TABLE) {
            const id = `run-${++runCounter}`;
            recordedRuns.push({
              id,
              jobName:    vals.jobName as string,
              totalItems: vals.totalItems as number,
            });
            return {
              returning: vi.fn().mockResolvedValue([{ id }]),
            };
          }
          if (table === CRON_ITEM_FAILURES_TABLE) {
            recordedFailures.push({
              runId:        vals.runId as string,
              jobName:      vals.jobName as string,
              itemId:       vals.itemId as string,
              errorMessage: vals.errorMessage as string,
            });
            return Promise.resolve();
          }
          return Promise.resolve();
        }),
      })),
      update: vi.fn((_table: unknown) => ({
        set: vi.fn((vals: Record<string, unknown>) => ({
          where: vi.fn((_pred: unknown) => {
            recordedUpdates.push({
              runId: "latest",
              succeeded:       (vals.succeeded as number) ?? 0,
              failed:          (vals.failed as number) ?? 0,
              skipped:         (vals.skipped as number) ?? 0,
              budgetExhausted: (vals.budgetExhausted as boolean) ?? false,
            });
            return Promise.resolve();
          }),
        })),
      })),
      selectDistinct: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn().mockImplementation(() =>
            Promise.resolve(mockRecentFailures.map((id) => ({ itemId: id })))
          ),
        })),
      })),
    },
  };
});

// Narrow env override so we can pin the budget.
vi.mock("@/lib/env", () => ({
  env: {
    CRON_BUDGET_MS: 50_000,
  },
}));

// Import after mocks so the module picks them up.
import {
  runCronBatch,
  recentFailedItemIds,
  prioritizeFailed,
} from "@/lib/cron/batch-runner";

beforeEach(() => {
  recordedRuns.length = 0;
  recordedFailures.length = 0;
  recordedUpdates.length = 0;
  mockRecentFailures = [];
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-04-18T00:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

// ── Happy path ──────────────────────────────────────────────────────────────

describe("runCronBatch — all items succeed", () => {
  it("runs every item and reports succeeded=N, failed=0, skipped=0", async () => {
    const items = ["a", "b", "c", "d"];
    const seen: string[] = [];

    const result = await runCronBatch({
      jobName: "test-job",
      items,
      itemId: (x) => x,
      handler: async (x) => {
        seen.push(x);
      },
    });

    expect(seen).toEqual(["a", "b", "c", "d"]);
    expect(result.total).toBe(4);
    expect(result.succeeded).toBe(4);
    expect(result.failed).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.budgetExhausted).toBe(false);
    expect(result.runId).toMatch(/^run-/);

    // One cron_runs insert; one update with final counts.
    expect(recordedRuns).toHaveLength(1);
    expect(recordedRuns[0]).toMatchObject({ jobName: "test-job", totalItems: 4 });
    expect(recordedUpdates).toHaveLength(1);
    expect(recordedUpdates[0]).toMatchObject({
      succeeded: 4,
      failed: 0,
      skipped: 0,
      budgetExhausted: false,
    });
    // No failure rows.
    expect(recordedFailures).toHaveLength(0);
  });
});

// ── Mixed success + failure ─────────────────────────────────────────────────

describe("runCronBatch — per-item failures isolated", () => {
  it("records each failure to cron_item_failures and continues the loop", async () => {
    const items = ["ok-1", "boom-1", "ok-2", "boom-2", "ok-3"];

    const result = await runCronBatch({
      jobName: "mixed-job",
      items,
      itemId: (x) => x,
      handler: async (x) => {
        if (x.startsWith("boom")) throw new Error(`failed ${x}`);
      },
    });

    expect(result.total).toBe(5);
    expect(result.succeeded).toBe(3);
    expect(result.failed).toBe(2);
    expect(result.skipped).toBe(0);
    expect(result.budgetExhausted).toBe(false);

    expect(recordedFailures).toHaveLength(2);
    expect(recordedFailures.map((f) => f.itemId).sort()).toEqual(["boom-1", "boom-2"]);
    expect(recordedFailures[0].errorMessage).toMatch(/failed boom/);
    // Both share the same runId so they're joined to one cron_runs row.
    expect(new Set(recordedFailures.map((f) => f.runId))).toHaveProperty("size", 1);
  });

  it("carries non-Error throws into errorMessage as String(err)", async () => {
    await runCronBatch({
      jobName: "string-throw-job",
      items: ["x"],
      itemId: (x) => x,
      handler: async () => {
        throw "plain string failure";
      },
    });

    expect(recordedFailures).toHaveLength(1);
    expect(recordedFailures[0].errorMessage).toBe("plain string failure");
  });
});

// ── Time budget ─────────────────────────────────────────────────────────────

describe("runCronBatch — time budget", () => {
  it("stops starting new items once budget is crossed and reports skipped", async () => {
    const items = ["a", "b", "c", "d", "e"];
    const seen: string[] = [];

    const result = await runCronBatch({
      jobName: "slow-job",
      items,
      itemId: (x) => x,
      budgetMs: 1000,
      handler: async (x) => {
        // Each item advances virtual time by 400ms. After 3 items we've burnt
        // 1200ms and the budget guard should block further starts.
        seen.push(x);
        vi.advanceTimersByTime(400);
      },
    });

    expect(seen).toEqual(["a", "b", "c"]);
    expect(result.total).toBe(5);
    expect(result.succeeded).toBe(3);
    expect(result.failed).toBe(0);
    expect(result.skipped).toBe(2);
    expect(result.budgetExhausted).toBe(true);

    expect(recordedUpdates).toHaveLength(1);
    expect(recordedUpdates[0]).toMatchObject({
      succeeded: 3,
      skipped: 2,
      budgetExhausted: true,
    });
  });

  it("does not mark budget_exhausted when items finish within budget", async () => {
    const result = await runCronBatch({
      jobName: "fast-job",
      items: ["a", "b"],
      itemId: (x) => x,
      budgetMs: 10_000,
      handler: async () => {
        vi.advanceTimersByTime(100);
      },
    });

    expect(result.budgetExhausted).toBe(false);
    expect(result.skipped).toBe(0);
  });
});

// ── Empty input ─────────────────────────────────────────────────────────────

describe("runCronBatch — empty input list", () => {
  it("still writes a cron_runs row with zero counts", async () => {
    const result = await runCronBatch({
      jobName: "empty-job",
      items: [],
      itemId: (x: string) => x,
      handler: async () => {
        /* never called */
      },
    });

    expect(result.total).toBe(0);
    expect(result.succeeded).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.budgetExhausted).toBe(false);
    expect(recordedRuns).toHaveLength(1);
    expect(recordedRuns[0].totalItems).toBe(0);
    expect(recordedUpdates).toHaveLength(1);
  });
});

// ── Priority helpers ────────────────────────────────────────────────────────

describe("prioritizeFailed", () => {
  it("moves items matching failedIds to the front, preserving relative order", () => {
    const items = [
      { id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }, { id: "e" },
    ];
    const failed = new Set(["c", "e"]);
    const out = prioritizeFailed(items, (x) => x.id, failed);
    expect(out.map((x) => x.id)).toEqual(["c", "e", "a", "b", "d"]);
  });

  it("returns input unchanged when no items match", () => {
    const items = [{ id: "a" }, { id: "b" }];
    const out = prioritizeFailed(items, (x) => x.id, new Set(["zzz"]));
    expect(out).toEqual(items);
  });

  it("returns the exact same array reference when failedIds is empty", () => {
    const items = [{ id: "a" }];
    const out = prioritizeFailed(items, (x) => x.id, new Set());
    expect(out).toBe(items);
  });
});

describe("recentFailedItemIds", () => {
  it("returns a Set of item IDs from the DB lookup", async () => {
    mockRecentFailures = ["tenant-1", "tenant-7", "tenant-42"];
    const ids = await recentFailedItemIds("some-job");
    expect(ids).toBeInstanceOf(Set);
    expect(ids.size).toBe(3);
    expect(ids.has("tenant-7")).toBe(true);
    expect(ids.has("tenant-42")).toBe(true);
    expect(ids.has("tenant-unknown")).toBe(false);
  });

  it("returns empty Set when nothing has failed recently", async () => {
    mockRecentFailures = [];
    const ids = await recentFailedItemIds("some-job");
    expect(ids.size).toBe(0);
  });
});

// ── Handler that returns a value is OK ──────────────────────────────────────

describe("runCronBatch — handler return value is ignored", () => {
  it("accepts Promise<void> and Promise<anything> equally", async () => {
    // Even though the type is Promise<void>, JS lets a handler return a value.
    // The runner should not care.
    const items = [1, 2, 3];
    const result = await runCronBatch({
      jobName: "return-job",
      items,
      itemId: (x) => String(x),
      // Deliberately returns a number through the void signature at runtime.
      handler: (async (x: number) => x * 2) as unknown as (x: number) => Promise<void>,
    });
    expect(result.succeeded).toBe(3);
    expect(result.failed).toBe(0);
  });
});

// ── runId threading ─────────────────────────────────────────────────────────

describe("runCronBatch — runId is threaded through failure records", () => {
  it("ties every cron_item_failure to the cron_run's id", async () => {
    const result = await runCronBatch({
      jobName: "thread-job",
      items: ["boom-a", "boom-b", "ok-c"],
      itemId: (x) => x,
      handler: async (x) => {
        if (x.startsWith("boom")) throw new Error(`x=${x}`);
      },
    });

    expect(recordedFailures).toHaveLength(2);
    for (const f of recordedFailures) {
      expect(f.runId).toBe(result.runId);
      expect(f.jobName).toBe("thread-job");
    }
  });
});
