"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function RegisterForm() {
  const router = useRouter();
  const [form, setForm] = useState({
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
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          password: form.password,
        }),
      });

      if (res.status === 201) {
        router.push("/login?registered=1");
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

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
      <h2 className="mb-6 text-lg font-semibold text-gray-900">
        Create your account
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="firstName" className="mb-1 block text-sm font-medium text-gray-700">
              First name
            </label>
            <input
              id="firstName"
              type="text"
              required
              maxLength={100}
              value={form.firstName}
              onChange={set("firstName")}
              placeholder="Jane"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus-accent"
            />
          </div>
          <div>
            <label htmlFor="lastName" className="mb-1 block text-sm font-medium text-gray-700">
              Last name
            </label>
            <input
              id="lastName"
              type="text"
              required
              maxLength={100}
              value={form.lastName}
              onChange={set("lastName")}
              placeholder="Smith"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus-accent"
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
            Work email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            maxLength={300}
            value={form.email}
            onChange={set("email")}
            placeholder="jane@acme.com"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus-accent"
          />
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
            Password
          </label>
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
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus-accent"
          />
        </div>

        {/* Confirm password */}
        <div>
          <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-gray-700">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            value={form.confirmPassword}
            onChange={set("confirmPassword")}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus-accent"
          />
        </div>

        {error && (
          <p className="rounded-lg badge-gov-error px-3 py-2 text-sm">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg btn-primary py-2 text-sm font-semibold transition-colors"
        >
          {loading ? "Creating account…" : "Create account"}
        </button>

        <div className="text-center">
          <span className="text-xs text-gray-500">
            Already have an account?{" "}
            <Link href="/login" className="text-[color:var(--sidebar-accent)] hover:text-[color:#7c3aed] underline-offset-2 hover:underline">
              Sign in
            </Link>
          </span>
        </div>
      </form>
    </div>
  );
}
