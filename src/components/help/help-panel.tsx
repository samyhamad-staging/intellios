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
  "/registry": {
    architect: [
      "How do I create a new orchestration?",
      "What is the difference between an agent and an orchestration?",
      "How do handoff rules work in orchestrations?",
      "What agents need to be approved before I can orchestrate?",
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

// P2-595: Live page context provided by pages via custom browser event
interface HelpPageContext {
  agentName?: string;
  blueprintStatus?: string;
  violationCount?: number;
}

interface HelpPanelProps {
  role: string;
  /**
   * "icon"  (default) — compact icon-only button for embedding in tight spaces.
   * "row"             — full-width labeled row styled like a nav item, for sidebar placement.
   */
  variant?: "icon" | "row";
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

export function HelpPanel({ role, variant = "icon" }: HelpPanelProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  // P2-595: Live context from the current page
  const [pageContext, setPageContext] = useState<HelpPageContext | null>(null);

  // P2-595: Listen for context updates dispatched by pages
  useEffect(() => {
    function handleContextUpdate(e: CustomEvent<HelpPageContext>) {
      setPageContext(e.detail ?? null);
    }
    window.addEventListener("intellios:help-context", handleContextUpdate as EventListener);
    // Clear context when the pathname changes (navigated away)
    return () => {
      window.removeEventListener("intellios:help-context", handleContextUpdate as EventListener);
    };
  }, []);

  // Clear stale page context on pathname changes
  useEffect(() => { setPageContext(null); }, [pathname]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/help/chat",
        body: { pathname, pageContext },
      }),
    [pathname, pageContext]
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
      {/* Trigger — "icon" variant: compact icon button for sidebar footer / tight spaces */}
      {variant === "icon" && (
        <button
          onClick={(e) => { e.stopPropagation(); setOpen(true); }}
          title="Ask Intellios"
          aria-label="Ask Intellios"
          className="rounded p-1 transition-colors hover:bg-white/10"
          style={{ color: "var(--sidebar-text)" }}
        >
          <HelpCircle size={13} />
        </button>
      )}

      {/* Trigger — "row" variant: full-width labeled nav-style row */}
      {variant === "row" && (
        <button
          onClick={(e) => { e.stopPropagation(); setOpen(true); }}
          className="group flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-sm font-medium transition-colors hover:bg-white/10"
          style={{ color: "var(--sidebar-text)" }}
        >
          <HelpCircle size={16} className="shrink-0 opacity-70 group-hover:opacity-100" />
          <span className="flex-1 text-left">Ask Intellios</span>
          {/* Subtle AI indicator */}
          <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none bg-violet-500/20 text-violet-300">
            AI
          </span>
        </button>
      )}

      {open && (
        <>
          {/* W-10: Semi-transparent backdrop so users can see (but not interact with) main content.
              W-12: Use onMouseDown so the backdrop close does not race with the trigger open. */}
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onMouseDown={() => setOpen(false)}
          />

          {/* Panel — W-10: fixed overlay that does not reflow the main content */}
          <div className="fixed right-0 top-0 z-50 h-full w-[400px] bg-surface border-l border-border shadow-xl flex flex-col">
            {/* Header */}
            <div className="border-b border-border-subtle">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <HelpCircle size={15} className="text-violet-500" />
                  <span className="text-sm font-semibold text-text">
                    Ask Intellios
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {!isEmpty && (
                    <button
                      onClick={() => setMessages([])}
                      title="Clear conversation"
                      aria-label="Clear conversation"
                      className="rounded p-1 text-text-tertiary hover:text-text-secondary hover:bg-surface-raised transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                  <button
                    onClick={() => setOpen(false)}
                    aria-label="Close help panel"
                    className="rounded p-1 text-text-tertiary hover:text-text-secondary hover:bg-surface-raised transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
              {/* P2-595: Live context strip — shown when a page provides context */}
              {pageContext && (pageContext.agentName || pageContext.blueprintStatus) && (
                <div className="flex items-center gap-1.5 flex-wrap px-4 py-1.5 bg-violet-50 border-t border-violet-100">
                  <span className="text-2xs text-violet-400 font-medium">Context:</span>
                  {pageContext.agentName && (
                    <span className="rounded-full bg-violet-100 px-2 py-0.5 text-2xs text-violet-700 font-medium">
                      {pageContext.agentName}
                    </span>
                  )}
                  {pageContext.blueprintStatus && (
                    <span className="rounded-full bg-surface-muted px-2 py-0.5 text-2xs text-text-secondary font-medium">
                      {pageContext.blueprintStatus}
                    </span>
                  )}
                  {pageContext.violationCount !== undefined && pageContext.violationCount > 0 && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-2xs text-red-700 font-medium">
                      {pageContext.violationCount} violation{pageContext.violationCount !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Body */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
              {isEmpty ? (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-text-tertiary mb-1">
                    Suggested for this page
                  </p>
                  {suggestions.map((q) => (
                    <button
                      key={q}
                      onClick={() => handleSend(q)}
                      className="text-left text-sm text-text bg-surface-raised hover:bg-violet-50 hover:text-violet-700 rounded-lg px-3 py-2.5 border border-border hover:border-violet-200 transition-colors"
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
                      <div className="rounded-2xl bg-surface border border-border px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-tertiary"
                            style={{ animationDelay: "0ms" }}
                          />
                          <span
                            className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-secondary"
                            style={{ animationDelay: "150ms" }}
                          />
                          <span
                            className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-secondary"
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
            <div className="border-t border-border-subtle p-3">
              <div className="flex gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything about Intellios…"
                  rows={2}
                  disabled={isStreaming}
                  className="flex-1 resize-none rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400 disabled:opacity-50"
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
