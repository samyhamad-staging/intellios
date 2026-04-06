import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseBody } from "../parse-body";
import { z } from "zod";
import { ErrorCode } from "@/lib/errors";
import { NextRequest, NextResponse } from "next/server";

// ── Fixtures ────────────────────────────────────────────────────────────────

function createMockRequest(body: unknown): NextRequest {
  const request = {
    json: vi.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
  return request;
}

function createMockRequestWithError(error: Error): NextRequest {
  const request = {
    json: vi.fn().mockRejectedValue(error),
  } as unknown as NextRequest;
  return request;
}

// ── parseBody ───────────────────────────────────────────────────────────────

describe("parseBody", () => {
  const simpleSchema = z.object({
    name: z.string(),
    age: z.number(),
  });

  it("returns { data, error: null } on valid JSON matching schema", async () => {
    const request = createMockRequest({ name: "Alice", age: 30 });
    const result = await parseBody(request, simpleSchema);

    expect(result.error).toBeNull();
    expect(result.data).toEqual({ name: "Alice", age: 30 });
  });

  it("returns { data: null, error } with 400 status on invalid JSON", async () => {
    const request = createMockRequestWithError(new SyntaxError("Unexpected token"));
    const result = await parseBody(request, simpleSchema);

    expect(result.data).toBeNull();
    expect(result.error).not.toBeNull();
    if (result.error) {
      expect(result.error.status).toBe(400);
      const body = await result.error.json();
      expect(body.code).toBe(ErrorCode.BAD_REQUEST);
      expect(body.message).toBe("Request body must be valid JSON");
    }
  });

  it("returns { data: null, error } with validation details on schema failure", async () => {
    const request = createMockRequest({ name: "Bob" }); // missing 'age'
    const result = await parseBody(request, simpleSchema);

    expect(result.data).toBeNull();
    expect(result.error).not.toBeNull();
    if (result.error) {
      expect(result.error.status).toBe(400);
      const body = await result.error.json();
      expect(body.code).toBe(ErrorCode.BAD_REQUEST);
      expect(body.message).toBe("Validation failed");
      expect(body.details).toBeDefined();
      expect(Array.isArray(body.details)).toBe(true);
      expect(body.details.length).toBeGreaterThan(0);
    }
  });

  it("includes field path in validation error details", async () => {
    const request = createMockRequest({ name: "Charlie", age: "not a number" });
    const result = await parseBody(request, simpleSchema);

    expect(result.data).toBeNull();
    if (result.error) {
      const body = await result.error.json();
      expect(body.details).toBeDefined();
      expect(body.details.some((detail: string) => detail.includes("age"))).toBe(true);
    }
  });

  it("handles empty body (empty object)", async () => {
    const request = createMockRequest({});
    const result = await parseBody(request, simpleSchema);

    expect(result.data).toBeNull();
    expect(result.error).not.toBeNull();
  });

  it("applies schema transforms (e.g., trim)", async () => {
    const transformSchema = z.object({
      message: z.string().trim(),
    });

    const request = createMockRequest({ message: "  hello world  " });
    const result = await parseBody(request, transformSchema);

    expect(result.error).toBeNull();
    expect(result.data?.message).toBe("hello world");
  });

  it("applies schema defaults when field is missing", async () => {
    const defaultSchema = z.object({
      name: z.string(),
      status: z.string().default("pending"),
    });

    const request = createMockRequest({ name: "Diana" });
    const result = await parseBody(request, defaultSchema);

    expect(result.error).toBeNull();
    expect(result.data?.status).toBe("pending");
  });

  it("handles nested object validation", async () => {
    const nestedSchema = z.object({
      user: z.object({
        name: z.string(),
        email: z.string().email(),
      }),
    });

    const request = createMockRequest({
      user: { name: "Eve", email: "eve@example.com" },
    });
    const result = await parseBody(request, nestedSchema);

    expect(result.error).toBeNull();
    expect(result.data?.user.email).toBe("eve@example.com");
  });

  it("includes error path for nested validation failures", async () => {
    const nestedSchema = z.object({
      user: z.object({
        name: z.string(),
        email: z.string().email(),
      }),
    });

    const request = createMockRequest({
      user: { name: "Frank", email: "invalid-email" },
    });
    const result = await parseBody(request, nestedSchema);

    expect(result.data).toBeNull();
    if (result.error) {
      const body = await result.error.json();
      expect(body.details).toBeDefined();
      expect(body.details.some((detail: string) => detail.includes("user.email"))).toBe(true);
    }
  });

  it("handles arrays in schema", async () => {
    const arraySchema = z.object({
      items: z.array(z.string()),
    });

    const request = createMockRequest({ items: ["a", "b", "c"] });
    const result = await parseBody(request, arraySchema);

    expect(result.error).toBeNull();
    expect(result.data?.items).toEqual(["a", "b", "c"]);
  });

  it("validates array element types", async () => {
    const arraySchema = z.object({
      items: z.array(z.number()),
    });

    const request = createMockRequest({ items: [1, "two", 3] });
    const result = await parseBody(request, arraySchema);

    expect(result.data).toBeNull();
    expect(result.error).not.toBeNull();
  });

  it("handles optional fields correctly", async () => {
    const optionalSchema = z.object({
      name: z.string(),
      nickname: z.string().optional(),
    });

    const request = createMockRequest({ name: "Grace" });
    const result = await parseBody(request, optionalSchema);

    expect(result.error).toBeNull();
    expect(result.data?.name).toBe("Grace");
    expect(result.data?.nickname).toBeUndefined();
  });

  it("handles coercion with schema coerce", async () => {
    const coerceSchema = z.object({
      id: z.coerce.number(),
    });

    const request = createMockRequest({ id: "42" });
    const result = await parseBody(request, coerceSchema);

    expect(result.error).toBeNull();
    expect(result.data?.id).toBe(42);
  });

  it("handles boolean values correctly", async () => {
    const boolSchema = z.object({
      active: z.boolean(),
    });

    const request = createMockRequest({ active: true });
    const result = await parseBody(request, boolSchema);

    expect(result.error).toBeNull();
    expect(result.data?.active).toBe(true);
  });

  it("rejects invalid boolean values", async () => {
    const boolSchema = z.object({
      active: z.boolean(),
    });

    const request = createMockRequest({ active: "yes" });
    const result = await parseBody(request, boolSchema);

    expect(result.data).toBeNull();
    expect(result.error).not.toBeNull();
  });

  it("handles null/undefined distinction", async () => {
    const nullSchema = z.object({
      value: z.string().nullable(),
    });

    const request = createMockRequest({ value: null });
    const result = await parseBody(request, nullSchema);

    expect(result.error).toBeNull();
    expect(result.data?.value).toBeNull();
  });

  it("chains multiple transformations", async () => {
    const chainSchema = z.object({
      email: z.string().trim().toLowerCase(),
    });

    const request = createMockRequest({ email: "  ALICE@EXAMPLE.COM  " });
    const result = await parseBody(request, chainSchema);

    expect(result.error).toBeNull();
    expect(result.data?.email).toBe("alice@example.com");
  });
});
