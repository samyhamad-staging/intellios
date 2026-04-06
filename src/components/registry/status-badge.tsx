"use client";

import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";
import { getStatusTheme, STATUS_LABELS, type StatusLevel } from "@/lib/status-theme";

const STATUS_TOOLTIPS: Record<StatusLevel, string> = {
  draft: "This blueprint is still being worked on. Submit it for review when ready.",
  in_review: "This blueprint is awaiting reviewer approval.",
  approved: "This blueprint has passed review and is ready to deploy.",
  deployed: "This agent is live in production.",
  suspended: "This agent has been temporarily suspended.",
  rejected: "This blueprint was rejected during review. Create a new version to resubmit.",
  deprecated: "This agent has been deprecated and is no longer active.",
};

export function StatusBadge({ status }: { status: string }) {
  const s = status as StatusLevel;
  const theme = getStatusTheme(s);
  const label = STATUS_LABELS[s] ?? status;
  const shouldPulse = s === "suspended";
  const tooltip = STATUS_TOOLTIPS[s] ?? "";

  return (
    <Tooltip content={tooltip}>
      <Badge
        variant={theme.badge ?? "neutral"}
        dot
        pulse={shouldPulse}
      >
        {label}
      </Badge>
    </Tooltip>
  );
}
