import { auth } from "@/auth";
import { db } from "@/lib/db";
import { agentBlueprints } from "@/lib/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import Link from "next/link";
import { Button } from "@/components/catalyst/button";
import { Heading, Subheading } from "@/components/catalyst/heading";
import { NewIntakeButton } from "@/components/intake/new-intake-button";
import { StatusBadge } from "@/components/registry/status-badge";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  Plus,
  Kanban,
  Library,
  ClipboardList,
  ChevronRight,
  Bot,
  Inbox,
  FileText,
  Flame,
  CheckCircle,
  AlertTriangle,
  Rocket,
  ShieldAlert,
  Clock,
  Shield,
  BarChart2,
  Search,
} from "lucide-react";
import type { ValidationReport } from "@/lib/governance/types";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { FleetGovernanceDashboard } from "@/components/dashboard/fleet-governance-dashboard";
import { HomeAgentList } from "@/components/dashboard/home-agent-list";
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
  draft:      { label: "Draft",      text: "text-text-secondary"    },
  in_review:  { label: "In Review",  text: "text-blue-700 dark:text-blue-300"       },
  approved:   { label: "Approved",   text: "text-emerald-700 dark:text-emerald-300" },
  deployed:   { label: "Deployed",   text: "text-violet-700 dark:text-violet-300"   },
  rejected:   { label: "Rejected",   text: "text-red-700 dark:text-red-300"     },
  deprecated: { label: "Deprecated", text: "text-text-secondary"    },
} as const;

const STAT_BORDERS: Record<string, string> = {
  draft:      "border-l-border",
  in_review:  "border-l-amber-400",
  approved:   "border-l-emerald-400",
  deployed:   "border-l-indigo-500",
};

const STAT_HINTS: Record<string, string> = {
  in_review:  "Awaiting review",
  approved:   "Ready to deploy",
};

