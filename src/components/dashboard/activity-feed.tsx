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

// ─── Feed ─────────────────────────────────────────────────────────────────────

export function ActivityFeed() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/dashboard/activity")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => { setItems((data.items ?? []).slice(0, 15)); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 animate-pulse">
            <div className="h-8 w-8 rounded-full bg-gray-200 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-2/3 rounded bg-gray-200" />
              <div className="h-2.5 w-1/4 rounded bg-gray-100" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-gray-400">Unable to load activity.</p>;
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <Activity className="h-7 w-7 text-gray-200" />
        <p className="text-sm text-gray-400">No activity yet</p>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="flex items-start gap-3">
            {/* Avatar */}
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${avatarColor(item.actorName)}`}>
              {initials(item.actorName)}
            </div>
            {/* Content */}
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-sm text-gray-700 leading-snug">
                <span className="font-medium capitalize">{item.actorName}</span>
                {" "}
                <span className="text-gray-600">{item.description}</span>
              </p>
              <p className="mt-0.5 text-xs text-gray-400">{relativeTime(item.createdAt)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-4 border-t border-gray-100 pt-3">
        <Link href="/audit" className="text-xs text-violet-600 hover:text-violet-700">
          View full audit trail →
        </Link>
      </div>
    </div>
  );
}
