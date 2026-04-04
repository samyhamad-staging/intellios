"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { Heading, Subheading } from "@/components/catalyst/heading";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { SectionHeading } from "@/components/ui/section-heading";
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from "@/components/ui/table";
import { SkeletonList } from "@/components/ui/skeleton";
import { FormField, FormSection } from "@/components/ui/form-field";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WebhookRecord {
  id: string;
  enterpriseId: string | null;
  name: string;
  url: string;
  events: string[];
  active: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface DeliveryRecord {
  id: string;
  eventType: string;
  status: "pending" | "success" | "failed";
  responseStatus: number | null;
  attempts: number;
  lastAttemptedAt: string | null;
  createdAt: string;
}

interface WebhookDetail extends WebhookRecord {
  deliveries: DeliveryRecord[];
}

// ─── All EventType values grouped for the event subscription UI ───────────────

const EVENT_GROUPS: { label: string; events: string[] }[] = [
  {
    label: "Blueprint",
    events: [
      "blueprint.created",
      "blueprint.refined",
      "blueprint.status_changed",
      "blueprint.reviewed",
      "blueprint.report_exported",
      "blueprint.health_checked",
      "blueprint.cloned",
      "blueprint.approval_step_completed",
      "blueprint.test_run_completed",
    ],
  },
  {
    label: "Policy",
    events: ["policy.created", "policy.updated", "policy.deleted", "policy.simulated"],
  },
  {
    label: "Intake",
    events: ["intake.finalized", "intake.contribution_submitted"],
  },
  {
    label: "Settings",
    events: ["settings.updated"],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

// P2-552: Enhanced delivery row with color-coded status + retry context
function DeliveryRow({ d }: { d: DeliveryRecord }) {
  const statusBadge =
    d.status === "success" ? (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">
        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
        success
      </span>
    ) : d.status === "failed" ? (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
        failed
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        pending
      </span>
    );

  const httpColor =
    d.responseStatus === null ? "text-text-tertiary"
    : d.responseStatus >= 200 && d.responseStatus < 300 ? "text-green-700 font-medium"
    : d.responseStatus >= 400 ? "text-red-600 font-medium"
    : "text-text-secondary";

  return (
    <TableRow className={d.status === "failed" ? "bg-red-50/30" : undefined}>
      <TableCell className="text-text-secondary whitespace-nowrap" title={formatDate(d.createdAt)}>
        {formatRelative(d.createdAt)}
      </TableCell>
      <TableCell className="font-mono text-xs text-text">{d.eventType}</TableCell>
      <TableCell>{statusBadge}</TableCell>
      <TableCell className={httpColor}>
        {d.responseStatus ?? "—"}
      </TableCell>
      <TableCell className="text-text-secondary">{d.attempts}</TableCell>
      <TableCell className="text-text-tertiary text-xs whitespace-nowrap">
        {d.lastAttemptedAt ? (
          <span title={`Last attempt: ${formatDate(d.lastAttemptedAt)}`}>
            {formatRelative(d.lastAttemptedAt)}
          </span>
        ) : "—"}
      </TableCell>
    </TableRow>
  );
}

// P2-552: Delivery log summary header
function DeliveryLogHeader({ deliveries, onRefresh, loading }: {
  deliveries: DeliveryRecord[];
  onRefresh: () => void;
  loading: boolean;
}) {
  const success = deliveries.filter((d) => d.status === "success").length;
  const failed = deliveries.filter((d) => d.status === "failed").length;
  const pending = deliveries.filter((d) => d.status === "pending").length;

  function exportCsv() {
    const rows = [
      ["when", "event", "status", "http_status", "attempts", "last_attempt"],
      ...deliveries.map((d) => [
        d.createdAt,
        d.eventType,
        d.status,
        d.responseStatus ?? "",
        d.attempts,
        d.lastAttemptedAt ?? "",
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `webhook-deliveries.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mb-2 flex items-center justify-between">
      <div className="flex items-center gap-3 text-xs">
        <span className="text-text-secondary">{deliveries.length} deliveries</span>
        {success > 0 && <span className="text-green-700 font-medium">✓ {success} success</span>}
        {failed > 0 && <span className="text-red-600 font-medium">✗ {failed} failed</span>}
        {pending > 0 && <span className="text-amber-600">{pending} pending</span>}
      </div>
      <div className="flex items-center gap-2">
        {deliveries.length > 0 && (
          <button onClick={exportCsv} className="text-xs text-text-tertiary hover:text-text-secondary underline">
            Export CSV
          </button>
        )}
        <button
          onClick={onRefresh}
          disabled={loading}
          className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-40"
        >
          {loading ? "Refreshing…" : "↻ Refresh"}
        </button>
      </div>
    </div>
  );
}

function WebhookCard({
  wh,
  onToggleActive,
  onDelete,
  onTest,
  onRotateSecret,
  onRefreshDeliveries,
}: {
  wh: WebhookRecord;
  onToggleActive: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
  onTest: (id: string) => void;
  onRotateSecret: (id: string) => void;
  onRefreshDeliveries: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([]);
  const [loadingDeliveries, setLoadingDeliveries] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const fetchDeliveries = useCallback(async () => {
    setLoadingDeliveries(true);
    try {
      const res = await fetch(`/api/admin/webhooks/${wh.id}`);
      if (res.ok) {
        const data = await res.json();
        setDeliveries(data.deliveries ?? []);
      }
    } finally {
      setLoadingDeliveries(false);
    }
  }, [wh.id]);

  const handleExpandDeliveries = useCallback(async () => {
    if (!expanded) {
      await fetchDeliveries();
    }
    setExpanded((v) => !v);
  }, [expanded, fetchDeliveries]);

  return (
    <div className="rounded-lg border border-border bg-surface overflow-hidden">
      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${wh.active ? "bg-green-500" : "bg-text-tertiary"}`}
          />
          <div className="min-w-0">
            <div className="font-medium text-sm text-text">{wh.name}</div>
            <div className="text-xs text-text-tertiary font-mono truncate max-w-xs mt-0.5">{wh.url}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Active toggle */}
          <button
            onClick={() => onToggleActive(wh.id, !wh.active)}
            className={`text-xs px-2 py-1 rounded ${
              wh.active
                ? "bg-green-50 text-green-700 hover:bg-green-100"
                : "bg-surface-muted text-text-secondary hover:bg-surface-muted"
            }`}
          >
            {wh.active ? "Active" : "Paused"}
          </button>
          <button
            onClick={() => onTest(wh.id)}
            className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100"
          >
            Test
          </button>
          <button
            onClick={handleExpandDeliveries}
            className="text-xs px-2 py-1 rounded bg-surface-raised text-text-secondary hover:bg-surface-muted"
          >
            {expanded ? "Hide log" : "Delivery log"}
          </button>
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-xs px-2 py-1 rounded text-red-500 hover:bg-red-50"
            >
              Delete
            </button>
          ) : (
            <span className="flex items-center gap-1">
              <button
                onClick={() => onDelete(wh.id)}
                className="text-xs px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700"
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-xs px-2 py-1 rounded text-text-secondary hover:bg-surface-muted"
              >
                Cancel
              </button>
            </span>
          )}
        </div>
      </div>

      {/* Event subscriptions */}
      <div className="border-t border-border-subtle px-4 py-2 flex flex-wrap gap-1 items-center">
        <span className="text-xs text-text-tertiary mr-1">Events:</span>
        {wh.events.length === 0 ? (
          <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
            All events
          </span>
        ) : (
          wh.events.map((evt) => (
            <span
              key={evt}
              className="text-xs bg-surface-muted text-text-secondary px-2 py-0.5 rounded-full font-mono"
            >
              {evt}
            </span>
          ))
        )}
        <button
          onClick={() => onRotateSecret(wh.id)}
          className="ml-auto text-xs text-amber-600 hover:text-amber-700 hover:underline"
        >
          Rotate secret
        </button>
      </div>

      {/* P2-552: Delivery log — enhanced with summary header, CSV export, refresh */}
      {expanded && (
        <div className="border-t border-border-subtle px-4 py-3">
          {loadingDeliveries ? (
            <p className="text-xs text-text-tertiary">Loading deliveries…</p>
          ) : (
            <>
              <DeliveryLogHeader
                deliveries={deliveries}
                onRefresh={fetchDeliveries}
                loading={loadingDeliveries}
              />
              {deliveries.length === 0 ? (
                <p className="text-xs text-text-tertiary">No deliveries yet.</p>
              ) : (
                <Table dense>
                  <TableHead>
                    <TableRow>
                      <TableHeader>When</TableHeader>
                      <TableHeader>Event</TableHeader>
                      <TableHeader>Status</TableHeader>
                      <TableHeader>HTTP</TableHeader>
                      <TableHeader>Attempts</TableHeader>
                      <TableHeader>Last attempt</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {deliveries.map((d) => (
                      <DeliveryRow key={d.id} d={d} />
                    ))}
                  </TableBody>
                </Table>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminWebhooksPage() {
  const [webhookList, setWebhookList] = useState<WebhookRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formEvents, setFormEvents] = useState<string[]>([]);
  const [formAllEvents, setFormAllEvents] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Secret reveal state (shown once after registration or rotation)
  const [revealedSecret, setRevealedSecret] = useState<{
    name: string;
    secret: string;
    type: "new" | "rotated";
  } | null>(null);

  // Test result state
  const [testResult, setTestResult] = useState<{
    id: string;
    status: string;
    responseStatus: number | null;
  } | null>(null);


  // Load webhooks
  const loadWebhooks = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/webhooks");
      if (res.ok) {
        const data = await res.json();
        setWebhookList(data.webhooks ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWebhooks();
  }, [loadWebhooks]);

  // Toggle event in selection
  const toggleEvent = useCallback((evt: string) => {
    setFormEvents((prev) =>
      prev.includes(evt) ? prev.filter((e) => e !== evt) : [...prev, evt]
    );
  }, []);

  // Register new webhook
  const handleRegister = useCallback(async () => {
    setFormError(null);
    if (!formName.trim()) { setFormError("Name is required."); return; }
    if (!formUrl.trim()) { setFormError("URL is required."); return; }
    if (!formUrl.startsWith("https://")) { setFormError("URL must start with https://"); return; }

    setRegistering(true);
    try {
      const res = await fetch("/api/admin/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          url: formUrl,
          events: formAllEvents ? [] : formEvents,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.message ?? "Registration failed.");
        return;
      }
      // Show secret once
      setRevealedSecret({ name: formName, secret: data.webhook.secret, type: "new" });
      setShowForm(false);
      setFormName("");
      setFormUrl("");
      setFormEvents([]);
      setFormAllEvents(true);
      await loadWebhooks();
    } finally {
      setRegistering(false);
    }
  }, [formName, formUrl, formEvents, formAllEvents, loadWebhooks]);

  // Toggle active
  const handleToggleActive = useCallback(async (id: string, active: boolean) => {
    try {
      const res = await fetch(`/api/admin/webhooks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      if (res.ok) {
        setWebhookList((prev) =>
          prev.map((wh) => (wh.id === id ? { ...wh, active } : wh))
        );
        toast.success(active ? "Webhook activated." : "Webhook paused.");
      }
    } catch {
      toast.error("Failed to update webhook.");
    }
  }, []);

  // Delete webhook
  const handleDelete = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/admin/webhooks/${id}`, { method: "DELETE" });
      if (res.ok) {
        setWebhookList((prev) => prev.filter((wh) => wh.id !== id));
        toast.success("Webhook deleted.");
      }
    } catch {
      toast.error("Failed to delete webhook.");
    }
  }, []);

  // Test delivery
  const handleTest = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/admin/webhooks/${id}/test`, { method: "POST" });
      const data = await res.json();
      setTestResult({ id, status: data.status, responseStatus: data.responseStatus });
      setTimeout(() => setTestResult(null), 6000);
    } catch {
      toast.error("Test delivery failed.");
    }
  }, []);

  // Rotate secret
  const handleRotateSecret = useCallback(async (id: string) => {
    const wh = webhookList.find((w) => w.id === id);
    if (!wh) return;
    try {
      const res = await fetch(`/api/admin/webhooks/${id}/rotate-secret`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setRevealedSecret({ name: wh.name, secret: data.secret, type: "rotated" });
      }
    } catch {
      toast.error("Failed to rotate secret.");
    }
  }, [webhookList]);

  if (loading) {
    return (
      <div className="px-6 py-6 space-y-4">
        <SkeletonList rows={3} height="h-20" />
      </div>
    );
  }

  return (
    <div className="px-6 py-6 space-y-6">
      {/* Breadcrumb */}
      <div className="mb-2">
        <Breadcrumb items={[
          { label: "Admin", href: "/admin" },
          { label: "Webhooks" },
        ]} />
      </div>

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <Heading level={1}>Webhook Integrations</Heading>
          <p className="mt-1 text-sm text-text-secondary">
            Register HTTPS endpoints to receive signed lifecycle events from Intellios.
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-text px-4 py-2 text-sm font-medium text-white hover:bg-text-secondary"
        >
          {showForm ? "Cancel" : "Add Webhook"}
        </button>
      </div>

      <div>

        {/* Secret reveal banner */}
        {revealedSecret && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-4">
            <div className="flex items-start justify-between">
              <div className="text-sm font-medium text-amber-800">
                {revealedSecret.type === "new" ? "Webhook registered" : "Secret rotated"} —{" "}
                <strong>{revealedSecret.name}</strong>
              </div>
              <button
                onClick={() => setRevealedSecret(null)}
                className="text-amber-400 hover:text-amber-600 text-lg leading-none"
              >
                ×
              </button>
            </div>
            <p className="mt-1 text-xs text-amber-700">
              Copy this signing secret now. It will <strong>not</strong> be shown again.
            </p>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 rounded bg-amber-100 px-3 py-1.5 text-xs font-mono text-amber-900 break-all">
                {revealedSecret.secret}
              </code>
              <button
                onClick={() => {
                  void navigator.clipboard.writeText(revealedSecret.secret);
                  toast.success("Secret copied to clipboard.");
                }}
                className="flex-shrink-0 rounded bg-amber-200 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-300"
              >
                Copy
              </button>
            </div>
          </div>
        )}

        {/* Test result banner */}
        {testResult && (
          <div
            className={`mb-6 rounded-lg border px-4 py-3 text-sm ${
              testResult.status === "success"
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            <strong>Test delivery {testResult.status}</strong> — HTTP{" "}
            {testResult.responseStatus ?? "no response"}
          </div>
        )}

        {/* Add Webhook Form */}
        {showForm && (
          <div className="mb-6 rounded-lg border border-border bg-surface px-6 py-5">
            <Heading level={2} className="mb-4 text-sm">Register New Webhook</Heading>

            {formError && (
              <div className="mb-3 rounded bg-red-50 px-3 py-2 text-xs text-red-700">
                {formError}
              </div>
            )}

            <div className="space-y-4">
              <FormField label="Name" htmlFor="webhook-name">
                <input
                  id="webhook-name"
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. CI/CD Pipeline, Slack Bot, SIEM"
                  className="w-full rounded border border-border px-3 py-2 text-sm focus:border-border-strong focus:outline-none"
                />
              </FormField>

              <FormField label="URL" htmlFor="webhook-url" description="must be https://">
                <input
                  id="webhook-url"
                  type="url"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder="https://example.com/webhook"
                  className="w-full rounded border border-border px-3 py-2 text-sm focus:border-border-strong focus:outline-none"
                />
              </FormField>

              <div>
                <label className="mb-2 block text-xs font-medium text-text">
                  Event Subscriptions
                </label>
                <label className="mb-2 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={formAllEvents}
                    onChange={(e) => setFormAllEvents(e.target.checked)}
                  />
                  <span className="text-text">Subscribe to all events</span>
                </label>

                {!formAllEvents && (
                  <div className="mt-2 space-y-3 rounded border border-border p-3">
                    {EVENT_GROUPS.map((group) => (
                      <div key={group.label}>
                        <SectionHeading className="mb-1.5 text-xs">
                          {group.label}
                        </SectionHeading>
                        <div className="flex flex-wrap gap-2">
                          {group.events.map((evt) => (
                            <label key={evt} className="flex items-center gap-1.5 text-xs">
                              <input
                                type="checkbox"
                                checked={formEvents.includes(evt)}
                                onChange={() => toggleEvent(evt)}
                              />
                              <span className="font-mono text-text">{evt}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 flex items-center gap-3">
              <button
                onClick={() => void handleRegister()}
                disabled={registering}
                className="rounded-lg bg-text px-4 py-2 text-sm font-medium text-white hover:bg-text-secondary disabled:opacity-50"
              >
                {registering ? "Registering…" : "Register Webhook"}
              </button>
              <button
                onClick={() => { setShowForm(false); setFormError(null); }}
                className="text-sm text-text-secondary hover:text-text"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Webhook list */}
        {webhookList.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-surface py-16 text-center">
            <div className="text-3xl">🔗</div>
            <Heading level={3} className="mt-3 text-sm">No webhooks registered</Heading>
            <p className="mt-1 text-sm text-text-secondary">
              Register a webhook to start receiving lifecycle events.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 rounded-lg bg-text px-4 py-2 text-sm font-medium text-white hover:bg-text-secondary"
            >
              Add Webhook
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {webhookList.map((wh) => (
              <WebhookCard
                key={wh.id}
                wh={wh}
                onToggleActive={handleToggleActive}
                onDelete={handleDelete}
                onTest={handleTest}
                onRotateSecret={handleRotateSecret}
                onRefreshDeliveries={() => {}}
              />
            ))}
          </div>
        )}

        {/* Documentation block */}
        <div className="mt-8 rounded-lg border border-border bg-surface px-6 py-5">
          <Heading level={2} className="mb-3 text-sm">Verifying Webhook Signatures</Heading>
          <p className="text-sm text-text-secondary mb-3">
            Every request includes a{" "}
            <code className="font-mono text-xs bg-surface-muted px-1 rounded">X-Intellios-Signature</code>{" "}
            header. Compute <code className="font-mono text-xs bg-surface-muted px-1 rounded">HMAC-SHA256(secret, rawBody)</code>{" "}
            and compare with the header value (after stripping the{" "}
            <code className="font-mono text-xs bg-surface-muted px-1 rounded">sha256=</code> prefix) to
            verify authenticity.
          </p>
          <div className="rounded bg-surface-raised border border-border px-4 py-3 font-mono text-xs text-text whitespace-pre">
{`// Node.js verification example
const crypto = require('crypto');

function verifySignature(secret, body, header) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  const received = header.replace('sha256=', '');
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(received)
  );
}`}
          </div>
          <p className="mt-3 text-xs text-text-secondary">
            Additional headers:{" "}
            <code className="font-mono bg-surface-muted px-1 rounded">X-Intellios-Event</code> (event type),{" "}
            <code className="font-mono bg-surface-muted px-1 rounded">X-Intellios-Delivery</code> (delivery UUID).
          </p>
        </div>
      </div>
    </div>
  );
}
