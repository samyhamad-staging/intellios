"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/registry/status-badge";
import { getSlaStatus } from "@/lib/sla/config";
import { Search, ShieldCheck, ShieldAlert } from "lucide-react";

interface Agent {
  id: string;
  agentId: string;
  version: string;
  name: string | null;
  tags: string[];
  status: string;
  sessionId: string;
  violationCount: number | null;
  createdAt: string;
  updatedAt: string;
}

type Status = "draft" | "in_review" | "approved" | "rejected" | "deprecated" | "deployed";

const COLUMNS: { status: Status; label: string; color: string; dotColor: string }[] = [
  { status: "draft",      label: "Draft",      color: "bg-gray-50 border-gray-200",    dotColor: "bg-gray-400" },
  { status: "in_review",  label: "In Review",  color: "bg-blue-50 border-blue-200",    dotColor: "bg-blue-500" },
  { status: "approved",   label: "Approved",   color: "bg-green-50 border-green-200",  dotColor: "bg-green-500" },
  { status: "deployed",   label: "Deployed",   color: "bg-indigo-50 border-indigo-200", dotColor: "bg-indigo-500" },
  { status: "rejected",   label: "Rejected",   color: "bg-red-50 border-red-200",      dotColor: "bg-red-500" },
  { status: "deprecated", label: "Deprecated", color: "bg-amber-50 border-amber-200",  dotColor: "bg-amber-400" },
];

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

function matchesSearch(agent: Agent, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  if (agent.name?.toLowerCase().includes(q)) return true;
  if (agent.agentId.toLowerCase().includes(q)) return true;
  if (agent.tags?.some((t) => t.toLowerCase().includes(q))) return true;
  return false;
}

export default function PipelinePage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterTag, setFilterTag] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    fetch("/api/registry")
      .then((r) => r.json())
      .then((data) => {
        setAgents(data.agents ?? []);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load pipeline");
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() =>
    agents.filter(
      (a) =>
        (!filterTag || a.tags?.includes(filterTag)) &&
        matchesSearch(a, searchQuery)
    ),
    [agents, filterTag, searchQuery]
  );

  const byStatus = (status: Status) =>
    filtered.filter((a) => a.status === status);

  // All unique tags across agents
  const allTags = Array.from(new Set(agents.flatMap((a) => a.tags ?? []))).sort();

  return (
    <div className="flex h-[calc(100vh-0px)] flex-col">
      {/* Header */}
      <header className="shrink-0 border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Pipeline Board</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              {loading ? "Loading…" : `${agents.length} agent${agents.length === 1 ? "" : "s"} across all stages`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search agents…"
                className="w-48 rounded-lg border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-sm placeholder-gray-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/10"
              />
            </div>
            {allTags.length > 0 && (
              <select
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              >
                <option value="">All tags</option>
                {allTags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
              </select>
            )}
            {(searchQuery || filterTag) && (
              <button onClick={() => { setSearchQuery(""); setFilterTag(""); }} className="text-xs text-gray-400 hover:text-gray-700 underline">Clear</button>
            )}
          </div>
        </div>
      </header>

      {/* Board */}
      <div className="flex flex-1 gap-4 overflow-x-auto p-6">
        {error && (
          <div className="w-full rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!error && COLUMNS.map(({ status, label, color, dotColor }) => {
          const cards = byStatus(status);
          return (
            <div key={status} className="flex w-64 shrink-0 flex-col gap-2.5">
              {/* Column header */}
              <div className="flex items-center gap-2 px-0.5">
                <span className={`h-2 w-2 rounded-full ${dotColor}`} />
                <span className="text-sm font-semibold text-gray-700">{label}</span>
                <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                  {loading ? "…" : cards.length}
                </span>
              </div>

              {/* Cards */}
              <div className={`flex flex-col gap-2 rounded-xl border p-2 ${color} min-h-32`}>
                {loading && (
                  <div className="flex h-24 items-center justify-center">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-violet-600" />
                  </div>
                )}
                {!loading && cards.length === 0 && (
                  <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-gray-200">
                    <p className="text-xs text-gray-400">Empty</p>
                  </div>
                )}
                {!loading && cards.map((agent) => {
                  const sla = getSlaStatus(agent.updatedAt, agent.status);
                  const slaBorder = sla === "alert" ? "border-red-400 ring-1 ring-red-300" : sla === "warn" ? "border-amber-400 ring-1 ring-amber-200" : "border-gray-200";
                  return (
                    <Link
                      key={agent.agentId}
                      href={`/registry/${agent.agentId}`}
                      className={`block rounded-lg border bg-white p-3 shadow-sm hover:shadow-md transition-all ${slaBorder}`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-sm font-medium text-gray-900 leading-snug line-clamp-2">{agent.name ?? "Unnamed Agent"}</span>
                        {agent.violationCount !== null && agent.violationCount > 0 ? (
                          <ShieldAlert size={14} className="shrink-0 mt-0.5 text-red-500" />
                        ) : agent.violationCount === 0 ? (
                          <ShieldCheck size={14} className="shrink-0 mt-0.5 text-green-500" />
                        ) : null}
                      </div>
                      {agent.tags?.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {agent.tags.slice(0, 2).map((tag) => (
                            <span key={tag} className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-500">{tag}</span>
                          ))}
                          {agent.tags.length > 2 && <span className="text-[11px] text-gray-400">+{agent.tags.length - 2}</span>}
                        </div>
                      )}
                      <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
                        <span className="font-mono">v{agent.version}</span>
                        <div className="flex items-center gap-1">
                          {sla === "alert" && <span className="rounded-md bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700">SLA breach</span>}
                          {sla === "warn" && <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">Nearing SLA</span>}
                          <span>{timeAgo(agent.updatedAt)}</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
