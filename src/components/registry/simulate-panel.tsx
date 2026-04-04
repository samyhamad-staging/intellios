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
import { ShieldCheck, X } from "lucide-react";

// P1-32: Saved scenario library
interface SavedScenario {
  id: string;
  label: string;
  text: string;
}

// P2-423: Version entry passed from registry page
interface VersionEntry {
  id: string;
  version: string;
}

interface SimulatePanelProps {
  blueprintId: string;
  agentName: string | null;
  version: string;
  // P2-423: all available versions so user can switch simulation target
  allVersions?: VersionEntry[];
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

  // P1-32: Saved scenario library — browser-local, keyed by blueprintId
  const SCENARIOS_KEY = `sim-scenarios-${blueprintId}`;
  const [scenarios, setScenarios] = useState<SavedScenario[]>(() => {
    try {
      const raw = localStorage.getItem(`sim-scenarios-${blueprintId}`);
      return raw ? (JSON.parse(raw) as SavedScenario[]) : [];
    } catch { return []; }
  });
  const [addingScenario, setAddingScenario] = useState(false);
  const [newScenarioLabel, setNewScenarioLabel] = useState("");
  const [newScenarioText, setNewScenarioText] = useState("");

  function saveNewScenario() {
    const label = newScenarioLabel.trim();
    const text = newScenarioText.trim();
    if (!label || !text) return;
    const next: SavedScenario[] = [...scenarios, { id: crypto.randomUUID(), label, text }];
    setScenarios(next);
    try { localStorage.setItem(SCENARIOS_KEY, JSON.stringify(next)); } catch { /* quota */ }
    setNewScenarioLabel("");
    setNewScenarioText("");
    setAddingScenario(false);
  }

  function deleteScenario(id: string) {
    const next = scenarios.filter((s) => s.id !== id);
    setScenarios(next);
    try { localStorage.setItem(SCENARIOS_KEY, JSON.stringify(next)); } catch { /* quota */ }
  }

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
      <div className="shrink-0 border-b border-border-subtle bg-surface-raised px-5 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-text">
              Simulating: <span className="text-violet-700">{displayName}</span>
              <span className="ml-1.5 text-xs font-normal text-text-tertiary">v{version}</span>
            </p>
            <p className="mt-0.5 text-xs text-text-tertiary">
              Sandbox — agent cannot access real systems
            </p>
            <div className="mt-1.5 flex items-center gap-1 text-2xs text-emerald-600">
              <ShieldCheck className="h-3 w-3 shrink-0" />
              <span>This session is being audited for compliance evidence</span>
            </div>
          </div>
          {messages.length > 0 && (
            <button
              onClick={onClear}
              className="text-xs text-text-tertiary hover:text-text-secondary"
            >
              Clear conversation
            </button>
          )}
        </div>
      </div>

