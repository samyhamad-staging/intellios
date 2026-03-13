import { NextRequest, NextResponse } from "next/server";
import { streamText, convertToModelMessages, stepCountIs } from "ai";
import type { UIMessage } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { apiError, aiError, ErrorCode } from "@/lib/errors";
import { db } from "@/lib/db";
import { intakeSessions, intakeMessages } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { buildIntakeSystemPrompt } from "@/lib/intake/system-prompt";
import { createIntakeTools } from "@/lib/intake/tools";
import { IntakePayload, IntakeContext } from "@/lib/types/intake";
import { requireAuth } from "@/lib/auth/require";
import { assertEnterpriseAccess } from "@/lib/auth/enterprise";
import { getRequestId } from "@/lib/request-id";
import { rateLimit } from "@/lib/rate-limit";
import { parseBody } from "@/lib/parse-body";
import { z } from "zod";

// Validate outer shape only — inner message structure is owned by the AI SDK.
const ChatBody = z.object({
  messages: z.array(z.unknown()).min(1).max(200),
});

function extractTextContent(message: UIMessage): string {
  const textParts = message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text);
  return textParts.join("");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session: authSession, error } = await requireAuth(["designer", "admin"]);
  if (error) return error;
  const requestId = getRequestId(request);

  const rateLimitResponse = rateLimit(authSession.user.email!, {
    endpoint: "chat",
    max: 30,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  const { data: body, error: bodyError } = await parseBody(request, ChatBody);
  if (bodyError) return bodyError;

  try {
    const { id: sessionId } = await params;
    const messages = body.messages as UIMessage[];

    // Fetch session
    const session = await db.query.intakeSessions.findFirst({
      where: eq(intakeSessions.id, sessionId),
    });

    if (!session) {
      return apiError(ErrorCode.NOT_FOUND, "Session not found");
    }

    const enterpriseError = assertEnterpriseAccess(session.enterpriseId, authSession.user);
    if (enterpriseError) return enterpriseError;

    if (session.status === "completed") {
      return apiError(ErrorCode.CONFLICT, "Session is already finalized");
    }

    // Save the latest user message to DB
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === "user") {
      const text = extractTextContent(lastMessage);
      if (text) {
        await db.insert(intakeMessages).values({
          sessionId,
          role: "user",
          content: text,
        });
      }
    }

    // Current payload state — serialized to prevent race conditions when
    // Claude calls multiple tools in the same step (parallel execution).
    let currentPayload = (session.intakePayload as IntakePayload) ?? {};
    const currentContext = (session.intakeContext as IntakeContext | null) ?? null;
    let updateQueue = Promise.resolve();

    // Create tools with payload access
    const tools = createIntakeTools(
      () => currentPayload,
      (updater) => {
        updateQueue = updateQueue.then(async () => {
          currentPayload = updater(currentPayload);
          await db
            .update(intakeSessions)
            .set({ intakePayload: currentPayload, updatedAt: new Date() })
            .where(eq(intakeSessions.id, sessionId));
        });
        return updateQueue;
      },
      async () => {
        await db
          .update(intakeSessions)
          .set({ status: "completed", updatedAt: new Date() })
          .where(eq(intakeSessions.id, sessionId));
      },
      () => currentContext
    );

    // Convert UI messages to model messages for Claude
    const modelMessages = await convertToModelMessages(messages);

    // Stream response
    const result = streamText({
      model: anthropic("claude-sonnet-4-20250514"),
      system: buildIntakeSystemPrompt(currentPayload, currentContext),
      messages: modelMessages,
      tools,
      stopWhen: stepCountIs(10),
      onFinish: async ({ text }) => {
        if (text) {
          await db.insert(intakeMessages).values({
            sessionId,
            role: "assistant",
            content: text,
          });
        }
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error(`[${requestId}] Failed to process intake chat:`, error);
    return aiError(error, requestId);
  }
}
