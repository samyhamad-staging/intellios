"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Target, Cpu, GitBranch, Database, ShieldAlert, Lock, ScrollText,
  UserPlus, X, Check, Loader2,
} from "lucide-react";
import { FormField } from "@/components/ui/form-field";
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
  low:      "text-emerald-700",
  medium:   "text-amber-700 dark:text-amber-300",
  high:     "text-orange-700 dark:text-orange-300",
  critical: "text-red-700 dark:text-red-300",
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
      title={isActive ? `Focusing on ${domain.label}` : `Click to focus conversation on ${domain.label}`}
      className={`
        relative flex h-9 items-center gap-1.5 rounded-lg px-2.5 shrink-0
        transition-all duration-300 cursor-pointer select-none overflow-hidden
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent
        ${isActive
          ? "bg-primary/12 border border-primary/50"
          : "bg-transparent border border-transparent hover:border-primary/30 hover:bg-primary/5"
        }
      `}
      style={isActive ? { boxShadow: "0 0 0 1px rgba(99,102,241,0.25), 0 0 14px rgba(99,102,241,0.18)" } : undefined}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Scan shimmer on active chip */}
      {isActive && (
        <div className="absolute inset-y-0 w-12 bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none animate-[domain-scan_2.5s_linear_infinite]" />
      )}

      {/* Active focus indicator — small pulsing dot above icon */}
      {isActive && (
        <span className="absolute top-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-primary animate-pulse" />
      )}

      {/* Icon */}
      <Icon
        size={13}
        className={`shrink-0 transition-colors duration-300 ${isActive ? "text-primary" : "text-text-tertiary"}`}
      />

      {/* Label */}
      <span
        className={`text-2xs whitespace-nowrap hidden sm:inline transition-colors duration-300 ${
          isActive ? "font-semibold text-primary" : "font-medium text-text-secondary"
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
  /** P2-134: Session ID — enables the Invite Stakeholder chip */
  sessionId?: string;
}

export function DomainProgressStrip({
  transparency,
  classification,
  classificationLoading,
  onOverrideClick,
  onDomainClick,
  initialDomains,
  sessionId,
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
    <div className="flex items-center gap-2 min-w-0">

      {/* "Navigate" label — frames chips as interactive navigation, not a stepper */}
      <div className="hidden xl:flex items-center gap-1.5 shrink-0">
        <span className="text-2xs font-mono text-text-tertiary uppercase tracking-widest">
          Navigate
        </span>
        <div className="h-3 w-px bg-border" />
      </div>

      {/* Domain chips — scrollable on narrow viewports */}
      <div
        ref={scrollRef}
        title="Click any domain to focus the conversation there"
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

      {/* Separator — wider gap signals a section boundary */}
      <div className="h-5 w-px bg-border-strong shrink-0 mx-1" />

      {/* Classification block — clearly labelled to distinguish from domain chips */}
      <div className="flex items-center gap-1.5 shrink-0">
        {classification && (
          <>
            {/* Agent type */}
            <div
              className="flex items-center gap-1 cursor-pointer group rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              title={`Agent type: ${AGENT_TYPE_LABELS[classification.agentType]} (click to override)`}
              onClick={onOverrideClick}
              role="button"
              tabIndex={0}
              onKeyDown={(e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOverrideClick?.(); } }}
            >
              <span className="text-2xs font-mono text-text-tertiary uppercase tracking-wide">type</span>
              <span className="text-2xs font-mono text-text-secondary group-hover:text-text transition-colors">
                {AGENT_TYPE_LABELS[classification.agentType]}
              </span>
            </div>
            <div className="h-3 w-px bg-border shrink-0" />
            {/* Risk tier */}
            <div
              className={`flex items-center gap-1 cursor-pointer group rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50`}
              title={`Risk tier: ${classification.riskTier.toUpperCase()} (click to override)`}
              onClick={onOverrideClick}
              role="button"
              tabIndex={0}
              onKeyDown={(e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOverrideClick?.(); } }}
            >
              <span className="text-2xs font-mono text-text-tertiary uppercase tracking-wide">risk</span>
              <span className={`text-2xs font-mono font-semibold ${RISK_TIER_BORDER[classification.riskTier]} border-0 pl-0`}>
                {classification.riskTier.toUpperCase()}
              </span>
            </div>
          </>
        )}
        {classificationLoading && !classification && (
          <div className="h-4 w-24 animate-pulse rounded bg-surface-muted" />
        )}
      </div>

      {/* Separator */}
      <div className="h-4 w-px bg-border shrink-0" />

      {/* Coverage counter */}
      <div className="flex flex-col items-center shrink-0" title={`${domains.filter(d => d.fillLevel > 0).length} of ${domains.length} domains captured`}>
        <span className="text-xs font-bold font-mono tabular-nums text-text">
          {domains.filter(d => d.fillLevel > 0).length}/{domains.length}
        </span>
        <span className="text-2xs font-mono text-text-tertiary leading-none">domains</span>
      </div>

      {/* P2-134: Invite Stakeholder chip */}
      {sessionId && (
        <>
          <div className="h-4 w-px bg-border shrink-0" />
          <InviteStakeholderChip sessionId={sessionId} />
        </>
      )}

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
      className="fixed z-50 rounded-lg border border-border-strong bg-surface px-3 py-2.5 shadow-lg text-xs max-w-52 pointer-events-none"
      style={{ left: position.left, top: position.top, transform: "translateX(-50%)" }}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon size={12} className="text-text-tertiary shrink-0" />
        <span className="font-semibold text-text">{domain.label}</span>
        {domain.required && (
          <span className="text-2xs text-red-400 font-mono">REQ</span>
        )}
      </div>
      <p className="text-text-tertiary font-mono text-2xs">{STATUS_LABELS[domain.status]}</p>
      {domain.itemCount > 0 && (
        <p className="text-text-secondary font-mono text-2xs mt-0.5">
          {domain.itemCount} {domain.itemCount === 1 ? "item" : "items"} captured
        </p>
      )}
      {domain.key === activeDomain ? (
        <p className="text-indigo-400 font-mono text-2xs font-medium mt-1">
          ▸ AI focusing here
        </p>
      ) : (
        <p className="text-text-secondary font-mono text-2xs mt-1">
          Click to focus here
        </p>
      )}
    </div>
  );
}

// ── P2-134: Invite Stakeholder Chip ───────────────────────────────────────────

const INVITE_DOMAINS = ["compliance", "risk", "legal", "security", "it", "operations", "business"] as const;
const RACI_ROLES = ["consulted", "informed", "responsible", "accountable"] as const;

function InviteStakeholderChip({ sessionId }: { sessionId: string }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [domain, setDomain] = useState<typeof INVITE_DOMAINS[number]>("compliance");
  const [raciRole, setRaciRole] = useState<typeof RACI_ROLES[number]>("consulted");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const reset = useCallback(() => {
    setEmail(""); setName(""); setDomain("compliance"); setRaciRole("consulted");
    setStatus("idle"); setErrorMsg(null);
  }, []);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/intake/sessions/${sessionId}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteeEmail: email, inviteeName: name || undefined, domain, raciRole }),
      });
      if (res.ok) {
        setStatus("sent");
        setTimeout(() => { setOpen(false); reset(); }, 2000);
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg((data as { message?: string }).message ?? "Could not send invitation.");
        setStatus("error");
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStatus("error");
    }
  }

  return (
    <div className="relative shrink-0" ref={popoverRef}>
      {/* Trigger chip */}
      <button
        onClick={() => { setOpen((v) => !v); if (!open) reset(); }}
        className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-2xs font-medium transition-colors ${
          open
            ? "border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300"
            : "border-border bg-surface text-text-tertiary hover:border-indigo-200 dark:hover:border-indigo-800 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
        }`}
        title="Invite a stakeholder to contribute to this intake session"
      >
        <UserPlus size={11} />
        <span className="hidden sm:inline">Invite</span>
      </button>

      {/* Popover */}
      {open && (
        <div className="absolute left-0 top-full mt-2 z-50 w-72 rounded-xl border border-border bg-surface shadow-[var(--shadow-raised)]">
          {status === "sent" ? (
            <div className="flex flex-col items-center gap-2 py-6 px-4 text-center">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 dark:bg-emerald-900/40">
                <Check size={16} className="text-green-600 dark:text-emerald-400" />
              </div>
              <p className="text-xs font-semibold text-text">Invitation sent!</p>
              <p className="text-2xs text-text-tertiary">{email}</p>
            </div>
          ) : (
            <form onSubmit={handleSend} className="p-4 space-y-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-text">Invite Stakeholder</p>
                <button type="button" onClick={() => setOpen(false)} className="text-text-tertiary hover:text-text">
                  <X size={13} />
                </button>
              </div>
              <p className="text-2xs text-text-secondary -mt-1">
                A unique link will be emailed for them to contribute their domain expertise.
              </p>

              {/* Email */}
              <FormField label="Email" htmlFor="invite-email" required>
                <input
                  id="invite-email"
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="stakeholder@company.com"
                  className="w-full rounded-lg border border-border bg-surface-muted px-3 py-1.5 text-xs text-text placeholder-text-tertiary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
                />
              </FormField>

              {/* Name */}
              <FormField label="Name" htmlFor="invite-name" optional>
                <input
                  id="invite-name"
                  type="text" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Smith"
                  className="w-full rounded-lg border border-border bg-surface-muted px-3 py-1.5 text-xs text-text placeholder-text-tertiary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
                />
              </FormField>

              {/* Domain + RACI row */}
              <div className="grid grid-cols-2 gap-2">
                <FormField label="Domain" htmlFor="invite-domain" required>
                  <select
                    id="invite-domain"
                    value={domain} onChange={(e) => setDomain(e.target.value as typeof INVITE_DOMAINS[number])}
                    className="w-full rounded-lg border border-border bg-surface-muted px-2 py-1.5 text-xs text-text focus:border-primary focus:outline-none capitalize"
                  >
                    {INVITE_DOMAINS.map((d) => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
                  </select>
                </FormField>
                <FormField label="RACI Role" htmlFor="invite-raci">
                  <select
                    id="invite-raci"
                    value={raciRole} onChange={(e) => setRaciRole(e.target.value as typeof RACI_ROLES[number])}
                    className="w-full rounded-lg border border-border bg-surface-muted px-2 py-1.5 text-xs text-text focus:border-primary focus:outline-none capitalize"
                  >
                    {RACI_ROLES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                  </select>
                </FormField>
              </div>

              {errorMsg && <p className="text-2xs text-red-600 dark:text-red-400">{errorMsg}</p>}

              <button
                type="submit"
                disabled={status === "sending" || !email}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {status === "sending" ? <><Loader2 size={12} className="animate-spin" /> Sending…</> : <><UserPlus size={12} /> Send Invitation</>}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
