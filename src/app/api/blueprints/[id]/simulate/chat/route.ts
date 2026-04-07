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
import { SAFE_BLUEPRINT_COLUMNS } from "@/lib/db/safe-columns";
import { eq } from "drizzle-orm";
import { buildSimulationSystemPrompt } from "@/lib/testing/executor";
import { requireAuth } from "@/lib/auth/require";
import { assertEnterpriseAccess } from "@/lib/auth/enterprise";
import { publishEvent } from "@/lib/events/publish";
import { getRequestId } from "@/lib/request-id";
import { rateLimit } from "@/lib/rate-limit";
import { parseBody } from "@/lib/parse-body";
import { z } from "zod";
import type { ABP } from "@/lib/types/abp";
import { readABP } from "@/lib/abp/read";

// Extend Vercel function timeout for AI generation (default 10s is too short)
export const maxDuration = 60;

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
    "architect",
    "reviewer",
    "compliance_officer",
    "admin",
  ]);
  if (error) return error;
  const requestId = getRequestId(request);

  const rateLimitResponse = await rateLimit(authSession.user.email!, {
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
    const [blueprint] = await db
      .select(SAFE_BLUEPRINT_COLUMNS)
      .from(agentBlueprints)
      .where(eq(agentBlueprints.id, blueprintId))
      .limit(1);
    if (!blueprint) {
      return apiError(ErrorCode.NOT_FOUND, "Blueprint not found");
    }

    const enterpriseError = assertEnterpriseAccess(blueprint.enterpriseId, authSession.user);
    if (enterpriseError) return enterpriseError;

    const abp = readABP(blueprint.abp);

    // Write audit entry on first message of a simulation session
    if (body.firstMessage) {
      void publishEvent({
        event: {
          type: "blueprint.simulated",
          payload: {
            blueprintId,
            agentId: blueprint.agentId,
            agentName: blueprint.name ?? "",
          },
        },
        actor: { email: authSession.user.email!, role: authSession.user.role },
        entity: { type: "blueprint", id: blueprintId },
        enterpriseId: blueprint.enterpriseId ?? null,
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
