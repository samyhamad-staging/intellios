import { auth } from "@/auth";
import { db } from "@/lib/db";
import { agentBlueprints, intakeSessions } from "@/lib/db/schema";
import { and, desc, eq, isNull, inArray } from "drizzle-orm";
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
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { FleetGovernanceDashboard } from "@/components/dashboard/fleet-governance-dashboard";
import { getRecentSnapshots } from "@/lib/awareness/metrics-worker";
import type { ValidationReport } from "@/lib/governance/types";

function timeAgo(dateStr: string | Date): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "1d ago";
  if (diffDays < 30) return `${diffDays}d ago`;
  return `${Math.floor(diffDays / 7)}w ago`;
}

const STATUS_STAGE_CONFIG = {
  draft:      { label: "Draft",      kpi: "kpi-neutral"   },
  in_review:  { label: "In Review",  kpi: "kpi-review"    },
  approved:   { label: "Approved",   kpi: "kpi-compliant" },
  deployed:   { label: "Deployed",   kpi: "kpi-deployed"  },
} as const;

const TERMINAL_TEXT = {
  rejected:   "text-[color:var(--status-rejected-text)]",
  deprecated: "text-[color:var(--status-deprecated-text)]",
} as const;

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
          sessionId: agentBlueprints.sessionId,
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
  const approvedAgents = allAgents.filter((a) => a.status === "approved");
  const deployedAgents = allAgents.filter((a) => a.status === "deployed");
  const myAgents = user?.email
    ? allAgents.filter((a) => a.createdBy === user.email)
    : allAgents;

  // Compute action items for designer command center
  const blockedByGovernance = myAgents.filter((a) => {
    if (a.status !== "draft") return false;
    const report = a.validationReport as ValidationReport | null;
    return report && !report.valid;
  });
  const readyToSubmit = myAgents.filter((a) => {
    if (a.status !== "draft") return false;
    const report = a.validationReport as ValidationReport | null;
    return report?.valid === true;
  });
  const myInReview = myAgents.filter((a) => a.status === "in_review");
  const myApproved = myAgents.filter((a) => a.status === "approved");
  const staleDrafts = myAgents.filter((a) => {
    if (a.status !== "draft") return false;
    const daysSinceUpdate = (Date.now() - new Date(a.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceUpdate > 7;
  });

  const role = user?.role ?? "designer";

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-card bg-violet-500">
              <svg width="20" height="20" viewBox="0 0 14 14" fill="none">
                <path d="M2 11L7 3L12 11" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4.5 8H9.5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
          <h1 className="mb-1 text-2xl font-semibold text-gray-900">Intellios</h1>
          <p className="mb-8 text-sm text-gray-500">Enterprise Agent Factory</p>
          <Link href="/login" className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition-colors">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  // ── Designer — Architect Command Center ──────────────────────────────────
  if (role === "designer") {
    const actionItems = [
      ...blockedByGovernance.map((a) => ({
        agent: a,
        type: "governance" as const,
        icon: ShieldAlert,
        label: `${a.name ?? "Unnamed"} has governance violations`,
        cta: "Fix violations",
        href: `/blueprints/${a.id}`,
        color: "text-red-600",
        bgColor: "bg-red-50 border-red-200",
      })),
      ...readyToSubmit.map((a) => ({
        agent: a,
        type: "ready" as const,
        icon: CheckCircle,
        label: `${a.name ?? "Unnamed"} is ready for review`,
        cta: "Submit now",
        href: `/blueprints/${a.id}`,
        color: "text-green-600",
        bgColor: "bg-green-50 border-green-200",
      })),
      ...staleDrafts.filter((a) => !blockedByGovernance.includes(a) && !readyToSubmit.includes(a)).map((a) => ({
        agent: a,
        type: "stale" as const,
        icon: Clock,
        label: `${a.name ?? "Unnamed"} hasn't been updated in ${Math.floor((Date.now() - new Date(a.updatedAt).getTime()) / (1000 * 60 * 60 * 24))} days`,
        cta: "Resume",
        href: `/blueprints/${a.id}`,
        color: "text-amber-600",
        bgColor: "bg-amber-50 border-amber-200",
      })),
    ];

    const hasWork = myAgents.length > 0;

    return (
      <div className="px-8 py-8">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Architect Command Center</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              {hasWork
                ? `${myAgents.length} agent${myAgents.length === 1 ? "" : "s"} in your portfolio`
                : "Design your first agentic solution"}
            </p>
          </div>
          <NewIntakeButton className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 transition-colors disabled:opacity-50" />
        </div>

        {/* Action Items — the intelligence layer */}
        {actionItems.length > 0 && (
          <section className="mb-6">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Needs Your Attention
            </h2>
            <div className="space-y-2">
              {actionItems.map((item, i) => (
                <Link
                  key={`${item.type}-${item.agent.agentId}`}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-opacity hover:opacity-80 ${item.bgColor}`}
                >
                  <item.icon size={15} className={`shrink-0 ${item.color}`} />
                  <span className="flex-1 text-sm text-gray-800">{item.label}</span>
                  <span className={`text-xs font-semibold ${item.color} shrink-0 flex items-center gap-1`}>
                    {item.cta} <ArrowRight size={11} />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Portfolio KPI strip */}
        {hasWork && (
          <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Drafts",      count: draftAgents.filter(a => myAgents.includes(a)).length, color: "kpi-neutral",    href: "/pipeline" },
              { label: "In Review",   count: myInReview.length,   color: "kpi-review",    href: "/pipeline" },
              { label: "Approved",    count: myApproved.length,   color: "kpi-compliant", href: "/registry" },
              { label: "Deployed",    count: deployedAgents.filter(a => myAgents.includes(a)).length,  color: "kpi-deployed",  href: "/registry" },
            ].map(({ label, count, color, href }) => (
              <Link key={label} href={href} className={`rounded-card border p-4 text-center hover:shadow-md transition-shadow ${color} ${count === 0 ? "opacity-50 border-dashed" : ""}`}>
                <div className="text-2xl font-bold">{count}</div>
                <div className="mt-0.5 text-xs font-medium">{label}</div>
              </Link>
            ))}
          </div>
        )}

        {/* Quick actions */}
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { href: "/pipeline", icon: Kanban,  label: "Pipeline Board",  sub: `${allAgents.length} agents`, color: "text-violet-600" },
            { href: "/registry", icon: Library, label: "Agent Registry",  sub: "All versions",              color: "text-blue-600" },
            { href: "/intake",   icon: Plus,    label: "New Agent",       sub: "Start from scratch",        color: "text-green-600" },
          ].map(({ href, icon: Icon, label, sub, color }) => (
            <Link key={href} href={href} className="group flex items-center gap-3 rounded-card border border-gray-200 bg-white p-4 shadow-sm hover:border-violet-300 hover:shadow-md transition-all min-w-0">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-50 group-hover:bg-violet-50 transition-colors ${color}`}>
                <Icon size={16} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 truncate">{label}</p>
                <p className="text-xs text-gray-400">{sub}</p>
              </div>
              <ChevronRight size={14} className="ml-auto text-gray-300 group-hover:text-gray-400" />
            </Link>
          ))}
        </div>

        {/* My agents — grouped by status priority */}
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">My Agents</h2>
          {myAgents.length === 0 ? (
            <div className="flex flex-col items-center rounded-card border border-dashed border-gray-200 bg-white py-14 text-center">
              <Sparkles size={28} className="mb-3 text-violet-300" />
              <p className="text-sm font-medium text-gray-500">No agents yet</p>
              <p className="mt-1 text-xs text-gray-400">Describe the agent you want to build to get started.</p>
              <NewIntakeButton className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 transition-colors disabled:opacity-50" />
            </div>
          ) : (
            <div className="overflow-hidden rounded-card border border-gray-200 bg-white shadow-sm">
              {myAgents.slice(0, 12).map((agent, i) => {
                const report = agent.validationReport as ValidationReport | null;
                const hasViolations = report && !report.valid;
                const errorCount = report?.violations?.filter((v) => v.severity === "error").length ?? 0;

                return (
                  <Link
                    key={agent.agentId}
                    href={agent.status === "draft" ? `/blueprints/${agent.id}` : `/registry/${agent.agentId}`}
                    className={`flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors ${i > 0 ? "border-t border-gray-100" : ""}`}
                  >
                    <Bot size={15} className="shrink-0 text-gray-400" />
                    <span className="flex-1 truncate text-sm font-medium text-gray-900" title={agent.name ?? "Unnamed Agent"}>
                      {agent.name ?? "Unnamed Agent"}
                    </span>
                    {hasViolations && agent.status === "draft" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700">
                        <ShieldAlert size={9} />
                        {errorCount} violation{errorCount !== 1 ? "s" : ""}
                      </span>
                    )}
                    <StatusBadge status={agent.status} />
                    <span className="text-xs text-gray-400">{timeAgo(agent.updatedAt)}</span>
                    <ChevronRight size={13} className="text-gray-300" />
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    );
  }

  // ── Reviewer / Compliance Officer ─────────────────────────────────────────
  if (role === "reviewer" || role === "compliance_officer") {
    return (
      <div className="px-8 py-8">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {role === "compliance_officer" ? "Governance & Compliance" : "Review Queue"}
            </h1>
            <p className="mt-0.5 text-sm text-gray-500">
              {inReviewAgents.length > 0
                ? `${inReviewAgents.length} agent${inReviewAgents.length === 1 ? "" : "s"} pending review`
                : "Queue is clear"}
            </p>
          </div>
          <Link href="/review" className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 transition-colors">
            <ClipboardList size={14} />
            Review Queue{inReviewAgents.length > 0 && ` (${inReviewAgents.length})`}
          </Link>
        </div>

        <div className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { href: "/review",   icon: ClipboardList, label: "Review Queue",   sub: `${inReviewAgents.length} pending`, color: "text-amber-600" },
            { href: "/pipeline", icon: Kanban,         label: "Pipeline Board", sub: `${allAgents.length} total`,        color: "text-violet-600" },
            { href: "/registry", icon: Library,        label: "Agent Registry", sub: "All versions",                     color: "text-blue-600" },
          ].map(({ href, icon: Icon, label, sub, color }) => (
            <Link key={href} href={href} className="group flex items-center gap-3 rounded-card border border-gray-200 bg-white p-4 shadow-sm hover:border-violet-300 hover:shadow-md transition-all min-w-0">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-50 group-hover:bg-violet-50 transition-colors ${color}`}>
                <Icon size={16} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 truncate">{label}</p>
                <p className="text-xs text-gray-400">{sub}</p>
              </div>
              <ChevronRight size={14} className="ml-auto text-gray-300 group-hover:text-gray-400" />
            </Link>
          ))}
        </div>

        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Pending Reviews</h2>
          {inReviewAgents.length === 0 ? (
            <div className="flex flex-col items-center rounded-card border border-dashed border-gray-200 bg-white py-14 text-center">
              <CheckCircle size={28} className="mb-3 text-green-400" />
              <p className="text-sm font-medium text-gray-500">Review queue is clear</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-card border border-gray-200 bg-white shadow-sm">
              {inReviewAgents.slice(0, 8).map((agent, i) => (
                <Link
                  key={agent.agentId}
                  href={`/registry/${agent.agentId}?tab=review`}
                  className={`flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors ${i > 0 ? "border-t border-gray-100" : ""}`}
                >
                  <Bot size={15} className="shrink-0 text-gray-400" />
                  <span className="flex-1 truncate text-sm font-medium text-gray-900" title={agent.name ?? "Unnamed Agent"}>{agent.name ?? "Unnamed Agent"}</span>
                  <StatusBadge status={agent.status} />
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Review</span>
                  <span className="text-xs text-gray-400">{timeAgo(agent.updatedAt)}</span>
                  <ChevronRight size={13} className="text-gray-300" />
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  }

  // ── Admin ─────────────────────────────────────────────────────────────────
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

  const actionCallouts = [
    counts.in_review > 0 && {
      href: "/review",
      label: `${counts.in_review} blueprint${counts.in_review !== 1 ? "s" : ""} awaiting review`,
      cta: "Go to Review Queue →",
      color: "border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-300",
    },
    counts.approved > 0 && {
      href: "/deploy",
      label: `${counts.approved} approved agent${counts.approved !== 1 ? "s" : ""} ready to deploy`,
      cta: "Go to Deploy →",
      color: "border-green-200 bg-green-50 text-green-800 hover:border-green-300",
    },
  ].filter(Boolean) as { href: string; label: string; cta: string; color: string }[];

  const activeStageLinks: Record<string, string> = {
    draft: "/pipeline",
    in_review: "/review",
    approved: "/deploy",
    deployed: "/registry",
  };

  return (
    <div className="px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Overview</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {allAgents.length} agent{allAgents.length === 1 ? "" : "s"} across all teams
          </p>
        </div>
        {role !== "viewer" && (
          <NewIntakeButton className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 transition-colors disabled:opacity-50" />
        )}
      </div>

      {/* Notification strip — compact inline alerts when action is needed */}
      {actionCallouts.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2">
          {actionCallouts.map(({ href, label, cta, color: _ }) => (
            <Link
              key={href}
              href={href}
              className="inline-flex items-center gap-2 text-xs text-gray-600 transition-colors hover:text-gray-900"
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              <span>{label}</span>
              <span className="font-semibold text-violet-600">{cta}</span>
            </Link>
          ))}
        </div>
      )}

      {/* Pipeline status — active stages link to relevant pages */}
      <div className="mb-6">
        <div className="grid grid-cols-4 gap-3">
          {(["draft", "in_review", "approved", "deployed"] as const).map((s) => {
            const cfg = STATUS_STAGE_CONFIG[s];
            return (
              <Link
                key={s}
                href={activeStageLinks[s]}
                className={`rounded-card border p-4 hover:shadow-sm transition-shadow ${cfg.kpi}`}
              >
                <div className="text-2xl font-bold">{counts[s]}</div>
                <div className="mt-0.5 text-xs font-medium opacity-80">{cfg.label}</div>
              </Link>
            );
          })}
        </div>
        {/* Terminal states — compact, low-emphasis */}
        <div className="mt-2.5 flex items-center gap-4 px-1">
          {(["rejected", "deprecated"] as const).map((s) => (
            <span key={s} className={`text-xs font-medium opacity-70 ${TERMINAL_TEXT[s]}`}>
              {counts[s]} {s === "rejected" ? "Rejected" : "Deprecated"}
            </span>
          ))}
        </div>
      </div>

      {/* Governance Health KPI + Fleet Posture */}
      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Governance Health</h2>
          {qualityIndex != null && (
            <div className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border ${
              qualityIndex >= 80 ? "badge-gov-pass" :
              qualityIndex >= 60 ? "badge-gov-warn" :
              "badge-gov-error"
            }`}>
              {qualityIndexDelta != null && (
                qualityIndexDelta >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />
              )}
              Quality Index: {qualityIndex}/100
              {qualityIndexDelta != null && (
                <span className="ml-0.5 opacity-70">
                  ({qualityIndexDelta >= 0 ? "+" : ""}{qualityIndexDelta})
                </span>
              )}
            </div>
          )}
        </div>
        <FleetGovernanceDashboard
          enterpriseId={user.enterpriseId}
          userRole={role}
        />
      </div>

      {/* Recent activity */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Recent Activity</h2>
          <Link href="/registry" className="text-xs text-violet-600 hover:text-violet-700">View all →</Link>
        </div>
        {allAgents.length === 0 ? (
          <div className="flex flex-col items-center rounded-card border border-dashed border-gray-200 bg-white py-14 text-center">
            <Inbox size={28} className="mb-3 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">No agents in the system yet</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-card border border-gray-200 bg-white shadow-sm">
            {allAgents.slice(0, 8).map((agent, i) => {
              const author = agent.createdBy
                ? agent.createdBy.includes("@")
                  ? agent.createdBy.split("@")[0]
                  : agent.createdBy
                : null;
              return (
                <Link
                  key={agent.agentId}
                  href={`/registry/${agent.agentId}`}
                  className={`flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors ${i > 0 ? "border-t border-gray-100" : ""}`}
                >
                  <Bot size={15} className="shrink-0 text-gray-400" />
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900" title={agent.name ?? `Agent ${agent.agentId.slice(0, 8)}`}>{agent.name ?? `Agent ${agent.agentId.slice(0, 8)}`}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {author ? `by ${author} · ` : ""}{timeAgo(agent.updatedAt)}
                    </p>
                  </div>
                  <StatusBadge status={agent.status} />
                  <ChevronRight size={13} className="shrink-0 text-gray-300" />
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Workspace activity feed */}
      <section className="mt-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Workspace Activity
        </h2>
        <div className="rounded-card border border-gray-200 bg-white p-5 shadow-sm">
          <ActivityFeed />
        </div>
      </section>
    </div>
  );
}
