# ADR-009: Outbound Webhook Integration

**Status:** accepted
**Date:** 2026-03-14
**Supersedes:** (none)

## Context

After Phase 24, the platform captures every lifecycle event in an immutable audit trail and routes them through an in-process event bus. However, all consumption of these events was internal: in-app notifications, health checks, compliance intelligence. No mechanism existed to relay events to external systems.

In practice, every Fortune 500 enterprise has existing tooling that needs to know about Intellios lifecycle events:
- CI/CD pipelines: "Blueprint approved → trigger deployment workflow"
- SIEM systems: "Governance violation → security alert"
- Collaboration tools: "Review requested → Slack/Teams notification"
- External audit systems: "Policy changed → compliance record"

The comment in `src/lib/events/types.ts` has read "future analytics / webhooks" since Phase 3. The `LifecycleEvent` interface already carries every field needed for a well-formed webhook payload. Phase 25 completes the original architecture.

## Decision

**1. Enterprise-scoped outbound webhooks**

Admins register HTTPS endpoints in the new `webhooks` table. Each webhook specifies:
- `url` — HTTPS endpoint (HTTP rejected at registration)
- `events` — array of subscribed `EventType` values (empty = all events)
- `secret` — auto-generated 32-byte hex HMAC signing key

On every `writeAuditLog` call, the webhook dispatch handler (registered via side-effect import, same pattern as notifications and policy-impact handlers) queries active webhooks matching the event's `enterpriseId` and subscribed `events`, then fires-and-forgets `deliverWebhook()` for each match.

**2. HMAC-SHA256 signing**

Every delivery includes `X-Intellios-Signature: sha256=<hex_digest>` computed as `HMAC-SHA256(secret, rawBody)`. Pattern is identical to GitHub webhooks — widely understood, battle-tested. Recipients verify by recomputing the HMAC over the raw request body. This ensures both authenticity (the payload came from Intellios) and integrity (the payload was not modified in transit).

**3. Delivery with retry**

Up to 3 sequential attempts per delivery (delays: 0ms, 1000ms, 2000ms). Every attempt result is logged to `webhook_deliveries`. The delivery runs fire-and-forget from the event handler — failures never block or delay the primary lifecycle operation.

**4. Admin Webhook Manager UI (`/admin/webhooks`)**

A new page for admin users to register, configure, test, and monitor webhooks. Features:
- Register form: name, HTTPS URL, event subscriptions (all 15 EventType values grouped by domain)
- Secret displayed once at registration (and once per rotation) — never retrievable afterward
- Per-webhook active/inactive toggle (pause without deletion)
- Test delivery button → synchronous test POST with inline result
- Expandable delivery log (last 20 deliveries per webhook: event type, status, HTTP code, attempts)
- Rotate secret button → new secret shown once in amber callout

**5. No new npm dependencies**

`node:crypto` (`createHmac`) for HMAC-SHA256 signing, native `fetch` for HTTP delivery.

## Consequences

**Positive:**
- The platform transitions from a governance silo to an integration hub — every lifecycle event becomes an automation trigger for existing enterprise tooling
- Enterprises can connect Intellios to CI/CD, SIEM, collaboration tools, and external audit systems without platform-side changes
- HMAC signing provides cryptographically verifiable authenticity and integrity for every delivery
- Admin delivery log provides full observability into webhook delivery health
- Zero new AI calls, zero new npm dependencies

**Constraints and trade-offs:**
- Delivery is fire-and-forget from the event handler (non-blocking by design). If all 3 attempts fail, the delivery is logged as `failed` but there is no automatic recovery. Admins must re-trigger manually (e.g., using the test delivery or waiting for the next matching event).
- Retry logic runs sequentially within the async task (0ms, 1s, 2s). For enterprises with many active webhooks and high event volume, this could result in brief tail latency in the background. Acceptable for the current single-instance deployment model.
- Webhook delivery is not deduplicated. If the event bus fires the same event twice (edge case), both deliveries will be sent. Consumers should implement idempotency on the `X-Intellios-Delivery` UUID if required.
- Secrets are stored as plaintext in the `webhooks` table. Encryption at rest is the responsibility of the database layer (Postgres column-level encryption or full-disk encryption). This is consistent with the platform's existing secret storage pattern (bcrypt passwords, API keys).
