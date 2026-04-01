/**
 * Domain Progress computation for the intake domain progress strip.
 *
 * Computes per-domain fill levels (0–4 richness scale) from the current
 * IntakePayload, and infers which domain the AI is currently targeting
 * from tool calls and probing topics.
 */

import type { IntakePayload, IntakeContext, IntakeRiskTier } from "@/lib/types/intake";
import type { DomainProgress } from "@/lib/types/intake-transparency";
import type { ProbingTopic } from "@/lib/types/intake-transparency";

// ── Domain definitions ──────────────────────────────────────────────────────

const DOMAIN_DEFINITIONS: ReadonlyArray<{
  key: string;
  label: string;
  icon: string;
}> = [
  { key: "identity",     label: "Purpose",      icon: "\u25CE" }, // ◎
  { key: "tools",        label: "Capabilities", icon: "\u2699" }, // ⚙
  { key: "instructions", label: "Behavior",     icon: "\uD83D\uDCCB" }, // 📋
  { key: "knowledge",    label: "Knowledge",    icon: "\uD83D\uDCDA" }, // 📚
  { key: "constraints",  label: "Guardrails",   icon: "\uD83D\uDEA7" }, // 🚧
  { key: "governance",   label: "Governance",   icon: "\uD83D\uDEE1" }, // 🛡
  { key: "audit",        label: "Audit",        icon: "\uD83D\uDCDD" }, // 📝
];

// ── Item count per domain (mirrors completeness-map.tsx logic) ──────────────

function getDomainItemCount(domain: string, payload: IntakePayload): number {
  switch (domain) {
    case "identity": {
      let count = 0;
      if (payload.identity?.name) count++;
      if (payload.identity?.description) count++;
      if (payload.identity?.persona) count++;
      if (payload.identity?.branding) count++;
      return count;
    }
    case "tools":
      return payload.capabilities?.tools?.length ?? 0;
    case "instructions":
      // Count based on instruction length — richer instructions = more items
      const len = payload.capabilities?.instructions?.length ?? 0;
      if (len === 0) return 0;
      if (len < 50) return 1;
      if (len < 200) return 2;
      if (len < 500) return 3;
      return 4;
    case "knowledge":
      return payload.capabilities?.knowledge_sources?.length ?? 0;
    case "constraints":
      return (
        (payload.constraints?.allowed_domains?.length ?? 0) +
        (payload.constraints?.denied_actions?.length ?? 0) +
        (payload.constraints?.max_tokens_per_response !== undefined ? 1 : 0) +
        (payload.constraints?.rate_limits ? 1 : 0)
      );
    case "governance": {
      const policies = payload.governance?.policies ?? [];
      // Count distinct policy types — diversity matters more than raw count
      const types = new Set(policies.map((p) => p.type));
      return types.size;
    }
    case "audit": {
      const audit = payload.governance?.audit;
      if (!audit) return 0;
      let count = 0;
      if (audit.log_interactions !== undefined) count++;
      if (audit.retention_days !== undefined) count++;
      if (audit.pii_redaction !== undefined) count++;
      return count;
    }
    default:
      return 0;
  }
}

// ── Required section logic (mirrors completeness-map.tsx) ───────────────────

function isDomainRequired(
  domain: string,
  context: IntakeContext | null | undefined,
  riskTier: IntakeRiskTier | null
): boolean {
  if (domain === "identity" || domain === "tools") return true;
  if (!context || !riskTier) return false;

  if (domain === "governance") {
    if (riskTier === "medium" || riskTier === "high" || riskTier === "critical") {
      if (
        context.dataSensitivity === "pii" ||
        context.dataSensitivity === "regulated" ||
        context.deploymentType === "customer-facing" ||
        context.deploymentType === "partner-facing" ||
        (context.integrationTypes ?? []).includes("external-apis") ||
        (context.regulatoryScope ?? []).some((s) => s !== "none")
      ) {
        return true;
      }
    }
  }
  if (domain === "audit") {
    if (context.dataSensitivity === "pii" || context.dataSensitivity === "regulated") return true;
  }
  if (domain === "instructions") {
    if (context.deploymentType === "customer-facing" || context.deploymentType === "partner-facing") {
      return true;
    }
  }
  return false;
}

// ── Fill level computation (0–4 richness scale) ────────────────────────────

/** Adequacy thresholds per domain per risk tier. Reaching this = fillLevel 3. */
const ADEQUACY_THRESHOLDS: Record<string, Partial<Record<IntakeRiskTier, number>>> = {
  identity:     { low: 2, medium: 2, high: 3, critical: 3 },
  tools:        { low: 1, medium: 2, high: 2, critical: 3 },
  instructions: { low: 1, medium: 2, high: 3, critical: 3 },
  knowledge:    { low: 1, medium: 1, high: 2, critical: 2 },
  constraints:  { low: 1, medium: 2, high: 2, critical: 3 },
  governance:   { low: 1, medium: 2, high: 3, critical: 5 },
  audit:        { low: 1, medium: 1, high: 2, critical: 3 },
};

