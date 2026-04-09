/**
 * Shared Drizzle ORM mock for blueprint lifecycle tests.
 *
 * Provides a chainable mock `db` object that satisfies the query patterns
 * used across all blueprint API routes:
 *   db.select(cols).from(table).where(cond).limit(n)
 *   db.update(table).set(fields).where(cond).returning()
 *   db.insert(table).values(data).returning()
 *   db.query.tableName.findFirst({ where })
 *   db.transaction(async (tx) => { ... })
 *
 * Call `resetMockDb()` in beforeEach to clear all mock state.
 */

import { vi } from "vitest";

// ─── Core mock functions ─────────────────────────────────────────────────────

/** The resolved rows for the next `.select().from().where().limit()` chain. */
export const selectResult = vi.fn<() => unknown[]>().mockReturnValue([]);

/** The resolved rows for the next `.update().set().where().returning()` chain. */
export const updateResult = vi.fn<() => unknown[]>().mockReturnValue([]);

/** The resolved rows for the next `.insert().values().returning()` chain. */
export const insertResult = vi.fn<() => unknown[]>().mockReturnValue([]);

/** The resolved value for `db.query.*.findFirst()`. */
export const findFirstResult = vi.fn<() => unknown>().mockReturnValue(undefined);

// ─── Chainable mock db ──────────────────────────────────────────────────────

export const mockDb = {
  // select chain: db.select(cols).from(table).where(cond).limit(n).orderBy(...)
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockImplementation(function (this: typeof mockDb) {
    // After .where(), .limit() or direct await should resolve to selectResult
    return {
      limit: vi.fn().mockImplementation(() => selectResult()),
      orderBy: vi.fn().mockImplementation(() => selectResult()),
      returning: vi.fn().mockImplementation(() => updateResult()),
    };
  }),
  limit: vi.fn().mockImplementation(() => selectResult()),
  orderBy: vi.fn().mockImplementation(() => selectResult()),

  // update chain: db.update(table).set(fields).where(cond).returning()
  update: vi.fn().mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockImplementation(() => updateResult()),
      }),
    }),
  }),

  // insert chain: db.insert(table).values(data).returning()
  insert: vi.fn().mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockImplementation(() => insertResult()),
    }),
  }),

  // query helpers (used by various routes for findFirst)
  query: {
    intakeSessions: {
      findFirst: vi.fn().mockImplementation(() => findFirstResult()),
    },
    blueprintTestRuns: {
      findFirst: vi.fn().mockResolvedValue(undefined),
    },
  },

  // transaction: pass the mock db to the callback
  transaction: vi.fn().mockImplementation(async (fn: (tx: typeof mockDb) => Promise<unknown>) => {
    return fn(mockDb);
  }),
};

// ─── Reset helper ────────────────────────────────────────────────────────────

export function resetMockDb() {
  selectResult.mockReset().mockReturnValue([]);
  updateResult.mockReset().mockReturnValue([]);
  insertResult.mockReset().mockReturnValue([]);
  findFirstResult.mockReset().mockReturnValue(undefined);

  // Reset all vi.fn() on mockDb without losing structure
  mockDb.select.mockClear();
  mockDb.from.mockClear();
  mockDb.where.mockClear();
  mockDb.limit.mockClear();
  mockDb.orderBy.mockClear();
  mockDb.update.mockClear();
  mockDb.insert.mockClear();
  mockDb.transaction.mockClear();
  mockDb.query.intakeSessions.findFirst.mockClear();
  mockDb.query.blueprintTestRuns.findFirst.mockClear();

  // Re-wire chains after clear
  mockDb.select.mockReturnThis();
  mockDb.from.mockReturnThis();
  mockDb.where.mockImplementation(() => ({
    limit: vi.fn().mockImplementation(() => selectResult()),
    orderBy: vi.fn().mockImplementation(() => selectResult()),
    returning: vi.fn().mockImplementation(() => updateResult()),
  }));
  mockDb.limit.mockImplementation(() => selectResult());
  mockDb.orderBy.mockImplementation(() => selectResult());
  mockDb.update.mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockImplementation(() => updateResult()),
      }),
    }),
  });
  mockDb.insert.mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockImplementation(() => insertResult()),
    }),
  });
  mockDb.transaction.mockImplementation(async (fn: (tx: typeof mockDb) => Promise<unknown>) => fn(mockDb));
}
