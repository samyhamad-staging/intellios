"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField, FormSection } from "@/components/ui/form-field";
import { Combobox, ComboboxOption, ComboboxLabel } from "@/components/catalyst/combobox";
import { Checkbox } from "@/components/catalyst/checkbox";

// ─── ABP Field Suggestions ────────────────────────────────────────────────────
// Common field paths from the Agent Blueprint Package schema, shown as
// autocomplete suggestions in the rule editor's ABP field path combobox.

const ABP_FIELD_SUGGESTIONS: string[] = [
  "identity.name",
  "identity.version",
  "identity.description",
  "identity.domain",
  "identity.tags",
  "model.provider",
  "model.modelId",
  "model.temperature",
  "model.maxTokens",
  "model.systemPrompt",
  "tools[].name",
  "tools[].type",
  "tools[].description",
  "resources[].type",
  "resources[].name",
  "security.piiHandling",
  "security.dataRetention",
  "compliance.frameworks",
  "governance.escalationPath",
  "constraints.allowedDomains",
  "constraints.blockedDomains",
  "metadata.owner",
  "metadata.team",
];

// ─── Types ────────────────────────────────────────────────────────────────────

const POLICY_TYPES = [
  { value: "safety",         label: "Safety" },
  { value: "compliance",     label: "Compliance" },
  { value: "data_handling",  label: "Data Handling" },
  { value: "access_control", label: "Access Control" },
  { value: "audit",          label: "Audit" },
  { value: "runtime",        label: "Runtime" },
] as const;

type PolicyType = (typeof POLICY_TYPES)[number]["value"];

// ─── Runtime rule types ───────────────────────────────────────────────────────

const RUNTIME_OPERATORS = [
  {
    value:       "token_budget_daily",
    label:       "Token budget (daily)",
    description: "Max total tokens (in + out) per 24-hour window",
    valueType:   "number" as const,
    placeholder: "e.g. 100000",
  },
  {
    value:       "token_budget_per_interaction",
    label:       "Token budget (per interaction)",
    description: "Max average tokens per invocation",
    valueType:   "number" as const,
    placeholder: "e.g. 4000",
  },
  {
    value:       "pii_action",
    label:       "PII action",
    description: "Documents intended PII handling — enforced at runtime in H3",
    valueType:   "pii_action" as const,
    placeholder: "",
  },
  {
    value:       "scope_constraint",
    label:       "Scope constraint",
    description: "Comma-separated list of allowed tool names",
    valueType:   "text" as const,
    placeholder: "e.g. web_search, calculator",
  },
  {
    value:       "circuit_breaker_error_rate",
    label:       "Circuit breaker — error rate",
    description: "Error rate threshold (0–1). Fires when errors/invocations exceeds this.",
    valueType:   "number" as const,
    placeholder: "e.g. 0.1",
  },
] as const;

type RuntimeOperator = (typeof RUNTIME_OPERATORS)[number]["value"];

export interface RuntimePolicyRule {
  id:       string;
  operator: RuntimeOperator;
  value:    unknown; // string in form state; numbers parsed on submit
  severity: "error" | "warning";
  message:  string;
}

function emptyRuntimeRule(): RuntimePolicyRule {
  return {
    id:       crypto.randomUUID(),
    operator: "circuit_breaker_error_rate",
    value:    "",
    severity: "error",
    message:  "",
  };
}

const OPERATORS = [
  { value: "exists",            label: "exists",            hasValue: false },
  { value: "not_exists",        label: "not_exists",        hasValue: false },
  { value: "equals",            label: "equals",            hasValue: true  },
  { value: "not_equals",        label: "not_equals",        hasValue: true  },
  { value: "contains",          label: "contains",          hasValue: true  },
  { value: "not_contains",      label: "not_contains",      hasValue: true  },
  { value: "matches",           label: "matches (regex)",   hasValue: true  },
  { value: "count_gte",         label: "count ≥",           hasValue: true  },
  { value: "count_lte",         label: "count ≤",           hasValue: true  },
  { value: "includes_type",     label: "includes_type",     hasValue: true  },
  { value: "not_includes_type", label: "not_includes_type", hasValue: true  },
] as const;

type Operator = (typeof OPERATORS)[number]["value"];

export interface PolicyRule {
  id: string;
  field: string;
  operator: Operator;
  value?: string;
  severity: "error" | "warning";
  message: string;
}

