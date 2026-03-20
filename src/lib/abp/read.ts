/**
 * readABP — the single function all code should use to read ABPs from the database.
 *
 * Applies migrate-on-read: detects the stored ABP's version, applies any
 * registered migrations up to LATEST_VERSION, then validates the result
 * through ABPSchema.
 *
 * This means old ABPs never fail at read time — they are transparently upgraded
 * to the current schema. The upgrade is in-memory only; the database row is
 * NOT updated automatically (the application can choose to persist the migrated
 * version if it writes back, but there is no background migration job).
 *
 * Usage:
 *   import { readABP } from "@/lib/abp/read";
 *   const abp = readABP(blueprintRow.abp);
 *
 * H1-3.3: All server-side `blueprint.abp as ABP` casts have been replaced with
 * this function. Client components that receive already-migrated data from the API
 * may still use type assertions — that is acceptable as data arrives validated.
 */

import { ABPSchema, ABP } from "@/lib/types/abp";
import { migrateABP, LATEST_VERSION } from "./migrate";

/**
 * Read and validate an ABP from a raw database value.
 *
 * @param raw - The `abp` jsonb column value (usually typed as `unknown` from Drizzle).
 * @returns A fully typed, schema-validated `ABP` at `LATEST_VERSION`.
 * @throws ZodError if the migrated ABP does not pass schema validation.
 * @throws Error if no migration path exists from the detected version.
 */
export function readABP(raw: unknown): ABP {
  const migrated = migrateABP(raw as Record<string, unknown>, LATEST_VERSION);
  return ABPSchema.parse(migrated);
}
