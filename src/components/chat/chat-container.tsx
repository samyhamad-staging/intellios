"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { useEffect, useRef, useMemo, useCallback } from "react";
import { MessageBubble } from "./message-bubble";
import { ToolCallDisplay } from "./tool-call-display";
import { ChatInput } from "./chat-input";
import { ArrowRight } from "lucide-react";
import type { IntakeTransparencyMetadata } from "@/lib/types/intake-transparency";

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
  onTransparencyUpdate?: (metadata: IntakeTransparencyMetadata) => void;
}

export function ChatContainer({
  sessionId,
  initialMessages,
  showSuggestedPrompts,
  onResponseComplete,
  onTransparencyUpdate,
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
      // Extract transparency metadata from the latest assistant message
      if (onTransparencyUpdate && messages.length > 0) {
        const lastMsg = messages[messages.length - 1];
        if (lastMsg.role === "assistant" && lastMsg.metadata) {
          onTransparencyUpdate(lastMsg.metadata as IntakeTransparencyMetadata);
        }
      }
    }
    prevStatus.current = status;
  }, [status, isStreaming, onResponseComplete, onTransparencyUpdate, messages]);

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

  // Only show domain tags once the AI has started capturing data (first tool call made).
  // Before that, activeDomain always falls back to "identity" on every message — which
  // looks broken rather than informative.
  const hasToolCalls = useMemo(
    () => messages.some((msg) =>
      msg.parts.some((part) => part.type.startsWith("tool-") && "toolCallId" in part)
    ),
    [messages]
  );

  const streamingLabel = lastToolCallName
    ? (STREAMING_LABELS[lastToolCallName] ?? "Thinking…")
    : "Thinking…";

  return (
    <div className="flex h-full flex-1 flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 flex flex-col justify-end min-h-0">
        {/* Spacer pushes messages to the bottom when content is short */}
        <div className="flex-1" />
        {isEmpty && showSuggestedPrompts ? (
          <div className="flex h-full flex-col items-center justify-center gap-6 px-4">
            <div className="text-center">
              <p className="text-base font-medium text-text">What kind of agent do you want to build?</p>
              <p className="mt-1 text-sm text-text-secondary">Choose a starting point or describe your own idea below.</p>
            </div>
            <div className="grid w-full max-w-lg grid-cols-2 gap-2">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSend(prompt)}
                  className="group flex items-center justify-between gap-2 rounded-xl border border-border bg-surface-raised px-4 py-3 text-left text-sm text-text-secondary hover:border-primary/40 hover:bg-primary/5 hover:text-text transition-colors"
                >
                  <span>{prompt}</span>
                  <ArrowRight size={13} className="shrink-0 text-text-tertiary group-hover:text-primary transition-colors" />
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
                  const state = "state" in part ? (part.state as string) : undefined;
                  const output = "output" in part ? part.output : undefined;
                  const errorText = "errorText" in part ? (part.errorText as string) : undefined;
                  return (
                    <div key={i} className="mb-2">
                      <ToolCallDisplay toolName={toolName} args={args} state={state} output={output} errorText={errorText} />
                    </div>
                  );
                }
                return null;
              })}
              {text && (
                <MessageBubble
                  role={msg.role as "user" | "assistant"}
                  content={text}
                  activeDomain={msg.role === "assistant" && msg.metadata && hasToolCalls ? (msg.metadata as Record<string, unknown>).activeDomain as string | null : undefined}
                />
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
            <div className="rounded-xl bg-surface-raised border border-border px-4 py-3">
              <div className="flex items-center gap-3">
                {/* Signal waveform indicator */}
                <div className="flex items-end gap-0.5 h-4">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="w-0.5 rounded-full bg-primary/60 animate-[signal-bar_1.2s_ease-in-out_infinite]"
                      style={{ animationDelay: `${i * 120}ms`, height: "8px", transformOrigin: "bottom" }}
                    />
                  ))}
                </div>
                <span className="text-2xs font-mono text-text-tertiary">{streamingLabel}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <ChatInput
        onSend={handleSend}
        disabled={isStreaming}
        placeholder={messages.length > 1 ? "Reply..." : "Describe your agent..."}
      />
    </div>
  );
}
