import { db } from "@/lib/db";
import { auditLog } from "@/lib/db/schema";

export type AuditAction =
  | "blueprint.created"
  | "blueprint.refined"
  | "blueprint.status_changed"
  | "blueprint.reviewed"
  | "intake.finalized"
  | "policy.created";

export interface AuditEntry {
  entityType: "blueprint" | "intake_session" | "policy";
  entityId: string;
  action: AuditAction;
  actorEmail: string;
  actorRole: string;
  fromState?: Record<string, unknown> | null;
  toState?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Write an immutable audit log entry.
 * Fire-and-forget: errors are logged but never thrown — audit failure must not
 * block the primary operation.
 */
export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  try {
    await db.insert(auditLog).values({
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      actorEmail: entry.actorEmail,
      actorRole: entry.actorRole,
      fromState: entry.fromState ?? null,
      toState: entry.toState ?? null,
      metadata: entry.metadata ?? null,
    });
  } catch (err) {
    // Audit log failure must never interrupt the main flow.
    console.error("[audit] Failed to write audit log entry:", err, entry);
  }
}
