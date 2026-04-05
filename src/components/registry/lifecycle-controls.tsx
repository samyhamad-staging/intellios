"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/catalyst/button";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuDangerItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogTitle, DialogDescription, DialogBody, DialogActions,
} from "@/components/catalyst/dialog";
import { queryKeys } from "@/lib/query/keys";
import type { RegistryEntry } from "@/lib/query/fetchers";

type Status = "draft" | "in_review" | "approved" | "rejected" | "deprecated" | "deployed" | "suspended";

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
    { label: "Suspend", next: "suspended", variant: "destructive" },
    { label: "Deprecate", next: "deprecated", variant: "destructive" },
  ],
  // H2-1.4: Suspended agents can be resumed (restart review workflow) or deprecated.
  suspended: [
    { label: "Resume Agent", next: "in_review", variant: "primary" },
    { label: "Deprecate", next: "deprecated", variant: "destructive" },
  ],
  rejected: [
    { label: "Deprecate", next: "deprecated", variant: "destructive" },
  ],
  deprecated: [],
};

/** Map legacy variant names to Catalyst Button props */
function variantToCatalystProps(variant: Action["variant"]): { color?: "indigo" | "red"; outline?: true; plain?: true } {
  switch (variant) {
    case "primary":     return { color: "indigo" };
    case "secondary":   return { outline: true };
    case "ghost":       return { plain: true };
    case "destructive": return { color: "red" };
    default:            return { outline: true };
  }
}

