"use client";

/**
 * PrintButton — thin client component that invokes the browser print dialog.
 * Kept isolated so the parent MRM report page can remain a server component.
 */
export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors print:hidden"
    >
      Print / Save as PDF
    </button>
  );
}
