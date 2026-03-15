/**
 * Deploy route integration tests — Phase 33 AgentCore Confidence
 *
 * Tests deployToAgentCore() by mocking the AWS Bedrock Agent SDK.
 * Validates:
 *   - Happy path: all 5 steps succeed
 *   - Failure at each step with correct rollback behavior
 *   - Polling timeout and terminal-state handling
 *   - Pre-flight config validation (fails before any AWS call)
 */

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";
import type { AgentCoreConfig } from "@/lib/settings/types";
import type { ABP } from "@/lib/types/abp";

// ─── Mock @aws-sdk/client-bedrock-agent ──────────────────────────────────────

const mockSend = vi.fn();

vi.mock("@aws-sdk/client-bedrock-agent", () => {
  return {
    BedrockAgentClient: vi.fn().mockImplementation(() => ({ send: mockSend })),
    CreateAgentCommand: vi.fn((input) => ({ _type: "CreateAgent", input })),
    CreateAgentActionGroupCommand: vi.fn((input) => ({ _type: "CreateAgentActionGroup", input })),
    PrepareAgentCommand: vi.fn((input) => ({ _type: "PrepareAgent", input })),
    GetAgentCommand: vi.fn((input) => ({ _type: "GetAgent", input })),
    DeleteAgentCommand: vi.fn((input) => ({ _type: "DeleteAgent", input })),
  };
});

import { deployToAgentCore } from "@/lib/agentcore/deploy";

// ─── Test fixtures ────────────────────────────────────────────────────────────

function makeAbp(): ABP {
  return {
    version: "1.0.0",
    metadata: {
      id: "00000000-0000-0000-0000-000000000001",
      created_at: "2026-03-15T00:00:00.000Z",
      created_by: "test@example.com",
      status: "approved",
      enterprise_id: "ent-001",
    },
    identity: {
      name: "Test Agent",
      description: "A test agent",
      persona: "You are a professional assistant that helps with compliance.",
    },
    capabilities: {
      tools: [{ name: "search_docs", type: "api", description: "Search documentation" }],
      instructions:
        "Assist users with compliance questions. Use the search tool to find relevant policies.",
    },
    constraints: { allowed_domains: [], denied_actions: [] },
    governance: { policies: [], audit: { log_interactions: false } },
  };
}

const validConfig: AgentCoreConfig = {
  enabled: true,
  region: "us-east-1",
  agentResourceRoleArn: "arn:aws:iam::123456789012:role/BedrockAgentRole",
  foundationModel: "anthropic.claude-3-5-sonnet-20241022-v2:0",
};

const actor = { email: "deployer@example.com" };

// ─── Mock helpers ─────────────────────────────────────────────────────────────

/**
 * Build a mock `send` implementation that dispatches by command type.
 * pollResults cycles; when exhausted it returns the last entry.
 */
