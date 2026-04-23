# ADR-027: Test Console as a governed test harness (not a runtime)

**Status:** accepted
**Date:** 2026-04-18
**Supersedes:** extends ADR-010 (ABP → Bedrock translation); extends session-156 Phase 2 deploy work.

## Context

Intellios positions itself as a governed **control plane** for enterprise AI agents. The roadmap vision is explicit: *"Own design, governance, lifecycle, and observability. Execution happens on cloud provider runtimes. The value is the governance wrapper, not the compute."* As of session 156 Intellios can generate an ABP, validate it, approve it, deploy it to Amazon Bedrock, and passively monitor it through CloudWatch + the ingest endpoint. There is no code path in Intellios that actually *invokes* a deployed agent. The AWS-side agent runs autonomously; any party that wants to elicit a response must call Bedrock directly.

Three forces push on this design:

1. **Demo credibility.** The single most compelling artifact for a prospect is watching an agent Intellios designed, governed, and deployed actually respond to a prompt. Without an invocation path, the demo stops at "the agent is PREPARED in Bedrock" and the prospect has to take on faith that it works end-to-end.
2. **Reviewer workflow reality.** Today, a reviewer approving a blueprint for deployment cannot press-test the agent before approval. The `/blueprints/[id]/simulate/chat` route runs a *simulated* Claude conversation with the blueprint's system prompt; it never speaks to the real, deployed agent. Reviewers must approve, deploy, and then use external tooling to probe the live agent — a workflow that encourages rubber-stamp approvals.
3. **Retirement evidence.** A deprecated blueprint today leaves its Bedrock agent orphaned. Without a corresponding "invoke it, confirm it still works" or "retire it, confirm it is gone" action, operators have no in-product way to reconcile Intellios state with AWS state.

The naive response is to build a runtime path — let Intellios proxy arbitrary invocations, capture traces, replay sessions, offer a customer-facing "run this agent" API. That path collapses the control-plane positioning: it takes ownership of compute, of trace retention, of runtime SLOs, of rate-limiting across enterprise traffic, of HIPAA/PCI data handling on the invocation path. Every one of those is a concession that would take Intellios out of scope.

We need a **third** option: something that closes the demo-credibility + reviewer-workflow + retirement-evidence gaps without taking on the runtime concerns.

## Decision

**Ship a Test Console — a reviewer-only, rate-limited, audit-logged, stateless test harness that invokes deployed agents for governance and demo purposes only. It is explicitly not a runtime.**

Six guardrails make the framing stick:

1. **Roles.** `reviewer`, `compliance_officer`, `admin` only. Architects and designers cannot invoke — the same roles that cannot approve a deployment cannot test a deployment. This is a governance surface, scoped to governance actors.

2. **Rate limit.** `rateLimit(actorEmail, { endpoint: "invoke", max: 10, windowMs: 60_000 })`. A reviewer stress-testing a blueprint can do so; a customer integration can't. Ten per minute is enough to walk through a 5-turn conversation twice; it is nowhere near enough to drive production traffic.

3. **No session persistence.** The Bedrock session id is client-generated (`crypto.randomUUID()` in the Test Console page) and discarded on page close. No server-side transcript table. No replay. No search. The prompt text and response stream are visible *only* to the invoking reviewer, in their browser, for the duration of the session. The audit row records the prompt hash and response hash (salted per session) — not the content.

4. **Audit on every invocation.** `action: "blueprint.test_invoked"` with metadata `{ agentId, bedrockAgentId, sessionId, promptHash, status }`. Failed invocations write with `status: "failed"` and the `errorClass`. Reviewers are accountable for every test; the governance bar on Test Console matches the governance bar on the approval decision they are about to make.

5. **No RETURN_CONTROL tool execution.** When Bedrock returns a RETURN_CONTROL response indicating the agent wants to call a tool, Test Console renders a synthetic *"tool call simulated"* chunk and stops the turn. Actually executing tools would make Intellios a runtime. Operators who want full end-to-end tool exercises can export the ABP manifest and run Bedrock invocations with their own tool infrastructure.

6. **UI framing.** The page is at `/registry/[agentId]/test` — literally named "Test Console". The header carries a `Test harness — not a production runtime` banner. The status badge on the response chunk labels the model as `bedrock-agent/test-console` so screenshots from the UI do not look like production traffic. CSVs exported from the audit table label the `action` column `blueprint.test_invoked` — not `blueprint.invoked`.

Taken together these six constraints keep the feature one-hop from "useful test harness for reviewers and demos" and one-hop from "product-shaped runtime that nobody asked us to own."

## Consequences

**Positive.**

- The end-to-end demo becomes credible: intake → ABP → governance → approval → deploy → *invoke and see a response* → monitor → retire is a real walk through all 8 lifecycle stages.
- Reviewers can press-test agents before approving deployment, closing the reviewer-workflow gap and strengthening the governance decision.
- The retirement path becomes verifiable: reviewer invokes pre-retirement (gets a response) → deprecates → tries again (gets `AGENT_NOT_DEPLOYED`) → audit trail shows the agent was invocable up to the moment of deprecation.
- Zero positioning cost. Test Console is a governed test harness; nothing about shipping it commits Intellios to owning the runtime.

**Negative.**

- Reviewer-role operators now have a new surface where they can leak prompt content through screen-shares. Mitigated by (a) no server-side transcript, (b) prompt-hash-only in audit, (c) UI banner making the test-harness semantics obvious.
- A malicious insider with `reviewer` could use Test Console to exfiltrate sensitive data by prompting the agent from inside Intellios. Mitigated by (a) the audit row on every invocation including the prompt hash, (b) the 10/min rate limit capping leaked volume per actor, (c) the Bedrock agent's own guardrails still applying to every request.
- An enterprise with strong intent to run traffic through Intellios will see Test Console and ask for it to be scaled up into a runtime. The answer is no; the ADR is the on-paper commitment to that no.

**Neutral.**

- A minor increase in the `@aws-sdk/*` footprint: `@aws-sdk/client-bedrock-agent-runtime` is added alongside the existing `@aws-sdk/client-bedrock-agent`.
- The `rateLimit` helper picks up one new endpoint key (`invoke`), so the per-actor throttle map grows by one entry; operational impact is negligible.

## References

- `src/lib/agentcore/invoke.ts` — the adapter.
- `src/app/api/registry/[agentId]/invoke/route.ts` — the route.
- `src/app/registry/[agentId]/test/page.tsx` — the UI.
- ADR-010 — ABP → Bedrock translation (input side of the runtime boundary).
- ADR-026 — Webhook retry + DLQ + replay (comparable example of a reviewer-surfaced control surface with rate-limited, audit-logged access).
- `docs/roadmap.md` — the control-plane vision statement this ADR defends.
