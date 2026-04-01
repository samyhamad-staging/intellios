"use client";

import { useState, useEffect, useCallback } from "react";
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

      <div className="space-y-6">

        {/* Branding */}
        <section className="rounded-xl border border-gray-200 bg-white p-6">
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
        <section className="rounded-xl border border-gray-200 bg-white p-6">
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
        <section className="rounded-xl border border-gray-200 bg-white p-6">
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
        <section className="rounded-xl border border-gray-200 bg-white p-6">
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
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-base font-semibold text-gray-900">Notifications</h2>
          <p className="mt-1 text-sm text-gray-500">
            Configure who receives email alerts for governance events.
          </p>
          <div className="mt-5 space-y-4">
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
        </section>

        {/* Approval Chain */}
        <section className="rounded-xl border border-gray-200 bg-white p-6">
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
        <section className="rounded-xl border border-gray-200 bg-white p-6">
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
