"use client";

import { Archive, CheckCircle, Circle, Clock, XCircle, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Status = "draft" | "in_review" | "approved" | "rejected" | "deprecated" | "deployed";

const STATUS_CONFIG: Record<Status, { badge: string; icon: LucideIcon; label: string }> = {
  draft:      { badge: "badge-draft",      icon: Circle,       label: "Draft"      },
  in_review:  { badge: "badge-review",     icon: Clock,        label: "In Review"  },
  approved:   { badge: "badge-approved",   icon: CheckCircle,  label: "Approved"   },
  deployed:   { badge: "badge-deployed",   icon: Zap,          label: "Deployed"   },
  rejected:   { badge: "badge-rejected",   icon: XCircle,      label: "Rejected"   },
  deprecated: { badge: "badge-deprecated", icon: Archive,      label: "Deprecated" },
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
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.badge}`}>
      <Icon size={10} strokeWidth={2.5} />
      {cfg.label}
    </span>
  );
}
