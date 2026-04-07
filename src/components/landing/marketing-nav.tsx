"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { MobileNav } from "@/components/landing/mobile-nav";
import { RequestAccessButton } from "@/components/landing/request-access-button";

/**
 * MarketingNav — Global navigation bar for all public/marketing pages.
 * Server component shell with client-side islands for interactivity.
 *
 * Appears on: /landing, /login, /register, /auth/*, /templates
 * Provides: Logo, nav links, Sign In, Request Early Access CTA
 */

const NAV_LINKS = [
  { label: "Features", href: "/landing#pillars" },
  { label: "Use Cases", href: "/landing#personas" },
  { label: "Security", href: "/landing#why-intellios" },
  { label: "Templates", href: "/templates" },
  { label: "ROI", href: "/landing#roi" },
];

interface MarketingNavProps {
  /** When true, use transparent background (for hero sections). Default: false */
  transparent?: boolean;
}

export function MarketingNav({ transparent = false }: MarketingNavProps) {
  const bgClass = transparent
    ? "bg-transparent"
    : "bg-white/80 dark:bg-slate-950/80 backdrop-blur-lg border-b border-gray-100 dark:border-white/5";

  return (
    <nav className={`sticky top-0 z-50 ${bgClass}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* ── Logo ── */}
          <Link href="/landing" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 shadow-sm group-hover:bg-indigo-500 transition-colors">
              <ShieldCheck size={16} className="text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
              Intellios
            </span>
          </Link>

          {/* ── Desktop nav links ── */}
          <div className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* ── Desktop CTAs ── */}
          <div className="hidden lg:flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Sign in
            </Link>
            <RequestAccessButton label="Request Early Access" mobileLabel="Get Access" />
          </div>

          {/* ── Mobile nav (client component island) ── */}
          <MobileNav navLinks={NAV_LINKS} />
        </div>
      </div>
    </nav>
  );
}
