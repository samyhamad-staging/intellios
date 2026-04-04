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
  // P2-57: Remember this device — persisted across page loads
  const [rememberDevice, setRememberDevice] = useState(false);
  useEffect(() => {
    try {
      setRememberDevice(localStorage.getItem("intellios_remember_device") === "true");
    } catch { /* localStorage unavailable */ }
  }, []);

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

    // P2-57: Persist remember preference
    try {
      localStorage.setItem("intellios_remember_device", String(rememberDevice));
    } catch { /* localStorage unavailable */ }

    const result = await signIn("credentials", {
      email,
      password,
      remember: String(rememberDevice),
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

  function handleQuickFill(fillEmail: string, fillPassword: string) {
    setEmail(fillEmail);
    setPassword(fillPassword);
  }

  const DEMO_ACCOUNTS = [
    { email: "designer@intellios.dev",  password: "Designer1234!", role: "Architect",         badge: "text-blue-300 bg-blue-500/15 border-blue-500/25"    },
    { email: "reviewer@intellios.dev",  password: "Reviewer1234!", role: "Reviewer",           badge: "text-amber-300 bg-amber-500/15 border-amber-500/25"  },
    { email: "officer@intellios.dev",   password: "Officer1234!",  role: "Compliance Officer", badge: "text-emerald-300 bg-emerald-500/15 border-emerald-500/25" },
    { email: "admin@intellios.dev",     password: "Admin1234!",    role: "Admin",              badge: "text-violet-300 bg-violet-500/15 border-violet-500/25" },
  ] as const;

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

            {/* P2-57: Remember this device */}
            {!ssoEnabled && (
              <label className="flex cursor-pointer items-center gap-2.5 select-none">
                <div
                  onClick={() => setRememberDevice((v) => !v)}
                  className={`relative flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                    rememberDevice
                      ? "border-indigo-500 bg-indigo-500"
                      : "border-white/20 bg-white/5 hover:border-white/35"
                  }`}
                >
                  {rememberDevice && (
                    <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 10 10" fill="none">
                      <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <span className="font-mono text-2xs text-white/40 hover:text-white/60 transition-colors">
                  Remember this device for 30 days
                </span>
              </label>
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

            <div className="text-center">
              <a href="/auth/forgot-password" className="text-xs text-white/25 hover:text-white/50 transition-colors">
                Forgot your password?
              </a>
            </div>
          </form>
        </div>

        {/* P1-56: Demo accounts — only visible when NEXT_PUBLIC_DEMO_MODE=true */}
        {process.env.NEXT_PUBLIC_DEMO_MODE === "true" && (
        <div className="mt-4">
          {/* Section divider */}
          <div className="mb-3 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/8" />
            <span className="font-mono text-2xs uppercase tracking-widest text-white/20">Demo accounts</span>
            <div className="h-px flex-1 bg-white/8" />
          </div>
          {/* Clickable rows — click to fill credentials */}
          <div className="space-y-1">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                type="button"
                onClick={() => handleQuickFill(acc.email, acc.password)}
                className="group flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-left transition-all hover:border-white/8 hover:bg-white/5"
              >
                <div className="min-w-0 flex-1">
                  <span className="block truncate font-mono text-xs text-white/60 transition-colors group-hover:text-white/85">
                    {acc.email}
                  </span>
                  <span className="block font-mono text-2xs text-white/20 transition-colors group-hover:text-white/40">
                    {acc.password}
                  </span>
                </div>
                <span className={`shrink-0 whitespace-nowrap rounded-md border px-2 py-0.5 font-mono text-2xs font-medium ${acc.badge}`}>
                  {acc.role}
                </span>
              </button>
            ))}
          </div>
        </div>
        )}
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
