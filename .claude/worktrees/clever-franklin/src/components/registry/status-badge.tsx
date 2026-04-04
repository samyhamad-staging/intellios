"use client";

import { Badge } from "@/components/ui/badge";
import type { BadgeVariant } from "@/components/ui/badge";

type Status = "draft" | "in_review" | "approved" | "rejected" | "deprecated" | "deployed" | "suspended";

const STATUS_VARIANT: Record<Status, BadgeVariant> = {
  draft:      "neutral",
  in_review:  "info",
  approved:   "success",
  deployed:   "accent",
  rejected:   "danger",
  deprecated: "muted",
  suspended:  "danger",
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
  const s = status as Status;
  return (
    <Badge
      variant={STATUS_VARIANT[s] ?? "neutral"}
      dot
      pulse={s === "suspended"}
    >
      {STATUS_LABELS[s] ?? status}
    </Badge>
  );
}
