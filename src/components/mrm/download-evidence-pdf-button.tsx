"use client";

import { useState } from "react";

interface Props {
  blueprintId: string;
  /** Only shown for approved / deployed blueprints — the API enforces this gate too. */
  enabled: boolean;
}

/**
 * DownloadEvidencePDFButton — triggers a browser download of the
 * server-rendered evidence package PDF from
 * GET /api/blueprints/[id]/evidence-package/pdf.
 *
 * Sibling to DownloadEvidenceButton (JSON variant). Both are surfaced
 * together — JSON is for machine consumption / archival; PDF is the
 * audit-quality artifact for regulators, internal audit, and Big-4 hand-off.
 *
 * See ADR-015 + OQ-009 (resolved 2026-04-25).
 */
export default function DownloadEvidencePDFButton({
  blueprintId,
  enabled,
}: Props) {
  const [loading, setLoading] = useState(false);

  if (!enabled) return null;

  async function handleDownload() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/blueprints/${blueprintId}/evidence-package/pdf`
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(
          `Export failed: ${
            (err as { error?: string }).error ?? res.statusText
          }`
        );
        return;
      }
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match
        ? match[1]
        : `evidence-package-${blueprintId}.pdf`;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="rounded-lg border border-indigo-300 dark:border-indigo-700 bg-indigo-600 dark:bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50 transition-colors print:hidden"
    >
      {loading ? "Rendering…" : "↓ Evidence Package (PDF)"}
    </button>
  );
}
