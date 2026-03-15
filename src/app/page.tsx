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
  Rocket,
  ClipboardList,
  BarChart3,
  ChevronRight,
  Bot,
  Inbox,
  CheckCircle,
} from "lucide-react";

function timeAgo(dateStr: string | Date): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "1d ago";
  if (diffDays < 30) return `${diffDays}d ago`;
  return `${Math.floor(diffDays / 7)}w ago`;
}

const STATUS_CONFIG = {
  draft:      { label: "Draft",      bg: "bg-slate-100",  text: "text-slate-600",  border: "border-slate-200" },
  in_review:  { label: "In Review",  bg: "bg-blue-50",    text: "text-blue-700",   border: "border-blue-200"  },
  approved:   { label: "Approved",   bg: "bg-green-50",   text: "text-green-700",  border: "border-green-200" },
  deployed:   { label: "Deployed",   bg: "bg-violet-50",  text: "text-violet-700", border: "border-violet-200"},
  rejected:   { label: "Rejected",   bg: "bg-red-50",     text: "text-red-700",    border: "border-red-200"   },
  deprecated: { label: "Deprecated", bg: "bg-amber-50",   text: "text-amber-700",  border: "border-amber-200" },
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

  const role = user?.role ?? "designer";

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500">
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

  // ── Designer ──────────────────────────────────────────────────────────────
  if (role === "designer") {
    return (
      <div className="px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">My Work</h1>
            <p className="mt-0.5 text-sm text-gray-500">Design, refine, and submit agent blueprints for review.</p>
          </div>
          <NewIntakeButton className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 transition-colors disabled:opacity-50" />
        </div>

        {/* Quick action cards */}
        <div className="mb-8 grid grid-cols-3 gap-4">
          {[
            { href: "/pipeline", icon: Kanban,      label: "Pipeline Board",  sub: `${allAgents.length} agents`, color: "text-violet-600" },
            { href: "/registry", icon: Library,     label: "Agent Registry",  sub: "All versions",              color: "text-blue-600" },
            { href: "/intake",   icon: Plus,         label: "New Intake",      sub: "Start from scratch",        color: "text-green-600" },
          ].map(({ href, icon: Icon, label, sub, color }) => (
            <Link key={href} href={href} className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:border-violet-300 hover:shadow-md transition-all">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-50 group-hover:bg-violet-50 transition-colors ${color}`}>
                <Icon size={16} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{label}</p>
                <p className="text-xs text-gray-400">{sub}</p>
              </div>
              <ChevronRight size={14} className="ml-auto text-gray-300 group-hover:text-gray-400" />
            </Link>
          ))}
        </div>

        {/* Drafts callout */}
        {draftAgents.length > 0 && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <span className="text-sm text-amber-800">
              <strong>{draftAgents.length} draft{draftAgents.length === 1 ? "" : "s"}</strong> not yet submitted for review.
            </span>
            <Link href="/pipeline" className="ml-auto text-xs font-medium text-amber-700 underline hover:text-amber-900">
              View in pipeline →
            </Link>
          </div>
        )}

        {/* Recent agents */}
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Recent Agents</h2>
          {myAgents.length === 0 ? (
            <div className="flex flex-col items-center rounded-xl border border-dashed border-gray-200 bg-white py-14 text-center">
              <Inbox size={28} className="mb-3 text-gray-300" />
              <p className="text-sm font-medium text-gray-500">No agents yet</p>
              <p className="mt-1 text-xs text-gray-400">Start an intake session to design your first agent.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              {myAgents.slice(0, 8).map((agent, i) => (
                <Link
                  key={agent.agentId}
                  href={`/registry/${agent.agentId}`}
                  className={`flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors ${i > 0 ? "border-t border-gray-100" : ""}`}
                >
                  <Bot size={15} className="shrink-0 text-gray-400" />
                  <span className="flex-1 truncate text-sm font-medium text-gray-900">{agent.name ?? "Unnamed Agent"}</span>
                  <StatusBadge status={agent.status} />
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

        <div className="mb-8 grid grid-cols-3 gap-4">
          {[
            { href: "/review",   icon: ClipboardList, label: "Review Queue",   sub: `${inReviewAgents.length} pending`, color: "text-amber-600" },
            { href: "/pipeline", icon: Kanban,         label: "Pipeline Board", sub: `${allAgents.length} total`,        color: "text-violet-600" },
            { href: "/registry", icon: Library,        label: "Agent Registry", sub: "All versions",                     color: "text-blue-600" },
          ].map(({ href, icon: Icon, label, sub, color }) => (
            <Link key={href} href={href} className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:border-violet-300 hover:shadow-md transition-all">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-50 group-hover:bg-violet-50 transition-colors ${color}`}>
                <Icon size={16} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{label}</p>
                <p className="text-xs text-gray-400">{sub}</p>
              </div>
              <ChevronRight size={14} className="ml-auto text-gray-300 group-hover:text-gray-400" />
            </Link>
          ))}
        </div>

        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Pending Reviews</h2>
          {inReviewAgents.length === 0 ? (
            <div className="flex flex-col items-center rounded-xl border border-dashed border-gray-200 bg-white py-14 text-center">
              <CheckCircle size={28} className="mb-3 text-green-400" />
              <p className="text-sm font-medium text-gray-500">Review queue is clear</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              {inReviewAgents.slice(0, 8).map((agent, i) => (
                <Link
                  key={agent.agentId}
                  href={`/registry/${agent.agentId}?tab=review`}
                  className={`flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors ${i > 0 ? "border-t border-gray-100" : ""}`}
                >
                  <Bot size={15} className="shrink-0 text-gray-400" />
                  <span className="flex-1 truncate text-sm font-medium text-gray-900">{agent.name ?? "Unnamed Agent"}</span>
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

  return (
    <div className="px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-gray-900">Overview</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          {allAgents.length} agent{allAgents.length === 1 ? "" : "s"} across all teams
        </p>
      </div>

      {/* Stats grid */}
      <div className="mb-8 grid grid-cols-6 gap-3">
        {statuses.map((s) => {
          const cfg = STATUS_CONFIG[s];
          return (
            <div key={s} className={`rounded-xl border ${cfg.border} ${cfg.bg} p-4`} style={{ boxShadow: "var(--shadow-card)" }}>
              <div className={`text-2xl font-bold ${cfg.text}`}>{counts[s]}</div>
              <div className={`mt-0.5 text-xs font-medium ${cfg.text} opacity-80`}>{cfg.label}</div>
            </div>
          );
        })}
      </div>

      {/* Quick action cards */}
      <div className="mb-8 grid grid-cols-4 gap-4">
        {[
          { href: "/pipeline", icon: Kanban,      label: "Pipeline Board",                    sub: `${allAgents.length} agents`,            color: "text-violet-600" },
          { href: "/deploy",   icon: Rocket,       label: "Deploy",                            sub: counts.approved > 0 ? `${counts.approved} ready` : "No agents ready", color: "text-green-600" },
          { href: "/review",   icon: ClipboardList,label: "Review Queue",                      sub: counts.in_review > 0 ? `${counts.in_review} pending` : "Queue clear",  color: "text-amber-600" },
          { href: "/dashboard",icon: BarChart3,    label: "Dashboard",                         sub: "Analytics & KPIs",                      color: "text-blue-600" },
        ].map(({ href, icon: Icon, label, sub, color }) => (
          <Link key={href} href={href} className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:border-violet-300 hover:shadow-md transition-all">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-50 group-hover:bg-violet-50 transition-colors ${color}`}>
              <Icon size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900">{label}</p>
              <p className="text-xs text-gray-400 truncate">{sub}</p>
            </div>
            <ChevronRight size={14} className="ml-auto shrink-0 text-gray-300 group-hover:text-gray-400" />
          </Link>
        ))}
      </div>

      {/* Recent activity */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Recent Activity</h2>
          <Link href="/registry" className="text-xs text-violet-600 hover:text-violet-700">View all →</Link>
        </div>
        {allAgents.length === 0 ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-gray-200 bg-white py-14 text-center">
            <Inbox size={28} className="mb-3 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">No agents in the system yet</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            {allAgents.slice(0, 8).map((agent, i) => (
              <Link
                key={agent.agentId}
                href={`/registry/${agent.agentId}`}
                className={`flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors ${i > 0 ? "border-t border-gray-100" : ""}`}
              >
                <Bot size={15} className="shrink-0 text-gray-400" />
                <span className="flex-1 truncate text-sm font-medium text-gray-900">{agent.name ?? "Unnamed Agent"}</span>
                <StatusBadge status={agent.status} />
                <span className="text-xs text-gray-400">{agent.createdBy ?? "—"}</span>
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
