import { describe, it, expect, vi, beforeEach } from "vitest";
import { rateLimit, RateLimitConfig } from "@/lib/rate-limit";

// ── In-memory rate limit tests ──────────────────────────────────────────────
// These tests use the memory-based rate limiting when Redis is not available.
// We mock process.env.REDIS_URL to ensure memory mode is used.

describe("rateLimit (in-memory)", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.REDIS_URL;
  });

  it("returns null (allowed) for first request within window", async () => {
    const config: RateLimitConfig = { endpoint: "chat", max: 5, windowMs: 60_000 };
    const result = await rateLimit("user@example.com", config);

    expect(result).toBeNull();
  });

  it("returns null (allowed) for requests within limit", async () => {
    const config: RateLimitConfig = { endpoint: "generate", max: 3, windowMs: 60_000 };

    const result1 = await rateLimit("alice@example.com", config);
    const result2 = await rateLimit("alice@example.com", config);
    const result3 = await rateLimit("alice@example.com", config);

    expect(result1).toBeNull();
    expect(result2).toBeNull();
    expect(result3).toBeNull();
  });

  it("returns 429 NextResponse when exceeding max requests", async () => {
    const config: RateLimitConfig = { endpoint: "deploy", max: 2, windowMs: 60_000 };

    const result1 = await rateLimit("bob@example.com", config);
    const result2 = await rateLimit("bob@example.com", config);
    const result3 = await rateLimit("bob@example.com", config);

    expect(result1).toBeNull();
    expect(result2).toBeNull();
    expect(result3).not.toBeNull();
    expect(result3?.status).toBe(429);
  });

  it("returns 429 with correct HTTP headers", async () => {
    const config: RateLimitConfig = { endpoint: "test", max: 1, windowMs: 60_000 };

    await rateLimit("charlie@example.com", config);
    const limitedResponse = await rateLimit("charlie@example.com", config);

    expect(limitedResponse?.headers.get("Retry-After")).toBeDefined();
    const retryAfter = limitedResponse?.headers.get("Retry-After");
    expect(retryAfter).toMatch(/^\d+$/); // Should be a number string
  });

  it("returns 429 response body with appropriate fields", async () => {
    const config: RateLimitConfig = { endpoint: "api", max: 1, windowMs: 60_000 };

    await rateLimit("diana@example.com", config);
    const limitedResponse = await rateLimit("diana@example.com", config);

    expect(limitedResponse).not.toBeNull();
    const body = await limitedResponse!.json();
    expect(body.code).toBe("RATE_LIMITED");
    expect(body.message).toBeDefined();
    expect(body.message).toContain("Rate limit exceeded");
  });

  it("tracks different endpoints separately", async () => {
    const config1: RateLimitConfig = { endpoint: "chat", max: 1, windowMs: 60_000 };
    const config2: RateLimitConfig = { endpoint: "generate", max: 1, windowMs: 60_000 };

    const actor = "eve@example.com";

    // First endpoint: use up quota
    const chat1 = await rateLimit(actor, config1);
    const chat2 = await rateLimit(actor, config1);

    // Second endpoint: should still be allowed (separate counter)
    const gen1 = await rateLimit(actor, config2);
    const gen2 = await rateLimit(actor, config2);

    expect(chat1).toBeNull();
    expect(chat2).not.toBeNull(); // chat exceeded
    expect(gen1).toBeNull();
    expect(gen2).not.toBeNull(); // generate exceeded
  });

  it("tracks different actors separately", async () => {
    const config: RateLimitConfig = { endpoint: "shared", max: 1, windowMs: 60_000 };

    const result1 = await rateLimit("frank@example.com", config);
    const result2 = await rateLimit("grace@example.com", config);
    const result3 = await rateLimit("frank@example.com", config);

    expect(result1).toBeNull(); // frank: 1st request allowed
    expect(result2).toBeNull(); // grace: 1st request allowed (different actor)
    expect(result3).not.toBeNull(); // frank: 2nd request denied
  });

  it("uses default 60_000ms window when windowMs not specified", async () => {
    const config: RateLimitConfig = { endpoint: "default-window", max: 1 };
    // windowMs defaults to 60_000

    const result1 = await rateLimit("henry@example.com", config);
    const result2 = await rateLimit("henry@example.com", config);

    expect(result1).toBeNull();
    expect(result2).not.toBeNull();
  });

  it("respects custom window sizes", async () => {
    const config: RateLimitConfig = { endpoint: "custom-window", max: 2, windowMs: 5_000 };

    const result1 = await rateLimit("iris@example.com", config);
    const result2 = await rateLimit("iris@example.com", config);
    const result3 = await rateLimit("iris@example.com", config);

    expect(result1).toBeNull();
    expect(result2).toBeNull();
    expect(result3).not.toBeNull();
  });

  it("includes request limit info in error message", async () => {
    const config: RateLimitConfig = { endpoint: "msg", max: 3, windowMs: 30_000 };

    for (let i = 0; i < 3; i++) {
      await rateLimit("jack@example.com", config);
    }
    const limitedResponse = await rateLimit("jack@example.com", config);

    expect(limitedResponse).not.toBeNull();
    const body = await limitedResponse!.json();
    expect(body.message).toContain("3");
    expect(body.message).toContain("30");
  });

  it("calculates retry-after based on window expiry", async () => {
    const config: RateLimitConfig = { endpoint: "retry", max: 1, windowMs: 60_000 };

    await rateLimit("kevin@example.com", config);
    const limitedResponse = await rateLimit("kevin@example.com", config);

    expect(limitedResponse).not.toBeNull();
    const retryAfter = parseInt(limitedResponse!.headers.get("Retry-After") || "0", 10);
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(60);
  });

  it("resets count after window expires (with fake timers)", async () => {
    vi.useFakeTimers();

    const config: RateLimitConfig = { endpoint: "reset", max: 1, windowMs: 5_000 };
    const actor = "leo@example.com";

    // First request allowed
    const result1 = await rateLimit(actor, config);
    expect(result1).toBeNull();

    // Second request denied
    const result2 = await rateLimit(actor, config);
    expect(result2).not.toBeNull();

    // Advance time past window
    vi.advanceTimersByTime(6_000);

    // Third request allowed (window has expired)
    const result3 = await rateLimit(actor, config);
    expect(result3).toBeNull();

    vi.useRealTimers();
  });

  it("allows max requests exactly at the limit", async () => {
    const config: RateLimitConfig = { endpoint: "exact", max: 3, windowMs: 60_000 };
    const actor = "mona@example.com";

    const result1 = await rateLimit(actor, config);
    const result2 = await rateLimit(actor, config);
    const result3 = await rateLimit(actor, config);
    const result4 = await rateLimit(actor, config);

    expect(result1).toBeNull();
    expect(result2).toBeNull();
    expect(result3).toBeNull();
    expect(result4).not.toBeNull(); // First to exceed limit
  });

  it("handles rapid consecutive requests", async () => {
    const config: RateLimitConfig = { endpoint: "rapid", max: 10, windowMs: 60_000 };
    const actor = "oscar@example.com";

    const results = [];
    for (let i = 0; i < 12; i++) {
      results.push(await rateLimit(actor, config));
    }

    const allowedCount = results.filter((r) => r === null).length;
    const deniedCount = results.filter((r) => r !== null).length;

    expect(allowedCount).toBe(10);
    expect(deniedCount).toBe(2);
  });

  it("combines endpoint and actor into unique key", async () => {
    const config1: RateLimitConfig = { endpoint: "ep1", max: 1, windowMs: 60_000 };
    const config2: RateLimitConfig = { endpoint: "ep2", max: 1, windowMs: 60_000 };
    const actor1 = "paul@example.com";
    const actor2 = "quinn@example.com";

    // All combinations should be tracked separately
    const r1_1 = await rateLimit(actor1, config1);
    const r1_2 = await rateLimit(actor1, config2);
    const r2_1 = await rateLimit(actor2, config1);
    const r2_2 = await rateLimit(actor2, config2);

    // All first requests should be allowed
    expect(r1_1).toBeNull();
    expect(r1_2).toBeNull();
    expect(r2_1).toBeNull();
    expect(r2_2).toBeNull();

    // All second requests should be denied
    const r1_1_retry = await rateLimit(actor1, config1);
    const r1_2_retry = await rateLimit(actor1, config2);
    const r2_1_retry = await rateLimit(actor2, config1);
    const r2_2_retry = await rateLimit(actor2, config2);

    expect(r1_1_retry).not.toBeNull();
    expect(r1_2_retry).not.toBeNull();
    expect(r2_1_retry).not.toBeNull();
    expect(r2_2_retry).not.toBeNull();
  });

  it("handles endpoint name with special characters", async () => {
    const config: RateLimitConfig = { endpoint: "api-v1/chat", max: 2, windowMs: 60_000 };

    const result1 = await rateLimit("ruth@example.com", config);
    const result2 = await rateLimit("ruth@example.com", config);
    const result3 = await rateLimit("ruth@example.com", config);

    expect(result1).toBeNull();
    expect(result2).toBeNull();
    expect(result3).not.toBeNull();
  });

  it("handles email addresses with special characters", async () => {
    const config: RateLimitConfig = { endpoint: "test", max: 1, windowMs: 60_000 };

    const result1 = await rateLimit("sam.o'brien+test@example.co.uk", config);
    const result2 = await rateLimit("sam.o'brien+test@example.co.uk", config);

    expect(result1).toBeNull();
    expect(result2).not.toBeNull();
  });

  it("response includes proper Content-Type for JSON", async () => {
    const config: RateLimitConfig = { endpoint: "content-type", max: 1, windowMs: 60_000 };

    await rateLimit("tina@example.com", config);
    const limitedResponse = await rateLimit("tina@example.com", config);

    expect(limitedResponse).not.toBeNull();
    const contentType = limitedResponse!.headers.get("Content-Type");
    expect(contentType).toContain("application/json");
  });

  it("handles zero max requests", async () => {
    const config: RateLimitConfig = { endpoint: "zero-max", max: 0, windowMs: 60_000 };

    const result = await rateLimit("ulysses@example.com", config);

    expect(result).not.toBeNull();
    expect(result?.status).toBe(429);
  });

  it("handles very large max requests", async () => {
    const config: RateLimitConfig = { endpoint: "large-max", max: 10000, windowMs: 60_000 };

    let lastResult = null;
    for (let i = 0; i < 10001; i++) {
      lastResult = await rateLimit("violet@example.com", config);
      if (lastResult !== null) break; // Stop early if limit reached
    }

    expect(lastResult).not.toBeNull();
    expect(lastResult?.status).toBe(429);
  });

  it("cleans up expired timestamps automatically", async () => {
    vi.useFakeTimers();

    const config: RateLimitConfig = { endpoint: "cleanup", max: 3, windowMs: 5_000 };
    const actor = "walt@example.com";

    // Add some requests
    await rateLimit(actor, config);
    await rateLimit(actor, config);

    // Advance past window
    vi.advanceTimersByTime(6_000);

    // New requests should start fresh (old ones cleaned up)
    const result1 = await rateLimit(actor, config);
    const result2 = await rateLimit(actor, config);
    const result3 = await rateLimit(actor, config);
    const result4 = await rateLimit(actor, config);

    expect(result1).toBeNull();
    expect(result2).toBeNull();
    expect(result3).toBeNull();
    expect(result4).not.toBeNull();

    vi.useRealTimers();
  });
});
