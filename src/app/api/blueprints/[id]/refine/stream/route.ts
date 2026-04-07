import { NextRequest } from "next/server";
import { streamText, convertToModelMessages } from "ai";
import type { UIMessage } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { db } from "@/lib/db";
import { agentBlueprints, intakeSessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ALL_BLUEPRINT_COLUMNS } from "@/lib/db/safe-columns";
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

// Extend Vercel function timeout for AI generation (default 10s is too short)
export const maxDuration = 60;

const StreamRefineBody = z.object({
  messages: z.array(z.unknown()).min(1).max(200),
});

function extractLastUserText(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role === "user") {
      const textParts = msg.parts
        .filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text);
      return textParts.join("").trim();
    }
  }
  return "";
}

/**
 * POST /api/blueprints/[id]/refine/stream
 *
 * Multi-turn refinement chat endpoint. Accepts a conversation history,
 * applies the latest user request to the blueprint via generateObject,
 * persists the update, then streams a narrative explanation of the changes.
 *
 * The client fetches /api/blueprints/[id] after stream completion to
 * obtain the updated blueprint.
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

  const { data: body, error: bodyError } = await parseBody(request, StreamRefineBody);
  if (bodyError) return bodyError;

  try {
    const { id } = await params;
    const messages = body.messages as UIMessage[];

    const changeRequest = extractLastUserText(messages);
    if (!changeRequest) {
      return apiError(ErrorCode.BAD_REQUEST, "No user message found");
    }

    const [blueprint] = await db
      .select(ALL_BLUEPRINT_COLUMNS)
      .from(agentBlueprints)
      .where(eq(agentBlueprints.id, id))
      .limit(1);

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
      where: eq(intakeSessions.id, blueprint.sessionId ?? ""),
    });

    const intake = (session?.intakePayload ?? {}) as IntakePayload;
    const currentAbp = readABP(blueprint.abp);
    const enterpriseId = blueprint.enterpriseId ?? null;
    const policies = await loadPolicies(enterpriseId);

    // Refine the blueprint (blocking — must complete before streaming)
    let updatedAbp: ABP;
    try {
      updatedAbp = await refineBlueprint(currentAbp, changeRequest, intake, policies);
    } catch (err) {
      console.error(`[${requestId}] Claude refineBlueprint failed:`, err);
      return aiError(err, requestId);
    }

    const newCount = String(parseInt(blueprint.refinementCount ?? "0", 10) + 1);
    const name = updatedAbp.identity.name ?? null;
    const tags = (updatedAbp.metadata.tags ?? []) as string[];

    // Persist the refined blueprint before streaming
    await db
      .update(agentBlueprints)
      .set({ abp: updatedAbp, name, tags, refinementCount: newCount, updatedAt: new Date() })
      .where(eq(agentBlueprints.id, id));

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
      enterpriseId,
    });

    // Stream a narrative explanation of the changes
    const modelMessages = await convertToModelMessages(messages);

    const result = streamText({
      model: anthropic("claude-haiku-4-5-20251001"),
      system: `You are a blueprint refinement assistant for an enterprise AI agent platform.
A blueprint has just been updated. Your only job is to briefly confirm what was changed
based on the user's request. Be concise: 2-3 sentences maximum.
Do not ask follow-up questions. Do not repeat the full blueprint content.`,
      messages: modelMessages,
    });

    return result.toUIMessageStreamResponse();
  } catch (err) {
    console.error(`[${requestId}] Failed to stream refinement:`, err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to refine blueprint", undefined, requestId);
  }
}
