"use client";

import { useState, Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { FormField } from "@/components/ui/form-field";
import { Subheading } from "@/components/catalyst/heading";
import { AuthShell } from "@/components/auth/auth-shell";

/**
 * UX-AUDIT P0-2: Redesigned to use shared AuthShell with dark gradient
 * glass-morphism design, matching login and register pages.
 */
function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // P2-101: auto-redirect countdown after success
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!success) return;
    if (countdown <= 0) {
      router.push("/login");
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [success, countdown, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    if (!token) {
      setError("Invalid reset link. Please request a new one.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      if (res.ok) {
        setSuccess(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(
          (data as { error?: string }).error ??
            "This reset link has expired or has already been used."
        );
      }
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
        {/* P2-101: Rich password reset confirmation */}
        {success ? (
          <div className="text-center">
            {/* Animated success icon */}
            <div className="relative mb-5 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <svg
                  className="h-7 w-7 text-emerald-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              {/* Pulse ring */}
              <div
                className="absolute inset-0 mx-auto h-14 w-14 rounded-full border-2 border-emerald-400/30"
                style={{
                  animation: "ping 2s cubic-bezier(0,0,0.2,1) infinite",
                }}
              />
            </div>

            <Subheading level={2} className="mb-1 text-white">
              Password updated
            </Subheading>
            <p className="mb-5 text-sm text-white/70 leading-relaxed">
              Your password has been changed successfully. Your previous password
              is no longer valid.
            </p>

            {/* Security notice */}
            <div className="mb-5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-left">
              <p className="text-xs font-semibold text-emerald-400 mb-1">
                Security notice
              </p>
              <ul className="space-y-1">
                {[
                  "All previous sessions have been invalidated.",
                  "Update any saved passwords in your password manager.",
                  "Contact your admin if you didn\u2019t request this change.",
                ].map((tip) => (
                  <li
                    key={tip}
                    className="flex items-start gap-1.5 text-xs text-emerald-300"
                  >
                    <span className="mt-0.5 shrink-0">&middot;</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA + countdown */}
            <a
              href="/login"
              className="block w-full rounded-lg btn-primary py-2.5 text-sm font-medium text-center focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            >
              Sign in now &rarr;
            </a>
            <p className="mt-3 text-xs text-white/50">
              Redirecting automatically in {countdown}s&hellip;
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <p className="mb-1 font-mono text-2xs uppercase tracking-widest text-indigo-400/50">
                Account Recovery
              </p>
              <Subheading level={2} className="text-white">
                Set a new password
              </Subheading>
              <p className="mt-2 text-sm text-white/70">
                Choose a password with at least 8 characters.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-4 [&_label]:text-white/80"
            >
              <FormField label="New password" htmlFor="password">
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-indigo-500/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                  aria-describedby={error ? "reset-error" : undefined}
                />
              </FormField>

              <FormField label="Confirm password" htmlFor="confirm">
                <input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-indigo-500/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                />
              </FormField>

              {error && (
                <div>
                  <p
                    id="reset-error"
                    role="alert"
                    className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400"
                  >
                    {error}
                  </p>
                  {error.includes("expired") && (
                    <a
                      href="/auth/forgot-password"
                      className="mt-1 block text-xs text-indigo-400/80 hover:text-indigo-300 transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 rounded"
                    >
                      Request a new reset link &rarr;
                    </a>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !token}
                className="w-full rounded-lg btn-primary py-2.5 text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
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
                {loading ? "Updating..." : "Reset Password"}
              </button>
            </form>
          </>
        )}
      </div>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
