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
    { label: "Submit for Review", next: "in_review", style: "bg-yellow-600 hover:bg-yellow-700 text-white" },
    { label: "Deprecate", next: "deprecated", style: "bg-gray-400 hover:bg-gray-500 text-white" },
  ],
  in_review: [
    { label: "Approve", next: "approved", style: "bg-green-600 hover:bg-green-700 text-white" },
    { label: "Reject", next: "rejected", style: "bg-red-600 hover:bg-red-700 text-white" },
    { label: "Deprecate", next: "deprecated", style: "bg-gray-400 hover:bg-gray-500 text-white" },
  ],
  approved: [
    { label: "Deploy to Production", next: "deployed", style: "bg-indigo-600 hover:bg-indigo-700 text-white" },
    { label: "Deprecate", next: "deprecated", style: "bg-gray-400 hover:bg-gray-500 text-white" },
  ],
  deployed: [
    { label: "Deprecate", next: "deprecated", style: "bg-gray-400 hover:bg-gray-500 text-white" },
  ],
  rejected: [
    { label: "Deprecate", next: "deprecated", style: "bg-gray-400 hover:bg-gray-500 text-white" },
  ],
  deprecated: [],
};

interface LifecycleControlsProps {
  blueprintId: string;
  currentStatus: string;
  onStatusChange: (newStatus: Status) => void;
}

export function LifecycleControls({
  blueprintId,
  currentStatus,
  onStatusChange,
}: LifecycleControlsProps) {
  const router = useRouter();
  const [transitioning, setTransitioning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const actions = ACTIONS[currentStatus as Status] ?? [];

  if (actions.length === 0) return null;

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
        throw new Error(data.error ?? "Transition failed");
      }
      onStatusChange(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transition failed");
    } finally {
      setTransitioning(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <button
            key={action.next}
            onClick={() => handleTransition(action.next)}
            disabled={transitioning}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${action.style}`}
          >
            {transitioning ? "..." : action.label}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
