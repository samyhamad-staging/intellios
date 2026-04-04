"use client";

import { Fragment, useState, useEffect } from "react";
import Link from "next/link";
import { Heading, Subheading } from "@/components/catalyst/heading";
import type { BriefingResult, IntelligencePayload, MetricsSnapshot } from "@/lib/awareness/types";
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from "@/components/ui/table";
import { TableToolbar, Pagination } from "@/components/ui/table-toolbar";

function pct(v: number | null): string {
  if (v == null) return "—";
  return `${(v * 100).toFixed(0)}%`;
}

function num(v: number | null, decimals = 1): string {
  if (v == null) return "—";
  return v.toFixed(decimals);
}

function healthColor(status: string): { bg: string; text: string; dot: string } {
  if (status === "nominal") return { bg: "bg-green-100", text: "text-green-700", dot: "●" };
  if (status === "attention") return { bg: "bg-amber-100", text: "text-amber-700", dot: "⚠" };
  return { bg: "bg-red-100", text: "text-red-700", dot: "🔴" };
}

function HealthBadge({ status }: { status: string }) {
  const c = healthColor(status);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full ${c.bg} px-2.5 py-0.5 text-xs font-semibold ${c.text}`}>
      {c.dot} {status.toUpperCase()}
    </span>
  );
}

/** KPI card — optionally wrapped in a link when anomalous */
function KpiCard({
  label, value, delta, sub, color = "bg-surface border-border text-text",
  deltaColor = "text-text-secondary", href,
}: {
  label: string; value: string; delta?: string | null; sub?: string;
  color?: string; deltaColor?: string; href?: string;
}) {
  const inner = (
    <div className={`rounded-xl border p-5 ${color} ${href ? "cursor-pointer hover:shadow-sm transition-shadow" : ""}`}>
      <div className="text-3xl font-bold tabular-nums">{value}</div>
      {delta != null && <div className={`mt-0.5 text-sm font-medium ${deltaColor}`}>{delta}</div>}
      <div className="mt-1 text-sm font-semibold">{label}</div>
      {sub && <div className="mt-0.5 text-xs text-text-tertiary">{sub}</div>}
      {href && <div className="mt-1.5 text-xs font-medium text-blue-600">View →</div>}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

/** Generic SVG sparkline used for all trend charts */
function MetricSparkline({
  snapshots,
  accessor,
  threshold,
  pctFmt = false,
  label,
  thresholdLabel,
  higherIsBetter = true,
}: {
  snapshots: MetricsSnapshot[];
  accessor: (s: MetricsSnapshot) => number | null;
  threshold?: number;
  pctFmt?: boolean;
  label: string;
  thresholdLabel?: string;
  higherIsBetter?: boolean;
}) {
  const ordered = [...snapshots].reverse();
  const raw = ordered.map(accessor);
  const values = raw.map((v) => v ?? null);
  const nonNull = values.filter((v): v is number => v !== null);

  if (nonNull.length < 2) {
    return (
      <div className="rounded-xl border border-border bg-surface px-5 py-4">
        <div className="mb-2 text-sm font-semibold text-text">{label}</div>
        <div className="flex h-20 items-center justify-center text-xs text-text-tertiary">
          Not enough data (need ≥ 2 snapshots)
        </div>
      </div>
    );
  }

  const W = 400;
  const H = 80;
  const PAD = 8;
  const minV = Math.min(...nonNull, threshold ?? Infinity) * 0.95;
  const maxV = Math.max(...nonNull, threshold ?? -Infinity) * 1.05 || 1;
  const range = maxV - minV || 1;

  const toY = (v: number) => H - PAD - ((v - minV) / range) * (H - PAD * 2);
  const toX = (i: number, len: number) => PAD + (i / (len - 1)) * (W - PAD * 2);

  // Build segments, skipping nulls
  const segments: string[][] = [];
  let current: string[] = [];
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v !== null) {
      current.push(`${toX(i, values.length).toFixed(1)},${toY(v).toFixed(1)}`);
    } else {
      if (current.length >= 2) segments.push(current);
      current = [];
    }
  }
  if (current.length >= 2) segments.push(current);

  // Latest non-null value for color
  const latestVal = nonNull[nonNull.length - 1];
  const isGood = threshold == null
    ? true
    : higherIsBetter
      ? latestVal >= threshold
      : latestVal <= threshold;
  const isWarn = !isGood && threshold != null && (
    higherIsBetter ? latestVal >= threshold * 0.8 : latestVal <= threshold * 1.25
  );
  const lineColor = threshold == null
    ? "#6366f1"
    : isGood ? "#16a34a" : isWarn ? "#d97706" : "#dc2626";

  const fmt = (v: number) => pctFmt ? `${(v * 100).toFixed(0)}%` : v.toFixed(1);

  return (
    <div className="rounded-xl border border-border bg-surface px-5 py-4">
      <div className="mb-1 flex items-center justify-between">
        <div className="text-sm font-semibold text-text">{label}</div>
        <div className="text-xs text-text-tertiary">{fmt(nonNull[nonNull.length - 1])}</div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-20" preserveAspectRatio="none">
        {threshold != null && (
          <line
            x1={PAD} y1={toY(threshold).toFixed(1)}
            x2={W - PAD} y2={toY(threshold).toFixed(1)}
            stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4,4"
          />
        )}
        {segments.map((pts, si) => (
          <polyline
            key={si}
            points={pts.join(" ")}
            fill="none"
            stroke={lineColor}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
        {(() => {
          // Dot on last non-null value
          for (let i = values.length - 1; i >= 0; i--) {
            if (values[i] !== null) {
              const px = toX(i, values.length).toFixed(1);
              const py = toY(values[i]!).toFixed(1);
              return <circle cx={px} cy={py} r="3" fill={lineColor} />;
            }
          }
          return null;
        })()}
      </svg>
      <div className="mt-1 flex justify-between text-xs text-text-tertiary">
        <span>{ordered[0] ? new Date(ordered[0].snapshotAt).toLocaleDateString() : ""}</span>
        {thresholdLabel && <span className="text-text-disabled">— {thresholdLabel}</span>}
        <span>{ordered[ordered.length - 1] ? new Date(ordered[ordered.length - 1].snapshotAt).toLocaleDateString() : ""}</span>
      </div>
    </div>
  );
}

export default function IntelligencePage() {
  const [data, setData] = useState<IntelligencePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [backfillLoading, setBackfillLoading] = useState(false);
  const [role, setRole] = useState<string>("");
  const [toast, setToast] = useState<string | null>(null);
  const [selectedBriefingIdx, setSelectedBriefingIdx] = useState(0);
  const [expandedScoreId, setExpandedScoreId] = useState<string | null>(null);
  const [scoresSearchValue, setScoresSearchValue] = useState("");
  const [scoresCurrentPage, setScoresCurrentPage] = useState(1);
  const [intakeSearchValue, setIntakeSearchValue] = useState("");
  const [intakeCurrentPage, setIntakeCurrentPage] = useState(1);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => setRole(d.user?.role ?? d.role ?? ""))
      .catch(() => {});
    loadData();
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch("/api/monitor/intelligence");
      if (res.ok) {
        const payload = await res.json();
        setData(payload);
        setSelectedBriefingIdx(0);
      }
    } catch {
      // keep empty state
    } finally {
      setLoading(false);
    }
  }

  async function handleSnapshot() {
    setSnapshotLoading(true);
    try {
      const res = await fetch("/api/monitor/intelligence/snapshot", { method: "POST" });
      if (res.ok) {
        showToast("Snapshot captured");
        await loadData();
      }
    } finally {
      setSnapshotLoading(false);
    }
  }

  async function handleBriefing() {
    setBriefingLoading(true);
    try {
      const res = await fetch("/api/monitor/intelligence/briefing", { method: "POST" });
      if (res.ok) {
        showToast("Briefing generated");
        await loadData();
      }
    } finally {
      setBriefingLoading(false);
    }
  }

  async function handleBackfill() {
    setBackfillLoading(true);
    try {
      const res = await fetch("/api/monitor/intelligence/backfill", { method: "POST" });
      if (res.ok) {
        const { scored, skipped } = await res.json();
        showToast(`Backfill complete: ${scored} scored, ${skipped} already scored`);
        await loadData();
      }
    } finally {
      setBackfillLoading(false);
    }
  }

  const isAdmin = role === "admin";
  const kpis = data?.kpis;
  const briefingHistory = data?.briefingHistory ?? [];
  const selectedBriefing: BriefingResult | null = briefingHistory[selectedBriefingIdx] ?? null;
  const snapshots = data?.snapshots ?? [];
  const scores = data?.recentScores ?? [];
  const intakeScores = data?.recentIntakeScores ?? [];

  // Filter scores by search
  const filteredScores = scores.filter((score) =>
    score.blueprintId.toLowerCase().includes(scoresSearchValue.toLowerCase())
  );

  const SCORES_PER_PAGE = 10;
  const totalScoresPages = Math.ceil(filteredScores.length / SCORES_PER_PAGE);
  const startScoresIdx = (scoresCurrentPage - 1) * SCORES_PER_PAGE;
  const paginatedScores = filteredScores.slice(startScoresIdx, startScoresIdx + SCORES_PER_PAGE);

  // Filter intake scores by search
  const filteredIntakeScores = intakeScores.filter((score) =>
    score.sessionId.toLowerCase().includes(intakeSearchValue.toLowerCase())
  );

  const INTAKE_PER_PAGE = 10;
  const totalIntakePages = Math.ceil(filteredIntakeScores.length / INTAKE_PER_PAGE);
  const startIntakeIdx = (intakeCurrentPage - 1) * INTAKE_PER_PAGE;
  const paginatedIntakeScores = filteredIntakeScores.slice(startIntakeIdx, startIntakeIdx + INTAKE_PER_PAGE);

  // Anomaly resource links — derive from KPI values
  const kpiLinks: { label: string; href: string; value: string; reason: string }[] = [];
  if (kpis) {
    if (kpis.qualityIndex != null && kpis.qualityIndex < 70) {
      kpiLinks.push({ label: "Quality Index low", href: "/pipeline", value: kpis.qualityIndex.toFixed(1), reason: "Review recent blueprints for quality issues" });
    }
    if (kpis.blueprintValidityRate != null && kpis.blueprintValidityRate < 0.70) {
      kpiLinks.push({ label: "Validity rate below threshold", href: "/pipeline", value: pct(kpis.blueprintValidityRate), reason: "Check blueprints failing governance validation" });
    }
    if (kpis.reviewQueueDepth != null && kpis.reviewQueueDepth > 10) {
      kpiLinks.push({ label: "Review queue elevated", href: "/review", value: String(kpis.reviewQueueDepth), reason: "Clear review backlog to maintain SLA" });
    }
    if (kpis.webhookSuccessRate != null && kpis.webhookSuccessRate < 0.80) {
      kpiLinks.push({ label: "Webhook delivery failures", href: "/admin/webhooks", value: pct(kpis.webhookSuccessRate), reason: "Check webhook configuration and endpoint health" });
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-text px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <Heading level={1} className="text-text">Intelligence</Heading>
          <p className="mt-0.5 text-sm text-text-secondary">
            Platform quality, generation trends, and daily briefings.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleSnapshot}
            disabled={snapshotLoading || loading}
            className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-text hover:border-border-strong disabled:opacity-50 transition-colors"
          >
            {snapshotLoading ? "Capturing…" : "↻ Snapshot"}
          </button>
          {isAdmin && (
            <>
              <button
                onClick={handleBackfill}
                disabled={backfillLoading || loading}
                className="rounded-lg border border-indigo-200 px-3 py-2 text-sm font-medium text-indigo-700 hover:border-indigo-400 disabled:opacity-50 transition-colors"
              >
                {backfillLoading ? "Scoring…" : "⟳ Score Existing"}
              </button>
              <button
                onClick={handleBriefing}
                disabled={briefingLoading || loading}
                className="rounded-lg bg-text px-3 py-2 text-sm font-medium text-white hover:bg-text-secondary disabled:opacity-50 transition-colors"
              >
                {briefingLoading ? "Generating…" : "✦ Generate Briefing"}
              </button>
            </>
          )}
          <Link
            href="/monitor"
            className="rounded-lg border border-border px-3 py-2 text-sm text-text-secondary hover:border-border-strong transition-colors"
          >
            ← Monitor
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-surface-muted" />
            ))}
          </div>
          <div className="h-48 animate-pulse rounded-xl bg-surface-muted" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPI Strip — cards link to the relevant page when anomalous */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <KpiCard
              label="Quality Index"
              value={num(kpis?.qualityIndex ?? null, 1)}
              delta={
                kpis?.qualityIndexDelta != null
                  ? `${kpis.qualityIndexDelta > 0 ? "+" : ""}${kpis.qualityIndexDelta.toFixed(1)} vs prior`
                  : null
              }
              sub="0–100 composite"
              color={
                (kpis?.qualityIndex ?? 0) >= 70
                  ? "bg-green-50 border border-green-200 text-green-900"
                  : (kpis?.qualityIndex ?? 0) >= 50
                  ? "bg-amber-50 border border-amber-200 text-amber-900"
                  : "bg-red-50 border border-red-200 text-red-900"
              }
              deltaColor={(kpis?.qualityIndexDelta ?? 0) >= 0 ? "text-green-600" : "text-red-600"}
              href={(kpis?.qualityIndex ?? 100) < 70 ? "/pipeline" : undefined}
            />
            <KpiCard
              label="Validity Rate"
              value={pct(kpis?.blueprintValidityRate ?? null)}
              sub="blueprints passing validation (7d)"
              color={
                (kpis?.blueprintValidityRate ?? 1) >= 0.70
                  ? "bg-surface border border-border text-text"
                  : "bg-amber-50 border border-amber-200 text-amber-900"
              }
              href={(kpis?.blueprintValidityRate ?? 1) < 0.70 ? "/pipeline" : undefined}
            />
            <KpiCard
              label="Review Queue"
              value={kpis?.reviewQueueDepth?.toString() ?? "—"}
              sub="items in in_review"
              color={
                (kpis?.reviewQueueDepth ?? 0) > 10
                  ? "bg-amber-50 border border-amber-200 text-amber-900"
                  : "bg-surface border border-border text-text"
              }
              href={(kpis?.reviewQueueDepth ?? 0) > 10 ? "/review" : undefined}
            />
            <KpiCard
              label="Webhook Rate"
              value={pct(kpis?.webhookSuccessRate ?? null)}
              sub="delivery success (24h)"
              color={
                kpis?.webhookSuccessRate == null || kpis.webhookSuccessRate >= 0.80
                  ? "bg-surface border border-border text-text"
                  : "bg-amber-50 border border-amber-200 text-amber-900"
              }
              href={kpis?.webhookSuccessRate != null && kpis.webhookSuccessRate < 0.80 ? "/admin/webhooks" : undefined}
            />
          </div>

          {/* Anomaly action strip */}
          {kpiLinks.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-700">
                Action Required
              </div>
              <div className="space-y-1.5">
                {kpiLinks.map((link) => (
                  <div key={link.href + link.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-amber-800">
                      <span className="font-medium">{link.label}</span>
                      <span className="rounded-full bg-amber-200 px-1.5 py-0.5 text-xs font-semibold tabular-nums">
                        {link.value}
                      </span>
                      <span className="text-xs text-amber-600">— {link.reason}</span>
                    </div>
                    <Link
                      href={link.href}
                      className="rounded text-xs font-medium text-amber-700 underline underline-offset-2 hover:text-amber-900"
                    >
                      Go →
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Briefing history strip + panel */}
          <div className="rounded-xl border border-border bg-surface">
            {/* Date strip */}
            {briefingHistory.length > 0 && (
              <div className="flex items-center gap-1 border-b border-border-subtle px-5 py-2 overflow-x-auto">
                {briefingHistory.map((b, idx) => {
                  const c = healthColor(b.healthStatus);
                  const isSelected = idx === selectedBriefingIdx;
                  return (
                    <button
                      key={b.id}
                      onClick={() => setSelectedBriefingIdx(idx)}
                      className={`flex flex-col items-center rounded-lg px-3 py-1.5 text-xs transition-colors ${
                        isSelected
                          ? "bg-text text-white"
                          : "text-text-secondary hover:bg-surface-raised"
                      }`}
                    >
                      <span className={isSelected ? "text-white" : c.text}>{c.dot}</span>
                      <span className="mt-0.5 font-medium">
                        {new Date(b.briefingDate + "T12:00:00").toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Briefing header */}
            <div className="flex items-center justify-between border-b border-border-subtle px-5 py-3">
              <div className="flex items-center gap-3">
                <Subheading level={2} className="text-text">
                  {selectedBriefing
                    ? `Daily Brief — ${selectedBriefing.briefingDate}`
                    : "Daily Brief"}
                </Subheading>
                {selectedBriefing && <HealthBadge status={selectedBriefing.healthStatus} />}
              </div>
              {selectedBriefing && (
                <span className="text-xs text-text-tertiary">
                  Generated{" "}
                  {new Date(selectedBriefing.generatedAt).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </div>

            {/* Briefing content */}
            {selectedBriefing ? (
              selectedBriefing.sections ? (
                /* Structured section cards — new briefings with generateObject() */
                <div className="space-y-3 px-5 py-4">
                  {([
                    { key: "generationQuality" as const, label: "Generation Quality", icon: "✦", badge: "bg-indigo-100 text-indigo-700" },
                    { key: "lifecycle" as const, label: "Lifecycle", icon: "↻", badge: "bg-blue-100 text-blue-700" },
                    { key: "governance" as const, label: "Governance", icon: "⚖", badge: "bg-purple-100 text-purple-700" },
                    { key: "system" as const, label: "System", icon: "⚙", badge: "bg-surface-muted text-text" },
                  ] as { key: keyof typeof selectedBriefing.sections; label: string; icon: string; badge: string }[]).map(({ key, label, icon, badge }) => (
                    selectedBriefing.sections![key] ? (
                      <div key={key} className="rounded-lg border border-border-subtle bg-surface-raised p-4">
                        <div className="mb-2 flex items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge}`}>{icon} {label}</span>
                        </div>
                        <p className="text-sm text-text leading-relaxed">{selectedBriefing.sections![key] as string}</p>
                      </div>
                    ) : null
                  ))}
                  {selectedBriefing.sections.attentionRequired.length > 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">⚠ Attention Required</span>
                      </div>
                      <div className="space-y-1.5">
                        {selectedBriefing.sections.attentionRequired.map((bullet, i) => (
                          <div key={i} className="rounded-md border border-amber-200 bg-surface px-3 py-1.5 text-sm text-amber-800">{bullet}</div>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedBriefing.sections.attentionRequired.length === 0 && (
                    <div className="rounded-lg border border-green-100 bg-green-50 px-4 py-2.5">
                      <p className="text-sm text-green-700">✓ No attention items. All metrics within thresholds.</p>
                    </div>
                  )}
                </div>
              ) : (
                /* Legacy fallback for old briefings without sections */
                <pre className="whitespace-pre-wrap px-5 py-4 font-mono text-xs text-text leading-relaxed">
                  {selectedBriefing.content}
                </pre>
              )
            ) : (
              <div className="px-5 py-12 text-center">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-surface-muted">
                  <svg className="h-5 w-5 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-text-secondary">No briefing generated yet</p>
                {isAdmin ? (
                  <p className="mt-1 text-xs text-text-tertiary">
                    Click &ldquo;Generate Briefing&rdquo; above to create today&apos;s intelligence brief.
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-text-tertiary">
                    Intelligence briefings are generated daily. Check back tomorrow, or ask your administrator to generate today&apos;s brief.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* 30-day Trend Charts — 2×2 grid */}
          {snapshots.length >= 2 && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <Subheading level={2} className="text-text">30-Day Trends</Subheading>
                <span className="text-xs text-text-tertiary">
                  {snapshots.length} snapshots · dashed lines = thresholds
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <MetricSparkline
                  snapshots={snapshots}
                  accessor={(s) => s.qualityIndex}
                  threshold={70}
                  label="Quality Index"
                  thresholdLabel="floor 70"
                />
                <MetricSparkline
                  snapshots={snapshots}
                  accessor={(s) => s.blueprintValidityRate}
                  threshold={0.70}
                  pctFmt
                  label="Blueprint Validity Rate"
                  thresholdLabel="threshold 70%"
                />
                <MetricSparkline
                  snapshots={snapshots}
                  accessor={(s) => s.reviewQueueDepth}
                  threshold={10}
                  label="Review Queue Depth"
                  thresholdLabel="max 10"
                  higherIsBetter={false}
                />
                <MetricSparkline
                  snapshots={snapshots}
                  accessor={(s) => s.webhookSuccessRate}
                  threshold={0.80}
                  pctFmt
                  label="Webhook Success Rate"
                  thresholdLabel="threshold 80%"
                />
              </div>
            </div>
          )}

          {/* Recent Blueprint Quality Scores */}
          <div className="rounded-xl border border-border bg-surface">
            <div className="flex items-center justify-between border-b border-border-subtle px-5 py-3">
              <Subheading level={2} className="text-text">Recent Blueprint Quality Scores</Subheading>
              {scores.length === 0 && isAdmin && (
                <button
                  onClick={handleBackfill}
                  disabled={backfillLoading}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                >
                  {backfillLoading ? "Scoring…" : "Score existing blueprints →"}
                </button>
              )}
            </div>
            {scores.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-text-tertiary">
                No quality scores yet. Scores are generated when blueprints enter review, or use &ldquo;Score Existing&rdquo; above.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="px-5 py-3 border-b border-border-subtle">
                  <TableToolbar
                    searchPlaceholder="Search by blueprint ID…"
                    searchValue={scoresSearchValue}
                    onSearchChange={(val) => {
                      setScoresSearchValue(val);
                      setScoresCurrentPage(1);
                    }}
                    resultCount={filteredScores.length}
                    resultLabel="score"
                  />
                </div>
                <Table striped>
                  <TableHead>
                    <TableRow>
                      <TableHeader>Blueprint</TableHeader>
                      <TableHeader>Overall</TableHeader>
                      <TableHeader>Intent</TableHeader>
                      <TableHeader>Tools</TableHeader>
                      <TableHeader>Governance</TableHeader>
                      <TableHeader>Flags</TableHeader>
                      <TableHeader>Evaluated</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedScores.map((score) => {
                    const overall = score.overallScore ?? 0;
                    const scoreColor =
                      overall >= 70 ? "text-green-700 bg-green-50" :
                      overall >= 50 ? "text-amber-700 bg-amber-50" :
                      "text-red-700 bg-red-50";
                    const isExpanded = expandedScoreId === score.id;
                    const dims: { label: string; value: number | null }[] = [
                      { label: "Intent", value: score.intentAlignment },
                      { label: "Tools", value: score.toolAppropriateness },
                      { label: "Specificity", value: score.instructionSpecificity },
                      { label: "Governance", value: score.governanceAdequacy },
                      { label: "Ownership", value: score.ownershipCompleteness },
                    ];
                    return (
                      <Fragment key={score.id}>
                        <TableRow
                          className="cursor-pointer interactive-row"
                          onClick={() => setExpandedScoreId(isExpanded ? null : score.id)}
                        >
                          <TableCell>
                            <span className="font-mono text-xs text-text-secondary">
                              {score.blueprintId.slice(0, 8)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${scoreColor}`}>
                              {num(score.overallScore, 0)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-xs text-text-secondary">
                            {num(score.intentAlignment, 1)}
                          </TableCell>
                          <TableCell className="text-right text-xs text-text-secondary">
                            {num(score.toolAppropriateness, 1)}
                          </TableCell>
                          <TableCell className="text-right text-xs text-text-secondary">
                            {num(score.governanceAdequacy, 1)}
                          </TableCell>
                          <TableCell>
                            {score.flags.length > 0 ? (
                              <span
                                className="block max-w-48 truncate text-xs text-amber-600"
                                title={score.flags.join("; ")}
                              >
                                {score.flags[0]}
                                {score.flags.length > 1 ? ` (+${score.flags.length - 1})` : ""}
                              </span>
                            ) : (
                              <span className="text-xs text-text-disabled">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-text-tertiary">
                            {new Date(score.evaluatedAt).toLocaleDateString()}
                            <span className="ml-1 text-text-disabled">{isExpanded ? "▲" : "▼"}</span>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow key={`${score.id}-detail`} className="bg-surface-raised">
                            <TableCell colSpan={7} className="px-5 py-3">
                              <div className="space-y-1.5">
                                {dims.map((d) => {
                                  const val = d.value ?? 0;
                                  const pctFill = (val / 5) * 100;
                                  const below = val < 3.0;
                                  return (
                                    <div key={d.label} className="flex items-center gap-3">
                                      <span className="w-24 shrink-0 text-xs text-text-secondary">{d.label}</span>
                                      <div className="h-1.5 flex-1 rounded-full bg-surface-muted">
                                        <div
                                          className={`h-1.5 rounded-full ${below ? "bg-amber-400" : "bg-indigo-400"}`}
                                          style={{ width: `${pctFill}%` }}
                                        />
                                      </div>
                                      <span className={`w-10 shrink-0 text-right text-xs font-medium ${below ? "text-amber-600" : "text-text"}`}>
                                        {d.value != null ? `${d.value.toFixed(1)}/5` : "—"}
                                      </span>
                                      {below && <span className="text-xs text-amber-500">⚠ below threshold</span>}
                                    </div>
                                  );
                                })}
                                {score.flags.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1.5">
                                    {score.flags.map((f, fi) => (
                                      <span key={fi} className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">{f}</span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                  </TableBody>
                </Table>
                {totalScoresPages > 1 && (
                  <Pagination
                    currentPage={scoresCurrentPage}
                    totalPages={totalScoresPages}
                    onPageChange={setScoresCurrentPage}
                  />
                )}
              </div>
            )}
          </div>

          {/* Recent Intake Quality Scores */}
          <div className="rounded-xl border border-border bg-surface">
            <div className="flex items-center justify-between border-b border-border-subtle px-5 py-3">
              <Subheading level={2} className="text-text">Recent Intake Quality Scores</Subheading>
              <Link href="/intake" className="text-xs text-text-tertiary hover:text-text">
                View sessions →
              </Link>
            </div>
            {intakeScores.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-text-tertiary">
                No intake quality scores yet. Scores are generated automatically when sessions are finalized.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="px-5 py-3 border-b border-border-subtle">
                  <TableToolbar
                    searchPlaceholder="Search by session ID…"
                    searchValue={intakeSearchValue}
                    onSearchChange={(val) => {
                      setIntakeSearchValue(val);
                      setIntakeCurrentPage(1);
                    }}
                    resultCount={filteredIntakeScores.length}
                    resultLabel="score"
                  />
                </div>
                <Table striped>
                  <TableHead>
                    <TableRow>
                      <TableHeader>Session</TableHeader>
                      <TableHeader>Overall</TableHeader>
                      <TableHeader>Breadth</TableHeader>
                      <TableHeader>Ambiguity</TableHeader>
                      <TableHeader>Risk ID</TableHeader>
                      <TableHeader>Stakeholder</TableHeader>
                      <TableHeader>Evaluated</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedIntakeScores.map((score) => {
                    const overall = score.overallScore ?? 0;
                    const scoreColor =
                      overall >= 70 ? "text-green-700 bg-green-50" :
                      overall >= 50 ? "text-amber-700 bg-amber-50" :
                      "text-red-700 bg-red-50";
                    return (
                      <TableRow key={score.id} className="interactive-row">
                        <TableCell>
                          <Link
                            href={`/intake/${score.sessionId}`}
                            className="font-mono text-xs text-indigo-600 hover:text-indigo-800"
                          >
                            {score.sessionId.slice(0, 8)}
                          </Link>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${scoreColor}`}>
                            {num(score.overallScore, 0)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-xs text-text-secondary">
                          {num(score.breadthScore, 1)}
                        </TableCell>
                        <TableCell className="text-right text-xs text-text-secondary">
                          {num(score.ambiguityScore, 1)}
                        </TableCell>
                        <TableCell className="text-right text-xs text-text-secondary">
                          {num(score.riskIdScore, 1)}
                        </TableCell>
                        <TableCell className="text-right text-xs text-text-secondary">
                          {num(score.stakeholderScore, 1)}
                        </TableCell>
                        <TableCell className="text-xs text-text-tertiary">
                          {new Date(score.evaluatedAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  </TableBody>
                </Table>
                {totalIntakePages > 1 && (
                  <Pagination
                    currentPage={intakeCurrentPage}
                    totalPages={totalIntakePages}
                    onPageChange={setIntakeCurrentPage}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
