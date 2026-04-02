"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MessageSquare, ChevronRight, Search, ChevronDown, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { BadgeVariant } from "@/components/ui/badge";
import { DeleteSessionButton } from "@/components/intake/delete-session-button";
import type { DomainProgress } from "@/lib/types/intake-transparency";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface SerializedSessionData {
  id: string;
  status: string;
  createdBy: string | null;
  createdAt: string;  // ISO string
  updatedAt: string;  // ISO string
  agentName: string | null;
  agentPurpose: string | null;
  deploymentType: string | null;
  dataSensitivity: string | null;
  hasContext: boolean;
  domains: DomainProgress[];
  filledDomains: number;
}

interface IntakePageClientProps {
  sessions: SerializedSessionData[];
}

// ── Constants ──────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, { label: string; variant: BadgeVariant }> = {
  active:    { label: "In Progress", variant: "info" },
  completed: { label: "Complete",    variant: "success" },
  abandoned: { label: "Abandoned",   variant: "muted" },
};

const SENSITIVITY_LABELS: Record<string, string> = {
  public: "Public", internal: "Internal", confidential: "Confidential",
  pii: "PII", regulated: "Regulated",
};

const FILL_COLORS: Record<number, string> = {
  0: "bg-border",
  1: "bg-blue-400/60",
  2: "bg-indigo-400",
  3: "bg-indigo-600",
  4: "bg-emerald-500",
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatTime(isoDate: string, isStale: boolean): string {
  const date = new Date(isoDate);
  if (isStale) {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getDiffDays(isoDate: string): number {
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24));
}

// ── Session Row ────────────────────────────────────────────────────────────────

function SessionRow({
  session: s,
  isLast,
  isGhost = false,
}: {
  session: SerializedSessionData;
  isLast: boolean;
  isGhost?: boolean;
}) {
  const badge = STATUS_BADGE[s.status] ?? STATUS_BADGE.active;
  const isActive = s.status === "active";
  const isCompleted = s.status === "completed";
  const hasRealProgress = s.hasContext || s.filledDomains > 0;

  const diffDays = getDiffDays(s.updatedAt);
  const isStale = diffDays > 7 && isActive;

  const displayName = s.agentName ?? (s.filledDomains > 0 ? "Unnamed agent" : "New session");
  const author = s.createdBy
    ? s.createdBy.includes("@") ? s.createdBy.split("@")[0] : s.createdBy
    : null;
  const timeStr = formatTime(s.updatedAt, isStale);
  const meta = [author ? `by ${author}` : null, timeStr].filter(Boolean).join(" · ");

  function subtitle(): { text: string; muted: boolean } {
    if (s.agentPurpose) {
      const trimmed = s.agentPurpose.length > 80
        ? s.agentPurpose.slice(0, 80) + "…"
        : s.agentPurpose;
      return { text: trimmed, muted: false };
    }
    if (s.filledDomains === 0) return { text: "No conversation started", muted: true };
    return { text: `${s.filledDomains} of 7 domains captured`, muted: true };
  }
  const sub = subtitle();

  return (
    <div
      className={`group relative flex items-stretch ${!isLast ? "border-b border-border" : ""} ${isGhost ? "opacity-55" : ""}`}
    >
      {/* Left accent bar */}
      <div
        className={`w-0.5 shrink-0 transition-colors ${
          isActive && s.filledDomains > 0 ? "bg-primary/50"
          : isActive ? "bg-border"
          : isCompleted ? "bg-emerald-500/50"
          : "bg-transparent"
        }`}
      />

      {/* Main link area */}
      <Link
        href={`/intake/${s.id}`}
        className="flex flex-1 min-w-0 items-center gap-4 px-5 py-4 hover:bg-surface-muted transition-colors"
      >
        {/* Icon */}
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
            isActive && s.filledDomains > 0
              ? "bg-primary/8 text-primary"
              : "bg-surface-muted text-text-tertiary"
          }`}
        >
          <MessageSquare size={14} />
        </div>

        {/* Text content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="text-sm font-medium text-text truncate">{displayName}</span>
            {isStale ? (
              <Badge variant="warning" dot>Inactive {diffDays}d</Badge>
            ) : (
              <Badge variant={badge.variant} dot>{badge.label}</Badge>
            )}
          </div>
          <p className={`text-xs truncate ${sub.muted ? "text-text-tertiary" : "text-text-secondary"}`}>
            {sub.text}
          </p>
          <p className="mt-0.5 text-2xs font-mono text-text-tertiary">{meta}</p>
        </div>

        {/* Right: domain strip + metadata */}
        <div className="hidden md:flex flex-col items-end gap-1.5 shrink-0 ml-4">
          {/* 7-chip domain strip — improved size */}
          <div className="flex items-center gap-0.5" title={`${s.filledDomains} of 7 domains captured`}>
            {s.domains.map((domain) => (
              <div
                key={domain.key}
                className={`h-2 w-4 rounded-sm transition-colors ${FILL_COLORS[domain.fillLevel] ?? "bg-border"}`}
                title={`${domain.label}: ${domain.status}`}
              />
            ))}
          </div>
          {/* Count label — shown for all sessions */}
          <span className="text-2xs font-mono text-text-tertiary tabular-nums">
            {s.filledDomains}/7 domains
          </span>
          {/* Context badges */}
          {(s.deploymentType || s.dataSensitivity) && (
            <div className="flex items-center gap-1">
              {s.deploymentType && (
                <Badge variant="neutral" className="capitalize text-2xs">
                  {s.deploymentType.replace(/-/g, " ")}
                </Badge>
              )}
              {s.dataSensitivity && (
                <Badge variant="neutral" className="text-2xs">
                  {SENSITIVITY_LABELS[s.dataSensitivity] ?? s.dataSensitivity}
                </Badge>
              )}
            </div>
          )}
          {/* Continue affordance for sessions with real progress */}
          {hasRealProgress && isActive && (
            <span className="text-2xs font-medium text-primary group-hover:underline">
              Continue →
            </span>
          )}
        </div>
      </Link>

      {/* Chevron — fades out on hover for active sessions */}
      <div className="flex items-center px-3 shrink-0">
        <ChevronRight
          size={14}
          className={`text-text-tertiary transition-opacity ${isActive ? "group-hover:opacity-0" : ""}`}
        />
      </div>

      {/* Delete button — fades in on hover */}
      {isActive && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <DeleteSessionButton sessionId={s.id} />
        </div>
      )}
    </div>
  );
}

// ── Ghost sessions collapsible section ────────────────────────────────────────

function GhostSessionsSection({ ghosts }: { ghosts: SerializedSessionData[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [cleaning, setCleaning] = useState(false);

  async function handleCleanUp() {
    setCleaning(true);
    try {
      await Promise.all(
        ghosts.map((s) =>
          fetch(`/api/intake/sessions/${s.id}`, { method: "DELETE" })
        )
      );
    } finally {
      setCleaning(false);
      startTransition(() => router.refresh());
    }
  }

  return (
    <section className="mt-6">
      <div className="flex items-center justify-between mb-2.5">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 text-2xs font-mono font-semibold uppercase tracking-widest text-text-tertiary hover:text-text-secondary transition-colors"
        >
          <ChevronDown
            size={11}
            className={`transition-transform duration-200 ${open ? "rotate-0" : "-rotate-90"}`}
          />
          Empty — {ghosts.length}
        </button>
        <button
          onClick={handleCleanUp}
          disabled={cleaning || isPending}
          className="flex items-center gap-1 text-2xs font-mono text-text-tertiary hover:text-red-500 transition-colors disabled:opacity-40"
        >
          <Trash2 size={10} />
          {cleaning || isPending ? "Cleaning…" : `Clean up ${ghosts.length}`}
        </button>
      </div>
      {open && (
        <div className="overflow-hidden rounded-xl border border-border border-dashed bg-surface">
          {ghosts.map((s, i) => (
            <SessionRow key={s.id} session={s} isLast={i === ghosts.length - 1} isGhost />
          ))}
        </div>
      )}
    </section>
  );
}

// ── Main client component ──────────────────────────────────────────────────────

export function IntakePageClient({ sessions }: IntakePageClientProps) {
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");
  const [searchQuery, setSearchQuery] = useState("");

  // Split sessions into groups
  const realActive = useMemo(
    () => sessions.filter((s) => s.status === "active" && (s.hasContext || s.filledDomains > 0)),
    [sessions]
  );
  const ghostSessions = useMemo(
    () => sessions.filter((s) => s.status === "active" && !s.hasContext && s.filledDomains === 0),
    [sessions]
  );
  const completed = useMemo(
    () => sessions.filter((s) => s.status === "completed"),
    [sessions]
  );

  // Search filter — applied to whichever tab is active
  const query = searchQuery.toLowerCase().trim();
  const filteredActive = useMemo(
    () => realActive.filter((s) =>
      !query ||
      (s.agentName ?? "").toLowerCase().includes(query) ||
      (s.agentPurpose ?? "").toLowerCase().includes(query)
    ),
    [realActive, query]
  );
  const filteredCompleted = useMemo(
    () => completed.filter((s) =>
      !query ||
      (s.agentName ?? "").toLowerCase().includes(query) ||
      (s.agentPurpose ?? "").toLowerCase().includes(query)
    ),
    [completed, query]
  );

  const currentList = activeTab === "active" ? filteredActive : filteredCompleted;

  return (
    <div className="px-6 py-6">

      {/* Tab bar + search row */}
      <div className="mb-4 flex items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex items-center gap-0.5 rounded-lg border border-border bg-surface-muted p-0.5">
          <button
            onClick={() => setActiveTab("active")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === "active"
                ? "bg-surface text-text shadow-sm"
                : "text-text-secondary hover:text-text"
            }`}
          >
            In Progress
            <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-2xs font-mono tabular-nums ${
              activeTab === "active" ? "bg-primary/10 text-primary" : "bg-border text-text-tertiary"
            }`}>
              {realActive.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("completed")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === "completed"
                ? "bg-surface text-text shadow-sm"
                : "text-text-secondary hover:text-text"
            }`}
          >
            Complete
            <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-2xs font-mono tabular-nums ${
              activeTab === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-border text-text-tertiary"
            }`}>
              {completed.length}
            </span>
          </button>
        </div>

        {/* Search input */}
        <div className="relative max-w-xs w-full">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search sessions…"
            className="w-full rounded-lg border border-border bg-surface pl-8 pr-3 py-1.5 text-xs text-text placeholder-text-tertiary outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Session list */}
      {currentList.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          {currentList.map((s, i) => (
            <SessionRow key={s.id} session={s} isLast={i === currentList.length - 1} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-surface py-10 text-center">
          <p className="text-sm text-text-tertiary">
            {query
              ? `No ${activeTab === "active" ? "in-progress" : "completed"} sessions match "${searchQuery}"`
              : activeTab === "active"
                ? "No active sessions. Start a new agent above."
                : "No completed sessions yet."}
          </p>
        </div>
      )}

      {/* Ghost sessions — only shown on the active tab */}
      {activeTab === "active" && ghostSessions.length > 0 && (
        <GhostSessionsSection ghosts={ghostSessions} />
      )}
    </div>
  );
}
