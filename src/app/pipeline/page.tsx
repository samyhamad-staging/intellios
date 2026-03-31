"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { getSlaStatus } from "@/lib/sla/config";
import { Search, ShieldCheck, ShieldAlert, AlertCircle, Clock } from "lucide-react";

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

const COLUMNS: {
  status: Status;
  label: string;
  colBg: string;
  dotColor: string;
  badgeCls: string;
  group: "active" | "terminal";
}[] = [
  { status: "draft",      label: "Draft",      colBg: "bg-gray-50 border-gray-200",     dotColor: "bg-gray-400",   badgeCls: "bg-gray-200 text-gray-600",     group: "active" },
  { status: "in_review",  label: "In Review",  colBg: "bg-blue-50 border-blue-200",     dotColor: "bg-blue-500",   badgeCls: "bg-blue-100 text-blue-700",     group: "active" },
  { status: "approved",   label: "Approved",   colBg: "bg-green-50 border-green-200",   dotColor: "bg-green-500",  badgeCls: "bg-green-100 text-green-700",   group: "active" },
  { status: "deployed",   label: "Deployed",   colBg: "bg-indigo-50 border-indigo-200", dotColor: "bg-indigo-500", badgeCls: "bg-indigo-100 text-indigo-700", group: "terminal" },
  { status: "rejected",   label: "Rejected",   colBg: "bg-red-50 border-red-200",       dotColor: "bg-red-500",    badgeCls: "bg-red-100 text-red-700",       group: "terminal" },
  { status: "deprecated", label: "Deprecated", colBg: "bg-amber-50 border-amber-200",   dotColor: "bg-amber-400",  badgeCls: "bg-amber-100 text-amber-700",   group: "terminal" },
];

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "1d ago";
  if (diffDays < 30) return `${diffDays}d ago`;
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
      .then((data) => { setAgents(data.agents ?? []); setLoading(false); })
      .catch(() => { setError("Failed to load pipeline"); setLoading(false); });
  }, []);

  const filtered = useMemo(
    () => agents.filter(
      (a) => (!filterTag || a.tags?.includes(filterTag)) && matchesSearch(a, searchQuery)
    ),
    [agents, filterTag, searchQuery]
  );

  const byStatus = (status: Status) => filtered.filter((a) => a.status === status);
  const allTags = Array.from(new Set(agents.flatMap((a) => a.tags ?? []))).sort();

  // Only render deprecated column when it has cards
  const visibleColumns = COLUMNS.filter(
    (col) => col.status !== "deprecated" || byStatus("deprecated").length > 0
  );

  const activeColumns = visibleColumns.filter((c) => c.group === "active");
  const terminalColumns = visibleColumns.filter((c) => c.group === "terminal");

  return (
    <div className="flex h-[calc(100vh-0px)] flex-col overflow-hidden">
      {/* Header */}
      <header className="shrink-0 border-b border-border bg-surface px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-text">Pipeline Board</h1>
            <p className="mt-0.5 text-sm text-text-secondary">
              {loading ? "Loading…" : `${agents.length} agent${agents.length === 1 ? "" : "s"} across all stages`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search agents…"
                className="w-48 rounded-lg border border-border bg-surface py-1.5 pl-8 pr-3 text-sm placeholder:text-text-tertiary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
              />
            </div>
            {allTags.length > 0 && (
              <select
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value)}
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text-secondary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
              >
                <option value="">All tags</option>
                {allTags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
              </select>
            )}
            {(searchQuery || filterTag) && (
              <button
                onClick={() => { setSearchQuery(""); setFilterTag(""); }}
                className="text-xs text-text-tertiary hover:text-text underline"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </header>

      {/* AI Insights strip */}
      {!loading && !error && agents.length > 0 && (
        <InsightsStrip agents={agents} />
      )}

      {/* Board */}
      <div className="flex flex-1 gap-0 overflow-x-auto">
        {error && (
          <div className="m-6 w-full rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!error && (
          <div className="flex flex-1 gap-4 p-6">
            {/* Active pipeline columns */}
            {activeColumns.map(({ status, label, colBg, dotColor, badgeCls }) => (
              <Column
                key={status}
                status={status}
                label={label}
                colBg={colBg}
                dotColor={dotColor}
                badgeCls={badgeCls}
                cards={byStatus(status)}
                loading={loading}
              />
            ))}

            {/* Divider between active and terminal stages */}
            {terminalColumns.length > 0 && (
              <div className="shrink-0 self-stretch w-px bg-border mx-1" />
            )}

            {/* Terminal stage columns */}
            {terminalColumns.map(({ status, label, colBg, dotColor, badgeCls }) => (
              <Column
                key={status}
                status={status}
                label={label}
                colBg={colBg}
                dotColor={dotColor}
                badgeCls={badgeCls}
                cards={byStatus(status)}
                loading={loading}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Column ───────────────────────────────────────────────────────────────────

interface ColumnProps {
  status: Status;
  label: string;
  colBg: string;
  dotColor: string;
  badgeCls: string;
  cards: Agent[];
  loading: boolean;
}

function Column({ status, label, colBg, dotColor, badgeCls, cards, loading }: ColumnProps) {
  return (
    <div className="flex w-[220px] shrink-0 flex-col gap-2.5">
      {/* Column header */}
      <div className="flex items-center gap-2 px-0.5">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotColor}`} />
        <span className="text-sm font-semibold text-text">{label}</span>
        <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-semibold ${badgeCls}`}>
          {loading ? "…" : cards.length}
        </span>
      </div>

      {/* Card list */}
      <div className={`flex flex-col gap-2 rounded-xl border p-2 ${colBg} min-h-32 flex-1`}>
        {loading && (
          <div className="flex h-24 items-center justify-center">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary" />
          </div>
        )}
        {!loading && cards.length === 0 && (
          <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-border">
            {status === "draft" ? (
              <Link href="/intake" className="text-xs font-medium text-primary hover:opacity-70 transition-colors">
                Start an intake →
              </Link>
            ) : (
              <p className="text-xs text-text-tertiary">Empty</p>
            )}
          </div>
        )}
        {!loading && cards.map((agent) => (
          <AgentCard key={agent.agentId} agent={agent} />
        ))}
      </div>
    </div>
  );
}

// ─── Insights Strip ───────────────────────────────────────────────────────────

interface Insight {
  type: "alert" | "warn" | "info";
  text: string;
}

function InsightsStrip({ agents }: { agents: Agent[] }) {
  const insights: Insight[] = [];

  const slaBreaches = agents.filter(
    (a) => a.status !== "deployed" && a.status !== "rejected" && a.status !== "deprecated" && getSlaStatus(a.updatedAt, a.status) === "alert"
  );
  const slaWarns = agents.filter(
    (a) => a.status !== "deployed" && a.status !== "rejected" && a.status !== "deprecated" && getSlaStatus(a.updatedAt, a.status) === "warn"
  );
  const violations = agents.filter((a) => (a.violationCount ?? 0) > 0);
  const inReview = agents.filter((a) => a.status === "in_review");
  const approved = agents.filter((a) => a.status === "approved");

  if (slaBreaches.length > 0) {
    const names = slaBreaches
      .slice(0, 2)
      .map((a) => a.name ?? `Agent ${a.agentId.slice(0, 6)}`)
      .join(", ");
    insights.push({
      type: "alert",
      text: `${slaBreaches.length} SLA breach${slaBreaches.length > 1 ? "es" : ""} — ${names}${slaBreaches.length > 2 ? ` +${slaBreaches.length - 2} more` : ""}`,
    });
  }

  if (violations.length > 0) {
    insights.push({
      type: "warn",
      text: `${violations.length} agent${violations.length > 1 ? "s have" : " has"} governance violation${violations.length > 1 ? "s" : ""}`,
    });
  }

  if (slaWarns.length > 0 && slaBreaches.length === 0) {
    insights.push({
      type: "warn",
      text: `${slaWarns.length} agent${slaWarns.length > 1 ? "s are" : " is"} nearing SLA deadline`,
    });
  }

  if (approved.length > 0) {
    insights.push({
      type: "info",
      text: `${approved.length} agent${approved.length > 1 ? "s are" : " is"} approved and ready to deploy`,
    });
  }

  if (inReview.length > 0 && insights.length < 3) {
    insights.push({
      type: "info",
      text: `${inReview.length} agent${inReview.length > 1 ? "s" : ""} pending review`,
    });
  }

  if (insights.length === 0) return null;

  const STYLES: Record<Insight["type"], string> = {
    alert: "text-red-600",
    warn: "text-amber-600",
    info: "text-text-secondary",
  };

  const DOTS: Record<Insight["type"], string> = {
    alert: "bg-red-400",
    warn: "bg-amber-400",
    info: "bg-border",
  };

  return (
    <div className="shrink-0 flex items-center gap-4 border-b border-border bg-surface-raised px-6 py-2">
      <span className="shrink-0 text-2xs font-semibold uppercase tracking-widest text-text-tertiary">
        Insights
      </span>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
        {insights.map((ins, i) => (
          <span key={i} className={`flex items-center gap-1.5 text-xs ${STYLES[ins.type]}`}>
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOTS[ins.type]}`} />
            {ins.text}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function AgentCard({ agent }: { agent: Agent }) {
  const sla = getSlaStatus(agent.updatedAt, agent.status);

  const borderCls =
    sla === "alert" ? "border-red-300 border-t-2 border-t-red-400" :
    sla === "warn"  ? "border-amber-300 border-t-2 border-t-amber-400" :
    "border-border hover:border-primary/40";

  const shadowCls =
    sla === "alert" ? "shadow-sm hover:shadow-red-100" :
    sla === "warn"  ? "shadow-sm hover:shadow-amber-100" :
    "shadow-sm hover:shadow-md hover:shadow-primary/5";

  return (
    <Link
      href={`/registry/${agent.agentId}`}
      className={`block rounded-lg border bg-surface p-3 transition-all hover:-translate-y-px ${borderCls} ${shadowCls}`}
    >
      {/* Name + governance shield */}
      <div className="flex items-start gap-2">
        <span className="flex-1 text-sm font-semibold leading-snug text-text line-clamp-2">
          {agent.name ?? `Agent ${agent.agentId.slice(0, 8)}`}
        </span>
        {agent.violationCount !== null && agent.violationCount > 0 ? (
          <ShieldAlert size={13} className="mt-0.5 shrink-0 text-red-400" />
        ) : agent.violationCount === 0 ? (
          <ShieldCheck size={13} className="mt-0.5 shrink-0 text-green-400" />
        ) : null}
      </div>

      {/* Tags */}
      {agent.tags?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {agent.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="rounded-full bg-surface-muted px-2 py-0.5 text-xs-tight font-medium text-text-secondary">
              {tag}
            </span>
          ))}
          {agent.tags.length > 2 && (
            <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs-tight font-medium text-text-tertiary">
              +{agent.tags.length - 2}
            </span>
          )}
        </div>
      )}

      {/* Footer: version + SLA + time */}
      <div className="mt-2.5 flex items-center justify-between text-xs text-text-tertiary">
        <span className="font-mono text-xs-tight">v{agent.version}</span>
        <div className="flex items-center gap-1.5">
          {sla === "alert" && (
            <span className="flex items-center gap-0.5 rounded-md bg-red-50 px-1.5 py-0.5 text-2xs font-semibold text-red-600">
              <AlertCircle size={9} />
              SLA breach
            </span>
          )}
          {sla === "warn" && (
            <span className="flex items-center gap-0.5 rounded-md bg-amber-50 px-1.5 py-0.5 text-2xs font-semibold text-amber-600">
              <Clock size={9} />
              Nearing SLA
            </span>
          )}
          <span>{timeAgo(agent.updatedAt)}</span>
        </div>
      </div>
    </Link>
  );
}
