"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  ClipboardList,
  Shield,
  CheckSquare,
  Monitor,
  ScrollText,
  Search,
  BarChart2,
  Calendar,
} from "lucide-react";
import NotificationBell from "@/components/nav/notification-bell";
import { HelpPanel } from "@/components/help/help-panel";
import { CommandPalette } from "@/components/nav/command-palette";

interface GovernorSidebarProps {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
  };
  branding?: {
    companyName: string;
    logoUrl: string | null;
    primaryColor: string;
  } | null;
}

const NAV_ITEMS = [
  { label: "Approvals", href: "/governor/approvals", icon: ClipboardList },
  { label: "Policies", href: "/governor/policies", icon: Shield },
  { label: "Compliance", href: "/governor/compliance", icon: CheckSquare },
  { label: "Calendar", href: "/governor/calendar", icon: Calendar },
  { label: "Fleet", href: "/governor/fleet", icon: Monitor },
  { label: "Audit", href: "/governor/audit", icon: ScrollText },
  { label: "Executive", href: "/governor/executive", icon: BarChart2 },
];

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  architect: { label: "Architect", color: "bg-blue-500/20 text-blue-300" },
  reviewer: { label: "Reviewer", color: "bg-amber-500/20 text-amber-300" },
  compliance_officer: { label: "Compliance", color: "bg-green-500/20 text-green-300" },
  admin: { label: "Admin", color: "bg-violet-500/20 text-violet-300" },
};

export function GovernorSidebar({ user, branding }: GovernorSidebarProps) {
  const pathname = usePathname();
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  const initials = user.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  const roleInfo = user.role
    ? (ROLE_LABELS[user.role] ?? { label: user.role, color: "bg-slate-500/20 text-slate-300" })
    : null;

  return (
    <>
      <aside
        className="flex h-full w-56 shrink-0 flex-col overflow-hidden"
        style={{ backgroundColor: "var(--sidebar-bg)", borderRight: "1px solid var(--sidebar-border)" }}
      >
        {/* Brand + header */}
        <div
          className="flex h-14 shrink-0 items-center gap-2.5 px-4"
          style={{ borderBottom: "1px solid var(--sidebar-border)" }}
        >
          {branding?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.logoUrl} alt="" className="h-6 w-6 rounded object-cover shrink-0" />
          ) : (
            <div
              className="flex h-6 w-6 items-center justify-center rounded shrink-0"
              style={{ backgroundColor: branding?.primaryColor ?? "#7c3aed" }}
            >
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M2 11L7 3L12 11" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4.5 8H9.5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
          )}
          <span className="text-xs font-semibold text-white tracking-tight">
            Governor
          </span>
          <div className="ml-auto">
            <NotificationBell />
          </div>
        </div>

        {/* Command search */}
        <div className="px-3 pt-3 pb-1">
          <button
            onClick={() => setPaletteOpen(true)}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition-colors"
            style={{
              backgroundColor: "var(--sidebar-active-bg)",
              color: "var(--sidebar-text)",
              opacity: 0.7,
            }}
          >
            <Search size={12} className="shrink-0" />
            <span className="flex-1 text-left">Search…</span>
            <kbd className="rounded border px-1 py-0.5 text-[9px] font-medium" style={{ borderColor: "var(--sidebar-border)", opacity: 0.6 }}>⌘K</kbd>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          <p
            className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: "var(--sidebar-text)", opacity: 0.5 }}
          >
            Governor
          </p>
          <ul className="space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="group flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors"
                    style={{
                      color: active ? "var(--sidebar-text-active)" : "var(--sidebar-text)",
                      backgroundColor: active ? "var(--sidebar-active-bg)" : "transparent",
                      borderLeft: active ? "2px solid var(--sidebar-accent)" : "2px solid transparent",
                    }}
                  >
                    <Icon
                      size={15}
                      className="shrink-0 transition-colors"
                      style={{ color: active ? "#a78bfa" : "inherit" }}
                    />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Back to main app */}
          <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--sidebar-border)" }}>
            <Link
              href="/"
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors"
              style={{ color: "var(--sidebar-text)", opacity: 0.6 }}
            >
              ← Back to Intellios
            </Link>
          </div>
        </nav>

        {/* User */}
        <div
          className="shrink-0 px-3 py-3"
          style={{ borderTop: "1px solid var(--sidebar-border)" }}
        >
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-600 text-[11px] font-semibold text-white">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-white">{user.name ?? user.email}</p>
              {roleInfo && (
                <span className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${roleInfo.color}`}>
                  {roleInfo.label}
                </span>
              )}
            </div>
            <HelpPanel role={user.role ?? "reviewer"} />
          </div>
        </div>
      </aside>

      {paletteOpen && typeof document !== "undefined" &&
        createPortal(
          <CommandPalette role={user.role ?? "reviewer"} onClose={() => setPaletteOpen(false)} />,
          document.body
        )}
    </>
  );
}
