"use client";

/**
 * PrintButton — thin client component that invokes the browser print dialog.
 * Kept isolated so the parent MRM report page can remain a server component.
 */
export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-raised transition-colors print:hidden"
    >
      Print / Save as PDF
    </button>
  );
}
