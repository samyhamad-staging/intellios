"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/registry/status-badge";
import { Search, Bot, ChevronRight, Copy, X, Inbox, GitBranch } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RegistryEntry {
  id: string; agentId: string; version: string; name: string | null;
  tags: string[]; status: string; sessionId: string; createdAt: string; updatedAt: string;
  monthlyCostUsd: number | null;
}

interface WorkflowEntry {
  id: string; workflowId: string; version: string; name: string;
  description: string; status: string; createdAt: string; updatedAt: string;
}

type ArtifactTab = "agents" | "workflows";

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_AGENT_STATUSES = ["draft", "in_review", "approved", "deployed", "rejected", "deprecated"] as const;
const ALL_WORKFLOW_STATUSES = ["draft", "in_review", "approved", "rejected", "deprecated"] as const;
const STATUS_LABELS: Record<string, string> = {
  draft: "Draft", in_review: "In Review", approved: "Approved",
  deployed: "Deployed", rejected: "Rejected", deprecated: "Deprecated",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function matchesSearch(name: string | null, id: string, tags: string[] | undefined, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (name?.toLowerCase().includes(q) || id.toLowerCase().includes(q) || tags?.some((t) => t.toLowerCase().includes(q))) ?? false;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RegistryPage() {
  const router = useRouter();

  // ── Tab ──
  const [activeTab, setActiveTab] = useState<ArtifactTab>("agents");

  // ── Agent state ──
  const [agents, setAgents] = useState<RegistryEntry[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [agentsError, setAgentsError] = useState<string | null>(null);
  const [cloningId, setCloningId] = useState<string | null>(null);

  // ── Workflow state ──
  const [wflows, setWflows] = useState<WorkflowEntry[]>([]);
  const [wflowsLoading, setWflowsLoading] = useState(false);
  const [wflowsError, setWflowsError] = useState<string | null>(null);
  const [wflowsLoaded, setWflowsLoaded] = useState(false);

  // ── Shared filter state ──
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  // ─── Data fetching ────────────────────────────────────────────────────────

  useEffect(() => {
    fetch("/api/registry")
      .then((r) => r.json())
      .then((data) => { setAgents(data.agents ?? []); setAgentsLoading(false); })
      .catch(() => { setAgentsError("Failed to load registry"); setAgentsLoading(false); });
  }, []);

  useEffect(() => {
    if (activeTab === "workflows" && !wflowsLoaded) {
      setWflowsLoading(true);
      fetch("/api/workflows")
        .then((r) => r.json())
        .then((data) => { setWflows(data.workflows ?? []); setWflowsLoading(false); setWflowsLoaded(true); })
        .catch(() => { setWflowsError("Failed to load workflows"); setWflowsLoading(false); });
    }
  }, [activeTab, wflowsLoaded]);

  // ─── Tab switch (reset filters) ───────────────────────────────────────────

  const switchTab = (tab: ArtifactTab) => {
    setActiveTab(tab);
    setSearchQuery("");
    setStatusFilter("");
  };

  // ─── Clone handler ────────────────────────────────────────────────────────

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

  // ─── Filtered lists ───────────────────────────────────────────────────────

  const filteredAgents = useMemo(() =>
    agents.filter((a) =>
      matchesSearch(a.name, a.agentId, a.tags, searchQuery) &&
      (!statusFilter || a.status === statusFilter)
    ),
    [agents, searchQuery, statusFilter]
  );

  const filteredWflows = useMemo(() =>
    wflows.filter((w) =>
      matchesSearch(w.name, w.id, undefined, searchQuery) &&
      (!statusFilter || w.status === statusFilter)
    ),
    [wflows, searchQuery, statusFilter]
  );

  // ─── Derived values ───────────────────────────────────────────────────────

  const loading = activeTab === "agents" ? agentsLoading : wflowsLoading;
  const error   = activeTab === "agents" ? agentsError  : wflowsError;
  const total   = activeTab === "agents" ? agents.length : wflows.length;
  const filtered = activeTab === "agents" ? filteredAgents : filteredWflows;
  const statuses = activeTab === "agents" ? ALL_AGENT_STATUSES : ALL_WORKFLOW_STATUSES;
  const hasFilters = searchQuery.trim() !== "" || statusFilter !== "";

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="px-8 py-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Registry</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {loading ? "Loading…" : `${total} ${activeTab === "agents" ? `agent${total !== 1 ? "s" : ""}` : `workflow${total !== 1 ? "s" : ""}`} total`}
          </p>
        </div>
      </div>

      {/* Artifact-type tabs */}
      <div className="mb-5 flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 w-fit">
        <button
          onClick={() => switchTab("agents")}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${activeTab === "agents" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
          <Bot size={14} /> Agents
        </button>
        <button
          onClick={() => switchTab("workflows")}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${activeTab === "workflows" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
          <GitBranch size={14} /> Workflows
        </button>
      </div>

      {/* Search + filter bar */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${activeTab}…`}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-8 pr-8 text-sm placeholder-gray-400 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/10"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} aria-label="Clear search" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
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
          {statuses.map((s) => (
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

      {/* ── Agent list ────────────────────────────────────────────────────── */}
      {activeTab === "agents" && !agentsLoading && !agentsError && (
        <>
          {agents.length === 0 && (
            <div className="flex flex-col items-center rounded-xl border border-dashed border-gray-200 bg-white py-16 text-center shadow-sm">
              <Inbox size={32} className="mb-4 text-gray-300" />
              <p className="mb-1 text-sm font-medium text-gray-500">No agents in the registry yet</p>
              <Link href="/intake" className="mt-2 text-xs text-violet-600 hover:text-violet-700">Start an intake session →</Link>
              <Link href="/templates" className="mt-1 text-xs text-violet-600 hover:text-violet-700">Browse templates →</Link>
            </div>
          )}

          {agents.length > 0 && filteredAgents.length === 0 && (
            <div className="flex flex-col items-center rounded-xl border border-dashed border-gray-200 bg-white py-16 text-center shadow-sm">
              <Search size={28} className="mb-3 text-gray-300" />
              <p className="text-sm text-gray-500">No agents match your filters</p>
              <button onClick={() => { setSearchQuery(""); setStatusFilter(""); }} className="mt-2 text-xs text-violet-600 hover:text-violet-700 underline">
                Clear filters
              </button>
            </div>
          )}

          {filteredAgents.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              {filteredAgents.map((agent, i) => (
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
                            <span key={tag} className="rounded-md bg-gray-100 px-1.5 py-0.5 text-xs-tight text-gray-500">{tag}</span>
                          ))}
                          {agent.tags.length > 5 && <span className="text-xs-tight text-gray-400">+{agent.tags.length - 5} more</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {agent.monthlyCostUsd !== null && agent.monthlyCostUsd > 0 && (
                        <span className="text-xs text-gray-500 hidden sm:block">
                          ${agent.monthlyCostUsd.toFixed(4)}<span className="text-gray-400">/mo</span>
                        </span>
                      )}
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
        </>
      )}

      {/* ── Workflow list ──────────────────────────────────────────────────── */}
      {activeTab === "workflows" && !wflowsLoading && !wflowsError && (
        <>
          {wflows.length === 0 && (
            <div className="flex flex-col items-center rounded-xl border border-dashed border-gray-200 bg-white py-16 text-center shadow-sm">
              <Inbox size={32} className="mb-4 text-gray-300" />
              <p className="mb-1 text-sm font-medium text-gray-500">No workflows yet</p>
              <p className="text-xs text-gray-400">Create a workflow to orchestrate multiple agents into a pipeline.</p>
            </div>
          )}

          {wflows.length > 0 && filteredWflows.length === 0 && (
            <div className="flex flex-col items-center rounded-xl border border-dashed border-gray-200 bg-white py-16 text-center shadow-sm">
              <Search size={28} className="mb-3 text-gray-300" />
              <p className="text-sm text-gray-500">No workflows match your filters</p>
              <button onClick={() => { setSearchQuery(""); setStatusFilter(""); }} className="mt-2 text-xs text-violet-600 hover:text-violet-700 underline">
                Clear filters
              </button>
            </div>
          )}

          {filteredWflows.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              {filteredWflows.map((wf, i) => (
                <div key={wf.id} className={`${i > 0 ? "border-t border-gray-100" : ""}`}>
                  <Link href={`/registry/workflow/${wf.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-500">
                      <GitBranch size={15} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="truncate text-sm font-medium text-gray-900">{wf.name}</span>
                        <StatusBadge status={wf.status} />
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span>v{wf.version}</span>
                        <span>·</span>
                        <span className="font-mono">{wf.id.slice(0, 8)}</span>
                        <span>·</span>
                        <span>{new Date(wf.createdAt).toLocaleDateString()}</span>
                      </div>
                      {wf.description && (
                        <p className="mt-0.5 text-xs text-gray-400 truncate">{wf.description}</p>
                      )}
                    </div>
                    <ChevronRight size={14} className="text-gray-300 shrink-0" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
