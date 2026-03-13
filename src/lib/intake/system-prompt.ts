import { IntakePayload, IntakeContext, StakeholderContribution } from "@/lib/types/intake";

const BASE_PROMPT = `You are the Intellios Intake Assistant. Your role is to help enterprise users define the requirements for a new AI agent through natural conversation.

## Your Goal
Guide the user through describing their agent. As they share requirements, use your tools to capture structured data. Be conversational and helpful — don't make it feel like filling out a form.

## What You Must Capture
You need to collect information for these sections:

1. **Identity** (required) — Agent name, description, and optionally a persona/personality
2. **Capabilities** (required) — What tools the agent should have, behavioral instructions, and knowledge sources
3. **Constraints** (optional) — Allowed domains, denied actions, rate limits
4. **Governance** (required based on context — see Mandatory Governance section below) — Policies, audit configuration

## How to Guide the Conversation

The user has already provided their agent's purpose and enterprise context. Start by acknowledging their purpose and asking one focused clarifying question to begin building the requirements. Do NOT re-ask what they already told you in the context block below.

- When you understand the agent's identity, call \`set_agent_identity\` to capture the name and description
- When the user describes what the agent should do, call \`add_tool\` for each capability
- When behavioral guidelines are mentioned, call \`set_instructions\`
- When limitations or restrictions come up, call \`set_constraints\`
- Proactively ask about areas the user hasn't covered yet
- If a requirement is ambiguous or contradictory, call \`flag_ambiguous_requirement\` to record it — then ask for clarification

## Tool Usage Rules

- Call tools as soon as you have enough information — don't wait until the end
- You can call multiple tools in a single response if the user provides information about multiple areas
- Use the Current State section below to track what's been captured and what's still needed — you do NOT need to call \`get_intake_summary\` to check progress
- When all required sections are filled and the user seems satisfied, summarize what you've captured and ask if they'd like to finalize
- Only call \`mark_intake_complete\` when the user explicitly confirms they're done

## Conversation Style

- Be concise but thorough
- Ask one or two questions at a time, not a long list
- Acknowledge what the user says before asking the next question
- If something is unclear, call \`flag_ambiguous_requirement\` and then ask for clarification — do not guess
- Suggest common options when the user seems unsure (e.g., "Many agents use tools like search, email, or database access — which of these would be relevant?")`;

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + "…" : s;
}

function buildContextBlock(context: IntakeContext): string {
  const lines: string[] = [
    "",
    "## Enterprise Context (captured in Phase 1)",
    "",
    "The following context was provided by the user before this conversation. Use it to:",
    "1. Frame your opening message around the stated agent purpose",
    "2. Apply the mandatory governance probing rules below",
    "3. Do NOT ask the user to re-state any of this information",
    "",
    `**Agent purpose**: ${context.agentPurpose}`,
    `**Deployment type**: ${context.deploymentType}`,
    `**Data sensitivity**: ${context.dataSensitivity}`,
    `**Regulatory scope**: ${context.regulatoryScope.join(", ") || "none"}`,
    `**System integrations**: ${context.integrationTypes.join(", ") || "none"}`,
    `**Stakeholders consulted**: ${context.stakeholdersConsulted.join(", ") || "none"}`,
    "",
    "## Mandatory Governance Probing Rules",
    "",
    "Based on the context above, you MUST ensure the following are captured before allowing finalization:",
  ];

  const rules: string[] = [];

  if (context.dataSensitivity === "pii" || context.dataSensitivity === "regulated") {
    rules.push("• **Data handling policy** (required): data sensitivity is PII/regulated — ask the user to define data handling rules and call `add_governance_policy` with type=data_handling");
    rules.push("• **Audit configuration** (required): PII/regulated data requires logging — ensure `set_audit_config` is called with log_interactions=true and a retention_days value");
  }

  if (context.regulatoryScope.includes("FINRA") || context.regulatoryScope.includes("SOX")) {
    rules.push("• **Compliance policy** (required): FINRA/SOX scope — ask the user to define the compliance policy and call `add_governance_policy` with type=compliance");
    if (!context.dataSensitivity.match(/pii|regulated/)) {
      rules.push("• **Audit retention** (required): regulatory scope requires retention — ensure `set_audit_config` is called with a retention_days value");
    }
  }

  if (context.regulatoryScope.includes("GDPR") || context.regulatoryScope.includes("HIPAA")) {
    rules.push("• **Data handling policy** (required): GDPR/HIPAA scope — ask the user to define data handling rules and call `add_governance_policy` with type=data_handling");
    rules.push("• **PII redaction** (required): GDPR/HIPAA agents should have PII redaction — ensure `set_audit_config` is called with pii_redaction=true");
  }

  if (context.deploymentType === "customer-facing" || context.deploymentType === "partner-facing") {
    rules.push("• **Safety policy** (required): customer/partner-facing agents must have a safety policy — ask the user to define safety guardrails and call `add_governance_policy` with type=safety");
    rules.push("• **Behavioral instructions** (required): customer-facing agents need explicit behavioral instructions — ensure `set_instructions` is called");
  }

  if (context.integrationTypes.includes("external-apis")) {
    rules.push("• **Access control policy** (required): external API integrations require an access control policy — ask the user about API authorization and call `add_governance_policy` with type=access_control");
  }

  if (rules.length === 0) {
    lines.push("No mandatory governance rules triggered by this context. Standard probing applies.");
  } else {
    lines.push(...rules);
  }

  lines.push("");
  lines.push("**Policy substance requirement**: When adding a governance policy with `add_governance_policy`, always include at least one specific rule in `rules[]` or a substantive `description` (≥25 characters). Empty policy shells will be rejected at finalization — specify the actual controls, prohibitions, or requirements the policy enforces.");
  lines.push("");
  lines.push("If any of the above are not captured when the user tries to finalize, `mark_intake_complete` will reject the call with a clear explanation of what is missing.");

  return lines.join("\n");
}

