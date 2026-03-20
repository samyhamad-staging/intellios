import { db } from "@/lib/db";
import { auditLog } from "@/lib/db/schema";
import { dispatch } from "@/lib/events/bus";
import type { IntelliosEvent } from "@/lib/events/types";

// Side-effect imports: register event handlers with the event bus.
// Guaranteed to run on every request that writes an audit entry.
import "@/lib/notifications/handler";
import "@/lib/monitoring/policy-impact-handler";
import "@/lib/webhooks/dispatch";
import "@/lib/awareness/quality-evaluator";

/**
 * Derived from `IntelliosEvent["type"]` — single source of truth.
 * Previously a hand-maintained duplicate of `EventType`; now kept in sync
 * automatically whenever a new variant is added to `IntelliosEvent`.
 */
export type AuditAction = IntelliosEvent["type"];

export interface AuditEntry {
  entityType: "blueprint" | "intake_session" | "policy";
  entityId: string;
  action: AuditAction;
  actorEmail: string;
  actorRole: string;
  enterpriseId?: string | null;
  fromState?: Record<string, unknown> | null;
  toState?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Write an immutable audit log entry, then dispatch a LifecycleEvent to the
 * in-process event bus (notification handler is registered via side-effect import
 * above).  Fire-and-forget: errors are logged but never thrown — audit failure
 * must not block the primary operation.
 */
export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  try {
    const [row] = await db
      .insert(auditLog)
      .values({
        entityType: entry.entityType,
        entityId: entry.entityId,
        action: entry.action,
        actorEmail: entry.actorEmail,
        actorRole: entry.actorRole,
        enterpriseId: entry.enterpriseId ?? null,
        fromState: entry.fromState ?? null,
        toState: entry.toState ?? null,
        metadata: entry.metadata ?? null,
      })
      .returning({ id: auditLog.id, createdAt: auditLog.createdAt });

    // Dispatch lifecycle event — fire-and-forget so handler errors never block
    // the caller. The audit row id is the authoritative correlation id.
    void dispatch({
      auditId: row.id,
      type: entry.action,
      actorEmail: entry.actorEmail,
      actorRole: entry.actorRole,
      entityType: entry.entityType,
      entityId: entry.entityId,
      enterpriseId: entry.enterpriseId ?? null,
      fromState: (entry.fromState as Record<string, unknown>) ?? null,
      toState: (entry.toState as Record<string, unknown>) ?? null,
      metadata: (entry.metadata as Record<string, unknown>) ?? null,
      timestamp: row.createdAt.toISOString(),
    });
  } catch (err) {
    // Audit log failure must never interrupt the main flow.
    console.error("[audit] Failed to write audit log entry:", err, entry);
  }
}
