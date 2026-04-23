# ADR-021: Atomic Entity + Audit Writes via `db.transaction`

**Status:** accepted
**Date:** 2026-04-17
**Supersedes:** (none)

## Context

Intellios runs an append-only audit trail — every state-changing operation should produce a durable audit row. The trail is a product feature (compliance reporting, governance KPIs) and a debugging lifeline. If a blueprint status flips to `approved` with no matching audit row, both guarantees are broken.

Several write paths had the same structural bug:

```ts
// Anti-pattern — entity update and audit insert are independent
await db.update(agentBlueprints).set({ status: "approved", ... }).where(eq(..., id));

try {
  await db.insert(auditLog).values({ action: "blueprint.reviewed", ... });
} catch (auditErr) {
  // swallowed — audit is "best-effort"
  logger.error("audit.write.failed", ...);
}

await publishEvent({ ... });  // fires regardless
```

Failure modes observed/possible:

1. Audit insert fails (connection blip, constraint violation) after the status update commits. The blueprint is approved with no audit row. The `try/catch { logger.error }` swallows it.
2. `publishEvent` fires and notifies webhooks/email of "blueprint.reviewed" for a transition whose audit is incomplete.
3. A downstream event handler throws, propagating an exception out of the route handler after the status has already changed — the client sees a 500, retries, and the operation runs twice.

Three routes had this pattern: `POST /api/blueprints`, `POST /api/blueprints/[id]/review` (both legacy-single-step and multi-step paths, plus the new governance-override audit from ADR-019), and `POST /api/blueprints/[id]/deploy/agentcore`. The governance-policies route already used `db.transaction` correctly.

## Decision

Adopt a consistent transactional envelope for every route that writes an entity plus an audit row:

```ts
const entity = await db.transaction(async (tx) => {
  const [row] = await tx.update(agentBlueprints).set({...}).where(...).returning(...);
  await tx.insert(auditLog).values({...});
  // additional audit rows (e.g., governance override) also go here
  return row;
});

// Post-commit: event dispatch. Failures must NOT roll back the entity —
// the state is already durable and retrying the event is a separate concern.
try {
  await publishEvent({...});
} catch (eventErr) {
  logger.error("event.dispatch.failed", { ... });
}
```

Applied to:

- `POST /api/blueprints` — blueprint insert + `blueprint.created` audit.
- `POST /api/blueprints/[id]/review` — status update + `blueprint.reviewed` audit (+ optional `blueprint.approved.override` audit from ADR-019). Both legacy-single-step and the two multi-step branches (final and non-final) each get their own transaction.
- `POST /api/blueprints/[id]/deploy/agentcore` — status update + `blueprint.deployed` audit, after the external AgentCore deploy has already succeeded (the transaction covers the two DB writes only; retrying the full request is safe because `deployToAgentCore` is idempotent per agent name).

## Consequences

**Benefits:**
- Status transitions and audit rows are now strictly co-durable. "Approved with no audit" cannot occur.
- Audit write failures surface as a 500 to the caller instead of being silently swallowed — client can retry, and we get a loud signal.
- Event dispatch is explicitly post-commit and failure-isolated — downstream handler errors do not corrupt the primary operation, and the primary op is observable in the DB even if notifications are delayed.

**Trade-offs:**
- A single tenant-level DB outage now fails a review request instead of partially succeeding. Correct behavior.
- The `tx` parameter is untyped in a few call sites (inherited from `db.transaction`'s callback signature in the existing code) — no runtime cost, no effect on correctness, matches the pattern used elsewhere (e.g., `governance/policies/[id]/route.ts`).
- Scope: deliberately inlined `tx.insert(auditLog)` in each route rather than refactoring the `writeAuditLog` helper to accept an optional `tx`. Smaller diff, smaller blast radius, easier to review. A helper refactor is a good future cleanup but not required for correctness.
- The AgentCore deploy path has a residual non-atomic edge: the external AWS call succeeds, then the DB transaction fails. The AWS agent exists but the blueprint status still reads `approved`. Retrying the request is safe (AgentCore agent creation is idempotent by name); persistent failure is observable because `deploymentMetadata` is null — diagnosable but imperfect. Logged as a known edge case.
