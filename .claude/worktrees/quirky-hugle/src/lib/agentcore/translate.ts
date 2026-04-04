/**
 * ABP → Amazon Bedrock AgentCore translation layer.
 *
 * Pure function — no I/O, no side effects, no AWS SDK dependency.
 * The caller supplies the agentResourceRoleArn (from env / admin settings);
 * this module never reads environment variables directly.
 *
 * Design constraints (ADR-010):
 * - ABP schema is the canonical source of truth; never reshape it here
 * - Translation is outbound-only; no modifications to the ABP
 * - Missing/optional fields degrade gracefully with safe defaults
 */

import type { ABP } from "@/lib/types/abp";
import type {
  AgentCoreExportManifest,
  BedrockActionGroup,
  BedrockAgentDefinition,
  BedrockFunctionParameter,
} from "./types";

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_FOUNDATION_MODEL = "anthropic.claude-3-5-sonnet-20241022-v2:0";

/**
 * Bedrock requires the instruction to be at least 40 characters.
 * This fallback is used when ABP.capabilities.instructions is missing or too short.
 */
const FALLBACK_INSTRUCTION =
  "You are a helpful AI agent. Follow the organization's policies and guidelines. " +
  "Be accurate, concise, and professional in all interactions.";

const MIN_INSTRUCTION_LENGTH = 40;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Sanitize a string to match Bedrock's action group name pattern: [a-zA-Z0-9_-]+ */
function sanitizeActionGroupName(name: string): string {
  const sanitized = name.replace(/[^a-zA-Z0-9_-]/g, "_").replace(/__+/g, "_");
  // Bedrock requires 1-100 chars
  return sanitized.slice(0, 100) || "tool";
}

/** Truncate a string to maxLength, appending "…" if truncated. */
function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 1) + "…";
}

/**
 * Build a RETURN_CONTROL action group from an ABP tool definition.
 *
 * Since ABP tools don't carry a formal JSON Schema for parameters, we create
 * a minimal function signature with a single `input` string parameter.
 * This is sufficient for Bedrock to understand the tool's purpose and route
 * invocations back to the caller via RETURN_CONTROL.
 */
function toolToActionGroup(tool: ABP["capabilities"]["tools"][number]): BedrockActionGroup {
  // Build a minimal parameter set — one generic `input` parameter
  const parameters: Record<string, BedrockFunctionParameter> = {
    input: {
      name: "input",
      description: `Input for the ${tool.name} tool`,
      type: "string",
      required: true,
    },
  };

  return {
    actionGroupName: sanitizeActionGroupName(tool.name),
    description: tool.description
      ? truncate(tool.description, 200)
      : `Executes the ${tool.name} tool`,
    actionGroupExecutor: {
      customControl: "RETURN_CONTROL",
    },
    functionSchema: {
      functions: [
        {
          name: sanitizeActionGroupName(tool.name),
          description: tool.description
            ? truncate(tool.description, 1200)
            : `Executes the ${tool.name} tool and returns the result`,
          parameters,
        },
      ],
    },
  };
}

// ─── Main translation function ────────────────────────────────────────────────

export interface TranslateOptions {
  /**
   * ARN of the IAM role Bedrock will assume to call foundation models.
   * Required by the Bedrock API.
   *
   * For actual deployments this must be supplied; `deployAgentToAgentCore` validates
   * its presence via `validateAgentCoreConfig` before calling this function.
   * If omitted (e.g. when building an export manifest for inspection), the output
   * includes a placeholder ARN that will be rejected by Bedrock if used directly.
   */
  agentResourceRoleArn?: string;
  /**
   * Bedrock foundation model ID to use.
   * Defaults to DEFAULT_FOUNDATION_MODEL.
   */
  foundationModel?: string;
  /**
   * If provided, attaches this guardrail to the agent.
   */
  guardrailId?: string;
  guardrailVersion?: string;
}

/**
 * Translate an ABP into a BedrockAgentDefinition (the body of a CreateAgent call).
 *
 * @param abp - The source Agent Blueprint Package
 * @param options - Operator-supplied fields not present in the ABP
 * @returns A complete BedrockAgentDefinition ready to POST to Bedrock
 */
