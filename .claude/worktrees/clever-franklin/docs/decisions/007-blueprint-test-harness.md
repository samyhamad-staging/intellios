# ADR-007: Blueprint Test Harness

**Status:** accepted
**Date:** 2026-03-14
**Supersedes:** (none)

## Context

Intellios provides structural validation of agent blueprints — governance policies are checked against the blueprint document. But structural validation does not verify behavioral correctness: it cannot answer "does this agent actually refuse prohibited requests?" or "does it stay within its stated domain?".

SR 11-7 requires model validation to include **performance testing**, not only documentation review. Without behavioral evidence, the MRM compliance package is incomplete from a regulatory standpoint. Reviewers approving blueprints have no way to know whether the agent described on paper actually behaves as designed.

Every ABP already contains the inputs required to run the agent: `capabilities.instructions` is a complete system prompt. `identity.name/description` and `constraints` provide additional context. The only missing piece was a test harness to execute the prompt and evaluate the results.

## Decision

Add a behavioral test layer with three components:

**1. Claude-as-Judge execution engine (`src/lib/testing/executor.ts`)**
Two Haiku calls per test case:
- Call 1 (execution): blueprint system prompt + test input → actual output
- Call 2 (evaluation): judge prompt assesses actual output against expected behavior → `{ pass, rationale }`

Using Claude Haiku for both calls keeps per-run cost low (~$0.01 for 5 test cases). The judge-as-AI approach avoids the brittleness of string matching for natural language outputs.

**2. Test cases per logical agent, test runs per blueprint version**
Test cases are attached to `agentId` (the logical agent), not to a specific `blueprintId`. A single test suite persists across versions — written once, re-run whenever the blueprint changes. Test runs are attached to `blueprintId` — each execution is permanent evidence for a specific blueprint version. This separation mirrors how model risk teams think: the test suite belongs to the agent concept, the test results belong to a specific model version.

**3. Optional submission gate (`requireTestsBeforeApproval`)**
An enterprise setting that, when enabled, blocks `draft → in_review` transitions unless the blueprint has at least one completed test run with `status: "passed"`. Default `false` — no behavioral change for enterprises that haven't configured it. When enabled, the gate is enforced at the API boundary in the status route, not just in the UI — no path bypasses it.

## Consequences

**Positive:**
- SR 11-7 behavioral evidence gap closed. MRM report Section 13 renders test run results as a formal evidence table.
- Reviewers gain behavioral evidence alongside governance validation — they can see not just whether policies are configured correctly, but whether the agent actually complies with them.
- The submission gate gives enterprises a policy lever to require behavioral verification before any blueprint enters the review queue.
- Two new DB tables (`blueprint_test_cases`, `blueprint_test_runs`) — append-only evidence records, never deleted per ADR-003.
- No new npm dependencies. Uses existing `@ai-sdk/anthropic` + `generateText` infrastructure.

**Constraints and trade-offs:**
- Sequential execution: test cases run one by one. For 10 test cases at ~10s each, the user waits ~100s for a run to complete. Acceptable for an explicit "Run Tests" action; would require background job infrastructure if run counts grew to 50+.
- Judge reliability: the AI judge occasionally fails to parse expected JSON format. The evaluator strips markdown fences before parsing and falls back to `{ pass: false, rationale: rawText }` on parse failure. Edge case, but acknowledged.
- `required` vs. `informational` severity allows test authors to mark exploratory tests as non-blocking, so that an experimental "nice to have" test case doesn't prevent submission. Only `required` failures make the overall run `"failed"`.
- The `requireTestsBeforeApproval` setting is read-only for non-admins. The gate adds friction for designers at enterprises that enable it, which is the intended behavior.
