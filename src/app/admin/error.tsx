"use client";

import { useEffect } from "react";
import { Button } from "@/components/catalyst/button";
import { Heading } from "@/components/catalyst";
import { AlertTriangle, RotateCcw, ArrowLeft } from "lucide-react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Intellios/Admin] Error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-danger-muted bg-danger-muted text-danger">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <Heading level={2} className="mb-2">Admin error</Heading>
        <p className="mb-1 text-sm text-text-secondary">
          Something went wrong in the Admin panel. No settings were changed.
        </p>
        {error.digest && (
          <p className="mb-4 font-mono text-2xs text-text-tertiary">Ref: {error.digest}</p>
        )}
        {!error.digest && <div className="mb-4" />}
        <div className="flex items-center justify-center gap-3">
          <Button onClick={reset} color="indigo">
            <RotateCcw className="h-3.5 w-3.5" />
            Retry
          </Button>
          <Button href="/admin" outline>
            <ArrowLeft className="h-3.5 w-3.5" />
            Admin Home
          </Button>
        </div>
      </div>
    </div>
  );
}
