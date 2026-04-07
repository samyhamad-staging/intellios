"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";

/**
 * MarketingFooter — Shared footer for all public/marketing pages.
 * Provides: Company info, navigation, compliance badges, legal links.
 */

const COMPLIANCE_BADGES = [
  "SOC 2 Type II",
  "GDPR",
  "HIPAA",
  "SR 11-7",
  "EU AI Act",
  "NIST AI RMF",
];

const FOOTER_LINKS = {
  Product: [
    { label: "Features", href: "/landing#pillars" },
    { label: "Use Cases", href: "/landing#personas" },
    { label: "Templates", href: "/templates" },
    { label: "ROI", href: "/landing#roi" },
  ],
  Company: [
    { label: "About", href: "mailto:sales@intellios.io?subject=About%20Intellios" },
    { label: "Contact Sales", href: "mailto:sales@intellios.io?subject=Sales%20Inquiry" },
    { label: "Design Partnership", href: "/landing#final-cta" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "/landing/privacy" },
    { label: "Terms of Service", href: "/landing/terms" },
    { label: "Security", href: "/landing/security" },
  ],
};

export function MarketingFooter() {
  return (
    <footer className="border-t border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        {/* ── Top section: Logo + link columns ── */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          {/* Brand column */}
          <div className="lg:col-span-1">
            <Link href="/landing" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
                <ShieldCheck size={16} className="text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
                Intellios
              </span>
            </Link>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-xs">
              The governed control plane for enterprise AI agents. Design, generate, govern, and deploy AI agents under your brand and policies.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([heading, links]) => (
            <div key={heading}>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
                {heading}
              </h3>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ── Compliance badges ── */}
        <div className="mt-10 pt-8 border-t border-gray-200 dark:border-white/5">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">
            Built for Regulated Enterprise
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {COMPLIANCE_BADGES.map((badge) => (
              <div
                key={badge}
                className="flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-1.5"
              >
                <ShieldCheck size={12} className="text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                  {badge}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            &copy; {new Date().getFullYear()} Intellios. All rights reserved.
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Enterprise AI Agent Governance Platform
          </p>
        </div>
      </div>
    </footer>
  );
}
