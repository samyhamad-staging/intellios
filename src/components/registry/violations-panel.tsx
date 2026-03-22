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

import { useState, useEffect } from "react";

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

export function ViolationsPanel({ agentId }: ViolationsPanelProps) {
  const [violations, setViolations] = useState<ViolationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");

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

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Runtime Violations</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Policy breaches detected from live telemetry
          </p>
        </div>

        {/* Summary chips */}
        {!loading && violations.length > 0 && (
          <div className="flex items-center gap-2">
            {errorCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 border border-red-200">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                {errorCount} error{errorCount !== 1 ? "s" : ""}
              </span>
            )}
            {warningCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                {warningCount} warning{warningCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Severity filter */}
        <div className="flex rounded-md border border-gray-200 overflow-hidden text-xs">
          {(["all", "error", "warning"] as SeverityFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setSeverityFilter(s)}
              className={`px-3 py-1.5 font-medium capitalize transition-colors ${
                severityFilter === s
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {s === "all" ? "All" : s === "error" ? "Errors" : "Warnings"}
            </button>
          ))}
        </div>

        {/* Time range */}
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as TimeRange)}
          className="text-xs rounded-md border border-gray-200 bg-white px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-400"
        >
          {TIME_RANGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700" />
          <span className="ml-3 text-sm text-gray-500">Loading violations…</span>
        </div>
      ) : violations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 py-14 text-center">
          <div className="text-3xl mb-3">✅</div>
          <p className="text-sm font-medium text-gray-700">No violations detected</p>
          <p className="mt-1 text-xs text-gray-500 max-w-xs mx-auto">
            {severityFilter !== "all"
              ? `No ${severityFilter} violations in the selected time range.`
              : "No runtime policy violations in the selected time range. Runtime policies are evaluated automatically on each telemetry push."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {violations.map((v) => (
            <div
              key={v.id}
              className={`rounded-lg border p-4 ${
                v.severity === "error"
                  ? "border-red-200 bg-red-50"
                  : "border-amber-200 bg-amber-50"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* Row 1: severity + policy name */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        v.severity === "error"
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          v.severity === "error" ? "bg-red-500" : "bg-amber-500"
                        }`}
                      />
                      {v.severity}
                    </span>
                    <span className="text-xs font-semibold text-gray-800 truncate">
                      {v.policyName}
                    </span>
                  </div>

                  {/* Row 2: violation message */}
                  <p className="mt-1 text-sm text-gray-700">{v.message}</p>

                  {/* Row 3: metric detail */}
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                    <span>
                      <span className="font-medium text-gray-700">Metric:</span>{" "}
                      {formatMetricName(v.metric)}
                    </span>
                    <span>
                      <span className="font-medium text-gray-700">Observed:</span>{" "}
                      <span
                        className={
                          v.severity === "error" ? "text-red-700 font-semibold" : "text-amber-700 font-semibold"
                        }
                      >
                        {formatObservedValue(v.metric, v.observedValue)}
                      </span>
                    </span>
                    <span>
                      <span className="font-medium text-gray-700">Threshold:</span>{" "}
                      {formatThreshold(v.metric, v.threshold)}
                    </span>
                    <span>
                      <span className="font-medium text-gray-700">Rule:</span>{" "}
                      <code className="font-mono">{v.ruleId}</code>
                    </span>
                  </div>
                </div>

                {/* Timestamp */}
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-gray-400">{timeAgo(v.detectedAt)}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {new Date(v.detectedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
