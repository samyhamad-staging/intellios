# Lifecycle Demo Runbook — Retail Bank Customer-FAQ Agent

**Target audience:** enterprise prospect evaluation, investor due-diligence walkthrough.
**Total running time:** 8–10 minutes on the happy path.
**Prerequisites:** sandbox AWS account with Bedrock AgentCore enabled, one deployed one-time smoke agent verified green in a prior session, seeded demo enterprise + one approver, anthropic + Bedrock credentials loaded in `.env.local`.

This runbook walks through all 8 lifecycle stages end-to-end. Every stage is **real** — the agent at the end genuinely responds through Amazon Bedrock AgentCore.

---

## Scenario

*A regional retail bank is standing up an AI agent that answers customer-facing questions about routing numbers, wire-transfer procedures, and branch hours. Compliance has flagged this as a low-risk, read-only agent; governance controls are standard. The product owner (Marta) designs the agent in Intellios; the chief risk officer (Rafael) reviews and approves it; it deploys to AWS; a reviewer press-tests it live; a telemetry snapshot rolls in; the agent is later deprecated when v2 supersedes it.*

---

## Stage 0 — Setup (pre-demo, not shown on screen)

- Open browser to `https://demo.intellios.ai/intake`.
- Confirm `GET /api/healthz` returns 200 and `bedrockCircuit.status === "closed"`.
- Confirm sandbox AWS credentials are mounted: `aws bedrock-agent list-agents --region us-east-1` returns without error.
- Pre-load the demo enterprise with one approval-chain step and no test-before-approval requirement.

**Fallback:** if `/api/healthz` is not 200, switch to the rehearsal capture video. Do **not** attempt the live path.

---

## Stage 1 — Inception (Intake) — ~90 seconds

1. On `/intake`, start a new session. Say: *"A customer-facing FAQ agent for a retail bank. It should answer questions about branch hours, wire-transfer procedures, and routing numbers. It must never give personalized financial advice or disclose account information. Log every interaction for compliance."*
2. The assistant will ask 2–3 follow-up questions. Answer with:
   - *"English only, US-based customers."*
   - *"Decline anything about accounts, balances, loans, or investment advice."*
   - *"Pull branch hours and routing info from our public FAQ knowledge source."*
3. Finalize the session.

**Real:** The intake assistant is a real Claude streaming conversation (ADR-025 sanitizes prompt injection on each contribution).
**Observe:** 3 turns, ~45s of conversation, structured intake payload persisted in `intake_sessions.intake_payload`.
**Fallback:** if the Claude call fails mid-stream, retry once. If retry fails, the circuit breaker (ADR-023) has likely opened; switch to a pre-recorded capture for Stage 1 only and continue live from Stage 2.

---

## Stage 2 — Design (ABP Generation) — ~20 seconds

1. From the finalized intake session, click "Generate Blueprint".
2. A progress indicator appears. The generation engine (`generateBlueprint()` → `resilientGenerateObject` → Claude Sonnet → Zod validation against `ABPContentSchema`) runs.
3. Blueprint Workbench opens with the generated ABP.

**Real:** `src/lib/generation/generate.ts` calls Claude with the ABP content schema. `resilientGenerateObject` (ADR-016) gives 3-retry resilience.
**Observe:** a complete ABP with `identity`, `capabilities`, `constraints`, `governance` sections. Name should be something like "Retail Bank FAQ Assistant".
**Fallback:** if generation times out, re-use the last successful generation for this enterprise from Registry history.

---

## Stage 3 — Governance — ~10 seconds

1. On the Blueprint Workbench, click "Validate".
2. The governance validator runs and returns a validation report.
3. Expect 0 errors and 1–2 warnings (warnings are fine; errors would block).

**Real:** `src/lib/governance/validator.ts` evaluates the ABP against the enterprise policy pack. Validation report is persisted in `agent_blueprints.validation_report`.
**Observe:** the validation panel shows policies checked, violations (if any) with severity labels, and remediation suggestions.
**Fallback:** if an unexpected error-severity violation appears, acknowledge it on camera as *"the governance floor working as designed"* and click the remediation suggestion — then re-validate.

---

## Stage 4 — Review & Approval — ~45 seconds

