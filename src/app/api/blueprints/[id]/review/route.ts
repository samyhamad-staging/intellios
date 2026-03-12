import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentBlueprints } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { getRequestId } from "@/lib/request-id";
import { writeAuditLog } from "@/lib/audit/log";
import { parseBody } from "@/lib/parse-body";
import { z } from "zod";

type ReviewAction = "approve" | "reject" | "request_changes";

const ACTION_STATUS: Record<ReviewAction, string> = {
  approve: "approved",
  reject: "rejected",
  request_changes: "draft",
};

const ReviewBody = z.object({
  action: z.enum(["approve", "reject", "request_changes"]),
  comment: z.string().max(2000).optional(),
});

/**
 * POST /api/blueprints/[id]/review
 * Submits a review decision for a blueprint that is currently `in_review`.
 *
 * Body: { action: "approve" | "reject" | "request_changes", comment?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session: authSession, error } = await requireAuth(["reviewer"]);
  if (error) return error;
  const requestId = getRequestId(request);

  const { data: body, error: bodyError } = await parseBody(request, ReviewBody);
  if (bodyError) return bodyError;

  try {
    const { id } = await params;
    const { action, comment } = body;

    if (action === "request_changes" && !comment?.trim()) {
      return apiError(ErrorCode.BAD_REQUEST, "A comment is required when requesting changes.");
    }

    const blueprint = await db.query.agentBlueprints.findFirst({
      where: eq(agentBlueprints.id, id),
    });

    if (!blueprint) {
      return apiError(ErrorCode.NOT_FOUND, "Blueprint not found");
    }

    if (blueprint.status !== "in_review") {
      return apiError(ErrorCode.INVALID_STATE, `Blueprint is not in review. Current status: ${blueprint.status}`);
    }

    const newStatus = ACTION_STATUS[action];
    const reviewedAt = new Date();

    const [updated] = await db
      .update(agentBlueprints)
      .set({
        status: newStatus,
        reviewComment: comment?.trim() || null,
        reviewedAt,
        reviewedBy: authSession.user.email ?? null,
        updatedAt: reviewedAt,
      })
      .where(eq(agentBlueprints.id, id))
      .returning({
        id: agentBlueprints.id,
        status: agentBlueprints.status,
        reviewComment: agentBlueprints.reviewComment,
        reviewedAt: agentBlueprints.reviewedAt,
      });

    await writeAuditLog({
      entityType: "blueprint",
      entityId: id,
      action: "blueprint.reviewed",
      actorEmail: authSession.user.email!,
      actorRole: authSession.user.role,
      fromState: { status: "in_review" },
      toState: { status: newStatus },
      metadata: { reviewAction: action, comment: comment?.trim() || null },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(`[${requestId}] Failed to submit review:`, error);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to submit review", undefined, requestId);
  }
}
