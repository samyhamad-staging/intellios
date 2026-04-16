import { describe, it, expect } from "vitest";
import { assertEnterpriseAccess } from "../enterprise";

// ── Fixtures ────────────────────────────────────────────────────────────────

function makeUser(
  overrides: Partial<{ role: string; enterpriseId: string | null }> = {}
) {
  return {
    role: "viewer",
    enterpriseId: "ent_123",
    ...overrides,
  };
}

// ── assertEnterpriseAccess ──────────────────────────────────────────────────
//
// These tests document and enforce the fail-closed default for null
// resourceEnterpriseId introduced on 2026-04-16. Prior behaviour silently
// allowed cross-tenant reads of any row with a null enterprise_id; the
// helper now denies such access unless the caller explicitly opts in via
// { allowUnscoped: true }.
//
describe("assertEnterpriseAccess", () => {
  // ── Admin bypass ──────────────────────────────────────────────────────────

  describe("admin role", () => {
    it("is allowed regardless of resource enterprise ID", () => {
      const user = makeUser({ role: "admin" });

      expect(assertEnterpriseAccess("ent_456", user)).toBeNull();
      expect(assertEnterpriseAccess("ent_123", user)).toBeNull();
      expect(assertEnterpriseAccess(null, user)).toBeNull();
      // Admin bypass wins even when allowUnscoped is false.
      expect(
        assertEnterpriseAccess(null, user, { allowUnscoped: false })
      ).toBeNull();
    });
  });

  // ── Tenant match (happy path) ────────────────────────────────────────────

  describe("tenant user with matching enterprise", () => {
    it("is allowed", () => {
      const user = makeUser({ enterpriseId: "ent_123" });
      expect(assertEnterpriseAccess("ent_123", user)).toBeNull();
    });

    it("is consistent across non-admin roles", () => {
      const roles = ["viewer", "architect", "designer", "reviewer", "compliance_officer"];
      for (const role of roles) {
        const user = makeUser({ role, enterpriseId: "ent_a" });
        expect(assertEnterpriseAccess("ent_a", user)).toBeNull();
      }
    });
  });

  // ── Tenant mismatch ──────────────────────────────────────────────────────

  describe("tenant user with mismatched enterprise", () => {
    it("is denied with 403", () => {
      const user = makeUser({ enterpriseId: "ent_123", role: "viewer" });
      const result = assertEnterpriseAccess("ent_456", user);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(403);
    });

    it("returns a descriptive error code and message", async () => {
      const user = makeUser({ enterpriseId: "ent_111", role: "reviewer" });
      const result = assertEnterpriseAccess("ent_222", user);

      await expect(result?.json?.()).resolves.toMatchObject({
        code: "FORBIDDEN",
        message: "Access denied: resource belongs to a different enterprise",
      });
    });

    it("denies users with null enterpriseId from accessing scoped resources", () => {
      const user = makeUser({ enterpriseId: null, role: "viewer" });
      const result = assertEnterpriseAccess("ent_456", user);

      expect(result?.status).toBe(403);
    });

    it("is consistent across non-admin roles", () => {
      const roles = ["viewer", "architect", "designer", "reviewer", "compliance_officer"];
      for (const role of roles) {
        const user = makeUser({ role, enterpriseId: "ent_a" });
        const result = assertEnterpriseAccess("ent_b", user);
        expect(result?.status).toBe(403);
      }
    });
  });

  // ── Null resource enterprise ID — the fail-closed change ─────────────────
  //
  // Regression tests for the 2026-04-16 fix. A resource with a null
  // enterprise_id is no longer treated as implicitly accessible to every
  // tenant user. The legitimate unscoped case (audit log, built-in
  // policies) must be opted into explicitly.

  describe("null resourceEnterpriseId (fail-closed default)", () => {
    it("denies a non-admin tenant user by default", () => {
      const user = makeUser({ enterpriseId: "ent_123", role: "viewer" });
      const result = assertEnterpriseAccess(null, user);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(403);
    });

    it("denies a non-admin user with null enterpriseId by default", () => {
      const user = makeUser({ enterpriseId: null, role: "viewer" });
      const result = assertEnterpriseAccess(null, user);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(403);
    });

    it("returns a specific error message that distinguishes unscoped denial from cross-tenant denial", async () => {
      const user = makeUser({ enterpriseId: "ent_x", role: "viewer" });
      const result = assertEnterpriseAccess(null, user);

      await expect(result?.json?.()).resolves.toMatchObject({
        code: "FORBIDDEN",
        message: "Access denied: resource has no enterprise scope",
      });
    });

    it("denies when allowUnscoped is explicitly false", () => {
      const user = makeUser({ enterpriseId: "ent_x", role: "viewer" });
      const result = assertEnterpriseAccess(null, user, { allowUnscoped: false });

      expect(result?.status).toBe(403);
    });

    it("allows when the caller opts in via allowUnscoped: true", () => {
      const user = makeUser({ enterpriseId: "ent_x", role: "viewer" });
      const result = assertEnterpriseAccess(null, user, { allowUnscoped: true });

      expect(result).toBeNull();
    });

    it("allows an unscoped-user accessing an unscoped resource when opted in", () => {
      const user = makeUser({ enterpriseId: null, role: "viewer" });
      const result = assertEnterpriseAccess(null, user, { allowUnscoped: true });

      expect(result).toBeNull();
    });

    it("admin bypass wins regardless of allowUnscoped setting", () => {
      const user = makeUser({ role: "admin", enterpriseId: "ent_x" });

      expect(
        assertEnterpriseAccess(null, user, { allowUnscoped: false })
      ).toBeNull();
      expect(
        assertEnterpriseAccess(null, user, { allowUnscoped: true })
      ).toBeNull();
    });
  });

  // ── Response shape ────────────────────────────────────────────────────────

  describe("response shape", () => {
    it("returns a Response with 403 status and JSON content-type on denial", () => {
      const user = makeUser({ enterpriseId: "ent_x" });
      const result = assertEnterpriseAccess("ent_y", user);

      expect(result).toBeInstanceOf(Response);
      expect(result?.status).toBe(403);
      expect(result?.headers?.get("content-type")).toContain("application/json");
    });
  });
});
