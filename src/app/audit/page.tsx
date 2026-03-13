"use client";

import { useState, useCallback } from "react";
import Link from "next/link";

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
  "intake.finalized":              "Intake finalized",
  "intake.contribution_submitted": "Contribution submitted",
  "policy.created":                "Policy created",
  "policy.updated":                "Policy updated",
  "policy.deleted":                "Policy deleted",
};

const ACTION_COLORS: Record<string, string> = {
  "blueprint.created":             "bg-blue-50 text-blue-700",
  "blueprint.refined":             "bg-purple-50 text-purple-700",
  "blueprint.status_changed":      "bg-amber-50 text-amber-700",
  "blueprint.reviewed":            "bg-green-50 text-green-700",
  "blueprint.report_exported":     "bg-teal-50 text-teal-700",
  "intake.finalized":              "bg-gray-100 text-gray-600",
  "intake.contribution_submitted": "bg-sky-50 text-sky-700",
  "policy.created":                "bg-red-50 text-red-700",
  "policy.updated":                "bg-orange-50 text-orange-700",
  "policy.deleted":                "bg-rose-100 text-rose-800",
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

export default function AuditTrailPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Filter state
  const [entityType, setEntityType] = useState("");
  const [actorEmail, setActorEmail] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (entityType) params.set("entityType", entityType);
      if (actorEmail.trim()) params.set("actorEmail", actorEmail.trim());
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const res = await fetch(`/api/audit?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to fetch audit log");
      }
      const data = await res.json();
      setEntries(data.entries ?? []);
      setLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch audit log");
    } finally {
      setLoading(false);
    }
  }, [entityType, actorEmail, from, to]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Audit Trail</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              Immutable record of all platform actions. Records cannot be edited or deleted.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {entries.length > 0 && (
              <button
                onClick={() => exportCsv(entries)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:border-gray-400 hover:text-gray-900 transition-colors"
              >
                Export CSV ({entries.length})
              </button>
            )}
            <Link
              href="/governance"
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:border-gray-400 hover:text-gray-900 transition-colors"
            >
              ← Governance Hub
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-6 space-y-4">
        {/* Filter bar */}
        <div className="flex flex-wrap gap-3 rounded-xl border border-gray-200 bg-white px-5 py-4">
          <div className="flex flex-1 min-w-40 flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">Entity Type</label>
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="">All types</option>
              {ENTITY_TYPES.filter(Boolean).map((t) => (
                <option key={t} value={t}>
                  {t.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-1 min-w-48 flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">Actor Email</label>
            <input
              type="text"
              value={actorEmail}
              onChange={(e) => setActorEmail(e.target.value)}
              placeholder="user@example.com"
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          <div className="flex flex-1 min-w-36 flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          <div className="flex flex-1 min-w-36 flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={fetchEntries}
              disabled={loading}
              className="rounded-lg bg-gray-900 px-5 py-1.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 transition-colors"
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
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
            <p className="text-sm text-gray-400">Apply filters and click Load Log to view audit events.</p>
          </div>
        )}

        {/* Results */}
        {loaded && entries.length === 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-10 text-center">
            <p className="text-sm text-gray-400">No audit events match your filters.</p>
          </div>
        )}

        {loaded && entries.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            {/* Result count */}
            <div className="border-b border-gray-100 px-5 py-2.5 text-xs text-gray-400">
              {entries.length} event{entries.length === 1 ? "" : "s"} — sorted newest first
            </div>

            <div className="divide-y divide-gray-100">
              {entries.map((entry) => {
                const isExpanded = expanded === entry.id;
                const actionLabel = ACTION_LABELS[entry.action] ?? entry.action;
                const actionColor = ACTION_COLORS[entry.action] ?? "bg-gray-100 text-gray-600";

                return (
                  <div key={entry.id} className="px-5 py-3">
                    <div className="flex items-start gap-4">
                      {/* Timestamp */}
                      <span className="shrink-0 w-32 text-xs text-gray-400 pt-0.5">
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
                          <span className="text-xs text-gray-500 capitalize">
                            {entry.entityType.replace("_", " ")}
                          </span>
                          <span className="font-mono text-xs text-gray-400">
                            {entry.entityId.slice(0, 8)}
                          </span>
                        </div>
                        <div className="mt-0.5 text-xs text-gray-600">
                          <span className="font-medium">{entry.actorEmail}</span>
                          {" "}
                          <span className="text-gray-400">({entry.actorRole})</span>
                        </div>
                      </div>

                      {/* State change */}
                      {(!!entry.fromState || !!entry.toState) ? (
                        <div className="shrink-0 flex items-center gap-2 text-xs text-gray-400">
                          {!!entry.fromState && (
                            <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono">
                              {JSON.stringify(entry.fromState).slice(0, 30)}
                            </span>
                          )}
                          {!!entry.fromState && !!entry.toState && <span>→</span>}
                          {!!entry.toState && (
                            <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono">
                              {JSON.stringify(entry.toState).slice(0, 30)}
                            </span>
                          )}
                        </div>
                      ) : null}

                      {/* Expand button */}
                      {!!entry.metadata && (
                        <button
                          onClick={() => setExpanded(isExpanded ? null : entry.id)}
                          className="shrink-0 text-xs text-gray-400 hover:text-gray-700"
                        >
                          {isExpanded ? "▲" : "▼"}
                        </button>
                      )}
                    </div>

                    {/* Expanded metadata */}
                    {isExpanded && !!entry.metadata && (
                      <div className="mt-3 rounded-lg bg-gray-50 border border-gray-200 p-3">
                        <p className="mb-1 text-xs font-medium text-gray-500">Metadata</p>
                        <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                          {JSON.stringify(entry.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
