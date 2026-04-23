/**
 * Tests for the Zod env schema's production-boot gate on SECRETS_ENCRYPTION_KEY (ADR-018).
 *
 * The env validator runs at module load. These tests use `vi.stubEnv` + `vi.resetModules`
 * to force a fresh `import("@/lib/env")` under each env configuration, then assert that
 * the import either throws (on invariant violation) or succeeds (on valid config).
 *
 * Coverage:
 * - Production without SECRETS_ENCRYPTION_KEY → boot fails.
 * - Production with malformed key (wrong length, non-hex) → boot fails.
 * - Production with a valid 64-hex key → boot succeeds.
 * - Development / test without the key → boot succeeds (opt-in behavior preserved).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("env schema — SECRETS_ENCRYPTION_KEY production gate (ADR-018)", () => {
  const VALID_KEY = "a".repeat(64); // 32 bytes hex = valid AES-256 key

  beforeEach(() => {
    vi.resetModules();
    // Baseline required fields so we're only exercising the SECRETS_ENCRYPTION_KEY
    // gate, not incidental validation noise from missing neighbors.
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@localhost:5432/test");
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test-key-for-env-validation-0123456789");
    vi.stubEnv("AUTH_SECRET", "a".repeat(32));
    vi.stubEnv("CRON_SECRET", "cron-secret-for-env-validation-test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("rejects production boot when SECRETS_ENCRYPTION_KEY is unset", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SECRETS_ENCRYPTION_KEY", "");

    await expect(import("@/lib/env")).rejects.toThrow(/SECRETS_ENCRYPTION_KEY/);
  });

  it("rejects production boot when SECRETS_ENCRYPTION_KEY is too short", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SECRETS_ENCRYPTION_KEY", "a".repeat(32)); // half-length

    await expect(import("@/lib/env")).rejects.toThrow(/SECRETS_ENCRYPTION_KEY/);
  });

  it("rejects production boot when SECRETS_ENCRYPTION_KEY contains non-hex characters", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SECRETS_ENCRYPTION_KEY", "z".repeat(64)); // right length, wrong alphabet

    await expect(import("@/lib/env")).rejects.toThrow(/SECRETS_ENCRYPTION_KEY/);
  });

  it("accepts production boot with a valid 64-character hex key", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SECRETS_ENCRYPTION_KEY", VALID_KEY);

    const mod = await import("@/lib/env");
    expect(mod.env.SECRETS_ENCRYPTION_KEY).toBe(VALID_KEY);
    expect(mod.env.NODE_ENV).toBe("production");
  });

  it("accepts development boot without SECRETS_ENCRYPTION_KEY", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("SECRETS_ENCRYPTION_KEY", "");

    const mod = await import("@/lib/env");
    // When unset, the optional schema returns either undefined or empty string;
    // what matters is that boot succeeded.
    expect(mod.env.NODE_ENV).toBe("development");
  });

  it("accepts test boot without SECRETS_ENCRYPTION_KEY", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("SECRETS_ENCRYPTION_KEY", "");

    const mod = await import("@/lib/env");
    expect(mod.env.NODE_ENV).toBe("test");
  });
});
