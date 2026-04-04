/**
 * Blueprint Test Harness — shared types.
 * Phase 23: behavioral verification layer for approved AI agent blueprints.
 */

/** A single test case defined for a logical agent (shared across blueprint versions). */
export interface TestCase {
  id: string;
  agentId: string;
  enterpriseId: string | null;
  name: string;
  description: string | null;
  /** The prompt to send to the agent under test. */
  inputPrompt: string;
  /** Natural-language description of what the agent should do in response. */
  expectedBehavior: string;
  /** "required" failures block the pass summary; "informational" do not. */
  severity: "required" | "informational";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/** Result for a single test case within a TestRun. */
export interface TestCaseResult {
  testCaseId: string;
  name: string;
  /** "error" means the execution itself threw (Claude API failure, etc.) */
  status: "passed" | "failed" | "error";
  inputPrompt: string;
  expectedBehavior: string;
  /** Actual output returned by the agent under test (empty string on error). */
  actualOutput: string;
  /** Claude-as-judge rationale for the pass/fail verdict. */
  evaluationRationale: string;
}

/** A complete test execution run for one blueprint version. */
export interface TestRun {
  id: string;
  blueprintId: string;
  agentId: string;
  /** "passed" = all required cases passed; "failed" = any required case failed; "error" = any case threw */
  status: "running" | "passed" | "failed" | "error";
  testResults: TestCaseResult[];
  totalCases: number;
  passedCases: number;
  failedCases: number;
  runBy: string;
  startedAt: string;
  completedAt: string | null;
}
