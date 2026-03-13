"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/registry/status-badge";

interface Agent {
  id: string;
  agentId: string;
  version: string;
  name: string | null;
  tags: string[];
  status: string;
  violationCount: number | null;
  createdAt: string;
  updatedAt: string;
}

interface Policy {
  id: string;
  name: string;
  type: string;
  rules: unknown[];
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

interface KpiCardProps {
  label: string;
  value: number | string;
  sub: string;
  color: string;
  subColor: string;
  href?: string;
}

function KpiCard({ label, value, sub, color, subColor, href }: KpiCardProps) {
  const inner = (
    <div className={`rounded-xl border p-5 ${color} ${href ? "hover:shadow-md transition-shadow cursor-pointer" : ""}`}>
      <div className="text-3xl font-bold">{value}</div>
      <div className="mt-1 text-sm font-medium">{label}</div>
      <div className={`mt-0.5 text-xs ${subColor}`}>{sub}</div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export default function ExecutiveDashboardPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/registry").then((r) => r.json()),
      fetch("/api/governance/policies").then((r) => r.json()),
    ])
      .then(([registryData, govData]) => {
        setAgents(registryData.agents ?? []);
        setPolicies(govData.policies ?? []);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load dashboard data");
        setLoading(false);
      });
  }, []);

  // ── Pipeline counts ──────────────────────────────────────────────────────
  const total       = agents.length;
  const deployed    = agents.filter((a) => a.status === "deployed").length;
  const approved    = agents.filter((a) => a.status === "approved").length;
  const inReview    = agents.filter((a) => a.status === "in_review").length;
  const draft       = agents.filter((a) => a.status === "draft").length;
  const rejected    = agents.filter((a) => a.status === "rejected").length;
  const deprecated  = agents.filter((a) => a.status === "deprecated").length;

  // ── Governance health ────────────────────────────────────────────────────
  const validated       = agents.filter((a) => a.violationCount !== null);
  const clean           = agents.filter((a) => a.violationCount === 0).length;
  const withErrors      = agents.filter((a) => (a.violationCount ?? 0) > 0).length;
  const notValidated    = agents.filter((a) => a.violationCount === null).length;
  const complianceRate  = validated.length > 0
    ? Math.round((clean / validated.length) * 100)
    : null;

  // ── Deployment rate ──────────────────────────────────────────────────────
  const nonDraft          = agents.filter((a) => a.status !== "draft").length;
  const deploymentRate    = nonDraft > 0
    ? Math.round((deployed / nonDraft) * 100)
    : null;

  // ── Recent deployments ───────────────────────────────────────────────────
  const recentDeployed = agents
    .filter((a) => a.status === "deployed")
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  // ── Agents needing attention ─────────────────────────────────────────────
  const needingAttention = agents
    .filter((a) => (a.violationCount ?? 0) > 0)
    .sort((a, b) => (b.violationCount ?? 0) - (a.violationCount ?? 0))
    .slice(0, 5);

  // ── Pipeline funnel data ─────────────────────────────────────────────────
  const funnelStages = [
    { label: "Draft",       count: draft,       color: "bg-gray-300" },
    { label: "In Review",   count: inReview,    color: "bg-blue-400" },
    { label: "Approved",    count: approved,    color: "bg-green-400" },
    { label: "Deployed",    count: deployed,    color: "bg-indigo-500" },
  ];
  const funnelMax = Math.max(...funnelStages.map((s) => s.count), 1);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Executive Dashboard</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              Platform health, pipeline throughput, and governance posture
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/governance"
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:border-gray-400 hover:text-gray-900 transition-colors"
            >
              Governance Hub →
            </Link>
            <Link href="/" className="text-sm text-gray-400 hover:text-gray-700">
              ← Home
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8 space-y-8">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* ── Top-line KPIs ─────────────────────────────────────────────── */}
        <section>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Platform Overview
          </h2>
          <div className="grid grid-cols-4 gap-4">
            <KpiCard
              label="Deployed Agents"
              value={loading ? "–" : deployed}
              sub="live in production"
              color="bg-indigo-50 border-indigo-200 text-indigo-900"
              subColor="text-indigo-600"
              href="/deploy"
            />
            <KpiCard
              label="Deployment Rate"
              value={loading ? "–" : deploymentRate !== null ? `${deploymentRate}%` : "—"}
              sub="of non-draft agents"
              color="bg-white border-gray-200 text-gray-900"
              subColor="text-gray-400"
            />
            <KpiCard
              label="Compliance Rate"
              value={loading ? "–" : complianceRate !== null ? `${complianceRate}%` : "—"}
              sub={`${policies.length} polic${policies.length === 1 ? "y" : "ies"} active`}
              color={
                complianceRate !== null && complianceRate >= 80
                  ? "bg-green-50 border-green-200 text-green-900"
                  : complianceRate !== null && complianceRate >= 50
                  ? "bg-amber-50 border-amber-200 text-amber-900"
                  : "bg-white border-gray-200 text-gray-900"
              }
              subColor={
                complianceRate !== null && complianceRate >= 80
                  ? "text-green-600"
                  : complianceRate !== null && complianceRate >= 50
                  ? "text-amber-600"
                  : "text-gray-400"
              }
              href="/governance"
            />
            <KpiCard
              label="Pending Review"
              value={loading ? "–" : inReview}
              sub={inReview > 0 ? "awaiting decision" : "queue clear"}
              color={inReview > 0 ? "bg-blue-50 border-blue-200 text-blue-900" : "bg-white border-gray-200 text-gray-900"}
              subColor={inReview > 0 ? "text-blue-600" : "text-gray-400"}
              href="/review"
            />
          </div>
        </section>

        <div className="grid grid-cols-2 gap-8">
          {/* ── Pipeline funnel ────────────────────────────────────────── */}
          <section>
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Pipeline Funnel
            </h2>
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
                  <div className="text-lg font-semibold text-red-600">{loading ? "–" : rejected}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Deprecated</div>
                  <div className="text-lg font-semibold text-amber-600">{loading ? "–" : deprecated}</div>
                </div>
              </div>
            </div>
          </section>

          {/* ── Governance health ──────────────────────────────────────── */}
          <section>
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Governance Health
            </h2>
            <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
              {/* Donut-style summary */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg bg-green-50 p-3">
                  <div className="text-2xl font-bold text-green-700">{loading ? "–" : clean}</div>
                  <div className="text-xs text-green-600 mt-0.5">Passing</div>
                </div>
                <div className="rounded-lg bg-red-50 p-3">
                  <div className="text-2xl font-bold text-red-700">{loading ? "–" : withErrors}</div>
                  <div className="text-xs text-red-600 mt-0.5">With Errors</div>
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
                        className="flex items-center justify-between rounded-lg border border-red-100 bg-white px-3 py-2 hover:border-red-300 transition-colors"
                      >
                        <span className="text-sm text-gray-800 truncate">
                          {agent.name ?? "Unnamed Agent"}
                        </span>
                        <span className="shrink-0 ml-2 text-xs font-medium text-red-600">
                          {agent.violationCount} error{agent.violationCount !== 1 ? "s" : ""}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {!loading && needingAttention.length === 0 && !loading && (
                <div className="text-center py-3">
                  <p className="text-sm font-medium text-green-700">✓ No governance errors detected</p>
                  <p className="text-xs text-green-600 mt-0.5">{clean} validated agent{clean !== 1 ? "s" : ""} passing</p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* ── Recent deployments ──────────────────────────────────────────── */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Recent Deployments
            </h2>
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
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
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
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wider text-gray-500">
                    <th className="px-5 py-3 text-left">Agent</th>
                    <th className="px-5 py-3 text-left">Version</th>
                    <th className="px-5 py-3 text-left">Tags</th>
                    <th className="px-5 py-3 text-left">Deployed</th>
                    <th className="px-5 py-3 text-left">Status</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentDeployed.map((agent) => (
                    <tr key={agent.agentId} className="hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium text-gray-900">
                        {agent.name ?? "Unnamed Agent"}
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
                      <td className="px-5 py-3">
                        <StatusBadge status={agent.status} />
                      </td>
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

        {/* ── Platform summary ─────────────────────────────────────────────── */}
        <section>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Platform Summary
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="text-2xl font-bold text-gray-900">{loading ? "–" : total}</div>
              <div className="text-sm font-medium text-gray-700 mt-1">Total Agents</div>
              <div className="text-xs text-gray-400 mt-0.5">across all stages</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="text-2xl font-bold text-gray-900">{loading ? "–" : policies.length}</div>
              <div className="text-sm font-medium text-gray-700 mt-1">Active Policies</div>
              <div className="text-xs text-gray-400 mt-0.5">governance rules enforced</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="text-2xl font-bold text-gray-900">
                {loading ? "–" : notValidated === 0 && total > 0 ? "100%" : notValidated > 0 ? `${total - notValidated}/${total}` : "—"}
              </div>
              <div className="text-sm font-medium text-gray-700 mt-1">Validation Coverage</div>
              <div className="text-xs text-gray-400 mt-0.5">agents run against policies</div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
