import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentBlueprints } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ValidationReport } from "@/lib/governance/types";

type Status = "draft" | "in_review" | "approved" | "rejected" | "deprecated";

// Valid forward transitions. Any status → deprecated is always allowed.
const VALID_TRANSITIONS: Record<Status, Status[]> = {
  draft: ["in_review", "deprecated"],
  in_review: ["approved", "rejected", "deprecated"],
  approved: ["deprecated"],
  rejected: ["deprecated"],
  deprecated: [],
};

/**
 * PATCH /api/blueprints/[id]/status
 * Transitions the lifecycle status of a blueprint version.
 *
 * Body: { status: "in_review" | "approved" | "rejected" | "deprecated" }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { status: newStatus } = (await request.json()) as { status: Status };

    const validStatuses: Status[] = [
      "draft",
      "in_review",
      "approved",
      "rejected",
      "deprecated",
    ];
    if (!validStatuses.includes(newStatus)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    const blueprint = await db.query.agentBlueprints.findFirst({
      where: eq(agentBlueprints.id, id),
    });

    if (!blueprint) {
      return NextResponse.json(
        { error: "Blueprint not found" },
        { status: 404 }
      );
    }

    const currentStatus = blueprint.status as Status;

    if (currentStatus === newStatus) {
      return NextResponse.json(
        { error: `Blueprint is already ${newStatus}` },
        { status: 409 }
      );
    }

    const allowed = VALID_TRANSITIONS[currentStatus];
    if (!allowed.includes(newStatus)) {
      return NextResponse.json(
        {
          error: `Cannot transition from ${currentStatus} to ${newStatus}. Allowed: ${allowed.join(", ") || "none"}`,
        },
        { status: 422 }
      );
    }

    // Block submission for review if there are unresolved error-severity violations (ADR-003, ADR-005)
    if (newStatus === "in_review") {
      const report = blueprint.validationReport as ValidationReport | null;
      if (report) {
        const errorViolations = report.violations.filter((v) => v.severity === "error");
        if (errorViolations.length > 0) {
          return NextResponse.json(
            {
              error: `Cannot submit for review: ${errorViolations.length} error-severity governance violation${errorViolations.length === 1 ? "" : "s"} must be resolved first. Re-validate after refining the blueprint.`,
              violations: errorViolations,
            },
            { status: 422 }
          );
        }
      }
    }

    const [updated] = await db
      .update(agentBlueprints)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(agentBlueprints.id, id))
      .returning();

    return NextResponse.json({ id: updated.id, status: updated.status });
  } catch (error) {
    console.error("Failed to update blueprint status:", error);
    return NextResponse.json(
      { error: "Failed to update status" },
      { status: 500 }
    );
  }
}
