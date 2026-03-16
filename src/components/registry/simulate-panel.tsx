"use client";

/**
 * Agent Playground — SimulatePanel component.
 * Phase 40: live sandbox chat powered by the blueprint's simulation system prompt.
 *
 * Messages are kept client-side only (stateless sandbox).
 * Uses useChat() from @ai-sdk/react with DefaultChatTransport from ai.
 */

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useRef, useEffect, useMemo, useState, useCallback } from "react";
import { MessageBubble } from "@/components/chat/message-bubble";
import { ChatInput } from "@/components/chat/chat-input";
import { RedTeamPanel } from "./red-team-panel";

interface SimulatePanelProps {
  blueprintId: string;
  agentName: string | null;
  version: string;
}

// Inner component keyed externally so "Clear" fully remounts the chat state
function SimulatePanelInner({
  blueprintId,
  agentName,
  version,
  onClear,
}: SimulatePanelProps & { onClear: () => void }) {
  const isFirstMessage = useRef(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `/api/blueprints/${blueprintId}/simulate/chat`,
        // Inject firstMessage flag on the very first send so the API writes the audit entry
        fetch: async (url: URL | RequestInfo, options?: RequestInit) => {
          if (isFirstMessage.current && options?.body) {
            const body = JSON.parse(options.body as string) as Record<string, unknown>;
            body.firstMessage = true;
            isFirstMessage.current = false;
            return fetch(url, { ...options, body: JSON.stringify(body) });
          }
          return fetch(url, options);
        },
      }),
    [blueprintId]
  );

  const { messages, sendMessage, status } = useChat({
    transport,
    id: blueprintId,
  });

  const isLoading = status === "streaming" || status === "submitted";

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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

  const displayName = agentName ?? `Agent ${blueprintId.slice(0, 8)}`;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-gray-100 bg-gray-50 px-5 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">
              Simulating: <span className="text-violet-700">{displayName}</span>
              <span className="ml-1.5 text-xs font-normal text-gray-400">v{version}</span>
            </p>
            <p className="mt-0.5 text-xs text-gray-400">
              Sandbox — agent cannot access real systems
            </p>
          </div>
          {messages.length > 0 && (
            <button
              onClick={onClear}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Clear conversation
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="rounded-full bg-violet-50 p-4 mb-3">
              <svg className="h-6 w-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-700">Talk to {displayName}</p>
            <p className="mt-1 text-xs text-gray-400 max-w-xs">
              This is a sandboxed simulation. The agent will behave according to its blueprint — persona, instructions, constraints, and governance rules.
            </p>
          </div>
        ) : (
          messages
            .filter((m) => m.role === "user" || m.role === "assistant")
            .map((m) => {
              const text = getMessageText(m.parts);
              return text ? (
                <MessageBubble
                  key={m.id}
                  role={m.role as "user" | "assistant"}
                  content={text}
                />
              ) : null;
            })
        )}

        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex justify-start">
            <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="shrink-0">
        <ChatInput onSend={handleSend} disabled={isLoading} />
      </div>
    </div>
  );
}

type Mode = "chat" | "red-team";

export function SimulatePanel(props: SimulatePanelProps) {
  const [chatKey, setChatKey] = useState(0);
  const [mode, setMode] = useState<Mode>("chat");

  return (
    <div className="flex flex-col h-full">
      {/* Mode toggle */}
      <div className="shrink-0 flex items-center gap-1 border-b border-gray-100 bg-white px-5 py-2">
        <button
          onClick={() => setMode("chat")}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            mode === "chat"
              ? "bg-violet-100 text-violet-700"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          }`}
        >
          Chat
        </button>
        <button
          onClick={() => setMode("red-team")}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            mode === "red-team"
              ? "bg-orange-100 text-orange-700"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          }`}
        >
          Red Team
        </button>
      </div>

      {/* Mode content */}
      <div className="flex-1 overflow-hidden">
        {mode === "chat" ? (
          <SimulatePanelInner
            key={chatKey}
            {...props}
            onClear={() => setChatKey((k) => k + 1)}
          />
        ) : (
          <div className="h-full overflow-y-auto px-5 py-4">
            <RedTeamPanel
              blueprintId={props.blueprintId}
              agentName={props.agentName ?? `Agent ${props.blueprintId.slice(0, 8)}`}
              version={props.version}
            />
          </div>
        )}
      </div>
    </div>
  );
}
