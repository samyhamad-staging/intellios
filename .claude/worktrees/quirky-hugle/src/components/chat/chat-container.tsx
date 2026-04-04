"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { useEffect, useRef, useMemo, useCallback, useState } from "react";
import { MessageBubble } from "./message-bubble";
import { ToolCallDisplay } from "./tool-call-display";
import { ChatInput, type FileAttachment } from "./chat-input";
import { ArrowRight, X, CheckCircle2 } from "lucide-react";
import type { IntakeTransparencyMetadata } from "@/lib/types/intake-transparency";
import type { SessionRecap } from "@/lib/types/intake";

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
  /** Injected message from parent (e.g. domain chip click). Keyed to avoid duplicates. */
  externalMessage?: { text: string; key: number } | null;
  /** Recap data shown to returning users — dismisses on first send */
  sessionRecap?: SessionRecap;
  /** Override default chat input placeholder */
  placeholder?: string;
}

export function ChatContainer({
  sessionId,
  initialMessages,
  showSuggestedPrompts,
  onResponseComplete,
  onTransparencyUpdate,
  externalMessage,
  sessionRecap,
  placeholder: placeholderOverride,
}: ChatContainerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevStatus = useRef<string | null>(null);

  // Welcome-back recap banner state — auto-dismisses on first user send
  const [showRecap, setShowRecap] = useState(true);

  // Track file uploads for session-level cost control
  const [filesUsedInSession, setFilesUsedInSession] = useState(0);
  const MAX_FILES_PER_SESSION = 3;
  const MAX_EMBED_CHARS = 4_000;

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

  // Track auto-generated navigation messages (domain chip clicks) so they can be
  // visually distinguished from user-typed messages in the chat history.
  const navigationMessages = useRef<Set<string>>(new Set());

  // Handle externally injected messages (e.g. domain chip click → "Let's focus on…")
  const lastExternalKey = useRef<number>(0);
  useEffect(() => {
    if (externalMessage && externalMessage.key !== lastExternalKey.current) {
      lastExternalKey.current = externalMessage.key;
      navigationMessages.current.add(externalMessage.text);
      sendMessage({ text: externalMessage.text });
    }
  }, [externalMessage, sendMessage]);

  const handleSend = useCallback(
    (text: string, attachment?: FileAttachment) => {
      setShowRecap(false); // Dismiss recap on first user message
      let fullText = text;
      if (attachment) {
        const truncNote = attachment.truncated
          ? ` (truncated to ${MAX_EMBED_CHARS.toLocaleString()} characters to control cost)`
          : "";
        const userNote = text === "(see attached file)"
          ? "Please read this file and continue our conversation with it in mind."
          : text;
        fullText =
          `[Attached file: ${attachment.name}${truncNote}]\n\`\`\`\n${attachment.content}\n\`\`\`\n\n${userNote}`;
        setFilesUsedInSession((prev) => prev + 1);
      }
      sendMessage({ text: fullText });
    },
    [sendMessage, MAX_EMBED_CHARS]
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

  // Deduplicate domain tags: only show when the active domain CHANGES from the previous
  // AI message. Consecutive messages in the same domain don't need the tag repeated —
  // the header strip already communicates the current domain.
  const domainTagByMessageId = useMemo(() => {
    const map = new Map<string, string | null>();
    if (!hasToolCalls) return map;
    let lastShownDomain: string | null = null;
    for (const msg of messages) {
      if (msg.role !== "assistant" || !msg.metadata) continue;
      const domain = ((msg.metadata as Record<string, unknown>).activeDomain as string | null) ?? null;
      if (domain && domain !== lastShownDomain) {
        map.set(msg.id, domain);
        lastShownDomain = domain;
      }
    }
    return map;
  }, [messages, hasToolCalls]);

  const streamingLabel = lastToolCallName
    ? (STREAMING_LABELS[lastToolCallName] ?? "Thinking…")
    : "Thinking…";

  return (
    <div className="flex h-full flex-1 flex-col">
      {/*
        Scroll container is intentionally separate from the flex-col layout.
        Combining overflow-y-auto with justify-end on the same element causes
        top-overflow that cannot be scrolled to. Instead: outer div scrolls,
        inner div is min-h-full flex-col so messages anchor to the bottom while
        still allowing full upward scroll when history grows.
      */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0">
        <div className="flex min-h-full flex-col p-4 space-y-3 max-w-4xl mx-auto w-full">
          {/* Empty / suggested prompts state: takes full available height, centers content */}
          {isEmpty && showSuggestedPrompts ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4">
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
          ) : (
            /* Spacer pushes messages to the bottom when history is short */
            <div className="flex-1" />
          )}

          {/* Session recap banner for returning users (G1) */}
          {sessionRecap && showRecap && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 mb-2 relative">
              <button
                onClick={() => setShowRecap(false)}
                className="absolute top-2 right-2 p-1 rounded hover:bg-primary/10 text-text-tertiary hover:text-text-secondary transition-colors"
                title="Dismiss"
              >
                <X size={14} />
              </button>
              <p className="text-xs font-medium text-text mb-1.5">
                Welcome back{sessionRecap.agentName ? ` \u2014 ${sessionRecap.agentName}` : ""}
              </p>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-2xs text-text-secondary">
                  {sessionRecap.filledDomains.length} of {sessionRecap.totalDomains} domains captured
                </span>
                <div className="h-1 flex-1 max-w-24 rounded-full bg-border overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary/60 transition-all duration-500"
                    style={{ width: `${(sessionRecap.filledDomains.length / sessionRecap.totalDomains) * 100}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-1 flex-wrap text-2xs text-text-tertiary">
                {sessionRecap.filledDomains.map((d) => (
                  <span key={d} className="inline-flex items-center gap-0.5">
                    <CheckCircle2 size={10} className="text-emerald-500" />
                    <span>{d}</span>
                  </span>
                ))}
                {sessionRecap.nextDomain && (
                  <>
                    <span className="mx-1 text-border-strong">|</span>
                    <span className="text-text-secondary font-medium">Next: {sessionRecap.nextDomain}</span>
                  </>
                )}
              </div>
            </div>
          )}

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
                  activeDomain={msg.role === "assistant" ? (domainTagByMessageId.get(msg.id) ?? undefined) : undefined}
                  isNavigation={msg.role === "user" && navigationMessages.current.has(text)}
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
        </div> {/* end inner flex-col */}
      </div>  {/* end scroll container */}

      <ChatInput
        onSend={handleSend}
        disabled={isStreaming}
        placeholder={placeholderOverride ?? (messages.length > 1 ? "Reply..." : "Describe your agent...")}
        filesUsedInSession={filesUsedInSession}
        maxFilesPerSession={MAX_FILES_PER_SESSION}
      />
    </div>
  );
}