/** Rich threshold — exceeding this = fillLevel 4. */
const RICH_THRESHOLDS: Record<string, number> = {
  identity: 3,
  tools: 3,
  instructions: 3,
  knowledge: 3,
  constraints: 3,
  governance: 4,
  audit: 3,
};

function computeFillLevel(
  domain: string,
  itemCount: number,
  riskTier: IntakeRiskTier | null
): { fillLevel: 0 | 1 | 2 | 3 | 4; status: DomainProgress["status"] } {
  if (itemCount === 0) return { fillLevel: 0, status: "empty" };

  const tier = riskTier ?? "medium";
  const adequacy = ADEQUACY_THRESHOLDS[domain]?.[tier] ?? 2;
  const rich = RICH_THRESHOLDS[domain] ?? 3;

  if (itemCount >= rich && itemCount >= adequacy) {
    return { fillLevel: 4, status: "rich" };
  }
  if (itemCount >= adequacy) {
    return { fillLevel: 3, status: "adequate" };
  }
  if (itemCount >= Math.ceil(adequacy / 2)) {
    return { fillLevel: 2, status: "developing" };
  }
  return { fillLevel: 1, status: "started" };
}

// ── Public API ──────────────────────────────────────────────────────────────

export function computeDomainProgress(
  payload: IntakePayload,
  context: IntakeContext | null | undefined,
  riskTier: IntakeRiskTier | null
): DomainProgress[] {
  return DOMAIN_DEFINITIONS.map((def) => {
    const itemCount = getDomainItemCount(def.key, payload);
    const { fillLevel, status } = computeFillLevel(def.key, itemCount, riskTier);
    const required = isDomainRequired(def.key, context, riskTier);

    return {
      key: def.key,
      label: def.label,
      icon: def.icon,
      fillLevel,
      status,
      itemCount,
      required,
    };
  });
}

// ── Tool → domain mapping ──────────────────────────────────────────────────

const TOOL_DOMAIN_MAP: Record<string, string> = {
  set_agent_identity:    "identity",
  set_branding:          "identity",
  add_tool:              "tools",
  set_instructions:      "instructions",
  add_knowledge_source:  "knowledge",
  set_constraints:       "constraints",
  add_governance_policy: "governance",
  set_audit_config:      "audit",
};

// Probing topic keywords → domain mapping (approximate)
const TOPIC_DOMAIN_MAP: Record<string, string> = {
  "Fallback behavior":          "instructions",
  "Rate limiting":              "constraints",
  "User-facing error messages": "instructions",
  "API authentication":         "governance",
  "Timeout and retry strategy": "constraints",
  "Data freshness":             "knowledge",
  "PII masking scope":          "governance",
  "Human oversight checkpoints":"governance",
  "Override / kill switch":     "constraints",
  "Escalation paths":           "instructions",
  "Confidence signaling":       "instructions",
};

export function inferActiveDomain(
  toolCallNames: string[],
  probingTopics: ProbingTopic[],
  domains: DomainProgress[]
): string | null {
  // 1. Most recent tool call that maps to a domain
  for (let i = toolCallNames.length - 1; i >= 0; i--) {
    const domain = TOOL_DOMAIN_MAP[toolCallNames[i]];
    if (domain) return domain;
  }

  // 2. First uncovered mandatory probing topic
  for (const topic of probingTopics) {
    if (topic.level === "mandatory" && !topic.covered) {
      const domain = TOPIC_DOMAIN_MAP[topic.topic];
      if (domain) return domain;
    }
  }

  // 3. First uncovered recommended probing topic
  for (const topic of probingTopics) {
    if (topic.level === "recommended" && !topic.covered) {
      const domain = TOPIC_DOMAIN_MAP[topic.topic];
      if (domain) return domain;
    }
  }

  // 4. Lowest-fill required domain that isn't already rich
  const requiredIncomplete = domains
    .filter((d) => d.required && d.fillLevel < 4)
    .sort((a, b) => a.fillLevel - b.fillLevel);
  if (requiredIncomplete.length > 0) return requiredIncomplete[0].key;

  // 5. Lowest-fill optional domain
  const optionalIncomplete = domains
    .filter((d) => !d.required && d.fillLevel < 4)
    .sort((a, b) => a.fillLevel - b.fillLevel);
  if (optionalIncomplete.length > 0) return optionalIncomplete[0].key;

  return null;
}
