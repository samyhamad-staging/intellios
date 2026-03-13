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

import { IntakeContext, ContributionDomain, StakeholderContribution } from "@/lib/types/intake";

/**
 * Returns the set of contribution domains that are expected to have input
 * given the intake context signals. Deduplication is applied — each domain
 * appears at most once regardless of how many signals imply it.
 */
export function getExpectedContributionDomains(
  context: IntakeContext
): ContributionDomain[] {
  const expected = new Set<ContributionDomain>();

  // Regulatory scope → implied domains
  if (context.regulatoryScope.includes("FINRA") || context.regulatoryScope.includes("SOX")) {
    expected.add("compliance");
  }
  if (context.regulatoryScope.includes("GDPR") || context.regulatoryScope.includes("HIPAA")) {
    expected.add("compliance");
    expected.add("legal");
  }
  if (context.regulatoryScope.includes("PCI-DSS")) {
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
  if (context.integrationTypes.includes("external-apis")) {
    expected.add("security");
    expected.add("it");
  }
  if (context.integrationTypes.includes("databases") || context.integrationTypes.includes("file-systems")) {
    expected.add("it");
  }

  // Stakeholders consulted → direct domain mapping
  for (const stakeholder of context.stakeholdersConsulted) {
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

  return Array.from(expected);
}

/**
 * Returns the expected contribution domains that do not yet have any
 * contribution on record. An empty array means full coverage.
 */
export function getMissingContributionDomains(
  context: IntakeContext,
  contributions: StakeholderContribution[]
): ContributionDomain[] {
  const expected = getExpectedContributionDomains(context);
  const covered = new Set(contributions.map((c) => c.domain as ContributionDomain));
  return expected.filter((domain) => !covered.has(domain));
}
