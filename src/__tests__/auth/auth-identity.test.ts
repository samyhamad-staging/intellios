/**
 * Auth & Identity Route Tests
 *
 * Covers the public auth routes and admin identity management endpoints:
 *
 *   1. POST /api/auth/register          — New enterprise registration
 *   2. POST /api/auth/forgot-password   — Password reset initiation
 *   3. POST /api/auth/reset-password    — Token-based password update
 *   4. POST /api/auth/invite/accept     — Invitation acceptance
 *   5. GET  /api/admin/api-keys         — List API keys
 *   6. POST /api/admin/api-keys         — Create API key
 *   7. DELETE /api/admin/api-keys/[id]  — Revoke API key
 *
 * Test categories:
 *   - Happy-path functional flows
 *   - Input validation (body rejection)
 *   - Rate limiting enforcement
 *   - Email enumeration prevention (forgot-password always 200)
 *   - Transactional token validation (reset-password, invite/accept)
 *   - Role-based access (admin-only for api-keys)
 *   - Audit logging side-effects
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
  setupAuthSession,
  setupAuthError,
  resetAuthMocks,
} from "../blueprints/helpers/mock-auth";
import { makeRequest, makeParams, responseJson } from "../blueprints/helpers/route-test-utils";

// ═══════════════════════════════════════════════════════════════════════════════
// Module mocks — must be at top level before any imports of the routes
// ═══════════════════════════════════════════════════════════════════════════════

// Make where() thenable for routes that do bare `await db.select().from().where()`
mockDb.where.mockImplementation(() => {
  return {
    limit: vi.fn().mockImplementation(() => selectResult()),
    orderBy: vi.fn().mockImplementation(() => selectResult()),
    returning: vi.fn().mockImplementation(() => updateResult()),
    then: (resolve: (v: unknown) => void, reject?: (e: unknown) => void) => {
      return Promise.resolve(selectResult()).then(resolve, reject);
    },
  };
});

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/db/schema", () => ({
  users: { id: "id", email: "email", enterpriseId: "enterpriseId" },
  enterpriseSettings: { enterpriseId: "enterpriseId" },
  governancePolicies: { id: "id", enterpriseId: "enterpriseId" },
  auditLog: { id: "id" },
  passwordResetTokens: { id: "id", tokenHash: "tokenHash", usedAt: "usedAt", expiresAt: "expiresAt" },
  userInvitations: { id: "id", tokenHash: "tokenHash", acceptedAt: "acceptedAt", expiresAt: "expiresAt", email: "email" },
  apiKeys: { id: "id", enterpriseId: "enterpriseId", revokedAt: "revokedAt" },
}));
vi.mock("@/lib/auth/require", () => ({ requireAuth: mockRequireAuth }));

vi.mock("@/lib/errors", () => ({
  apiError: vi.fn(
    (code: string, message: string, _details?: unknown, _requestId?: string) => {
      const statusMap: Record<string, number> = {
        NOT_FOUND: 404,
        FORBIDDEN: 403,
        INTERNAL_ERROR: 500,
        BAD_REQUEST: 400,
        UNAUTHORIZED: 401,
        CONFLICT: 409,
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
    CONFLICT: "CONFLICT",
  },
}));

const mockParseBody = vi.fn();
vi.mock("@/lib/parse-body", () => ({ parseBody: mockParseBody }));

const mockGetRequestId = vi.fn().mockReturnValue("req-test-001");
vi.mock("@/lib/request-id", () => ({ getRequestId: mockGetRequestId }));

const mockRateLimit = vi.fn().mockResolvedValue(null);
vi.mock("@/lib/rate-limit", () => ({ rateLimit: mockRateLimit }));

const mockBcryptHash = vi.fn().mockResolvedValue("$2b$12$hashed");
const mockBcryptCompare = vi.fn().mockResolvedValue(true);
vi.mock("bcryptjs", () => ({
  default: { hash: (...args: unknown[]) => mockBcryptHash(...args), compare: (...args: unknown[]) => mockBcryptCompare(...args) },
  hash: (...args: unknown[]) => mockBcryptHash(...args),
  compare: (...args: unknown[]) => mockBcryptCompare(...args),
}));

const mockRandomUUID = vi.fn().mockReturnValue("new-uuid-001");
const mockRandomBytes = vi.fn().mockReturnValue({ toString: () => "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4" });
const mockCreateHash = vi.fn().mockReturnValue({
  update: vi.fn().mockReturnValue({
    digest: vi.fn().mockReturnValue("hashed-token-sha256"),
  }),
});
vi.mock("crypto", () => ({
  randomUUID: (...args: unknown[]) => mockRandomUUID(...args),
  randomBytes: (...args: unknown[]) => mockRandomBytes(...args),
  createHash: (...args: unknown[]) => mockCreateHash(...args),
}));
vi.mock("node:crypto", () => ({
  default: {
    randomBytes: (...args: unknown[]) => mockRandomBytes(...args),
    createHash: (...args: unknown[]) => mockCreateHash(...args),
    randomUUID: (...args: unknown[]) => mockRandomUUID(...args),
  },
  randomBytes: (...args: unknown[]) => mockRandomBytes(...args),
  createHash: (...args: unknown[]) => mockCreateHash(...args),
  randomUUID: (...args: unknown[]) => mockRandomUUID(...args),
}));

const mockSendEmail = vi.fn().mockResolvedValue(undefined);
const mockBuildNotificationEmail = vi.fn().mockReturnValue("<html>reset email</html>");
vi.mock("@/lib/notifications/email", () => ({
  sendEmail: mockSendEmail,
  buildNotificationEmail: mockBuildNotificationEmail,
}));

const mockFindTemplatePack = vi.fn().mockReturnValue({
  id: "sr-11-7-core",
  name: "SR 11-7 Core",
  policies: [
    { name: "P1", type: "compliance", description: "d", rules: [{ field: "f", operator: "exists", severity: "error", message: "m" }] },
  ],
});
vi.mock("@/lib/governance/policy-templates", () => ({
  findTemplatePack: mockFindTemplatePack,
}));

// Mock drizzle-orm operators
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((_col: unknown, val: unknown) => ({ eq: val })),
  and: vi.fn((...args: unknown[]) => ({ and: args })),
  or: vi.fn((...args: unknown[]) => ({ or: args })),
  isNull: vi.fn((col: unknown) => ({ isNull: col })),
  gt: vi.fn((_col: unknown, val: unknown) => ({ gt: val })),
  inArray: vi.fn((_col: unknown, vals: unknown) => ({ inArray: vals })),
}));

// ═══════════════════════════════════════════════════════════════════════════════
// Import route handlers AFTER mocks are registered
// ═══════════════════════════════════════════════════════════════════════════════

const registerRoute = await import("@/app/api/auth/register/route");
const forgotRoute = await import("@/app/api/auth/forgot-password/route");
const resetRoute = await import("@/app/api/auth/reset-password/route");
const inviteRoute = await import("@/app/api/auth/invite/accept/route");
const apiKeysRoute = await import("@/app/api/admin/api-keys/route");
const apiKeyDetailRoute = await import("@/app/api/admin/api-keys/[id]/route");

// ═══════════════════════════════════════════════════════════════════════════════
// Global setup
// ═══════════════════════════════════════════════════════════════════════════════

beforeEach(() => {
  resetMockDb();
  resetAuthMocks();
  mockParseBody.mockReset();
  mockRateLimit.mockReset().mockResolvedValue(null);
  mockBcryptHash.mockReset().mockResolvedValue("$2b$12$hashed");
  mockSendEmail.mockReset().mockResolvedValue(undefined);
  mockRandomUUID.mockReturnValue("new-uuid-001");
  mockGetRequestId.mockReturnValue("req-test-001");
  mockFindTemplatePack.mockReturnValue({
    id: "sr-11-7-core",
    name: "SR 11-7 Core",
    policies: [
      { name: "P1", type: "compliance", description: "d", rules: [{ field: "f", operator: "exists", severity: "error", message: "m" }] },
    ],
  });
  // Re-wire where() to be thenable
  mockDb.where.mockImplementation(() => ({
    limit: vi.fn().mockImplementation(() => selectResult()),
    orderBy: vi.fn().mockImplementation(() => selectResult()),
    returning: vi.fn().mockImplementation(() => updateResult()),
    then: (resolve: (v: unknown) => void, reject?: (e: unknown) => void) => {
      return Promise.resolve(selectResult()).then(resolve, reject);
    },
  }));
  // Add db.query extensions for auth routes
  (mockDb.query as any).users = {
    findFirst: vi.fn().mockResolvedValue(undefined),
  };
  (mockDb.query as any).passwordResetTokens = {
    findFirst: vi.fn().mockResolvedValue(undefined),
  };
  (mockDb.query as any).userInvitations = {
    findFirst: vi.fn().mockResolvedValue(undefined),
  };
  (mockDb.query as any).apiKeys = {
    findFirst: vi.fn().mockResolvedValue(undefined),
    findMany: vi.fn().mockResolvedValue([]),
  };
  // Wire up insert chain with onConflictDoUpdate for enterprise settings
  mockDb.insert.mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockImplementation(() => insertResult()),
      onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
    }),
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 1. POST /api/auth/register
// ═══════════════════════════════════════════════════════════════════════════════

describe("POST /api/auth/register", () => {
  it("creates enterprise + admin user on valid input", async () => {
    mockParseBody.mockResolvedValue({
      data: { companyName: "Acme Corp", firstName: "Jane", lastName: "Doe", email: "jane@acme.com", password: "SecurePass123" },
      error: null,
    });
    // Email uniqueness check: no existing user
    (mockDb.query as any).users.findFirst.mockResolvedValue(undefined);
    // User insert
    insertResult.mockReturnValue([{ id: "user-new", email: "jane@acme.com", name: "Jane Doe", role: "admin" }]);

    const req = makeRequest("POST", "http://localhost:3000/api/auth/register", {
      body: { companyName: "Acme Corp", firstName: "Jane", lastName: "Doe", email: "jane@acme.com", password: "SecurePass123" },
    });
    const res = await registerRoute.POST(req);

    expect(res.status).toBe(201);
    const body = (await responseJson(res)) as { message: string };
    expect(body.message).toBe("Account created");
  });

  it("rejects duplicate email with 409", async () => {
    mockParseBody.mockResolvedValue({
      data: { companyName: "X", firstName: "Y", lastName: "Z", email: "existing@acme.com", password: "SecurePass123" },
      error: null,
    });
    (mockDb.query as any).users.findFirst.mockResolvedValue({ id: "user-existing", email: "existing@acme.com" });

    const req = makeRequest("POST", "http://localhost:3000/api/auth/register");
    const res = await registerRoute.POST(req);

    expect(res.status).toBe(409);
  });

  it("enforces rate limit (5/hr per IP)", async () => {
    const rateLimitResponse = new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 });
    mockRateLimit.mockResolvedValue(rateLimitResponse);

    const req = makeRequest("POST", "http://localhost:3000/api/auth/register");
    const res = await registerRoute.POST(req);

    expect(res.status).toBe(429);
  });

  it("rejects invalid body", async () => {
    mockParseBody.mockResolvedValue({
      data: null,
      error: new Response(JSON.stringify({ code: "BAD_REQUEST" }), { status: 400 }),
    });

    const req = makeRequest("POST", "http://localhost:3000/api/auth/register");
    const res = await registerRoute.POST(req);

    expect(res.status).toBe(400);
  });

  it("hashes password with bcrypt", async () => {
    mockParseBody.mockResolvedValue({
      data: { companyName: "X", firstName: "Y", lastName: "Z", email: "new@x.com", password: "Pass12345678" },
      error: null,
    });
    (mockDb.query as any).users.findFirst.mockResolvedValue(undefined);
    insertResult.mockReturnValue([{ id: "u1", email: "new@x.com", name: "Y Z", role: "admin" }]);

    const req = makeRequest("POST", "http://localhost:3000/api/auth/register");
    await registerRoute.POST(req);

    expect(mockBcryptHash).toHaveBeenCalledWith("Pass12345678", 12);
  });

  it("seeds SR 11-7 governance policies", async () => {
    mockParseBody.mockResolvedValue({
      data: { companyName: "X", firstName: "Y", lastName: "Z", email: "seed@x.com", password: "Abc12345678" },
      error: null,
    });
    (mockDb.query as any).users.findFirst.mockResolvedValue(undefined);
    insertResult.mockReturnValue([{ id: "u2", email: "seed@x.com", name: "Y Z", role: "admin" }]);

    const req = makeRequest("POST", "http://localhost:3000/api/auth/register");
    await registerRoute.POST(req);

    expect(mockFindTemplatePack).toHaveBeenCalledWith("sr-11-7-core");
    // insert called for: user, enterprise settings (onConflictDoUpdate), each policy in pack, audit log
    expect(mockDb.insert).toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. POST /api/auth/forgot-password
// ═══════════════════════════════════════════════════════════════════════════════

describe("POST /api/auth/forgot-password", () => {
  it("returns 200 for existing user (sends email)", async () => {
    mockParseBody.mockResolvedValue({
      data: { email: "user@acme.com" },
      error: null,
    });
    (mockDb.query as any).users.findFirst.mockResolvedValue({ id: "u1", email: "user@acme.com" });
    insertResult.mockReturnValue([]);

    const req = makeRequest("POST", "http://localhost:3000/api/auth/forgot-password");
    const res = await forgotRoute.POST(req);

    expect(res.status).toBe(200);
    // sendEmail should have been called
    expect(mockSendEmail).toHaveBeenCalled();
  });

  it("returns 200 for nonexistent user (no email sent — prevents enumeration)", async () => {
    mockParseBody.mockResolvedValue({
      data: { email: "nobody@acme.com" },
      error: null,
    });
    (mockDb.query as any).users.findFirst.mockResolvedValue(undefined);

    const req = makeRequest("POST", "http://localhost:3000/api/auth/forgot-password");
    const res = await forgotRoute.POST(req);

    expect(res.status).toBe(200);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("enforces rate limit", async () => {
    mockRateLimit.mockResolvedValue(new Response(JSON.stringify({ error: "Rate limited" }), { status: 429 }));

    const req = makeRequest("POST", "http://localhost:3000/api/auth/forgot-password");
    const res = await forgotRoute.POST(req);

    expect(res.status).toBe(429);
  });

  it("stores SHA-256 hash of token, not plaintext", async () => {
    mockParseBody.mockResolvedValue({ data: { email: "user@acme.com" }, error: null });
    (mockDb.query as any).users.findFirst.mockResolvedValue({ id: "u1" });
    insertResult.mockReturnValue([]);

    const req = makeRequest("POST", "http://localhost:3000/api/auth/forgot-password");
    await forgotRoute.POST(req);

    // createHash should have been called with sha256
    expect(mockCreateHash).toHaveBeenCalledWith("sha256");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. POST /api/auth/reset-password
// ═══════════════════════════════════════════════════════════════════════════════

describe("POST /api/auth/reset-password", () => {
  it("resets password with valid token", async () => {
    mockParseBody.mockResolvedValue({
      data: { token: "valid-token-hex", password: "NewPass12345" },
      error: null,
    });
    // Inside transaction: findFirst returns valid token
    (mockDb.query as any).passwordResetTokens.findFirst.mockResolvedValue({
      id: "reset-001",
      userId: "user-001",
      tokenHash: "hashed-token-sha256",
      usedAt: null,
      expiresAt: new Date(Date.now() + 60000),
    });
    // update().set().where().returning() for user update
    updateResult.mockReturnValue([{ id: "user-001", email: "user@acme.com", role: "admin", enterpriseId: "ent-001" }]);
    insertResult.mockReturnValue([]); // audit log

    const req = makeRequest("POST", "http://localhost:3000/api/auth/reset-password");
    const res = await resetRoute.POST(req);
    const body = (await responseJson(res)) as { message: string };

    expect(res.status).toBe(200);
    expect(body.message).toBe("Password updated successfully.");
  });

  it("returns 400 for invalid/expired token", async () => {
    mockParseBody.mockResolvedValue({
      data: { token: "expired-token", password: "NewPass12345" },
      error: null,
    });
    (mockDb.query as any).passwordResetTokens.findFirst.mockResolvedValue(undefined);

    const req = makeRequest("POST", "http://localhost:3000/api/auth/reset-password");
    const res = await resetRoute.POST(req);

    expect(res.status).toBe(400);
  });

  it("uses transaction for race condition prevention (P1-SEC-001)", async () => {
    mockParseBody.mockResolvedValue({
      data: { token: "any-token", password: "NewPass12345" },
      error: null,
    });
    (mockDb.query as any).passwordResetTokens.findFirst.mockResolvedValue({
      id: "reset-002",
      userId: "user-002",
    });
    updateResult.mockReturnValue([{ id: "user-002", email: "u@x.com", role: "admin", enterpriseId: "ent-001" }]);
    insertResult.mockReturnValue([]);

    const req = makeRequest("POST", "http://localhost:3000/api/auth/reset-password");
    await resetRoute.POST(req);

    expect(mockDb.transaction).toHaveBeenCalledTimes(1);
  });

  it("enforces rate limit (10/hr)", async () => {
    mockRateLimit.mockResolvedValue(new Response(JSON.stringify({ error: "Rate limited" }), { status: 429 }));

    const req = makeRequest("POST", "http://localhost:3000/api/auth/reset-password");
    const res = await resetRoute.POST(req);

    expect(res.status).toBe(429);
  });

  it("hashes new password with bcrypt", async () => {
    mockParseBody.mockResolvedValue({
      data: { token: "tok", password: "MyNewPassword1" },
      error: null,
    });
    (mockDb.query as any).passwordResetTokens.findFirst.mockResolvedValue({ id: "r1", userId: "u1" });
    updateResult.mockReturnValue([{ id: "u1", email: "u@x.com", role: "admin", enterpriseId: "e1" }]);
    insertResult.mockReturnValue([]);

    const req = makeRequest("POST", "http://localhost:3000/api/auth/reset-password");
    await resetRoute.POST(req);

    expect(mockBcryptHash).toHaveBeenCalledWith("MyNewPassword1", 12);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. POST /api/auth/invite/accept
// ═══════════════════════════════════════════════════════════════════════════════

describe("POST /api/auth/invite/accept", () => {
  it("creates user from valid invitation", async () => {
    mockParseBody.mockResolvedValue({
      data: { token: "invite-token", name: "Bob Smith", password: "Invite12345" },
      error: null,
    });
    (mockDb.query as any).userInvitations.findFirst.mockResolvedValue({
      id: "inv-001",
      email: "bob@acme.com",
      role: "reviewer",
      enterpriseId: "ent-001",
      acceptedAt: null,
      expiresAt: new Date(Date.now() + 60000),
    });
    // After marking accepted, check for existing user → none
    (mockDb.query as any).users.findFirst.mockResolvedValue(undefined);
    // Insert user
    insertResult.mockReturnValue([{
      id: "user-bob",
      email: "bob@acme.com",
      role: "reviewer",
      enterpriseId: "ent-001",
    }]);

    const req = makeRequest("POST", "http://localhost:3000/api/auth/invite/accept");
    const res = await inviteRoute.POST(req);
    const body = (await responseJson(res)) as { message: string };

    expect(res.status).toBe(200);
    expect(body.message).toBe("Account created successfully.");
  });

  it("returns 400 for expired/used invitation", async () => {
    mockParseBody.mockResolvedValue({
      data: { token: "expired-invite", name: "X", password: "Pass12345" },
      error: null,
    });
    (mockDb.query as any).userInvitations.findFirst.mockResolvedValue(undefined);

    const req = makeRequest("POST", "http://localhost:3000/api/auth/invite/accept");
    const res = await inviteRoute.POST(req);

    expect(res.status).toBe(400);
  });

  it("returns 409 if email already registered", async () => {
    mockParseBody.mockResolvedValue({
      data: { token: "dup-invite", name: "X", password: "Pass12345" },
      error: null,
    });
    (mockDb.query as any).userInvitations.findFirst.mockResolvedValue({
      id: "inv-002",
      email: "existing@acme.com",
      role: "reviewer",
      enterpriseId: "ent-001",
    });
    (mockDb.query as any).users.findFirst.mockResolvedValue({ id: "u-existing", email: "existing@acme.com" });

    const req = makeRequest("POST", "http://localhost:3000/api/auth/invite/accept");
    const res = await inviteRoute.POST(req);

    expect(res.status).toBe(409);
  });

  it("uses transaction for race condition prevention (P1-SEC-002)", async () => {
    mockParseBody.mockResolvedValue({
      data: { token: "tok", name: "X", password: "Pass12345" },
      error: null,
    });
    (mockDb.query as any).userInvitations.findFirst.mockResolvedValue({
      id: "inv-003",
      email: "new@acme.com",
      role: "viewer",
      enterpriseId: "ent-001",
    });
    (mockDb.query as any).users.findFirst.mockResolvedValue(undefined);
    insertResult.mockReturnValue([{ id: "u-new", email: "new@acme.com", role: "viewer", enterpriseId: "ent-001" }]);

    const req = makeRequest("POST", "http://localhost:3000/api/auth/invite/accept");
    await inviteRoute.POST(req);

    expect(mockDb.transaction).toHaveBeenCalledTimes(1);
  });

  it("enforces rate limit (10/hr)", async () => {
    mockRateLimit.mockResolvedValue(new Response(JSON.stringify({ error: "Rate limited" }), { status: 429 }));

    const req = makeRequest("POST", "http://localhost:3000/api/auth/invite/accept");
    const res = await inviteRoute.POST(req);

    expect(res.status).toBe(429);
  });

  it("assigns invited role to new user", async () => {
    mockParseBody.mockResolvedValue({
      data: { token: "role-tok", name: "Alice", password: "Rolepass123" },
      error: null,
    });
    (mockDb.query as any).userInvitations.findFirst.mockResolvedValue({
      id: "inv-004",
      email: "alice@acme.com",
      role: "compliance_officer",
      enterpriseId: "ent-001",
    });
    (mockDb.query as any).users.findFirst.mockResolvedValue(undefined);
    insertResult.mockReturnValue([{
      id: "u-alice",
      email: "alice@acme.com",
      role: "compliance_officer",
      enterpriseId: "ent-001",
    }]);

    const req = makeRequest("POST", "http://localhost:3000/api/auth/invite/accept");
    const res = await inviteRoute.POST(req);

    expect(res.status).toBe(200);
    // The user was created — insert was called inside transaction
    expect(mockDb.insert).toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. GET /api/admin/api-keys
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /api/admin/api-keys", () => {
  it("returns active keys for admin (strips keyHash)", async () => {
    setupAuthSession({ role: "admin", enterpriseId: "ent-001" });
    (mockDb.query as any).apiKeys.findMany.mockResolvedValue([
      { id: "key-1", name: "Production", keyHash: "SHOULD_NOT_APPEAR", keyPrefix: "ik_live_ab", scopes: ["blueprints:read"], createdAt: new Date() },
      { id: "key-2", name: "CI/CD", keyHash: "ALSO_HIDDEN", keyPrefix: "ik_live_cd", scopes: ["policies:read"], createdAt: new Date() },
    ]);

    const req = makeRequest("GET", "http://localhost:3000/api/admin/api-keys");
    const res = await apiKeysRoute.GET(req);
    const body = (await responseJson(res)) as { keys: Array<{ keyHash?: string; name: string }>; validScopes: string[] };

    expect(res.status).toBe(200);
    expect(body.keys).toHaveLength(2);
    // keyHash must be stripped
    for (const key of body.keys) {
      expect(key).not.toHaveProperty("keyHash");
    }
    expect(body.validScopes).toContain("blueprints:read");
  });

  it("rejects non-admin role", async () => {
    setupAuthError("FORBIDDEN");

    const req = makeRequest("GET", "http://localhost:3000/api/admin/api-keys");
    const res = await apiKeysRoute.GET(req);

    expect(res.status).toBe(403);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. POST /api/admin/api-keys
// ═══════════════════════════════════════════════════════════════════════════════

describe("POST /api/admin/api-keys", () => {
  it("creates API key and returns plaintext once", async () => {
    setupAuthSession({ role: "admin", enterpriseId: "ent-001", email: "admin@acme.com" });
    mockParseBody.mockResolvedValue({
      data: { name: "My Key", scopes: ["blueprints:read"] },
      error: null,
    });
    insertResult.mockReturnValue([{
      id: "key-new",
      name: "My Key",
      scopes: ["blueprints:read"],
      createdAt: new Date(),
    }]);

    const req = makeRequest("POST", "http://localhost:3000/api/admin/api-keys");
    const res = await apiKeysRoute.POST(req);
    const body = (await responseJson(res)) as { key: string; warning: string };

    expect(res.status).toBe(200);
    // Key starts with ik_live_ prefix
    expect(body.key).toMatch(/^ik_live_/);
    expect(body.warning).toContain("not be shown again");
  });

  it("rejects non-admin role", async () => {
    setupAuthError("FORBIDDEN");

    const req = makeRequest("POST", "http://localhost:3000/api/admin/api-keys");
    const res = await apiKeysRoute.POST(req);

    expect(res.status).toBe(403);
  });

  it("hashes key with bcrypt before storing", async () => {
    setupAuthSession({ role: "admin", enterpriseId: "ent-001" });
    mockParseBody.mockResolvedValue({
      data: { name: "Hashed Key", scopes: [] },
      error: null,
    });
    insertResult.mockReturnValue([{ id: "k1", name: "Hashed Key", scopes: [], createdAt: new Date() }]);

    const req = makeRequest("POST", "http://localhost:3000/api/admin/api-keys");
    await apiKeysRoute.POST(req);

    // bcrypt hash is called with the generated key and cost 10
    expect(mockBcryptHash).toHaveBeenCalledWith(expect.stringMatching(/^ik_live_/), 10);
  });

  it("writes audit log on key creation", async () => {
    setupAuthSession({ role: "admin", enterpriseId: "ent-001", email: "admin@acme.com" });
    mockParseBody.mockResolvedValue({
      data: { name: "Audit Key", scopes: ["policies:read"] },
      error: null,
    });
    insertResult.mockReturnValue([{ id: "k2", name: "Audit Key", scopes: ["policies:read"], createdAt: new Date() }]);

    const req = makeRequest("POST", "http://localhost:3000/api/admin/api-keys");
    await apiKeysRoute.POST(req);

    // insert called for: api key + audit log = 2
    expect(mockDb.insert).toHaveBeenCalledTimes(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 7. DELETE /api/admin/api-keys/[id]
// ═══════════════════════════════════════════════════════════════════════════════

describe("DELETE /api/admin/api-keys/[id]", () => {
  it("revokes key by setting revokedAt", async () => {
    setupAuthSession({ role: "admin", enterpriseId: "ent-001", email: "admin@acme.com" });
    (mockDb.query as any).apiKeys.findFirst.mockResolvedValue({
      id: "key-001",
      name: "Revokable Key",
      revokedAt: null,
      enterpriseId: "ent-001",
    });
    insertResult.mockReturnValue([]); // audit log

    const req = makeRequest("DELETE", "http://localhost:3000/api/admin/api-keys/key-001");
    const res = await apiKeyDetailRoute.DELETE(req, makeParams("key-001"));
    const body = (await responseJson(res)) as { ok: boolean };

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    // update was called to set revokedAt
    expect(mockDb.update).toHaveBeenCalled();
  });

  it("returns 404 for nonexistent or already-revoked key", async () => {
    setupAuthSession({ role: "admin", enterpriseId: "ent-001" });
    (mockDb.query as any).apiKeys.findFirst.mockResolvedValue(undefined);

    const req = makeRequest("DELETE", "http://localhost:3000/api/admin/api-keys/nope");
    const res = await apiKeyDetailRoute.DELETE(req, makeParams("nope"));

    expect(res.status).toBe(404);
  });

  it("rejects non-admin role", async () => {
    setupAuthError("FORBIDDEN");

    const req = makeRequest("DELETE", "http://localhost:3000/api/admin/api-keys/key-001");
    const res = await apiKeyDetailRoute.DELETE(req, makeParams("key-001"));

    expect(res.status).toBe(403);
  });

  it("writes audit log on key revocation", async () => {
    setupAuthSession({ role: "admin", enterpriseId: "ent-001", email: "admin@acme.com" });
    (mockDb.query as any).apiKeys.findFirst.mockResolvedValue({
      id: "key-002",
      name: "Audit Revoke",
      revokedAt: null,
      enterpriseId: "ent-001",
    });
    insertResult.mockReturnValue([]); // audit log

    const req = makeRequest("DELETE", "http://localhost:3000/api/admin/api-keys/key-002");
    await apiKeyDetailRoute.DELETE(req, makeParams("key-002"));

    // insert called for audit log
    expect(mockDb.insert).toHaveBeenCalled();
  });
});
