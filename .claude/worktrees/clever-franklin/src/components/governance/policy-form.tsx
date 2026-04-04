"use client";

import { useState } from "react";
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
          Rule {index + 1}
        </span>
        {!readOnly && (
          <button
            type="button"
            onClick={onRemove}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            Remove
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Field */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">ABP field path</label>
          <input
            type="text"
            value={rule.field}
            onChange={(e) => onChange({ ...rule, field: e.target.value })}
            placeholder="e.g. identity.name"
            disabled={readOnly}
            className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-900 placeholder-gray-300 focus:border-blue-400 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
          />
        </div>

        {/* Operator */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Operator</label>
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
        </div>

        {/* Value */}
        {showValue && (
          <div>
            <label className="block text-xs text-gray-500 mb-1">Value</label>
            <input
              type="text"
              value={rule.value ?? ""}
              onChange={(e) => onChange({ ...rule, value: e.target.value })}
              placeholder="Comparison value"
              disabled={readOnly}
              className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-900 placeholder-gray-300 focus:border-blue-400 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
            />
          </div>
        )}

        {/* Severity */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Severity</label>
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
        </div>
      </div>

      {/* Violation message */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Violation message</label>
        <input
          type="text"
          value={rule.message}
          onChange={(e) => onChange({ ...rule, message: e.target.value })}
          placeholder="Shown when this rule is violated"
          disabled={readOnly}
          className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-900 placeholder-gray-300 focus:border-blue-400 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
        />
      </div>
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
    <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-blue-500 uppercase tracking-wider">
          Runtime Rule {index + 1}
        </span>
        {!readOnly && (
          <button
            type="button"
            onClick={onRemove}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            Remove
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Operator */}
        <div className="col-span-2">
          <label className="block text-xs text-gray-500 mb-1">Operator</label>
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
          {opDef && (
            <p className="mt-1 text-xs text-gray-400">{opDef.description}</p>
          )}
        </div>

        {/* Value — varies by operator */}
        {opDef?.valueType === "pii_action" ? (
          <div>
            <label className="block text-xs text-gray-500 mb-1">PII Action</label>
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
          </div>
        ) : (
          <div>
            <label className="block text-xs text-gray-500 mb-1">Value</label>
            <input
              type={opDef?.valueType === "number" ? "number" : "text"}
              step={opDef?.valueType === "number" ? "any" : undefined}
              value={String(rule.value ?? "")}
              onChange={(e) => onChange({ ...rule, value: e.target.value })}
              placeholder={opDef?.placeholder ?? ""}
              disabled={readOnly}
              className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-900 placeholder-gray-300 focus:border-blue-400 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
            />
          </div>
        )}

        {/* Severity */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Severity</label>
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
        </div>
      </div>

      {/* Alert message */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Alert message</label>
        <input
          type="text"
          value={rule.message}
          onChange={(e) => onChange({ ...rule, message: e.target.value })}
          placeholder="Shown when this threshold is breached"
          disabled={readOnly}
          className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-900 placeholder-gray-300 focus:border-blue-400 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
        />
      </div>
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
}: PolicyFormProps) {
  const [name, setName] = useState(initialValues?.name ?? "");
  const [type, setType] = useState<PolicyType>(initialValues?.type ?? "compliance");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [rules, setRules] = useState<PolicyRule[] | RuntimePolicyRule[]>(initialValues?.rules ?? []);
  const isRuntime = type === "runtime";
  const [errors, setErrors] = useState<Record<string, string>>({});

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
      {/* ── Name ──────────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white px-6 py-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Policy Details</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Policy name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setSimDirty(true); }}
            placeholder="e.g. PII Data Handling Policy"
            disabled={readOnly}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-300 focus:border-blue-400 focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
          />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Type <span className="text-red-500">*</span>
          </label>
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
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Description
            <span className="ml-1 text-xs font-normal text-gray-400">(optional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what this policy enforces and why it exists"
            rows={3}
            disabled={readOnly}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-300 focus:border-blue-400 focus:outline-none resize-none disabled:bg-gray-50 disabled:text-gray-400"
          />
        </div>
      </div>

      {/* ── Rules ─────────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white px-6 py-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              Rules
              <span className="ml-2 text-xs font-normal text-gray-400">
                ({rules.length} rule{rules.length === 1 ? "" : "s"})
              </span>
            </h2>
            <p className="mt-0.5 text-xs text-gray-400">
              {isRuntime
                ? "Each rule defines a telemetry threshold. Breaches fire alerts and may auto-suspend the agent (H2-1.4)."
                : "Each rule asserts a condition against an ABP field. Violations block deployment when severity is error."}
            </p>
          </div>
          {!readOnly && (
            <button
              type="button"
              onClick={addRule}
              className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
            >
              + Add Rule
            </button>
          )}
        </div>

        {rules.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-200 py-8 text-center">
            <p className="text-sm text-gray-400">
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
                    <p className="text-xs text-red-600">{errors[`rule_${i}_field`]}</p>
                  )}
                  {errors[`rule_${i}_value`] && (
                    <p className="text-xs text-red-600">{errors[`rule_${i}_value`]}</p>
                  )}
                  {errors[`rule_${i}_message`] && (
                    <p className="text-xs text-red-600">{errors[`rule_${i}_message`]}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Runtime Policy Note ───────────────────────────────────────────────── */}
      {!readOnly && isRuntime && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-6 py-4">
          <p className="text-sm font-semibold text-blue-800 mb-1">Runtime Policy</p>
          <p className="text-xs text-blue-700">
            This policy evaluates against live telemetry — it cannot be previewed against stored blueprints.
            Rules are checked every 15 minutes via the alert-check cron job. Breaches create in-app notifications
            and fire webhook events. Auto-suspension (H2-1.4) will be added in the next sprint.
          </p>
        </div>
      )}

      {/* ── Impact Simulation ─────────────────────────────────────────────────── */}
      {!readOnly && !isRuntime && (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Impact Preview</h2>
              <p className="mt-0.5 text-xs text-gray-400">
                See how this policy would affect approved and deployed blueprints before saving.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSimulate}
              disabled={simulating || rules.length === 0}
              className="rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-sm font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50 transition-colors"
            >
              {simulating ? "Analyzing…" : "Preview Impact"}
            </button>
          </div>

          {simDirty && simResult && (
            <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              ⚠ Simulation may be outdated — policy has changed since last preview.
            </div>
          )}

          {simError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
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
                    color: "bg-gray-50 border-gray-200 text-gray-700",
                  },
                  {
                    label: "New violations",
                    value: simResult.summary.newViolations,
                    color:
                      simResult.summary.newViolations > 0
                        ? "bg-red-50 border-red-200 text-red-700"
                        : "bg-gray-50 border-gray-200 text-gray-700",
                  },
                  {
                    label: "Resolved",
                    value: simResult.summary.resolvedViolations,
                    color:
                      simResult.summary.resolvedViolations > 0
                        ? "bg-green-50 border-green-200 text-green-700"
                        : "bg-gray-50 border-gray-200 text-gray-700",
                  },
                  {
                    label: "Unaffected",
                    value: simResult.summary.noChange,
                    color: "bg-gray-50 border-gray-200 text-gray-700",
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
                            ? "border-red-200 bg-red-50"
                            : "border-green-200 bg-green-50"
                        }`}
                      >
                        <Link
                          href={`/registry/${bp.agentId}`}
                          className="font-medium text-gray-900 hover:underline truncate"
                        >
                          {bp.agentName}
                        </Link>
                        <span
                          className={`shrink-0 ml-3 text-xs font-medium ${
                            bp.status === "new_violations"
                              ? "text-red-700"
                              : "text-green-700"
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
                  <p className="text-xs text-gray-500 text-center py-2">
                    ✓ No deployed blueprints would be affected by this policy.
                  </p>
                )}
            </div>
          )}

          {!simResult && !simError && !simulating && (
            <p className="text-xs text-gray-400 py-2">
              Click &quot;Preview Impact&quot; to check how this policy would affect your{" "}
              approved and deployed blueprints.
            </p>
          )}
        </div>
      )}

      {/* ── Submit ────────────────────────────────────────────────────────────── */}
      {!readOnly && (
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
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
