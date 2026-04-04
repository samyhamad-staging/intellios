"use client";

/**
 * ProductionDashboard — displays telemetry data for a deployed agent.
 *
 * Shows KPI cards (invocations, error rate, latency, tokens), a health badge,
 * a simple div-based bar chart for daily invocations + errors, a "last seen"
 * timestamp, and an Alert Thresholds management section (H1-1.5).
 *
 * Empty state shown when no data exists — instructs the user to configure
 * their agent to push metrics to the Intellios telemetry API.
 */

import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TelemetryRow {
  id: string;
  agentId: string;
  timestamp: string;
  invocations: number;
  errors: number;
  latencyP50Ms: number | null;
  latencyP99Ms: number | null;
  tokensIn: number;
  tokensOut: number;
  policyViolations: number;
  source: string;
  createdAt: string;
}

interface AlertThreshold {
  id: string;
  metric: string;
  operator: string;
  value: number;
  windowMinutes: number;
  enabled: boolean;
}

interface ProductionDashboardProps {
  agentId: string;
  data: TelemetryRow[] | null;
  loading: boolean;
  canManageAlerts?: boolean;
}

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

function computeHealth(data: TelemetryRow[]): {
  label: string;
  color: string;
  bg: string;
} {
  if (data.length === 0)
    return { label: "Unknown", color: "text-gray-500", bg: "bg-gray-100" };

  const now = Date.now();
  const last24h = data.filter(
    (r) => now - new Date(r.timestamp).getTime() < 24 * 3_600_000
  );
  const last6h = data.filter(
    (r) => now - new Date(r.timestamp).getTime() < 6 * 3_600_000
  );

  const totalInv24h = last24h.reduce((s, r) => s + r.invocations, 0);
  const totalErr24h = last24h.reduce((s, r) => s + r.errors, 0);
  const errorRate = totalInv24h > 0 ? totalErr24h / totalInv24h : 0;

  const hasRecentData = last6h.some((r) => r.invocations > 0);

  if (!hasRecentData && last6h.length > 0)
    return { label: "Offline", color: "text-gray-600", bg: "bg-gray-100" };
  if (errorRate > 0.2)
    return { label: "Degraded", color: "text-amber-700", bg: "bg-amber-100" };
  if (errorRate > 0.05)
    return { label: "Degraded", color: "text-amber-700", bg: "bg-amber-100" };

  return { label: "Healthy", color: "text-green-700", bg: "bg-green-100" };
}

function groupByDay(data: TelemetryRow[]): Array<{
  day: string;
  invocations: number;
  errors: number;
}> {
  const map = new Map<string, { invocations: number; errors: number }>();

  for (const row of data) {
    const day = new Date(row.timestamp).toISOString().slice(0, 10);
    const existing = map.get(day) ?? { invocations: 0, errors: 0 };
    map.set(day, {
      invocations: existing.invocations + row.invocations,
      errors: existing.errors + row.errors,
    });
  }

  return Array.from(map.entries())
    .map(([day, vals]) => ({ day, ...vals }))
    .sort((a, b) => a.day.localeCompare(b.day))
    .slice(-7); // last 7 days
}

// ── Alert Thresholds panel ─────────────────────────────────────────────────────

const METRIC_LABELS: Record<string, string> = {
  error_rate:        "Error rate",
  latency_p99:       "P99 latency (ms)",
  zero_invocations:  "Zero invocations",
  policy_violations: "Policy violations",
};

const OPERATOR_LABELS: Record<string, string> = {
  gt: ">",
  lt: "<",
  eq: "=",
};

