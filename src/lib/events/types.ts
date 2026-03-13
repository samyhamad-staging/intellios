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
  | "intake.finalized"
  | "intake.contribution_submitted"
  | "policy.created";

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
