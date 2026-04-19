"use client";

/**
 * Test Console (ADR-027).
 *
 * Reviewer-scoped test harness for deployed AgentCore agents. Streams
 * responses from /api/registry/[agentId]/invoke. No server-side transcript;
 * session id is browser-local (crypto.randomUUID()).
 *
 * This is explicitly framed in the UI as a test harness — not a runtime.
 * See ADR-027 for the six guardrails (role gate, rate limit, no persistence,
 * audit on every call, no RETURN_CONTROL execution, UI framing).
 */

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Heading } from "@/components/catalyst/heading";
import { Button } from "@/components/catalyst/button";
import { Input } from "@/components/catalyst/input";
import { Text } from "@/components/catalyst/text";
import { Divider } from "@/components/catalyst/divider";
import { InlineAlert } from "@/components/catalyst/alert";
import { Badge } from "@/components/ui/badge";

type Role = "user" | "assistant";

interface Turn {
  role: Role;
  content: string;
  /** True while the assistant turn is still streaming. */
  streaming?: boolean;
  /** If the turn ended in a [error:*] marker, the error code. */
  errorCode?: string;
}

interface AgentSnapshot {
  id: string;
  agentId: string;
  name: string | null;
  status: string;
  deploymentTarget: string | null;
  deploymentMetadata: {
    agentId?: string;
    region?: string;
    foundationModel?: string;
    deployedAt?: string;
    retirement?: { deleted: boolean; retiredAt: string };
  } | null;
}

const ERROR_MARKER = /\[error:([A-Z_]+)\]\s*(.*)/;

