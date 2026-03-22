/**
 * ABP schema migration framework.
 *
 * Provides a versioned migration chain for Agent Blueprint Package (ABP) objects
 * stored in the database. All existing ABPs were produced with version "1.0.0"
 * (or lack an explicit version field, which is also treated as "1.0.0").
 *
 * Usage pattern:
 *   import { migrateABP, LATEST_VERSION } from "@/lib/abp/migrate";
 *   const migrated = migrateABP(raw, LATEST_VERSION);
 *
 * Adding a new version:
 *   1. Add the version string to `ABPVersion`.
 *   2. Add it to `VERSION_ORDER` (in ascending order).
 *   3. Update `LATEST_VERSION`.
 *   4. Call `registerMigration("N.N.N", "N.N.N+1", fn)` at module init time.
 *      The migration fn receives the ABP at the previous version and must return
 *      the ABP at the next version (with `version` updated).
 */

// ── Version registry ─────────────────────────────────────────────────────────

export type ABPVersion = "1.0.0" | "1.1.0";

/**
 * Ordered list of all known versions — from oldest to newest.
 * The migration chain walks this list to find the steps to apply.
 */
const VERSION_ORDER: ABPVersion[] = ["1.0.0", "1.1.0"];

/**
 * The target version that `readABP()` migrates to.
 * Updated here when a new schema version is introduced (H1-3.2 → "1.1.0").
 */
export const LATEST_VERSION: ABPVersion = "1.1.0";

// ── Migration registry ────────────────────────────────────────────────────────

export type MigrationFn = (
  abp: Record<string, unknown>
) => Record<string, unknown>;

const MIGRATIONS = new Map<string, MigrationFn>();

function migrationKey(from: ABPVersion, to: ABPVersion): string {
  return `${from}→${to}`;
}

/**
 * Register a one-step migration function from `from` to `to`.
 * The function receives the ABP at version `from` and must return an ABP at
 * version `to`. The `version` field is updated automatically after the fn runs.
 *
 * Only adjacent steps are supported — to migrate 1.0.0 → 1.2.0, register both
 * 1.0.0→1.1.0 and 1.1.0→1.2.0 separately.
 */
export function registerMigration(
  from: ABPVersion,
  to: ABPVersion,
  fn: MigrationFn
): void {
  MIGRATIONS.set(migrationKey(from, to), fn);
}

// ── Version detection ─────────────────────────────────────────────────────────

/**
 * Detect the version of a raw ABP object.
 * - If `abp.version` is a known version string, return it.
 * - If missing or unrecognised, return "1.0.0" — all ABPs produced before the
 *   `version` field was formalised are implicitly at 1.0.0.
 */
export function detectVersion(abp: Record<string, unknown>): ABPVersion {
  const v = abp.version;
  if (typeof v === "string" && VERSION_ORDER.includes(v as ABPVersion)) {
    return v as ABPVersion;
  }
  return "1.0.0";
}

// ── Migration runner ──────────────────────────────────────────────────────────

/**
 * Migrate `abp` from its detected version to `targetVersion`.
 *
 * - If already at `targetVersion`, returns a shallow copy with `version` set.
 * - Otherwise walks VERSION_ORDER and applies registered migration functions
 *   one step at a time until the target is reached.
 * - Throws if any step in the required chain has no registered migration.
 *
 * @param abp - Raw ABP object (e.g., parsed from DB jsonb column).
 * @param targetVersion - The version to migrate to.
 * @returns Migrated ABP object with `version` field set to `targetVersion`.
 * @throws Error if no migration path exists between detected and target version.
 */
export function migrateABP(
  abp: Record<string, unknown>,
  targetVersion: ABPVersion
): Record<string, unknown> {
  const currentVersion = detectVersion(abp);

  if (currentVersion === targetVersion) {
    // No migration needed — ensure `version` field is present.
    return { ...abp, version: targetVersion };
  }

  const fromIdx = VERSION_ORDER.indexOf(currentVersion);
  const toIdx = VERSION_ORDER.indexOf(targetVersion);

  if (fromIdx === -1 || toIdx === -1) {
    throw new Error(
      `[abp/migrate] Unknown version in migration path: ${currentVersion} → ${targetVersion}`
    );
  }

  if (fromIdx > toIdx) {
    throw new Error(
      `[abp/migrate] Downgrade not supported: ${currentVersion} → ${targetVersion}`
    );
  }

  // Apply each step in the chain
  let current: Record<string, unknown> = { ...abp };
  for (let i = fromIdx; i < toIdx; i++) {
    const from = VERSION_ORDER[i];
    const to = VERSION_ORDER[i + 1];
    const fn = MIGRATIONS.get(migrationKey(from, to));
    if (!fn) {
      throw new Error(
        `[abp/migrate] No migration registered for ${from} → ${to}`
      );
    }
    current = fn(current);
    // Ensure the migration fn updated the version field
    current = { ...current, version: to };
  }

  return current;
}

// ── Built-in migrations ───────────────────────────────────────────────────────

/**
 * 1.0.0 → 1.1.0: Add `execution` section.
 * All sub-fields have Zod defaults so an empty object is sufficient;
 * Zod will fill in defaults at parse time via `readABP()`.
 */
registerMigration("1.0.0", "1.1.0", (abp) => ({
  ...abp,
  execution: abp.execution ?? {},
}));
