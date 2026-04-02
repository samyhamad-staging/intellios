import { auth } from "@/auth";
import { db } from "@/lib/db";
import { agentBlueprints } from "@/lib/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import Link from "next/link";
import { NewIntakeButton } from "@/components/intake/new-intake-button";
import { StatusBadge } from "@/components/registry/status-badge";
import {
  Plus,
  Kanban,
  Library,
  ClipboardList,
  ChevronRight,
  Bot,
  Inbox,
  CheckCircle,
  AlertTriangle,
  Rocket,
  ShieldAlert,
  Clock,
} from "lucide-react";
import type { ValidationReport } from "@/lib/governance/types";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { FleetGovernanceDashboard } from "@/components/dashboard/fleet-governance-dashboard";
import { getRecentSnapshots } from "@/lib/awareness/metrics-worker";

function timeAgo(dateStr: string | Date): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "1d ago";
  if (diffDays < 30) return `${diffDays}d ago`;
  return `${Math.floor(diffDays / 7)}w ago`;
}

// Aligned with Badge design system variants:
// neutral=gray, info=blue, success=emerald, warning=amber, danger=red, accent=violet, muted=gray-50
const STATUS_CONFIG = {
  draft:      { label: "Draft",      text: "text-gray-600"    },
  in_review:  { label: "In Review",  text: "text-blue-700"    },
  approved:   { label: "Approved",   text: "text-emerald-700" },
  deployed:   { label: "Deployed",   text: "text-violet-700"  },
  rejected:   { label: "Rejected",   text: "text-red-700"     },
  deprecated: { label: "Deprecated", text: "text-gray-500"    },
} as const;

const STAT_BORDERS: Record<string, string> = {
  draft:      "border-l-gray-400",
  in_review:  "border-l-amber-400",
  approved:   "border-l-emerald-400",
  deployed:   "border-l-indigo-500",
};

const STAT_HINTS: Record<string, string> = {
  in_review:  "Awaiting review",
  approved:   "Ready to deploy",
};

function QualityRing({ score, delta }: { score: number; delta: number | null }) {
  const circumference = 2 * Math.PI * 14;
  const offset = circumference * (1 - score / 100);
  const ringColor =
    score >= 80 ? "stroke-emerald-500" : score >= 60 ? "stroke-amber-500" : "stroke-red-500";
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative">
        <svg viewBox="0 0 32 32" width="40" height="40">
          <circle
            cx="16" cy="16" r="14" fill="none" stroke="currentColor"
            strokeWidth="2.5" className="text-border" opacity={0.3}
          />
          <circle
            cx="16" cy="16" r="14" fill="none" strokeWidth="2.5"
            strokeDasharray={circumference} strokeDashoffset={offset}
            strokeLinecap="round" transform="rotate(-90 16 16)"
            className={`${ringColor} score-ring-circle`}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-2xs font-bold font-mono tabular-nums text-text">
          {score}
        </span>
      </div>
      <div>
        <p className="text-2xs font-mono text-text-tertiary uppercase tracking-wide">Quality Index</p>
        {delta != null && (
          <p className={`text-xs font-mono font-medium ${delta >= 0 ? "text-emerald-600" : "text-red-500"}`}>
            {delta >= 0 ? "+" : ""}{delta} pts
          </p>
        )}
      </div>
    </div>
  );
}

