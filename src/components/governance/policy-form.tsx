"use client";

import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

const POLICY_TYPES = [
  { value: "safety",         label: "Safety" },
  { value: "compliance",     label: "Compliance" },
  { value: "data_handling",  label: "Data Handling" },
  { value: "access_control", label: "Access Control" },
  { value: "audit",          label: "Audit" },
] as const;

type PolicyType = (typeof POLICY_TYPES)[number]["value"];

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
  rules: PolicyRule[];
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface PolicyFormProps {
  initialValues?: PolicyFormValues;
  onSubmit: (values: PolicyFormValues) => void;
  submitLabel?: string;
  saving?: boolean;
  readOnly?: boolean;
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
          <select
            value={rule.operator}
            onChange={(e) =>
              onChange({ ...rule, operator: e.target.value as Operator, value: "" })
            }
            disabled={readOnly}
            className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
          >
            {OPERATORS.map((op) => (
              <option key={op.value} value={op.value}>
                {op.label}
              </option>
            ))}
          </select>
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
          <select
            value={rule.severity}
            onChange={(e) =>
              onChange({ ...rule, severity: e.target.value as "error" | "warning" })
            }
            disabled={readOnly}
            className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
          >
            <option value="error">error — blocks finalization</option>
            <option value="warning">warning — informational</option>
          </select>
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

// ─── Main Form ────────────────────────────────────────────────────────────────

export default function PolicyForm({
  initialValues,
  onSubmit,
  submitLabel = "Save",
  saving = false,
  readOnly = false,
}: PolicyFormProps) {
  const [name, setName] = useState(initialValues?.name ?? "");
  const [type, setType] = useState<PolicyType>(initialValues?.type ?? "compliance");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [rules, setRules] = useState<PolicyRule[]>(initialValues?.rules ?? []);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Name is required";
    for (let i = 0; i < rules.length; i++) {
      const r = rules[i];
      if (!r.field.trim()) errs[`rule_${i}_field`] = "Field is required";
      if (!r.message.trim()) errs[`rule_${i}_message`] = "Message is required";
      if (operatorHasValue(r.operator) && !r.value?.trim()) {
        errs[`rule_${i}_value`] = "Value is required for this operator";
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (readOnly || !validate()) return;

    // Strip empty value fields for exists/not_exists
    const cleanedRules = rules.map((r) => {
      const { value, ...rest } = r;
      if (operatorHasValue(r.operator)) {
        return { ...rest, value: value ?? "" };
      }
      return rest;
    });

    onSubmit({
      name: name.trim(),
      type,
      description: description.trim(),
      rules: cleanedRules,
    });
  }

  function updateRule(index: number, updated: PolicyRule) {
    setRules((prev) => prev.map((r, i) => (i === index ? updated : r)));
  }

  function removeRule(index: number) {
    setRules((prev) => prev.filter((_, i) => i !== index));
  }

  function addRule() {
    setRules((prev) => [...prev, emptyRule()]);
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
            onChange={(e) => setName(e.target.value)}
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
          <select
            value={type}
            onChange={(e) => setType(e.target.value as PolicyType)}
            disabled={readOnly}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
          >
            {POLICY_TYPES.map((pt) => (
              <option key={pt.value} value={pt.value}>
                {pt.label}
              </option>
            ))}
          </select>
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
              Each rule asserts a condition against an ABP field. Violations block deployment when
              severity is error.
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
              <RuleRow
                rule={rule}
                index={i}
                onChange={(updated) => updateRule(i, updated)}
                onRemove={() => removeRule(i)}
                readOnly={readOnly}
              />
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
