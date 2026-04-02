"use client";

import { use, useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import type { UIMessage } from "ai";
import { ChatContainer } from "@/components/chat/chat-container";
import { IntakeProgress, SectionSummary } from "@/components/intake/intake-progress";
import { IntakeContextForm } from "@/components/intake/intake-context-form";
import { IntakeReview } from "@/components/intake/intake-review";
import { IntakeContext, IntakePayload, StakeholderContribution, AgentType, IntakeRiskTier, IntakeClassification } from "@/lib/types/intake";

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
  const [generateSuccess, setGenerateSuccess] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<UIMessage[] | undefined>(undefined);
  const [intakeContext, setIntakeContext] = useState<IntakeContext | null>(null);
  const [currentPayload, setCurrentPayload] = useState<IntakePayload>({});
  const [contributions, setContributions] = useState<StakeholderContribution[]>([]);
  const [classification, setClassification] = useState<IntakeClassification | null>(null);
  const [classificationLoading, setClassificationLoading] = useState(false);
  const [editingClassification, setEditingClassification] = useState(false);
  const [editAgentType, setEditAgentType] = useState<AgentType>("automation");
  const [editRiskTier, setEditRiskTier] = useState<IntakeRiskTier>("medium");
  const [classificationSaving, setClassificationSaving] = useState(false);
  const [intakeScore, setIntakeScore] = useState<{
    overallScore: number | null;
    dimensions: { breadthScore: number | null; ambiguityScore: number | null; riskIdScore: number | null; stakeholderScore: number | null };
    evaluatedAt: string;
  } | null>(null);
  const [intakeScoreLoading, setIntakeScoreLoading] = useState(false);
  const [scorePopoverOpen, setScorePopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  // Live payload state — synced from IntakeProgress on every refresh
  const [liveSections, setLiveSections] = useState<SectionSummary[]>([]);
  const [liveAgentName, setLiveAgentName] = useState<string | null>(null);

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

        // Load classification if already available
        if (session?.agentType && session?.riskTier) {
          setClassification({
            agentType: session.agentType as AgentType,
            riskTier: session.riskTier as IntakeRiskTier,
            rationale: "",
          });
        }

        if (session?.status === "completed") {
          // Load payload and quality score for review screen
          setIntakeScoreLoading(true);
          await Promise.all([
            fetch(`/api/intake/sessions/${sessionId}/payload`)
              .then((r) => r.ok ? r.json() : null)
              .then((payload) => { if (payload) setCurrentPayload(payload as IntakePayload); })
              .catch(() => {}),
            fetch(`/api/intake/sessions/${sessionId}/quality-score`)
              .then((r) => r.ok ? r.json() : null)
              .then((data) => { if (data?.score) setIntakeScore(data.score); })
              .catch(() => {})
              .finally(() => setIntakeScoreLoading(false)),
          ]);
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
          setIntakeScoreLoading(true);
          await Promise.all([
            fetch(`/api/intake/sessions/${sessionId}/payload`)
              .then((r) => r.ok ? r.json() : null)
              .then((payload) => { if (payload) setCurrentPayload(payload as IntakePayload); })
              .catch(() => {}),
            fetch(`/api/intake/sessions/${sessionId}/quality-score`)
              .then((r) => r.ok ? r.json() : null)
              .then((data) => { if (data?.score) setIntakeScore(data.score); })
              .catch(() => {})
              .finally(() => setIntakeScoreLoading(false)),
          ]);
          setPhase("review");
        }
      } catch {
        // Non-critical
      }
    }
    checkStatus();
  }, [sessionId, refreshTick]);

  // Close popover on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setScorePopoverOpen(false);
      }
    }
    if (scorePopoverOpen) {
      document.addEventListener("mousedown", handleOutside);
      return () => document.removeEventListener("mousedown", handleOutside);
    }
  }, [scorePopoverOpen]);

  const handleSectionsChange = useCallback((sections: SectionSummary[], name: string | null) => {
    setLiveSections(sections);
    if (name) setLiveAgentName(name);
  }, []);

  function handleResponseComplete() {
    setRefreshTick((t) => t + 1);
  }

  function handleContextComplete(context: IntakeContext) {
    setIntakeContext(context);
    setPhase("conversation");
    // Poll for async classification result (fires after context save)
    setClassificationLoading(true);
    let polls = 0;
    const interval = setInterval(async () => {
      polls++;
      try {
        const res = await fetch(`/api/intake/sessions/${sessionId}`);
        if (res.ok) {
          const { session } = await res.json();
          if (session?.agentType && session?.riskTier) {
            setClassification({
              agentType: session.agentType as AgentType,
              riskTier: session.riskTier as IntakeRiskTier,
              rationale: "",
            });
            setClassificationLoading(false);
            clearInterval(interval);
            return;
          }
        }
      } catch {
        // Non-critical — keep polling
      }
      if (polls >= 10) {
        setClassificationLoading(false);
        clearInterval(interval);
      }
    }, 1500);
  }

  function handleContributionAdded(contribution: StakeholderContribution) {
    setContributions((prev) => [...prev, contribution]);
  }

  async function handleSaveClassification() {
    if (!editAgentType && !editRiskTier) return;
    setClassificationSaving(true);
    try {
      const res = await fetch(`/api/intake/sessions/${sessionId}/classification`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentType: editAgentType, riskTier: editRiskTier }),
      });
      if (res.ok) {
        const data = await res.json();
        setClassification({
          agentType: data.agentType as AgentType,
          riskTier: data.riskTier as IntakeRiskTier,
          rationale: "",
        });
        setEditingClassification(false);
      }
    } catch {
      // Non-critical
    } finally {
      setClassificationSaving(false);
    }
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
      const { id, agentId } = await res.json();
      // Brief success flash before redirect — gives the user a clear "done" signal
      // before the page changes to the workbench loading state.
      setGenerateSuccess(true);
      await new Promise((resolve) => setTimeout(resolve, 900));
      router.push(`/blueprints/${id}?agentId=${agentId}&new=1`);
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Generation failed");
      setGenerating(false);
    }
  }, [sessionId, router]);

  // ─── Phase: Loading ──────────────────────────────────────────────────────────

  if (phase === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-surface-raised">
        <div className="flex items-center gap-2.5 text-sm text-text-tertiary">
          <svg className="h-4 w-4 animate-spin text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading session…
        </div>
      </div>
    );
  }

  // ─── Phase 1: Context Form ───────────────────────────────────────────────────

  if (phase === "context-form") {
    return (
      <div className="flex h-screen flex-col">
        <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-3">
          <div>
            <h1 className="text-lg font-semibold">Intellios</h1>
            <p className="text-xs text-text-secondary">Agent Intake</p>
          </div>
          <div className="text-xs text-text-tertiary font-mono">{sessionId.slice(0, 8)}</div>
        </header>
        <IntakeContextForm sessionId={sessionId} onComplete={handleContextComplete} />
      </div>
    );
  }

  // ─── Phase 3: Review ─────────────────────────────────────────────────────────

  if (phase === "review") {
    const scoreColor =
      intakeScore?.overallScore == null ? "text-text-tertiary"
      : intakeScore.overallScore >= 70 ? "text-green-700"
      : intakeScore.overallScore >= 50 ? "text-amber-700"
      : "text-red-700";

    return (
      <div className="flex h-screen flex-col">
        <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-3">
          <div>
            <h1 className="text-lg font-semibold">Intellios</h1>
            <p className="text-xs text-text-secondary">Agent Intake</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Intake quality score chip: loading pulse → real chip with popover */}
            {intakeScoreLoading && !intakeScore ? (
              <div className="flex animate-pulse items-center gap-1.5 rounded-lg border border-border bg-surface-raised px-3 py-1">
                <span className="text-xs text-text-tertiary">Scoring…</span>
                <span className="flex gap-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-border" />
                  <span className="h-1.5 w-1.5 rounded-full bg-border" />
                  <span className="h-1.5 w-1.5 rounded-full bg-border" />
                </span>
              </div>
            ) : intakeScore ? (
              <div ref={popoverRef} className="relative">
                <button
                  onClick={() => setScorePopoverOpen((o) => !o)}
                  className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-raised px-3 py-1 hover:border-border-strong"
                  title={`Evaluated at ${new Date(intakeScore.evaluatedAt).toLocaleString()}`}
                >
                  <span className="text-xs text-text-secondary">Intake quality</span>
                  <span className={`text-sm font-bold ${scoreColor}`}>
                    {intakeScore.overallScore != null ? `${Math.round(intakeScore.overallScore)}/100` : "—"}
                  </span>
                  <span className="text-xs text-text-tertiary">{scorePopoverOpen ? "▲" : "▼"}</span>
                </button>
                {scorePopoverOpen && (() => {
                  const DIMENSION_DESCRIPTIONS: Record<string, string> = {
                    "Breadth": "How many distinct requirement areas were captured",
                    "Ambiguity": "How clearly the agent's purpose and boundaries are defined",
                    "Risk ID": "Whether key risks (safety, data, compliance) have been surfaced",
                    "Stakeholder": "Diversity and relevance of stakeholder contributions",
                  };
                  const dims = [
                    { label: "Breadth", value: intakeScore.dimensions.breadthScore },
                    { label: "Ambiguity", value: intakeScore.dimensions.ambiguityScore },
                    { label: "Risk ID", value: intakeScore.dimensions.riskIdScore },
                    { label: "Stakeholder", value: intakeScore.dimensions.stakeholderScore },
                  ] as { label: string; value: number | null }[];
                  const hasLowScore = dims.some((d) => (d.value ?? 0) < 3.0 && d.value != null);
                  return (
                    <div className="absolute bottom-full right-0 mb-2 w-72 rounded-xl border border-border bg-surface p-4 shadow-lg">
                      <p className="mb-2.5 text-xs font-semibold text-text">Quality Dimensions</p>
                      {dims.map((d) => {
                        const val = d.value ?? 0;
                        const below = val < 3.0;
                        return (
                          <div key={d.label} className="mb-3">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="w-20 shrink-0 text-xs text-text-secondary font-medium">{d.label}</span>
                              <div className="h-1.5 flex-1 rounded-full bg-border">
                                <div
                                  className={`h-1.5 rounded-full ${below ? "bg-amber-400" : "bg-indigo-400"}`}
                                  style={{ width: `${(val / 5) * 100}%` }}
                                />
                              </div>
                              <span className={`w-8 shrink-0 text-right text-xs font-medium ${below ? "text-amber-600" : "text-text"}`}>
                                {d.value != null ? `${d.value.toFixed(1)}` : "—"}
                              </span>
                            </div>
                            <p className="pl-[88px] text-[11px] text-text-tertiary leading-snug">{DIMENSION_DESCRIPTIONS[d.label]}</p>
                          </div>
                        );
                      })}
                      {hasLowScore && (
                        <p className="mt-1 text-xs text-amber-600 border-t border-border pt-2">
                          Some areas need more depth — continue the conversation to strengthen coverage.
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>
            ) : null}
            <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
              Complete
            </span>
            <div className="text-xs text-text-tertiary font-mono">{sessionId.slice(0, 8)}</div>
          </div>
        </header>
        <IntakeReview
          sessionId={sessionId}
          payload={currentPayload}
          context={intakeContext}
          contributions={contributions}
          riskTier={classification?.riskTier ?? null}
          onGenerate={handleGenerate}
          generating={generating}
          generateSuccess={generateSuccess}
          generateError={generateError}
        />
      </div>
    );
  }

  // ─── Phase 2: Conversation ───────────────────────────────────────────────────

  const RISK_TIER_BADGE_COLORS: Record<IntakeRiskTier, string> = {
    low:      "bg-green-100 text-green-700",
    medium:   "bg-amber-100 text-amber-700",
    high:     "bg-orange-100 text-orange-700",
    critical: "bg-red-100 text-red-700",
  };

  const AGENT_TYPE_LABELS: Record<AgentType, string> = {
    "automation":       "Automation",
    "decision-support": "Decision Support",
    "autonomous":       "Autonomous",
    "data-access":      "Data Access",
  };

  const DOMAIN_NAV = [
    { key: "identity",     label: "Purpose" },
    { key: "tools",        label: "Capabilities" },
    { key: "instructions", label: "Behavior" },
    { key: "knowledge",    label: "Knowledge" },
    { key: "constraints",  label: "Guardrails" },
    { key: "governance",   label: "Governance" },
    { key: "audit",        label: "Audit" },
  ] as const;

  const domainsFilled = liveSections.filter((s) => s.filled).length;

  return (
    <div className="flex h-screen flex-col">
      {/* ── Unified header ─────────────────────────────────────────── */}
      <header className="border-b border-border bg-surface">

        {/* Row 1: breadcrumb + classification + session id */}
        <div className="flex items-center justify-between px-6 py-3">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-sm">
            <span className="text-text-tertiary">Design Studio</span>
            <span className="text-text-tertiary">›</span>
            <span className={`font-medium transition-colors duration-300 ${liveAgentName ? "text-text" : "text-text-secondary"}`}>
              {liveAgentName ?? "New session"}
            </span>
          </div>

          {/* Right: classification + session id */}
          <div className="flex items-center gap-2.5">
            {/* Classification loading pulse */}
            {classificationLoading && !classification && (
              <div className="flex animate-pulse items-center gap-1.5">
                <div className="h-5 w-20 rounded-full bg-surface-muted" />
                <div className="h-5 w-16 rounded-full bg-surface-muted" />
              </div>
            )}

            {/* Classification chips — read mode */}
            {classification && !editingClassification && (
              <div className="flex items-center gap-1.5">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${RISK_TIER_BADGE_COLORS[classification.riskTier]}`}
                  title="Risk tier — governs review requirements and governance policies applied"
                >
                  {classification.riskTier.toUpperCase()} risk
                </span>
                <span
                  className="rounded-full bg-surface-muted px-2 py-0.5 text-xs text-text-secondary"
                  title="Agent type — how this agent operates"
                >
                  {AGENT_TYPE_LABELS[classification.agentType]}
                </span>
                <button
                  onClick={() => {
                    setEditAgentType(classification.agentType);
                    setEditRiskTier(classification.riskTier);
                    setEditingClassification(true);
                  }}
                  className="text-[11px] text-text-tertiary hover:text-text-secondary underline-offset-2 hover:underline"
                >
                  Override
                </button>
              </div>
            )}

            {/* Classification — edit mode */}
            {classification && editingClassification && (
              <div className="flex items-center gap-2">
                <select
                  value={editAgentType}
                  onChange={(e) => setEditAgentType(e.target.value as AgentType)}
                  className="h-[22px] rounded border border-border px-2 py-0.5 text-xs focus:border-border-strong focus:outline-none"
                >
                  <option value="automation">Automation</option>
                  <option value="decision-support">Decision Support</option>
                  <option value="autonomous">Autonomous</option>
                  <option value="data-access">Data Access</option>
                </select>
                <select
                  value={editRiskTier}
                  onChange={(e) => setEditRiskTier(e.target.value as IntakeRiskTier)}
                  className="h-[22px] rounded border border-border px-2 py-0.5 text-xs focus:border-border-strong focus:outline-none"
                >
                  <option value="low">LOW risk</option>
                  <option value="medium">MEDIUM risk</option>
                  <option value="high">HIGH risk</option>
                  <option value="critical">CRITICAL risk</option>
                </select>
                <button
                  onClick={handleSaveClassification}
                  disabled={classificationSaving}
                  className="rounded bg-text px-2.5 py-0.5 text-xs font-medium text-surface hover:opacity-80 disabled:opacity-50"
                >
                  {classificationSaving ? "Saving…" : "Save"}
                </button>
                <button
                  onClick={() => setEditingClassification(false)}
                  className="text-xs text-text-tertiary hover:text-text-secondary"
                >
                  Cancel
                </button>
              </div>
            )}

            <div className="text-[11px] text-text-tertiary font-mono">{sessionId.slice(0, 8)}</div>
          </div>
        </div>

        {/* Row 2: live domain nav */}
        <div className="flex items-center justify-between px-6 pb-3">
          <div className="flex items-center gap-0.5">
            {DOMAIN_NAV.map(({ key, label }) => {
              const s = liveSections.find((sec) => sec.key === key);
              const isFilled   = s?.filled ?? false;
              const isRequired = s?.required ?? false;
              return (
                <div
                  key={key}
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all duration-300 ${
                    isFilled
                      ? "text-primary"
                      : isRequired
                      ? "text-amber-700"
                      : "text-text-tertiary"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${
                      isFilled ? "bg-primary" : isRequired ? "bg-amber-400 animate-pulse" : "bg-border"
                    }`}
                  />
                  {label}
                </div>
              );
            })}
          </div>
          <span className={`text-xs font-medium tabular-nums transition-colors duration-300 ${
            domainsFilled === 7 ? "text-green-700" : "text-text-tertiary"
          }`}>
            {domainsFilled}/7 domains
          </span>
        </div>
      </header>

      {/* Body: chat + progress sidebar */}
      <main className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Phase 1 context summary banner — fills whitespace, anchors the conversation */}
          {intakeContext && (
            <div className="shrink-0 border-b border-border bg-surface-raised px-6 py-2.5">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary shrink-0">
                  Session context
                </span>
                {intakeContext.deploymentType && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-text-tertiary">Deployment</span>
                    <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-text-secondary capitalize">
                      {intakeContext.deploymentType.replace(/-/g, " ")}
                    </span>
                  </div>
                )}
                {intakeContext.dataSensitivity && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-text-tertiary">Data</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${
                      intakeContext.dataSensitivity === "pii" || intakeContext.dataSensitivity === "regulated"
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-surface-muted text-text-secondary"
                    }`}>
                      {intakeContext.dataSensitivity.replace(/-/g, " ")}
                    </span>
                  </div>
                )}
                {intakeContext.regulatoryScope.filter((s) => s !== "none").length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-text-tertiary">Regulatory</span>
                    <div className="flex gap-1">
                      {intakeContext.regulatoryScope.filter((s) => s !== "none").map((scope) => (
                        <span key={scope} className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-text-secondary">
                          {scope}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {intakeContext.agentPurpose && (
                  <p
                    className="text-[11px] text-text-tertiary italic truncate max-w-xs"
                    title={intakeContext.agentPurpose}
                  >
                    &ldquo;{intakeContext.agentPurpose.length > 80
                      ? intakeContext.agentPurpose.slice(0, 80) + "…"
                      : intakeContext.agentPurpose}&rdquo;
                  </p>
                )}
              </div>
            </div>
          )}
          <ChatContainer
            sessionId={sessionId}
            initialMessages={initialMessages}
            showSuggestedPrompts={false}
            onResponseComplete={handleResponseComplete}
          />
        </div>
        <IntakeProgress
          sessionId={sessionId}
          refreshTick={refreshTick}
          contributions={contributions}
          onContributionAdded={handleContributionAdded}
          context={intakeContext ?? undefined}
          riskTier={classification?.riskTier ?? null}
          onSectionsChange={handleSectionsChange}
        />
      </main>
    </div>
  );
}
