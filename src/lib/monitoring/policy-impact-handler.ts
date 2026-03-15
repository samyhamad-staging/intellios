/**
 * Policy-change impact handler — Phase 19.
 *
 * Registers with the event bus (side-effect module, imported by audit/log.ts).
 * When any governance policy is created, updated, or deleted, this handler
 * re-checks all deployed agents in that enterprise against the new policy set.
 *
 * Each agent's updated health record is written to deployment_health, and a
 * blueprint.health_checked audit entry is dispatched — which the notification
 * handler uses to alert compliance officers on clean↔critical transitions.
 *
 * Design note: this module imports writeAuditLog from audit/log.ts, which in
 * turn imports this module as a side effect. Node.js resolves this via the
 * module cache singleton — identical pattern to notifications/handler.ts.
 */

import { registerHandler } from "@/lib/events/bus";
import type { LifecycleEvent } from "@/lib/events/types";
import { checkAllDeployedAgents } from "./health";
import { writeAuditLog } from "@/lib/audit/log";

const POLICY_EVENTS = new Set(["policy.created", "policy.updated", "policy.deleted"]);

registerHandler(async (event: LifecycleEvent): Promise<void> => {
  if (!POLICY_EVENTS.has(event.type)) return;

  const { results } = await checkAllDeployedAgents(event.enterpriseId);

  // Write one audit entry per checked agent; the notification handler will
  // pick these up and alert compliance officers on health transitions.
  for (const result of results) {
    await writeAuditLog({
      entityType:   "blueprint",
      entityId:     result.blueprintId,
      action:       "blueprint.health_checked",
      actorEmail:   "system",
      actorRole:    "system",
      enterpriseId: event.enterpriseId,
      fromState:    { healthStatus: result.previousStatus },
      toState:      { healthStatus: result.healthStatus },
      metadata: {
        agentId:        result.agentId,
        agentName:      null, // notification handler falls back to "A blueprint" when null
        errorCount:     result.errorCount,
        warningCount:   result.warningCount,
        previousStatus: result.previousStatus,
        healthStatus:   result.healthStatus,
        triggeredBy:    event.type, // e.g. "policy.updated"
      },
    });
  }
});
