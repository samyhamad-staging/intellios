/**
 * Admin webhook-delivery replay endpoint tests (ADR-026 / H4).
 *
 * Coverage: auth/role gate, enterprise scoping, inactive-webhook guard,
 * terminal-state acceptance, audit-log entry, state reset semantics.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { randomUUID } from "node:crypto";

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  serializeError: vi.fn((err: unknown) => err),
}));

vi.mock("@/lib/request-id", () => ({
  getRequestId: vi.fn(() => "test-req-id"),
}));

// requireAuth outcome can be per-test; default: admin in enterprise 'ent-1'.
// vi.hoisted keeps this reference available inside the vi.mock factory.
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

const { webhookDeliveriesTable, webhooksTable, auditLogTable } = vi.hoisted(() => ({
  webhookDeliveriesTable: { __name: "webhook_deliveries" } as Record<string, unknown>,
  webhooksTable:          { __name: "webhooks" }            as Record<string, unknown>,
  auditLogTable:          { __name: "audit_log" }           as Record<string, unknown>,
}));

vi.mock("@/lib/db/schema", () => ({
  webhookDeliveries: webhookDeliveriesTable,
  webhooks: webhooksTable,
  auditLog: auditLogTable,
}));

vi.mock("drizzle-orm", () => ({
  eq: (a: unknown, b: unknown) => ({ __eq: [a, b] }),
}));

type JoinedRow = {
  delivery: {
    id: string;
    webhookId: string;
    status: string;
    attempts: number;
    errorClass: string | null;
  };
  webhookEnterpriseId: string | null;
  webhookActive: boolean;
};

// Hoisted so vi.mock factories can close over it.
const { state } = vi.hoisted(() => ({
  state: {
    joinedRow: null as {
      delivery: { id: string; webhookId: string; status: string; attempts: number; errorClass: string | null };
      webhookEnterpriseId: string | null;
      webhookActive: boolean;
    } | null,
    updates: [] as Array<Record<string, unknown>>,
    audits: [] as Array<Record<string, unknown>>,
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(async () => (state.joinedRow ? [state.joinedRow] : [])),
          })),
        })),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn((vals: Record<string, unknown>) => ({
        where: vi.fn(() => ({
          returning: vi.fn(async () => {
            state.updates.push(vals);
            return [{ id: state.joinedRow?.delivery.id ?? "?", ...vals }];
          }),
        })),
      })),
    })),
    insert: vi.fn((table: unknown) => ({
      values: vi.fn(async (vals: Record<string, unknown>) => {
        if (table === auditLogTable) state.audits.push(vals);
      }),
    })),
  },
}));

// Import AFTER mocks.
import { POST } from "../route";

function mkRequest(): import("next/server").NextRequest {
  return {} as unknown as import("next/server").NextRequest;
}

function mkParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  state.joinedRow = null;
  state.updates = [];
  state.audits = [];
  authState.result = {
    session: { user: { email: "admin@example.com", role: "admin", enterpriseId: "ent-1" } },
    error: null,
  };
  vi.clearAllMocks();
});

describe("POST /api/admin/webhooks/deliveries/[id]/replay", () => {
  it("returns auth error when requireAuth rejects", async () => {
    authState.result = {
      session: null,
      error: new Response(JSON.stringify({ error: "forbidden" }), { status: 403 }),
    };
    const res = await POST(mkRequest(), mkParams("any-id"));
    expect(res.status).toBe(403);
  });

  it("returns 404 when delivery does not exist", async () => {
    state.joinedRow = null;
    const res = await POST(mkRequest(), mkParams(randomUUID()));
    expect(res.status).toBe(404);
  });

  it("returns 404 when delivery belongs to a different enterprise", async () => {
    const deliveryId = randomUUID();
    state.joinedRow = {
      delivery: { id: deliveryId, webhookId: randomUUID(), status: "dlq", attempts: 7, errorClass: "http_5xx" },
      webhookEnterpriseId: "ent-OTHER",
      webhookActive: true,
    };
    const res = await POST(mkRequest(), mkParams(deliveryId));
    expect(res.status).toBe(404);
    expect(state.updates).toHaveLength(0);
  });

  it("refuses to replay when parent webhook is inactive", async () => {
    const deliveryId = randomUUID();
    state.joinedRow = {
      delivery: { id: deliveryId, webhookId: randomUUID(), status: "dlq", attempts: 7, errorClass: "http_5xx" },
      webhookEnterpriseId: "ent-1",
      webhookActive: false,
    };
    const res = await POST(mkRequest(), mkParams(deliveryId));
    expect(res.status).toBe(422);
    expect(state.updates).toHaveLength(0);
  });

  it("resets dlq delivery to pending with attempts=0 and next_attempt_at=now", async () => {
    const deliveryId = randomUUID();
    const webhookId = randomUUID();
    state.joinedRow = {
      delivery: { id: deliveryId, webhookId, status: "dlq", attempts: 7, errorClass: "http_5xx" },
      webhookEnterpriseId: "ent-1",
      webhookActive: true,
    };

    const before = Date.now();
    const res = await POST(mkRequest(), mkParams(deliveryId));
    expect(res.status).toBe(200);

    expect(state.updates).toHaveLength(1);
    const update = state.updates[0];
    expect(update).toMatchObject({
      status: "pending",
      attempts: 0,
      errorClass: null,
    });
    const nextAt = (update.nextAttemptAt as Date).getTime();
    expect(nextAt).toBeGreaterThanOrEqual(before);
    expect(nextAt).toBeLessThanOrEqual(Date.now());
  });

  it("writes audit event webhook.delivery.replayed with prior state metadata", async () => {
    const deliveryId = randomUUID();
    const webhookId = randomUUID();
    state.joinedRow = {
      delivery: { id: deliveryId, webhookId, status: "dlq", attempts: 7, errorClass: "http_5xx" },
      webhookEnterpriseId: "ent-1",
      webhookActive: true,
    };

    await POST(mkRequest(), mkParams(deliveryId));

    expect(state.audits).toHaveLength(1);
    expect(state.audits[0]).toMatchObject({
      action: "webhook.delivery.replayed",
      entityType: "webhook",
      entityId: webhookId,
      enterpriseId: "ent-1",
      actorEmail: "admin@example.com",
      actorRole: "admin",
    });
    expect((state.audits[0].metadata as Record<string, unknown>).priorStatus).toBe("dlq");
    expect((state.audits[0].metadata as Record<string, unknown>).priorAttempts).toBe(7);
    expect((state.audits[0].metadata as Record<string, unknown>).priorErrorClass).toBe("http_5xx");
  });

  it("accepts replay of a successful delivery (operators re-firing events)", async () => {
    const deliveryId = randomUUID();
    state.joinedRow = {
      delivery: { id: deliveryId, webhookId: randomUUID(), status: "success", attempts: 1, errorClass: null },
      webhookEnterpriseId: "ent-1",
      webhookActive: true,
    };
    const res = await POST(mkRequest(), mkParams(deliveryId));
    expect(res.status).toBe(200);
    expect(state.updates[0]).toMatchObject({ status: "pending", attempts: 0 });
  });

  it("platform admin (enterpriseId=null) can replay across enterprises", async () => {
    authState.result = {
      session: { user: { email: "ops@example.com", role: "admin", enterpriseId: null } },
      error: null,
    };
    const deliveryId = randomUUID();
    state.joinedRow = {
      delivery: { id: deliveryId, webhookId: randomUUID(), status: "dlq", attempts: 7, errorClass: "network" },
      webhookEnterpriseId: "ent-someone-else",
      webhookActive: true,
    };
    const res = await POST(mkRequest(), mkParams(deliveryId));
    expect(res.status).toBe(200);
  });
});
