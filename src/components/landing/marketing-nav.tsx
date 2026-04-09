"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { MobileNav } from "@/components/landing/mobile-nav";
import { RequestAccessButton } from "@/components/landing/request-access-button";
import { InteliosLogo } from "@/components/landing/intellios-logo";

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
  { label: "Pricing", href: "/landing/pricing" },
];

interface MarketingNavProps {
  /** When true, use transparent background (for hero sections). Default: false */
  transparent?: boolean;
}

export function MarketingNav({ transparent = false }: MarketingNavProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handler, { passive: true });
    handler(); // sync on mount in case page loads mid-scroll
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // Transparent only when prop is set AND user is at the top of the page.
  // Once scrolled, always show the frosted background so content behind
  // the sticky nav is hidden.
  const bgClass =
    transparent && !scrolled
      ? "bg-transparent"
      : "bg-white/90 dark:bg-slate-950/90 backdrop-blur-lg border-b border-gray-100 dark:border-white/5 shadow-sm";

  return (
    <nav className={`sticky top-0 z-50 ${bgClass}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* ── Logo ── */}
          <Link href="/landing" className="group">
            <InteliosLogo markSize={32} className="opacity-95 group-hover:opacity-100 transition-opacity" />
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
