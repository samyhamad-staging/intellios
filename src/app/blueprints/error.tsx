"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, ArrowLeft } from "lucide-react";

export default function BlueprintError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Intellios/Blueprint] Error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-500">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="mb-2 text-lg font-semibold text-text">Blueprint error</h2>
        <p className="mb-1 text-sm text-text-secondary">
          Something went wrong loading this blueprint. Your data is safe.
        </p>
        {error.digest && (
          <p className="mb-4 font-mono text-2xs text-text-tertiary">Ref: {error.digest}</p>
        )}
        {!error.digest && <div className="mb-4" />}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Retry
          </button>
          <Link
            href="/pipeline"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-muted transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Pipeline
          </Link>
        </div>
      </div>
    </div>
  );
}
