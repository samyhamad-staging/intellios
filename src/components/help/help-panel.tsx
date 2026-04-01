"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { HelpCircle, X, Trash2, ArrowRight } from "lucide-react";
import { MessageBubble } from "@/components/chat/message-bubble";

// Suggested questions: keyed by pathname prefix, then role.
// Falls back to role-level default, then global fallback.
const SUGGESTED_QUESTIONS: Record<string, Record<string, string[]>> = {
  "/intake": {
    architect: [
      "What makes a strong agent description?",
      "Why do stakeholders need to add input?",
      "What happens after I finalize intake?",
      "What does CRITICAL risk mean for my agent?",
    ],
  },
  "/blueprints": {
    architect: [
      "How do I fix a governance violation?",
      "What should behavioral instructions include?",
      "When can I submit for review?",
      "What happens after I submit for review?",
    ],
  },
  "/review": {
    reviewer: [
      "What criteria should I use to approve a blueprint?",
      "When should I request changes vs. reject?",
      "What does the validation report show?",
      "What is a risk tier and why does it matter?",
    ],
  },
  "/governance": {
    compliance_officer: [
      "How do I write an effective policy rule?",
      "Which risk tiers does a policy apply to?",
      "What triggers a periodic review?",
      "How does a policy violation get flagged?",
    ],
  },
  "/compliance": {
    compliance_officer: [
      "What is the governance quality index?",
      "How do I interpret the violation rate?",
      "Which agents need remediation?",
      "What does a health_degraded alert mean?",
    ],
  },
  "/admin/settings": {
    admin: [
      "How does multi-step approval work?",
      "What does the notification admin email do?",
      "How do I connect AgentCore?",
      "What is the periodic review schedule?",
    ],
  },
  "/admin/users": {
    admin: [
      "How do I add a new team member?",
      "What can each role do in Intellios?",
      "Can I change a user's role after creation?",
      "What is the difference between designer and reviewer?",
    ],
  },
  "/": {
    architect: [
      "How do I start creating a new agent?",
      "What information do I need to define an agent?",
      "How does the blueprint generation process work?",
      "What happens after I submit a blueprint for review?",
    ],
    reviewer: [
      "How do I find blueprints waiting for my review?",
      "What should I look for when reviewing a blueprint?",
      "What is the difference between approving and requesting changes?",
      "What does the validation report tell me?",
    ],
    compliance_officer: [
      "Where do I write governance policies?",
      "How do I monitor compliance across all agents?",
      "What does the Quality Index measure?",
      "Which agents are at risk of a health_degraded alert?",
    ],
    admin: [
      "What does the Quality Index measure?",
      "How do I configure the approval workflow?",
      "What are the different risk tiers?",
      "How do I invite team members?",
    ],
  },
};

const FALLBACK_QUESTIONS: Record<string, string[]> = {
    architect: [
    "How do I start creating a new agent?",
    "What is an Agent Blueprint Package?",
    "How does the agent governance lifecycle work?",
    "What does a governance violation mean for my blueprint?",
  ],
  reviewer: [
    "How do I find blueprints waiting for my review?",
    "What is an Agent Blueprint Package?",
    "How does the agent governance lifecycle work?",
    "What is a risk tier and why does it matter?",
  ],
  compliance_officer: [
    "What is an Agent Blueprint Package?",
    "How does the agent governance lifecycle work?",
    "What is the difference between risk tiers?",
    "How does governance validation work?",
  ],
  admin: [
    "What is an Agent Blueprint Package?",
    "How does the agent governance lifecycle work?",
    "What is the difference between risk tiers?",
    "How does governance validation work?",
  ],
};

function getSuggestions(pathname: string, role: string): string[] {
  const sortedKeys = Object.keys(SUGGESTED_QUESTIONS).sort(
    (a, b) => b.length - a.length
  );

  for (const key of sortedKeys) {
    if (key === "/" ? pathname === "/" : pathname.startsWith(key)) {
      const byRole = SUGGESTED_QUESTIONS[key];
      if (byRole[role]) return byRole[role];
    }
  }

  return FALLBACK_QUESTIONS[role] ?? FALLBACK_QUESTIONS.admin;
}

