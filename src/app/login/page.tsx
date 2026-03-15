"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-gray-900 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>

            <div className="text-center">
              <a
                href="/auth/forgot-password"
                className="text-xs text-gray-500 hover:text-gray-700 underline-offset-2 hover:underline"
              >
                Forgot your password?
              </a>
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
              <span className="rounded bg-blue-50 px-1.5 py-0.5 text-blue-700">Designer</span>
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