// Human-readable field labels for the system prompt
const CONTRIBUTION_FIELD_LABELS: Record<string, string> = {
  required_policies: "Required policies",
  regulatory_constraints: "Regulatory constraints",
  audit_requirements: "Audit requirements",
  risk_thresholds: "Risk thresholds",
  denied_scenarios: "Denied scenarios",
  escalation_requirements: "Escalation requirements",
  use_boundaries: "Permitted use boundaries",
  prohibited_use_cases: "Prohibited use cases",
  access_control_requirements: "Access control requirements",
  data_handling_requirements: "Data handling requirements",
  integration_requirements: "Integration requirements",
  infrastructure_constraints: "Infrastructure constraints",
  sla_requirements: "SLA requirements",
  escalation_paths: "Escalation paths",
  success_criteria: "Success criteria",
  business_constraints: "Business constraints",
};

function buildContributionsBlock(contributions: StakeholderContribution[]): string {
  if (contributions.length === 0) return "";

  const lines: string[] = [
    "",
    "## Stakeholder Contributions",
    "",
    "The following requirements were submitted directly by domain experts before or during this intake session.",
    "These are authoritative inputs from stakeholders who own those domains.",
    "",
    "**You MUST incorporate these requirements verbatim.** Do not paraphrase, generalize, or omit them.",
    "When a stakeholder has identified a specific policy, constraint, or requirement:",
    "- Capture it using the appropriate tool (add_governance_policy, set_constraints, set_instructions, etc.)",
    "- Reference the stakeholder's exact language when calling the tool",
    "- Ensure `mark_intake_complete` cannot succeed if these requirements remain uncaptured",
    "",
  ];

  for (const c of contributions) {
    const nonEmptyEntries = Object.entries(c.fields).filter(([, v]) => v.trim().length > 0);
    if (nonEmptyEntries.length === 0) continue;

    lines.push(`### ${c.domain.charAt(0).toUpperCase() + c.domain.slice(1)} — ${c.contributorEmail} (${c.contributorRole})`);
    for (const [key, value] of nonEmptyEntries) {
      const label = CONTRIBUTION_FIELD_LABELS[key] ?? key;
      lines.push(`- **${label}**: ${value}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

export function buildIntakeSystemPrompt(
  payload: IntakePayload,
  context?: IntakeContext | null,
  contributions?: StakeholderContribution[]
): string {
  const identity = payload.identity;
  const capabilities = payload.capabilities;
  const constraints = payload.constraints;
  const governance = payload.governance;

  const hasIdentity = !!(identity?.name && identity?.description);
  const hasTools = (capabilities?.tools?.length ?? 0) > 0;
  const hasInstructions = !!capabilities?.instructions;
  const hasKnowledge = (capabilities?.knowledge_sources?.length ?? 0) > 0;
  const hasConstraints =
    (constraints?.allowed_domains?.length ?? 0) > 0 ||
    (constraints?.denied_actions?.length ?? 0) > 0;
  const hasGovernance = (governance?.policies?.length ?? 0) > 0;
  const hasAudit = governance?.audit !== undefined;

  const lines: string[] = [
    "",
    "## Current State",
    "",
    "The following has already been captured in this session. Do not re-ask for information that is already filled.",
    "",
  ];

  // Identity
  if (hasIdentity) {
    lines.push(`✓ **Identity**: "${identity!.name}" — ${truncate(identity!.description!, 100)}`);
    if (identity?.persona) lines.push(`  Persona: ${truncate(identity.persona, 80)}`);
  } else {
    lines.push("✗ **Identity**: not captured yet (REQUIRED)");
  }

  // Tools
  if (hasTools) {
    const toolNames = capabilities!.tools!.map((t) => `${t.name} (${t.type})`).join(", ");
    lines.push(`✓ **Tools**: ${capabilities!.tools!.length} tool(s) — ${toolNames}`);
  } else {
    lines.push("✗ **Tools**: none captured yet (REQUIRED — at least one needed)");
  }

  // Instructions
  if (hasInstructions) {
    lines.push(`✓ **Instructions**: ${truncate(capabilities!.instructions!, 120)}`);
  } else {
    lines.push("✗ **Instructions**: not set");
  }

  // Knowledge sources
  if (hasKnowledge) {
    const sourceNames = capabilities!.knowledge_sources!.map((s) => `${s.name} (${s.type})`).join(", ");
    lines.push(`✓ **Knowledge Sources**: ${capabilities!.knowledge_sources!.length} source(s) — ${sourceNames}`);
  } else {
    lines.push("✗ **Knowledge Sources**: none added");
  }

  // Constraints
  if (hasConstraints) {
    const parts: string[] = [];
    if (constraints?.allowed_domains?.length)
      parts.push(`${constraints.allowed_domains.length} allowed domain(s): ${constraints.allowed_domains.join(", ")}`);
    if (constraints?.denied_actions?.length)
      parts.push(`${constraints.denied_actions.length} denied action(s): ${constraints.denied_actions.join(", ")}`);
    lines.push(`✓ **Constraints**: ${parts.join(" · ")}`);
  } else {
    lines.push("✗ **Constraints**: none set");
  }

  // Governance
  if (hasGovernance) {
    const policyNames = governance!.policies!.map((p) => `${p.name} (${p.type})`).join(", ");
    lines.push(`✓ **Governance**: ${governance!.policies!.length} polic(ies) — ${policyNames}`);
  } else {
    lines.push("✗ **Governance**: no policies attached");
  }

  // Audit
  if (hasAudit) {
    const a = governance!.audit!;
    const parts: string[] = [];
    if (a.log_interactions !== undefined) parts.push(`logging ${a.log_interactions ? "on" : "off"}`);
    if (a.retention_days !== undefined) parts.push(`${a.retention_days}-day retention`);
    if (a.pii_redaction !== undefined) parts.push(`PII redaction ${a.pii_redaction ? "on" : "off"}`);
    lines.push(`✓ **Audit**: ${parts.join(" · ") || "configured"}`);
  } else {
    lines.push("✗ **Audit**: not configured");
  }

  // Required sections still missing
  const missing: string[] = [];
  if (!hasIdentity) missing.push("Identity");
  if (!hasTools) missing.push("Tools");

  lines.push("");
  if (missing.length > 0) {
    lines.push(`**Still required before finalizing**: ${missing.join(", ")}`);
  } else {
    lines.push("**All required sections are filled.** When the user is satisfied, summarize and offer to finalize.");
  }

  // Inject context block if context was provided in Phase 1
  const contextBlock = context ? buildContextBlock(context) : "";

  // Inject contributions block between context and current state (when non-empty)
  const contributionsBlock =
    contributions && contributions.length > 0 ? buildContributionsBlock(contributions) : "";

  return BASE_PROMPT + contextBlock + contributionsBlock + lines.join("\n");
}
