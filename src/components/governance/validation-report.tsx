"use client";

import { useState } from "react";
import { ValidationReport, Violation } from "@/lib/governance/types";

interface ValidationReportProps {
  report: ValidationReport;
  blueprintId: string;
  onRevalidate: (report: ValidationReport) => void;
  /** ISO timestamp of last validation; shows staleness indicator when provided */
  validatedAt?: string | null;
  /** If true, validation report may be stale (blueprint modified since last validation) */
  isStale?: boolean;
}

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  if (diffMins < 2) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function ValidationReportView({
  report,
  blueprintId,
  onRevalidate,
  validatedAt,
  isStale,
}: ValidationReportProps) {
  const [revalidating, setRevalidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const errorViolations = report.violations.filter((v) => v.severity === "error");
  const warnViolations = report.violations.filter((v) => v.severity === "warning");

  const handleRevalidate = async () => {
    setRevalidating(true);
    setError(null);
    try {
      const res = await fetch(`/api/blueprints/${blueprintId}/validate`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Validation failed");
      }
      const data = await res.json();
      onRevalidate(data.report as ValidationReport);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Validation failed");
    } finally {
      setRevalidating(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Status summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {report.valid ? (
            <span className="flex items-center gap-1.5 text-sm font-medium text-green-700">
              <span className="text-green-500">✓</span> Passes governance
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-sm font-medium text-red-700">
              <span className="text-red-500">✗</span>
              {errorViolations.length} error{errorViolations.length !== 1 ? "s" : ""}
              {warnViolations.length > 0 && `, ${warnViolations.length} warning${warnViolations.length !== 1 ? "s" : ""}`}
            </span>
          )}
          <span className="text-xs text-gray-400">
            {report.policyCount} polic{report.policyCount !== 1 ? "ies" : "y"}
          </span>
        </div>
        <button
          onClick={handleRevalidate}
          disabled={revalidating}
          className="text-xs text-gray-500 hover:text-gray-900 underline disabled:opacity-50"
        >
          {revalidating ? "Validating…" : "Re-validate"}
        </button>
      </div>

      {/* Staleness warning */}
      {isStale && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <span className="text-amber-600 text-sm">⚠</span>
          <p className="text-xs text-amber-800">
            <span className="font-medium">Validation may be outdated</span> — the blueprint was modified since the last check.
            Re-validate before submitting for review.
          </p>
        </div>
      )}

      {/* Validation timestamp */}
      {validatedAt && !isStale && (
        <p className="text-xs text-text-tertiary">
          Last validated {timeAgo(validatedAt)}
        </p>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}

      {/* Violations */}
      {report.violations.length > 0 && (
        <div className="space-y-2">
          {[...errorViolations, ...warnViolations].map((v, i) => (
            <ViolationCard key={`${v.policyId}-${v.ruleId}-${i}`} violation={v} />
          ))}
        </div>
      )}

      {report.violations.length === 0 && report.policyCount > 0 && (
        <p className="text-xs text-gray-400">
          All {report.policyCount} polic{report.policyCount !== 1 ? "ies" : "y"} passed.
        </p>
      )}

      {report.policyCount === 0 && (
        <p className="text-xs text-gray-400">
          No governance policies found. Add policies via the Governance API.
        </p>
      )}
    </div>
  );
}

function ViolationCard({ violation }: { violation: Violation }) {
  const [expanded, setExpanded] = useState(false);
  const isError = violation.severity === "error";

  return (
    <div
      className={`rounded-lg border p-3 ${
        isError
          ? "border-red-200 bg-red-50"
          : "border-yellow-200 bg-yellow-50"
      }`}
    >
      <div className="flex items-start gap-2">
        <span
          className={`mt-0.5 shrink-0 rounded-full px-1.5 py-0.5 text-xs font-medium ${
            isError
              ? "bg-red-100 text-red-700"
              : "bg-yellow-100 text-yellow-700"
          }`}
        >
          {isError ? "error" : "warn"}
        </span>
        <div className="min-w-0 flex-1">
          <p className={`text-xs font-medium ${isError ? "text-red-800" : "text-yellow-800"}`}>
            {violation.message}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">
            {violation.policyName} · <span className="font-mono">{violation.field}</span>
          </p>
          {violation.suggestion && (
            <button
              onClick={() => setExpanded((e) => !e)}
              className="mt-1 text-xs text-gray-500 hover:text-gray-900 underline"
            >
              {expanded ? "Hide suggestion" : "Show suggestion"}
            </button>
          )}
          {expanded && violation.suggestion && (
            <p className="mt-1.5 rounded bg-white/70 p-2 text-xs text-gray-700 border border-gray-200">
              {violation.suggestion}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