// Confirmation messages for actions that need a dialog — both dangerous and significant.
const DANGER_MESSAGES: Partial<Record<Status, { title: string; description: string; confirm: string; confirmColor?: "red" | "indigo" }>> = {
  deprecated: {
    title: "Deprecate this blueprint?",
    description:
      "Deprecating this blueprint marks it as no longer active. Agents running on it may need to be migrated. This action cannot be undone.",
    confirm: "Deprecate",
    confirmColor: "red",
  },
  rejected: {
    title: "Reject this blueprint?",
    description:
      "Rejecting this blueprint will return it to the author for revision. They will be notified and can submit a revised version for review.",
    confirm: "Reject",
    confirmColor: "red",
  },
  suspended: {
    title: "Suspend this agent?",
    description:
      "Suspending this agent immediately pauses it. No new requests will be processed until an administrator resumes it. The agent will remain deployed but inactive.",
    confirm: "Suspend Agent",
    confirmColor: "red",
  },
  // "in_review" from suspended = Resume action
  in_review: {
    title: "Resume this agent?",
    description:
      "Resuming will restart the approval workflow from the beginning. The agent will enter review status and must be re-approved before it can be redeployed. Only resume after you have investigated and resolved the root cause of the suspension.",
    confirm: "Resume Agent",
    confirmColor: "indigo",
  },
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
  const queryClient = useQueryClient();
  const [creatingVersion, setCreatingVersion] = useState(false);
  const [pendingAction, setPendingAction] = useState<Status | null>(null);

  const actions = ACTIONS[currentStatus as Status] ?? [];
  const canCreateNewVersion = currentStatus === "approved" || currentStatus === "deployed";
  // Primary actions = non-destructive and not "suspend" (which goes in the danger dropdown)
  const primaryActions = actions.filter((a) => a.variant === "primary" || a.variant === "secondary");
  const dangerActions = actions.filter((a) => a.variant === "destructive");

  if (actions.length === 0 && !canCreateNewVersion) return null;

  // ── Optimistic status transition ──────────────────────────────────────────
  const statusMutation = useMutation({
    mutationFn: async (next: Status) => {
      const res = await fetch(`/api/blueprints/${blueprintId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Transition failed");
      }
      return res.json();
    },
    onMutate: async (nextStatus) => {
      // Cancel any in-flight refetches so they don't overwrite the optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeys.registry.agents() });
      // Snapshot the previous agents list for rollback
      const previousAgents = queryClient.getQueryData<RegistryEntry[]>(
        queryKeys.registry.agents()
      );
      // Optimistically patch the agents list cache
      if (previousAgents) {
        queryClient.setQueryData<RegistryEntry[]>(
          queryKeys.registry.agents(),
          previousAgents.map((a) =>
            a.agentId === agentId ? { ...a, status: nextStatus } : a
          )
        );
      }
      // Immediately update the detail page UI — no wait for server round-trip
      onStatusChange(nextStatus);
      return { previousAgents, previousStatus: currentStatus };
    },
    onError: (_err, _nextStatus, context) => {
      // Rollback: restore cache snapshot
      if (context?.previousAgents !== undefined) {
        queryClient.setQueryData(queryKeys.registry.agents(), context.previousAgents);
      }
      // Rollback: restore UI to previous status
      if (context?.previousStatus) {
        onStatusChange(context.previousStatus as Status);
      }
    },
    onSettled: () => {
      // Background reconcile — picks up any server-side side-effects
      void queryClient.invalidateQueries({ queryKey: queryKeys.registry.agents() });
    },
  });

  const handleTransition = (next: Status) => {
    if (next === "deployed") {
      router.push("/deploy");
      return;
    }
    statusMutation.mutate(next);
  };

  const handleDangerSelect = (next: Status) => {
    // Show confirmation dialog for any action that has a message (danger OR significant)
    if (DANGER_MESSAGES[next]) {
      setPendingAction(next);
    } else {
      handleTransition(next);
    }
  };

  const handlePrimarySelect = (next: Status) => {
    // "Resume Agent" (suspended → in_review) requires confirmation.
    // Other primary actions (e.g. "Submit for Review" from draft → in_review) do not.
    if (next === "in_review" && currentStatus === "suspended") {
      setPendingAction("in_review");
      return;
    }
    handleTransition(next);
  };

  const handleConfirm = () => {
    if (pendingAction) {
      handleTransition(pendingAction);
      setPendingAction(null);
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

  const confirmMsg = pendingAction ? DANGER_MESSAGES[pendingAction] : null;

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          {primaryActions.map((action) => (
            <Button
              key={action.next}
              {...variantToCatalystProps(action.variant)}
              onClick={() => handlePrimarySelect(action.next)}
              disabled={statusMutation.isPending || creatingVersion}
            >
              {statusMutation.isPending ? "…" : action.label}
            </Button>
          ))}
          {canCreateNewVersion && (
            <Button
              outline
              onClick={handleCreateNewVersion}
              disabled={statusMutation.isPending || creatingVersion}
            >
              {creatingVersion ? "Creating…" : "Create New Version"}
            </Button>
          )}
          {dangerActions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  plain
                  title="More actions"
                  aria-label="More actions"
                  disabled={statusMutation.isPending || creatingVersion}
                >
                  ⋯
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {dangerActions.map((action) => (
                  <DropdownMenuDangerItem
                    key={action.next}
                    onSelect={() => handleDangerSelect(action.next)}
                  >
                    {action.label}
                  </DropdownMenuDangerItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        {statusMutation.error && (
          <p className="text-xs text-danger">
            {statusMutation.error instanceof Error
              ? statusMutation.error.message
              : "Transition failed"}
          </p>
        )}
      </div>

      {/* Destructive action confirmation dialog */}
      <Dialog open={pendingAction !== null} onClose={() => setPendingAction(null)}>
        <DialogTitle>{confirmMsg?.title}</DialogTitle>
        <DialogDescription>{confirmMsg?.description}</DialogDescription>
        <DialogBody />
        <DialogActions>
          <Button plain onClick={() => setPendingAction(null)}>
            Cancel
          </Button>
          <Button color={confirmMsg?.confirmColor ?? "red"} onClick={handleConfirm} disabled={statusMutation.isPending}>
            {statusMutation.isPending ? "Processing…" : confirmMsg?.confirm}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
