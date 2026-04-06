/**
 * RLS Context Guard Tests (CC-9 fix)
 *
 * Tests that withTenantScopeGuarded correctly clears
 * the RLS context even when the handler throws.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock dependencies ──────────────────────────────────────────────────────

const mockSetRLSContext = vi.fn();
const mockClearRLSContext = vi.fn();

vi.mock("@/lib/db/rls", () => ({
  setRLSContext: (...args: unknown[]) => mockSetRLSContext(...args),
  clearRLSContext: (...args: unknown[]) => mockClearRLSContext(...args),
}));

const mockGetEnterpriseId = vi.fn();

vi.mock("@/lib/auth/enterprise-scope", () => ({
  getEnterpriseId: (...args: unknown[]) => mockGetEnterpriseId(...args),
}));

describe("withTenantScopeGuarded", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetEnterpriseId.mockReturnValue({
      enterpriseId: "ent-001",
      isAdmin: false,
    });
    mockSetRLSContext.mockResolvedValue(undefined);
    mockClearRLSContext.mockResolvedValue(undefined);
  });

  it("should set RLS context before running handler", async () => {
    const { withTenantScopeGuarded } = await import("@/lib/auth/with-tenant-scope");

    const mockRequest = {} as any;
    const handler = vi.fn().mockResolvedValue("result");

    await withTenantScopeGuarded(mockRequest, handler);

    expect(mockSetRLSContext).toHaveBeenCalledBefore(handler);
  });

  it("should clear RLS context after handler succeeds", async () => {
    const { withTenantScopeGuarded } = await import("@/lib/auth/with-tenant-scope");

    const mockRequest = {} as any;
    const handler = vi.fn().mockResolvedValue("result");

    await withTenantScopeGuarded(mockRequest, handler);

    expect(mockClearRLSContext).toHaveBeenCalledTimes(1);
  });

  it("should clear RLS context even when handler throws", async () => {
    const { withTenantScopeGuarded } = await import("@/lib/auth/with-tenant-scope");

    const mockRequest = {} as any;
    const error = new Error("Handler exploded");
    const handler = vi.fn().mockRejectedValue(error);

    await expect(withTenantScopeGuarded(mockRequest, handler)).rejects.toThrow("Handler exploded");
    expect(mockClearRLSContext).toHaveBeenCalledTimes(1);
  });

  it("should pass enterprise context to handler", async () => {
    const { withTenantScopeGuarded } = await import("@/lib/auth/with-tenant-scope");

    const expectedCtx = { enterpriseId: "ent-001", isAdmin: false };
    mockGetEnterpriseId.mockReturnValue(expectedCtx);

    const mockRequest = {} as any;
    let receivedCtx: unknown;
    const handler = vi.fn(async (ctx) => {
      receivedCtx = ctx;
      return "ok";
    });

    await withTenantScopeGuarded(mockRequest, handler);

    expect(receivedCtx).toEqual(expectedCtx);
  });

  it("should return handler's return value", async () => {
    const { withTenantScopeGuarded } = await import("@/lib/auth/with-tenant-scope");

    const mockRequest = {} as any;
    const handler = vi.fn().mockResolvedValue({ status: 200, data: "test" });

    const result = await withTenantScopeGuarded(mockRequest, handler);

    expect(result).toEqual({ status: 200, data: "test" });
  });

  it("should set RLS context with correct enterprise context", async () => {
    const { withTenantScopeGuarded } = await import("@/lib/auth/with-tenant-scope");

    const expectedCtx = { enterpriseId: "ent-002", isAdmin: true };
    mockGetEnterpriseId.mockReturnValue(expectedCtx);

    const mockRequest = {} as any;
    const handler = vi.fn().mockResolvedValue("ok");

    await withTenantScopeGuarded(mockRequest, handler);

    expect(mockSetRLSContext).toHaveBeenCalledWith(expectedCtx);
  });
});
