"use client";

import { useState, useEffect } from "react";
import type { QualityScoreResult } from "@/lib/awareness/types";

interface QualityDashboardProps {
  blueprintId: string;
}

const DIMENSIONS = [
  { key: "intentAlignment", label: "Intent Alignment", desc: "Does the blueprint match what the intake requested?" },
  { key: "toolAppropriateness", label: "Tool Appropriateness", desc: "Are selected tools necessary and sufficient?" },
  { key: "instructionSpecificity", label: "Instruction Specificity", desc: "Are instructions specific enough for consistent behavior?" },
  { key: "governanceAdequacy", label: "Governance Adequacy", desc: "Does the configuration address risk indicators?" },
  { key: "ownershipCompleteness", label: "Ownership Completeness", desc: "Is the ownership block complete?" },
] as const;

type DimKey = (typeof DIMENSIONS)[number]["key"];

function scoreColor(score: number): string {
  if (score >= 4) return "text-green-700 bg-green-50 border-green-200";
  if (score >= 3) return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-red-700 bg-red-50 border-red-200";
}

function overallColor(score: number): string {
  if (score >= 80) return "text-green-700";
  if (score >= 60) return "text-amber-700";
  return "text-red-700";
}

function barColor(score: number): string {
  if (score >= 4) return "bg-green-500";
  if (score >= 3) return "bg-amber-500";
  return "bg-red-500";
}

export function QualityDashboard({ blueprintId }: QualityDashboardProps) {
  const [score, setScore] = useState<QualityScoreResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/blueprints/${blueprintId}/quality`);
        if (!res.ok) {
          if (res.status === 404) {
            setScore(null);
            return;
          }
          throw new Error("Failed to load quality score");
        }
        const data = await res.json();
        if (!cancelled) setScore(data.score);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [blueprintId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12 justify-center text-sm text-text-secondary">
        <span className="animate-pulse">Loading quality scores…</span>
      </div>
    );
  }

  if (error) {
    return <p className="py-8 text-center text-sm text-red-600">{error}</p>;
  }

  if (!score) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-surface p-8 text-center">
        <p className="text-sm text-text-secondary">
          No quality evaluation yet.
        </p>
        <p className="mt-1 text-xs text-text-tertiary">
          Quality scores are generated automatically when a blueprint is submitted for review.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Overall score */}
      <div className="flex items-baseline gap-3">
        <span className={`text-3xl font-bold tabular-nums ${overallColor(score.overallScore ?? 0)}`}>
          {score.overallScore != null ? Math.round(score.overallScore) : "–"}
        </span>
        <span className="text-sm text-text-secondary">/ 100 overall quality</span>
        <span className="ml-auto text-xs text-text-tertiary">
          Evaluated {new Date(score.evaluatedAt).toLocaleDateString()} ·{" "}
          {score.evaluatorModel ?? "AI"}
        </span>
      </div>

      {/* Dimension scores */}
      <div className="grid gap-3">
        {DIMENSIONS.map((dim) => {
          const val = score[dim.key as DimKey] as number | null;
          return (
            <div key={dim.key} className={`rounded-lg border p-3 ${val != null ? scoreColor(val) : "border-border bg-surface"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{dim.label}</p>
                  <p className="text-xs opacity-70">{dim.desc}</p>
                </div>
                <div className="flex items-center gap-2">
                  {/* Score bar */}
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <div
                        key={n}
                        className={`h-3 w-5 rounded-sm ${
                          val != null && n <= Math.round(val) ? barColor(val) : "bg-gray-200"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="ml-1 text-sm font-bold tabular-nums w-7 text-right">
                    {val != null ? val.toFixed(1) : "–"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quality flags */}
      {score.flags.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-medium text-amber-800 mb-2">Quality Concerns</p>
          <ul className="space-y-1.5">
            {score.flags.map((flag, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-amber-700">
                <span className="mt-0.5 shrink-0">⚠</span>
                <span>{flag}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {score.flags.length === 0 && (
        <p className="text-xs text-text-tertiary">No quality concerns flagged.</p>
      )}
    </div>
  );
}
