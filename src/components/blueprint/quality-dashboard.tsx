"use client";

import { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  LineChart as ReLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { chartColors, chartFontSize, chartGridColor, chartTextColor } from "@/lib/chart-tokens";

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
}

const DIMENSIONS = [
  { key: "intentAlignment" as const, label: "Intent Alignment", description: "How well the blueprint captures the intended agent purpose" },
  { key: "toolAppropriateness" as const, label: "Tool Appropriateness", description: "Suitability and completeness of the tool configuration" },
  { key: "instructionSpecificity" as const, label: "Instruction Specificity", description: "Clarity and precision of behavioral instructions" },
  { key: "governanceAdequacy" as const, label: "Governance Adequacy", description: "Depth and coverage of governance constraints" },
  { key: "ownershipCompleteness" as const, label: "Ownership Completeness", description: "Quality of ownership, accountability, and metadata" },
];

function scoreColor(val: number): string {
  if (val >= 4) return "bg-green-500";
  if (val >= 3) return "bg-amber-400";
  return "bg-red-400";
}

function scoreTextColor(val: number): string {
  if (val >= 4) return "text-green-700";
  if (val >= 3) return "text-amber-700";
  return "text-red-600";
}

function overallColor(val: number): string {
  if (val >= 80) return "text-green-600";
  if (val >= 60) return "text-amber-600";
  return "text-red-600";
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
  if (pct >= 0.8) return "text-green-600";
  if (pct >= 0.5) return "text-amber-600";
  return "text-red-600";
}

function pctBar(pct: number): string {
  if (pct >= 0.8) return "bg-green-500";
  if (pct >= 0.5) return "bg-amber-400";
  return "bg-red-400";
}

function scoreGrade(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "Excellent", color: "text-green-600" };
  if (score >= 60) return { label: "Good",      color: "text-amber-600" };
  if (score >= 40) return { label: "Fair",       color: "text-orange-600" };
  return           { label: "Poor",       color: "text-red-600" };
}

export function QualityDashboard({ score, loading, agentId, agentStatus }: Props) {
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
        <div className="h-24 animate-pulse rounded-xl bg-gray-100" />
        <div className="space-y-3">
          {DIMENSIONS.map((d) => (
            <div key={d.key} className="h-10 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  if (!score) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center">
        <p className="text-sm font-medium text-gray-600">No quality score yet</p>
        <p className="mt-1 text-xs text-gray-400">
          Quality scores are evaluated automatically when a blueprint is submitted for review.
        </p>
      </div>
    );
  }

  const overall = parseFloat(score.overallScore ?? "0");

  return (
    <div className="space-y-6">
      {/* Overall score headline */}
      <div className="flex items-center gap-6 rounded-xl border border-gray-200 bg-white p-5">
        <div className="text-center">
          <p className={`text-5xl font-bold tabular-nums ${overallColor(overall)}`}>
            {Math.round(overall)}
          </p>
          <p className="mt-1 text-xs text-gray-400">/ 100</p>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900">Overall Quality Score</p>
          <p className="mt-0.5 text-xs text-gray-500">
            Average of 5 dimensions, scaled 0–100
          </p>
          <p className="mt-2 text-2xs text-gray-400">
            Last evaluated {timeAgo(score.evaluatedAt)}
          </p>
        </div>
      </div>

      {/* Dimension bars */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-100 bg-gray-50 px-4 py-2.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Dimension Scores (1–5)
          </p>
        </div>
        <div className="divide-y divide-gray-50 px-4 py-2">
          {DIMENSIONS.map((dim) => {
            const rawVal = score[dim.key];
            const val = rawVal !== null ? parseFloat(rawVal) : null;
            const pct = val !== null ? ((val - 1) / 4) * 100 : 0;

            return (
              <div key={dim.key} className="py-3">
                <div className="flex items-center justify-between mb-1.5">
                  <div>
                    <span className="text-sm font-medium text-gray-800">{dim.label}</span>
                    <p className="text-xs text-gray-400">{dim.description}</p>
                  </div>
                  <span className={`ml-4 shrink-0 text-sm font-bold tabular-nums ${val !== null ? scoreTextColor(val) : "text-gray-400"}`}>
                    {val !== null ? val.toFixed(1) : "—"}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${val !== null ? scoreColor(val) : "bg-gray-200"}`}
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
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-700">
            Quality Flags
          </p>
          <div className="space-y-1.5">
            {score.flags.map((flag, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-amber-800">
                <span className="mt-0.5 shrink-0 text-amber-500">⚠</span>
                <span>{flag}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* H2-2.1: Production Quality section */}
      {showProduction && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 overflow-hidden">
          <div className="border-b border-indigo-100 bg-indigo-100/60 px-4 py-2.5 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">
              Production Quality (Last {prodQuality?.windowDays ?? 30} Days)
            </p>
            {prodQuality && (
              <span className={`text-xs font-bold ${scoreGrade(prodQuality.productionScore).color}`}>
                {scoreGrade(prodQuality.productionScore).label}
              </span>
            )}
          </div>

          {prodLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-300 border-t-indigo-700" />
              <span className="ml-2 text-xs text-indigo-500">Loading production metrics…</span>
            </div>
          ) : prodQuality === null ? (
            <div className="px-4 py-6 text-center text-xs text-indigo-400">
              No production data available
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {/* Composite score + design score side-by-side */}
              <div className="flex items-center gap-4">
                <div className="text-center flex-1 rounded-lg bg-white border border-indigo-100 py-3">
                  <p className={`text-3xl font-bold tabular-nums ${overallColor(parseFloat(score.overallScore ?? "0"))}`}>
                    {Math.round(parseFloat(score.overallScore ?? "0"))}
                  </p>
                  <p className="mt-0.5 text-2xs text-gray-400">Design / 100</p>
                </div>
                <div className="text-lg font-light text-indigo-300 shrink-0">vs</div>
                <div className="text-center flex-1 rounded-lg bg-white border border-indigo-100 py-3">
                  <p className={`text-3xl font-bold tabular-nums ${overallColor(prodQuality.productionScore)}`}>
                    {prodQuality.productionScore}
                  </p>
                  <p className="mt-0.5 text-2xs text-gray-400">Production / 100</p>
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
                      <span className="text-sm font-medium text-gray-800">{m.label}</span>
                      <p className="text-xs text-gray-400">{m.description}</p>
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
              <div className="flex flex-wrap gap-3 pt-1 text-xs text-indigo-700">
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
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="border-b border-gray-100 bg-gray-50 px-4 py-2.5 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Quality Trend — Last {trendData.length} Week{trendData.length !== 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-3 text-2xs text-gray-400">
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
                margin={{ top: 4, right: 8, left: -24, bottom: 0 }}
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
