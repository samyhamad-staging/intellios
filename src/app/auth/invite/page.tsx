"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

type InviteStatus = "loading" | "valid" | "invalid" | "success" | "error";

function InvitePage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [status, setStatus] = useState<InviteStatus>("loading");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("");

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }

    fetch(`/api/auth/invite/validate?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (!res.ok) {
          setStatus("invalid");
          return;
        }
        const data = await res.json();
        setInviteEmail(data.email);
        setInviteRole(data.role);
        setStatus("valid");
      })
      .catch(() => setStatus("invalid"));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (password !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setFormError(data.message ?? "Failed to create account. Please try again.");
        return;
      }

      setStatus("success");
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const roleLabel = inviteRole.replace(/_/g, " ");

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Intellios</h1>
          <p className="mt-1 text-sm text-gray-500">Enterprise Agent Factory</p>
        </div>

        {/* Card */}
        <div className="rounded-card border border-gray-200 bg-white p-8 shadow-sm">
          {status === "loading" && (
            <p className="text-center text-sm text-gray-500">Verifying invitation…</p>
          )}

          {status === "invalid" && (
            <div className="text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 mx-auto">
                <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="mb-2 text-lg font-semibold text-gray-900">Invitation invalid</h2>
              <p className="text-sm text-gray-500">
                This invitation has expired or has already been used. Please ask your administrator to send a new invitation.
              </p>
              <a
                href="/login"
                className="mt-6 inline-block text-sm text-gray-500 hover:text-gray-700 underline-offset-2 hover:underline"
              >
                ← Back to sign in
              </a>
            </div>
          )}

          {status === "success" && (
            <div className="text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-50 mx-auto">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="mb-2 text-lg font-semibold text-gray-900">Account created!</h2>
              <p className="mb-6 text-sm text-gray-500">
                Your account has been set up. You can now sign in.
              </p>
              <a
                href="/login"
                className="inline-block w-full rounded-lg bg-gray-900 py-2 text-center text-sm font-medium text-white hover:bg-gray-800"
              >
                Sign in →
              </a>
            </div>
          )}

          {status === "valid" && (
            <>
              <div className="mb-6">
                <h2 className="mb-1 text-lg font-semibold text-gray-900">You&apos;ve been invited</h2>
                <p className="text-sm text-gray-500">
                  Join Intellios as <span className="font-medium text-gray-700">{roleLabel}</span>
                  {inviteEmail && (
                    <>
                      {" "}using <span className="font-medium text-gray-700">{inviteEmail}</span>
                    </>
                  )}
                  . Set your name and password to get started.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email-display" className="mb-1 block text-sm font-medium text-gray-700">
                    Email address
                  </label>
                  <input
                    id="email-display"
                    type="email"
                    value={inviteEmail}
                    readOnly
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500"
                  />
                </div>

                <div>
                  <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">
                    Full name
                  </label>
                  <input
                    id="name"
                    type="text"
                    autoComplete="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                    placeholder="Minimum 8 characters"
                  />
                </div>

                <div>
                  <label htmlFor="confirm-password" className="mb-1 block text-sm font-medium text-gray-700">
                    Confirm password
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                    placeholder="Re-enter your password"
                  />
                </div>

                {formError && (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-lg bg-gray-900 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  {submitting ? "Creating account…" : "Create account"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InvitePageWrapper() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    }>
      <InvitePage />
    </Suspense>
  );
}
