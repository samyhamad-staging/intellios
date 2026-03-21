"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const justRegistered = searchParams.get("registered") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // H2-3.1: SSO domain detection
  const [ssoEnabled, setSsoEnabled] = useState(false);
  const [ssoLoading, setSsoLoading] = useState(false);

  // Debounced SSO check when email domain changes
  useEffect(() => {
    const domain = email.includes("@") ? email.split("@")[1] : "";
    if (!domain || domain.length < 3) {
      setSsoEnabled(false);
      return;
    }
    const timer = setTimeout(() => {
      setSsoLoading(true);
      fetch(`/api/auth/sso-check?domain=${encodeURIComponent(domain)}`)
        .then((r) => r.json())
        .then((data) => setSsoEnabled(!!data.ssoEnabled))
        .catch(() => setSsoEnabled(false))
        .finally(() => setSsoLoading(false));
    }, 400);
    return () => clearTimeout(timer);
  }, [email]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password.");
      setLoading(false);
    } else {
      router.push(callbackUrl);
      router.refresh();
    }
  }

  async function handleSsoSignIn() {
    await signIn("oidc", { callbackUrl });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Intellios
          </h1>
          <p className="mt-1 text-sm text-gray-500">Enterprise Agent Factory</p>
        </div>

        {/* Registration success banner */}
        {justRegistered && (
          <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            Account created successfully. Sign in to get started.
          </div>
        )}

        {/* Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <h2 className="mb-6 text-lg font-semibold text-gray-900">
            Sign in to your account
          </h2>

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
                placeholder="you@intellios.dev"
              />
            </div>

            {/* H2-3.1: SSO button — shown when domain matches an SSO enterprise */}
            {ssoEnabled && (
              <div className="rounded-lg border border-violet-200 bg-violet-50 p-3 space-y-2">
                <p className="text-xs text-violet-700 font-medium">
                  Your organization uses Single Sign-On.
                </p>
                <button
                  type="button"
                  onClick={handleSsoSignIn}
                  className="w-full rounded-lg border border-violet-600 bg-white py-2 text-sm font-medium text-violet-700 hover:bg-violet-50"
                >
                  Continue with SSO →
                </button>
                <p className="text-[10px] text-violet-500 text-center">
                  You will be redirected to your identity provider.
                </p>
              </div>
            )}

            {/* Hide password field while SSO check is loading or SSO is active */}
            {!ssoEnabled && (
              <div>
                <label
                  htmlFor="password"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required={!ssoEnabled}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                />
              </div>
            )}

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            {!ssoEnabled && (
              <button
                type="submit"
                disabled={loading || ssoLoading}
                className="w-full rounded-lg bg-violet-600 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            )}

            <div className="text-center">
              <a
                href="/auth/forgot-password"
                className="text-xs text-gray-500 hover:text-gray-700 underline-offset-2 hover:underline"
              >
                Forgot your password?
              </a>
            </div>

            <div className="text-center">
              <span className="text-xs text-gray-500">
                Don&apos;t have an account?{" "}
                <a
                  href="/register"
                  className="font-medium text-violet-600 hover:text-violet-700 underline-offset-2 hover:underline"
                >
                  Start free trial
                </a>
              </span>
            </div>
          </form>
        </div>

        {/* Role reference */}
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
            Demo accounts
          </p>
          <div className="space-y-1.5 text-xs text-gray-500">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium text-gray-700">designer@intellios.dev</span>
                <span className="ml-2 text-gray-400">Designer1234!</span>
              </div>
              <span className="rounded bg-blue-50 px-1.5 py-0.5 text-blue-700">Architect</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium text-gray-700">reviewer@intellios.dev</span>
                <span className="ml-2 text-gray-400">Reviewer1234!</span>
              </div>
              <span className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-700">Reviewer</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium text-gray-700">officer@intellios.dev</span>
                <span className="ml-2 text-gray-400">Officer1234!</span>
              </div>
              <span className="rounded bg-green-50 px-1.5 py-0.5 text-green-700">Compliance Officer</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium text-gray-700">admin@intellios.dev</span>
                <span className="ml-2 text-gray-400">Admin1234!</span>
              </div>
              <span className="rounded bg-purple-50 px-1.5 py-0.5 text-purple-700">Admin</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
