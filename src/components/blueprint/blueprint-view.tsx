"use client";

import { useState, useCallback } from "react";
import { ABP } from "@/lib/types/abp";
import { User, FileText, Wrench, Brain, Lock, Shield, Tag, ChevronDown, Pencil } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getStatusTheme, STATUS_LABELS, type StatusLevel } from "@/lib/status-theme";
import { EditableRow } from "@/components/blueprint/inline-field-editor";

interface BlueprintViewProps {
  abp: ABP;
  /** Blueprint record ID — required for inline editing */
  blueprintId?: string;
  /** Called after a field is saved inline — parent can refresh the ABP */
  onFieldSaved?: (fieldPath: string, value: unknown, updatedAbp: ABP) => void;
}

export function BlueprintView({ abp, blueprintId, onFieldSaved }: BlueprintViewProps) {
  const [expandedSection, setExpandedSection] = useState<string>("identity");

  const isDraft = abp.metadata.status === "draft";
  const canEdit = isDraft && !!blueprintId;

  const handleFieldSave = useCallback(
    async (fieldPath: string, value: unknown) => {
      if (!blueprintId) throw new Error("Blueprint ID not available");
      const res = await fetch(`/api/blueprints/${blueprintId}/fields`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fieldPath, value }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Failed to save field");
      }
      const data = await res.json();
      if (onFieldSaved && data.abp) {
        onFieldSaved(fieldPath, value, data.abp as ABP);
      }
    },
    [blueprintId, onFieldSaved]
  );

  // Count governance validation failures (placeholder - assumes validation exists)
  const governanceFailures = 0;
  const governancePasses = abp.governance.policies.length;

  const sections = [
    {
      id: "identity",
      label: "Identity",
      icon: User,
      summary: abp.identity.name,
      content: canEdit ? (
        <>
          <EditableRow label="Name" fieldPath="identity.name" value={abp.identity.name} fieldType="text" required onSave={handleFieldSave} placeholder="Agent name" />
          <EditableRow label="Description" fieldPath="identity.description" value={abp.identity.description} fieldType="textarea" required onSave={handleFieldSave} placeholder="Agent description" />
          <EditableRow label="Persona" fieldPath="identity.persona" value={abp.identity.persona ?? ""} fieldType="textarea" onSave={handleFieldSave} placeholder="Agent persona (optional)" />
          <EditableRow label="Display Name" fieldPath="identity.branding.display_name" value={abp.identity.branding?.display_name ?? ""} fieldType="text" onSave={handleFieldSave} placeholder="Branding display name" />
          <EditableRow label="Primary Color" fieldPath="identity.branding.color_primary" value={abp.identity.branding?.color_primary ?? ""} fieldType="text" onSave={handleFieldSave} placeholder="#000000" />
        </>
      ) : (
        <>
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
        </>
      ),
    },
    ...((abp.capabilities.instructions || canEdit)
      ? [
          {
            id: "instructions",
            label: "System Instructions",
            icon: FileText,
            summary: abp.capabilities.instructions ? "Configured" : "Not set",
            content: canEdit ? (
              <EditableRow
                label="System Instructions"
                fieldPath="capabilities.instructions"
                value={abp.capabilities.instructions ?? ""}
                fieldType="textarea"
                onSave={handleFieldSave}
                placeholder="Enter system instructions for this agent…"
              />
            ) : (
              <pre className="whitespace-pre-wrap text-sm text-text font-mono leading-relaxed">
                {abp.capabilities.instructions}
              </pre>
            ),
          },
        ]
      : []),
    {
      id: "tools",
      label: "Tools & Capabilities",
      icon: Wrench,
      summary: `${abp.capabilities.tools.length} tool${abp.capabilities.tools.length !== 1 ? "s" : ""}`,
      content:
        abp.capabilities.tools.length === 0 ? (
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
        ),
    },
    ...((abp.capabilities.knowledge_sources?.length ?? 0) > 0
      ? [
          {
            id: "knowledge",
            label: "Knowledge Sources",
            icon: Brain,
            summary: `${abp.capabilities.knowledge_sources!.length} source${abp.capabilities.knowledge_sources!.length !== 1 ? "s" : ""}`,
            content: (
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
            ),
          },
        ]
      : []),
    {
      id: "constraints",
      label: "Constraints",
      icon: Lock,
      summary:
        !abp.constraints.allowed_domains?.length &&
        !abp.constraints.denied_actions?.length &&
        !abp.constraints.max_tokens_per_response &&
        !abp.constraints.rate_limits
          ? "None"
          : "Configured",
      content: canEdit ? (
        <div className="flex flex-col gap-3">
          <EditableRow label="Allowed Domains" fieldPath="constraints.allowed_domains" value={abp.constraints.allowed_domains ?? []} fieldType="tags" onSave={handleFieldSave} placeholder="Add domain" />
          <EditableRow label="Denied Actions" fieldPath="constraints.denied_actions" value={abp.constraints.denied_actions ?? []} fieldType="tags" onSave={handleFieldSave} placeholder="Add denied action" />
          <EditableRow label="Max Tokens per Response" fieldPath="constraints.max_tokens_per_response" value={abp.constraints.max_tokens_per_response ?? null} fieldType="number" onSave={handleFieldSave} placeholder="e.g. 4096" />
          <EditableRow label="Requests per Minute" fieldPath="constraints.rate_limits.requests_per_minute" value={abp.constraints.rate_limits?.requests_per_minute ?? null} fieldType="number" onSave={handleFieldSave} placeholder="e.g. 60" />
          <EditableRow label="Requests per Day" fieldPath="constraints.rate_limits.requests_per_day" value={abp.constraints.rate_limits?.requests_per_day ?? null} fieldType="number" onSave={handleFieldSave} placeholder="e.g. 10000" />
        </div>
      ) : !abp.constraints.allowed_domains?.length &&
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
                    <span key={i} className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                      {d}
                    </span>
                  ))}
                </div>
              </Row>
            ) : null}
            {abp.constraints.denied_actions?.length ? (
              <Row label="Denied actions">
                <div className="flex flex-wrap gap-1">
                  {abp.constraints.denied_actions.map((a, i) => (
                    <span key={i} className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
                      {a}
                    </span>
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
        ),
    },
    {
      id: "governance",
      label: "Governance",
      icon: Shield,
      summary: `${abp.governance.policies.length} polic${abp.governance.policies.length === 1 ? "y" : "ies"}`,
      content:
        abp.governance.policies.length === 0 ? (
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
                      <li key={j} className="text-xs text-text-secondary">
                        {rule}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
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
          </div>
        ),
    },
    {
      id: "metadata",
      label: "Metadata",
      icon: Tag,
      summary: `v${abp.version}`,
      content: (
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
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Summary Card */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-text">{abp.identity.name}</h2>
            <p className="text-xs text-text-secondary mt-1">v{abp.version}</p>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && (
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-xs text-violet-600 border border-violet-200">
                <Pencil size={10} />
                Inline editing enabled
              </span>
            )}
            <StatusBadge status={abp.metadata.status} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
          <SummaryStatItem label="Tools" value={abp.capabilities.tools.length} />
          <SummaryStatItem label="Constraints" value={getConstraintCount(abp)} />
          <SummaryStatItem
            label="Governance"
            value={`${governancePasses} / ${governancePasses}`}
            variant={governanceFailures > 0 ? "warning" : "success"}
          />
        </div>
      </div>

      {/* Accordion Sections */}
      <div className="flex flex-col gap-2">
        {sections.map((section) => (
          <AccordionSection
            key={section.id}
            section={section}
            isExpanded={expandedSection === section.id}
            onToggle={() => setExpandedSection(section.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Helper Functions ──────────────────────────────────────────────────────────

function getConstraintCount(abp: ABP): number {
  let count = 0;
  if (abp.constraints.allowed_domains?.length) count++;
  if (abp.constraints.denied_actions?.length) count++;
  if (abp.constraints.max_tokens_per_response) count++;
  if (abp.constraints.rate_limits) count++;
  return count;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface AccordionSectionProps {
  section: {
    id: string;
    label: string;
    icon: LucideIcon;
    summary: string | number;
    content: React.ReactNode;
  };
  isExpanded: boolean;
  onToggle: () => void;
}

function AccordionSection({ section, isExpanded, onToggle }: AccordionSectionProps) {
  const Icon = section.icon;
  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden transition-all duration-200">
      {/* Header - Always visible, clickable */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-5 hover:bg-surface-raised transition-colors"
      >
        <div className="flex items-center gap-3 text-left">
          <Icon size={16} className="text-text-secondary shrink-0" />
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
              {section.label}
            </h3>
            {!isExpanded && (
              <p className="text-xs text-text-tertiary mt-0.5">{section.summary}</p>
            )}
          </div>
        </div>
        <ChevronDown
          size={18}
          className={`text-text-secondary shrink-0 transition-transform duration-200 ${
            isExpanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Content - Expands/collapses */}
      {isExpanded && (
        <div className="border-t border-border px-5 py-4 bg-surface">
          {section.content}
        </div>
      )}
    </div>
  );
}

function SummaryStatItem({
  label,
  value,
  variant = "default",
}: {
  label: string;
  value: string | number;
  variant?: "default" | "success" | "warning";
}) {
  const colorMap = {
    default: "text-text",
    success: "text-green-600",
    warning: "text-amber-600",
  };
  return (
    <div className="text-center">
      <p className={`text-xl font-semibold ${colorMap[variant]}`}>{value}</p>
      <p className="text-xs text-text-secondary mt-1">{label}</p>
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
  const label = STATUS_LABELS[status as StatusLevel] ?? status;
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${theme.bg} ${theme.text}`}>
      {label}
    </span>
  );
}
