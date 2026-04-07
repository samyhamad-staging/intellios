"use client";

import { useState, useEffect, useRef } from "react";
import { HelpCircle } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart as ReLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { chartColors, chartFontSize, chartGridColor, chartTextColor, chartMargins } from "@/lib/chart-tokens";
import { Skeleton, SkeletonList } from "@/components/ui/skeleton";
import { SectionHeading } from "@/components/ui/section-heading";

interface QualityScore {
  id: string;
  blueprintId: string;
  overallScore: string | null;
  intentAlignment: string | null;
  toolAppropriateness: string | null;
  instructionSpecificity: string | null;
  governanceAdequacy: string | null;
  ownershipCompleteness: string | null;
  flags: string[];
  evaluatedAt: string;
}

interface ProductionQuality {
  policyAdherenceRate: number;
  uptime: number;
  errorRate: number;
  totalInvocations: number;
  totalViolations: number;
  productionScore: number;
  windowDays: number;
  computedAt: string;
}

interface QualityTrendRow {
  id: string;
  agentId: string;
  weekStart: string;
  designScore: number | null;
  productionScore: number | null;
  policyAdherenceRate: number | null;
}

interface Props {
  score: QualityScore | null;
  loading: boolean;
  /** When provided, fetches and displays production quality metrics (H2-2.1). */
  agentId?: string;
  /** If "deployed" or "suspended", production quality section is shown. */
  agentStatus?: string;
  /** P2-264: Quality score of the prior blueprint version — enables delta display. */
  previousScore?: QualityScore | null;
  /** Human-readable version label for the previous score, e.g. "1.2.0" */
  previousVersion?: string | null;
}

// P2-264: Format a signed score delta with ↑/↓ arrow
function formatDelta(current: number, previous: number): { label: string; classes: string } | null {
  const diff = current - previous;
  if (Math.abs(diff) < 0.05) return null; // suppress noise < 0.05
  const sign = diff > 0 ? "↑" : "↓";
  const classes = diff > 0 ? "text-green-600 dark:text-emerald-400" : "text-red-500";
  return { label: `${sign} ${Math.abs(diff).toFixed(1)}`, classes };
}

const DIMENSIONS = [
  {
    key: "intentAlignment" as const,
    label: "Intent Alignment",
    description: "How well the blueprint captures the intended agent purpose",
    rubric: "1 = purpose is vague or absent  ·  3 = purpose is stated but broad  ·  5 = purpose is precisely defined with clear success criteria and scope boundaries",
  },
  {
    key: "toolAppropriateness" as const,
    label: "Tool Appropriateness",
    description: "Suitability and completeness of the tool configuration",
    rubric: "1 = no tools or entirely wrong tools  ·  3 = some tools listed but descriptions are vague  ·  5 = all required tools specified with correct scoping and parameter constraints",
  },
  {
    key: "instructionSpecificity" as const,
    label: "Instruction Specificity",
    description: "Clarity and precision of behavioral instructions",
    rubric: "1 = instructions are generic or contradictory  ·  3 = instructions cover common cases  ·  5 = instructions are unambiguous with explicit edge-case handling and refusal criteria",
  },
  {
    key: "governanceAdequacy" as const,
    label: "Governance Adequacy",
    description: "Depth and coverage of governance constraints",
    rubric: "1 = no governance constraints defined  ·  3 = basic constraints present (e.g., PII)  ·  5 = comprehensive constraints covering all relevant policies with enforcement modes specified",
  },
  {
    key: "ownershipCompleteness" as const,
    label: "Ownership Completeness",
    description: "Quality of ownership, accountability, and metadata",
    rubric: "1 = no owner or metadata  ·  3 = owner named with basic metadata  ·  5 = full ownership chain including team, review schedule, and escalation path",
  },
];

function scoreColor(val: number): string {
  if (val >= 4) return "bg-green-500";
  if (val >= 3) return "bg-amber-400";
  return "bg-red-400";
}

