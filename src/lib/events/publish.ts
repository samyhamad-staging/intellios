/**
 * publishEvent — typed event publication.
 *
 * The primary API for recording lifecycle events. Internally delegates to
 * writeAuditLog() (which writes the DB row and fires all registered bus
 * handlers: notifications, webhooks, policy-impact, quality-evaluator).
 *
 * Replaces the raw writeAuditLog() call pattern across API routes. The typed
 * `event` discriminated union ensures each event's payload is correct at
 * compile time, resolving D-02.
 */

import { writeAuditLog } from "@/lib/audit/log";
import type { IntelliosEvent } from "@/lib/events/types";

export interface PublishInput {
  /** The typed lifecycle event (discriminated union). */
  event: IntelliosEvent;
  actor: { email: string; role: string };
  entity: { type: "blueprint" | "intake_session" | "policy" | "workflow"; id: string };
  enterpriseId?: string | null;
}

export async function publishEvent(input: PublishInput): Promise<void> {
  await writeAuditLog({
    entityType:  input.entity.type,
    entityId:    input.entity.id,
    action:      input.event.type,
    actorEmail:  input.actor.email,
    actorRole:   input.actor.role,
    enterpriseId: input.enterpriseId,
    metadata:    input.event.payload as Record<string, unknown>,
  });
}
