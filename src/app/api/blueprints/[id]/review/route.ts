import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentBlueprints } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

type ReviewAction = "approve" | "reject" | "request_changes";

const ACTION_STATUS: Record<ReviewAction, string> = {
  approve: "approved",
  reject: "rejected",
  request_changes: "draft",
};

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
  try {
    const { id } = await params;
    const { action, comment } = (await request.json()) as {
      action: ReviewAction;
      comment?: string;
    };

    const validActions: ReviewAction[] = ["approve", "reject", "request_changes"];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${validActions.join(", ")}` },
        { status: 400 }
      );
    }

    if (action === "request_changes" && !comment?.trim()) {
      return NextResponse.json(
        { error: "A comment is required when requesting changes." },
        { status: 400 }
      );
    }

    const blueprint = await db.query.agentBlueprints.findFirst({
      where: eq(agentBlueprints.id, id),
    });

    if (!blueprint) {
      return NextResponse.json({ error: "Blueprint not found" }, { status: 404 });
    }

    if (blueprint.status !== "in_review") {
      return NextResponse.json(
        { error: `Blueprint is not in review. Current status: ${blueprint.status}` },
        { status: 422 }
      );
    }

    const newStatus = ACTION_STATUS[action];
    const reviewedAt = new Date();

    const [updated] = await db
      .update(agentBlueprints)
      .set({
        status: newStatus,
        reviewComment: comment?.trim() || null,
        reviewedAt,
        updatedAt: reviewedAt,
      })
      .where(eq(agentBlueprints.id, id))
      .returning({
        id: agentBlueprints.id,
        status: agentBlueprints.status,
        reviewComment: agentBlueprints.reviewComment,
        reviewedAt: agentBlueprints.reviewedAt,
      });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to submit review:", error);
    return NextResponse.json(
      { error: "Failed to submit review" },
      { status: 500 }
    );
  }
}
