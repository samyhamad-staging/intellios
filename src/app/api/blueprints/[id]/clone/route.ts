import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentBlueprints, auditLog } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { randomUUID } from "crypto";
import { parseBody } from "@/lib/parse-body";
import type { ABP } from "@/lib/types/abp";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { assertEnterpriseAccess } from "@/lib/auth/enterprise";
import { getRequestId } from "@/lib/request-id";
import { publishEvent } from "@/lib/events/publish";

/**
 * POST /api/blueprints/[id]/clone
 *
 * Forks an existing blueprint into a new draft agent.
 * Creates a new logical agent (new agentId) — not a new version of the source.
 * Preserves ABP content; resets lifecycle state (status=draft, no review data).
 *
 * Access: architect and admin only.
 */

const CloneBody = z.object({
  name: z.string().min(1).max(200).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session: authSession, error } = await requireAuth(["architect", "admin"]);
  if (error) return error;
  const requestId = getRequestId(request);

  try {
    const { id } = await params;

    // Parse optional body (empty body is fine)
    const { data: body, error: bodyError } = await parseBody(request, CloneBody);
    const parsedBody = bodyError ? {} : (body ?? {});

    // Fetch source blueprint
    const source = await db.query.agentBlueprints.findFirst({
      where: eq(agentBlueprints.id, id),
    });
    if (!source) return apiError(ErrorCode.NOT_FOUND, "Blueprint not found");

    // Enterprise access check
    const enterpriseError = assertEnterpriseAccess(source.enterpriseId, authSession.user);
    if (enterpriseError) return enterpriseError;

    // New IDs for the cloned agent
    const newBlueprintId = randomUUID();
    const newAgentId = randomUUID();
    const cloneName = parsedBody.name ?? `${source.name ?? "Unnamed Agent"} (Clone)`;

    // Insert the cloned blueprint — new logical agent, fresh lifecycle state
    const [cloned] = await db
      .insert(agentBlueprints)
      .values({
        id: newBlueprintId,
        agentId: newAgentId,
        version: "1.0.0",
        name: cloneName,
        tags: source.tags ?? [],
        enterpriseId: source.enterpriseId,
        sessionId: source.sessionId,            // traceability: points to originating intake session
        abp: {
          ...(source.abp as ABP),
          identity: {
            ...(source.abp as ABP).identity,
            name: cloneName,                     // update identity name to match clone name
          },
        } as ABP,
        status: "draft",
        refinementCount: "0",
        validationReport: null,
        reviewComment: null,
        reviewedAt: null,
        reviewedBy: null,
        createdBy: authSession.user.email!,
      })
      .returning();

    try {
      await db.insert(auditLog).values({
        actorEmail: authSession.user.email!,
        actorRole: authSession.user.role!,
        action: "blueprint.cloned",
        entityType: "blueprint",
        entityId: newBlueprintId,
        enterpriseId: source.enterpriseId ?? null,
        metadata: { sourceId: id, newId: newBlueprintId },
      });
    } catch (auditErr) {
      console.error(`[${requestId}] Failed to write audit log:`, auditErr);
    }

    // Audit — links clone to source for full traceability
    await publishEvent({
      event: {
        type: "blueprint.cloned",
        payload: {
          originalBlueprintId: id,
          newBlueprintId,
          agentId: newAgentId,
          agentName: cloneName,
        },
      },
      actor: { email: authSession.user.email!, role: authSession.user.role },
      entity: { type: "blueprint", id: newBlueprintId },
      enterpriseId: source.enterpriseId ?? null,
    });

    return NextResponse.json(cloned, { status: 201 });
  } catch (err) {
    console.error(`[${requestId}] Failed to clone blueprint:`, err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to clone blueprint", undefined, requestId);
  }
}
