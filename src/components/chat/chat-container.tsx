"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { useEffect, useRef, useMemo, useCallback } from "react";
import { MessageBubble } from "./message-bubble";
import { ToolCallDisplay } from "./tool-call-display";
import { ChatInput } from "./chat-input";
import { ArrowRight } from "lucide-react";

const STREAMING_LABELS: Record<string, string> = {
  set_agent_identity:    "Defining agent identity…",
  add_tool:              "Capturing tool details…",
  set_instructions:      "Writing behavioral instructions…",
  add_governance_policy: "Recording governance policy…",
  set_constraints:       "Setting operational constraints…",
  finalize_requirements: "Finalizing requirements…",
};

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

  const { messages, sendMessage, status, error } = useChat({
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

  // Derive last tool call name from message history for context-aware streaming label
  const lastToolCallName = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const parts = messages[i].parts;
      for (let j = parts.length - 1; j >= 0; j--) {
        const part = parts[j];
        if (part.type.startsWith("tool-") && "toolCallId" in part) {
          return part.type.replace("tool-", "");
        }
      }
    }
    return null;
  }, [messages]);

  const streamingLabel = lastToolCallName
    ? (STREAMING_LABELS[lastToolCallName] ?? "Thinking…")
    : "Thinking…";

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
                  className="flex items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left text-sm text-gray-700 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 transition-colors"
                >
                  <span>{prompt}</span>
                  <ArrowRight size={13} className="shrink-0 text-gray-300 group-hover:text-violet-400" />
                </button>
              ))}
            </div>
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

        {error && !isStreaming && (
          <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            <span>Something went wrong. Check your connection and try again.</span>
          </div>
        )}

        {isStreaming && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-white border border-gray-200 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "300ms" }} />
                </div>
                <span className="text-xs text-gray-400">{streamingLabel}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <ChatInput onSend={handleSend} disabled={isStreaming} />
    </div>
  );
}
