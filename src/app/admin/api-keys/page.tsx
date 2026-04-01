"use client";

import { useEffect, useState } from "react";
import { Key, Plus, Trash2, Copy, Check, AlertTriangle } from "lucide-react";

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  createdBy: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [validScopes, setValidScopes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<{ key: string; name: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({ name: "", scopes: [] as string[] });

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
      setKeys((prev) => [...prev, { id: data.id, name: data.name, keyPrefix: data.keyPrefix, scopes: data.scopes, createdBy: "", createdAt: data.createdAt, lastUsedAt: null }]);
      setForm({ name: "", scopes: [] });
    }
    setCreating(false);
  }

  async function handleRevoke(id: string) {
    const r = await fetch(`/api/admin/api-keys/${id}`, { method: "DELETE" });
    if (r.ok) setKeys((prev) => prev.filter((k) => k.id !== id));
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
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
          <Key className="h-6 w-6 text-violet-600" />
          API Keys
        </h1>
        <p className="text-sm text-slate-500 mt-1">
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
          <div className="flex items-center gap-2 font-mono text-sm bg-white border border-amber-200 rounded-lg px-3 py-2">
            <span className="flex-1 text-slate-800 truncate">{newKey.key}</span>
            <button onClick={handleCopy} className="text-amber-600 hover:text-amber-800 transition-colors">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <button onClick={() => setNewKey(null)} className="text-sm text-amber-700 underline">
            {"I've copied my key"}
          </button>
        </div>
      )}

      {/* Create form */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
        <h2 className="font-medium text-slate-900">Create New Key</h2>
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Key name (e.g. CI/CD Pipeline)"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <div>
            <p className="text-xs font-medium text-slate-600 mb-2">Scopes</p>
            <div className="flex flex-wrap gap-2">
              {validScopes.map((scope) => (
                <button
                  key={scope}
                  onClick={() => toggleScope(scope)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                    form.scopes.includes(scope)
                      ? "bg-violet-100 text-violet-700 border border-violet-300"
                      : "bg-slate-100 text-slate-600 border border-slate-200 hover:border-violet-300"
                  }`}
                >
                  {scope}
                </button>
              ))}
            </div>
          </div>
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
        <h2 className="font-medium text-slate-800">Active Keys</h2>
        {loading && <div className="text-sm text-slate-500 py-4">Loading...</div>}
        {!loading && keys.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
            No API keys yet. Create one above.
          </div>
        )}
        {keys.map((k) => (
          <div key={k.id} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-5 py-3.5">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900">{k.name}</p>
              <p className="text-xs text-slate-500 font-mono">{k.keyPrefix}••••••••••••••••••••</p>
            </div>
            <div className="flex flex-wrap gap-1">
              {(k.scopes as string[]).map((s) => (
                <span key={s} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{s}</span>
              ))}
            </div>
            <p className="text-xs text-slate-400 whitespace-nowrap">
              {k.lastUsedAt ? `Used ${new Date(k.lastUsedAt).toLocaleDateString()}` : "Never used"}
            </p>
            <button
              onClick={() => handleRevoke(k.id)}
              className="text-slate-400 hover:text-red-500 transition-colors"
              title="Revoke key"
              aria-label="Revoke key"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}
