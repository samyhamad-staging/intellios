import { describe, it, expect, vi } from "vitest";
import { getEnterpriseId, enterpriseScope, canAccessResource } from "../enterprise-scope";
import type { EnterpriseContext } from "../enterprise-scope";
import { eq, isNull } from "drizzle-orm";

// ── Fixtures ────────────────────────────────────────────────────────────────

/**
 * Creates a mock NextRequest with customizable headers.
 */
function makeRequest(
  overrides: Partial<{
    enterpriseId: string | null;
    userRole: string;
    actorEmail: string;
  }> = {}
) {
  const headers = new Map<string, string>();

  if (overrides.enterpriseId !== undefined) {
    if (overrides.enterpriseId === null) {
      headers.set("x-enterprise-id", "__null__");
    } else {
      headers.set("x-enterprise-id", overrides.enterpriseId);
    }
  }

  if (overrides.userRole) {
    headers.set("x-user-role", overrides.userRole);
  }

  if (overrides.actorEmail) {
    headers.set("x-actor-email", overrides.actorEmail);
  }

  return {
    headers: {
      get: (key: string) => headers.get(key) ?? null,
    },
  } as any;
}

/**
 * Creates a mock EnterpriseContext for testing enterpriseScope().
 */
function makeContext(overrides: Partial<EnterpriseContext> = {}): EnterpriseContext {
  return {
    enterpriseId: "ent_default",
    isAdmin: false,
    actorEmail: "user@example.com",
    role: "viewer",
    ...overrides,
  };
}

/**
 * Creates a mock Drizzle column for testing enterpriseScope().
 */
function makeMockColumn(columnName: string = "enterpriseId") {
  return {
    name: columnName,
    table: { name: "users" },
  } as any;
}

// ── getEnterpriseId ─────────────────────────────────────────────────────────

describe("getEnterpriseId", () => {
  it("returns enterpriseId from x-enterprise-id header", () => {
    const request = makeRequest({ enterpriseId: "ent_abc123" });
    const result = getEnterpriseId(request);

    expect(result.enterpriseId).toBe("ent_abc123");
  });

  it("returns null enterpriseId when header is '__null__' sentinel", () => {
    const request = makeRequest({ enterpriseId: null });
    const result = getEnterpriseId(request);

    expect(result.enterpriseId).toBeNull();
  });

  it("returns null enterpriseId when x-enterprise-id header is missing", () => {
    const request = makeRequest({});
    const result = getEnterpriseId(request);

    expect(result.enterpriseId).toBeNull();
  });

  it("returns isAdmin true when x-user-role is 'admin'", () => {
    const request = makeRequest({ userRole: "admin" });
    const result = getEnterpriseId(request);

    expect(result.isAdmin).toBe(true);
  });

  it("returns isAdmin false for non-admin roles", () => {
    const roles = ["viewer", "editor", "operator", "auditor", "unknown"];

    for (const role of roles) {
      const request = makeRequest({ userRole: role });
      const result = getEnterpriseId(request);

      expect(result.isAdmin).toBe(false);
    }
  });

  it("returns isAdmin false when x-user-role header is missing", () => {
    const request = makeRequest({});
    const result = getEnterpriseId(request);

    expect(result.isAdmin).toBe(false);
  });

  it("returns actorEmail from x-actor-email header", () => {
    const request = makeRequest({ actorEmail: "alice@company.com" });
    const result = getEnterpriseId(request);

    expect(result.actorEmail).toBe("alice@company.com");
  });

  it("returns empty string actorEmail when x-actor-email header is missing", () => {
    const request = makeRequest({});
    const result = getEnterpriseId(request);

    expect(result.actorEmail).toBe("");
  });

  it("returns role string from x-user-role header", () => {
    const request = makeRequest({ userRole: "editor" });
    const result = getEnterpriseId(request);

    expect(result.role).toBe("editor");
  });

  it("returns 'viewer' as default role when x-user-role header is missing", () => {
    const request = makeRequest({});
    const result = getEnterpriseId(request);

    expect(result.role).toBe("viewer");
  });

  it("combines all headers into complete EnterpriseContext", () => {
    const request = makeRequest({
      enterpriseId: "ent_xyz",
      userRole: "admin",
      actorEmail: "bob@company.com",
    });
    const result = getEnterpriseId(request);

    expect(result).toEqual({
      enterpriseId: "ent_xyz",
      isAdmin: true,
      actorEmail: "bob@company.com",
      role: "admin",
    });
  });

  it("handles empty header values gracefully", () => {
    const headers = new Map<string, string>();
    headers.set("x-enterprise-id", "");
    headers.set("x-user-role", "");
    headers.set("x-actor-email", "");

    const request = {
      headers: {
        get: (key: string) => headers.get(key) ?? null,
      },
    } as any;

    const result = getEnterpriseId(request);

    expect(result.enterpriseId).toBeNull(); // Empty string treated as missing
    expect(result.isAdmin).toBe(false);
    expect(result.actorEmail).toBe("");
    // Empty string for role is still considered falsy, so doesn't match "admin"
    expect(result.role).toBe(""); // Role returns the empty string as-is
  });
});

// ── enterpriseScope ─────────────────────────────────────────────────────────

