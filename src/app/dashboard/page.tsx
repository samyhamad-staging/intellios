"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

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

  useEffect(() => {
    fetch("/api/dashboard/summary")
      .then((r) => r.json())
      .then((data: DashboardSummary) => {
        setSummary(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load dashboard data");
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
    <div className="px-8 py-8 space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        <p className="mt-0.5 text-sm text-gray-500">Platform health and governance posture</p>
      </div>

      <div className="space-y-8">
        {error && (
          <div className="rounded-lg border badge-gov-error p-4 text-sm">
            {error}
          </div>
        )}

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
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wider text-gray-500">
                    <th className="px-5 py-3 text-left">Agent</th>
                    <th className="px-5 py-3 text-left">Version</th>
                    <th className="px-5 py-3 text-left">Tags</th>
                    <th className="px-5 py-3 text-left">Deployed</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentDeployed.map((agent) => (
                    <tr key={agent.agentId} className="hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium text-gray-900">
                        {agent.name ?? `Agent ${agent.agentId.slice(0, 8)}`}
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-gray-500">v{agent.version}</td>
                      <td className="px-5 py-3">
                        <div className="flex gap-1">
                          {(agent.tags ?? []).slice(0, 2).map((tag) => (
                            <span key={tag} className="rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-400">{timeAgo(agent.updatedAt)}</td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          href={`/registry/${agent.agentId}`}
                          className="text-xs text-gray-400 hover:text-gray-700 underline"
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