function scoreTextColor(val: number): string {
  if (val >= 4) return "text-green-700 dark:text-emerald-300";
  if (val >= 3) return "text-amber-700 dark:text-amber-300";
  return "text-red-600 dark:text-red-400";
}

function overallColor(val: number): string {
  if (val >= 80) return "text-green-600 dark:text-emerald-400";
  if (val >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 2) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function pctColor(pct: number): string {
  if (pct >= 0.8) return "text-green-600 dark:text-emerald-400";
  if (pct >= 0.5) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function pctBar(pct: number): string {
  if (pct >= 0.8) return "bg-green-500";
  if (pct >= 0.5) return "bg-amber-400";
  return "bg-red-400";
}

function scoreGrade(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "Excellent", color: "text-green-600 dark:text-emerald-400" };
  if (score >= 60) return { label: "Good",      color: "text-amber-600 dark:text-amber-400" };
  if (score >= 40) return { label: "Fair",       color: "text-orange-600 dark:text-orange-400" };
  return           { label: "Poor",       color: "text-red-600 dark:text-red-400" };
}

// ─── Rubric tooltip ───────────────────────────────────────────────────────────

function RubricTooltip({ rubric }: { rubric: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-flex shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-text-tertiary hover:text-text-secondary transition-colors"
        aria-label="Show scoring rubric"
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute bottom-5 left-0 z-20 w-64 rounded-lg border border-border bg-surface p-3 shadow-lg">
          <p className="mb-1 text-2xs font-semibold uppercase tracking-wide text-text-tertiary">Scoring Rubric</p>
          <p className="text-xs text-text-secondary leading-relaxed">{rubric}</p>
        </div>
      )}
    </div>
  );
}

