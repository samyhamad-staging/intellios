"use client";

import { useState, useRef, useCallback, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, X } from "lucide-react";

// ── Starter ideas ─────────────────────────────────────────────────────────────

const STARTER_IDEAS = [
  { label: "Customer support agent",    purpose: "A customer-facing support agent that handles inquiries, resolves common issues, and escalates complex cases to human agents. Integrates with our CRM and knowledge base." },
  { label: "Internal knowledge base",   purpose: "An internal assistant that helps employees find information across our company wiki, policy documents, and internal APIs. Handles confidential company data." },
  { label: "Data analysis & reporting", purpose: "An automated data analysis agent that connects to our databases, runs reports, and generates insights for business stakeholders. Processes internal financial data." },
  { label: "Compliance monitoring",     purpose: "An agent that monitors transactions and activities for regulatory compliance, flags potential violations, and generates compliance reports for auditors." },
] as const;

// ── Props ─────────────────────────────────────────────────────────────────────

interface QuickStartModalProps {
  onClose: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function QuickStartModal({ onClose }: QuickStartModalProps) {
  const router = useRouter();
  const [purpose, setPurpose] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const purposeTrimmed = purpose.trim();
  const canSubmit = purposeTrimmed.length >= 10 && !creating;

  // ── Handlers ───────────────────────────────────────────────────────────────

  async function handleStart() {
    if (!canSubmit) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/intake/sessions", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { message?: string }).message ?? `HTTP ${res.status}`);
      }
      const session = await res.json();
      // Navigate into the session — the purpose will be the first message
      router.push(`/intake/${session.id}?purpose=${encodeURIComponent(purposeTrimmed)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start a session.");
      setCreating(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleStart();
    }
    if (e.key === "Escape") onClose();
  }

  function handleInput() {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
    }
  }

  const handleStarterClick = useCallback((starterPurpose: string) => {
    setPurpose(starterPurpose);
    setTimeout(() => {
      const el = textareaRef.current;
      if (el) {
        el.style.height = "auto";
        el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
        el.focus();
      }
    }, 0);
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-surface shadow-2xl">

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-text-tertiary hover:bg-surface-muted hover:text-text transition-colors"
          aria-label="Close"
        >
          <X size={15} />
        </button>

        <div className="p-7">
          {/* Header */}
          <div className="mb-5 flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Sparkles size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-text">What agent do you want to build?</h2>
              <p className="mt-0.5 text-xs text-text-secondary">
                Describe your idea — Intellios will set up the right design context automatically.
              </p>
            </div>
          </div>

          {/* Purpose textarea */}
          <textarea
            ref={textareaRef}
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            placeholder="e.g. A customer support agent that handles billing inquiries, processes refunds, and escalates complex issues. It will access our CRM and billing systems, and needs to comply with GDPR since it handles EU customer data."
            disabled={creating}
            rows={3}
            autoFocus
            className="w-full resize-none rounded-xl border border-border bg-surface px-4 py-3 text-sm leading-relaxed text-text placeholder-text-tertiary outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:opacity-50"
          />

          {/* Character hint + error */}
          <div className="mt-1.5 flex items-center justify-between">
            <p className="text-[11px] text-text-tertiary">
              {purposeTrimmed.length < 10
                ? `${10 - purposeTrimmed.length} more characters needed`
                : "⌘ Enter to start"}
            </p>
            {error && <p className="text-[11px] text-red-600">{error}</p>}
          </div>

          {/* Starter ideas */}
          {!purpose && (
            <div className="mt-4">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
                Or start with a template
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {STARTER_IDEAS.map((idea) => (
                  <button
                    key={idea.label}
                    onClick={() => handleStarterClick(idea.purpose)}
                    className="rounded-lg border border-border bg-surface px-3 py-2 text-left text-xs text-text-secondary transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                  >
                    {idea.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleStart}
            disabled={!canSubmit}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {creating ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Setting up your session…
              </>
            ) : (
              "Start Designing"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
