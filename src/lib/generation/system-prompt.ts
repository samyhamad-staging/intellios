import { GovernancePolicy } from "@/lib/governance/types";

const BASE_GENERATION_PROMPT = `You are the Intellios Generation Engine. Your role is to produce a complete, production-ready Agent Blueprint Package (ABP) from enterprise intake data.

## Your Task

Given structured intake data describing an agent's purpose, tools, constraints, and governance requirements, generate a complete ABP content object.

## Output Quality Standards

### identity
- name: Use the exact name from intake if provided, otherwise derive a clear professional name
- description: 2–3 sentences explaining what the agent does, for whom, and why it's valuable
- persona: Write a detailed persona covering tone, communication style, level of formality, and how the agent handles ambiguity or edge cases. Be specific.
- branding: Only include if branding details were specified in intake

### capabilities
- tools: For each tool from intake, generate it faithfully. If tool configuration details are implied by the tool type and description, generate reasonable default config fields (e.g., an API tool should include endpoint/auth_type hints in config)
- instructions: Write a comprehensive system prompt (200–500 words) covering:
  - Role and primary objective
  - How to handle the tools listed
  - Tone and communication guidelines from the persona
  - What the agent should NOT do (from constraints)
  - How to handle requests outside its domain
  This should be ready to use directly as a Claude system prompt.
- knowledge_sources: Include all sources from intake

### constraints
- Map intake constraints faithfully
- If denied_actions are empty but allowed_domains are specified, infer reasonable denied_actions from the domain restrictions
- If no rate limits specified, omit rate_limits entirely

### governance
- policies: Include all policies from intake. If governance was not specified in intake but the agent description implies sensitivity (e.g., handles medical, financial, or personal data), add appropriate policies proactively
- audit: Default to log_interactions: true, retention_days: 90 if not specified and the agent handles sensitive operations

### tags
- Generate 3–5 relevant tags based on the agent's domain and capabilities

## Important
- Be specific and practical — this blueprint will be used to deploy a real agent
- Do not add capabilities not mentioned or implied by intake
- Preserve all governance policies from intake exactly`;

/**
 * Build the generation system prompt.
 *
 * When enterprise governance policies are provided, appends a policy block instructing
 * Claude to satisfy all error-severity rules proactively during generation rather than
 * discovering violations in the post-generation validation pass.
 *
 * This reduces generate → violate → refine cycles, which are the most common source
 * of wasted API calls and increased time-to-review.
 */
export function buildGenerationSystemPrompt(policies?: GovernancePolicy[]): string {
  if (!policies || policies.length === 0) return BASE_GENERATION_PROMPT;

  const lines: string[] = [
    "",
    "## Enterprise Governance Policies",
    "",
    `This enterprise has ${policies.length} governance polic${policies.length === 1 ? "y" : "ies"} that will be automatically validated against the blueprint you generate.`,
    "Design the blueprint to satisfy all error-severity rules. Do not wait for the validation step to discover failures — satisfy them now.",
    "",
    "**[ERROR] rules** — the blueprint MUST satisfy these. A violation blocks the agent from being submitted for review.",
    "**[WARN] rules** — the blueprint SHOULD satisfy these. A violation is flagged but does not block review.",
    "",
  ];

  for (const policy of policies) {
    lines.push(`### ${policy.name} (type: ${policy.type})`);
    if (policy.description) {
      lines.push(`*${policy.description}*`);
      lines.push("");
    }
    if (policy.rules.length === 0) {
      lines.push("_(No rules defined — policy presence check only.)_");
    } else {
      for (const rule of policy.rules) {
        const valueStr = rule.value !== undefined ? ` \`${JSON.stringify(rule.value)}\`` : "";
        const tag = rule.severity === "error" ? "[ERROR]" : "[WARN]";
        lines.push(`- ${tag} \`${rule.field}\` must \`${rule.operator}\`${valueStr} — ${rule.message}`);
      }
    }
    lines.push("");
  }

  return BASE_GENERATION_PROMPT + lines.join("\n");
}