describe("enterpriseScope", () => {
  it("returns undefined filter for admin users (platform-wide access)", () => {
    const column = makeMockColumn();
    const ctx = makeContext({ isAdmin: true });

    const result = enterpriseScope(column, ctx);

    expect(result).toBeUndefined();
  });

  it("returns eq(column, enterpriseId) for non-admin users with enterpriseId", () => {
    const column = makeMockColumn("enterpriseId");
    const ctx = makeContext({ isAdmin: false, enterpriseId: "ent_tenant1" });

    const result = enterpriseScope(column, ctx);

    // Result should be an eq() condition
    expect(result).not.toBeUndefined();
    // Verify it's a Drizzle SQL object with decoder property
    expect(result).toHaveProperty("decoder");
  });

  it("returns isNull(column) for non-admin users without enterpriseId", () => {
    const column = makeMockColumn("enterpriseId");
    const ctx = makeContext({ isAdmin: false, enterpriseId: null });

    const result = enterpriseScope(column, ctx);

    expect(result).not.toBeUndefined();
    // The result should be a Drizzle SQL object with decoder property
    expect(result).toHaveProperty("decoder");
  });

  it("prioritizes admin check over enterpriseId", () => {
    const column = makeMockColumn();
    const ctxAdmin = makeContext({ isAdmin: true, enterpriseId: null });
    const ctxNonAdminNoEid = makeContext({ isAdmin: false, enterpriseId: null });

    const resultAdmin = enterpriseScope(column, ctxAdmin);
    const resultNonAdmin = enterpriseScope(column, ctxNonAdminNoEid);

    // Admin should return undefined (no filter)
    expect(resultAdmin).toBeUndefined();
    // Non-admin with null EID should return isNull filter
    expect(resultNonAdmin).not.toBeUndefined();
  });

  it("works with different column names", () => {
    const column1 = makeMockColumn("enterpriseId");
    const column2 = makeMockColumn("tenantId");
    const column3 = makeMockColumn("org_id");

    const ctx = makeContext({ isAdmin: false, enterpriseId: "ent_123" });

    const result1 = enterpriseScope(column1, ctx);
    const result2 = enterpriseScope(column2, ctx);
    const result3 = enterpriseScope(column3, ctx);

    // All should return a non-undefined filter
    expect(result1).not.toBeUndefined();
    expect(result2).not.toBeUndefined();
    expect(result3).not.toBeUndefined();
  });

  it("returns correct filter for various enterpriseId values", () => {
    const column = makeMockColumn();

    const cases = [
      "ent_simple",
      "ent_with_dashes_123",
      "uuid-format-00000000-0000-0000-0000-000000000000",
      "single",
    ];

    for (const eid of cases) {
      const ctx = makeContext({ isAdmin: false, enterpriseId: eid });
      const result = enterpriseScope(column, ctx);

      expect(result).not.toBeUndefined();
    }
  });
});

// ── canAccessResource ───────────────────────────────────────────────────────

describe("canAccessResource", () => {
  it("returns true for admin users regardless of resource enterprise ID", () => {
    const ctx = makeContext({ isAdmin: true });

    const result1 = canAccessResource("ent_456", ctx);
    expect(result1).toBe(true);

    const result2 = canAccessResource(null, ctx);
    expect(result2).toBe(true);

    const result3 = canAccessResource("ent_789", ctx);
    expect(result3).toBe(true);
  });

  it("returns true for any user when resourceEnterpriseId is null (unscoped resource)", () => {
    const ctxTenant = makeContext({ isAdmin: false, enterpriseId: "ent_123" });
    const ctxNoTenant = makeContext({ isAdmin: false, enterpriseId: null });

    const result1 = canAccessResource(null, ctxTenant);
    expect(result1).toBe(true);

    const result2 = canAccessResource(null, ctxNoTenant);
    expect(result2).toBe(true);
  });

  it("returns true when user's enterpriseId matches resource's enterpriseId", () => {
    const ctx = makeContext({ isAdmin: false, enterpriseId: "ent_mycompany" });

    const result = canAccessResource("ent_mycompany", ctx);
    expect(result).toBe(true);
  });

  it("returns false when user's enterpriseId does not match resource's enterpriseId", () => {
    const ctx = makeContext({ isAdmin: false, enterpriseId: "ent_mycompany" });

    const result = canAccessResource("ent_othercompany", ctx);
    expect(result).toBe(false);
  });

  it("returns false when user has null enterpriseId and resource has non-null enterpriseId", () => {
    const ctx = makeContext({ isAdmin: false, enterpriseId: null });

    const result = canAccessResource("ent_somecompany", ctx);
    expect(result).toBe(false);
  });

  it("handles all combinations of admin, null enterpriseIds", () => {
    const testCases = [
      { isAdmin: true, ctxEid: "ent_a", resourceEid: "ent_b", expected: true },
      { isAdmin: true, ctxEid: null, resourceEid: "ent_b", expected: true },
      { isAdmin: false, ctxEid: "ent_a", resourceEid: null, expected: true },
      { isAdmin: false, ctxEid: null, resourceEid: null, expected: true },
      { isAdmin: false, ctxEid: "ent_a", resourceEid: "ent_a", expected: true },
      { isAdmin: false, ctxEid: "ent_a", resourceEid: "ent_b", expected: false },
      { isAdmin: false, ctxEid: null, resourceEid: "ent_b", expected: false },
    ];

    for (const tc of testCases) {
      const ctx = makeContext({
        isAdmin: tc.isAdmin,
        enterpriseId: tc.ctxEid as string | null,
      });
      const result = canAccessResource(tc.resourceEid as string | null, ctx);
      expect(result).toBe(tc.expected);
    }
  });
});
