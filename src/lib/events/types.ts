/**
 * Typed event definitions for the Intellios lifecycle event system.
 *
 * `IntelliosEvent` is the authoritative discriminated union — every event type
 * is listed here with a fully typed `payload`. This is the single source of
 * truth for both `EventType` and `AuditAction`.
 *
 * Backward-compatibility notes:
 * - `EventType` is derived from `IntelliosEvent["type"]` — identical union.
 * - `LifecycleEvent` retains its existing shape so all registered handlers
 *   compile without modification.
 * - `EventEnvelope` is the new canonical event wrapper (used by H1-4.2+).
 */

// ── Per-event payload types ──────────────────────────────────────────────────

export type IntelliosEvent =
  | {
      type: "blueprint.created";
      payload: { blueprintId: string; agentId: string; name: string; createdBy: string };
    }
  | {
      type: "blueprint.refined";
      payload: { blueprintId: string; agentId: string; name: string; createdBy: string };
    }
  | {
      type: "blueprint.status_changed";
      payload: {
        blueprintId: string;
        fromStatus: string;
        toStatus: string;
        agentId: string;
        agentName: string;
        createdBy: string;
      };
    }
  | {
      type: "blueprint.reviewed";
      payload: {
        blueprintId: string;
        decision: string;
        reviewer: string;
        comment: string | null;
        agentId: string;
        agentName: string;
        createdBy: string;
      };
    }
  | {
      type: "blueprint.report_exported";
      payload: { blueprintId: string; agentId: string; agentName: string };
    }
  | {
      type: "blueprint.health_checked";
      payload: {
        blueprintId: string;
        agentId: string;
        agentName: string;
        healthStatus: string;
        previousStatus: string | null;
        errorCount: number;
      };
    }
  | {
      type: "blueprint.cloned";
      payload: {
        originalBlueprintId: string;
        newBlueprintId: string;
        agentId: string;
        agentName: string;
      };
    }
  | {
      type: "blueprint.approval_step_completed";
      payload: {
        blueprintId: string;
        agentId: string;
        agentName: string;
        step: number;
        label: string;
        nextApproverRole: string | null;
        nextApproverLabel: string | null;
      };
    }
  | {
      type: "blueprint.test_run_completed";
      payload: { blueprintId: string; agentId: string; testCaseId: string; passed: boolean };
    }
  | {
      type: "blueprint.agentcore_exported";
      payload: { blueprintId: string; agentId: string };
    }
  | {
      type: "blueprint.agentcore_deployed";
      payload: { blueprintId: string; agentId: string; deploymentId: string | null };
    }
  | {
      type: "blueprint.compliance_exported";
      payload: { blueprintId: string; agentId: string };
    }
  | {
      type: "blueprint.simulated";
      payload: { blueprintId: string; agentId: string; agentName: string };
    }
  | {
      type: "blueprint.code_exported";
      payload: { blueprintId: string; agentId: string };
    }
  | {
      type: "blueprint.red_team_run";
      payload: { blueprintId: string; agentId: string; agentName: string };
    }
  | {
      type: "blueprint.created_from_template";
      payload: {
        blueprintId: string;
        agentId: string;
        name: string;
        createdBy: string;
        templateId: string;
      };
    }
  | {
      type: "blueprint.regenerated";
      payload: { blueprintId: string; agentId: string; agentName: string };
    }
  | {
      type: "blueprint.evidence_package_exported";
      payload: { blueprintId: string; agentId: string };
    }
  | {
      type: "blueprint.periodic_review_scheduled";
      payload: { blueprintId: string; agentId: string; agentName: string; nextReviewAt: string };
    }
  | {
      type: "blueprint.periodic_review_completed";
      payload: { blueprintId: string; agentId: string; agentName: string };
    }
  | {
      type: "blueprint.periodic_review_reminder";
      payload: { blueprintId: string; agentId: string; agentName: string };
    }
  | {
      type: "intake.finalized";
      payload: { sessionId: string; agentName: string; createdBy: string };
    }
  | {
      type: "intake.contribution_submitted";
      payload: {
        sessionId: string;
        domain: string;
        raciRole: string;
        sessionCreatedBy: string;
      };
    }
  | {
      type: "intake.invitation_sent";
      payload: { sessionId: string; inviteeEmail: string; raciRole: string };
    }
  | {
      type: "policy.created";
      payload: { policyId: string; name: string; type: string };
    }
  | {
      type: "policy.updated";
      payload: { policyId: string; name: string };
    }
  | {
      type: "policy.deleted";
      payload: { policyId: string; name: string };
    }
  | {
      type: "policy.simulated";
      payload: { policyId: string | null };
    }
  | {
      type: "settings.updated";
      payload: { enterpriseId: string };
    }
  | {
      type: "blueprint.threshold_alert";
      payload: {
        agentId: string;
        blueprintId: string;
        agentName: string;
        metric: string;
        operator: string;
        threshold: number;
        currentValue: number;
        windowMinutes: number;
      };
    }
  | {
      type: "blueprint.runtime_violation";
      payload: {
        agentId: string;
        blueprintId: string;
        agentName: string;
        policyId: string;
        policyName: string;
        ruleId: string;
        severity: string;
        metric: string;
        observedValue: number;
        threshold: number;
        message: string;
      };
    }
  | {
      type: "blueprint.quality_regression";
      payload: {
        agentId: string;
        blueprintId: string;
        agentName: string;
        designScore: number;
        productionScore: number;
        gap: number; // designScore - productionScore
        weekStart: string; // ISO date
      };
    }
  | {
      // H3-3.1: Governance drift detected — new policy violations since approval
      type: "blueprint.governance_drift_detected";
      payload: {
        blueprintId: string;
        agentId: string;
        agentName: string;
        newViolationCount: number;
      };
    }
  | {
      // H3-3.2: AI fix suggestion generated for a blueprint
      type: "blueprint.fix_suggested";
      payload: {
        blueprintId: string;
        violationCount: number;
        changeCount: number;
      };
    }
  | {
      type: "workflow.status_changed";
      payload: {
        workflowId: string;
        name: string;
        fromStatus: string;
        toStatus: string;
        changedBy: string;
      };
    }
  | {
      type: "workflow.reviewed";
      payload: {
        workflowId: string;
        name: string;
        decision: "approve" | "reject";
        reviewer: string;
        comment: string | null;
      };
    };