      {/* P1-32: Saved Scenario Library */}
      <div className="shrink-0 border-b border-border-subtle bg-surface px-5 py-2.5">
        {scenarios.length === 0 && !addingScenario ? (
          <button
            onClick={() => setAddingScenario(true)}
            className="text-xs text-text-tertiary hover:text-violet-600 transition-colors"
          >
            + Save a test scenario
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5">
            {scenarios.map((s) => (
              <div
                key={s.id}
                className="group flex items-center gap-0.5 rounded-full border border-violet-200 bg-violet-50 pl-2.5 pr-1.5 py-0.5"
              >
                <button
                  onClick={() => handleSend(s.text)}
                  className="max-w-32 truncate text-xs font-medium text-violet-700 hover:text-violet-900 transition-colors"
                  title={s.text}
                >
                  {s.label}
                </button>
                <button
                  onClick={() => deleteScenario(s.id)}
                  className="ml-0.5 shrink-0 text-violet-300 opacity-0 hover:text-red-500 group-hover:opacity-100 transition-opacity"
                  title="Remove scenario"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
            {!addingScenario && (
              <button
                onClick={() => setAddingScenario(true)}
                className="rounded-full border border-dashed border-border px-2.5 py-0.5 text-xs text-text-tertiary hover:border-violet-300 hover:text-violet-600 transition-colors"
              >
                + Add
              </button>
            )}
          </div>
        )}

        {addingScenario && (
          <div className="mt-2 flex flex-col gap-1.5">
            <input
              type="text"
              placeholder="Short label (e.g. 'PII exfiltration attempt')"
              value={newScenarioLabel}
              onChange={(e) => setNewScenarioLabel(e.target.value)}
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
              className="rounded-md border border-border px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400"
            />
            <textarea
              placeholder="Prompt text to send to the agent…"
              value={newScenarioText}
              onChange={(e) => setNewScenarioText(e.target.value)}
              rows={2}
              className="resize-none rounded-md border border-border px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400"
            />
            <div className="flex gap-2">
              <button
                onClick={saveNewScenario}
                disabled={!newScenarioLabel.trim() || !newScenarioText.trim()}
                className="rounded-md bg-violet-600 px-3 py-1 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-40 transition-colors"
              >
                Save scenario
              </button>
              <button
                onClick={() => { setAddingScenario(false); setNewScenarioLabel(""); setNewScenarioText(""); }}
                className="rounded-md border border-border px-3 py-1 text-xs text-text-secondary hover:bg-surface-raised transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
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
            <p className="text-sm font-medium text-text">Talk to {displayName}</p>
            <p className="mt-1 text-xs text-text-secondary max-w-xs">
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
            <div className="rounded-2xl border border-border bg-surface px-4 py-3">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-text-tertiary animate-bounce [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-text-tertiary animate-bounce [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-text-tertiary animate-bounce [animation-delay:300ms]" />
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

  // P2-423: Active version for simulation — defaults to the latest (props.blueprintId / props.version)
  const [activeVersionId, setActiveVersionId] = useState<string>(props.blueprintId);
  const [activeVersion, setActiveVersion] = useState<string>(props.version);

  function switchVersion(entry: VersionEntry) {
    if (entry.id === activeVersionId) return;
    setActiveVersionId(entry.id);
    setActiveVersion(entry.version);
    setChatKey((k) => k + 1); // clear chat when switching version
  }

  const hasMultipleVersions = (props.allVersions?.length ?? 0) > 1;

  return (
    <div className="flex flex-col h-full">
      {/* P2-423: Version selector — shown when multiple versions available */}
      {hasMultipleVersions && (
        <div className="shrink-0 flex items-center gap-1.5 border-b border-border-subtle bg-surface px-5 py-2 overflow-x-auto">
          <span className="shrink-0 text-xs text-text-tertiary mr-1">Simulating:</span>
          {props.allVersions!.map((v) => (
            <button
              key={v.id}
              onClick={() => switchVersion(v)}
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                v.id === activeVersionId
                  ? "bg-violet-100 text-violet-700 ring-1 ring-violet-300"
                  : "text-text-secondary hover:text-text hover:bg-surface-raised border border-border"
              }`}
            >
              v{v.version}
            </button>
          ))}
        </div>
      )}

      {/* Mode toggle */}
      <div className="shrink-0 flex items-center gap-1 border-b border-border-subtle bg-surface px-5 py-2">
        <button
          onClick={() => setMode("chat")}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            mode === "chat"
              ? "bg-violet-100 text-violet-700"
              : "text-text-secondary hover:text-text hover:bg-surface-raised"
          }`}
        >
          Chat
        </button>
        <button
          onClick={() => setMode("red-team")}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            mode === "red-team"
              ? "bg-orange-100 text-orange-700"
              : "text-text-secondary hover:text-text hover:bg-surface-raised"
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
            blueprintId={activeVersionId}
            agentName={props.agentName}
            version={activeVersion}
            onClear={() => setChatKey((k) => k + 1)}
          />
        ) : (
          <div className="h-full overflow-y-auto px-5 py-4">
            <RedTeamPanel
              blueprintId={activeVersionId}
              agentName={props.agentName ?? `Agent ${activeVersionId.slice(0, 8)}`}
              version={activeVersion}
            />
          </div>
        )}
      </div>
    </div>
  );
}
