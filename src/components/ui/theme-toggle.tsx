"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

/**
 * ThemeToggle — Sun/Moon button that toggles the .dark class on <html>.
 *
 * Reads the initial theme from localStorage on mount.
 * Falls back to system preference (prefers-color-scheme) if no stored preference.
 * Writes to localStorage on each toggle so the anti-flash script in layout.tsx
 * can restore the preference before React hydrates.
 */
export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  // Sync from DOM on mount (DOM state set by the anti-flash script in layout.tsx)
  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // localStorage may be unavailable in certain contexts — silently ignore
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="rounded p-1 transition-colors hover:bg-white/10"
      style={{ color: "var(--sidebar-text)" }}
    >
      {dark ? <Sun size={13} /> : <Moon size={13} />}
    </button>
  );
}
