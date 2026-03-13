import { z } from "zod";
import { tool, zodSchema } from "ai";
import { IntakePayload, IntakeContext } from "@/lib/types/intake";

/**
 * Derive which governance policies are required given the intake context.
 * Returns an array of { type, reason } for each required but missing policy.
 */
function checkGovernanceSufficiency(
  payload: IntakePayload,
  context: IntakeContext | null | undefined
): Array<{ type: string; reason: string }> {
  if (!context) return [];

  const policyTypes = (payload.governance?.policies ?? []).map((p) => p.type);
  const hasPolicy = (type: string) => policyTypes.includes(type as never);
  const hasAuditRetention = payload.governance?.audit?.retention_days !== undefined;
  const hasAuditLogging = payload.governance?.audit?.log_interactions === true;
  const hasPiiRedaction = payload.governance?.audit?.pii_redaction === true;
  const hasInstructions = !!payload.capabilities?.instructions;

  const gaps: Array<{ type: string; reason: string }> = [];

  if (context.dataSensitivity === "pii" || context.dataSensitivity === "regulated") {
    if (!hasPolicy("data_handling"))
      gaps.push({ type: "data_handling policy", reason: "data sensitivity is PII/regulated" });
    if (!hasAuditLogging)
      gaps.push({ type: "audit config with log_interactions=true", reason: "PII/regulated data requires interaction logging" });
    if (!hasAuditRetention)
      gaps.push({ type: "audit config with retention_days", reason: "PII/regulated data requires a defined retention period" });
  }

  if (context.regulatoryScope.includes("FINRA") || context.regulatoryScope.includes("SOX")) {
    if (!hasPolicy("compliance"))
      gaps.push({ type: "compliance policy", reason: "FINRA/SOX regulatory scope" });
    if (!hasAuditRetention)
      gaps.push({ type: "audit config with retention_days", reason: "FINRA/SOX requires a defined retention period" });
  }

  if (context.regulatoryScope.includes("GDPR") || context.regulatoryScope.includes("HIPAA")) {
    if (!hasPolicy("data_handling"))
      gaps.push({ type: "data_handling policy", reason: "GDPR/HIPAA regulatory scope" });
    if (!hasPiiRedaction)
      gaps.push({ type: "audit config with pii_redaction=true", reason: "GDPR/HIPAA requires PII redaction in logs" });
  }

  if (context.deploymentType === "customer-facing" || context.deploymentType === "partner-facing") {
    if (!hasPolicy("safety"))
      gaps.push({ type: "safety policy", reason: "customer/partner-facing deployment requires safety guardrails" });
    if (!hasInstructions)
      gaps.push({ type: "behavioral instructions (set_instructions)", reason: "customer-facing agents require explicit instructions" });
  }

  if (context.integrationTypes.includes("external-apis")) {
    if (!hasPolicy("access_control"))
      gaps.push({ type: "access_control policy", reason: "external API integrations require access control policies" });
  }

  return gaps;
}

