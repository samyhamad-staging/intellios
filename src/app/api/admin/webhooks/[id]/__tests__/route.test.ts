/**
 * Admin webhooks detail endpoint tests (ADR-026 / session 156).
 *
 * Coverage: auth gate, enterprise scoping, optional ?status= filter
 * (pending|success|failed|dlq), dlq limit widening, errorClass +
 * nextAttemptAt fields in the response.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock("@/lib/request-id", () => ({
  getRequestId: vi.fn(() => "test-req-id"),
}));

const { authState } = vi.hoisted(() => ({
  authState: {
    result: {
      session: { user: { email: "admin@example.com", role: "admin", enterpriseId: "ent-1" } },
      error: null as unknown,
    } as { session: unknown; error: unknown },
  },
}));

vi.mock("@/lib/auth/require", () => ({
  requireAuth: vi.fn(async () => authState.result),
}));

const { webhooksTable, deliveriesTable } = vi.hoisted(() => ({
  webhooksTable:   { __name: "webhooks" }           as Record<string, unknown>,
  deliveriesTable: { __name: "webhook_deliveries" } as Record<string, unknown>,
}));

vi.mock("@/lib/db/schema", () => ({
  webhooks: webhooksTable,
  webhookDeliveries: deliveriesTable,
}));

vi.mock("drizzle-orm", () => ({
  eq:     (a: unknown, b: unknown) => ({ __eq: [a, b] }),
  and:    (...args: unknown[]) => ({ __and: args }),
  desc:   (x: unknown) => ({ __desc: x }),
  isNull: (x: unknown) => ({ __isNull: x }),
}));

const { state } = vi.hoisted(() => ({
  state: {
    webhookRow: null as Record<string, unknown> | null,
    deliveryRows: [] as Array<Record<string, unknown>>,
    deliveryLimit: null as number | null,
    deliveryWhere: null as unknown,
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn((fields?: Record<string, unknown>) => {
      const hasLimitOn = Boolean(fields && "id" in fields && "eventType" in fields);
      // Two distinct query shapes in this handler:
      //   - webhook lookup:       select().from(webhooks).where().limit(1)
      //   - deliveries fetch:     select({...}).from(webhookDeliveries).where().orderBy().limit(N)
      return {
        from: vi.fn(() => ({
          where: vi.fn((clause: unknown) => {
            if (hasLimitOn) state.deliveryWhere = clause;
            return {
              limit: vi.fn(async (n: number) => {
                if (!hasLimitOn) {
                  return state.webhookRow ? [state.webhookRow] : [];
                }
                state.deliveryLimit = n;
                return state.deliveryRows;
              }),
              orderBy: vi.fn(() => ({
                limit: vi.fn(async (n: number) => {
                  state.deliveryLimit = n;
                  return state.deliveryRows;
                }),
              })),
            };
          }),
        })),
      };
    }),
  },
}));

// Import AFTER mocks.
import { GET } from "../route";

function mkRequest(url: string = "http://localhost/api/admin/webhooks/wh-1"): NextRequest {
  // `NextRequest` is a Request + Next helpers; constructing a URL-shaped object
  // lets the handler read `request.nextUrl.searchParams`.
  const u = new URL(url);
  return {
    nextUrl: u,
    url,
  } as unknown as NextRequest;
}

function mkParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  state.webhookRow = null;
  state.deliveryRows = [];
  state.deliveryLimit = null;
  state.deliveryWhere = null;
  authState.result = {
    session: { user: { email: "admin@example.com", role: "admin", enterpriseId: "ent-1" } },
    error: null,
  };
  vi.clearAllMocks();
});

describe("GET /api/admin/webhooks/[id]", () => {
  it("returns auth error when requireAuth rejects", async () => {
    authState.result = {
      session: null,
      error: new Response(JSON.stringify({ error: "forbidden" }), { status: 403 }),
    };
    const res = await GET(mkRequest(), mkParams("wh-1"));
    expect(res.status).toBe(403);
  });

  it("returns 404 when webhook does not exist", async () => {
    state.webhookRow = null;
    const res = await GET(mkRequest(), mkParams("wh-missing"));
    expect(res.status).toBe(404);
  });

  it("returns 404 when webhook belongs to a different enterprise", async () => {
    state.webhookRow = {
      id: "wh-1", enterpriseId: "ent-OTHER", name: "x", url: "https://x",
      events: [], active: true, createdBy: "a", createdAt: new Date(), updatedAt: new Date(),
      secret: "s",
    };
    const res = await GET(mkRequest(), mkParams("wh-1"));
    expect(res.status).toBe(404);
  });

  it("returns webhook without secret + deliveries with errorClass/nextAttemptAt fields", async () => {
    state.webhookRow = {
      id: "wh-1", enterpriseId: "ent-1", name: "Payments", url: "https://p.example.com",
      events: [], active: true, createdBy: "admin@example.com",
      createdAt: new Date(), updatedAt: new Date(), secret: "super-secret",
    };
    state.deliveryRows = [
      {
        id: "d-1", eventType: "blueprint.created", status: "dlq", responseStatus: 503,
        attempts: 7, errorClass: "http_5xx", nextAttemptAt: null, lastAttemptedAt: new Date(),
        createdAt: new Date(),
      },
    ];

    const res = await GET(mkRequest(), mkParams("wh-1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.webhook.id).toBe("wh-1");
    expect(body.webhook.secret).toBeUndefined();
    expect(body.deliveries).toHaveLength(1);
    expect(body.deliveries[0]).toMatchObject({
      id: "d-1", status: "dlq", errorClass: "http_5xx", nextAttemptAt: null,
    });
  });

  it("defaults to limit=20 without a status filter", async () => {
    state.webhookRow = {
      id: "wh-1", enterpriseId: "ent-1", name: "n", url: "https://x", events: [],
      active: true, createdBy: "a", createdAt: new Date(), updatedAt: new Date(), secret: "s",
    };
    await GET(mkRequest(), mkParams("wh-1"));
    expect(state.deliveryLimit).toBe(20);
  });

  it("widens limit to 50 for ?status=dlq", async () => {
    state.webhookRow = {
      id: "wh-1", enterpriseId: "ent-1", name: "n", url: "https://x", events: [],
      active: true, createdBy: "a", createdAt: new Date(), updatedAt: new Date(), secret: "s",
    };
    await GET(
      mkRequest("http://localhost/api/admin/webhooks/wh-1?status=dlq"),
      mkParams("wh-1")
    );
    expect(state.deliveryLimit).toBe(50);
  });

  it("keeps limit=20 for non-dlq status filters", async () => {
    state.webhookRow = {
      id: "wh-1", enterpriseId: "ent-1", name: "n", url: "https://x", events: [],
      active: true, createdBy: "a", createdAt: new Date(), updatedAt: new Date(), secret: "s",
    };
    await GET(
      mkRequest("http://localhost/api/admin/webhooks/wh-1?status=pending"),
      mkParams("wh-1")
    );
    expect(state.deliveryLimit).toBe(20);
  });

  it("rejects unknown status values by falling back to no filter", async () => {
    state.webhookRow = {
      id: "wh-1", enterpriseId: "ent-1", name: "n", url: "https://x", events: [],
      active: true, createdBy: "a", createdAt: new Date(), updatedAt: new Date(), secret: "s",
    };
    await GET(
      mkRequest("http://localhost/api/admin/webhooks/wh-1?status=bogus"),
      mkParams("wh-1")
    );
    // Falls back to the no-filter branch; limit stays 20, where-clause is a
    // single eq (webhookId) wrapper, not an `and`.
    expect(state.deliveryLimit).toBe(20);
    expect(state.deliveryWhere).toMatchObject({ __eq: expect.anything() });
  });

  it("wraps the where clause in an `and(...)` when a valid status filter is supplied", async () => {
    state.webhookRow = {
      id: "wh-1", enterpriseId: "ent-1", name: "n", url: "https://x", events: [],
      active: true, createdBy: "a", createdAt: new Date(), updatedAt: new Date(), secret: "s",
    };
    await GET(
      mkRequest("http://localhost/api/admin/webhooks/wh-1?status=dlq"),
      mkParams("wh-1")
    );
    expect(state.deliveryWhere).toMatchObject({ __and: expect.any(Array) });
  });
});
