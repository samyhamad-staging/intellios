/**
 * Alert Threshold CRUD — H1-1.5.
 *
 * GET  /api/registry/[agentId]/alerts  — list thresholds for an agent
 * POST /api/registry/[agentId]/alerts  — create a new threshold rule
 *
 * Auth: GET is open to all authenticated roles; POST requires architect | admin.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { alertThresholds, agentBlueprints, auditLog } from "@/lib/db/schema";
import { SAFE_BLUEPRINT_COLUMNS } from "@/lib/db/safe-columns";
import { eq, desc } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { assertEnterpriseAccess } from "@/lib/auth/enterprise";
import { parseBody } from "@/lib/parse-body";
import { getRequestId } from "@/lib/request-id";

const CreateAlertSchema = z.object({
  metric: z.enum(["error_rate", "latency_p99", "zero_invocations", "policy_violations"]),
  operator: z.enum(["gt", "lt", "eq"]),
  value: z.number(),
  windowMinutes: z.number().int().min(1).max(10080).default(60),
  enabled: z.boolean().optional().default(true),
});

async function resolveAgent(agentId: string) {
  const [result] = await db
    .select(SAFE_BLUEPRINT_COLUMNS)
    .from(agentBlueprints)
    .where(eq(agentBlueprints.agentId, agentId))
    .orderBy(desc(agentBlueprints.createdAt))
    .limit(1);
  return result;
}

/**
 * GET /api/registry/[agentId]/alerts
 * List all threshold rules for the agent.
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

    const latest = await resolveAgent(agentId);
    if (!latest) return apiError(ErrorCode.NOT_FOUND, "Agent not found");

    const enterpriseError = assertEnterpriseAccess(latest.enterpriseId, authSession.user);
    if (enterpriseError) return enterpriseError;

    const thresholds = await db
      .select()
      .from(alertThresholds)
      .where(eq(alertThresholds.agentId, agentId))
      .orderBy(desc(alertThresholds.createdAt));

    return NextResponse.json({ thresholds });
  } catch (err) {
    console.error(`[${requestId}] Failed to list alert thresholds:`, err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to list alert thresholds", undefined, requestId);
  }
}

/**
 * POST /api/registry/[agentId]/alerts
 * Create a new threshold rule. architect | admin only.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { session: authSession, error } = await requireAuth(["architect", "designer", "admin"]);
  if (error) return error;
  const requestId = getRequestId(request);

  const { data: body, error: bodyError } = await parseBody(request, CreateAlertSchema);
  if (bodyError) return bodyError;

  try {
    const { agentId } = await params;

    const latest = await resolveAgent(agentId);
    if (!latest) return apiError(ErrorCode.NOT_FOUND, "Agent not found");

    const enterpriseError = assertEnterpriseAccess(latest.enterpriseId, authSession.user);
    if (enterpriseError) return enterpriseError;

    const [created] = await db
      .insert(alertThresholds)
      .values({
        agentId,
        enterpriseId: latest.enterpriseId,
        metric:        body.metric,
        operator:      body.operator,
        value:         body.value,
        windowMinutes: body.windowMinutes,
        enabled:       body.enabled,
        createdBy:     authSession.user.email!,
      })
      .returning();

    // Audit log
    try {
      await db.insert(auditLog).values({
        actorEmail: authSession.user.email!,
        actorRole: authSession.user.role!,
        action: "alert.created",
        entityType: "alert",
        entityId: created.id,
        enterpriseId: latest.enterpriseId ?? null,
        metadata: {
          agentId,
          metric: created.metric,
          operator: created.operator,
          value: created.value,
          windowMinutes: created.windowMinutes,
        },
      });
    } catch (auditErr) {
      console.error(`[${requestId}] Failed to write audit log:`, auditErr);
    }

    return NextResponse.json({ threshold: created }, { status: 201 });
  } catch (err) {
    console.error(`[${requestId}] Failed to create alert threshold:`, err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to create alert threshold", undefined, requestId);
  }
}
