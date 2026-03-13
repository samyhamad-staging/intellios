"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/registry/status-badge";
import { getSlaStatus } from "@/lib/sla/config";

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

export default function PipelinePage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterTag, setFilterTag] = useState<string>("");

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

  const filtered = filterTag
    ? agents.filter((a) => a.tags?.includes(filterTag))
    : agents;

  const byStatus = (status: Status) =>
    filtered.filter((a) => a.status === status);

  // All unique tags across agents
  const allTags = Array.from(new Set(agents.flatMap((a) => a.tags ?? []))).sort();

  return (
    <div className="flex h-screen flex-col">
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
            {allTags.length > 0 && (
              <select
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                <option value="">All tags</option>
                {allTags.map((tag) => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            )}
            <Link
              href="/"
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:border-gray-400 hover:text-gray-900 transition-colors"
            >
              ← Home
            </Link>
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
            <div
              key={status}
              className="flex w-64 shrink-0 flex-col gap-3"
            >
              {/* Column header */}
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${dotColor}`} />
                <span className="text-sm font-semibold text-gray-700">{label}</span>
                <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                  {loading ? "…" : cards.length}
                </span>
              </div>

              {/* Cards */}
              <div className={`flex flex-col gap-2 rounded-xl border p-2 ${color} min-h-32`}>
                {loading && (
                  <div className="flex h-24 items-center justify-center">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                  </div>
                )}
                {!loading && cards.length === 0 && (
                  <p className="py-4 text-center text-xs text-gray-400">Empty</p>
                )}
                {!loading && cards.map((agent) => {
                  const sla = getSlaStatus(agent.updatedAt, agent.status);
                  const slaBorder =
                    sla === "alert"
                      ? "border-red-400 ring-1 ring-red-300"
                      : sla === "warn"
                      ? "border-amber-400 ring-1 ring-amber-200"
                      : "border-gray-200";
                  return (
                  <Link
                    key={agent.agentId}
                    href={`/registry/${agent.agentId}`}
                    className={`block rounded-lg border bg-white p-3 shadow-sm hover:shadow-md transition-all ${slaBorder}`}
                  >
                    {/* Name + violation badge */}
                    <div className="flex items-start justify-between gap-1">
                      <span className="text-sm font-medium text-gray-900 leading-snug line-clamp-2">
                        {agent.name ?? "Unnamed Agent"}
                      </span>
                      {agent.violationCount !== null && agent.violationCount > 0 && (
                        <span className="shrink-0 rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700">
                          {agent.violationCount}✗
                        </span>
                      )}
                      {agent.violationCount === 0 && (
                        <span className="shrink-0 rounded-full bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700">
                          ✓
                        </span>
                      )}
                    </div>

                    {/* Tags */}
                    {agent.tags?.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
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

                    {/* Footer: version + time + SLA indicator */}
                    <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
                      <span className="font-mono">v{agent.version}</span>
                      <div className="flex items-center gap-1.5">
                        {sla === "alert" && (
                          <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700">
                            SLA breach
                          </span>
                        )}
                        {sla === "warn" && (
                          <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                            Nearing SLA
                          </span>
                        )}
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
