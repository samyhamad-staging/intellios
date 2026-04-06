"use client";

/**
 * Inline ABP Field Editor — Phase 2
 *
 * Enables architects to edit individual ABP fields directly in the Blueprint
 * Studio by clicking on them. Fields transition from read-only to editable
 * on click, with save/cancel controls. Saves are persisted via PATCH API.
 *
 * Supported field types:
 *   - text: single-line string
 *   - textarea: multi-line string
 *   - number: numeric input
 *   - boolean: toggle switch
 *   - select: dropdown from predefined options
 *   - tags: tag array editor
 *   - json: JSON editor with validation
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { Check, X, Pencil, Plus, Trash2 } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type FieldType = "text" | "textarea" | "number" | "boolean" | "select" | "tags" | "json";

interface InlineFieldEditorProps {
  /** Dot-separated path into the ABP, e.g. "identity.name" */
  fieldPath: string;
  /** Current value to display */
  value: unknown;
  /** Field type determines the editor UI */
  fieldType: FieldType;
  /** Display label */
  label: string;
  /** Optional placeholder text */
  placeholder?: string;
  /** Options for select type */
  options?: { value: string; label: string }[];
  /** Whether the field is required */
  required?: boolean;
  /** Whether editing is disabled (e.g. non-draft blueprints) */
  disabled?: boolean;
  /** Called when the field is saved — should PATCH the ABP */
  onSave: (fieldPath: string, value: unknown) => Promise<void>;
  /** Optional custom display renderer */
  renderDisplay?: (value: unknown) => React.ReactNode;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function InlineFieldEditor({
  fieldPath,
  value,
  fieldType,
  label,
  placeholder,
  options,
  required,
  disabled,
  onSave,
  renderDisplay,
}: InlineFieldEditorProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<unknown>(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null);

  // Sync draft when value changes externally
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  // Auto-focus when entering edit mode
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      if ("select" in inputRef.current && fieldType === "text") {
        (inputRef.current as HTMLInputElement).select();
      }
    }
  }, [editing, fieldType]);

  const startEditing = () => {
    if (disabled) return;
    setEditing(true);
    setDraft(value);
    setError(null);
  };

  const cancel = () => {
    setEditing(false);
    setDraft(value);
    setError(null);
  };

  const save = useCallback(async () => {
    if (required && (draft === "" || draft === null || draft === undefined)) {
      setError("This field is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(fieldPath, draft);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [fieldPath, draft, required, onSave]);

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") cancel();
    if (e.key === "Enter" && !e.shiftKey && fieldType !== "textarea" && fieldType !== "json") {
      e.preventDefault();
      save();
    }
  };

  // ── Display mode ─────────────────────────────────────────────────────────
  if (!editing) {
    return (
      <div
        className={`group relative ${disabled ? "" : "cursor-pointer"}`}
        onClick={startEditing}
        role={disabled ? undefined : "button"}
        tabIndex={disabled ? undefined : 0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") startEditing();
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {renderDisplay ? (
              renderDisplay(value)
            ) : (
              <DisplayValue value={value} fieldType={fieldType} placeholder={placeholder} options={options} />
            )}
          </div>
          {!disabled && (
            <span className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5">
              <Pencil size={11} className="text-violet-400" />
            </span>
          )}
        </div>
      </div>
    );
  }

  // ── Edit mode ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-1.5" onKeyDown={handleKeyDown}>
      {/* Editor */}
      {fieldType === "text" && (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="text"
          value={(draft as string) ?? ""}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-md border border-violet-300 bg-white px-2.5 py-1.5 text-sm text-text focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/20"
          disabled={saving}
        />
      )}

      {fieldType === "textarea" && (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={(draft as string) ?? ""}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          rows={4}
          className="w-full rounded-md border border-violet-300 bg-white px-2.5 py-1.5 text-sm text-text font-mono leading-relaxed focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/20 resize-y"
          disabled={saving}
        />
      )}

      {fieldType === "number" && (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="number"
          value={(draft as number) ?? ""}
          onChange={(e) => setDraft(e.target.value ? Number(e.target.value) : null)}
          placeholder={placeholder}
          className="w-full rounded-md border border-violet-300 bg-white px-2.5 py-1.5 text-sm text-text focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/20"
          disabled={saving}
        />
      )}

      {fieldType === "boolean" && (
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={(draft as boolean) ?? false}
            onChange={(e) => setDraft(e.target.checked)}
            className="rounded border-border text-violet-600 focus:ring-violet-500/20"
            disabled={saving}
          />
          <span className="text-sm text-text">{(draft as boolean) ? "Enabled" : "Disabled"}</span>
        </label>
      )}

      {fieldType === "select" && options && (
        <select
          ref={inputRef as React.RefObject<HTMLSelectElement>}
          value={(draft as string) ?? ""}
          onChange={(e) => setDraft(e.target.value)}
          className="w-full rounded-md border border-violet-300 bg-white px-2.5 py-1.5 text-sm text-text focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/20"
          disabled={saving}
        >
          <option value="">Select…</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}

      {fieldType === "tags" && (
        <TagEditor
          tags={(draft as string[]) ?? []}
          onChange={(tags) => setDraft(tags)}
          disabled={saving}
        />
      )}

      {fieldType === "json" && (
        <JsonEditor
          value={draft}
          onChange={setDraft}
          disabled={saving}
        />
      )}

      {/* Action bar */}
      <div className="flex items-center gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-1 rounded-md bg-violet-600 px-2 py-1 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
        >
          <Check size={10} />
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          onClick={cancel}
          disabled={saving}
          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-text-secondary hover:bg-surface-raised disabled:opacity-50 transition-colors"
        >
          <X size={10} />
          Cancel
        </button>
        {error && (
          <span className="text-xs text-red-600">{error}</span>
        )}
      </div>
    </div>
  );
}

// ─── Display Value ───────────────────────────────────────────────────────────

function DisplayValue({
  value,
  fieldType,
  placeholder,
  options,
}: {
  value: unknown;
  fieldType: FieldType;
  placeholder?: string;
  options?: { value: string; label: string }[];
}) {
  if (value === null || value === undefined || value === "") {
    return (
      <span className="text-sm text-text-disabled italic">
        {placeholder ?? "Click to edit"}
      </span>
    );
  }

  switch (fieldType) {
    case "text":
      return <span className="text-sm text-text">{value as string}</span>;

    case "textarea":
      return (
        <p className="whitespace-pre-wrap text-sm text-text font-mono leading-relaxed">
          {value as string}
        </p>
      );

    case "number":
      return <span className="text-sm text-text">{(value as number).toLocaleString()}</span>;

    case "boolean":
      return (
        <span className={`text-sm ${value ? "text-green-600" : "text-text-secondary"}`}>
          {value ? "Enabled" : "Disabled"}
        </span>
      );

    case "select":
      const opt = options?.find((o) => o.value === value);
      return <span className="text-sm text-text">{opt?.label ?? (value as string)}</span>;

    case "tags":
      const tags = value as string[];
      return tags.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {tags.map((tag, i) => (
            <span
              key={i}
              className="rounded-full bg-surface-muted px-2 py-0.5 text-xs text-text-secondary"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : (
        <span className="text-sm text-text-disabled italic">{placeholder ?? "No tags"}</span>
      );

    case "json":
      return (
        <pre className="rounded bg-surface border border-border p-2 text-xs text-text-secondary overflow-auto max-h-24">
          {JSON.stringify(value, null, 2)}
        </pre>
      );

    default:
      return <span className="text-sm text-text">{String(value)}</span>;
  }
}

// ─── Tag Editor ──────────────────────────────────────────────────────────────

function TagEditor({
  tags,
  onChange,
  disabled,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
}) {
  const [input, setInput] = useState("");

  const addTag = () => {
    const tag = input.trim();
    if (tag && !tags.includes(tag)) {
      onChange([...tags, tag]);
      setInput("");
    }
  };

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1">
        {tags.map((tag, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-700"
          >
            {tag}
            <button
              onClick={() => removeTag(i)}
              disabled={disabled}
              className="hover:text-red-500 transition-colors"
            >
              <X size={10} />
            </button>
          </span>
        ))}
      </div>
      <div className="flex items-center gap-1">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag();
            }
          }}
          placeholder="Add tag…"
          className="flex-1 rounded-md border border-violet-300 bg-white px-2 py-1 text-xs text-text placeholder-text-tertiary focus:border-violet-500 focus:outline-none"
          disabled={disabled}
        />
        <button
          onClick={addTag}
          disabled={disabled || !input.trim()}
          className="inline-flex items-center gap-0.5 rounded-md bg-violet-100 px-1.5 py-1 text-xs text-violet-700 hover:bg-violet-200 disabled:opacity-50 transition-colors"
        >
          <Plus size={10} />
        </button>
      </div>
    </div>
  );
}

// ─── JSON Editor ─────────────────────────────────────────────────────────────

function JsonEditor({
  value,
  onChange,
  disabled,
}: {
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}) {
  const [text, setText] = useState(() =>
    typeof value === "string" ? value : JSON.stringify(value, null, 2)
  );
  const [parseError, setParseError] = useState<string | null>(null);

  const handleChange = (newText: string) => {
    setText(newText);
    try {
      const parsed = JSON.parse(newText);
      onChange(parsed);
      setParseError(null);
    } catch (err) {
      setParseError("Invalid JSON");
    }
  };

  return (
    <div>
      <textarea
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        rows={6}
        className={`w-full rounded-md border bg-white px-2.5 py-1.5 text-xs font-mono text-text leading-relaxed focus:outline-none resize-y ${
          parseError
            ? "border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500/20"
            : "border-violet-300 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20"
        }`}
        disabled={disabled}
      />
      {parseError && (
        <p className="text-xs text-red-600 mt-0.5">{parseError}</p>
      )}
    </div>
  );
}

// ─── Editable Row Wrapper ────────────────────────────────────────────────────
// Convenience wrapper that combines a label with the InlineFieldEditor
// to match the existing Row pattern in BlueprintView.

export function EditableRow({
  label,
  fieldPath,
  value,
  fieldType,
  placeholder,
  options,
  required,
  disabled,
  onSave,
  renderDisplay,
}: {
  label: string;
} & Omit<InlineFieldEditorProps, "label">) {
  return (
    <div className="mb-3 last:mb-0">
      <dt className="mb-1 text-xs font-medium text-text-secondary">{label}</dt>
      <dd>
        <InlineFieldEditor
          fieldPath={fieldPath}
          value={value}
          fieldType={fieldType}
          label={label}
          placeholder={placeholder}
          options={options}
          required={required}
          disabled={disabled}
          onSave={onSave}
          renderDisplay={renderDisplay}
        />
      </dd>
    </div>
  );
}
