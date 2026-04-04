"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { Heading } from "@/components/catalyst/heading";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { SkeletonList } from "@/components/ui/skeleton";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { SectionHeading } from "@/components/ui/section-heading";
import Link from "next/link";
import { FormField, FormSection } from "@/components/ui/form-field";
import type { EnterpriseSettings, ApprovalChainStep } from "@/lib/settings/types";
import { DEFAULT_ENTERPRISE_SETTINGS } from "@/lib/settings/types";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<EnterpriseSettings>(DEFAULT_ENTERPRISE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        setSettings(data.settings ?? DEFAULT_ENTERPRISE_SETTINGS);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Save failed");
      }
      const data = await res.json();
      setSettings(data.settings);
      toast.success("Settings saved successfully.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [settings]);

  if (loading) {
    return (
      <div className="px-6 py-6 space-y-6">
        <SkeletonList rows={5} height="h-16" />
      </div>
    );
  }

  // ── Section jump nav ──────────────────────────────────────────────────────
  const SECTIONS = [
    { id: "branding",           label: "Branding" },
    { id: "periodic-review",    label: "Periodic Review" },
    { id: "review-sla",         label: "Review SLA" },
    { id: "governance-rules",   label: "Governance Rules" },
    { id: "notifications",      label: "Notifications" },
    { id: "approval-chain",     label: "Approval Chain" },
    { id: "deployment-targets", label: "Deployment" },
  ] as const;

  type SectionId = typeof SECTIONS[number]["id"];
  const [activeSection, setActiveSection] = useState<SectionId>("branding");

  // IntersectionObserver to track which section is in view
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(id as SectionId); },
        { rootMargin: "-20% 0px -60% 0px", threshold: 0 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function jumpTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="px-6 py-6 space-y-6">
      {/* Breadcrumb */}
      <div className="mb-2">
        <Breadcrumb items={[
          { label: "Admin", href: "/admin" },
          { label: "Settings" },
        ]} />
      </div>

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <Heading level={1}>Enterprise Settings</Heading>
          <p className="mt-0.5 text-sm text-text-secondary">
            Configure governance thresholds, SLA policies, and notification preferences.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-text px-4 py-2 text-sm font-medium text-white hover:bg-text-secondary disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Settings"}
        </button>
      </div>

      {/* Sticky section jump navigation */}
      <div className="sticky top-0 z-10 -mx-6 flex gap-0 overflow-x-auto border-b border-border bg-surface/95 px-6 backdrop-blur">
        {SECTIONS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => jumpTo(id)}
            className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-medium transition-colors ${
              activeSection === id
                ? "border-text text-text"
                : "border-transparent text-text-secondary hover:text-text"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-6">

        {/* Branding */}
        <section id="branding" className="rounded-xl border border-border bg-surface p-6">
          <FormSection title="Branding" description="Customize how Intellios appears to your users." isLast={false}>
            <FormField label="Company Name" htmlFor="company-name" description="Shown in the sidebar and compliance reports.">
              <input
                id="company-name"
                type="text"
                value={settings.branding?.companyName ?? "Intellios"}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    branding: { ...s.branding, companyName: e.target.value },
                  }))
                }
                placeholder="Intellios"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-border-strong focus:outline-none"
              />
            </FormField>
            <FormField label="Logo URL" htmlFor="logo-url" optional description="If set, displayed in the sidebar instead of the default icon.">
              <input
                id="logo-url"
                type="url"
                value={settings.branding?.logoUrl ?? ""}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    branding: { ...s.branding, logoUrl: e.target.value || null },
                  }))
                }
                placeholder="https://your-company.com/logo.png"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-border-strong focus:outline-none"
              />
            </FormField>
            <FormField label="Brand Color" htmlFor="brand-color" description="Used as the sidebar logo background color.">
              <div className="flex items-center gap-3">
                <input
                  id="brand-color"
                  type="color"
                  value={settings.branding?.primaryColor ?? "#7c3aed"}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      branding: { ...s.branding, primaryColor: e.target.value },
                    }))
                  }
                  className="h-9 w-12 cursor-pointer rounded border border-border p-0.5"
                />
                <code className="text-sm text-text-secondary">{settings.branding?.primaryColor ?? "#7c3aed"}</code>
              </div>
            </FormField>
            {/* Live preview */}
            <div className="mt-3 flex items-center gap-3 rounded-lg border border-border-subtle bg-surface-raised px-4 py-3">
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                style={{ backgroundColor: settings.branding?.primaryColor ?? "#7c3aed" }}
              >
                {(settings.branding?.companyName ?? "Intellios").charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-semibold text-text">
                {settings.branding?.companyName ?? "Intellios"}
              </span>
              <span className="ml-auto text-xs text-text-tertiary">Preview</span>
            </div>
          </FormSection>
        </section>

        {/* Periodic Review */}
        <section id="periodic-review" className="rounded-xl border border-border bg-surface p-6">
          <FormSection title="Periodic Model Review" description="SR 11-7 requires periodic model revalidation after initial deployment. Agents are automatically scheduled for review when deployed." isLast={false}>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.periodicReview?.enabled ?? true}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    periodicReview: { ...s.periodicReview, enabled: e.target.checked },
                  }))
                }
                className="mt-0.5 h-4 w-4 rounded border-border text-text focus:ring-text"
              />
              <div>
                <p className="text-sm font-medium text-text">Enable periodic review scheduling</p>
                <p className="text-xs text-text-secondary">When enabled, a review due date is set when an agent is deployed.</p>
              </div>
            </label>
            {(settings.periodicReview?.enabled ?? true) && (
              <div className="grid grid-cols-2 gap-5 pl-7 pt-4 space-y-4">
                <div>
                  <FormField label="Default review cadence (months)" htmlFor="cadence-months" description="SR 11-7 typically requires annual (12) review for high-risk models.">
                    <input
                      id="cadence-months"
                      type="number"
                      min={1}
                      max={60}
                      value={settings.periodicReview?.defaultCadenceMonths ?? 12}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          periodicReview: { ...s.periodicReview, defaultCadenceMonths: Number(e.target.value) },
                        }))
                      }
                      className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-border-strong focus:outline-none"
                    />
                  </FormField>
                </div>
                <div>
                  <FormField label="Reminder (days before due)" htmlFor="reminder-days" description="Send a reminder notification this many days in advance.">
                    <input
                      id="reminder-days"
                      type="number"
                      min={1}
                      max={180}
                      value={settings.periodicReview?.reminderDaysBefore ?? 30}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          periodicReview: { ...s.periodicReview, reminderDaysBefore: Number(e.target.value) },
                        }))
                      }
                      className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-border-strong focus:outline-none"
                    />
                  </FormField>
                </div>
              </div>
            )}
          </FormSection>
        </section>

        {/* Review SLA */}
        <section id="review-sla" className="rounded-xl border border-border bg-surface p-6">
          <FormSection title="Review SLA" description="Time thresholds for blueprints in the in_review state. Displayed as color indicators on the Pipeline Board." isLast={false}>
            <div className="grid grid-cols-2 gap-5">
              <FormField label="Warning threshold (hours)" htmlFor="warn-hours" description="Amber indicator after this many hours">
                <input
                  id="warn-hours"
                  type="number"
                  min={1}
                  max={720}
                  value={settings.sla.warnHours}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      sla: { ...s.sla, warnHours: Number(e.target.value) },
                    }))
                  }
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-border-strong focus:outline-none"
                />
              </FormField>
              <FormField label="Breach threshold (hours)" htmlFor="breach-hours" description="Red indicator after this many hours">
                <input
                  id="breach-hours"
                  type="number"
                  min={1}
                  max={720}
                  value={settings.sla.breachHours}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      sla: { ...s.sla, breachHours: Number(e.target.value) },
                    }))
                  }
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-border-strong focus:outline-none"
                />
              </FormField>
            </div>
            {settings.sla.warnHours >= settings.sla.breachHours && (
              <p className="mt-3 text-xs text-red-600">
                Warning threshold must be less than breach threshold.
              </p>
            )}
          </FormSection>
        </section>

        {/* Governance Rules */}
        <section id="governance-rules" className="rounded-xl border border-border bg-surface p-6">
          <Heading level={2} className="text-base">Governance Rules</Heading>
          <p className="mt-1 text-sm text-text-secondary">
            Control which governance gates are enforced in the design and review workflow.
          </p>
          <div className="mt-5 space-y-4">
            {(
              [
                {
                  key: "requireValidationBeforeReview" as const,
                  label: "Require validation before review",
                  description:
                    "Blueprints must have a valid governance report before they can be submitted for review.",
                },
                {
                  key: "requireAllPhase3Acknowledgments" as const,
                  label: "Require all Phase 3 acknowledgments",
                  description:
                    "All three pre-finalization review acknowledgments must be checked during intake.",
                },
                {
                  key: "allowSelfApproval" as const,
                  label: "Allow self-approval",
                  description:
                    "Allow the same user who designed a blueprint to also approve it. Disable in regulated environments (SOD requirement).",
                },
                {
                  key: "requireTestsBeforeApproval" as const,
                  label: "Require passing tests before review submission",
                  description:
                    "When enabled, designers must run and pass all test cases before a blueprint can be submitted for review. Requires at least one test case and one passing test run.",
                },
              ] as const
            ).map(({ key, label, description }) => (
              <label key={key} className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.governance[key]}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      governance: { ...s.governance, [key]: e.target.checked },
                    }))
                  }
                  className="mt-0.5 h-4 w-4 rounded border-border text-text focus:ring-text"
                />
                <div>
                  <p className="text-sm font-medium text-text">{label}</p>
                  <p className="text-xs text-text-secondary">{description}</p>
                </div>
              </label>
            ))}
          </div>
        </section>

        {/* Notifications */}
        <section id="notifications" className="rounded-xl border border-border bg-surface p-6">
          <Heading level={2} className="text-base">Notifications</Heading>
          <p className="mt-1 text-sm text-text-secondary">
            Configure alert channels for governance events. At least one channel must be set to receive notifications.
          </p>
          <div className="mt-5 space-y-6">

            {/* ── Email channel ─────────────────────────────────────────────── */}
            <div>
              <FormField label="Admin notification email" htmlFor="admin-email" description="Leave blank to notify only users with the reviewer or compliance_officer role." optional>
                <input
                  id="admin-email"
                  type="email"
                  value={settings.notifications.adminEmail ?? ""}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      notifications: {
                        ...s.notifications,
                        adminEmail: e.target.value || null,
                      },
                    }))
                  }
                  placeholder="admin@yourcompany.com"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-border-strong focus:outline-none"
                />
              </FormField>
              <div className="mt-4 space-y-3">
                {(
                  [
                    {
                      key: "notifyOnBreach" as const,
                      label: "Notify on SLA breach",
                      description: "Send email when a blueprint exceeds the breach threshold.",
                    },
                    {
                      key: "notifyOnApproval" as const,
                      label: "Notify on approval",
                      description: "Send email when a blueprint is approved or rejected.",
                    },
                  ] as const
                ).map(({ key, label, description }) => (
                  <label key={key} className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifications[key]}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          notifications: { ...s.notifications, [key]: e.target.checked },
                        }))
                      }
                      className="mt-0.5 h-4 w-4 rounded border-border text-text focus:ring-text"
                    />
                    <div>
                      <p className="text-sm font-medium text-text">{label}</p>
                      <p className="text-xs text-text-secondary">{description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* ── P2-607: Event routing matrix ──────────────────────────────── */}
            <div className="border-t border-border-subtle pt-5">
              <SectionHeading className="mb-1">
                Event Routing
              </SectionHeading>
              <p className="text-xs text-text-tertiary mb-3">
                Choose which channels receive each event type. Channel must be configured above to receive alerts.
              </p>
              {(() => {
                type EventKey = keyof NonNullable<typeof settings.notifications.routing>;
                const EVENT_LABELS: Record<EventKey, string> = {
                  blueprint_approved: "Blueprint approved",
                  blueprint_rejected: "Blueprint rejected",
                  blueprint_deployed: "Blueprint deployed",
                  policy_violation:   "Policy violation",
                  sla_breach:         "SLA breach",
                  review_assigned:    "Review assigned",
                  anomaly_detected:   "Anomaly detected",
                };
                const CHANNELS: Array<{ key: "email" | "slack" | "pagerduty"; label: string }> = [
                  { key: "email",     label: "Email" },
                  { key: "slack",     label: "Slack" },
                  { key: "pagerduty", label: "PagerDuty" },
                ];
                const routing = settings.notifications.routing ?? {};
                const DEFAULT_ROUTE = { email: true, slack: false, pagerduty: false };

                return (
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border-subtle bg-surface-raised">
                          <th className="py-2 pl-4 pr-3 text-left font-semibold text-text-secondary w-full">Event</th>
                          {CHANNELS.map((ch) => (
                            <th key={ch.key} className="px-4 py-2 text-center font-semibold text-text-secondary whitespace-nowrap">
                              {ch.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(Object.keys(EVENT_LABELS) as EventKey[]).map((evt, idx) => {
                          const row = (routing as Record<EventKey, { email: boolean; slack: boolean; pagerduty: boolean }>)[evt] ?? DEFAULT_ROUTE;
                          return (
                            <tr key={evt} className={idx % 2 === 0 ? "bg-surface" : "bg-surface-raised"}>
                              <td className="py-2 pl-4 pr-3 text-text">{EVENT_LABELS[evt]}</td>
                              {CHANNELS.map((ch) => (
                                <td key={ch.key} className="px-4 py-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={row[ch.key]}
                                    onChange={(e) =>
                                      setSettings((s) => ({
                                        ...s,
                                        notifications: {
                                          ...s.notifications,
                                          routing: {
                                            ...(s.notifications.routing ?? {}),
                                            [evt]: {
                                              ...row,
                                              [ch.key]: e.target.checked,
                                            },
                                          } as NonNullable<typeof s.notifications.routing>,
                                        },
                                      }))
                                    }
                                    className="h-4 w-4 rounded border-border text-text focus:ring-text"
                                  />
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>

            {/* ── P2-607: Digest frequency ──────────────────────────────────── */}
            <div className="border-t border-border-subtle pt-5">
              <SectionHeading className="mb-3">
                Digest Frequency
              </SectionHeading>
              <div className="flex items-center gap-3">
                {(["immediate", "daily", "weekly"] as const).map((freq) => (
                  <label key={freq} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="digestFrequency"
                      value={freq}
                      checked={(settings.notifications.digestFrequency ?? "immediate") === freq}
                      onChange={() =>
                        setSettings((s) => ({
                          ...s,
                          notifications: { ...s.notifications, digestFrequency: freq },
                        }))
                      }
                      className="h-4 w-4 border-border text-text focus:ring-text"
                    />
                    <span className="text-sm text-text capitalize">{freq}</span>
                  </label>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-text-tertiary">
                {(settings.notifications.digestFrequency ?? "immediate") === "immediate"
                  ? "Every alert is sent as it occurs."
                  : (settings.notifications.digestFrequency ?? "immediate") === "daily"
                  ? "Non-critical alerts are batched into a daily digest email."
                  : "Non-critical alerts are batched into a weekly digest email. Critical alerts (SLA breach, anomaly) are still sent immediately."}
              </p>
            </div>

            {/* ── Slack channel (P1-433) ─────────────────────────────────────── */}
            <div className="border-t border-border-subtle pt-5">
              <FormField label="Incoming webhook URL" htmlFor="slack-webhook" optional description="SLA breach and governance alerts will be posted to the channel configured in this webhook. Create one at api.slack.com/messaging/webhooks.">
                <input
                  id="slack-webhook"
                  type="url"
                  value={settings.notifications.slackWebhookUrl ?? ""}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      notifications: {
                        ...s.notifications,
                        slackWebhookUrl: e.target.value || null,
                      },
                    }))
                  }
                  placeholder="Paste your Slack Incoming Webhook URL here"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm font-mono focus:border-border-strong focus:outline-none"
                />
              </FormField>
              {settings.notifications.slackWebhookUrl && (
                <p className="mt-1 text-xs text-emerald-600">✓ Slack notifications active</p>
              )}
            </div>

            {/* ── PagerDuty channel (P1-433) ─────────────────────────────────── */}
            <div className="border-t border-border-subtle pt-5">
              <FormField label="Events API v2 integration key" htmlFor="pagerduty-key" optional description="Critical alerts (SLA breach, anomaly detected) will trigger a PagerDuty incident. Find this key in PagerDuty under Services → Integrations → Events API v2.">
                <input
                  id="pagerduty-key"
                  type="password"
                  autoComplete="new-password"
                  value={settings.notifications.pagerdutyKey ?? ""}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      notifications: {
                        ...s.notifications,
                        pagerdutyKey: e.target.value || null,
                      },
                    }))
                  }
                  placeholder="Enter integration key (32 characters)"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm font-mono focus:border-border-strong focus:outline-none"
                />
              </FormField>
              {settings.notifications.pagerdutyKey && (
                <p className="mt-1 text-xs text-emerald-600">✓ PagerDuty alerting active</p>
              )}
            </div>

          </div>
        </section>

        {/* Approval Chain */}
        <section id="approval-chain" className="rounded-xl border border-border bg-surface p-6">
          <Heading level={2} className="text-base">Approval Chain</Heading>
          <p className="mt-1 text-sm text-text-secondary">
            Define a sequential multi-step approval workflow. Each step requires a reviewer with the specified role
            to approve before the blueprint advances. Steps are enforced in order (top to bottom).
          </p>
          <p className="mt-1 text-xs text-text-tertiary">
            Leave empty to use legacy single-step approval — any reviewer or admin can approve.
          </p>

          <div className="mt-5 space-y-3">
            {(settings.approvalChain ?? []).map((step, idx) => (
              <div key={idx} className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface-raised px-4 py-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-medium text-text-secondary">
                  {idx + 1}
                </span>
                <Select
                  value={step.role}
                  onValueChange={(v) =>
                    setSettings((s) => {
                      const chain = [...(s.approvalChain ?? [])];
                      chain[idx] = { ...chain[idx], role: v as ApprovalChainStep["role"] };
                      return { ...s, approvalChain: chain };
                    })
                  }
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reviewer">reviewer</SelectItem>
                    <SelectItem value="compliance_officer">compliance_officer</SelectItem>
                    <SelectItem value="admin">admin</SelectItem>
                  </SelectContent>
                </Select>
                <input
                  type="text"
                  value={step.label}
                  onChange={(e) =>
                    setSettings((s) => {
                      const chain = [...(s.approvalChain ?? [])];
                      chain[idx] = { ...chain[idx], label: e.target.value };
                      return { ...s, approvalChain: chain };
                    })
                  }
                  placeholder="Step label (e.g. Technical Review)"
                  className="flex-1 rounded-lg border border-border px-3 py-1.5 text-sm focus:border-border-strong focus:outline-none"
                />
                <button
                  onClick={() =>
                    setSettings((s) => {
                      const chain = [...(s.approvalChain ?? [])].filter((_, i) => i !== idx)
                        .map((item, i) => ({ ...item, step: i }));
                      return { ...s, approvalChain: chain };
                    })
                  }
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            ))}

            <button
              onClick={() =>
                setSettings((s) => {
                  const chain = [...(s.approvalChain ?? [])];
                  chain.push({ step: chain.length, role: "reviewer", label: "" });
                  return { ...s, approvalChain: chain };
                })
              }
              className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text"
            >
              <span className="text-lg leading-none">+</span> Add Step
            </button>
          </div>
        </section>

        {/* Deployment Targets */}
        <section id="deployment-targets" className="rounded-xl border border-border bg-surface p-6">
          <Heading level={2} className="text-base">Deployment Targets</Heading>
          <p className="mt-1 text-sm text-text-secondary">
            Configure direct deployment targets. AWS credentials are read from server environment
            variables (<code className="text-xs bg-surface-muted px-1 rounded">AWS_ACCESS_KEY_ID</code>,{" "}
            <code className="text-xs bg-surface-muted px-1 rounded">AWS_SECRET_ACCESS_KEY</code>) or
            an instance profile — never stored in the database.
          </p>

          {/* AgentCore block */}
          <div className="mt-5 rounded-lg border border-orange-100 bg-orange-50 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-orange-100 text-sm font-semibold text-orange-700">
                  AC
                </span>
                <div>
                  <p className="text-sm font-semibold text-text">Amazon Bedrock AgentCore</p>
                  <p className="text-xs text-text-secondary">Deploy agents directly to AWS Bedrock runtime</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-secondary">
                  {settings.deploymentTargets?.agentcore?.enabled ? "Enabled" : "Disabled"}
                </span>
                <Switch
                  checked={settings.deploymentTargets?.agentcore?.enabled ?? false}
                  onChange={(v) =>
                    setSettings((s) => ({
                      ...s,
                      deploymentTargets: {
                        ...s.deploymentTargets,
                        agentcore: {
                          enabled: v,
                          region: s.deploymentTargets?.agentcore?.region ?? "us-east-1",
                          agentResourceRoleArn: s.deploymentTargets?.agentcore?.agentResourceRoleArn ?? "",
                          foundationModel:
                            s.deploymentTargets?.agentcore?.foundationModel ??
                            "anthropic.claude-3-5-sonnet-20241022-v2:0",
                          guardrailId: s.deploymentTargets?.agentcore?.guardrailId,
                          guardrailVersion: s.deploymentTargets?.agentcore?.guardrailVersion,
                        },
                      },
                    }))
                  }
                  color="orange"
                />
              </div>
            </div>

            {settings.deploymentTargets?.agentcore?.enabled && (
              <>
              <div className="mt-5 grid grid-cols-2 gap-4 space-y-4">
                <FormField label="AWS Region" htmlFor="aws-region" description="Region to deploy agents into">
                  <input
                    id="aws-region"
                    type="text"
                    value={settings.deploymentTargets.agentcore?.region ?? ""}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        deploymentTargets: {
                          ...s.deploymentTargets,
                          agentcore: {
                            ...s.deploymentTargets!.agentcore!,
                            region: e.target.value,
                          },
                        },
                      }))
                    }
                    placeholder="us-east-1"
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-border-strong focus:outline-none"
                  />
                </FormField>
                <FormField label="Foundation Model" htmlFor="foundation-model" description="Bedrock model ID for agents">
                  <input
                    id="foundation-model"
                    type="text"
                    value={settings.deploymentTargets.agentcore?.foundationModel ?? ""}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        deploymentTargets: {
                          ...s.deploymentTargets,
                          agentcore: {
                            ...s.deploymentTargets!.agentcore!,
                            foundationModel: e.target.value,
                          },
                        },
                      }))
                    }
                    placeholder="anthropic.claude-3-5-sonnet-20241022-v2:0"
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-border-strong focus:outline-none"
                  />
                </FormField>
                <div className="col-span-2">
                  <FormField label="IAM Role ARN" htmlFor="iam-role-arn" required description="ARN of the IAM service role with bedrock:InvokeModel permission. Created by your AWS administrator.">
                    <input
                      id="iam-role-arn"
                      type="text"
                      value={settings.deploymentTargets.agentcore?.agentResourceRoleArn ?? ""}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          deploymentTargets: {
                            ...s.deploymentTargets,
                            agentcore: {
                              ...s.deploymentTargets!.agentcore!,
                              agentResourceRoleArn: e.target.value,
                            },
                          },
                        }))
                      }
                      placeholder="arn:aws:iam::123456789012:role/AmazonBedrockExecutionRoleForAgents"
                      className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm font-mono focus:border-border-strong focus:outline-none"
                    />
                  </FormField>
                </div>
                <FormField label="Guardrail ID" htmlFor="guardrail-id" optional description="Bedrock Guardrail identifier">
                  <input
                    id="guardrail-id"
                    type="text"
                    value={settings.deploymentTargets.agentcore?.guardrailId ?? ""}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        deploymentTargets: {
                          ...s.deploymentTargets,
                          agentcore: {
                            ...s.deploymentTargets!.agentcore!,
                            guardrailId: e.target.value || undefined,
                          },
                        },
                      }))
                    }
                    placeholder="abc123def456"
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-border-strong focus:outline-none"
                  />
                </FormField>
                <FormField label="Guardrail Version" htmlFor="guardrail-version" optional description="Required when Guardrail ID is set">
                  <input
                    id="guardrail-version"
                    type="text"
                    value={settings.deploymentTargets.agentcore?.guardrailVersion ?? ""}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        deploymentTargets: {
                          ...s.deploymentTargets,
                          agentcore: {
                            ...s.deploymentTargets!.agentcore!,
                            guardrailVersion: e.target.value || undefined,
                          },
                        },
                      }))
                    }
                    placeholder="DRAFT"
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-border-strong focus:outline-none"
                  />
                </FormField>
              </div>
              {/* P2-502: Validate deployment target */}
              <ValidateDeploymentTargetButton
                config={{
                  region: settings.deploymentTargets?.agentcore?.region ?? "",
                  agentResourceRoleArn: settings.deploymentTargets?.agentcore?.agentResourceRoleArn ?? "",
                  foundationModel: settings.deploymentTargets?.agentcore?.foundationModel ?? "",
                }}
              />
              </>
            )}
          </div>
        </section>

        <div className="flex justify-end pb-8">
          <button
            onClick={handleSave}
            disabled={saving || settings.sla.warnHours >= settings.sla.breachHours}
            className="rounded-lg bg-text px-6 py-2.5 text-sm font-medium text-white hover:bg-text-secondary disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── P2-502: Validate Deployment Target ──────────────────────────────────────
