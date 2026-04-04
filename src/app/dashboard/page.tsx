"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from "@/components/ui/table";

interface AgentSummary {
  id: string;
  agentId: string;
  name: string | null;
  version: string;
  tags: string[];
  status: string;
  updatedAt: string;
}

interface AttentionItem {
  id: string;
  agentId: string;
  name: string | null;
  violationCount: number | null;
}

interface DashboardSummary {
  counts: { total: number; deployed: number; approved: number; inReview: number; draft: number; rejected: number; deprecated: number };
  governance: { clean: number; withErrors: number; notValidated: number; complianceRate: number | null };
  policyCount: number;
  recentDeployed: AgentSummary[];
  needingAttention: AttentionItem[];
}

// ── AI Briefing Widget ────────────────────────────────────────────────────────

type HealthStatus = "healthy" | "degraded" | "critical" | "unknown";

interface BriefingSummary {
  id: string;
  briefingDate: string;
  content: string;
  healthStatus: HealthStatus;
  generatedAt: string;
}

function AiBriefingWidget() {
  const [briefing, setBriefing] = useState<BriefingSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/monitor/intelligence/briefing")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        const latest = (data?.briefings as BriefingSummary[] | undefined)?.[0] ?? null;
        setBriefing(latest);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section>
        <h2 className="mb-3 text-xs font-semibold text-gray-400">AI Briefing</h2>
        <div className="h-16 animate-pulse rounded-xl bg-gray-100" />
      </section>
    );
  }

  if (!briefing) return null;

  const healthColors: Record<HealthStatus, string> = {
    healthy:  "bg-green-50  border-green-200  text-green-800",
    degraded: "bg-amber-50  border-amber-200  text-amber-800",
    critical: "bg-red-50    border-red-200    text-red-800",
    unknown:  "bg-gray-50   border-gray-200   text-gray-700",
  };
  const healthDot: Record<HealthStatus, string> = {
    healthy:  "bg-green-500",
    degraded: "bg-amber-500",
    critical: "bg-red-500",
    unknown:  "bg-gray-400",
  };
  const status = (briefing.healthStatus ?? "unknown") as HealthStatus;
  // Show first ~200 chars of content as the preview
  const preview = briefing.content.length > 200
    ? briefing.content.slice(0, 200).replace(/\s+\S*$/, "") + "…"
    : briefing.content;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold text-gray-400">AI Briefing</h2>
        <Link href="/monitor/intelligence" className="text-xs text-gray-400 hover:text-gray-700">
          View full briefing →
        </Link>
      </div>
      <div className={`rounded-xl border px-4 py-3.5 ${healthColors[status]}`}>
        <div className="flex items-start gap-3">
          <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${healthDot[status]}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs font-semibold capitalize">{status} · {briefing.briefingDate}</span>
              <span className="text-xs opacity-60">
                {new Date(briefing.generatedAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <p className="text-xs leading-relaxed opacity-80">{preview}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "1d ago";
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 8) return `${diffWeeks}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}


export default function ExecutiveDashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard/summary").then((r) => r.json()).catch(() => null),
      fetch("/api/me").then((r) => r.json()).catch(() => null),
    ]).then(([dashData, meData]) => {
      if (dashData) setSummary(dashData as DashboardSummary);
      else setError("Failed to load dashboard data");
      if (meData?.user?.role) setUserRole(meData.user.role as string);
      setLoading(false);
    });
  }, []);

  const { total, deployed, approved, inReview, draft, rejected, deprecated } = summary?.counts ?? { total: 0, deployed: 0, approved: 0, inReview: 0, draft: 0, rejected: 0, deprecated: 0 };
  const { clean, withErrors, notValidated, complianceRate } = summary?.governance ?? { clean: 0, withErrors: 0, notValidated: 0, complianceRate: null };
  const recentDeployed = summary?.recentDeployed ?? [];
  const needingAttention = summary?.needingAttention ?? [];
  const policyCount = summary?.policyCount ?? 0;

  // ── Deployment rate ──────────────────────────────────────────────────────
  const nonDraft       = total - draft;
  const deploymentRate = nonDraft > 0 ? Math.round((deployed / nonDraft) * 100) : null;

  // ── Pipeline funnel data ─────────────────────────────────────────────────
  const funnelStages = [
    { label: "Draft",       count: draft,       color: "dot-draft"    },
    { label: "In Review",   count: inReview,    color: "dot-review"   },
    { label: "Approved",    count: approved,    color: "dot-approved" },
    { label: "Deployed",    count: deployed,    color: "dot-deployed" },
  ];
  const funnelMax = Math.max(...funnelStages.map((s) => s.count), 1);

  return (
    <div className="px-6 py-6 space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        <p className="mt-0.5 text-sm text-gray-500">Platform health and governance posture</p>
      </div>

      <div className="space-y-6">
        {error && (
          <div className="rounded-lg border badge-gov-error p-4 text-sm">
            {error}
          </div>
        )}

        {/* ── Role-aware Next Actions ────────────────────────────────────── */}
        {!loading && userRole && (() => {
          type Action = { label: string; sub: string; href: string; urgent?: boolean };
          const actions: Action[] = [];

          if (userRole === "architect") {
            actions.push(
              { label: "Continue your sessions", sub: `${draft} draft blueprint${draft !== 1 ? "s" : ""} in progress`, href: "/intake" },
              { label: "Review quality scores", sub: "Check AI feedback on your blueprints", href: "/blueprints" },
              { label: "Prepare for deployment", sub: `${approved} blueprint${approved !== 1 ? "s" : ""} approved and ready`, href: "/deploy" },
            );
          } else if (userRole === "reviewer" || userRole === "compliance_officer") {
            actions.push(
              {
                label: inReview > 0 ? `${inReview} blueprint${inReview !== 1 ? "s" : ""} awaiting review` : "Review queue is clear",
                sub: inReview > 0 ? "Check SLA deadlines before items become overdue" : "No blueprints currently in review",
                href: "/review",
                urgent: inReview > 0,
              },
              { label: "Governance compliance", sub: `${complianceRate !== null ? `${complianceRate}% compliance rate` : "Check fleet compliance posture"}`, href: "/governance" },
              { label: "Audit log", sub: "Review recent governance actions", href: "/audit" },
            );
          } else if (userRole === "governor" || userRole === "admin") {
            actions.push(
              {
                label: inReview > 0 ? `${inReview} pending approval${inReview !== 1 ? "s" : ""}` : "Approval queue clear",
                sub: inReview > 0 ? "Fleet-wide review queue" : "No blueprints awaiting approval",
                href: "/governor/approvals",
                urgent: inReview > 0,
              },
              { label: "Fleet health", sub: `${deployed} deployed · ${clean} clean · ${withErrors} with errors`, href: "/governor/fleet" },
              { label: "Governance policies", sub: `${policyCount} polic${policyCount === 1 ? "y" : "ies"} active`, href: "/governor/policies" },
            );
          }

          if (actions.length === 0) return null;

          return (
            <section>
              <h2 className="mb-3 text-xs font-semibold text-gray-400">Your Next Actions</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {actions.map((action) => (
                  <Link
                    key={action.href + action.label}
                    href={action.href}
                    className={`flex items-center justify-between rounded-xl border px-4 py-3.5 transition-colors hover:shadow-sm ${
                      action.urgent
                        ? "border-amber-200 bg-amber-50 hover:bg-amber-100"
                        : "border-gray-200 bg-white hover:bg-gray-50"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold truncate ${action.urgent ? "text-amber-900" : "text-gray-800"}`}>
                        {action.label}
                      </p>
                      <p className={`mt-0.5 text-xs truncate ${action.urgent ? "text-amber-700" : "text-gray-500"}`}>
                        {action.sub}
                      </p>
                    </div>
                    <ArrowRight className={`ml-3 h-4 w-4 shrink-0 ${action.urgent ? "text-amber-500" : "text-gray-300"}`} />
                  </Link>
                ))}
              </div>
            </section>
          );
        })()}

        {/* ── Top-line KPIs ─────────────────────────────────────────────── */}
        <section>
          <h2 className="mb-4 text-xs font-semibold text-gray-400">Platform Overview</h2>
          <div className="grid grid-cols-4 gap-4">
            <KpiCard
              label="Compliance Rate"
              value={loading ? "–" : complianceRate !== null ? `${complianceRate}%` : "—"}
              sub={`${policyCount} polic${policyCount === 1 ? "y" : "ies"} active`}
              color={
                complianceRate !== null && complianceRate >= 80
                  ? "kpi-compliant"
                  : complianceRate !== null && complianceRate >= 50
                  ? "kpi-caution"
                  : "kpi-neutral"
              }
              subColor={
                complianceRate !== null && complianceRate >= 80
                  ? "text-[color:var(--gov-pass-icon)]"
                  : complianceRate !== null && complianceRate >= 50
                  ? "text-[color:var(--gov-warn-icon)]"
                  : "text-gray-400"
              }
              href="/governance"
            />
            <KpiCard
              label="Deployed Agents"
              value={loading ? "–" : deployed}
              sub="live in production"
              color="kpi-deployed"
              subColor="text-[color:var(--status-deployed-dot)]"
              href="/deploy"
            />
            <KpiCard
              label="Pending Review"
              value={loading ? "–" : inReview}
              sub={inReview > 0 ? "awaiting decision" : "queue clear"}
              color={inReview > 0 ? "kpi-review" : "kpi-neutral"}
              subColor={inReview > 0 ? "text-[color:var(--status-review-badge-dot)]" : "text-gray-400"}
              href="/review"
            />
            <KpiCard
              label="Deployment Rate"
              value={loading ? "–" : deploymentRate !== null ? `${deploymentRate}%` : "—"}
              sub="of non-draft agents"
              color="kpi-neutral"
              subColor="text-gray-400"
            />
          </div>
        </section>

        <div className="grid grid-cols-2 gap-8">
          {/* ── Pipeline funnel ────────────────────────────────────────── */}
          <section>
            <h2 className="mb-4 text-xs font-semibold text-gray-400">Pipeline Funnel</h2>
            <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
              {funnelStages.map((stage) => (
                <div key={stage.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700">{stage.label}</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {loading ? "–" : stage.count}
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-gray-100">
                    {!loading && (
                      <div
                        className={`h-2.5 rounded-full ${stage.color} transition-all`}
                        style={{ width: `${(stage.count / funnelMax) * 100}%` }}
                      />
                    )}
                  </div>
                </div>
              ))}

              {/* Terminal states */}
              <div className="border-t border-gray-100 pt-3 grid grid-cols-2 gap-3 text-center">
                <div>
                  <div className="text-xs text-gray-400">Rejected</div>
                  <div className="text-lg font-semibold text-[color:var(--status-rejected-text)]">{loading ? "–" : rejected}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Deprecated</div>
                  <div className="text-lg font-semibold text-[color:var(--status-deprecated-badge-text)]">{loading ? "–" : deprecated}</div>
                </div>
              </div>
            </div>
          </section>

          {/* ── Governance health ──────────────────────────────────────── */}
          <section>
            <h2 className="mb-4 text-xs font-semibold text-gray-400">Governance Health</h2>
            <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
              {/* Donut-style summary */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg badge-gov-pass p-3">
                  <div className="text-2xl font-bold">{loading ? "–" : clean}</div>
                  <div className="text-xs mt-0.5">Passing</div>
                </div>
                <div className="rounded-lg badge-gov-error p-3">
                  <div className="text-2xl font-bold">{loading ? "–" : withErrors}</div>
                  <div className="text-xs mt-0.5">With Errors</div>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <div className="text-2xl font-bold text-gray-700">{loading ? "–" : notValidated}</div>
                  <div className="text-xs text-gray-500 mt-0.5">Unvalidated</div>
                </div>
              </div>

              {/* Top violations */}
              {!loading && needingAttention.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2">Top issues to resolve</p>
                  <div className="space-y-1.5">
                    {needingAttention.map((agent) => (
                      <Link
                        key={agent.agentId}
                        href={`/registry/${agent.agentId}?tab=governance`}
                        className="flex items-center justify-between rounded-lg border border-[color:var(--gov-error-border)] bg-white px-3 py-2 hover:border-[color:var(--gov-error-icon)] transition-colors"
                      >
                        <span className="text-sm text-gray-800 truncate">
                          {agent.name ?? `Agent ${agent.agentId.slice(0, 8)}`}
                        </span>
                        <span className="shrink-0 ml-2 text-xs font-medium text-[color:var(--gov-error-text)]">
                          {agent.violationCount} error{agent.violationCount !== 1 ? "s" : ""}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {!loading && needingAttention.length === 0 && !loading && (
                <div className="text-center py-3">
                  <p className="text-sm font-medium text-[color:var(--gov-pass-text)]">✓ No governance errors detected</p>
                  <p className="text-xs text-[color:var(--gov-pass-icon)] mt-0.5">{clean} validated agent{clean !== 1 ? "s" : ""} passing</p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* ── Recent deployments ──────────────────────────────────────────── */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xs font-semibold text-gray-400">Recent Deployments</h2>
            <Link href="/deploy" className="text-xs text-gray-400 hover:text-gray-700">
              View all →
            </Link>
          </div>

          {loading && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100" />
              ))}
            </div>
          )}

          {!loading && recentDeployed.length === 0 && (
            <div className="rounded-card border border-dashed border-gray-300 bg-white p-8 text-center">
              <p className="text-sm text-gray-400">No agents deployed yet.</p>
              {approved > 0 && (
                <p className="mt-1 text-xs text-gray-400">
                  {approved} approved agent{approved !== 1 ? "s" : ""} ready to deploy.{" "}
                  <Link href="/deploy" className="underline hover:text-gray-600">
                    Go to Deployment Console →
                  </Link>
                </p>
              )}
            </div>
          )}

          {!loading && recentDeployed.length > 0 && (
            <div className="overflow-hidden rounded-card border border-gray-200 bg-white">
              <Table striped>
                <TableHead>
                  <TableRow>
                    <TableHeader>Agent</TableHeader>
                    <TableHeader>Version</TableHeader>
                    <TableHeader>Tags</TableHeader>
                    <TableHeader>Deployed</TableHeader>
                    <TableHeader></TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentDeployed.map((agent) => (
                    <TableRow key={agent.agentId}>
                      <TableCell className="font-medium text-gray-900">
                        {agent.name ?? `Agent ${agent.agentId.slice(0, 8)}`}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-gray-500">v{agent.version}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {(agent.tags ?? []).slice(0, 2).map((tag) => (
                            <span key={tag} className="rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-gray-400">{timeAgo(agent.updatedAt)}</TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/registry/${agent.agentId}`}
                          className="text-xs text-gray-400 hover:text-gray-700 underline"
                        >
                          View →
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>

        {/* ── AI Briefing Widget (P2-467) ─────────────────────────────────── */}
        <AiBriefingWidget />

      </div>
    </div>
  );
}
