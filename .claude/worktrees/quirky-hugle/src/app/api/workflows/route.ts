import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { workflows, agentBlueprints } from "@/lib/db/schema";
import { and, desc, eq, inArray, isNull, ilike, or } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { assertEnterpriseAccess } from "@/lib/auth/enterprise";
import { getRequestId } from "@/lib/request-id";
import { parseBody } from "@/lib/parse-body";
import { z } from "zod";
import { WorkflowSchema, WORKFLOW_STATUSES } from "@/lib/types/workflow";

// ─── Validation ───────────────────────────────────────────────────────────────

const CreateWorkflowBody = z.object({
  name:        z.string().min(1).max(200),
  description: z.string().max(2000).optional().default(""),
  definition:  WorkflowSchema,
  status:      z.enum(WORKFLOW_STATUSES).optional().default("draft"),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Validate that every agentId in the workflow definition references a known
 * blueprint in the registry (any version, any status).
 * Returns a 422 response if any agentId is not found; returns null if all OK.
 */
async function validateAgentRefs(
  agentIds: string[],
  enterpriseId: string | null | undefined
): Promise<NextResponse | null> {
  if (agentIds.length === 0) return null;

  const unique = [...new Set(agentIds)];

  const enterpriseFilter =
    enterpriseId
      ? or(isNull(agentBlueprints.enterpriseId), eq(agentBlueprints.enterpriseId, enterpriseId))
      : isNull(agentBlueprints.enterpriseId);

  const found = await db
    .selectDistinctOn([agentBlueprints.agentId], { agentId: agentBlueprints.agentId })
    .from(agentBlueprints)
    .where(and(inArray(agentBlueprints.agentId, unique), enterpriseFilter));

  const foundIds = new Set(found.map((r) => r.agentId));
  const missing = unique.filter((id) => !foundIds.has(id));

  if (missing.length > 0) {
    return apiError(
      ErrorCode.VALIDATION_ERROR,
      `Unknown agent reference(s): ${missing.join(", ")}`,
      { missing }
    );
  }
  return null;
}

// ─── GET /api/workflows ───────────────────────────────────────────────────────

/**
 * GET /api/workflows
 * List workflows scoped to the caller's enterprise.
 * Query params: q (name search), status, limit (default 50), offset (default 0)
 */
export async function GET(request: NextRequest) {
  const { session: authSession, error } = await requireAuth();
  if (error) return error;
  const requestId = getRequestId(request);

  try {
    const { searchParams } = new URL(request.url);
    const q      = searchParams.get("q") ?? "";
    const status = searchParams.get("status") ?? "";
    const limit  = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 100);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    const enterpriseFilter =
      authSession.user.role === "admin"
        ? undefined
        : authSession.user.enterpriseId
        ? eq(workflows.enterpriseId, authSession.user.enterpriseId)
        : isNull(workflows.enterpriseId);

    const statusFilter  = status ? eq(workflows.status, status) : undefined;
    const nameFilter    = q      ? ilike(workflows.name, `%${q}%`) : undefined;

    const filters = [enterpriseFilter, statusFilter, nameFilter].filter(Boolean);
    const where   = filters.length > 1 ? and(...(filters as Parameters<typeof and>)) : filters[0];

    const rows = await db
      .select()
      .from(workflows)
      .where(where)
      .orderBy(desc(workflows.updatedAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({ workflows: rows, total: rows.length });
  } catch (err) {
    console.error(`[${requestId}] Failed to list workflows:`, err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to list workflows", undefined, requestId);
  }
}

// ─── POST /api/workflows ──────────────────────────────────────────────────────

/**
 * POST /api/workflows
 * Create a new workflow. Validates all referenced agentIds exist in the registry.
 * Requires designer or admin role.
 */
export async function POST(request: NextRequest) {
  const { session: authSession, error } = await requireAuth(["architect", "admin"]);
  if (error) return error;

  const { data: body, error: bodyError } = await parseBody(request, CreateWorkflowBody);
  if (bodyError) return bodyError;

  const requestId = getRequestId(request);

  try {
    // Validate all agent references
    const agentIds = body.definition.agents.map((a) => a.agentId);
    const refError = await validateAgentRefs(agentIds, authSession.user.enterpriseId);
    if (refError) return refError;

    const [workflow] = await db
      .insert(workflows)
      .values({
        name:         body.name,
        description:  body.description,
        definition:   body.definition,
        status:       body.status,
        enterpriseId: authSession.user.enterpriseId ?? null,
        createdBy:    authSession.user.email!,
      })
      .returning();

    return NextResponse.json({ workflow }, { status: 201 });
  } catch (err) {
    console.error(`[${requestId}] Failed to create workflow:`, err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to create workflow", undefined, requestId);
  }
}
