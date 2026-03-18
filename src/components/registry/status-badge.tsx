"use client";

type Status = "draft" | "in_review" | "approved" | "rejected" | "deprecated" | "deployed";

const STATUS_STYLES: Record<Status, string> = {
  draft:      "badge-draft",
  in_review:  "badge-review",
  approved:   "badge-approved",
  deployed:   "badge-deployed",
  rejected:   "badge-rejected",
  deprecated: "badge-deprecated",
};

const STATUS_DOT: Record<Status, string> = {
  draft:      "dot-draft",
  in_review:  "dot-review",
  approved:   "dot-approved",
  deployed:   "dot-deployed",
  rejected:   "dot-rejected",
  deprecated: "dot-deprecated",
};

const STATUS_LABELS: Record<Status, string> = {
  draft:      "Draft",
  in_review:  "In Review",
  approved:   "Approved",
  deployed:   "Deployed",
  rejected:   "Rejected",
  deprecated: "Deprecated",
};

export function StatusBadge({ status }: { status: string }) {
  const s = status as Status;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[s] ?? "bg-gray-100 text-gray-600"}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[s] ?? "bg-gray-400"}`} />
      {STATUS_LABELS[s] ?? status}
    </span>
  );
}
