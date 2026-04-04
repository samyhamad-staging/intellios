"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { useEffect, useRef, useMemo, useCallback } from "react";
import { MessageBubble } from "@/components/chat/message-bubble";
import { ChatInput } from "@/components/chat/chat-input";
import { Sparkles, ArrowRight, Copy, Check, Trash2 } from "lucide-react";
import { useState } from "react";

// ── Suggested prompts for empty state ─────────────────────────────────────────

const BASE_COMPANION_PROMPTS = [
  "What should I improve first?",
  "Explain the governance violations",
  "Is this blueprint ready for review?",
  "Suggest improvements to the instructions",
];

const VIOLATION_PROMPTS = [
  "Explain the governance violations",
  "How do I fix the failing policies?",
  "Which violation should I address first?",
  "What should I improve first?",
];

const QUALITY_PROMPTS = [
  "How can I improve the quality score?",
  "Which dimension needs the most work?",
  "What should I improve first?",
  "Is this blueprint ready for review?",
];

/**
 * Returns a context-ranked list of suggested prompts based on the blueprint's
 * current validation and quality state. If violations exist, governance-focused
 * prompts appear first. If quality is low, quality-improvement prompts lead.
 * Falls back to the default set when no context is available.
 */
function getRankedPrompts(violationCount: number | null, qualityScore: number | null): string[] {
  if (violationCount !== null && violationCount > 0) return VIOLATION_PROMPTS;
  if (qualityScore !== null && qualityScore < 3.0) return QUALITY_PROMPTS;
  return BASE_COMPANION_PROMPTS;
}

// ── Suggested Change Card ─────────────────────────────────────────────────────

interface SuggestedChange {
  section: string;
  summary: string;
  refinementPrompt: string;
  rationale: string;
  priority: "high" | "medium" | "low";
}

