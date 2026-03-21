import type { EventType } from "@/lib/events/types";

/**
 * The JSON payload POSTed to registered webhook endpoints.
 * Structured as a direct mapping from LifecycleEvent — no additional DB queries
 * required at dispatch time.
 */
export interface WebhookPayload {
  /** Delivery UUID — also sent as X-Intellios-Delivery header */
  id: string;
  /** Lifecycle event type — also sent as X-Intellios-Event header */
  event: EventType | "webhook.test";
  /** ISO 8601 timestamp from the originating audit log entry */
  timestamp: string;
  enterpriseId: string | null;
  actor: {
    email: string;
    role: string;
  };
  entity: {
    type: "blueprint" | "intake_session" | "policy" | "workflow";
    id: string;
  };
  fromState: Record<string, unknown> | null;
  toState: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
}

/**
 * Webhook record as returned from the database (secret omitted on reads).
 */
export interface WebhookRecord {
  id: string;
  enterpriseId: string | null;
  name: string;
  url: string;
  events: string[]; // empty = all EventType values
  active: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
