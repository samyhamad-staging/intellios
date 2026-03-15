"use client";

import { useState } from "react";

interface Props {
  blueprintId: string;
  /** Only shown for approved / deployed blueprints — the API enforces this gate too. */
  enabled: boolean;
}

/**
 * DownloadEvidenceButton — triggers a browser download of the compliance
 * evidence JSON bundle from GET /api/blueprints/[id]/export/compliance.
 * Kept as a thin client component so the parent MRM report page can remain
 * a server component.
 */
export default function DownloadEvidenceButton({ blueprintId, enabled }: Props) {
  const [loading, setLoading] = useState(false);

  if (!enabled) return null;

  async function handleDownload() {
    setLoading(true);
    try {
      const res = await fetch(`/api/blueprints/${blueprintId}/export/compliance`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(`Export failed: ${(err as { error?: string }).error ?? res.statusText}`);
        return;
      }
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match ? match[1] : `compliance-evidence-${blueprintId}.json`;
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
      className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 transition-colors print:hidden"
    >
      {loading ? "Exporting…" : "↓ Download Evidence Package"}
    </button>
  );
}
