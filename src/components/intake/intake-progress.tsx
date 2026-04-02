"use client";

import { useState, useEffect } from "react";
import { AgentType, IntakeContext, IntakePayload, IntakeRiskTier, StakeholderContribution } from "@/lib/types/intake";
import type { IntakeTransparencyMetadata } from "@/lib/types/intake-transparency";
import { StakeholderContributionsPanel } from "./stakeholder-contributions-panel";
import { computeReadinessScore, ReadinessResult } from "@/lib/intake/readiness";
import { Divider } from "@/components/ui/divider";
import {
  Shield, Lightbulb, CheckCircle2, Circle, ChevronDown, Cpu, BrainCircuit, Users,
} from "lucide-react";

// ── Label maps ────────────────────────────────────────────────────────────────

const AGENT_TYPE_LABELS: Record<string, string> = {
  automation:        "Automation",
  "decision-support": "Decision Support",
  autonomous:        "Autonomous",
  "data-access":     "Data Access",
};

// ── Constants ────────────────────────────────────────────────────────────────

const DEPTH_LABELS: Record<string, string> = {
  streamlined: "Streamlined — minimal governance probing",
  standard:    "Standard — context-derived governance required",
  deep:        "Deep — all context-signal policies required",
  exhaustive:  "Exhaustive — all 5 policy types mandatory",
};

const TIER_COLORS: Record<string, string> = {
  low:      "bg-emerald-100 text-emerald-700",
  medium:   "bg-amber-100   text-amber-700",
  high:     "bg-orange-100  text-orange-700",
  critical: "bg-red-100     text-red-700",
};

// ── Types ────────────────────────────────────────────────────────────────────

interface IntakeProgressProps {
  sessionId: string;
  refreshTick: number;
  contributions?: StakeholderContribution[];
  onContributionAdded?: (contribution: StakeholderContribution) => void;
  context?: IntakeContext;
  riskTier?: IntakeRiskTier | null;
  agentType?: AgentType | null;
  transparency?: IntakeTransparencyMetadata | null;
  mobileOpen?: boolean;
}

// ── Payload-derived section info (fallback when transparency is null) ──────

interface FallbackSection {
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

function getSections(payload: IntakePayload): FallbackSection[] {
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
    { key: "identity", label: "Agent Identity", filled: !!(identity?.name && identity?.description), required: true,
      detail: identity?.name ? `"${identity.name}"` : undefined },
    { key: "capabilities", label: "Tools & Capabilities", filled: tools.length > 0, required: true,
      detail: tools.length > 0 ? `${tools.length} tool${tools.length > 1 ? "s" : ""}: ${truncateList(tools.map(t => t.name))}` : undefined },
    { key: "instructions", label: "Behavioral Instructions", filled: !!capabilities?.instructions, required: false,
      detail: capabilities?.instructions ? "Configured" : undefined },
    { key: "knowledge", label: "Knowledge Sources", filled: sources.length > 0, required: false,
      detail: sources.length > 0 ? `${sources.length} source${sources.length > 1 ? "s" : ""}` : undefined },
    { key: "constraints", label: "Constraints", filled: domains.length > 0 || denied.length > 0, required: false,
      detail: [domains.length > 0 && `${domains.length} domain${domains.length > 1 ? "s" : ""}`,
               denied.length > 0 && `${denied.length} denied`].filter(Boolean).join(" + ") || undefined },
    { key: "governance", label: "Governance Policies", filled: policies.length > 0, required: false,
      detail: policies.length > 0 ? `${policies.length} polic${policies.length > 1 ? "ies" : "y"}` : undefined },
    { key: "audit", label: "Audit Configuration", filled: governance?.audit !== undefined, required: false,
      detail: governance?.audit ? [
        governance.audit.log_interactions !== undefined && `Logging ${governance.audit.log_interactions ? "on" : "off"}`,
        governance.audit.retention_days !== undefined && `${governance.audit.retention_days}d retention`,
      ].filter(Boolean).join(" + ") || "Configured" : undefined },
  ];
}