1. As designer (Marta), click "Submit for Review". Blueprint transitions to `in_review` (ADR-019 enforces the fresh-validation gate here).
2. Switch user to reviewer (Rafael). Navigate to the review queue at `/review`.
3. Open the pending blueprint. Review the validation report, read the system instruction, read the denied-actions list.
4. Click "Approve". (SOD is enforced — ADR-013 — Marta cannot approve her own work.)
5. Blueprint transitions to `approved`.

**Real:** Multi-step approval chain (or legacy single-step) is enforced server-side. Audit rows are written atomically with the status change (ADR-021).
**Observe:** the status badge flips to `approved`; approval timestamp + approver email captured.
**Fallback:** if SOD rejects because demo accidentally used the same user, switch to the other pre-seeded reviewer.

---

## Stage 5 — Deployment — ~60–90 seconds

1. Still as reviewer, on the approved blueprint, click "Deploy to AgentCore".
2. Enter change reference (e.g. `DEMO-CHG-0001`) and optional notes.
3. The deploy button triggers `POST /api/blueprints/[id]/deploy/agentcore`.
4. A progress indicator shows `CREATING` → `PREPARING` → `PREPARED` (polls at 500ms; total ~45–90s against real Bedrock).
5. Blueprint transitions to `deployed`. `deploymentMetadata.agentId` populated.

**Real:** `deployToAgentCore()` in `src/lib/agentcore/deploy.ts` makes live `CreateAgent` → `CreateAgentActionGroup` → `PrepareAgent` → `GetAgent` calls against AWS.
**Observe:** the deployment panel shows the Bedrock agent id, ARN, region, foundation model. The status badge turns `deployed` with a green dot.
**Fallback:** if preparation times out (Bedrock can be slow), the deploy route auto-rolls-back via `DeleteAgent`. Retry once. If retry fails, the circuit breaker may have opened or the IAM role may be drifted; switch to the pre-seeded *already-deployed* demo agent and jump to Stage 6.

---

## Stage 6 — Runtime Execution (Test Console, ADR-027) — ~60 seconds

1. Click "Open Test Console" on the deployed blueprint, or navigate to `/registry/[agentId]/test`.
2. The Test Console shows status badges: `deployed` / `target: agentcore` / `region: us-east-1` plus the yellow *"Test harness — not a production runtime"* chip.
3. Enter: *"What's the routing number for wire transfers at my local branch?"* and press Send.
4. The response streams in live from Bedrock — chunks appear word-by-word.
5. Agent responds with policy-compliant guidance (likely: routing-number lookup + guardrail on account-specific details).

**Real:** `invokeAgent()` adapter calls `BedrockAgentRuntimeClient.InvokeAgentCommand` with streaming. Reviewer-scoped, rate-limited, audit-logged per ADR-027.
**Observe:** the response streams smoothly. `blueprint.test_invoked` audit row is visible in `/admin/audit-log` immediately after.
**Fallback:** if the invoke returns `AGENT_NOT_DEPLOYED`, the Bedrock agent may have been reaped by a cleanup cron — re-deploy from Stage 5. If streaming stalls, the Bedrock session may have expired; click Clear (generates a new session id) and retry.

---

## Stage 7 — Monitoring — ~60 seconds

1. Send 2–3 more prompts in Test Console to generate telemetry volume.
2. Navigate to `/monitor` or the agent's Registry detail page → Production tab.
3. CloudWatch poller (`src/lib/telemetry/agentcore-poller.ts`) runs hourly; for demo purposes, trigger a manual poll via the admin sync button.
4. Health dashboard shows: invocation count, latency p50/p95, token usage, error rate.

**Real:** CloudWatch metrics are fetched live from the deployed agent. Telemetry ingest endpoint (`POST /api/telemetry/ingest`) is also available for externally-sent metrics.
**Observe:** invocations from Stage 6 appear in the dashboard within ~60s of the manual poll.
**Fallback:** if manual poll doesn't pick up the metrics yet, explain *"Bedrock metrics propagate within 2–5 minutes"* and show yesterday's cached dashboard view instead.

---

## Stage 8 — Iteration + Retirement — ~60 seconds

### Iteration (briefly, not fully demoed)

