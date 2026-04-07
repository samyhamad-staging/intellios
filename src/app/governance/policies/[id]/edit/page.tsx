"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SkeletonList } from "@/components/ui/skeleton";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Heading, Subheading } from "@/components/catalyst/heading";
import { InlineAlert } from "@/components/catalyst/alert";
import PolicyForm, { PolicyFormValues } from "@/components/governance/policy-form";

interface Policy {
  id: string;
  name: string;
  type: string;
  description: string | null;
  rules: unknown[];
  enterpriseId: string | null;
  scopedAgentIds: string[] | null;
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
  // W3-05: cascade impact count — fetched when user opens the delete confirmation
  const [dependentCount, setDependentCount] = useState<number | null>(null);
  const [dependentCountLoading, setDependentCountLoading] = useState(false);

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

  async function fetchDependentCount() {
    if (dependentCount !== null || dependentCountLoading) return;
    setDependentCountLoading(true);
    try {
      const res = await fetch(`/api/governance/policies/${id}/dependents`);
      if (res.ok) {
        const data = (await res.json()) as { blueprintCount: number };
        setDependentCount(data.blueprintCount);
      }
    } catch {
      // non-critical — show confirmation without count
    } finally {
      setDependentCountLoading(false);
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
          <p className="text-sm text-red-600 dark:text-red-400 mb-3">{fetchError ?? "Policy not found"}</p>
          <Link href="/governance" className="text-sm text-text-secondary hover:text-text">
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
    scopedAgentIds: policy.scopedAgentIds ?? null,
  };

  return (
    <div className="px-6 py-6">
      {/* Breadcrumb */}
      <div className="mb-4">
        <Breadcrumb items={[
          { label: "Governance", href: "/governance" },
          { label: "Policies", href: "/governance" },
          { label: policy.name },
        ]} />
      </div>

      {/* Page header */}
      <div className="mb-6">
        <Heading level={1}>Edit Policy</Heading>
        <p className="mt-0.5 text-sm text-text-secondary">{policy.name}</p>
      </div>

      <div className="max-w-3xl">
        {saveError && (
          <InlineAlert variant="error" className="mb-6">{saveError}</InlineAlert>
        )}

        {policy.enterpriseId === null && (
          <InlineAlert variant="warning" className="mb-6">
            <span className="font-medium">Platform policy.</span> This is a global platform-level
            policy. Only administrators can modify or delete it.
          </InlineAlert>
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
          <div className="mt-10 rounded-xl border border-red-200 dark:border-red-800 bg-surface px-6 py-5">
            <Subheading level={3} className="text-red-700 dark:text-red-300 mb-1">Delete Policy</Subheading>
            <p className="text-xs text-text-secondary mb-4">
              Permanently remove this policy. Existing validation reports are not affected, but
              future validations will no longer evaluate against it.
            </p>

            {!confirmDelete ? (
              <button
                onClick={() => { setConfirmDelete(true); fetchDependentCount(); }}
                className="rounded-lg border border-red-300 dark:border-red-700 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              >
                Delete Policy
              </button>
            ) : (
              <div className="space-y-3">
                {/* W3-05: cascade impact warning */}
                <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-3 py-2.5 text-sm text-amber-800 dark:text-amber-200">
                  {dependentCountLoading ? (
                    "Checking impact…"
                  ) : dependentCount !== null && dependentCount > 0 ? (
                    <>
                      <span className="font-medium">
                        This policy is evaluated against {dependentCount} active blueprint{dependentCount !== 1 ? "s" : ""}.
                      </span>{" "}
                      Deleting it will remove this policy from all future validations. Existing
                      validation reports are unaffected. This action cannot be undone.
                    </>
                  ) : (
                    "This policy is not currently evaluated against any active blueprints. Deleting it will remove it from all future validations. This action cannot be undone."
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {deleting ? "Deleting…" : "Yes, Delete"}
                  </button>
                  <button
                    onClick={() => { setConfirmDelete(false); setDependentCount(null); }}
                    className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:bg-surface-raised transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