// ── Collapsible section ───────────────────────────────────────────────────────

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
    <div className="rounded-lg border border-border bg-surface-raised">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-3 py-2 text-left"
      >
        <div className="flex items-center gap-2">
          <ChevronDown
            size={12}
            className={`text-text-tertiary transition-transform duration-200 ${open ? "rotate-0" : "-rotate-90"}`}
          />
          <span className="text-2xs font-mono font-medium text-text-secondary uppercase tracking-wide">
            {title}
          </span>
        </div>
        {badge}
      </button>
      {open && <div className="px-3 pb-3 pt-0">{children}</div>}
    </div>
  );
}

// ── Progressive-disclosure Governance Checklist ───────────────────────────────

const PENDING_PREVIEW = 3; // max pending items shown before "X more" expander

function GovernanceChecklistSection({
  checklist,
  satisfied,
  total,
  pending,
}: {
  checklist: IntakeTransparencyMetadata["governanceChecklist"];
  satisfied: number;
  total: number;
  pending: IntakeTransparencyMetadata["governanceChecklist"];
}) {
  const [expanded, setExpanded] = useState(false);
  const satisfiedItems = checklist.filter((g) => g.satisfied);
  const visiblePending = expanded ? pending : pending.slice(0, PENDING_PREVIEW);
  const hiddenCount = pending.length - PENDING_PREVIEW;

  return (
    <DisclosureSection
      defaultOpen={true}
      title="Required Governance"
      badge={
        <span className={`text-2xs font-mono font-medium tabular-nums ${
          satisfied === total ? "text-emerald-600"
          : satisfied > 0    ? "text-amber-600"
          :                    "text-text-tertiary"
        }`}>
          {satisfied}/{total}
        </span>
      }
    >
      <ul className="flex flex-col gap-1.5 pt-1">
        {/* Satisfied items first */}
        {satisfiedItems.map((item, i) => (
          <li key={`sat-${i}`} className="flex items-start gap-2">
            <CheckCircle2 size={14} className="mt-0.5 text-emerald-500 shrink-0" />
            <div className="min-w-0">
              <span className="text-xs text-text-secondary">{item.type}</span>
              <p className="text-2xs text-text-tertiary truncate" title={item.reason}>{item.reason}</p>
            </div>
          </li>
        ))}
        {/* Pending items — progressive disclosure */}
        {visiblePending.map((item, i) => (
          <li key={`pend-${i}`} className="flex items-start gap-2">
            <Circle size={14} className="mt-0.5 text-border-strong shrink-0" />
            <div className="min-w-0">
              <span className="text-xs text-text">{item.type}</span>
              <p className="text-2xs text-text-tertiary truncate" title={item.reason}>{item.reason}</p>
            </div>
          </li>
        ))}
        {/* Expand / collapse */}
        {!expanded && hiddenCount > 0 && (
          <li>
            <button
              onClick={() => setExpanded(true)}
              className="text-2xs font-mono text-text-tertiary hover:text-text transition-colors"
            >
              +{hiddenCount} more pending
            </button>
          </li>
        )}
        {expanded && hiddenCount > 0 && (
          <li>
            <button
              onClick={() => setExpanded(false)}
              className="text-2xs font-mono text-text-tertiary hover:text-text transition-colors"
            >
              Show less
            </button>
          </li>
        )}
      </ul>
    </DisclosureSection>
  );
}

// ── Progressive-disclosure Coverage Analysis ──────────────────────────────────