function buildSendMock({
  createAgentId = "agent-001",
  createAgentArn = "arn:aws:bedrock:us-east-1:123456789012:agent/agent-001",
  pollResults = [{ agent: { agentStatus: "PREPARED" } }],
  createAgentError,
  createActionGroupError,
  prepareError,
  deleteError,
}: {
  createAgentId?: string;
  createAgentArn?: string;
  pollResults?: unknown[];
  createAgentError?: Error;
  createActionGroupError?: Error;
  prepareError?: Error;
  deleteError?: Error;
} = {}) {
  let pollCallCount = 0;
  return vi.fn((cmd: { _type: string }) => {
    switch (cmd._type) {
      case "CreateAgent":
        if (createAgentError) return Promise.reject(createAgentError);
        return Promise.resolve({ agent: { agentId: createAgentId, agentArn: createAgentArn } });
      case "CreateAgentActionGroup":
        if (createActionGroupError) return Promise.reject(createActionGroupError);
        return Promise.resolve({});
      case "PrepareAgent":
        if (prepareError) return Promise.reject(prepareError);
        return Promise.resolve({});
      case "GetAgent": {
        const result = pollResults[Math.min(pollCallCount, pollResults.length - 1)];
        pollCallCount++;
        return Promise.resolve(result);
      }
      case "DeleteAgent":
        if (deleteError) return Promise.reject(deleteError);
        return Promise.resolve({});
      default:
        return Promise.resolve({});
    }
  });
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

// ─── Happy path ───────────────────────────────────────────────────────────────

// Helper: run an async deploy call to completion with fake timers.
// Registers the result handler BEFORE advancing timers to prevent unhandled rejections.
async function runWithTimers<T>(fn: () => Promise<T>): Promise<T> {
  const promise = fn();
  // Catch the promise immediately so vitest doesn't see an unhandled rejection
  // during the timer advancement phase.
  const settled = promise.then(
    (v) => ({ ok: true as const, value: v }),
    (e) => ({ ok: false as const, error: e as Error })
  );
  await vi.runAllTimersAsync();
  const result = await settled;
  if (result.ok) return result.value;
  throw result.error;
}

describe("deployToAgentCore — happy path", () => {
  it("returns a valid AgentCoreDeploymentRecord on success", async () => {
    mockSend.mockImplementation(buildSendMock());

    const record = await runWithTimers(() => deployToAgentCore(makeAbp(), validConfig, actor));

    expect(record.target).toBe("agentcore");
    expect(record.agentId).toBe("agent-001");
    expect(record.agentArn).toContain("agent-001");
    expect(record.region).toBe("us-east-1");
    expect(record.foundationModel).toBe("anthropic.claude-3-5-sonnet-20241022-v2:0");
    expect(record.agentVersion).toBe("1");
    expect(record.deployedBy).toBe("deployer@example.com");
    expect(record.deployedAt).toBeTruthy();
  });

  it("resolves correctly when PREPARED appears after a PREPARING poll", async () => {
    mockSend.mockImplementation(
      buildSendMock({
        pollResults: [
          { agent: { agentStatus: "PREPARING" } },
          { agent: { agentStatus: "PREPARED" } },
        ],
      })
    );

    const record = await runWithTimers(() => deployToAgentCore(makeAbp(), validConfig, actor));
    expect(record.agentId).toBe("agent-001");
  });
});

// ─── Step failures ────────────────────────────────────────────────────────────

describe("deployToAgentCore — CreateAgent failure", () => {
  it("throws with CreateAgent message and does NOT call DeleteAgent", async () => {
    mockSend.mockImplementation(
      buildSendMock({ createAgentError: new Error("AccessDeniedException: not authorized") })
    );

    await expect(
      runWithTimers(() => deployToAgentCore(makeAbp(), validConfig, actor))
    ).rejects.toThrow("CreateAgent failed");

    const deleteCalls = (mockSend as Mock).mock.calls.filter(
      (c) => c[0]._type === "DeleteAgent"
    );
    expect(deleteCalls).toHaveLength(0);
  });
});

describe("deployToAgentCore — CreateAgentActionGroup failure", () => {
  it("calls DeleteAgent with skipResourceInUseCheck: true on action group failure", async () => {
    mockSend.mockImplementation(
      buildSendMock({
        createActionGroupError: new Error("ValidationException: invalid function schema"),
      })
    );

    await expect(
      runWithTimers(() => deployToAgentCore(makeAbp(), validConfig, actor))
    ).rejects.toThrow("CreateAgentActionGroup failed");

    const deleteCalls = (mockSend as Mock).mock.calls.filter(
      (c) => c[0]._type === "DeleteAgent"
    );
    expect(deleteCalls).toHaveLength(1);
    expect(deleteCalls[0][0].input.skipResourceInUseCheck).toBe(true);
  });

  it("surfaces original error even when rollback also fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    mockSend.mockImplementation(
      buildSendMock({
        createActionGroupError: new Error("Original action group error"),
        deleteError: new Error("Rollback also failed"),
      })
    );

    await expect(
      runWithTimers(() => deployToAgentCore(makeAbp(), validConfig, actor))
    ).rejects.toThrow("Original action group error");
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Rollback failed"));
    consoleSpy.mockRestore();
  });
});

