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

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 30) return `${diffDays} days ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 8) return `${diffWeeks}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

export default function DeploymentConsolePage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deploying, setDeploying] = useState<string | null>(null);
  const [deployError, setDeployError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/registry")
      .then((r) => r.json())
      .then((data) => {
        setAgents(data.agents ?? []);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load agents");
        setLoading(false);
      });
  }, []);

  const deployed = agents.filter((a) => a.status === "deployed");
  const readyToDeploy = agents.filter((a) => a.status === "approved");

  async function handleDeploy(agent: Agent) {
    setDeploying(agent.id);
    setDeployError(null);
    try {
      const res = await fetch(`/api/blueprints/${agent.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "deployed" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Deployment failed");
      }
      setAgents((prev) =>
        prev.map((a) => (a.id === agent.id ? { ...a, status: "deployed" } : a))
      );
    } catch (err) {
      setDeployError(err instanceof Error ? err.message : "Deployment failed");
    } finally {
      setDeploying(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Deployment Console</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              Promote approved agents to production
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/pipeline"
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:border-gray-400 hover:text-gray-900 transition-colors"
            >
              Pipeline →
            </Link>
            <Link href="/" className="text-sm text-gray-400 hover:text-gray-700">
              ← Home
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8 space-y-8">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {deployError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {deployError}
          </div>
        )}

        {/* ── Summary stats ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              label: "Deployed",
              value: loading ? "–" : deployed.length,
              sub: "live in production",
              color: "bg-indigo-50 border-indigo-200 text-indigo-900",
              subColor: "text-indigo-600",
            },
            {
              label: "Ready to Deploy",
              value: loading ? "–" : readyToDeploy.length,
              sub: readyToDeploy.length > 0 ? "approved, awaiting deployment" : "none pending",
              color: readyToDeploy.length > 0
                ? "bg-green-50 border-green-200 text-green-900"
                : "bg-white border-gray-200 text-gray-900",
              subColor: readyToDeploy.length > 0 ? "text-green-600" : "text-gray-400",
            },
            {
              label: "Total Agents",
              value: loading ? "–" : agents.length,
              sub: "in registry",
              color: "bg-white border-gray-200 text-gray-900",
              subColor: "text-gray-400",
            },
          ].map(({ label, value, sub, color, subColor }) => (
            <div key={label} className={`rounded-xl border p-5 ${color}`}>
              <div className="text-3xl font-bold">{value}</div>
              <div className="mt-1 text-sm font-medium">{label}</div>
              <div className={`mt-0.5 text-xs ${subColor}`}>{sub}</div>
            </div>
          ))}
        </div>

        {/* ── Ready to deploy ─────────────────────────────────────────────── */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
            Ready to Deploy ({loading ? "…" : readyToDeploy.length})
          </h2>

          {!loading && readyToDeploy.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
              <p className="text-sm text-gray-400">No agents are currently approved and awaiting deployment.</p>
              <p className="mt-1 text-xs text-gray-400">
                Agents must pass review before they can be deployed.{" "}
                <Link href="/registry" className="underline hover:text-gray-600">View registry →</Link>
              </p>
            </div>
          )}

          {!loading && readyToDeploy.length > 0 && (
            <div className="space-y-3">
              {readyToDeploy.map((agent) => (
                <div
                  key={agent.agentId}
                  className="flex items-center justify-between rounded-xl border border-green-200 bg-white px-5 py-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/registry/${agent.agentId}`}
                        className="font-medium text-gray-900 hover:underline"
                      >
                        {agent.name ?? "Unnamed Agent"}
                      </Link>
                      <StatusBadge status={agent.status} />
                    </div>
                    <div className="mt-0.5 flex items-center gap-3 text-xs text-gray-400">
                      <span className="font-mono">v{agent.version}</span>
                      <span>approved {timeAgo(agent.updatedAt)}</span>
                      {agent.tags?.length > 0 && (
                        <div className="flex gap-1">
                          {agent.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="rounded-full bg-gray-100 px-1.5 py-0.5 text-gray-500">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {agent.violationCount !== null && agent.violationCount > 0 && (
                      <p className="mt-1 text-xs text-amber-600">
                        ⚠ {agent.violationCount} governance issue{agent.violationCount !== 1 ? "s" : ""} — review before deploying
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeploy(agent)}
                    disabled={deploying === agent.id}
                    className="ml-4 shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {deploying === agent.id ? "Deploying…" : "Deploy to Production"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Live deployments ────────────────────────────────────────────── */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
            Live in Production ({loading ? "…" : deployed.length})
          </h2>

          {loading && (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100" />
              ))}
            </div>
          )}

          {!loading && deployed.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
              <p className="text-sm text-gray-400">No agents are currently deployed.</p>
            </div>
          )}

          {!loading && deployed.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wider text-gray-500">
                    <th className="px-5 py-3 text-left">Agent</th>
                    <th className="px-5 py-3 text-left">Version</th>
                    <th className="px-5 py-3 text-left">Tags</th>
                    <th className="px-5 py-3 text-left">Deployed</th>
                    <th className="px-5 py-3 text-left">Governance</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {deployed.map((agent) => (
                    <tr key={agent.agentId} className="hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <span className="font-medium text-gray-900">{agent.name ?? "Unnamed Agent"}</span>
                      </td>
                      <td className="px-5 py-3 font-mono text-gray-500 text-xs">v{agent.version}</td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(agent.tags ?? []).slice(0, 2).map((tag) => (
                            <span key={tag} className="rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-400 text-xs">{timeAgo(agent.updatedAt)}</td>
                      <td className="px-5 py-3">
                        {agent.violationCount === 0 && (
                          <span className="text-xs font-medium text-green-600">✓ Clean</span>
                        )}
                        {agent.violationCount !== null && agent.violationCount > 0 && (
                          <span className="text-xs font-medium text-red-600">
                            {agent.violationCount} error{agent.violationCount !== 1 ? "s" : ""}
                          </span>
                        )}
                        {agent.violationCount === null && (
                          <span className="text-xs text-gray-400">Not validated</span>
                        )}
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
      </main>
    </div>
  );
}
