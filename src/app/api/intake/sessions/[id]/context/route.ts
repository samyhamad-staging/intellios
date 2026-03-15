import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { intakeSessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { assertEnterpriseAccess } from "@/lib/auth/enterprise";
import { getRequestId } from "@/lib/request-id";
import { parseBody } from "@/lib/parse-body";
import { z } from "zod";
import { IntakeContext } from "@/lib/types/intake";
import { classifyIntake } from "@/lib/intake/classify";

const IntakeContextBody = z.object({
  agentPurpose: z.string().min(1).max(500),
  deploymentType: z.enum(["internal-only", "customer-facing", "partner-facing", "automated-pipeline"]),
  dataSensitivity: z.enum(["public", "internal", "confidential", "pii", "regulated"]),
  regulatoryScope: z.array(z.enum(["FINRA", "SOX", "GDPR", "HIPAA", "PCI-DSS", "none"])),
  integrationTypes: z.array(z.enum(["internal-apis", "external-apis", "databases", "file-systems", "none"])),
  stakeholdersConsulted: z.array(z.enum(["legal", "compliance", "security", "it", "business-owner", "none"])),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session: authSession, error } = await requireAuth(["designer", "admin"]);
  if (error) return error;
  const requestId = getRequestId(request);

  const { data: body, error: bodyError } = await parseBody(request, IntakeContextBody);
  if (bodyError) return bodyError;

  try {
    const { id: sessionId } = await params;

    const session = await db.query.intakeSessions.findFirst({
      where: eq(intakeSessions.id, sessionId),
    });

    if (!session) {
      return apiError(ErrorCode.NOT_FOUND, "Session not found");
    }

    const enterpriseError = assertEnterpriseAccess(session.enterpriseId, authSession.user);
    if (enterpriseError) return enterpriseError;

    if (session.status === "completed") {
      return apiError(ErrorCode.CONFLICT, "Cannot update context on a completed session");
    }

    const context: IntakeContext = body;

    await db
      .update(intakeSessions)
      .set({ intakeContext: context, updatedAt: new Date() })
      .where(eq(intakeSessions.id, sessionId));

    // Fire-and-forget classification — does not block the context save response.
    // Results (agentType + riskTier) are written to the session row and picked up
    // by the UI via polling the session GET endpoint.
    void classifyIntake(context).then(async ({ agentType, riskTier }) => {
      await db
        .update(intakeSessions)
        .set({ agentType, riskTier, updatedAt: new Date() })
        .where(eq(intakeSessions.id, sessionId));
    }).catch((err) => console.error("[classify] Failed to write classification:", err));

    return NextResponse.json({ success: true, context });
  } catch (err) {
    console.error(`[${requestId}] Failed to save intake context:`, err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to save context", undefined, requestId);
  }
}
