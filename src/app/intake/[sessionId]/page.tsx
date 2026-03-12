"use client";

import { use } from "react";
import { ChatContainer } from "@/components/chat/chat-container";

export default function IntakeSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <div>
          <h1 className="text-lg font-semibold">Intellios</h1>
          <p className="text-xs text-gray-500">Agent Intake</p>
        </div>
        <div className="text-xs text-gray-400 font-mono">{sessionId.slice(0, 8)}</div>
      </header>

      {/* Chat */}
      <main className="flex-1 overflow-hidden">
        <ChatContainer sessionId={sessionId} />
      </main>
    </div>
  );
}
