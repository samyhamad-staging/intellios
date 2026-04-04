"use client";

import { useState } from "react";
import { ArrowRightIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { CheckCircleIcon } from "@heroicons/react/24/solid";

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
          <div className="relative w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
            {/* Close button */}
            <button
              onClick={close}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              aria-label="Close"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>

            {submitted ? (
              /* ── Success state ── */
              <div className="flex flex-col items-center gap-4 py-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100">
                  <CheckCircleIcon className="h-8 w-8 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">You&apos;re on the list</h2>
                  <p className="mt-2 text-sm text-gray-500">
                    We review each request and typically reach out within one business day. Watch
                    your inbox at <span className="font-medium text-gray-700">{email}</span>.
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
                  <h2 className="text-xl font-semibold text-gray-900">Request early access</h2>
                  <p className="mt-1.5 text-sm text-gray-500">
                    We&apos;re onboarding design partners from financial services, healthcare, and
                    regulated enterprise. Tell us about your use case and we&apos;ll be in touch.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Email */}
                  <div>
                    <label htmlFor="ra-email" className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                      Work email <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="ra-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-colors"
                    />
                  </div>

                  {/* Company */}
                  <div>
                    <label htmlFor="ra-company" className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                      Company <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="ra-company"
                      type="text"
                      required
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="Acme Corp"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-colors"
                    />
                  </div>

                  {/* Role */}
                  <div>
                    <label htmlFor="ra-role" className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                      Your role
                    </label>
                    <select
                      id="ra-role"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-colors"
                    >
                      <option value="">Select…</option>
                      {ROLE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Message */}
                  <div>
                    <label htmlFor="ra-message" className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                      What are you looking to build?
                    </label>
                    <textarea
                      id="ra-message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={3}
                      placeholder="e.g. Automated underwriting agents with SR 11-7 compliance…"
                      className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-colors"
                    />
                  </div>

                  {error && (
                    <p className="text-xs text-red-600">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting || !email.trim() || !company.trim()}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                  >
                    {submitting ? "Submitting…" : (
                      <>
                        Request access
                        <ArrowRightIcon className="h-4 w-4" />
                      </>
                    )}
                  </button>

                  <p className="text-center text-xs text-gray-400">
                    Already have an account?{" "}
                    <a href="/login" className="text-indigo-600 hover:text-indigo-800 underline">
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
