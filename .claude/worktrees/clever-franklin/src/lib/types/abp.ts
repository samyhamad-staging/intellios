import { z } from "zod";

// ─── Sub-schemas ────────────────────────────────────────────────────────────

const ToolSchema = z.object({
  name: z.string().describe("Tool name (e.g., 'search_web', 'send_email')"),
  type: z
    .enum(["api", "function", "mcp_server", "plugin"])
    .describe("Integration type"),
  description: z.string().optional().describe("What this tool does"),
  config: z
    .record(z.string(), z.unknown())
    .optional()
    .describe("Tool-specific configuration parameters"),
});

const KnowledgeSourceSchema = z.object({
  name: z.string().describe("Name of the knowledge source"),
  type: z
    .enum(["file", "database", "api", "vector_store"])
    .describe("Type of source"),
  uri: z.string().optional().describe("URI or path to the source"),
});

const PolicySchema = z.object({
  name: z.string().describe("Policy name"),
  type: z
    .enum(["safety", "compliance", "data_handling", "access_control", "audit"])
    .describe("Policy category"),
  description: z.string().optional().describe("What this policy enforces"),
  rules: z.array(z.string()).optional().describe("Specific rules"),
});

// ─── Content schema (what Claude generates) ─────────────────────────────────
// Excludes metadata (id, timestamps, status) which the system fills in.

export const ABPContentSchema = z.object({
  identity: z
    .object({
      name: z
        .string()
        .describe("Display name of the agent"),
      description: z
        .string()
        .describe("Human-readable description of what the agent does"),
      persona: z
        .string()
        .optional()
        .describe("Personality, tone, and communication style instructions"),
      branding: z
        .object({
          display_name: z.string().optional(),
          icon_url: z.string().optional(),
          color_primary: z.string().optional(),
          color_secondary: z.string().optional(),
        })
        .optional()
        .describe("White-label branding configuration"),
    })
    .describe("The agent's identity and presentation"),

  capabilities: z
    .object({
      tools: z
        .array(ToolSchema)
        .describe("Tools and integrations the agent can use"),
      instructions: z
        .string()
        .optional()
        .describe(
          "Full system prompt / behavioral instructions for the agent. Should be comprehensive and ready to use."
        ),
      knowledge_sources: z
        .array(KnowledgeSourceSchema)
        .optional()
        .describe("Data sources the agent can reference"),
    })
    .describe("What the agent can do"),

  constraints: z
    .object({
      allowed_domains: z
        .array(z.string())
        .optional()
        .describe("Topics or domains the agent is allowed to operate in"),
      denied_actions: z
        .array(z.string())
        .optional()
        .describe("Actions the agent must never perform"),
      max_tokens_per_response: z
        .number()
        .optional()
        .describe("Maximum response length in tokens"),
      rate_limits: z
        .object({
          requests_per_minute: z.number().optional(),
          requests_per_day: z.number().optional(),
        })
        .optional()
        .describe("Request rate limits"),
    })
    .describe("Behavioral limits and boundaries"),

  governance: z
    .object({
      policies: z
        .array(PolicySchema)
        .describe("Governance policies applied to this agent"),
      audit: z
        .object({
          log_interactions: z.boolean().optional(),
          retention_days: z.number().optional(),
          pii_redaction: z.boolean().optional(),
        })
        .optional()
        .describe("Audit and logging configuration"),
    })
    .describe("Enterprise governance and compliance configuration"),

  tags: z
    .array(z.string())
    .optional()
    .describe("Freeform tags for categorization"),
});

// ─── Execution section (added in ABP v1.1.0) ────────────────────────────────

const ExecutionSchema = z.object({
  observability: z.object({
    metricsEnabled: z.boolean().default(true),
    logLevel: z.enum(["none", "errors", "info", "debug"]).default("errors"),
    samplingRate: z.number().min(0).max(1).default(1.0),
    telemetryEndpoint: z.string().nullable().default(null),
  }).optional(),
  runtimeConstraints: z.object({
    maxTokensPerInteraction: z.number().nullable().default(null),
    maxConcurrentSessions: z.number().nullable().default(null),
    circuitBreakerThreshold: z.number().min(0).max(1).nullable().default(null),
    sessionTimeoutMinutes: z.number().nullable().default(null),
  }).optional(),
  feedback: z.object({
    alertWebhook: z.string().nullable().default(null),
    escalationEmail: z.string().nullable().default(null),
  }).optional(),
});

// ─── Full ABP (content + system metadata) ───────────────────────────────────

export const ABPSchema = z.object({
  version: z.string().default("1.0.0"),
  metadata: z.object({
    id: z.string().uuid(),
    created_at: z.string().datetime(),
    created_by: z.string(),
    status: z.enum(["draft", "in_review", "approved", "rejected", "deprecated", "deployed"]),
    enterprise_id: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }),
  identity: ABPContentSchema.shape.identity,
  capabilities: ABPContentSchema.shape.capabilities,
  constraints: ABPContentSchema.shape.constraints,
  governance: ABPContentSchema.shape.governance,
  /**
   * Organizational ownership and classification metadata.
   * Optional — added in ABP schema v1.2.0.
   * Not generated by the AI; set manually by the designer in the Blueprint Workbench.
   */
  ownership: z
    .object({
      businessUnit: z.string().optional().describe("Business unit or department that owns this agent"),
      ownerEmail: z.string().email().optional().describe("Primary accountable owner email"),
      costCenter: z.string().optional().describe("Cost center code for budget tracking"),
      /**
       * Intended deployment environment.
       * "production" | "staging" | "sandbox" | "internal"
       */
      deploymentEnvironment: z
        .enum(["production", "staging", "sandbox", "internal"])
        .optional()
        .describe("Intended deployment environment"),
      /**
       * Highest data classification level this agent handles.
       * "public" | "internal" | "confidential" | "regulated"
       */
      dataClassification: z
        .enum(["public", "internal", "confidential", "regulated"])
        .optional()
        .describe("Highest data classification level this agent handles"),
    })
    .optional()
    .describe("Organizational ownership and data classification metadata"),
  /**
   * Execution configuration — added in ABP v1.1.0.
   * Covers observability settings, runtime constraints, and alert feedback.
   */
  execution: ExecutionSchema.optional(),
});

export type ABPContent = z.infer<typeof ABPContentSchema>;
export type ABP = z.infer<typeof ABPSchema>;