describe("deployToAgentCore — PrepareAgent failure", () => {
  it("throws and calls DeleteAgent when PrepareAgent fails", async () => {
    mockSend.mockImplementation(
      buildSendMock({ prepareError: new Error("ServiceException: internal error") })
    );

    await expect(
      runWithTimers(() => deployToAgentCore(makeAbp(), validConfig, actor))
    ).rejects.toThrow("PrepareAgent failed");

    const deleteCalls = (mockSend as Mock).mock.calls.filter(
      (c) => c[0]._type === "DeleteAgent"
    );
    expect(deleteCalls).toHaveLength(1);
  });
});

// ─── Polling scenarios ────────────────────────────────────────────────────────

describe("deployToAgentCore — polling", () => {
  it("throws with terminal-state message when agent enters FAILED", async () => {
    mockSend.mockImplementation(
      buildSendMock({ pollResults: [{ agent: { agentStatus: "FAILED" } }] })
    );

    await expect(
      runWithTimers(() => deployToAgentCore(makeAbp(), validConfig, actor))
    ).rejects.toThrow("terminal state: FAILED");
  });

  it("calls rollback and throws 90s timeout when all polls stay PREPARING", async () => {
    // Single PREPARING result — reused for all 180 poll attempts via buildSendMock
    mockSend.mockImplementation(
      buildSendMock({ pollResults: [{ agent: { agentStatus: "PREPARING" } }] })
    );

    await expect(
      runWithTimers(() => deployToAgentCore(makeAbp(), validConfig, actor))
    ).rejects.toThrow(/90s/);

    const deleteCalls = (mockSend as Mock).mock.calls.filter(
      (c) => c[0]._type === "DeleteAgent"
    );
    expect(deleteCalls).toHaveLength(1);
  });
});

// ─── Pre-flight config validation ────────────────────────────────────────────
// Pre-flight throws synchronously inside the async function — no timer
// advancement needed. Pattern: await expect(...).rejects.toThrow(...) directly.

describe("deployToAgentCore — pre-flight config validation", () => {
  it("throws before any AWS call when region is missing", async () => {
    const badConfig: AgentCoreConfig = { ...validConfig, region: "" };

    await expect(deployToAgentCore(makeAbp(), badConfig, actor)).rejects.toThrow(
      "AgentCore config missing: region"
    );
    expect((mockSend as Mock).mock.calls).toHaveLength(0);
  });

  it("throws before any AWS call when agentResourceRoleArn is missing", async () => {
    const badConfig: AgentCoreConfig = { ...validConfig, agentResourceRoleArn: "" };

    await expect(deployToAgentCore(makeAbp(), badConfig, actor)).rejects.toThrow(
      "AgentCore config missing: agentResourceRoleArn"
    );
    expect((mockSend as Mock).mock.calls).toHaveLength(0);
  });

  it("throws before any AWS call when ARN format is invalid", async () => {
    const badConfig: AgentCoreConfig = { ...validConfig, agentResourceRoleArn: "not-an-arn" };

    await expect(deployToAgentCore(makeAbp(), badConfig, actor)).rejects.toThrow(
      "Invalid agentResourceRoleArn format"
    );
    expect((mockSend as Mock).mock.calls).toHaveLength(0);
  });

  it("throws before any AWS call when foundationModel is missing", async () => {
    const badConfig: AgentCoreConfig = { ...validConfig, foundationModel: "" };

    await expect(deployToAgentCore(makeAbp(), badConfig, actor)).rejects.toThrow(
      "AgentCore config missing: foundationModel"
    );
    expect((mockSend as Mock).mock.calls).toHaveLength(0);
  });
});
