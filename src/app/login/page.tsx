"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { Cpu, Shield, GitBranch, Activity, Zap } from "lucide-react";
import { FormField } from "@/components/ui/form-field";
import { Heading, Subheading } from "@/components/catalyst";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // P5-REDIRECT-001 FIX: Validate callbackUrl is a relative path to prevent open redirect
  const rawCallbackUrl = searchParams.get("callbackUrl") ?? "/";
  const callbackUrl = rawCallbackUrl.startsWith("/") && !rawCallbackUrl.startsWith("//")
    ? rawCallbackUrl
    : "/";
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
      className="relative flex min-h-screen overflow-hidden"
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

      {/* ── Left Panel — Marketing Content (desktop only) ────────────── */}
      <div className="hidden lg:flex lg:w-[55%] flex-col justify-center px-8 py-12">
        <div className="relative z-10 max-w-xl">
          {/* Logo & name */}
          <div className="mb-12 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-500/30 bg-indigo-500/10">
              <Zap size={20} className="text-indigo-400" />
            </div>
            <span className="text-2xl font-bold text-white">Intellios</span>
          </div>

          {/* Headline */}
          <h1 className="mb-8 text-4xl font-bold tracking-tight text-white leading-tight">
            The governed control plane for enterprise AI agents
          </h1>

          {/* Value Propositions */}
          <div className="space-y-5 mb-12">
            <div className="flex gap-4">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-500/20 shrink-0">
                <Shield size={16} className="text-indigo-300" />
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">
                <span className="font-semibold text-white">Deterministic governance</span> — every agent validated against your policies before deployment
              </p>
            </div>
            <div className="flex gap-4">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-500/20 shrink-0">
                <GitBranch size={16} className="text-indigo-300" />
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">
                <span className="font-semibold text-white">Auto-generated SR 11-7 audit trails</span> — compliance evidence that writes itself
              </p>
            </div>
            <div className="flex gap-4">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-500/20 shrink-0">
                <Activity size={16} className="text-indigo-300" />
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">
                <span className="font-semibold text-white">Continuous compliance monitoring</span> — know when policy drift occurs, instantly
              </p>
            </div>
          </div>

          {/* Testimonial */}
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
            <p className="text-sm italic text-gray-300 mb-3">
              "Intellios reduced our agent governance overhead by 80% while actually improving our compliance posture."
            </p>
            <p className="text-xs font-semibold text-indigo-300">
              VP Engineering, Top-10 US Bank (Design Partner)
            </p>
          </div>
        </div>
      </div>

      {/* ── Right Panel — Login Form ────────────────────────────────── */}
      <div className="w-full lg:w-[45%] flex items-center justify-center px-4 py-8 lg:py-0">
        <div className="relative z-10 w-full max-w-sm">
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
            <Heading level={1} className="tracking-tight text-white">Intellios</Heading>
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
            <Subheading level={2} className="text-white">Sign in to your account</Subheading>
          </div>

          {/* M-01: Use [&_label]:text-white to override FormField label color on dark bg */}
          <form onSubmit={handleSubmit} className="space-y-4 [&_label]:text-white/80">
            <FormField label="Email address" htmlFor="email">
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-indigo-500/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                placeholder="you@intellios.dev"
                aria-describedby={error ? "login-error" : undefined}
              />
            </FormField>

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
              <FormField label="Password" htmlFor="password">
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required={!ssoEnabled}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-text-tertiary focus:border-indigo-500/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                />
              </FormField>
            )}

            {/* P2-57: Remember this device — P2-1 a11y: native checkbox */}
            {!ssoEnabled && (
              <label className="flex cursor-pointer items-center gap-2.5 select-none">
                <input
                  type="checkbox"
                  checked={rememberDevice}
                  onChange={(e) => setRememberDevice(e.target.checked)}
                  className="h-4 w-4 shrink-0 rounded border-white/20 bg-white/5 text-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 accent-indigo-500"
                />
                <span className="font-mono text-2xs text-white/80 hover:text-white/90 transition-colors">
                  Remember this device for 30 days
                </span>
              </label>
            )}

            {error && (
              <p
                id="login-error"
                role="alert"
                className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400"
              >
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

            {/* M-02: Add create account link + improve forgot-password contrast */}
            <div className="flex items-center justify-between">
              <a href="/auth/forgot-password" className="text-xs text-white/80 hover:text-white/90 transition-colors">
                Forgot your password?
              </a>
              <a href="/register" className="text-xs text-indigo-400/80 hover:text-indigo-300 transition-colors">
                Create account →
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
              <span className="font-mono text-2xs uppercase tracking-widest text-white/50">Demo accounts</span>
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
                    <span className="block truncate font-mono text-xs text-white/80 transition-colors group-hover:text-white/90">
                      {acc.email}
                    </span>
                    <span className="block font-mono text-2xs text-white/50 transition-colors group-hover:text-white/70">
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
