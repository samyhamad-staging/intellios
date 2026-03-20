import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentBlueprints, blueprintTestCases, blueprintTestRuns } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { assertEnterpriseAccess } from "@/lib/auth/enterprise";
import { publishEvent } from "@/lib/events/publish";
import { getRequestId } from "@/lib/request-id";
import { runTestSuite } from "@/lib/testing/executor";
import type { TestCase } from "@/lib/testing/types";
import type { ABP } from "@/lib/types/abp";

/**
 * GET /api/blueprints/[id]/test-runs
 * List all test runs for a specific blueprint version, newest first.
 * All authenticated roles.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session: authSession, error } = await requireAuth();
  if (error) return error;
  const requestId = getRequestId(request);

  try {
    const { id } = await params;

    // Verify blueprint exists and resolve enterprise access
    const blueprint = await db.query.agentBlueprints.findFirst({
      where: eq(agentBlueprints.id, id),
    });
    if (!blueprint) {
      return apiError(ErrorCode.NOT_FOUND, "Blueprint not found");
    }
    const enterpriseError = assertEnterpriseAccess(blueprint.enterpriseId, authSession.user);
    if (enterpriseError) return enterpriseError;

    const runs = await db
      .select()
      .from(blueprintTestRuns)
      .where(eq(blueprintTestRuns.blueprintId, id))
      .orderBy(desc(blueprintTestRuns.startedAt));

    return NextResponse.json({ testRuns: runs });
  } catch (err) {
    console.error(`[${requestId}] Failed to list test runs:`, err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to list test runs", undefined, requestId);
  }
}

/**
 * POST /api/blueprints/[id]/test-runs
 * Execute the test suite for this blueprint version.
 * Roles: designer | reviewer | admin
 *
 * Flow:
 *   1. Load blueprint + assert enterprise access
 *   2. Load test cases for blueprint.agentId
 *   3. Insert a "running" run record
 *   4. Execute runTestSuite (2 Haiku calls per test case)
 *   5. Update run record with results
 *   6. Write blueprint.test_run_completed audit entry
 *   7. Return full TestRun
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session: authSession, error } = await requireAuth(["architect", "reviewer", "admin"]);
  if (error) return error;
  const requestId = getRequestId(request);

  try {
    const { id } = await params;

    // ── 1. Load blueprint ─────────────────────────────────────────────────────
    const blueprint = await db.query.agentBlueprints.findFirst({
      where: eq(agentBlueprints.id, id),
    });
    if (!blueprint) {
      return apiError(ErrorCode.NOT_FOUND, "Blueprint not found");
    }
    const enterpriseError = assertEnterpriseAccess(blueprint.enterpriseId, authSession.user);
    if (enterpriseError) return enterpriseError;

    // ── 2. Load test cases ────────────────────────────────────────────────────
    const testCaseRows = await db
      .select()
      .from(blueprintTestCases)
      .where(eq(blueprintTestCases.agentId, blueprint.agentId))
      .orderBy(desc(blueprintTestCases.createdAt));

    if (testCaseRows.length === 0) {
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        "No test cases defined for this agent. Add at least one test case before running."
      );
    }

    const testCases: TestCase[] = testCaseRows.map((tc) => ({
      id: tc.id,
      agentId: tc.agentId,
      enterpriseId: tc.enterpriseId,
      name: tc.name,
      description: tc.description,
      inputPrompt: tc.inputPrompt,
      expectedBehavior: tc.expectedBehavior,
      severity: tc.severity as "required" | "informational",
      createdBy: tc.createdBy,
      createdAt: tc.createdAt.toISOString(),
      updatedAt: tc.updatedAt.toISOString(),
    }));

    // ── 3. Insert "running" run record ────────────────────────────────────────
    const [runRow] = await db
      .insert(blueprintTestRuns)
      .values({
        blueprintId: id,
        agentId: blueprint.agentId,
        enterpriseId: blueprint.enterpriseId,
        status: "running",
        testResults: [],
        totalCases: testCases.length,
        passedCases: 0,
        failedCases: 0,
        runBy: authSession.user.email!,
      })
      .returning();

    // ── 4. Execute test suite ─────────────────────────────────────────────────
    const abp = blueprint.abp as ABP;
    const { results, passedCases, failedCases, status } = await runTestSuite(abp, testCases);

    // ── 5. Update run record with results ─────────────────────────────────────
    const completedAt = new Date();
    const [updatedRun] = await db
      .update(blueprintTestRuns)
      .set({
        status,
        testResults: results,
        passedCases,
        failedCases,
        completedAt,
      })
      .where(eq(blueprintTestRuns.id, runRow.id))
      .returning();

    // ── 6. Write audit entry ──────────────────────────────────────────────────
    await publishEvent({
      event: {
        type: "blueprint.test_run_completed",
        payload: {
          blueprintId: id,
          agentId: blueprint.agentId,
          testCaseId: crypto.randomUUID(),
          passed: passedCases === testCases.length,
        },
      },
      actor: { email: authSession.user.email!, role: authSession.user.role as string },
      entity: { type: "blueprint", id },
      enterpriseId: blueprint.enterpriseId ?? null,
    });

    // ── 7. Return completed run ───────────────────────────────────────────────
    return NextResponse.json(
      {
        testRun: {
          ...updatedRun,
          startedAt: updatedRun.startedAt.toISOString(),
          completedAt: updatedRun.completedAt?.toISOString() ?? null,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error(`[${requestId}] Failed to execute test run:`, err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to execute test run", undefined, requestId);
  }
}
