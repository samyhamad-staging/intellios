/**
 * Shared policy loader — used by the Governance Validator, the Generation Engine,
 * and the Intake Engine. Single source of truth for the enterprise policy query.
 *
 * Query semantics: global policies (enterprise_id IS NULL) are always included.
 * When an enterprise_id is provided, enterprise-specific policies are also included.
 */

import { db } from "@/lib/db";
import { governancePolicies } from "@/lib/db/schema";
import { or, isNull, eq } from "drizzle-orm";
import { GovernancePolicy, PolicyRule } from "./types";

export async function loadPolicies(
  enterpriseId: string | null
): Promise<GovernancePolicy[]> {
  const rows = await db
    .select()
    .from(governancePolicies)
    .where(
      enterpriseId
        ? or(isNull(governancePolicies.enterpriseId), eq(governancePolicies.enterpriseId, enterpriseId))
        : isNull(governancePolicies.enterpriseId)
    );

  return rows.map((row) => ({
    id: row.id,
    enterpriseId: row.enterpriseId,
    name: row.name,
    type: row.type,
    description: row.description,
    rules: (row.rules ?? []) as PolicyRule[],
  }));
}
