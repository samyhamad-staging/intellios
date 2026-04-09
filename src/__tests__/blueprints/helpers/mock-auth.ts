/**
 * Auth mock helpers for blueprint lifecycle tests.
 *
 * Provides configurable mocks for:
 *   - requireAuth() → { session, error }
 *   - assertEnterpriseAccess() → null | NextResponse
 */

import { vi } from "vitest";

// ─── requireAuth mock ────────────────────────────────────────────────────────

export const mockRequireAuth = vi.fn();

/**
 * Configure requireAuth to return a successful session.
 * Routes destructure as: `const { session, error } = await requireAuth([...])`.
 */
export function setupAuthSession(overrides: {
  email?: string;
  role?: string;
  enterpriseId?: string;
} = {}) {
  const session = {
    user: {
      id: "user-001",
      email: overrides.email ?? "designer@acme.com",
      role: overrides.role ?? "designer",
      enterpriseId: overrides.enterpriseId ?? "ent-001",
    },
  };
  mockRequireAuth.mockResolvedValue({ session, error: null });
  return session;
}

/**
 * Configure requireAuth to return a 401/403 error (unauthenticated or wrong role).
 */
export function setupAuthError(code: "UNAUTHORIZED" | "FORBIDDEN" = "UNAUTHORIZED") {
  const errorResponse = {
    status: code === "UNAUTHORIZED" ? 401 : 403,
    body: { code, message: code === "UNAUTHORIZED" ? "Authentication required" : "Access denied" },
    json: async () => ({ code, message: code === "UNAUTHORIZED" ? "Authentication required" : "Access denied" }),
  };
  mockRequireAuth.mockResolvedValue({ session: null, error: errorResponse });
  return errorResponse;
}

// ─── assertEnterpriseAccess mock ─────────────────────────────────────────────

export const mockAssertEnterpriseAccess = vi.fn().mockReturnValue(null);

/**
 * Configure assertEnterpriseAccess to deny access (returns a 403 response).
 */
export function setupEnterpriseDenied() {
  const errorResponse = {
    status: 403,
    body: { code: "FORBIDDEN", message: "Access denied: resource belongs to a different enterprise" },
    json: async () => ({ code: "FORBIDDEN", message: "Access denied: resource belongs to a different enterprise" }),
  };
  mockAssertEnterpriseAccess.mockReturnValue(errorResponse);
  return errorResponse;
}

// ─── Reset helper ────────────────────────────────────────────────────────────

export function resetAuthMocks() {
  mockRequireAuth.mockReset();
  mockAssertEnterpriseAccess.mockReset().mockReturnValue(null);
}
