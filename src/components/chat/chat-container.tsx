"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useMemo } from "react";
import { MessageBubble } from "./message-bubble";
import { ToolCallDisplay } from "./tool-call-display";
import { ChatInput } from "./chat-input";

interface ChatContainerProps {
  sessionId: string;
}

export function ChatContainer({ sessionId }: ChatContainerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () => new DefaultChatTransport({ api: `/api/intake/sessions/${sessionId}/chat` }),
    [sessionId]
  );

  const { messages, sendMessage, status } = useChat({
    transport,
    id: sessionId,
  });

  const isStreaming = status === "streaming" || status === "submitted";

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  function handleSend(text: string) {
    sendMessage({ text });
  }

  // Extract text from message parts
  function getMessageText(parts: typeof messages[0]["parts"]): string {
    return parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("");
  }

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center text-gray-400 text-sm">
            Start by describing the agent you want to build.
          </div>
        )}
        {messages.map((msg) => {
          const text = getMessageText(msg.parts);
          return (
            <div key={msg.id}>
              {/* Show tool invocations */}
              {msg.parts.map((part, i) => {
                // Handle tool parts (type starts with "tool-" for static tools)
                if (part.type.startsWith("tool-") && "toolCallId" in part) {
                  const toolName = part.type.replace("tool-", "");
                  const args = "input" in part ? (part.input as Record<string, unknown>) : {};
                  return (
                    <div key={i} className="mb-2">
                      <ToolCallDisplay toolName={toolName} args={args} />
                    </div>
                  );
                }
                return null;
              })}
              {/* Show text content */}
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

      {/* Input */}
      <ChatInput onSend={handleSend} disabled={isStreaming} />
    </div>
  );
}
