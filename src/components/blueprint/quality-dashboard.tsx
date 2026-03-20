"use client";

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

interface Props {
  score: QualityScore | null;
  loading: boolean;
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

export function QualityDashboard({ score, loading }: Props) {
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
          <p className="mt-2 text-[10px] text-gray-400">
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
    </div>
  );
}
