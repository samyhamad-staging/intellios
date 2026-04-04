"use client";

import { Badge } from "@/components/ui/badge";
import { getStatusTheme, STATUS_LABELS, type StatusLevel } from "@/lib/status-theme";

export function StatusBadge({ status }: { status: string }) {
  const s = status as StatusLevel;
  const theme = getStatusTheme(s);
  const label = STATUS_LABELS[s] ?? status;
  const shouldPulse = s === "suspended";

  return (
    <Badge
      variant={theme.badge ?? "neutral"}
      dot
      pulse={shouldPulse}
    >
      {label}
    </Badge>
  );
}
