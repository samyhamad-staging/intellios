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
import {
  Dialog, DialogTitle, DialogDescription, DialogBody, DialogActions,
} from "@/components/catalyst/dialog";
import { Button as CatalystButton } from "@/components/catalyst/button";

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
  /** ADR-026: count of deliveries currently in the DLQ for this webhook. */
  dlqCount: number;
}

type DeliveryStatus = "pending" | "success" | "failed" | "dlq";

interface DeliveryRecord {
  id: string;
  eventType: string;
  status: DeliveryStatus;
  responseStatus: number | null;
  attempts: number;
  /** ADR-026: `network` | `timeout` | `http_5xx` | `http_4xx` | `webhook_inactive` | null. */
  errorClass: string | null;
  /** ADR-026: when the next scheduled retry will fire. Null for terminal states. */
  nextAttemptAt: string | null;
  lastAttemptedAt: string | null;
  createdAt: string;
}

/** Delivery-log status filter used by the per-webhook card. */
type DeliveryFilter = "all" | "pending" | "dlq";

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

/** Format a future ISO timestamp as "2h", "35m", "3d" — used for nextAttemptAt. */
function formatInterval(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "soon";
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.round(hrs / 24)}d`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

// P2-552 + ADR-026: delivery row with status badge, retry context (errorClass,
// nextAttemptAt), and admin replay action for dlq/failed/success rows.
function DeliveryRow({
  d,
  onReplay,
  replaying,
}: {
  d: DeliveryRecord;
  onReplay: (deliveryId: string) => void;
  replaying: boolean;
}) {
  const statusBadge =
    d.status === "success" ? (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 dark:bg-emerald-950/30 px-2 py-0.5 text-xs font-semibold text-green-700 dark:text-emerald-300">
        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
        success
      </span>
    ) : d.status === "dlq" ? (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-950/50 px-2 py-0.5 text-xs font-semibold text-red-800 dark:text-red-200 ring-1 ring-red-300 dark:ring-red-800"
        title="Dead-lettered — all retry attempts exhausted"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
        dlq
      </span>
    ) : d.status === "failed" ? (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 dark:bg-red-950/30 px-2 py-0.5 text-xs font-semibold text-red-700 dark:text-red-300">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
        failed
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        pending
      </span>
    );

  const httpColor =
    d.responseStatus === null ? "text-text-tertiary"
    : d.responseStatus >= 200 && d.responseStatus < 300 ? "text-green-700 dark:text-emerald-300 font-medium"
    : d.responseStatus >= 400 ? "text-red-600 dark:text-red-400 font-medium"
    : "text-text-secondary";

  // Replay is meaningful for terminal or successful states; pending rows are
  // already scheduled, so offering "replay" there would be confusing (the row
  // is not stuck — it's waiting).
  const canReplay = d.status === "dlq" || d.status === "failed" || d.status === "success";

  // Pending rows show `nextAttemptAt` ("in 2h"); everything else shows
  // `lastAttemptedAt` ("3m ago"). Keeps the same column width but switches
  // semantics based on what the admin actually wants to see.
  const whenCell =
    d.status === "pending" && d.nextAttemptAt ? (
      <span className="text-amber-700 dark:text-amber-300" title={`Next attempt: ${formatDate(d.nextAttemptAt)}`}>
        in {formatInterval(d.nextAttemptAt)}
      </span>
    ) : d.lastAttemptedAt ? (
      <span title={`Last attempt: ${formatDate(d.lastAttemptedAt)}`}>
        {formatRelative(d.lastAttemptedAt)}
      </span>
    ) : "—";

  return (
    <TableRow className={
      d.status === "dlq"
        ? "bg-red-50 dark:bg-red-950/40"
        : d.status === "failed"
        ? "bg-red-50/60 dark:bg-red-950/20"
        : undefined
    }>
      <TableCell className="text-text-secondary whitespace-nowrap" title={formatDate(d.createdAt)}>
        {formatRelative(d.createdAt)}
      </TableCell>
      <TableCell className="font-mono text-xs text-text">{d.eventType}</TableCell>
      <TableCell>{statusBadge}</TableCell>
      <TableCell className={httpColor}>
        <div className="flex flex-col">
          <span>{d.responseStatus ?? "—"}</span>
          {d.errorClass && (
            <span className="text-[10px] font-mono text-text-tertiary font-normal" title="ADR-026 error class">
              {d.errorClass}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="text-text-secondary">{d.attempts}</TableCell>
      <TableCell className="text-text-tertiary text-xs whitespace-nowrap">
        {whenCell}
      </TableCell>
      <TableCell className="text-right">
        {canReplay ? (
          <button
            onClick={() => onReplay(d.id)}
            disabled={replaying}
            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 hover:underline disabled:opacity-40 disabled:no-underline"
            title="Reset this delivery to pending and schedule a fresh retry"
          >
            {replaying ? "Replaying…" : "Replay"}
          </button>
        ) : (
          <span className="text-xs text-text-tertiary">—</span>
        )}
      </TableCell>
    </TableRow>
  );
}

// P2-552 + ADR-026: delivery log summary header with status counts, filter
// tabs (All / Pending / DLQ), CSV export, and refresh.
function DeliveryLogHeader({
  deliveries,
  filter,
  onFilterChange,
  onRefresh,
  loading,
}: {
  deliveries: DeliveryRecord[];
  filter: DeliveryFilter;
  onFilterChange: (f: DeliveryFilter) => void;
  onRefresh: () => void;
  loading: boolean;
}) {
  const success = deliveries.filter((d) => d.status === "success").length;
  const failed = deliveries.filter((d) => d.status === "failed").length;
  const pending = deliveries.filter((d) => d.status === "pending").length;
  const dlq = deliveries.filter((d) => d.status === "dlq").length;

  function exportCsv() {
    const rows = [
      ["when", "event", "status", "http_status", "error_class", "attempts", "last_attempt", "next_attempt"],
      ...deliveries.map((d) => [
        d.createdAt,
        d.eventType,
        d.status,
        d.responseStatus ?? "",
        d.errorClass ?? "",
        d.attempts,
        d.lastAttemptedAt ?? "",
        d.nextAttemptAt ?? "",
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `webhook-deliveries-${filter}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const tab = (value: DeliveryFilter, label: string) => (
    <button
      onClick={() => onFilterChange(value)}
      className={`px-2 py-0.5 rounded text-xs transition-colors ${
        filter === value
          ? "bg-text text-white"
          : "text-text-secondary hover:bg-surface-muted"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-3 text-xs">
        <div className="flex items-center gap-1 rounded border border-border-subtle bg-surface-raised p-0.5">
          {tab("all", "All")}
          {tab("pending", `Pending${pending > 0 ? ` (${pending})` : ""}`)}
          {tab("dlq", `DLQ${dlq > 0 ? ` (${dlq})` : ""}`)}
        </div>
        <span className="text-text-secondary">{deliveries.length} shown</span>
        {success > 0 && <span className="text-green-700 dark:text-emerald-300 font-medium">✓ {success}</span>}
        {failed > 0 && <span className="text-red-600 dark:text-red-400 font-medium">✗ {failed}</span>}
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
          className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 disabled:opacity-40"
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
  onDlqCountChanged,
}: {
  wh: WebhookRecord;
  onToggleActive: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
  onTest: (id: string) => void;
  onRotateSecret: (id: string) => void;
  /** Called after a replay so the parent can refresh the list-level dlqCount. */
  onDlqCountChanged: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([]);
  const [loadingDeliveries, setLoadingDeliveries] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [filter, setFilter] = useState<DeliveryFilter>("all");
  const [replayingId, setReplayingId] = useState<string | null>(null);

  const fetchDeliveries = useCallback(async (nextFilter: DeliveryFilter = filter) => {
    setLoadingDeliveries(true);
    try {
      const qs = nextFilter === "all" ? "" : `?status=${nextFilter}`;
      const res = await fetch(`/api/admin/webhooks/${wh.id}${qs}`);
      if (res.ok) {
        const data = await res.json();
        setDeliveries(data.deliveries ?? []);
      }
    } finally {
      setLoadingDeliveries(false);
    }
  }, [wh.id, filter]);

  const handleFilterChange = useCallback(async (next: DeliveryFilter) => {
    setFilter(next);
    await fetchDeliveries(next);
  }, [fetchDeliveries]);

  // ADR-026 admin replay: reset the delivery to pending and schedule a fresh
  // retry. 422 surfaces the inactive-webhook guard to the operator rather than
  // letting the replay round-trip into a DLQ entry with errorClass=webhook_inactive.
  const handleReplay = useCallback(async (deliveryId: string) => {
    setReplayingId(deliveryId);
    try {
      const res = await fetch(
        `/api/admin/webhooks/deliveries/${deliveryId}/replay`,
        { method: "POST" }
      );
      if (res.ok) {
        toast.success("Delivery reset to pending — retry scheduled.");
        await fetchDeliveries();
        onDlqCountChanged();
      } else if (res.status === 422) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.message ?? "Reactivate the webhook before replaying.");
      } else {
        toast.error("Replay failed.");
      }
    } catch {
      toast.error("Replay failed.");
    } finally {
      setReplayingId(null);
    }
  }, [fetchDeliveries, onDlqCountChanged]);

  const handleExpandDeliveries = useCallback(async () => {
    if (!expanded) {
      await fetchDeliveries();
    }
    setExpanded((v) => !v);
  }, [expanded, fetchDeliveries]);

  const openDlqView = useCallback(async () => {
    if (!expanded) {
      setExpanded(true);
    }
    setFilter("dlq");
    await fetchDeliveries("dlq");
  }, [expanded, fetchDeliveries]);

  return (
    <>
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
          {/* ADR-026: DLQ count chip — only renders when non-zero. Clicking it
              expands the delivery log and applies the DLQ filter. */}
          {wh.dlqCount > 0 && (
            <button
              onClick={() => void openDlqView()}
              className="text-xs px-2 py-1 rounded bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-200 ring-1 ring-red-300 dark:ring-red-800 hover:bg-red-200 dark:hover:bg-red-900/60 font-medium"
              title="View dead-lettered deliveries for this webhook"
            >
              {wh.dlqCount} in DLQ
            </button>
          )}
          {/* Active toggle */}
          <button
            onClick={() => onToggleActive(wh.id, !wh.active)}
            className={`text-xs px-2 py-1 rounded ${
              wh.active
                ? "bg-green-50 dark:bg-emerald-950/30 text-green-700 dark:text-emerald-300 hover:bg-green-100 dark:hover:bg-emerald-900/40"
                : "bg-surface-muted text-text-secondary hover:bg-surface-muted"
            }`}
          >
            {wh.active ? "Active" : "Paused"}
          </button>
          <button
            onClick={() => onTest(wh.id)}
            className="text-xs px-2 py-1 rounded bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40"
          >
            Test
          </button>
          <button
            onClick={handleExpandDeliveries}
            className="text-xs px-2 py-1 rounded bg-surface-raised text-text-secondary hover:bg-surface-muted"
          >
            {expanded ? "Hide log" : "Delivery log"}
          </button>
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="text-xs px-2 py-1 rounded text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Event subscriptions */}
      <div className="border-t border-border-subtle px-4 py-2 flex flex-wrap gap-1 items-center">
        <span className="text-xs text-text-tertiary mr-1">Events:</span>
        {wh.events.length === 0 ? (
          <span className="text-xs bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full">
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
          className="ml-auto text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:underline"
        >
          Rotate secret
        </button>
      </div>

      {/* P2-552 + ADR-026: delivery log — filter tabs, DLQ visibility, replay */}
      {expanded && (
        <div className="border-t border-border-subtle px-4 py-3">
          <DeliveryLogHeader
            deliveries={deliveries}
            filter={filter}
            onFilterChange={(f) => void handleFilterChange(f)}
            onRefresh={() => void fetchDeliveries()}
            loading={loadingDeliveries}
          />
          {loadingDeliveries ? (
            <p className="text-xs text-text-tertiary">Loading deliveries…</p>
          ) : deliveries.length === 0 ? (
            <p className="text-xs text-text-tertiary">
              {filter === "dlq" ? "No dead-lettered deliveries."
                : filter === "pending" ? "No pending deliveries."
                : "No deliveries yet."}
            </p>
          ) : (
            <Table dense>
              <TableHead>
                <TableRow>
                  <TableHeader>When</TableHeader>
                  <TableHeader>Event</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader>HTTP</TableHeader>
                  <TableHeader>Attempts</TableHeader>
                  <TableHeader>Last/Next</TableHeader>
                  <TableHeader>Actions</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {deliveries.map((d) => (
                  <DeliveryRow
                    key={d.id}
                    d={d}
                    onReplay={(deliveryId) => void handleReplay(deliveryId)}
                    replaying={replayingId === d.id}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}
    </div>

    {/* Delete confirmation dialog */}
    <Dialog open={showDeleteDialog} onClose={() => setShowDeleteDialog(false)}>
      <DialogTitle>Delete webhook?</DialogTitle>
      <DialogDescription>
        Are you sure you want to delete <strong>{wh.name}</strong>?
        Event deliveries to <code className="font-mono text-xs">{wh.url}</code> will
        stop immediately. This cannot be undone.
      </DialogDescription>
      <DialogBody />
      <DialogActions>
        <CatalystButton plain onClick={() => setShowDeleteDialog(false)}>
          Cancel
        </CatalystButton>
        <CatalystButton
          color="red"
          onClick={() => { onDelete(wh.id); setShowDeleteDialog(false); }}
        >
          Delete webhook
        </CatalystButton>
      </DialogActions>
    </Dialog>
    </>
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
          <div className="mb-6 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-4 py-4">
            <div className="flex items-start justify-between">
              <div className="text-sm font-medium text-amber-800 dark:text-amber-200">
                {revealedSecret.type === "new" ? "Webhook registered" : "Secret rotated"} —{" "}
                <strong>{revealedSecret.name}</strong>
              </div>
              <button
                onClick={() => setRevealedSecret(null)}
                className="text-amber-400 hover:text-amber-600 dark:hover:text-amber-400 text-lg leading-none"
              >
                ×
              </button>
            </div>
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
              Copy this signing secret now. It will <strong>not</strong> be shown again.
            </p>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 rounded bg-amber-100 dark:bg-amber-900/40 px-3 py-1.5 text-xs font-mono text-amber-900 break-all">
                {revealedSecret.secret}
              </code>
              <button
                onClick={() => {
                  void navigator.clipboard.writeText(revealedSecret.secret);
                  toast.success("Secret copied to clipboard.");
                }}
                className="flex-shrink-0 rounded bg-amber-200 dark:bg-amber-800/60 px-3 py-1.5 text-xs font-medium text-amber-800 dark:text-amber-200 hover:bg-amber-300 dark:hover:bg-amber-700/60"
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
                ? "border-green-200 dark:border-emerald-800 bg-green-50 dark:bg-emerald-950/30 text-green-800 dark:text-emerald-200"
                : "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200"
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
              <div className="mb-3 rounded bg-red-50 dark:bg-red-950/30 px-3 py-2 text-xs text-red-700 dark:text-red-300">
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
                onDlqCountChanged={() => void loadWebhooks()}
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
