/**
 * Intake Transparency Helpers — server-side pure functions that produce
 * structured transparency metadata from the same inputs the AI uses.
 *
 * These mirror the logic in classifier.ts, tools.ts, model-selector.ts,
 * and probing.ts but return structured data for the UI instead of
 * string prompts or gap lists.
 */

import type { IntakeContext, IntakePayload, IntakeRiskTier, AgentType, IntakeClassification } from "@/lib/types/intake";
import type {
  IntakeTransparencyMetadata,
  ClassificationTransparency,
  ReadinessTransparency,
  GovernanceChecklistItem,
  ModelTransparency,
  ProbingTopic,
} from "@/lib/types/intake-transparency";
import { computeReadinessScore } from "./readiness";
import { computeDomainProgress, inferActiveDomain } from "./domains";
import type { ExpertiseLevel, ModelSelectionContext } from "./model-selector";

// ── Risk Tier Signal Explainer ───────────────────────────────────────────────
// Mirrors the cascade in euAiActRiskTier (regulatory/classifier.ts lines 54-76)

export function explainRiskTierSignals(ctx: IntakeContext): string[] {
  const signals: string[] = [];
  const { deploymentType, dataSensitivity, regulatoryScope } = ctx;

  // Check all conditions that contribute (strongest first, matching cascade order)
  if (regulatoryScope.includes("HIPAA")) {
    signals.push("HIPAA in regulatory scope");
  }
  if (dataSensitivity === "regulated" && deploymentType !== "internal-only") {
    signals.push("Regulated data in non-internal deployment");
  }
  if (regulatoryScope.includes("FINRA") && deploymentType === "customer-facing") {
    signals.push("FINRA scope with customer-facing deployment");
  }
  if (
    deploymentType === "customer-facing" &&
    (dataSensitivity === "pii" || dataSensitivity === "confidential")
  ) {
    signals.push(`Customer-facing deployment with ${dataSensitivity.toUpperCase()} data`);
  }
  if (deploymentType === "customer-facing" || deploymentType === "partner-facing") {
    signals.push(`${deploymentType} deployment (transparency obligations apply)`);
  }

  // Context-level signals that feed into governance probing
  if (dataSensitivity === "pii" || dataSensitivity === "regulated") {
    signals.push(`Data sensitivity: ${dataSensitivity}`);
  }
  if (regulatoryScope.includes("GDPR")) signals.push("GDPR in regulatory scope");
  if (regulatoryScope.includes("SOX")) signals.push("SOX in regulatory scope");
  if (regulatoryScope.includes("FINRA") && !signals.some((s) => s.includes("FINRA"))) {
    signals.push("FINRA in regulatory scope");
  }
  if (regulatoryScope.includes("PCI-DSS")) signals.push("PCI-DSS in regulatory scope");
  if (ctx.integrationTypes.includes("external-apis")) {
    signals.push("External API integrations");
  }

  // Deduplicate (some signals overlap)
  return [...new Set(signals)];
}

const DEPTH_MAP: Record<IntakeRiskTier, ClassificationTransparency["conversationDepth"]> = {
  low: "streamlined",
  medium: "standard",
  high: "deep",
  critical: "exhaustive",
};

// ── Governance Checklist ─────────────────────────────────────────────────────
// Returns ALL applicable rules with satisfied status (not just gaps).
// Mirrors checkGovernanceSufficiency in tools.ts lines 9-147.

