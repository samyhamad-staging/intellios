"use client";

import { ABP } from "@/lib/types/abp";
import { User, FileText, Wrench, Brain, Lock, Shield, Tag } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getStatusTheme, STATUS_LABELS } from "@/lib/status-theme";

interface BlueprintViewProps {
  abp: ABP;
}

export function BlueprintView({ abp }: BlueprintViewProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* Identity */}
      <Section title="Identity" icon={User}>
        <Row label="Name">{abp.identity.name}</Row>
        <Row label="Description">{abp.identity.description}</Row>
        {abp.identity.persona && (
          <Row label="Persona">
            <p className="whitespace-pre-wrap text-sm text-text">{abp.identity.persona}</p>
          </Row>
        )}
        {abp.identity.branding && (
          <Row label="Branding">
            <div className="flex flex-wrap gap-4 text-sm">
              {abp.identity.branding.display_name && (
                <Chip label="Display name" value={abp.identity.branding.display_name} />
              )}
              {abp.identity.branding.color_primary && (
                <div className="flex items-center gap-1.5">
                  <div
                    className="h-4 w-4 rounded-full border border-border"
                    style={{ backgroundColor: abp.identity.branding.color_primary }}
                  />
                  <span className="text-text-secondary">{abp.identity.branding.color_primary}</span>
                </div>
              )}
            </div>
          </Row>
        )}
      </Section>

      {/* Instructions */}
      {abp.capabilities.instructions && (
        <Section title="System Instructions" icon={FileText}>
          <pre className="whitespace-pre-wrap text-sm text-text font-mono leading-relaxed">
            {abp.capabilities.instructions}
          </pre>
        </Section>
      )}

      {/* Tools */}
      <Section title={`Tools & Capabilities (${abp.capabilities.tools.length})`} icon={Wrench}>
        {abp.capabilities.tools.length === 0 ? (
          <p className="text-sm text-text-disabled italic">No tools defined</p>
        ) : (
          <div className="flex flex-col gap-3">
            {abp.capabilities.tools.map((tool, i) => (
              <div key={i} className="rounded-lg border border-border bg-surface-raised p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{tool.name}</span>
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                    {tool.type}
                  </span>
                </div>
                {tool.description && (
                  <p className="mt-1 text-sm text-text-secondary">{tool.description}</p>
                )}
                {tool.config && Object.keys(tool.config).length > 0 && (
                  <pre className="mt-2 rounded bg-surface border border-border p-2 text-xs text-text-secondary overflow-auto">
                    {JSON.stringify(tool.config, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Knowledge Sources */}
      {(abp.capabilities.knowledge_sources?.length ?? 0) > 0 && (
        <Section title={`Knowledge Sources (${abp.capabilities.knowledge_sources!.length})`} icon={Brain}>
          <div className="flex flex-col gap-2">
            {abp.capabilities.knowledge_sources!.map((src, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs text-text-secondary shrink-0">
                  {src.type}
                </span>
                <div>
                  <span className="font-medium">{src.name}</span>
                  {src.uri && <span className="ml-2 text-text-secondary font-mono text-xs">{src.uri}</span>}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Constraints */}
      <Section title="Constraints" icon={Lock}>
        {!abp.constraints.allowed_domains?.length &&
        !abp.constraints.denied_actions?.length &&
        !abp.constraints.max_tokens_per_response &&
        !abp.constraints.rate_limits ? (
          <p className="text-sm text-text-disabled italic">No constraints defined</p>
        ) : (
          <div className="flex flex-col gap-3">
            {abp.constraints.allowed_domains?.length ? (
              <Row label="Allowed domains">
                <div className="flex flex-wrap gap-1">
                  {abp.constraints.allowed_domains.map((d, i) => (
                    <span key={i} className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">{d}</span>
                  ))}
                </div>
              </Row>
            ) : null}
            {abp.constraints.denied_actions?.length ? (
              <Row label="Denied actions">
                <div className="flex flex-wrap gap-1">
                  {abp.constraints.denied_actions.map((a, i) => (
                    <span key={i} className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">{a}</span>
                  ))}
                </div>
              </Row>
            ) : null}
            {abp.constraints.max_tokens_per_response && (
              <Row label="Max tokens">{abp.constraints.max_tokens_per_response.toLocaleString()}</Row>
            )}
            {abp.constraints.rate_limits && (
              <Row label="Rate limits">
                {abp.constraints.rate_limits.requests_per_minute && (
                  <span className="text-sm text-text">
                    {abp.constraints.rate_limits.requests_per_minute} req/min
                  </span>
                )}
                {abp.constraints.rate_limits.requests_per_day && (
                  <span className="ml-3 text-sm text-text">
                    {abp.constraints.rate_limits.requests_per_day.toLocaleString()} req/day
                  </span>
                )}
              </Row>
            )}
          </div>
        )}
      </Section>

      {/* Governance */}
      <Section title={`Governance (${abp.governance.policies.length} polic${abp.governance.policies.length === 1 ? "y" : "ies"})`} icon={Shield}>
        {abp.governance.policies.length === 0 ? (
          <p className="text-sm text-text-disabled italic">No policies defined</p>
        ) : (
          <div className="flex flex-col gap-3">
            {abp.governance.policies.map((policy, i) => (
              <div key={i} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{policy.name}</span>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                    {policy.type}
                  </span>
                </div>
                {policy.description && (
                  <p className="mt-1 text-sm text-text-secondary">{policy.description}</p>
                )}
                {policy.rules?.length ? (
                  <ul className="mt-2 list-disc list-inside space-y-0.5">
                    {policy.rules.map((rule, j) => (
                      <li key={j} className="text-xs text-text-secondary">{rule}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>
        )}
        {abp.governance.audit && (
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {abp.governance.audit.log_interactions !== undefined && (
              <Chip
                label="Interaction logging"
                value={abp.governance.audit.log_interactions ? "enabled" : "disabled"}
              />
            )}
            {abp.governance.audit.retention_days !== undefined && (
              <Chip label="Retention" value={`${abp.governance.audit.retention_days} days`} />
            )}
            {abp.governance.audit.pii_redaction !== undefined && (
              <Chip
                label="PII redaction"
                value={abp.governance.audit.pii_redaction ? "enabled" : "disabled"}
              />
            )}
          </div>
        )}
      </Section>

      {/* Metadata */}
      <Section title="Metadata" icon={Tag}>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <Row label="Blueprint ID">
            <span className="font-mono text-xs text-text-secondary">{abp.metadata.id}</span>
          </Row>
          <Row label="Status">
            <StatusBadge status={abp.metadata.status} />
          </Row>
          <Row label="Version">{abp.version}</Row>
          {abp.metadata.tags?.length ? (
            <Row label="Tags">
              <div className="flex flex-wrap gap-1">
                {abp.metadata.tags.map((tag, i) => (
                  <span key={i} className="rounded-full bg-surface-muted px-2 py-0.5 text-xs text-text-secondary">
                    {tag}
                  </span>
                ))}
              </div>
            </Row>
          ) : null}
        </div>
      </Section>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Section({ title, icon: Icon, children }: { title: string; icon?: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <h3 className="mb-4 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-text-secondary">
        {Icon && <Icon size={13} className="text-text-tertiary" />}
        {title}
      </h3>
      {children}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 last:mb-0">
      <dt className="mb-1 text-xs font-medium text-text-secondary">{label}</dt>
      <dd>{typeof children === "string" ? <p className="text-sm text-text">{children}</p> : children}</dd>
    </div>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-full border border-border bg-surface-raised px-2 py-0.5 text-xs text-text">
      {label}: <strong>{value}</strong>
    </span>
  );
}

function StatusBadge({ status }: { status: ABP["metadata"]["status"] }) {
  const theme = getStatusTheme(status);
  const label = STATUS_LABELS[status as any] ?? status;
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${theme.bg} ${theme.text}`}>
      {label}
    </span>
  );
}
