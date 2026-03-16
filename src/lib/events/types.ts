/**
 * Lifecycle event types — map 1:1 to audit log action strings.
 * Every event that flows through writeAuditLog becomes a LifecycleEvent
 * dispatched to the event bus for downstream consumers (notifications,
 * SLA monitoring, future analytics / webhooks).
 */

export type EventType =
  | "blueprint.created"
  | "blueprint.refined"
  | "blueprint.status_changed"
  | "blueprint.reviewed"
  | "blueprint.report_exported"
  | "blueprint.health_checked"
  | "blueprint.cloned"
  | "blueprint.approval_step_completed"
  | "blueprint.test_run_completed"
  | "blueprint.agentcore_exported"
  | "blueprint.agentcore_deployed"
  | "blueprint.compliance_exported"
  | "blueprint.simulated"
  | "blueprint.code_exported"
  | "blueprint.red_team_run"
  | "intake.finalized"
  | "intake.contribution_submitted"
  | "policy.created"
  | "policy.updated"
  | "policy.deleted"
  | "policy.simulated"
  | "settings.updated"
  | "blueprint.periodic_review_scheduled"
  | "blueprint.periodic_review_completed"
  | "blueprint.periodic_review_reminder";

export interface LifecycleEvent {
  /** Audit log row ID — can be used to correlate with the audit trail */
  auditId: string;
  type: EventType;
  actorEmail: string;
  actorRole: string;
  entityType: "blueprint" | "intake_session" | "policy";
  entityId: string;
  enterpriseId: string | null;
  fromState: Record<string, unknown> | null;
  toState: Record<string, unknown> | null;
  /**
   * Structured metadata from the originating route.
   * Blueprint status changes include: { createdBy, agentName, agentId }
   * Blueprint reviews include:        { reviewAction, comment, createdBy, agentName, agentId }
   */
  metadata: Record<string, unknown> | null;
  timestamp: string; // ISO 8601
}

export type EventHandler = (event: LifecycleEvent) => Promise<void>;
