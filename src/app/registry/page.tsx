"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/registry/status-badge";
import { Search, Bot, ChevronRight, Copy, X, Inbox } from "lucide-react";

interface RegistryEntry {
  id: string; agentId: string; version: string; name: string | null;
  tags: string[]; status: string; sessionId: string; createdAt: string; updatedAt: string;
}

const ALL_STATUSES = ["draft", "in_review", "approved", "deployed", "rejected", "deprecated"] as const;
const STATUS_LABELS: Record<string, string> = {
  draft: "Draft", in_review: "In Review", approved: "Approved",
  deployed: "Deployed", rejected: "Rejected", deprecated: "Deprecated",
};

function matchesSearch(agent: RegistryEntry, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (agent.name?.toLowerCase().includes(q) || agent.agentId.toLowerCase().includes(q) || agent.tags?.some((t) => t.toLowerCase().includes(q))) ?? false;
}

export default function RegistryPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<RegistryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [cloningId, setCloningId] = useState<string | null>(null);

  const handleClone = useCallback(async (agent: RegistryEntry, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
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
      .then((data) => { setAgents(data.agents ?? []); setLoading(false); })
      .catch(() => { setError("Failed to load registry"); setLoading(false); });
  }, []);

  const filtered = useMemo(() =>
    agents.filter((a) => matchesSearch(a, searchQuery) && (!statusFilter || a.status === statusFilter)),
    [agents, searchQuery, statusFilter]
  );

  const hasFilters = searchQuery.trim() !== "" || statusFilter !== "";

  return (
    <div className="px-8 py-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Agent Registry</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {loading ? "Loading…" : `${agents.length} agent${agents.length !== 1 ? "s" : ""} total`}
          </p>
        </div>
      </div>

      {/* Search + filter bar */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, ID, or tag…"
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-8 pr-8 text-sm placeholder-gray-400 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/10"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Status pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setStatusFilter("")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${!statusFilter ? "bg-violet-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
          >
            All
          </button>
          {ALL_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? "" : s)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${statusFilter === s ? "bg-violet-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        {hasFilters && !loading && (
          <span className="text-xs text-gray-400">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {/* Empty registry */}
      {!loading && !error && agents.length === 0 && (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-gray-200 bg-white py-16 text-center shadow-sm">
          <Inbox size={32} className="mb-4 text-gray-300" />
          <p className="mb-1 text-sm font-medium text-gray-500">No agents in the registry yet</p>
          <Link href="/intake" className="mt-2 text-xs text-violet-600 hover:text-violet-700">Start an intake session →</Link>
          <Link href="/templates" className="mt-1 text-xs text-violet-600 hover:text-violet-700">Browse templates →</Link>
        </div>
      )}

      {/* No results */}
      {!loading && !error && agents.length > 0 && filtered.length === 0 && (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-gray-200 bg-white py-16 text-center shadow-sm">
          <Search size={28} className="mb-3 text-gray-300" />
          <p className="text-sm text-gray-500">No agents match your filters</p>
          <button onClick={() => { setSearchQuery(""); setStatusFilter(""); }} className="mt-2 text-xs text-violet-600 hover:text-violet-700 underline">
            Clear filters
          </button>
        </div>
      )}

      {/* Agent list */}
      {filtered.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {filtered.map((agent, i) => (
            <div key={agent.agentId} className={`${i > 0 ? "border-t border-gray-100" : ""}`}>
              <Link href={`/registry/${agent.agentId}`} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
                  <Bot size={15} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="truncate text-sm font-medium text-gray-900">{agent.name ?? "Unnamed Agent"}</span>
                    <StatusBadge status={agent.status} />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>v{agent.version}</span>
                    <span>·</span>
                    <span className="font-mono">{agent.agentId.slice(0, 8)}</span>
                    <span>·</span>
                    <span>{new Date(agent.createdAt).toLocaleDateString()}</span>
                  </div>
                  {Array.isArray(agent.tags) && agent.tags.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {(agent.tags as string[]).slice(0, 5).map((tag) => (
                        <span key={tag} className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-500">{tag}</span>
                      ))}
                      {agent.tags.length > 5 && <span className="text-[11px] text-gray-400">+{agent.tags.length - 5} more</span>}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={(e) => handleClone(agent, e)}
                    disabled={cloningId === agent.id}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-500 hover:border-gray-300 hover:text-gray-700 disabled:opacity-50 transition-colors"
                  >
                    <Copy size={11} />
                    {cloningId === agent.id ? "Cloning…" : "Clone"}
                  </button>
                  <ChevronRight size={14} className="text-gray-300" />
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
