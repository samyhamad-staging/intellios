"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import Link from "next/link";

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

function DeliveryRow({ d }: { d: DeliveryRecord }) {
  return (
    <tr className="border-t border-gray-100 text-xs">
      <td className="py-1.5 pr-3 text-gray-500">{formatRelative(d.createdAt)}</td>
      <td className="py-1.5 pr-3 font-mono text-gray-700">{d.eventType}</td>
      <td className="py-1.5 pr-3">
        {d.status === "success" ? (
          <span className="text-green-600 font-medium">✓ success</span>
        ) : d.status === "failed" ? (
          <span className="text-red-600 font-medium">✗ failed</span>
        ) : (
          <span className="text-amber-600">pending</span>
        )}
      </td>
      <td className="py-1.5 pr-3 text-gray-500">
        {d.responseStatus ?? "—"}
      </td>
      <td className="py-1.5 text-gray-500">{d.attempts}</td>
    </tr>
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

  const handleExpandDeliveries = useCallback(async () => {
    if (!expanded) {
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
    }
    setExpanded((v) => !v);
  }, [expanded, wh.id]);

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${wh.active ? "bg-green-500" : "bg-gray-300"}`}
          />
          <div className="min-w-0">
            <div className="font-medium text-sm text-gray-900">{wh.name}</div>
            <div className="text-xs text-gray-400 font-mono truncate max-w-xs mt-0.5">{wh.url}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Active toggle */}
          <button
            onClick={() => onToggleActive(wh.id, !wh.active)}
            className={`text-xs px-2 py-1 rounded ${
              wh.active
                ? "bg-green-50 text-green-700 hover:bg-green-100"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
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
            className="text-xs px-2 py-1 rounded bg-gray-50 text-gray-600 hover:bg-gray-100"
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
                className="text-xs px-2 py-1 rounded text-gray-500 hover:bg-gray-100"
              >
                Cancel
              </button>
            </span>
          )}
        </div>
      </div>

      {/* Event subscriptions */}
      <div className="border-t border-gray-100 px-4 py-2 flex flex-wrap gap-1 items-center">
        <span className="text-xs text-gray-400 mr-1">Events:</span>
        {wh.events.length === 0 ? (
          <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
            All events
          </span>
        ) : (
          wh.events.map((evt) => (
            <span
              key={evt}
              className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-mono"
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

      {/* Delivery log */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3">
          {loadingDeliveries ? (
            <p className="text-xs text-gray-400">Loading deliveries…</p>
          ) : deliveries.length === 0 ? (
            <p className="text-xs text-gray-400">No deliveries yet.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-400">
                  <th className="text-left pb-1 pr-3 font-normal">When</th>
                  <th className="text-left pb-1 pr-3 font-normal">Event</th>
                  <th className="text-left pb-1 pr-3 font-normal">Status</th>
                  <th className="text-left pb-1 pr-3 font-normal">HTTP</th>
                  <th className="text-left pb-1 font-normal">Attempts</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((d) => (
                  <DeliveryRow key={d.id} d={d} />
                ))}
              </tbody>
            </table>
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
      <div className="flex h-screen items-center justify-center text-sm text-gray-400">
        Loading webhooks…
      </div>
    );
  }

  return (
    <div className="px-6 py-6 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Webhook Integrations</h1>
          <p className="mt-1 text-sm text-gray-500">
            Register HTTPS endpoints to receive signed lifecycle events from Intellios.
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
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
          <div className="mb-6 rounded-lg border border-gray-200 bg-white px-6 py-5">
            <h2 className="mb-4 text-sm font-medium text-gray-900">Register New Webhook</h2>

            {formError && (
              <div className="mb-3 rounded bg-red-50 px-3 py-2 text-xs text-red-700">
                {formError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. CI/CD Pipeline, Slack Bot, SIEM"
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  URL <span className="text-gray-400">(must be https://)</span>
                </label>
                <input
                  type="url"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder="https://example.com/webhook"
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-gray-700">
                  Event Subscriptions
                </label>
                <label className="mb-2 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={formAllEvents}
                    onChange={(e) => setFormAllEvents(e.target.checked)}
                  />
                  <span className="text-gray-700">Subscribe to all events</span>
                </label>

                {!formAllEvents && (
                  <div className="mt-2 space-y-3 rounded border border-gray-200 p-3">
                    {EVENT_GROUPS.map((group) => (
                      <div key={group.label}>
                        <div className="mb-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide">
                          {group.label}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {group.events.map((evt) => (
                            <label key={evt} className="flex items-center gap-1.5 text-xs">
                              <input
                                type="checkbox"
                                checked={formEvents.includes(evt)}
                                onChange={() => toggleEvent(evt)}
                              />
                              <span className="font-mono text-gray-700">{evt}</span>
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
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
              >
                {registering ? "Registering…" : "Register Webhook"}
              </button>
              <button
                onClick={() => { setShowForm(false); setFormError(null); }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Webhook list */}
        {webhookList.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white py-16 text-center">
            <div className="text-3xl">🔗</div>
            <h3 className="mt-3 text-sm font-medium text-gray-900">No webhooks registered</h3>
            <p className="mt-1 text-sm text-gray-500">
              Register a webhook to start receiving lifecycle events.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
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
        <div className="mt-8 rounded-lg border border-gray-200 bg-white px-6 py-5">
          <h2 className="mb-3 text-sm font-medium text-gray-900">Verifying Webhook Signatures</h2>
          <p className="text-sm text-gray-600 mb-3">
            Every request includes a{" "}
            <code className="font-mono text-xs bg-gray-100 px-1 rounded">X-Intellios-Signature</code>{" "}
            header. Compute <code className="font-mono text-xs bg-gray-100 px-1 rounded">HMAC-SHA256(secret, rawBody)</code>{" "}
            and compare with the header value (after stripping the{" "}
            <code className="font-mono text-xs bg-gray-100 px-1 rounded">sha256=</code> prefix) to
            verify authenticity.
          </p>
          <div className="rounded bg-gray-50 border border-gray-200 px-4 py-3 font-mono text-xs text-gray-700 whitespace-pre">
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
          <p className="mt-3 text-xs text-gray-500">
            Additional headers:{" "}
            <code className="font-mono bg-gray-100 px-1 rounded">X-Intellios-Event</code> (event type),{" "}
            <code className="font-mono bg-gray-100 px-1 rounded">X-Intellios-Delivery</code> (delivery UUID).
          </p>
        </div>
      </div>
    </div>
  );
}
