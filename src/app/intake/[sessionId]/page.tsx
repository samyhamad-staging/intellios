"use client";

import { use, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { UIMessage } from "ai";
import { ChatContainer } from "@/components/chat/chat-container";
import { IntakeProgress } from "@/components/intake/intake-progress";

interface DBMessage {
  id: string;
  role: string;
  content: string;
}

function mapToUIMessages(dbMessages: DBMessage[]): UIMessage[] {
  return dbMessages.map((m) => ({
    id: m.id,
    role: m.role as UIMessage["role"],
    parts: [{ type: "text" as const, text: m.content }],
    content: m.content,
  }));
}

export default function IntakeSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);
  const router = useRouter();
  const [refreshTick, setRefreshTick] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<UIMessage[] | undefined>(undefined);
  const [isNewSession, setIsNewSession] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  // Load session status + message history on mount
  useEffect(() => {
    async function loadSession() {
      try {
        const res = await fetch(`/api/intake/sessions/${sessionId}`);
        if (!res.ok) return;
        const { session, messages } = await res.json();
        if (session?.status === "completed") setIsCompleted(true);
        const uiMessages = mapToUIMessages(messages ?? []);
        setInitialMessages(uiMessages.length > 0 ? uiMessages : undefined);
        setIsNewSession(uiMessages.length === 0);
      } catch {
        setIsNewSession(true);
      } finally {
        setHistoryLoaded(true);
      }
    }
    loadSession();
  }, [sessionId]);

  // Re-check status after each response (for completion detection)
  useEffect(() => {
    if (refreshTick === 0) return;
    async function checkStatus() {
      try {
        const res = await fetch(`/api/intake/sessions/${sessionId}`);
        if (!res.ok) return;
        const { session } = await res.json();
        if (session?.status === "completed") setIsCompleted(true);
      } catch {
        // Non-critical
      }
    }
    checkStatus();
  }, [sessionId, refreshTick]);

  function handleResponseComplete() {
    setRefreshTick((t) => t + 1);
  }

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setGenerateError(null);
    try {
      const res = await fetch("/api/blueprints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Generation failed");
      }
      const { id, agentId, abp, validationReport } = await res.json();
      const encodedAbp = btoa(JSON.stringify(abp));
      const encodedVr = validationReport ? btoa(JSON.stringify(validationReport)) : "";
      const url = `/blueprints/${id}?abp=${encodedAbp}&agentId=${agentId}${encodedVr ? `&vr=${encodedVr}` : ""}`;
      router.push(url);
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Generation failed");
      setGenerating(false);
    }
  }, [sessionId, router]);

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <div>
          <h1 className="text-lg font-semibold">Intellios</h1>
          <p className="text-xs text-gray-500">Agent Intake</p>
        </div>
        <div className="flex items-center gap-3">
          {isCompleted && (
            <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
              Complete
            </span>
          )}
          <div className="text-xs text-gray-400 font-mono">{sessionId.slice(0, 8)}</div>
        </div>
      </header>

      {/* Completion banner */}
      {isCompleted && (
        <div className="flex items-center justify-between border-b border-green-200 bg-green-50 px-6 py-3">
          <div className="text-sm text-green-800">
            <strong>Intake complete.</strong> All requirements captured. Ready to generate the blueprint.
          </div>
          <div className="flex items-center gap-3">
            {generateError && (
              <span className="text-xs text-red-600">{generateError}</span>
            )}
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {generating ? "Generating..." : "Generate Blueprint →"}
            </button>
          </div>
        </div>
      )}

      {/* Body: chat + progress sidebar */}
      <main className="flex flex-1 overflow-hidden">
        {historyLoaded && (
          <ChatContainer
            sessionId={sessionId}
            initialMessages={initialMessages}
            showSuggestedPrompts={isNewSession}
            onResponseComplete={handleResponseComplete}
          />
        )}
        <IntakeProgress sessionId={sessionId} refreshTick={refreshTick} />
      </main>
    </div>
  );
}