export function QualityDashboard({ score, loading, agentId, agentStatus, previousScore, previousVersion }: Props) {
  const showProduction = !!agentId && (agentStatus === "deployed" || agentStatus === "suspended");

  const [prodQuality, setProdQuality] = useState<ProductionQuality | null>(null);
  const [prodLoading, setProdLoading] = useState(false);
  const [trendData, setTrendData] = useState<QualityTrendRow[]>([]);

  useEffect(() => {
    if (!showProduction) return;
    setProdLoading(true);
    fetch(`/api/registry/${agentId}/quality/production`)
      .then((r) => r.json())
      .then((data) => setProdQuality(data as ProductionQuality))
      .catch(() => setProdQuality(null))
      .finally(() => setProdLoading(false));

    fetch(`/api/registry/${agentId}/quality/trends?weeks=12`)
      .then((r) => r.json())
      .then((data) => setTrendData((data.trends ?? []) as QualityTrendRow[]))
      .catch(() => setTrendData([]));
  }, [agentId, showProduction]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton height="h-24" variant="rectangular" />
        <div className="space-y-3">
          {DIMENSIONS.map((d) => (
            <Skeleton key={d.key} height="h-10" variant="text" />
          ))}
        </div>
      </div>
    );
  }

  if (!score) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface-raised p-10 text-center">
        <p className="text-sm font-medium text-text-secondary">No quality score yet</p>
        <p className="mt-1 text-xs text-text-tertiary">
          Quality scores are evaluated automatically when a blueprint is submitted for review.
        </p>
      </div>
    );
  }

  const overall = parseFloat(score.overallScore ?? "0");
  // P2-264: Overall delta vs previous version
  const prevOverall = previousScore ? parseFloat(previousScore.overallScore ?? "0") : null;
  const overallDelta = prevOverall !== null ? formatDelta(overall, prevOverall) : null;

  return (
    <div className="space-y-6">
      {/* Overall score headline */}
      <div className="flex items-center gap-6 rounded-xl border border-border bg-surface p-5">
        <div className="text-center">
          <p className={`text-5xl font-bold tabular-nums ${overallColor(overall)}`}>
            {Math.round(overall)}
          </p>
          <p className="mt-1 text-xs text-text-secondary">/ 100</p>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-text">Overall Quality Score</p>
            {/* P2-264: Delta badge */}
            {overallDelta && (
              <span
                className={`text-xs font-semibold tabular-nums ${overallDelta.classes}`}
                title={`vs v${previousVersion ?? "previous"}`}
              >
                {overallDelta.label} vs v{previousVersion ?? "prev"}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-text-secondary">
            Average of 5 dimensions, scaled 0–100
          </p>
          <p className="mt-2 text-2xs text-text-tertiary">
            Last evaluated {timeAgo(score.evaluatedAt)}
          </p>
        </div>
      </div>

      {/* Dimension bars */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="border-b border-border-subtle bg-surface-raised px-4 py-2.5">
          <SectionHeading>Dimension Scores (1–5)</SectionHeading>
        </div>
        <div className="divide-y divide-border px-4 py-2">
          {DIMENSIONS.map((dim) => {
            const rawVal = score[dim.key];
            const val = rawVal !== null ? parseFloat(rawVal) : null;
            const pct = val !== null ? ((val - 1) / 4) * 100 : 0;
            // P2-264: Per-dimension delta
            const prevRaw = previousScore ? previousScore[dim.key] : null;
            const prevVal = prevRaw !== null && prevRaw !== undefined ? parseFloat(prevRaw) : null;
            const dimDelta = val !== null && prevVal !== null ? formatDelta(val, prevVal) : null;

            return (
              <div key={dim.key} className="py-3">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-start gap-1.5 min-w-0">
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-text">{dim.label}</span>
                      <p className="text-xs text-text-tertiary">{dim.description}</p>
                    </div>
                    <RubricTooltip rubric={dim.rubric} />
                  </div>
                  <div className="ml-4 shrink-0 flex items-center gap-1.5">
                    {dimDelta && (
                      <span className={`text-2xs font-semibold tabular-nums ${dimDelta.classes}`}>
                        {dimDelta.label}
                      </span>
                    )}
                    <span className={`text-sm font-bold tabular-nums ${val !== null ? scoreTextColor(val) : "text-text-tertiary"}`}>
                      {val !== null ? val.toFixed(1) : "—"}
                    </span>
                  </div>
                </div>
                <div className="h-1.5 w-full rounded-full bg-surface-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${val !== null ? scoreColor(val) : "bg-border"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Flags */}
      {score.flags && score.flags.length > 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4">
          <div className="text-amber-700 dark:text-amber-300 mb-2">
          <SectionHeading>Quality Flags</SectionHeading>
        </div>
          <div className="space-y-1.5">
            {score.flags.map((flag, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-200">
                <span className="mt-0.5 shrink-0 text-amber-500">⚠</span>
                <span>{flag}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* H2-2.1: Production Quality section */}
      {showProduction && (
        <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/30 overflow-hidden">
          <div className="border-b border-indigo-100 dark:border-indigo-800 bg-indigo-100/60 px-4 py-2.5 flex items-center justify-between">
            <div className="text-indigo-700 dark:text-indigo-300">
              <SectionHeading>Production Quality (Last {prodQuality?.windowDays ?? 30} Days)</SectionHeading>
            </div>
            {prodQuality && (
              <span className={`text-xs font-bold ${scoreGrade(prodQuality.productionScore).color}`}>
                {scoreGrade(prodQuality.productionScore).label}
              </span>
            )}
          </div>

          {prodLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-300 dark:border-indigo-700 border-t-indigo-700" />
              <span className="ml-2 text-xs text-indigo-500">Loading production metrics…</span>
            </div>
          ) : prodQuality === null ? (
            <div className="px-4 py-6 text-center text-xs text-indigo-500">
              No production data available
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {/* Composite score + design score side-by-side */}
              <div className="flex items-center gap-4">
                <div className="text-center flex-1 rounded-lg bg-surface border border-indigo-100 dark:border-indigo-800 py-3">
                  <p className={`text-3xl font-bold tabular-nums ${overallColor(parseFloat(score.overallScore ?? "0"))}`}>
                    {Math.round(parseFloat(score.overallScore ?? "0"))}
                  </p>
                  <p className="mt-0.5 text-2xs text-text-secondary">Design / 100</p>
                </div>
                <div className="text-lg font-light text-indigo-300 shrink-0">vs</div>
                <div className="text-center flex-1 rounded-lg bg-surface border border-indigo-100 dark:border-indigo-800 py-3">
                  <p className={`text-3xl font-bold tabular-nums ${overallColor(prodQuality.productionScore)}`}>
                    {prodQuality.productionScore}
                  </p>
                  <p className="mt-0.5 text-2xs text-text-secondary">Production / 100</p>
                </div>
              </div>

              {/* Individual production metrics */}
              {[
                {
                  label:       "Policy Adherence",
                  description: "Days without runtime violations",
                  value:       prodQuality.policyAdherenceRate,
                  display:     `${(prodQuality.policyAdherenceRate * 100).toFixed(1)}%`,
                },
                {
                  label:       "Uptime",
                  description: "Days with active invocations",
                  value:       prodQuality.uptime,
                  display:     `${(prodQuality.uptime * 100).toFixed(1)}%`,
                },
                {
                  label:       "Reliability",
                  description: "1 − error rate",
                  value:       1 - prodQuality.errorRate,
                  display:     `${((1 - prodQuality.errorRate) * 100).toFixed(1)}%`,
                },
              ].map((m) => (
                <div key={m.label}>
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <span className="text-sm font-medium text-text">{m.label}</span>
                      <p className="text-xs text-text-tertiary">{m.description}</p>
                    </div>
                    <span className={`ml-4 shrink-0 text-sm font-bold tabular-nums ${pctColor(m.value)}`}>
                      {m.display}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-indigo-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${pctBar(m.value)}`}
                      style={{ width: `${m.value * 100}%` }}
                    />
                  </div>
                </div>
              ))}

              {/* Summary row */}
              <div className="flex flex-wrap gap-3 pt-1 text-xs text-indigo-700 dark:text-indigo-300">
                <span>
                  <span className="font-medium">{prodQuality.totalInvocations.toLocaleString()}</span> invocations
                </span>
                <span>·</span>
                <span>
                  <span className="font-medium">{prodQuality.totalViolations}</span> runtime violation{prodQuality.totalViolations !== 1 ? "s" : ""}
                </span>
                <span>·</span>
                <span className="text-indigo-400">
                  computed {new Date(prodQuality.computedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* H2-2.2: 12-week trend chart — shown when trend data is available */}
      {showProduction && trendData.length > 0 && (
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <div className="border-b border-border-subtle bg-surface-raised px-4 py-2.5 flex items-center justify-between">
            <SectionHeading>Quality Trend — Last {trendData.length} Week{trendData.length !== 1 ? "s" : ""}</SectionHeading>
            <div className="flex items-center gap-3 text-2xs text-text-secondary">
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-0.5 rounded-full" style={{ backgroundColor: chartColors.primary }} />
                Production
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-0.5 rounded-full" style={{ backgroundColor: chartColors.gray }} />
                Design
              </span>
            </div>
          </div>
          <div className="px-2 pt-3 pb-2">
            <ResponsiveContainer width="100%" height={100}>
              <ReLineChart
                data={trendData.map((row) => ({
                  week: row.weekStart.slice(5), // MM-DD
                  design: row.designScore,
                  production: row.productionScore,
                }))}
                margin={chartMargins.compact}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} vertical={false} />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: chartFontSize, fill: chartTextColor }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: chartFontSize, fill: chartTextColor }}
                  tickLine={false}
                  axisLine={false}
                  tickCount={3}
                />
                <Tooltip
                  contentStyle={{ fontSize: chartFontSize, borderRadius: 6, border: "1px solid #e1e5ef", padding: "4px 8px" }}
                  labelFormatter={(label) => `Week of ${label}`}
                  formatter={(_value, name) =>
                    [_value !== undefined && _value !== null ? `${_value}` : "—", name === "production" ? "Production" : "Design"]
                  }
                />
                <Line
                  type="monotone"
                  dataKey="design"
                  stroke={chartColors.gray}
                  strokeWidth={1.5}
                  dot={false}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="production"
                  stroke={chartColors.primary}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              </ReLineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
