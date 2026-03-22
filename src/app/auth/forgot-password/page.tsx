"use client";

import { useState } from "react";

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
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Intellios</h1>
          <p className="mt-1 text-sm text-gray-500">Enterprise Agent Factory</p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          {submitted ? (
            <div className="text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-50 mx-auto">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="mb-2 text-lg font-semibold text-gray-900">Check your inbox</h2>
              <p className="text-sm text-gray-500">
                If an account with that email exists, a reset link has been sent. Check your inbox and spam folder.
              </p>
              <a
                href="/login"
                className="mt-6 inline-block text-sm text-gray-500 hover:text-gray-700 underline-offset-2 hover:underline"
              >
                ← Back to sign in
              </a>
            </div>
          ) : (
            <>
              <h2 className="mb-2 text-lg font-semibold text-gray-900">Reset your password</h2>
              <p className="mb-6 text-sm text-gray-500">
                Enter your email and we&apos;ll send you a reset link.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                    placeholder="you@example.com"
                  />
                </div>

                {error && (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-gray-900 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  {loading ? "Sending..." : "Send reset link"}
                </button>
              </form>

              <div className="mt-4 text-center">
                <a
                  href="/login"
                  className="text-xs text-gray-500 hover:text-gray-700 underline-offset-2 hover:underline"
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