// ── Derived types ─────────────────────────────────────────────────────────────

/**
 * Union of all event type strings — derived from `IntelliosEvent` so it is
 * always in sync. Previously a hand-maintained string union; now a single
 * source of truth.
 */
export type EventType = IntelliosEvent["type"];

/**
 * Canonical event envelope — wraps a typed `IntelliosEvent` with correlation
 * metadata. Used by `publishEvent()` (H1-4.2) and the Event Filtering API
 * (H1-4.3). Not yet the primary dispatch shape — `LifecycleEvent` is still
 * used by registered handlers for backward compatibility.
 */
export interface EventEnvelope {
  /** UUID for this delivery — stable across retries */
  id: string;
  /** The typed event (discriminated union) */
  event: IntelliosEvent;
  /** ISO 8601 timestamp from the originating audit log entry */
  timestamp: string;
  enterpriseId: string | null;
  actor: {
    email: string;
    role: string;
  };
  entity: {
    type: "blueprint" | "intake_session" | "policy";
    id: string;
  };
}

// ── Backward-compatible handler interface ─────────────────────────────────────

/**
 * Low-level event dispatched to in-process handlers after each `writeAuditLog()`
 * call. Retains its existing shape so all registered handlers (`notifications`,
 * `webhooks`, `policy-impact-handler`, `quality-evaluator`) compile without
 * modification.
 *
 * Migration path: handlers will be updated in H1-4.2 to accept `EventEnvelope`
 * instead, at which point `LifecycleEvent` can be removed.
 */
export interface LifecycleEvent {
  /** Audit log row ID — authoritative correlation identifier */
  auditId: string;
  type: EventType;
  actorEmail: string;
  actorRole: string;
  entityType: "blueprint" | "intake_session" | "policy" | "workflow";
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
