/**
 * Adversarial Red-Team endpoint — Phase 41.
 * POST /api/blueprints/[id]/simulate/red-team
 *
 * Runs a full two-phase red-team evaluation against a blueprint:
 *   Phase A: Sonnet generates 10 adversarial prompts (2 per category)
 *   Phase B: Haiku evaluates all 10 in parallel against the simulation system prompt
 *
 * Results are stateless — returned in the response, not persisted.
 * One audit entry is written per run.
 */

import { NextRequest, NextResponse } from "next/server";
import { apiError, aiError, ErrorCode } from "@/lib/errors";
import { db } from "@/lib/db";
import { agentBlueprints, auditLog } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { runRedTeam } from "@/lib/testing/red-team";
import { requireAuth } from "@/lib/auth/require";
import { assertEnterpriseAccess } from "@/lib/auth/enterprise";
import { publishEvent } from "@/lib/events/publish";
import { getRequestId } from "@/lib/request-id";
import { rateLimit } from "@/lib/rate-limit";
import type { ABP } from "@/lib/types/abp";
import { readABP } from "@/lib/abp/read";

// Red-team runs are expensive — limit to 5 per minute per user
const MAX_PER_MINUTE = 5;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session: authSession, error } = await requireAuth([
    "architect",
    "reviewer",
    "compliance_officer",
    "admin",
  ]);
  if (error) return error;

  const requestId = getRequestId(request);

  const rateLimitResponse = await rateLimit(authSession.user.email!, {
    endpoint: "red-team",
    max: MAX_PER_MINUTE,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { id: blueprintId } = await params;

    const blueprint = await db.query.agentBlueprints.findFirst({
      where: eq(agentBlueprints.id, blueprintId),
    });
    if (!blueprint) {
      return apiError(ErrorCode.NOT_FOUND, "Blueprint not found");
    }

    const enterpriseError = assertEnterpriseAccess(blueprint.enterpriseId, authSession.user);
    if (enterpriseError) return enterpriseError;

    const abp = readABP(blueprint.abp);

    // Run evaluation (may take 15–30s)
    const report = await runRedTeam(
      abp,
      blueprintId,
      blueprint.name ?? `Agent ${blueprintId.slice(0, 8)}`,
      blueprint.version
    );

    // Audit log
    try {
      await db.insert(auditLog).values({
        actorEmail: authSession.user.email!,
        actorRole: authSession.user.role!,
        action: "blueprint.red_team_simulated",
        entityType: "blueprint",
        entityId: blueprintId,
        enterpriseId: blueprint.enterpriseId ?? null,
        metadata: {
          agentId: blueprint.agentId,
          agentName: blueprint.name ?? `Agent ${blueprintId.slice(0, 8)}`,
          failuresFound: report.attacks.filter(a => a.verdict === "FAIL").length,
          passCount: report.score,
        },
      });
    } catch (auditErr) {
      console.error(`[${requestId}] Failed to write audit log:`, auditErr);
    }

    // Audit trail
    void publishEvent({
      event: {
        type: "blueprint.red_team_run",
        payload: {
          blueprintId,
          agentId: blueprint.agentId,
          agentName: blueprint.name ?? `Agent ${blueprintId.slice(0, 8)}`,
        },
      },
      actor: { email: authSession.user.email!, role: authSession.user.role },
      entity: { type: "blueprint", id: blueprintId },
      enterpriseId: blueprint.enterpriseId ?? null,
    });

    return NextResponse.json(report);
  } catch (err) {
    console.error(`[${requestId}] Red-team error:`, err);
    return aiError(err, requestId);
  }
}