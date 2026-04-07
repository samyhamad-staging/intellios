"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Tooltip } from "@/components/ui/tooltip";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  entityType: string;
  entityId: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

const POLL_INTERVAL_MS = 30_000;

// P2-606: Group notifications — collapse same-type + same-entity into digest cards
interface NotificationGroup {
  kind: "single";
  notification: Notification;
}
interface NotificationDigest {
  kind: "digest";
  type: string;
  entityId: string;
  entityType: string;
  link: string | null;
  count: number;
  /** Summary label, e.g. "Agent X triggered 5 policy violations" */
  label: string;
  hasUnread: boolean;
  latestAt: string;
}
type NotificationItem = NotificationGroup | NotificationDigest;

function groupNotifications(notifications: Notification[]): NotificationItem[] {
  // Build a map keyed by type+entityId
  const groupMap = new Map<string, Notification[]>();
  for (const n of notifications) {
    const key = `${n.type}::${n.entityId}`;
    const existing = groupMap.get(key);
    if (existing) existing.push(n);
    else groupMap.set(key, [n]);
  }

  const result: NotificationItem[] = [];
  // Preserve original order: use the first occurrence index
  const seen = new Set<string>();
  for (const n of notifications) {
    const key = `${n.type}::${n.entityId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const group = groupMap.get(key)!;
    if (group.length === 1) {
      result.push({ kind: "single", notification: n });
    } else {
      // Build a human-readable summary from the type
      const typeLabel = n.type
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
      const agentLabel = n.title.split(" ")[0] ?? "Agent";
      result.push({
        kind: "digest",
        type: n.type,
        entityId: n.entityId,
        entityType: n.entityType,
        link: n.link,
        count: group.length,
        label: `${agentLabel} — ${group.length}× ${typeLabel}`,
        hasUnread: group.some((g) => !g.read),
        latestAt: group[0].createdAt,
      });
    }
  }
  return result;
}

/**
 * NotificationBell — nav component that polls /api/notifications every 30 s
 * when the window is focused. Shows an unread count badge and a dropdown panel
 * with the 20 most recent notifications.
 */
export default function NotificationBell() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      // Network errors are silently swallowed — bell is non-critical UI
    }
  }, []);

  // Initial fetch + focus-aware polling
  useEffect(() => {
    fetchNotifications();

    const startPolling = () => {
      if (intervalRef.current) return;
      intervalRef.current = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    };
    const stopPolling = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    startPolling(); // also poll when unfocused so count stays accurate-ish
    window.addEventListener("focus", () => {
      fetchNotifications();
      startPolling();
    });
    window.addEventListener("blur", stopPolling);

    return () => {
      stopPolling();
      window.removeEventListener("focus", fetchNotifications);
      window.removeEventListener("blur", stopPolling);
    };
  }, [fetchNotifications]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOpen = () => {
    setOpen((prev) => !prev);
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0 || loading) return;
    // Optimistic update — flip all to read immediately so the UI responds instantly
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setLoading(true);
    try {
      await fetch("/api/notifications", { method: "PATCH" });
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = (n: Notification) => {
    setOpen(false);
    if (n.link) {
      router.push(n.link);
    } else if (n.entityType === "blueprint") {
      router.push(`/registry/${n.entityId}`);
    }
  };

  const formatRelative = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(diff / 60_000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const typeIcon = (type: string) => {
    if (type.includes("status_changed")) return "🔄";
    if (type.includes("reviewed")) return "✅";
    if (type.includes("created")) return "✦";
    return "🔔";
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <Tooltip content="Notifications">
        <button
          onClick={handleOpen}
          className="relative p-1.5 rounded-md text-text-tertiary hover:text-text-secondary hover:bg-surface-raised transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.8}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
            />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-2xs font-bold leading-none">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </Tooltip>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-surface border border-border rounded-lg shadow-lg z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-subtle bg-surface-raised">
            <span className="text-sm font-semibold text-text">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-1.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 px-1.5 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300">
                  {unreadCount}
                </span>
              )}
            </span>
            {loading ? (
              <span className="text-xs text-text-tertiary">Marking read…</span>
            ) : unreadCount > 0 ? (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 font-medium transition-colors"
              >
                Mark all as read
              </button>
            ) : null}
          </div>

          {/* List — P2-606: grouped digest rendering */}
          <div className="max-h-96 overflow-y-auto divide-y divide-border-subtle">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-text-tertiary">
                No notifications yet
              </div>
            ) : (
              groupNotifications(notifications).map((item) => {
                if (item.kind === "single") {
                  const n = item.notification;
                  return (
                    <button
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`w-full text-left px-4 py-3 hover:bg-surface-raised transition-colors ${
                        !n.read ? "bg-indigo-50 dark:bg-indigo-950/30" : ""
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="text-base mt-0.5 shrink-0">{typeIcon(n.type)}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-text truncate">{n.title}</p>
                            <span className="text-2xs text-text-tertiary shrink-0">{formatRelative(n.createdAt)}</span>
                          </div>
                          <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">{n.message}</p>
                        </div>
                        {!n.read && <span className="mt-1.5 shrink-0 w-2 h-2 rounded-full bg-indigo-500" />}
                      </div>
                    </button>
                  );
                }
                // Digest card
                const d = item;
                return (
                  <button
                    key={`${d.type}::${d.entityId}`}
                    onClick={() => {
                      setOpen(false);
                      if (d.link) router.push(d.link);
                    }}
                    className={`w-full text-left px-4 py-3 hover:bg-surface-raised transition-colors ${
                      d.hasUnread ? "bg-indigo-50 dark:bg-indigo-950/30" : ""
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="text-base mt-0.5 shrink-0">{typeIcon(d.type)}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-text truncate">{d.label}</p>
                          <span className="text-2xs text-text-tertiary shrink-0">{formatRelative(d.latestAt)}</span>
                        </div>
                        <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">View all {d.count} →</p>
                      </div>
                      {d.hasUnread && <span className="mt-1.5 shrink-0 w-2 h-2 rounded-full bg-indigo-500" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-border-subtle bg-surface-raised text-center">
              <span className="text-xs text-text-tertiary">
                Showing last {notifications.length} notification
                {notifications.length === 1 ? "" : "s"}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
