"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Zap,
  User,
  Wrench,
  ShieldCheck,
  Ban,
  FileText,
  Pencil,
  Check,
  X,
  Plus,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Shield,
} from "lucide-react";
import type { ABP } from "@/lib/types/abp";

// ── Types ────────────────────────────────────────────────────────────────────

interface ExpressLaneEditorProps {
  templateId: string;
  templateName: string;
  templateDescription: string;
  templateCategory: string;
  templateGovernanceTier: string;
  templateTags: string[];
  initialAbp: ABP;
}

type EditingSection = "identity" | "capabilities" | "constraints" | "governance" | null;

// ── Tier/category styling ────────────────────────────────────────────────────

const TIER_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  standard: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Standard Governance" },
  enhanced: { bg: "bg-amber-50", text: "text-amber-700", label: "Enhanced Governance" },
  critical: { bg: "bg-red-50", text: "text-red-700", label: "Critical Governance" },
};

const CATEGORY_LABELS: Record<string, string> = {
  "financial-services": "Financial Services",
  compliance: "Compliance",
  operations: "Operations",
  hr: "HR",
};

// ── Component ────────────────────────────────────────────────────────────────

export function ExpressLaneEditor({
  templateId,
  templateName,
  templateDescription,
  templateCategory,
  templateGovernanceTier,
  templateTags,
  initialAbp,
}: ExpressLaneEditorProps) {
  const router = useRouter();

  // ── State ────────────────────────────────────────────────────────────────

  // Editable ABP sections (deep-cloned from template)
  const [identity, setIdentity] = useState(() => structuredClone(initialAbp.identity));
  const [capabilities, setCapabilities] = useState(() => structuredClone(initialAbp.capabilities));
  const [constraints, setConstraints] = useState(() => structuredClone(initialAbp.constraints));
  const [governance, setGovernance] = useState(() => structuredClone(initialAbp.governance));

  // UI state
  const [expandedSection, setExpandedSection] = useState<EditingSection>("identity");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ blueprintId: string; agentId: string; violations: number } | null>(null);

  // ── Inline validation ────────────────────────────────────────────────────
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameTouched, setNameTouched] = useState(false);
  const [toolNameErrors, setToolNameErrors] = useState<Record<number, string>>({});
  const [retentionError, setRetentionError] = useState<string | null>(null);

  // Human-name heuristic: single word starting with capital, matches common first names
  function looksLikeHumanName(value: string): boolean {
    return /^[A-Z][a-z]{2,}$/.test(value.trim());
  }

  function validateName(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) return "Agent name is required.";
    if (trimmed.length < 2) return "Name must be at least 2 characters.";
    if (looksLikeHumanName(trimmed)) return "This looks like a person's name. Use a descriptive agent name (e.g. \"Loan Review Agent\").";
    return null;
  }

  function validateToolName(value: string): string | null {
    if (!value.trim()) return "Tool name is required.";
    if (!/^[a-z][a-z0-9_]*$/.test(value.trim())) return "Use snake_case (e.g. search_knowledge_base).";
    return null;
  }

  function validateRetention(value: number | undefined): string | null {
    if (value === undefined || value === null) return null;
    if (value < 1) return "Minimum retention is 1 day.";
    if (value > 365) return "Maximum retention is 365 days.";
    return null;
  }

  function handleNameBlur() {
    setNameTouched(true);
    setNameError(validateName(identity.name ?? ""));
  }

  function handleToolNameBlur(index: number, value: string) {
    const err = validateToolName(value);
    setToolNameErrors((prev) => ({ ...prev, [index]: err ?? "" }));
  }

  function handleRetentionBlur(value: number | undefined) {
    setRetentionError(validateRetention(value));
  }

  // Check all validations before submit
  function hasValidationErrors(): boolean {
    const nErr = validateName(identity.name ?? "");
    if (nErr) return true;
    for (const tool of capabilities.tools) {
      if (validateToolName(tool.name)) return true;
    }
    const rErr = validateRetention(governance.audit?.retention_days);
    if (rErr) return true;
    return false;
  }

  // ── Section toggle ───────────────────────────────────────────────────────

  const toggleSection = useCallback((section: EditingSection) => {
    setExpandedSection((prev) => (prev === section ? null : section));
  }, []);

  // ── Generate handler ─────────────────────────────────────────────────────

  async function handleGenerate() {
    // Run all validations before submitting
    const nErr = validateName(identity.name ?? "");
    setNameTouched(true);
    setNameError(nErr);
    const toolErrs: Record<number, string> = {};
    capabilities.tools.forEach((tool, i) => {
      const e = validateToolName(tool.name);
      if (e) toolErrs[i] = e;
    });
    setToolNameErrors(toolErrs);
    const rErr = validateRetention(governance.audit?.retention_days);
    setRetentionError(rErr);
    if (nErr || Object.values(toolErrs).some(Boolean) || rErr) {
      // Open identity section so the user sees the name error
      if (nErr) setExpandedSection("identity");
      return;
    }

    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/blueprints/from-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId,
          customizations: { identity, capabilities, constraints, governance },
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { message?: string }).message ?? `HTTP ${res.status}`);
      }
      const data = await res.json();
      setResult({
        blueprintId: data.id,
        agentId: data.agentId,
        violations: data.validationReport?.violations?.length ?? 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Blueprint generation failed.");
      setGenerating(false);
    }
  }

  // ── Post-generation view ─────────────────────────────────────────────────

  if (result) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-surface-muted px-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 size={28} className="text-emerald-600" />
          </div>
          <h2 className="text-lg font-semibold text-text">Blueprint Generated</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Your <strong>{identity.name}</strong> agent blueprint is ready.
          </p>

          {result.violations > 0 && (
            <div className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-amber-50 px-3 py-2">
              <AlertTriangle size={14} className="text-amber-600" />
              <span className="text-xs text-amber-700">
                {result.violations} governance {result.violations === 1 ? "finding" : "findings"} to review
              </span>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-2">
            <button
              onClick={() => router.push(`/registry/${result.agentId}`)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              View in Registry
            </button>
            <button
              onClick={() => router.push("/intake")}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface py-2.5 text-sm font-medium text-text transition-colors hover:bg-surface-muted"
            >
              Back to Design Studio
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main editor layout ───────────────────────────────────────────────────

  const tier = TIER_STYLES[templateGovernanceTier] ?? TIER_STYLES.standard;

  return (
    <div className="flex flex-col min-h-screen bg-surface-muted">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="shrink-0 border-b border-border bg-surface px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/intake")}
              className="rounded-lg p-1.5 text-text-tertiary hover:bg-surface-muted hover:text-text transition-colors"
              aria-label="Back"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold text-text">{templateName}</h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  <Zap size={10} />
                  Express Lane
                </span>
              </div>
              {/* 4-section completion progress */}
              <div className="mt-1.5 flex items-center gap-1.5">
                {[
                  { id: "identity",     label: "Identity",     done: !!identity.name?.trim() && !nameError },
                  { id: "capabilities", label: "Capabilities", done: capabilities.tools.length > 0 },
                  { id: "constraints",  label: "Constraints",  done: (constraints.allowed_domains?.length ?? 0) > 0 || (constraints.denied_actions?.length ?? 0) > 0 },
                  { id: "governance",   label: "Governance",   done: governance.policies.length > 0 },
                ].map((sec, i) => (
                  <button
                    key={sec.id}
                    onClick={() => toggleSection(sec.id as EditingSection)}
                    className="flex items-center gap-1 text-[10px]"
                    title={sec.label}
                  >
                    <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${sec.done ? "bg-emerald-500 text-white" : expandedSection === sec.id ? "bg-primary text-white" : "bg-surface-raised text-text-tertiary"}`}>
                      {sec.done ? <Check size={8} /> : i + 1}
                    </span>
                    <span className={`hidden sm:inline ${sec.done ? "text-emerald-600" : expandedSection === sec.id ? "text-primary" : "text-text-tertiary"}`}>
                      {sec.label}
                    </span>
                    {i < 3 && <span className="text-text-tertiary">·</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating || !identity.name?.trim() || !!nameError}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {generating ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Zap size={14} />
                Generate Blueprint
              </>
            )}
          </button>
        </div>
      </header>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <main className="flex-1 px-6 py-6">
        <div className="mx-auto max-w-4xl space-y-4">

          {/* Template context strip */}
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3">
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${tier.bg} ${tier.text}`}>
              <Shield size={12} />
              {tier.label}
            </span>
            <span className="rounded-full bg-surface-raised px-2.5 py-1 text-xs text-text-secondary">
              {CATEGORY_LABELS[templateCategory] ?? templateCategory}
            </span>
            {templateTags.slice(0, 4).map((tag) => (
              <span key={tag} className="rounded-full bg-surface-raised px-2 py-0.5 text-[10px] text-text-tertiary">
                {tag}
              </span>
            ))}
            <p className="ml-auto text-xs text-text-tertiary">
              {capabilities.tools.length} tools · {governance.policies.length} policies
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertTriangle size={14} />
              {error}
            </div>
          )}

          {/* ── Identity Section ───────────────────────────────────────── */}
          <SectionCard
            icon={<User size={16} />}
            title="Identity"
            subtitle={identity.name || "Unnamed agent"}
            expanded={expandedSection === "identity"}
            onToggle={() => toggleSection("identity")}
          >
            <div className="space-y-4">
              <Field label="Agent Name" required>
                <input
                  type="text"
                  value={identity.name ?? ""}
                  onChange={(e) => {
                    setIdentity({ ...identity, name: e.target.value });
                    if (nameTouched) setNameError(validateName(e.target.value));
                  }}
                  onBlur={handleNameBlur}
                  className={`input-field ${nameError ? "border-red-400 focus:ring-red-200" : ""}`}
                  placeholder="e.g. Customer Service Agent"
                  aria-invalid={!!nameError}
                />
                {nameError && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                    <AlertTriangle size={11} /> {nameError}
                  </p>
                )}
              </Field>
              <Field label="Description">
                <textarea
                  value={identity.description ?? ""}
                  onChange={(e) => setIdentity({ ...identity, description: e.target.value })}
                  rows={3}
                  className="input-field resize-none"
                  placeholder="What does this agent do?"
                />
              </Field>
              <Field label="Persona">
                <textarea
                  value={identity.persona ?? ""}
                  onChange={(e) => setIdentity({ ...identity, persona: e.target.value })}
                  rows={2}
                  className="input-field resize-none"
                  placeholder="Personality, tone, and communication style"
                />
              </Field>
            </div>
          </SectionCard>

          {/* ── Capabilities Section ───────────────────────────────────── */}
          <SectionCard
            icon={<Wrench size={16} />}
            title="Capabilities"
            subtitle={`${capabilities.tools.length} tools · ${capabilities.knowledge_sources?.length ?? 0} knowledge sources`}
            expanded={expandedSection === "capabilities"}
            onToggle={() => toggleSection("capabilities")}
          >
            <div className="space-y-4">
              {/* Tools */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Tools</span>
                  <button
                    onClick={() =>
                      setCapabilities({
                        ...capabilities,
                        tools: [...capabilities.tools, { name: "", type: "function", description: "" }],
                      })
                    }
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-primary hover:bg-primary/5 transition-colors"
                  >
                    <Plus size={12} />
                    Add Tool
                  </button>
                </div>
                <div className="space-y-2">
                  {capabilities.tools.map((tool, i) => (
                    <div key={i} className="group flex items-start gap-2 rounded-lg border border-border bg-surface-muted p-3">
                      <div className="flex-1 space-y-2">
                        <div className="flex gap-2">
                          <div className="flex-1">
                          <input
                            type="text"
                            value={tool.name}
                            onChange={(e) => {
                              const updated = [...capabilities.tools];
                              updated[i] = { ...tool, name: e.target.value };
                              setCapabilities({ ...capabilities, tools: updated });
                              if (toolNameErrors[i] !== undefined)
                                setToolNameErrors((prev) => ({ ...prev, [i]: validateToolName(e.target.value) ?? "" }));
                            }}
                            onBlur={(e) => handleToolNameBlur(i, e.target.value)}
                            className={`input-field-sm w-full ${toolNameErrors[i] ? "border-red-400" : ""}`}
                            placeholder="tool_name"
                          />
                          {toolNameErrors[i] && (
                            <p className="mt-0.5 text-[10px] text-red-600">{toolNameErrors[i]}</p>
                          )}
                          </div>
                          <select
                            value={tool.type}
                            onChange={(e) => {
                              const updated = [...capabilities.tools];
                              updated[i] = { ...tool, type: e.target.value as "api" | "function" | "mcp_server" | "plugin" };
                              setCapabilities({ ...capabilities, tools: updated });
                            }}
                            className="input-field-sm w-28"
                          >
                            <option value="function">Function</option>
                            <option value="api">API</option>
                            <option value="mcp_server">MCP Server</option>
                            <option value="plugin">Plugin</option>
                          </select>
                        </div>
                        <input
                          type="text"
                          value={tool.description ?? ""}
                          onChange={(e) => {
                            const updated = [...capabilities.tools];
                            updated[i] = { ...tool, description: e.target.value };
                            setCapabilities({ ...capabilities, tools: updated });
                          }}
                          className="input-field-sm w-full"
                          placeholder="What this tool does…"
                        />
                      </div>
                      <button
                        onClick={() => {
                          const updated = capabilities.tools.filter((_, j) => j !== i);
                          setCapabilities({ ...capabilities, tools: updated });
                        }}
                        className="shrink-0 rounded-lg p-1.5 text-text-tertiary opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 transition-all"
                        aria-label="Remove tool"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Instructions */}
              <Field label="Behavioral Instructions">
                <textarea
                  value={capabilities.instructions ?? ""}
                  onChange={(e) => setCapabilities({ ...capabilities, instructions: e.target.value })}
                  rows={8}
                  className="input-field resize-none font-mono text-xs leading-relaxed"
                  placeholder="Agent behavioral instructions…"
                />
              </Field>
            </div>
          </SectionCard>

          {/* ── Constraints Section ────────────────────────────────────── */}
          <SectionCard
            icon={<Ban size={16} />}
            title="Constraints"
            subtitle={`${constraints.allowed_domains?.length ?? 0} domains · ${constraints.denied_actions?.length ?? 0} denied actions`}
            expanded={expandedSection === "constraints"}
            onToggle={() => toggleSection("constraints")}
          >
            <div className="space-y-4">
              <EditableList
                label="Allowed Domains"
                items={constraints.allowed_domains ?? []}
                onChange={(items) => setConstraints({ ...constraints, allowed_domains: items })}
                placeholder="e.g. account-inquiries"
              />
              <EditableList
                label="Denied Actions"
                items={constraints.denied_actions ?? []}
                onChange={(items) => setConstraints({ ...constraints, denied_actions: items })}
                placeholder="e.g. Process financial transactions"
              />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Max Tokens per Response">
                  <input
                    type="number"
                    min={1}
                    value={constraints.max_tokens_per_response ?? ""}
                    onChange={(e) =>
                      setConstraints({
                        ...constraints,
                        max_tokens_per_response: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    className="input-field"
                    placeholder="800"
                  />
                </Field>
                <Field label="Requests per Minute">
                  <input
                    type="number"
                    value={constraints.rate_limits?.requests_per_minute ?? ""}
                    onChange={(e) =>
                      setConstraints({
                        ...constraints,
                        rate_limits: {
                          ...constraints.rate_limits,
                          requests_per_minute: e.target.value ? Number(e.target.value) : undefined,
                        },
                      })
                    }
                    className="input-field"
                    placeholder="30"
                  />
                </Field>
              </div>
            </div>
          </SectionCard>

          {/* ── Governance Section ─────────────────────────────────────── */}
          <SectionCard
            icon={<ShieldCheck size={16} />}
            title="Governance"
            subtitle={`${governance.policies.length} policies · Audit ${governance.audit?.log_interactions ? "enabled" : "disabled"}`}
            expanded={expandedSection === "governance"}
            onToggle={() => toggleSection("governance")}
          >
            <div className="space-y-4">
              {/* Policies */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Policies</span>
                  <button
                    onClick={() =>
                      setGovernance({
                        ...governance,
                        policies: [
                          ...governance.policies,
                          { name: "", type: "safety", description: "", rules: [] },
                        ],
                      })
                    }
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-primary hover:bg-primary/5 transition-colors"
                  >
                    <Plus size={12} />
                    Add Policy
                  </button>
                </div>
                <div className="space-y-2">
                  {governance.policies.map((policy, i) => (
                    <div key={i} className="group rounded-lg border border-border bg-surface-muted p-3 space-y-2">
                      <div className="flex items-start gap-2">
                        <div className="flex-1 space-y-2">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={policy.name}
                              onChange={(e) => {
                                const updated = [...governance.policies];
                                updated[i] = { ...policy, name: e.target.value };
                                setGovernance({ ...governance, policies: updated });
                              }}
                              className="input-field-sm flex-1"
                              placeholder="Policy name"
                            />
                            <select
                              value={policy.type}
                              onChange={(e) => {
                                const updated = [...governance.policies];
                                updated[i] = { ...policy, type: e.target.value as typeof policy.type };
                                setGovernance({ ...governance, policies: updated });
                              }}
                              className="input-field-sm w-36"
                            >
                              <option value="safety">Safety</option>
                              <option value="compliance">Compliance</option>
                              <option value="data_handling">Data Handling</option>
                              <option value="access_control">Access Control</option>
                              <option value="audit">Audit</option>
                            </select>
                          </div>
                          <input
                            type="text"
                            value={policy.description ?? ""}
                            onChange={(e) => {
                              const updated = [...governance.policies];
                              updated[i] = { ...policy, description: e.target.value };
                              setGovernance({ ...governance, policies: updated });
                            }}
                            className="input-field-sm w-full"
                            placeholder="Policy description"
                          />
                        </div>
                        <button
                          onClick={() => {
                            const updated = governance.policies.filter((_, j) => j !== i);
                            setGovernance({ ...governance, policies: updated });
                          }}
                          className="shrink-0 rounded-lg p-1.5 text-text-tertiary opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 transition-all"
                          aria-label="Remove policy"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                      {/* Policy rules */}
                      <div className="pl-1 space-y-1">
                        {(policy.rules ?? []).map((rule, ri) => (
                          <div key={ri} className="flex items-center gap-1.5">
                            <span className="text-xs text-text-tertiary">•</span>
                            <input
                              type="text"
                              value={rule}
                              onChange={(e) => {
                                const updatedPolicies = [...governance.policies];
                                const updatedRules = [...(policy.rules ?? [])];
                                updatedRules[ri] = e.target.value;
                                updatedPolicies[i] = { ...policy, rules: updatedRules };
                                setGovernance({ ...governance, policies: updatedPolicies });
                              }}
                              className="input-field-sm flex-1 text-xs"
                              placeholder="Rule…"
                            />
                            <button
                              onClick={() => {
                                const updatedPolicies = [...governance.policies];
                                const updatedRules = (policy.rules ?? []).filter((_, j) => j !== ri);
                                updatedPolicies[i] = { ...policy, rules: updatedRules };
                                setGovernance({ ...governance, policies: updatedPolicies });
                              }}
                              className="rounded p-0.5 text-text-tertiary hover:text-red-500 transition-colors"
                            >
                              <X size={11} />
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => {
                            const updatedPolicies = [...governance.policies];
                            updatedPolicies[i] = { ...policy, rules: [...(policy.rules ?? []), ""] };
                            setGovernance({ ...governance, policies: updatedPolicies });
                          }}
                          className="text-[10px] text-primary hover:underline"
                        >
                          + Add rule
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Audit config */}
              <div>
                <span className="mb-2 block text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Audit Configuration
                </span>
                <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-surface-muted p-3">
                  <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
                    <input
                      type="checkbox"
                      checked={governance.audit?.log_interactions ?? true}
                      onChange={(e) =>
                        setGovernance({
                          ...governance,
                          audit: { ...governance.audit, log_interactions: e.target.checked },
                        })
                      }
                      className="rounded border-border text-primary focus:ring-primary/20"
                    />
                    Log Interactions
                  </label>
                  <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
                    <input
                      type="checkbox"
                      checked={governance.audit?.pii_redaction ?? false}
                      onChange={(e) =>
                        setGovernance({
                          ...governance,
                          audit: { ...governance.audit, pii_redaction: e.target.checked },
                        })
                      }
                      className="rounded border-border text-primary focus:ring-primary/20"
                    />
                    PII Redaction
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-tertiary">Retention:</span>
                    <div>
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={governance.audit?.retention_days ?? 90}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setGovernance({
                          ...governance,
                          audit: { ...governance.audit, retention_days: val },
                        });
                        setRetentionError(validateRetention(val));
                      }}
                      onBlur={(e) => handleRetentionBlur(Number(e.target.value))}
                      className={`input-field-sm w-20 ${retentionError ? "border-red-400" : ""}`}
                    />
                    {retentionError && (
                      <p className="mt-0.5 text-[10px] text-red-600">{retentionError}</p>
                    )}
                    </div>
                    <span className="text-xs text-text-tertiary">days</span>
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* ── Bottom generate bar ────────────────────────────────────── */}
          <div className="sticky bottom-0 flex items-center justify-between rounded-xl border border-border bg-surface px-5 py-4 shadow-lg">
            <div className="text-xs text-text-secondary">
              Ready to generate? Governance validation runs automatically after generation.
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating || !identity.name?.trim() || !!nameError}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {generating ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Generating Blueprint…
                </>
              ) : (
                <>
                  <Zap size={14} />
                  Generate Blueprint
                </>
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

// ── Reusable sub-components ──────────────────────────────────────────────────

function SectionCard({
  icon,
  title,
  subtitle,
  expanded,
  onToggle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden transition-shadow hover:shadow-sm">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-surface-muted/50"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-raised text-text-secondary">
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-text">{title}</h3>
          <p className="text-xs text-text-tertiary truncate">{subtitle}</p>
        </div>
        {expanded ? (
          <ChevronDown size={16} className="shrink-0 text-text-tertiary" />
        ) : (
          <ChevronRight size={16} className="shrink-0 text-text-tertiary" />
        )}
      </button>
      {expanded && <div className="border-t border-border px-5 py-4">{children}</div>}
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-text-secondary">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function EditableList({
  label,
  items,
  onChange,
  placeholder,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">{label}</span>
        <button
          onClick={() => onChange([...items, ""])}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-primary hover:bg-primary/5 transition-colors"
        >
          <Plus size={12} />
          Add
        </button>
      </div>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text"
              value={item}
              onChange={(e) => {
                const updated = [...items];
                updated[i] = e.target.value;
                onChange(updated);
              }}
              className="input-field-sm flex-1"
              placeholder={placeholder}
            />
            <button
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="rounded-lg p-1 text-text-tertiary hover:bg-red-50 hover:text-red-500 transition-colors"
            >
              <X size={13} />
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-xs text-text-tertiary italic">None configured</p>
        )}
      </div>
    </div>
  );
}
