"use client";

import { ABP } from "@/lib/types/abp";
import { DescriptionList, DescriptionTerm, DescriptionDetails } from "@/components/ui/description-list";
import { SectionHeading } from "@/components/ui/section-heading";

interface BlueprintSummaryProps {
  abp: ABP;
  status: string;
}

const STATUS_PROSE: Record<string, string> = {
  draft:      "This agent is in draft. It has not yet been submitted for review.",
  in_review:  "This agent is under review. A compliance reviewer is evaluating it.",
  approved:   "This agent has passed review and is approved for deployment.",
  deployed:   "This agent is live in production.",
  rejected:   "This agent was rejected during review and cannot proceed without changes.",
  deprecated: "This agent has been deprecated and is no longer active.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <div className="mb-3">
        <SectionHeading>{title}</SectionHeading>
      </div>
      {children}
    </div>
  );
}

function Pill({ children, color = "gray" }: { children: React.ReactNode; color?: string }) {
  const styles: Record<string, string> = {
    gray:   "bg-surface-muted text-text-secondary",
    blue:   "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300",
    purple: "bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300",
    red:    "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300",
    green:  "bg-green-50 dark:bg-emerald-950/30 text-green-700 dark:text-emerald-300",
    amber:  "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[color] ?? styles.gray}`}>
      {children}
    </span>
  );
}

