/**
 * In-process lifecycle event bus.
 *
 * Design principles:
 * - writeAuditLog is the single integration point — it dispatches after a
 *   successful DB insert, making the audit log the authoritative event store.
 * - All handlers are fire-and-forget: handler failures never surface to the
 *   caller and never interrupt the primary operation.
 * - Handlers are registered at module-initialization time via registerHandler().
 *   In Next.js, modules are cached per worker, so handlers registered via
 *   side-effect imports in audit/log.ts are reliably present on every request.
 *
 * Future evolution path:
 *   Replace dispatch() with a durable queue (Redis Streams, BullMQ) to support
 *   multi-instance deployments, retries, and dead-letter queues. The handler
 *   interface stays identical — only the transport changes.
 */

import type { EventHandler, LifecycleEvent } from "./types";

const _handlers: EventHandler[] = [];

/**
 * Register a handler to be called on every dispatched lifecycle event.
 * Designed to be called at module initialization time (idempotent in practice
 * because modules are imported once per worker).
 */
export function registerHandler(handler: EventHandler): void {
  _handlers.push(handler);
}

/**
 * Dispatch a lifecycle event to all registered handlers asynchronously.
 * Errors from individual handlers are caught and logged — they never
 * propagate to the caller.
 */
export async function dispatch(event: LifecycleEvent): Promise<void> {
  for (const handler of _handlers) {
    handler(event).catch((err) =>
      console.error("[event-bus] Handler threw an error:", err, {
        eventType: event.type,
        entityId: event.entityId,
      })
    );
  }
}