export function createIntakeTools(
  getPayload: () => IntakePayload,
  updatePayload: (updater: (current: IntakePayload) => IntakePayload) => Promise<void>,
  finalizeSession: () => Promise<void>,
  getContext?: () => IntakeContext | null | undefined
) {
  return {
    set_agent_identity: tool({
      description:
        "Set the agent's name, description, and optional persona. Call this when you understand what the agent is and what it does.",
      inputSchema: zodSchema(z.object({
        name: z.string().describe("Display name of the agent"),
        description: z.string().describe("What the agent does, in one or two sentences"),
        persona: z.string().optional().describe("Personality and communication style"),
      })),
      execute: async ({ name, description, persona }) => {
        await updatePayload((p) => ({
          ...p,
          identity: { ...p.identity, name, description, persona },
        }));
        return { success: true, captured: { name, description, persona } };
      },
    }),

    set_branding: tool({
      description:
        "Set white-label branding for the agent. Call when the user specifies branding preferences.",
      inputSchema: zodSchema(z.object({
        display_name: z.string().optional().describe("Branded display name"),
        color_primary: z.string().optional().describe("Primary brand color (hex)"),
        color_secondary: z.string().optional().describe("Secondary brand color (hex)"),
        icon_url: z.string().optional().describe("URL to the agent's icon"),
      })),
      execute: async (branding) => {
        await updatePayload((p) => ({
          ...p,
          identity: { ...p.identity, branding },
        }));
        return { success: true, captured: branding };
      },
    }),

    add_tool: tool({
      description:
        "Add a tool or capability to the agent. Call for each integration or tool the agent should have access to.",
      inputSchema: zodSchema(z.object({
        name: z.string().describe("Tool name (e.g., 'search', 'send_email', 'query_database')"),
        type: z.enum(["api", "function", "mcp_server", "plugin"]).describe("Type of tool"),
        description: z.string().optional().describe("What this tool does"),
      })),
      execute: async (newTool) => {
        const existing = getPayload().capabilities?.tools ?? [];
        if (existing.some((t) => t.name === newTool.name)) {
          // Update existing tool with same name instead of duplicating
          await updatePayload((p) => ({
            ...p,
            capabilities: {
              ...p.capabilities,
              tools: (p.capabilities?.tools ?? []).map((t) =>
                t.name === newTool.name ? newTool : t
              ),
            },
          }));
          return { success: true, updated: newTool };
        }
        await updatePayload((p) => ({
          ...p,
          capabilities: {
            ...p.capabilities,
            tools: [...(p.capabilities?.tools ?? []), newTool],
          },
        }));
        return { success: true, captured: newTool };
      },
    }),

    set_instructions: tool({
      description:
        "Set behavioral instructions for the agent. Call when the user describes how the agent should behave, its tone, or specific rules to follow.",
      inputSchema: zodSchema(z.object({
        instructions: z.string().describe("System prompt or behavioral guidelines"),
      })),
      execute: async ({ instructions }) => {
        await updatePayload((p) => ({
          ...p,
          capabilities: { ...p.capabilities, instructions },
        }));
        return { success: true, captured: { instructions } };
      },
    }),

    add_knowledge_source: tool({
      description:
        "Add a knowledge source the agent can reference. Call when the user mentions data sources, documents, or databases the agent should access.",
      inputSchema: zodSchema(z.object({
        name: z.string().describe("Name of the knowledge source"),
        type: z.enum(["file", "database", "api", "vector_store"]).describe("Type of source"),
        uri: z.string().optional().describe("URI or path to the source"),
      })),
      execute: async (source) => {
        const existing = getPayload().capabilities?.knowledge_sources ?? [];
        if (existing.some((s) => s.name === source.name)) {
          await updatePayload((p) => ({
            ...p,
            capabilities: {
              ...p.capabilities,
              knowledge_sources: (p.capabilities?.knowledge_sources ?? []).map((s) =>
                s.name === source.name ? source : s
              ),
            },
          }));
          return { success: true, updated: source };
        }
        await updatePayload((p) => ({
          ...p,
          capabilities: {
            ...p.capabilities,
            knowledge_sources: [...(p.capabilities?.knowledge_sources ?? []), source],
          },
        }));
        return { success: true, captured: source };
      },
    }),

    set_constraints: tool({
      description:
        "Set behavioral constraints and limits. Call when the user specifies what the agent should NOT do, or operational limits.",
      inputSchema: zodSchema(z.object({
        allowed_domains: z.array(z.string()).optional().describe("Topics or domains the agent can operate in"),
        denied_actions: z.array(z.string()).optional().describe("Actions the agent must never perform"),
        max_tokens_per_response: z.number().optional().describe("Maximum response length in tokens"),
      })),
      execute: async (constraints) => {
        await updatePayload((p) => ({
          ...p,
          constraints: { ...p.constraints, ...constraints },
        }));
        return { success: true, captured: constraints };
      },
    }),

    add_governance_policy: tool({
      description:
        "Attach a governance policy to the agent. Call when the user specifies compliance, safety, or data handling requirements.",
      inputSchema: zodSchema(z.object({
        name: z.string().describe("Policy name"),
        type: z.enum(["safety", "compliance", "data_handling", "access_control", "audit"]).describe("Policy category"),
        description: z.string().optional().describe("What this policy enforces"),
        rules: z.array(z.string()).optional().describe("Specific rules within this policy"),
      })),
      execute: async (policy) => {
        const existing = getPayload().governance?.policies ?? [];
        if (existing.some((p) => p.name === policy.name)) {
          await updatePayload((p) => ({
            ...p,
            governance: {
              ...p.governance,
              policies: (p.governance?.policies ?? []).map((p) =>
                p.name === policy.name ? policy : p
              ),
            },
          }));
          return { success: true, updated: policy };
        }
        await updatePayload((p) => ({
          ...p,
          governance: {
            ...p.governance,
            policies: [...(p.governance?.policies ?? []), policy],
          },
        }));
        return { success: true, captured: policy };
      },
    }),

    set_audit_config: tool({
      description:
        "Configure audit and logging settings. Call when the user specifies logging, data retention, or privacy requirements.",
      inputSchema: zodSchema(z.object({
        log_interactions: z.boolean().optional().describe("Whether to log all interactions"),
        retention_days: z.number().optional().describe("How many days to retain logs"),
        pii_redaction: z.boolean().optional().describe("Whether to redact PII from logs"),
      })),
      execute: async (audit) => {
        await updatePayload((p) => ({
          ...p,
          governance: { ...p.governance, audit },
        }));
        return { success: true, captured: audit };
      },
    }),

    flag_ambiguous_requirement: tool({
      description:
        "Flag an ambiguous or contradictory requirement for human review. Call this when the user's input is unclear, contradictory, or requires interpretation. Then ask the user a clarifying question.",
      inputSchema: zodSchema(z.object({
        field: z.string().describe("Which field or section the ambiguity relates to (e.g. 'constraints.denied_actions', 'governance.policies')"),
        description: z.string().describe("Brief description of the ambiguity or contradiction"),
        userStatement: z.string().describe("The exact or paraphrased statement from the user that is ambiguous"),
      })),
      execute: async ({ field, description, userStatement }) => {
        await updatePayload((p) => {
          const existingFlags = (p as Record<string, unknown>)._flags as Array<Record<string, unknown>> ?? [];
          return {
            ...p,
            _flags: [
              ...existingFlags,
              {
                id: `flag-${Date.now()}`,
                field,
                description,
                userStatement,
                flaggedAt: new Date().toISOString(),
                resolved: false,
              },
            ],
          } as IntakePayload;
        });
        return { success: true, flagged: { field, description } };
      },
    }),

    get_intake_summary: tool({
      description:
        "Get a summary of what has been captured so far. Use this to check completeness and identify missing sections.",
      inputSchema: zodSchema(z.object({})),
      execute: async () => {
        const payload = getPayload();
        const sections = {
          identity: !!payload.identity?.name,
          capabilities: (payload.capabilities?.tools?.length ?? 0) > 0,
          instructions: !!payload.capabilities?.instructions,
          constraints: !!payload.constraints?.allowed_domains || !!payload.constraints?.denied_actions,
          governance: (payload.governance?.policies?.length ?? 0) > 0,
        };
        return { payload, sections, complete: sections.identity && sections.capabilities };
      },
    }),

    mark_intake_complete: tool({
      description:
        "Mark the intake as complete. Only call this when the user has confirmed they are satisfied with the captured requirements.",
      inputSchema: zodSchema(z.object({
        confirmation: z.string().describe("Brief note confirming the user agreed to finalize"),
      })),
      execute: async ({ confirmation }) => {
        const payload = getPayload();
        if (!payload.identity?.name) {
          return { success: false, error: "Agent identity (name) is required before finalizing." };
        }
        if (!payload.capabilities?.tools?.length) {
          return { success: false, error: "At least one capability/tool is required before finalizing." };
        }

        // Context-driven governance sufficiency check
        const context = getContext?.();
        const governanceGaps = checkGovernanceSufficiency(payload, context);
        if (governanceGaps.length > 0) {
          const gapList = governanceGaps.map((g) => `• ${g.type} (${g.reason})`).join("\n");
          return {
            success: false,
            error: `The following governance requirements must be captured before finalizing:\n${gapList}\n\nPlease address each item above with the user.`,
          };
        }

        await finalizeSession();
        return { success: true, message: "Intake marked as complete.", confirmation };
      },
    }),
  };
}
