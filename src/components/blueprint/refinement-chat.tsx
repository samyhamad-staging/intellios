"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useMemo } from "react";
import { MessageBubble } from "@/components/chat/message-bubble";
import { ChatInput } from "@/components/chat/chat-input";
import { ABP } from "@/lib/types/abp";

interface Props {
  blueprintId: string;
  onBlueprintUpdated: (abp: ABP) => void;
}

export function RefinementChat({ blueprintId, onBlueprintUpdated }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () => new DefaultChatTransport({ api: `/api/blueprints/${blueprintId}/refine/stream` }),
    [blueprintId]
  );

  const prevStatus = useRef<string | null>(null);

  const { messages, sendMessage, status, error } = useChat({
    transport,
    id: `refinement-${blueprintId}`,
  });

  // After each streaming completion, fetch the updated blueprint from the server
  useEffect(() => {
    const wasStreaming =
      prevStatus.current === "streaming" || prevStatus.current === "submitted";
    const isDone = status !== "streaming" && status !== "submitted";
    if (wasStreaming && isDone && !error) {
      fetch(`/api/blueprints/${blueprintId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.abp) onBlueprintUpdated(data.abp as ABP);
        })
        .catch(() => {}); // non-critical
    }
    prevStatus.current = status;
  }, [status, error, blueprintId, onBlueprintUpdated]);

  const isStreaming = status === "streaming" || status === "submitted";

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, isStreaming]);

  const visibleMessages = messages.slice(-20);
  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Message history */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0"
        style={{ maxHeight: "360px" }}
      >
        {!hasMessages && (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-gray-400 text-center">
              Describe a change and Claude will refine the blueprint.
              <br />
              <span className="text-xs">e.g. &ldquo;Add a rate limit of 50 requests per minute&rdquo;</span>
            </p>
          </div>
        )}

        {visibleMessages.map((msg) => {
          const textContent = msg.parts
            .filter((p): p is { type: "text"; text: string } => p.type === "text")
            .map((p) => p.text)
            .join("");

          if (!textContent && msg.role !== "user") return null;

          return (
            <MessageBubble
              key={msg.id}
              role={msg.role === "user" ? "user" : "assistant"}
              content={textContent}
            />
          );
        })}

        {/* Streaming indicator */}
        {isStreaming && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 rounded-2xl border border-gray-200 bg-white px-4 py-3">
              <span className="text-xs text-gray-400">Refining</span>
              <span className="flex gap-0.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="inline-block h-1.5 w-1.5 rounded-full bg-violet-400 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </span>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && !isStreaming && (
          <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            <span>Refinement failed. Check your connection and try again.</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0">
        <ChatInput
          onSend={(message) => sendMessage({ text: message })}
          disabled={isStreaming}
          placeholder="Describe a change to apply…"
        />
      </div>
    </div>
  );
}
