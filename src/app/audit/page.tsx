"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { ScrollText, Download, FileText, AlertCircle } from "lucide-react";
import { Heading } from "@/components/catalyst/heading";
import { TableToolbar, Pagination } from "@/components/ui/table-toolbar";
import { EmptyState } from "@/components/ui/empty-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField } from "@/components/ui/form-field";

interface AuditEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actorEmail: string;
  actorRole: string;
  enterpriseId: string | null;
  fromState: unknown;
  toState: unknown;
  metadata: unknown;
  createdAt: string;
}

const ENTITY_TYPES = ["", "blueprint", "intake_session", "policy"] as const;
const ACTION_LABELS: Record<string, string> = {
  "blueprint.created":             "Blueprint created",
  "blueprint.refined":             "Blueprint refined",
  "blueprint.status_changed":      "Status changed",
  "blueprint.reviewed":            "Review submitted",
  "blueprint.report_exported":     "MRM report exported",
  "blueprint.health_checked":      "Health checked",
  "blueprint.cloned":              "Agent cloned",
  "blueprint.approval_step_completed": "Approval step",
  "blueprint.test_run_completed":  "Test run completed",
  "blueprint.agentcore_exported":  "AgentCore exported",
  "blueprint.agentcore_deployed":  "Deployed to AgentCore",
  "intake.finalized":              "Intake finalized",
  "intake.contribution_submitted": "Contribution submitted",
  "policy.created":                "Policy created",
  "policy.updated":                "Policy updated",
  "policy.deleted":                "Policy deleted",
  "policy.simulated":              "Policy simulated",
  "settings.updated":              "Settings updated",
  "blueprint.periodic_review_scheduled": "Periodic review scheduled",
  "blueprint.periodic_review_completed": "Periodic review completed",
};

