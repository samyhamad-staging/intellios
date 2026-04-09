/**
 * Intake Finalization Route Tests
 *
 * Covers POST /api/intake/sessions/[id]/finalize — the transition from
 * conversational intake to blueprint generation pipeline.
 *
 * Test categories:
 *   - Happy-path finalization
 *   - Payload validation (missing name, description, tools)
 *   - Already-finalized session (conflict)
 *   - Session not found (404)
 *   - Role-based access control
 *   - Enterprise scope isolation
 *   - Audit logging and event publishing
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  mockDb,
  selectResult,
  updateResult,
  insertResult,
  findFirstResult,
  resetMockDb,
} from "../blueprints/helpers/mock-db";
import {
  mockRequireAuth,
  mockAssertEnterpriseAccess,
  setupAuthSession,
  setupAuthError,
  setupEnterpriseDenied,
  resetAuthMocks,
} from "../blueprints/helpers/mock-auth";
import { makeRequest, makeParams, responseJson } from "../blueprints/helpers/route-test-utils";

// ═══════════════════════════════════════════════════════════════════════════════
// Module mocks
// ═══════════════════════════════════════════════════════════════════════════════

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/db/schema", () => ({
  intakeSessions: { id: "id", enterpriseId: "enterpriseId" },
  auditLog: { id: "id" },
}));
vi.mock("@/lib/auth/require", () => ({ requireAuth: mockRequireAuth }));
vi.mock("@/lib/auth/enterprise", () => ({ assertEnterpriseAccess: mockAssertEnterpriseAccess }));

vi.mock("@/lib/errors", () => ({
  apiError: vi.fn(
    (code: string, message: string, details?: unknown, _requestId?: string) => {
      const statusMap: Record<string, number> = {
        NOT_FOUND: 404,
        FORBIDDEN: 403,
        INTERNAL_ERROR: 500,
        BAD_REQUEST: 400,
        CONFLICT: 409,
      };
      return new Response(JSON.stringify({ code, message, details }), {
        status: statusMap[code] ?? 500,
        headers: { "content-type": "application/json" },
      });
    }
  ),
  ErrorCode: {
    NOT_FOUND: "NOT_FOUND",
    FORBIDDEN: "FORBIDDEN",
    INTERNAL_ERROR: "INTERNAL_ERROR",
    BAD_REQUEST: "BAD_REQUEST",
    CONFLICT: "CONFLICT",
  },
}));

vi.mock("@/lib/types/intake", () => ({
  IntakePayload: {},
}));

const mockPublishEvent = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/events/publish", () => ({ publishEvent: mockPublishEvent }));

const mockGetRequestId = vi.fn().mockReturnValue("req-test-001");
vi.mock("@/lib/request-id", () => ({ getRequestId: mockGetRequestId }));

// Mock drizzle-orm operators
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((_col: unknown, val: unknown) => ({ eq: val })),
}));

// ═══════════════════════════════════════════════════════════════════════════════
// Import route handler AFTER mocks
// ═══════════════════════════════════════════════════════════════════════════════

const finalizeRoute = await import("@/app/api/intake/sessions/[id]/finalize/route");

// ═══════════════════════════════════════════════════════════════════════════════
// Fixtures
// ═══════════════════════════════════════════════════════════════════════════════

function makeIntakeSession(overrides: Record<string, unknown> = {}) {
  return {
    id: "session-001",
    enterpriseId: "ent-001",
    status: "in_progress",
    intakePayload: {
      identity: { name: "Customer Support Agent", description: "Handles customer inquiries" },
      capabilities: { tools: [{ name: "ticket_lookup", description: "Looks up tickets" }] },
      guardrails: {},
    },
    createdAt: new Date("2026-01-15"),
    updatedAt: new Date("2026-01-15"),
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Global setup
// ═══════════════════════════════════════════════════════════════════════════════

beforeEach(() => {
  resetMockDb();
  resetAuthMocks();
  mockPublishEvent.mockClear();
  mockGetRequestId.mockReturnValue("req-test-001");
});

// ═══════════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe("POST /api/intake/sessions/[id]/finalize", () => {
  it("finalizes a valid intake session", async () => {
    setupAuthSession({ role: "architect", enterpriseId: "ent-001" });
    const session = makeIntakeSession();
    findFirstResult.mockReturnValue(session);
    const updated = { ...session, status: "completed" };
    updateResult.mockReturnValue([updated]);
    insertResult.mockReturnValue([]); // audit log

    const req = makeRequest("POST", "http://localhost:3000/api/intake/sessions/session-001/finalize");
    const res = await finalizeRoute.POST(req, makeParams("session-001"));
    const body = (await responseJson(res)) as { session: { status: string }; payload: unknown };

    expect(res.status).toBe(200);
    expect(body.session.status).toBe("completed");
    expect(body.payload).toBeDefined();
  });

  it("returns 404 for nonexistent session", async () => {
    setupAuthSession({ role: "architect", enterpriseId: "ent-001" });
    findFirstResult.mockReturnValue(undefined);

    const req = makeRequest("POST", "http://localhost:3000/api/intake/sessions/nope/finalize");
    const res = await finalizeRoute.POST(req, makeParams("nope"));

    expect(res.status).toBe(404);
  });

  it("returns 409 for already-finalized session", async () => {
    setupAuthSession({ role: "architect", enterpriseId: "ent-001" });
    findFirstResult.mockReturnValue(makeIntakeSession({ status: "completed" }));

    const req = makeRequest("POST", "http://localhost:3000/api/intake/sessions/session-001/finalize");
    const res = await finalizeRoute.POST(req, makeParams("session-001"));

    expect(res.status).toBe(409);
  });

  it("rejects session missing agent name", async () => {
    setupAuthSession({ role: "architect", enterpriseId: "ent-001" });
    findFirstResult.mockReturnValue(makeIntakeSession({
      intakePayload: {
        identity: { name: null, description: "Has description" },
        capabilities: { tools: [{ name: "t1" }] },
      },
    }));

    const req = makeRequest("POST", "http://localhost:3000/api/intake/sessions/session-001/finalize");
    const res = await finalizeRoute.POST(req, makeParams("session-001"));

    expect(res.status).toBe(400);
  });

  it("rejects session missing agent description", async () => {
    setupAuthSession({ role: "architect", enterpriseId: "ent-001" });
    findFirstResult.mockReturnValue(makeIntakeSession({
      intakePayload: {
        identity: { name: "Agent", description: null },
        capabilities: { tools: [{ name: "t1" }] },
      },
    }));

    const req = makeRequest("POST", "http://localhost:3000/api/intake/sessions/session-001/finalize");
    const res = await finalizeRoute.POST(req, makeParams("session-001"));

    expect(res.status).toBe(400);
  });

  it("rejects session with no tools/capabilities", async () => {
    setupAuthSession({ role: "architect", enterpriseId: "ent-001" });
    findFirstResult.mockReturnValue(makeIntakeSession({
      intakePayload: {
        identity: { name: "Agent", description: "Desc" },
        capabilities: { tools: [] },
      },
    }));

    const req = makeRequest("POST", "http://localhost:3000/api/intake/sessions/session-001/finalize");
    const res = await finalizeRoute.POST(req, makeParams("session-001"));

    expect(res.status).toBe(400);
  });

  it("rejects unauthorized role (viewer)", async () => {
    setupAuthError("FORBIDDEN");

    const req = makeRequest("POST", "http://localhost:3000/api/intake/sessions/session-001/finalize");
    const res = await finalizeRoute.POST(req, makeParams("session-001"));

    expect(res.status).toBe(403);
  });

  it("rejects unauthenticated request", async () => {
    setupAuthError("UNAUTHORIZED");

    const req = makeRequest("POST", "http://localhost:3000/api/intake/sessions/session-001/finalize");
    const res = await finalizeRoute.POST(req, makeParams("session-001"));

    expect(res.status).toBe(401);
  });

  it("enforces enterprise scope isolation", async () => {
    setupAuthSession({ role: "architect", enterpriseId: "ent-001" });
    findFirstResult.mockReturnValue(makeIntakeSession({ enterpriseId: "ent-999" }));
    setupEnterpriseDenied();

    const req = makeRequest("POST", "http://localhost:3000/api/intake/sessions/session-001/finalize");
    const res = await finalizeRoute.POST(req, makeParams("session-001"));

    expect(res.status).toBe(403);
  });

  it("writes audit log on finalization", async () => {
    setupAuthSession({ role: "admin", enterpriseId: "ent-001", email: "admin@acme.com" });
    findFirstResult.mockReturnValue(makeIntakeSession());
    updateResult.mockReturnValue([makeIntakeSession({ status: "completed" })]);
    insertResult.mockReturnValue([]);

    const req = makeRequest("POST", "http://localhost:3000/api/intake/sessions/session-001/finalize");
    await finalizeRoute.POST(req, makeParams("session-001"));

    // insert called for audit log
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("publishes intake.finalized event", async () => {
    setupAuthSession({ role: "architect", enterpriseId: "ent-001" });
    findFirstResult.mockReturnValue(makeIntakeSession());
    updateResult.mockReturnValue([makeIntakeSession({ status: "completed" })]);
    insertResult.mockReturnValue([]);

    const req = makeRequest("POST", "http://localhost:3000/api/intake/sessions/session-001/finalize");
    await finalizeRoute.POST(req, makeParams("session-001"));

    expect(mockPublishEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({ type: "intake.finalized" }),
      })
    );
  });

  it("designer role can finalize", async () => {
    setupAuthSession({ role: "designer", enterpriseId: "ent-001" });
    findFirstResult.mockReturnValue(makeIntakeSession());
    updateResult.mockReturnValue([makeIntakeSession({ status: "completed" })]);
    insertResult.mockReturnValue([]);

    const req = makeRequest("POST", "http://localhost:3000/api/intake/sessions/session-001/finalize");
    const res = await finalizeRoute.POST(req, makeParams("session-001"));

    expect(res.status).toBe(200);
  });
});
