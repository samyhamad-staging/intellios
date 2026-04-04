"use client";

import { useState, Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

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
    if (countdown <= 0) { router.push("/login"); return; }
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
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Intellios</h1>
          <p className="mt-1 text-sm text-gray-500">Enterprise Agent Factory</p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          {/* P2-101: Rich password reset confirmation */}
          {success ? (
            <div className="text-center">
              {/* Animated success icon */}
              <div className="relative mb-5 flex justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
                  <svg className="h-7 w-7 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                {/* Pulse ring */}
                <div
                  className="absolute inset-0 mx-auto h-14 w-14 rounded-full border-2 border-green-300/60"
                  style={{ animation: "ping 2s cubic-bezier(0,0,0.2,1) infinite" }}
                />
              </div>

              <h2 className="mb-1 text-lg font-semibold text-gray-900">Password updated</h2>
              <p className="mb-5 text-sm text-gray-500 leading-relaxed">
                Your password has been changed successfully. Your previous password is no longer valid.
              </p>

              {/* Security notice */}
              <div className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-left">
                <p className="text-xs font-semibold text-green-800 mb-1">Security notice</p>
                <ul className="space-y-1">
                  {[
                    "All previous sessions have been invalidated.",
                    "Update any saved passwords in your password manager.",
                    "Contact your admin if you didn't request this change.",
                  ].map((tip) => (
                    <li key={tip} className="flex items-start gap-1.5 text-xs text-green-700">
                      <span className="mt-0.5 shrink-0">·</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA + countdown */}
              <a
                href="/login"
                className="block w-full rounded-lg bg-gray-900 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
              >
                Sign in now →
              </a>
              <p className="mt-3 text-xs text-gray-400">
                Redirecting automatically in {countdown}s…
              </p>
            </div>
          ) : (
            <>
              <h2 className="mb-2 text-lg font-semibold text-gray-900">Set a new password</h2>
              <p className="mb-6 text-sm text-gray-500">
                Choose a password with at least 8 characters.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="password"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    New password
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
                  />
                </div>

                <div>
                  <label
                    htmlFor="confirm"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Confirm password
                  </label>
                  <input
                    id="confirm"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                  />
                </div>

                {error && (
                  <div>
                    <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
                    {error.includes("expired") && (
                      <a
                        href="/auth/forgot-password"
                        className="mt-1 block text-xs text-gray-500 hover:text-gray-700 underline-offset-2 hover:underline"
                      >
                        Request a new reset link →
                      </a>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !token}
                  className="w-full rounded-lg bg-gray-900 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  {loading ? "Updating..." : "Reset Password"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
