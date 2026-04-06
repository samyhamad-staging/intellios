import { describe, it, expect } from "vitest";
import { assertEnterpriseAccess } from "../enterprise";

// ── Fixtures ────────────────────────────────────────────────────────────────

function makeUser(overrides: Partial<{ role: string; enterpriseId: string | null }> = {}) {
  return {
    role: "viewer",
    enterpriseId: "ent_123",
    ...overrides,
  };
}

// ── assertEnterpriseAccess ──────────────────────────────────────────────────

describe("assertEnterpriseAccess", () => {
  it("returns null for admin user regardless of resource enterprise ID", () => {
    const user = makeUser({ role: "admin" });

    const result1 = assertEnterpriseAccess("ent_456", user);
    expect(result1).toBeNull();

    const result2 = assertEnterpriseAccess(null, user);
    expect(result2).toBeNull();

    const result3 = assertEnterpriseAccess("ent_123", user);
    expect(result3).toBeNull();
  });

  it("returns null when resourceEnterpriseId is null (unscoped/legacy resource)", () => {
    const user = makeUser({ role: "viewer" });

    const result = assertEnterpriseAccess(null, user);
    expect(result).toBeNull();
  });

  it("returns null when user's enterpriseId matches resource's enterpriseId", () => {
    const user = makeUser({ enterpriseId: "ent_123" });

    const result = assertEnterpriseAccess("ent_123", user);
    expect(result).toBeNull();
  });

  it("returns 403 NextResponse when user's enterpriseId does not match resource's enterpriseId", async () => {
    const user = makeUser({ enterpriseId: "ent_123", role: "viewer" });

    const result = assertEnterpriseAccess("ent_456", user);

    expect(result).not.toBeNull();
    expect(result?.status).toBe(403);
    const json = result?.json?.();
    await expect(json).resolves.toMatchObject({
      code: "FORBIDDEN",
      message: expect.stringContaining("Access denied"),
    });
  });

  it("returns 403 NextResponse when user has null enterpriseId and resource has non-null enterpriseId", () => {
    const user = makeUser({ enterpriseId: null, role: "viewer" });

    const result = assertEnterpriseAccess("ent_456", user);

    expect(result).not.toBeNull();
    expect(result?.status).toBe(403);
  });

  it("returns 403 NextResponse with descriptive error message", async () => {
    const user = makeUser({ enterpriseId: "ent_111", role: "editor" });

    const result = assertEnterpriseAccess("ent_222", user);

    expect(result).not.toBeNull();
    expect(result?.status).toBe(403);
    await expect(result?.json?.()).resolves.toMatchObject({
      code: "FORBIDDEN",
      message: "Access denied: resource belongs to a different enterprise",
    });
  });

  it("handles different user roles (non-admin) consistently", () => {
    const roles = ["viewer", "editor", "operator", "auditor"];

    for (const role of roles) {
      const user = makeUser({ role, enterpriseId: "ent_a" });
      const result = assertEnterpriseAccess("ent_b", user);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(403);
    }
  });

  it("correctly distinguishes between admin and non-admin roles", () => {
    // Non-admin with matching enterprise → allowed
    const nonAdminMatching = assertEnterpriseAccess(
      "ent_match",
      makeUser({ role: "viewer", enterpriseId: "ent_match" })
    );
    expect(nonAdminMatching).toBeNull();

    // Non-admin with mismatched enterprise → denied
    const nonAdminMismatch = assertEnterpriseAccess(
      "ent_other",
      makeUser({ role: "viewer", enterpriseId: "ent_match" })
    );
    expect(nonAdminMismatch?.status).toBe(403);

    // Admin with mismatched enterprise → allowed
    const adminMismatch = assertEnterpriseAccess(
      "ent_other",
      makeUser({ role: "admin", enterpriseId: "ent_match" })
    );
    expect(adminMismatch).toBeNull();
  });

  it("treats resourceEnterpriseId check before userEnterpriseId check", () => {
    // When resource is unscoped (null), even if user has no enterpriseId, should be allowed
    const result = assertEnterpriseAccess(
      null,
      makeUser({ enterpriseId: null, role: "viewer" })
    );
    expect(result).toBeNull();
  });

  it("returns a proper NextResponse object with correct status code", () => {
    const user = makeUser({ enterpriseId: "ent_x" });
    const result = assertEnterpriseAccess("ent_y", user);

    expect(result).toBeInstanceOf(Response);
    expect(result?.status).toBe(403);
    expect(result?.headers?.get("content-type")).toContain("application/json");
  });
});
