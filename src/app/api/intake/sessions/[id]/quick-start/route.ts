/**
 * Quick Start — AI-inferred context from a natural-language purpose description.
 *
 * Replaces the 6-field Phase 1 form with a single purpose description.
 * Uses Claude Haiku to infer deploymentType, dataSensitivity, regulatoryScope,
 * integrationTypes, and stakeholdersConsulted from the description.
 * Saves the inferred context and transitions the session to conversation phase.
 */

import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { db } from "@/lib/db";
import { intakeSessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require";
import { assertEnterpriseAccess } from "@/lib/auth/enterprise";
import { getRequestId } from "@/lib/request-id";
import { rateLimit } from "@/lib/rate-limit";
import { parseBody } from "@/lib/parse-body";
import { apiError, ErrorCode } from "@/lib/errors";
import { z } from "zod";

// Extend Vercel function timeout for AI generation (default 10s is too short)
export const maxDuration = 60;

const QuickStartBody = z.object({
  purpose: z.string().min(10).max(2000),
});

const InferredContextSchema = z.object({
  deploymentType: z.enum([
    "internal-only",
    "customer-facing",
    "partner-facing",
    "automated-pipeline",
  ]),
  dataSensitivity: z.enum([
    "public",
    "internal",
    "confidential",
    "pii",
    "regulated",
  ]),
  regulatoryScope: z.array(
    z.enum(["FINRA", "SOX", "GDPR", "HIPAA", "PCI-DSS", "none"])
  ),
  integrationTypes: z.array(
    z.enum([
      "internal-apis",
      "external-apis",
      "databases",
      "file-systems",
      "none",
    ])
  ),
  stakeholdersConsulted: z.array(
    z.enum([
      "legal",
      "compliance",
      "security",
      "it",
      "business-owner",
      "none",
    ])
  ),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session: authSession, error } = await requireAuth([
    "architect",
    "admin",
  ]);
  if (error) return error;
  const requestId = getRequestId(request);

  const rateLimitResponse = await rateLimit(authSession.user.email!, {
    endpoint: "intake",
    max: 20,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  const { data: body, error: bodyError } = await parseBody(
    request,
    QuickStartBody
  );
  if (bodyError) return bodyError;

  try {
    const { id } = await params;

    const session = await db.query.intakeSessions.findFirst({
      where: eq(intakeSessions.id, id),
    });
    if (!session) {
      return apiError(ErrorCode.NOT_FOUND, "Session not found");
    }

    const enterpriseError = assertEnterpriseAccess(
      session.enterpriseId,
      authSession.user
    );
    if (enterpriseError) return enterpriseError;

    // If context already set, skip inference
    if (session.intakeContext) {
      return NextResponse.json({ context: session.intakeContext });
    }

    const { purpose } = body;

    // Use Claude Haiku to infer context fields from the purpose description
    const { object: inferred } = await generateObject({
      model: anthropic("claude-haiku-4-5-20251001"),
      schema: InferredContextSchema,
      prompt: `You are an enterprise AI agent design assistant. Based on the following description of an agent that a user wants to build, infer the most appropriate context classification.

Agent description: "${purpose}"

Infer:
1. deploymentType: Who will interact with this agent? (internal-only, customer-facing, partner-facing, automated-pipeline)
2. dataSensitivity: What is the highest sensitivity of data this agent will handle? (public, internal, confidential, pii, regulated)
3. regulatoryScope: Which regulatory frameworks likely apply? Choose all that apply. If unclear, use ["none"]. Options: FINRA, SOX, GDPR, HIPAA, PCI-DSS, none
4. integrationTypes: What systems will this agent need to connect to? Choose all that apply. Options: internal-apis, external-apis, databases, file-systems, none
5. stakeholdersConsulted: Which stakeholders should ideally be consulted for this type of agent? Choose all that apply. If unsure, use ["none"]. Options: legal, compliance, security, it, business-owner, none

Be conservative with regulatory scope — only include frameworks that are clearly relevant based on the description. For stakeholdersConsulted, recommend who SHOULD be consulted based on the agent's purpose and risk profile.`,
    });

    // Build the full IntakeContext
    const context = {
      agentPurpose: purpose.trim(),
      deploymentType: inferred.deploymentType,
      dataSensitivity: inferred.dataSensitivity,
      regulatoryScope: inferred.regulatoryScope,
      integrationTypes: inferred.integrationTypes,
      stakeholdersConsulted: inferred.stakeholdersConsulted,
    };

    // Save context to session
    await db
      .update(intakeSessions)
      .set({ intakeContext: context, updatedAt: new Date() })
      .where(eq(intakeSessions.id, id));

    return NextResponse.json({ context, inferred: true });
  } catch (err) {
    console.error(`[${requestId}] Quick-start inference failed:`, err);
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      "Failed to infer context from description",
      undefined,
      requestId
    );
  }
}
