"use client";

import { useState } from "react";

type ReviewAction = "approve" | "reject" | "request_changes";

interface ReviewPanelProps {
  blueprintId: string;
  agentName: string | null;
  version: string;
  submittedAt: string;
  previousComment: string | null;
  onReviewComplete: (newStatus: string) => void;
}

export function ReviewPanel({
  blueprintId,
  agentName,
  version,
  submittedAt,
  previousComment,
  onReviewComplete,
}: ReviewPanelProps) {
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitReview(action: ReviewAction) {
    if (action === "request_changes" && !comment.trim()) {
      setError("Please enter a comment explaining what changes are needed.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/blueprints/${blueprintId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, comment: comment.trim() || undefined }),
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
    <div className="space-y-6">
      {/* Summary */}
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

      {/* Previous review comment */}
      {previousComment && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-xs font-medium text-amber-700 mb-1">Previous reviewer comment</p>
          <p className="text-sm text-amber-800">{previousComment}</p>
        </div>
      )}

      {/* Review form */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          Review comment{" "}
          <span className="font-normal text-gray-400">(required for request changes)</span>
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Describe your feedback, concerns, or approval rationale..."
          disabled={submitting}
          rows={5}
          className="w-full resize-none rounded-lg border border-gray-200 p-3 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:opacity-50"
        />
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* Action buttons */}
      <div className="flex flex-col gap-2">
        <button
          onClick={() => submitReview("approve")}
          disabled={submitting}
          className="w-full rounded-lg bg-green-600 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-40 transition-colors"
        >
          {submitting ? "Submitting…" : "Approve"}
        </button>
        <button
          onClick={() => submitReview("request_changes")}
          disabled={submitting}
          className="w-full rounded-lg border border-gray-300 bg-white py-2.5 text-sm font-medium text-gray-700 hover:border-gray-500 hover:text-gray-900 disabled:opacity-40 transition-colors"
        >
          Request Changes
        </button>
        <button
          onClick={() => submitReview("reject")}
          disabled={submitting}
          className="w-full rounded-lg border border-red-200 bg-white py-2.5 text-sm font-medium text-red-600 hover:border-red-400 hover:text-red-800 disabled:opacity-40 transition-colors"
        >
          Reject
        </button>
      </div>

      <p className="text-center text-xs text-gray-400">
        Approve → Published · Request Changes → Returns to designer · Reject → Closed
      </p>
    </div>
  );
}