export interface PolicyFormValues {
  name: string;
  type: PolicyType;
  description: string;
  rules: PolicyRule[] | RuntimePolicyRule[];
  /**
   * W3-03 per-agent scope. null = applies to all agents in this enterprise.
   * Non-null = array of logical agentId UUIDs this policy is restricted to.
   */
  scopedAgentIds: string[] | null;
}

/** Lightweight agent reference used in the scope selector. */
interface AgentRef {
  agentId: string;
  name: string | null;
}

// ─── Simulation result types ──────────────────────────────────────────────────

interface SimulationBlueprintResult {
  blueprintId: string;
  agentName: string;
  agentId: string;
  status: "new_violations" | "resolved_violations" | "no_change";
  newViolationCount: number;
  resolvedViolationCount: number;
}

interface SimulationResult {
  summary: {
    total: number;
    newViolations: number;
    resolvedViolations: number;
    noChange: number;
  };
  blueprints: SimulationBlueprintResult[];
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface PolicyFormProps {
  initialValues?: PolicyFormValues;
  onSubmit: (values: PolicyFormValues) => void;
  submitLabel?: string;
  saving?: boolean;
  readOnly?: boolean;
  /** When provided, the "Preview Impact" button is shown and this ID is sent as existingPolicyId */
  existingPolicyId?: string;
  /**
   * When provided, form state is auto-saved to localStorage under this key every 30 seconds.
   * On mount, a saved draft is restored if no initialValues are present.
   * The caller is responsible for clearing the draft (localStorage.removeItem) after a successful submit.
   */
  draftKey?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function newRuleId() {
  return crypto.randomUUID();
}

function emptyRule(): PolicyRule {
  return {
    id: newRuleId(),
    field: "",
    operator: "exists",
    value: "",
    severity: "error",
    message: "",
  };
}

function operatorHasValue(operator: Operator): boolean {
  return OPERATORS.find((o) => o.value === operator)?.hasValue ?? true;
}

// ─── Rule Row ─────────────────────────────────────────────────────────────────

function RuleRow({
  rule,
  index,
  onChange,
  onRemove,
  readOnly,
}: {
  rule: PolicyRule;
  index: number;
  onChange: (updated: PolicyRule) => void;
  onRemove: () => void;
  readOnly: boolean;
}) {
  const showValue = operatorHasValue(rule.operator);

  return (
    <div className="rounded-lg border border-border bg-surface-muted px-4 py-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-text-tertiary uppercase tracking-wider">
          Rule {index + 1}
        </span>
        {!readOnly && (
          <button
            type="button"
            onClick={onRemove}
            className="text-xs text-text-tertiary hover:text-red-500 dark:hover:text-red-400 transition-colors"
          >
            Remove
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Field — Catalyst Combobox with ABP field path suggestions */}
        <FormField
          label="ABP field path"
          htmlFor={`rule-${index}-field`}
          error={undefined}
        >
          {readOnly ? (
            <input
              id={`rule-${index}-field`}
              type="text"
              value={rule.field}
              readOnly
              placeholder="e.g. identity.name"
              className="w-full rounded-md border border-border px-3 py-1.5 text-sm text-text placeholder-text-tertiary bg-surface-muted text-text-tertiary"
            />
          ) : (
            <Combobox<string>
              options={ABP_FIELD_SUGGESTIONS}
              displayValue={(v) => v ?? ""}
              value={rule.field || undefined}
              onChange={(v) => onChange({ ...rule, field: v ?? "" })}
              onInputChange={(q) => onChange({ ...rule, field: q })}
              placeholder="e.g. identity.name"
              aria-label="ABP field path"
            >
              {(option) => (
                <ComboboxOption value={option}>
                  <ComboboxLabel>{option}</ComboboxLabel>
                </ComboboxOption>
              )}
            </Combobox>
          )}
        </FormField>

        {/* Operator */}
        <FormField
          label="Operator"
          htmlFor={`rule-${index}-operator`}
          error={undefined}
        >
          <Select
            value={rule.operator}
            onValueChange={(v) => onChange({ ...rule, operator: v as Operator, value: "" })}
            disabled={readOnly}
          >
            <SelectTrigger className="w-full text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OPERATORS.map((op) => (
                <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        {/* Value */}
        {showValue && (
          <FormField
            label="Value"
            htmlFor={`rule-${index}-value`}
            error={undefined}
          >
            <input
              id={`rule-${index}-value`}
              type="text"
              value={rule.value ?? ""}
              onChange={(e) => onChange({ ...rule, value: e.target.value })}
              placeholder="Comparison value"
              disabled={readOnly}
              className="w-full rounded-md border border-border px-3 py-1.5 text-sm text-text placeholder-text-tertiary focus:border-primary focus:outline-none disabled:bg-surface-muted disabled:text-text-tertiary"
            />
          </FormField>
        )}

        {/* Severity */}
        <FormField
          label="Severity"
          htmlFor={`rule-${index}-severity`}
          error={undefined}
        >
          <Select
            value={rule.severity}
            onValueChange={(v) => onChange({ ...rule, severity: v as "error" | "warning" })}
            disabled={readOnly}
          >
            <SelectTrigger className="w-full text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="error">error — blocks finalization</SelectItem>
              <SelectItem value="warning">warning — informational</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
      </div>

      {/* Violation message */}
      <FormField
        label="Violation message"
        htmlFor={`rule-${index}-message`}
        error={undefined}
      >
        <input
          id={`rule-${index}-message`}
          type="text"
          value={rule.message}
          onChange={(e) => onChange({ ...rule, message: e.target.value })}
          placeholder="Shown when this rule is violated"
          disabled={readOnly}
          className="w-full rounded-md border border-border px-3 py-1.5 text-sm text-text placeholder-text-tertiary focus:border-primary focus:outline-none disabled:bg-surface-muted disabled:text-text-tertiary"
        />
      </FormField>
    </div>
  );
}

// ─── Runtime Rule Row ─────────────────────────────────────────────────────────

function RuntimeRuleRow({
  rule,
  index,
  onChange,
  onRemove,
  readOnly,
}: {
  rule: RuntimePolicyRule;
  index: number;
  onChange: (updated: RuntimePolicyRule) => void;
  onRemove: () => void;
  readOnly: boolean;
}) {
  const opDef = RUNTIME_OPERATORS.find((o) => o.value === rule.operator);

  return (
    <div className="rounded-lg border border-blue-100 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 px-4 py-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-blue-500 dark:text-blue-400 uppercase tracking-wider">
          Runtime Rule {index + 1}
        </span>
        {!readOnly && (
          <button
            type="button"
            onClick={onRemove}
            className="text-xs text-text-tertiary hover:text-red-500 dark:hover:text-red-400 transition-colors"
          >
            Remove
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Operator */}
        <FormField
          label="Operator"
          htmlFor={`runtime-rule-${index}-operator`}
          description={opDef?.description}
          error={undefined}
          className="col-span-2"
        >
          <Select
            value={rule.operator}
            onValueChange={(v) => onChange({ ...rule, operator: v as RuntimeOperator, value: "" })}
            disabled={readOnly}
          >
            <SelectTrigger className="w-full text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RUNTIME_OPERATORS.map((op) => (
                <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        {/* Value — varies by operator */}
        {opDef?.valueType === "pii_action" ? (
          <FormField
            label="PII Action"
            htmlFor={`runtime-rule-${index}-pii-action`}
            error={undefined}
          >
            <Select
              value={String(rule.value ?? "block")}
              onValueChange={(v) => onChange({ ...rule, value: v })}
              disabled={readOnly}
            >
              <SelectTrigger className="w-full text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="block">block — reject request</SelectItem>
                <SelectItem value="redact">redact — mask PII in response</SelectItem>
                <SelectItem value="log">log — allow but audit</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        ) : (
          <FormField
            label="Value"
            htmlFor={`runtime-rule-${index}-value`}
            error={undefined}
          >
            <input
              id={`runtime-rule-${index}-value`}
              type={opDef?.valueType === "number" ? "number" : "text"}
              step={opDef?.valueType === "number" ? "any" : undefined}
              value={String(rule.value ?? "")}
              onChange={(e) => onChange({ ...rule, value: e.target.value })}
              placeholder={opDef?.placeholder ?? ""}
              disabled={readOnly}
              className="w-full rounded-md border border-border px-3 py-1.5 text-sm text-text placeholder-text-tertiary focus:border-primary focus:outline-none disabled:bg-surface-muted disabled:text-text-tertiary"
            />
          </FormField>
        )}

        {/* Severity */}
        <FormField
          label="Severity"
          htmlFor={`runtime-rule-${index}-severity`}
          error={undefined}
        >
          <Select
            value={rule.severity}
            onValueChange={(v) => onChange({ ...rule, severity: v as "error" | "warning" })}
            disabled={readOnly}
          >
            <SelectTrigger className="w-full text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="error">error — alert + auto-suspend (H2-1.4)</SelectItem>
              <SelectItem value="warning">warning — alert only</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
      </div>

      {/* Alert message */}
      <FormField
        label="Alert message"
        htmlFor={`runtime-rule-${index}-message`}
        error={undefined}
      >
        <input
          id={`runtime-rule-${index}-message`}
          type="text"
          value={rule.message}
          onChange={(e) => onChange({ ...rule, message: e.target.value })}
          placeholder="Shown when this threshold is breached"
          disabled={readOnly}
          className="w-full rounded-md border border-border px-3 py-1.5 text-sm text-text placeholder-text-tertiary focus:border-primary focus:outline-none disabled:bg-surface-muted disabled:text-text-tertiary"
        />
      </FormField>
    </div>
  );
}

// ─── Main Form ────────────────────────────────────────────────────────────────

export default function PolicyForm({
  initialValues,
  onSubmit,
  submitLabel = "Save",
  saving = false,
  readOnly = false,
  existingPolicyId,
  draftKey,
}: PolicyFormProps) {
  const [name, setName] = useState(initialValues?.name ?? "");
  const [type, setType] = useState<PolicyType>(initialValues?.type ?? "compliance");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [rules, setRules] = useState<PolicyRule[] | RuntimePolicyRule[]>(initialValues?.rules ?? []);
  const isRuntime = type === "runtime";
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── W3-03: Per-agent scope ─────────────────────────────────────────────────
  // scopedAgentIds = null means "all agents"; non-null = specific agents only
  const [scopedAgentIds, setScopedAgentIds] = useState<string[] | null>(
    initialValues?.scopedAgentIds ?? null
  );
  const [agentSearch, setAgentSearch] = useState("");
  const [availableAgents, setAvailableAgents] = useState<AgentRef[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(false);

  useEffect(() => {
    if (readOnly) return;
    setAgentsLoading(true);
    fetch("/api/registry")
      .then((r) => r.json())
      .then((data: { agents?: Array<{ agentId: string; name: string | null }> }) => {
        if (data.agents) {
          setAvailableAgents(
            data.agents.map((a) => ({ agentId: a.agentId, name: a.name }))
          );
        }
      })
      .catch(() => { /* non-critical — scope defaults to all agents */ })
      .finally(() => setAgentsLoading(false));
  }, [readOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredAgents = availableAgents.filter((a) => {
    if (!agentSearch.trim()) return true;
    const q = agentSearch.toLowerCase();
    return (a.name ?? "").toLowerCase().includes(q) || a.agentId.toLowerCase().includes(q);
  });

  function toggleAgent(agentId: string) {
    setScopedAgentIds((prev) => {
      if (prev === null) return [agentId];
      if (prev.includes(agentId)) {
        const next = prev.filter((id) => id !== agentId);
        return next.length === 0 ? null : next;
      }
      return [...prev, agentId];
    });
  }

  // ── Draft auto-save ────────────────────────────────────────────────────────
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null);
  const [tickNow, setTickNow] = useState(() => Date.now());

  // Restore draft from localStorage on mount (only when no initialValues are provided)
  useEffect(() => {
    if (!draftKey || initialValues) return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        name?: string;
        type?: PolicyType;
        description?: string;
        rules?: PolicyRule[] | RuntimePolicyRule[];
        scopedAgentIds?: string[] | null;
        savedAt?: string;
      };
      if (parsed.name !== undefined) setName(parsed.name);
      if (parsed.type !== undefined) setType(parsed.type);
      if (parsed.description !== undefined) setDescription(parsed.description);
      if (parsed.rules !== undefined) setRules(parsed.rules);
      if ("scopedAgentIds" in parsed) setScopedAgentIds(parsed.scopedAgentIds ?? null);
      if (parsed.savedAt) setDraftSavedAt(new Date(parsed.savedAt));
    } catch { /* malformed draft — ignore */ }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save to localStorage every 30 seconds
  useEffect(() => {
    if (!draftKey || readOnly) return;
    const id = setInterval(() => {
      try {
        const now = new Date();
        localStorage.setItem(
          draftKey,
          JSON.stringify({ name, type, description, rules, scopedAgentIds, savedAt: now.toISOString() })
        );
        setDraftSavedAt(now);
      } catch { /* storage quota or private browsing — ignore */ }
    }, 30_000);
    return () => clearInterval(id);
  }, [draftKey, readOnly, name, type, description, rules, scopedAgentIds]);

  // Tick every 60 s so "saved X min ago" label stays current
  useEffect(() => {
    if (!draftSavedAt) return;
    const id = setInterval(() => setTickNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, [draftSavedAt]);

  function draftSavedLabel(): string {
    if (!draftSavedAt) return "";
    const mins = Math.floor((tickNow - draftSavedAt.getTime()) / 60_000);
    if (mins < 1) return "Draft saved just now";
    if (mins === 1) return "Draft saved 1 min ago";
    return `Draft saved ${mins} min ago`;
  }

  // ── Impact simulation state ────────────────────────────────────────────────
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  const [simError, setSimError] = useState<string | null>(null);
  const [simDirty, setSimDirty] = useState(false); // true when form changed after last simulation

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Name is required";
    if (isRuntime) {
      const runtimeRules = rules as RuntimePolicyRule[];
      for (let i = 0; i < runtimeRules.length; i++) {
        const r = runtimeRules[i];
        if (!r.message.trim()) errs[`rule_${i}_message`] = "Message is required";
        if (r.operator !== "pii_action" && !r.value?.toString().trim()) {
          errs[`rule_${i}_value`] = "Value is required for this operator";
        }
      }
    } else {
      const dtRules = rules as PolicyRule[];
      for (let i = 0; i < dtRules.length; i++) {
        const r = dtRules[i];
        if (!r.field.trim()) errs[`rule_${i}_field`] = "Field is required";
        if (!r.message.trim()) errs[`rule_${i}_message`] = "Message is required";
        if (operatorHasValue(r.operator) && !r.value?.trim()) {
          errs[`rule_${i}_value`] = "Value is required for this operator";
        }
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (readOnly || !validate()) return;

    let cleanedRules: PolicyRule[] | RuntimePolicyRule[];
    if (isRuntime) {
      // For runtime rules, parse numeric values to their proper types
      cleanedRules = (rules as RuntimePolicyRule[]).map((r): RuntimePolicyRule => {
        const opDef = RUNTIME_OPERATORS.find((o) => o.value === r.operator);
        const parsedValue: unknown =
          opDef?.valueType === "number" ? Number(r.value) : r.value;
        return { ...r, value: parsedValue };
      });
    } else {
      // Strip empty value fields for exists/not_exists
      cleanedRules = (rules as PolicyRule[]).map((r): PolicyRule => {
        if (operatorHasValue(r.operator as Operator)) {
          return { ...r, value: r.value ?? "" };
        }
        const { value: _v, ...rest } = r;
        return rest as PolicyRule;
      });
    }

    onSubmit({
      name: name.trim(),
      type,
      description: description.trim(),
      rules: cleanedRules,
      scopedAgentIds,
    });
  }

  function updateRule(index: number, updated: PolicyRule | RuntimePolicyRule) {
    setRules((prev) => prev.map((r, i) => (i === index ? updated : r)) as PolicyRule[] | RuntimePolicyRule[]);
    setSimDirty(true);
  }

  function removeRule(index: number) {
    setRules((prev) => prev.filter((_, i) => i !== index) as PolicyRule[] | RuntimePolicyRule[]);
    setSimDirty(true);
  }

  function addRule() {
    const newRule = isRuntime ? emptyRuntimeRule() : emptyRule();
    setRules((prev) => [...prev, newRule] as PolicyRule[] | RuntimePolicyRule[]);
    setSimDirty(true);
  }

  async function handleSimulate() {
    if (isRuntime) return; // runtime policies cannot be simulated against blueprints
    if (rules.length === 0) {
      setSimError("Add at least one rule before previewing impact.");
      return;
    }
    const dtRulesForSim = rules as PolicyRule[];
    setSimulating(true);
    setSimError(null);
    setSimResult(null);
    setSimDirty(false);

    try {
      const payload: Record<string, unknown> = {
        policy: {
          name: name.trim() || "Draft Policy",
          description: description.trim() || undefined,
          type,
          rules: dtRulesForSim.map((r) => ({
            id: r.id,
            field: r.field,
            operator: r.operator,
            value: r.value,
            severity: r.severity,
            message: r.message,
          })),
        },
      };
      if (existingPolicyId) {
        payload.existingPolicyId = existingPolicyId;
      }

      const res = await fetch("/api/governance/policies/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSimError(
          (data as { message?: string }).message ?? "Simulation failed"
        );
        return;
      }

      const data = (await res.json()) as SimulationResult;
      setSimResult(data);
    } catch {
      setSimError("Network error. Please try again.");
    } finally {
      setSimulating(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ── Policy Details Section ────────────────────────────────────────────── */}
      <FormSection title="Policy Details" description="Define the policy identity and scope">
        <FormField
          label="Policy name"
          htmlFor="policy-name"
          required
          error={errors.name}
        >
          <input
            id="policy-name"
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setSimDirty(true); }}
            placeholder="e.g. PII Data Handling Policy"
            disabled={readOnly}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm text-text placeholder-text-tertiary focus:border-primary focus:outline-none disabled:bg-surface-raised disabled:text-text-tertiary"
          />
        </FormField>

        <FormField
          label="Type"
          htmlFor="policy-type"
          required
        >
          <Select
            value={type}
            onValueChange={(v) => {
              const newType = v as PolicyType;
              if ((newType === "runtime") !== (type === "runtime")) setRules([]);
              setType(newType);
              setSimDirty(true);
            }}
            disabled={readOnly}
          >
            <SelectTrigger className="w-full text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {POLICY_TYPES.map((pt) => (
                <SelectItem key={pt.value} value={pt.value}>{pt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField
          label="Description"
          htmlFor="policy-description"
          optional
        >
          <textarea
            id="policy-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what this policy enforces and why it exists"
            rows={3}
            disabled={readOnly}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm text-text placeholder-text-tertiary focus:border-primary focus:outline-none resize-none disabled:bg-surface-raised disabled:text-text-tertiary"
          />
        </FormField>
      </FormSection>

      {/* ── Scope Section ────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-surface px-6 py-5">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-text">Agent Scope</h2>
          <p className="mt-0.5 text-xs text-text-tertiary">
            Choose which agents this policy evaluates. Scoped policies are skipped during validation
            for agents not in the list.
          </p>
        </div>

        {readOnly ? (
          /* Read-only scope display */
          <div className="text-sm text-text">
            {scopedAgentIds === null || scopedAgentIds.length === 0 ? (
              <span className="text-text-secondary">All agents (enterprise-wide)</span>
            ) : (
              <div className="space-y-1">
                <span className="text-xs font-medium text-text-tertiary uppercase tracking-wider">
                  Restricted to {scopedAgentIds.length} agent{scopedAgentIds.length !== 1 ? "s" : ""}
                </span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {scopedAgentIds.map((id) => {
                    const agent = availableAgents.find((a) => a.agentId === id);
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center rounded-full bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-800 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300"
                      >
                        {agent?.name ?? id.slice(0, 8) + "…"}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Editable scope selector */
          <div className="space-y-4">
            {/* Scope mode toggle */}
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="scope-mode"
                  checked={scopedAgentIds === null}
                  onChange={() => setScopedAgentIds(null)}
                  className="h-3.5 w-3.5 accent-indigo-600"
                />
                <span className="text-sm text-text">
                  All agents{" "}
                  <span className="text-text-tertiary text-xs">(enterprise-wide default)</span>
                </span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="scope-mode"
                  checked={scopedAgentIds !== null}
                  onChange={() => setScopedAgentIds([])}
                  className="h-3.5 w-3.5 accent-indigo-600"
                />
                <span className="text-sm text-text">
                  Specific agents only
                </span>
              </label>
            </div>

            {/* Agent picker — only shown when "Specific agents" is selected */}
            {scopedAgentIds !== null && (
              <div className="rounded-lg border border-border bg-surface-muted p-4 space-y-3">
                {/* Search */}
                <div className="relative">
                  <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
                  <input
                    type="text"
                    value={agentSearch}
                    onChange={(e) => setAgentSearch(e.target.value)}
                    placeholder="Search agents…"
                    className="w-full rounded-md border border-border bg-surface pl-8 pr-3 py-1.5 text-sm text-text placeholder-text-tertiary focus:border-primary focus:outline-none"
                  />
                </div>

                {/* Agent list */}
                {agentsLoading ? (
                  <p className="text-xs text-text-tertiary text-center py-3">Loading agents…</p>
                ) : filteredAgents.length === 0 ? (
                  <p className="text-xs text-text-tertiary text-center py-3">
                    {availableAgents.length === 0
                      ? "No agents registered yet."
                      : "No agents match your search."}
                  </p>
                ) : (
                  <div className="max-h-52 overflow-y-auto space-y-1">
                    {filteredAgents.map((agent) => {
                      const selected = scopedAgentIds.includes(agent.agentId);
                      return (
                        <label
                          key={agent.agentId}
                          className={`flex items-center gap-3 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
                            selected
                              ? "border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/30"
                              : "border-transparent hover:border-border hover:bg-surface"
                          }`}
                        >
                          <Checkbox
                            checked={selected}
                            onChange={() => toggleAgent(agent.agentId)}
                            color="indigo"
                          />
                          <span className="text-sm text-text truncate">
                            {agent.name ?? <span className="text-text-tertiary italic">Unnamed agent</span>}
                          </span>
                          <span className="ml-auto shrink-0 font-mono text-xs text-text-tertiary">
                            {agent.agentId.slice(0, 8)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* Selection summary */}
                <p className="text-xs text-text-tertiary">
                  {scopedAgentIds.length === 0
                    ? "No agents selected — policy will not evaluate any agent until at least one is added."
                    : `${scopedAgentIds.length} of ${availableAgents.length} agent${availableAgents.length !== 1 ? "s" : ""} selected`}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Rules ─────────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-surface px-6 py-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-text">
              Rules
              <span className="ml-2 text-xs font-normal text-text-tertiary">
                ({rules.length} rule{rules.length === 1 ? "" : "s"})
              </span>
            </h2>
            <p className="mt-0.5 text-xs text-text-tertiary">
              {isRuntime
                ? "Each rule defines a telemetry threshold. Breaches fire alerts and may auto-suspend the agent (H2-1.4)."
                : "Each rule asserts a condition against an ABP field. Violations block deployment when severity is error."}
            </p>
          </div>
          {!readOnly && (
            <button
              type="button"
              onClick={addRule}
              className="rounded-lg border border-info-muted bg-info-muted px-3 py-1.5 text-sm font-medium text-info-text hover:bg-info-subtle transition-colors"
            >
              + Add Rule
            </button>
          )}
        </div>

        {rules.length === 0 && (
          <div className="rounded-lg border border-dashed border-border py-8 text-center">
            <p className="text-sm text-text-tertiary">
              {readOnly
                ? "No rules defined."
                : "No rules yet — click \"+ Add Rule\" to define the first assertion."}
            </p>
          </div>
        )}

        <div className="space-y-3">
          {rules.map((rule, i) => (
            <div key={rule.id}>
              {isRuntime ? (
                <RuntimeRuleRow
                  rule={rule as RuntimePolicyRule}
                  index={i}
                  onChange={(updated) => updateRule(i, updated)}
                  onRemove={() => removeRule(i)}
                  readOnly={readOnly}
                />
              ) : (
                <RuleRow
                  rule={rule as PolicyRule}
                  index={i}
                  onChange={(updated) => updateRule(i, updated)}
                  onRemove={() => removeRule(i)}
                  readOnly={readOnly}
                />
              )}
              {/* Inline rule-level validation hints */}
              {(errors[`rule_${i}_field`] ||
                errors[`rule_${i}_value`] ||
                errors[`rule_${i}_message`]) && (
                <div className="mt-1 space-y-0.5 px-1">
                  {errors[`rule_${i}_field`] && (
                    <p className="text-xs text-danger">{errors[`rule_${i}_field`]}</p>
                  )}
                  {errors[`rule_${i}_value`] && (
                    <p className="text-xs text-danger">{errors[`rule_${i}_value`]}</p>
                  )}
                  {errors[`rule_${i}_message`] && (
                    <p className="text-xs text-danger">{errors[`rule_${i}_message`]}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Runtime Policy Note ───────────────────────────────────────────────── */}
      {!readOnly && isRuntime && (
        <div className="rounded-xl border border-info-muted bg-info-muted px-6 py-4 space-y-2">
          <p className="text-sm font-semibold text-info-text">Runtime Policy — Live Telemetry Only</p>
          <p className="text-xs text-info-text opacity-80">
            This policy evaluates against live agent telemetry, not blueprint structure. Blueprint-level
            simulation is not available for runtime policies. Rules are checked every 15 minutes via the
            alert-check cron job. Breaches create in-app notifications and fire webhook events.
          </p>
          <p className="text-xs">
            <Link href="/governance?filter=runtime" className="text-info font-medium hover:underline">
              View runtime violations in Governance Hub →
            </Link>
          </p>
        </div>
      )}

      {/* ── Impact Simulation ─────────────────────────────────────────────────── */}
      {!readOnly && !isRuntime && (
        <div className="rounded-xl border border-border bg-surface px-6 py-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-text">Impact Preview</h2>
              <p className="mt-0.5 text-xs text-text-tertiary">
                See how this policy would affect approved and deployed blueprints before saving.
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <button
                type="button"
                onClick={handleSimulate}
                disabled={simulating || rules.length === 0}
                className="rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/30 px-3 py-1.5 text-sm font-medium text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/40 disabled:opacity-50 transition-colors"
              >
                {simulating ? "Analyzing…" : "Preview Impact"}
              </button>
              {rules.length === 0 && (
                <p className="text-xs text-text-tertiary">Add at least one rule to preview impact</p>
              )}
            </div>
          </div>

          {simDirty && simResult && (
            <div className="mb-3 rounded-lg border border-warning-muted bg-warning-muted px-3 py-2 text-xs text-warning-text">
              ⚠ Simulation may be outdated — policy has changed since last preview.
            </div>
          )}

          {simError && (
            <div className="rounded-lg border border-danger-muted bg-danger-muted px-3 py-2 text-xs text-danger-text">
              {simError}
            </div>
          )}

          {simResult && !simDirty && (
            <div className="space-y-3">
              {/* Summary row */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  {
                    label: "Total checked",
                    value: simResult.summary.total,
                    color: "bg-surface-raised border-border text-text-secondary",
                  },
                  {
                    label: "New violations",
                    value: simResult.summary.newViolations,
                    color:
                      simResult.summary.newViolations > 0
                        ? "bg-danger-muted border-danger-muted text-danger-text"
                        : "bg-surface-raised border-border text-text-secondary",
                  },
                  {
                    label: "Resolved",
                    value: simResult.summary.resolvedViolations,
                    color:
                      simResult.summary.resolvedViolations > 0
                        ? "bg-success-muted border-success-muted text-success-text"
                        : "bg-surface-raised border-border text-text-secondary",
                  },
                  {
                    label: "Unaffected",
                    value: simResult.summary.noChange,
                    color: "bg-surface-raised border-border text-text-secondary",
                  },
                ].map(({ label, value, color }) => (
                  <div
                    key={label}
                    className={`rounded-lg border px-3 py-2 text-center ${color}`}
                  >
                    <div className="text-lg font-bold">{value}</div>
                    <div className="text-xs">{label}</div>
                  </div>
                ))}
              </div>

              {/* Affected blueprints */}
              {simResult.blueprints.filter(
                (b) => b.status !== "no_change"
              ).length > 0 && (
                <div className="space-y-1">
                  {simResult.blueprints
                    .filter((b) => b.status !== "no_change")
                    .map((bp) => (
                      <div
                        key={bp.blueprintId}
                        className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                          bp.status === "new_violations"
                            ? "border-danger-muted bg-danger-muted"
                            : "border-success-muted bg-success-muted"
                        }`}
                      >
                        <Link
                          href={`/registry/${bp.agentId}`}
                          className="font-medium text-text hover:underline truncate"
                        >
                          {bp.agentName}
                        </Link>
                        <span
                          className={`shrink-0 ml-3 text-xs font-medium ${
                            bp.status === "new_violations"
                              ? "text-danger-text"
                              : "text-success-text"
                          }`}
                        >
                          {bp.status === "new_violations"
                            ? `+${bp.newViolationCount} violation${bp.newViolationCount !== 1 ? "s" : ""}`
                            : `−${bp.resolvedViolationCount} violation${bp.resolvedViolationCount !== 1 ? "s" : ""}`}
                        </span>
                      </div>
                    ))}
                </div>
              )}

              {simResult.summary.newViolations === 0 &&
                simResult.summary.resolvedViolations === 0 && (
                  <p className="text-xs text-text-secondary text-center py-2">
                    ✓ No deployed blueprints would be affected by this policy.
                  </p>
                )}
            </div>
          )}

          {!simResult && !simError && !simulating && (
            <p className="text-xs text-text-tertiary py-2">
              Click &quot;Preview Impact&quot; to check how this policy would affect your{" "}
              approved and deployed blueprints.
            </p>
          )}
        </div>
      )}

      {/* ── Submit ────────────────────────────────────────────────────────────── */}
      {!readOnly && (
        <div className="flex items-center justify-end gap-3">
          {draftKey && draftSavedAt && (
            <span className="mr-auto text-xs text-text-tertiary">{draftSavedLabel()}</span>
          )}
          <button
            type="button"
            onClick={() => window.history.back()}
            className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:bg-surface-raised transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : submitLabel}
          </button>
        </div>
      )}
    </form>
  );
}
