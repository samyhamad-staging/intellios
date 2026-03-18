# ADR-011: AgentCore Integration Confidence Hardening

**Status:** accepted
**Date:** 2026-03-15
**Session:** 038

---

## Context

Phases 29 and 30 built the AgentCore integration (export manifest + direct deploy to AWS Bedrock Agents). After those phases shipped, a systematic review identified several risk areas that reduced operator confidence:

1. **Zero test coverage** — `src/lib/agentcore/` had no unit or integration tests.
2. **Polling timeout** — 30 seconds was insufficient; AWS Bedrock can take 60–90s to prepare an agent with multiple action groups.
3. **Pre-flight gap** — config validation happened inside the AWS SDK call sequence rather than before any calls, so malformed ARNs produced opaque AWS errors after consuming quota.
4. **Settings schema gap** — the admin settings PUT API accepted free-form JSON for the `deploymentTargets.agentcore` block without Zod validation; bad configs could be persisted silently and only fail at deploy-time.
5. **Generic error messages** — AWS error strings like `AccessDeniedException` surfaced verbatim in the deploy modal with no guidance for operators.
6. **Instruction padding** — short but real ABP instructions (combined persona + instructions < 40 chars) were silently replaced by the fallback instruction, losing all ABP content on Bedrock.
7. **No live health visibility** — `checkDeploymentHealth()` evaluates governance policies only; there was no way to verify the deployed Bedrock agent was actually operational.

Phase 33 addresses all seven risk areas.

---

## Decisions

### 1. Test runner: vitest (not jest)

**Chosen:** `vitest ^3.0.0` + `@vitest/coverage-v8 ^3.0.0` (devDependencies only; zero runtime impact).

**Rationale:**
- Native ESM support — no `ts-jest` transform config needed
- Faster cold starts and watch mode vs jest for TypeScript-heavy stacks
- Compatible with Zod v4 + TypeScript 5 without additional adapters
- `vi.mock()` and `vi.useFakeTimers()` API is jest-compatible; no test migration friction later
- `@vitest/coverage-v8` uses Node's built-in V8 coverage — no Babel transform needed

**Coverage target:** 80% lines and functions on `lib/agentcore/**`.

---

### 2. Polling timeout: 30s → 90s

**Chosen:** `POLL_MAX_ATTEMPTS = 180` (180 × 500ms = 90 seconds).

**Rationale:** AWS documentation recommends allowing up to 60–90 seconds for `PrepareAgent` to complete for agents with multiple action groups. The previous 30-second limit was causing spurious timeouts in real deployments. The timeout message is dynamically computed from the constants, so changing `POLL_MAX_ATTEMPTS` automatically updates the error message and UI warning text.

---

### 3. Pre-flight validation before AWS calls

**Chosen:** `validateAgentCoreConfig()` called as the first statement in `deployToAgentCore()`, throwing before the `BedrockAgentClient` is even instantiated.

**Rationale:** Fail fast. A malformed ARN or missing region should be diagnosed at the operator-settings level, not mid-deployment. This also prevents any AWS CloudTrail entries from appearing for configuration errors — making it easier to audit only genuine deployment attempts.

The credential check is a soft-warning only (not a hard throw), because instance profiles and ECS task roles don't populate `AWS_ACCESS_KEY_ID` but are valid credential sources.

---

### 4. Instruction padding (not replacement)

**Changed behavior:** When combined `persona + instructions` is non-empty but < 40 chars (Bedrock's minimum), the code now **pads** the string with a generic policy sentence rather than **replacing** it entirely with `FALLBACK_INSTRUCTION`.

**Previous behavior:** Any instruction shorter than 40 chars was silently discarded and replaced wholesale by:
> "You are a helpful AI agent. Follow the organization's policies and guidelines. Be accurate, concise, and professional in all interactions."

**New behavior:**
- Empty persona + empty instructions → `FALLBACK_INSTRUCTION` (unchanged)
- Non-empty but short → append `"\n\nThis agent follows the organization's policies and acts professionally."` until ≥40 chars
- Ensures ABP content is always preserved on Bedrock, even for terse blueprints

---

### 5. Zod validation for deploymentTargets.agentcore

**Added:** `AgentCoreConfigSchema` (Zod discriminated union: `null | object`) added to `SettingsBody` in `src/app/api/admin/settings/route.ts`.

Validates:
- `region` matches `/^[a-z]{2}-[a-z]+-\d+$/` (e.g. `us-east-1`)
- `agentResourceRoleArn` matches `/^arn:aws:iam::\d{12}:role\/.+$/`
- `guardrailVersion` required when `guardrailId` is set
- All fields are present when non-null

A PUT with a malformed config now returns HTTP 400 with a specific Zod error message.

---

### 6. AgentCore live health endpoint (P1 observability)

**Added:** `GET /api/monitor/agentcore-health` — calls `GetAgent` for each deployed blueprint with `deploymentTarget = "agentcore"`. Returns per-agent `bedrockStatus` + summary counts.

**Design choices:**
- User-triggered only (not polled on page load) — live AWS API calls per agent are expensive
- 5-second AbortController timeout per agent — prevents the endpoint from hanging on network issues
- Individual agent failures return `"UNREACHABLE"` status — the whole endpoint still succeeds
- Credentials sourced from environment (same as deploy) — no additional config needed

---

## Known Limitations (documented, not blocking)

### agentVersion: "1" is a placeholder

`AgentCoreDeploymentRecord.agentVersion` is hardcoded to `"1"`. AWS Bedrock assigns its own version numbers after `PrepareAgent`. The stored `"1"` does not correspond to a real Bedrock agent version.

**Impact:** No runtime failures — Bedrock's `InvokeAgent` API accepts `"DRAFT"` as the version, which is what operators should use when invoking a freshly deployed agent. The `"1"` value is misleading only if an operator reads it and tries to use it in an `InvokeAgent` call.

**Deferred to future phase:** After `PrepareAgent` completes, call `ListAgentVersions` or `GetAgent` to retrieve the canonical version number and store it instead.

---

## Files Changed

| File | Change |
|---|---|
| `src/package.json` | Added vitest + coverage devDependencies + test scripts |
| `src/vitest.config.ts` | New: vitest config with `@` path alias + 80% coverage threshold |
| `src/lib/agentcore/translate.ts` | Instruction padding fix (Item 2) |
| `src/lib/agentcore/deploy.ts` | `validateAgentCoreConfig()` pre-flight (Item 4) + timeout 30s→90s (Item 3) |
| `src/app/api/admin/settings/route.ts` | `AgentCoreConfigSchema` Zod validation (Item 1) |
| `src/app/deploy/page.tsx` | `enrichAgentCoreError()` helper (Item 5) + "up to 90 seconds" UI copy |
| `src/app/api/monitor/route.ts` | Added `deploymentTarget` to response shape |
| `src/app/api/monitor/agentcore-health/route.ts` | New: live Bedrock health endpoint (Item 9) |
| `src/app/monitor/page.tsx` | AgentCore Live Status section (Item 10) |
| `src/__tests__/agentcore/translate.test.ts` | New: 37 unit tests for translation layer |
| `src/__tests__/agentcore/deploy-route.test.ts` | New: 12 integration tests for deploy sequence |

**Test results:** 49/49 passing. 0 new TypeScript errors introduced.
