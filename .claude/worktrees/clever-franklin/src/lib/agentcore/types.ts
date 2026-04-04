/**
 * TypeScript types for the subset of the Amazon Bedrock Agent API used by Intellios.
 *
 * These are lightweight hand-written types covering only the fields the translator
 * and deploy client need. They are NOT generated from the full AWS SDK — keeping this
 * layer thin avoids a compile-time dependency on @aws-sdk/client-bedrock-agent.
 *
 * Source: https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent_CreateAgent.html
 */

// ─── Action Groups ────────────────────────────────────────────────────────────

/**
 * A single function parameter within a RETURN_CONTROL action group.
 */
export interface BedrockFunctionParameter {
  name: string;
  description?: string;
  type: "string" | "number" | "integer" | "boolean" | "array" | "object";
  required?: boolean;
}

/**
 * A single function definition inside a RETURN_CONTROL action group.
 */
export interface BedrockFunction {
  name: string;
  description?: string;
  parameters?: Record<string, BedrockFunctionParameter>;
}

/**
 * The function schema for a RETURN_CONTROL action group.
 * Bedrock uses this to understand what the tool does and what arguments it expects.
 */
export interface BedrockFunctionSchema {
  functions: BedrockFunction[];
}

/**
 * An action group that uses the RETURN_CONTROL pattern — Bedrock instructs the
 * calling application to execute the tool, rather than invoking a Lambda function.
 * This is ideal for showcase deployments where no backend infrastructure exists yet.
 */
export interface BedrockActionGroup {
  actionGroupName: string;
  description?: string;
  actionGroupExecutor: {
    customControl: "RETURN_CONTROL";
  };
  functionSchema: BedrockFunctionSchema;
}

// ─── Memory ───────────────────────────────────────────────────────────────────

export type BedrockMemoryType = "SESSION_SUMMARY";

export interface BedrockMemoryConfiguration {
  enabledMemoryTypes: BedrockMemoryType[];
  storageDays?: number;
}

// ─── Guardrail ────────────────────────────────────────────────────────────────

export interface BedrockGuardrailConfiguration {
  guardrailIdentifier: string;
  guardrailVersion: string;
}

// ─── Top-level agent definition ───────────────────────────────────────────────

/**
 * The minimal CreateAgent request body that Intellios generates.
 * Fields intentionally omitted: idleSessionTTLInSeconds, agentCollaboration,
 * customerEncryptionKeyArn, promptOverrideConfiguration (not needed for Phase 1).
 */
export interface BedrockAgentDefinition {
  /** Human-readable name (max 100 chars, alphanumeric + underscores/hyphens). */
  agentName: string;
  description?: string;
  /**
   * The system instruction for the agent. Required by Bedrock (min 40 chars).
   * Maps from ABP.capabilities.instructions.
   */
  instruction: string;
  /**
   * ARN of an IAM role with bedrock:InvokeModel permission.
   * Must be provided by the operator; not stored in Intellios.
   */
  agentResourceRoleArn: string;
  /**
   * Bedrock foundation model ID.
   * Default: "anthropic.claude-3-5-sonnet-20241022-v2:0"
   */
  foundationModel: string;
  actionGroups: BedrockActionGroup[];
  memoryConfiguration?: BedrockMemoryConfiguration;
  guardrailConfiguration?: BedrockGuardrailConfiguration;
  /** Freeform tags for AWS resource management and traceability back to Intellios. */
  tags?: Record<string, string>;
}

// ─── Export manifest (what we return from the export endpoint) ────────────────

/**
 * The full export manifest returned by GET /api/blueprints/[id]/export/agentcore.
 *
 * The manifest is self-contained — an operator can apply it with:
 *   aws bedrock-agent create-agent --cli-input-json '...'
 * after substituting agentResourceRoleArn.
 */
export interface AgentCoreExportManifest {
  /** Manifest format version. */
  manifestVersion: "1.0";
  /** ISO timestamp when this manifest was generated. */
  exportedAt: string;
  /** Source ABP metadata for traceability. */
  source: {
    blueprintId: string;
    blueprintVersion: string;
    abpVersion: string;
    agentName: string;
    exportedBy: string;
  };
  /** The CreateAgent request body. Fill in agentResourceRoleArn before applying. */
  createAgentRequest: BedrockAgentDefinition;
  /**
   * Human-readable deployment instructions included in the manifest for operators
   * who are applying this for the first time.
   */
  deploymentInstructions: string[];
}

// ─── Direct deployment result (Phase 2) ──────────────────────────────────────

/**
 * The result of a successful POST /api/blueprints/[id]/deploy/agentcore call.
 * Stored in agentBlueprints.deploymentMetadata.
 */
export interface AgentCoreDeploymentRecord {
  target: "agentcore";
  agentId: string;
  agentArn: string;
  agentVersion: string;
  region: string;
  foundationModel: string;
  deployedAt: string;
  deployedBy: string;
}
