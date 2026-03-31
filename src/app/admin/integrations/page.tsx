"use client";

import { useEffect, useState } from "react";
import { Plug, Save, CheckCircle } from "lucide-react";

interface IntegrationsData {
  servicenow?: { enabled: boolean; instanceUrl?: string; username?: string; assignmentGroup?: string };
  jira?: { enabled: boolean; baseUrl?: string; email?: string; projectKey?: string; approvalIssueType?: string };
  slack?: { enabled: boolean; webhookUrl?: string; channel?: string };
  teams?: { enabled: boolean; webhookUrl?: string };
}

export default function IntegrationsPage() {
  const [data, setData] = useState<IntegrationsData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/integrations")
      .then((r) => r.json())
      .then((d) => { setData(d.integrations ?? {}); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  function update(adapter: keyof IntegrationsData, field: string, value: unknown) {
    setData((prev) => ({
      ...prev,
      [adapter]: { ...(prev[adapter] ?? { enabled: false }), [field]: value },
    }));
  }

  async function handleSave() {
    setSaving(true);
    const r = await fetch("/api/admin/integrations", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ integrations: data }),
    });
    setSaving(false);
    if (r.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
            <Plug className="h-6 w-6 text-violet-600" />
            Enterprise Integrations
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Connect Intellios to your enterprise tools
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
        >
          {saved ? <CheckCircle className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving..." : saved ? "Saved" : "Save Changes"}
        </button>
      </div>

      {loading && <div className="text-center text-slate-500 py-10">Loading...</div>}

      {!loading && (
        <div className="space-y-6">
          {/* ServiceNow */}
          <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-medium text-slate-900">ServiceNow</h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.servicenow?.enabled ?? false}
                  onChange={(e) => update("servicenow", "enabled", e.target.checked)}
                  className="h-4 w-4 accent-violet-600"
                />
                <span className="text-sm text-slate-600">Enabled</span>
              </label>
            </div>
            {data.servicenow?.enabled && (
              <div className="grid grid-cols-2 gap-3">
                <InputField label="Instance URL" value={data.servicenow?.instanceUrl ?? ""} onChange={(v) => update("servicenow", "instanceUrl", v)} placeholder="https://your-instance.service-now.com" />
                <InputField label="Username" value={data.servicenow?.username ?? ""} onChange={(v) => update("servicenow", "username", v)} />
                <InputField label="Password" value="" onChange={(v) => update("servicenow", "password", v)} type="password" placeholder="(unchanged)" />
                <InputField label="Assignment Group (optional)" value={data.servicenow?.assignmentGroup ?? ""} onChange={(v) => update("servicenow", "assignmentGroup", v)} />
              </div>
            )}
          </section>

          {/* Jira */}
          <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-medium text-slate-900">Jira</h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.jira?.enabled ?? false}
                  onChange={(e) => update("jira", "enabled", e.target.checked)}
                  className="h-4 w-4 accent-violet-600"
                />
                <span className="text-sm text-slate-600">Enabled</span>
              </label>
            </div>
            {data.jira?.enabled && (
              <div className="grid grid-cols-2 gap-3">
                <InputField label="Base URL" value={data.jira?.baseUrl ?? ""} onChange={(v) => update("jira", "baseUrl", v)} placeholder="https://your-org.atlassian.net" />
                <InputField label="Email" value={data.jira?.email ?? ""} onChange={(v) => update("jira", "email", v)} />
                <InputField label="API Token" value="" onChange={(v) => update("jira", "apiToken", v)} type="password" placeholder="(unchanged)" />
                <InputField label="Project Key" value={data.jira?.projectKey ?? ""} onChange={(v) => update("jira", "projectKey", v)} placeholder="e.g. GOV" />
                <InputField label="Issue Type (optional)" value={data.jira?.approvalIssueType ?? ""} onChange={(v) => update("jira", "approvalIssueType", v)} placeholder="Task" />
              </div>
            )}
          </section>

          {/* Slack */}
          <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-medium text-slate-900">Slack</h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.slack?.enabled ?? false}
                  onChange={(e) => update("slack", "enabled", e.target.checked)}
                  className="h-4 w-4 accent-violet-600"
                />
                <span className="text-sm text-slate-600">Enabled</span>
              </label>
            </div>
            {data.slack?.enabled && (
              <div className="grid grid-cols-2 gap-3">
                <InputField label="Webhook URL" value={data.slack?.webhookUrl ?? ""} onChange={(v) => update("slack", "webhookUrl", v)} placeholder="https://hooks.slack.com/..." />
                <InputField label="Channel (optional)" value={data.slack?.channel ?? ""} onChange={(v) => update("slack", "channel", v)} placeholder="#governance-alerts" />
              </div>
            )}
          </section>

          {/* Teams */}
          <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-medium text-slate-900">Microsoft Teams</h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.teams?.enabled ?? false}
                  onChange={(e) => update("teams", "enabled", e.target.checked)}
                  className="h-4 w-4 accent-violet-600"
                />
                <span className="text-sm text-slate-600">Enabled</span>
              </label>
            </div>
            {data.teams?.enabled && (
              <div className="grid grid-cols-1 gap-3">
                <InputField label="Webhook URL" value={data.teams?.webhookUrl ?? ""} onChange={(v) => update("teams", "webhookUrl", v)} placeholder="https://your-org.webhook.office.com/..." />
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function InputField({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-slate-600">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
      />
    </div>
  );
}
