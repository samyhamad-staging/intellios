"use client";

/**
 * Admin SSO Configuration Page — H2-3.1
 *
 * Allows enterprise admins to configure SAML 2.0 / OIDC Single Sign-On.
 * Settings are persisted via PUT /api/admin/sso.
 *
 * clientSecret is masked in the UI (shows "••••••••" when set).
 * Group → role mappings are editable as a dynamic key-value list (H2-3.2).
 */

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { Heading, Subheading } from "@/components/catalyst/heading";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { SkeletonList } from "@/components/ui/skeleton";
import { Tooltip } from "@/components/ui/tooltip";
import { SectionHeading } from "@/components/ui/section-heading";
import { FormField, FormSection } from "@/components/ui/form-field";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import type { EnterpriseSettings } from "@/lib/settings/types";
import { DEFAULT_ENTERPRISE_SETTINGS } from "@/lib/settings/types";

type SsoSettings = EnterpriseSettings["sso"];

const ROLES = ["architect", "reviewer", "compliance_officer", "admin", "viewer"] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <div className="border-b border-border-subtle bg-surface-raised px-5 py-3">
        <SectionHeading>{title}</SectionHeading>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}


const inputCls =
  "w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono";

export default function AdminSsoPage() {
  const [sso, setSso] = useState<SsoSettings>(DEFAULT_ENTERPRISE_SETTINGS.sso);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [platformConfigured, setPlatformConfigured] = useState(false);
  // Group-role mapping as editable rows
  const [groupRows, setGroupRows] = useState<{ group: string; role: string }[]>([]);
  // P1-542: Test SSO modal state
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "waiting" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    fetch("/api/admin/sso")
      .then((r) => { if (!r.ok) throw new Error("Failed"); return r.json(); })
      .then((data) => {
        if (data.sso) {
          setSso(data.sso);
          setGroupRows(
            Object.entries(data.sso.groupRoleMapping ?? {}).map(([group, role]) => ({
              group,
              role: role as string,
            }))
          );
        }
        setPlatformConfigured(!!data.platformOidcConfigured);
        setLoading(false);
      })
      .catch(() => { setFetchError(true); setLoading(false); });
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    const groupRoleMapping = Object.fromEntries(
      groupRows.filter((r) => r.group.trim()).map((r) => [r.group.trim(), r.role])
    );
    try {
      const res = await fetch("/api/admin/sso", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...sso, groupRoleMapping }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setSso(data.sso);
      toast.success("SSO settings saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [sso, groupRows]);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-raised p-6">
        <div className="max-w-2xl mx-auto"><SkeletonList rows={4} height="h-16" /></div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="min-h-screen bg-surface-raised p-6">
        <div className="max-w-2xl mx-auto">
          <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-6 text-center">
            <p className="text-sm font-medium text-red-700 dark:text-red-300">Unable to load SSO configuration</p>
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">Please try again later.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-raised p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <Breadcrumb items={[{ label: "Admin", href: "/admin" }, { label: "SSO" }]} />
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Heading level={1}>Single Sign-On (SSO)</Heading>
            <p className="mt-0.5 text-sm text-text-secondary">
              Configure OIDC federation for your enterprise identity provider.
            </p>
          </div>
          <Link
            href="/admin/settings"
            className="text-xs text-text-secondary hover:text-text underline underline-offset-2"
          >
            ← Settings
          </Link>
        </div>

        {/* Platform status banner */}
        {!platformConfigured && (
          <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
            <p className="font-semibold">Platform-level OIDC not configured</p>
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
              The platform operator must set{" "}
              <code className="rounded bg-amber-100 dark:bg-amber-900/40 px-1 font-mono">SSO_ISSUER</code>,{" "}
              <code className="rounded bg-amber-100 dark:bg-amber-900/40 px-1 font-mono">SSO_CLIENT_ID</code>, and{" "}
              <code className="rounded bg-amber-100 dark:bg-amber-900/40 px-1 font-mono">SSO_CLIENT_SECRET</code>{" "}
              environment variables to activate the OIDC provider. Enterprise-level settings
              below are saved but SSO login will not function until those vars are set.
            </p>
          </div>
        )}

        {platformConfigured && (
          <div className="rounded-xl border border-green-200 dark:border-emerald-800 bg-green-50 dark:bg-emerald-950/30 px-4 py-3 text-sm text-green-800 dark:text-emerald-200">
            Platform OIDC provider is configured. Enable SSO below to activate login for your
            enterprise.
          </div>
        )}

        {/* Enable toggle */}
        <Section title="SSO Status">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-text">
                {sso.enabled ? "SSO enabled" : "SSO disabled"}
              </p>
              <p className="text-xs text-text-tertiary mt-0.5">
                When enabled, users with a matching email domain will see the SSO login option.
              </p>
            </div>
            <Switch
              checked={sso.enabled}
              onChange={(enabled) => setSso((s) => ({ ...s, enabled }))}
              color="indigo"
            />
          </div>
        </Section>

        {/* IdP configuration */}
        <FormSection title="Identity Provider">
          <FormField label="Protocol" htmlFor="protocol">
            <Select
              value={sso.protocol}
              onValueChange={(v) => setSso((s) => ({ ...s, protocol: v as "oidc" | "saml" }))}
            >
              <SelectTrigger className="w-full text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="oidc">OIDC (OpenID Connect) — Azure AD, Okta, Google Workspace</SelectItem>
                <SelectItem value="saml">SAML 2.0 — requires additional server setup</SelectItem>
              </SelectContent>
            </Select>
          </FormField>

          <FormField
            label="Issuer / Discovery URL"
            htmlFor="issuer"
            description={
              sso.protocol === "oidc"
                ? "OIDC discovery base URL, e.g. https://login.microsoftonline.com/{tenant}/v2.0"
                : "SAML metadata URL, e.g. https://idp.example.com/saml/metadata"
            }
          >
            <input
              id="issuer"
              type="url"
              value={sso.issuer}
              onChange={(e) => setSso((s) => ({ ...s, issuer: e.target.value }))}
              placeholder="https://login.microsoftonline.com/..."
              className={inputCls}
            />
          </FormField>

          {sso.protocol === "oidc" && (
            <>
              <FormField label="Client ID" htmlFor="clientId" description="Application (client) ID registered with your IdP">
                <input
                  id="clientId"
                  type="text"
                  value={sso.clientId}
                  onChange={(e) => setSso((s) => ({ ...s, clientId: e.target.value }))}
                  className={inputCls}
                />
              </FormField>

              <FormField
                label="Client Secret"
                htmlFor="clientSecret"
                description='Stored encrypted. Shows "••••••••" when set — leave as-is to keep existing secret.'
              >
                <input
                  id="clientSecret"
                  type="password"
                  value={sso.clientSecret}
                  onChange={(e) => setSso((s) => ({ ...s, clientSecret: e.target.value }))}
                  placeholder="Enter new secret or leave masked to keep existing"
                  autoComplete="new-password"
                  className={inputCls}
                />
              </FormField>
            </>
          )}

          <FormField
            label="Email Domain"
            htmlFor="emailDomain"
            description='Users with this domain see the SSO button on login. e.g. "acme.com"'
          >
            <input
              id="emailDomain"
              type="text"
              value={sso.emailDomain}
              onChange={(e) => setSso((s) => ({ ...s, emailDomain: e.target.value.toLowerCase() }))}
              placeholder="acme.com"
              className={inputCls}
            />
          </FormField>
        </FormSection>

        {/* Claim mapping */}
        <FormSection title="Attribute Mapping" description="Override the default OIDC claim names if your IdP uses non-standard attributes.">
          {(
            [
              { key: "email", label: "Email claim" },
              { key: "name", label: "Display name claim" },
              { key: "groups", label: "Groups claim" },
            ] as const
          ).map(({ key, label }) => (
            <FormField key={key} label={label} htmlFor={`mapping-${key}`}>
              <input
                id={`mapping-${key}`}
                type="text"
                value={sso.attributeMapping[key]}
                onChange={(e) =>
                  setSso((s) => ({
                    ...s,
                    attributeMapping: { ...s.attributeMapping, [key]: e.target.value },
                  }))
                }
                className={inputCls}
              />
            </FormField>
          ))}
        </FormSection>

        {/* Group → role mapping (H2-3.2) */}
        <Section title="Group → Role Mapping">
          <p className="text-xs text-text-tertiary">
            Map IdP group names to Intellios roles. Users not in any listed group receive the
            default role below.
          </p>

          <div className="space-y-2">
            {groupRows.map((row, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={row.group}
                  onChange={(e) =>
                    setGroupRows((rows) =>
                      rows.map((r, j) => (j === i ? { ...r, group: e.target.value } : r))
                    )
                  }
                  placeholder="IdP group name"
                  className="flex-1 rounded-lg border border-border px-3 py-1.5 text-sm font-mono focus:border-violet-500 focus:outline-none"
                />
                <Select
                  value={row.role}
                  onValueChange={(v) => setGroupRows((rows) => rows.map((r, j) => (j === i ? { ...r, role: v } : r)))}
                >
                  <SelectTrigger className="text-sm w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Tooltip content="Remove mapping">
                  <button
                    onClick={() => setGroupRows((rows) => rows.filter((_, j) => j !== i))}
                    className="text-text-tertiary hover:text-red-500 dark:hover:text-red-400 text-lg leading-none px-1"
                    title="Remove"
                    aria-label="Remove group mapping"
                  >
                    ×
                  </button>
                </Tooltip>
              </div>
            ))}
          </div>

          <button
            onClick={() => setGroupRows((rows) => [...rows, { group: "", role: "viewer" }])}
            className="text-xs text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 font-medium"
          >
            + Add mapping
          </button>

          <FormField label="Default role" htmlFor="defaultRole" description="Assigned to users not matched by any group mapping above">
            <Select
              value={sso.defaultRole}
              onValueChange={(v) => setSso((s) => ({ ...s, defaultRole: v }))}
            >
              <SelectTrigger className="w-full text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </Section>

        {/* Save / Test */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => { setTestStatus("idle"); setTestMessage(null); setTestModalOpen(true); }}
            disabled={!sso.issuer || !platformConfigured}
            title={!platformConfigured ? "Platform OIDC not configured" : !sso.issuer ? "Enter an issuer URL first" : ""}
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/30 px-4 py-2 text-sm font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Test SSO Configuration
          </button>
          <div className="flex gap-3">
            <Link
              href="/admin/settings"
              className="rounded-lg border border-border px-4 py-2 text-sm text-text hover:bg-surface-raised"
            >
              Cancel
            </Link>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save SSO Settings"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Test SSO Modal (P1-542) ──────────────────────────────────────────── */}
      {testModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setTestModalOpen(false); }}
        >
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl">
            {/* Header */}
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <Heading level={2} className="text-base">Test SSO Configuration</Heading>
                <p className="mt-0.5 text-xs text-text-secondary">
                  Opens your IdP login in a new window. Results are reported here.
                </p>
              </div>
              <Tooltip content="Close">
                <button
                  onClick={() => setTestModalOpen(false)}
                  className="text-text-tertiary hover:text-text-secondary text-xl leading-none"
                  aria-label="Close"
                >
                  ×
                </button>
              </Tooltip>
            </div>

            {/* Config preview */}
            <div className="mb-5 rounded-lg border border-border-subtle bg-surface-raised p-4 space-y-2 text-xs">
              <div className="flex justify-between gap-2">
                <SectionHeading className="text-xs">Protocol</SectionHeading>
                <span className="font-mono text-text uppercase">{sso.protocol}</span>
              </div>
              <div className="flex justify-between gap-2">
                <SectionHeading className="text-xs">Issuer</SectionHeading>
                <span className="font-mono text-text truncate max-w-[200px]" title={sso.issuer}>{sso.issuer || "—"}</span>
              </div>
              <div className="flex justify-between gap-2">
                <SectionHeading className="text-xs">Domain</SectionHeading>
                <span className="font-mono text-text">{sso.emailDomain || "—"}</span>
              </div>
              <div className="flex justify-between gap-2">
                <SectionHeading className="text-xs">Status</SectionHeading>
                <span className={`font-medium ${sso.enabled ? "text-green-600 dark:text-emerald-400" : "text-amber-600"}`}>
                  {sso.enabled ? "Enabled" : "Disabled (save settings first)"}
                </span>
              </div>
            </div>

            {/* Status feedback */}
            {testStatus === "waiting" && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-indigo-100 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/30 px-3 py-2.5 text-sm text-indigo-700">
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                Waiting for login window to complete…
              </div>
            )}
            {testStatus === "success" && (
              <div className="mb-4 rounded-lg border border-green-200 dark:border-emerald-800 bg-green-50 dark:bg-emerald-950/30 px-3 py-2.5 text-sm text-green-700 dark:text-emerald-300">
                ✓ {testMessage ?? "SSO login completed successfully."}
              </div>
            )}
            {testStatus === "error" && (
              <div className="mb-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-3 py-2.5 text-sm text-red-700 dark:text-red-300">
                ✗ {testMessage ?? "SSO login failed or was cancelled."}
              </div>
            )}

            {/* How it works note */}
            {testStatus === "idle" && (
              <div className="mb-4 rounded-lg border border-amber-100 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-300">
                A popup will open to your IdP&rsquo;s login page. Complete the login to verify the
                configuration. Make sure pop-ups are not blocked by your browser.
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setTestModalOpen(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm text-text hover:bg-surface-raised"
              >
                {testStatus === "success" || testStatus === "error" ? "Done" : "Cancel"}
              </button>
              {testStatus !== "success" && (
                <button
                  disabled={testStatus === "waiting"}
                  onClick={() => {
                    setTestStatus("waiting");
                    setTestMessage(null);
                    const popup = window.open(
                      "/api/auth/signin/oidc?callbackUrl=%2Fadmin%2Fsso%3Fsso_test%3D1",
                      "sso-test",
                      "width=520,height=640,resizable=yes,scrollbars=yes"
                    );
                    if (!popup) {
                      setTestStatus("error");
                      setTestMessage("Pop-up was blocked. Please allow pop-ups for this page and try again.");
                      return;
                    }
                    const poll = setInterval(() => {
                      try {
                        if (popup.closed) {
                          clearInterval(poll);
                          setTestStatus("success");
                          setTestMessage(
                            "Login window closed. If you completed the flow successfully, your SSO configuration is working."
                          );
                        }
                      } catch {
                        clearInterval(poll);
                        setTestStatus("error");
                        setTestMessage("Pop-up closed unexpectedly or was blocked by a security policy.");
                      }
                    }, 800);
                    setTimeout(() => {
                      if (!popup.closed) {
                        popup.close();
                        clearInterval(poll);
                        setTestStatus("error");
                        setTestMessage("Test timed out after 3 minutes.");
                      }
                    }, 3 * 60 * 1000);
                  }}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {testStatus === "waiting" ? "Waiting…" : "Start Test Login"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
