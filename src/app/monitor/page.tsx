"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/registry/status-badge";

interface AgentHealth {
  agentId: string;
  blueprintId: string;
  name: string | null;
  version: string;
  tags: string[];
  deployedAt: string;
  healthStatus: "clean" | "critical" | "unknown";
  errorCount: number;
  warningCount: number;
  lastCheckedAt: string | null;
}

interface MonitorSummary {
  total: number;
  clean: number;
  critical: number;
  unknown: number;
}

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  if (diffMins < 2) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 30) return `${diffDays} days ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 8) return `${diffWeeks}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

function HealthBadge({ status, errorCount }: { status: "clean" | "critical" | "unknown"; errorCount: number }) {
  if (status === "clean") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
        ✓ Clean
      </span>
    );
  }
  if (status === "critical") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
        ! {errorCount} Error{errorCount === 1 ? "" : "s"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
      Not checked
    </span>
  );
}

function KpiCard({
  label,
  value,
  sub,
  color,
  subColor,
}: {
  label: string;
  value: number;
  sub: string;
  color: string;
  subColor: string;
}) {
  return (
    <div className={`rounded-xl border p-5 ${color}`}>
      <div className="text-3xl font-bold">{value}</div>
      <div className="mt-1 text-sm font-semibold">{label}</div>
      <div className={`mt-0.5 text-xs ${subColor}`}>{sub}</div>
    </div>
  );
}

