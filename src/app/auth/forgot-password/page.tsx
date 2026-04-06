"use client";

import { useState } from "react";
import { FormField } from "@/components/ui/form-field";
import { Subheading } from "@/components/catalyst/heading";
import { AuthShell } from "@/components/auth/auth-shell";

/**
 * UX-AUDIT P0-2: Redesigned to use shared AuthShell with dark gradient
 * glass-morphism design, matching login and register pages.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      // Always show success — API never reveals whether email exists
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      {/* ── Glass card ──────────────────────────────────────────── */}
      <div
        className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl"
        style={{
          boxShadow:
            "0 0 0 1px rgba(255,255,255,0.04), 0 24px 48px rgba(0,0,0,0.5)",
        }}
      >
        {submitted ? (
          <div className="text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 mx-auto">
              <svg
                className="h-6 w-6 text-emerald-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <Subheading level={2} className="mb-2 text-white">
              Check your inbox
            </Subheading>
            <p className="text-sm text-white/60">
              If an account with that email exists, a reset link has been sent.
              Check your inbox and spam folder.
            </p>
            <a
              href="/login"
              className="mt-6 inline-block text-sm text-indigo-400/80 hover:text-indigo-300 transition-colors"
            >
              &larr; Back to sign in
            </a>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <p className="mb-1 font-mono text-2xs uppercase tracking-widest text-indigo-400/50">
                Account Recovery
              </p>
              <Subheading level={2} className="text-white">
                Reset your password
              </Subheading>
              <p className="mt-2 text-sm text-white/50">
                Enter your email and we&apos;ll send you a reset link.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-4 [&_label]:text-white/80"
            >
              <FormField label="Email address" htmlFor="email">
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
                  placeholder="you@example.com"
                  aria-describedby={error ? "forgot-error" : undefined}
                />
              </FormField>

              {error && (
                <p
                  id="forgot-error"
                  role="alert"
                  className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg btn-primary py-2.5 text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && (
                  <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="opacity-25"
                    />
                    <path
                      d="M4 12a8 8 0 018-8"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      className="opacity-75"
                    />
                  </svg>
                )}
                {loading ? "Sending..." : "Send reset link"}
              </button>
            </form>

            <div className="mt-4 text-center">
              <a
                href="/login"
                className="text-xs text-white/50 hover:text-white/80 transition-colors"
              >
                &larr; Back to sign in
              </a>
            </div>
          </>
        )}
      </div>
    </AuthShell>
  );
}