interface ValidateCheck {
  label: string;
  ok: boolean;
  detail: string;
}

function ValidateDeploymentTargetButton({ config }: {
  config: { region: string; agentResourceRoleArn: string; foundationModel: string };
}) {
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [checks, setChecks] = useState<ValidateCheck[]>([]);

  async function handleValidate() {
    setStatus("running");
    setChecks([]);
    try {
      const res = await fetch("/api/admin/settings/validate-deployment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      setChecks(data.checks ?? []);
      setStatus("done");
    } catch {
      setStatus("error");
      setChecks([{ label: "Network", ok: false, detail: "Could not reach validation endpoint." }]);
    }
  }

  return (
    <div className="mt-4 space-y-3">
      <button
        onClick={handleValidate}
        disabled={status === "running"}
        className="rounded-lg border border-border bg-surface-raised px-4 py-2 text-sm font-medium text-text hover:bg-surface-muted disabled:opacity-50 transition-colors"
      >
        {status === "running" ? "Validating…" : "Validate Deployment Target"}
      </button>
      {checks.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          {checks.map((c) => (
            <div
              key={c.label}
              className={`flex items-start gap-3 px-4 py-3 border-b border-border-subtle last:border-b-0 ${
                c.ok ? "bg-surface" : "bg-red-50/40"
              }`}
            >
              <span className={`mt-0.5 shrink-0 text-base leading-none ${c.ok ? "text-green-500" : "text-red-500"}`}>
                {c.ok ? "✓" : "✗"}
              </span>
              <div className="min-w-0">
                <p className={`text-xs font-semibold ${c.ok ? "text-text" : "text-red-700"}`}>{c.label}</p>
                <p className={`text-xs mt-0.5 ${c.ok ? "text-text-secondary" : "text-red-600"}`}>{c.detail}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
