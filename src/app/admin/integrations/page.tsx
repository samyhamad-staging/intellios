"use client";

import { useEffect, useState } from "react";
import { Plug, Save, CheckCircle } from "lucide-react";
import { Heading } from "@/components/catalyst/heading";
import { Switch } from "@/components/ui/switch";
import { SkeletonList } from "@/components/ui/skeleton";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { FormField } from "@/components/ui/form-field";

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
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    fetch("/api/admin/integrations")
      .then((r) => { if (!r.ok) throw new Error("Failed"); return r.json(); })
      .then((d) => { setData(d.integrations ?? {}); setLoading(false); })
      .catch(() => { setFetchError(true); setLoading(false); });
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
      {/* Breadcrumb */}
      <div className="mb-2">
        <Breadcrumb items={[
          { label: "Admin", href: "/admin" },
          { label: "Integrations" },
        ]} />
      </div>
      <div className="flex items-center justify-between">
        <div>
          <Heading level={1} className="flex items-center gap-2">
            <Plug className="h-6 w-6 text-violet-600 dark:text-violet-400" />
            Enterprise Integrations
          </Heading>
          <p className="text-sm text-text-secondary mt-1">
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

      {loading && <SkeletonList rows={4} height="h-24" />}

      {!loading && fetchError && (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-6 text-center">
          <p className="text-sm font-medium text-red-700 dark:text-red-300">Unable to load integrations</p>
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">Please try again later.</p>
        </div>
      )}

      {!loading && !fetchError && (
        <div className="space-y-6">
          {/* ServiceNow */}
          <section className="rounded-xl border border-border bg-surface p-6 space-y-4">
            <div className="flex items-center justify-between">
              <Heading level={2} className="font-medium">ServiceNow</Heading>
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-secondary">Enabled</span>
                <Switch
                  checked={data.servicenow?.enabled ?? false}
                  onChange={(v) => update("servicenow", "enabled", v)}
                  color="violet"
                />
              </div>
            </div>
            {data.servicenow?.enabled && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <InputField label="Instance URL" value={data.servicenow?.instanceUrl ?? ""} onChange={(v) => update("servicenow", "instanceUrl", v)} placeholder="https://your-instance.service-now.com" />
                  <InputField label="Username" value={data.servicenow?.username ?? ""} onChange={(v) => update("servicenow", "username", v)} />
                  <InputField label="Password" value="" onChange={(v) => update("servicenow", "password", v)} type="password" placeholder="(unchanged)" />
                  <InputField label="Assignment Group (optional)" value={data.servicenow?.assignmentGroup ?? ""} onChange={(v) => update("servicenow", "assignmentGroup", v)} />
                </div>
                <TestConnectionButton adapter="servicenow" config={{ instanceUrl: data.servicenow?.instanceUrl ?? "", username: data.servicenow?.username ?? "" }} />
              </div>
            )}
          </section>

          {/* Jira */}
          <section className="rounded-xl border border-border bg-surface p-6 space-y-4">
            <div className="flex items-center justify-between">
              <Heading level={2} className="font-medium">Jira</Heading>
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-secondary">Enabled</span>
                <Switch
                  checked={data.jira?.enabled ?? false}
                  onChange={(v) => update("jira", "enabled", v)}
                  color="violet"
                />
              </div>
            </div>
            {data.jira?.enabled && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <InputField label="Base URL" value={data.jira?.baseUrl ?? ""} onChange={(v) => update("jira", "baseUrl", v)} placeholder="https://your-org.atlassian.net" />
                  <InputField label="Email" value={data.jira?.email ?? ""} onChange={(v) => update("jira", "email", v)} />
                  <InputField label="API Token" value="" onChange={(v) => update("jira", "apiToken", v)} type="password" placeholder="(unchanged)" />
                  <InputField label="Project Key" value={data.jira?.projectKey ?? ""} onChange={(v) => update("jira", "projectKey", v)} placeholder="e.g. GOV" />
                  <InputField label="Issue Type (optional)" value={data.jira?.approvalIssueType ?? ""} onChange={(v) => update("jira", "approvalIssueType", v)} placeholder="Task" />
                </div>
                <TestConnectionButton adapter="jira" config={{ baseUrl: data.jira?.baseUrl ?? "", email: data.jira?.email ?? "" }} />
              </div>
            )}
          </section>

          {/* Slack */}
          <section className="rounded-xl border border-border bg-surface p-6 space-y-4">
            <div className="flex items-center justify-between">
              <Heading level={2} className="font-medium">Slack</Heading>
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-secondary">Enabled</span>
                <Switch
                  checked={data.slack?.enabled ?? false}
                  onChange={(v) => update("slack", "enabled", v)}
                  color="violet"
                />
              </div>
            </div>
            {data.slack?.enabled && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <InputField label="Webhook URL" value={data.slack?.webhookUrl ?? ""} onChange={(v) => update("slack", "webhookUrl", v)} placeholder="https://hooks.slack.com/..." />
                  <InputField label="Channel (optional)" value={data.slack?.channel ?? ""} onChange={(v) => update("slack", "channel", v)} placeholder="#governance-alerts" />
                </div>
                <TestConnectionButton adapter="slack" config={{ webhookUrl: data.slack?.webhookUrl ?? "" }} />
              </div>
            )}
          </section>

          {/* Teams */}
          <section className="rounded-xl border border-border bg-surface p-6 space-y-4">
            <div className="flex items-center justify-between">
              <Heading level={2} className="font-medium">Microsoft Teams</Heading>
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-secondary">Enabled</span>
                <Switch
                  checked={data.teams?.enabled ?? false}
                  onChange={(v) => update("teams", "enabled", v)}
                  color="violet"
                />
              </div>
            </div>
            {data.teams?.enabled && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3">
                  <InputField label="Webhook URL" value={data.teams?.webhookUrl ?? ""} onChange={(v) => update("teams", "webhookUrl", v)} placeholder="https://your-org.webhook.office.com/..." />
                </div>
                <TestConnectionButton adapter="teams" config={{ webhookUrl: data.teams?.webhookUrl ?? "" }} />
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function InputField({ label, value, onChange, placeholder, type = "text", autoComplete }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; autoComplete?: string;
}) {
  const id = `input-${label.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <FormField label={label} htmlFor={id}>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete ?? (type === "password" ? "new-password" : undefined)}
        className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
      />
    </FormField>
  );
}

// P2-532: Test Connection button — posts to /api/admin/integrations/test
function TestConnectionButton({ adapter, config }: {
  adapter: string;
  config: Record<string, string>;
}) {
  const [status, setStatus] = useState<"idle" | "testing" | "ok" | "fail">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleTest() {
    setStatus("testing");
    setMessage(null);
    try {
      const res = await fetch("/api/admin/integrations/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adapter, config }),
      });
      const data = await res.json();
      if (data.ok) {
        setStatus("ok");
        setMessage(data.message);
      } else {
        setStatus("fail");
        setMessage(data.error ?? "Connection failed.");
      }
    } catch {
      setStatus("fail");
      setMessage("Network error — could not reach test endpoint.");
    }
    // Auto-reset after 8 seconds
    setTimeout(() => { setStatus("idle"); setMessage(null); }, 8000);
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleTest}
        disabled={status === "testing"}
        className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
          status === "ok" ? "bg-green-50 dark:bg-emerald-950/30 text-green-700 dark:text-emerald-300 border border-green-200 dark:border-emerald-800"
          : status === "fail" ? "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800"
          : "bg-surface-muted text-text-secondary border border-border hover:bg-surface-raised"
        }`}
      >
        {status === "testing" ? "Testing…"
         : status === "ok" ? "✓ Connected"
         : status === "fail" ? "✗ Failed — retry"
         : "Test Connection"}
      </button>
      {message && (
        <p className={`text-xs ${status === "ok" ? "text-green-700 dark:text-emerald-300" : "text-red-600 dark:text-red-400"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
