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
import { FormField } from "@/components/ui/form-field";
import { SectionHeading } from "@/components/ui/section-heading";

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
    return { label: "Unknown", color: "text-text-secondary", bg: "bg-surface-muted" };

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
    return { label: "Offline", color: "text-text-secondary", bg: "bg-surface-muted" };
  if (errorRate > 0.2)
    return { label: "Degraded", color: "text-amber-700", bg: "bg-amber-100" };
  if (errorRate > 0.05)
    return { label: "Degraded", color: "text-amber-700", bg: "bg-amber-100" };

  return { label: "Healthy", color: "text-green-700", bg: "bg-green-100" };
}

/**
 * Compute a period-over-period delta badge for a KPI.
 * Returns null when there is no previous-period data or the change is < 1%.
 * Pass lowerIsBetter=true for error rate and latency (decrease = green).
 */
function formatDelta(
  current: number,
  prev: number | null,
  lowerIsBetter = false
): { label: string; color: string } | null {
  if (prev === null || prev === 0) return null;
  const pct = ((current - prev) / prev) * 100;
  if (Math.abs(pct) < 1) return null;
  const improved = lowerIsBetter ? pct < 0 : pct > 0;
  const sign = pct > 0 ? "+" : "";
  return {
    label: `${sign}${Math.round(pct)}% vs prior 7d`,
    color: improved ? "text-green-600" : "text-red-500",
  };
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

// P1-37: Notification channel stored in localStorage (no DB migration)
interface NotifyChannel {
  email: string;
  slackWebhook: string;
}

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

  // P1-37: Notification channel config — browser-local
  const NOTIFY_KEY = `notify-channel-${agentId}`;
  const [notifyChannel, setNotifyChannel] = useState<NotifyChannel>(() => {
    try {
      const raw = localStorage.getItem(`notify-channel-${agentId}`);
      return raw ? (JSON.parse(raw) as NotifyChannel) : { email: "", slackWebhook: "" };
    } catch { return { email: "", slackWebhook: "" }; }
  });
  const [notifyDraft, setNotifyDraft] = useState<NotifyChannel>(notifyChannel);
  const [editingNotify, setEditingNotify] = useState(false);
  const [notifySavedAt, setNotifySavedAt] = useState<Date | null>(null);

  function saveNotifyChannel() {
    setNotifyChannel(notifyDraft);
    try {
      localStorage.setItem(NOTIFY_KEY, JSON.stringify(notifyDraft));
      setNotifySavedAt(new Date());
    } catch { /* quota */ }
    setEditingNotify(false);
  }

  const hasNotifyConfig = Boolean(notifyChannel.email || notifyChannel.slackWebhook);

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
    return <div className="h-16 rounded-xl bg-surface-muted animate-pulse" />;
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
      <div className="flex items-center justify-between">
        <SectionHeading>
          Alert Thresholds
        </SectionHeading>
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
        <p className="text-xs text-text-tertiary">No thresholds configured.</p>
      )}

      {thresholds.map((t) => (
        <div key={t.id} className="flex items-center gap-3 text-xs">
          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${t.enabled ? "bg-green-500" : "bg-text-disabled"}`} />
          <span className="font-medium text-text">{METRIC_LABELS[t.metric] ?? t.metric}</span>
          <span className="text-text-tertiary">{OPERATOR_LABELS[t.operator] ?? t.operator} {t.value}</span>
          <span className="text-text-tertiary">/ {t.windowMinutes}m window</span>
        </div>
      ))}

      {/* P1-37: Notification channel config */}
      <div className="border-t border-border-subtle pt-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium text-text-secondary">Notify when triggered</p>
            {hasNotifyConfig && !editingNotify && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-200 px-2 py-0.5 text-xs text-green-700">
                ● Active
              </span>
            )}
          </div>
          {canManage && !editingNotify && (
            <button
              onClick={() => { setNotifyDraft(notifyChannel); setEditingNotify(true); }}
              className="text-xs text-blue-600 hover:underline"
            >
              {hasNotifyConfig ? "Edit" : "Configure"}
            </button>
          )}
        </div>

        {!editingNotify && hasNotifyConfig && (
          <div className="mt-2 space-y-1">
            {notifyChannel.email && (
              <div className="flex items-center gap-2 text-xs text-text-secondary">
                <span className="text-text-tertiary">Email:</span>
                <span className="font-mono truncate max-w-48">{notifyChannel.email}</span>
              </div>
            )}
            {notifyChannel.slackWebhook && (
              <div className="flex items-center gap-2 text-xs text-text-secondary">
                <span className="text-text-tertiary">Slack webhook:</span>
                <span className="font-mono truncate max-w-48">{notifyChannel.slackWebhook.slice(0, 36)}…</span>
              </div>
            )}
            {notifySavedAt && (
              <p className="text-2xs text-text-tertiary">
                Saved {notifySavedAt.toLocaleTimeString()}
              </p>
            )}
          </div>
        )}

        {!editingNotify && !hasNotifyConfig && canManage && (
          <p className="mt-1 text-xs text-text-tertiary">
            No notification channel configured — threshold breaches are silent.
          </p>
        )}

        {editingNotify && (
          <div className="mt-2 space-y-2">
            <FormField label="Email address" htmlFor="notify-email">
              <input
                id="notify-email"
                type="email"
                placeholder="ops@company.com"
                value={notifyDraft.email}
                onChange={(e) => setNotifyDraft((d) => ({ ...d, email: e.target.value }))}
                className="w-full rounded border border-border px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </FormField>
            <FormField label="Slack webhook URL" htmlFor="notify-slack">
              <input
                id="notify-slack"
                type="url"
                placeholder="https://hooks.slack.com/services/…"
                value={notifyDraft.slackWebhook}
                onChange={(e) => setNotifyDraft((d) => ({ ...d, slackWebhook: e.target.value }))}
                className="w-full rounded border border-border px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </FormField>
            <div className="flex gap-2">
              <button
                onClick={saveNotifyChannel}
                disabled={!notifyDraft.email && !notifyDraft.slackWebhook}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-40 transition-colors"
              >
                Save channel
              </button>
              <button
                onClick={() => setEditingNotify(false)}
                className="rounded-md border border-border px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-raised"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {adding && (
        <form onSubmit={handleCreate} className="space-y-3 border-t border-border-subtle pt-3">
          <div className="grid grid-cols-2 gap-2">
            <FormField label="Metric" htmlFor="threshold-metric">
              <Select value={form.metric} onValueChange={(v) => setForm((f) => ({ ...f, metric: v }))}>
                <SelectTrigger id="threshold-metric" className="w-full text-xs h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(METRIC_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Operator" htmlFor="threshold-operator">
              <Select value={form.operator} onValueChange={(v) => setForm((f) => ({ ...f, operator: v }))}>
                <SelectTrigger id="threshold-operator" className="w-full text-xs h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gt">&gt; (greater than)</SelectItem>
                  <SelectItem value="lt">&lt; (less than)</SelectItem>
                  <SelectItem value="eq">= (equal)</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Value" htmlFor="threshold-value">
              <input
                id="threshold-value"
                type="number"
                step="any"
                required
                value={form.value}
                onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                className="w-full rounded border border-border px-2 py-1.5 text-xs"
                placeholder="e.g. 0.05"
              />
            </FormField>
            <FormField label="Window (minutes)" htmlFor="threshold-window">
              <input
                id="threshold-window"
                type="number"
                min={1}
                required
                value={form.windowMinutes}
                onChange={(e) => setForm((f) => ({ ...f, windowMinutes: e.target.value }))}
                className="w-full rounded border border-border px-2 py-1.5 text-xs"
              />
            </FormField>
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
              className="rounded-md border border-border px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-raised"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Telemetry snippet panel (shown in empty state)
// ---------------------------------------------------------------------------

function TelemetrySnippetPanel({ snippetPython, snippetCurl }: { snippetPython: string; snippetCurl: string }) {
  const [lang, setLang] = useState<"python" | "curl">("python");
  const [copied, setCopied] = useState(false);
  const snippet = lang === "python" ? snippetPython : snippetCurl;

  function handleCopy() {
    navigator.clipboard.writeText(snippet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      {/* Header row */}
      <div className="flex items-center justify-between border-b border-border-subtle px-4 py-2.5">
        <span className="text-xs font-medium text-text-secondary">Send your first event</span>
        <div className="flex items-center gap-2">
          {/* Language tabs */}
          <div className="flex rounded-md border border-border overflow-hidden text-xs">
            {(["python", "curl"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-2.5 py-1 font-mono transition-colors ${
                  lang === l
                    ? "bg-text text-white"
                    : "bg-surface text-text-secondary hover:bg-surface-raised"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          {/* Copy button */}
          <button
            onClick={handleCopy}
            title="Copy to clipboard"
            className="flex items-center gap-1 rounded border border-border px-2.5 py-1 text-xs text-text-secondary hover:bg-surface-raised transition-colors"
          >
            {copied ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                Copied
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                Copy
              </>
            )}
          </button>
        </div>
      </div>
      {/* Code block */}
      <pre className="overflow-x-auto bg-text px-4 py-4 text-xs leading-relaxed text-surface">
        <code>{snippet}</code>
      </pre>
      {/* Footer hint */}
      <div className="border-t border-border-subtle bg-surface-raised px-4 py-2 text-xs text-text-tertiary">
        Replace <span className="font-mono text-text-secondary">YOUR_TELEMETRY_API_KEY</span> with the key from Admin → Settings → API Keys.
        Batch multiple events per request for efficiency.
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

export function ProductionDashboard({ agentId, data, loading, canManageAlerts = false }: ProductionDashboardProps) {
  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-surface-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    const snippetPython = `import requests

requests.post(
  "https://your-intellios-host/api/telemetry/ingest",
  headers={
    "Authorization": "Bearer YOUR_TELEMETRY_API_KEY",
    "Content-Type": "application/json",
  },
  json={
    "agentId": "${agentId}",
    "invocations": 1,
    "errors": 0,
    "latencyP50Ms": 320,
    "latencyP99Ms": 890,
    "tokensIn": 512,
    "tokensOut": 128,
  },
)`;
    const snippetCurl = `curl -X POST https://your-intellios-host/api/telemetry/ingest \\
  -H "Authorization: Bearer YOUR_TELEMETRY_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agentId": "${agentId}",
    "invocations": 1,
    "errors": 0,
    "latencyP50Ms": 320,
    "latencyP99Ms": 890,
    "tokensIn": 512,
    "tokensOut": 128
  }'`;

    return (
      <div className="p-6 max-w-2xl space-y-6">
        {/* Hero empty state */}
        <div className="rounded-xl border border-dashed border-border bg-surface-raised px-6 py-8 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-surface-muted">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-secondary">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.5a9 9 0 1 1 18 0M12 9v4" />
            </svg>
          </div>
          <p className="text-sm font-medium text-text">No production telemetry yet</p>
          <p className="mt-1 text-xs text-text-secondary max-w-sm mx-auto">
            Push metrics from your deployed agent to{" "}
            <code className="rounded bg-surface-muted px-1 py-0.5 font-mono text-xs">
              POST /api/telemetry/ingest
            </code>
            . Data appears here within minutes.
          </p>
        </div>

        {/* Code snippet panel */}
        <TelemetrySnippetPanel snippetPython={snippetPython} snippetCurl={snippetCurl} />

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

  // Previous 7-day window (days 8–14) for period-over-period deltas
  const prev7d = data.filter((r) => {
    const age = now - new Date(r.timestamp).getTime();
    return age >= 7 * 86_400_000 && age < 14 * 86_400_000;
  });
  const prevTotalInv   = prev7d.reduce((s, r) => s + r.invocations, 0);
  const prevTotalErr   = prev7d.reduce((s, r) => s + r.errors, 0);
  const prevErrorRate  = prevTotalInv > 0 ? (prevTotalErr / prevTotalInv) * 100 : 0;
  const prevTotalTokens = prev7d.reduce((s, r) => s + r.tokensIn + r.tokensOut, 0);
  const prevP50s = prev7d.map((r) => r.latencyP50Ms).filter((v): v is number => v !== null);
  const prevP99s = prev7d.map((r) => r.latencyP99Ms).filter((v): v is number => v !== null);
  const prevMedianP50  = prevP50s.length > 0 ? Math.round(prevP50s.reduce((a, b) => a + b, 0) / prevP50s.length) : null;
  const prevMedianP99  = prevP99s.length > 0 ? Math.round(prevP99s.reduce((a, b) => a + b, 0) / prevP99s.length) : null;

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
              health.label === "Healthy" ? "bg-green-500" : health.label === "Degraded" ? "bg-amber-500" : "bg-text-tertiary"
            }`}
          />
          {health.label}
        </span>
        {lastSeen && (
          <span className="text-xs text-text-tertiary">Last seen {timeAgo(lastSeen)}</span>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: "Invocations (7d)",
            value: totalInv.toLocaleString(),
            delta: formatDelta(totalInv, prevTotalInv > 0 ? prevTotalInv : null),
          },
          {
            label: "Error rate (7d)",
            value: `${errorRate.toFixed(1)}%`,
            highlight: errorRate > 5,
            delta: formatDelta(errorRate, prevTotalInv > 0 ? prevErrorRate : null, true),
          },
          {
            label: "P50 latency",
            value: medianP50 !== null ? `${medianP50} ms` : "—",
            delta: medianP50 !== null ? formatDelta(medianP50, prevMedianP50, true) : null,
          },
          {
            label: "P99 latency",
            value: medianP99 !== null ? `${medianP99} ms` : "—",
            delta: medianP99 !== null ? formatDelta(medianP99, prevMedianP99, true) : null,
          },
          {
            label: "Tokens (7d)",
            value:
              totalTokens >= 1_000_000
                ? `${(totalTokens / 1_000_000).toFixed(1)}M`
                : totalTokens >= 1_000
                ? `${(totalTokens / 1_000).toFixed(0)}K`
                : totalTokens.toLocaleString(),
            delta: formatDelta(totalTokens, prevTotalTokens > 0 ? prevTotalTokens : null),
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border border-border bg-surface px-4 py-4"
          >
            <p className="text-xs text-text-secondary">{kpi.label}</p>
            <p
              className={`mt-1 text-lg font-semibold ${
                kpi.highlight ? "text-amber-600" : "text-text"
              }`}
            >
              {kpi.value}
            </p>
            {kpi.delta && (
              <p className={`mt-0.5 text-xs ${kpi.delta.color}`}>{kpi.delta.label}</p>
            )}
          </div>
        ))}
      </div>

      {/* Daily bar chart */}
      {dailyData.length > 0 && (
        <div className="rounded-xl border border-border bg-surface p-5">
          <SectionHeading className="mb-4">
            Daily invocations (last 7 days)
          </SectionHeading>
          <div className="space-y-2">
            {dailyData.map((day) => (
              <div key={day.day} className="flex items-center gap-3 text-xs">
                <span className="w-20 shrink-0 text-text-tertiary">
                  {new Date(day.day).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                </span>
                <div className="relative flex-1 h-5 rounded bg-surface-muted overflow-hidden">
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
                <span className="w-14 text-right text-text-secondary">
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
          <div className="mt-3 flex items-center gap-4 text-xs text-text-tertiary">
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
