"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { SkeletonList } from "@/components/ui/skeleton";
import Link from "next/link";
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
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Enterprise Settings</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Configure governance thresholds, SLA policies, and notification preferences.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Settings"}
        </button>
      </div>

      {/* Sticky section jump navigation */}
      <div className="sticky top-0 z-10 -mx-6 flex gap-0 overflow-x-auto border-b border-gray-200 bg-white/95 px-6 backdrop-blur">
        {SECTIONS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => jumpTo(id)}
            className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-medium transition-colors ${
              activeSection === id
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-6">

        {/* Branding */}
        <section id="branding" className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-base font-semibold text-gray-900">Branding</h2>
          <p className="mt-1 text-sm text-gray-500">
            Customize how Intellios appears to your users.
          </p>
          <div className="mt-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Company Name</label>
              <p className="text-xs text-gray-400 mt-0.5">Shown in the sidebar and compliance reports.</p>
              <input
                type="text"
                value={settings.branding?.companyName ?? "Intellios"}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    branding: { ...s.branding, companyName: e.target.value },
                  }))
                }
                placeholder="Intellios"
                className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Logo URL <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <p className="text-xs text-gray-400 mt-0.5">If set, displayed in the sidebar instead of the default icon.</p>
              <input
                type="url"
                value={settings.branding?.logoUrl ?? ""}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    branding: { ...s.branding, logoUrl: e.target.value || null },
                  }))
                }
                placeholder="https://your-company.com/logo.png"
                className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Brand Color</label>
              <p className="text-xs text-gray-400 mt-0.5">Used as the sidebar logo background color.</p>
              <div className="mt-2 flex items-center gap-3">
                <input
                  type="color"
                  value={settings.branding?.primaryColor ?? "#7c3aed"}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      branding: { ...s.branding, primaryColor: e.target.value },
                    }))
                  }
                  className="h-9 w-12 cursor-pointer rounded border border-gray-200 p-0.5"
                />
                <code className="text-sm text-gray-600">{settings.branding?.primaryColor ?? "#7c3aed"}</code>
              </div>
            </div>
            {/* Live preview */}
            <div className="mt-3 flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                style={{ backgroundColor: settings.branding?.primaryColor ?? "#7c3aed" }}
              >
                {(settings.branding?.companyName ?? "Intellios").charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {settings.branding?.companyName ?? "Intellios"}
              </span>
              <span className="ml-auto text-xs text-gray-400">Preview</span>
            </div>
          </div>
        </section>

        {/* Periodic Review */}
        <section id="periodic-review" className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-base font-semibold text-gray-900">Periodic Model Review</h2>
          <p className="mt-1 text-sm text-gray-500">
            SR 11-7 requires periodic model revalidation after initial deployment.
            Agents are automatically scheduled for review when deployed.
          </p>
          <div className="mt-5 space-y-4">
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
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
              />
              <div>
                <p className="text-sm font-medium text-gray-900">Enable periodic review scheduling</p>
                <p className="text-xs text-gray-500">When enabled, a review due date is set when an agent is deployed.</p>
              </div>
            </label>
            {(settings.periodicReview?.enabled ?? true) && (
              <div className="grid grid-cols-2 gap-5 pl-7">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Default review cadence (months)
                  </label>
                  <p className="text-xs text-gray-400 mt-0.5">SR 11-7 typically requires annual (12) review for high-risk models.</p>
                  <input
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
                    className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Reminder (days before due)
                  </label>
                  <p className="text-xs text-gray-400 mt-0.5">Send a reminder notification this many days in advance.</p>
                  <input
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
                    className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Review SLA */}
        <section id="review-sla" className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-base font-semibold text-gray-900">Review SLA</h2>
          <p className="mt-1 text-sm text-gray-500">
            Time thresholds for blueprints in the <code className="text-xs bg-gray-100 px-1 rounded">in_review</code> state.
            Displayed as color indicators on the Pipeline Board.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Warning threshold (hours)
              </label>
              <p className="text-xs text-gray-400 mt-0.5">Amber indicator after this many hours</p>
              <input
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
                className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Breach threshold (hours)
              </label>
              <p className="text-xs text-gray-400 mt-0.5">Red indicator after this many hours</p>
              <input
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
                className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
              />
            </div>
          </div>
          {settings.sla.warnHours >= settings.sla.breachHours && (
            <p className="mt-3 text-xs text-red-600">
              Warning threshold must be less than breach threshold.
            </p>
          )}
        </section>

        {/* Governance Rules */}
        <section id="governance-rules" className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-base font-semibold text-gray-900">Governance Rules</h2>
          <p className="mt-1 text-sm text-gray-500">
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
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">{label}</p>
                  <p className="text-xs text-gray-500">{description}</p>
                </div>
              </label>
            ))}
          </div>
        </section>

        {/* Notifications */}
        <section id="notifications" className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-base font-semibold text-gray-900">Notifications</h2>
          <p className="mt-1 text-sm text-gray-500">
            Configure alert channels for governance events. At least one channel must be set to receive notifications.
          </p>
          <div className="mt-5 space-y-6">

            {/* ── Email channel ─────────────────────────────────────────────── */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Email</p>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Admin notification email
                </label>
                <p className="text-xs text-gray-400 mt-0.5">
                  Leave blank to notify only users with the reviewer or compliance_officer role.
                </p>
                <input
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
                  className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
                />
              </div>
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
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{label}</p>
                      <p className="text-xs text-gray-500">{description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* ── P2-607: Event routing matrix ──────────────────────────────── */}
            <div className="border-t border-gray-100 pt-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                Event Routing
              </p>
              <p className="text-xs text-gray-400 mb-3">
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
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50">
                          <th className="py-2 pl-4 pr-3 text-left font-semibold text-gray-500 w-full">Event</th>
                          {CHANNELS.map((ch) => (
                            <th key={ch.key} className="px-4 py-2 text-center font-semibold text-gray-500 whitespace-nowrap">
                              {ch.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(Object.keys(EVENT_LABELS) as EventKey[]).map((evt, idx) => {
                          const row = (routing as Record<EventKey, { email: boolean; slack: boolean; pagerduty: boolean }>)[evt] ?? DEFAULT_ROUTE;
                          return (
                            <tr key={evt} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                              <td className="py-2 pl-4 pr-3 text-gray-700">{EVENT_LABELS[evt]}</td>
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
                                    className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
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
            <div className="border-t border-gray-100 pt-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                Digest Frequency
              </p>
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
                      className="h-4 w-4 border-gray-300 text-gray-900 focus:ring-gray-900"
                    />
                    <span className="text-sm text-gray-700 capitalize">{freq}</span>
                  </label>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-gray-400">
                {(settings.notifications.digestFrequency ?? "immediate") === "immediate"
                  ? "Every alert is sent as it occurs."
                  : (settings.notifications.digestFrequency ?? "immediate") === "daily"
                  ? "Non-critical alerts are batched into a daily digest email."
                  : "Non-critical alerts are batched into a weekly digest email. Critical alerts (SLA breach, anomaly) are still sent immediately."}
              </p>
            </div>

            {/* ── Slack channel (P1-433) ─────────────────────────────────────── */}
            <div className="border-t border-gray-100 pt-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Slack</p>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Incoming webhook URL
                </label>
                <p className="text-xs text-gray-400 mt-0.5">
                  SLA breach and governance alerts will be posted to the channel configured in this webhook.
                  Create one at{" "}
                  <a
                    href="https://api.slack.com/messaging/webhooks"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-gray-600"
                  >
                    api.slack.com/messaging/webhooks
                  </a>
                  .
                </p>
                <input
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
                  className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono focus:border-gray-400 focus:outline-none"
                />
                {settings.notifications.slackWebhookUrl && (
                  <p className="mt-1 text-xs text-emerald-600">✓ Slack notifications active</p>
                )}
              </div>
            </div>

            {/* ── PagerDuty channel (P1-433) ─────────────────────────────────── */}
            <div className="border-t border-gray-100 pt-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">PagerDuty</p>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Events API v2 integration key
                </label>
                <p className="text-xs text-gray-400 mt-0.5">
                  Critical alerts (SLA breach, anomaly detected) will trigger a PagerDuty incident.
                  Find this key in PagerDuty under Services → Integrations → Events API v2.
                </p>
                <input
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
                  className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono focus:border-gray-400 focus:outline-none"
                />
                {settings.notifications.pagerdutyKey && (
                  <p className="mt-1 text-xs text-emerald-600">✓ PagerDuty alerting active</p>
                )}
              </div>
            </div>

          </div>
        </section>

        {/* Approval Chain */}
        <section id="approval-chain" className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-base font-semibold text-gray-900">Approval Chain</h2>
          <p className="mt-1 text-sm text-gray-500">
            Define a sequential multi-step approval workflow. Each step requires a reviewer with the specified role
            to approve before the blueprint advances. Steps are enforced in order (top to bottom).
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Leave empty to use legacy single-step approval — any reviewer or admin can approve.
          </p>

          <div className="mt-5 space-y-3">
            {(settings.approvalChain ?? []).map((step, idx) => (
              <div key={idx} className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-600">
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
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-gray-400 focus:outline-none"
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
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800"
            >
              <span className="text-lg leading-none">+</span> Add Step
            </button>
          </div>
        </section>

        {/* Deployment Targets */}
        <section id="deployment-targets" className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-base font-semibold text-gray-900">Deployment Targets</h2>
          <p className="mt-1 text-sm text-gray-500">
            Configure direct deployment targets. AWS credentials are read from server environment
            variables (<code className="text-xs bg-gray-100 px-1 rounded">AWS_ACCESS_KEY_ID</code>,{" "}
            <code className="text-xs bg-gray-100 px-1 rounded">AWS_SECRET_ACCESS_KEY</code>) or
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
                  <p className="text-sm font-semibold text-gray-900">Amazon Bedrock AgentCore</p>
                  <p className="text-xs text-gray-500">Deploy agents directly to AWS Bedrock runtime</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">
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
              <div className="mt-5 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">AWS Region</label>
                  <p className="text-xs text-gray-400 mt-0.5">Region to deploy agents into</p>
                  <input
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
                    className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Foundation Model</label>
                  <p className="text-xs text-gray-400 mt-0.5">Bedrock model ID for agents</p>
                  <input
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
                    className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    IAM Role ARN
                    <span className="ml-1.5 text-red-500">*</span>
                  </label>
                  <p className="text-xs text-gray-400 mt-0.5">
                    ARN of the IAM service role with{" "}
                    <code className="text-xs bg-gray-100 px-0.5 rounded">bedrock:InvokeModel</code>{" "}
                    permission. Created by your AWS administrator.
                  </p>
                  <input
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
                    className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-mono focus:border-gray-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Guardrail ID <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <p className="text-xs text-gray-400 mt-0.5">Bedrock Guardrail identifier</p>
                  <input
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
                    className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Guardrail Version <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <p className="text-xs text-gray-400 mt-0.5">Required when Guardrail ID is set</p>
                  <input
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
                    className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
                  />
                </div>
              </div>
              {/* P2-502: Validate deployment target */}
              <ValidateDeploymentTargetButton
                config={{
                  region: settings.deploymentTargets?.agentcore?.region ?? "",
                  agentResourceRoleArn: settings.deploymentTargets?.agentcore?.agentResourceRoleArn ?? "",
                  foundationModel: settings.deploymentTargets?.agentcore?.foundationModel ?? "",
                }}
              />
            )}
          </div>
        </section>

        <div className="flex justify-end pb-8">
          <button
            onClick={handleSave}
            disabled={saving || settings.sla.warnHours >= settings.sla.breachHours}
            className="rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
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
        className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 transition-colors"
      >
        {status === "running" ? "Validating…" : "Validate Deployment Target"}
      </button>
      {checks.length > 0 && (
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          {checks.map((c) => (
            <div
              key={c.label}
              className={`flex items-start gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0 ${
                c.ok ? "bg-white" : "bg-red-50/40"
              }`}
            >
              <span className={`mt-0.5 shrink-0 text-base leading-none ${c.ok ? "text-green-500" : "text-red-500"}`}>
                {c.ok ? "✓" : "✗"}
              </span>
              <div className="min-w-0">
                <p className={`text-xs font-semibold ${c.ok ? "text-gray-700" : "text-red-700"}`}>{c.label}</p>
                <p className={`text-xs mt-0.5 ${c.ok ? "text-gray-500" : "text-red-600"}`}>{c.detail}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
