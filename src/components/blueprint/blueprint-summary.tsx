"use client";

import { ABP } from "@/lib/types/abp";

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
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">{title}</h3>
      {children}
    </div>
  );
}

function Pill({ children, color = "gray" }: { children: React.ReactNode; color?: string }) {
  const styles: Record<string, string> = {
    gray:   "bg-gray-100 text-gray-600",
    blue:   "bg-blue-50 text-blue-700",
    purple: "bg-purple-50 text-purple-700",
    red:    "bg-red-50 text-red-700",
    green:  "bg-green-50 text-green-700",
    amber:  "bg-amber-50 text-amber-700",
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
      <div className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-3">
        <p className="text-sm text-gray-600">{STATUS_PROSE[status] ?? `Status: ${status}`}</p>
      </div>

      {/* Identity */}
      <Section title="What this agent does">
        <h2 className="text-lg font-semibold text-gray-900">{identity.name}</h2>
        <p className="mt-1 text-sm text-gray-600 leading-relaxed">{identity.description}</p>
        {identity.persona && (
          <p className="mt-3 text-xs text-gray-500 italic border-l-2 border-gray-200 pl-3">
            {identity.persona}
          </p>
        )}
      </Section>

      {/* Capabilities */}
      <Section title="Capabilities">
        {capabilities.instructions && (
          <div className="mb-4">
            <p className="text-xs font-medium text-gray-500 mb-1">Behavioral instructions</p>
            <p className="text-sm text-gray-700 leading-relaxed line-clamp-4">
              {capabilities.instructions}
            </p>
          </div>
        )}

        {tools.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium text-gray-500 mb-2">
              Tools & integrations ({tools.length})
            </p>
            <div className="space-y-2">
              {tools.map((tool, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0 text-gray-400">⚙</span>
                  <div>
                    <span className="text-sm font-medium text-gray-800">{tool.name}</span>
                    <span className="ml-2 text-xs text-gray-400">({tool.type})</span>
                    {tool.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{tool.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {knowledgeSources.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">
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
          <p className="text-sm text-gray-400">No capabilities defined.</p>
        )}
      </Section>

      {/* Constraints */}
      <Section title="Constraints & boundaries">
        {allowedDomains.length === 0 && deniedActions.length === 0 &&
          !constraints?.max_tokens_per_response && (
          <p className="text-sm text-gray-400">No constraints defined.</p>
        )}

        {allowedDomains.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-medium text-gray-500 mb-1.5">Allowed domains</p>
            <div className="flex flex-wrap gap-1.5">
              {allowedDomains.map((d, i) => (
                <Pill key={i} color="green">{d}</Pill>
              ))}
            </div>
          </div>
        )}

        {deniedActions.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-medium text-gray-500 mb-1.5">
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
          <p className="text-xs text-gray-500">
            Max response length: <span className="font-medium text-gray-700">{constraints.max_tokens_per_response.toLocaleString()} tokens</span>
          </p>
        )}

        {(constraints?.rate_limits?.requests_per_minute || constraints?.rate_limits?.requests_per_day) && (
          <p className="mt-1 text-xs text-gray-500">
            Rate limits:{" "}
            {constraints.rate_limits?.requests_per_minute && (
              <span className="font-medium text-gray-700">{constraints.rate_limits.requests_per_minute}/min</span>
            )}
            {constraints.rate_limits?.requests_per_minute && constraints.rate_limits?.requests_per_day && " · "}
            {constraints.rate_limits?.requests_per_day && (
              <span className="font-medium text-gray-700">{constraints.rate_limits.requests_per_day}/day</span>
            )}
          </p>
        )}
      </Section>

      {/* Governance */}
      <Section title="Governance & compliance">
        {policies.length === 0 && !audit && (
          <p className="text-sm text-gray-400">No governance configuration defined.</p>
        )}

        {policies.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-medium text-gray-500 mb-2">
              Applied policies ({policies.length})
            </p>
            <div className="space-y-2">
              {policies.map((p, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0 text-gray-400">🛡</span>
                  <div>
                    <span className="text-sm font-medium text-gray-800">{p.name}</span>
                    <span className="ml-2 text-xs text-gray-400">
                      {p.type.replace("_", " ")}
                    </span>
                    {p.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{p.description}</p>
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
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            {abp.ownership.businessUnit && (
              <div>
                <dt className="font-medium text-gray-400">Business Unit</dt>
                <dd className="mt-0.5 text-gray-700">{abp.ownership.businessUnit}</dd>
              </div>
            )}
            {abp.ownership.ownerEmail && (
              <div>
                <dt className="font-medium text-gray-400">Owner</dt>
                <dd className="mt-0.5 text-gray-700">{abp.ownership.ownerEmail}</dd>
              </div>
            )}
            {abp.ownership.costCenter && (
              <div>
                <dt className="font-medium text-gray-400">Cost Center</dt>
                <dd className="mt-0.5 text-gray-700">{abp.ownership.costCenter}</dd>
              </div>
            )}
            {abp.ownership.deploymentEnvironment && (
              <div>
                <dt className="font-medium text-gray-400">Environment</dt>
                <dd className="mt-0.5 capitalize text-gray-700">{abp.ownership.deploymentEnvironment}</dd>
              </div>
            )}
            {abp.ownership.dataClassification && (
              <div>
                <dt className="font-medium text-gray-400">Data Classification</dt>
                <dd className="mt-0.5 capitalize text-gray-700">{abp.ownership.dataClassification}</dd>
              </div>
            )}
          </dl>
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
