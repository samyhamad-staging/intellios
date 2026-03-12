import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { governancePolicies } from "@/lib/db/schema";
import { isNull } from "drizzle-orm";
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
  enterpriseId: z.string().max(200).optional(),
});

/**
 * GET /api/governance/policies
 * Returns all global governance policies (enterprise_id IS NULL).
 */
export async function GET(request: NextRequest) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;
  const requestId = getRequestId(request);

  try {
    const policies = await db
      .select()
      .from(governancePolicies)
      .where(isNull(governancePolicies.enterpriseId));

    return NextResponse.json({ policies });
  } catch (error) {
    console.error(`[${requestId}] Failed to list policies:`, error);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to list policies", undefined, requestId);
  }
}

/**
 * POST /api/governance/policies
 * Creates a new governance policy.
 * Body: { name, type, description?, rules, enterprise_id? }
 */
export async function POST(request: NextRequest) {
  const { error: authError } = await requireAuth(["admin"]);
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
        enterpriseId: body.enterpriseId ?? null,
      })
      .returning();

    return NextResponse.json({ policy }, { status: 201 });
  } catch (error) {
    console.error(`[${requestId}] Failed to create policy:`, error);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to create policy", undefined, requestId);
  }
}
