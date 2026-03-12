"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { useEffect, useRef, useMemo, useCallback } from "react";
import { MessageBubble } from "./message-bubble";
import { ToolCallDisplay } from "./tool-call-display";
import { ChatInput } from "./chat-input";

const SUGGESTED_PROMPTS = [
  "I want to build a customer support agent",
  "I need an internal knowledge base assistant",
  "Help me design a data analysis and reporting agent",
  "I want an email and calendar automation agent",
];

interface ChatContainerProps {
  sessionId: string;
  initialMessages?: UIMessage[];
  showSuggestedPrompts?: boolean;
  onResponseComplete?: () => void;
}

export function ChatContainer({
  sessionId,
  initialMessages,
  showSuggestedPrompts,
  onResponseComplete,
}: ChatContainerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevStatus = useRef<string | null>(null);

  const transport = useMemo(
    () => new DefaultChatTransport({ api: `/api/intake/sessions/${sessionId}/chat` }),
    [sessionId]
  );

  const { messages, sendMessage, status } = useChat({
    transport,
    id: sessionId,
    messages: initialMessages,
  });

  const isStreaming = status === "streaming" || status === "submitted";

  useEffect(() => {
    const wasStreaming =
      prevStatus.current === "streaming" || prevStatus.current === "submitted";
    const isDone = !isStreaming;
    if (wasStreaming && isDone) {
      onResponseComplete?.();
    }
    prevStatus.current = status;
  }, [status, isStreaming, onResponseComplete]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const handleSend = useCallback(
    (text: string) => {
      sendMessage({ text });
    },
    [sendMessage]
  );

  function getMessageText(parts: (typeof messages)[0]["parts"]): string {
    return parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("");
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-full flex-1 flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {isEmpty && showSuggestedPrompts ? (
          <div className="flex h-full flex-col items-center justify-center gap-6 px-4">
            <div className="text-center">
              <p className="text-base font-medium text-gray-700">What kind of agent do you want to build?</p>
              <p className="mt-1 text-sm text-gray-400">Choose a starting point or describe your own idea below.</p>
            </div>
            <div className="grid w-full max-w-lg grid-cols-2 gap-2">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSend(prompt)}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-left text-sm text-gray-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : isEmpty ? (
          <div className="flex h-full items-center justify-center text-gray-400 text-sm">
            Start by describing the agent you want to build.
          </div>
        ) : null}

        {messages.map((msg) => {
          const text = getMessageText(msg.parts);
          return (
            <div key={msg.id}>
              {msg.parts.map((part, i) => {
                if (part.type.startsWith("tool-") && "toolCallId" in part) {
                  const toolName = part.type.replace("tool-", "");
                  const args =
                    "input" in part ? (part.input as Record<string, unknown>) : {};
                  return (
                    <div key={i} className="mb-2">
                      <ToolCallDisplay toolName={toolName} args={args} />
                    </div>
                  );
                }
                return null;
              })}
              {text && (
                <MessageBubble role={msg.role as "user" | "assistant"} content={text} />
              )}
            </div>
          );
        })}

        {isStreaming && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-white border border-gray-200 px-4 py-3">
              <div className="flex gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "0ms" }} />
                <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "150ms" }} />
                <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      <ChatInput onSend={handleSend} disabled={isStreaming} />
    </div>
  );
}
