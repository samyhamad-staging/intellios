"use client";

import { useEffect, useRef, useState } from "react";
import { IntakeContext, IntakePayload, IntakeRiskTier, StakeholderContribution } from "@/lib/types/intake";
import { StakeholderContributionsPanel } from "./stakeholder-contributions-panel";
import { computeReadinessScore, ReadinessResult } from "@/lib/intake/readiness";

interface Section {
  key: string;
  label: string;
  filled: boolean;
  required: boolean;
  detail?: string;
}

// Short nav-friendly labels for each domain
const DOMAIN_SHORT_LABELS: Record<string, string> = {
  identity:     "Purpose",
  tools:        "Capabilities",
  instructions: "Behavior",
  knowledge:    "Knowledge",
  constraints:  "Guardrails",
  governance:   "Governance",
  audit:        "Audit",
};

function truncateList(items: string[], max = 3): string {
  if (items.length <= max) return items.join(", ");
  return items.slice(0, max).join(", ") + ` +${items.length - max} more`;
}

function getSections(payload: IntakePayload): Section[] {
  const identity     = payload.identity;
  const capabilities = payload.capabilities;
  const constraints  = payload.constraints;
  const governance   = payload.governance;

  const tools    = capabilities?.tools ?? [];
  const sources  = capabilities?.knowledge_sources ?? [];
  const policies = governance?.policies ?? [];
  const domains  = constraints?.allowed_domains ?? [];
  const denied   = constraints?.denied_actions ?? [];

  return [
    {
      key: "identity",
      label: "Purpose",
      filled: !!(identity?.name && identity?.description),
      required: true,
      detail: identity?.name && identity?.description
        ? `"${identity.name}" — ${identity.description.length > 55 ? identity.description.slice(0, 55) + "…" : identity.description}`
        : undefined,
    },
    {
      key: "tools",
      label: "Capabilities",
      filled: tools.length > 0,
      required: true,
      detail: tools.length > 0
        ? `${tools.length} tool${tools.length > 1 ? "s" : ""}: ${truncateList(tools.map((t) => t.name))}`
        : undefined,
    },
    {
      key: "instructions",
      label: "Behavior",
      filled: !!capabilities?.instructions,
      required: false,
      detail: capabilities?.instructions ? "Configured" : undefined,
    },
    {
      key: "knowledge",
      label: "Knowledge",
      filled: sources.length > 0,
      required: false,
      detail: sources.length > 0
        ? `${sources.length} source${sources.length > 1 ? "s" : ""}: ${truncateList(sources.map((s) => s.name))}`
        : undefined,
    },
    {
      key: "constraints",
      label: "Guardrails",
      filled: domains.length > 0 || denied.length > 0,
      required: false,
      detail:
        domains.length > 0 || denied.length > 0
          ? [
              domains.length > 0 && `${domains.length} domain${domains.length > 1 ? "s" : ""}`,
              denied.length > 0 && `${denied.length} denied action${denied.length > 1 ? "s" : ""}`,
            ]
              .filter(Boolean)
              .join(" · ")
          : undefined,
    },
    {
      key: "governance",
      label: "Governance",
      filled: policies.length > 0,
      required: false,
      detail: policies.length > 0
        ? `${policies.length} polic${policies.length > 1 ? "ies" : "y"}: ${truncateList(policies.map((p) => p.name))}`
        : undefined,
    },
    {
      key: "audit",
      label: "Audit",
      filled: governance?.audit !== undefined,
      required: false,
      detail: governance?.audit
        ? [
            governance.audit.log_interactions !== undefined &&
              `Logging ${governance.audit.log_interactions ? "on" : "off"}`,
            governance.audit.retention_days !== undefined &&
              `${governance.audit.retention_days}-day retention`,
          ]
            .filter(Boolean)
            .join(" · ") || "Configured"
        : undefined,
    },
  ];
}

export interface SectionSummary {
  key: string;
  label: string;
  shortLabel: string;
  filled: boolean;
  required: boolean;
}

interface IntakeProgressProps {
  sessionId: string;
  refreshTick: number;
  contributions?: StakeholderContribution[];
  onContributionAdded?: (contribution: StakeholderContribution) => void;
  context?: IntakeContext;
  riskTier?: IntakeRiskTier | null;
  /** Called whenever payload data refreshes — used to sync domain nav in the page header */
  onSectionsChange?: (sections: SectionSummary[], agentName: string | null) => void;
}

