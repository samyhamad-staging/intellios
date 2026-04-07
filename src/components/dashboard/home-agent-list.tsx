"use client";

// P2-34: Blueprint search/filter on home page — client component for the
// architect's "Recent Agents" section. Accepts a pre-fetched list of agents
// and filters client-side (no re-fetch needed).

import { useState, useMemo } from "react";
import Link from "next/link";
import { Bot, ChevronRight, Inbox, Search, X, GitBranch } from "lucide-react";
import { StatusBadge } from "@/components/registry/status-badge";
import { SectionHeading } from "@/components/ui/section-heading";

interface AgentItem {
  id: string;
  agentId: string;
  name: string | null;
  status: string;
  version: string;
  updatedAt: string | Date;
}

function timeAgo(dateStr: string | Date): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "1d ago";
  if (diffDays < 30) return `${diffDays}d ago`;
  return `${Math.floor(diffDays / 7)}w ago`;
}

const STATUS_FILTERS = [
  { value: "all",       label: "All"       },
  { value: "draft",     label: "Draft"     },
  { value: "in_review", label: "In Review" },
  { value: "approved",  label: "Approved"  },
  { value: "deployed",  label: "Deployed"  },
] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number]["value"];

interface HomeAgentListProps {
  agents: AgentItem[];
}

export function HomeAgentList({ agents }: HomeAgentListProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    return agents.filter((a) => {
      const matchesQuery = !query || (a.name ?? "").toLowerCase().includes(query.toLowerCase());
      const matchesStatus = statusFilter === "all" || a.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [agents, query, statusFilter]);

  const hasActiveFilter = query || statusFilter !== "all";

  return (
    <section>
      {/* Section header with search */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <SectionHeading className="shrink-0">
          Recent Agents
        </SectionHeading>
        <div className="relative min-w-0 flex-1 max-w-[220px]">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search agents…"
            className="w-full rounded-lg border border-border bg-surface-muted py-1.5 pl-7 pr-7 text-xs text-text placeholder-text-tertiary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text"
            >
              <X size={11} />
            </button>
          )}
        </div>
      </div>

      {/* Status filter chips */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {STATUS_FILTERS.map((f) => {
          const count = f.value === "all" ? agents.length : agents.filter((a) => a.status === f.value).length;
          const active = statusFilter === f.value;
          return (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                active
                  ? "bg-primary text-white"
                  : "border border-border bg-surface text-text-secondary hover:bg-surface-raised hover:text-text"
              }`}
            >
              {f.label}
              {count > 0 && (
                <span className={`ml-1 ${active ? "text-white/70" : "text-text-tertiary"}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Agent list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-surface py-12 text-center">
          {hasActiveFilter ? (
            <>
              <Search size={24} className="mb-3 text-text-tertiary" />
              <p className="text-sm font-medium text-text-secondary">No agents match your search</p>
              <button
                onClick={() => { setQuery(""); setStatusFilter("all"); }}
                className="mt-2 text-xs text-primary hover:text-primary-hover"
              >
                Clear filters
              </button>
            </>
          ) : (
            <>
              <Inbox size={28} className="mb-3 text-text-tertiary" />
              <p className="text-sm font-medium text-text-secondary">No agents yet</p>
              <p className="mt-1 text-xs text-text-tertiary">Start an intake session to design your first agent.</p>
            </>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--shadow-card)]">
          {filtered.slice(0, 12).map((agent, i) => (
            <Link
              key={agent.agentId}
              href={`/registry/${agent.agentId}`}
              className={`flex items-center gap-3 px-5 py-3.5 interactive-row ${i > 0 ? "border-t border-border" : ""}`}
            >
              <Bot size={15} className="shrink-0 text-text-tertiary" />
              <span className="flex-1 truncate text-sm font-medium text-text">{agent.name ?? "Unnamed Agent"}</span>
              <StatusBadge status={agent.status} />
              <span className="text-xs text-text-tertiary">{timeAgo(agent.updatedAt)}</span>
              <ChevronRight size={13} className="text-text-tertiary" />
            </Link>
          ))}
          {filtered.length > 12 && (
            <div className="border-t border-border px-5 py-2.5 text-center">
              <Link href="/blueprints" className="text-xs text-primary hover:text-primary-hover">
                View all {filtered.length} agents →
              </Link>
            </div>
          )}
        </div>
      )}
      {/* Contextual orchestration prompt — shown when 2+ agents are approved/deployed */}
      {agents.filter((a) => a.status === "approved" || a.status === "deployed").length >= 2 && (
        <div className="mt-4 rounded-xl border border-violet-100 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30 px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400">
              <GitBranch size={14} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-violet-900 dark:text-violet-100">Ready to orchestrate?</p>
              <p className="mt-0.5 text-xs text-violet-700 dark:text-violet-300">
                You have {agents.filter((a) => a.status === "approved" || a.status === "deployed").length} approved agents that can be composed into an orchestration pipeline.
              </p>
              <Link
                href="/registry?tab=workflows"
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-violet-700 dark:text-violet-300 hover:text-violet-900 dark:hover:text-violet-200"
              >
                Create an orchestration <ChevronRight size={11} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
