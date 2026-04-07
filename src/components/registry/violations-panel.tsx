"use client";

/**
 * ViolationsPanel — H2-1.3.
 *
 * Displays runtime governance violations for a deployed agent.
 * Violations are detected by evaluateRuntimePolicies() on each telemetry push
 * and stored in the runtimeViolations table.
 *
 * Features:
 *   - Severity filter (All / Errors / Warnings)
 *   - Time range filter (Last 24h / 7d / 30d)
 *   - Violation list with severity badge, policy name, metric detail, timestamp
 *   - Empty state with explanation
 */

import { useState, useEffect, useCallback } from "react";
import { CheckCircle2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ViolationRow {
  id: string;
  agentId: string;
  enterpriseId: string | null;
  policyId: string;
  policyName: string;
  ruleId: string;
  severity: string;
  metric: string;
  observedValue: number;
  threshold: number;
  message: string;
  telemetryTimestamp: string;
  detectedAt: string;
}

interface ViolationsPanelProps {
  agentId: string;
}

type SeverityFilter = "all" | "error" | "warning";
type TimeRange = "1d" | "7d" | "30d";

const TIME_RANGE_OPTIONS: { value: TimeRange; label: string; ms: number }[] = [
  { value: "1d",  label: "Last 24h",  ms: 86_400_000 },
  { value: "7d",  label: "Last 7 days", ms: 7 * 86_400_000 },
  { value: "30d", label: "Last 30 days", ms: 30 * 86_400_000 },
];

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 2) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMs / 3_600_000);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffMs / 86_400_000);
  return `${diffDays}d ago`;
}

function formatMetricName(metric: string): string {
  switch (metric) {
    case "tokens_daily":               return "Daily token usage";
    case "avg_tokens_per_interaction": return "Avg tokens / interaction";
    case "error_rate":                 return "Error rate";
    case "out_of_scope_tools":         return "Out-of-scope tools";
    default:                           return metric.replace(/_/g, " ");
  }
}

function formatObservedValue(metric: string, value: number): string {
  if (metric === "error_rate")        return `${(value * 100).toFixed(1)}%`;
  if (metric === "out_of_scope_tools") return `${value} tool${value !== 1 ? "s" : ""}`;
  return value.toLocaleString();
}

function formatThreshold(metric: string, value: number): string {
  if (metric === "error_rate") return `${(value * 100).toFixed(1)}%`;
  return value.toLocaleString();
}

// ── Daily-bucket sparkline ────────────────────────────────────────────────────

function ViolationsSparkline({ violations, days }: { violations: ViolationRow[]; days: number }) {
  // Build bucket array of length `days`, each counting violations on that calendar day
  const buckets = Array.from({ length: days }, (_, i) => {
    const bucketStart = new Date(Date.now() - (days - 1 - i) * 86_400_000);
    const dateStr = bucketStart.toISOString().slice(0, 10); // YYYY-MM-DD
    return violations.filter((v) => v.detectedAt.slice(0, 10) === dateStr).length;
  });

  const maxCount = Math.max(...buckets, 1);

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-raised p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold text-text-secondary">
          Violations — last {days} days
        </p>
        <p className="text-xs text-text-tertiary">
          {violations.length} total
        </p>
      </div>
      <div className="flex items-end gap-px h-8">
        {buckets.map((count, i) => {
          const heightPct = count === 0 ? 0 : Math.max(8, Math.round((count / maxCount) * 100));
          const color = count === 0 ? "bg-text-disabled" : count === maxCount && count > 0 ? "bg-red-400" : "bg-orange-300";
          const dateLabel = new Date(Date.now() - (days - 1 - i) * 86_400_000).toLocaleDateString(undefined, { month: "short", day: "numeric" });
          return (
            <div
              key={i}
              title={`${dateLabel}: ${count} violation${count !== 1 ? "s" : ""}`}
              className={`flex-1 rounded-sm ${color} transition-all`}
              style={{ height: count === 0 ? "4px" : `${heightPct}%` }}
            />
          );
        })}
      </div>
      {maxCount > 0 && (
        <div className="mt-1.5 flex justify-between text-2xs text-text-tertiary">
          <span>{new Date(Date.now() - (days - 1) * 86_400_000).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
          <span>Today</span>
        </div>
      )}
    </div>
  );
}

