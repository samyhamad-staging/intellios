"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface Agent {
  id: string;
  agentId: string;
  name: string | null;
  status: string;
  violationCount: number | null;
  tags: string[];
  updatedAt: string;
}

interface Policy {
  id: string;
  name: string;
  type: string;
  description: string | null;
  rules: unknown[];
  enterpriseId: string | null;
  policyVersion: number;
  createdAt: string;
}

interface PolicyHistoryEntry {
  id: string;
  policyVersion: number;
  createdAt: string;
  supersededAt: string | null;
  isActive: boolean;
}

interface TemplatePack {
  id: string;
  name: string;
  description: string;
  framework: string;
  policyCount: number;
}

interface AnalyticsData {
  agentStatusCounts: Record<string, number>;
  validationPassRate: number | null;
  policyViolationsByType: Array<{ type: string; count: number }>;
  monthlySubmissions: Array<{ month: string; count: number }>;
  monthlyApprovals: Array<{ month: string; count: number }>;
  topViolatedPolicies: Array<{ policyName: string; count: number }>;
  avgTimeToApprovalHours: number | null;
}

const FRAMEWORK_COLORS: Record<string, string> = {
  "SR 11-7":       "bg-blue-50 text-blue-700 border-blue-200",
  "EU AI Act":     "bg-purple-50 text-purple-700 border-purple-200",
  "GDPR":          "bg-green-50 text-green-700 border-green-200",
  "Best Practices":"bg-gray-50 text-gray-700 border-gray-200",
};

const POLICY_TYPE_COLORS: Record<string, string> = {
  safety:         "bg-red-50 text-red-700 border-red-200",
  compliance:     "bg-blue-50 text-blue-700 border-blue-200",
  data_handling:  "bg-purple-50 text-purple-700 border-purple-200",
  access_control: "bg-amber-50 text-amber-700 border-amber-200",
  audit:          "bg-green-50 text-green-700 border-green-200",
};

