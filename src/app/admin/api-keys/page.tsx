"use client";

import { useEffect, useState } from "react";
import { Key, Plus, Trash2, Copy, Check, AlertTriangle } from "lucide-react";
import { Heading } from "@/components/catalyst/heading";
import { SkeletonList } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Tooltip } from "@/components/ui/tooltip";
import { FormField } from "@/components/ui/form-field";
import {
  Dialog, DialogTitle, DialogDescription, DialogBody, DialogActions,
} from "@/components/catalyst/dialog";
import { Button as CatalystButton } from "@/components/catalyst/button";

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  createdBy: string;
  createdAt: string;
  lastUsedAt: string | null;
  usageCount: number;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [validScopes, setValidScopes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<{ key: string; name: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({ name: "", scopes: [] as string[] });
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null);
  const [revoking, setRevoking] = useState(false);

  useEffect(() => {
    fetch("/api/admin/api-keys")
      .then((r) => r.json())
      .then((d) => { setKeys(d.keys ?? []); setValidScopes(d.validScopes ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function handleCreate() {
    if (!form.name.trim()) return;
    setCreating(true);
    const r = await fetch("/api/admin/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (r.ok) {
      const data = await r.json();
      setNewKey({ key: data.key, name: data.name });
      setKeys((prev) => [...prev, { id: data.id, name: data.name, keyPrefix: data.keyPrefix, scopes: data.scopes, createdBy: "", createdAt: data.createdAt, lastUsedAt: null, usageCount: 0 }]);
      setForm({ name: "", scopes: [] });
    }
    setCreating(false);
  }

  async function handleRevokeConfirmed() {
    if (!revokeTarget) return;
    setRevoking(true);
    const r = await fetch(`/api/admin/api-keys/${revokeTarget.id}`, { method: "DELETE" });
    if (r.ok) setKeys((prev) => prev.filter((k) => k.id !== revokeTarget.id));
    setRevoking(false);
    setRevokeTarget(null);
  }

  function toggleScope(scope: string) {
    setForm((prev) => ({
      ...prev,
      scopes: prev.scopes.includes(scope) ? prev.scopes.filter((s) => s !== scope) : [...prev.scopes, scope],
    }));
  }

  function handleCopy() {
    if (newKey) {
      navigator.clipboard.writeText(newKey.key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="mb-2">
        <Breadcrumb items={[
          { label: "Admin", href: "/admin" },
          { label: "API Keys" },
        ]} />
      </div>

      <div>
        <Heading level={1} className="flex items-center gap-2">
          <Key className="h-6 w-6 text-violet-600" />
          API Keys
        </Heading>
        <p className="text-sm text-text-secondary mt-1">
          Manage API keys for programmatic access to Intellios
        </p>
      </div>

      {/* New key reveal */}
      {newKey && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 space-y-3">
          <div className="flex items-center gap-2 text-amber-700 font-medium">
            <AlertTriangle className="h-4 w-4" />
            Copy your new API key — it will not be shown again
          </div>
          <div className="flex items-center gap-2 font-mono text-sm bg-surface border border-amber-200 rounded-lg px-3 py-2">
            <span className="flex-1 text-text truncate">{newKey.key}</span>
            <Tooltip content={copied ? "Copied" : "Copy to clipboard"}>
              <button onClick={handleCopy} className="text-amber-600 hover:text-amber-800 transition-colors">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </Tooltip>
          </div>
          <button onClick={() => setNewKey(null)} className="text-sm text-amber-700 underline">
            {"I've copied my key"}
          </button>
        </div>
      )}

      {/* Create form */}
      <section className="rounded-xl border border-border bg-surface p-6 space-y-4">
        <Heading level={2} className="font-medium">Create New Key</Heading>
        <div className="space-y-3">
          <FormField label="Key name" htmlFor="api-key-name">
            <input
              id="api-key-name"
              type="text"
              placeholder="e.g. CI/CD Pipeline"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </FormField>
          {/* W-07: Only render the Scopes section if the API returned available scopes */}
          {validScopes.length > 0 && (
            <div>
              <p className="text-xs font-medium text-text-secondary mb-2">Scopes</p>
              <div className="flex flex-wrap gap-2">
                {validScopes.map((scope) => (
                  <button
                    key={scope}
                    onClick={() => toggleScope(scope)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                      form.scopes.includes(scope)
                        ? "bg-violet-100 text-violet-700 border border-violet-300"
                        : "bg-surface-muted text-text-secondary border border-border hover:border-violet-300"
                    }`}
                  >
                    {scope}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button
            onClick={handleCreate}
            disabled={creating || !form.name.trim()}
            className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
          >
            <Plus className="h-4 w-4" />
            {creating ? "Creating..." : "Create Key"}
          </button>
        </div>
      </section>

      {/* Key list */}
      <section className="space-y-2">
        <Heading level={2} className="font-medium">Active Keys</Heading>
        {loading && <SkeletonList rows={3} height="h-14" />}
        {!loading && keys.length === 0 && (
          <EmptyState icon={Key} heading="No API keys yet" subtext="Create one above to start using the Intellios API." />
        )}
        {keys.map((k) => (
          <div key={k.id} className="flex items-center gap-4 rounded-xl border border-border bg-surface px-5 py-3.5">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text">{k.name}</p>
              <p className="text-xs text-text-secondary font-mono">{k.keyPrefix}••••••••••••••••••••</p>
            </div>
            <div className="flex flex-wrap gap-1">
              {(k.scopes as string[]).map((s) => (
                <span key={s} className="rounded-full bg-surface-muted px-2 py-0.5 text-xs text-text-secondary">{s}</span>
              ))}
            </div>
            <div className="flex flex-col items-end gap-0.5 shrink-0">
              <p className="text-xs text-text-tertiary whitespace-nowrap">
                {k.lastUsedAt
                  ? `Last used ${new Date(k.lastUsedAt).toLocaleDateString()}`
                  : "Never used"}
              </p>
              <p className="text-xs font-mono text-text-tertiary whitespace-nowrap"
                title={`${k.usageCount.toLocaleString()} total request${k.usageCount !== 1 ? "s" : ""}`}>
                {k.usageCount > 0
                  ? `${k.usageCount >= 1000 ? `${(k.usageCount / 1000).toFixed(1)}k` : k.usageCount} req`
                  : "0 req"}
              </p>
            </div>
            <Tooltip content="Revoke key">
              <button
                onClick={() => setRevokeTarget(k)}
                className="text-text-tertiary hover:text-red-500 transition-colors"
                title="Revoke key"
                aria-label="Revoke key"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </Tooltip>
          </div>
        ))}
      </section>

      {/* Revoke confirmation dialog */}
      <Dialog open={revokeTarget !== null} onClose={() => setRevokeTarget(null)}>
        <DialogTitle>Revoke API key?</DialogTitle>
        <DialogDescription>
          Are you sure you want to revoke <strong>{revokeTarget?.name}</strong>
          {" "}(<code>{revokeTarget?.keyPrefix}••••</code>)?
          Any integrations using this key will stop working immediately. This cannot be undone.
        </DialogDescription>
        <DialogBody />
        <DialogActions>
          <CatalystButton plain onClick={() => setRevokeTarget(null)}>
            Cancel
          </CatalystButton>
          <CatalystButton color="red" onClick={handleRevokeConfirmed} disabled={revoking}>
            {revoking ? "Revoking…" : "Revoke key"}
          </CatalystButton>
        </DialogActions>
      </Dialog>
    </div>
  );
}
