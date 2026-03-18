"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ContributionDomain, StakeholderContribution } from "@/lib/types/intake";
import { Send } from "lucide-react";

const DOMAIN_LABELS: Record<ContributionDomain, string> = {
  compliance: "Compliance",
  risk: "Risk",
  legal: "Legal",
  security: "Security",
  it: "IT / Infrastructure",
  operations: "Operations",
  business: "Business",
};

interface Props {
  sessionId: string;
  domain: ContributionDomain;
  agentName?: string;
  /** If provided, use this URL instead of the default session-scoped route (for token-based public workspace). */
  chatApiUrl?: string;
  onSubmitted: (contribution: StakeholderContribution) => void;
  onCancel?: () => void;
}

export function StakeholderAIChat({
  sessionId,
  domain,
  agentName,
  chatApiUrl,
  onSubmitted,
  onCancel,
}: Props) {
  const [localInput, setLocalInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const submittedRef = useRef(false);
  const initSentRef = useRef(false);

  // Use provided chatApiUrl or fall back to the session-scoped default
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: chatApiUrl ?? `/api/intake/sessions/${sessionId}/stakeholder-chat?domain=${encodeURIComponent(domain)}`,
      }),
    [chatApiUrl, sessionId, domain]
  );

  const { messages, sendMessage, status } = useChat({ transport, id: `stakeholder-${sessionId}-${domain}` });

  const isLoading = status === "streaming" || status === "submitted";

  // Auto-send initial message to kick off the AI interview
  useEffect(() => {
    if (initSentRef.current) return;
    initSentRef.current = true;
    sendMessage({
      text: `I'm the ${DOMAIN_LABELS[domain]} stakeholder for ${agentName ?? "this agent"}. Ready to provide requirements.`,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Detect save_requirements tool call completion (AI SDK v6: parts use part.type = "tool-{name}", output directly on part)
  useEffect(() => {
    if (submittedRef.current) return;
    for (const msg of messages) {
      if (msg.role !== "assistant") continue;
      for (const part of msg.parts ?? []) {
        if (
          part.type === "tool-save_requirements" &&
          "output" in part &&
          (part as { output?: { success?: boolean } }).output?.success
        ) {
          submittedRef.current = true;
          const contribution = (part as { output?: { contribution?: StakeholderContribution } }).output
            ?.contribution as StakeholderContribution;
          setTimeout(() => onSubmitted(contribution), 600);
          return;
        }
      }
    }
  }, [messages, onSubmitted]);

  const isSaved = messages.some(
    (m) =>
      m.role === "assistant" &&
      (m.parts ?? []).some(
        (p) => p.type === "tool-save_requirements" && "output" in p
      )
  );

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!localInput.trim() || isLoading) return;
    sendMessage({ text: localInput });
    setLocalInput("");
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
          AI Interview · {DOMAIN_LABELS[domain]}
        </p>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-[10px] text-gray-400 hover:text-gray-600 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Chat thread */}
      <div className="flex max-h-72 flex-col gap-2 overflow-y-auto pr-0.5">
        {messages.map((m, i) => {
          // Tool invocation indicator (AI SDK v6: part.type = "tool-{name}", done = "output" in part)
          const toolPart = (m.parts ?? []).find(
            (p) => p.type.startsWith("tool-") && "toolCallId" in p
          );
          if (toolPart && "toolCallId" in toolPart) {
            const isDone = "output" in toolPart;
            return (
              <div
                key={i}
                className="flex items-center justify-center gap-1.5 py-1"
              >
                {!isDone ? (
                  <>
                    <span className="h-1 w-1 animate-pulse rounded-full bg-violet-400" />
                    <p className="text-[10px] text-violet-500">
                      Saving requirements…
                    </p>
                  </>
                ) : (
                  <>
                    <span className="text-[10px] text-green-500">✓</span>
                    <p className="text-[10px] font-medium text-green-600">
                      Requirements captured
                    </p>
                  </>
                )}
              </div>
            );
          }

          // Text message
          const text = (m.parts ?? [])
            .filter((p): p is { type: "text"; text: string } => p.type === "text")
            .map((p) => p.text)
            .join("");

          if (!text) return null;

          const isUser = m.role === "user";
          return (
            <div key={i} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[86%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                  isUser
                    ? "bg-violet-600 text-white"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {text}
              </div>
            </div>
          );
        })}

        {/* Thinking dots */}
        {isLoading && !isSaved && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1 rounded-xl bg-gray-100 px-3 py-2.5">
              <span
                className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400"
                style={{ animationDelay: "0ms" }}
              />
              <span
                className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400"
                style={{ animationDelay: "100ms" }}
              />
              <span
                className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400"
                style={{ animationDelay: "200ms" }}
              />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {!isSaved && (
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <input
            value={localInput}
            onChange={(e) => setLocalInput(e.target.value)}
            placeholder="Type your response…"
            disabled={isLoading}
            className="flex-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs placeholder-gray-300 focus:border-violet-300 focus:outline-none focus:ring-1 focus:ring-violet-400 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !localInput.trim()}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white transition-colors hover:bg-violet-700 disabled:opacity-40"
          >
            <Send size={11} />
          </button>
        </form>
      )}
    </div>
  );
}
