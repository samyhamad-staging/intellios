"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Printer, TrendingUp, Shield, DollarSign, Users, AlertTriangle } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PortfolioSnapshot {
  weekStart: string;
  totalAgents: number;
  deployedAgents: number;
  complianceRate: number | null;
  avgQualityScore: number | null;
  totalViolations: number;
  agentsByRiskTier: Record<string, number> | null;
}

interface CompliancePosture {
  deployedCount: number;
  complianceRate: number | null;
  atRiskCount: number;
  reviewQueueCount: number;
  healthCounts: { clean: number; critical: number; unknown: number };
  statusCounts: Record<string, number>;
}

interface CostData {
  period: string;
  totalCostUsd: number;
  byBusinessUnit: { businessUnit: string; agentCount: number; totalCostUsd: number }[];
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCost(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  if (n >= 1)    return `$${n.toFixed(2)}`;
  return `$${n.toFixed(4)}`;
}

function timeAgo(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 2) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const h = Math.floor(diffMs / 3_600_000);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(diffMs / 86_400_000)}d ago`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ExecutiveDashboardPage() {
  const [posture, setPosture] = useState<CompliancePosture | null>(null);
  const [trends, setTrends] = useState<PortfolioSnapshot[]>([]);
  const [cost, setCost] = useState<CostData | null>(null);
  const [alerts, setAlerts] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/compliance/posture").then((r) => r.json()).catch(() => null),
      fetch("/api/portfolio/trends?weeks=12").then((r) => r.json()).catch(() => ({ snapshots: [] })),
      fetch("/api/portfolio/cost").then((r) => r.json()).catch(() => null),
      fetch("/api/notifications?limit=5&unread=false").then((r) => r.json()).catch(() => ({ notifications: [] })),
    ]).then(([postureData, trendsData, costData, notifData]) => {
      setPosture(postureData);
      setTrends(trendsData?.snapshots ?? []);
      setCost(costData);
      setAlerts((notifData?.notifications ?? []).slice(0, 5));
    }).finally(() => setLoading(false));
  }, []);

  const latest = trends[trends.length - 1];
  const prev   = trends[trends.length - 2];

  const complianceDelta = latest && prev && latest.complianceRate !== null && prev.complianceRate !== null
    ? latest.complianceRate - prev.complianceRate
    : null;

  const riskTier = latest?.agentsByRiskTier ?? {};
  const totalRiskAgents = Object.values(riskTier).reduce((s, n) => s + n, 0);

  return (
    <div className="p-6 max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Executive Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Fleet governance at a glance · {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
        </div>
        <button
          onClick={() => window.print()}
          className="print:hidden inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:border-gray-300 hover:text-gray-800 transition-colors shadow-sm"
        >
          <Printer size={14} /> Export PDF
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-100" />)}
        </div>
      ) : (
        <>
          {/* ── Row 1: KPI cards ─────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">

            {/* Fleet size */}
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-center gap-2 mb-2">
                <Users size={14} className="text-gray-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Fleet Size</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{posture?.statusCounts ? Object.values(posture.statusCounts).reduce((s, n) => s + n, 0) : "–"}</p>
              <p className="mt-1 text-xs text-gray-400">
                {posture?.deployedCount ?? 0} deployed
                {posture?.reviewQueueCount ? ` · ${posture.reviewQueueCount} in review` : ""}
              </p>
            </div>

            {/* Compliance rate */}
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-center gap-2 mb-2">
                <Shield size={14} className="text-gray-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Compliance</span>
              </div>
              <p className={`text-3xl font-bold ${(posture?.complianceRate ?? 0) >= 80 ? "text-green-700" : (posture?.complianceRate ?? 0) >= 60 ? "text-amber-600" : "text-red-600"}`}>
                {posture?.complianceRate !== null && posture?.complianceRate !== undefined
                  ? `${posture.complianceRate.toFixed(0)}%`
                  : "–"}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                {complianceDelta !== null
                  ? `${complianceDelta >= 0 ? "↑" : "↓"} ${Math.abs(complianceDelta).toFixed(0)}pp vs last week`
                  : "clean agents vs. all prod"}
              </p>
            </div>

            {/* Monthly cost */}
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign size={14} className="text-gray-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Monthly Cost</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {cost ? fmtCost(cost.totalCostUsd) : "–"}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                {cost ? `${cost.period} · ${cost.byBusinessUnit.length} business unit${cost.byBusinessUnit.length !== 1 ? "s" : ""}` : "token-based attribution"}
              </p>
            </div>

            {/* At-risk agents */}
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={14} className="text-gray-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">At-Risk Agents</span>
              </div>
              <p className={`text-3xl font-bold ${(posture?.atRiskCount ?? 0) > 0 ? "text-red-600" : "text-green-700"}`}>
                {posture?.atRiskCount ?? "–"}
              </p>
              <p className="mt-1 text-xs text-gray-400">governance violations or health issues</p>
            </div>

            {/* Avg quality score */}
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={14} className="text-gray-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Avg Quality</span>
              </div>
              <p className={`text-3xl font-bold ${(latest?.avgQualityScore ?? 0) >= 80 ? "text-green-700" : (latest?.avgQualityScore ?? 0) >= 60 ? "text-amber-600" : "text-gray-400"}`}>
                {latest?.avgQualityScore !== null && latest?.avgQualityScore !== undefined ? `${Math.round(latest.avgQualityScore)}/100` : "–"}
              </p>
              <p className="mt-1 text-xs text-gray-400">design-time score · {latest?.weekStart ?? "no data"}</p>
            </div>

            {/* Risk distribution */}
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-center gap-2 mb-2">
                <Shield size={14} className="text-gray-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Risk Distribution</span>
              </div>
              {totalRiskAgents > 0 ? (
                <div className="space-y-1">
                  {(["critical", "high", "medium", "low"] as const).map((tier) => {
                    const count = riskTier[tier] ?? 0;
                    if (!count) return null;
                    const pct = Math.round((count / totalRiskAgents) * 100);
                    const color = tier === "critical" ? "bg-red-400" : tier === "high" ? "bg-orange-400" : tier === "medium" ? "bg-amber-400" : "bg-green-400";
                    return (
                      <div key={tier} className="flex items-center gap-2">
                        <span className="w-12 text-xs-tight capitalize text-gray-500">{tier}</span>
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-6 text-right text-xs-tight text-gray-500">{count}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No risk data</p>
              )}
            </div>
          </div>

          {/* ── Row 2: Quality trend + Cost by BU ────────────────────────── */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

            {/* 12-week quality trend */}
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Quality Trend (12 weeks)</p>
              {trends.length > 0 ? (
                <>
                  <div className="flex items-end gap-0.5 h-16">
                    {trends.map((s, i) => {
                      const val = s.avgQualityScore ?? 0;
                      const height = Math.max(4, Math.round((val / 100) * 64));
                      const color = val >= 80 ? "bg-green-400" : val >= 60 ? "bg-amber-400" : "bg-gray-300";
                      return (
                        <div key={i} title={`${s.weekStart}: ${val.toFixed(0)}/100`}
                          style={{ height }} className={`flex-1 rounded-sm ${color} opacity-80`} />
                      );
                    })}
                  </div>
                  <div className="mt-1 flex justify-between text-2xs text-gray-400">
                    <span>{trends[0]?.weekStart}</span>
                    <span>{latest?.weekStart}</span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-400">No trend data yet — run the portfolio-snapshot cron to populate.</p>
              )}
            </div>

            {/* Cost by business unit */}
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
                Cost by Business Unit · {cost?.period ?? "–"}
              </p>
              {cost && cost.byBusinessUnit.length > 0 ? (
                <div className="space-y-2">
                  {cost.byBusinessUnit.slice(0, 5).map((row) => {
                    const pct = cost.totalCostUsd > 0 ? Math.round((row.totalCostUsd / cost.totalCostUsd) * 100) : 0;
                    return (
                      <div key={row.businessUnit} className="flex items-center gap-3">
                        <span className="w-32 truncate text-xs text-gray-700">{row.businessUnit}</span>
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-violet-400 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-16 text-right text-xs text-gray-500">{fmtCost(row.totalCostUsd)}</span>
                      </div>
                    );
                  })}
                  <p className="mt-2 text-right text-xs font-semibold text-gray-700">Total: {fmtCost(cost.totalCostUsd)}</p>
                </div>
              ) : (
                <p className="text-sm text-gray-400">No cost data for this period — telemetry with token counts required.</p>
              )}
            </div>
          </div>

          {/* ── Row 3: Top alerts ─────────────────────────────────────────── */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Recent Alerts</p>
              <Link href="/governor/audit" className="text-xs text-violet-600 hover:underline print:hidden">View audit log →</Link>
            </div>
            {alerts.length === 0 ? (
              <p className="text-sm text-gray-400">No recent alerts.</p>
            ) : (
              <ul className="space-y-2">
                {alerts.map((n) => (
                  <li key={n.id} className="flex items-start gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-gray-800 truncate">{n.title}</p>
                      <p className="text-xs-tight text-gray-400">{timeAgo(n.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {/* Print stylesheet */}
      <style>{`
        @media print {
          body { font-size: 12px; }
          nav, aside, header { display: none !important; }
          .print\\:hidden { display: none !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}
