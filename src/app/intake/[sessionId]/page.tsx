"use client";

import { use, useState, useEffect } from "react";
import { ChatContainer } from "@/components/chat/chat-container";
import { IntakeProgress } from "@/components/intake/intake-progress";

export default function IntakeSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);
  const [refreshTick, setRefreshTick] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  // Check session status on mount and after each response completes
  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch(`/api/intake/sessions/${sessionId}`);
        if (!res.ok) return;
        const { session } = await res.json();
        if (session?.status === "completed") setIsCompleted(true);
      } catch {
        // Non-critical — don't block the UI
      }
    }
    checkStatus();
  }, [sessionId, refreshTick]);

  function handleResponseComplete() {
    setRefreshTick((t) => t + 1);
  }

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
        <div className="border-b border-green-200 bg-green-50 px-6 py-3 text-sm text-green-800">
          <strong>Intake complete.</strong> The agent blueprint has been captured and is ready for the Generation Engine.
        </div>
      )}

      {/* Body: chat + progress sidebar */}
      <main className="flex flex-1 overflow-hidden">
        <ChatContainer
          sessionId={sessionId}
          onResponseComplete={handleResponseComplete}
        />
        <IntakeProgress sessionId={sessionId} refreshTick={refreshTick} />
      </main>
    </div>
  );
}
