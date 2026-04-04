"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity } from "lucide-react";

interface ActivityItem {
  id: string;
  action: string;
  actorEmail: string;
  actorName: string;
  description: string;
  entityType: string;
  entityId: string;
  createdAt: string;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "bg-violet-200 text-violet-800",
  "bg-blue-200 text-blue-800",
  "bg-emerald-200 text-emerald-800",
  "bg-amber-200 text-amber-800",
  "bg-rose-200 text-rose-800",
];

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

// ─── Relative time ────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return `${Math.floor(diffDays / 7)}w ago`;
}

// ─── Grouping ─────────────────────────────────────────────────────────────────

interface GroupedItem {
  id: string;
  actorName: string;
  description: string;
  createdAt: string;
  count: number;
  entityId: string;
  entityType: string;
}

function groupItems(items: ActivityItem[]): GroupedItem[] {
  const groups: GroupedItem[] = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (
      last &&
      last.actorName === item.actorName &&
      last.description === item.description
    ) {
      last.count++;
    } else {
      groups.push({
        id: item.id,
        actorName: item.actorName,
        description: item.description,
        createdAt: item.createdAt,
        count: 1,
        entityId: item.entityId,
        entityType: item.entityType,
      });
    }
  }
  return groups.slice(0, 10);
}

// ─── Feed ─────────────────────────────────────────────────────────────────────

export function ActivityFeed({ compact }: { compact?: boolean }) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/dashboard/activity")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => { setItems(data.items ?? []); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 animate-pulse">
            <div className="h-8 w-8 rounded-full bg-surface-muted shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-2/3 rounded bg-surface-muted" />
              <div className="h-2.5 w-1/4 rounded bg-surface-raised" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-text-tertiary">Unable to load activity.</p>;
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <Activity className="h-7 w-7 text-text-tertiary/30" />
        <p className="text-sm text-text-tertiary">No activity yet</p>
      </div>
    );
  }

  const grouped = groupItems(items).slice(0, compact ? 5 : 10);

  return (
    <div>
      <div className="space-y-0 divide-y divide-border">
        {grouped.map((item) => {
          const entityHref = item.entityType === "agent_blueprint" && item.entityId
            ? `/registry/${item.entityId}`
            : null;
          const rowCls = `flex items-center gap-3 ${compact ? "py-2" : "py-3"} first:pt-0 last:pb-0 -mx-1 px-1 rounded transition-colors` + (entityHref ? " hover:bg-surface-raised/50 cursor-pointer" : " hover:bg-surface-raised/50");
          const inner = (
            <>
              {/* Avatar */}
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${avatarColor(item.actorName)}`}>
                {initials(item.actorName)}
              </div>
              {/* Content */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-text">
                  <span className="font-medium capitalize">{item.actorName}</span>
                  {" "}
                  <span className="text-text-secondary">{item.description}</span>
                </p>
                <p className="text-xs text-text-tertiary">{relativeTime(item.createdAt)}</p>
              </div>
              {/* Repeat count badge */}
              {item.count > 1 && (
                <span className="shrink-0 rounded-full bg-surface-raised px-2 py-0.5 text-xs font-medium text-text-tertiary">
                  ×{item.count}
                </span>
              )}
            </>
          );
          return entityHref ? (
            <Link key={item.id} href={entityHref} className={rowCls}>
              {inner}
            </Link>
          ) : (
            <div key={item.id} className={rowCls}>
              {inner}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      {!compact && (
        <div className="mt-3 border-t border-border pt-3">
          <Link href="/audit" className="text-xs text-primary hover:text-primary-hover transition-colors">
            View full audit trail →
          </Link>
        </div>
      )}
    </div>
  );
}
