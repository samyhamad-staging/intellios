import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { governancePolicies } from "@/lib/db/schema";
import { isNull } from "drizzle-orm";

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
    return NextResponse.json(
      { error: "Failed to list policies" },
      { status: 500 }
    );
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
      return NextResponse.json(
        { error: "name, type, and rules are required" },
        { status: 400 }
      );
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
    return NextResponse.json(
      { error: "Failed to create policy" },
      { status: 500 }
    );
  }
}