export default function GovernanceHubPage() {
  const { data: session } = useSession();
  const canManagePolicies =
    session?.user?.role === "admin" || session?.user?.role === "compliance_officer";
  const canViewAnalytics =
    session?.user?.role === "admin" || session?.user?.role === "compliance_officer";
  const [agents, setAgents] = useState<Agent[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [templatePacks, setTemplatePacks] = useState<TemplatePack[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importingPack, setImportingPack] = useState<string | null>(null);
  const [importToast, setImportToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [duplicatePrompt, setDuplicatePrompt] = useState<{ packId: string; duplicates: string[] } | null>(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [policyHistories, setPolicyHistories] = useState<Record<string, PolicyHistoryEntry[]>>({});
  const [historyLoading, setHistoryLoading] = useState<Record<string, boolean>>({});

  const loadPolicies = () =>
    fetch("/api/governance/policies")
      .then((r) => r.json())
      .then((govData) => setPolicies(govData.policies ?? []));

  useEffect(() => {
    Promise.all([
      fetch("/api/registry").then((r) => r.json()),
      fetch("/api/governance/policies").then((r) => r.json()),
      fetch("/api/governance/templates").then((r) => r.json()),
    ])
      .then(([registryData, govData, templateData]) => {
        setAgents(registryData.agents ?? []);
        setPolicies(govData.policies ?? []);
        setTemplatePacks(templateData.packs ?? []);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load governance data");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!canViewAnalytics) {
      setAnalyticsLoading(false);
      return;
    }
    fetch("/api/governance/analytics")
      .then((r) => r.json())
      .then((data) => {
        setAnalytics(data);
        setAnalyticsLoading(false);
      })
      .catch(() => setAnalyticsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = (message: string, type: "success" | "error") => {
    setImportToast({ message, type });
    setTimeout(() => setImportToast(null), 4000);
  };

  const applyPack = async (packId: string, force = false) => {
    setImportingPack(packId);
    setDuplicatePrompt(null);
    try {
      const res = await fetch(`/api/governance/templates/${packId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      });
      if (res.status === 409) {
        const data = await res.json();
        setDuplicatePrompt({ packId, duplicates: data.duplicates ?? [] });
        return;
      }
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Import failed");
      }
      const data = await res.json();
      showToast(`✓ Imported ${data.created} polic${data.created === 1 ? "y" : "ies"} from pack`, "success");
      await loadPolicies();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Import failed", "error");
    } finally {
      setImportingPack(null);
    }
  };

  const toggleHistory = async (policyId: string) => {
    if (expandedHistoryId === policyId) {
      setExpandedHistoryId(null);
      return;
    }
    setExpandedHistoryId(policyId);
    if (policyHistories[policyId]) return; // already loaded
    setHistoryLoading((prev) => ({ ...prev, [policyId]: true }));
    try {
      const res = await fetch(`/api/governance/policies/${policyId}/history`);
      if (res.ok) {
        const data = await res.json();
        setPolicyHistories((prev) => ({ ...prev, [policyId]: data.history ?? [] }));
      }
    } finally {
      setHistoryLoading((prev) => ({ ...prev, [policyId]: false }));
    }
  };

  // ── Coverage stats ─────────────────────────────────────────────────────────
  const total = agents.length;
  const clean = agents.filter((a) => a.violationCount === 0).length;
  const withErrors = agents.filter((a) => a.violationCount !== null && a.violationCount > 0).length;
  const notValidated = agents.filter((a) => a.violationCount === null).length;

  // ── Violations by status ───────────────────────────────────────────────────
  const statusGroups: Record<string, { count: number; withErrors: number }> = {};
  for (const agent of agents) {
    const s = agent.status;
    if (!statusGroups[s]) statusGroups[s] = { count: 0, withErrors: 0 };
    statusGroups[s].count++;
    if (agent.violationCount && agent.violationCount > 0) statusGroups[s].withErrors++;
  }

  // ── Agents with violations (sorted by violation count desc) ────────────────
  const agentsWithViolations = agents
    .filter((a) => a.violationCount !== null && a.violationCount > 0)
    .sort((a, b) => (b.violationCount ?? 0) - (a.violationCount ?? 0));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Governance Hub</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              Policy coverage, violations, and compliance posture
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/audit"
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:border-gray-400 hover:text-gray-900 transition-colors"
            >
              Audit Trail →
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

        {/* ── Governance Analytics ─────────────────────────────────────────── */}
        {canViewAnalytics && (
          <section>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
              Analytics
            </h2>

            {/* KPI Row */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                {
                  label: "Validation Pass Rate",
                  value: analyticsLoading
                    ? "–"
                    : analytics?.validationPassRate != null
                    ? `${analytics.validationPassRate}%`
                    : "N/A",
                  sub: "of validated agents",
                  color:
                    analytics?.validationPassRate != null && analytics.validationPassRate >= 80
                      ? "bg-green-50 border-green-200 text-green-900"
                      : analytics?.validationPassRate != null && analytics.validationPassRate >= 50
                      ? "bg-amber-50 border-amber-200 text-amber-900"
                      : analytics?.validationPassRate != null
                      ? "bg-red-50 border-red-200 text-red-900"
                      : "bg-white border-gray-200 text-gray-900",
                  subColor:
                    analytics?.validationPassRate != null && analytics.validationPassRate >= 80
                      ? "text-green-600"
                      : analytics?.validationPassRate != null && analytics.validationPassRate >= 50
                      ? "text-amber-600"
                      : analytics?.validationPassRate != null
                      ? "text-red-600"
                      : "text-gray-400",
                },
                {
                  label: "Avg Time to Approval",
                  value: analyticsLoading
                    ? "–"
                    : analytics?.avgTimeToApprovalHours != null
                    ? analytics.avgTimeToApprovalHours < 24
                      ? `${analytics.avgTimeToApprovalHours}h`
                      : `${Math.round(analytics.avgTimeToApprovalHours / 24)}d`
                    : "N/A",
                  sub: "from review submission",
                  color: "bg-white border-gray-200 text-gray-900",
                  subColor: "text-gray-400",
                },
                {
                  label: "Active Violations",
                  value: analyticsLoading
                    ? "–"
                    : analytics
                    ? analytics.policyViolationsByType.reduce((s, t) => s + t.count, 0)
                    : "–",
                  sub: "across all agents",
                  color:
                    !analyticsLoading &&
                    analytics &&
                    analytics.policyViolationsByType.reduce((s, t) => s + t.count, 0) > 0
                      ? "bg-red-50 border-red-200 text-red-900"
                      : "bg-white border-gray-200 text-gray-900",
                  subColor:
                    !analyticsLoading &&
                    analytics &&
                    analytics.policyViolationsByType.reduce((s, t) => s + t.count, 0) > 0
                      ? "text-red-600"
                      : "text-gray-400",
                },
              ].map(({ label, value, sub, color, subColor }) => (
                <div key={label} className={`rounded-xl border p-5 ${color}`}>
                  <div className="text-3xl font-bold">{value}</div>
                  <div className="mt-1 text-sm font-medium">{label}</div>
                  <div className={`mt-0.5 text-xs ${subColor}`}>{sub}</div>
                </div>
              ))}
            </div>

            {!analyticsLoading && analytics && (
              <div className="grid grid-cols-2 gap-6">
                {/* Monthly Submissions vs Approvals bar chart */}
                <div className="rounded-xl border border-gray-200 bg-white p-5">
                  <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Monthly Activity (last 6 months)
                  </h3>
                  {(() => {
                    const maxCount = Math.max(
                      ...analytics.monthlySubmissions.map((m) => m.count),
                      ...analytics.monthlyApprovals.map((m) => m.count),
                      1
                    );
                    return (
                      <div className="space-y-3">
                        {analytics.monthlySubmissions.map((sub, i) => {
                          const appr = analytics.monthlyApprovals[i];
                          const subPct = Math.round((sub.count / maxCount) * 100);
                          const apprPct = Math.round(((appr?.count ?? 0) / maxCount) * 100);
                          const label = sub.month.slice(0, 7);
                          return (
                            <div key={sub.month}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-gray-500">{label}</span>
                                <div className="flex items-center gap-3 text-xs text-gray-400">
                                  <span className="flex items-center gap-1">
                                    <span className="inline-block w-2 h-2 rounded-full bg-blue-400" />
                                    {sub.count} submitted
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <span className="inline-block w-2 h-2 rounded-full bg-green-400" />
                                    {appr?.count ?? 0} approved
                                  </span>
                                </div>
                              </div>
                              <div className="space-y-1">
                                <div className="h-2 w-full rounded-full bg-gray-100">
                                  <div
                                    className="h-2 rounded-full bg-blue-400 transition-all"
                                    style={{ width: `${subPct}%` }}
                                  />
                                </div>
                                <div className="h-2 w-full rounded-full bg-gray-100">
                                  <div
                                    className="h-2 rounded-full bg-green-400 transition-all"
                                    style={{ width: `${apprPct}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {analytics.monthlySubmissions.every((m) => m.count === 0) && (
                          <p className="text-center text-xs text-gray-400 py-4">
                            No submission activity in the last 6 months
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Right column: Top Violated Policies + Agent Status Distribution */}
                <div className="space-y-6">
                  {/* Top Violated Policies */}
                  <div className="rounded-xl border border-gray-200 bg-white p-5">
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Top Violated Policies
                    </h3>
                    {analytics.topViolatedPolicies.length === 0 ? (
                      <p className="text-xs text-gray-400 py-2">
                        No active violations — all validated agents are clean
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {analytics.topViolatedPolicies.map((p) => (
                          <div
                            key={p.policyName}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="truncate text-gray-700 text-xs">{p.policyName}</span>
                            <span className="ml-3 shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                              {p.count} error{p.count === 1 ? "" : "s"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Agent Status Distribution */}
                  <div className="rounded-xl border border-gray-200 bg-white p-5">
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Agent Status Distribution
                    </h3>
                    {Object.keys(analytics.agentStatusCounts).length === 0 ? (
                      <p className="text-xs text-gray-400 py-2">No agents in registry</p>
                    ) : (
                      <div className="space-y-2">
                        {(() => {
                          const total = Object.values(analytics.agentStatusCounts).reduce(
                            (s, c) => s + c,
                            0
                          );
                          const STATUS_COLORS: Record<string, string> = {
                            draft: "bg-gray-300",
                            in_review: "bg-amber-400",
                            approved: "bg-blue-400",
                            deployed: "bg-green-400",
                            rejected: "bg-red-400",
                            deprecated: "bg-gray-400",
                          };
                          return Object.entries(analytics.agentStatusCounts)
                            .sort((a, b) => b[1] - a[1])
                            .map(([status, count]) => {
                              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                              return (
                                <div key={status}>
                                  <div className="flex items-center justify-between mb-0.5">
                                    <span className="text-xs capitalize text-gray-600">
                                      {status.replace("_", " ")}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                      {count} ({pct}%)
                                    </span>
                                  </div>
                                  <div className="h-2 w-full rounded-full bg-gray-100">
                                    <div
                                      className={`h-2 rounded-full transition-all ${
                                        STATUS_COLORS[status] ?? "bg-gray-400"
                                      }`}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            });
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {analyticsLoading && (
              <div className="grid grid-cols-2 gap-6">
                <div className="h-64 animate-pulse rounded-xl bg-gray-100" />
                <div className="space-y-4">
                  <div className="h-28 animate-pulse rounded-xl bg-gray-100" />
                  <div className="h-32 animate-pulse rounded-xl bg-gray-100" />
                </div>
              </div>
            )}
          </section>
        )}

        {/* ── Coverage Stats ──────────────────────────────────────────────── */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
            Coverage Overview
          </h2>
          <div className="grid grid-cols-4 gap-4">
            {[
              {
                label: "Total Agents",
                value: loading ? "–" : total,
                sub: "in registry",
                color: "bg-white border-gray-200 text-gray-900",
                subColor: "text-gray-400",
              },
              {
                label: "Passing Governance",
                value: loading ? "–" : clean,
                sub: total > 0 ? `${Math.round((clean / total) * 100)}% of agents` : "—",
                color: "bg-green-50 border-green-200 text-green-900",
                subColor: "text-green-600",
              },
              {
                label: "With Errors",
                value: loading ? "–" : withErrors,
                sub: withErrors > 0 ? "need remediation" : "none",
                color: withErrors > 0
                  ? "bg-red-50 border-red-200 text-red-900"
                  : "bg-white border-gray-200 text-gray-900",
                subColor: withErrors > 0 ? "text-red-600" : "text-gray-400",
              },
              {
                label: "Not Validated",
                value: loading ? "–" : notValidated,
                sub: notValidated > 0 ? "validate in Workbench" : "all validated",
                color: notValidated > 0
                  ? "bg-amber-50 border-amber-200 text-amber-900"
                  : "bg-white border-gray-200 text-gray-900",
                subColor: notValidated > 0 ? "text-amber-600" : "text-gray-400",
              },
            ].map(({ label, value, sub, color, subColor }) => (
              <div key={label} className={`rounded-xl border p-5 ${color}`}>
                <div className="text-3xl font-bold">{value}</div>
                <div className="mt-1 text-sm font-medium">{label}</div>
                <div className={`mt-0.5 text-xs ${subColor}`}>{sub}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Agents with violations ──────────────────────────────────────── */}
        {!loading && agentsWithViolations.length > 0 && (
          <section>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
              Agents Requiring Attention ({agentsWithViolations.length})
            </h2>
            <div className="space-y-2">
              {agentsWithViolations.map((agent) => (
                <Link
                  key={agent.agentId}
                  href={`/registry/${agent.agentId}?tab=governance`}
                  className="flex items-center justify-between rounded-lg border border-red-200 bg-white px-5 py-3 hover:border-red-400 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="truncate font-medium text-sm text-gray-900">
                      {agent.name ?? "Unnamed Agent"}
                    </span>
                    <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 capitalize">
                      {agent.status.replace("_", " ")}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                      {agent.violationCount} error{agent.violationCount === 1 ? "" : "s"}
                    </span>
                    <span className="text-xs text-gray-400">View →</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {!loading && agentsWithViolations.length === 0 && total > 0 && notValidated === 0 && (
          <section>
            <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
              <p className="text-lg font-medium text-green-800">✓ All validated agents pass governance</p>
              <p className="mt-1 text-sm text-green-600">
                {clean} agent{clean === 1 ? "" : "s"} validated against {policies.length} polic{policies.length === 1 ? "y" : "ies"}
              </p>
            </div>
          </section>
        )}

        {/* ── Policy library ──────────────────────────────────────────────── */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
              Policy Library ({loading ? "…" : policies.length})
            </h2>
            {canManagePolicies && (
              <Link
                href="/governance/policies/new"
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                + New Policy
              </Link>
            )}
          </div>

          {loading && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-100" />
              ))}
            </div>
          )}

          {!loading && policies.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
              <p className="text-sm text-gray-400">No governance policies defined.</p>
              {canManagePolicies ? (
                <Link
                  href="/governance/policies/new"
                  className="mt-3 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                >
                  Create first policy
                </Link>
              ) : (
                <p className="mt-1 text-xs text-gray-400">
                  Contact your administrator to define governance policies.
                </p>
              )}
            </div>
          )}

          {!loading && policies.length > 0 && (
            <div className="space-y-2">
              {policies.map((policy) => (
                <div key={policy.id} className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                  {/* Policy card row */}
                  <div className="flex items-start justify-between px-5 py-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-gray-900">{policy.name}</span>
                        <span
                          className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${
                            POLICY_TYPE_COLORS[policy.type] ?? "bg-gray-50 text-gray-600 border-gray-200"
                          }`}
                        >
                          {policy.type.replace("_", " ")}
                        </span>
                        {policy.policyVersion > 1 && (
                          <span className="shrink-0 rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-xs font-medium text-indigo-700">
                            v{policy.policyVersion}
                          </span>
                        )}
                        {!policy.enterpriseId && (
                          <span className="shrink-0 rounded-full bg-purple-50 border border-purple-200 px-2 py-0.5 text-xs text-purple-700">
                            platform
                          </span>
                        )}
                      </div>
                      {policy.description && (
                        <p className="mt-1 text-xs text-gray-500 line-clamp-2">{policy.description}</p>
                      )}
                    </div>
                    <div className="shrink-0 ml-4 text-right space-y-1">
                      <div className="text-xs text-gray-400">
                        {Array.isArray(policy.rules) ? policy.rules.length : 0} rule{(Array.isArray(policy.rules) ? policy.rules.length : 0) === 1 ? "" : "s"}
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(policy.createdAt).toLocaleDateString()}
                      </div>
                      <div className="flex items-center justify-end gap-3">
                        {canManagePolicies && policy.policyVersion > 1 && (
                          <button
                            onClick={() => toggleHistory(policy.id)}
                            className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                          >
                            {expandedHistoryId === policy.id ? "Hide history" : "History"}
                          </button>
                        )}
                        {canManagePolicies && (
                          <Link
                            href={`/governance/policies/${policy.id}/edit`}
                            className="inline-block text-xs text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            {policy.enterpriseId === null ? "View" : "Edit"} →
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expandable version history */}
                  {expandedHistoryId === policy.id && (
                    <div className="border-t border-gray-100 bg-gray-50 px-5 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                        Version History
                      </p>
                      {historyLoading[policy.id] ? (
                        <div className="text-xs text-gray-400 py-2">Loading…</div>
                      ) : (policyHistories[policy.id] ?? []).length === 0 ? (
                        <div className="text-xs text-gray-400 py-2">No history available.</div>
                      ) : (
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-gray-400 uppercase tracking-wider">
                              <th className="text-left pb-1 pr-4 font-medium">Version</th>
                              <th className="text-left pb-1 pr-4 font-medium">Date</th>
                              <th className="text-left pb-1 font-medium">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {(policyHistories[policy.id] ?? []).map((entry) => (
                              <tr key={entry.id} className="text-gray-600">
                                <td className="py-1.5 pr-4 font-medium">v{entry.policyVersion}</td>
                                <td className="py-1.5 pr-4">
                                  {new Date(entry.createdAt).toLocaleDateString(undefined, {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </td>
                                <td className="py-1.5">
                                  {entry.isActive ? (
                                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-700 font-medium">
                                      Active
                                    </span>
                                  ) : (
                                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-500">
                                      Superseded
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Compliance Starter Packs ────────────────────────────────────── */}
        {templatePacks.length > 0 && (
          <section>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                  Compliance Starter Packs
                </h2>
                <p className="mt-0.5 text-xs text-gray-400">
                  Pre-built policy packs for common regulatory frameworks. Policies are created in your enterprise and can be edited after import.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {templatePacks.map((pack) => (
                <div
                  key={pack.id}
                  className="rounded-xl border border-gray-200 bg-white p-5 flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-gray-900">{pack.name}</span>
                        <span
                          className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${
                            FRAMEWORK_COLORS[pack.framework] ?? "bg-gray-50 text-gray-600 border-gray-200"
                          }`}
                        >
                          {pack.framework}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500 line-clamp-3">{pack.description}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-2xl font-bold text-gray-900">{pack.policyCount}</div>
                      <div className="text-xs text-gray-400">polic{pack.policyCount === 1 ? "y" : "ies"}</div>
                    </div>
                  </div>
                  {canManagePolicies && (
                    <button
                      onClick={() => applyPack(pack.id)}
                      disabled={importingPack === pack.id}
                      className="mt-auto w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:border-gray-400 hover:text-gray-900 transition-colors disabled:opacity-50"
                    >
                      {importingPack === pack.id ? "Importing…" : "Import Pack →"}
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Duplicate conflict prompt */}
            {duplicatePrompt && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
                <p className="text-sm font-medium text-amber-800 mb-1">
                  {duplicatePrompt.duplicates.length} existing polic{duplicatePrompt.duplicates.length === 1 ? "y" : "ies"} would be replaced:
                </p>
                <ul className="mb-3 space-y-0.5">
                  {duplicatePrompt.duplicates.map((name) => (
                    <li key={name} className="text-xs text-amber-700">• {name}</li>
                  ))}
                </ul>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => applyPack(duplicatePrompt.packId, true)}
                    disabled={importingPack === duplicatePrompt.packId}
                    className="rounded-lg bg-amber-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                  >
                    {importingPack === duplicatePrompt.packId ? "Importing…" : "Overwrite and Import"}
                  </button>
                  <button
                    onClick={() => setDuplicatePrompt(null)}
                    className="text-sm text-amber-700 hover:text-amber-900"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Import toast */}
            {importToast && (
              <div
                className={`mt-4 rounded-lg border px-4 py-3 text-sm font-medium ${
                  importToast.type === "success"
                    ? "border-green-200 bg-green-50 text-green-800"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {importToast.message}
              </div>
            )}
          </section>
        )}

        {/* ── Status breakdown ────────────────────────────────────────────── */}
        {!loading && Object.keys(statusGroups).length > 0 && (
          <section>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
              Compliance by Stage
            </h2>
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wider text-gray-500">
                    <th className="px-5 py-3 text-left">Stage</th>
                    <th className="px-5 py-3 text-right">Agents</th>
                    <th className="px-5 py-3 text-right">With Errors</th>
                    <th className="px-5 py-3 text-right">Clean</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {Object.entries(statusGroups).map(([status, { count, withErrors: we }]) => (
                    <tr key={status} className="hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium text-gray-900 capitalize">
                        {status.replace("_", " ")}
                      </td>
                      <td className="px-5 py-3 text-right text-gray-600">{count}</td>
                      <td className="px-5 py-3 text-right">
                        {we > 0 ? (
                          <span className="font-medium text-red-600">{we}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className={count - we > 0 ? "text-green-600 font-medium" : "text-gray-400"}>
                          {count - we}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
