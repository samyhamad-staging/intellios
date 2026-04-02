"use client";

import { useState, useRef, useEffect } from "react";
import {
  Target, Cpu, GitBranch, Database, ShieldAlert, Lock, ScrollText,
} from "lucide-react";
import type { IntakeTransparencyMetadata, DomainProgress } from "@/lib/types/intake-transparency";
import type { AgentType, IntakeRiskTier } from "@/lib/types/intake";

// ── Icon map ─────────────────────────────────────────────────────────────────

const DOMAIN_ICONS: Record<string, React.ElementType> = {
  identity:     Target,
  tools:        Cpu,
  instructions: GitBranch,
  knowledge:    Database,
  constraints:  ShieldAlert,
  governance:   Lock,
  audit:        ScrollText,
};

// ── Classification labels ─────────────────────────────────────────────────────

const AGENT_TYPE_LABELS: Record<AgentType, string> = {
  automation:        "Automation",
  "decision-support": "Decision Support",
  autonomous:        "Autonomous",
  "data-access":     "Data Access",
};

const RISK_TIER_BORDER: Record<IntakeRiskTier, string> = {
  low:      "border-l-emerald-500 text-emerald-700",
  medium:   "border-l-amber-500  text-amber-700",
  high:     "border-l-orange-500 text-orange-700",
  critical: "border-l-red-500    text-red-700",
};

// ── Fill bar color by level ────────────────────────────────────────────────────

function fillBarClass(fillLevel: number): string {
  if (fillLevel >= 4) return "bg-emerald-500";
  if (fillLevel >= 3) return "bg-indigo-600";
  if (fillLevel >= 2) return "bg-indigo-400";
  if (fillLevel >= 1) return "bg-blue-400/70";
  return "";
}

// ── Score ring color ──────────────────────────────────────────────────────────

function scoreStroke(score: number): string {
  if (score >= 80) return "#10b981"; // emerald-500
  if (score >= 50) return "#6366f1"; // indigo-500
  return "#94a3b8";                  // slate-400
}

function scoreTextClass(score: number): string {
  if (score >= 80) return "text-emerald-600";
  if (score >= 50) return "text-indigo-600";
  return "text-text-tertiary";
}

// ── Connector trace between chips ─────────────────────────────────────────────

function Connector({ leftIsRich }: { leftIsRich: boolean }) {
  return (
    <div
      className={`h-px w-3 shrink-0 bg-gradient-to-r ${
        leftIsRich
          ? "from-emerald-400/40 via-emerald-500/50 to-emerald-400/40"
          : "from-border via-border-strong to-border"
      }`}
    />
  );
}

// ── SVG Readiness Score Ring ──────────────────────────────────────────────────

const RING_R = 13;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_R; // ≈ 81.68

function ScoreRing({ score }: { score: number }) {
  const offset = RING_CIRCUMFERENCE * (1 - score / 100);
  const stroke = scoreStroke(score);
  const textClass = scoreTextClass(score);

  return (
    <div className="relative h-8 w-8 shrink-0" title={`Intake readiness: ${score}%`}>
      <svg
        viewBox="0 0 32 32"
        width="32"
        height="32"
        className="absolute inset-0"
        style={{ transform: "rotate(-90deg)" }}
      >
        {/* Track */}
        <circle
          cx="16" cy="16" r={RING_R}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className="text-border"
          opacity={0.4}
        />
        {/* Progress */}
        <circle
          cx="16" cy="16" r={RING_R}
          fill="none"
          stroke={stroke}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={offset}
          className="score-ring-circle"
        />
      </svg>
      <span
        className={`absolute inset-0 flex items-center justify-center text-2xs font-bold font-mono tabular-nums ${textClass}`}
      >
        {score}
      </span>
    </div>
  );
}

// ── Domain Chip ───────────────────────────────────────────────────────────────

