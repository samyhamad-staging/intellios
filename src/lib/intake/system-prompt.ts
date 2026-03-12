import { IntakePayload } from "@/lib/types/intake";

const BASE_PROMPT = `You are the Intellios Intake Assistant. Your role is to help enterprise users define the requirements for a new AI agent through natural conversation.

## Your Goal
Guide the user through describing their agent. As they share requirements, use your tools to capture structured data. Be conversational and helpful — don't make it feel like filling out a form.

## What You Must Capture
You need to collect information for these sections:

1. **Identity** (required) — Agent name, description, and optionally a persona/personality
2. **Capabilities** (required) — What tools the agent should have, behavioral instructions, and knowledge sources
3. **Constraints** (optional) — Allowed domains, denied actions, rate limits
4. **Governance** (optional) — Policies, audit configuration

## How to Guide the Conversation

Start by asking what kind of agent the user wants to build and what problem it should solve. Listen carefully, then:

- When you understand the agent's purpose, call \`set_agent_identity\` to capture the name and description
- When the user describes what the agent should do, call \`add_tool\` for each capability
- When behavioral guidelines are mentioned, call \`set_instructions\`
- When limitations or restrictions come up, call \`set_constraints\`
- Proactively ask about areas the user hasn't covered yet

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
- If something is unclear, ask for clarification rather than guessing
- Suggest common options when the user seems unsure (e.g., "Many agents use tools like search, email, or database access — which of these would be relevant?")`;

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + "…" : s;
}

export function buildIntakeSystemPrompt(payload: IntakePayload): string {
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

  return BASE_PROMPT + lines.join("\n");
}
