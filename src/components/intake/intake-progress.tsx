"use client";

import { useState } from "react";
import { IntakeContext, IntakeRiskTier, StakeholderContribution } from "@/lib/types/intake";
import type { IntakeTransparencyMetadata } from "@/lib/types/intake-transparency";
import { StakeholderContributionsPanel } from "./stakeholder-contributions-panel";
import { Subheading } from "@/components/ui/heading";
import { Divider } from "@/components/ui/divider";
import { Shield, Lightbulb, CheckCircle2, Circle, ChevronDown, ChevronRight } from "lucide-react";

// ── Constants ────────────────────────────────────────────────────────────────

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

// ── Types ────────────────────────────────────────────────────────────────────

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

// ── Main component ───────────────────────────────────────────────────────────

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

  return (
    <aside
      className={`w-72 shrink-0 border-l border-gray-100 bg-white flex-col overflow-y-auto ${
        mobileOpen
          ? "flex absolute inset-0 z-10 lg:relative lg:inset-auto animate-in slide-in-from-right duration-300"
          : "hidden lg:flex"
      }`}
    >
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-3">
        <Subheading
          level={3}
          className="!text-2xs !font-semibold !text-gray-400 uppercase tracking-widest"
        >
          Intake Insights
        </Subheading>
      </div>

      <Divider soft />

      {/* ── Transparency panels ────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2.5 px-4 py-3">
        {/* Empty state — no transparency yet */}
        {!transparency && (
          <p className="py-3 text-center text-xs text-gray-400">
            Insights will appear as the conversation progresses.
          </p>
        )}

        {/* Classification Explainer */}
        {transparency?.classification && (
          <DisclosureSection
            title="Classification"
            badge={
              <span
                className={`text-2xs font-medium rounded-full px-1.5 py-0.5 ${
                  TIER_COLORS[transparency.classification.riskTier] ?? "bg-gray-100 text-gray-600"
                }`}
              >
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
                <p className="text-xs text-gray-600 mt-0.5">
                  {DEPTH_LABELS[transparency.classification.conversationDepth] ??
                    transparency.classification.conversationDepth}
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
                title="Required Governance"
                badge={
                  <span
                    className={`text-2xs font-medium tabular-nums ${
                      satisfied === total ? "text-green-600" : "text-amber-600"
                    }`}
                  >
                    {satisfied}/{total}
                  </span>
                }
              >
                <ul className="flex flex-col gap-1.5">
                  {transparency.governanceChecklist.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      {item.satisfied ? (
                        <CheckCircle2 size={14} className="mt-0.5 text-green-500 shrink-0" />
                      ) : (
                        <Circle size={14} className="mt-0.5 text-gray-300 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <span className={`text-xs ${item.satisfied ? "text-gray-500" : "text-gray-700"}`}>
                          {item.type}
                        </span>
                        <p className="text-2xs text-gray-400 truncate" title={item.reason}>
                          {item.reason}
                        </p>
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
                title="Probing Topics"
                badge={
                  <span
                    className={`text-2xs font-medium tabular-nums ${
                      covered === total ? "text-green-600" : "text-gray-400"
                    }`}
                  >
                    {covered}/{total}
                  </span>
                }
              >
                <ul className="flex flex-col gap-1.5">
                  {transparency.probingTopics.map((topic, i) => (
                    <li key={i} className="flex items-start gap-2">
                      {topic.level === "mandatory" ? (
                        <Shield size={13} className="mt-0.5 text-indigo-400 shrink-0" />
                      ) : (
                        <Lightbulb size={13} className="mt-0.5 text-amber-400 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs text-gray-700">{topic.topic}</span>
                          <span
                            className={`text-2xs font-medium shrink-0 ${
                              topic.covered ? "text-green-600" : "text-amber-500"
                            }`}
                          >
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

        {/* Model & Expertise Indicator */}
        {transparency && (
          <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2">
            <div className="flex items-center gap-1.5" title={transparency.model.reason}>
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  transparency.model.name.includes("haiku") ? "bg-gray-400" : "bg-blue-500"
                }`}
              />
              <span className="text-2xs text-gray-500">
                {transparency.model.name.includes("haiku") ? "Haiku" : "Sonnet"}
              </span>
            </div>
            {transparency.expertiseLevel && (
              <span
                className="text-2xs text-gray-400"
                title={`Detected expertise: ${transparency.expertiseLevel}`}
              >
                {transparency.expertiseLevel.charAt(0).toUpperCase() +
                  transparency.expertiseLevel.slice(1)}{" "}
                mode
              </span>
            )}
          </div>
        )}
      </div>

      <Divider soft />

      {/* ── Stakeholder contributions ─────────────────────────────────────── */}
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
              className="rounded-lg border border-dashed border-gray-200 px-4 py-3 text-center"
              title="Available after context is captured."
            >
              <p className="text-xs font-medium text-gray-400">Stakeholder Input</p>
              <p className="mt-1 text-xs text-gray-400">
                Available after context is captured.
              </p>
            </div>
          )
        ) : null}
      </div>
    </aside>
  );
}
