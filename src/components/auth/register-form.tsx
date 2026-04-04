"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check } from "lucide-react";
import { FormField } from "@/components/ui/form-field";

export function RegisterForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    companyName: "",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: form.companyName,
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          password: form.password,
        }),
      });

      if (res.status === 201) {
        router.push("/login?registered=1&callbackUrl=/welcome");
        return;
      }

      const json = (await res.json()) as { message?: string; code?: string };
      if (res.status === 409) {
        setError("An account with this email already exists.");
      } else if (res.status === 429) {
        setError("Too many attempts. Please try again later.");
      } else {
        setError(json.message ?? "Something went wrong. Please try again.");
      }
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  /* ── P2-69: Progress indicator ────────────────────────────────────────── */
  // Step 1 = Organization, Step 2 = Identity, Step 3 = Security
  const signupStep = useMemo(() => {
    const orgDone = form.companyName.trim().length > 0;
    const identityDone = form.firstName.trim().length > 0 && form.lastName.trim().length > 0 && form.email.trim().length > 0;
    const securityDone = form.password.length >= 8 && form.confirmPassword.length >= 8;
    if (securityDone) return 3;
    if (identityDone) return 2;
    if (orgDone) return 1;
    return 0;
  }, [form]);

  /* ── Shared input class (dark-themed, matches login page) ─────────────── */
  const inputCls =
    "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-indigo-500/60 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 transition-colors";

  return (
    <div
      className="rounded-2xl border border-white/10 p-8"
      style={{
        background: "rgba(255,255,255,0.04)",
        backdropFilter: "blur(12px)",
        boxShadow: "0 0 0 1px rgba(99,102,241,0.08), 0 24px 48px rgba(0,0,0,0.4)",
      }}
    >
      <h2 className="mb-1 text-lg font-semibold text-white">Create your account</h2>
      <p className="mb-5 text-xs text-white/40">Set up your enterprise workspace in seconds</p>

      {/* P2-69: 3-step progress indicator */}
      <div className="mb-6">
        <div className="flex items-center">
          {[
            { n: 1, label: "Organization" },
            { n: 2, label: "Identity" },
            { n: 3, label: "Security" },
          ].map(({ n, label }, idx) => {
            const done = signupStep >= n;
            const active = signupStep === n - 1;
            return (
              <div key={n} className="flex items-center" style={{ flex: idx < 2 ? "1" : "none" }}>
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold transition-all duration-300 ${
                      done
                        ? "border-indigo-500 bg-indigo-500 text-white"
                        : active
                        ? "border-indigo-500/60 bg-indigo-500/10 text-indigo-400"
                        : "border-white/15 bg-transparent text-white/25"
                    }`}
                  >
                    {done ? <Check size={13} strokeWidth={2.5} /> : n}
                  </div>
                  <span className={`text-[10px] font-medium transition-colors ${done ? "text-indigo-400" : active ? "text-white/50" : "text-white/20"}`}>
                    {label}
                  </span>
                </div>
                {idx < 2 && (
                  <div className="mx-2 flex-1 mb-3.5">
                    <div className="h-px w-full bg-white/10">
                      <div
                        className="h-full bg-indigo-500 transition-all duration-500"
                        style={{ width: signupStep > n ? "100%" : signupStep === n ? "50%" : "0%" }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Enterprise / company name */}
        <FormField label="Enterprise name" htmlFor="companyName" required>
          <input
            id="companyName"
            type="text"
            required
            maxLength={80}
            value={form.companyName}
            onChange={set("companyName")}
            placeholder="Acme Financial"
            className={inputCls}
          />
        </FormField>

        {/* Name row */}
        <div className="grid grid-cols-2 gap-3">
          <FormField label="First name" htmlFor="firstName" required>
            <input
              id="firstName"
              type="text"
              required
              maxLength={100}
              value={form.firstName}
              onChange={set("firstName")}
              placeholder="Jane"
              className={inputCls}
            />
          </FormField>
          <FormField label="Last name" htmlFor="lastName" required>
            <input
              id="lastName"
              type="text"
              required
              maxLength={100}
              value={form.lastName}
              onChange={set("lastName")}
              placeholder="Smith"
              className={inputCls}
            />
          </FormField>
        </div>

        {/* Work email */}
        <FormField label="Work email" htmlFor="email" required>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            maxLength={300}
            value={form.email}
            onChange={set("email")}
            placeholder="jane@acme.com"
            className={inputCls}
          />
        </FormField>

        {/* Password */}
        <FormField label="Password" htmlFor="password" required>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={128}
            value={form.password}
            onChange={set("password")}
            placeholder="At least 8 characters"
            className={inputCls}
          />
        </FormField>

        {/* Confirm password */}
        <FormField label="Confirm password" htmlFor="confirmPassword" required>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            value={form.confirmPassword}
            onChange={set("confirmPassword")}
            className={inputCls}
          />
        </FormField>

        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg py-2.5 text-sm font-semibold text-white disabled:opacity-50 transition-all"
          style={{
            background: "linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)",
            boxShadow: loading ? "none" : "0 0 20px rgba(99,102,241,0.35)",
          }}
        >
          {loading ? "Creating account…" : "Create account →"}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 py-1">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-2xs text-white/25 uppercase tracking-widest">or</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <div className="text-center">
          <span className="text-xs text-white/40">
            Already have an account?{" "}
            <Link href="/login" className="text-indigo-400 hover:text-indigo-300 underline-offset-2 hover:underline transition-colors">
              Sign in
            </Link>
          </span>
        </div>
      </form>
    </div>
  );
}