export default async function Home() {
  const session = await auth();
  const user = session?.user;

  const enterpriseFilter =
    user?.role === "admin"
      ? undefined
      : user?.enterpriseId
      ? eq(agentBlueprints.enterpriseId, user.enterpriseId)
      : isNull(agentBlueprints.enterpriseId);

  const allAgents = user
    ? await db
        .selectDistinctOn([agentBlueprints.agentId], {
          id: agentBlueprints.id,
          agentId: agentBlueprints.agentId,
          name: agentBlueprints.name,
          status: agentBlueprints.status,
          version: agentBlueprints.version,
          tags: agentBlueprints.tags,
          createdBy: agentBlueprints.createdBy,
          updatedAt: agentBlueprints.updatedAt,
          validationReport: agentBlueprints.validationReport,
        })
        .from(agentBlueprints)
        .where(enterpriseFilter)
        .orderBy(agentBlueprints.agentId, desc(agentBlueprints.updatedAt))
    : [];

  allAgents.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  const inReviewAgents = allAgents.filter((a) => a.status === "in_review");
  const draftAgents = allAgents.filter((a) => a.status === "draft");
  const myAgents = user?.email
    ? allAgents.filter((a) => a.createdBy === user.email)
    : allAgents;

  const role = user?.role ?? "architect";

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
              <svg width="20" height="20" viewBox="0 0 14 14" fill="none">
                <path d="M2 11L7 3L12 11" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4.5 8H9.5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
          <h1 className="mb-1 text-2xl font-semibold text-text">Intellios</h1>
          <p className="mb-6 text-sm text-text-secondary">Enterprise Agent Factory</p>
          <Link href="/login" className="rounded-lg bg-text px-5 py-2.5 text-sm font-medium text-surface hover:opacity-90 transition-opacity">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  // ── Architect ─────────────────────────────────────────────────────────────
  if (role === "architect") {
    return (
      <div className="px-6 py-6">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-text">My Work</h1>
            <p className="mt-0.5 text-sm text-text-secondary">Design, refine, and submit agent blueprints for review.</p>
          </div>
          <NewIntakeButton className="inline-flex items-center gap-1.5 rounded-lg btn-primary px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50" />
        </div>

        {/* Quick action cards */}
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { href: "/pipeline", icon: Kanban,  label: "Pipeline Board", sub: `${allAgents.length} agents`, color: "text-primary" },
            { href: "/registry", icon: Library, label: "Agent Registry",  sub: "All versions",              color: "text-blue-600" },
            { href: "/intake",   icon: Plus,    label: "New Intake",      sub: "Start from scratch",        color: "text-green-600" },
          ].map(({ href, icon: Icon, label, sub, color }) => (
            <Link key={href} href={href} className="group flex items-center gap-3 rounded-xl border border-border bg-surface p-4 shadow-[var(--shadow-card)] hover:border-primary-subtle hover:shadow-[var(--shadow-raised)] transition-all min-w-0">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-raised group-hover:bg-primary-muted transition-colors ${color}`}>
                <Icon size={16} />
              </div>
              <div>
                <p className="text-sm font-medium text-text truncate">{label}</p>
                <p className="text-xs text-text-tertiary">{sub}</p>
              </div>
              <ChevronRight size={14} className="ml-auto text-text-tertiary group-hover:text-text-secondary" />
            </Link>
          ))}
        </div>

        {/* Action Queue — computed items the architect should act on */}
        {(() => {
          type ActionItem = { icon: typeof AlertTriangle; label: string; sub: string; href: string; color: string; bgColor: string };
          const actions: ActionItem[] = [];

          // Agents with governance violations (draft, need fixing before submit)
          const draftsWithViolations = myAgents.filter((a) => {
            if (a.status !== "draft") return false;
            const report = a.validationReport as ValidationReport | null;
            return report?.violations?.some((v) => v.severity === "error");
          });
          if (draftsWithViolations.length > 0) {
            const first = draftsWithViolations[0];
            const errorCount = (first.validationReport as ValidationReport).violations.filter((v) => v.severity === "error").length;
            actions.push({
              icon: ShieldAlert,
              label: `${first.name ?? "Unnamed"} has ${errorCount} governance violation${errorCount === 1 ? "" : "s"}`,
              sub: "Fix violations before submitting for review",
              href: `/registry/${first.agentId}?tab=governance`,
              color: "text-red-700", bgColor: "bg-red-50 border-red-200",
            });
          }

          // Approved agents ready to deploy
          const approvedAgents = myAgents.filter((a) => a.status === "approved");
          if (approvedAgents.length > 0) {
            actions.push({
              icon: Rocket,
              label: `${approvedAgents[0].name ?? "Agent"} is approved — ready to deploy`,
              sub: `${approvedAgents.length} approved agent${approvedAgents.length === 1 ? "" : "s"} awaiting deployment`,
              href: "/deploy",
              color: "text-green-700", bgColor: "bg-green-50 border-green-200",
            });
          }

          // Drafts not yet submitted (no violations)
          const cleanDrafts = myAgents.filter((a) => {
            if (a.status !== "draft") return false;
            const report = a.validationReport as ValidationReport | null;
            return !report?.violations?.some((v) => v.severity === "error");
          });
          if (cleanDrafts.length > 0) {
            actions.push({
              icon: Clock,
              label: `${cleanDrafts.length} draft${cleanDrafts.length === 1 ? "" : "s"} ready to submit for review`,
              sub: "Governance checks pass — submit when ready",
              href: "/pipeline",
              color: "text-amber-700", bgColor: "bg-amber-50 border-amber-200",
            });
          }

          if (actions.length === 0) return null;

          return (
            <div className="mb-6 space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">Action Queue</h2>
              {actions.slice(0, 4).map((action, i) => (
                <Link key={i} href={action.href} className={`group flex items-center gap-3 rounded-lg border px-4 py-3 transition-all hover:shadow-sm ${action.bgColor}`}>
                  <action.icon size={16} className={`shrink-0 ${action.color}`} />
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium ${action.color}`}>{action.label}</p>
                    <p className="text-xs text-text-tertiary">{action.sub}</p>
                  </div>
                  <ChevronRight size={14} className="shrink-0 text-text-tertiary group-hover:text-text-secondary" />
                </Link>
              ))}
            </div>
          );
        })()}

        {/* Recent agents */}
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Recent Agents</h2>
          {myAgents.length === 0 ? (
            <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-surface py-14 text-center">
              <Inbox size={28} className="mb-3 text-text-tertiary" />
              <p className="text-sm font-medium text-text-secondary">No agents yet</p>
              <p className="mt-1 text-xs text-text-tertiary">Start an intake session to design your first agent.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--shadow-card)]">
              {myAgents.slice(0, 8).map((agent, i) => (
                <Link
                  key={agent.agentId}
                  href={`/registry/${agent.agentId}`}
                  className={`flex items-center gap-3 px-5 py-3.5 hover:bg-surface-raised transition-colors ${i > 0 ? "border-t border-border" : ""}`}
                >
                  <Bot size={15} className="shrink-0 text-text-tertiary" />
                  <span className="flex-1 truncate text-sm font-medium text-text">{agent.name ?? "Unnamed Agent"}</span>
                  <StatusBadge status={agent.status} />
                  <span className="text-xs text-text-tertiary">{timeAgo(agent.updatedAt)}</span>
                  <ChevronRight size={13} className="text-text-tertiary" />
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  }

  // ── Reviewer / Compliance Officer ─────────────────────────────────────────
  if (role === "reviewer" || role === "compliance_officer") {
    return (
      <div className="px-6 py-6">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-text">
              {role === "compliance_officer" ? "Governance & Compliance" : "Review Queue"}
            </h1>
            <p className="mt-0.5 text-sm text-text-secondary">
              {inReviewAgents.length > 0
                ? `${inReviewAgents.length} agent${inReviewAgents.length === 1 ? "" : "s"} pending review`
                : "Queue is clear"}
            </p>
          </div>
          <Link href="/review" className="inline-flex items-center gap-1.5 rounded-lg btn-primary px-4 py-2 text-sm font-medium transition-colors">
            <ClipboardList size={14} />
            Review Queue{inReviewAgents.length > 0 && ` (${inReviewAgents.length})`}
          </Link>
        </div>

        <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { href: "/review",   icon: ClipboardList, label: "Review Queue",   sub: `${inReviewAgents.length} pending`, color: "text-amber-600" },
            { href: "/pipeline", icon: Kanban,         label: "Pipeline Board", sub: `${allAgents.length} total`,        color: "text-primary" },
            { href: "/registry", icon: Library,        label: "Agent Registry", sub: "All versions",                     color: "text-blue-600" },
          ].map(({ href, icon: Icon, label, sub, color }) => (
            <Link key={href} href={href} className="group flex items-center gap-3 rounded-xl border border-border bg-surface p-4 shadow-[var(--shadow-card)] hover:border-primary-subtle hover:shadow-[var(--shadow-raised)] transition-all min-w-0">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-raised group-hover:bg-primary-muted transition-colors ${color}`}>
                <Icon size={16} />
              </div>
              <div>
                <p className="text-sm font-medium text-text truncate">{label}</p>
                <p className="text-xs text-text-tertiary">{sub}</p>
              </div>
              <ChevronRight size={14} className="ml-auto text-text-tertiary group-hover:text-text-secondary" />
            </Link>
          ))}
        </div>

        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Pending Reviews</h2>
          {inReviewAgents.length === 0 ? (
            <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-surface py-14 text-center">
              <CheckCircle size={28} className="mb-3 text-green-400" />
              <p className="text-sm font-medium text-text-secondary">Review queue is clear</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--shadow-card)]">
              {inReviewAgents.slice(0, 8).map((agent, i) => (
                <Link
                  key={agent.agentId}
                  href={`/registry/${agent.agentId}?tab=review`}
                  className={`flex items-center gap-3 px-5 py-3.5 hover:bg-surface-raised transition-colors ${i > 0 ? "border-t border-border" : ""}`}
                >
                  <Bot size={15} className="shrink-0 text-text-tertiary" />
                  <span className="flex-1 truncate text-sm font-medium text-text">{agent.name ?? "Unnamed Agent"}</span>
                  <StatusBadge status={agent.status} />
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Review</span>
                  <span className="text-xs text-text-tertiary">{timeAgo(agent.updatedAt)}</span>
                  <ChevronRight size={13} className="text-text-tertiary" />
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  }

  // ── Admin / Viewer ─────────────────────────────────────────────────────────
  const statuses = ["draft", "in_review", "approved", "deployed", "rejected", "deprecated"] as const;
  const counts = Object.fromEntries(
    statuses.map((s) => [s, allAgents.filter((a) => a.status === s).length])
  ) as Record<typeof statuses[number], number>;

  // Quality Index from awareness snapshots
  let qualityIndex: number | null = null;
  let qualityIndexDelta: number | null = null;
  try {
    const enterpriseId = user.enterpriseId ?? null;
    const snapshots = await getRecentSnapshots(enterpriseId, 2);
    const latest = snapshots[0] ?? null;
    const previous = snapshots[1] ?? null;
    qualityIndex = latest?.qualityIndex ?? null;
    qualityIndexDelta =
      latest?.qualityIndex != null && previous?.qualityIndex != null
        ? parseFloat((latest.qualityIndex - previous.qualityIndex).toFixed(1))
        : null;
  } catch (err) {
    console.error("[dashboard] Failed to fetch quality snapshots:", err);
  }

  const activeStageLinks: Record<string, string> = {
    draft: "/pipeline",
    in_review: "/review",
    approved: "/deploy",
    deployed: "/registry",
  };

  return (
    <div className="px-6 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl font-semibold text-text">Overview</h1>
            <p className="mt-0.5 text-sm text-text-tertiary">
              {allAgents.length} agent{allAgents.length === 1 ? "" : "s"}
            </p>
          </div>
          {qualityIndex != null && (
            <QualityRing score={qualityIndex} delta={qualityIndexDelta} />
          )}
        </div>
        {role !== "viewer" && (
          <NewIntakeButton className="inline-flex items-center gap-1.5 rounded-lg btn-primary px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50" />
        )}
      </div>

      {/* Pipeline stats — status-coded cards */}
      <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["draft", "in_review", "approved", "deployed"] as const).map((s) => {
          const cfg = STATUS_CONFIG[s];
          const hint = STAT_HINTS[s] as string | undefined;
          return (
            <Link
              key={s}
              href={activeStageLinks[s]}
              className={`group rounded-xl border border-border ${STAT_BORDERS[s]} border-l-[3px] bg-surface px-4 py-3.5 shadow-[var(--shadow-card)] hover:bg-surface-raised transition-colors`}
            >
              <span className={`text-2xl font-bold ${cfg.text}`}>{counts[s]}</span>
              <p className="mt-0.5 text-xs text-text-tertiary group-hover:text-text-secondary transition-colors">
                {cfg.label}
              </p>
              {counts[s] > 0 && hint && (
                <p className="mt-1.5 text-2xs font-medium text-primary/70">{hint} →</p>
              )}
            </Link>
          );
        })}
      </div>

      {/* Terminal states — inline muted badges, only when non-zero */}
      {(counts.rejected > 0 || counts.deprecated > 0) && (
        <div className="-mt-3 mb-6 flex items-center gap-3 px-1">
          {counts.rejected > 0 && (
            <span className="text-xs font-medium text-red-500/60">{counts.rejected} Rejected</span>
          )}
          {counts.deprecated > 0 && (
            <span className="text-xs text-text-tertiary">{counts.deprecated} Deprecated</span>
          )}
        </div>
      )}

      {/* Governance + Activity — two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
            Governance Health
          </h2>
          <FleetGovernanceDashboard enterpriseId={user.enterpriseId} userRole={role} />
        </div>
        <section className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">Activity</h2>
            <Link href="/audit" className="text-xs text-primary hover:text-primary-hover">
              Audit trail →
            </Link>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4 shadow-[var(--shadow-card)]">
            <ActivityFeed />
          </div>
        </section>
      </div>
    </div>
  );
}
