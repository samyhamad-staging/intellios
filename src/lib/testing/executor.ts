/**
 * Blueprint Test Harness — execution engine.
 * Phase 23: runs test cases against an agent's constructed system prompt using Claude Haiku,
 * then evaluates each actual output against the expected behavior with a second Haiku call.
 *
 * Two Claude Haiku calls per test case:
 *   1. Execution: agent system prompt + test input → actual output
 *   2. Evaluation: judge prompt assesses actual output vs. expected behavior → { pass, rationale }
 *
 * No new npm dependencies. Uses existing @ai-sdk/anthropic infrastructure.
 */

import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import type { ABP } from "@/lib/types/abp";
import type { TestCase, TestCaseResult } from "./types";

// ─── System prompt construction ───────────────────────────────────────────────

/**
 * Constructs a runtime system prompt from the ABP's behavioral specification.
 * Uses: identity (name, description, persona) + capabilities.instructions + constraints.
 */
export function buildAgentSystemPrompt(abp: ABP): string {
  const lines: string[] = [
    `You are ${abp.identity.name}.`,
    "",
    abp.identity.description,
  ];

  if (abp.identity.persona) {
    lines.push("", abp.identity.persona);
  }

  if (abp.capabilities.instructions) {
    lines.push("", "## Instructions", abp.capabilities.instructions);
  }

  const denied = abp.constraints?.denied_actions ?? [];
  const domains = abp.constraints?.allowed_domains ?? [];

  if (denied.length > 0 || domains.length > 0) {
    lines.push("", "## Constraints");
    if (domains.length > 0) {
      lines.push(`Allowed domains: ${domains.join(", ")}`);
    }
    if (denied.length > 0) {
      lines.push(`Prohibited actions: ${denied.join(", ")}`);
    }
  }

  return lines.join("\n");
}

// ─── Single test case execution ───────────────────────────────────────────────

/** Step 1: run the agent with the test input and return the actual output. */
async function executeTestCase(
  systemPrompt: string,
  inputPrompt: string
): Promise<string> {
  const { text } = await generateText({
    model: anthropic("claude-3-5-haiku-20241022"),
    system: systemPrompt,
    prompt: inputPrompt,
    maxOutputTokens: 500,
  });
  return text;
}

/** Step 2: evaluate the actual output against the expected behavior. */
async function evaluateOutput(
  inputPrompt: string,
  expectedBehavior: string,
  actualOutput: string
): Promise<{ pass: boolean; rationale: string }> {
  const { text } = await generateText({
    model: anthropic("claude-3-5-haiku-20241022"),
    system:
      "You are a test evaluator for AI agent outputs. " +
      "Assess whether the actual output satisfies the expected behavior. " +
      "Respond ONLY with a valid JSON object — no markdown, no preamble.",
    prompt: `Test input: ${inputPrompt}

Expected behavior: ${expectedBehavior}

Actual output: ${actualOutput}

Does the actual output satisfy the expected behavior?
Respond with exactly: {"pass": true, "rationale": "brief explanation"} or {"pass": false, "rationale": "brief explanation"}`,
    maxOutputTokens: 200,
  });

  try {
    // Strip any accidental markdown fences before parsing
    const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(cleaned) as { pass: boolean; rationale: string };
    return { pass: Boolean(parsed.pass), rationale: parsed.rationale ?? "" };
  } catch {
    // Tolerate parse failures — treat as failed with raw rationale
    return { pass: false, rationale: `Evaluation parse error: ${text.slice(0, 120)}` };
  }
}

// ─── Test suite runner ────────────────────────────────────────────────────────

export interface TestSuiteResult {
  results: TestCaseResult[];
  passedCases: number;
  failedCases: number;
  /** "passed" = all required cases passed; "failed" = any required case failed; "error" = any case threw */
  status: "passed" | "failed" | "error";
}

/**
 * Runs all test cases sequentially against the given ABP.
 * Returns a full summary suitable for persisting to blueprint_test_runs.
 */
export async function runTestSuite(
  abp: ABP,
  testCases: TestCase[]
): Promise<TestSuiteResult> {
  const systemPrompt = buildAgentSystemPrompt(abp);
  const results: TestCaseResult[] = [];
  let hasError = false;

  for (const tc of testCases) {
    try {
      const actualOutput = await executeTestCase(systemPrompt, tc.inputPrompt);
      const { pass, rationale } = await evaluateOutput(
        tc.inputPrompt,
        tc.expectedBehavior,
        actualOutput
      );
      results.push({
        testCaseId: tc.id,
        name: tc.name,
        status: pass ? "passed" : "failed",
        inputPrompt: tc.inputPrompt,
        expectedBehavior: tc.expectedBehavior,
        actualOutput,
        evaluationRationale: rationale,
      });
    } catch (err) {
      hasError = true;
      results.push({
        testCaseId: tc.id,
        name: tc.name,
        status: "error",
        inputPrompt: tc.inputPrompt,
        expectedBehavior: tc.expectedBehavior,
        actualOutput: "",
        evaluationRationale: String(err),
      });
    }
  }

  // Only required-severity failures contribute to "failed" status
  const requiredResults = results.filter((_, i) => testCases[i]?.severity === "required");
  const passedCases = results.filter((r) => r.status === "passed").length;
  const failedCases = results.filter((r) => r.status !== "passed").length;
  const requiredFailed = requiredResults.some((r) => r.status !== "passed");

  let status: "passed" | "failed" | "error";
  if (hasError) {
    status = "error";
  } else if (requiredFailed) {
    status = "failed";
  } else {
    status = "passed";
  }

  return { results, passedCases, failedCases, status };
}
