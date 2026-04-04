import { z } from "zod";
import { tool, zodSchema } from "ai";
import { IntakePayload, IntakeContext, AgentType, IntakeRiskTier, CaptureVerificationItem, PolicyQualityItem } from "@/lib/types/intake";

// ── Agent name validation ─────────────────────────────────────────────────────
// Rejects names that are very likely a person's first name rather than a
// functional agent name. Uses an exact-match (case-insensitive) blocklist of
// the most common English first names. Only triggers on single-word names —
// "Customer Support Agent" always passes regardless of first token.

const COMMON_FIRST_NAMES = new Set([
  // Top male names
  "james","john","robert","michael","william","david","richard","joseph","thomas","charles",
  "christopher","daniel","matthew","anthony","mark","donald","steven","steve","paul","andrew",
  "joshua","kenneth","kevin","brian","george","timothy","ronald","edward","jason","jeffrey",
  "ryan","jacob","gary","nicholas","eric","jonathan","stephen","larry","justin","scott",
  "brandon","benjamin","samuel","raymond","gregory","frank","alexander","patrick","jack",
  "dennis","jerry","peter","pete","bob","jim","tom","mike","joe","bill","dave","rob","tim",
  "nick","dan","ben","phil","matt","adam","alan","carl","neil","sean","ian","fred","ed","ted",
  // Top female names
  "mary","patricia","jennifer","linda","barbara","elizabeth","susan","jessica","sarah","karen",
  "lisa","nancy","betty","margaret","sandra","ashley","dorothy","kimberly","emily","donna",
  "michelle","carol","amanda","melissa","deborah","stephanie","rebecca","sharon","laura",
  "cynthia","kathleen","amy","angela","shirley","anna","brenda","pamela","emma","nicole",
  "helen","samantha","katherine","christine","debra","rachel","carolyn","janet","catherine",
  "maria","heather","diane","julie","joyce","victoria","kelly","christina","lauren","joan",
  "evelyn","olivia","judith","megan","cheryl","alice","ann","jean","denise","frances",
  "danielle","amber","kate","beth","sue","meg","kim","pat","liz","jan","sue","sara","lisa",
  "rose","ruth","grace","claire","amy","eve","ella","maya","zoe","lucy","ruby","iris",
]);

/**
 * Returns true if `name` looks like a human first name rather than a functional
 * agent name. Only single-word names are tested — multi-word names always pass.
 */
