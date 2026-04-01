"use client";

import { useState, useRef, useEffect } from "react";
import type { IntakeTransparencyMetadata, DomainProgress } from "@/lib/types/intake-transparency";
import type { AgentType, IntakeRiskTier } from "@/lib/types/intake";

// ── Classification label maps ───────────────────────────────────────────────

const AGENT_TYPE_LABELS: Record<AgentType, string> = {
  automation: "Automation",
  "decision-support": "Decision Support",
  autonomous: "Autonomous",
  "data-access": "Data Access",
};

const RISK_TIER_COLORS: Record<IntakeRiskTier, string> = {
  low: "bg-green-100 text-green-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

// ── Fill dot colors ─────────────────────────────────────────────────────────

const FILL_COLORS: Record<DomainProgress["status"], string> = {
  empty: "bg-gray-200",
  started: "bg-blue-300",
  developing: "bg-blue-400",
  adequate: "bg-indigo-500",
  rich: "bg-green-500",
};

// ── Score color ─────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 80) return "text-green-600 border-green-300 bg-green-50";
  if (score >= 50) return "text-amber-600 border-amber-300 bg-amber-50";
  return "text-gray-500 border-gray-200 bg-gray-50";
}

// ── Component ───────────────────────────────────────────────────────────────

interface DomainProgressStripProps {
  transparency: IntakeTransparencyMetadata | null;
  classification: { agentType: AgentType; riskTier: IntakeRiskTier } | null;
  classificationLoading?: boolean;
  onOverrideClick?: () => void;
  /** Shown before the first AI response populates transparency.domains */
  initialDomains?: DomainProgress[];
}

