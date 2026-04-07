"use client";

import { useState } from "react";
import { ArrowRight, X, CheckCircle } from "lucide-react";
import { FormField } from "@/components/ui/form-field";

const ROLE_OPTIONS = [
  { value: "architect",        label: "AI / ML Engineer" },
  { value: "compliance",       label: "Compliance / Risk Officer" },
  { value: "product",          label: "Product Leader" },
  { value: "engineering_lead", label: "Engineering Leader" },
  { value: "it_ops",           label: "IT / Operations" },
  { value: "other",            label: "Other" },
];

interface RequestAccessModalProps {
  children: (open: () => void) => React.ReactNode;
}

/**
 * RequestAccessModal
 *
 * Renders a trigger (via render-prop children) and manages the modal lifecycle.
 * On submit, POSTs to /api/waitlist — zero DB schema required.
 * Usage:
 *   <RequestAccessModal>
 *     {(open) => <button onClick={open}>Request access</button>}
 *   </RequestAccessModal>
 */
export function RequestAccessModal({ children }: RequestAccessModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setEmail(""); setCompany(""); setRole(""); setMessage("");
    setSubmitting(false); setSubmitted(false); setError(null);
  };

  const open = () => { reset(); setIsOpen(true); };
  const close = () => { setIsOpen(false); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !company.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          company: company.trim(),
          role: role || null,
          message: message.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("Submission failed");
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again or email us directly.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {children(open)}

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 px-4 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) close(); }}
        >
          <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-8 shadow-2xl">
            {/* Close button */}
            <button
              onClick={close}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              aria-label="Close"
            >
              <X size={16} />
            </button>

            {submitted ? (
              /* ── Success state ── */
              <div className="flex flex-col items-center gap-4 py-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-500/15">
                  <CheckCircle size={32} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">You&apos;re on the list</h2>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    We review each request and typically reach out within one business day. Watch
                    your inbox at <span className="font-medium text-gray-700 dark:text-gray-200">{email}</span>.
                  </p>
                </div>
                <button
                  onClick={close}
                  className="mt-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              /* ── Form state ── */
              <>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Join the design partner program</h2>
                  <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
                    We&apos;re onboarding design partners from financial services, healthcare, and
                    regulated enterprise. Tell us about your use case and we&apos;ll be in touch.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Email */}
                  <FormField label="Work email" htmlFor="ra-email" required>
                    <input
                      id="ra-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-indigo-400 dark:focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-500/30 transition-colors"
                    />
                  </FormField>

                  {/* Company */}
                  <FormField label="Company" htmlFor="ra-company" required>
                    <input
                      id="ra-company"
                      type="text"
                      required
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="Acme Corp"
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-indigo-400 dark:focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-500/30 transition-colors"
                    />
                  </FormField>

                  {/* Role */}
                  <FormField label="Your role" htmlFor="ra-role">
                    <select
                      id="ra-role"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:border-indigo-400 dark:focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-500/30 transition-colors"
                    >
                      <option value="">Select…</option>
                      {ROLE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </FormField>

                  {/* Message */}
                  <FormField label="What are you looking to build?" htmlFor="ra-message">
                    <textarea
                      id="ra-message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={3}
                      placeholder="e.g. Automated underwriting agents with SR 11-7 compliance…"
                      className="w-full resize-none rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-indigo-400 dark:focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-500/30 transition-colors"
                    />
                  </FormField>

                  {error && (
                    <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting || !email.trim() || !company.trim()}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                  >
                    {submitting ? "Submitting…" : (
                      <>
                        Request access
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>

                  <p className="text-center text-xs text-gray-400 dark:text-gray-500">
                    Already have an account?{" "}
                    <a href="/login" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 underline">
                      Sign in →
                    </a>
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
