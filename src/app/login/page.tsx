"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { Cpu } from "lucide-react";

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
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden"
      style={{ background: "linear-gradient(135deg, #07071a 0%, #0d0d2b 50%, #07071a 100%)" }}
    >
      {/* Dot-grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(99,102,241,0.5) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      {/* Ambient glow orbs */}
      <div
        className="pointer-events-none absolute left-1/4 top-1/4 h-96 w-96 rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(99,102,241,0.12), transparent 70%)" }}
      />
      <div
        className="pointer-events-none absolute bottom-1/4 right-1/4 h-64 w-64 rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(139,92,246,0.10), transparent 70%)" }}
      />

      <div className="relative z-10 w-full max-w-sm px-4">
        {/* ── Logo lockup ───────────────────────────────────────────────── */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="relative">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl border border-indigo-500/30 bg-indigo-500/10"
              style={{ boxShadow: "0 0 24px rgba(99,102,241,0.25), inset 0 0 12px rgba(99,102,241,0.05)" }}
            >
              <Cpu size={22} className="text-indigo-400" />
            </div>
            {/* Pulse ring */}
            <div
              className="absolute inset-0 rounded-xl border border-indigo-400/30"
              style={{ animation: "ping 2.5s cubic-bezier(0,0,0.2,1) infinite" }}
            />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-white">Intellios</h1>
            <p className="mt-0.5 font-mono text-2xs tracking-widest text-indigo-400/60 uppercase">
              Enterprise Agent Factory
            </p>
          </div>
        </div>

        {/* Registration success banner */}
        {justRegistered && (
          <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
            Account created successfully. Sign in to get started.
          </div>
        )}

        {/* ── Glass card ────────────────────────────────────────────────── */}
        <div
          className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl"
          style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.04), 0 24px 48px rgba(0,0,0,0.5)" }}
        >
          <div className="mb-6">
            <p className="mb-1 font-mono text-2xs uppercase tracking-widest text-indigo-400/50">Authentication</p>
            <h2 className="text-lg font-semibold text-white">Sign in to your account</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block font-mono text-2xs uppercase tracking-wide text-gray-500">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
                placeholder="you@intellios.dev"
              />
            </div>

            {/* SSO detection */}
            {ssoEnabled && (
              <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/10 p-3 space-y-2">
                <p className="text-xs font-mono text-indigo-300">Your organization uses Single Sign-On.</p>
                <button
                  type="button"
                  onClick={handleSsoSignIn}
                  className="w-full rounded-lg border border-indigo-500/40 bg-white/5 py-2 text-sm font-medium text-indigo-300 hover:bg-indigo-500/10 transition-colors"
                >
                  Continue with SSO →
                </button>
                <p className="text-center font-mono text-2xs text-indigo-400/50">
                  You will be redirected to your identity provider.
                </p>
              </div>
            )}

            {!ssoEnabled && (
              <div>
                <label htmlFor="password" className="mb-1.5 block font-mono text-2xs uppercase tracking-wide text-gray-500">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required={!ssoEnabled}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
                />
              </div>
            )}

            {error && (
              <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {error}
              </p>
            )}

            {!ssoEnabled && (
              <button
                type="submit"
                disabled={loading || ssoLoading}
                className="w-full rounded-lg btn-primary py-2.5 text-sm font-medium disabled:opacity-50"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            )}

            <div className="space-y-2 text-center">
              <div>
                <a href="/auth/forgot-password" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
                  Forgot your password?
                </a>
              </div>
              <div>
                <span className="text-xs text-gray-600">
                  Don&apos;t have an account?{" "}
                  <a href="/register" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                    Start free trial
                  </a>
                </span>
              </div>
            </div>
          </form>
        </div>

        {/* ── Demo accounts — terminal aesthetic ────────────────────────── */}
        <div className="mt-4 rounded-xl border border-white/8 bg-black/40 p-4 backdrop-blur-sm">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
              <div className="h-2.5 w-2.5 rounded-full bg-amber-500/60" />
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/60" />
            </div>
            <span className="font-mono text-2xs uppercase tracking-widest text-gray-600">demo_accounts.env</span>
          </div>
          <div className="space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-gray-300">designer@intellios.dev</span>
                <span className="ml-2 text-gray-600">Designer1234!</span>
              </div>
              <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-2xs text-blue-300">Architect</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-gray-300">reviewer@intellios.dev</span>
                <span className="ml-2 text-gray-600">Reviewer1234!</span>
              </div>
              <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-2xs text-amber-300">Reviewer</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-gray-300">officer@intellios.dev</span>
                <span className="ml-2 text-gray-600">Officer1234!</span>
              </div>
              <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-2xs text-emerald-300">Compliance Officer</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-gray-300">admin@intellios.dev</span>
                <span className="ml-2 text-gray-600">Admin1234!</span>
              </div>
              <span className="rounded bg-violet-500/20 px-1.5 py-0.5 text-2xs text-violet-300">Admin</span>
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
