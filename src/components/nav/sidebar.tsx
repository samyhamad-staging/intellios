"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  LayoutDashboard,
  MessageSquare,
  Kanban,
  Library,
  ClipboardList,
  Shield,
  CheckSquare,
  Rocket,
  Activity,
  BarChart3,
  ScrollText,
  Users,
  Settings,
  Webhook,
  LogOut,
  Search,
  Building2,
  Globe,
} from "lucide-react";
import NotificationBell from "@/components/nav/notification-bell";
import { HelpPanel } from "@/components/help/help-panel";
import { CommandPalette } from "@/components/nav/command-palette";

interface SidebarProps {
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
  signOutAction: () => Promise<void>;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface NavSection {
  label?: string;
  items: NavItem[];
  roles?: string[];
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  architect: { label: "Architect", color: "bg-blue-500/20 text-blue-300" },
  reviewer: { label: "Reviewer", color: "bg-amber-500/20 text-amber-300" },
  compliance_officer: { label: "Compliance", color: "bg-green-500/20 text-green-300" },
  admin: { label: "Admin", color: "bg-violet-500/20 text-violet-300" },
  viewer: { label: "Viewer", color: "bg-slate-500/20 text-slate-300" },
};

function getNavSections(role: string | null | undefined): NavSection[] {
  const r = role ?? "";
  const isArchitect = r === "architect" || r === "admin";
  const isReviewer = r === "reviewer" || r === "compliance_officer" || r === "admin";
  const isCompliance = r === "compliance_officer" || r === "admin";
  const isViewer = r === "viewer";
  const isAdmin = r === "admin";

  const sections: NavSection[] = [
    {
      items: [
        { label: "Overview", href: "/", icon: LayoutDashboard },
        ...(isArchitect ? [{ label: "Intake", href: "/intake", icon: MessageSquare }] : []),
        { label: "Pipeline", href: "/pipeline", icon: Kanban },
        { label: "Registry", href: "/registry", icon: Library },
      ],
    },
  ];

  if (isReviewer || isViewer) {
    sections.push({
      label: "Governance",
      items: [
        ...(isReviewer ? [{ label: "Review Queue", href: "/review", icon: ClipboardList }] : []),
        ...(isCompliance || isViewer ? [{ label: "Governance", href: "/governance", icon: Shield }] : []),
        ...(isCompliance || isViewer ? [{ label: "Compliance", href: "/compliance", icon: CheckSquare }] : []),
        ...(isReviewer ? [{ label: "Governor", href: "/governor", icon: Building2 }] : []),
      ],
    });
  }

  const opsItems: NavItem[] = [];
  if (isReviewer) opsItems.push({ label: "Deploy", href: "/deploy", icon: Rocket });
  if (isReviewer || isViewer) opsItems.push({ label: "Monitor", href: "/monitor", icon: Activity });
  if (isCompliance || isViewer) opsItems.push({ label: "Dashboard", href: "/dashboard", icon: BarChart3 });
  if (isCompliance || isViewer) opsItems.push({ label: "Audit", href: "/audit", icon: ScrollText });
  if (isAdmin) opsItems.push({ label: "Users", href: "/admin/users", icon: Users });
  if (isAdmin) opsItems.push({ label: "Settings", href: "/admin/settings", icon: Settings });
  if (isAdmin) opsItems.push({ label: "Webhooks", href: "/admin/webhooks", icon: Webhook });
  if (isAdmin) opsItems.push({ label: "Fleet", href: "/admin/fleet", icon: Globe });

  if (opsItems.length > 0) {
    sections.push({ label: "Operations", items: opsItems });
  }

  return sections;
}

export default function Sidebar({ user, branding, signOutAction }: SidebarProps) {
  const pathname = usePathname();
  const sections = getNavSections(user.role);
  const roleInfo = user.role
    ? (ROLE_LABELS[user.role] ?? { label: user.role, color: "bg-slate-500/20 text-slate-300" })
    : null;

  const initials = user.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  const [paletteOpen, setPaletteOpen] = useState(false);

  // Global Cmd+K / Ctrl+K shortcut
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
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <>
    <aside
      className="flex h-screen w-60 shrink-0 flex-col overflow-hidden"
      style={{ backgroundColor: "var(--sidebar-bg)", borderRight: "1px solid var(--sidebar-border)" }}
    >
      {/* Brand */}
      <div
        className="flex h-14 shrink-0 items-center gap-2.5 px-4"
        style={{ borderBottom: "1px solid var(--sidebar-border)" }}
      >
        {branding?.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={branding.logoUrl}
            alt=""
            className="h-7 w-7 rounded-lg object-cover shrink-0"
          />
        ) : (
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg shrink-0"
            style={{ backgroundColor: branding?.primaryColor ?? "#7c3aed" }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 11L7 3L12 11" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M4.5 8H9.5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
        )}
        <span className="text-sm font-semibold text-white tracking-tight">
          {branding?.companyName ?? "Intellios"}
        </span>
        <div className="ml-auto">
          <NotificationBell />
        </div>
      </div>

      {/* Command search bar */}
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
      <nav className="sidebar-scroll flex-1 overflow-y-auto px-2 py-3">
        {sections.map((section, si) => (
          <div key={si} className={si > 0 ? "mt-4" : ""}>
            {section.label && (
              <p
                className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: "var(--sidebar-text)", opacity: 0.5 }}
              >
                {section.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
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
          </div>
        ))}
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
          <div className="flex items-center gap-0.5">
            <HelpPanel role={user.role ?? "architect"} />
            <form action={signOutAction}>
              <button
                type="submit"
                title="Sign out"
                className="rounded p-1 transition-colors hover:bg-white/10"
                style={{ color: "var(--sidebar-text)" }}
              >
                <LogOut size={13} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </aside>

    {/* Command palette — rendered at document.body level via portal */}
    {paletteOpen && typeof document !== "undefined" &&
      createPortal(
        <CommandPalette
          role={user.role ?? "architect"}
          onClose={() => setPaletteOpen(false)}
        />,
        document.body
      )}
    </>
  );
}
