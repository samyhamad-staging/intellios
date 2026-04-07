import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { intakeSessions, agentBlueprints, auditLog } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateBlueprint } from "@/lib/generation/generate";
import { validateBlueprint } from "@/lib/governance/validator";
import { loadPolicies } from "@/lib/governance/load-policies";
import { IntakePayload, IntakeContext, IntakeClassification, AgentType, IntakeRiskTier } from "@/lib/types/intake";
import { apiError, aiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { assertEnterpriseAccess } from "@/lib/auth/enterprise";
import { getRequestId } from "@/lib/request-id";
import { publishEvent } from "@/lib/events/publish";
import { rateLimit } from "@/lib/rate-limit";
import { SAFE_BLUEPRINT_COLUMNS } from "@/lib/db/safe-columns";

/**
 * POST /api/blueprints/[id]/regenerate
 *
 * Re-generates an ABP from the blueprint's original intake session,
 * updating the existing draft row in-place. Resets refinement count
 * and clears the previous validation report.
 *
 * Only works on draft blueprints — approved/deployed blueprints should
 * use "Create New Version" instead of regenerating in-place.
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

  const rateLimitResponse = await rateLimit(authSession.user.email!, {
    endpoint: "generate",
    max: 10,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { id } = await params;

    // Fetch source blueprint
    const [source] = await db
      .select(SAFE_BLUEPRINT_COLUMNS)
      .from(agentBlueprints)
      .where(eq(agentBlueprints.id, id))
      .limit(1);
    if (!source) return apiError(ErrorCode.NOT_FOUND, "Blueprint not found");

    // Enterprise access check
    const enterpriseError = assertEnterpriseAccess(source.enterpriseId, authSession.user);
    if (enterpriseError) return enterpriseError;

    // Only draft blueprints can be regenerated in-place
    if (source.status !== "draft") {
      return apiError(
        ErrorCode.BAD_REQUEST,
        "Only draft blueprints can be regenerated. Use 'Create New Version' for approved or deployed blueprints."
      );
    }

    // Fetch the originating intake session
    if (!source.sessionId) {
      return apiError(ErrorCode.BAD_REQUEST, "This blueprint has no associated intake session and cannot be regenerated.");
    }

    const session = await db.query.intakeSessions.findFirst({
      where: eq(intakeSessions.id, source.sessionId),
    });
    if (!session) return apiError(ErrorCode.NOT_FOUND, "Originating intake session not found");
    if (session.status !== "completed") {
      return apiError(ErrorCode.INVALID_STATE, "Intake session must be completed to regenerate a blueprint");
    }

    const intake = session.intakePayload as IntakePayload;
    const intakeContext = (session.intakeContext as IntakeContext | null) ?? null;
    const enterpriseId = source.enterpriseId ?? null;

    // Reconstruct classification from session columns
    const intakeClassification: IntakeClassification | null =
      session.agentType && session.riskTier
        ? {
            agentType: session.agentType as AgentType,
            riskTier: session.riskTier as IntakeRiskTier,
            rationale: "",
          }
        : null;

    const policies = await loadPolicies(enterpriseId);

    // Re-generate the ABP via Claude
    let abp;
    try {
      abp = await generateBlueprint(intake, intakeContext, intakeClassification, source.sessionId, policies);
    } catch (err) {
      console.error(`[${requestId}] Claude generateBlueprint failed during regeneration:`, err);
      return aiError(err, requestId);
    }

    const name = abp.identity.name ?? null;
    const tags = (abp.metadata.tags ?? []) as string[];

    // Re-run governance validation
    const validationReport = await validateBlueprint(abp, enterpriseId, policies);

    // Update the existing draft row in-place
    await db
      .update(agentBlueprints)
      .set({
        abp,
        name,
        tags,
        validationReport,
        refinementCount: "0",
        reviewComment: null,
      })
      .where(eq(agentBlueprints.id, id));

    // Audit log
    try {
      await db.insert(auditLog).values({
        actorEmail: authSession.user.email!,
        actorRole: authSession.user.role!,
        action: "blueprint.regenerated",
        entityType: "blueprint",
        entityId: id,
        enterpriseId,
        metadata: { agentId: source.agentId, agentName: name },
      });
    } catch (auditErr) {
      console.error(`[${requestId}] Failed to write audit log:`, auditErr);
    }

    await publishEvent({
      event: {
        type: "blueprint.regenerated",
        payload: {
          blueprintId: id,
          agentId: source.agentId,
          agentName: name ?? "",
        },
      },
      actor: { email: authSession.user.email!, role: authSession.user.role },
      entity: { type: "blueprint", id },
      enterpriseId,
    });

    return NextResponse.json({ abp, validationReport, refinementCount: "0" });
  } catch (err) {
    console.error(`[${requestId}] Failed to regenerate blueprint:`, err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to regenerate blueprint", undefined, requestId);
  }
}
