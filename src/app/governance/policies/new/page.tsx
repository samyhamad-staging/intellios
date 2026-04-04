"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Heading } from "@/components/catalyst/heading";
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

      // Clear the auto-saved draft now that the policy has been saved
      try { localStorage.removeItem("policy-draft-new"); } catch { /* ignore */ }
      router.push("/governance");
    } catch {
      setError("Network error. Please try again.");
      setSaving(false);
    }
  }

  return (
    <div className="px-6 py-6">
      {/* Breadcrumb */}
      <div className="mb-4">
        <Breadcrumb items={[
          { label: "Governance", href: "/governance" },
          { label: "Policies", href: "/governance" },
          { label: "New Policy" },
        ]} />
      </div>

      {/* Page header */}
      <div className="mb-6">
        <Heading level={1}>New Policy</Heading>
        <p className="mt-0.5 text-sm text-text-secondary">
          Define a governance policy with rules that apply to agent blueprints
        </p>
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
          draftKey="policy-draft-new"
        />
      </div>
    </div>
  );
}
