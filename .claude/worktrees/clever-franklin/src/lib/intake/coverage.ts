/**
 * Contribution coverage helpers — Phase 8.
 *
 * Derives which stakeholder contribution domains are *expected* given the
 * Phase 1 intake context signals, and which of those are currently missing.
 *
 * Expected domain logic maps regulatory, sensitivity, deployment, and
 * integration signals to the domains most likely to have relevant requirements.
 * stakeholdersConsulted provides direct domain signals as well.
 */

import { IntakeContext, ContributionDomain, StakeholderContribution, IntakeRiskTier } from "@/lib/types/intake";

/**
 * Returns the set of contribution domains that are expected to have input
 * given the intake context signals. Deduplication is applied — each domain
 * appears at most once regardless of how many signals imply it.
 */
export function getExpectedContributionDomains(
  context: IntakeContext,
  riskTier?: IntakeRiskTier | null
): ContributionDomain[] {
  // Low-risk agents: no required stakeholder domains regardless of context signals
  if (riskTier === "low") return [];

  const expected = new Set<ContributionDomain>();

  const regulatoryScope = context.regulatoryScope ?? [];
  const integrationTypes = context.integrationTypes ?? [];
  const stakeholdersConsulted = context.stakeholdersConsulted ?? [];

  // Regulatory scope → implied domains
  if (regulatoryScope.includes("FINRA") || regulatoryScope.includes("SOX")) {
    expected.add("compliance");
  }
  if (regulatoryScope.includes("GDPR") || regulatoryScope.includes("HIPAA")) {
    expected.add("compliance");
    expected.add("legal");
  }
  if (regulatoryScope.includes("PCI-DSS")) {
    expected.add("compliance");
    expected.add("security");
  }

  // Data sensitivity → implied domains
  if (context.dataSensitivity === "pii" || context.dataSensitivity === "regulated") {
    expected.add("compliance");
    expected.add("security");
    expected.add("legal");
  }
  if (context.dataSensitivity === "confidential") {
    expected.add("security");
  }

  // Deployment type → implied domains
  if (context.deploymentType === "customer-facing" || context.deploymentType === "partner-facing") {
    expected.add("legal");
    expected.add("business");
  }

  // Integration types → implied domains
  if (integrationTypes.includes("external-apis")) {
    expected.add("security");
    expected.add("it");
  }
  if (integrationTypes.includes("databases") || integrationTypes.includes("file-systems")) {
    expected.add("it");
  }

  // Stakeholders consulted → direct domain mapping
  for (const stakeholder of stakeholdersConsulted) {
    switch (stakeholder) {
      case "legal":
        expected.add("legal");
        break;
      case "compliance":
        expected.add("compliance");
        break;
      case "security":
        expected.add("security");
        break;
      case "it":
        expected.add("it");
        break;
      case "business-owner":
        expected.add("business");
        break;
    }
  }

  // Tier-based additions (after context-signal logic)
  if (riskTier === "high") {
    expected.add("compliance");
    expected.add("security");
  }
  if (riskTier === "critical") {
    expected.add("compliance");
    expected.add("security");
    expected.add("legal");
    expected.add("risk");
  }

  return Array.from(expected);
}

/**
 * Returns the expected contribution domains that do not yet have any
 * contribution on record. An empty array means full coverage.
 */
export function getMissingContributionDomains(
  context: IntakeContext,
  contributions: StakeholderContribution[],
  riskTier?: IntakeRiskTier | null
): ContributionDomain[] {
  const expected = getExpectedContributionDomains(context, riskTier);
  const covered = new Set(contributions.map((c) => c.domain as ContributionDomain));
  return expected.filter((domain) => !covered.has(domain));
}
