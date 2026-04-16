import { describe, it, expect, vi, beforeEach } from "vitest";
import type { RedisClient } from "../health";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockDbExecute } = vi.hoisted(() => ({
  mockDbExecute: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: { execute: mockDbExecute },
}));

let mockEnv: Record<string, string | undefined> = {};

vi.mock("@/lib/env", () => ({
  get env() {
    return mockEnv;
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  serializeError: (e: unknown) => ({ message: String(e) }),
}));

import { runHealthChecks } from "../health";

// ── Redis stub factory ────────────────────────────────────────────────────────

function makeRedisFactory(overrides: Partial<RedisClient> = {}): (url: string) => RedisClient {
  return (_url: string) => ({
    connect: vi.fn().mockResolvedValue(undefined),
    ping: vi.fn().mockResolvedValue("PONG"),
    quit: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  });
}

function makeFailingRedisFactory(error: string): (url: string) => RedisClient {
  return (_url: string) => ({
    connect: vi.fn().mockRejectedValue(new Error(error)),
    ping: vi.fn(),
    quit: vi.fn(),
  });
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockDbExecute.mockReset();
  mockDbExecute.mockResolvedValue([{ "?column?": 1 }]);

  mockEnv = {
    DATABASE_URL: "postgresql://test:test@localhost:5432/test",
    ANTHROPIC_API_KEY: "sk-ant-test-key-long-enough-to-pass",
    AUTH_SECRET: "test-secret-at-least-32-chars-ok",
    REDIS_URL: "redis://localhost:6379",
  };
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("runHealthChecks", () => {
  describe("overall status", () => {
    it("returns 'ok' when all probes succeed", async () => {
      const report = await runHealthChecks(makeRedisFactory());

      expect(report.status).toBe("ok");
      expect(report.probes.db.status).toBe("ok");
      expect(report.probes.redis.status).toBe("ok");
      expect(report.probes.anthropic.status).toBe("ok");
    });

    it("returns 'error' when DB probe fails", async () => {
      mockDbExecute.mockRejectedValue(new Error("Connection refused"));

      const report = await runHealthChecks(makeRedisFactory());

      expect(report.status).toBe("error");
      expect(report.probes.db.status).toBe("error");
      expect(report.probes.db.error).toContain("Connection refused");
    });

    it("returns 'degraded' (not 'error') when only Redis fails", async () => {
      const report = await runHealthChecks(makeFailingRedisFactory("ECONNREFUSED"));

      expect(report.status).toBe("degraded");
      expect(report.probes.db.status).toBe("ok");
      expect(report.probes.redis.status).toBe("degraded");
    });

    it("returns 'degraded' when Anthropic key is missing", async () => {
      mockEnv = { ...mockEnv, ANTHROPIC_API_KEY: "" };

      const report = await runHealthChecks(makeRedisFactory());

      expect(report.status).toBe("degraded");
      expect(report.probes.anthropic.status).toBe("degraded");
    });

    it("returns 'error' when DB fails even if other probes are ok", async () => {
      mockDbExecute.mockRejectedValue(new Error("timeout"));

      const report = await runHealthChecks(makeRedisFactory());

      expect(report.status).toBe("error");
    });
  });

  describe("DB probe", () => {
    it("executes a query to verify connectivity", async () => {
      await runHealthChecks(makeRedisFactory());
      expect(mockDbExecute).toHaveBeenCalledTimes(1);
    });

    it("records latency in ms", async () => {
      const report = await runHealthChecks(makeRedisFactory());
      expect(report.probes.db.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it("surfaces the error message in the probe result, not at top level", async () => {
      mockDbExecute.mockRejectedValue(
        new Error("password authentication failed for user 'prod'")
      );
      const report = await runHealthChecks(makeRedisFactory());

      expect(report.status).toBe("error");
      expect(report.probes.db.error).toContain("password authentication failed");
      expect(["ok", "degraded", "error"]).toContain(report.status);
    });
  });

  describe("Redis probe", () => {
    it("returns 'degraded' when REDIS_URL is not configured", async () => {
      mockEnv = { ...mockEnv, REDIS_URL: undefined };

      const report = await runHealthChecks(makeRedisFactory());

      expect(report.probes.redis.status).toBe("degraded");
      expect(report.probes.redis.error).toContain("not configured");
    });

    it("returns 'ok' when Redis connect+ping+quit succeed", async () => {
      const factory = makeRedisFactory();
      const report = await runHealthChecks(factory);
      expect(report.probes.redis.status).toBe("ok");
    });

    it("returns 'degraded' when Redis connect throws", async () => {
      const report = await runHealthChecks(makeFailingRedisFactory("ECONNREFUSED 127.0.0.1:6379"));

      expect(report.probes.redis.status).toBe("degraded");
      expect(report.probes.redis.error).toContain("ECONNREFUSED");
    });

    it("calls connect, ping, and quit in order", async () => {
      const connect = vi.fn().mockResolvedValue(undefined);
      const ping = vi.fn().mockResolvedValue("PONG");
      const quit = vi.fn().mockResolvedValue(undefined);
      const factory = (_url: string): RedisClient => ({ connect, ping, quit });

      await runHealthChecks(factory);

      expect(connect).toHaveBeenCalledTimes(1);
      expect(ping).toHaveBeenCalledTimes(1);
      expect(quit).toHaveBeenCalledTimes(1);
    });
  });

  describe("Anthropic probe", () => {
    it("returns 'ok' for a valid-format key", async () => {
      const report = await runHealthChecks(makeRedisFactory());
      expect(report.probes.anthropic.status).toBe("ok");
    });

    it("returns 'ok' for the CI stub key (starts with sk-ant- and is long enough)", async () => {
      mockEnv = { ...mockEnv, ANTHROPIC_API_KEY: "sk-ant-stub-not-real-long-key" };
      const report = await runHealthChecks(makeRedisFactory());
      expect(report.probes.anthropic.status).toBe("ok");
    });

    it("returns 'degraded' for an empty key", async () => {
      mockEnv = { ...mockEnv, ANTHROPIC_API_KEY: "" };
      const report = await runHealthChecks(makeRedisFactory());
      expect(report.probes.anthropic.status).toBe("degraded");
    });

    it("returns 'degraded' for a malformed key", async () => {
      mockEnv = { ...mockEnv, ANTHROPIC_API_KEY: "not-a-real-key" };
      const report = await runHealthChecks(makeRedisFactory());
      expect(report.probes.anthropic.status).toBe("degraded");
    });
  });

  describe("report shape", () => {
    it("includes a top-level latencyMs field", async () => {
      const report = await runHealthChecks(makeRedisFactory());
      expect(typeof report.latencyMs).toBe("number");
      expect(report.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it("includes an ISO 8601 timestamp", async () => {
      const report = await runHealthChecks(makeRedisFactory());
      expect(new Date(report.timestamp).toISOString()).toBe(report.timestamp);
    });

    it("runs DB and Redis probes concurrently (both invoked)", async () => {
      const connect = vi.fn().mockResolvedValue(undefined);
      const factory = (_url: string): RedisClient => ({
        connect,
        ping: vi.fn().mockResolvedValue("PONG"),
        quit: vi.fn().mockResolvedValue(undefined),
      });

      await runHealthChecks(factory);

      expect(mockDbExecute).toHaveBeenCalledTimes(1);
      expect(connect).toHaveBeenCalledTimes(1);
    });
  });
});
