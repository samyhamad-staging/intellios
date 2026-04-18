/**
 * Admin webhooks list endpoint tests (ADR-026 / session 156).
 *
 * Coverage: auth/role gate, enterprise scoping, dlqCount aggregation,
 * response shape.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

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

const { webhooksTable, deliveriesTable, auditLogTable } = vi.hoisted(() => ({
  webhooksTable:    { __name: "webhooks" }           as Record<string, unknown>,
  deliveriesTable:  { __name: "webhook_deliveries" } as Record<string, unknown>,
  auditLogTable:    { __name: "audit_log" }          as Record<string, unknown>,
}));

vi.mock("@/lib/db/schema", () => ({
  webhooks: webhooksTable,
  webhookDeliveries: deliveriesTable,
  auditLog: auditLogTable,
}));

vi.mock("drizzle-orm", () => ({
  eq:     (a: unknown, b: unknown) => ({ __eq: [a, b] }),
  and:    (...args: unknown[]) => ({ __and: args }),
  desc:   (x: unknown) => ({ __desc: x }),
  isNull: (x: unknown) => ({ __isNull: x }),
  sql:    Object.assign(
    (strings: TemplateStringsArray, ...values: unknown[]) => ({ __sql: { strings, values }, as: (n: string) => ({ __sql: { strings, values }, alias: n }) }),
    { }
  ),
}));

// Lightweight tag helper: tests only assert on the returned rows, not the raw SQL.
// The `sql` template-tag mock above is the minimum needed so the handler can
// build the dlqCount subquery without the tag library being real.

const { state } = vi.hoisted(() => ({
  state: {
    rows: [] as Array<Record<string, unknown>>,
    whereClause: null as unknown,
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn((clause: unknown) => {
          state.whereClause = clause;
          return {
            orderBy: vi.fn(async () => state.rows),
          };
        }),
      })),
    })),
  },
}));

// Import AFTER mocks.
import { GET } from "../route";

function mkRequest(): import("next/server").NextRequest {
  return {} as unknown as import("next/server").NextRequest;
}

beforeEach(() => {
  state.rows = [];
  state.whereClause = null;
  authState.result = {
    session: { user: { email: "admin@example.com", role: "admin", enterpriseId: "ent-1" } },
    error: null,
  };
  vi.clearAllMocks();
});

describe("GET /api/admin/webhooks", () => {
  it("returns auth error when requireAuth rejects", async () => {
    authState.result = {
      session: null,
      error: new Response(JSON.stringify({ error: "forbidden" }), { status: 403 }),
    };
    const res = await GET(mkRequest());
    expect(res.status).toBe(403);
  });

  it("returns an empty list when no webhooks are registered", async () => {
    state.rows = [];
    const res = await GET(mkRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.webhooks).toEqual([]);
  });

  it("returns webhooks with dlqCount included on each row", async () => {
    state.rows = [
      {
        id: "wh-1", enterpriseId: "ent-1", name: "Payments", url: "https://p.example.com",
        events: [], active: true, createdBy: "admin@example.com",
        createdAt: "2026-04-01T00:00:00Z", updatedAt: "2026-04-01T00:00:00Z",
        dlqCount: 3,
      },
      {
        id: "wh-2", enterpriseId: "ent-1", name: "Slack", url: "https://hooks.example.com",
        events: ["blueprint.created"], active: true, createdBy: "admin@example.com",
        createdAt: "2026-03-31T00:00:00Z", updatedAt: "2026-03-31T00:00:00Z",
        dlqCount: 0,
      },
    ];

    const res = await GET(mkRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.webhooks).toHaveLength(2);
    expect(body.webhooks[0]).toMatchObject({ id: "wh-1", name: "Payments", dlqCount: 3 });
    expect(body.webhooks[1]).toMatchObject({ id: "wh-2", name: "Slack", dlqCount: 0 });
  });

  it("applies enterprise scoping when admin has an enterpriseId", async () => {
    authState.result = {
      session: { user: { email: "admin@example.com", role: "admin", enterpriseId: "ent-1" } },
      error: null,
    };
    state.rows = [];
    await GET(mkRequest());
    // The where clause should be the eq(enterpriseId, ...) form.
    expect(state.whereClause).toMatchObject({ __eq: expect.anything() });
  });

  it("applies isNull(enterpriseId) for platform admins (enterpriseId=null)", async () => {
    authState.result = {
      session: { user: { email: "ops@example.com", role: "admin", enterpriseId: null } },
      error: null,
    };
    state.rows = [];
    await GET(mkRequest());
    // Platform admin case uses isNull(webhooks.enterpriseId). The sentinel
    // `webhooks` table has no `enterpriseId` key, so the argument to `isNull`
    // is `undefined`; assert by property presence, not value.
    expect(state.whereClause).toHaveProperty("__isNull");
  });
});
