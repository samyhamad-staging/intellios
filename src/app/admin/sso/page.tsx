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
import Link from "next/link";
import type { EnterpriseSettings } from "@/lib/settings/types";
import { DEFAULT_ENTERPRISE_SETTINGS } from "@/lib/settings/types";
import { fetchJson } from "@/lib/fetch-json";

type SsoSettings = EnterpriseSettings["sso"];

const ROLES = ["architect", "reviewer", "compliance_officer", "admin", "viewer"] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="border-b border-gray-100 bg-gray-50 px-5 py-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{title}</p>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {hint && <p className="text-xs text-gray-400 mb-1.5">{hint}</p>}
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono";

export default function AdminSsoPage() {
  const [sso, setSso] = useState<SsoSettings>(DEFAULT_ENTERPRISE_SETTINGS.sso);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [platformConfigured, setPlatformConfigured] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Group-role mapping as editable rows
  const [groupRows, setGroupRows] = useState<{ group: string; role: string }[]>([]);

  useEffect(() => {
    fetchJson("/api/admin/sso")
      .then((data: any) => {
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
      .catch(() => setLoading(false));
  }, []);

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
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
      showToast("success", "SSO settings saved.");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [sso, groupRows, showToast]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-gray-400">
        Loading SSO settings…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
            toast.type === "success"
              ? "bg-green-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Single Sign-On (SSO)</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              Configure OIDC federation for your enterprise identity provider.
            </p>
          </div>
          <Link
            href="/admin/settings"
            className="text-xs text-gray-500 hover:text-gray-700 underline underline-offset-2"
          >
            ← Settings
          </Link>
        </div>

        {/* Platform status banner */}
        {!platformConfigured && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <p className="font-semibold">Platform-level OIDC not configured</p>
            <p className="mt-1 text-xs text-amber-700">
              The platform operator must set{" "}
              <code className="rounded bg-amber-100 px-1 font-mono">SSO_ISSUER</code>,{" "}
              <code className="rounded bg-amber-100 px-1 font-mono">SSO_CLIENT_ID</code>, and{" "}
              <code className="rounded bg-amber-100 px-1 font-mono">SSO_CLIENT_SECRET</code>{" "}
              environment variables to activate the OIDC provider. Enterprise-level settings
              below are saved but SSO login will not function until those vars are set.
            </p>
          </div>
        )}

        {platformConfigured && (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            Platform OIDC provider is configured. Enable SSO below to activate login for your
            enterprise.
          </div>
        )}

        {/* Enable toggle */}
        <Section title="SSO Status">
          <label className="flex cursor-pointer items-center gap-3">
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only"
                checked={sso.enabled}
                onChange={(e) => setSso((s) => ({ ...s, enabled: e.target.checked }))}
              />
              <div
                className={`h-6 w-11 rounded-full transition-colors ${
                  sso.enabled ? "bg-violet-600" : "bg-gray-300"
                }`}
              />
              <div
                className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  sso.enabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </div>
            <div>
              <span className="text-sm font-medium text-gray-800">
                {sso.enabled ? "SSO enabled" : "SSO disabled"}
              </span>
              <p className="text-xs text-gray-400">
                When enabled, users with a matching email domain will see the SSO login option.
              </p>
            </div>
          </label>
        </Section>

        {/* IdP configuration */}
        <Section title="Identity Provider">
          <Field label="Protocol">
            <select
              value={sso.protocol}
              onChange={(e) =>
                setSso((s) => ({ ...s, protocol: e.target.value as "oidc" | "saml" }))
              }
              className={inputCls}
            >
              <option value="oidc">OIDC (OpenID Connect) — Azure AD, Okta, Google Workspace</option>
              <option value="saml">SAML 2.0 — requires additional server setup</option>
            </select>
          </Field>

          <Field
            label="Issuer / Discovery URL"
            hint={
              sso.protocol === "oidc"
                ? "OIDC discovery base URL, e.g. https://login.microsoftonline.com/{tenant}/v2.0"
                : "SAML metadata URL, e.g. https://idp.example.com/saml/metadata"
            }
          >
            <input
              type="url"
              value={sso.issuer}
              onChange={(e) => setSso((s) => ({ ...s, issuer: e.target.value }))}
              placeholder="https://login.microsoftonline.com/..."
              className={inputCls}
            />
          </Field>

          {sso.protocol === "oidc" && (
            <>
              <Field label="Client ID" hint="Application (client) ID registered with your IdP">
                <input
                  type="text"
                  value={sso.clientId}
                  onChange={(e) => setSso((s) => ({ ...s, clientId: e.target.value }))}
                  className={inputCls}
                />
              </Field>

              <Field
                label="Client Secret"
                hint='Stored encrypted. Shows "••••••••" when set — leave as-is to keep existing secret.'
              >
                <input
                  type="password"
                  value={sso.clientSecret}
                  onChange={(e) => setSso((s) => ({ ...s, clientSecret: e.target.value }))}
                  placeholder="Enter new secret or leave masked to keep existing"
                  autoComplete="new-password"
                  className={inputCls}
                />
              </Field>
            </>
          )}

          <Field
            label="Email Domain"
            hint='Users with this domain see the SSO button on login. e.g. "acme.com"'
          >
            <input
              type="text"
              value={sso.emailDomain}
              onChange={(e) => setSso((s) => ({ ...s, emailDomain: e.target.value.toLowerCase() }))}
              placeholder="acme.com"
              className={inputCls}
            />
          </Field>
        </Section>

        {/* Claim mapping */}
        <Section title="Attribute Mapping">
          <p className="text-xs text-gray-400">
            Override the default OIDC claim names if your IdP uses non-standard attributes.
          </p>
          {(
            [
              { key: "email", label: "Email claim" },
              { key: "name", label: "Display name claim" },
              { key: "groups", label: "Groups claim" },
            ] as const
          ).map(({ key, label }) => (
            <Field key={key} label={label}>
              <input
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
            </Field>
          ))}
        </Section>

        {/* Group → role mapping (H2-3.2) */}
        <Section title="Group → Role Mapping">
          <p className="text-xs text-gray-400">
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
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-mono focus:border-violet-500 focus:outline-none"
                />
                <select
                  value={row.role}
                  onChange={(e) =>
                    setGroupRows((rows) =>
                      rows.map((r, j) => (j === i ? { ...r, role: e.target.value } : r))
                    )
                  }
                  className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-violet-500 focus:outline-none"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setGroupRows((rows) => rows.filter((_, j) => j !== i))}
                  className="text-gray-400 hover:text-red-500 text-lg leading-none px-1"
                  title="Remove"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={() => setGroupRows((rows) => [...rows, { group: "", role: "viewer" }])}
            className="text-xs text-violet-600 hover:text-violet-700 font-medium"
          >
            + Add mapping
          </button>

          <Field label="Default role" hint="Assigned to users not matched by any group mapping above">
            <select
              value={sso.defaultRole}
              onChange={(e) => setSso((s) => ({ ...s, defaultRole: e.target.value }))}
              className={inputCls}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Field>
        </Section>

        {/* Save */}
        <div className="flex justify-end gap-3">
          <Link
            href="/admin/settings"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
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
  );
}
