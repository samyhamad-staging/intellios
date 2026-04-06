import { test, expect } from "@playwright/test";

/**
 * API Health E2E Tests
 *
 * These tests verify that critical API endpoints respond correctly
 * and don't return 500 errors (C-13 verification).
 *
 * Run against a live server with demo data seeded.
 */

test.describe("API Health Checks", () => {
  test("GET /api/auth/session returns valid response", async ({ request }) => {
    const response = await request.get("/api/auth/session");
    expect(response.status()).toBeLessThan(500);
  });

  test("unauthenticated API calls return 401, not 500", async ({ request }) => {
    const protectedEndpoints = [
      "/api/blueprints",
      "/api/registry",
      "/api/governance/policies",
      "/api/review",
      "/api/admin/users",
    ];

    for (const endpoint of protectedEndpoints) {
      const response = await request.get(endpoint);
      // Should be 401 (unauthorized), never 500 (server error)
      expect(response.status(), `${endpoint} should not return 500`).not.toBe(500);
      expect([401, 403]).toContain(response.status());
    }
  });

  test("public API endpoints respond without error", async ({ request }) => {
    const publicEndpoints = ["/api/templates"];

    for (const endpoint of publicEndpoints) {
      const response = await request.get(endpoint);
      expect(response.status(), `${endpoint} should not return 500`).toBeLessThan(500);
    }
  });
});

test.describe("API Tenant Isolation", () => {
  test("API routes without auth token return 401", async ({ request }) => {
    // Verify that API routes are not accidentally accessible without authentication
    const sensitiveEndpoints = [
      "/api/admin/settings",
      "/api/admin/api-keys",
      "/api/admin/webhooks",
      "/api/compliance/report",
      "/api/audit",
    ];

    for (const endpoint of sensitiveEndpoints) {
      const response = await request.get(endpoint);
      expect(response.status(), `${endpoint} should require auth`).not.toBe(200);
      expect(response.status(), `${endpoint} should not crash`).not.toBe(500);
    }
  });
});
