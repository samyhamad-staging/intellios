/**
 * AgentCore Runtime: InvokeAgent adapter (ADR-027).
 *
 * Thin wrapper around BedrockAgentRuntimeClient.InvokeAgentCommand that the
 * Test Console route consumes. Returns an AsyncIterable<string> of decoded
 * response chunks so the route layer can stream bytes to the browser without
 * knowing anything about the Bedrock event shape.
 *
 * Scope limits (ADR-027):
 * - This is used only by the reviewer-scoped Test Console at
 *   /registry/[agentId]/test, never by a production runtime path.
 * - RETURN_CONTROL responses are rendered as a synthetic "tool call simulated"
 *   chunk. Tool execution is intentionally out of scope.
 * - Session ids are client-generated (uuid) and never persisted server-side.
 * - Every invocation is rate-limited (10/min per actor) and audit-logged by
 *   the route, not by this adapter.
 */

import {
  BedrockAgentRuntimeClient,
  InvokeAgentCommand,
  type InvokeAgentCommandInput,
} from "@aws-sdk/client-bedrock-agent-runtime";

import type { AgentCoreDeploymentRecord } from "./types";

// ─── Error classes ────────────────────────────────────────────────────────────

/**
 * Thrown when an InvokeAgent call fails against a live Bedrock agent.
 * The route maps this to `AGENTCORE_INVOKE_FAILED` (502).
 */
export class AgentCoreInvokeError extends Error {
  readonly awsErrorName: string | undefined;
  constructor(message: string, awsErrorName?: string) {
    super(message);
    this.name = "AgentCoreInvokeError";
    this.awsErrorName = awsErrorName;
  }
}

/**
 * Thrown when the deployment record passed in is missing the fields the
 * adapter needs to make the call (agentId, region). The route maps this to
 * `AGENT_NOT_DEPLOYED` (409).
 */
export class AgentNotDeployedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentNotDeployedError";
  }
}

// ─── Adapter ──────────────────────────────────────────────────────────────────

export interface InvokeAgentOptions {
  /** Client-generated session id (uuid). Scopes the Bedrock conversation. */
  sessionId: string;
  /** The user prompt. */
  prompt: string;
  /**
   * The Bedrock agent alias id. Defaults to "TSTALIASID" — the draft alias
   * Bedrock creates automatically. For pinned versions, pass the alias id
   * from the deployment record when we start capturing it.
   */
  agentAliasId?: string;
}

/**
 * Invoke a deployed Bedrock agent and yield response chunks as they stream.
 *
 * @param deployment - The deployment record stored in agent_blueprints.deployment_metadata
 * @param options    - Session id, prompt, optional alias id
 * @returns          AsyncIterable<string> — decoded response chunks
 * @throws           AgentNotDeployedError if deployment record is incomplete
 * @throws           AgentCoreInvokeError if the live AWS call fails
 */
export async function* invokeAgent(
  deployment: AgentCoreDeploymentRecord,
  options: InvokeAgentOptions
): AsyncIterable<string> {
  if (!deployment.agentId) {
    throw new AgentNotDeployedError(
      "Deployment record missing agentId — agent has not been deployed to AgentCore."
    );
  }
  if (!deployment.region) {
    throw new AgentNotDeployedError(
      "Deployment record missing region — cannot target Bedrock without a region."
    );
  }

  const client = new BedrockAgentRuntimeClient({ region: deployment.region });

  const input: InvokeAgentCommandInput = {
    agentId: deployment.agentId,
    agentAliasId: options.agentAliasId ?? "TSTALIASID",
    sessionId: options.sessionId,
    inputText: options.prompt,
    // enableTrace is deliberately false — Test Console is not a runtime
    // observability surface; CloudWatch + the telemetry poller is the
    // production trace path. Keeping traces out here also keeps the
    // response payload lean.
    enableTrace: false,
  };

  let response;
  try {
    response = await client.send(new InvokeAgentCommand(input));
  } catch (err) {
    const awsName = (err as { name?: string } | undefined)?.name;
    const msg = err instanceof Error ? err.message : String(err);
    // Distinguish "agent not prepared / not found" from general invoke failure
    // so the route can return AGENT_NOT_DEPLOYED (409) vs AGENTCORE_INVOKE_FAILED (502).
    if (
      awsName === "ResourceNotFoundException" ||
      awsName === "ValidationException"
    ) {
      throw new AgentNotDeployedError(
        `Bedrock agent ${deployment.agentId} not found or not ready: ${msg}`
      );
    }
    throw new AgentCoreInvokeError(`InvokeAgent failed: ${msg}`, awsName);
  }

  const stream = response.completion;
  if (!stream) {
    throw new AgentCoreInvokeError(
      "InvokeAgent returned no completion stream — check agent preparation status."
    );
  }

  const decoder = new TextDecoder("utf-8");

  try {
    for await (const event of stream) {
      // Normal text chunks come on `chunk.bytes`
      if (event.chunk?.bytes) {
        yield decoder.decode(event.chunk.bytes, { stream: true });
        continue;
      }

      // RETURN_CONTROL — Bedrock is asking us to execute a tool.
      // ADR-027 explicitly keeps tool execution out of Test Console.
      // We synthesize a visible marker and end the turn.
      if (event.returnControl) {
        const tools =
          event.returnControl.invocationInputs
            ?.map((inv) => inv.functionInvocationInput?.function)
            .filter(Boolean)
            .join(", ") || "unknown";
        yield `\n\n_[tool call simulated — Test Console does not execute tools; invoked: ${tools}]_\n`;
        continue;
      }

      // Trace / file events — ignored in Test Console
      if (event.trace || event.files) {
        continue;
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new AgentCoreInvokeError(`Stream read failed: ${msg}`);
  }
}
