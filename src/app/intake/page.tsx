import { auth } from "@/auth";
import { db } from "@/lib/db";
import { intakeSessions } from "@/lib/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { NewIntakeButton } from "@/components/intake/new-intake-button";
import { DeleteSessionButton } from "@/components/intake/delete-session-button";
import { computeDomainProgress } from "@/lib/intake/domains";
import type { IntakePayload, IntakeContext } from "@/lib/types/intake";
import type { DomainProgress } from "@/lib/types/intake-transparency";
import { MessageSquare, ChevronRight, Inbox } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { BadgeVariant } from "@/components/ui/badge";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Constants ─────────────────────────────────────────────────────────────────

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

// ── Types ─────────────────────────────────────────────────────────────────────

interface SessionData {
  id: string;
  status: string;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  agentName: string | null;
  agentPurpose: string | null;
  deploymentType: string | null;
  dataSensitivity: string | null;
  hasContext: boolean;
  domains: DomainProgress[];
  filledDomains: number;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function IntakeSessionsPage() {
  const session = await auth();
  const user = session?.user;
  if (!user) redirect("/login");
  if (user.role !== "architect" && user.role !== "admin") redirect("/");

  const enterpriseFilter =
    user.role === "admin"
      ? user.enterpriseId ? eq(intakeSessions.enterpriseId, user.enterpriseId) : isNull(intakeSessions.enterpriseId)
      : user.enterpriseId
        ? and(eq(intakeSessions.enterpriseId, user.enterpriseId), eq(intakeSessions.createdBy, user.email ?? ""))
        : and(isNull(intakeSessions.enterpriseId), eq(intakeSessions.createdBy, user.email ?? ""));

  const rows = await db
    .select({
      id: intakeSessions.id,
      status: intakeSessions.status,
      createdBy: intakeSessions.createdBy,
      createdAt: intakeSessions.createdAt,
      updatedAt: intakeSessions.updatedAt,
      intakePayload: intakeSessions.intakePayload,
      intakeContext: intakeSessions.intakeContext,
    })
    .from(intakeSessions)
    .where(enterpriseFilter)
    .orderBy(desc(intakeSessions.updatedAt));

  const sessions: SessionData[] = rows.map((s) => {
    const payload = (s.intakePayload ?? {}) as IntakePayload;
    const context = s.intakeContext as IntakeContext | null;
    const agentName = (payload?.identity as Record<string, unknown> | undefined)?.name as string | undefined;
    const domains = computeDomainProgress(payload, context, null);
    const filledDomains = domains.filter((d) => d.fillLevel > 0).length;

    return {
      id: s.id,
      status: s.status,
      createdBy: s.createdBy,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      agentName: agentName ?? null,
      agentPurpose: context?.agentPurpose ?? null,
      deploymentType: context?.deploymentType ?? null,
      dataSensitivity: context?.dataSensitivity ?? null,
      hasContext: !!context,
      domains,
      filledDomains,
    };
  });

  const active = sessions.filter((s) => s.status === "active");
  const completed = sessions.filter((s) => s.status === "completed");

  return (
    <div className="px-6 py-6">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text">Intake Sessions</h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            {sessions.length === 0
              ? "Start a session to begin designing an agent."
              : `${sessions.length} session${sessions.length > 1 ? "s" : ""} — ${active.length} in progress, ${completed.length} complete`}
          </p>
        </div>
        <NewIntakeButton className="btn-primary inline-flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50" />
      </div>

      {/* ── Empty state ─────────────────────────────────────────────────── */}
      {sessions.length === 0 && (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-surface py-16 text-center">
          <Inbox size={28} className="mb-3 text-text-tertiary" />
          <h2 className="mb-1 text-sm font-medium text-text">No intake sessions yet</h2>
          <p className="mb-6 max-w-xs text-xs text-text-secondary">
            Each agent starts with an intake conversation where you define its purpose, capabilities, and governance requirements.
          </p>
          <NewIntakeButton className="btn-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium" />
        </div>
      )}

      {/* ── In Progress ─────────────────────────────────────────────────── */}
      {active.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2.5 text-2xs font-mono font-semibold uppercase tracking-widest text-text-tertiary">
            In Progress — {active.length}
          </h2>
          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            {active.map((s, i) => (
              <SessionRow key={s.id} session={s} isLast={i === active.length - 1} />
            ))}
          </div>
        </section>
      )}

      {/* ── Completed ───────────────────────────────────────────────────── */}
      {completed.length > 0 && (
        <section>
          <h2 className="mb-2.5 text-2xs font-mono font-semibold uppercase tracking-widest text-text-tertiary">
            Completed — {completed.length}
          </h2>
          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            {completed.map((s, i) => (
              <SessionRow key={s.id} session={s} isLast={i === completed.length - 1} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ── Session Row ───────────────────────────────────────────────────────────────

function SessionRow({ session: s, isLast }: { session: SessionData; isLast: boolean }) {
  const badge = STATUS_BADGE[s.status] ?? STATUS_BADGE.active;
  const isActive = s.status === "active";
  const isCompleted = s.status === "completed";

  const displayName = s.agentName ?? (s.filledDomains > 0 ? "Unnamed agent" : "New session");

  const author = s.createdBy
    ? s.createdBy.includes("@") ? s.createdBy.split("@")[0] : s.createdBy
    : null;
  const meta = [author ? `by ${author}` : null, formatTime(s.updatedAt)].filter(Boolean).join(" · ");

  function subtitle(): { text: string; muted: boolean } {
    if (s.agentPurpose) return { text: s.agentPurpose, muted: false };
    if (s.filledDomains === 0) return { text: "No conversation started", muted: true };
    return { text: `${s.filledDomains} of 7 domains captured`, muted: true };
  }
  const sub = subtitle();

  return (
    <div
      className={`group relative flex items-stretch ${!isLast ? "border-b border-border" : ""}`}
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
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-medium text-text truncate">{displayName}</span>
            <Badge variant={badge.variant} dot>{badge.label}</Badge>
          </div>
          <p className={`text-xs truncate ${sub.muted ? "text-text-tertiary" : "text-text-secondary"}`}>
            {sub.text}
          </p>
          <p className="mt-0.5 text-2xs font-mono text-text-tertiary">{meta}</p>
        </div>

        {/* Right: domain strip + metadata */}
        <div className="hidden md:flex flex-col items-end gap-1.5 shrink-0 ml-4">
          {/* 7-chip domain micro-strip */}
          <div className="flex items-center gap-0.5" title={`${s.filledDomains} of 7 domains captured`}>
            {s.domains.map((domain) => (
              <div
                key={domain.key}
                className={`h-1.5 w-2.5 rounded-sm transition-colors ${FILL_COLORS[domain.fillLevel] ?? "bg-border"}`}
                title={`${domain.label}: ${domain.status}`}
              />
            ))}
          </div>
          {/* Count label */}
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
        </div>
      </Link>

      {/* Chevron — fades out on hover for active sessions to reveal delete */}
      <div className="flex items-center px-3 shrink-0">
        <ChevronRight
          size={14}
          className={`text-text-tertiary transition-opacity ${isActive ? "group-hover:opacity-0" : ""}`}
        />
      </div>

      {/* Delete button — fades in on hover, active sessions only */}
      {isActive && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <DeleteSessionButton sessionId={s.id} />
        </div>
      )}
    </div>
  );
}
