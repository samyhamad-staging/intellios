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
  const [agreedToTerms, setAgreedToTerms] = useState(false);
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

  /* ── W-08/P2-69: Step wizard — only show current step's fields ────────── */
  // Step 0 = Organization, Step 1 = Identity, Step 2 = Security
  const [currentStep, setCurrentStep] = useState(0);
  const TOTAL_STEPS = 3;

  const stepValid = useMemo(() => [
    form.companyName.trim().length > 0,
    form.firstName.trim().length > 0 && form.lastName.trim().length > 0 && form.email.trim().length > 0,
    form.password.length >= 8 && form.password === form.confirmPassword && agreedToTerms,
  ], [form, agreedToTerms]);

  // Legacy progress indicator alias (for the stepper dots)
  const signupStep = currentStep + (stepValid[currentStep] ? 1 : 0);

  /* ── Shared input class (dark-themed, matches login page) ─────────────── */
  const inputCls =
    "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-indigo-500/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 transition-colors";

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
      <p className="mb-5 text-xs text-white/70">Set up your enterprise workspace in seconds</p>

      {/* P2-69: 3-step progress indicator */}
      <div className="mb-6">
        <div className="flex items-center" role="list">
          {[
            { n: 1, label: "Organization" },
            { n: 2, label: "Identity" },
            { n: 3, label: "Security" },
          ].map(({ n, label }, idx) => {
            const done = signupStep >= n;
            const active = signupStep === n - 1;
            return (
              <div key={n} className="flex items-center" role="listitem" style={{ flex: idx < 2 ? "1" : "none" }} aria-label={`Step ${n} of 3: ${label}`} aria-current={active ? "step" : undefined}>
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold transition-all duration-300 ${
                      done
                        ? "border-indigo-500 bg-indigo-500 text-white"
                        : active
                        ? "border-indigo-500/60 bg-indigo-500/10 text-indigo-400"
                        : "border-white/15 bg-transparent text-white/50"
                    }`}
                  >
                    {done ? <Check size={13} strokeWidth={2.5} /> : n}
                  </div>
                  <span className={`text-[10px] font-medium transition-colors ${done ? "text-indigo-400" : active ? "text-white/80" : "text-white/50"}`}>
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

      {/* M-01: [&_label]:text-white/80 overrides FormField label color on dark bg */}
      <form onSubmit={handleSubmit} className="space-y-4 [&_label]:text-white/80">
        {/* W-08: Step 0 — Organization */}
        {currentStep === 0 && (
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
              autoFocus
            />
          </FormField>
        )}

        {/* W-08: Step 1 — Identity */}
        {currentStep === 1 && (
          <>
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
                  autoFocus
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
          </>
        )}

        {/* W-08: Step 2 — Security */}
        {currentStep === 2 && (
          <>
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
                autoFocus
              />
            </FormField>

            {/* P2-2: Password validation checklist */}
            <div className="space-y-1.5 mb-2" aria-label="Password requirements" aria-live="polite">
              <div className="flex items-center gap-2 text-xs" aria-label={`Minimum 8 characters: ${form.password.length >= 8 ? "met" : "not met"}`}>
                <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" className={form.password.length >= 8 ? "text-emerald-400" : "text-white/50"} />
                  {form.password.length >= 8 && (
                    <path d="M5 8L7 10L11 6" stroke="currentColor" strokeWidth="1.5" className="text-emerald-400" strokeLinecap="round" strokeLinejoin="round" />
                  )}
                </svg>
                <span className={form.password.length >= 8 ? "text-emerald-400" : "text-white/50"}>At least 8 characters</span>
              </div>
              <div className="flex items-center gap-2 text-xs" aria-label={`Passwords match: ${form.password === form.confirmPassword && form.password.length > 0 ? "met" : "not met"}`}>
                <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" className={form.password === form.confirmPassword && form.password.length > 0 ? "text-emerald-400" : "text-white/50"} />
                  {form.password === form.confirmPassword && form.password.length > 0 && (
                    <path d="M5 8L7 10L11 6" stroke="currentColor" strokeWidth="1.5" className="text-emerald-400" strokeLinecap="round" strokeLinejoin="round" />
                  )}
                </svg>
                <span className={form.password === form.confirmPassword && form.password.length > 0 ? "text-emerald-400" : "text-white/50"}>Passwords match</span>
              </div>
            </div>

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

            {/* P0-4: Terms acceptance checkbox */}
            <div className="flex items-start gap-2.5 pt-2">
              <input
                id="agreedToTerms"
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border border-white/20 bg-white/5 checked:border-indigo-500 checked:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 cursor-pointer transition-all"
                required
              />
              <label htmlFor="agreedToTerms" className="text-xs text-white/80 leading-relaxed cursor-pointer">
                I agree to the{" "}
                <Link href="/landing/terms" className="text-indigo-400 hover:text-indigo-300 underline-offset-2 hover:underline transition-colors">
                  Terms of Service
                </Link>
                {" "}and{" "}
                <Link href="/landing/privacy" className="text-indigo-400 hover:text-indigo-300 underline-offset-2 hover:underline transition-colors">
                  Privacy Policy
                </Link>
              </label>
            </div>
          </>
        )}

        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Step navigation */}
        <div className="flex items-center gap-3">
          {currentStep > 0 && (
            <button
              type="button"
              onClick={() => setCurrentStep((s) => s - 1)}
              className="rounded-lg border border-white/15 px-4 py-2.5 text-sm font-medium text-white/80 hover:text-white/90 hover:border-white/25 transition-all focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            >
              ← Back
            </button>
          )}

          {currentStep < TOTAL_STEPS - 1 ? (
            <button
              type="button"
              disabled={!stepValid[currentStep]}
              onClick={() => setCurrentStep((s) => s + 1)}
              className="flex-1 rounded-lg py-2.5 text-sm font-semibold text-white disabled:opacity-40 transition-all focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
              style={{
                background: "linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)",
                boxShadow: stepValid[currentStep] ? "0 0 20px rgba(99,102,241,0.35)" : "none",
              }}
            >
              Continue →
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading || !stepValid[2]}
              className="flex-1 rounded-lg py-2.5 text-sm font-semibold text-white disabled:opacity-40 transition-all flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
              style={{
                background: "linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)",
                boxShadow: loading ? "none" : "0 0 20px rgba(99,102,241,0.35)",
              }}
            >
              {loading && (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                  <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                </svg>
              )}
              <span>{loading ? "Creating account…" : "Create account →"}</span>
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 py-1">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-2xs text-white/50 uppercase tracking-widest">or</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <div className="text-center">
          <span className="text-xs text-white/70">
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
