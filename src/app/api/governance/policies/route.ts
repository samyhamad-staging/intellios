import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { governancePolicies } from "@/lib/db/schema";
import { or, isNull, eq, and } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { getRequestId } from "@/lib/request-id";
import { getEnterpriseId, enterpriseScope } from "@/lib/auth/enterprise-scope";
import { parseBody } from "@/lib/parse-body";
import { z } from "zod";
import { publishEvent } from "@/lib/events/publish";

const DESIGN_TIME_POLICY_TYPES = ["safety", "compliance", "data_handling", "access_control", "audit"] as const;
const RUNTIME_POLICY_TYPE = "runtime" as const;
const ALL_POLICY_TYPES = [...DESIGN_TIME_POLICY_TYPES, RUNTIME_POLICY_TYPE] as const;

const RuntimeRuleSchema = z.object({
  id:       z.string(),
  operator: z.enum(["token_budget_daily", "token_budget_per_interaction", "pii_action", "scope_constraint", "circuit_breaker_error_rate"]),
  value:    z.unknown(),
  severity: z.enum(["error", "warning"]),
  message:  z.string().min(1),
});

const DesignTimeRuleSchema = z.object({
  id:       z.string(),
  field:    z.string(),
  operator: z.string(),
  value:    z.unknown().optional(),
  severity: z.enum(["error", "warning"]),
  message:  z.string().min(1),
});

// W3-03: scopedAgentIds — null = all agents, string[] = specific logical agentIds
const ScopedAgentIdsSchema = z.array(z.string().uuid()).nullable().optional();

const CreatePolicyBody = z.discriminatedUnion("type", [
  z.object({
    name:           z.string().min(1).max(200),
    type:           z.literal(RUNTIME_POLICY_TYPE),
    description:    z.string().max(1000).optional(),
    rules:          z.array(RuntimeRuleSchema).default([]),
    scopedAgentIds: ScopedAgentIdsSchema,
  }),
  z.object({
    name:           z.string().min(1).max(200),
    type:           z.enum(DESIGN_TIME_POLICY_TYPES),
    description:    z.string().max(1000).optional(),
    rules:          z.array(DesignTimeRuleSchema).default([]),
    scopedAgentIds: ScopedAgentIdsSchema,
  }),
]);

/**
 * GET /api/governance/policies
 * Returns global policies (enterprise_id IS NULL) plus the caller's enterprise-specific
 * policies. Admins see all policies across enterprises.
 */
export async function GET(request: NextRequest) {
  const { session: authSession, error: authError } = await requireAuth();
  if (authError) return authError;
  const requestId = getRequestId(request);
  const ctx = getEnterpriseId(request);

  try {
    // Phase 22: only return active (non-superseded) policy versions
    const activeOnly = isNull(governancePolicies.supersededAt);

    // Policies are special: non-admins see global policies (null enterprise) + their own.
    // enterpriseScope returns the caller's filter; combine with global inclusion.
    const scope = enterpriseScope(governancePolicies.enterpriseId, ctx);
    const enterpriseFilter = scope && ctx.enterpriseId
      ? or(isNull(governancePolicies.enterpriseId), scope)
      : scope;

    const filter = enterpriseFilter ? and(activeOnly, enterpriseFilter) : activeOnly;

    const policies = await db
      .select()
      .from(governancePolicies)
      .where(filter);

    return NextResponse.json({ policies });
  } catch (error) {
    console.error(`[${requestId}] Failed to list policies:`, error);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to list policies", undefined, requestId);
  }
}

/**
 * POST /api/governance/policies
 * Creates a new governance policy, scoped to the admin's enterprise.
 * Admins with no enterpriseId create global (platform-level) policies.
 * Body: { name, type, description?, rules }
 */
export async function POST(request: NextRequest) {
  const { session: authSession, error: authError } = await requireAuth(["compliance_officer", "admin"]);
  if (authError) return authError;

  const { data: body, error: bodyError } = await parseBody(request, CreatePolicyBody);
  if (bodyError) return bodyError;

  const requestId = getRequestId(request);
  try {
    const [policy] = await db
      .insert(governancePolicies)
      .values({
        name: body.name,
        type: body.type,
        description: body.description ?? null,
        rules: body.rules,
        enterpriseId: authSession.user.enterpriseId ?? null,
        // W3-03: store null for global scope, or an array of agentId UUIDs
        scopedAgentIds: body.scopedAgentIds ?? null,
      })
      .returning();

    void publishEvent({
      event: {
        type: "policy.created",
        payload: {
          policyId: policy.id,
          name: policy.name,
          type: policy.type,
        },
      },
      actor: { email: authSession.user.email!, role: authSession.user.role! },
      entity: { type: "policy", id: policy.id },
      enterpriseId: policy.enterpriseId ?? null,
    });

    return NextResponse.json({ policy }, { status: 201 });
  } catch (error) {
    console.error(`[${requestId}] Failed to create policy:`, error);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to create policy", undefined, requestId);
  }
}
