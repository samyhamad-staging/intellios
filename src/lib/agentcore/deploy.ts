/**
 * AgentCore Phase 2: Direct Deploy
 *
 * Calls the Amazon Bedrock Agent API to create and prepare an agent directly
 * from an approved blueprint, storing the resulting AWS resource record in
 * agent_blueprints.deployment_metadata.
 *
 * AWS credentials are sourced from the environment (AWS_ACCESS_KEY_ID +
 * AWS_SECRET_ACCESS_KEY, or instance profile) — never from the Intellios DB.
 * The enterprise-specific IAM role ARN is read from enterprise_settings.
 *
 * Call sequence:
 *   1. CreateAgent           → agentId, agentArn (status: CREATING → NOT_PREPARED)
 *   2. CreateAgentActionGroup (once per tool in ABP)
 *   3. PrepareAgent          → triggers async preparation (status: PREPARING)
 *   4. Poll GetAgent every 500ms until agentStatus === "PREPARED" (max 90s)
 *   5. On timeout → DeleteAgent (rollback) + throw
 */

import {
  BedrockAgentClient,
  CreateAgentCommand,
  CreateAgentActionGroupCommand,
  PrepareAgentCommand,
  GetAgentCommand,
  DeleteAgentCommand,
  type CreateAgentCommandInput,
  type CreateAgentActionGroupCommandInput,
} from "@aws-sdk/client-bedrock-agent";

import type { ABP } from "@/lib/types/abp";
import type { AgentCoreConfig } from "@/lib/settings/types";
import type { AgentCoreDeploymentRecord } from "./types";
import { translateAbpToBedrockAgent } from "./translate";

// ─── Constants ────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 500;
const POLL_MAX_ATTEMPTS = 180; // 90 seconds total (Bedrock prep can take 60-90s for complex agents)

// ─── Deploy function ──────────────────────────────────────────────────────────

interface DeployActor {
  email: string;
}

/**
 * Deploy an approved ABP to Amazon Bedrock AgentCore.
 *
 * @param abp    - The Agent Blueprint Package to deploy
 * @param config - Enterprise AgentCore settings (region, roleArn, model, guardrail)
 * @param actor  - The authenticated user triggering the deployment
 * @returns      AgentCoreDeploymentRecord — stored in agent_blueprints.deployment_metadata
 * @throws       Error if AWS API calls fail or preparation times out
 */
/**
 * Validate AgentCore config fields before making any AWS SDK calls.
 * Throws a descriptive error on the first invalid field so failures are
 * immediately actionable (no CloudTrail entries for bad configs).
 */
function validateAgentCoreConfig(config: AgentCoreConfig): void {
  if (!config.region) {
    throw new Error("AgentCore config missing: region");
  }
  if (!config.agentResourceRoleArn) {
    throw new Error("AgentCore config missing: agentResourceRoleArn");
  }
  if (!/^arn:aws:iam::\d{12}:role\/.+$/.test(config.agentResourceRoleArn)) {
    throw new Error(
      `Invalid agentResourceRoleArn format: ${config.agentResourceRoleArn}`
    );
  }
  if (!config.foundationModel) {
    throw new Error("AgentCore config missing: foundationModel");
  }
  // Soft-check for explicit credentials; instance/task profiles won't have these
  if (
    !process.env.AWS_ACCESS_KEY_ID &&
    !process.env.AWS_SECRET_ACCESS_KEY &&
    !process.env.AWS_PROFILE &&
    !process.env.ECS_CONTAINER_METADATA_URI_V4
  ) {
    console.warn(
      "[agentcore] No explicit AWS credentials found — relying on instance/task profile"
    );
  }
}