function CoverageAnalysisSection({
  topics,
  covered,
  total,
}: {
  topics: IntakeTransparencyMetadata["probingTopics"];
  covered: number;
  total: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const coveredItems = topics.filter((t) => t.covered);
  const openItems = topics.filter((t) => !t.covered);
  const visibleOpen = expanded ? openItems : openItems.slice(0, PENDING_PREVIEW);
  const hiddenCount = openItems.length - PENDING_PREVIEW;

  return (
    <DisclosureSection
      defaultOpen={true}
      title="Coverage Analysis"
      badge={
        <span className={`text-2xs font-mono font-medium tabular-nums ${covered === total ? "text-emerald-600" : "text-text-tertiary"}`}>
          {covered}/{total}
        </span>
      }
    >
      <ul className="flex flex-col gap-1.5 pt-1">
        {/* Covered topics first */}
        {coveredItems.map((topic, i) => (
          <li key={`cov-${i}`} className="flex items-start gap-2">
            {topic.level === "mandatory"
              ? <Shield size={13} className="mt-0.5 text-indigo-400 shrink-0" />
              : <Lightbulb size={13} className="mt-0.5 text-amber-400 shrink-0" />
            }
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs text-text-secondary">{topic.topic}</span>
                <span className="text-2xs font-mono font-medium shrink-0 text-emerald-600">DONE</span>
              </div>
              <p className="text-2xs text-text-tertiary">{topic.reason}</p>
            </div>
          </li>
        ))}
        {/* Open topics — progressive disclosure */}
        {visibleOpen.map((topic, i) => (
          <li key={`open-${i}`} className="flex items-start gap-2">
            {topic.level === "mandatory"
              ? <Shield size={13} className="mt-0.5 text-indigo-400 shrink-0" />
              : <Lightbulb size={13} className="mt-0.5 text-amber-400 shrink-0" />
            }
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs text-text">{topic.topic}</span>
                <span className="text-2xs font-mono font-medium shrink-0 text-amber-500">OPEN</span>
              </div>
              <p className="text-2xs text-text-tertiary">{topic.reason}</p>
            </div>
          </li>
        ))}
        {/* Expand / collapse */}
        {!expanded && hiddenCount > 0 && (
          <li>
            <button
              onClick={() => setExpanded(true)}
              className="text-2xs font-mono text-text-tertiary hover:text-text transition-colors"
            >
              +{hiddenCount} more open
            </button>
          </li>
        )}
        {expanded && hiddenCount > 0 && (
          <li>
            <button
              onClick={() => setExpanded(false)}
              className="text-2xs font-mono text-text-tertiary hover:text-text transition-colors"
            >
              Show less
            </button>
          </li>
        )}
      </ul>
    </DisclosureSection>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function IntakeProgress({
  sessionId,
  contributions = [],
  onContributionAdded,
  context,
  riskTier,
  agentType,
  transparency,
  mobileOpen,
}: IntakeProgressProps) {
  const isContextReady = !!context;
  const modelName = transparency?.model?.name ?? "";
  const isHaiku = modelName.includes("haiku");

  // Fallback: fetch payload on mount for sidebar content when transparency is null (G2)
  const [fallbackSections, setFallbackSections] = useState<FallbackSection[] | null>(null);
  const [fallbackReadiness, setFallbackReadiness] = useState<ReadinessResult | null>(null);

  useEffect(() => {
    if (transparency) return; // Live data available — no fallback needed
    let cancelled = false;
    fetch(`/api/intake/sessions/${sessionId}/payload`)
      .then(r => r.ok ? r.json() : null)
      .then((payload: IntakePayload | null) => {
        if (cancelled || !payload) return;
        const sections = getSections(payload);
        setFallbackSections(sections);
        setFallbackReadiness(computeReadinessScore(payload, riskTier ?? null));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [sessionId, riskTier, transparency]);

  return (
    <aside
      className={`w-72 shrink-0 border-l border-border bg-surface flex-col ${
        mobileOpen
          ? "flex absolute inset-0 z-10 lg:relative lg:inset-auto animate-in slide-in-from-right duration-300"
          : "hidden lg:flex"
      }`}
    >
      {/* ── Header — pinned, never scrolls ─────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0">
        <span className="text-2xs font-mono font-semibold text-text-tertiary tracking-widest uppercase">
          Design Intelligence
        </span>
        <div className="flex items-center gap-2.5">
          {/* Model telemetry — merged into header */}
          {transparency && (
            <div
              className="flex items-center gap-1"
              title={transparency.model.reason}
            >
              <Cpu size={11} className="text-text-tertiary shrink-0" />
              <span className="text-2xs font-mono text-text-tertiary">
                {isHaiku ? "haiku" : "sonnet"}
                {transparency.expertiseLevel ? ` · ${transparency.expertiseLevel}` : ""}
              </span>
            </div>
          )}
          {/* Live indicator */}
          {transparency && (
            <div className="flex items-center gap-1">
              <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-2xs font-mono text-text-tertiary">Live</span>
            </div>
          )}
        </div>
      </div>

      <Divider soft />

      {/* ── AI Intelligence zone — scrollable ──────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="flex flex-col gap-2.5 px-4 py-3">

          {/* Empty state — shown only for brand-new sessions with no payload data */}
          {!transparency?.classification && !fallbackSections?.some(s => s.filled) && (
            <div className="rounded-lg border border-dashed border-border p-4 text-center">
              <BrainCircuit size={20} className="mx-auto mb-2 text-text-tertiary" />
              <p className="text-2xs font-mono text-text-tertiary">ANALYZING</p>
              <p className="mt-1 text-xs text-text-tertiary">
                Insights appear as your agent design takes shape.
              </p>
            </div>
          )}

          {/* Fallback: payload-derived session summary for returning sessions (G2) */}
          {!transparency && fallbackSections?.some(s => s.filled) && (
            <>
              {/* Classification from props */}
              {riskTier && agentType && (
                <div className="rounded-lg border border-border bg-surface-raised px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xs font-mono text-text-tertiary uppercase tracking-wide">Classification</span>
                    <span className={`text-2xs font-mono font-medium rounded-full px-1.5 py-0.5 ${TIER_COLORS[riskTier] ?? "bg-surface-muted text-text-secondary"}`}>
                      {riskTier.toUpperCase()}
                    </span>
                    <span className="text-2xs text-text-secondary">{AGENT_TYPE_LABELS[agentType] ?? agentType}</span>
                  </div>
                </div>
              )}

              {/* Section checklist */}
              <DisclosureSection
                defaultOpen={true}
                title="Session Progress"
                badge={
                  <span className="text-2xs font-mono font-medium tabular-nums text-text-tertiary">
                    {fallbackSections.filter(s => s.filled).length}/{fallbackSections.length}
                  </span>
                }
              >
                <ul className="flex flex-col gap-1.5 pt-1">
                  {fallbackSections.map(section => (
                    <li key={section.key} className="flex items-start gap-2">
                      {section.filled
                        ? <CheckCircle2 size={14} className="mt-0.5 text-emerald-500 shrink-0" />
                        : <Circle size={14} className="mt-0.5 text-border-strong shrink-0" />
                      }
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <span className={`text-xs ${section.filled ? "text-text-secondary" : "text-text-tertiary"}`}>
                            {section.label}
                          </span>
                          {section.required && !section.filled && (
                            <span className="text-2xs text-red-400 font-mono">REQ</span>
                          )}
                        </div>
                        {section.detail && (
                          <p className="text-2xs text-text-tertiary truncate" title={section.detail}>
                            {section.detail}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </DisclosureSection>

              {/* Readiness score */}
              {fallbackReadiness && fallbackReadiness.score > 0 && (
                <div className="rounded-lg border border-border bg-surface-raised px-3 py-2.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-2xs font-mono text-text-tertiary uppercase tracking-wide">Readiness</span>
                    <span className={`text-sm font-bold font-mono tabular-nums ${
                      fallbackReadiness.score >= 80 ? "text-emerald-600"
                      : fallbackReadiness.score >= 50 ? "text-amber-600"
                      : "text-text-tertiary"
                    }`}>
                      {fallbackReadiness.score}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-border overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        fallbackReadiness.score >= 80 ? "bg-emerald-500"
                        : fallbackReadiness.score >= 50 ? "bg-amber-400"
                        : "bg-slate-400"
                      }`}
                      style={{ width: `${fallbackReadiness.score}%` }}
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Classification — closed by default (passive metadata, not action) */}
          {transparency?.classification && (
            <DisclosureSection
              defaultOpen={false}
              title="Classification"
              badge={
                <span className={`text-2xs font-mono font-medium rounded-full px-1.5 py-0.5 ${TIER_COLORS[transparency.classification.riskTier] ?? "bg-surface-muted text-text-secondary"}`}>
                  {transparency.classification.riskTier.toUpperCase()}
                </span>
              }
            >
              <div className="flex flex-col gap-2.5 pt-1">
                {/* Risk signals — compact chips instead of bullet list */}
                <div>
                  <p className="text-2xs font-mono text-text-tertiary uppercase tracking-wide mb-1.5">
                    Risk signals
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {transparency.classification.signals.map((s, i) => (
                      <span
                        key={i}
                        className="inline-block rounded px-1.5 py-0.5 text-2xs bg-surface-muted border border-border text-text-secondary leading-tight"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
                {/* Agent type + depth — compact rows */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xs font-mono text-text-tertiary uppercase tracking-wide shrink-0">Type</span>
                    <span className="text-xs font-medium text-text">
                      {AGENT_TYPE_LABELS[transparency.classification.agentType] ?? transparency.classification.agentType}
                    </span>
                    {transparency.classification.rationale && (
                      <span className="text-2xs text-text-tertiary truncate" title={transparency.classification.rationale}>
                        — {transparency.classification.rationale}
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xs font-mono text-text-tertiary uppercase tracking-wide shrink-0">Depth</span>
                    <span className="text-xs text-text-secondary">
                      {DEPTH_LABELS[transparency.classification.conversationDepth] ?? transparency.classification.conversationDepth}
                    </span>
                  </div>
                </div>
              </div>
            </DisclosureSection>
          )}

          {/* Governance Checklist */}
          {transparency && transparency.governanceChecklist.length > 0 &&
            (() => {
              const satisfied = transparency.governanceChecklist.filter((g) => g.satisfied).length;
              const total = transparency.governanceChecklist.length;
              const pending = transparency.governanceChecklist.filter((g) => !g.satisfied);
              return (
                <GovernanceChecklistSection
                  checklist={transparency.governanceChecklist}
                  satisfied={satisfied}
                  total={total}
                  pending={pending}
                />
              );
            })()}

          {/* Coverage Analysis */}
          {transparency && transparency.probingTopics.length > 0 &&
            (() => {
              const covered = transparency.probingTopics.filter((t) => t.covered).length;
              const total = transparency.probingTopics.length;
              return (
                <CoverageAnalysisSection
                  topics={transparency.probingTopics}
                  covered={covered}
                  total={total}
                />
              );
            })()}

        </div>
      </div>

      <Divider soft />

      {/* ── Stakeholder zone — pinned, always visible ───────────────────── */}
      <div className="shrink-0 px-4 py-3">
        {onContributionAdded ? (
          isContextReady ? (
            <StakeholderContributionsPanel
              sessionId={sessionId}
              contributions={contributions}
              onContributionAdded={onContributionAdded}
              context={context}
              riskTier={riskTier}
            />
          ) : (
            /* ANALYZING state: compact summary row — stakeholder input not yet relevant */
            <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-raised px-3 py-2 opacity-50">
              <Users size={12} className="text-text-tertiary shrink-0" />
              <span className="text-2xs font-mono text-text-tertiary">
                Stakeholder input — available after context is captured
              </span>
            </div>
          )
        ) : null}
      </div>
    </aside>
  );
}
