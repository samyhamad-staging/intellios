import { NextRequest } from "next/server";
import { streamText, convertToModelMessages, stepCountIs } from "ai";
import type { UIMessage } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { db } from "@/lib/db";
import { intakeSessions, intakeMessages } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { INTAKE_SYSTEM_PROMPT } from "@/lib/intake/system-prompt";
import { createIntakeTools } from "@/lib/intake/tools";
import { IntakePayload } from "@/lib/types/intake";

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
  const { id: sessionId } = await params;
  const { messages } = (await request.json()) as { messages: UIMessage[] };

  // Fetch session
  const session = await db.query.intakeSessions.findFirst({
    where: eq(intakeSessions.id, sessionId),
  });

  if (!session) {
    return new Response("Session not found", { status: 404 });
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

  // Current payload state
  let currentPayload = (session.intakePayload as IntakePayload) ?? {};

  // Create tools with payload access
  const tools = createIntakeTools(
    () => currentPayload,
    async (updater) => {
      currentPayload = updater(currentPayload);
      await db
        .update(intakeSessions)
        .set({ intakePayload: currentPayload, updatedAt: new Date() })
        .where(eq(intakeSessions.id, sessionId));
    }
  );

  // Convert UI messages to model messages for Claude
  const modelMessages = await convertToModelMessages(messages);

  // Stream response
  const result = streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: INTAKE_SYSTEM_PROMPT,
    messages: modelMessages,
    tools,
    stopWhen: stepCountIs(5),
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
}
