"use client";

import { useState } from "react";
import { FormField } from "@/components/ui/form-field";
import { Heading, Subheading } from "@/components/catalyst/heading";

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
    <div className="flex min-h-screen items-center justify-center bg-surface-raised">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-6 text-center">
          <Heading level={1} className="tracking-tight text-text">Intellios</Heading>
          <p className="mt-1 text-sm text-text-secondary">Enterprise Agent Factory</p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-border bg-surface p-8 shadow-sm">
          {submitted ? (
            <div className="text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-50 mx-auto">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <Subheading level={2} className="mb-2 text-text">Check your inbox</Subheading>
              <p className="text-sm text-text-secondary">
                If an account with that email exists, a reset link has been sent. Check your inbox and spam folder.
              </p>
              <a
                href="/login"
                className="mt-6 inline-block text-sm text-text-secondary hover:text-text underline-offset-2 hover:underline"
              >
                ← Back to sign in
              </a>
            </div>
          ) : (
            <>
              <Subheading level={2} className="mb-2 text-text">Reset your password</Subheading>
              <p className="mb-6 text-sm text-text-secondary">
                Enter your email and we&apos;ll send you a reset link.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <FormField label="Email address" htmlFor="email">
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-text focus:outline-none focus:ring-1 focus:ring-text"
                    placeholder="you@example.com"
                  />
                </FormField>

                {error && (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-text py-2 text-sm font-medium text-white hover:bg-text-secondary disabled:opacity-50"
                >
                  {loading ? "Sending..." : "Send reset link"}
                </button>
              </form>

              <div className="mt-4 text-center">
                <a
                  href="/login"
                  className="text-xs text-text-secondary hover:text-text underline-offset-2 hover:underline"
                >
                  ← Back to sign in
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
