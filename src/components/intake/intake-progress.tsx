"use client";

import { useState } from "react";
import { IntakeContext, IntakeRiskTier, StakeholderContribution } from "@/lib/types/intake";
import type { IntakeTransparencyMetadata } from "@/lib/types/intake-transparency";
import { StakeholderContributionsPanel } from "./stakeholder-contributions-panel";
import { Divider } from "@/components/ui/divider";
import {
  Shield, Lightbulb, CheckCircle2, Circle, ChevronDown, Cpu, BrainCircuit,
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
  transparency?: IntakeTransparencyMetadata | null;
  mobileOpen?: boolean;
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

// ── Main component ────────────────────────────────────────────────────────────

export function IntakeProgress({
  sessionId,
  contributions = [],
  onContributionAdded,
  context,
  riskTier,
  transparency,
  mobileOpen,
}: IntakeProgressProps) {
  const isContextReady = !!context;
  const modelName = transparency?.model?.name ?? "";
  const isHaiku = modelName.includes("haiku");

  return (
    <aside
      className={`w-72 shrink-0 border-l border-border bg-surface flex-col overflow-y-auto ${
        mobileOpen
          ? "flex absolute inset-0 z-10 lg:relative lg:inset-auto animate-in slide-in-from-right duration-300"
          : "hidden lg:flex"
      }`}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <span className="text-2xs font-mono font-semibold text-text-tertiary tracking-widest uppercase">
          System Analysis
        </span>
        {/* Live indicator — pulses when transparency is active */}
        {transparency && (
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-2xs font-mono text-text-tertiary">Live</span>
          </div>
        )}
      </div>

      <Divider soft />

      {/* ── Transparency panels ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-2.5 px-4 py-3">

        {/* Empty state — shown until the AI has produced classification metadata */}
        {!transparency?.classification && (
          <div className="rounded-lg border border-dashed border-border p-4 text-center">
            <BrainCircuit size={20} className="mx-auto mb-2 text-text-tertiary" />
            <p className="text-2xs font-mono text-text-tertiary">AWAITING SIGNAL</p>
            <p className="mt-1 text-xs text-text-tertiary">
              Classification and coverage signals populate as the conversation progresses.
            </p>
          </div>
        )}

        {/* Classification */}
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
            <div className="flex flex-col gap-2 pt-1">
              <div>
                <p className="text-2xs font-mono text-text-tertiary uppercase tracking-wide mb-1">Risk signals</p>
                <ul className="flex flex-col gap-0.5">
                  {transparency.classification.signals.map((s, i) => (
                    <li key={i} className="text-xs text-text-secondary flex items-start gap-1.5">
                      <span className="mt-1.5 h-1 w-1 rounded-full bg-text-tertiary shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-2xs font-mono text-text-tertiary uppercase tracking-wide mb-0.5">Agent type</p>
                <p className="text-xs text-text-secondary">
                  <span className="font-medium text-text">{AGENT_TYPE_LABELS[transparency.classification.agentType] ?? transparency.classification.agentType}</span>
                  {transparency.classification.rationale && (
                    <span className="text-text-tertiary"> — {transparency.classification.rationale}</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-2xs font-mono text-text-tertiary uppercase tracking-wide mb-0.5">Depth</p>
                <p className="text-xs text-text-secondary">
                  {DEPTH_LABELS[transparency.classification.conversationDepth] ?? transparency.classification.conversationDepth}
                </p>
              </div>
            </div>
          </DisclosureSection>
        )}

        {/* Governance Checklist */}
        {transparency && transparency.governanceChecklist.length > 0 &&
          (() => {
            const satisfied = transparency.governanceChecklist.filter((g) => g.satisfied).length;
            const total = transparency.governanceChecklist.length;
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
                  {transparency.governanceChecklist.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      {item.satisfied
                        ? <CheckCircle2 size={14} className="mt-0.5 text-emerald-500 shrink-0" />
                        : <Circle size={14} className="mt-0.5 text-border-strong shrink-0" />
                      }
                      <div className="min-w-0">
                        <span className={`text-xs ${item.satisfied ? "text-text-secondary" : "text-text"}`}>{item.type}</span>
                        <p className="text-2xs text-text-tertiary truncate" title={item.reason}>{item.reason}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </DisclosureSection>
            );
          })()}

        {/* Probing Topics */}
        {transparency && transparency.probingTopics.length > 0 &&
          (() => {
            const covered = transparency.probingTopics.filter((t) => t.covered).length;
            const total = transparency.probingTopics.length;
            return (
              <DisclosureSection
                defaultOpen={true}
                title="Probing Topics"
                badge={
                  <span className={`text-2xs font-mono font-medium tabular-nums ${covered === total ? "text-emerald-600" : "text-text-tertiary"}`}>
                    {covered}/{total}
                  </span>
                }
              >
                <ul className="flex flex-col gap-1.5 pt-1">
                  {transparency.probingTopics.map((topic, i) => (
                    <li key={i} className="flex items-start gap-2">
                      {topic.level === "mandatory"
                        ? <Shield size={13} className="mt-0.5 text-indigo-400 shrink-0" />
                        : <Lightbulb size={13} className="mt-0.5 text-amber-400 shrink-0" />
                      }
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs text-text">{topic.topic}</span>
                          <span className={`text-2xs font-mono font-medium shrink-0 ${topic.covered ? "text-emerald-600" : "text-amber-500"}`}>
                            {topic.covered ? "DONE" : "OPEN"}
                          </span>
                        </div>
                        <p className="text-2xs text-text-tertiary">{topic.reason}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </DisclosureSection>
            );
          })()}

        {/* Model telemetry row */}
        {transparency && (
          <div className="flex items-center justify-between rounded-lg border border-border bg-surface-raised px-3 py-2">
            <div className="flex items-center gap-1.5" title={transparency.model.reason}>
              <Cpu size={13} className="text-text-tertiary shrink-0" />
              <span className="text-2xs font-mono text-text-secondary">
                {isHaiku ? "claude-haiku" : "claude-sonnet"}
              </span>
              <span
                className={`h-1.5 w-1.5 rounded-full shrink-0 ${isHaiku ? "bg-amber-400" : "bg-indigo-400"}`}
                title={isHaiku ? "Haiku — efficient" : "Sonnet — advanced"}
              />
            </div>
            {transparency.expertiseLevel && (
              <span className="text-2xs font-mono text-text-tertiary" title={`Detected expertise: ${transparency.expertiseLevel}`}>
                {transparency.expertiseLevel} mode
              </span>
            )}
          </div>
        )}
      </div>

      <Divider soft />

      {/* ── Stakeholder contributions ───────────────────────────────────── */}
      <div className="px-4 py-3">
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
            <div
              className="rounded-lg border border-dashed border-border px-4 py-3 text-center"
              title="Available after context is captured."
            >
              <p className="text-2xs font-mono font-medium text-text-tertiary uppercase tracking-wide">
                Stakeholder Input
              </p>
              <p className="mt-1 text-xs text-text-tertiary">
                Available after context is captured.
              </p>
            </div>
          )
        ) : null}
      </div>
    </aside>
  );
}
