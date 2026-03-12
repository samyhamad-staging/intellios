"use client";

type Status = "draft" | "in_review" | "approved" | "rejected" | "deprecated";

const STATUS_STYLES: Record<Status, string> = {
  draft: "bg-gray-100 text-gray-600",
  in_review: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  deprecated: "bg-gray-200 text-gray-500",
};

const STATUS_LABELS: Record<Status, string> = {
  draft: "Draft",
  in_review: "In Review",
  approved: "Approved",
  rejected: "Rejected",
  deprecated: "Deprecated",
};

export function StatusBadge({ status }: { status: string }) {
  const s = status as Status;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[s] ?? "bg-gray-100 text-gray-600"}`}
    >
      {STATUS_LABELS[s] ?? status}
    </span>
  );
}
