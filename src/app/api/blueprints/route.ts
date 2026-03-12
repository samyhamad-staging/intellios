import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { intakeSessions, agentBlueprints } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateBlueprint } from "@/lib/generation/generate";
import { validateBlueprint } from "@/lib/governance/validator";
import { IntakePayload } from "@/lib/types/intake";
import { apiError, aiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { getRequestId } from "@/lib/request-id";
import { writeAuditLog } from "@/lib/audit/log";
import { rateLimit } from "@/lib/rate-limit";
import { parseBody } from "@/lib/parse-body";
import { z } from "zod";

const GenerateBody = z.object({
  sessionId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const { session: authSession, error } = await requireAuth(["designer", "admin"]);
  if (error) return error;
  const requestId = getRequestId(request);

  const rateLimitResponse = rateLimit(authSession.user.email!, {
    endpoint: "generate",
    max: 10,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  const { data: body, error: bodyError } = await parseBody(request, GenerateBody);
  if (bodyError) return bodyError;

  try {
    const { sessionId } = body;

    const session = await db.query.intakeSessions.findFirst({
      where: eq(intakeSessions.id, sessionId),
    });

    if (!session) {
      return apiError(ErrorCode.NOT_FOUND, "Session not found");
    }

    if (session.status !== "completed") {
      return apiError(ErrorCode.INVALID_STATE, "Intake session must be completed before generating a blueprint");
    }

    const intake = session.intakePayload as IntakePayload;

    // Generate the ABP via Claude
    let abp;
    try {
      abp = await generateBlueprint(intake, sessionId);
    } catch (err) {
      console.error(`[${requestId}] Claude generateBlueprint failed:`, err);
      return aiError(err, requestId);
    }

    // Denormalize searchable fields from the ABP for the registry
    const name = abp.identity.name ?? null;
    const tags = (abp.metadata.tags ?? []) as string[];

    // Run governance validation synchronously (ADR-003, ADR-005)
    const validationReport = await validateBlueprint(abp, session.enterpriseId ?? null);

    // Persist — agentId defaults to a new UUID (first version of a new agent)
    const [blueprint] = await db
      .insert(agentBlueprints)
      .values({ sessionId, abp, name, tags, validationReport, createdBy: authSession.user.email ?? null })
      .returning();

    await writeAuditLog({
      entityType: "blueprint",
      entityId: blueprint.id,
      action: "blueprint.created",
      actorEmail: authSession.user.email!,
      actorRole: authSession.user.role,
      toState: { status: "draft", agentId: blueprint.agentId, name: blueprint.name },
      metadata: { sessionId, violationCount: validationReport?.violations?.length ?? 0 },
    });

    return NextResponse.json({
      id: blueprint.id,
      agentId: blueprint.agentId,
      abp,
      validationReport,
    });
  } catch (error) {
    console.error(`[${requestId}] Failed to generate blueprint:`, error);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to generate blueprint", undefined, requestId);
  }
}