export async function deployToAgentCore(
  abp: ABP,
  config: AgentCoreConfig,
  actor: DeployActor
): Promise<AgentCoreDeploymentRecord> {
  // Pre-flight: validate config before touching AWS
  validateAgentCoreConfig(config);

  const client = new BedrockAgentClient({ region: config.region });

  // Translate ABP into Bedrock's CreateAgent request shape
  const agentDef = translateAbpToBedrockAgent(abp, {
    agentResourceRoleArn: config.agentResourceRoleArn,
    foundationModel: config.foundationModel,
    guardrailId: config.guardrailId,
    guardrailVersion: config.guardrailVersion,
  });

  // ── Step 1: Create the agent ────────────────────────────────────────────────
  let agentId: string;
  let agentArn: string;

  const createInput: CreateAgentCommandInput = {
    agentName: agentDef.agentName,
    ...(agentDef.description ? { description: agentDef.description } : {}),
    instruction: agentDef.instruction,
    agentResourceRoleArn: agentDef.agentResourceRoleArn,
    foundationModel: agentDef.foundationModel,
    ...(agentDef.memoryConfiguration
      ? { memoryConfiguration: agentDef.memoryConfiguration }
      : {}),
    ...(agentDef.guardrailConfiguration
      ? { guardrailConfiguration: agentDef.guardrailConfiguration }
      : {}),
    ...(agentDef.tags ? { tags: agentDef.tags } : {}),
  };

  try {
    const createResult = await client.send(new CreateAgentCommand(createInput));
    if (!createResult.agent?.agentId || !createResult.agent?.agentArn) {
      throw new Error("CreateAgent response missing agentId or agentArn");
    }
    agentId = createResult.agent.agentId;
    agentArn = createResult.agent.agentArn;
  } catch (err) {
    throw new Error(
      `Bedrock CreateAgent failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  // ── Step 2: Create action groups (one per tool) ─────────────────────────────
  // Failure here rolls back by deleting the newly created agent.
  try {
    for (const actionGroup of agentDef.actionGroups) {
      const actionGroupInput: CreateAgentActionGroupCommandInput = {
        agentId,
        agentVersion: "DRAFT",
        actionGroupName: actionGroup.actionGroupName,
        ...(actionGroup.description ? { description: actionGroup.description } : {}),
        actionGroupExecutor: actionGroup.actionGroupExecutor,
        // Cast required: AWS SDK uses a discriminated union type for functionSchema
        // that includes an internal $unknown member not present in our hand-written type.
        functionSchema: actionGroup.functionSchema as unknown as CreateAgentActionGroupCommandInput["functionSchema"],
      };
      await client.send(new CreateAgentActionGroupCommand(actionGroupInput));
    }
  } catch (err) {
    // Best-effort rollback
    try {
      await client.send(new DeleteAgentCommand({ agentId, skipResourceInUseCheck: true }));
    } catch {
      // Rollback failure is logged but not thrown — original error takes priority
      console.error(`[agentcore] Rollback failed for agentId=${agentId}`);
    }
    throw new Error(
      `Bedrock CreateAgentActionGroup failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  // ── Step 3: Prepare the agent ───────────────────────────────────────────────
  try {
    await client.send(new PrepareAgentCommand({ agentId }));
  } catch (err) {
    // Rollback
    try {
      await client.send(new DeleteAgentCommand({ agentId, skipResourceInUseCheck: true }));
    } catch {
      console.error(`[agentcore] Rollback failed for agentId=${agentId}`);
    }
    throw new Error(
      `Bedrock PrepareAgent failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  // ── Step 4: Poll until PREPARED ─────────────────────────────────────────────
  let prepared = false;
  for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
    await sleep(POLL_INTERVAL_MS);
    try {
      const getResult = await client.send(new GetAgentCommand({ agentId }));
      const status = getResult.agent?.agentStatus;
      if (status === "PREPARED") {
        prepared = true;
        break;
      }
      if (status === "FAILED" || status === "DELETING") {
        throw new Error(`Agent entered terminal state: ${status}`);
      }
      // CREATING / PREPARING / NOT_PREPARED → keep polling
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("Agent entered terminal state")) {
        throw err;
      }
      // Transient GetAgent errors — keep polling until timeout
      console.warn(`[agentcore] GetAgent poll error (attempt ${attempt + 1}):`, err);
    }
  }

  if (!prepared) {
    // Timeout — rollback
    try {
      await client.send(new DeleteAgentCommand({ agentId, skipResourceInUseCheck: true }));
    } catch {
      console.error(`[agentcore] Rollback failed for agentId=${agentId}`);
    }
    throw new Error(
      `Bedrock agent did not reach PREPARED state within ${(POLL_MAX_ATTEMPTS * POLL_INTERVAL_MS) / 1000}s`
    );
  }

  // ── Step 5: Return deployment record ────────────────────────────────────────
  return {
    target: "agentcore",
    agentId,
    agentArn,
    agentVersion: "1",
    region: config.region,
    foundationModel: config.foundationModel,
    deployedAt: new Date().toISOString(),
    deployedBy: actor.email,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
