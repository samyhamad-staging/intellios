"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

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
  createdAt: string;
}

const POLICY_TYPE_COLORS: Record<string, string> = {
  safety:         "bg-red-50 text-red-700 border-red-200",
  compliance:     "bg-blue-50 text-blue-700 border-blue-200",
  data_handling:  "bg-purple-50 text-purple-700 border-purple-200",
  access_control: "bg-amber-50 text-amber-700 border-amber-200",
  audit:          "bg-green-50 text-green-700 border-green-200",
};

export default function GovernanceHubPage() {
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
        setError("Failed to load governance data");
        setLoading(false);
      });
  }, []);

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
              <p className="mt-1 text-xs text-gray-400">
                Policies are created via the Governance API by administrators.
              </p>
            </div>
          )}

          {!loading && policies.length > 0 && (
            <div className="space-y-2">
              {policies.map((policy) => (
                <div
                  key={policy.id}
                  className="flex items-start justify-between rounded-lg border border-gray-200 bg-white px-5 py-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-gray-900">{policy.name}</span>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${
                          POLICY_TYPE_COLORS[policy.type] ?? "bg-gray-50 text-gray-600 border-gray-200"
                        }`}
                      >
                        {policy.type.replace("_", " ")}
                      </span>
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
                  <div className="shrink-0 ml-4 text-right">
                    <span className="text-xs text-gray-400">
                      {Array.isArray(policy.rules) ? policy.rules.length : 0} rule{(Array.isArray(policy.rules) ? policy.rules.length : 0) === 1 ? "" : "s"}
                    </span>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {new Date(policy.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

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