function SuggestChangeCard({
  change,
  onApply,
}: {
  change: SuggestedChange;
  onApply: (prompt: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const priorityColor =
    change.priority === "high"
      ? "border-red-200 bg-red-50"
      : change.priority === "medium"
        ? "border-amber-200 bg-amber-50"
        : "border-blue-200 bg-blue-50";

  const priorityLabel =
    change.priority === "high"
      ? "text-red-700"
      : change.priority === "medium"
        ? "text-amber-700"
        : "text-blue-700";

  function handleCopy() {
    navigator.clipboard.writeText(change.refinementPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className={`rounded-lg border ${priorityColor} p-3 my-2 text-sm`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles size={12} className="text-violet-500 shrink-0 mt-0.5" />
          <span className="font-medium text-gray-900">{change.summary}</span>
        </div>
        <span
          className={`text-2xs font-semibold uppercase ${priorityLabel} shrink-0`}
        >
          {change.priority}
        </span>
      </div>
      <p className="mt-1.5 text-xs text-gray-600 ml-5">{change.rationale}</p>
      <div className="mt-2 ml-5 flex items-center gap-2">
        <button
          onClick={() => onApply(change.refinementPrompt)}
          className="inline-flex items-center gap-1.5 rounded-md bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700 transition-colors"
        >
          <ArrowRight size={11} />
          Apply Change
        </button>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

// ── Companion Chat Component ──────────────────────────────────────────────────

interface CompanionChatProps {
  blueprintId: string;
  onApplyChange: (refinementPrompt: string) => void;
  /** Number of active governance violations — used to rank suggested prompts */
  violationCount?: number | null;
  /** Blueprint quality score (0–5 scale) — used to rank suggested prompts */
  qualityScore?: number | null;
}

export function CompanionChat({
  blueprintId,
  onApplyChange,
  violationCount = null,
  qualityScore = null,
}: CompanionChatProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const HISTORY_KEY = `companion-history-${blueprintId}`;

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `/api/blueprints/${blueprintId}/companion/chat`,
      }),
    [blueprintId]
  );

  // P1-30: Load persisted conversation on mount so returning architects keep context
  const [initialMsgs] = useState<UIMessage[]>(() => {
    try {
      const raw = localStorage.getItem(`companion-history-${blueprintId}`);
      return raw ? (JSON.parse(raw) as UIMessage[]) : [];
    } catch { return []; }
  });

  const { messages, sendMessage, status } = useChat({
    transport,
    id: `companion-${blueprintId}`,
    initialMessages: initialMsgs,
  });

  // P1-30: Persist conversation to localStorage on every message change
  useEffect(() => {
    try {
      if (messages.length > 0) localStorage.setItem(HISTORY_KEY, JSON.stringify(messages));
    } catch { /* storage quota — ignore */ }
  }, [messages, HISTORY_KEY]);

  function handleClearHistory() {
    try { localStorage.removeItem(HISTORY_KEY); } catch { /* ignore */ }
    // useChat state can only be reset by remounting — reload the page
    window.location.reload();
  }

  const isStreaming = status === "streaming" || status === "submitted";

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

  function getMessageText(parts: UIMessage["parts"]): string {
    return parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("");
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3">
        <Sparkles size={14} className="text-violet-500" />
        <span className="text-xs font-semibold text-gray-700">
          Blueprint Companion
        </span>
        <span className="text-2xs text-gray-400">AI Design Partner</span>
        {messages.length > 0 && (
          <button
            onClick={handleClearHistory}
            title="Clear conversation history"
            className="ml-auto text-gray-300 hover:text-gray-500 transition-colors"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-2">
            <div className="text-center">
              <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-violet-100">
                <Sparkles size={14} className="text-violet-600" />
              </div>
              <p className="text-sm font-medium text-gray-700">
                Ask me about this blueprint
              </p>
              <p className="mt-0.5 text-xs text-gray-400">
                I know its content, governance, and original requirements.
              </p>
            </div>
            {violationCount !== null && violationCount > 0 && (
              <p className="text-2xs text-red-600 font-medium mb-1">
                {violationCount} governance violation{violationCount !== 1 ? "s" : ""} detected — governance prompts ranked first
              </p>
            )}
            {(violationCount === null || violationCount === 0) && qualityScore !== null && qualityScore < 3.0 && (
              <p className="text-2xs text-amber-600 font-medium mb-1">
                Quality score {qualityScore.toFixed(1)}/5.0 — quality prompts ranked first
              </p>
            )}
            <div className="w-full space-y-1.5">
              {getRankedPrompts(violationCount, qualityScore).map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSend(prompt)}
                  className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-xs text-gray-600 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 transition-colors"
                >
                  <span>{prompt}</span>
                  <ArrowRight
                    size={11}
                    className="shrink-0 text-gray-300"
                  />
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {messages.map((msg) => {
          const text = getMessageText(msg.parts);
          return (
            <div key={msg.id}>
              {/* Render tool results as SuggestChangeCards */}
              {msg.parts.map((part, i) => {
                if (part.type.startsWith("tool-") && "toolCallId" in part) {
                  // Check if this is a suggest_change tool result
                  const toolName = part.type.replace("tool-", "");
                  if (
                    toolName === "suggest_change" &&
                    "result" in part &&
                    part.result
                  ) {
                    return (
                      <SuggestChangeCard
                        key={i}
                        change={part.result as unknown as SuggestedChange}
                        onApply={onApplyChange}
                      />
                    );
                  }
                  return null;
                }
                return null;
              })}
              {text && (
                <MessageBubble
                  role={msg.role as "user" | "assistant"}
                  content={text}
                />
              )}
            </div>
          );
        })}

        {isStreaming && (
          <div className="flex justify-start">
            <div className="rounded-2xl border border-gray-200 bg-white px-3 py-2.5">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <span
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400"
                    style={{ animationDelay: "0ms" }}
                  />
                  <span
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
                <span className="text-xs text-gray-400">Analyzing…</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <CompanionInput onSend={handleSend} disabled={isStreaming} />
    </div>
  );
}

// ── Compact chat input for the companion panel ────────────────────────────────

function CompanionInput({
  onSend,
  disabled,
}: {
  onSend: (text: string) => void;
  disabled: boolean;
}) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleSend() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleInput() {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    }
  }

  return (
    <div className="flex items-end gap-1.5 border-t border-gray-200 bg-white px-3 py-2.5">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        placeholder="Ask about this blueprint…"
        disabled={disabled}
        rows={1}
        className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-xs outline-none focus:border-violet-400 disabled:opacity-50"
      />
      <button
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        className="rounded-lg bg-violet-600 px-3 py-2 text-xs text-white hover:bg-violet-700 disabled:opacity-50"
      >
        Send
      </button>
    </div>
  );
}
