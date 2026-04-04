import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentBlueprints, intakeSessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { refineBlueprint } from "@/lib/generation/generate";
import { loadPolicies } from "@/lib/governance/load-policies";
import { ABP } from "@/lib/types/abp";
import { readABP } from "@/lib/abp/read";
import { IntakePayload } from "@/lib/types/intake";
import { apiError, aiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { assertEnterpriseAccess } from "@/lib/auth/enterprise";
import { getRequestId } from "@/lib/request-id";
import { publishEvent } from "@/lib/events/publish";
import { rateLimit } from "@/lib/rate-limit";
import { parseBody } from "@/lib/parse-body";
import { z } from "zod";

const RefineBody = z.object({
  change: z.string().min(1).max(2000),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session: authSession, error } = await requireAuth(["architect", "designer", "admin"]);
  if (error) return error;
  const requestId = getRequestId(request);

  const rateLimitResponse = await rateLimit(authSession.user.email!, {
    endpoint: "generate",
    max: 10,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  const { data: body, error: bodyError } = await parseBody(request, RefineBody);
  if (bodyError) return bodyError;

  try {
    const { id } = await params;
    const { change } = body;

    const blueprint = await db.query.agentBlueprints.findFirst({
      where: eq(agentBlueprints.id, id),
    });

    if (!blueprint) {
      return apiError(ErrorCode.NOT_FOUND, "Blueprint not found");
    }

    const enterpriseError = assertEnterpriseAccess(blueprint.enterpriseId, authSession.user);
    if (enterpriseError) return enterpriseError;

    if (blueprint.status === "approved") {
      return apiError(ErrorCode.CONFLICT, "Approved blueprints cannot be refined");
    }

    // Fetch original intake for context
    const session = await db.query.intakeSessions.findFirst({
      where: eq(intakeSessions.id, blueprint.sessionId),
    });

    const intake = (session?.intakePayload ?? {}) as IntakePayload;
    const currentAbp = readABP(blueprint.abp);

    // Load policies so Claude can maintain governance compliance during refinement
    // and avoid inadvertently dropping required policy sections during regeneration.
    const enterpriseId = blueprint.enterpriseId ?? null;
    const policies = await loadPolicies(enterpriseId);

    // Refine via Claude
    let updatedAbp: ABP;
    try {
      updatedAbp = await refineBlueprint(currentAbp, change.trim(), intake, policies);
    } catch (err) {
      console.error(`[${requestId}] Claude refineBlueprint failed:`, err);
      return aiError(err, requestId);
    }
    const newCount = String(parseInt(blueprint.refinementCount ?? "0", 10) + 1);

    // Re-sync denormalized registry fields in case identity or tags changed
    const name = updatedAbp.identity.name ?? null;
    const tags = (updatedAbp.metadata.tags ?? []) as string[];

    // Persist the refined version (update-in-place for MVP)
    const [updated] = await db
      .update(agentBlueprints)
      .set({ abp: updatedAbp, name, tags, refinementCount: newCount, updatedAt: new Date() })
      .where(eq(agentBlueprints.id, id))
      .returning();

    await publishEvent({
      event: {
        type: "blueprint.refined",
        payload: {
          blueprintId: id,
          agentId: blueprint.agentId,
          name: blueprint.name ?? "",
          createdBy: blueprint.createdBy ?? "",
        },
      },
      actor: { email: authSession.user.email!, role: authSession.user.role },
      entity: { type: "blueprint", id },
      enterpriseId: blueprint.enterpriseId ?? null,
    });

    return NextResponse.json({
      id: updated.id,
      agentId: updated.agentId,
      abp: updatedAbp,
      refinementCount: newCount,
    });
  } catch (error) {
    console.error(`[${requestId}] Failed to refine blueprint:`, error);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to refine blueprint", undefined, requestId);
  }
}
