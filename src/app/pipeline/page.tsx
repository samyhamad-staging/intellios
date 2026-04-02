"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { getSlaStatus } from "@/lib/sla/config";
import { Search, ShieldCheck, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

// ── Column definitions ────────────────────────────────────────────────────────
// "active" = part of the forward lifecycle flow (shown with divider before terminal)
// "terminal" = outcome states; hidden when empty

const COLUMNS: {
  status: Status;
  label: string;
  colBg: string;
  dotColor: string;
  badgeCls: string;
  group: "active" | "terminal";
}[] = [
  { status: "draft",      label: "Draft",      colBg: "bg-gray-50 border-gray-200",     dotColor: "bg-gray-400",   badgeCls: "bg-gray-200 text-gray-600",     group: "active"   },
  { status: "in_review",  label: "In Review",  colBg: "bg-blue-50 border-blue-200",     dotColor: "bg-blue-500",   badgeCls: "bg-blue-100 text-blue-700",     group: "active"   },
  { status: "approved",   label: "Approved",   colBg: "bg-green-50 border-green-200",   dotColor: "bg-green-500",  badgeCls: "bg-green-100 text-green-700",   group: "active"   },
  { status: "deployed",   label: "Deployed",   colBg: "bg-indigo-50 border-indigo-200", dotColor: "bg-indigo-500", badgeCls: "bg-indigo-100 text-indigo-700", group: "active"   },
  { status: "rejected",   label: "Rejected",   colBg: "bg-red-50 border-red-200",       dotColor: "bg-red-500",    badgeCls: "bg-red-100 text-red-700",       group: "terminal" },
  { status: "deprecated", label: "Deprecated", colBg: "bg-amber-50 border-amber-200",   dotColor: "bg-amber-400",  badgeCls: "bg-amber-100 text-amber-700",   group: "terminal" },
];

// Next-action label shown on cards to guide the user to the right action
const CTA_LABELS: Partial<Record<Status, string>> = {
  draft:     "Submit for review",
  in_review: "Review now",
  approved:  "Deploy",
  rejected:  "Revise",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

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

/** Age text color — amber/red for active-stage agents sitting too long */
function ageClass(dateStr: string, status: string): string {
  const isActive = ["draft", "in_review", "approved"].includes(status);
  if (!isActive) return "text-text-tertiary";
  const diffDays = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays > 30) return "text-red-500";
  if (diffDays > 14) return "text-amber-500";
  return "text-text-tertiary";
}

function agentDisplayName(a: Agent): string {
  return a.name ?? `Agent ${a.agentId.slice(0, 6)}`;
}

function matchesSearch(agent: Agent, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  if (agent.name?.toLowerCase().includes(q)) return true;
  if (agent.agentId.toLowerCase().includes(q)) return true;
  if (agent.tags?.some((t) => t.toLowerCase().includes(q))) return true;
  return false;
}

// ── Page ──────────────────────────────────────────────────────────────────────

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

  // Terminal columns (rejected, deprecated) hidden when empty — they're outcome states
  // not active pipeline stages. Draft/InReview/Approved/Deployed always visible.
  const visibleColumns = COLUMNS.filter((col) => {
    if (col.group === "terminal") return byStatus(col.status).length > 0;
    return true;
  });

  const activeColumns  = visibleColumns.filter((c) => c.group === "active");
  const terminalColumns = visibleColumns.filter((c) => c.group === "terminal");

  return (
    <div className="flex h-[calc(100vh-0px)] flex-col overflow-hidden">

      {/* ── Header ───────────────────────────────────────────────────────── */}
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
              <Select
                value={filterTag || "_all_"}
                onValueChange={(v) => setFilterTag(v === "_all_" ? "" : v)}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all_">All tags</SelectItem>
                  {allTags.map((tag) => <SelectItem key={tag} value={tag}>{tag}</SelectItem>)}
                </SelectContent>
              </Select>
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

      {/* ── Insights strip ───────────────────────────────────────────────── */}
      {!loading && !error && agents.length > 0 && (
        <InsightsStrip agents={agents} />
      )}

      {/* ── Board ────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 gap-0 overflow-x-auto bg-surface-muted/30">
        {error && (
          <div className="m-6 w-full rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!error && (
          <div className="flex gap-4 p-6 items-start min-h-full">
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

            {/* Divider — separates active lifecycle from terminal outcome states */}
            {terminalColumns.length > 0 && (
              <div className="shrink-0 self-stretch w-px bg-border mx-1" />
            )}

            {/* Terminal outcome columns — only shown when occupied */}
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

// ── Column ────────────────────────────────────────────────────────────────────

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
  const count = loading ? null : cards.length;

  return (
    <div className="flex w-[220px] shrink-0 flex-col gap-2.5">
      {/* Column header */}
      <div className="flex items-center gap-2 px-0.5">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotColor}`} />
        <span className="text-sm font-semibold text-text">{label}</span>
        {/* Count badge — hidden when 0 to avoid "empty" noise */}
        {(loading || (count !== null && count > 0)) && (
          <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-semibold ${badgeCls}`}>
            {loading ? "…" : count}
          </span>
        )}
      </div>

      {/* Card list — content-height, scrolls internally when full */}
      <div className={`flex flex-col gap-2 rounded-xl border p-2 ${colBg} min-h-[240px] max-h-[calc(100vh-200px)] overflow-y-auto`}>
        {loading && (
          <div className="flex h-24 items-center justify-center">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary" />
          </div>
        )}
        {!loading && cards.length === 0 && (
          <div className="flex h-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border px-3 text-center">
            {status === "draft" ? (
              <Link href="/intake" className="text-xs font-medium text-primary hover:opacity-70 transition-colors">
                Start an intake →
              </Link>
            ) : status === "approved" ? (
              <p className="text-xs text-text-tertiary">No agents awaiting deployment</p>
            ) : status === "deployed" ? (
              <p className="text-xs text-text-tertiary">No agents deployed yet</p>
            ) : (
              <p className="text-xs text-text-tertiary">
                {status === "in_review" ? "No agents under review" : "No agents here"}
              </p>
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

// ── Insights Strip ────────────────────────────────────────────────────────────

interface Insight {
  type: "alert" | "warn" | "info";
  text: string;
  href?: string;
}

function InsightsStrip({ agents }: { agents: Agent[] }) {
  const insights: Insight[] = [];

  const slaBreaches = agents.filter(
    (a) => !["deployed", "rejected", "deprecated"].includes(a.status) && getSlaStatus(a.updatedAt, a.status) === "alert"
  );
  const slaWarns = agents.filter(
    (a) => !["deployed", "rejected", "deprecated"].includes(a.status) && getSlaStatus(a.updatedAt, a.status) === "warn"
  );
  const violations = agents.filter((a) => (a.violationCount ?? 0) > 0);
  const inReview = agents.filter((a) => a.status === "in_review");
  const approved = agents.filter((a) => a.status === "approved");

  if (slaBreaches.length > 0) {
    const names = slaBreaches.slice(0, 2).map(agentDisplayName).join(", ");
    const extra = slaBreaches.length > 2 ? ` +${slaBreaches.length - 2} more` : "";
    insights.push({
      type: "alert",
      text: `${slaBreaches.length} SLA breach${slaBreaches.length > 1 ? "es" : ""} — ${names}${extra}`,
      href: slaBreaches.length === 1 ? `/registry/${slaBreaches[0].agentId}` : undefined,
    });
  }

  if (violations.length > 0) {
    const names = violations.slice(0, 2).map(agentDisplayName).join(", ");
    const extra = violations.length > 2 ? ` +${violations.length - 2} more` : "";
    insights.push({
      type: "warn",
      text: `${violations.length} governance violation${violations.length > 1 ? "s" : ""} — ${names}${extra}`,
      href: violations.length === 1 ? `/registry/${violations[0].agentId}` : undefined,
    });
  }

  if (slaWarns.length > 0 && slaBreaches.length === 0) {
    const names = slaWarns.slice(0, 2).map(agentDisplayName).join(", ");
    const extra = slaWarns.length > 2 ? ` +${slaWarns.length - 2} more` : "";
    insights.push({
      type: "warn",
      text: `${slaWarns.length} nearing SLA deadline — ${names}${extra}`,
      href: slaWarns.length === 1 ? `/registry/${slaWarns[0].agentId}` : undefined,
    });
  }

  if (approved.length > 0) {
    const names = approved.slice(0, 2).map(agentDisplayName).join(", ");
    const extra = approved.length > 2 ? ` +${approved.length - 2} more` : "";
    insights.push({
      type: "info",
      text: `${approved.length} approved and ready to deploy — ${names}${extra}`,
      href: approved.length === 1 ? `/registry/${approved[0].agentId}` : undefined,
    });
  }

  if (inReview.length > 0 && insights.length < 3) {
    const names = inReview.slice(0, 2).map(agentDisplayName).join(", ");
    insights.push({
      type: "info",
      text: `${inReview.length} pending review — ${names}`,
      href: inReview.length === 1 ? `/registry/${inReview[0].agentId}` : undefined,
    });
  }

  if (insights.length === 0) return null;

  const STYLES: Record<Insight["type"], string> = {
    alert: "text-red-600",
    warn:  "text-amber-600",
    info:  "text-text-secondary",
  };
  const DOTS: Record<Insight["type"], string> = {
    alert: "bg-red-400",
    warn:  "bg-amber-400",
    info:  "bg-border",
  };

  return (
    <div className="shrink-0 flex items-center gap-4 border-b border-border bg-surface-raised px-6 py-2">
      <span className="shrink-0 text-2xs font-semibold uppercase tracking-widest text-text-tertiary">
        Insights
      </span>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
        {insights.map((ins, i) => {
          const inner = (
            <>
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOTS[ins.type]}`} />
              {ins.text}
            </>
          );
          return ins.href ? (
            <Link
              key={i}
              href={ins.href}
              className={`flex items-center gap-1.5 text-xs ${STYLES[ins.type]} hover:underline`}
            >
              {inner}
            </Link>
          ) : (
            <span key={i} className={`flex items-center gap-1.5 text-xs ${STYLES[ins.type]}`}>
              {inner}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ── Agent Card ────────────────────────────────────────────────────────────────

function AgentCard({ agent }: { agent: Agent }) {
  const sla = getSlaStatus(agent.updatedAt, agent.status);
  const ctaLabel = CTA_LABELS[agent.status as Status];
  const hiddenTags = agent.tags?.slice(2) ?? [];

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
          <span title={`${agent.violationCount} governance violation${agent.violationCount === 1 ? "" : "s"}`}>
            <ShieldAlert size={13} className="mt-0.5 shrink-0 text-red-400" />
          </span>
        ) : agent.violationCount === 0 ? (
          <span title="Governance passed — no violations">
            <ShieldCheck size={13} className="mt-0.5 shrink-0 text-green-400" />
          </span>
        ) : null}
      </div>

      {/* Tags — first 2 shown, rest in titled +N badge */}
      {agent.tags?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {agent.tags.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="neutral">{tag}</Badge>
          ))}
          {hiddenTags.length > 0 && (
            <Badge variant="muted" title={hiddenTags.join(", ")}>
              +{hiddenTags.length}
            </Badge>
          )}
        </div>
      )}

      {/* Footer: SLA badge + age (color-coded for overdue) */}
      <div className="mt-2.5 flex items-center gap-1.5">
        {sla === "alert" && <Badge variant="danger">SLA breach</Badge>}
        {sla === "warn"  && <Badge variant="warning">Nearing SLA</Badge>}
        <span className={`ml-auto text-xs ${ageClass(agent.updatedAt, agent.status)}`}>
          {timeAgo(agent.updatedAt)}
        </span>
      </div>

      {/* CTA hint — visible when there's a clear next action for this stage */}
      {ctaLabel && (
        <div className="mt-2 border-t border-border/60 pt-1.5">
          <span className="text-2xs font-medium text-primary/80">{ctaLabel} →</span>
        </div>
      )}
    </Link>
  );
}
