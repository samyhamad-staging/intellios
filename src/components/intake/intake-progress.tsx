"use client";

import { useEffect, useState } from "react";
import { IntakeContext, IntakePayload, IntakeRiskTier, StakeholderContribution } from "@/lib/types/intake";
import type { IntakeTransparencyMetadata } from "@/lib/types/intake-transparency";
import { StakeholderContributionsPanel } from "./stakeholder-contributions-panel";
import { computeReadinessScore, ReadinessResult } from "@/lib/intake/readiness";
import { ChevronDown, ChevronRight, Shield, Lightbulb, CheckCircle2, Circle } from "lucide-react";

interface Section {
  key: string;
  label: string;
  filled: boolean;
  required: boolean;
  detail?: string;
}

function truncateList(items: string[], max = 3): string {
  if (items.length <= max) return items.join(", ");
  return items.slice(0, max).join(", ") + ` +${items.length - max} more`;
}

function getSections(payload: IntakePayload): Section[] {
  const identity = payload.identity;
  const capabilities = payload.capabilities;
  const constraints = payload.constraints;
  const governance = payload.governance;

  const tools = capabilities?.tools ?? [];
  const sources = capabilities?.knowledge_sources ?? [];
  const policies = governance?.policies ?? [];
  const domains = constraints?.allowed_domains ?? [];
  const denied = constraints?.denied_actions ?? [];

  return [
    {
      key: "identity",
      label: "Agent Identity",
      filled: !!(identity?.name && identity?.description),
      required: true,
      detail: identity?.name && identity?.description
        ? `"${identity.name}" — ${identity.description.length > 55 ? identity.description.slice(0, 55) + "…" : identity.description}`
        : undefined,
    },
    {
      key: "capabilities",
      label: "Tools & Capabilities",
      filled: tools.length > 0,
      required: true,
      detail: tools.length > 0
        ? `${tools.length} tool${tools.length > 1 ? "s" : ""}: ${truncateList(tools.map((t) => t.name))}`
        : undefined,
    },
    {
      key: "instructions",
      label: "Behavioral Instructions",
      filled: !!capabilities?.instructions,
      required: false,
      detail: capabilities?.instructions ? "Configured" : undefined,
    },
    {
      key: "knowledge",
      label: "Knowledge Sources",
      filled: sources.length > 0,
      required: false,
      detail: sources.length > 0
        ? `${sources.length} source${sources.length > 1 ? "s" : ""}: ${truncateList(sources.map((s) => s.name))}`
        : undefined,
    },
    {
      key: "constraints",
      label: "Constraints",
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
      label: "Governance Policies",
      filled: policies.length > 0,
      required: false,
      detail: policies.length > 0
        ? `${policies.length} polic${policies.length > 1 ? "ies" : "y"}: ${truncateList(policies.map((p) => p.name))}`
        : undefined,
    },
    {
      key: "audit",
      label: "Audit Configuration",
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

interface IntakeProgressProps {
  sessionId: string;
  refreshTick: number;
  contributions?: StakeholderContribution[];
  onContributionAdded?: (contribution: StakeholderContribution) => void;
  context?: IntakeContext;
  riskTier?: IntakeRiskTier | null;
  transparency?: IntakeTransparencyMetadata | null;
  /** On mobile, controlled by the parent. When true, sidebar is shown even on narrow viewports. */
  mobileOpen?: boolean;
}

// ── Collapsible section helper ───────────────────────────────────────────────

function DisclosureSection({
  title,
  badge,
  children,
  defaultOpen = false,
}: {
  title: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50/50">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-3 py-2 text-left"
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown size={12} className="text-gray-400" /> : <ChevronRight size={12} className="text-gray-400" />}
          <span className="text-xs font-medium text-gray-600">{title}</span>
        </div>
        {badge}
      </button>
      {open && <div className="px-3 pb-3 pt-0">{children}</div>}
    </div>
  );
}

// ── Score decomposition bar ──────────────────────────────────────────────────

function ScoreBar({ label, score, max }: { label: string; score: number; max: number }) {
  const pct = Math.round((score / max) * 100);
  const color = pct >= 70 ? "bg-green-500" : pct >= 40 ? "bg-amber-400" : "bg-gray-400";
  return (
    <div className="flex items-center gap-2">
      <span className="text-2xs text-gray-500 w-20 shrink-0">{label}</span>
      <div className="flex-1 h-1 rounded-full bg-gray-200 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-2xs tabular-nums text-gray-400 w-8 text-right">{score}/{max}</span>
    </div>
  );
}

const DEPTH_LABELS: Record<string, string> = {
  streamlined: "Streamlined — minimal governance probing",
  standard: "Standard — context-derived governance required",
  deep: "Deep — all context-signal policies required",
  exhaustive: "Exhaustive — all 5 policy types mandatory",
};

const TIER_COLORS: Record<string, string> = {
  low: "bg-green-100 text-green-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

const CONTEXT_AREAS = [
  "Agent purpose",
  "Deployment type",
  "Data sensitivity",
  "Regulatory scope",
  "System integrations",
  "Stakeholders",
];

const BLUEPRINT_SECTIONS = [
  "Agent Identity",
  "Tools & Capabilities",
  "Behavioral Instructions",
  "Knowledge Sources",
  "Constraints",
  "Governance Policies",
  "Audit Configuration",
];

export function IntakeProgress({ sessionId, refreshTick, contributions = [], onContributionAdded, context, riskTier, transparency, mobileOpen }: IntakeProgressProps) {
  const [sections, setSections] = useState<Section[]>(getSections({}));
  const [agentName, setAgentName] = useState<string | null>(null);
  const [readiness, setReadiness] = useState<ReadinessResult | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchPayload() {
      try {
        const res = await fetch(`/api/intake/sessions/${sessionId}/payload`);
        if (!res.ok || cancelled) return;
        const payload = (await res.json()) as IntakePayload;
        if (!cancelled) {
          setSections(getSections(payload));
          setAgentName(payload.identity?.name ?? null);
          setReadiness(computeReadinessScore(payload, riskTier ?? null));
        }
      } catch {
        // Silently ignore — sidebar is non-critical
      }
    }

    fetchPayload();
    return () => { cancelled = true; };
  }, [sessionId, refreshTick, riskTier]);

  const filled = sections.filter((s) => s.filled).length;
  const requiredFilled = sections.filter((s) => s.required && s.filled).length;
  const requiredTotal = sections.filter((s) => s.required).length;
  const pct = Math.round((filled / sections.length) * 100);
  const activeKey = sections.find((s) => s.required && !s.filled)?.key ?? null;

  // Phase 1: no context yet — show session overview instead of Blueprint Progress
  if (!context) {
    return (
      <aside className={`w-72 shrink-0 border-l border-gray-200 bg-white p-5 flex-col gap-5 overflow-y-auto ${mobileOpen ? "flex absolute inset-0 z-10 lg:relative lg:inset-auto" : "hidden lg:flex"}`}>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Session Overview</h2>
          <p className="text-xs text-gray-400">Here's what this conversation will cover.</p>
        </div>

        {/* Phase 1: Context */}
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-white text-2xs font-bold">1</span>
            <span className="text-xs font-semibold text-gray-800">Context</span>
            <span className="text-2xs font-medium text-primary bg-primary/10 rounded-full px-1.5 py-0.5">Now</span>
          </div>
          <ul className="ml-7 flex flex-col gap-1.5">
            {CONTEXT_AREAS.map((item) => (
              <li key={item} className="flex items-center gap-2 text-xs text-gray-500">
                <span className="h-1 w-1 rounded-full bg-gray-300 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Phase 2: Requirements */}
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-gray-200 text-gray-300 text-2xs font-bold">2</span>
            <span className="text-xs font-semibold text-gray-400">Requirements</span>
          </div>
          <ul className="ml-7 flex flex-col gap-1.5">
            {BLUEPRINT_SECTIONS.map((item) => (
              <li key={item} className="flex items-center gap-2 text-xs text-gray-400">
                <span className="h-1 w-1 rounded-full bg-gray-200 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Phase 3: Review */}
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-gray-200 text-gray-300 text-2xs font-bold">3</span>
            <span className="text-xs font-semibold text-gray-400">Review & Generate</span>
          </div>
          <p className="ml-7 mt-1.5 text-xs text-gray-400">Review captured requirements and generate the blueprint.</p>
        </div>
      </aside>
    );
  }

  return (
    <aside className={`w-72 shrink-0 border-l border-gray-200 bg-white p-5 flex-col gap-4 overflow-y-auto ${mobileOpen ? "flex absolute inset-0 z-10 lg:relative lg:inset-auto" : "hidden lg:flex"}`}>
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
          Blueprint Progress
        </h2>
        {agentName && (
          <p className="text-sm font-medium text-gray-900 truncate">{agentName}</p>
        )}
      </div>

      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{filled} of {sections.length} sections</span>
          <span>{pct}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <ul className="flex flex-col gap-2">
        {sections.map((section) => (
          <li key={section.key} className="flex items-start gap-2.5">
            <span
              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-2xs font-bold ${
                section.filled
                  ? "bg-blue-500 text-white"
                  : section.key === activeKey
                  ? "animate-pulse border-2 border-blue-400 text-blue-400"
                  : section.required
                  ? "border-2 border-gray-300 text-gray-300"
                  : "border border-gray-200 text-gray-200"
              }`}
            >
              {section.filled ? "✓" : ""}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span
                  className={`text-sm ${
                    section.filled
                      ? "text-gray-900"
                      : section.required
                      ? "text-gray-500"
                      : "text-gray-400"
                  }`}
                >
                  {section.label}
                </span>
                {section.required && !section.filled && (
                  <span className="text-2xs text-red-400">required</span>
                )}
              </div>
              {section.detail && (
                <p className="text-xs text-gray-400 truncate mt-0.5" title={section.detail}>
                  {section.detail}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>

      {/* ── Readiness Score with Decomposition ──────────────────────────────── */}
      {readiness !== null && readiness.score > 0 && (
        <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-gray-500">Intake Readiness</span>
            <span
              className={`text-sm font-bold tabular-nums ${
                readiness.score >= 80
                  ? "text-green-700"
                  : readiness.score >= 50
                  ? "text-amber-700"
                  : "text-gray-500"
              }`}
            >
              {readiness.score}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden mb-2">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                readiness.score >= 80
                  ? "bg-green-500"
                  : readiness.score >= 50
                  ? "bg-amber-400"
                  : "bg-gray-400"
              }`}
              style={{ width: `${readiness.score}%` }}
            />
          </div>
          {/* Score decomposition — 3 dimension bars */}
          {transparency?.readiness && (
            <div className="flex flex-col gap-1.5 mt-2">
              <ScoreBar label="Sections" score={transparency.readiness.breakdown.sectionCoverage.score} max={50} />
              <ScoreBar label="Governance" score={transparency.readiness.breakdown.governanceDepth.score} max={35} />
              <ScoreBar label="Specificity" score={transparency.readiness.breakdown.specificity.score} max={15} />
            </div>
          )}
          {!transparency?.readiness && (
            <div
              className={`text-xs-tight text-center font-medium ${
                readiness.label === "ready"
                  ? "text-green-700"
                  : readiness.label === "near-complete"
                  ? "text-amber-700"
                  : "text-gray-400"
              }`}
            >
              {readiness.label === "not-started" && "Getting started"}
              {readiness.label === "building" && (() => {
                const next = sections.find((s) => s.required && !s.filled);
                return next ? `Next: ${next.label}` : "Building requirements…";
              })()}
              {readiness.label === "near-complete" && "Nearly complete"}
              {readiness.label === "ready" && "✓ Ready to finalize"}
            </div>
          )}
        </div>
      )}

      {/* ── Classification Explainer ────────────────────────────────────────── */}
      {transparency?.classification && (
        <DisclosureSection
          title="Classification"
          badge={
            <span className={`text-2xs font-medium rounded-full px-1.5 py-0.5 ${TIER_COLORS[transparency.classification.riskTier] ?? "bg-gray-100 text-gray-600"}`}>
              {transparency.classification.riskTier.toUpperCase()}
            </span>
          }
        >
          <div className="flex flex-col gap-2">
            <div>
              <span className="text-2xs text-gray-400 uppercase tracking-wider">Risk signals</span>
              <ul className="mt-1 flex flex-col gap-0.5">
                {transparency.classification.signals.map((s, i) => (
                  <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-gray-400 shrink-0" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <span className="text-2xs text-gray-400 uppercase tracking-wider">Agent type</span>
              <p className="text-xs text-gray-600 mt-0.5">
                <span className="font-medium">{transparency.classification.agentType}</span>
                {transparency.classification.rationale && (
                  <span className="text-gray-400"> — {transparency.classification.rationale}</span>
                )}
              </p>
            </div>
            <div>
              <span className="text-2xs text-gray-400 uppercase tracking-wider">Conversation depth</span>
              <p className="text-xs text-gray-600 mt-0.5">{DEPTH_LABELS[transparency.classification.conversationDepth] ?? transparency.classification.conversationDepth}</p>
            </div>
          </div>
        </DisclosureSection>
      )}

      {/* ── Governance Checklist ─────────────────────────────────────────────── */}
      {transparency && transparency.governanceChecklist.length > 0 && (() => {
        const satisfied = transparency.governanceChecklist.filter((g) => g.satisfied).length;
        const total = transparency.governanceChecklist.length;
        return (
          <DisclosureSection
            title="Required Governance"
            badge={
              <span className={`text-2xs font-medium tabular-nums ${satisfied === total ? "text-green-600" : "text-amber-600"}`}>
                {satisfied}/{total}
              </span>
            }
          >
            <ul className="flex flex-col gap-1.5">
              {transparency.governanceChecklist.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  {item.satisfied
                    ? <CheckCircle2 size={14} className="mt-0.5 text-green-500 shrink-0" />
                    : <Circle size={14} className="mt-0.5 text-gray-300 shrink-0" />
                  }
                  <div className="min-w-0">
                    <span className={`text-xs ${item.satisfied ? "text-gray-500" : "text-gray-700"}`}>{item.type}</span>
                    <p className="text-2xs text-gray-400 truncate" title={item.reason}>{item.reason}</p>
                  </div>
                </li>
              ))}
            </ul>
          </DisclosureSection>
        );
      })()}

      {/* ── Probing Topics ───────────────────────────────────────────────────── */}
      {transparency && transparency.probingTopics.length > 0 && (() => {
        const covered = transparency.probingTopics.filter((t) => t.covered).length;
        const total = transparency.probingTopics.length;
        return (
          <DisclosureSection
            title="Probing Topics"
            badge={
              <span className={`text-2xs font-medium tabular-nums ${covered === total ? "text-green-600" : "text-gray-400"}`}>
                {covered}/{total}
              </span>
            }
          >
            <ul className="flex flex-col gap-1.5">
              {transparency.probingTopics.map((topic, i) => (
                <li key={i} className="flex items-start gap-2">
                  {topic.level === "mandatory"
                    ? <Shield size={13} className="mt-0.5 text-indigo-400 shrink-0" />
                    : <Lightbulb size={13} className="mt-0.5 text-amber-400 shrink-0" />
                  }
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs text-gray-700">{topic.topic}</span>
                      <span className={`text-2xs font-medium shrink-0 ${topic.covered ? "text-green-600" : "text-amber-500"}`}>
                        {topic.covered ? "Covered" : "Pending"}
                      </span>
                    </div>
                    <p className="text-2xs text-gray-400">{topic.reason}</p>
                  </div>
                </li>
              ))}
            </ul>
          </DisclosureSection>
        );
      })()}

      {/* ── Model & Expertise Indicator ──────────────────────────────────────── */}
      {transparency && (
        <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2">
          <div className="flex items-center gap-1.5" title={transparency.model.reason}>
            <span className={`h-1.5 w-1.5 rounded-full ${transparency.model.name.includes("haiku") ? "bg-gray-400" : "bg-blue-500"}`} />
            <span className="text-2xs text-gray-500">
              {transparency.model.name.includes("haiku") ? "Haiku" : "Sonnet"}
            </span>
          </div>
          {transparency.expertiseLevel && (
            <span className="text-2xs text-gray-400" title={`Detected expertise: ${transparency.expertiseLevel}`}>
              {transparency.expertiseLevel.charAt(0).toUpperCase() + transparency.expertiseLevel.slice(1)} mode
            </span>
          )}
        </div>
      )}

      <div
        className={`rounded-lg px-3 py-2 text-xs text-center ${
          requiredFilled === requiredTotal
            ? "bg-green-50 text-green-700"
            : "bg-gray-50 text-gray-500"
        }`}
      >
        {requiredFilled === requiredTotal
          ? "Ready to finalize"
          : (() => {
              const next = sections.find((s) => s.required && !s.filled);
              return next ? `Next: ${next.label}` : `${requiredTotal - requiredFilled} required section${requiredTotal - requiredFilled === 1 ? "" : "s"} remaining`;
            })()}
      </div>

      {/* Stakeholder contributions panel — locked until required sections are complete */}
      {onContributionAdded && (
        requiredFilled === requiredTotal ? (
          <StakeholderContributionsPanel
            sessionId={sessionId}
            contributions={contributions}
            onContributionAdded={onContributionAdded}
            context={context}
            riskTier={riskTier}
          />
        ) : (
          <div className="rounded-lg border border-dashed border-gray-200 px-4 py-3 text-center" title="Complete required sections first.">
            <p className="text-xs font-medium text-gray-400">Stakeholder Input</p>
            <p className="mt-1 text-xs text-gray-400">Complete required sections first.</p>
          </div>
        )
      )}
    </aside>
  );
}