function getMessageText(
  parts: { type: string; text?: string }[]
): string {
  return parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

interface HelpPanelProps {
  role: string;
}

function extractAction(
  parts: { type: string; [key: string]: unknown }[]
): { label: string; href: string; description: string } | null {
  for (const part of parts) {
    if (part.type === "tool-suggest_action" && "input" in part) {
      const input = part.input as {
        label?: string;
        href?: string;
        description?: string;
      } | undefined | null;
      if (input && input.label && input.href && input.description) {
        return {
          label: input.label,
          href: input.href,
          description: input.description,
        };
      }
    }
  }
  return null;
}

export function HelpPanel({ role }: HelpPanelProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/help/chat",
        body: { pathname },
      }),
    [pathname]
  );

  const { messages, sendMessage, status, setMessages } = useChat({
    transport,
    id: "help",
  });

  const isStreaming = status === "streaming" || status === "submitted";
  const isEmpty = messages.length === 0;
  const suggestions = getSuggestions(pathname, role);

  // Escape key to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Auto-scroll to latest message
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const handleSend = useCallback(
    (text: string) => {
      if (!text.trim() || isStreaming) return;
      sendMessage({ text: text.trim() });
      setInput("");
    },
    [sendMessage, isStreaming]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend(input);
      }
    },
    [input, handleSend]
  );

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        title="Help & guidance"
        aria-label="Help"
        className="rounded p-1 transition-colors hover:bg-white/10"
        style={{ color: "var(--sidebar-text)" }}
      >
        <HelpCircle size={13} />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div className="fixed right-0 top-0 z-50 h-full w-[400px] bg-white border-l border-gray-200 shadow-xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <HelpCircle size={15} className="text-violet-500" />
                <span className="text-sm font-semibold text-gray-800">
                  Ask Intellios
                </span>
              </div>
              <div className="flex items-center gap-1">
                {!isEmpty && (
                  <button
                    onClick={() => setMessages([])}
                    title="Clear conversation"
                    aria-label="Clear conversation"
                    className="rounded p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close help panel"
                  className="rounded p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
              {isEmpty ? (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-gray-400 mb-1">
                    Suggested for this page
                  </p>
                  {suggestions.map((q) => (
                    <button
                      key={q}
                      onClick={() => handleSend(q)}
                      className="text-left text-sm text-gray-700 bg-gray-50 hover:bg-violet-50 hover:text-violet-700 rounded-lg px-3 py-2.5 border border-gray-200 hover:border-violet-200 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {messages.map((msg) => {
                    const text = getMessageText(
                      msg.parts as { type: string; text?: string }[]
                    );
                    const action = msg.role === "assistant"
                      ? extractAction(msg.parts as { type: string; [key: string]: unknown }[])
                      : null;
                    if (!text && !action) return null;
                    return (
                      <div key={msg.id} className="flex flex-col gap-2">
                        {text && (
                          <MessageBubble
                            role={msg.role as "user" | "assistant"}
                            content={text}
                          />
                        )}
                        {action && (
                          <div className="flex justify-start">
                            <button
                              onClick={() => {
                                router.push(action.href);
                                setOpen(false);
                              }}
                              className="flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-left hover:bg-violet-100 hover:border-violet-300 transition-colors"
                            >
                              <div className="flex-1">
                                <p className="text-sm font-medium text-violet-700">
                                  {action.label}
                                </p>
                                <p className="text-xs text-violet-500 mt-0.5">
                                  {action.description}
                                </p>
                              </div>
                              <ArrowRight size={14} className="shrink-0 text-violet-400" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {isStreaming && (
                    <div className="flex justify-start">
                      <div className="rounded-2xl bg-white border border-gray-200 px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400"
                            style={{ animationDelay: "0ms" }}
                          />
                          <span
                            className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400"
                            style={{ animationDelay: "150ms" }}
                          />
                          <span
                            className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400"
                            style={{ animationDelay: "300ms" }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer input */}
            <div className="border-t border-gray-100 p-3">
              <div className="flex gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything about Intellios…"
                  rows={2}
                  disabled={isStreaming}
                  className="flex-1 resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400 disabled:opacity-50"
                />
                <button
                  onClick={() => handleSend(input)}
                  disabled={!input.trim() || isStreaming}
                  className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-40 self-end transition-colors"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
