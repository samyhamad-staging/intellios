import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { blueprintTestCases, agentBlueprints } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { assertEnterpriseAccess } from "@/lib/auth/enterprise";
import { parseBody } from "@/lib/parse-body";
import { getRequestId } from "@/lib/request-id";

const UpdateTestCaseSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(500).nullable().optional(),
  inputPrompt: z.string().min(1).max(2000).optional(),
  expectedBehavior: z.string().min(1).max(1000).optional(),
  severity: z.enum(["required", "informational"]).optional(),
});

type RouteParams = { params: Promise<{ agentId: string; caseId: string }> };

/**
 * PATCH /api/registry/[agentId]/test-cases/[caseId]
 * Update a test case. designer | admin only.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { session: authSession, error } = await requireAuth(["architect", "admin"]);
  if (error) return error;
  const requestId = getRequestId(request);

  const { data: body, error: bodyError } = await parseBody(request, UpdateTestCaseSchema);
  if (bodyError) return bodyError;

  try {
    const { agentId, caseId } = await params;

    // Verify test case exists and belongs to this agent
    const testCase = await db.query.blueprintTestCases.findFirst({
      where: and(
        eq(blueprintTestCases.id, caseId),
        eq(blueprintTestCases.agentId, agentId)
      ),
    });
    if (!testCase) {
      return apiError(ErrorCode.NOT_FOUND, "Test case not found");
    }

    // Enterprise access check via agent's latest blueprint
    const latest = await db.query.agentBlueprints.findFirst({
      where: eq(agentBlueprints.agentId, agentId),
      orderBy: [desc(agentBlueprints.createdAt)],
    });
    if (!latest) {
      return apiError(ErrorCode.NOT_FOUND, "Agent not found");
    }
    const enterpriseError = assertEnterpriseAccess(latest.enterpriseId, authSession.user);
    if (enterpriseError) return enterpriseError;

    const updates: Partial<typeof testCase> = { updatedAt: new Date() };
    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.inputPrompt !== undefined) updates.inputPrompt = body.inputPrompt;
    if (body.expectedBehavior !== undefined) updates.expectedBehavior = body.expectedBehavior;
    if (body.severity !== undefined) updates.severity = body.severity;

    const [updated] = await db
      .update(blueprintTestCases)
      .set(updates)
      .where(eq(blueprintTestCases.id, caseId))
      .returning();

    return NextResponse.json({ testCase: updated });
  } catch (err) {
    console.error(`[${requestId}] Failed to update test case:`, err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to update test case", undefined, requestId);
  }
}

/**
 * DELETE /api/registry/[agentId]/test-cases/[caseId]
 * Delete a test case. designer | admin only.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { session: authSession, error } = await requireAuth(["architect", "admin"]);
  if (error) return error;
  const requestId = getRequestId(request);

  try {
    const { agentId, caseId } = await params;

    // Verify test case exists and belongs to this agent
    const testCase = await db.query.blueprintTestCases.findFirst({
      where: and(
        eq(blueprintTestCases.id, caseId),
        eq(blueprintTestCases.agentId, agentId)
      ),
    });
    if (!testCase) {
      return apiError(ErrorCode.NOT_FOUND, "Test case not found");
    }

    // Enterprise access check
    const latest = await db.query.agentBlueprints.findFirst({
      where: eq(agentBlueprints.agentId, agentId),
      orderBy: [desc(agentBlueprints.createdAt)],
    });
    if (!latest) {
      return apiError(ErrorCode.NOT_FOUND, "Agent not found");
    }
    const enterpriseError = assertEnterpriseAccess(latest.enterpriseId, authSession.user);
    if (enterpriseError) return enterpriseError;

    await db.delete(blueprintTestCases).where(eq(blueprintTestCases.id, caseId));

    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error(`[${requestId}] Failed to delete test case:`, err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to delete test case", undefined, requestId);
  }
}
