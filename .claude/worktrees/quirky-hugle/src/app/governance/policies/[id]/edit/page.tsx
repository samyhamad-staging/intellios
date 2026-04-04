"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SkeletonList } from "@/components/ui/skeleton";
import PolicyForm, { PolicyFormValues } from "@/components/governance/policy-form";

interface Policy {
  id: string;
  name: string;
  type: string;
  description: string | null;
  rules: unknown[];
  enterpriseId: string | null;
}

export default function EditPolicyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    fetch(`/api/governance/policies/${id}`)
      .then((r) => r.json())
      .then((data: { policy?: Policy; message?: string }) => {
        if (data.policy) {
          setPolicy(data.policy);
        } else {
          setFetchError(data.message ?? "Policy not found");
        }
        setLoading(false);
      })
      .catch(() => {
        setFetchError("Failed to load policy");
        setLoading(false);
      });
  }, [id]);

  async function handleSubmit(values: PolicyFormValues) {
    setSaving(true);
    setSaveError(null);

    try {
      const res = await fetch(`/api/governance/policies/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSaveError((data as { message?: string }).message ?? "Failed to update policy");
        setSaving(false);
        return;
      }

      router.push("/governance");
    } catch {
      setSaveError("Network error. Please try again.");
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setSaveError(null);

    try {
      const res = await fetch(`/api/governance/policies/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSaveError((data as { message?: string }).message ?? "Failed to delete policy");
        setDeleting(false);
        setConfirmDelete(false);
        return;
      }

      router.push("/governance");
    } catch {
      setSaveError("Network error. Please try again.");
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  if (loading) {
    return (
      <div className="px-6 py-6 space-y-4">
        <SkeletonList rows={4} height="h-16" />
      </div>
    );
  }

  if (fetchError || !policy) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-red-600 mb-3">{fetchError ?? "Policy not found"}</p>
          <Link href="/governance" className="text-sm text-gray-500 hover:text-gray-700">
            ← Back to Governance
          </Link>
        </div>
      </div>
    );
  }

  const initialValues: PolicyFormValues = {
    name: policy.name,
    type: policy.type as PolicyFormValues["type"],
    description: policy.description ?? "",
    rules: (policy.rules as PolicyFormValues["rules"]) ?? [],
  };

  return (
    <div className="px-6 py-6">
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Edit Policy</h1>
          <p className="mt-0.5 text-sm text-gray-500">{policy.name}</p>
        </div>
        <Link href="/governance" className="text-sm text-gray-400 hover:text-gray-700 transition-colors">
          ← Governance
        </Link>
      </div>

      <div className="max-w-3xl">
        {saveError && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {saveError}
          </div>
        )}

        {policy.enterpriseId === null && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <span className="font-medium">Platform policy.</span> This is a global platform-level
            policy. Only administrators can modify or delete it.
          </div>
        )}

        <PolicyForm
          initialValues={initialValues}
          onSubmit={handleSubmit}
          submitLabel="Save Changes"
          saving={saving}
          readOnly={policy.enterpriseId === null}
          existingPolicyId={id}
        />

        {/* Delete section — only shown for non-global policies */}
        {policy.enterpriseId !== null && (
          <div className="mt-10 rounded-xl border border-red-200 bg-white px-6 py-5">
            <h3 className="text-sm font-semibold text-red-700 mb-1">Delete Policy</h3>
            <p className="text-xs text-gray-500 mb-4">
              Permanently remove this policy. Existing validation reports are not affected, but
              future validations will no longer evaluate against it.
            </p>

            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                Delete Policy
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">Are you sure? This cannot be undone.</span>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {deleting ? "Deleting…" : "Yes, Delete"}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