function AlertThresholdsPanel({ agentId, canManage }: { agentId: string; canManage: boolean }) {
  const [thresholds, setThresholds] = useState<AlertThreshold[]>([]);
  const [tLoading, setTLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    metric: "error_rate",
    operator: "gt",
    value: "",
    windowMinutes: "60",
  });

  useEffect(() => {
    fetch(`/api/registry/${agentId}/alerts`)
      .then((r) => r.json())
      .then((d) => setThresholds(d.thresholds ?? []))
      .catch(() => {})
      .finally(() => setTLoading(false));
  }, [agentId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/registry/${agentId}/alerts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metric: form.metric,
          operator: form.operator,
          value: Number(form.value),
          windowMinutes: Number(form.windowMinutes),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setThresholds((prev) => [data.threshold, ...prev]);
        setAdding(false);
        setForm({ metric: "error_rate", operator: "gt", value: "", windowMinutes: "60" });
      }
    } finally {
      setSaving(false);
    }
  }

  if (tLoading) {
    return <div className="h-16 rounded-xl bg-gray-100 animate-pulse" />;
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          Alert Thresholds
        </p>
        {canManage && !adding && (
          <button
            onClick={() => setAdding(true)}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
          >
            + Add
          </button>
        )}
      </div>

      {thresholds.length === 0 && !adding && (
        <p className="text-xs text-gray-400">No thresholds configured.</p>
      )}

      {thresholds.map((t) => (
        <div key={t.id} className="flex items-center gap-3 text-xs">
          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${t.enabled ? "bg-green-500" : "bg-gray-300"}`} />
          <span className="font-medium text-gray-700">{METRIC_LABELS[t.metric] ?? t.metric}</span>
          <span className="text-gray-400">{OPERATOR_LABELS[t.operator] ?? t.operator} {t.value}</span>
          <span className="text-gray-400">/ {t.windowMinutes}m window</span>
        </div>
      ))}

      {adding && (
        <form onSubmit={handleCreate} className="space-y-3 border-t border-gray-100 pt-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500">Metric</label>
              <Select value={form.metric} onValueChange={(v) => setForm((f) => ({ ...f, metric: v }))}>
                <SelectTrigger className="mt-0.5 w-full text-xs h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(METRIC_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Operator</label>
              <Select value={form.operator} onValueChange={(v) => setForm((f) => ({ ...f, operator: v }))}>
                <SelectTrigger className="mt-0.5 w-full text-xs h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gt">&gt; (greater than)</SelectItem>
                  <SelectItem value="lt">&lt; (less than)</SelectItem>
                  <SelectItem value="eq">= (equal)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Value</label>
              <input
                type="number"
                step="any"
                required
                value={form.value}
                onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                className="mt-0.5 w-full rounded border border-gray-200 px-2 py-1.5 text-xs"
                placeholder="e.g. 0.05"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Window (minutes)</label>
              <input
                type="number"
                min={1}
                required
                value={form.windowMinutes}
                onChange={(e) => setForm((f) => ({ ...f, windowMinutes: e.target.value }))}
                className="mt-0.5 w-full rounded border border-gray-200 px-2 py-1.5 text-xs"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export function ProductionDashboard({ agentId, data, loading, canManageAlerts = false }: ProductionDashboardProps) {
  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="p-6 max-w-xl space-y-6">
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-200">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.5a9 9 0 1 1 18 0M12 9v4" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700">No production telemetry yet</p>
          <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
            Configure your deployed agent to push metrics to{" "}
            <code className="rounded bg-gray-200 px-1 py-0.5 font-mono text-xs">
              POST /api/telemetry/ingest
            </code>{" "}
            with your <span className="font-medium">TELEMETRY_API_KEY</span>. Data appears here within minutes.
          </p>
        </div>
        <AlertThresholdsPanel agentId={agentId} canManage={canManageAlerts} />
      </div>
    );
  }

  const health = computeHealth(data);
  const sorted = [...data].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  const lastSeen = sorted[0]?.timestamp ?? null;

  // 7-day aggregates for KPIs
  const now = Date.now();
  const last7d = data.filter(
    (r) => now - new Date(r.timestamp).getTime() < 7 * 86_400_000
  );
  const totalInv = last7d.reduce((s, r) => s + r.invocations, 0);
  const totalErr = last7d.reduce((s, r) => s + r.errors, 0);
  const errorRate = totalInv > 0 ? (totalErr / totalInv) * 100 : 0;
  const totalTokens = last7d.reduce((s, r) => s + r.tokensIn + r.tokensOut, 0);

  // Median of available p50/p99 latencies
  const p50s = last7d.map((r) => r.latencyP50Ms).filter((v): v is number => v !== null);
  const p99s = last7d.map((r) => r.latencyP99Ms).filter((v): v is number => v !== null);
  const medianP50 =
    p50s.length > 0 ? Math.round(p50s.reduce((a, b) => a + b, 0) / p50s.length) : null;
  const medianP99 =
    p99s.length > 0 ? Math.round(p99s.reduce((a, b) => a + b, 0) / p99s.length) : null;

  const dailyData = groupByDay(data);
  const maxInv = Math.max(...dailyData.map((d) => d.invocations), 1);

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {/* Health badge + last seen */}
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${health.bg} ${health.color}`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              health.label === "Healthy" ? "bg-green-500" : health.label === "Degraded" ? "bg-amber-500" : "bg-gray-400"
            }`}
          />
          {health.label}
        </span>
        {lastSeen && (
          <span className="text-xs text-gray-400">Last seen {timeAgo(lastSeen)}</span>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: "Invocations (7d)",
            value: totalInv.toLocaleString(),
          },
          {
            label: "Error rate (7d)",
            value: `${errorRate.toFixed(1)}%`,
            highlight: errorRate > 5,
          },
          {
            label: "P50 latency",
            value: medianP50 !== null ? `${medianP50} ms` : "—",
          },
          {
            label: "P99 latency",
            value: medianP99 !== null ? `${medianP99} ms` : "—",
          },
          {
            label: "Tokens (7d)",
            value:
              totalTokens >= 1_000_000
                ? `${(totalTokens / 1_000_000).toFixed(1)}M`
                : totalTokens >= 1_000
                ? `${(totalTokens / 1_000).toFixed(0)}K`
                : totalTokens.toLocaleString(),
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border border-gray-200 bg-white px-4 py-4"
          >
            <p className="text-xs text-gray-500">{kpi.label}</p>
            <p
              className={`mt-1 text-lg font-semibold ${
                kpi.highlight ? "text-amber-600" : "text-gray-900"
              }`}
            >
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* Daily bar chart */}
      {dailyData.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Daily invocations (last 7 days)
          </p>
          <div className="space-y-2">
            {dailyData.map((day) => (
              <div key={day.day} className="flex items-center gap-3 text-xs">
                <span className="w-20 shrink-0 text-gray-400">
                  {new Date(day.day).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                </span>
                <div className="relative flex-1 h-5 rounded bg-gray-100 overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 rounded bg-blue-500"
                    style={{ width: `${Math.round((day.invocations / maxInv) * 100)}%` }}
                  />
                  {day.errors > 0 && (
                    <div
                      className="absolute inset-y-0 left-0 rounded bg-red-400 opacity-70"
                      style={{
                        width: `${Math.round((day.errors / maxInv) * 100)}%`,
                      }}
                    />
                  )}
                </div>
                <span className="w-14 text-right text-gray-600">
                  {day.invocations.toLocaleString()}
                </span>
                {day.errors > 0 && (
                  <span className="w-12 text-right text-red-500">
                    {day.errors} err
                  </span>
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-blue-500" /> Invocations
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-red-400" /> Errors
            </span>
          </div>
        </div>
      )}

      {/* Alert Thresholds */}
      <AlertThresholdsPanel agentId={agentId} canManage={canManageAlerts} />
    </div>
  );
}
