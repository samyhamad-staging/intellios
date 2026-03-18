"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PolicyForm, { PolicyFormValues } from "@/components/governance/policy-form";

export default function NewPolicyPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(values: PolicyFormValues) {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/governance/policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { message?: string }).message ?? "Failed to create policy");
        setSaving(false);
        return;
      }

      router.push("/governance");
    } catch {
      setError("Network error. Please try again.");
      setSaving(false);
    }
  }

  return (
    <div className="px-8 py-8">
      {/* Page header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">New Policy</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Define a governance policy with rules that apply to agent blueprints
          </p>
        </div>
        <Link href="/governance" className="text-sm text-gray-400 hover:text-gray-700 transition-colors">
          ← Governance
        </Link>
      </div>

      <div className="max-w-3xl">
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <PolicyForm
          onSubmit={handleSubmit}
          submitLabel="Create Policy"
          saving={saving}
        />
      </div>
    </div>
  );
}