export function getGovernanceChecklist(
  payload: IntakePayload,
  context: IntakeContext | null | undefined,
  riskTier: IntakeRiskTier | null
): GovernanceChecklistItem[] {
  if (!context) return [];
  if (riskTier === "low") return []; // Low-risk agents have no mandatory governance

  const policyTypes = (payload.governance?.policies ?? []).map((p) => p.type);
  const hasPolicy = (type: string) => policyTypes.includes(type as never);
  const hasAuditRetention = payload.governance?.audit?.retention_days !== undefined;
  const hasAuditLogging = payload.governance?.audit?.log_interactions === true;
  const hasPiiRedaction = payload.governance?.audit?.pii_redaction === true;
  const hasInstructions = !!payload.capabilities?.instructions;

  const items: GovernanceChecklistItem[] = [];

  // Data sensitivity → data_handling + audit
  if (context.dataSensitivity === "pii" || context.dataSensitivity === "regulated") {
    items.push({
      type: "Data handling policy",
      reason: `Data sensitivity is ${context.dataSensitivity}`,
      satisfied: hasPolicy("data_handling"),
    });
    items.push({
      type: "Audit logging enabled",
      reason: "PII/regulated data requires interaction logging",
      satisfied: hasAuditLogging,
    });
    items.push({
      type: "Audit retention period",
      reason: "PII/regulated data requires defined retention",
      satisfied: hasAuditRetention,
    });
  }

  // FINRA/SOX → compliance + audit retention
  if (context.regulatoryScope.includes("FINRA") || context.regulatoryScope.includes("SOX")) {
    if (!items.some((i) => i.type === "Compliance policy")) {
      items.push({
        type: "Compliance policy",
        reason: `${context.regulatoryScope.filter((r) => r === "FINRA" || r === "SOX").join("/")} regulatory scope`,
        satisfied: hasPolicy("compliance"),
      });
    }
    if (!items.some((i) => i.type === "Audit retention period")) {
      items.push({
        type: "Audit retention period",
        reason: "FINRA/SOX requires defined retention period",
        satisfied: hasAuditRetention,
      });
    }
  }

  // GDPR/HIPAA → data_handling + PII redaction
  if (context.regulatoryScope.includes("GDPR") || context.regulatoryScope.includes("HIPAA")) {
    if (!items.some((i) => i.type === "Data handling policy")) {
      items.push({
        type: "Data handling policy",
        reason: `${context.regulatoryScope.filter((r) => r === "GDPR" || r === "HIPAA").join("/")} regulatory scope`,
        satisfied: hasPolicy("data_handling"),
      });
    }
    items.push({
      type: "PII redaction in logs",
      reason: "GDPR/HIPAA requires PII redaction",
      satisfied: hasPiiRedaction,
    });
  }

  // Customer/partner-facing → safety + instructions
  if (context.deploymentType === "customer-facing" || context.deploymentType === "partner-facing") {
    items.push({
      type: "Safety policy",
      reason: `${context.deploymentType} deployment requires safety guardrails`,
      satisfied: hasPolicy("safety"),
    });
    items.push({
      type: "Behavioral instructions",
      reason: "Customer-facing agents require explicit instructions",
      satisfied: hasInstructions,
    });
  }

  // External APIs → access_control
  if (context.integrationTypes.includes("external-apis")) {
    items.push({
      type: "Access control policy",
      reason: "External API integrations require access control",
      satisfied: hasPolicy("access_control"),
    });
  }

  // Tier-driven additional requirements (high/critical)
  if (riskTier === "high" || riskTier === "critical") {
    if (!items.some((i) => i.type === "Compliance policy")) {
      items.push({
        type: "Compliance policy",
        reason: `${riskTier} risk tier requires compliance policy`,
        satisfied: hasPolicy("compliance"),
      });
    }
    if (!items.some((i) => i.type === "Audit retention period")) {
      items.push({
        type: "Audit retention period",
        reason: `${riskTier} risk tier requires defined audit retention`,
        satisfied: hasAuditRetention,
      });
    }
  }

  if (riskTier === "critical") {
    const criticalTypes = ["safety", "compliance", "data_handling", "access_control"] as const;
    for (const type of criticalTypes) {
      const label = type.replace("_", " ");
      const labelCap = label.charAt(0).toUpperCase() + label.slice(1);
      if (!items.some((i) => i.type.toLowerCase().includes(type.replace("_", " ")))) {
        items.push({
          type: `${labelCap} policy`,
          reason: "Critical risk tier requires all 5 policy types",
          satisfied: hasPolicy(type),
        });
      }
    }
  }

  return items;
}