export function DomainProgressStrip({
  transparency,
  classification,
  classificationLoading,
  onOverrideClick,
  initialDomains,
}: DomainProgressStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hoveredDomain, setHoveredDomain] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ left: number; top: number } | null>(null);

  const domains = transparency?.domains ?? initialDomains ?? [];
  const activeDomain = transparency?.activeDomain ?? null;
  const score = transparency?.readiness?.score ?? 0;

  // Auto-scroll active domain into view on mobile
  useEffect(() => {
    if (!activeDomain || !scrollRef.current) return;
    const activeEl = scrollRef.current.querySelector(`[data-domain="${activeDomain}"]`);
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [activeDomain]);

  // Show tooltip near the hovered chip
  const handleMouseEnter = (domain: string, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setHoveredDomain(domain);
    setTooltipPos({ left: rect.left + rect.width / 2, top: rect.bottom + 4 });
  };

  const handleMouseLeave = () => {
    setHoveredDomain(null);
    setTooltipPos(null);
  };

  // If no domains yet (pre-context), show minimal state
  if (domains.length === 0) {
    return (
      <div className="flex items-center gap-2">
        {classificationLoading && (
          <div className="flex animate-pulse items-center gap-2">
            <div className="h-4 w-20 rounded-full bg-surface-muted" />
            <span className="text-xs text-text-tertiary">Analyzing...</span>
          </div>
        )}
        {!classificationLoading && (
          <span className="text-xs text-text-tertiary">
            Start describing your agent to track progress
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 min-w-0">
      {/* Domain chips — scrollable on narrow viewports */}
      <div
        ref={scrollRef}
        className="flex items-center gap-1.5 overflow-x-auto scrollbar-none min-w-0"
      >
        {domains.map((domain) => {
          const isActive = domain.key === activeDomain;
          return (
            <div
              key={domain.key}
              data-domain={domain.key}
              className={`
                flex items-center gap-1 rounded-full px-2 py-1 shrink-0
                transition-all duration-300 cursor-default select-none
                ${isActive
                  ? "ring-2 ring-primary/40 bg-primary/5"
                  : "bg-transparent hover:bg-surface-muted/50"
                }
              `}
              onMouseEnter={(e) => handleMouseEnter(domain.key, e)}
              onMouseLeave={handleMouseLeave}
            >
              {/* Icon */}
              <span className="text-xs leading-none">{domain.icon}</span>

              {/* Label — hidden on very narrow screens */}
              <span className={`text-2xs font-medium whitespace-nowrap hidden sm:inline ${
                isActive ? "text-text" : "text-text-secondary"
              }`}>
                {domain.label}
              </span>

              {/* Fill dots (4 dots) */}
              <div className="flex items-center gap-px ml-0.5">
                {[1, 2, 3, 4].map((level) => (
                  <span
                    key={level}
                    className={`
                      h-1.5 w-1.5 rounded-full transition-colors duration-500
                      ${level <= domain.fillLevel
                        ? FILL_COLORS[domain.status]
                        : "bg-gray-200"
                      }
                    `}
                  />
                ))}
              </div>

              {/* Required indicator for empty required domains */}
              {domain.required && domain.fillLevel === 0 && (
                <span className="h-1 w-1 rounded-full bg-red-400 shrink-0" title="Required" />
              )}
            </div>
          );
        })}
      </div>

      {/* Separator */}
      <div className="h-4 w-px bg-border shrink-0" />

      {/* Classification badges + score — compact right section */}
      <div className="flex items-center gap-1.5 shrink-0">
        {classification && (
          <>
            <span
              className="rounded-full bg-surface-muted px-2 py-0.5 text-2xs font-medium text-text-secondary cursor-pointer hover:bg-surface-raised transition-colors"
              title={`Agent type: ${AGENT_TYPE_LABELS[classification.agentType]} (click to override)`}
              onClick={onOverrideClick}
            >
              {AGENT_TYPE_LABELS[classification.agentType]}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-2xs font-semibold cursor-pointer hover:opacity-80 transition-opacity ${RISK_TIER_COLORS[classification.riskTier]}`}
              title={`Risk tier: ${classification.riskTier.toUpperCase()} (click to override)`}
              onClick={onOverrideClick}
            >
              {classification.riskTier.toUpperCase()}
            </span>
          </>
        )}
        {classificationLoading && !classification && (
          <div className="h-4 w-12 animate-pulse rounded-full bg-surface-muted" />
        )}

        {/* Readiness score badge */}
        <div
          className={`flex h-7 w-7 items-center justify-center rounded-full border text-2xs font-bold tabular-nums ${scoreColor(score)}`}
          title={`Intake readiness: ${score}%`}
        >
          {score}
        </div>
      </div>

      {/* Tooltip — rendered as a portal-like fixed element */}
      {hoveredDomain && tooltipPos && (
        <DomainTooltip
          domain={domains.find((d) => d.key === hoveredDomain)!}
          position={tooltipPos}
          activeDomain={activeDomain}
        />
      )}
    </div>
  );
}

// ── Tooltip ─────────────────────────────────────────────────────────────────

function DomainTooltip({
  domain,
  position,
  activeDomain,
}: {
  domain: DomainProgress;
  position: { left: number; top: number };
  activeDomain: string | null;
}) {
  const STATUS_LABELS: Record<DomainProgress["status"], string> = {
    empty: "Not yet captured",
    started: "Just started",
    developing: "Developing",
    adequate: "Adequate coverage",
    rich: "Rich and detailed",
  };

  return (
    <div
      className="fixed z-50 rounded-lg border border-border bg-surface px-3 py-2 shadow-md text-xs max-w-56 pointer-events-none"
      style={{
        left: position.left,
        top: position.top,
        transform: "translateX(-50%)",
      }}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-sm">{domain.icon}</span>
        <span className="font-semibold text-text">{domain.label}</span>
        {domain.required && (
          <span className="text-2xs text-red-500 font-medium">Required</span>
        )}
      </div>
      <p className="text-text-secondary mb-1">{STATUS_LABELS[domain.status]}</p>
      {domain.itemCount > 0 && (
        <p className="text-text-tertiary">
          {domain.itemCount} {domain.itemCount === 1 ? "item" : "items"} captured
        </p>
      )}
      {domain.key === activeDomain && (
        <p className="text-primary font-medium mt-1">
          AI is currently exploring this area
        </p>
      )}
    </div>
  );
}
