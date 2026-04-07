/**
 * Shared policy loader — used by the Governance Validator, the Generation Engine,
 * and the Intake Engine. Single source of truth for the enterprise policy query.
 *
 * Query semantics: global policies (enterprise_id IS NULL) are always included.
 * When an enterprise_id is provided, enterprise-specific policies are also included.
 *
 * W3-03 scope semantics: a policy with scoped_agent_ids IS NULL applies to all agents.
 * A policy with a non-null array only applies to those specific logical agentIds.
 * When an agentId is provided here, scoped-out policies are excluded from the result set.
 */

import { db } from "@/lib/db";
import { governancePolicies } from "@/lib/db/schema";
import { or, isNull, eq, and, sql } from "drizzle-orm";
import { GovernancePolicy, PolicyRule } from "./types";

export async function loadPolicies(
  enterpriseId: string | null,
  agentId?: string | null
): Promise<GovernancePolicy[]> {
  // Attempt to load with all columns including scoped_agent_ids (migration 0035).
  // Falls back to core columns if newer columns haven't been migrated yet.
  let rows: Array<{
    id: string;
    enterpriseId: string | null;
    name: string;
    type: string;
    description: string | null;
    rules: unknown;
    scopedAgentIds?: unknown;
  }>;

  try {
    rows = await db
      .select({
        id: governancePolicies.id,
        enterpriseId: governancePolicies.enterpriseId,
        name: governancePolicies.name,
        type: governancePolicies.type,
        description: governancePolicies.description,
        rules: governancePolicies.rules,
        scopedAgentIds: governancePolicies.scopedAgentIds,
      })
      .from(governancePolicies)
      .where(
        enterpriseId
          ? or(isNull(governancePolicies.enterpriseId), eq(governancePolicies.enterpriseId, enterpriseId))
          : isNull(governancePolicies.enterpriseId)
      );
  } catch {
    // Fallback: core columns only (migration 0000). Handles case where
    // scoped_agent_ids (migration 0035) hasn't been applied to the database yet.
    rows = await db
      .select({
        id: governancePolicies.id,
        enterpriseId: governancePolicies.enterpriseId,
        name: governancePolicies.name,
        type: governancePolicies.type,
        description: governancePolicies.description,
        rules: governancePolicies.rules,
      })
      .from(governancePolicies)
      .where(
        enterpriseId
          ? or(isNull(governancePolicies.enterpriseId), eq(governancePolicies.enterpriseId, enterpriseId))
          : isNull(governancePolicies.enterpriseId)
      );
  }

  return rows
    .filter((row) => {
      // W3-03: filter by agent scope if an agentId is provided
      if (!agentId) return true;
      const scoped = (row.scopedAgentIds ?? null) as string[] | null;
      // null = global scope (applies to all agents)
      if (scoped === null || !Array.isArray(scoped) || scoped.length === 0) return true;
      return scoped.includes(agentId);
    })
    .map((row) => ({
      id: row.id,
      enterpriseId: row.enterpriseId,
      name: row.name,
      type: row.type,
      description: row.description,
      rules: (row.rules ?? []) as PolicyRule[],
      scopedAgentIds: ((row.scopedAgentIds ?? null) as string[] | null) ?? null,
    }));
}