export default function MonitorPage() {
  const [agents, setAgents] = useState<AgentHealth[]>([]);
  const [summary, setSummary] = useState<MonitorSummary>({ total: 0, clean: 0, critical: 0, unknown: 0 });
  const [loading, setLoading] = useState(true);
  const [checkingAll, setCheckingAll] = useState(false);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [role, setRole] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [healthFilter, setHealthFilter] = useState<"all" | "clean" | "critical" | "unknown">("all");

  useEffect(() => {
    // Fetch current user role for gating "Check Now" and "Check All" buttons
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => setRole(d.role ?? ""))
      .catch(() => {});
    loadAgents();
  }, []);

  async function loadAgents() {
    setLoading(true);
    try {
      const res = await fetch("/api/monitor");
      const data = await res.json();
      setAgents(data.agents ?? []);
      setSummary(data.summary ?? { total: 0, clean: 0, critical: 0, unknown: 0 });
    } catch {
      // Keep existing state on fetch failure
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckAll() {
    setCheckingAll(true);
    try {
      await fetch("/api/monitor/check-all", { method: "POST" });
      await loadAgents();
    } finally {
      setCheckingAll(false);
    }
  }

  async function handleCheckOne(agentId: string) {
    setCheckingId(agentId);
    try {
      const res = await fetch(`/api/monitor/${agentId}/check`, { method: "POST" });
      if (res.ok) {
        const result = await res.json();
        // Update the agent row and recompute summary counts in a single state update
        setAgents((current) => {
          const updated = current.map((a) =>
            a.agentId === agentId
              ? {
                  ...a,
                  healthStatus:  result.healthStatus as "clean" | "critical" | "unknown",
                  errorCount:    result.errorCount,
                  warningCount:  result.warningCount,
                  lastCheckedAt: result.checkedAt,
                }
              : a
          );
          setSummary({
            total:    updated.length,
            clean:    updated.filter((a) => a.healthStatus === "clean").length,
            critical: updated.filter((a) => a.healthStatus === "critical").length,
            unknown:  updated.filter((a) => a.healthStatus === "unknown").length,
          });
          return updated;
        });
      }
    } finally {
      setCheckingId(null);
    }
  }

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return agents.filter((a) => {
      const matchesSearch =
        !q ||
        (a.name ?? "").toLowerCase().includes(q) ||
        a.agentId.toLowerCase().includes(q);
      const matchesHealth =
        healthFilter === "all" || a.healthStatus === healthFilter;
      return matchesSearch && matchesHealth;
    });
  }, [agents, searchQuery, healthFilter]);

  const canCheck = role === "compliance_officer" || role === "admin";

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deployment Monitor</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Governance posture of deployed agents against the current enterprise policy set.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/monitor/intelligence"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:border-gray-400 hover:text-gray-900 transition-colors"
          >
            Intelligence →
          </Link>
          {canCheck && (
            <button
              onClick={handleCheckAll}
              disabled={checkingAll || loading}
              className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
            >
              {checkingAll ? (
                <>
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Checking…
                </>
              ) : (
                "↻ Check All Agents"
              )}
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        <KpiCard
          label="Deployed"
          value={summary.total}
          sub="total in production"
          color="bg-white border border-gray-200 text-gray-900"
          subColor="text-gray-500"
        />
        <KpiCard
          label="Clean"
          value={summary.clean}
          sub="passing all policies"
          color="bg-green-50 border border-green-200 text-green-900"
          subColor="text-green-600"
        />
        <KpiCard
          label="Needs Attention"
          value={summary.critical}
          sub="governance errors found"
          color={summary.critical > 0 ? "bg-red-50 border border-red-200 text-red-900" : "bg-white border border-gray-200 text-gray-900"}
          subColor={summary.critical > 0 ? "text-red-600" : "text-gray-500"}
        />
        <KpiCard
          label="Not Checked"
          value={summary.unknown}
          sub="awaiting first health check"
          color={summary.unknown > 0 ? "bg-amber-50 border border-amber-200 text-amber-900" : "bg-white border border-gray-200 text-gray-900"}
          subColor={summary.unknown > 0 ? "text-amber-600" : "text-gray-500"}
        />
      </div>

      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white px-5 py-4">
        <div className="flex flex-1 min-w-48 flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Search</label>
          <input
            type="text"
            placeholder="Name or agent ID…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
          />
        </div>
        <div className="flex min-w-40 flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Health</label>
          <select
            value={healthFilter}
            onChange={(e) => setHealthFilter(e.target.value as typeof healthFilter)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
          >
            <option value="all">All</option>
            <option value="clean">Clean</option>
            <option value="critical">Needs Attention</option>
            <option value="unknown">Not Checked</option>
          </select>
        </div>
        {(searchQuery || healthFilter !== "all") && (
          <div className="flex items-end">
            <button
              onClick={() => { setSearchQuery(""); setHealthFilter("all"); }}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b border-gray-100 px-5 py-4">
              <div className="h-4 w-48 animate-pulse rounded bg-gray-100" />
              <div className="h-4 w-16 animate-pulse rounded bg-gray-100" />
              <div className="h-5 w-20 animate-pulse rounded-full bg-gray-100" />
            </div>
          ))}
        </div>
      ) : agents.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-12 text-center">
          <p className="text-sm font-medium text-gray-500">No deployed agents yet.</p>
          <p className="mt-1 text-xs text-gray-400">
            Deploy an approved agent to begin monitoring its governance health.
          </p>
          <Link
            href="/deploy"
            className="mt-4 inline-block rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Go to Deployment Console →
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-5 py-2.5 text-xs text-gray-400">
            {filtered.length} agent{filtered.length === 1 ? "" : "s"}
            {filtered.length !== agents.length && ` (filtered from ${agents.length})`}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wider text-gray-500">
                <th className="px-5 py-3 text-left">Agent</th>
                <th className="px-4 py-3 text-left">Version</th>
                <th className="px-4 py-3 text-left">Health</th>
                <th className="px-4 py-3 text-right">Errors</th>
                <th className="px-4 py-3 text-right">Warnings</th>
                <th className="px-4 py-3 text-left">Deployed</th>
                <th className="px-4 py-3 text-left">Last Checked</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-sm text-gray-400">
                    No agents match your filters.{" "}
                    <button
                      onClick={() => { setSearchQuery(""); setHealthFilter("all"); }}
                      className="text-blue-600 hover:underline"
                    >
                      Clear filters
                    </button>
                  </td>
                </tr>
              ) : (
                filtered.map((agent) => {
                  const isChecking = checkingId === agent.agentId;
                  return (
                    <tr key={agent.agentId} className="hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <div className="font-medium text-gray-900 truncate max-w-48">
                          {agent.name ?? "Unnamed Agent"}
                        </div>
                        <div className="mt-0.5 font-mono text-xs text-gray-400">
                          {agent.agentId.slice(0, 8)}
                        </div>
                        {agent.tags.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {agent.tags.slice(0, 2).map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500"
                              >
                                {tag}
                              </span>
                            ))}
                            {agent.tags.length > 2 && (
                              <span className="text-xs text-gray-400">+{agent.tags.length - 2}</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">v{agent.version}</td>
                      <td className="px-4 py-3">
                        <HealthBadge status={agent.healthStatus} errorCount={agent.errorCount} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        {agent.errorCount > 0 ? (
                          <span className="font-semibold text-red-600">{agent.errorCount}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {agent.warningCount > 0 ? (
                          <span className="text-amber-600">{agent.warningCount}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {timeAgo(agent.deployedAt)}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {agent.lastCheckedAt ? timeAgo(agent.lastCheckedAt) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-3">
                          {canCheck && (
                            <button
                              onClick={() => handleCheckOne(agent.agentId)}
                              disabled={isChecking || checkingAll}
                              className="text-xs text-blue-600 hover:underline disabled:opacity-40"
                            >
                              {isChecking ? (
                                <span className="inline-flex items-center gap-1">
                                  <span className="inline-block h-2.5 w-2.5 animate-spin rounded-full border border-blue-600 border-t-transparent" />
                                  Checking…
                                </span>
                              ) : (
                                "↻ Check Now"
                              )}
                            </button>
                          )}
                          <Link
                            href={`/registry/${agent.agentId}`}
                            className="text-xs text-gray-500 hover:text-gray-900"
                          >
                            View →
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
