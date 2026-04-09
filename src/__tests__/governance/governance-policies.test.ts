/**
 * Governance Policy Route Tests
 *
 * Covers the four governance policy API routes that control which rules
 * blueprints are validated against:
 *
 *   1. GET  /api/governance/policies           — List active policies (tenant-scoped)
 *   2. POST /api/governance/policies           — Create a new policy
 *   3. GET  /api/governance/policies/[id]      — Fetch single policy
 *   4. PATCH /api/governance/policies/[id]     — Update (new version via transaction)
 *   5. DELETE /api/governance/policies/[id]    — Delete a policy
 *   6. GET  /api/governance/policies/[id]/dependents — Count affected blueprints
 *   7. POST /api/governance/templates/[pack]/apply   — Bulk-apply template pack
 *
 * Test categories:
 *   - CRUD happy paths
 *   - Role-based access control (admin vs compliance_officer)
 *   - Enterprise scope isolation (compliance_officer cannot touch global or other-enterprise policies)
 *   - Version append-only semantics (PATCH creates new row, supersedes old)
 *   - Template pack: duplicate detection, force mode
 *   - Audit logging side-effects
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  mockDb,
  selectResult,
  updateResult,
  insertResult,
  resetMockDb,
} from "../blueprints/helpers/mock-db";
import {
  mockRequireAuth,
  setupAuthSession,
  setupAuthError,
  resetAuthMocks,
} from "../blueprints/helpers/mock-auth";
import { makeRequest, makeParams, responseJson } from "../blueprints/helpers/route-test-utils";

// ═══════════════════════════════════════════════════════════════════════════════
// Module mocks — must be at top level before any imports of the routes
// ═══════════════════════════════════════════════════════════════════════════════

// Governance routes use `await db.select().from().where()` without .limit(),
// so we need where() to be thenable (returning selectResult) AND have .limit()/.orderBy().
// Patch mockDb.where to return a thenable object.
const makeThenableWhere = () => {
  const result = {
    limit: vi.fn().mockImplementation(() => selectResult()),
    orderBy: vi.fn().mockImplementation(() => selectResult()),
    returning: vi.fn().mockImplementation(() => updateResult()),
    then: (resolve: (v: unknown) => void, reject?: (e: unknown) => void) => {
      return Promise.resolve(selectResult()).then(resolve, reject);
    },
  };
  return result;
};
mockDb.where.mockImplementation(() => makeThenableWhere());

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/db/schema", () => ({
  governancePolicies: {
    id: "id",
    enterpriseId: "enterpriseId",
    name: "name",
    supersededAt: "supersededAt",
    status: "status",
  },
  agentBlueprints: {
    id: "id",
    enterpriseId: "enterpriseId",
    status: "status",
    agentId: "agentId",
  },
  auditLog: { id: "id" },
}));
vi.mock("@/lib/db/safe-columns", () => ({
  ALL_POLICY_COLUMNS: {},
}));
vi.mock("@/lib/auth/require", () => ({ requireAuth: mockRequireAuth }));

const mockPublishEvent = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/events/publish", () => ({ publishEvent: mockPublishEvent }));

const mockParseBody = vi.fn();
vi.mock("@/lib/parse-body", () => ({ parseBody: mockParseBody }));

const mockGetRequestId = vi.fn().mockReturnValue("req-test-001");
vi.mock("@/lib/request-id", () => ({ getRequestId: mockGetRequestId }));

const mockEnterpriseScope = vi.fn().mockReturnValue(undefined);
vi.mock("@/lib/auth/enterprise-scope", () => ({
  enterpriseScope: mockEnterpriseScope,
}));

const mockWithTenantScopeGuarded = vi
  .fn()
  .mockImplementation(
    async (_req: unknown, fn: (ctx: unknown) => Promise<unknown>) => {
      return fn({ enterpriseId: "ent-001" });
    }
  );
vi.mock("@/lib/auth/with-tenant-scope", () => ({
  withTenantScopeGuarded: mockWithTenantScopeGuarded,
}));

const mockFindTemplatePack = vi.fn();
vi.mock("@/lib/governance/policy-templates", () => ({
  findTemplatePack: mockFindTemplatePack,
}));

vi.mock("@/lib/errors", () => ({
  apiError: vi.fn(
    (code: string, message: string, _details?: unknown, _requestId?: string) => {
      const statusMap: Record<string, number> = {
        NOT_FOUND: 404,
        FORBIDDEN: 403,
        INTERNAL_ERROR: 500,
        BAD_REQUEST: 400,
        UNAUTHORIZED: 401,
      };
      return new Response(JSON.stringify({ code, message }), {
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
    UNAUTHORIZED: "UNAUTHORIZED",
  },
}));

// Mock drizzle-orm operators — pass through
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((_col: unknown, val: unknown) => ({ eq: val })),
  and: vi.fn((...args: unknown[]) => ({ and: args })),
  or: vi.fn((...args: unknown[]) => ({ or: args })),
  isNull: vi.fn((col: unknown) => ({ isNull: col })),
  inArray: vi.fn((_col: unknown, vals: unknown) => ({ inArray: vals })),
}));

let mockRandomUUID = vi.fn().mockReturnValue("new-uuid-001");
vi.mock("crypto", () => ({
  randomUUID: (...args: unknown[]) => mockRandomUUID(...args),
}));

// ═══════════════════════════════════════════════════════════════════════════════
// Import route handlers AFTER mocks are registered
// ═══════════════════════════════════════════════════════════════════════════════

const policiesListRoute = await import(
  "@/app/api/governance/policies/route"
);
const policyDetailRoute = await import(
  "@/app/api/governance/policies/[id]/route"
);
const dependentsRoute = await import(
  "@/app/api/governance/policies/[id]/dependents/route"
);
const templateApplyRoute = await import(
  "@/app/api/governance/templates/[pack]/apply/route"
);

// ═══════════════════════════════════════════════════════════════════════════════
// Fixtures
// ═══════════════════════════════════════════════════════════════════════════════

function makePolicy(overrides: Record<string, unknown> = {}) {
  return {
    id: "pol-001",
    name: "SR 11-7 Model Validation",
    type: "compliance",
    description: "Ensures model risk management alignment",
    rules: [{ id: "r1", field: "guardrails.inputFiltering", operator: "exists", severity: "error", message: "Input filtering required" }],
    enterpriseId: "ent-001",
    policyVersion: 1,
    previousVersionId: null,
    supersededAt: null,
    scopedAgentIds: null,
    createdAt: new Date("2026-01-15"),
    ...overrides,
  };
}

function makeTemplatePack(overrides: Record<string, unknown> = {}) {
  return {
    id: "sr-11-7-core",
    name: "SR 11-7 Core",
    description: "Core model risk management policies",
    policies: [
      { name: "Model Validation", type: "compliance", description: "Validates models", rules: [{ field: "guardrails", operator: "exists", severity: "error", message: "Required" }] },
      { name: "Model Documentation", type: "compliance", description: "Documents models", rules: [{ field: "metadata", operator: "exists", severity: "warning", message: "Recommended" }] },
    ],
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
  mockParseBody.mockReset();
  mockGetRequestId.mockReturnValue("req-test-001");
  mockFindTemplatePack.mockReset();
  mockRandomUUID.mockReturnValue("new-uuid-001");
  mockEnterpriseScope.mockReturnValue(undefined);
  mockWithTenantScopeGuarded.mockClear();
  mockWithTenantScopeGuarded.mockImplementation(
    async (_req: unknown, fn: (ctx: unknown) => Promise<unknown>) => {
      return fn({ enterpriseId: "ent-001" });
    }
  );
  // Re-wire where() to be thenable for governance routes
  mockDb.where.mockImplementation(() => {
    const result = {
      limit: vi.fn().mockImplementation(() => selectResult()),
      orderBy: vi.fn().mockImplementation(() => selectResult()),
      returning: vi.fn().mockImplementation(() => updateResult()),
      then: (resolve: (v: unknown) => void, reject?: (e: unknown) => void) => {
        return Promise.resolve(selectResult()).then(resolve, reject);
      },
    };
    return result;
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 1. GET /api/governance/policies — List policies
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /api/governance/policies", () => {
  it("returns policies for authenticated user", async () => {
    setupAuthSession({ role: "admin", enterpriseId: "ent-001" });
    const policies = [makePolicy(), makePolicy({ id: "pol-002", name: "Safety Baseline" })];
    selectResult.mockReturnValue(policies);

    const req = makeRequest("GET", "http://localhost:3000/api/governance/policies");
    const res = await policiesListRoute.GET(req);
    const body = (await responseJson(res)) as { policies: unknown[] };

    expect(res.status).toBe(200);
    expect(body.policies).toHaveLength(2);
  });

  it("rejects unauthenticated request", async () => {
    const err = setupAuthError("UNAUTHORIZED");
    const req = makeRequest("GET", "http://localhost:3000/api/governance/policies");
    const res = await policiesListRoute.GET(req);

    expect(res.status).toBe(401);
  });

  it("delegates to withTenantScopeGuarded", async () => {
    setupAuthSession({ role: "compliance_officer", enterpriseId: "ent-001" });
    selectResult.mockReturnValue([]);

    const req = makeRequest("GET", "http://localhost:3000/api/governance/policies");
    await policiesListRoute.GET(req);

    expect(mockWithTenantScopeGuarded).toHaveBeenCalledTimes(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. POST /api/governance/policies — Create policy
// ═══════════════════════════════════════════════════════════════════════════════

describe("POST /api/governance/policies", () => {
  it("creates a design-time policy for admin", async () => {
    setupAuthSession({ role: "admin", enterpriseId: "ent-001" });
    const newPolicy = makePolicy({ id: "pol-new" });
    mockParseBody.mockResolvedValue({
      data: { name: "New Policy", type: "safety", rules: [], scopedAgentIds: null },
      error: null,
    });
    insertResult.mockReturnValue([newPolicy]);

    const req = makeRequest("POST", "http://localhost:3000/api/governance/policies", {
      body: { name: "New Policy", type: "safety", rules: [] },
    });
    const res = await policiesListRoute.POST(req);
    const body = (await responseJson(res)) as { policy: unknown };

    expect(res.status).toBe(201);
    expect(body.policy).toBeDefined();
  });

  it("creates a runtime policy for compliance_officer", async () => {
    setupAuthSession({ role: "compliance_officer", enterpriseId: "ent-001" });
    const newPolicy = makePolicy({ id: "pol-runtime", type: "runtime" });
    mockParseBody.mockResolvedValue({
      data: { name: "Runtime Budget", type: "runtime", rules: [], scopedAgentIds: null },
      error: null,
    });
    insertResult.mockReturnValue([newPolicy]);

    const req = makeRequest("POST", "http://localhost:3000/api/governance/policies", {
      body: { name: "Runtime Budget", type: "runtime", rules: [] },
    });
    const res = await policiesListRoute.POST(req);

    expect(res.status).toBe(201);
  });

  it("rejects unauthorized role (viewer)", async () => {
    setupAuthError("FORBIDDEN");

    const req = makeRequest("POST", "http://localhost:3000/api/governance/policies", {
      body: { name: "Test", type: "safety", rules: [] },
    });
    const res = await policiesListRoute.POST(req);

    expect(res.status).toBe(403);
  });

  it("rejects invalid body", async () => {
    setupAuthSession({ role: "admin", enterpriseId: "ent-001" });
    const bodyError = new Response(JSON.stringify({ code: "BAD_REQUEST", message: "Invalid body" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
    mockParseBody.mockResolvedValue({ data: null, error: bodyError });

    const req = makeRequest("POST", "http://localhost:3000/api/governance/policies", {
      body: {},
    });
    const res = await policiesListRoute.POST(req);

    expect(res.status).toBe(400);
  });

  it("writes audit log on creation", async () => {
    setupAuthSession({ role: "admin", enterpriseId: "ent-001", email: "admin@acme.com" });
    const newPolicy = makePolicy({ id: "pol-audited" });
    mockParseBody.mockResolvedValue({
      data: { name: "Audited", type: "safety", rules: [], scopedAgentIds: null },
      error: null,
    });
    insertResult.mockReturnValue([newPolicy]);

    const req = makeRequest("POST", "http://localhost:3000/api/governance/policies");
    await policiesListRoute.POST(req);

    // insert is called twice: once for the policy, once for audit log
    expect(mockDb.insert).toHaveBeenCalledTimes(2);
  });

  it("publishes policy.created event", async () => {
    setupAuthSession({ role: "admin", enterpriseId: "ent-001" });
    const newPolicy = makePolicy({ id: "pol-evented" });
    mockParseBody.mockResolvedValue({
      data: { name: "Evented", type: "safety", rules: [], scopedAgentIds: null },
      error: null,
    });
    insertResult.mockReturnValue([newPolicy]);

    const req = makeRequest("POST", "http://localhost:3000/api/governance/policies");
    await policiesListRoute.POST(req);

    expect(mockPublishEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({ type: "policy.created" }),
      })
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. GET /api/governance/policies/[id] — Fetch single policy
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /api/governance/policies/[id]", () => {
  it("returns policy for admin", async () => {
    setupAuthSession({ role: "admin", enterpriseId: "ent-001" });
    selectResult.mockReturnValue([makePolicy()]);

    const req = makeRequest("GET", "http://localhost:3000/api/governance/policies/pol-001");
    const res = await policyDetailRoute.GET(req, makeParams("pol-001"));
    const body = (await responseJson(res)) as { policy: { id: string } };

    expect(res.status).toBe(200);
    expect(body.policy.id).toBe("pol-001");
  });

  it("returns 404 for nonexistent policy", async () => {
    setupAuthSession({ role: "admin", enterpriseId: "ent-001" });
    selectResult.mockReturnValue([]);

    const req = makeRequest("GET", "http://localhost:3000/api/governance/policies/nope");
    const res = await policyDetailRoute.GET(req, makeParams("nope"));

    expect(res.status).toBe(404);
  });

  it("compliance_officer can access own-enterprise policy", async () => {
    setupAuthSession({ role: "compliance_officer", enterpriseId: "ent-001" });
    selectResult.mockReturnValue([makePolicy({ enterpriseId: "ent-001" })]);

    const req = makeRequest("GET", "http://localhost:3000/api/governance/policies/pol-001");
    const res = await policyDetailRoute.GET(req, makeParams("pol-001"));

    expect(res.status).toBe(200);
  });

  it("compliance_officer can access global policy", async () => {
    setupAuthSession({ role: "compliance_officer", enterpriseId: "ent-001" });
    selectResult.mockReturnValue([makePolicy({ enterpriseId: null })]);

    const req = makeRequest("GET", "http://localhost:3000/api/governance/policies/pol-global");
    const res = await policyDetailRoute.GET(req, makeParams("pol-global"));

    expect(res.status).toBe(200);
  });

  it("compliance_officer CANNOT access other enterprise's policy", async () => {
    setupAuthSession({ role: "compliance_officer", enterpriseId: "ent-001" });
    selectResult.mockReturnValue([makePolicy({ enterpriseId: "ent-999" })]);

    const req = makeRequest("GET", "http://localhost:3000/api/governance/policies/pol-other");
    const res = await policyDetailRoute.GET(req, makeParams("pol-other"));

    expect(res.status).toBe(403);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. PATCH /api/governance/policies/[id] — Update (version append)
// ═══════════════════════════════════════════════════════════════════════════════

describe("PATCH /api/governance/policies/[id]", () => {
  it("creates new version row for admin", async () => {
    setupAuthSession({ role: "admin", enterpriseId: "ent-001" });
    const existing = makePolicy({ policyVersion: 1 });
    selectResult.mockReturnValue([existing]);
    mockParseBody.mockResolvedValue({
      data: { name: "Updated Name" },
      error: null,
    });
    const newVersion = makePolicy({ id: "new-uuid-001", name: "Updated Name", policyVersion: 2 });
    insertResult.mockReturnValue([newVersion]);

    const req = makeRequest("PATCH", "http://localhost:3000/api/governance/policies/pol-001", {
      body: { name: "Updated Name" },
    });
    const res = await policyDetailRoute.PATCH(req, makeParams("pol-001"));
    const body = (await responseJson(res)) as { policy: { id: string; name: string } };

    expect(res.status).toBe(200);
    expect(body.policy.name).toBe("Updated Name");
  });

  it("returns 404 for nonexistent policy", async () => {
    setupAuthSession({ role: "admin", enterpriseId: "ent-001" });
    selectResult.mockReturnValue([]);
    mockParseBody.mockResolvedValue({ data: { name: "X" }, error: null });

    const req = makeRequest("PATCH", "http://localhost:3000/api/governance/policies/nope");
    const res = await policyDetailRoute.PATCH(req, makeParams("nope"));

    expect(res.status).toBe(404);
  });

  it("compliance_officer CANNOT modify global policy", async () => {
    setupAuthSession({ role: "compliance_officer", enterpriseId: "ent-001" });
    selectResult.mockReturnValue([makePolicy({ enterpriseId: null })]);
    mockParseBody.mockResolvedValue({ data: { name: "Hacked" }, error: null });

    const req = makeRequest("PATCH", "http://localhost:3000/api/governance/policies/pol-global");
    const res = await policyDetailRoute.PATCH(req, makeParams("pol-global"));

    expect(res.status).toBe(403);
  });

  it("compliance_officer CANNOT modify other enterprise's policy", async () => {
    setupAuthSession({ role: "compliance_officer", enterpriseId: "ent-001" });
    selectResult.mockReturnValue([makePolicy({ enterpriseId: "ent-999" })]);
    mockParseBody.mockResolvedValue({ data: { name: "Nope" }, error: null });

    const req = makeRequest("PATCH", "http://localhost:3000/api/governance/policies/pol-other");
    const res = await policyDetailRoute.PATCH(req, makeParams("pol-other"));

    expect(res.status).toBe(403);
  });

  it("compliance_officer CAN modify own-enterprise policy", async () => {
    setupAuthSession({ role: "compliance_officer", enterpriseId: "ent-001" });
    const existing = makePolicy({ enterpriseId: "ent-001", policyVersion: 1 });
    selectResult.mockReturnValue([existing]);
    mockParseBody.mockResolvedValue({ data: { name: "My Update" }, error: null });
    const newVersion = makePolicy({ id: "new-uuid-001", name: "My Update", policyVersion: 2 });
    insertResult.mockReturnValue([newVersion]);

    const req = makeRequest("PATCH", "http://localhost:3000/api/governance/policies/pol-001");
    const res = await policyDetailRoute.PATCH(req, makeParams("pol-001"));

    expect(res.status).toBe(200);
  });

  it("uses transaction for version append", async () => {
    setupAuthSession({ role: "admin", enterpriseId: "ent-001" });
    selectResult.mockReturnValue([makePolicy({ policyVersion: 3 })]);
    mockParseBody.mockResolvedValue({ data: { name: "V4" }, error: null });
    insertResult.mockReturnValue([makePolicy({ id: "new-uuid-001", policyVersion: 4 })]);

    const req = makeRequest("PATCH", "http://localhost:3000/api/governance/policies/pol-001");
    await policyDetailRoute.PATCH(req, makeParams("pol-001"));

    expect(mockDb.transaction).toHaveBeenCalledTimes(1);
  });

  it("publishes policy.updated event", async () => {
    setupAuthSession({ role: "admin", enterpriseId: "ent-001" });
    selectResult.mockReturnValue([makePolicy()]);
    mockParseBody.mockResolvedValue({ data: { name: "Evented Update" }, error: null });
    insertResult.mockReturnValue([makePolicy({ id: "new-uuid-001", name: "Evented Update" })]);

    const req = makeRequest("PATCH", "http://localhost:3000/api/governance/policies/pol-001");
    await policyDetailRoute.PATCH(req, makeParams("pol-001"));

    expect(mockPublishEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({ type: "policy.updated" }),
      })
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. DELETE /api/governance/policies/[id]
// ═══════════════════════════════════════════════════════════════════════════════

describe("DELETE /api/governance/policies/[id]", () => {
  // We need a mock for db.delete
  beforeEach(() => {
    // Wire up db.delete chain: db.delete(table).where(cond)
    (mockDb as any).delete = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });
  });

  it("deletes policy for admin", async () => {
    setupAuthSession({ role: "admin", enterpriseId: "ent-001" });
    selectResult.mockReturnValue([makePolicy()]);
    insertResult.mockReturnValue([]); // audit log insert

    const req = makeRequest("DELETE", "http://localhost:3000/api/governance/policies/pol-001");
    const res = await policyDetailRoute.DELETE(req, makeParams("pol-001"));
    const body = (await responseJson(res)) as { deleted: boolean };

    expect(res.status).toBe(200);
    expect(body.deleted).toBe(true);
  });

  it("returns 404 for nonexistent policy", async () => {
    setupAuthSession({ role: "admin", enterpriseId: "ent-001" });
    selectResult.mockReturnValue([]);

    const req = makeRequest("DELETE", "http://localhost:3000/api/governance/policies/nope");
    const res = await policyDetailRoute.DELETE(req, makeParams("nope"));

    expect(res.status).toBe(404);
  });

  it("compliance_officer CANNOT delete global policy", async () => {
    setupAuthSession({ role: "compliance_officer", enterpriseId: "ent-001" });
    selectResult.mockReturnValue([makePolicy({ enterpriseId: null })]);

    const req = makeRequest("DELETE", "http://localhost:3000/api/governance/policies/pol-global");
    const res = await policyDetailRoute.DELETE(req, makeParams("pol-global"));

    expect(res.status).toBe(403);
  });

  it("compliance_officer CANNOT delete other enterprise's policy", async () => {
    setupAuthSession({ role: "compliance_officer", enterpriseId: "ent-001" });
    selectResult.mockReturnValue([makePolicy({ enterpriseId: "ent-999" })]);

    const req = makeRequest("DELETE", "http://localhost:3000/api/governance/policies/pol-other");
    const res = await policyDetailRoute.DELETE(req, makeParams("pol-other"));

    expect(res.status).toBe(403);
  });

  it("compliance_officer CAN delete own-enterprise policy", async () => {
    setupAuthSession({ role: "compliance_officer", enterpriseId: "ent-001" });
    selectResult.mockReturnValue([makePolicy({ enterpriseId: "ent-001" })]);
    insertResult.mockReturnValue([]); // audit log

    const req = makeRequest("DELETE", "http://localhost:3000/api/governance/policies/pol-001");
    const res = await policyDetailRoute.DELETE(req, makeParams("pol-001"));

    expect(res.status).toBe(200);
  });

  it("publishes policy.deleted event", async () => {
    setupAuthSession({ role: "admin", enterpriseId: "ent-001" });
    selectResult.mockReturnValue([makePolicy()]);
    insertResult.mockReturnValue([]); // audit log

    const req = makeRequest("DELETE", "http://localhost:3000/api/governance/policies/pol-001");
    await policyDetailRoute.DELETE(req, makeParams("pol-001"));

    expect(mockPublishEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({ type: "policy.deleted" }),
      })
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. GET /api/governance/policies/[id]/dependents
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /api/governance/policies/[id]/dependents", () => {
  it("returns blueprint count for enterprise-scoped policy", async () => {
    setupAuthSession({ role: "admin", enterpriseId: "ent-001" });
    const policy = makePolicy({ enterpriseId: "ent-001" });
    // fetchPolicy uses .limit(1) → selectResult call #1
    // blueprint count uses bare .where() → selectResult call #2
    let callCount = 0;
    selectResult.mockImplementation(() => {
      callCount++;
      if (callCount <= 1) return [policy];
      return [{ id: "bp-1" }, { id: "bp-2" }, { id: "bp-3" }];
    });

    const req = makeRequest("GET", "http://localhost:3000/api/governance/policies/pol-001/dependents");
    const res = await dependentsRoute.GET(req, makeParams("pol-001"));
    const body = (await responseJson(res)) as { blueprintCount: number; policyName: string };

    expect(res.status).toBe(200);
    expect(body.blueprintCount).toBe(3);
    expect(body.policyName).toBe("SR 11-7 Model Validation");
  });

  it("returns 404 for nonexistent policy", async () => {
    setupAuthSession({ role: "admin", enterpriseId: "ent-001" });
    selectResult.mockReturnValue([]);

    const req = makeRequest("GET", "http://localhost:3000/api/governance/policies/nope/dependents");
    const res = await dependentsRoute.GET(req, makeParams("nope"));

    expect(res.status).toBe(404);
  });

  it("rejects unauthorized role", async () => {
    setupAuthError("FORBIDDEN");

    const req = makeRequest("GET", "http://localhost:3000/api/governance/policies/pol-001/dependents");
    const res = await dependentsRoute.GET(req, makeParams("pol-001"));

    expect(res.status).toBe(403);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 7. POST /api/governance/templates/[pack]/apply — Bulk template apply
// ═══════════════════════════════════════════════════════════════════════════════

describe("POST /api/governance/templates/[pack]/apply", () => {
  // Need db.delete for force mode
  beforeEach(() => {
    (mockDb as any).delete = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });
  });

  it("applies template pack successfully", async () => {
    setupAuthSession({ role: "admin", enterpriseId: "ent-001" });
    const pack = makeTemplatePack();
    mockFindTemplatePack.mockReturnValue(pack);
    mockParseBody.mockResolvedValue({ data: {}, error: null });
    // First select: duplicate check returns empty
    selectResult.mockReturnValue([]);
    // Each insert returns a created policy
    let insertCallCount = 0;
    insertResult.mockImplementation(() => {
      insertCallCount++;
      return [{ id: `pol-created-${insertCallCount}`, name: `Policy ${insertCallCount}`, type: "compliance", enterpriseId: "ent-001" }];
    });

    const req = makeRequest("POST", "http://localhost:3000/api/governance/templates/sr-11-7-core/apply");
    const res = await templateApplyRoute.POST(
      req,
      { params: Promise.resolve({ pack: "sr-11-7-core" }) } as any
    );
    const body = (await responseJson(res)) as { created: number; policies: unknown[] };

    expect(res.status).toBe(201);
    expect(body.created).toBe(2);
    expect(body.policies).toHaveLength(2);
  });

  it("returns 404 for unknown pack", async () => {
    setupAuthSession({ role: "admin", enterpriseId: "ent-001" });
    mockFindTemplatePack.mockReturnValue(undefined);
    mockParseBody.mockResolvedValue({ data: {}, error: null });

    const req = makeRequest("POST", "http://localhost:3000/api/governance/templates/nonexistent/apply");
    const res = await templateApplyRoute.POST(
      req,
      { params: Promise.resolve({ pack: "nonexistent" }) } as any
    );

    expect(res.status).toBe(404);
  });

  it("returns 409 on duplicate policies without force", async () => {
    setupAuthSession({ role: "admin", enterpriseId: "ent-001" });
    mockFindTemplatePack.mockReturnValue(makeTemplatePack());
    mockParseBody.mockResolvedValue({ data: {}, error: null });
    // Duplicate check returns existing policies
    selectResult.mockReturnValue([
      { id: "existing-1", name: "Model Validation" },
    ]);

    const req = makeRequest("POST", "http://localhost:3000/api/governance/templates/sr-11-7-core/apply");
    const res = await templateApplyRoute.POST(
      req,
      { params: Promise.resolve({ pack: "sr-11-7-core" }) } as any
    );
    const body = (await responseJson(res)) as { duplicates: string[] };

    expect(res.status).toBe(409);
    expect(body.duplicates).toContain("Model Validation");
  });

  it("force mode deletes duplicates then creates", async () => {
    setupAuthSession({ role: "admin", enterpriseId: "ent-001" });
    mockFindTemplatePack.mockReturnValue(makeTemplatePack());
    mockParseBody.mockResolvedValue({ data: { force: true }, error: null });

    // First select: duplicate check returns existing
    // Second select: full records for audit
    let selectCallCount = 0;
    selectResult.mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) return [{ id: "existing-1", name: "Model Validation" }];
      if (selectCallCount === 2) return [{ id: "existing-1", name: "Model Validation", enterpriseId: "ent-001" }];
      return [];
    });

    let insertCallCount = 0;
    insertResult.mockImplementation(() => {
      insertCallCount++;
      return [{ id: `pol-fresh-${insertCallCount}`, name: `Policy ${insertCallCount}`, type: "compliance", enterpriseId: "ent-001" }];
    });

    const req = makeRequest("POST", "http://localhost:3000/api/governance/templates/sr-11-7-core/apply");
    const res = await templateApplyRoute.POST(
      req,
      { params: Promise.resolve({ pack: "sr-11-7-core" }) } as any
    );

    expect(res.status).toBe(201);
    // db.delete should have been called for the duplicates
    expect((mockDb as any).delete).toHaveBeenCalled();
  });

  it("rejects unauthorized role", async () => {
    setupAuthError("FORBIDDEN");

    const req = makeRequest("POST", "http://localhost:3000/api/governance/templates/sr-11-7-core/apply");
    const res = await templateApplyRoute.POST(
      req,
      { params: Promise.resolve({ pack: "sr-11-7-core" }) } as any
    );

    expect(res.status).toBe(403);
  });

  it("publishes events for each created policy", async () => {
    setupAuthSession({ role: "admin", enterpriseId: "ent-001" });
    mockFindTemplatePack.mockReturnValue(makeTemplatePack());
    mockParseBody.mockResolvedValue({ data: {}, error: null });
    selectResult.mockReturnValue([]);

    let insertCallCount = 0;
    insertResult.mockImplementation(() => {
      insertCallCount++;
      return [{ id: `pol-${insertCallCount}`, name: `Policy ${insertCallCount}`, type: "compliance", enterpriseId: "ent-001" }];
    });

    const req = makeRequest("POST", "http://localhost:3000/api/governance/templates/sr-11-7-core/apply");
    await templateApplyRoute.POST(
      req,
      { params: Promise.resolve({ pack: "sr-11-7-core" }) } as any
    );

    // 2 policies in the pack → 2 publishEvent calls
    expect(mockPublishEvent).toHaveBeenCalledTimes(2);
  });
});
