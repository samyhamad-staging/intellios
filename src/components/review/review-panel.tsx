"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { ValidationReport } from "@/lib/governance/types";
import { VersionDiff } from "@/components/registry/version-diff";
import { Sparkles, ThumbsUp, ThumbsDown, CheckCircle, Clock } from "lucide-react";

// ── SLA helpers ───────────────────────────────────────────────────────────────

const REVIEW_SLA_DAYS = 5; // 5-day review SLA (configurable)

function ReviewSlaBadge({ submittedAt }: { submittedAt: string }) {
  const submittedMs = new Date(submittedAt).getTime();
  const elapsedMs = Date.now() - submittedMs;
  const elapsedDays = elapsedMs / (24 * 3_600_000);
  const slaRemainingDays = REVIEW_SLA_DAYS - elapsedDays;

  const waitedLabel =
    elapsedDays < 1
      ? `${Math.round(elapsedDays * 24)}h`
      : `${Math.floor(elapsedDays)}d`;

  if (slaRemainingDays <= 0) {
    const overdueDays = Math.abs(Math.floor(slaRemainingDays));
    return (
      <div className="flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-700">
        <Clock className="h-3 w-3 shrink-0" />
        <span>
          <span className="font-semibold">Overdue {overdueDays > 0 ? `${overdueDays}d` : "< 1d"}</span>
          {" · "}Waiting {waitedLabel} · SLA {REVIEW_SLA_DAYS}d
        </span>
      </div>
    );
  }

  const remainingLabel =
    slaRemainingDays < 1
      ? `${Math.round(slaRemainingDays * 24)}h`
      : `${Math.floor(slaRemainingDays)}d`;
  const isUrgent = slaRemainingDays < 1;

  return (
    <div className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs ${
      isUrgent
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-gray-100 bg-gray-50 text-gray-500"
    }`}>
      <Clock className="h-3 w-3 shrink-0" />
      <span>
        Waiting {waitedLabel}
        {" · "}SLA {REVIEW_SLA_DAYS}d
        {" · "}
        <span className={isUrgent ? "font-semibold" : ""}>{remainingLabel} remaining</span>
      </span>
    </div>
  );
}

type ReviewAction = "approve" | "reject" | "request_changes";

interface RiskBrief {
  riskLevel: "low" | "medium" | "high";
  summary: string;
  keyPoints: string[];
  recommendation: "approve" | "request_changes" | "reject";
  recommendationReason: string;
}

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
  /** Id of the prior blueprint version — if provided, a collapsible diff section is shown */
  previousBlueprintId?: string | null;
  /** Version string of the prior blueprint, e.g. "1.0.0" */
  previousVersion?: string | null;
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
  previousBlueprintId = null,
  previousVersion = null,
}: ReviewPanelProps) {
  const [selectedAction, setSelectedAction] = useState<ReviewAction | null>(null);
  const [diffExpanded, setDiffExpanded] = useState(false);
  const [rationale, setRationale] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiBrief, setAiBrief] = useState<null | "loading" | RiskBrief>(null);
  const [stepToast, setStepToast] = useState<string | null>(null);
  // P2-252: AI brief feedback
  const [briefFeedback, setBriefFeedback] = useState<"up" | "down" | null>(null);
  // P2-573: ref for scrolling to diff section
  const diffSectionRef = useRef<HTMLDivElement>(null);

  function handleExpandDiff() {
    setDiffExpanded(true);
    setTimeout(() => diffSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }

  // ── AI Risk Brief ───────────────────────────────────────────────────────────
  async function generateAiBrief() {
    setAiBrief("loading");
    try {
      const res = await fetch(`/api/blueprints/${blueprintId}/review-brief`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate brief");
      setAiBrief(data.brief as RiskBrief);
    } catch (err) {
      console.error("[review-panel] AI brief fetch failed:", err);
      setAiBrief(null);
    }
  }

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
        throw new Error(data.message ?? "Review submission failed");
      }
      if (data.nextApproverLabel) {
        // Intermediate step — show advancement toast, then notify parent
        setStepToast(`Approval submitted — advancing to ${data.nextApproverLabel}`);
        setTimeout(() => {
          setStepToast(null);
          onReviewComplete(data.status);
        }, 2000);
      } else {
        // Final step — close immediately
        onReviewComplete(data.status);
      }
      if (data.nextApproverLabel) {
        // Intermediate step — show advancement toast, then notify parent
        setStepToast(`Approval submitted — advancing to ${data.nextApproverLabel}`);
        setTimeout(() => {
          setStepToast(null);
          onReviewComplete(data.status);
        }, 2000);
      } else {
        // Final step — close immediately
        onReviewComplete(data.status);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Review submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  const riskLevelConfig = {
    low: { badge: "bg-green-100 text-green-700", label: "Low Risk" },
    medium: { badge: "bg-amber-100 text-amber-700", label: "Medium Risk" },
    high: { badge: "bg-red-100 text-red-700", label: "High Risk" },
  };
  const recConfig = {
    approve: { badge: "bg-green-100 text-green-700", label: "Approve" },
    request_changes: { badge: "bg-amber-100 text-amber-700", label: "Request Changes" },
    reject: { badge: "bg-red-100 text-red-700", label: "Reject" },
  };

  return (
    <div className="space-y-5">
      {/* P2-573: Re-review banner — shown when a prior version exists */}
      {previousBlueprintId && (
        <div className="flex items-center justify-between rounded-lg border border-violet-200 bg-violet-50 px-4 py-2.5">
          <div className="flex items-center gap-2 text-sm text-violet-800">
            <span className="text-violet-500">↔</span>
            <span>
              Re-review: <span className="font-semibold">v{previousVersion}</span>
              {" → "}
              <span className="font-semibold">v{version}</span>
            </span>
          </div>
          <button
            onClick={handleExpandDiff}
            className="text-xs font-medium text-violet-700 hover:text-violet-900 underline underline-offset-2"
          >
            See what changed ↓
          </button>
        </div>
      )}

      {/* SLA waiting badge */}
      <ReviewSlaBadge submittedAt={submittedAt} />

      {/* AI Risk Brief */}
      <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-4">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700"><Sparkles size={12} />AI Risk Brief</span>
          {aiBrief === null && (
            <button
              onClick={generateAiBrief}
              className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-white px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50 transition-colors"
            >
              <Sparkles size={11} />Generate Brief
            </button>
          )}
          {aiBrief !== null && aiBrief !== "loading" && (
            <button
              onClick={() => setAiBrief(null)}
              className="text-xs text-indigo-400 hover:text-indigo-600"
            >
              Dismiss
            </button>
          )}
        </div>
        {aiBrief === "loading" && (
          <div className="mt-3 space-y-2 animate-pulse">
            <div className="h-3 w-3/4 rounded bg-indigo-200" />
            <div className="h-3 w-full rounded bg-indigo-200" />
            <div className="h-3 w-2/3 rounded bg-indigo-200" />
            <p className="mt-2 text-xs text-indigo-400">Analyzing blueprint…</p>
          </div>
        )}
        {aiBrief !== null && aiBrief !== "loading" && (
          <div className="mt-3 space-y-3">
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${riskLevelConfig[aiBrief.riskLevel].badge}`}>
                {riskLevelConfig[aiBrief.riskLevel].label}
              </span>
              <p className="text-sm text-gray-700">{aiBrief.summary}</p>
            </div>
            {aiBrief.keyPoints.length > 0 && (
              <ul className="space-y-1">
                {aiBrief.keyPoints.map((pt, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-sm text-gray-600">
                    <span className="mt-1 shrink-0 text-indigo-400">•</span>
                    {pt}
                  </li>
                ))}
              </ul>
            )}
            <div className="flex items-center gap-2 rounded-md border border-indigo-100 bg-white px-3 py-2">
              <span className="text-xs text-gray-500">Suggested action:</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${recConfig[aiBrief.recommendation].badge}`}>
                {recConfig[aiBrief.recommendation].label}
              </span>
              <span className="text-xs text-gray-500">— {aiBrief.recommendationReason}</span>
            </div>
            {/* P2-252: AI Assessment Feedback */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-indigo-400">Was this brief accurate?</span>
              <button
                onClick={() => setBriefFeedback(briefFeedback === "up" ? null : "up")}
                title="Accurate assessment"
                className={`rounded p-1 transition-colors ${
                  briefFeedback === "up"
                    ? "bg-green-100 text-green-700"
                    : "text-indigo-300 hover:text-green-600 hover:bg-green-50"
                }`}
              >
                <ThumbsUp size={13} />
              </button>
              <button
                onClick={() => setBriefFeedback(briefFeedback === "down" ? null : "down")}
                title="Inaccurate assessment"
                className={`rounded p-1 transition-colors ${
                  briefFeedback === "down"
                    ? "bg-red-100 text-red-700"
                    : "text-indigo-300 hover:text-red-500 hover:bg-red-50"
                }`}
              >
                <ThumbsDown size={13} />
              </button>
              {briefFeedback && (
                <span className="text-xs text-indigo-400">
                  {briefFeedback === "up" ? "Thanks — helps improve future briefs." : "Noted — we'll improve risk analysis accuracy."}
                </span>
              )}
            </div>
          </div>
        )}
        {aiBrief === null && (
          <p className="mt-1.5 text-xs text-indigo-400">Generate a Claude-powered risk analysis of this blueprint before deciding.</p>
        )}
      </div>

      {/* Version diff — shown when this is a re-review (prior version exists) */}
      {previousBlueprintId && (
        <div ref={diffSectionRef} className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <button
            onClick={() => setDiffExpanded((e) => !e)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm font-medium text-gray-800">
              Changes from v{previousVersion} → v{version}
            </span>
            <span className="text-gray-400 text-xs">{diffExpanded ? "▲" : "▼"}</span>
          </button>
          {diffExpanded && (
            <div className="border-t border-gray-100 px-4 py-4">
              <VersionDiff
                blueprintId={blueprintId}
                compareWithId={previousBlueprintId}
                defaultCollapsed={false}
              />
            </div>
          )}
        </div>
      )}

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
            <div className="mt-3 border-t border-red-100 pt-2">
              <Link href="/compliance" className="text-xs text-violet-600 hover:text-violet-700">
                View policies in Governance Hub →
              </Link>
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

      {/* Step advancement toast */}
      {stepToast && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800 flex items-center gap-2">
          <CheckCircle size={14} className="shrink-0 text-green-600" />
          {stepToast}
        </div>
      )}

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
        className={`inline-flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors disabled:opacity-40 ${
          selectedAction === "approve"
            ? "bg-green-600 text-white hover:bg-green-700 disabled:bg-green-600"
            : selectedAction === "reject"
            ? "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-600"
            : selectedAction === "request_changes"
            ? "bg-amber-600 text-white hover:bg-amber-700 disabled:bg-amber-600"
            : "bg-gray-900 text-white hover:bg-gray-800"
        }`}
      >
        {selectedAction === "approve" && <ThumbsUp size={14} />}
        {selectedAction === "reject" && <ThumbsDown size={14} />}
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
