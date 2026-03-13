"use client";

import { useState } from "react";
import { ValidationReport } from "@/lib/governance/types";

type ReviewAction = "approve" | "reject" | "request_changes";

interface ReviewPanelProps {
  blueprintId: string;
  agentName: string | null;
  version: string;
  submittedAt: string;
  previousComment: string | null;
  validationReport: ValidationReport | null;
  createdBy: string | null;
  currentUserEmail: string | null;
  onReviewComplete: (newStatus: string) => void;
}

const ACTIONS: {
  id: ReviewAction;
  label: string;
  description: string;
  buttonStyle: string;
  resultLabel: string;
}[] = [
  {
    id: "approve",
    label: "Approve",
    description: "Blueprint passes review — moves to Approved",
    buttonStyle: "border-green-300 bg-green-50 text-green-800 hover:bg-green-100",
    resultLabel: "Approved",
  },
  {
    id: "request_changes",
    label: "Request Changes",
    description: "Return to designer with feedback — moves back to Draft",
    buttonStyle: "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100",
    resultLabel: "Changes Requested",
  },
  {
    id: "reject",
    label: "Reject",
    description: "Permanently reject this blueprint — moves to Rejected",
    buttonStyle: "border-red-200 bg-red-50 text-red-800 hover:bg-red-100",
    resultLabel: "Rejected",
  },
];

export function ReviewPanel({
  blueprintId,
  agentName,
  version,
  submittedAt,
  previousComment,
  validationReport,
  createdBy,
  currentUserEmail,
  onReviewComplete,
}: ReviewPanelProps) {
  const [selectedAction, setSelectedAction] = useState<ReviewAction | null>(null);
  const [rationale, setRationale] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── SOD check ───────────────────────────────────────────────────────────────
  const isSodViolation =
    currentUserEmail &&
    createdBy &&
    currentUserEmail === createdBy;

  // ── Governance summary ──────────────────────────────────────────────────────
  const errorCount = validationReport?.violations.filter((v) => v.severity === "error").length ?? 0;
  const warnCount = validationReport?.violations.filter((v) => v.severity === "warning").length ?? 0;

  // ── Submit ──────────────────────────────────────────────────────────────────
  async function submitReview() {
    if (!selectedAction) return;
    if (!rationale.trim()) {
      setError("Rationale is required for all review decisions.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/blueprints/${blueprintId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: selectedAction, comment: rationale.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Review submission failed");
      }
      onReviewComplete(data.status);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Review submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Agent summary header */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
        <div className="flex items-baseline justify-between">
          <span className="font-medium text-gray-900">
            {agentName ?? "Unnamed Agent"} — v{version}
          </span>
          <span className="text-xs text-gray-400">
            Submitted {new Date(submittedAt).toLocaleString()}
          </span>
        </div>
      </div>

      {/* SOD warning */}
      {isSodViolation && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
          <span className="shrink-0 text-amber-600">⚠</span>
          <div>
            <p className="text-sm font-medium text-amber-800">Separation of Duties Notice</p>
            <p className="mt-0.5 text-xs text-amber-700">
              You designed this agent ({createdBy}). Enterprise policy requires a different reviewer
              to approve it. Proceed only if no other reviewer is available and document the exception in your rationale.
            </p>
          </div>
        </div>
      )}

      {/* Governance report summary */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
          Governance Status
        </p>
        {!validationReport ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-400">
            Not yet validated. Run validation in the Blueprint Workbench or Governance tab before approving.
          </div>
        ) : validationReport.valid ? (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3">
            <p className="text-sm font-medium text-green-800">
              ✓ Passes governance — {validationReport.policyCount} polic{validationReport.policyCount === 1 ? "y" : "ies"} checked
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm font-medium text-red-800">
              ✗ {errorCount} error{errorCount !== 1 ? "s" : ""}
              {warnCount > 0 && `, ${warnCount} warning${warnCount !== 1 ? "s" : ""}`}
            </p>
            <div className="mt-2 space-y-1.5">
              {validationReport.violations.map((v, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 font-medium ${
                      v.severity === "error"
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {v.severity}
                  </span>
                  <span className="text-red-800">{v.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Previous review comment */}
      {previousComment && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-xs font-medium text-amber-700 mb-1">Previous reviewer comment</p>
          <p className="text-sm text-amber-800">{previousComment}</p>
        </div>
      )}

      {/* Decision — radio buttons */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
          Decision
        </p>
        <div className="space-y-2">
          {ACTIONS.map((action) => (
            <label
              key={action.id}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 transition-colors ${
                selectedAction === action.id
                  ? action.buttonStyle + " ring-2 ring-offset-1 ring-current"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="review-action"
                value={action.id}
                checked={selectedAction === action.id}
                onChange={() => {
                  setSelectedAction(action.id);
                  setError(null);
                }}
                className="mt-0.5 shrink-0 accent-gray-900"
              />
              <div>
                <p className="text-sm font-medium text-gray-900">{action.label}</p>
                <p className="text-xs text-gray-500">{action.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Rationale — required for all decisions */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
          Rationale{" "}
          <span className="text-red-500">*</span>
          <span className="ml-1 normal-case font-normal text-gray-400">required</span>
        </label>
        <textarea
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          placeholder={
            selectedAction === "approve"
              ? "Describe why this blueprint meets requirements and is ready to deploy…"
              : selectedAction === "reject"
              ? "Explain why this blueprint is being rejected and cannot proceed…"
              : "Describe what must change before this can be approved…"
          }
          disabled={submitting}
          rows={4}
          className="w-full resize-none rounded-lg border border-gray-200 p-3 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:opacity-50"
        />
        <p className="mt-1 text-xs text-gray-400">
          This rationale is stored in the audit log and visible to the designer.
        </p>
      </div>

      {/* Error */}
      {error && (
        <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* Submit button */}
      <button
        onClick={submitReview}
        disabled={!selectedAction || !rationale.trim() || submitting}
        className={`w-full rounded-lg py-2.5 text-sm font-medium transition-colors disabled:opacity-40 ${
          selectedAction === "approve"
            ? "bg-green-600 text-white hover:bg-green-700 disabled:bg-green-600"
            : selectedAction === "reject"
            ? "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-600"
            : selectedAction === "request_changes"
            ? "bg-amber-600 text-white hover:bg-amber-700 disabled:bg-amber-600"
            : "bg-gray-900 text-white hover:bg-gray-800"
        }`}
      >
        {submitting
          ? "Submitting…"
          : selectedAction
          ? `Submit — ${ACTIONS.find((a) => a.id === selectedAction)?.resultLabel}`
          : "Select a decision above"}
      </button>

      <p className="text-center text-xs text-gray-400">
        Approve → Published · Request Changes → Returns to designer · Reject → Closed
      </p>
    </div>
  );
}
