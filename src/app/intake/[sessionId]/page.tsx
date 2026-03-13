"use client";

import { use, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { UIMessage } from "ai";
import { ChatContainer } from "@/components/chat/chat-container";
import { IntakeProgress } from "@/components/intake/intake-progress";
import { IntakeContextForm } from "@/components/intake/intake-context-form";
import { IntakeReview } from "@/components/intake/intake-review";
import { IntakeContext, IntakePayload, StakeholderContribution } from "@/lib/types/intake";

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

/** Which phase the UI is currently showing */
type Phase = "loading" | "context-form" | "conversation" | "review";

export default function IntakeSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);
  const router = useRouter();
  const [refreshTick, setRefreshTick] = useState(0);
  const [phase, setPhase] = useState<Phase>("loading");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<UIMessage[] | undefined>(undefined);
  const [intakeContext, setIntakeContext] = useState<IntakeContext | null>(null);
  const [currentPayload, setCurrentPayload] = useState<IntakePayload>({});
  const [contributions, setContributions] = useState<StakeholderContribution[]>([]);

  // Load session status + message history + contributions on mount
  useEffect(() => {
    async function loadSession() {
      try {
        // Fetch session and contributions in parallel
        const [res, contribRes] = await Promise.all([
          fetch(`/api/intake/sessions/${sessionId}`),
          fetch(`/api/intake/sessions/${sessionId}/contributions`),
        ]);

        if (!res.ok) return;
        const { session, messages } = await res.json();

        // Load contributions (non-critical — fail silently)
        if (contribRes.ok) {
          const { contributions: loadedContributions } = await contribRes.json();
          setContributions(loadedContributions ?? []);
        }

        const storedContext = (session?.intakeContext as IntakeContext | null) ?? null;
        setIntakeContext(storedContext);

        if (session?.status === "completed") {
          // Load payload for review screen
          try {
            const payloadRes = await fetch(`/api/intake/sessions/${sessionId}/payload`);
            if (payloadRes.ok) {
              const payload = (await payloadRes.json()) as IntakePayload;
              setCurrentPayload(payload);
            }
          } catch {
            // non-critical
          }
          setPhase("review");
          return;
        }

        // If no context yet → show Phase 1 form
        if (!storedContext) {
          setPhase("context-form");
          return;
        }

        // Context present → show conversation
        const uiMessages = mapToUIMessages(messages ?? []);
        setInitialMessages(uiMessages.length > 0 ? uiMessages : undefined);
        setPhase("conversation");
      } catch {
        setPhase("context-form");
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
        if (session?.status === "completed") {
          // Fetch final payload for review screen
          try {
            const payloadRes = await fetch(`/api/intake/sessions/${sessionId}/payload`);
            if (payloadRes.ok) {
              const payload = (await payloadRes.json()) as IntakePayload;
              setCurrentPayload(payload);
            }
          } catch {
            // non-critical
          }
          setPhase("review");
        }
      } catch {
        // Non-critical
      }
    }
    checkStatus();
  }, [sessionId, refreshTick]);

  function handleResponseComplete() {
    setRefreshTick((t) => t + 1);
  }

  function handleContextComplete(context: IntakeContext) {
    setIntakeContext(context);
    setPhase("conversation");
  }

  function handleContributionAdded(contribution: StakeholderContribution) {
    setContributions((prev) => [...prev, contribution]);
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

  // ─── Phase: Loading ──────────────────────────────────────────────────────────

  if (phase === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-400">Loading session…</div>
      </div>
    );
  }

  // ─── Phase 1: Context Form ───────────────────────────────────────────────────

  if (phase === "context-form") {
    return (
      <div className="flex h-screen flex-col">
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
          <div>
            <h1 className="text-lg font-semibold">Intellios</h1>
            <p className="text-xs text-gray-500">Agent Intake</p>
          </div>
          <div className="text-xs text-gray-400 font-mono">{sessionId.slice(0, 8)}</div>
        </header>
        <IntakeContextForm sessionId={sessionId} onComplete={handleContextComplete} />
      </div>
    );
  }

  // ─── Phase 3: Review ─────────────────────────────────────────────────────────

  if (phase === "review") {
    return (
      <div className="flex h-screen flex-col">
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
          <div>
            <h1 className="text-lg font-semibold">Intellios</h1>
            <p className="text-xs text-gray-500">Agent Intake</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
              Complete
            </span>
            <div className="text-xs text-gray-400 font-mono">{sessionId.slice(0, 8)}</div>
          </div>
        </header>
        <IntakeReview
          sessionId={sessionId}
          payload={currentPayload}
          context={intakeContext}
          contributions={contributions}
          onGenerate={handleGenerate}
          generating={generating}
          generateError={generateError}
        />
      </div>
    );
  }

  // ─── Phase 2: Conversation ───────────────────────────────────────────────────

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <div>
          <h1 className="text-lg font-semibold">Intellios</h1>
          <p className="text-xs text-gray-500">Agent Intake</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-gray-400 font-mono">{sessionId.slice(0, 8)}</div>
        </div>
      </header>

      {/* Body: chat + progress sidebar */}
      <main className="flex flex-1 overflow-hidden">
        <ChatContainer
          sessionId={sessionId}
          initialMessages={initialMessages}
          showSuggestedPrompts={false}
          onResponseComplete={handleResponseComplete}
        />
        <IntakeProgress
          sessionId={sessionId}
          refreshTick={refreshTick}
          contributions={contributions}
          onContributionAdded={handleContributionAdded}
        />
      </main>
    </div>
  );
}
