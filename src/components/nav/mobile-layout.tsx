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
      {/* W3-08: Skip-navigation link — visible on focus for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-lg focus:bg-indigo-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg focus:outline-none"
      >
        Skip to main content
      </a>
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
        id="mobile-sidebar"
        className={`
          fixed inset-y-0 left-0 z-50 lg:hidden
          transform transition-transform duration-200 ease-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {sidebar}
      </div>

      {/* ── Main content ── */}
      <main id="main-content" aria-label="Main content" className="flex-1 overflow-y-auto" style={{ backgroundColor: "var(--content-bg)" }}>
        {/* Mobile top bar with hamburger — hidden on desktop */}
        <div
          className="flex items-center gap-3 px-4 py-3 border-b border-border lg:hidden sticky top-0 z-10"
          style={{ backgroundColor: "var(--content-bg)" }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-md p-2.5 transition-colors hover:bg-surface-raised min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Open navigation"
            aria-expanded={sidebarOpen}
            aria-controls="mobile-sidebar"
          >
            <Menu size={20} style={{ color: "var(--sidebar-text)" }} />
          </button>
          <span className="text-sm font-semibold" style={{ color: "var(--sidebar-text-active)" }}>
            Intellios
          </span>
        </div>

        <div className="max-w-screen-2xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
