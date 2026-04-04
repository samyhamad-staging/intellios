"use client";

/**
 * C-12: MobileLayout — responsive shell that adds a mobile hamburger toggle
 * and sidebar drawer behavior for screens narrower than 1024px.
 *
 * On desktop (≥ 1024px): sidebar is always visible (no change from previous behavior).
 * On tablet/mobile (< 1024px): sidebar slides in as a full-height overlay drawer.
 * A semi-transparent backdrop closes the drawer when tapped.
 */

import { useState } from "react";
import { Menu, X } from "lucide-react";

interface MobileLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

export default function MobileLayout({ sidebar, children }: MobileLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Desktop sidebar — always visible at lg+ ── */}
      <div className="hidden lg:flex shrink-0">
        {sidebar}
      </div>

      {/* ── Mobile sidebar drawer ── */}
      {/* Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 lg:hidden
          transform transition-transform duration-200 ease-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {sidebar}
      </div>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto" style={{ backgroundColor: "var(--content-bg)" }}>
        {/* Mobile top bar with hamburger — hidden on desktop */}
        <div
          className="flex items-center gap-3 px-4 py-3 border-b border-border lg:hidden sticky top-0 z-10"
          style={{ backgroundColor: "var(--content-bg)" }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-md p-1.5 transition-colors hover:bg-surface-raised"
            aria-label="Open navigation"
          >
            <Menu size={20} style={{ color: "var(--sidebar-text)" }} />
          </button>
          <span className="text-sm font-semibold" style={{ color: "var(--sidebar-text-active)" }}>
            Intellios
          </span>
        </div>

        {children}
      </main>
    </div>
  );
}
