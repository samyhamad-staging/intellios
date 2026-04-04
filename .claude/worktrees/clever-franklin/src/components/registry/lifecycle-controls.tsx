"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuDangerItem,
} from "@/components/ui/dropdown-menu";

type Status = "draft" | "in_review" | "approved" | "rejected" | "deprecated" | "deployed";

interface Action {
  label: string;
  next: Status;
  variant: "primary" | "secondary" | "ghost" | "destructive";
}

const ACTIONS: Record<Status, Action[]> = {
  draft: [
    { label: "Submit for Review", next: "in_review", variant: "secondary" },
    { label: "Deprecate", next: "deprecated", variant: "destructive" },
  ],
  in_review: [
    { label: "Approve", next: "approved", variant: "primary" },
    { label: "Reject", next: "rejected", variant: "destructive" },
    { label: "Deprecate", next: "deprecated", variant: "destructive" },
  ],
  approved: [
    { label: "Deploy to Production", next: "deployed", variant: "primary" },
    { label: "Deprecate", next: "deprecated", variant: "destructive" },
  ],
  deployed: [
    { label: "Deprecate", next: "deprecated", variant: "destructive" },
  ],
  rejected: [
    { label: "Deprecate", next: "deprecated", variant: "destructive" },
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
  const primaryActions = actions.filter((a) => a.next !== "deprecated" && a.next !== "rejected");
  const dangerActions = actions.filter((a) => a.next === "deprecated" || a.next === "rejected");

  if (actions.length === 0 && !canCreateNewVersion) return null;

  const handleTransition = async (next: Status) => {
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

  const handleCreateNewVersion = async () => {
    setCreatingVersion(true);
    setError(null);
    try {
      const res = await fetch(`/api/blueprints/${blueprintId}/new-version`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create new version");
      }
      router.push(`/registry/${agentId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create new version");
      setCreatingVersion(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        {primaryActions.map((action) => (
          <Button
            key={action.next}
            variant={action.variant}
            size="md"
            onClick={() => handleTransition(action.next)}
            disabled={transitioning || creatingVersion}
          >
            {transitioning ? "…" : action.label}
          </Button>
        ))}
        {canCreateNewVersion && (
          <Button
            variant="secondary"
            size="md"
            onClick={handleCreateNewVersion}
            disabled={transitioning || creatingVersion}
          >
            {creatingVersion ? "Creating…" : "Create New Version"}
          </Button>
        )}
        {dangerActions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="md" title="More actions" aria-label="More actions" disabled={transitioning || creatingVersion}>
                ⋯
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {dangerActions.map((action) => (
                <DropdownMenuDangerItem
                  key={action.next}
                  onSelect={() => handleTransition(action.next)}
                >
                  {action.label}
                </DropdownMenuDangerItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
