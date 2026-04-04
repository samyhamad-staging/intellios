import { db } from "@/lib/db";
import { enterpriseSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { DEFAULT_ENTERPRISE_SETTINGS, EnterpriseSettings } from "./types";

/**
 * Fetch enterprise settings from the database.
 *
 * Deep-merges stored settings with DEFAULT_ENTERPRISE_SETTINGS so that
 * partial DB rows (enterprises that have only changed a subset of settings)
 * always return a fully-typed object. Missing keys fall back to defaults.
 *
 * Returns defaults immediately if no row exists for this enterprise.
 */
export async function getEnterpriseSettings(
  enterpriseId: string | null | undefined
): Promise<EnterpriseSettings> {
  if (!enterpriseId) return DEFAULT_ENTERPRISE_SETTINGS;

  try {
    const row = await db.query.enterpriseSettings.findFirst({
      where: eq(enterpriseSettings.enterpriseId, enterpriseId),
    });

    if (!row) return DEFAULT_ENTERPRISE_SETTINGS;

    const stored = row.settings as Partial<EnterpriseSettings>;
    return deepMerge(DEFAULT_ENTERPRISE_SETTINGS, stored);
  } catch {
    // DB unavailable — fall back to defaults rather than throwing
    return DEFAULT_ENTERPRISE_SETTINGS;
  }
}

/**
 * Deep merge two objects. Values from `override` take precedence over `base`.
 * Only merges plain objects — primitives, arrays, null are replaced wholesale.
 */
function deepMerge<T>(base: T, override: Partial<T>): T {
  const result = { ...(base as Record<string, unknown>) } as Record<string, unknown>;
  const baseObj = base as Record<string, unknown>;
  const overrideObj = override as Record<string, unknown>;
  for (const key in overrideObj) {
    const baseVal = baseObj[key];
    const overrideVal = overrideObj[key];
    if (
      overrideVal !== null &&
      overrideVal !== undefined &&
      typeof overrideVal === "object" &&
      !Array.isArray(overrideVal) &&
      typeof baseVal === "object" &&
      baseVal !== null &&
      !Array.isArray(baseVal)
    ) {
      result[key] = deepMerge(
        baseVal as Record<string, unknown>,
        overrideVal as Partial<Record<string, unknown>>
      );
    } else if (overrideVal !== undefined) {
      result[key] = overrideVal;
    }
  }
  return result as T;
}
