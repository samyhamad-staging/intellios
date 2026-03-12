import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { governancePolicies } from "@/lib/db/schema";
import { isNull } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";

/**
 * GET /api/governance/policies
 * Returns all global governance policies (enterprise_id IS NULL).
 */
export async function GET() {
  try {
    const policies = await db
      .select()
      .from(governancePolicies)
      .where(isNull(governancePolicies.enterpriseId));

    return NextResponse.json({ policies });
  } catch (error) {
    console.error("Failed to list policies:", error);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to list policies");
  }
}

/**
 * POST /api/governance/policies
 * Creates a new governance policy.
 * Body: { name, type, description?, rules, enterprise_id? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      name: string;
      type: string;
      description?: string;
      rules: unknown[];
      enterpriseId?: string;
    };

    if (!body.name || !body.type || !Array.isArray(body.rules)) {
      return apiError(ErrorCode.BAD_REQUEST, "name, type, and rules are required");
    }

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
    console.error("Failed to create policy:", error);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to create policy");
  }
}
