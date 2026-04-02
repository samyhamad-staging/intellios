"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { TrendingUp } from "lucide-react";

interface QueueEntry {
  id: string;
  agentId: string;
  name: string | null;
  createdAt: string;
  updatedAt: string;
}

interface GovernanceAnalytics {
  totalPolicies: number;
  activePolicies: number;
  recentViolations: number;
  stalePolicies: number;
}

interface CompliancePosture {
  totalDeployed: number;
  clean: number;
  critical: number;
  unknown: number;
  complianceRate: number;
}

interface PortfolioSnapshot {
  weekStart: string;
  totalAgents: number;
  deployedAgents: number;
  complianceRate: number | null;
  avgQualityScore: number | null;
  totalViolations: number;
}

interface AuditEntry {
  id: string;
  action: string;
  actorEmail: string;
  actorRole: string;
  entityType: string;
  entityId: string;
  createdAt: string;
}

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 2) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMs / 3_600_000);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffMs / 86_400_000)}d ago`;
}

function SLARemaining({ updatedAt }: { updatedAt: string }) {
  const hoursElapsed = (Date.now() - new Date(updatedAt).getTime()) / 3_600_000;
  const slaDays = 3; // 3-day SLA
  const hoursRemaining = slaDays * 24 - hoursElapsed;
  if (hoursRemaining <= 0) {
    return <span className="text-xs font-medium text-red-600">Overdue</span>;
  }
  if (hoursRemaining < 24) {
    return <span className="text-xs font-medium text-amber-600">{Math.round(hoursRemaining)}h left</span>;
  }
  return <span className="text-xs text-gray-400">{Math.round(hoursRemaining / 24)}d left</span>;
}

export default function GovernorHomePage() {
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [analytics, setAnalytics] = useState<GovernanceAnalytics | null>(null);
  const [posture, setPosture] = useState<CompliancePosture | null>(null);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [trends, setTrends] = useState<PortfolioSnapshot[]>([]);

  useEffect(() => {
    const since24h = new Date(Date.now() - 24 * 3_600_000).toISOString();

    Promise.all([
      fetch("/api/review").then((r) => r.json()).catch(() => ({ blueprints: [] })),
      fetch("/api/governance/analytics").then((r) => r.json()).catch(() => null),
      fetch("/api/compliance/posture").then((r) => r.json()).catch(() => null),
      fetch(`/api/audit?since=${since24h}&limit=10`).then((r) => r.json()).catch(() => ({ entries: [] })),
      fetch("/api/portfolio/trends?weeks=12").then((r) => r.json()).catch(() => ({ snapshots: [] })),
    ]).then(([reviewData, analyticsData, postureData, auditData, trendsData]) => {
      setQueue((reviewData.blueprints ?? []).slice(0, 5));
      setAnalytics(analyticsData ?? null);
      setPosture(postureData ?? null);
      setAuditEntries(auditData.entries ?? []);
      setTrends(trendsData.snapshots ?? []);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Governor</h1>
        <p className="mt-0.5 text-sm text-gray-500">Governance control center</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

          {/* Pending Approvals */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Pending Approvals</p>
              <Link href="/governor/approvals" className="text-xs text-violet-600 hover:underline">View all →</Link>
            </div>
            {queue.length === 0 ? (
              <p className="text-sm text-gray-400">No blueprints awaiting review.</p>
            ) : (
              <ul className="space-y-3">
                {queue.map((bp) => (
                  <li key={bp.id} className="flex items-center justify-between">
                    <Link
                      href={`/registry/${bp.agentId}?tab=review`}
                      className="text-sm font-medium text-gray-800 hover:text-violet-700 truncate max-w-[200px]"
                    >
                      {bp.name ?? `Agent ${bp.agentId.slice(0, 8)}`}
                    </Link>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-gray-400">{timeAgo(bp.updatedAt)}</span>
                      <SLARemaining updatedAt={bp.updatedAt} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <span className="text-2xl font-bold text-gray-900">{queue.length}</span>
              <span className="ml-1 text-xs text-gray-500">in review</span>
            </div>
          </div>

          {/* Policy Health */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Policy Health</p>
              <Link href="/governor/policies" className="text-xs text-violet-600 hover:underline">View all →</Link>
            </div>
            {analytics === null ? (
              <p className="text-sm text-gray-400">Policy data unavailable.</p>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Active", value: analytics.activePolicies, color: "text-green-700" },
                  { label: "Violated", value: analytics.recentViolations, color: analytics.recentViolations > 0 ? "text-red-600" : "text-gray-600" },
                  { label: "Stale", value: analytics.stalePolicies, color: analytics.stalePolicies > 0 ? "text-amber-600" : "text-gray-600" },
                ].map((kpi) => (
                  <div key={kpi.label} className="text-center">
                    <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{kpi.label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Compliance KPIs */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Compliance KPIs</p>
              <Link href="/governor/compliance" className="text-xs text-violet-600 hover:underline">Details →</Link>
            </div>
            {posture === null ? (
              <p className="text-sm text-gray-400">Compliance data unavailable.</p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Compliance rate</span>
                  <span className={`text-sm font-semibold ${posture.complianceRate >= 80 ? "text-green-700" : posture.complianceRate >= 60 ? "text-amber-600" : "text-red-600"}`}>
                    {posture.complianceRate.toFixed(0)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Clean agents</span>
                  <span className="text-sm font-semibold text-gray-900">{posture.clean} / {posture.totalDeployed}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Critical</span>
                  <span className={`text-sm font-semibold ${posture.critical > 0 ? "text-red-600" : "text-gray-400"}`}>{posture.critical}</span>
                </div>
              </div>
            )}
          </div>

          {/* Recent Audit Activity */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Audit Activity (24h)</p>
              <Link href="/governor/audit" className="text-xs text-violet-600 hover:underline">Full log →</Link>
            </div>
            {auditEntries.length === 0 ? (
              <p className="text-sm text-gray-400">No audit activity in the past 24 hours.</p>
            ) : (
              <ul className="space-y-2">
                {auditEntries.map((entry) => (
                  <li key={entry.id} className="flex items-start gap-2">
                    <span className="mt-0.5 inline-block h-1.5 w-1.5 rounded-full bg-violet-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-700 truncate">
                        <span className="font-medium">{entry.actorEmail}</span>{" "}
                        <span className="text-gray-500">{entry.action.replace(/_/g, " ")}</span>
                      </p>
                      <p className="text-2xs text-gray-400">{timeAgo(entry.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

        </div>

      )}

      {/* Portfolio Trends — H2-5.1 */}
      {!loading && trends.length > 0 && (
        <div className="mt-5 rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                <TrendingUp size={12} /> Portfolio Trends (12 weeks)
              </p>
              <Link href="/governor/executive" className="text-xs text-violet-600 hover:underline">Executive view →</Link>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {/* Compliance rate sparkline */}
              <div>
                <p className="text-xs-tight text-gray-400 mb-1.5">Compliance Rate</p>
                <div className="flex items-end gap-0.5 h-10">
                  {trends.map((s, i) => {
                    const val = s.complianceRate ?? 0;
                    const height = Math.max(4, Math.round((val / 100) * 40));
                    const color = val >= 80 ? "bg-green-400" : val >= 60 ? "bg-amber-400" : "bg-red-400";
                    return (
                      <div key={i} title={`${s.weekStart}: ${val.toFixed(0)}%`}
                        style={{ height }} className={`flex-1 rounded-sm ${color} opacity-80`} />
                    );
                  })}
                </div>
                <p className="mt-1 text-xs font-semibold text-gray-700">
                  {(trends[trends.length - 1]?.complianceRate ?? 0).toFixed(0)}%
                  <span className="ml-1 font-normal text-gray-400">current</span>
                </p>
              </div>
              {/* Violations sparkline */}
              <div>
                <p className="text-xs-tight text-gray-400 mb-1.5">Weekly Violations</p>
                <div className="flex items-end gap-0.5 h-10">
                  {trends.map((s, i) => {
                    const max = Math.max(...trends.map((t) => t.totalViolations), 1);
                    const height = Math.max(4, Math.round((s.totalViolations / max) * 40));
                    const color = s.totalViolations === 0 ? "bg-gray-200" : s.totalViolations > max * 0.6 ? "bg-red-400" : "bg-amber-400";
                    return (
                      <div key={i} title={`${s.weekStart}: ${s.totalViolations}`}
                        style={{ height }} className={`flex-1 rounded-sm ${color} opacity-80`} />
                    );
                  })}
                </div>
                <p className="mt-1 text-xs font-semibold text-gray-700">
                  {trends[trends.length - 1]?.totalViolations ?? 0}
                  <span className="ml-1 font-normal text-gray-400">this week</span>
                </p>
              </div>
              {/* Fleet size sparkline */}
              <div>
                <p className="text-xs-tight text-gray-400 mb-1.5">Fleet Size</p>
                <div className="flex items-end gap-0.5 h-10">
                  {trends.map((s, i) => {
                    const max = Math.max(...trends.map((t) => t.totalAgents), 1);
                    const height = Math.max(4, Math.round((s.totalAgents / max) * 40));
                    return (
                      <div key={i} title={`${s.weekStart}: ${s.totalAgents} agents (${s.deployedAgents} deployed)`}
                        style={{ height }} className="flex-1 rounded-sm bg-violet-400 opacity-70" />
                    );
                  })}
                </div>
                <p className="mt-1 text-xs font-semibold text-gray-700">
                  {trends[trends.length - 1]?.totalAgents ?? 0}
                  <span className="ml-1 font-normal text-gray-400">agents</span>
                  <span className="ml-1 text-violet-600">
                    ({trends[trends.length - 1]?.deployedAgents ?? 0} deployed)
                  </span>
                </p>
              </div>
            </div>
          </div>
      )}
    </div>
  );
}
