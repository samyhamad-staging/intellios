"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { Sparkles } from "lucide-react";

interface IntakeQuickStartProps {
  sessionId: string;
  onComplete: (context: Record<string, unknown>) => void;
  onSwitchToForm: () => void;
}

const STARTER_IDEAS = [
  {
    label: "Customer support agent",
    purpose:
      "A customer-facing support agent that handles inquiries, resolves common issues, and escalates complex cases to human agents. Integrates with our CRM and knowledge base.",
  },
  {
    label: "Internal knowledge assistant",
    purpose:
      "An internal assistant that helps employees find information across our company wiki, policy documents, and internal APIs. Handles confidential company data.",
  },
  {
    label: "Data analysis agent",
    purpose:
      "An automated data analysis agent that connects to our databases, runs reports, and generates insights for business stakeholders. Processes internal financial data.",
  },
  {
    label: "Compliance monitoring agent",
    purpose:
      "An agent that monitors transactions and activities for regulatory compliance, flags potential violations, and generates compliance reports for auditors.",
  },
];

export function IntakeQuickStart({
  sessionId,
  onComplete,
  onSwitchToForm,
}: IntakeQuickStartProps) {
  const [purpose, setPurpose] = useState("");
  const [inferring, setInferring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function handleStart() {
    const trimmed = purpose.trim();
    if (trimmed.length < 10 || inferring) return;

    setInferring(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/intake/sessions/${sessionId}/quick-start`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ purpose: trimmed }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          (data as { message?: string }).message ?? "Failed to start session"
        );
      }

      const { context } = await res.json();
      onComplete(context);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong"
      );
      setInferring(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleStart();
    }
  }

  function handleInput() {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
    }
  }

  function handleStarterClick(starterPurpose: string) {
    setPurpose(starterPurpose);
    setTimeout(() => {
      const el = textareaRef.current;
      if (el) {
        el.style.height = "auto";
        el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
        el.focus();
      }
    }, 0);
  }

  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="w-full max-w-xl space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-violet-100">
            <Sparkles size={18} className="text-violet-600" />
          </div>
          <h1 className="text-xl font-semibold text-text">
            What agent do you want to build?
          </h1>
          <p className="mt-1.5 text-sm text-text-secondary">
            Describe your idea and Intellios will set up the right design
            context automatically.
          </p>
        </div>

        {/* Purpose textarea */}
        <div>
          <textarea
            ref={textareaRef}
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            placeholder="e.g. A customer support agent that handles billing inquiries, processes refunds, and escalates complex issues. It will access our CRM and billing systems, and needs to comply with GDPR since it handles EU customer data."
            disabled={inferring}
            rows={3}
            className="w-full resize-none rounded-xl border border-border px-4 py-3 text-sm leading-relaxed placeholder-text-tertiary outline-none transition-colors focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:opacity-50"
          />
          <div className="mt-1.5 flex items-center justify-between">
            <p className="text-xs text-text-tertiary">
              {purpose.trim().length < 10
                ? `${10 - purpose.trim().length} more characters needed`
                : "⌘ Enter to start"}
            </p>
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>
        </div>

        {/* Start button */}
        <button
          onClick={handleStart}
          disabled={purpose.trim().length < 10 || inferring}
          className="w-full rounded-xl bg-violet-600 py-3 text-sm font-medium text-white transition-colors hover:bg-violet-700 disabled:opacity-40"
        >
          {inferring ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Understanding your requirements…
            </span>
          ) : (
            "Start Designing"
          )}
        </button>

        {/* Starter ideas */}
        {!purpose && (
          <div>
            <p className="mb-2 text-center text-xs font-medium uppercase tracking-wider text-text-tertiary">
              Or start with a template idea
            </p>
            <div className="grid grid-cols-2 gap-2">
              {STARTER_IDEAS.map((idea) => (
                <button
                  key={idea.label}
                  onClick={() => handleStarterClick(idea.purpose)}
                  className="rounded-lg border border-border bg-surface px-3 py-2.5 text-left text-xs text-text-secondary transition-colors hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
                >
                  {idea.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Manual form fallback */}
        <p className="text-center">
          <button
            onClick={onSwitchToForm}
            className="text-xs text-text-tertiary underline hover:text-text-secondary transition-colors"
          >
            Set context manually instead →
          </button>
        </p>
      </div>
    </div>
  );
}
