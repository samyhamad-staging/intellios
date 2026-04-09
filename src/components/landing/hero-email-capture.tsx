"use client";

/**
 * HeroEmailCapture — Two-step inline form for the landing page hero (P1-4)
 *
 * Step 1: email + "Continue" button — lowers the commitment barrier.
 * Step 2: progressive disclosure reveals company, role, use-case textarea,
 *         and the final submit — all inline, no page navigation or overlay.
 *
 * Posts to /api/waitlist on final submit. The route already accepts the
 * full payload; no backend changes required.
 */

import { useState, useEffect, useRef } from "react";
import { ArrowRight, CheckCircle, ChevronRight } from "lucide-react";

const ROLE_OPTIONS = [
  { value: "compliance",       label: "Compliance / Risk Officer" },
  { value: "architect",        label: "AI / ML Engineer" },
  { value: "engineering_lead", label: "Engineering Leader" },
  { value: "product",          label: "Product Leader" },
  { value: "it_ops",           label: "IT / Operations" },
  { value: "other",            label: "Other" },
];

type Step = "email" | "details" | "submitted";

const INPUT_BASE =
  "w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-indigo-400 dark:focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-500/30 transition-colors";

export function HeroEmailCapture() {
  const [step, setStep]       = useState<Step>("email");
  const [email, setEmail]     = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole]       = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const companyRef = useRef<HTMLInputElement>(null);

  // Focus company field as soon as the details panel appears
  useEffect(() => {
    if (step === "details") companyRef.current?.focus();
  }, [step]);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStep("details");
  };

  const handleFullSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !company.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email:   email.trim(),
          company: company.trim(),
          role:    role || null,
          message: message.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("Submission failed");
      setStep("submitted");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Submitted ───────────────────────────────────────────────────────────
  if (step === "submitted") {
    return (
      <div className="flex flex-col items-center gap-3 py-2 text-center" style={{ animation: "fade-slide-up 0.3s ease-out" }}>
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-500/15">
          <CheckCircle size={24} className="text-indigo-600 dark:text-indigo-400" />
        </div>
        <p className="text-sm font-semibold text-gray-900 dark:text-white">
          You&apos;re on the list
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs">
          We review each request and typically reach out within one business day.
          Watch your inbox at{" "}
          <span className="font-medium text-gray-700 dark:text-gray-200">{email}</span>.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md text-left">

      {/* ── Step 1: email row ─────────────────────────────────────────── */}
      <form onSubmit={handleEmailSubmit} className="flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={step === "details"}
          placeholder="Work email"
          aria-label="Work email address"
          className="min-w-0 flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-indigo-400 dark:focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-500/30 disabled:cursor-default disabled:bg-gray-50 dark:disabled:bg-slate-800/60 disabled:text-gray-500 transition-colors"
        />
        {step === "email" ? (
          <button
            type="submit"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors"
          >
            Continue <ChevronRight size={14} />
          </button>
        ) : (
          /* Confirmed pill — replaces button after email is locked in */
          <div className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 px-4 py-3 text-sm font-semibold text-indigo-600 dark:text-indigo-400">
            <CheckCircle size={14} /> Confirmed
          </div>
        )}
      </form>

      {/* ── Step 2: progressive disclosure ───────────────────────────── */}
      {step === "details" && (
        <div
          className="mt-3 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800/80 p-5 shadow-sm"
          style={{ animation: "slide-down 0.25s ease-out" }}
        >
          <form onSubmit={handleFullSubmit} className="space-y-3">
            <input
              ref={companyRef}
              type="text"
              required
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Company name"
              aria-label="Company name"
              className={INPUT_BASE}
            />

            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              aria-label="Your role"
              className={INPUT_BASE}
            >
              <option value="">Your role…</option>
              {ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              placeholder="What are you looking to govern? (optional)"
              aria-label="What are you looking to govern"
              className={`${INPUT_BASE} resize-none`}
            />

            {error && (
              <p role="alert" className="text-xs text-red-600 dark:text-red-400">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || !company.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors"
            >
              {submitting ? "Submitting…" : (
                <>Apply for Design Partnership <ArrowRight size={14} /></>
              )}
            </button>

            <p className="text-center text-xs text-gray-400 dark:text-gray-500">
              We respond within one business day. No commitment required.
            </p>
          </form>
        </div>
      )}
    </div>
  );
}