function looksLikeHumanName(name: string): boolean {
  const trimmed = name.trim();
  // Multi-word names are functional by definition ("Customer Support Agent")
  if (/\s/.test(trimmed)) return false;
  // All-caps single words are likely acronyms (e.g. "SAM", "ARIA") — pass
  if (trimmed === trimmed.toUpperCase() && trimmed.length > 1) return false;
  return COMMON_FIRST_NAMES.has(trimmed.toLowerCase());
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Derive which governance policies are required given the intake context.
 * Returns an array of { type, reason } for each required but missing policy.
 */
function checkGovernanceSufficiency(
  payload: IntakePayload,
  context: IntakeContext | null | undefined,
  captureVerification?: CaptureVerificationItem[],
  riskTier?: IntakeRiskTier | null
): Array<{ type: string; reason: string }> {
  if (!context) return [];

  // Tier-based early return: low-risk agents skip most checks
  if (riskTier === "low") {
    const policyTypes = (payload.governance?.policies ?? []).map((p) => p.type);
    const hasAnyPolicy = policyTypes.length > 0;
    const gaps: Array<{ type: string; reason: string }> = [];
    // Low risk only requires identity + tools (checked separately); governance is optional
    // Only block on explicitly uncaptured items from capture verification
    for (const item of captureVerification ?? []) {
      if (item.capturedAs === null) {
        gaps.push({
          type: "uncaptured requirement",
          reason: `"${item.area}": ${item.mentioned} — was discussed but not captured.`,
        });
      }
    }
    void hasAnyPolicy; // suppress unused warning
    return gaps;
  }

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

  // ── Substance check ────────────────────────────────────────────────────────
  // For each required policy type that passed the presence check above, verify
  // the policy has at least one rule or a non-trivial description.
  // An empty policy shell provides no audit evidence.
  const isSubstantive = (p: { rules?: string[]; description?: string }): boolean =>
    (p.rules?.filter((r) => r.trim().length > 0).length ?? 0) > 0 ||
    (p.description !== undefined && p.description.trim().length >= 25);

  const requiredTypes: string[] = [];
  if (context.dataSensitivity === "pii" || context.dataSensitivity === "regulated") {
    requiredTypes.push("data_handling");
  }
  if (context.regulatoryScope.includes("FINRA") || context.regulatoryScope.includes("SOX")) {
    requiredTypes.push("compliance");
  }
  if (context.regulatoryScope.includes("GDPR") || context.regulatoryScope.includes("HIPAA")) {
    if (!requiredTypes.includes("data_handling")) requiredTypes.push("data_handling");
  }
  if (context.deploymentType === "customer-facing" || context.deploymentType === "partner-facing") {
    requiredTypes.push("safety");
  }
  if (context.integrationTypes.includes("external-apis")) {
    requiredTypes.push("access_control");
  }

  // Tier-driven additional requirements
  if (riskTier === "high" || riskTier === "critical") {
    if (!requiredTypes.includes("compliance")) requiredTypes.push("compliance");
    if (!requiredTypes.includes("audit")) requiredTypes.push("audit");
    if (!hasAuditRetention)
      gaps.push({ type: "audit config with retention_days", reason: `${riskTier} risk tier requires a defined audit retention period` });
  }
  if (riskTier === "critical") {
    if (!requiredTypes.includes("safety")) requiredTypes.push("safety");
    if (!requiredTypes.includes("data_handling")) requiredTypes.push("data_handling");
    if (!requiredTypes.includes("access_control")) requiredTypes.push("access_control");
    for (const type of ["safety", "compliance", "data_handling", "access_control"] as const) {
      if (!(payload.governance?.policies ?? []).some((p) => p.type === type)) {
        gaps.push({ type: `${type} policy`, reason: `critical risk tier requires all 5 policy types` });
      }
    }
  }

  for (const requiredType of requiredTypes) {
    const matchingPolicy = (payload.governance?.policies ?? []).find((p) => p.type === requiredType);
    if (matchingPolicy && !isSubstantive(matchingPolicy)) {
      gaps.push({
        type: `${requiredType}_substance`,
        reason: `"${matchingPolicy.name}" (${requiredType} policy) has no rules or description — add the specific controls it enforces`,
      });
    }
  }

  // ── Capture verification gate ───────────────────────────────────────────────
  // Any requirement discussed but not captured in a tool call blocks finalization.
  // Policy quality issues (adequate=false) are warnings only — stored and shown to
  // reviewers in Phase 3 but do not block the designer from proceeding.
  for (const item of captureVerification ?? []) {
    if (item.capturedAs === null) {
      gaps.push({
        type: `uncaptured requirement`,
        reason: `"${item.area}": ${item.mentioned} — was discussed but not captured in any tool call. Go back and capture it before finalizing.`,
      });
    }
  }

  return gaps;
}

export function createIntakeTools(
  getPayload: () => IntakePayload,
  updatePayload: (updater: (current: IntakePayload) => IntakePayload) => Promise<void>,
  finalizeSession: () => Promise<void>,
  getContext?: () => IntakeContext | null | undefined,
  getRiskTier?: () => IntakeRiskTier | null | undefined,
  onContextSubmit?: (context: IntakeContext) => Promise<{ agentType: AgentType; riskTier: IntakeRiskTier } | null>
) {
  return {
    submit_intake_context: tool({
      description:
        "Submit the structured context collected from the user. Call this once you have confirmed all 6 context fields. " +
        "This initializes the session and transitions to full requirement capture.",
      inputSchema: zodSchema(z.object({
        agentPurpose: z.string().describe("What the agent does and what problem it solves"),
        deploymentType: z.enum(["internal-only", "customer-facing", "partner-facing", "automated-pipeline"])
          .describe("How the agent will be deployed"),
        dataSensitivity: z.enum(["public", "internal", "confidential", "pii", "regulated"])
          .describe("Highest sensitivity level of data the agent will handle"),
        regulatoryScope: z.array(z.enum(["FINRA", "SOX", "GDPR", "HIPAA", "PCI-DSS", "none"]))
          .describe("Applicable regulatory frameworks"),
        integrationTypes: z.array(z.enum(["internal-apis", "external-apis", "databases", "file-systems", "none"]))
          .describe("Systems the agent will integrate with"),
        stakeholdersConsulted: z.array(z.enum(["legal", "compliance", "security", "it", "business-owner", "none"]))
          .describe("Stakeholders who should be consulted during intake"),
      })),
      execute: async (context) => {
        if (onContextSubmit) {
          const classification = await onContextSubmit(context);
          return {
            success: true,
            message: classification
              ? `Context saved. Agent classified as ${classification.agentType} with ${classification.riskTier.toUpperCase()} risk tier. Now proceed with capturing detailed requirements.`
              : "Context saved. Classification in progress. Now proceed with capturing detailed requirements.",
          };
        }
        return { success: true, message: "Context saved." };
      },
    }),

    set_agent_identity: tool({
      description:
        "Set the agent's name, description, and optional persona. Call this when you understand what the agent is and what it does.",
      inputSchema: zodSchema(z.object({
        name: z.string().describe("Functional display name of the agent (e.g. 'Customer Support Agent', 'Billing Assistant') — not a person's first name"),
        description: z.string().describe("What the agent does, in one or two sentences"),
        persona: z.string().optional().describe("Personality and communication style"),
      })),
      execute: async ({ name, description, persona }) => {
        // Guard: reject names that look like a human first name.
        // Agent names should be functional ("Billing Assistant") not personal ("Steve").
        if (looksLikeHumanName(name)) {
          return {
            success: false,
            error:
              `"${name}" appears to be a person's first name rather than a functional agent name. ` +
              `Agent names should describe what the agent does (e.g. "Customer Support Agent", "Compliance Monitor", "BillingBot"). ` +
              `Ask the user what they'd like to call the agent in terms of its role or function.`,
          };
        }
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
        await updatePayload((p) => ({
          ...p,
          _flags: [
            ...(p._flags ?? []),
            {
              id: `flag-${Date.now()}`,
              field,
              description,
              userStatement,
              flaggedAt: new Date().toISOString(),
              resolved: false,
            },
          ],
        }));
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
        "Mark the intake as complete. Only call this when the user has confirmed they are satisfied with the captured requirements. " +
        "You MUST provide: (1) captureVerification — for every significant requirement mentioned in the conversation, confirm whether it was captured in a tool call; " +
        "(2) policyQualityAssessment — rate whether each governance policy is specific and operational (not abstract). " +
        "Uncaptured requirements will block finalization. Inadequate policies are flagged as warnings for reviewers.",
      inputSchema: zodSchema(z.object({
        confirmation: z.string().describe("Brief note confirming the user agreed to finalize"),
        captureVerification: z.array(z.object({
          area: z.string().describe("Topic area (e.g., 'denied actions', 'data retention', 'safety guardrails', 'rate limits')"),
          mentioned: z.string().describe("What the user said about this area during the conversation"),
          capturedAs: z.string().nullable().describe("Tool + field used to capture it (e.g., 'set_constraints.denied_actions'). Set to null if NOT captured in any tool call."),
        })).describe("Enumerate every significant requirement discussed in the conversation and whether it was captured in a tool call"),
        policyQualityAssessment: z.array(z.object({
          policyName: z.string().describe("Exact name of the captured governance policy"),
          adequate: z.boolean().describe("True if the policy names specific behaviors or thresholds; false if it is too abstract to be enforced"),
          reason: z.string().describe("One-sentence explanation of the rating"),
        })).describe("Rate the content quality of each governance policy captured — adequate means specific and operational, not abstract goals like 'be safe'"),
      })),
      execute: async ({ confirmation, captureVerification, policyQualityAssessment }) => {
        const payload = getPayload();
        if (!payload.identity?.name) {
          return { success: false, error: "Agent identity (name) is required before finalizing." };
        }
        if (!payload.capabilities?.tools?.length) {
          return { success: false, error: "At least one capability/tool is required before finalizing." };
        }

        // Context-driven governance sufficiency check (includes capture verification gate)
        const context = getContext?.();
        const riskTier = getRiskTier?.() ?? null;
        const governanceGaps = checkGovernanceSufficiency(payload, context, captureVerification, riskTier);
        if (governanceGaps.length > 0) {
          const gapList = governanceGaps.map((g) => `• ${g.type} (${g.reason})`).join("\n");
          return {
            success: false,
            error: `The following requirements must be addressed before finalizing:\n${gapList}\n\nPlease address each item above with the user.`,
          };
        }

        // Persist the assessments into the payload so Phase 3 review can surface them.
        // Policy quality issues (adequate=false) are warnings only — reviewers see them.
        await updatePayload((p) => ({
          ...p,
          _captureVerification: captureVerification,
          _policyQualityAssessment: policyQualityAssessment,
        }));

        await finalizeSession();
        return { success: true, message: "Intake marked as complete.", confirmation };
      },
    }),
  };
}