export function BlueprintSummary({ abp, status }: BlueprintSummaryProps) {
  const { identity, capabilities, constraints, governance } = abp;
  const tools = capabilities?.tools ?? [];
  const knowledgeSources = capabilities?.knowledge_sources ?? [];
  const policies = governance?.policies ?? [];
  const audit = governance?.audit;
  const allowedDomains = constraints?.allowed_domains ?? [];
  const deniedActions = constraints?.denied_actions ?? [];

  return (
    <div className="space-y-4">
      {/* Status callout */}
      <div className="rounded-card border border-border bg-surface-raised px-5 py-3">
        <p className="text-sm text-text-secondary">{STATUS_PROSE[status] ?? `Status: ${status}`}</p>
      </div>

      {/* Identity */}
      <Section title="What this agent does">
        <h2 className="text-lg font-semibold text-text">{identity.name}</h2>
        <p className="mt-1 text-sm text-text-secondary leading-relaxed">{identity.description}</p>
        {identity.persona && (
          <p className="mt-3 text-xs text-text-secondary italic border-l-2 border-border pl-3">
            {identity.persona}
          </p>
        )}
      </Section>

      {/* Capabilities */}
      <Section title="Capabilities">
        {capabilities.instructions && (
          <div className="mb-4">
            <p className="text-xs font-medium text-text-secondary mb-1">Behavioral instructions</p>
            <p className="text-sm text-text leading-relaxed line-clamp-4">
              {capabilities.instructions}
            </p>
          </div>
        )}

        {tools.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium text-text-secondary mb-2">
              Tools & integrations ({tools.length})
            </p>
            <div className="space-y-2">
              {tools.map((tool, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0 text-text-tertiary">⚙</span>
                  <div>
                    <span className="text-sm font-medium text-text">{tool.name}</span>
                    <span className="ml-2 text-xs text-text-tertiary">({tool.type})</span>
                    {tool.description && (
                      <p className="text-xs text-text-secondary mt-0.5">{tool.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {knowledgeSources.length > 0 && (
          <div>
            <p className="text-xs font-medium text-text-secondary mb-2">
              Knowledge sources ({knowledgeSources.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {knowledgeSources.map((ks, i) => (
                <Pill key={i} color="purple">🗄 {ks.name} ({ks.type})</Pill>
              ))}
            </div>
          </div>
        )}

        {tools.length === 0 && knowledgeSources.length === 0 && !capabilities.instructions && (
          <p className="text-sm text-text-disabled">No capabilities defined.</p>
        )}
      </Section>

      {/* Constraints */}
      <Section title="Constraints & boundaries">
        {allowedDomains.length === 0 && deniedActions.length === 0 &&
          !constraints?.max_tokens_per_response && (
          <p className="text-sm text-text-disabled">No constraints defined.</p>
        )}

        {allowedDomains.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-medium text-text-secondary mb-1.5">Allowed domains</p>
            <div className="flex flex-wrap gap-1.5">
              {allowedDomains.map((d, i) => (
                <Pill key={i} color="green">{d}</Pill>
              ))}
            </div>
          </div>
        )}

        {deniedActions.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-medium text-text-secondary mb-1.5">
              Prohibited actions ({deniedActions.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {deniedActions.map((a, i) => (
                <Pill key={i} color="red">🔒 {a}</Pill>
              ))}
            </div>
          </div>
        )}

        {constraints?.max_tokens_per_response && (
          <p className="text-xs text-text-secondary">
            Max response length: <span className="font-medium text-text">{constraints.max_tokens_per_response.toLocaleString()} tokens</span>
          </p>
        )}

        {(constraints?.rate_limits?.requests_per_minute || constraints?.rate_limits?.requests_per_day) && (
          <p className="mt-1 text-xs text-text-secondary">
            Rate limits:{" "}
            {constraints.rate_limits?.requests_per_minute && (
              <span className="font-medium text-text">{constraints.rate_limits.requests_per_minute}/min</span>
            )}
            {constraints.rate_limits?.requests_per_minute && constraints.rate_limits?.requests_per_day && " · "}
            {constraints.rate_limits?.requests_per_day && (
              <span className="font-medium text-text">{constraints.rate_limits.requests_per_day}/day</span>
            )}
          </p>
        )}
      </Section>

      {/* Governance */}
      <Section title="Governance & compliance">
        {policies.length === 0 && !audit && (
          <p className="text-sm text-text-disabled">No governance configuration defined.</p>
        )}

        {policies.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-medium text-text-secondary mb-2">
              Applied policies ({policies.length})
            </p>
            <div className="space-y-2">
              {policies.map((p, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0 text-text-tertiary">🛡</span>
                  <div>
                    <span className="text-sm font-medium text-text">{p.name}</span>
                    <span className="ml-2 text-xs text-text-tertiary">
                      {p.type.replace("_", " ")}
                    </span>
                    {p.description && (
                      <p className="text-xs text-text-secondary mt-0.5">{p.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {audit && (
          <div className="flex flex-wrap gap-2 mt-2">
            <Pill color={audit.log_interactions ? "green" : "gray"}>
              📋 Logging {audit.log_interactions ? "on" : "off"}
            </Pill>
            {audit.retention_days && (
              <Pill color="blue">{audit.retention_days}-day retention</Pill>
            )}
            {audit.pii_redaction && (
              <Pill color="amber">PII redaction enabled</Pill>
            )}
          </div>
        )}
      </Section>

      {/* Ownership & Classification */}
      {abp.ownership && (abp.ownership.businessUnit || abp.ownership.ownerEmail || abp.ownership.costCenter || abp.ownership.deploymentEnvironment || abp.ownership.dataClassification) && (
        <Section title="Ownership & Classification">
          <DescriptionList>
            {abp.ownership.businessUnit && (
              <>
                <DescriptionTerm>Business Unit</DescriptionTerm>
                <DescriptionDetails>{abp.ownership.businessUnit}</DescriptionDetails>
              </>
            )}
            {abp.ownership.ownerEmail && (
              <>
                <DescriptionTerm>Owner</DescriptionTerm>
                <DescriptionDetails>{abp.ownership.ownerEmail}</DescriptionDetails>
              </>
            )}
            {abp.ownership.costCenter && (
              <>
                <DescriptionTerm>Cost Center</DescriptionTerm>
                <DescriptionDetails>{abp.ownership.costCenter}</DescriptionDetails>
              </>
            )}
            {abp.ownership.deploymentEnvironment && (
              <>
                <DescriptionTerm>Environment</DescriptionTerm>
                <DescriptionDetails className="capitalize">{abp.ownership.deploymentEnvironment}</DescriptionDetails>
              </>
            )}
            {abp.ownership.dataClassification && (
              <>
                <DescriptionTerm>Data Classification</DescriptionTerm>
                <DescriptionDetails className="capitalize">{abp.ownership.dataClassification}</DescriptionDetails>
              </>
            )}
          </DescriptionList>
        </Section>
      )}

      {/* Tags */}
      {abp.metadata?.tags && abp.metadata.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {abp.metadata.tags.map((tag, i) => (
            <Pill key={i}>{tag}</Pill>
          ))}
        </div>
      )}
    </div>
  );
}
