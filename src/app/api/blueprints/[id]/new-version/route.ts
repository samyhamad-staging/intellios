import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentBlueprints } from "@/lib/db/schema";
import { and, eq, ne } from "drizzle-orm";
import { randomUUID } from "crypto";
import type { ABP } from "@/lib/types/abp";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { assertEnterpriseAccess } from "@/lib/auth/enterprise";
import { getRequestId } from "@/lib/request-id";
import { publishEvent } from "@/lib/events/publish";
import { diffABP } from "@/lib/diff/abp-diff";

/**
 * POST /api/blueprints/[id]/new-version
 *
 * Creates a new draft version of an existing logical agent.
 * Requires the source blueprint to be approved or deployed.
 * Unlike /clone, the new blueprint shares the same agentId (same logical agent,
 * new iteration), with the major version incremented and lifecycle state reset.
 *
 * Access: designer and admin only.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session: authSession, error } = await requireAuth(["architect", "designer", "admin"]);
  if (error) return error;
  const requestId = getRequestId(request);

  try {
    const { id } = await params;

    // Fetch source blueprint
    const source = await db.query.agentBlueprints.findFirst({
      where: eq(agentBlueprints.id, id),
    });
    if (!source) return apiError(ErrorCode.NOT_FOUND, "Blueprint not found");

    // Enterprise access check
    const enterpriseError = assertEnterpriseAccess(source.enterpriseId, authSession.user);
    if (enterpriseError) return enterpriseError;

    // Only approved or deployed blueprints can spawn a new version
    if (source.status !== "approved" && source.status !== "deployed") {
      return apiError(
        ErrorCode.BAD_REQUEST,
        "Can only create a new version from an approved or deployed blueprint"
      );
    }

    // Increment major version (semver: "1.0.0" → "2.0.0")
    const parts = source.version.split(".");
    const major = parseInt(parts[0] ?? "1", 10);
    const newVersion = `${major + 1}.0.0`;

    // Prevent duplicates — reject if an active (non-deprecated) blueprint already exists at this version
    const existing = await db.query.agentBlueprints.findFirst({
      where: and(
        eq(agentBlueprints.agentId, source.agentId),
        eq(agentBlueprints.version, newVersion),
        ne(agentBlueprints.status, "deprecated")
      ),
    });
    if (existing) {
      return apiError(
        ErrorCode.CONFLICT,
        `A draft v${newVersion} already exists for this agent`
      );
    }

    const newBlueprintId = randomUUID();
    const sourceAbp = source.abp as ABP;

    const newAbp: ABP = {
      ...sourceAbp,
      metadata: {
        ...sourceAbp.metadata,
        status: "draft",
        created_by: authSession.user.email!,
        created_at: new Date().toISOString(),
      },
    };

    // Compute governance diff between source and new version at creation time.
    // This provides a permanent, auditable record of what changed — used for
    // regulatory change management documentation and the version lineage view.
    const governanceDiff = diffABP(
      { ...sourceAbp, id, version: source.version } as ABP & { id: string; version: string },
      { ...newAbp, id: newBlueprintId, version: newVersion } as ABP & { id: string; version: string }
    );

    const [newBlueprint] = await db
      .insert(agentBlueprints)
      .values({
        id: newBlueprintId,
        agentId: source.agentId,
        sessionId: source.sessionId,
        version: newVersion,
        name: source.name,
        tags: source.tags ?? [],
        enterpriseId: source.enterpriseId,
        abp: newAbp,
        status: "draft",
        refinementCount: "0",
        validationReport: null,
        reviewComment: null,
        reviewedAt: null,
        reviewedBy: null,
        createdBy: authSession.user.email!,
        currentApprovalStep: 0,
        approvalProgress: [],
        deploymentTarget: null,
        deploymentMetadata: null,
        nextReviewDue: null,
        lastPeriodicReviewAt: null,
        previousBlueprintId: id,
        governanceDiff,
      })
      .returning();

    await publishEvent({
      event: {
        type: "blueprint.created",
        payload: {
          blueprintId: newBlueprintId,
          agentId: source.agentId,
          name: source.name ?? "",
          createdBy: authSession.user.email!,
        },
      },
      actor: { email: authSession.user.email!, role: authSession.user.role },
      entity: { type: "blueprint", id: newBlueprintId },
      enterpriseId: source.enterpriseId ?? null,
    });

    return NextResponse.json(
      { blueprintId: newBlueprint.id, agentId: newBlueprint.agentId, version: newVersion },
      { status: 201 }
    );
  } catch (err) {
    console.error(`[${requestId}] Failed to create new blueprint version:`, err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to create new blueprint version", undefined, requestId);
  }
}
