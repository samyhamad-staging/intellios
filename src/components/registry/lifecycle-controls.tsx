"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Status = "draft" | "in_review" | "approved" | "rejected" | "deprecated" | "deployed";

interface Action {
  label: string;
  next: Status;
  style: string;
}

const ACTIONS: Record<Status, Action[]> = {
  draft: [
    { label: "Submit for Review", next: "in_review", style: "btn-action-review" },
    { label: "Deprecate", next: "deprecated", style: "btn-action-deprecate" },
  ],
  in_review: [
    { label: "Approve", next: "approved", style: "btn-action-approve" },
    { label: "Reject", next: "rejected", style: "btn-action-reject" },
    { label: "Deprecate", next: "deprecated", style: "btn-action-deprecate" },
  ],
  approved: [
    { label: "Deploy to Production", next: "deployed", style: "btn-action-deploy" },
    { label: "Deprecate", next: "deprecated", style: "btn-action-deprecate" },
  ],
  deployed: [
    { label: "Deprecate", next: "deprecated", style: "btn-action-deprecate" },
  ],
  rejected: [
    { label: "Deprecate", next: "deprecated", style: "btn-action-deprecate" },
  ],
  deprecated: [],
};

interface LifecycleControlsProps {
  blueprintId: string;
  agentId: string;
  currentStatus: string;
  onStatusChange: (newStatus: Status) => void;
}

export function LifecycleControls({
  blueprintId,
  agentId,
  currentStatus,
  onStatusChange,
}: LifecycleControlsProps) {
  const router = useRouter();
  const [transitioning, setTransitioning] = useState(false);
  const [creatingVersion, setCreatingVersion] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const actions = ACTIONS[currentStatus as Status] ?? [];
  const canCreateNewVersion = currentStatus === "approved" || currentStatus === "deployed";

  if (actions.length === 0 && !canCreateNewVersion) return null;

  const handleTransition = async (next: Status) => {
    // Deployments must go through the Deployment Console where a change
    // reference number and authorization acknowledgment are required.
    // This prevents bypassing the change management gate from this surface.
    if (next === "deployed") {
      router.push("/deploy");
      return;
    }

    setTransitioning(true);
    setError(null);
    try {
      const res = await fetch(`/api/blueprints/${blueprintId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message ?? "Transition failed");
      }
      onStatusChange(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transition failed");
    } finally {
      setTransitioning(false);
    }
  };

  const handleCreateNewVersion = async () => {
    setCreatingVersion(true);
    setError(null);
    try {
      const res = await fetch(`/api/blueprints/${blueprintId}/new-version`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message ?? "Failed to create new version");
      }
      router.push(`/registry/${agentId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create new version");
      setCreatingVersion(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <button
            key={action.next}
            onClick={() => handleTransition(action.next)}
            disabled={transitioning || creatingVersion}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${action.style}`}
          >
            {transitioning ? "..." : action.label}
          </button>
        ))}
        {canCreateNewVersion && (
          <button
            onClick={handleCreateNewVersion}
            disabled={transitioning || creatingVersion}
            className="rounded-lg border border-violet-300 px-3 py-1.5 text-sm font-medium text-violet-700 transition-colors hover:bg-violet-50 disabled:opacity-50"
          >
            {creatingVersion ? "Creating…" : "Create New Version"}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
