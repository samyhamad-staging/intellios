"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/registry/status-badge";

interface RegistryEntry {
  id: string;
  agentId: string;
  version: string;
  name: string | null;
  tags: string[];
  status: string;
  sessionId: string;
  createdAt: string;
  updatedAt: string;
}

const ALL_STATUSES = ["draft", "in_review", "approved", "deployed", "rejected", "deprecated"] as const;

function matchesSearch(agent: RegistryEntry, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  if (agent.name?.toLowerCase().includes(q)) return true;
  if (agent.agentId.toLowerCase().includes(q)) return true;
  if (agent.tags?.some((t) => t.toLowerCase().includes(q))) return true;
  return false;
}

export default function RegistryPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<RegistryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [cloningId, setCloningId] = useState<string | null>(null);

  const handleCloneFromList = useCallback(async (agent: RegistryEntry, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCloningId(agent.id);
    try {
      const res = await fetch(`/api/blueprints/${agent.id}/clone`, { method: "POST" });
      if (!res.ok) return;
      const cloned = await res.json();
      router.push(`/registry/${cloned.agentId}`);
    } catch { /* non-critical */ }
    finally { setCloningId(null); }
  }, [router]);

  useEffect(() => {
    fetch("/api/registry")
      .then((r) => r.json())
      .then((data) => {
        setAgents(data.agents ?? []);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load registry");
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    return agents.filter(
      (a) =>
        matchesSearch(a, searchQuery) &&
        (!statusFilter || a.status === statusFilter)
    );
  }, [agents, searchQuery, statusFilter]);

  const hasFilters = searchQuery.trim() !== "" || statusFilter !== "";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Agent Registry</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              {loading
                ? "Loading…"
                : `${agents.length} agent${agents.length !== 1 ? "s" : ""} total`}
            </p>
          </div>
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            ← Home
          </Link>
        </div>
      </header>

      {/* Search + filter bar */}
      <div className="border-b border-gray-200 bg-white px-6 py-3">
        <div className="mx-auto max-w-5xl flex items-center gap-3">
          {/* Text search */}
          <div className="relative flex-1 max-w-md">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z"
              />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, ID, or tag…"
              className="w-full rounded-lg border border-gray-200 bg-white py-1.5 pl-9 pr-3 text-sm placeholder-gray-400 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
          >
            <option value="">All statuses</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </option>
            ))}
          </select>

          {/* Result count */}
          {hasFilters && !loading && (
            <span className="text-xs text-gray-400">
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </span>
          )}
          {hasFilters && (
            <button
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("");
              }}
              className="text-xs text-gray-400 hover:text-gray-700 underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {loading && (
          <p className="text-center text-sm text-gray-400">Loading agents…</p>
        )}
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Empty registry state */}
        {!loading && !error && agents.length === 0 && (
          <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
            <p className="text-gray-500 text-sm">No agents in the registry yet.</p>
            <Link
              href="/"
              className="mt-3 inline-block text-sm text-gray-900 underline"
            >
              Start an intake session
            </Link>
          </div>
        )}

        {/* No search results */}
        {!loading && !error && agents.length > 0 && filtered.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
            <p className="text-sm text-gray-500">
              No agents match &ldquo;{searchQuery || statusFilter}&rdquo;.
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("");
              }}
              className="mt-2 text-xs text-gray-400 underline hover:text-gray-700"
            >
              Clear filters
            </button>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="space-y-3">
            {filtered.map((agent) => (
              <div
                key={agent.agentId}
                className="rounded-lg border border-gray-200 bg-white hover:border-gray-400 transition-colors"
              >
                <Link
                  href={`/registry/${agent.agentId}`}
                  className="block p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="font-medium text-gray-900 truncate">
                          {agent.name ?? "Unnamed Agent"}
                        </h2>
                        <StatusBadge status={agent.status} />
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
                        <span>v{agent.version}</span>
                        <span>·</span>
                        <span className="font-mono">{agent.agentId.slice(0, 8)}</span>
                        <span>·</span>
                        <span>{new Date(agent.createdAt).toLocaleDateString()}</span>
                      </div>
                      {Array.isArray(agent.tags) && agent.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {(agent.tags as string[]).map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        onClick={(e) => handleCloneFromList(agent, e)}
                        disabled={cloningId === agent.id}
                        className="rounded border border-gray-200 px-2.5 py-1 text-xs text-gray-500 hover:border-gray-400 hover:text-gray-700 disabled:opacity-50"
                      >
                        {cloningId === agent.id ? "Cloning…" : "Clone"}
                      </button>
                      <span className="text-sm text-gray-400">View →</span>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
