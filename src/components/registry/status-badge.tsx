"use client";

type Status = "draft" | "in_review" | "approved" | "rejected" | "deprecated" | "deployed" | "suspended";

const STATUS_STYLES: Record<Status, string> = {
  draft:      "bg-gray-100 text-gray-600",
  in_review:  "bg-yellow-100 text-yellow-700",
  approved:   "bg-green-100 text-green-700",
  deployed:   "bg-indigo-100 text-indigo-700",
  rejected:   "bg-red-100 text-red-700",
  deprecated: "bg-gray-200 text-gray-500",
  suspended:  "bg-red-100 text-red-700 border border-red-300",
};

const STATUS_DOT: Record<Status, string> = {
  draft:      "bg-gray-400",
  in_review:  "bg-yellow-500",
  approved:   "bg-green-500",
  deployed:   "bg-indigo-500",
  rejected:   "bg-red-500",
  deprecated: "bg-gray-400",
  suspended:  "bg-red-500 animate-pulse",
};

const STATUS_LABELS: Record<Status, string> = {
  draft:      "Draft",
  in_review:  "In Review",
  approved:   "Approved",
  deployed:   "Deployed",
  rejected:   "Rejected",
  deprecated: "Deprecated",
  suspended:  "Suspended",
};

export function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as Status];
  if (!cfg) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
        <Circle size={10} />
        {status}
      </span>
    );
  }
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[s] ?? "bg-gray-100 text-gray-600"}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[s] ?? "bg-gray-400"}`} />
      {STATUS_LABELS[s] ?? status}
    </span>
  );
}