// ── Model Selection Explainer ────────────────────────────────────────────────
// Mirrors selectIntakeModel in model-selector.ts lines 114-178.

export function explainModelSelection(
  selectedModel: string,
  ctx: ModelSelectionContext
): ModelTransparency {
  const isHaiku = selectedModel.includes("haiku");

  // Determine reason by running through the same cascade
  let reason: string;

  if (ctx.messageCount <= 1) {
    reason = "Opening turn — synthesizing context, policies, and contributions";
  } else {
    const payloadComplete =
      !!ctx.payload.identity?.name &&
      (ctx.payload.capabilities?.tools?.length ?? 0) > 0;

    if (payloadComplete && !isHaiku) {
      reason = "Required sections complete — pre-finalization accuracy";
    } else {
      const text = ctx.lastUserText.toLowerCase();
      const FINALIZATION = [
        "finalize", "finalise", "mark complete", "mark as complete",
        "ready to generate", "we're done", "were done",
        "that's everything", "thats everything", "nothing else to add",
      ];
      const GOVERNANCE = [
        "policy", "policies", "compliance", "regulation", "regulatory",
        "finra", "sox", "gdpr", "hipaa", "pci", "audit", "access control",
        "data handling", "data retention", "prohibited", "security requirement",
        "legal requirement", "pii",
      ];

      if (FINALIZATION.some((p) => text.includes(p))) {
        reason = "Finalization language detected — accuracy critical";
      } else if (ctx.expertiseLevel === "guided" && ctx.messageCount <= 6) {
        reason = "Guided mode — richer language for business user";
      } else if (GOVERNANCE.some((p) => text.includes(p))) {
        reason = "Governance/regulatory content — multi-constraint reasoning";
      } else {
        reason = "Routine requirement capture";
      }
    }
  }

  return { name: selectedModel, reason };
}

// ── Probing Topics (Structured) ──────────────────────────────────────────────
// Mirrors buildTopicProbingRules in probing.ts but returns structured data.

