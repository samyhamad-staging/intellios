"use client";

import { useState, ReactNode } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { RequestAccessModal } from "@/components/landing/request-access-modal";

interface NavLink {
  label: string;
  href: string;
}

interface MobileNavProps {
  navLinks: NavLink[];
}

/**
 * MobileNav — client-side island for mobile hamburger menu
 * Handles mobile menu open/close state
 */
export function MobileNav({ navLinks }: MobileNavProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="lg:hidden rounded-lg p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
        aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
      >
        {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile menu panel */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-100 dark:border-white/5 bg-white dark:bg-slate-950 px-6 pb-4 pt-2">
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 border-t border-gray-100 dark:border-white/5 pt-3 flex flex-col gap-2">
              <Link
                href="/login"
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                Sign in
              </Link>
              <RequestAccessModal>
                {(open) => (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      open();
                    }}
                    className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors text-center"
                  >
                    Request Early Access
                  </button>
                )}
              </RequestAccessModal>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