1. On the Registry detail page, click "Create new version".
2. A draft blueprint is created with incremented semver (v1 → v1.0.1 or v1.1.0).
3. Brief mention: *"The v2 path would repeat stages 2–6 for the new version; the old version stays deployed until the new one replaces it."*

### Retirement

1. Navigate back to the v1 deployed blueprint.
2. Click "Deprecate" (reviewer/admin role required).
3. Status transitions to `deprecated`. `retireFromAgentCore()` fires in the background — `DeleteAgent` is called against Bedrock.
4. Refresh the page after ~10s. The badge now shows `retired` (red). `deploymentMetadata.retirement.deleted` is true.
5. Open Test Console again — it now refuses to invoke: *"Agent is not invokable: status: deprecated."*

**Real:** `DeleteAgent` is a live AWS call. Audit row `blueprint.agentcore_retired` is written.
**Observe:** the retire action is best-effort — it doesn't block the deprecation. If AWS is degraded, deprecation still happens; retirement retries can be performed manually by operators.
**Fallback:** if `DeleteAgent` fails (rare), the badge will show no retirement chip and the audit row will read `blueprint.agentcore_retire_failed`. Acknowledge on camera: *"Retirement is best-effort — Intellios preserves the deployment record for manual reconciliation."*

---

## Closing Beat (30 seconds)

*"Eight lifecycle stages, one agent, eight minutes. Every stage was real — no mocks, no stubs. The agent you just watched respond was running on Amazon Bedrock AgentCore, governed by an Intellios blueprint, invoked through a reviewer-scoped test harness, monitored through CloudWatch, and retired with a real DeleteAgent call. Intellios is the governance control plane; AgentCore is the runtime. The value is the wrapper."*

---

## Troubleshooting matrix

| Symptom | Likely cause | Action |
|---|---|---|
| `GET /api/healthz` returns 503 with `db` or `redis` failure | Transient infra blip | Wait 15s, retry. If still failing, switch to rehearsal capture. |
| `GET /api/healthz` returns 503 with `bedrockCircuit.status === "open"` | Circuit breaker tripped from prior AWS flakiness | Wait 60s for cooldown. Re-check. If still open, switch to rehearsal capture. |
| Intake generation takes >60s | Bedrock region slow or circuit half-open | Retry once. If still slow, note on camera and proceed to Stage 2 with a pre-generated ABP. |
| Governance shows unexpected error-severity violation | Policy update landed between runs | Click remediation; re-validate. |
| Deploy times out (>90s) | Bedrock regional slowness | Auto-rollback will delete. Retry once. If fails, switch to pre-deployed demo agent. |
| Test Console shows `AGENT_NOT_DEPLOYED` | Agent was reaped by cleanup cron | Re-deploy from Stage 5. |
| Test Console shows `AGENTCORE_INVOKE_FAILED` | Transient Bedrock runtime error or guardrail reject | Retry once. If guardrail reject, rephrase prompt. |
| `DeleteAgent` times out on retirement | Bedrock async cleanup still running | Deprecation already committed; badge will populate once AWS completes the async delete (up to 60s). |

---

## Things to **not** do on a live demo

- Do not use `/intake` as an unauthenticated user demoing from the marketing site — the intake session won't finalize without an authenticated role.
- Do not deploy from an enterprise whose `deploymentTargets.agentcore.enabled` is false — the button will 400.
- Do not test-invoke an agent outside its enterprise scope — `assertEnterpriseAccess` will 403.
- Do not demonstrate RETURN_CONTROL tool execution from Test Console — it intentionally shows only the synthetic marker (ADR-027).
- Do not claim Test Console is "production runtime" — the framing is governed test harness. Stick to that language.

---

## Session 158 checklist (before this runbook is live)

Before running this demo against prospects, the following must be green:

- [ ] One-time live smoke deploy from `deployToAgentCore()` against sandbox AWS has completed green (session 158).
- [ ] Test Console invoke returns a response within 5s on the smoke-deploy agent.
- [ ] Retirement removes the smoke-deploy agent successfully; badge shows `retired`.
- [ ] CloudWatch dashboard renders at least one invocation from the smoke run.
- [ ] Demo enterprise + approval-chain seed script (`scripts/seed-demo.ts`) is deterministic across fresh database runs.
- [ ] Pre-recorded capture of the happy path exists as fallback (screen recording of a successful rehearsal).