export function getProbingTopicsStructured(
  context: IntakeContext,
  agentType: AgentType | null,
  payload: IntakePayload
): ProbingTopic[] {
  const topics: ProbingTopic[] = [];

  const hasPolicy = (type: string) =>
    (payload.governance?.policies ?? []).some((p) => p.type === type);
  const hasTool = (keyword: string) =>
    (payload.capabilities?.tools ?? []).some((t) =>
      t.name.toLowerCase().includes(keyword) ||
      (t.description ?? "").toLowerCase().includes(keyword)
    );
  const hasInstruction = (keyword: string) =>
    (payload.capabilities?.instructions ?? "").toLowerCase().includes(keyword);

  // Customer/partner-facing
  if (context.deploymentType === "customer-facing" || context.deploymentType === "partner-facing") {
    topics.push({
      topic: "Fallback behavior",
      level: "recommended",
      reason: `${context.deploymentType} deployment`,
      covered: hasInstruction("fallback") || hasInstruction("error") || hasInstruction("hand off"),
    });
    topics.push({
      topic: "Rate limiting",
      level: "recommended",
      reason: `${context.deploymentType} deployment`,
      covered: hasInstruction("rate limit") || hasTool("rate") || (payload.constraints?.max_tokens_per_response !== undefined),
    });
    topics.push({
      topic: "User-facing error messages",
      level: "recommended",
      reason: `${context.deploymentType} deployment`,
      covered: hasInstruction("error message") || hasInstruction("user-facing"),
    });
  }

  // External APIs
  if (context.integrationTypes.includes("external-apis")) {
    topics.push({
      topic: "API authentication",
      level: "recommended",
      reason: "External API integrations",
      covered: hasPolicy("access_control") || hasInstruction("oauth") || hasInstruction("api key"),
    });
    topics.push({
      topic: "Timeout and retry strategy",
      level: "recommended",
      reason: "External API integrations",
      covered: hasInstruction("timeout") || hasInstruction("retry"),
    });
  }

  // Database/file-system
  if (context.integrationTypes.includes("databases") || context.integrationTypes.includes("file-systems")) {
    topics.push({
      topic: "Data freshness",
      level: "recommended",
      reason: "Database/file-system integrations",
      covered: hasInstruction("cache") || hasInstruction("freshness") || hasInstruction("staleness"),
    });
  }

  // PII/regulated data
  if (context.dataSensitivity === "pii" || context.dataSensitivity === "regulated") {
    topics.push({
      topic: "PII masking scope",
      level: "recommended",
      reason: `${context.dataSensitivity} data sensitivity`,
      covered: hasInstruction("mask") || hasInstruction("redact") || hasPolicy("data_handling"),
    });
  }

  // Autonomous agents
  if (agentType === "autonomous") {
    topics.push({
      topic: "Human oversight checkpoints",
      level: "mandatory",
      reason: "Autonomous agent type",
      covered: hasInstruction("checkpoint") || hasInstruction("approval") || hasInstruction("human review"),
    });
    topics.push({
      topic: "Override / kill switch",
      level: "recommended",
      reason: "Autonomous agent type",
      covered: hasInstruction("override") || hasInstruction("kill switch") || hasInstruction("pause"),
    });
    topics.push({
      topic: "Escalation paths",
      level: "recommended",
      reason: "Autonomous agent type",
      covered: hasInstruction("escalat") || hasInstruction("fail safe") || hasInstruction("defer"),
    });
  }

  // Decision-support agents
  if (agentType === "decision-support") {
    topics.push({
      topic: "Confidence signaling",
      level: "recommended",
      reason: "Decision-support agent type",
      covered: hasInstruction("confidence") || hasInstruction("uncertainty") || hasInstruction("alternative"),
    });
  }

  return topics;
}

// ── Full Metadata Builder ────────────────────────────────────────────────────

export function buildTransparencyMetadata(
  payload: IntakePayload,
  context: IntakeContext | null | undefined,
  classification: IntakeClassification | null,
  selectedModel: string,
  expertiseLevel: ExpertiseLevel | null,
  modelCtx: ModelSelectionContext,
  toolCallNames: string[] = []
): IntakeTransparencyMetadata {
  // Readiness
  const readinessResult = computeReadinessScore(payload, classification?.riskTier ?? null);
  const readiness: ReadinessTransparency = {
    score: readinessResult.score,
    label: readinessResult.label,
    breakdown: {
      sectionCoverage: { score: readinessResult.breakdown.sectionCoverage, max: 50 },
      governanceDepth: { score: readinessResult.breakdown.governanceDepth, max: 35 },
      specificity: { score: readinessResult.breakdown.specificity, max: 15 },
    },
  };

  // Classification
  let classificationData: ClassificationTransparency | null = null;
  if (classification && context) {
    classificationData = {
      agentType: classification.agentType,
      riskTier: classification.riskTier,
      signals: explainRiskTierSignals(context),
      rationale: classification.rationale,
      conversationDepth: DEPTH_MAP[classification.riskTier],
    };
  }

  // Governance checklist
  const governanceChecklist = getGovernanceChecklist(
    payload,
    context,
    classification?.riskTier ?? null
  );

  // Model selection
  const model = explainModelSelection(selectedModel, modelCtx);

  // Probing topics
  const probingTopics = context
    ? getProbingTopicsStructured(context, classification?.agentType ?? null, payload)
    : [];

  // Domain progress
  const riskTier = classification?.riskTier ?? null;
  const domains = computeDomainProgress(payload, context, riskTier);
  const activeDomain = inferActiveDomain(toolCallNames, probingTopics, domains);

  return {
    classification: classificationData,
    readiness,
    governanceChecklist,
    model,
    expertiseLevel,
    probingTopics,
    domains,
    activeDomain,
  };
}