const ACTION_COLORS: Record<string, string> = {
  "blueprint.created":             "bg-blue-50 text-blue-700",
  "blueprint.refined":             "bg-purple-50 text-purple-700",
  "blueprint.status_changed":      "bg-amber-50 text-amber-700",
  "blueprint.reviewed":            "bg-green-50 text-green-700",
  "blueprint.report_exported":     "bg-teal-50 text-teal-700",
  "blueprint.health_checked":      "bg-cyan-50 text-cyan-700",
  "blueprint.cloned":              "bg-indigo-50 text-indigo-700",
  "blueprint.approval_step_completed": "bg-emerald-50 text-emerald-700",
  "blueprint.test_run_completed":  "bg-violet-50 text-violet-700",
  "blueprint.agentcore_exported":  "bg-orange-50 text-orange-600",
  "blueprint.agentcore_deployed":  "bg-orange-100 text-orange-800",
  "intake.finalized":              "bg-surface-muted text-text-secondary",
  "intake.contribution_submitted": "bg-sky-50 text-sky-700",
  "policy.created":                "bg-red-50 text-red-700",
  "policy.updated":                "bg-orange-50 text-orange-700",
  "policy.deleted":                "bg-rose-100 text-rose-800",
  "policy.simulated":              "bg-yellow-50 text-yellow-700",
  "settings.updated":              "bg-surface-muted text-text-secondary",
  "blueprint.periodic_review_scheduled": "bg-teal-50 text-teal-700",
  "blueprint.periodic_review_completed": "bg-teal-100 text-teal-800",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function exportCsv(entries: AuditEntry[]) {
  const rows = [
    ["Timestamp", "Entity Type", "Entity ID", "Action", "Actor", "Role", "Enterprise ID"],
    ...entries.map((e) => [
      new Date(e.createdAt).toISOString(),
      e.entityType,
      e.entityId,
      e.action,
      e.actorEmail,
      e.actorRole,
      e.enterpriseId ?? "",
    ]),
  ];
  const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function AgentCoreInlineSummary({ metadata }: { metadata: Record<string, unknown> }) {
  const agentId = typeof metadata.agentId === "string" ? metadata.agentId : null;
  const region = typeof metadata.region === "string" ? metadata.region : null;
  const agentArn = typeof metadata.agentArn === "string" ? metadata.agentArn : null;
  if (!agentId && !region) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-3 text-xs text-orange-700">
      {agentId && (
        <span>
          <span className="font-medium">Agent ID:</span>{" "}
          <span className="font-mono">{agentId}</span>
        </span>
      )}
      {region && (
        <span>
          <span className="font-medium">Region:</span>{" "}
          <span className="font-mono">{region}</span>
        </span>
      )}
      {agentArn && (
        <span className="truncate max-w-xs">
          <span className="font-medium">ARN:</span>{" "}
          <span className="font-mono">{agentArn}</span>
        </span>
      )}
    </div>
  );
}

const PAGE_SIZE = 50;

export default function AuditTrailPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [exportingAll, setExportingAll] = useState(false);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [entityType, setEntityType] = useState("");
  const [actorEmail, setActorEmail] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const fetchEntries = useCallback(async (pageOverride?: number) => {
    const activePage = pageOverride ?? page;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (entityType) params.set("entityType", entityType);
      if (actorEmail.trim()) params.set("actorEmail", actorEmail.trim());
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(activePage * PAGE_SIZE));

      const res = await fetch(`/api/audit?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message ?? "Failed to fetch audit log");
      }
      const data = await res.json();
      setEntries(data.entries ?? []);
      setTotal(data.total ?? 0);
      setLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch audit log");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, actorEmail, from, to, page]);

  // ── Export ALL rows (paginates to overcome 100-row API cap) ─────────────────
  async function exportAllCsv() {
    setExportingAll(true);
    try {
      const EXPORT_BATCH = 100;
      const all: AuditEntry[] = [];
      let offset = 0;
      let fetchedTotal = total;
      do {
        const params = new URLSearchParams();
        if (entityType) params.set("entityType", entityType);
        if (actorEmail.trim()) params.set("actorEmail", actorEmail.trim());
        if (from) params.set("from", from);
        if (to) params.set("to", to);
        params.set("limit", String(EXPORT_BATCH));
        params.set("offset", String(offset));
        const res = await fetch(`/api/audit?${params.toString()}`);
        const data = await res.json();
        all.push(...(data.entries ?? []));
        fetchedTotal = data.total ?? fetchedTotal;
        offset += EXPORT_BATCH;
      } while (offset < fetchedTotal);
      exportCsv(all);
    } catch {
      // fall back to exporting current page only
      exportCsv(entries);
    } finally {
      setExportingAll(false);
    }
  }

  return (
    <div className="px-6 py-6 space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <ScrollText size={20} className="text-violet-600" />
            <Heading level={1}>Audit Trail</Heading>
          </div>
          <p className="mt-0.5 text-sm text-text-secondary">Complete audit trail of platform activity</p>
        </div>
        {loaded && total > 0 && (
          <button
            onClick={exportAllCsv}
            disabled={exportingAll}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-text-secondary hover:border-border-strong hover:text-text transition-colors disabled:opacity-60"
          >
            <Download size={13} />
            {exportingAll
              ? "Exporting…"
              : `Export CSV (${total.toLocaleString()} row${total === 1 ? "" : "s"})`}
          </button>
        )}
      </div>

      <div className="space-y-4">
        {/* Quick search toolbar */}
        <div className="mb-2">
          <TableToolbar
            searchPlaceholder="Quick search action or entity ID…"
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            resultCount={loaded && entries.length > 0 ? entries.length : undefined}
            resultLabel="event"
          />
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap gap-3 rounded-card border border-border bg-surface px-5 py-4">
          <div className="flex flex-1 min-w-40 flex-col gap-1">
            <FormField label="Entity Type" htmlFor="entity-type">
              <Select
                value={entityType || "_all_"}
                onValueChange={(v) => setEntityType(v === "_all_" ? "" : v)}
              >
                <SelectTrigger id="entity-type" className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all_">All types</SelectItem>
                  {ENTITY_TYPES.filter(Boolean).map((t) => (
                    <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>

          <div className="flex flex-1 min-w-48 flex-col gap-1">
            <FormField label="Actor Email" htmlFor="actor-email">
              <input
                id="actor-email"
                type="text"
                value={actorEmail}
                onChange={(e) => setActorEmail(e.target.value)}
                placeholder="user@example.com"
                className="rounded-lg border border-border px-3 py-1.5 text-sm placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-text"
              />
            </FormField>
          </div>

          <div className="flex flex-1 min-w-36 flex-col gap-1">
            <FormField label="From" htmlFor="date-from">
              <input
                id="date-from"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="rounded-lg border border-border px-3 py-1.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-text"
              />
            </FormField>
          </div>

          <div className="flex flex-1 min-w-36 flex-col gap-1">
            <FormField label="To" htmlFor="date-to">
              <input
                id="date-to"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="rounded-lg border border-border px-3 py-1.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-text"
              />
            </FormField>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => { setPage(0); fetchEntries(0); }}
              disabled={loading}
              className="rounded-lg bg-text px-5 py-1.5 text-sm font-medium text-white hover:bg-text-secondary disabled:opacity-50 transition-colors"
            >
              {loading ? "Loading…" : loaded ? "Refresh" : "Load Log"}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Empty state before first load */}
        {!loaded && !loading && !error && (
          <EmptyState
            icon={FileText}
            heading="No filters applied"
            subtext="Apply filters and click Load Log to view audit events."
          />
        )}

        {/* Results */}
        {loaded && entries.length === 0 && (
          <EmptyState
            icon={AlertCircle}
            heading="No audit events found"
            subtext="No audit events match your filters."
          />
        )}

        {loaded && entries.length > 0 && (
          <div className="overflow-hidden rounded-card border border-border bg-surface">
            {/* Result count */}
            <div className="border-b border-border-subtle px-5 py-2.5 text-xs text-text-tertiary">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total} event{total === 1 ? "" : "s"} — sorted newest first
            </div>

            <div className="divide-y divide-border-subtle">
              {entries.map((entry) => {
                const isExpanded = expanded === entry.id;
                const actionLabel = ACTION_LABELS[entry.action] ?? entry.action;
                const actionColor = ACTION_COLORS[entry.action] ?? "bg-surface-muted text-text-secondary";

                return (
                  <div key={entry.id} className="px-5 py-3">
                    <div className="flex items-start gap-4">
                      {/* Timestamp */}
                      <span className="shrink-0 w-32 text-xs text-text-tertiary pt-0.5">
                        {formatDate(entry.createdAt)}
                      </span>

                      {/* Action badge */}
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${actionColor}`}
                      >
                        {actionLabel}
                      </span>

                      {/* Entity */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-text-secondary capitalize">
                            {entry.entityType.replace("_", " ")}
                          </span>
                          <span className="font-mono text-xs text-text-tertiary">
                            {entry.entityId.slice(0, 8)}
                          </span>
                        </div>
                        <div className="mt-0.5 text-xs text-text-secondary">
                          <span className="font-medium">{entry.actorEmail}</span>
                          {" "}
                          <span className="text-text-tertiary">({entry.actorRole})</span>
                        </div>
                      </div>

                      {/* State change */}
                      {(!!entry.fromState || !!entry.toState) ? (
                        <div className="shrink-0 flex items-center gap-2 text-xs text-text-tertiary">
                          {!!entry.fromState && (
                            <span className="rounded bg-surface-muted px-1.5 py-0.5 font-mono">
                              {JSON.stringify(entry.fromState).slice(0, 30)}
                            </span>
                          )}
                          {!!entry.fromState && !!entry.toState && <span>→</span>}
                          {!!entry.toState && (
                            <span className="rounded bg-surface-muted px-1.5 py-0.5 font-mono">
                              {JSON.stringify(entry.toState).slice(0, 30)}
                            </span>
                          )}
                        </div>
                      ) : null}

                      {/* Expand button */}
                      {!!entry.metadata && (
                        <button
                          onClick={() => setExpanded(isExpanded ? null : entry.id)}
                          className="shrink-0 text-xs text-text-tertiary hover:text-text"
                        >
                          {isExpanded ? "▲" : "▼"}
                        </button>
                      )}
                    </div>

                    {/* AgentCore inline summary — shown without expanding */}
                    {(entry.action === "blueprint.agentcore_deployed" ||
                      entry.action === "blueprint.agentcore_exported") &&
                      !!entry.metadata && <AgentCoreInlineSummary metadata={entry.metadata as Record<string, unknown>} />}

                    {/* Expanded metadata */}
                    {isExpanded && !!entry.metadata && (
                      <div className="mt-3 rounded-lg bg-surface-raised border border-border p-3">
                        <p className="mb-1 text-xs font-medium text-text-secondary">Metadata</p>
                        <pre className="text-xs text-text whitespace-pre-wrap">
                          {JSON.stringify(entry.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Pagination controls */}
            {total > PAGE_SIZE && (
              <div className="flex items-center justify-between border-t border-border-subtle px-5 py-3">
                <span className="text-xs text-text-tertiary">
                  Page {page + 1} of {Math.ceil(total / PAGE_SIZE)}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={page === 0 || loading}
                    onClick={() => {
                      const prev = page - 1;
                      setPage(prev);
                      fetchEntries(prev);
                    }}
                    className="rounded-lg border border-border px-3 py-1 text-xs text-text-secondary hover:border-border-strong disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    ← Previous
                  </button>
                  <button
                    disabled={(page + 1) * PAGE_SIZE >= total || loading}
                    onClick={() => {
                      const next = page + 1;
                      setPage(next);
                      fetchEntries(next);
                    }}
                    className="rounded-lg border border-border px-3 py-1 text-xs text-text-secondary hover:border-border-strong disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
