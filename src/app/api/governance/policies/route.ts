import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { governancePolicies } from "@/lib/db/schema";
import { or, isNull, eq } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { getRequestId } from "@/lib/request-id";
import { parseBody } from "@/lib/parse-body";
import { z } from "zod";

const POLICY_TYPES = ["safety", "compliance", "data_handling", "access_control", "audit"] as const;

const CreatePolicyBody = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(POLICY_TYPES),
  description: z.string().max(1000).optional(),
  rules: z.array(z.unknown()).default([]),
});

/**
 * GET /api/governance/policies
 * Returns global policies (enterprise_id IS NULL) plus the caller's enterprise-specific
 * policies. Admins see all policies across enterprises.
 */
export async function GET(request: NextRequest) {
  const { session: authSession, error: authError } = await requireAuth();
  if (authError) return authError;
  const requestId = getRequestId(request);

  try {
    const filter =
      authSession.user.role === "admin"
        ? undefined
        : authSession.user.enterpriseId
        ? or(isNull(governancePolicies.enterpriseId), eq(governancePolicies.enterpriseId, authSession.user.enterpriseId))
        : isNull(governancePolicies.enterpriseId);

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
  const { session: authSession, error: authError } = await requireAuth(["admin"]);
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
      })
      .returning();

    return NextResponse.json({ policy }, { status: 201 });
  } catch (error) {
    console.error(`[${requestId}] Failed to create policy:`, error);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to create policy", undefined, requestId);
  }
}
