"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { FormField } from "@/components/ui/form-field";
import { Heading, Subheading } from "@/components/catalyst/heading";

type InviteStatus = "loading" | "valid" | "invalid" | "success" | "error";

function InvitePage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [status, setStatus] = useState<InviteStatus>("loading");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("");
  const [inviterName, setInviterName] = useState("");
  const [enterpriseName, setEnterpriseName] = useState("");

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
        setInviterName(data.inviterName ?? "");
        setEnterpriseName(data.enterpriseName ?? "");
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
        setFormError(data.error ?? "Failed to create account. Please try again.");
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
    <div className="flex min-h-screen items-center justify-center bg-surface-raised">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-6 text-center">
          <Heading level={1} className="tracking-tight">Intellios</Heading>
          <p className="mt-1 text-sm text-text-secondary">Enterprise Agent Factory</p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-border bg-surface p-8 shadow-sm">
          {status === "loading" && (
            <p className="text-center text-sm text-text-secondary">Verifying invitation…</p>
          )}

          {status === "invalid" && (
            <div className="text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/30 mx-auto">
                <svg className="h-6 w-6 text-red-500 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <Subheading level={2} className="mb-2">Invitation invalid</Subheading>
              <p className="text-sm text-text-secondary">
                This invitation has expired or has already been used. Please ask your administrator to send a new invitation.
              </p>
              <a
                href="/login"
                className="mt-6 inline-block text-sm text-text-secondary hover:text-text underline-offset-2 hover:underline"
              >
                ← Back to sign in
              </a>
            </div>
          )}

          {status === "success" && (
            <div className="text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-50 dark:bg-emerald-950/30 mx-auto">
                <svg className="h-6 w-6 text-green-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <Subheading level={2} className="mb-2">Account created!</Subheading>
              <p className="mb-6 text-sm text-text-secondary">
                Your account has been set up. You can now sign in.
              </p>
              <a
                href="/login"
                className="inline-block w-full rounded-lg bg-text py-2 text-center text-sm font-medium text-white hover:bg-text-secondary"
              >
                Sign in →
              </a>
            </div>
          )}

          {status === "valid" && (
            <>
              {/* P2-91: Trust banner — inviter name + enterprise name */}
              {(inviterName || enterpriseName) && (
                <div className="mb-5 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-800 px-4 py-3">
                  <p className="text-sm text-indigo-800">
                    {inviterName && enterpriseName ? (
                      <>
                        <span className="font-semibold">{inviterName}</span>
                        {" at "}
                        <span className="font-semibold">{enterpriseName}</span>
                        {" has invited you to Intellios."}
                      </>
                    ) : inviterName ? (
                      <>
                        <span className="font-semibold">{inviterName}</span>
                        {" has invited you to Intellios."}
                      </>
                    ) : (
                      <>
                        <span className="font-semibold">{enterpriseName}</span>
                        {" has invited you to Intellios."}
                      </>
                    )}
                  </p>
                </div>
              )}
              <div className="mb-6">
                <Subheading level={2} className="mb-1">You&apos;ve been invited</Subheading>
                <p className="text-sm text-text-secondary">
                  Join Intellios as <span className="font-medium text-text">{roleLabel}</span>
                  {inviteEmail && (
                    <>
                      {" "}using <span className="font-medium text-text">{inviteEmail}</span>
                    </>
                  )}
                  . Set your name and password to get started.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <FormField label="Email address" htmlFor="email-display">
                  <input
                    id="email-display"
                    type="email"
                    value={inviteEmail}
                    readOnly
                    className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-text-secondary"
                  />
                </FormField>

                <FormField label="Full name" htmlFor="name">
                  <input
                    id="name"
                    type="text"
                    autoComplete="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-text focus:outline-none focus:ring-1 focus:ring-text"
                    placeholder="Your name"
                  />
                </FormField>

                <FormField label="Password" htmlFor="password">
                  <input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-text focus:outline-none focus:ring-1 focus:ring-text"
                    placeholder="Minimum 8 characters"
                  />
                </FormField>

                <FormField label="Confirm password" htmlFor="confirm-password">
                  <input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-text focus:outline-none focus:ring-1 focus:ring-text"
                    placeholder="Re-enter your password"
                  />
                </FormField>

                {formError && (
                  <p className="rounded-lg bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm text-red-700 dark:text-red-300">{formError}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-lg bg-text py-2 text-sm font-medium text-white hover:bg-text-secondary disabled:opacity-50"
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
      <div className="flex min-h-screen items-center justify-center bg-surface-raised">
        <p className="text-sm text-text-secondary">Loading…</p>
      </div>
    }>
      <InvitePage />
    </Suspense>
  );
}
