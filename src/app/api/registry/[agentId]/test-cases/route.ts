import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { blueprintTestCases, agentBlueprints } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { assertEnterpriseAccess } from "@/lib/auth/enterprise";
import { parseBody } from "@/lib/parse-body";
import { getRequestId } from "@/lib/request-id";

const CreateTestCaseSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional().nullable(),
  inputPrompt: z.string().min(1).max(2000),
  expectedBehavior: z.string().min(1).max(1000),
  severity: z.enum(["required", "informational"]).optional().default("required"),
});

/**
 * GET /api/registry/[agentId]/test-cases
 * List all test cases defined for a logical agent. All authenticated roles.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { session: authSession, error } = await requireAuth();
  if (error) return error;
  const requestId = getRequestId(request);

  try {
    const { agentId } = await params;

    // Resolve enterpriseId from the agent's latest blueprint for access check
    const latest = await db.query.agentBlueprints.findFirst({
      where: eq(agentBlueprints.agentId, agentId),
      orderBy: [desc(agentBlueprints.createdAt)],
    });
    if (!latest) {
      return apiError(ErrorCode.NOT_FOUND, "Agent not found");
    }
    const enterpriseError = assertEnterpriseAccess(latest.enterpriseId, authSession.user);
    if (enterpriseError) return enterpriseError;

    const testCases = await db
      .select()
      .from(blueprintTestCases)
      .where(eq(blueprintTestCases.agentId, agentId))
      .orderBy(desc(blueprintTestCases.createdAt));

    return NextResponse.json({ testCases });
  } catch (err) {
    console.error(`[${requestId}] Failed to list test cases:`, err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to list test cases", undefined, requestId);
  }
}

/**
 * POST /api/registry/[agentId]/test-cases
 * Create a new test case for a logical agent. designer | admin only.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { session: authSession, error } = await requireAuth(["architect", "designer", "admin"]);
  if (error) return error;
  const requestId = getRequestId(request);

  const { data: body, error: bodyError } = await parseBody(request, CreateTestCaseSchema);
  if (bodyError) return bodyError;

  try {
    const { agentId } = await params;

    // Resolve enterpriseId from the agent's latest blueprint
    const latest = await db.query.agentBlueprints.findFirst({
      where: eq(agentBlueprints.agentId, agentId),
      orderBy: [desc(agentBlueprints.createdAt)],
    });
    if (!latest) {
      return apiError(ErrorCode.NOT_FOUND, "Agent not found");
    }
    const enterpriseError = assertEnterpriseAccess(latest.enterpriseId, authSession.user);
    if (enterpriseError) return enterpriseError;

    const [created] = await db
      .insert(blueprintTestCases)
      .values({
        agentId,
        enterpriseId: latest.enterpriseId,
        name: body.name,
        description: body.description ?? null,
        inputPrompt: body.inputPrompt,
        expectedBehavior: body.expectedBehavior,
        severity: body.severity,
        createdBy: authSession.user.email!,
      })
      .returning();

    return NextResponse.json({ testCase: created }, { status: 201 });
  } catch (err) {
    console.error(`[${requestId}] Failed to create test case:`, err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to create test case", undefined, requestId);
  }
}
