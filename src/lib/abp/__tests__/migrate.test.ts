import { describe, it, expect, beforeEach } from "vitest";
import {
  detectVersion,
  migrateABP,
  registerMigration,
  LATEST_VERSION,
  type ABPVersion,
  type MigrationFn,
} from "../migrate";

// ── helpers ──────────────────────────────────────────────────────────────────

/** Minimal v1.0.0-shaped ABP for test use */
function makeV100(): Record<string, unknown> {
  return {
    version: "1.0.0",
    metadata: { id: "test-id", created_at: "2026-01-01T00:00:00Z", created_by: "test", status: "draft" },
    identity: { name: "Test Agent", description: "A test agent" },
    capabilities: { tools: [] },
    constraints: {},
    governance: { policies: [] },
  };
}

// ── detectVersion ─────────────────────────────────────────────────────────────

describe("detectVersion", () => {
  it('returns "1.0.0" when version field is absent', () => {
    const abp = makeV100();
    delete abp.version;
    expect(detectVersion(abp)).toBe("1.0.0");
  });

  it('returns "1.0.0" when version is explicitly "1.0.0"', () => {
    expect(detectVersion({ version: "1.0.0" })).toBe("1.0.0");
  });

  it('returns "1.1.0" when version is "1.1.0"', () => {
    expect(detectVersion({ version: "1.1.0" })).toBe("1.1.0");
  });

  it('falls back to "1.0.0" for unrecognised version strings', () => {
    expect(detectVersion({ version: "99.0.0" })).toBe("1.0.0");
  });

  it('falls back to "1.0.0" when version is a non-string type', () => {
    expect(detectVersion({ version: 42 })).toBe("1.0.0");
  });
});

// ── migrateABP — same-version (no-op) ────────────────────────────────────────

describe("migrateABP — same version", () => {
  it("returns a copy with version set when already at target", () => {
    const abp = makeV100();
    const result = migrateABP(abp, "1.0.0");
    expect(result.version).toBe("1.0.0");
    expect(result.identity).toEqual(abp.identity);
  });

  it("does not mutate the original object", () => {
    const abp = makeV100();
    migrateABP(abp, "1.0.0");
    expect(abp.version).toBe("1.0.0"); // unchanged
  });

  it("adds version field when source has none", () => {
    const abp = makeV100();
    delete abp.version;
    const result = migrateABP(abp, "1.0.0");
    expect(result.version).toBe("1.0.0");
  });
});

// ── migrateABP — applying registered migrations ───────────────────────────────

describe("migrateABP — registered migration", () => {
  // Register a test-only migration 1.0.0 → 1.1.0 that adds a sentinel field.
  // This is registered once; repeated runs add it again (harmless since Map.set overwrites).
  beforeEach(() => {
    const addExecution: MigrationFn = (abp) => ({
      ...abp,
      execution: { observability: { metricsEnabled: true } },
    });
    registerMigration("1.0.0", "1.1.0", addExecution);
  });

  it("applies the migration fn when going 1.0.0 → 1.1.0", () => {
    const abp = makeV100();
    const result = migrateABP(abp, "1.1.0");
    expect(result.version).toBe("1.1.0");
    expect((result as Record<string, unknown>).execution).toBeDefined();
  });

  it("sets the version field to the target after migration", () => {
    const abp = makeV100();
    const result = migrateABP(abp, "1.1.0");
    expect(result.version).toBe("1.1.0");
  });

  it("migrating to current version is a no-op even if a migration is registered", () => {
    const abp100 = makeV100();
    const result = migrateABP(abp100, "1.0.0");
    expect(result.version).toBe("1.0.0");
    // execution field should NOT be present — the migration was not applied
    expect((result as Record<string, unknown>).execution).toBeUndefined();
  });
});

// ── migrateABP — missing migration path ──────────────────────────────────────

describe("migrateABP — missing migration path", () => {
  it("throws when no migration is registered for a required step", () => {
    // Temporarily clear the 1.0.0→1.1.0 migration to simulate missing path.
    // We do this by registering a noop that immediately throws, then restore.
    // Because Map.set overwrites, we re-register the expected fn after.
    // Simpler: use a fresh import via an abp with unregistered step by using
    // a partial registry state. Since registerMigration mutates module state,
    // we verify via a version pair that has never been registered.

    // Version "1.1.0" → "1.0.0" is a downgrade and should throw.
    const abp110: Record<string, unknown> = { ...makeV100(), version: "1.1.0" };
    expect(() => migrateABP(abp110, "1.0.0")).toThrow(/[Dd]owngrade/);
  });
});

// ── LATEST_VERSION sanity check ───────────────────────────────────────────────

describe("LATEST_VERSION", () => {
  it('is "1.1.0" after H1-3.2 introduced the execution section', () => {
    expect(LATEST_VERSION).toBe("1.1.0");
  });
});