export function translateAbpToBedrockAgent(
  abp: ABP,
  options: TranslateOptions = {}
): BedrockAgentDefinition {
  const {
    agentResourceRoleArn = "arn:aws:iam::ACCOUNT_ID:role/AmazonBedrockExecutionRoleForAgents_REPLACE_ME",
    foundationModel = DEFAULT_FOUNDATION_MODEL,
    guardrailId,
    guardrailVersion,
  } = options;

  // ── Agent name ──────────────────────────────────────────────────────────────
  // Bedrock allows max 100 chars: [0-9a-zA-Z-_ ]
  const rawName = abp.identity.name || "Unnamed Agent";
  const agentName = truncate(rawName.replace(/[^0-9a-zA-Z\-_ ]/g, "_"), 100);

  // ── Description ─────────────────────────────────────────────────────────────
  const description = abp.identity.description
    ? truncate(abp.identity.description, 200)
    : undefined;

  // ── Instruction ─────────────────────────────────────────────────────────────
  // Bedrock requires min 40 chars. Build from persona + instructions if available.
  // Pad short-but-real instructions rather than replacing them entirely, so ABP
  // content is always preserved. Only fully empty ABPs use the full fallback.
  let instruction = [abp.identity.persona, abp.capabilities.instructions]
    .filter(Boolean)
    .join("\n\n")
    .trim();

  if (instruction.length < MIN_INSTRUCTION_LENGTH) {
    if (instruction.length === 0) {
      instruction = FALLBACK_INSTRUCTION;
    } else {
      const pad =
        "\n\nThis agent follows the organization's policies and acts professionally.";
      instruction = (instruction + pad).slice(0, 4000);
    }
  }
  // Bedrock max instruction length is 4000 chars
  instruction = instruction.slice(0, 4000);

  // ── Action groups ────────────────────────────────────────────────────────────
  const tools = abp.capabilities.tools ?? [];
  const actionGroups: BedrockActionGroup[] = tools.map(toolToActionGroup);

  // ── Memory configuration ─────────────────────────────────────────────────────
  const logInteractions = abp.governance?.audit?.log_interactions;
  const memoryConfiguration =
    logInteractions === true
      ? { enabledMemoryTypes: ["SESSION_SUMMARY" as const], storageDays: 30 }
      : undefined;

  // ── Guardrail ─────────────────────────────────────────────────────────────────
  const guardrailConfiguration =
    guardrailId && guardrailVersion
      ? { guardrailIdentifier: guardrailId, guardrailVersion }
      : undefined;

  // ── Tags ──────────────────────────────────────────────────────────────────────
  const tags: Record<string, string> = {
    "managed-by": "intellios",
    abpId: abp.metadata.id,
    abpVersion: abp.version,
  };
  if (abp.metadata.enterprise_id) {
    tags.enterpriseId = abp.metadata.enterprise_id;
  }
  if (abp.ownership?.deploymentEnvironment) {
    tags.environment = abp.ownership.deploymentEnvironment;
  }
  if (abp.ownership?.businessUnit) {
    tags.businessUnit = abp.ownership.businessUnit;
  }
  if (abp.ownership?.dataClassification) {
    tags.dataClassification = abp.ownership.dataClassification;
  }
  if (abp.ownership?.costCenter) {
    tags.costCenter = abp.ownership.costCenter;
  }

  return {
    agentName,
    ...(description ? { description } : {}),
    instruction,
    agentResourceRoleArn,
    foundationModel,
    actionGroups,
    ...(memoryConfiguration ? { memoryConfiguration } : {}),
    ...(guardrailConfiguration ? { guardrailConfiguration } : {}),
    tags,
  };
}

// ─── Export manifest builder ──────────────────────────────────────────────────

export interface BuildManifestOptions extends TranslateOptions {
  blueprintId: string;
  blueprintVersion: string;
  exportedBy: string;
}

/**
 * Build the full export manifest: BedrockAgentDefinition + deployment instructions.
 */
export function buildAgentCoreExportManifest(
  abp: ABP,
  options: BuildManifestOptions
): AgentCoreExportManifest {
  const createAgentRequest = translateAbpToBedrockAgent(abp, options);

  const agentName = abp.identity.name ?? "Unnamed Agent";
  const toolCount = (abp.capabilities.tools ?? []).length;

  const deploymentInstructions = [
    "1. Replace agentResourceRoleArn with the ARN of your IAM role that has " +
      "'bedrock:InvokeModel' permission on the chosen foundation model.",
    "2. (Optional) Replace foundationModel with a model available in your AWS region. " +
      `The default is '${DEFAULT_FOUNDATION_MODEL}'.`,
    "3. (Optional) Set guardrailConfiguration if you have a Bedrock Guardrail configured " +
      "for the denied actions in this blueprint.",
    "4. Apply with: aws bedrock-agent create-agent " +
      "--cli-input-json file://manifest.json --region YOUR_REGION",
    `5. This agent has ${toolCount} tool${toolCount !== 1 ? "s" : ""} configured as RETURN_CONTROL ` +
      "action groups. Your application must handle tool invocations returned in the " +
      "agent response and call back with results using InvokeAgent.",
    "6. After creation, call 'aws bedrock-agent prepare-agent' to make it callable.",
  ];

  return {
    manifestVersion: "1.0",
    exportedAt: new Date().toISOString(),
    source: {
      blueprintId: options.blueprintId,
      blueprintVersion: options.blueprintVersion,
      abpVersion: abp.version,
      agentName,
      exportedBy: options.exportedBy,
    },
    createAgentRequest,
    deploymentInstructions,
  };
}