export default function TestConsolePage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = use(params);
  const [agent, setAgent] = useState<AgentSnapshot | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const sessionIdRef = useRef<string>("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Session id is generated once per page mount (ADR-027 guardrail #3)
  useEffect(() => {
    if (!sessionIdRef.current) {
      sessionIdRef.current =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
  }, []);

  // Load the agent snapshot once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/registry/${agentId}`, {
          credentials: "include",
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          if (!cancelled) {
            setLoadErr(body?.message ?? `Failed to load agent (${res.status}).`);
          }
          return;
        }
        const data = await res.json();
        if (!cancelled) setAgent(data.agent as AgentSnapshot);
      } catch (err) {
        if (!cancelled) {
          setLoadErr(err instanceof Error ? err.message : String(err));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [agentId]);

  // Auto-scroll to bottom on every turn update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns]);

  const invokable = useMemo(() => {
    if (!agent) return false;
    if (agent.status !== "deployed") return false;
    if (agent.deploymentTarget !== "agentcore") return false;
    if (!agent.deploymentMetadata?.agentId) return false;
    return true;
  }, [agent]);

  const send = useCallback(async () => {
    const prompt = input.trim();
    if (!prompt || !invokable || sending) return;

    const userTurn: Turn = { role: "user", content: prompt };
    const assistantTurn: Turn = {
      role: "assistant",
      content: "",
      streaming: true,
    };
    setTurns((t) => [...t, userTurn, assistantTurn]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch(`/api/registry/${agentId}/invoke`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          prompt,
        }),
      });

      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => null);
        setTurns((t) => {
          const next = [...t];
          const last = next[next.length - 1];
          last.streaming = false;
          last.errorCode = body?.code ?? `HTTP_${res.status}`;
          last.content =
            body?.message ?? `Invocation failed with HTTP ${res.status}.`;
          return next;
        });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let acc = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        acc += chunk;
        setTurns((t) => {
          const next = [...t];
          const last = next[next.length - 1];
          last.content = acc;
          return next;
        });
      }

      // Check for in-stream error markers the server pushes on failure
      const marker = acc.match(ERROR_MARKER);
      setTurns((t) => {
        const next = [...t];
        const last = next[next.length - 1];
        last.streaming = false;
        if (marker) last.errorCode = marker[1];
        return next;
      });
    } catch (err) {
      setTurns((t) => {
        const next = [...t];
        const last = next[next.length - 1];
        last.streaming = false;
        last.errorCode = "CLIENT_ERROR";
        last.content = err instanceof Error ? err.message : String(err);
        return next;
      });
    } finally {
      setSending(false);
    }
  }, [agentId, input, invokable, sending]);

  const clear = useCallback(() => {
    // A fresh session id on clear — Bedrock treats this as a new conversation.
    sessionIdRef.current =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setTurns([]);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  if (loadErr) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <InlineAlert variant="error">
          <div className="font-semibold">Could not load agent</div>
          <div>{loadErr}</div>
        </InlineAlert>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <Heading>Test Console</Heading>
          <Badge variant="warning">Test harness — not a production runtime</Badge>
        </div>
        <Text>
          Press-test a deployed agent in a reviewer-scoped session. Prompts are
          rate-limited to 10 per minute and every invocation is audit-logged. No
          transcript is stored on the server; closing this page ends the
          session.
        </Text>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Link
            href={`/registry/${agentId}`}
            className="text-zinc-500 underline decoration-dotted hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            ← Back to agent
          </Link>
          {agent?.name ? <Badge variant="neutral">{agent.name}</Badge> : null}
          {agent?.status ? (
            <Badge variant={agent.status === "deployed" ? "success" : "neutral"}>
              status: {agent.status}
            </Badge>
          ) : null}
          {agent?.deploymentTarget ? (
            <Badge variant="info">target: {agent.deploymentTarget}</Badge>
          ) : null}
          {agent?.deploymentMetadata?.region ? (
            <Badge variant="neutral">
              region: {agent.deploymentMetadata.region}
            </Badge>
          ) : null}
          {agent?.deploymentMetadata?.retirement?.deleted ? (
            <Badge variant="danger">retired</Badge>
          ) : null}
        </div>
      </div>

      <Divider />

      {/* Invoke-ability gate */}
      {!invokable && agent ? (
        <InlineAlert variant="warning">
          <div className="font-semibold">Agent is not invokable</div>
          <div>
            Test Console requires the latest version to be{" "}
            <code>status: deployed</code> and{" "}
            <code>deploymentTarget: agentcore</code>. Current:{" "}
            <code>status: {agent.status}</code>,{" "}
            <code>target: {agent.deploymentTarget ?? "(none)"}</code>.
          </div>
        </InlineAlert>
      ) : null}

      {/* Conversation */}
      <div className="flex min-h-[24rem] flex-col gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
        {turns.length === 0 ? (
          <Text className="italic opacity-70">
            No messages yet. Enter a prompt below to test the agent.
          </Text>
        ) : (
          turns.map((turn, i) => (
            <div
              key={i}
              className={`flex ${
                turn.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-3 text-sm ${
                  turn.role === "user"
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : turn.errorCode
                    ? "border border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-700 dark:bg-rose-950/50 dark:text-rose-200"
                    : "border border-zinc-200 bg-white text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                }`}
              >
                {turn.role === "assistant" && (
                  <div className="mb-1 flex items-center gap-2 text-xs opacity-70">
                    <span>bedrock-agent/test-console</span>
                    {turn.streaming ? <span>streaming…</span> : null}
                    {turn.errorCode ? (
                      <Badge variant="danger">{turn.errorCode}</Badge>
                    ) : null}
                  </div>
                )}
                <div className="whitespace-pre-wrap break-words">
                  {turn.content || (turn.streaming ? "…" : "")}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Input
            placeholder={
              invokable
                ? "Ask the agent something…"
                : "This agent cannot be invoked (see above)."
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            disabled={!invokable || sending}
            aria-label="Prompt"
          />
          <Button
            onClick={() => void send()}
            disabled={!invokable || sending || !input.trim()}
          >
            {sending ? "Sending…" : "Send"}
          </Button>
          <Button
            outline
            onClick={clear}
            disabled={sending || turns.length === 0}
          >
            Clear
          </Button>
        </div>
        <Text className="text-xs opacity-60">
          Session id: <code>{sessionIdRef.current || "(initializing)"}</code>
        </Text>
      </div>
    </div>
  );
}
