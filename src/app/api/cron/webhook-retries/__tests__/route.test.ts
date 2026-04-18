/**
 * Webhook-retries cron route tests (ADR-026 / H4).
 *
 * End-to-end-ish: mocks the DB + HTTP layer, drives the actual runCronBatch,
 * and asserts that each pending delivery transitions through the expected
 * performAttempt → recordAttempt path. Also covers the webhook_inactive
 * short-circuit and the empty-batch fast path.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { randomUUID } from "node:crypto";

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  serializeError: vi.fn((err: unknown) => err),
}));

vi.mock("@/lib/auth/cron-auth", () => ({
  requireCronAuth: vi.fn(() => null), // always authorized in tests
}));

vi.mock("@/lib/crypto/encrypt", () => ({
  decryptSecret: vi.fn((s: string) => s),
}));

// The batch runner is covered by its own tests; stub it to a direct loop so
// we can focus on the route's handler logic.
vi.mock("@/lib/cron/batch-runner", () => ({
  runCronBatch: vi.fn(async (opts: { items: unknown[]; handler: (item: unknown) => Promise<void> }) => {
    let succeeded = 0, failed = 0;
    for (const item of opts.items) {
      try { await opts.handler(item); succeeded++; } catch { failed++; }
    }
    return {
      runId: "test-run", total: opts.items.length, succeeded, failed,
      skipped: 0, durationMs: 1, budgetExhausted: false,
    };
  }),
  recentFailedItemIds: vi.fn(async () => new Set<string>()),
  prioritizeFailed: vi.fn(<T,>(items: T[]) => items), // identity
}));

// Sentinel for the webhook and deliveries tables — we never compare against
// real drizzle metadata, we just need the route's SELECT chains to return.
// vi.hoisted() keeps these available when vi.mock factories run first.
const { webhookDeliveriesTable, webhooksTable } = vi.hoisted(() => ({
  webhookDeliveriesTable: {} as Record<string, unknown>,
  webhooksTable:          {} as Record<string, unknown>,
}));

vi.mock("@/lib/db/schema", () => ({
  webhookDeliveries: webhookDeliveriesTable,
  webhooks: webhooksTable,
}));

vi.mock("drizzle-orm", () => ({
  and: (...args: unknown[]) => ({ __and: args }),
  asc: (x: unknown) => ({ __asc: x }),
  eq:  (a: unknown, b: unknown) => ({ __eq: [a, b] }),
  isNotNull: (x: unknown) => ({ __isNotNull: x }),
  lte: (a: unknown, b: unknown) => ({ __lte: [a, b] }),
  sql: Object.assign((...args: unknown[]) => ({ __sql: args }), {
    raw: (s: string) => ({ __raw: s }),
  }),
}));

type DeliveryRow = {
  id: string;
  webhookId: string;
  payload: Record<string, unknown>;
  attempts: number;
  maxAttempts: number;
  eventType: string;
};

type WebhookRow = { id: string; url: string; secret: string; active: boolean };

// Mutable state shared between the vi.mock factory and the tests. Must be
// declared via vi.hoisted() so it exists when the factory is evaluated (which
// happens before top-level test code).
const { state } = vi.hoisted(() => ({
  state: {
    pendingRows: [] as Array<{
      id: string;
      webhookId: string;
      payload: Record<string, unknown>;
      attempts: number;
      maxAttempts: number;
      eventType: string;
    }>,
    webhooksById: new Map<string, { id: string; url: string; secret: string; active: boolean }>(),
    deliveryUpdates: new Map<string, Record<string, unknown>>(),
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn((_cols?: unknown) => ({
      from: vi.fn((table: unknown) => {
        if (table === webhookDeliveriesTable) {
          // The cron's initial "pending slice" SELECT
          return {
            where: vi.fn(() => ({
              orderBy: vi.fn(() => ({
                limit: vi.fn(async () => state.pendingRows),
              })),
            })),
          };
        }
        if (table === webhooksTable) {
          // The per-delivery "load parent webhook" SELECT
          return {
            where: vi.fn((cond: { __eq: [unknown, unknown] }) => ({
              limit: vi.fn(async () => {
                const id = cond.__eq[1] as string;
                const row = state.webhooksById.get(id);
                return row ? [row] : [];
              }),
            })),
          };
        }
        return { where: vi.fn(() => ({ limit: vi.fn(async () => []) })) };
      }),
    })),
    update: vi.fn(() => ({
      set: vi.fn((vals: Record<string, unknown>) => ({
        where: vi.fn(async (cond: { __eq: [unknown, unknown] }) => {
          state.deliveryUpdates.set(cond.__eq[1] as string, vals);
        }),
      })),
    })),
  },
}));

// Stubbed fetch so the route's performAttempt path is driven per-test.
const fetchMock = vi.fn<typeof fetch>();
global.fetch = fetchMock as unknown as typeof fetch;

// Import AFTER mocks are set up.
import { GET } from "../../webhook-retries/route";

beforeEach(() => {
  state.pendingRows = [];
  state.webhooksById.clear();
  state.deliveryUpdates.clear();
  fetchMock.mockReset();
  vi.clearAllMocks();
});

function mkRequest(): import("next/server").NextRequest {
  // The route doesn't read request details — requireCronAuth is mocked — so a
  // minimal stand-in is fine.
  return {} as unknown as import("next/server").NextRequest;
}

function mkDelivery(overrides: Partial<DeliveryRow> = {}): DeliveryRow {
  return {
    id: randomUUID(),
    webhookId: randomUUID(),
    payload: {
      id: randomUUID(),
      event: "blueprint.created",
      timestamp: "2026-04-18T00:00:00Z",
      enterpriseId: null,
      actor: { email: "u@e.com", role: "admin" },
      entity: { type: "blueprint", id: randomUUID() },
      fromState: null,
      toState: null,
      metadata: null,
    },
    attempts: 1,
    maxAttempts: 7,
    eventType: "blueprint.created",
    ...overrides,
  };
}

function mkWebhook(id: string, active = true): WebhookRow {
  return { id, url: "https://sub.example.com/hook", secret: "s3cret", active };
}

describe("GET /api/cron/webhook-retries", () => {
  it("returns an empty result when nothing is due", async () => {
    const res = await GET(mkRequest());
    const body = await res.json();
    expect(body).toMatchObject({ processed: 0, succeeded: 0, pending: 0, dlq: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("marks delivery DLQ with error_class=webhook_inactive when parent webhook is gone", async () => {
    const d = mkDelivery();
    state.pendingRows = [d];
    // webhook NOT inserted → not found

    const res = await GET(mkRequest());
    const body = await res.json();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(body.dlq).toBe(1);
    expect(state.deliveryUpdates.get(d.id)).toMatchObject({
      status: "dlq",
      errorClass: "webhook_inactive",
      nextAttemptAt: null,
    });
  });

  it("marks delivery DLQ with error_class=webhook_inactive when parent is deactivated", async () => {
    const d = mkDelivery();
    state.pendingRows = [d];
    state.webhooksById.set(d.webhookId, mkWebhook(d.webhookId, /*active*/ false));

    await GET(mkRequest());

    expect(fetchMock).not.toHaveBeenCalled();
    expect(state.deliveryUpdates.get(d.id)).toMatchObject({
      status: "dlq",
      errorClass: "webhook_inactive",
    });
  });

  it("transitions to success when the subscriber returns 200", async () => {
    const d = mkDelivery();
    state.pendingRows = [d];
    state.webhooksById.set(d.webhookId, mkWebhook(d.webhookId));
    fetchMock.mockResolvedValue({
      ok: true, status: 200,
      text: vi.fn().mockResolvedValue("OK"),
    } as unknown as Response);

    const res = await GET(mkRequest());
    const body = await res.json();

    expect(body.succeeded).toBe(1);
    expect(state.deliveryUpdates.get(d.id)).toMatchObject({
      status: "success",
      responseStatus: 200,
      attempts: 2, // prior 1 + this attempt
      errorClass: null,
      nextAttemptAt: null,
    });
  });

  it("keeps delivery pending with a new next_attempt_at on 5xx", async () => {
    const d = mkDelivery({ attempts: 2 });
    state.pendingRows = [d];
    state.webhooksById.set(d.webhookId, mkWebhook(d.webhookId));
    fetchMock.mockResolvedValue({
      ok: false, status: 503,
      text: vi.fn().mockResolvedValue("busy"),
    } as unknown as Response);

    const before = Date.now();
    await GET(mkRequest());

    const update = state.deliveryUpdates.get(d.id);
    expect(update).toMatchObject({
      status: "pending",
      responseStatus: 503,
      errorClass: "http_5xx",
      attempts: 3,
    });
    // 3rd scheduled retry = 30m base, ±20% → ≥ 24m, ≤ 36m.
    const deltaMs = (update!.nextAttemptAt as Date).getTime() - before;
    expect(deltaMs).toBeGreaterThanOrEqual(24 * 60_000);
    expect(deltaMs).toBeLessThanOrEqual(37 * 60_000);
  });

  it("transitions to DLQ on non-retryable 4xx (404)", async () => {
    const d = mkDelivery();
    state.pendingRows = [d];
    state.webhooksById.set(d.webhookId, mkWebhook(d.webhookId));
    fetchMock.mockResolvedValue({
      ok: false, status: 404,
      text: vi.fn().mockResolvedValue("not found"),
    } as unknown as Response);

    const res = await GET(mkRequest());
    const body = await res.json();

    expect(body.dlq).toBe(1);
    expect(state.deliveryUpdates.get(d.id)).toMatchObject({
      status: "dlq",
      responseStatus: 404,
      errorClass: "http_4xx",
      nextAttemptAt: null,
    });
  });

  it("transitions to DLQ on final retry exhaustion (attempts+1 >= max)", async () => {
    const d = mkDelivery({ attempts: 6, maxAttempts: 7 });
    state.pendingRows = [d];
    state.webhooksById.set(d.webhookId, mkWebhook(d.webhookId));
    fetchMock.mockResolvedValue({
      ok: false, status: 503,
      text: vi.fn().mockResolvedValue("still busy"),
    } as unknown as Response);

    await GET(mkRequest());

    // 7th attempt fails retryably → DLQ (no more budget).
    expect(state.deliveryUpdates.get(d.id)).toMatchObject({
      status: "dlq",
      attempts: 7,
      errorClass: "http_5xx",
      nextAttemptAt: null,
    });
  });

  it("retries 429 (Too Many Requests) despite being 4xx", async () => {
    const d = mkDelivery();
    state.pendingRows = [d];
    state.webhooksById.set(d.webhookId, mkWebhook(d.webhookId));
    fetchMock.mockResolvedValue({
      ok: false, status: 429,
      text: vi.fn().mockResolvedValue("slow down"),
    } as unknown as Response);

    await GET(mkRequest());

    expect(state.deliveryUpdates.get(d.id)).toMatchObject({
      status: "pending",
      responseStatus: 429,
      errorClass: "http_4xx",
    });
  });

  it("processes multiple deliveries in one invocation", async () => {
    const ok = mkDelivery();
    const tooMany = mkDelivery();
    const gone = mkDelivery();
    state.pendingRows = [ok, tooMany, gone];
    state.webhooksById.set(ok.webhookId, mkWebhook(ok.webhookId));
    state.webhooksById.set(tooMany.webhookId, mkWebhook(tooMany.webhookId));
    // `gone` has no webhook row → webhook_inactive path

    fetchMock
      .mockResolvedValueOnce({ ok: true,  status: 200, text: vi.fn().mockResolvedValue("") } as unknown as Response)
      .mockResolvedValueOnce({ ok: false, status: 429, text: vi.fn().mockResolvedValue("") } as unknown as Response);

    const res = await GET(mkRequest());
    const body = await res.json();

    expect(body.succeeded).toBe(1);
    expect(body.pending).toBe(1);
    expect(body.dlq).toBe(1);
    expect(state.deliveryUpdates.get(ok.id)?.status).toBe("success");
    expect(state.deliveryUpdates.get(tooMany.id)?.status).toBe("pending");
    expect(state.deliveryUpdates.get(gone.id)?.status).toBe("dlq");
  });
});
