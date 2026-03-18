/**
 * Agent Playground — streaming chat route.
 * Phase 40: powers the "Simulate" tab on the Registry detail page.
 *
 * Takes a blueprint ID and a message history; streams responses from Claude using
 * the blueprint's simulation system prompt (identity + instructions + constraints +
 * tool descriptions as behavioral context + governance rules).
 *
 * Messages are stateless — kept client-side only. No DB table needed.
 * One audit entry is written per conversation (on the first message).
 */

import { NextRequest } from "next/server";
import { streamText, convertToModelMessages } from "ai";
import type { UIMessage } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { apiError, aiError, ErrorCode } from "@/lib/errors";
import { db } from "@/lib/db";
import { agentBlueprints } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { buildSimulationSystemPrompt } from "@/lib/testing/executor";
import { requireAuth } from "@/lib/auth/require";
import { assertEnterpriseAccess } from "@/lib/auth/enterprise";
import { writeAuditLog } from "@/lib/audit/log";
import { getRequestId } from "@/lib/request-id";
import { rateLimit } from "@/lib/rate-limit";
import { parseBody } from "@/lib/parse-body";
import { z } from "zod";
import type { ABP } from "@/lib/types/abp";

const ChatBody = z.object({
  messages: z.array(z.unknown()).min(1).max(200),
  // firstMessage: true on the very first turn so we know to write the audit entry
  firstMessage: z.boolean().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session: authSession, error } = await requireAuth([
    "designer",
    "reviewer",
    "compliance_officer",
    "admin",
  ]);
  if (error) return error;
  const requestId = getRequestId(request);

  const rateLimitResponse = rateLimit(authSession.user.email!, {
    endpoint: "simulate",
    max: 30,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  const { data: body, error: bodyError } = await parseBody(request, ChatBody);
  if (bodyError) return bodyError;

  try {
    const { id: blueprintId } = await params;
    const messages = body.messages as UIMessage[];

    // Fetch blueprint
    const blueprint = await db.query.agentBlueprints.findFirst({
      where: eq(agentBlueprints.id, blueprintId),
    });
    if (!blueprint) {
      return apiError(ErrorCode.NOT_FOUND, "Blueprint not found");
    }

    const enterpriseError = assertEnterpriseAccess(blueprint.enterpriseId, authSession.user);
    if (enterpriseError) return enterpriseError;

    const abp = blueprint.abp as ABP;

    // Write audit entry on first message of a simulation session
    if (body.firstMessage) {
      void writeAuditLog({
        entityType: "blueprint",
        entityId: blueprintId,
        action: "blueprint.simulated",
        actorEmail: authSession.user.email!,
        actorRole: authSession.user.role,
        enterpriseId: blueprint.enterpriseId,
        metadata: {
          agentId: blueprint.agentId,
          agentName: blueprint.name,
          version: blueprint.version,
        },
      });
    }

    const systemPrompt = buildSimulationSystemPrompt(abp);
    const modelMessages = await convertToModelMessages(messages);

    const result = streamText({
      model: anthropic("claude-haiku-4-5-20251001"),
      system: systemPrompt,
      messages: modelMessages,
      maxOutputTokens: abp.constraints?.max_tokens_per_response ?? 1024,
    });

    return result.toUIMessageStreamResponse();
  } catch (err) {
    console.error(`[${requestId}] Simulation chat error:`, err);
    return aiError(err, requestId);
  }
}