function DomainChip({
  domain,
  isActive,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: {
  domain: DomainProgress;
  isActive: boolean;
  onClick?: () => void;
  onMouseEnter: (e: React.MouseEvent) => void;
  onMouseLeave: () => void;
}) {
  const Icon = DOMAIN_ICONS[domain.key] ?? Target;
  const barClass = fillBarClass(domain.fillLevel);

  return (
    <button
      type="button"
      data-domain={domain.key}
      onClick={onClick}
      className={`
        relative flex h-9 items-center gap-1.5 rounded-lg px-2.5 shrink-0
        transition-all duration-300 cursor-pointer select-none overflow-hidden
        ${isActive
          ? "bg-primary/8 border border-primary/50"
          : "bg-transparent border border-transparent hover:border-primary/30 hover:bg-primary/5"
        }
      `}
      style={isActive ? { boxShadow: "0 0 0 1px rgba(99,102,241,0.2), 0 0 12px rgba(99,102,241,0.15)" } : undefined}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Scan shimmer on active chip */}
      {isActive && (
        <div className="absolute inset-y-0 w-12 bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none animate-[domain-scan_2.5s_linear_infinite]" />
      )}

      {/* Icon */}
      <Icon
        size={13}
        className={`shrink-0 transition-colors duration-300 ${isActive ? "text-primary" : "text-text-tertiary"}`}
      />

      {/* Label */}
      <span
        className={`text-2xs whitespace-nowrap hidden sm:inline transition-colors duration-300 ${
          isActive ? "font-semibold text-text" : "font-medium text-text-secondary"
        }`}
      >
        {domain.label}
      </span>

      {/* Fill bar — absolute at bottom edge */}
      {domain.fillLevel > 0 && (
        <div
          className={`absolute bottom-0 left-0 h-0.5 rounded-full transition-all duration-700 ease-out ${barClass}`}
          style={{ width: `${domain.fillLevel * 25}%` }}
        />
      )}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface DomainProgressStripProps {
  transparency: IntakeTransparencyMetadata | null;
  classification: { agentType: AgentType; riskTier: IntakeRiskTier } | null;
  classificationLoading?: boolean;
  onOverrideClick?: () => void;
  /** Click a domain chip to steer the conversation toward that topic */
  onDomainClick?: (domainKey: string) => void;
  /** Shown before the first AI response populates transparency.domains */
  initialDomains?: DomainProgress[];
}

export function DomainProgressStrip({
  transparency,
  classification,
  classificationLoading,
  onOverrideClick,
  onDomainClick,
  initialDomains,
}: DomainProgressStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hoveredDomain, setHoveredDomain] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ left: number; top: number } | null>(null);

  const domains = transparency?.domains ?? initialDomains ?? [];
  const activeDomain = transparency?.activeDomain ?? null;
  const score = transparency?.readiness?.score ?? 0;

  // Auto-scroll active domain into view on narrow viewports
  useEffect(() => {
    if (!activeDomain || !scrollRef.current) return;
    const el = scrollRef.current.querySelector(`[data-domain="${activeDomain}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeDomain]);

  const handleMouseEnter = (domain: string, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setHoveredDomain(domain);
    setTooltipPos({ left: rect.left + rect.width / 2, top: rect.bottom + 6 });
  };

  const handleMouseLeave = () => {
    setHoveredDomain(null);
    setTooltipPos(null);
  };

  // Empty / skeleton state
  if (domains.length === 0) {
    return (
      <div className="flex items-center gap-1.5">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="h-9 w-16 animate-pulse rounded-lg bg-surface-muted shrink-0" />
            {i < 6 && <div className="h-px w-3 animate-pulse bg-surface-muted shrink-0" />}
          </div>
        ))}
        {classificationLoading && (
          <span className="ml-2 text-2xs font-mono text-text-tertiary animate-pulse">Analyzing…</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5 min-w-0">
      {/* Domain chips — scrollable on narrow viewports */}
      <div
        ref={scrollRef}
        className="flex items-center gap-0 overflow-x-auto scrollbar-none min-w-0"
      >
        {domains.map((domain, idx) => (
          <div key={domain.key} className="flex items-center">
            <DomainChip
              domain={domain}
              isActive={domain.key === activeDomain}
              onClick={() => onDomainClick?.(domain.key)}
              onMouseEnter={(e) => handleMouseEnter(domain.key, e)}
              onMouseLeave={handleMouseLeave}
            />
            {idx < domains.length - 1 && (
              <Connector leftIsRich={domain.fillLevel >= 4} />
            )}
          </div>
        ))}
      </div>

      {/* Separator */}
      <div className="h-4 w-px bg-border shrink-0" />

      {/* Classification badges + score */}
      <div className="flex items-center gap-2 shrink-0">
        {classification && (
          <>
            <span
              className="border-l-2 border-l-border pl-1.5 pr-2 py-0.5 text-2xs font-mono text-text-secondary bg-transparent rounded-sm cursor-pointer hover:text-text transition-colors"
              title={`Agent type: ${AGENT_TYPE_LABELS[classification.agentType]} (click to override)`}
              onClick={onOverrideClick}
            >
              {AGENT_TYPE_LABELS[classification.agentType]}
            </span>
            <span
              className={`border-l-2 pl-1.5 pr-2 py-0.5 text-2xs font-mono bg-transparent rounded-sm cursor-pointer hover:opacity-70 transition-opacity ${RISK_TIER_BORDER[classification.riskTier]}`}
              title={`Risk tier: ${classification.riskTier.toUpperCase()} (click to override)`}
              onClick={onOverrideClick}
            >
              {classification.riskTier.toUpperCase()}
            </span>
          </>
        )}
        {classificationLoading && !classification && (
          <div className="h-4 w-16 animate-pulse rounded bg-surface-muted" />
        )}

        {/* Coverage counter */}
        <div className="flex flex-col items-center shrink-0" title={`${domains.filter(d => d.fillLevel > 0).length} of ${domains.length} domains captured`}>
          <span className="text-xs font-bold font-mono tabular-nums text-text">
            {domains.filter(d => d.fillLevel > 0).length}/{domains.length}
          </span>
          <span className="text-2xs font-mono text-text-tertiary leading-none">domains</span>
        </div>
      </div>

      {/* Tooltip */}
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

// ── Tooltip ───────────────────────────────────────────────────────────────────

function DomainTooltip({
  domain,
  position,
  activeDomain,
}: {
  domain: DomainProgress;
  position: { left: number; top: number };
  activeDomain: string | null;
}) {
  const Icon = DOMAIN_ICONS[domain.key] ?? Target;

  const STATUS_LABELS: Record<DomainProgress["status"], string> = {
    empty:      "Not yet captured",
    started:    "Just started",
    developing: "Building coverage",
    adequate:   "Adequate coverage",
    rich:       "Rich and detailed",
  };

  return (
    <div
      className="fixed z-50 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 shadow-lg text-xs max-w-52 pointer-events-none"
      style={{ left: position.left, top: position.top, transform: "translateX(-50%)" }}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon size={12} className="text-slate-400 shrink-0" />
        <span className="font-semibold text-slate-100">{domain.label}</span>
        {domain.required && (
          <span className="text-2xs text-red-400 font-mono">REQ</span>
        )}
      </div>
      <p className="text-slate-400 font-mono text-2xs">{STATUS_LABELS[domain.status]}</p>
      {domain.itemCount > 0 && (
        <p className="text-slate-500 font-mono text-2xs mt-0.5">
          {domain.itemCount} {domain.itemCount === 1 ? "item" : "items"} captured
        </p>
      )}
      {domain.key === activeDomain ? (
        <p className="text-indigo-400 font-mono text-2xs font-medium mt-1">
          ▸ AI focusing here
        </p>
      ) : (
        <p className="text-slate-500 font-mono text-2xs mt-1">
          Click to focus here
        </p>
      )}
    </div>
  );
}