export function IntakeProgress({
  sessionId,
  refreshTick,
  contributions = [],
  onContributionAdded,
  context,
  riskTier,
  onSectionsChange,
}: IntakeProgressProps) {
  const [sections, setSections] = useState<Section[]>(getSections({}));
  const [agentName, setAgentName] = useState<string | null>(null);
  const [readiness, setReadiness] = useState<ReadinessResult | null>(null);
  // Track whether we've ever had data — used to animate the reveal
  const [hasEverFetched, setHasEverFetched] = useState(false);

  // Stable ref so the effect doesn't need onSectionsChange in its deps
  const onSectionsChangeRef = useRef(onSectionsChange);
  useEffect(() => { onSectionsChangeRef.current = onSectionsChange; });

  useEffect(() => {
    let cancelled = false;

    async function fetchPayload() {
      try {
        const res = await fetch(`/api/intake/sessions/${sessionId}/payload`);
        if (!res.ok || cancelled) return;
        const payload = (await res.json()) as IntakePayload;
        if (!cancelled) {
          const computed = getSections(payload);
          const name = payload.identity?.name ?? null;
          setSections(computed);
          setAgentName(name);
          setReadiness(computeReadinessScore(payload, riskTier ?? null));
          setHasEverFetched(true);
          onSectionsChangeRef.current?.(
            computed.map((s) => ({
              key: s.key,
              label: s.label,
              shortLabel: DOMAIN_SHORT_LABELS[s.key] ?? s.label,
              filled: s.filled,
              required: s.required,
            })),
            name
          );
        }
      } catch {
        if (!cancelled) setHasEverFetched(true);
      }
    }

    fetchPayload();
    return () => { cancelled = true; };
  }, [sessionId, refreshTick, riskTier]);

  const filled        = sections.filter((s) => s.filled).length;
  const hasAnyFilled  = filled > 0;
  const requiredFilled = sections.filter((s) => s.required && s.filled).length;
  const requiredTotal  = sections.filter((s) => s.required).length;
  const activeKey      = sections.find((s) => s.required && !s.filled)?.key ?? null;
  const isReady        = requiredFilled === requiredTotal;

  return (
    <aside className="w-72 shrink-0 border-l border-border bg-surface flex flex-col overflow-hidden">
      {/* ── Panel header ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
        {/* Sparkle / AI icon */}
        <svg
          className={`h-4 w-4 shrink-0 ${hasAnyFilled ? "text-primary" : "text-text-tertiary"} transition-colors duration-500`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2l2.4 7.2H22l-6.2 4.5 2.4 7.2L12 16.4l-6.2 4.5 2.4-7.2L2 9.2h7.6z" />
        </svg>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary">
          Design Intelligence
        </span>
      </div>

      {/* ── Scrollable body ───────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">

        {/* ── State: analysing (nothing captured yet) ─────────────── */}
        {!hasAnyFilled && (
          <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
            <div className={`flex gap-1 ${hasEverFetched ? "opacity-60" : "opacity-40"}`}>
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-tertiary" style={{ animationDelay: "0ms" }} />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-tertiary" style={{ animationDelay: "120ms" }} />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-tertiary" style={{ animationDelay: "240ms" }} />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-text-tertiary">
              Analysing
            </p>
            <p className="text-xs text-text-tertiary leading-relaxed">
              Insights appear as your agent design takes shape.
            </p>

            {/* Ghost domain list — shows what will be captured */}
            <ul className="mt-2 w-full flex flex-col gap-1.5">
              {sections.map((s) => (
                <li key={s.key} className="flex items-center gap-2 opacity-30">
                  <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-border" />
                  <span className="text-xs text-text-tertiary">{s.label}</span>
                  {s.required && (
                    <span className="ml-auto text-[10px] text-text-tertiary">required</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── State: live — at least one section captured ──────────── */}
        {hasAnyFilled && (
          <>
            {/* Agent name */}
            {agentName && (
              <p className="text-sm font-semibold text-text truncate">{agentName}</p>
            )}

            {/* Overall progress bar */}
            <div>
              <div className="flex justify-between text-[11px] text-text-tertiary mb-1.5">
                <span>{filled} of {sections.length} domains</span>
                <span className={isReady ? "text-green-700 font-medium" : ""}>{Math.round((filled / sections.length) * 100)}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-surface-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    isReady ? "bg-green-500" : "bg-primary"
                  }`}
                  style={{ width: `${Math.round((filled / sections.length) * 100)}%` }}
                />
              </div>
            </div>

            {/* Section checklist */}
            <ul className="flex flex-col gap-2">
              {sections.map((section) => (
                <li key={section.key} className="flex items-start gap-2.5">
                  <span
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-all duration-300 ${
                      section.filled
                        ? "bg-primary text-white"
                        : section.key === activeKey
                        ? "animate-pulse border-2 border-primary text-primary"
                        : section.required
                        ? "border-2 border-border-strong text-text-tertiary"
                        : "border border-border text-border"
                    }`}
                  >
                    {section.filled ? "✓" : ""}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <span
                        className={`text-sm ${
                          section.filled
                            ? "text-text font-medium"
                            : section.required
                            ? "text-text-secondary"
                            : "text-text-tertiary"
                        }`}
                      >
                        {section.label}
                      </span>
                      {section.required && !section.filled && (
                        <span className="text-[10px] text-red-400">required</span>
                      )}
                    </div>
                    {section.detail && (
                      <p className="text-xs text-text-tertiary truncate mt-0.5" title={section.detail}>
                        {section.detail}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            {/* Live readiness score */}
            {readiness !== null && (
              <div className="rounded-lg border border-border bg-surface-raised px-3 py-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-medium text-text-secondary">Intake Readiness</span>
                  <span
                    className={`text-sm font-bold tabular-nums ${
                      readiness.score >= 80 ? "text-green-700"
                      : readiness.score >= 50 ? "text-amber-700"
                      : "text-text-tertiary"
                    }`}
                  >
                    {readiness.score}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-surface-muted overflow-hidden mb-2">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      readiness.score >= 80 ? "bg-green-500"
                      : readiness.score >= 50 ? "bg-amber-400"
                      : "bg-border-strong"
                    }`}
                    style={{ width: `${readiness.score}%` }}
                  />
                </div>
                <div
                  className={`text-[11px] text-center font-medium ${
                    readiness.label === "ready" ? "text-green-700"
                    : readiness.label === "near-complete" ? "text-amber-700"
                    : "text-text-tertiary"
                  }`}
                >
                  {readiness.label === "not-started"   && "Getting started"}
                  {readiness.label === "building"      && (() => {
                    const next = sections.find((s) => s.required && !s.filled);
                    return next ? `Next: ${next.label}` : "Building requirements…";
                  })()}
                  {readiness.label === "near-complete" && "Nearly complete"}
                  {readiness.label === "ready"         && "✓ Ready to finalize"}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Stakeholder panel ────────────────────────────────────── */}
        {onContributionAdded && (
          isReady ? (
            <StakeholderContributionsPanel
              sessionId={sessionId}
              contributions={contributions}
              onContributionAdded={onContributionAdded}
              context={context}
              riskTier={riskTier}
            />
          ) : (
            <div className="rounded-lg border border-dashed border-border px-4 py-4">
              <div className="flex items-center gap-2 mb-1.5">
                {/* Lock icon */}
                <svg className="h-3.5 w-3.5 shrink-0 text-text-tertiary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <p className="text-xs font-semibold text-text-secondary">Stakeholder Input</p>
                <span className="ml-auto text-[10px] font-medium text-text-tertiary">7 domains</span>
              </div>
              <p className="text-xs text-text-tertiary leading-relaxed">
                Invite domain experts once required sections are captured. Unlocks when{" "}
                <span className="font-medium text-text-secondary">
                  {requiredTotal - requiredFilled} required{" "}
                  {requiredTotal - requiredFilled === 1 ? "section" : "sections"}
                </span>{" "}
                {requiredTotal - requiredFilled === 1 ? "is" : "are"} complete.
              </p>
              {/* Mini domain list preview */}
              <div className="mt-3 flex flex-wrap gap-1">
                {["Compliance", "Risk", "Legal", "Security", "IT", "Ops", "Business"].map((d) => (
                  <span key={d} className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] text-text-tertiary">
                    {d}
                  </span>
                ))}
              </div>
            </div>
          )
        )}
      </div>
    </aside>
  );
}
