import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentBlueprints } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { getRequestId } from "@/lib/request-id";
import { parseBody } from "@/lib/parse-body";
import { writeAuditLog } from "@/lib/audit/log";
import { getEnterpriseSettings } from "@/lib/settings/get-settings";
import { z } from "zod";

const CompleteReviewBody = z.object({
  notes: z.string().max(1000).optional(),
});

/**
 * POST /api/blueprints/[id]/periodic-review/complete
 *
 * Marks a periodic review as completed for a deployed blueprint.
 * Records lastPeriodicReviewAt = now() and computes a new nextReviewDue
 * based on the enterprise's configured cadence.
 *
 * Access: compliance_officer | admin
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session: authSession, error: authError } = await requireAuth([
    "compliance_officer",
    "admin",
  ]);
  if (authError) return authError;

  const { id } = await params;
  const { data: body, error: bodyError } = await parseBody(request, CompleteReviewBody);
  if (bodyError) return bodyError;

  const requestId = getRequestId(request);

  try {
    // Load blueprint with enterprise scope
    const blueprint = await db.query.agentBlueprints.findFirst({
      where: eq(agentBlueprints.id, id),
    });

    if (!blueprint) {
      return apiError(ErrorCode.NOT_FOUND, "Blueprint not found", undefined, requestId);
    }

    // Enterprise scope check
    if (
      authSession.user.role !== "admin" &&
      blueprint.enterpriseId !== authSession.user.enterpriseId
    ) {
      return apiError(ErrorCode.FORBIDDEN, "Access denied", undefined, requestId);
    }

    if (blueprint.status !== "deployed") {
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        "Periodic review completion is only available for deployed agents",
        undefined,
        requestId
      );
    }

    if (!blueprint.nextReviewDue) {
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        "This agent does not have a scheduled periodic review",
        undefined,
        requestId
      );
    }

    // Compute new dates
    const settings = await getEnterpriseSettings(blueprint.enterpriseId ?? null);
    const cadenceMs =
      settings.periodicReview.defaultCadenceMonths * 30.44 * 24 * 60 * 60 * 1000;
    const lastPeriodicReviewAt = new Date();
    const nextReviewDue = new Date(Date.now() + cadenceMs);

    await db
      .update(agentBlueprints)
      .set({ lastPeriodicReviewAt, nextReviewDue })
      .where(eq(agentBlueprints.id, id));

    void writeAuditLog({
      entityType: "blueprint",
      entityId: id,
      action: "blueprint.periodic_review_completed",
      actorEmail: authSession.user.email!,
      actorRole: authSession.user.role,
      enterpriseId: blueprint.enterpriseId ?? null,
      toState: {
        lastPeriodicReviewAt: lastPeriodicReviewAt.toISOString(),
        nextReviewDue: nextReviewDue.toISOString(),
        cadenceMonths: settings.periodicReview.defaultCadenceMonths,
        ...(body.notes ? { notes: body.notes } : {}),
      },
    });

    return NextResponse.json({
      lastPeriodicReviewAt: lastPeriodicReviewAt.toISOString(),
      nextReviewDue: nextReviewDue.toISOString(),
    });
  } catch (err) {
    console.error(`[${requestId}] Failed to complete periodic review:`, err);
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      "Failed to complete periodic review",
      undefined,
      requestId
    );
  }
}