export function ViolationsPanel({ agentId }: ViolationsPanelProps) {
  const [violations, setViolations] = useState<ViolationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");

  // P1-31: Per-row acknowledgement — client-side only, stored in localStorage.
  // No DB migration needed; acknowledged state is per-browser and per-agent.
  const ACK_KEY = `violations-ack-${agentId}`;
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(`violations-ack-${agentId}`);
      return raw ? new Set<string>(JSON.parse(raw) as string[]) : new Set<string>();
    } catch { return new Set<string>(); }
  });

  const toggleAck = useCallback((id: string) => {
    setAcknowledgedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      try { localStorage.setItem(ACK_KEY, JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  }, [ACK_KEY]);

  useEffect(() => {
    setLoading(true);
    const rangeMs = TIME_RANGE_OPTIONS.find((t) => t.value === timeRange)?.ms ?? 7 * 86_400_000;
    const since = new Date(Date.now() - rangeMs).toISOString();
    const severityParam = severityFilter !== "all" ? `&severity=${severityFilter}` : "";

    fetch(`/api/registry/${agentId}/violations?since=${since}&limit=100${severityParam}`)
      .then((r) => r.json())
      .then((data) => setViolations(data.violations ?? []))
      .catch(() => setViolations([]))
      .finally(() => setLoading(false));
  }, [agentId, severityFilter, timeRange]);

  const errorCount   = violations.filter((v) => v.severity === "error").length;
  const warningCount = violations.filter((v) => v.severity === "warning").length;

  // P2-447: Export violations as CSV — pure client-side, no new deps
  function exportCsv() {
    const header = ["id", "severity", "policyName", "ruleId", "metric", "observedValue", "threshold", "message", "detectedAt"].join(",");
    const rows = violations.map((v) =>
      [
        v.id,
        v.severity,
        `"${v.policyName.replace(/"/g, '""')}"`,
        v.ruleId,
        v.metric,
        v.observedValue,
        v.threshold,
        `"${v.message.replace(/"/g, '""')}"`,
        v.detectedAt,
      ].join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `violations-${agentId.slice(0, 8)}-${timeRange}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-text">Runtime Violations</h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Policy breaches detected from live telemetry
          </p>
        </div>

        {/* Summary chips */}
        {!loading && violations.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {errorCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 dark:bg-red-950/30 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                {errorCount} error{errorCount !== 1 ? "s" : ""}
              </span>
            )}
            {warningCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/30 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                {warningCount} warning{warningCount !== 1 ? "s" : ""}
              </span>
            )}
            {acknowledgedIds.size > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 dark:bg-emerald-950/30 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:text-emerald-300 border border-green-200 dark:border-emerald-800">
                <CheckCircle2 className="h-3 w-3" />
                {acknowledgedIds.size} acknowledged
              </span>
            )}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Severity filter */}
        <div className="flex rounded-md border border-border overflow-hidden text-xs">
          {(["all", "error", "warning"] as SeverityFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setSeverityFilter(s)}
              className={`px-3 py-1.5 font-medium capitalize transition-colors ${
                severityFilter === s
                  ? "bg-text text-white"
                  : "bg-surface text-text-secondary hover:bg-surface-raised"
              }`}
            >
              {s === "all" ? "All" : s === "error" ? "Errors" : "Warnings"}
            </button>
          ))}
        </div>

        {/* Time range */}
        <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
          <SelectTrigger className="text-xs h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIME_RANGE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* CSV export — only when there's data to export */}
        {!loading && violations.length > 0 && (
          <button
            onClick={exportCsv}
            title={`Export ${violations.length} violation${violations.length !== 1 ? "s" : ""} as CSV`}
            className="ml-auto flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary hover:border-border hover:text-text transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export CSV
          </button>
        )}
      </div>

      {/* Trend sparkline — shown for 7d / 30d ranges when violations exist */}
      {!loading && violations.length > 0 && timeRange !== "1d" && (
        <ViolationsSparkline
          violations={violations}
          days={timeRange === "7d" ? 7 : 30}
        />
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-text" />
          <span className="ml-3 text-sm text-text-secondary">Loading violations…</span>
        </div>
      ) : violations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface-raised py-14 text-center">
          <div className="text-3xl mb-3">✅</div>
          <p className="text-sm font-medium text-text">No violations detected</p>
          <p className="mt-1 text-xs text-text-secondary max-w-xs mx-auto">
            {severityFilter !== "all"
              ? `No ${severityFilter} violations in the selected time range.`
              : "No runtime policy violations in the selected time range. Runtime policies are evaluated automatically on each telemetry push."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {violations.map((v) => {
            const isAcked = acknowledgedIds.has(v.id);
            return (
            <div
              key={v.id}
              className={`rounded-lg border p-4 transition-opacity ${
                isAcked
                  ? "border-green-200 dark:border-emerald-800 bg-green-50 dark:bg-emerald-950/30 opacity-60"
                  : v.severity === "error"
                  ? "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30"
                  : "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* Row 1: severity + policy name + ack badge */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {isAcked ? (
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-bold uppercase tracking-wide bg-green-100 dark:bg-emerald-900/40 text-green-700 dark:text-emerald-300">
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        acknowledged
                      </span>
                    ) : (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-bold uppercase tracking-wide ${
                          v.severity === "error"
                            ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"
                            : "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            v.severity === "error" ? "bg-red-500" : "bg-amber-500"
                          }`}
                        />
                        {v.severity}
                      </span>
                    )}
                    <span className={`text-xs font-semibold truncate ${isAcked ? "text-text-secondary" : "text-text"}`}>
                      {v.policyName}
                    </span>
                  </div>

                  {/* Row 2: violation message */}
                  <p className={`mt-1 text-sm ${isAcked ? "text-text-secondary line-through" : "text-text"}`}>{v.message}</p>

                  {/* Row 3: metric detail */}
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-text-secondary">
                    <span>
                      <span className="font-medium text-text">Metric:</span>{" "}
                      {formatMetricName(v.metric)}
                    </span>
                    <span>
                      <span className="font-medium text-text">Observed:</span>{" "}
                      <span
                        className={
                          isAcked ? "text-text-secondary" : v.severity === "error" ? "text-red-700 dark:text-red-300 font-semibold" : "text-amber-700 dark:text-amber-300 font-semibold"
                        }
                      >
                        {formatObservedValue(v.metric, v.observedValue)}
                      </span>
                    </span>
                    <span>
                      <span className="font-medium text-text">Threshold:</span>{" "}
                      {formatThreshold(v.metric, v.threshold)}
                    </span>
                    <span>
                      <span className="font-medium text-text">Rule:</span>{" "}
                      <code className="font-mono">{v.ruleId}</code>
                    </span>
                  </div>
                </div>

                {/* Timestamp + Acknowledge button */}
                <div className="text-right shrink-0 flex flex-col items-end gap-2">
                  <div>
                    <p className="text-2xs text-text-tertiary">{timeAgo(v.detectedAt)}</p>
                    <p className="text-2xs text-text-tertiary mt-0.5">
                      {new Date(v.detectedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleAck(v.id)}
                    className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-2xs font-medium transition-colors ${
                      isAcked
                        ? "border-green-200 dark:border-emerald-800 bg-surface text-green-700 dark:text-emerald-300 hover:bg-red-50 dark:hover:bg-red-950/30 hover:border-red-200 dark:hover:border-red-800 hover:text-red-600 dark:text-red-400"
                        : "border-border bg-surface text-text-secondary hover:border-green-300 dark:hover:border-emerald-700 hover:text-green-700 dark:hover:text-emerald-300"
                    }`}
                    title={isAcked ? "Un-acknowledge" : "Acknowledge — mark as known/accepted"}
                  >
                    <CheckCircle2 className="h-2.5 w-2.5" />
                    {isAcked ? "Undo" : "Acknowledge"}
                  </button>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