const STAT_TINTS: Record<string, string> = {
  in_review: "bg-amber-50/60 dark:bg-amber-950/20",
  approved:  "bg-emerald-50/60 dark:bg-emerald-950/20",
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
          <p className={`text-xs font-mono font-medium ${delta >= 0 ? "text-emerald-600" : "text-red-500 dark:text-red-400"}`}>
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
          nextReviewDue: agentBlueprints.nextReviewDue,
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
          <Heading level={1} className="mb-1">Intellios</Heading>
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
      <div className="max-w-screen-2xl mx-auto w-full px-6 py-6">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <Heading level={1}>My Agents</Heading>
            <p className="mt-0.5 text-sm text-text-secondary">Design, refine, and submit agent blueprints for review.</p>
          </div>
          <NewIntakeButton className="inline-flex items-center gap-1.5" />
        </div>

        {/* Quick action cards */}
        <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { href: "/intake",      icon: Plus,      label: "New Intake",      sub: "Start from scratch",           color: "text-green-600 dark:text-emerald-400" },
            { href: "/blueprints",  icon: FileText,  label: "Blueprints",      sub: `${allAgents.length} packages`, color: "text-violet-600 dark:text-violet-400" },
            { href: "/pipeline",    icon: Kanban,    label: "Pipeline",        sub: "Track progress",               color: "text-primary" },
            { href: "/registry",    icon: Library,   label: "Registry",        sub: "Deployed agents",              color: "text-blue-600 dark:text-blue-400" },
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
              color: "text-red-700 dark:text-red-300", bgColor: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800",
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
              color: "text-green-700 dark:text-emerald-300", bgColor: "bg-green-50 dark:bg-emerald-950/30 border-green-200 dark:border-emerald-800",
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
              color: "text-amber-700 dark:text-amber-300", bgColor: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
            });
          }

          if (actions.length === 0) return null;

          return (
            <div className="mb-6 space-y-2">
              <SectionHeading>Action Queue</SectionHeading>
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

        {/* Recent agents — P2-34: searchable + filterable */}
        <HomeAgentList agents={myAgents} />
      </div>
    );
  }

  // ── Reviewer / Compliance Officer ─────────────────────────────────────────
  if (role === "reviewer" || role === "compliance_officer") {
    // Derive the highest-risk pending item for the urgency callout
    const criticalItems = inReviewAgents.filter((a) => {
      const report = a.validationReport as ValidationReport | null;
      return report?.violations?.some((v) => v.severity === "error");
    });
    const urgentItem = criticalItems[0] ?? null;

    return (
      <div className="max-w-screen-2xl mx-auto w-full px-6 py-6">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <Heading level={1}>
              {role === "compliance_officer" ? "Governance & Compliance" : "Review Overview"}
            </Heading>
            <p className="mt-0.5 text-sm text-text-secondary">
              Your review assignments and governance alerts.
            </p>
          </div>
          <Button href="/review" color="indigo">
            <ClipboardList size={14} />
            Review Queue{inReviewAgents.length > 0 && ` (${inReviewAgents.length})`}
          </Button>
        </div>

        {/* Urgency callout — highest-risk item surfaced immediately */}
        {urgentItem && (
          <Link
            href={`/registry/${urgentItem.agentId}?tab=review`}
            className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-4 py-3 transition-colors hover:bg-red-100 dark:hover:bg-red-900/40"
          >
            <Flame size={16} className="shrink-0 text-red-600 dark:text-red-400" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                {urgentItem.name ?? "Unnamed Agent"} has governance violations — needs your review
              </p>
              <p className="mt-0.5 text-xs text-red-500 dark:text-red-400">
                {criticalItems.length > 1 ? `+${criticalItems.length - 1} more high-risk items in queue` : "Review to approve, reject, or request changes"}
              </p>
            </div>
            <ChevronRight size={14} className="shrink-0 text-red-400" />
          </Link>
        )}

        <div className={`mb-6 grid grid-cols-1 gap-4 ${role === "compliance_officer" ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
          {(role === "compliance_officer"
            ? [
                { href: "/review",      icon: ClipboardList, label: "Review Queue",      sub: `${inReviewAgents.length} pending`,  color: "text-amber-600 dark:text-amber-400"  },
                { href: "/governance",  icon: Shield,        label: "Governance Hub",    sub: "Policies & violations",             color: "text-violet-600 dark:text-violet-400" },
                { href: "/governance",  icon: BarChart2,     label: "Compliance Posture",sub: "Fleet health at a glance",          color: "text-emerald-600"},
                { href: "/registry",    icon: Library,       label: "Agent Registry",    sub: "All versions",                      color: "text-blue-600 dark:text-blue-400"   },
              ]
            : [
                { href: "/review",   icon: ClipboardList, label: "Review Queue",   sub: `${inReviewAgents.length} pending`, color: "text-amber-600 dark:text-amber-400" },
                { href: "/pipeline", icon: Kanban,        label: "Pipeline Board", sub: `${allAgents.length} total`,        color: "text-primary"   },
                { href: "/registry", icon: Library,       label: "Agent Registry", sub: "All versions",                    color: "text-blue-600 dark:text-blue-400"  },
              ]
          ).map(({ href, icon: Icon, label, sub, color }) => (
            <Link key={`${href}-${label}`} href={href} className="group flex items-center gap-3 rounded-xl border border-border bg-surface p-4 shadow-[var(--shadow-card)] hover:border-primary-subtle hover:shadow-[var(--shadow-raised)] transition-all min-w-0">
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
          <SectionHeading className="mb-3">Pending Reviews</SectionHeading>
          {inReviewAgents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-surface px-6 py-10 text-center">
              <CheckCircle size={28} className="mx-auto mb-3 text-green-400" />
              <p className="text-sm font-medium text-text-secondary">Review queue is clear</p>
              <p className="mt-1 text-xs text-text-tertiary">
                {role === "compliance_officer"
                  ? "Use this time to review governance posture or update policies."
                  : "No agents are waiting for review right now."}
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {role === "compliance_officer" ? (
                  <>
                    <Link
                      href="/governance"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30 px-3 py-1.5 text-xs font-medium text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-colors"
                    >
                      <Shield size={12} /> Review Governance Hub
                    </Link>
                    <Link
                      href="/registry"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-raised transition-colors"
                    >
                      <Library size={12} /> Browse Agent Registry
                    </Link>
                  </>
                ) : (
                  <Link
                    href="/registry"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-raised transition-colors"
                  >
                    <Search size={12} /> Browse Recent Agents
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--shadow-card)]">
              {[...inReviewAgents]
                .sort((a, b) => {
                  // Sort: governance errors first, then oldest first
                  const aHasError = (a.validationReport as ValidationReport | null)?.violations?.some((v) => v.severity === "error") ? 0 : 1;
                  const bHasError = (b.validationReport as ValidationReport | null)?.violations?.some((v) => v.severity === "error") ? 0 : 1;
                  if (aHasError !== bHasError) return aHasError - bHasError;
                  return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
                })
                .slice(0, 8)
                .map((agent, i) => {
                  const hasErrors = (agent.validationReport as ValidationReport | null)?.violations?.some((v) => v.severity === "error");
                  return (
                    <Link
                      key={agent.agentId}
                      href={`/registry/${agent.agentId}?tab=review`}
                      className={`flex items-center gap-3 px-5 py-3.5 hover:bg-surface-raised transition-colors ${i > 0 ? "border-t border-border" : ""}`}
                    >
                      {hasErrors
                        ? <Flame size={15} className="shrink-0 text-red-500 dark:text-red-400" />
                        : <Bot size={15} className="shrink-0 text-text-tertiary" />
                      }
                      <span className="flex-1 truncate text-sm font-medium text-text">{agent.name ?? "Unnamed Agent"}</span>
                      <StatusBadge status={agent.status} />
                      {hasErrors
                        ? <span className="rounded-full bg-red-100 dark:bg-red-900/40 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-300">Violations</span>
                        : <span className="rounded-full bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">Review</span>
                      }
                      <span className="text-xs text-text-tertiary">{timeAgo(agent.updatedAt)}</span>
                      <ChevronRight size={13} className="text-text-tertiary" />
                    </Link>
                  );
                })}
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
    <div className="max-w-screen-2xl mx-auto w-full px-6 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <Heading level={1}>Overview</Heading>
            <p className="mt-0.5 text-sm text-text-tertiary">
              {allAgents.length} agent{allAgents.length === 1 ? "" : "s"}
            </p>
          </div>
          {qualityIndex != null && (
            <QualityRing score={qualityIndex} delta={qualityIndexDelta} />
          )}
        </div>
        {role !== "viewer" && role !== "admin" && (
          <NewIntakeButton className="inline-flex items-center gap-1.5" />
        )}
      </div>

      {/* Pipeline stats — status-coded cards */}
      <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["draft", "in_review", "approved", "deployed"] as const).map((s) => {
          const cfg = STATUS_CONFIG[s];
          const hint = STAT_HINTS[s] as string | undefined;
          const hasTint = hint != null && counts[s] > 0 && STAT_TINTS[s] != null;
          return (
            <Link
              key={s}
              href={activeStageLinks[s]}
              className={`group rounded-xl border border-border ${STAT_BORDERS[s]} border-l-[3px] ${hasTint ? STAT_TINTS[s] : "bg-surface"} px-4 py-3.5 shadow-[var(--shadow-card)] hover:bg-surface-raised transition-colors`}
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

      {/* Viewer Explore — contextual nav for read-only users */}
      {role === "viewer" && (
        <div className="mb-6">
          <SectionHeading className="mb-3">Explore</SectionHeading>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { href: "/registry",   icon: Search,    label: "Agent Registry",   sub: "Browse deployed agents",   color: "text-blue-600 dark:text-blue-400"   },
              { href: "/pipeline",   icon: Kanban,    label: "Pipeline Board",   sub: "See active work",          color: "text-primary"    },
              { href: "/governance", icon: Shield,    label: "Governance Hub",   sub: "Policies & compliance",    color: "text-violet-600 dark:text-violet-400" },
              { href: "/blueprints", icon: FileText,  label: "Blueprints",       sub: "Review specifications",    color: "text-amber-600 dark:text-amber-400"  },
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
        </div>
      )}

      {/* Admin Action Queue — alerts requiring attention */}
      {(() => {
        const now = new Date();
        type AdminAction = { icon: typeof AlertTriangle; label: string; sub: string; href: string; color: string; bgColor: string };
        const actions: AdminAction[] = [];

        // Approved/deployed agents with governance errors
        const govErrors = allAgents.filter((a) => {
          if (!["approved", "deployed"].includes(a.status)) return false;
          const report = a.validationReport as ValidationReport | null;
          return report?.violations?.some((v) => v.severity === "error");
        });
        if (govErrors.length > 0) {
          actions.push({
            icon: ShieldAlert,
            label: `${govErrors.length} deployed agent${govErrors.length === 1 ? "" : "s"} with governance errors`,
            sub: "Errors in approved or deployed agents require immediate resolution",
            href: "/registry",
            color: "text-red-700 dark:text-red-300", bgColor: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800",
          });
        }

        // Overdue periodic reviews
        const overdue = allAgents.filter(
          (a) => a.nextReviewDue != null && new Date(a.nextReviewDue) < now
        );
        if (overdue.length > 0) {
          actions.push({
            icon: Clock,
            label: `${overdue.length} agent${overdue.length === 1 ? "" : "s"} overdue for periodic review`,
            sub: "Scheduled reviews are past their due date",
            href: "/registry",
            color: "text-amber-700 dark:text-amber-300", bgColor: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
          });
        }

        // Agents waiting for review approval
        if (counts.in_review > 0) {
          actions.push({
            icon: AlertTriangle,
            label: `${counts.in_review} agent${counts.in_review === 1 ? "" : "s"} awaiting review approval`,
            sub: "Review queue has pending submissions",
            href: "/review",
            color: "text-blue-700 dark:text-blue-300", bgColor: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800",
          });
        }

        if (actions.length === 0) return null;

        return (
          <div className="mb-6 space-y-2">
            <SectionHeading>Action Queue</SectionHeading>
            {actions.slice(0, 4).map((action, i) => (
              <Link
                key={i}
                href={action.href}
                className={`group flex items-center gap-3 rounded-lg border px-4 py-3 transition-all hover:shadow-sm ${action.bgColor}`}
              >
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

      {/* Governance + Activity — two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <SectionHeading className="mb-3">Governance Health</SectionHeading>
          <FleetGovernanceDashboard enterpriseId={user.enterpriseId} userRole={role} compact />
        </div>
        <section className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <SectionHeading>Activity</SectionHeading>
            <Link href="/audit" className="text-xs text-primary hover:text-primary-hover">
              Audit trail →
            </Link>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4 shadow-[var(--shadow-card)]">
            <ActivityFeed compact />
          </div>
        </section>
      </div>
    </div>
  );
}
